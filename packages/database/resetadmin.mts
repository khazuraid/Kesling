import { prisma } from "/Users/fikri/Aplikasi/apps-kes/packages/database/index.ts";
import { hash } from "bcryptjs";
const pw = await hash("admin123", 12);
const u = await prisma.user.upsert({
  where: { email: "admin@dinkes.go.id" },
  update: { password: pw },
  create: { nama: "Administrator", email: "admin@dinkes.go.id", password: pw, role: "ADMIN" },
});
console.log("ok", u.email, u.role);
process.exit(0);
