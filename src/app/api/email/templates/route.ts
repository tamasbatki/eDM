import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { apiErrorResponse, apiValidationErrorResponse } from "@/lib/api-response";
import { listEmailTemplates, saveEmailTemplate } from "@/server/email/email-template.service";

export const runtime = "nodejs";

const saveTemplateSchema = z.object({
  id: z.string().min(1).optional(),
  name: z.string().min(1),
  mjml: z.string().min(1),
});

export async function GET() {
  try {
    const templates = await listEmailTemplates();
    return NextResponse.json({ templates });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parseResult = saveTemplateSchema.safeParse(body);

  if (!parseResult.success) {
    return apiValidationErrorResponse("Invalid request body", parseResult.error.flatten());
  }

  try {
    const template = await saveEmailTemplate(parseResult.data);
    return NextResponse.json({ template });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
