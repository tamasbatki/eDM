import { describe, expect, it } from "vitest";

import { getEmailStarterBlocks, validateMergeTags } from "@/server/email/email-export.service";

describe("email export service", () => {
  it("accepts allowed merge tags", () => {
    expect(() => validateMergeTags("Hello {{client_name}}, contact {{advisor_name}}.")).not.toThrow();
  });

  it("rejects unsupported merge tags", () => {
    expect(() => validateMergeTags("Hello {{unknown_tag}}.")).toThrow(/Unsupported merge tag/);
  });

  it("returns starter blocks for CTA and chart", () => {
    const blocks = getEmailStarterBlocks();
    expect(blocks.cta).toContain("{{pdf_url}}");
    expect(blocks.chart).toContain("{{chart_image_url}}");
  });
});
