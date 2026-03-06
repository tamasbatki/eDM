import { mkdir, readdir, stat } from "node:fs/promises";
import path from "node:path";

import { AppError } from "@/lib/app-error";
import { createTimestampedName, saveBinaryToPublicDir } from "@/server/storage/file-storage.service";

export interface EmailAssetRecord {
  name: string;
  url: string;
  size: number;
  updatedAt: string;
}

const assetDir = path.join(process.cwd(), "public", "generated", "email-assets");
const allowedMimeTypes = new Set(["image/png", "image/jpeg", "image/webp", "image/gif"]);

function getExtension(filename: string, mimeType: string): string {
  const cleanName = filename.toLowerCase();
  if (cleanName.endsWith(".png") || mimeType === "image/png") return "png";
  if (cleanName.endsWith(".jpg") || cleanName.endsWith(".jpeg") || mimeType === "image/jpeg") return "jpg";
  if (cleanName.endsWith(".webp") || mimeType === "image/webp") return "webp";
  if (cleanName.endsWith(".gif") || mimeType === "image/gif") return "gif";
  throw new AppError("VALIDATION_ERROR", "Unsupported image type", 400, { filename, mimeType });
}

async function ensureAssetDir() {
  await mkdir(assetDir, { recursive: true });
}

export async function listEmailAssets(): Promise<EmailAssetRecord[]> {
  await ensureAssetDir();

  const entries = await readdir(assetDir, { withFileTypes: true });
  const assets = await Promise.all(
    entries
      .filter((entry) => entry.isFile())
      .map(async (entry) => {
        const filePath = path.join(assetDir, entry.name);
        const metadata = await stat(filePath);

        return {
          name: entry.name,
          url: `/generated/email-assets/${entry.name}`,
          size: metadata.size,
          updatedAt: metadata.mtime.toISOString(),
        } satisfies EmailAssetRecord;
      }),
  );

  return assets.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function saveEmailAsset(file: File): Promise<EmailAssetRecord> {
  if (!allowedMimeTypes.has(file.type)) {
    throw new AppError("VALIDATION_ERROR", "Only PNG, JPG, WEBP, or GIF images are supported", 400, {
      type: file.type,
      name: file.name,
    });
  }

  if (file.size > 8 * 1024 * 1024) {
    throw new AppError("VALIDATION_ERROR", "Image is too large. Maximum size is 8 MB.", 400, {
      size: file.size,
      name: file.name,
    });
  }

  const extension = getExtension(file.name, file.type);
  const buffer = Buffer.from(await file.arrayBuffer());
  const filename = createTimestampedName([file.name.replace(/\.[^.]+$/, "")], extension);
  const url = await saveBinaryToPublicDir("generated/email-assets", filename, buffer);

  return {
    name: filename,
    url,
    size: file.size,
    updatedAt: new Date().toISOString(),
  };
}
