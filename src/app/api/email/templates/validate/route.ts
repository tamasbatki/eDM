import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { apiErrorResponse, apiValidationErrorResponse } from "@/lib/api-response";
import { inspectTemplateMjml } from "@/server/email/email-template.service";

export const runtime = "nodejs";

const schema = z.object({
  mjml: z.string().min(1),
});

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = schema.safeParse(body);

  if (!parsed.success) {
    return apiValidationErrorResponse("Invalid request body", parsed.error.flatten());
  }

  try {
    const qa = await inspectTemplateMjml(parsed.data.mjml);
    return NextResponse.json(qa, { status: qa.ok ? 200 : 400 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
