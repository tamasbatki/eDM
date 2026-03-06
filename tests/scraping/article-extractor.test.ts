import { describe, expect, it } from "vitest";

import {
  extractMainArticleTextFromHtml,
  scrapingInternals,
} from "@/server/scraping/article-extractor.service";

describe("article extractor", () => {
  it("extracts from article tag", () => {
    const text = extractMainArticleTextFromHtml("<html><body><article>Alpha beta gamma</article></body></html>");
    expect(text).toContain("Alpha beta gamma");
  });

  it("falls back to body text", () => {
    const text = extractMainArticleTextFromHtml("<html><body><div>Fallback body content</div></body></html>");
    expect(text).toContain("Fallback body content");
  });

  it("applies extraction character limit", () => {
    const long = "a".repeat(scrapingInternals.MAX_EXTRACTED_CHARS + 100);
    const text = extractMainArticleTextFromHtml(`<html><body><article>${long}</article></body></html>`);
    expect(text.length).toBe(scrapingInternals.MAX_EXTRACTED_CHARS);
  });
});
