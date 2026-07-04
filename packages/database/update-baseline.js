const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  await prisma.dynamicParameter.updateMany({
    where: {
      code: {
        in: ['terdaftar', 'jumlahTotal', 'jumlahRumahAda', 'jumlah']
      }
    },
    data: {
      isBaseline: true
    }
  });
  console.log("Baseline updated");
}
main().finally(() => prisma.$disconnect());
