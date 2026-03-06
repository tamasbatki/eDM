import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { apiErrorResponse, apiValidationErrorResponse } from "@/lib/api-response";
import { renderEmailTemplate } from "@/server/email/email-compose.service";

export const runtime = "nodejs";

const schema = z.object({
  templateId: z.string().min(1),
  newsletterTitle: z.string().min(1),
  newsletterLead: z.string().optional(),
  newsletterBody: z.string().min(1),
  chartImageUrls: z.array(z.string()).optional(),
  pdfUrl: z.string().optional(),
  sourceUrl: z.string().optional(),
});

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = schema.safeParse(body);

  if (!parsed.success) {
    return apiValidationErrorResponse("Invalid request body", parsed.error.flatten());
  }

  try {
    const result = await renderEmailTemplate(parsed.data);
    return NextResponse.json(result);
  } catch (error) {
    return apiErrorResponse(error);
  }
}
