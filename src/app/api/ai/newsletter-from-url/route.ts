import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { apiErrorResponse, apiValidationErrorResponse } from "@/lib/api-response";
import { assertAiEnabled } from "@/server/ai/ai-availability";
import { generateNewsletterDraftFromArticle } from "@/server/ai/llm.service";
import { renderConcordeStyleNewsletterHtml } from "@/server/newsletter/newsletter-template.service";
import { extractArticleContent } from "@/server/scraping/article-extractor.service";

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

    const article = await extractArticleContent(parseResult.data.url);
    const draft = await generateNewsletterDraftFromArticle({
      articleTitle: article.title,
      articleText: article.text,
    });

    const html = renderConcordeStyleNewsletterHtml(draft, parseResult.data.url);

    return NextResponse.json({
      language: "hu",
      sourceTitle: article.title,
      sourceUrl: parseResult.data.url,
      draft,
      html,
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
