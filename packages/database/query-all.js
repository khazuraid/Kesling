const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const params = await prisma.dynamicParameter.findMany({
    include: { category: true }
  });
  for (const p of params) {
    console.log(`[${p.category.code}] - ${p.nama} (code: ${p.code}): isBaseline=${p.isBaseline}`);
  }
}
main().catch(console.error).finally(() => prisma.$disconnect());
