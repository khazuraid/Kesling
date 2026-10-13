import { unlink } from "node:fs/promises";
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
