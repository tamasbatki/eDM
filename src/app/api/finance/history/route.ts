import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { apiErrorResponse, apiValidationErrorResponse } from "@/lib/api-response";
import { getHistoricalCloseSeries } from "@/server/finance";

export const runtime = "nodejs";

const schema = z.object({
  symbol: z.string().min(1),
  range: z.enum(["1M", "3M", "6M", "1Y", "3Y", "5Y", "MAX"]).default("1Y"),
});

export async function GET(request: NextRequest) {
  const parseResult = schema.safeParse({
    symbol: request.nextUrl.searchParams.get("symbol"),
    range: request.nextUrl.searchParams.get("range") ?? "1Y",
  });

  if (!parseResult.success) {
    return apiValidationErrorResponse("Invalid query parameters", parseResult.error.flatten());
  }

  try {
    const points = await getHistoricalCloseSeries(parseResult.data);
    return NextResponse.json({
      symbol: parseResult.data.symbol.toUpperCase(),
      range: parseResult.data.range,
      points,
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
