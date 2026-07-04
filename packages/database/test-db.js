const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const p = await prisma.dynamicParameter.findMany({
    include: { category: true }
  });
  console.log(JSON.stringify(p, null, 2));
}
main().finally(() => prisma.$disconnect());
