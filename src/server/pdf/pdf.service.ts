import path from "node:path";
import { readFile } from "node:fs/promises";

import puppeteer from "puppeteer";

import { getBrandTokens } from "../branding";
import { createTimestampedName, saveBinaryToPublicDir } from "../storage/file-storage.service";

export interface GeneratePdfInput {
  template: "market-update" | "portfolio-summary";
  body: string;
  chartImageUrl?: string;
  chartImageUrls?: string[];
}

export interface GeneratePdfOutput {
  pdfUrl: string;
  filename: string;
  generatedAt: string;
  template: GeneratePdfInput["template"];
}

function normalizeChartUrls(input: GeneratePdfInput): string[] {
  const list = [...(input.chartImageUrls ?? []), ...(input.chartImageUrl ? [input.chartImageUrl] : [])]
    .map((value) => value.trim())
    .filter(Boolean);

  return Array.from(new Set(list));
}

function getMimeTypeFromPath(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  if (ext === ".webp") return "image/webp";
  return "image/png";
}

async function toPdfImageSrc(url: string): Promise<string> {
  if (!url.startsWith("/")) return url;

  const publicPath = path.join(process.cwd(), "public", url.replace(/^\//, ""));
  const buffer = await readFile(publicPath);
  const mime = getMimeTypeFromPath(publicPath);

  return `data:${mime};base64,${buffer.toString("base64")}`;
}

async function renderTemplateHtml(input: GeneratePdfInput, generatedAt: string): Promise<string> {
  const tokens = getBrandTokens();
  const title = input.template === "market-update" ? "Piaci helyzetkep" : "Portfolio osszefoglalo";
  const chartUrls = normalizeChartUrls(input);
  const chartSources = await Promise.all(chartUrls.map((url) => toPdfImageSrc(url)));

  return `
  <html>
    <head>
      <meta charset="utf-8" />
      <style>
        body { font-family: ${tokens.typography.sans}; margin: ${tokens.spacing.pagePaddingPx}px; color: ${tokens.colors.text}; }
        h1 { color: ${tokens.colors.primary}; margin: 0 0 16px 0; }
        p { line-height: 1.6; white-space: pre-line; font-size: 14px; }
        .meta { color: ${tokens.colors.mutedText}; font-size: 12px; margin-bottom: ${tokens.spacing.sectionGapPx}px; }
        .chart { margin: ${tokens.spacing.sectionGapPx}px 0; border: 1px solid ${tokens.colors.border}; padding: 8px; }
        .chart img { max-width: 100%; page-break-inside: avoid; display:block; }
        .footer { margin-top: ${tokens.spacing.sectionGapPx}px; color: ${tokens.colors.mutedText}; font-size: 11px; }
      </style>
    </head>
    <body>
      <h1>${title}</h1>
      <div class="meta">Generalva: ${generatedAt}</div>
      ${chartSources.map((src) => `<div class="chart"><img src="${src}" /></div>`).join("")}
      <p>${input.body}</p>
      <div class="footer">Belsos hasznalatra keszult dokumentum.</div>
    </body>
  </html>`;
}

export async function generatePdf(input: GeneratePdfInput): Promise<GeneratePdfOutput> {
  const generatedAt = new Date().toISOString();
  const fileName = createTimestampedName([input.template, "report"], "pdf", new Date(generatedAt));

  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const page = await browser.newPage();
    const html = await renderTemplateHtml(input, generatedAt);
    await page.setContent(html, { waitUntil: "networkidle0" });

    const pdfBuffer = await page.pdf({ format: "A4", printBackground: true });
    const pdfUrl = await saveBinaryToPublicDir("generated/pdfs", fileName, Buffer.from(pdfBuffer));

    return {
      pdfUrl,
      filename: fileName,
      generatedAt,
      template: input.template,
    };
  } finally {
    await browser.close();
  }
}
