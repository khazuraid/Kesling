import { aggregateInspectionToLaporan } from "./src/lib/aggregate-inspection";

async function main() {
  console.log("Menjalankan test agregasi untuk resultId 4...");
  await aggregateInspectionToLaporan(4);
  console.log("Agregasi selesai.");
}

main().catch(console.error);
