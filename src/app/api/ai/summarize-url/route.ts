import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { apiErrorResponse, apiValidationErrorResponse } from "@/lib/api-response";
import { assertAiEnabled } from "@/server/ai/ai-availability";
import { summarizeArticleForClient } from "@/server/ai/llm.service";
import { extractMainArticleText } from "@/server/scraping/article-extractor.service";

export const runtime = "nodejs";

const schema = z.object({
  url: z.string().url(),
});

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parseResult = schema.safeParse(body);

  if (!parseResult.success) {
    return apiValidationErrorResponse("Invalid request body", parseResult.error.flatten());
  }

  try {
    assertAiEnabled();
    const articleText = await extractMainArticleText(parseResult.data.url);
    const text = await summarizeArticleForClient(articleText);

    return NextResponse.json({ text, language: "hu" });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
