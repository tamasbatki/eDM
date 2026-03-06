export function getRequiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

export function isAiEnabled(): boolean {
  return (process.env.AI_ENABLED ?? "false").toLowerCase() === "true";
}

export type LlmProvider = "gemini" | "openai";

export function getLlmProvider(): LlmProvider {
  const raw = (process.env.LLM_PROVIDER ?? "gemini").toLowerCase();
  return raw === "openai" ? "openai" : "gemini";
}

export const env = {
  appUrl: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  financialProvider: process.env.FINANCIAL_PROVIDER ?? "auto",
  defaultLanguage: process.env.DEFAULT_LANGUAGE ?? "hu",
  aiEnabled: isAiEnabled(),

  llmProvider: getLlmProvider(),
  openAiApiKey: process.env.OPENAI_API_KEY,
  openAiModel: process.env.OPENAI_MODEL ?? "gpt-4.1-mini",
  geminiApiKey: process.env.GEMINI_API_KEY,
  geminiModel: process.env.GEMINI_MODEL ?? "gemini-1.5-flash",
};

export function validateStartupEnv(): { ok: boolean; missing: string[] } {
  const required: string[] = [];

  if (isAiEnabled()) {
    if (getLlmProvider() === "openai") required.push("OPENAI_API_KEY");
    if (getLlmProvider() === "gemini") required.push("GEMINI_API_KEY");
  }

  const missing = required.filter((key) => !process.env[key]);
  return { ok: missing.length === 0, missing };
}
