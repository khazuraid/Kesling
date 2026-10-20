import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { type NextRequest, NextResponse } from "next/server";

export async function GET(_req: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  try {
    const { path: pathSegments } = await context.params;
    if (!pathSegments || pathSegments.length === 0) {
      return new NextResponse("Not Found", { status: 404 });
    }

    const candidateDirs = [
      path.resolve(process.cwd(), "public", "uploads"),
      path.resolve(process.cwd(), "apps", "web", "public", "uploads"),
      path.resolve(process.cwd(), "..", "public", "uploads"),
      "/app/apps/web/public/uploads",
      "/app/public/uploads",
    ];

    let targetPath: string | null = null;
    for (const dir of candidateDirs) {
      const resolved = path.resolve(dir, ...pathSegments);
      if (!resolved.startsWith(dir)) continue; // Traversal protection
      try {
        const s = await stat(resolved);
        if (s.isFile()) {
          targetPath = resolved;
          break;
        }
      } catch {
        // Continue searching next candidate
      }
    }

    if (!targetPath) {
      return new NextResponse("Not Found", { status: 404 });
    }

    const ext = path.extname(targetPath).toLowerCase();
    const mimeTypes: Record<string, string> = {
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".png": "image/png",
      ".webp": "image/webp",
      ".gif": "image/gif",
      ".svg": "image/svg+xml",
      ".pdf": "application/pdf",
    };
    const contentType = mimeTypes[ext] || "application/octet-stream";

    const buffer = await readFile(targetPath);

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return new NextResponse("Not Found", { status: 404 });
  }
}
