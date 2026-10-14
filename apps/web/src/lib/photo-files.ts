import { randomUUID } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

/** Best-effort delete of physical inspection photo files; never blocks data deletion. */
export async function deletePhotoFiles(fotoPaths: unknown) {
  const paths = Array.isArray(fotoPaths) ? fotoPaths : [];
  for (const p of paths) {
    if (typeof p !== "string" || !p.startsWith("/uploads/")) continue;
    // Defense: strip traversal, stay inside public/uploads.
    const safe = path.normalize(p).replace(/^(\.\.[/\\])+/, "");
    const abs = path.join(process.cwd(), "public", safe);
    if (!abs.startsWith(path.join(process.cwd(), "public", "uploads"))) continue;
    await unlink(abs).catch(() => {});
  }
}

/**
 * Saves a base64 image data URL to public/uploads/<subfolder> and returns the public URL path (/uploads/...)
 * If already a URL or path, returns as-is.
 */
export async function saveBase64Photo(dataUrlOrPath: string, subfolder = "inspections"): Promise<string> {
  if (!dataUrlOrPath || typeof dataUrlOrPath !== "string") return "";
  if (dataUrlOrPath.startsWith("/uploads/") || dataUrlOrPath.startsWith("http")) return dataUrlOrPath;

  const match = dataUrlOrPath.match(/^data:(image\/[a-zA-Z0-9+.-]+);base64,(.+)$/);
  if (!match) return dataUrlOrPath;

  const mime = match[1];
  const rawBase64 = match[2];
  const ext = mime.includes("png") ? "png" : mime.includes("webp") ? "webp" : "jpg";

  const uploadDir = path.join(process.cwd(), "public", "uploads", subfolder);
  await mkdir(uploadDir, { recursive: true });
  const fileName = `${Date.now()}-${randomUUID()}.${ext}`;
  const filePath = path.join(uploadDir, fileName);
  await writeFile(filePath, Buffer.from(rawBase64, "base64"));
  return `/uploads/${subfolder}/${fileName}`;
}
