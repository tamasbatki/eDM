import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { apiErrorResponse, apiValidationErrorResponse } from "@/lib/api-response";
import {
  getEmailStarterBlocks,
  normalizeEmailHtml,
  validateMergeTags,
} from "@/server/email/email-export.service";

export const runtime = "nodejs";

const schema = z.object({
  html: z.string().min(1),
});

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parseResult = schema.safeParse(body);

  if (!parseResult.success) {
    return apiValidationErrorResponse("Invalid request body", parseResult.error.flatten());
  }

  try {
    validateMergeTags(parseResult.data.html);
    const html = normalizeEmailHtml(parseResult.data.html);

    return NextResponse.json({
      html,
      starterBlocks: getEmailStarterBlocks(),
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
