import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import path from "node:path";

import { AppError } from "@/lib/app-error";

export interface EmailTemplateRecord {
  id: string;
  name: string;
  mjml: string;
  createdAt: string;
  updatedAt: string;
}

export interface EmailTemplateSummary {
  id: string;
  name: string;
  updatedAt: string;
}

export interface EmailTemplateQaResult {
  ok: boolean;
  normalizedMjml: string;
  errors: string[];
  warnings: string[];
}

const templatesDir = path.join(process.cwd(), "data", "email-templates");

function slug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

function getTemplateFilePath(id: string): string {
  return path.join(templatesDir, `${id}.json`);
}

function normalizeStoredMjml(mjml: string): string {
  const trimmed = mjml.trim();
  const start = trimmed.indexOf("<mjml");
  const end = trimmed.lastIndexOf("</mjml>");
  const rootOnly = start >= 0 && end > start ? trimmed.slice(start, end + 7) : trimmed;

  return rootOnly
    .replace(
      /<mj-body([^>]*)>\s*<mj-section padding="24px 12px">\s*<mj-column>\s*<mj-wrapper([^>]*)>/,
      '<mj-body$1><mj-wrapper padding="24px 12px"$2>',
    )
    .replace(/<mj-wrapper([^>]*)>\s*<mj-section background-color="#454547"/g, '<mj-wrapper$1><mj-section background-color="#454547"')
    .replace(/<\/mj-wrapper>\s*<\/mj-column>\s*<\/mj-section>\s*<\/mj-body>/, "</mj-wrapper></mj-body>");
}

export async function inspectTemplateMjml(mjml: string): Promise<EmailTemplateQaResult> {
  const normalized = normalizeStoredMjml(mjml);
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!normalized.includes("<mjml") || !normalized.includes("</mjml>")) {
    errors.push("Malformed MJML. Check that your structure is correct and enclosed in <mjml> tags.");
    return { ok: false, normalizedMjml: normalized, errors, warnings };
  }

  const { default: mjml2html } = await import("mjml");
  const result = mjml2html(normalized, {
    validationLevel: "soft",
    minify: false,
  });

  const reported = (result.errors ?? [])
    .map((error) => error.formattedMessage ?? error.message ?? "")
    .filter(Boolean);

  errors.push(...reported);

  if (!normalized.includes("{{content_block}}")) {
    warnings.push("A template nem tartalmaz {{content_block}} placeholdert, ezert a composer fallback beszurasi logikat hasznal.");
  }

  return {
    ok: errors.length === 0,
    normalizedMjml: normalized,
    errors,
    warnings,
  };
}

async function validateTemplateMjml(mjml: string): Promise<string> {
  const qa = await inspectTemplateMjml(mjml);

  if (!qa.ok) {
    throw new AppError("VALIDATION_ERROR", qa.errors[0], 400, {
      errors: qa.errors,
      warnings: qa.warnings,
    });
  }

  return qa.normalizedMjml;
}

async function ensureTemplatesDir() {
  await mkdir(templatesDir, { recursive: true });
}

async function readTemplateFile(filePath: string): Promise<EmailTemplateRecord> {
  const raw = await readFile(filePath, "utf8");
  const parsed = JSON.parse(raw) as Partial<EmailTemplateRecord>;

  if (!parsed.id || !parsed.name || !parsed.mjml || !parsed.createdAt || !parsed.updatedAt) {
    throw new AppError("INTERNAL_ERROR", "Invalid email template file", 500, { filePath });
  }

  return {
    ...(parsed as EmailTemplateRecord),
    mjml: normalizeStoredMjml(parsed.mjml),
  };
}

export async function listEmailTemplates(): Promise<EmailTemplateSummary[]> {
  await ensureTemplatesDir();

  const files = await readdir(templatesDir, { withFileTypes: true });
  const templates = await Promise.all(
    files
      .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
      .map((entry) => readTemplateFile(path.join(templatesDir, entry.name))),
  );

  return templates
    .map((item) => ({
      id: item.id,
      name: item.name,
      updatedAt: item.updatedAt,
    }))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function getEmailTemplate(id: string): Promise<EmailTemplateRecord> {
  await ensureTemplatesDir();

  try {
    return await readTemplateFile(getTemplateFilePath(id));
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      throw new AppError("BAD_REQUEST", "Email template not found", 404, { id });
    }

    throw error;
  }
}

export async function saveEmailTemplate(input: {
  id?: string;
  name: string;
  mjml: string;
}): Promise<EmailTemplateRecord> {
  await ensureTemplatesDir();

  const now = new Date().toISOString();
  const templateId = input.id?.trim() || `${slug(input.name) || "email-template"}-${randomUUID().slice(0, 8)}`;

  let createdAt = now;
  if (input.id) {
    try {
      const existing = await getEmailTemplate(templateId);
      createdAt = existing.createdAt;
    } catch (error) {
      if (!(error instanceof AppError) || error.status !== 404) {
        throw error;
      }
    }
  }

  const validatedMjml = await validateTemplateMjml(input.mjml);

  const record: EmailTemplateRecord = {
    id: templateId,
    name: input.name.trim(),
    mjml: validatedMjml,
    createdAt,
    updatedAt: now,
  };

  await writeFile(getTemplateFilePath(templateId), JSON.stringify(record, null, 2), "utf8");
  return record;
}

export const emailTemplateInternals = {
  normalizeStoredMjml,
  inspectTemplateMjml,
  validateTemplateMjml,
};
