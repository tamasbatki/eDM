import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { apiErrorResponse, apiValidationErrorResponse } from "@/lib/api-response";
import { generateFinancialChartImage } from "@/server/charting/chart-image.service";

export const runtime = "nodejs";

const pointSchema = z.object({ timestamp: z.string(), close: z.number() });

const schema = z.object({
  symbol: z.string().min(1),
  range: z.enum(["1M", "3M", "6M", "1Y", "3Y", "5Y", "MAX"]),
  variant: z.enum(["close-area", "close-line"]).default("close-area"),
  points: z.array(pointSchema).min(1),
  benchmarkSymbol: z.string().optional(),
  benchmarkPoints: z.array(pointSchema).optional(),
});

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parseResult = schema.safeParse(body);

  if (!parseResult.success) {
    return apiValidationErrorResponse("Invalid request body", parseResult.error.flatten());
  }

  try {
    const imageUrl = await generateFinancialChartImage(parseResult.data);
    return NextResponse.json({ imageUrl });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
