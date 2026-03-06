import { NextResponse } from "next/server";

import { validateStartupEnv } from "@/lib/env";

export const runtime = "nodejs";

export async function GET() {
  const envState = validateStartupEnv();

  return NextResponse.json({
    status: envState.ok ? "ok" : "degraded",
    checks: {
      env: envState,
    },
    now: new Date().toISOString(),
  });
}
