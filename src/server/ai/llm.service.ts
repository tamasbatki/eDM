import OpenAI from "openai";
import { z } from "zod";

import { AppError } from "@/lib/app-error";
import { env, getRequiredEnv } from "@/lib/env";

const SYSTEM_PROMPT_INSTRUCTION_HU =
  "On egy befektetesi kommunikacios szakerto. Irjon rovid, professzionalis, ugyfelbarat magyar nyelvu szoveget. Tilos hozamgaranciat, biztos eredmenyt vagy felreertheto igeretet allitani.";

const SYSTEM_PROMPT_SUMMARY_HU =
  "Foglalja ossze az elemzest magyar nyelven, ugyfelbarat es kockazattudatos stilusban. Kerulje a hozamgarancia jellegu allitasokat, legyen targyszeru es semleges.";

const SYSTEM_PROMPT_NEWSLETTER_HU =
  "Te egy befektetesi hirlevel-szerkeszto vagy. Keszits magyar nyelvu, professzionalis, semleges hangvetelu hirlevel szoveget. Ne igerj biztos eredmenyt, ne adj befektetesi tanacsot. Kizarolag ervenyes JSON-t adj vissza a megadott schema szerint.";

const newsletterSchema = z.object({
  subject: z.string().min(8).max(120),
  preheader: z.string().min(8).max(180),
  title: z.string().min(8).max(120),
  lead: z.string().min(20).max(450),
  bodyHtml: z.string().min(40).max(5000),
  ctaLabel: z.string().min(3).max(40),
});

export type NewsletterDraft = z.infer<typeof newsletterSchema>;

const MAX_ARTICLE_CHARS = 12000;

function assertAiEnabled() {
  if (!env.aiEnabled) {
    throw new AppError(
      "SERVICE_DISABLED",
      "AI module is disabled. Set AI_ENABLED=true and provide provider API key.",
      503,
    );
  }
}

function truncateText(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text;
  return `${text.slice(0, maxChars)}\n\n[TRUNCATED:${text.length - maxChars}]`;
}

async function completeWithOpenAi(systemPrompt: string, userPrompt: string): Promise<string> {
  const client = new OpenAI({ apiKey: getRequiredEnv("OPENAI_API_KEY") });

  const response = await client.responses.create({
    model: env.openAiModel,
    input: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    temperature: 0.35,
  });

  return response.output_text?.trim() ?? "";
}

function parseGeminiText(json: any): string {
  const candidates = Array.isArray(json?.candidates) ? json.candidates : [];

  const parts = candidates
    .flatMap((candidate: any) => candidate?.content?.parts ?? [])
    .map((part: any) => part?.text)
    .filter((text: unknown) => typeof text === "string");

  return parts.join("\n").trim();
}

function parseGeminiErrorMessage(raw: string): string {
  try {
    const parsed = JSON.parse(raw);
    const message = parsed?.error?.message;
    if (typeof message === "string" && message.trim()) return message;
  } catch {
    // keep raw fallback
  }

  return raw.slice(0, 300);
}

async function generateWithGeminiModel(apiKey: string, model: string, systemPrompt: string, userPrompt: string) {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: systemPrompt }],
        },
        contents: [
          {
            role: "user",
            parts: [{ text: userPrompt }],
          },
        ],
        generationConfig: {
          temperature: 0.35,
        },
      }),
    },
  );

  const raw = await response.text();

  if (!response.ok) {
    return {
      ok: false as const,
      status: response.status,
      message: parseGeminiErrorMessage(raw),
    };
  }

  const json = JSON.parse(raw);
  return {
    ok: true as const,
    text: parseGeminiText(json),
  };
}

async function completeWithGemini(systemPrompt: string, userPrompt: string): Promise<string> {
  const apiKey = getRequiredEnv("GEMINI_API_KEY");
  const models = Array.from(
    new Set([env.geminiModel, "gemini-2.5-flash", "gemini-2.0-flash"]),
  );

  const failures: Array<{ model: string; status: number; message: string }> = [];

  for (const model of models) {
    const result = await generateWithGeminiModel(apiKey, model, systemPrompt, userPrompt);

    if (result.ok) {
      if (!result.text) {
        failures.push({ model, status: 502, message: "Empty content" });
        continue;
      }
      return result.text;
    }

    failures.push({ model, status: result.status, message: result.message });

    if (result.status !== 404) {
      break;
    }
  }

  const primary = failures[0];
  throw new AppError(
    "UPSTREAM_FAILURE",
    `Gemini API error: ${primary?.status ?? 502} - ${primary?.message ?? "Unknown error"}`,
    502,
    { provider: "gemini", failures },
  );
}

async function completeWithSystemPrompt(systemPrompt: string, userPrompt: string): Promise<string> {
  assertAiEnabled();

  const text =
    env.llmProvider === "openai"
      ? await completeWithOpenAi(systemPrompt, userPrompt)
      : await completeWithGemini(systemPrompt, userPrompt);

  if (!text) {
    throw new AppError("UPSTREAM_FAILURE", "LLM did not return usable text", 502, {
      provider: env.llmProvider,
    });
  }

  return text;
}

function extractJsonObject(raw: string): string {
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");

  if (start === -1 || end === -1 || end <= start) {
    throw new AppError("UPSTREAM_FAILURE", "LLM did not return JSON content", 502);
  }

  return raw.slice(start, end + 1);
}

export async function generateDraftFromInstruction(prompt: string): Promise<string> {
  const userPrompt = `Feladat: keszits egy ugyfelnek szolo rovid befektetesi tajekoztato vazlatot.\n\nInstrukcio:\n${prompt}`;
  return completeWithSystemPrompt(SYSTEM_PROMPT_INSTRUCTION_HU, userPrompt);
}

export async function summarizeArticleForClient(articleText: string): Promise<string> {
  const truncated = truncateText(articleText, MAX_ARTICLE_CHARS);
  const userPrompt = `Forras cikk:\n\n${truncated}\n\nKeszits tomor, ugyfelnek kuldheto magyar osszefoglalot.`;

  return completeWithSystemPrompt(SYSTEM_PROMPT_SUMMARY_HU, userPrompt);
}

export async function generateNewsletterDraftFromArticle(input: {
  articleTitle: string;
  articleText: string;
}): Promise<NewsletterDraft> {
  const truncated = truncateText(input.articleText, MAX_ARTICLE_CHARS);

  const userPrompt = `Cikk cim: ${input.articleTitle}\n\nCikk szoveg:\n${truncated}\n\nValaszolj KIZAROLAG JSON-kent ezzel a schema-val:\n{
  "subject": "...",
  "preheader": "...",
  "title": "...",
  "lead": "...",
  "bodyHtml": "<p>...</p><p>...</p>",
  "ctaLabel": "..."
}`;

  const raw = await completeWithSystemPrompt(SYSTEM_PROMPT_NEWSLETTER_HU, userPrompt);
  const parsed = JSON.parse(extractJsonObject(raw));

  const result = newsletterSchema.safeParse(parsed);
  if (!result.success) {
    throw new AppError("UPSTREAM_FAILURE", "LLM JSON schema validation failed", 502, {
      issues: result.error.flatten(),
    });
  }

  return result.data;
}

export const llmInternals = {
  truncateText,
  MAX_ARTICLE_CHARS,
};
