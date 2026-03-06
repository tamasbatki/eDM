import fs from "node:fs";
import path from "node:path";

function loadDotEnvFile() {
  const envPath = path.join(process.cwd(), ".env");
  if (!fs.existsSync(envPath)) return;

  const raw = fs.readFileSync(envPath, "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;

    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();

    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

loadDotEnvFile();

const aiEnabled = (process.env.AI_ENABLED ?? "false").toLowerCase() === "true";
const provider = (process.env.LLM_PROVIDER ?? "gemini").toLowerCase();

const required = [];
if (aiEnabled) {
  if (provider === "openai") required.push("OPENAI_API_KEY");
  else required.push("GEMINI_API_KEY");
}

const missing = required.filter((key) => !process.env[key]);

if (missing.length > 0) {
  console.error(`Missing required env vars: ${missing.join(", ")}`);
  process.exit(1);
}

console.log("Environment check passed.");
