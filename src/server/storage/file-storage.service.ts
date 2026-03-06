import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

function slug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export async function saveBinaryToPublicDir(relativeDir: string, filename: string, buffer: Buffer): Promise<string> {
  const publicDir = path.join(process.cwd(), "public", relativeDir);
  await mkdir(publicDir, { recursive: true });

  const targetPath = path.join(publicDir, filename);
  await writeFile(targetPath, buffer);

  return `/${relativeDir.replace(/\\/g, "/")}/${filename}`;
}

export function createTimestampedName(parts: string[], extension: string, date = new Date()): string {
  const stamp = date.toISOString().replace(/[:.]/g, "-");
  const prefix = parts.map(slug).filter(Boolean).join("-");

  return `${prefix}-${stamp}.${extension}`;
}
