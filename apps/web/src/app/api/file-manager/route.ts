import { readdir, stat, unlink } from "node:fs/promises";
import path from "node:path";
import { prisma } from "@apps-kes/database";
import { type NextRequest, NextResponse } from "next/server";
import { withAdmin } from "@/lib/api-auth";

const UPLOAD_ROOT = path.join(process.cwd(), "public", "uploads");

async function listFiles(dir: string, base = ""): Promise<{ path: string; size: number; mtime: Date }[]> {
  const entries = await readdir(dir, { withFileTypes: true }).catch(() => []);
  const out: { path: string; size: number; mtime: Date }[] = [];
  for (const entry of entries) {
    const rel = base ? `${base}/${entry.name}` : entry.name;
    if (entry.isDirectory()) out.push(...(await listFiles(path.join(dir, entry.name), rel)));
    else {
      const info = await stat(path.join(dir, entry.name)).catch(() => null);
      if (info) out.push({ path: `/uploads/${rel}`, size: info.size, mtime: info.mtime });
    }
  }
  return out;
}

// GET: list all files under public/uploads with referenced/orphan status.
export const GET = withAdmin(async () => {
  const files = await listFiles(UPLOAD_ROOT);
  const results = await prisma.inspectionResult.findMany({
    select: { fotoPaths: true },
    where: { fotoPaths: { not: { equals: [] } } },
  });
  const referenced = new Set<string>();
  for (const r of results)
    for (const p of (r.fotoPaths as unknown[]) || []) if (typeof p === "string") referenced.add(p);
  const items = files.map((f) => ({ ...f, orphan: !referenced.has(f.path) }));
  return NextResponse.json({
    items: items.sort((a, b) => Number(b.orphan) - Number(a.orphan) || b.mtime.getTime() - a.mtime.getTime()),
    total: items.length,
    orphans: items.filter((i) => i.orphan).length,
    orphanBytes: items.filter((i) => i.orphan).reduce((s, i) => s + i.size, 0),
  });
});

// DELETE ?path=/uploads/mobile/xxx.jpg — single file (must be orphan), or ?orphans=1 for bulk.
export const DELETE = withAdmin(async (req: NextRequest) => {
  const url = req.nextUrl;
  const results = await prisma.inspectionResult.findMany({
    select: { fotoPaths: true },
    where: { fotoPaths: { not: { equals: [] } } },
  });
  const referenced = new Set<string>();
  for (const r of results)
    for (const p of (r.fotoPaths as unknown[]) || []) if (typeof p === "string") referenced.add(p);

  if (url.searchParams.get("orphans") === "1") {
    const files = (await listFiles(UPLOAD_ROOT)).filter((f) => !referenced.has(f.path));
    let deleted = 0;
    for (const f of files) {
      const abs = path.join(process.cwd(), "public", path.normalize(f.path));
      if (!abs.startsWith(UPLOAD_ROOT)) continue;
      if (
        await unlink(abs)
          .then(() => true)
          .catch(() => false)
      )
        deleted++;
    }
    return NextResponse.json({ deleted });
  }

  const target = url.searchParams.get("path") || "";
  if (!target.startsWith("/uploads/") || target.includes(".."))
    return NextResponse.json({ error: "Path tidak valid" }, { status: 400 });
  if (referenced.has(target))
    return NextResponse.json({ error: "File masih dirujuk data pemeriksaan; hapus datanya dulu." }, { status: 409 });
  const abs = path.join(process.cwd(), "public", path.normalize(target));
  if (!abs.startsWith(UPLOAD_ROOT)) return NextResponse.json({ error: "Path tidak valid" }, { status: 400 });
  await unlink(abs).catch(() => {});
  return NextResponse.json({ deleted: 1 });
});
