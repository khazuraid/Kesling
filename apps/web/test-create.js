const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const result = await prisma.inspectionResult.create({
    data: {
      templateId: 4,
      puskesmasId: 2,
      userId: 2,
      namaSasaran: "Test dari Node Local",
      alamatSasaran: "Alamat Local",
      status: "APPROVED",
      bulan: 6,
      tahun: 2026,
      values: {
        create: [
          { fieldId: 49, valueString: "TRUE" },
          { fieldId: 50, valueString: "TRUE" },
          { fieldId: 51, valueString: "TRUE" }
        ]
      }
    }
  });
  console.log("Created:", result.id);
  
  // Karena backend ada di container, API akan otomatis trigger aggregasi di container
}
main().catch(console.error);