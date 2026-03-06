"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { readWorkflowContext, writeWorkflowContext } from "@/lib/workflow-context";

type AiResponse = {
  text?: string;
  language?: string;
  error?: { message?: string };
};

type NewsletterResponse = {
  sourceTitle?: string;
  sourceUrl?: string;
  draft?: {
    subject: string;
    preheader: string;
    title: string;
    lead: string;
    bodyHtml: string;
    ctaLabel: string;
  };
  html?: string;
  error?: { message?: string };
};

function htmlToPlainText(value: string): string {
  return value
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function AiWorkspace() {
  const router = useRouter();
  const [instruction, setInstruction] = useState("");
  const [url, setUrl] = useState("");
  const [newsletterUrl, setNewsletterUrl] = useState("");
  const [output, setOutput] = useState("");
  const [newsletterHtml, setNewsletterHtml] = useState("");
  const [newsletterMeta, setNewsletterMeta] = useState<string>("");
  const [generatePdf, setGeneratePdf] = useState(true);
  const [generateEmail, setGenerateEmail] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const context = readWorkflowContext();
    if (!context) return;

    if (context.aiText) setOutput(context.aiText);
    if (context.newsletterHtml) setNewsletterHtml(context.newsletterHtml);
    if (context.sourceUrl) setNewsletterUrl(context.sourceUrl);
  }, []);

  async function runInstructionMode() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/ai/instruction", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: instruction }),
      });
      const json = (await res.json()) as AiResponse;
      if (!res.ok || !json.text) throw new Error(json.error?.message || "Instruction mode failed");
      setOutput(json.text);
      writeWorkflowContext({ aiText: json.text });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected error");
    } finally {
      setLoading(false);
    }
  }

  async function runUrlMode() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/ai/summarize-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const json = (await res.json()) as AiResponse;
      if (!res.ok || !json.text) throw new Error(json.error?.message || "URL mode failed");
      setOutput(json.text);
      writeWorkflowContext({ aiText: json.text, sourceUrl: url.trim() });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected error");
    } finally {
      setLoading(false);
    }
  }

  async function runNewsletterMode() {
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/ai/newsletter-from-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: newsletterUrl }),
      });

      const json = (await res.json()) as NewsletterResponse;
      if (!res.ok || !json.html || !json.draft) {
        throw new Error(json.error?.message || "Newsletter mode failed");
      }

      const combinedText = [json.draft.lead, htmlToPlainText(json.draft.bodyHtml)].filter(Boolean).join("\n\n");

      setNewsletterHtml(json.html);
      setOutput(combinedText);
      setNewsletterMeta(
        `Forras: ${json.sourceTitle ?? "ismeretlen"}\nTargy: ${json.draft.subject}\nPreheader: ${json.draft.preheader}`,
      );

      writeWorkflowContext({
        aiText: combinedText,
        newsletterHtml: json.html,
        sourceTitle: json.sourceTitle,
        sourceUrl: json.sourceUrl,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected error");
    } finally {
      setLoading(false);
    }
  }

  async function copyNewsletterHtml() {
    if (!newsletterHtml) return;
    await navigator.clipboard.writeText(newsletterHtml);
  }

  function continueWorkflow() {
    if (!generatePdf && !generateEmail) {
      setError("Valassz kimenetet: PDF es/vagy Email.");
      return;
    }

    writeWorkflowContext({
      aiText: output || undefined,
      newsletterHtml: newsletterHtml || undefined,
    });

    if (generatePdf && generateEmail) {
      router.push("/pdf?from=ai&next=email");
      return;
    }

    router.push(generatePdf ? "/pdf?from=ai" : "/email-builder?from=ai");
  }

  return (
    <section className="space-y-4 rounded-lg border bg-white p-4">
      <div className="space-y-2">
        <h2 className="font-semibold text-brand-navy">A mod: Instrukcios szovegiras</h2>
        <textarea
          className="h-28 w-full rounded border p-2"
          value={instruction}
          onChange={(e) => setInstruction(e.target.value)}
          placeholder="Irj egy instrukciot ugyfelnek szolo penzugyi szoveghez..."
        />
        <button
          onClick={runInstructionMode}
          disabled={loading || instruction.trim().length < 5}
          className="rounded bg-brand-navy px-4 py-2 text-white disabled:opacity-60"
        >
          Vazlat generalasa
        </button>
      </div>

      <div className="space-y-2 border-t pt-4">
        <h2 className="font-semibold text-brand-navy">B mod: URL osszefoglalas</h2>
        <input
          className="w-full rounded border p-2"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://belso-cikk-url"
        />
        <button
          onClick={runUrlMode}
          disabled={loading || url.trim().length < 8}
          className="rounded bg-brand-navy px-4 py-2 text-white disabled:opacity-60"
        >
          Ossfoglalas generalasa
        </button>
      </div>

      <div className="space-y-2 border-t pt-4">
        <h2 className="font-semibold text-brand-navy">C mod: URL -&gt; hirlevel tervezet</h2>
        <input
          className="w-full rounded border p-2"
          value={newsletterUrl}
          onChange={(e) => setNewsletterUrl(e.target.value)}
          placeholder="https://www.con.hu/concordeblog/..."
        />
        <div className="flex gap-2">
          <button
            onClick={runNewsletterMode}
            disabled={loading || newsletterUrl.trim().length < 8}
            className="rounded bg-brand-teal px-4 py-2 text-white disabled:opacity-60"
          >
            Hirlevel generalasa
          </button>
          <button
            onClick={copyNewsletterHtml}
            disabled={!newsletterHtml}
            className="rounded border px-4 py-2 disabled:opacity-60"
          >
            HTML masolasa
          </button>
        </div>
      </div>

      {(output || newsletterHtml) && (
        <div className="space-y-2 border-t pt-4">
          <p className="text-sm font-semibold text-brand-navy">3. Kimenet valasztas</p>
          <div className="flex flex-wrap gap-4 text-sm">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={generatePdf} onChange={(e) => setGeneratePdf(e.target.checked)} />
              PDF generalas
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={generateEmail} onChange={(e) => setGenerateEmail(e.target.checked)} />
              Email generalas
            </label>
          </div>
          <button onClick={continueWorkflow} className="rounded bg-brand-navy px-4 py-2 text-xs text-white">
            4. Tovabb a generalashoz
          </button>
        </div>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}
      {output && <textarea readOnly value={output} className="h-64 w-full rounded border p-2" />}
      {newsletterMeta && <textarea readOnly value={newsletterMeta} className="h-28 w-full rounded border p-2 text-sm" />}
      {newsletterHtml && <textarea readOnly value={newsletterHtml} className="h-72 w-full rounded border p-2 font-mono text-xs" />}
    </section>
  );
}
