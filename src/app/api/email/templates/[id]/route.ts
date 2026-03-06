import { NextResponse } from "next/server";

import { apiErrorResponse } from "@/lib/api-response";
import { getEmailTemplate } from "@/server/email/email-template.service";

export const runtime = "nodejs";

export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const template = await getEmailTemplate(id);

    return NextResponse.json({ template });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
