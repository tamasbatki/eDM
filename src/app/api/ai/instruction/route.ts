import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { apiErrorResponse, apiValidationErrorResponse } from "@/lib/api-response";
import { assertAiEnabled } from "@/server/ai/ai-availability";
import { generateDraftFromInstruction } from "@/server/ai/llm.service";

export const runtime = "nodejs";

const schema = z.object({
  prompt: z.string().min(5),
});

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parseResult = schema.safeParse(body);

  if (!parseResult.success) {
    return apiValidationErrorResponse("Invalid request body", parseResult.error.flatten());
  }

  try {
    assertAiEnabled();
    const text = await generateDraftFromInstruction(parseResult.data.prompt);
    return NextResponse.json({ text, language: "hu" });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
