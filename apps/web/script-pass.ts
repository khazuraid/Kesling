import { PrismaClient } from "@apps-kes/database";
import * as bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const hash = await bcrypt.hash("admin123", 10);
  await prisma.user.update({
    where: { email: "a@a.com" },
    data: { password: hash },
  });
  console.log("Updated!");
}
main();
