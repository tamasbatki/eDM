import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";

import { GET } from "@/app/api/finance/history/route";

describe("finance history route", () => {
  it("returns validation envelope for missing symbol", async () => {
    const req = new NextRequest("http://localhost/api/finance/history?range=1Y");
    const res = await GET(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json).toHaveProperty("error.code", "VALIDATION_ERROR");
    expect(json).toHaveProperty("error.message", "Invalid query parameters");
  });
});
