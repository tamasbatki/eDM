import { AppError } from "@/lib/app-error";
import { defaultEmailSnippets } from "@/lib/design-defaults";

const ALLOWED_MERGE_TAGS = new Set(["{{client_name}}", "{{advisor_name}}", "{{portfolio_name}}"]);

export function validateMergeTags(html: string): void {
  const matches = html.match(/{{\s*[a-zA-Z0-9_]+\s*}}/g) ?? [];

  for (const rawTag of matches) {
    const normalized = rawTag.replace(/\s+/g, "");
    if (!ALLOWED_MERGE_TAGS.has(normalized) && normalized !== "{{pdf_url}}" && normalized !== "{{chart_image_url}}") {
      throw new AppError("UNSUPPORTED_MERGE_TAG", `Unsupported merge tag: ${rawTag}`, 400, {
        tag: rawTag,
      });
    }
  }
}

export function normalizeEmailHtml(html: string): string {
  return html.trim();
}

export function getEmailStarterBlocks() {
  return {
    cta: defaultEmailSnippets.cta,
    chart: defaultEmailSnippets.chart,
  };
}
