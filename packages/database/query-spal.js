const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const params = await prisma.dynamicParameter.findMany({
    include: { category: true }
  });
  console.log("SPAL Params:");
  for (const p of params) {
    if (p.category.code === 'SPAL') {
      console.log(`- ${p.nama} (code: ${p.code}): isBaseline=${p.isBaseline}`);
    }
  }
}
main().catch(console.error).finally(() => prisma.$disconnect());
