import { describe, expect, it } from "vitest";

import { llmInternals } from "@/server/ai/llm.service";

describe("llm internals", () => {
  it("does not truncate text below limit", () => {
    const input = "rovid szoveg";
    const out = llmInternals.truncateText(input, 100);
    expect(out).toBe(input);
  });

  it("truncates text above limit and appends marker", () => {
    const input = "x".repeat(50);
    const out = llmInternals.truncateText(input, 10);
    expect(out.length).toBeGreaterThan(10);
    expect(out).toContain("[TRUNCATED:");
  });

  it("normalizes newsletter fields to schema-safe lengths", () => {
    const draft = llmInternals.normalizeNewsletterDraft({
      subject: "  Ez egy hosszabb targy sor   ",
      preheader: "  Elonezet   ",
      title: "  Cim   ",
      lead: "  Ez egy vezeto mondat, amely mar eleg hosszu a teszthez.   ",
      bodyHtml: `<p>${"x".repeat(5200)}</p>`,
      ctaLabel: "Nagyon hosszu CTA szoveg, ami boven negyven karakter felett van",
    });

    expect(draft.subject).toBe("Ez egy hosszabb targy sor");
    expect(draft.ctaLabel.length).toBeLessThanOrEqual(40);
    expect(draft.bodyHtml.length).toBeLessThanOrEqual(5000);
  });

  it("exposes max article char limit", () => {
    expect(llmInternals.MAX_ARTICLE_CHARS).toBe(12000);
  });
});
