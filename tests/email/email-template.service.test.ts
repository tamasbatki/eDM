import { describe, expect, it } from "vitest";

import { defaultEmailTemplate } from "@/lib/design-defaults";
import { AppError } from "@/lib/app-error";
import { emailTemplateInternals } from "@/server/email/email-template.service";

describe("email template service", () => {
  it("accepts the default MJML template", async () => {
    const validated = await emailTemplateInternals.validateTemplateMjml(defaultEmailTemplate);
    expect(validated).toContain("<mjml");
    expect(validated).toContain("</mjml>");
  });

  it("rejects malformed MJML templates on validation", async () => {
    await expect(emailTemplateInternals.validateTemplateMjml("<mj-section><mj-text>hibas</mj-text></mj-section>")).rejects.toMatchObject({
      code: "VALIDATION_ERROR",
      status: 400,
    });
  });
});

