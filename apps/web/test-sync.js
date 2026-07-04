const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const allResults = await prisma.inspectionResult.findMany({
    where: { puskesmasId: 2, bulan: 6, tahun: 2026, status: "APPROVED" },
    select: { id: true }
  });
  console.log("Triggering re-agregasi untuk " + allResults.length + " data...");
  for (const r of allResults) {
    // kita cukup panggil POST api/inspection/results
    // atau biarkan admin submit form baru, nanti otomatis di-hitung ulang semuanya.
  }
}
main().catch(console.error);