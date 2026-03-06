import { AppError } from "@/lib/app-error";
import { normalizeEmailHtml, validateMergeTags } from "@/server/email/email-export.service";
import { getEmailTemplate } from "@/server/email/email-template.service";

export interface RenderEmailTemplateInput {
  templateId: string;
  newsletterTitle: string;
  newsletterLead?: string;
  newsletterBody: string;
  chartImageUrls?: string[];
  pdfUrl?: string;
  sourceUrl?: string;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function textToMjml(text: string): string {
  return text
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block) => `<mj-text padding="0 0 14px 0" font-size="14px" line-height="22px" color="#454547">${escapeHtml(block).replace(/\n/g, "<br />")}</mj-text>`)
    .join("");
}

function buildContentBlock(input: RenderEmailTemplateInput): string {
  const chartUrls = input.chartImageUrls?.filter(Boolean) ?? [];
  const chartsMjml = chartUrls
    .map((url) => `<mj-image src="${escapeHtml(url)}" alt="Piaci grafikon" padding="0 0 16px 0" fluid-on-mobile="true" border="1px solid #E5E5E7" />`)
    .join("");

  const ctaHref = input.pdfUrl || input.sourceUrl;
  const cta = ctaHref
    ? `<mj-button align="left" background-color="#F18E00" color="#ffffff" font-size="14px" border-radius="4px" inner-padding="14px 22px" href="${escapeHtml(ctaHref)}">Reszletes megnyitas</mj-button>`
    : "";

  const lead = input.newsletterLead?.trim()
    ? `<mj-text padding="0 0 16px 0" font-size="16px" line-height="24px" color="#454547">${escapeHtml(input.newsletterLead)}</mj-text>`
    : "";

  return `
    <mj-section padding="0 30px 30px 30px" css-class="condm-composer-content">
      <mj-column>
        <mj-text padding="0 0 12px 0" font-size="24px" font-weight="700" color="#454547">${escapeHtml(input.newsletterTitle)}</mj-text>
        ${lead}
        ${textToMjml(input.newsletterBody)}
        ${chartsMjml}
        ${cta}
      </mj-column>
    </mj-section>
  `;
}

function injectContent(templateMjml: string, contentMjml: string): string {
  if (templateMjml.includes("{{content_block}}")) {
    return templateMjml.replace("{{content_block}}", contentMjml);
  }

  if (templateMjml.includes("</mj-wrapper>")) {
    return templateMjml.replace("</mj-wrapper>", `${contentMjml}</mj-wrapper>`);
  }

  if (templateMjml.includes("</mj-body>")) {
    return templateMjml.replace("</mj-body>", `${contentMjml}</mj-body>`);
  }

  throw new AppError("INTERNAL_ERROR", "Template format is not supported for content insertion", 500);
}

export async function renderEmailTemplate(input: RenderEmailTemplateInput): Promise<{ html: string; mjml: string }> {
  const { default: mjml2html } = await import("mjml");

  const template = await getEmailTemplate(input.templateId);
  const contentMjml = buildContentBlock(input);
  const mergedMjml = injectContent(template.mjml, contentMjml);
  const result = mjml2html(mergedMjml, {
    validationLevel: "soft",
    minify: false,
  });

  if (result.errors?.some((error) => error.formattedMessage)) {
    const fatal = result.errors.find((error) => /error/i.test(error.formattedMessage || ""));
    if (fatal) {
      throw new AppError("BAD_REQUEST", fatal.formattedMessage || "MJML rendering failed", 400, {
        errors: result.errors,
      });
    }
  }

  validateMergeTags(result.html);
  return {
    html: normalizeEmailHtml(result.html),
    mjml: mergedMjml,
  };
}
