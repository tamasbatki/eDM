import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { apiErrorResponse, apiValidationErrorResponse } from "@/lib/api-response";
import { generatePdf } from "@/server/pdf/pdf.service";

export const runtime = "nodejs";

const chartRefSchema = z.string().trim().refine((value) => {
  if (!value) return false;
  if (value.startsWith("/")) return true;

  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}, "Must be an absolute URL or app-relative path starting with '/'");

const schema = z.object({
  template: z.enum(["market-update", "portfolio-summary"]),
  body: z.string().min(1),
  chartImageUrl: chartRefSchema.optional().or(z.literal("")),
  chartImageUrls: z.array(chartRefSchema).optional(),
});

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parseResult = schema.safeParse(body);

  if (!parseResult.success) {
    return apiValidationErrorResponse("Invalid request body", parseResult.error.flatten());
  }

  try {
    const result = await generatePdf({
      template: parseResult.data.template,
      body: parseResult.data.body,
      chartImageUrl: parseResult.data.chartImageUrl || undefined,
      chartImageUrls: parseResult.data.chartImageUrls,
    });

    return NextResponse.json(result);
  } catch (error) {
    return apiErrorResponse(error);
  }
}
