import { NextRequest, NextResponse } from "next/server";

import { apiErrorResponse } from "@/lib/api-response";
import { listEmailAssets, saveEmailAsset } from "@/server/email/email-asset.service";

export const runtime = "nodejs";

export async function GET() {
  try {
    const assets = await listEmailAssets();
    return NextResponse.json({ assets });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const files = formData.getAll("files").filter((entry): entry is File => entry instanceof File);

    if (!files.length) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "No files were uploaded",
          },
        },
        { status: 400 },
      );
    }

    const assets = await Promise.all(files.map((file) => saveEmailAsset(file)));
    return NextResponse.json({ assets });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
