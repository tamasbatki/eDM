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

  it("exposes max article char limit", () => {
    expect(llmInternals.MAX_ARTICLE_CHARS).toBe(12000);
  });
});
