import { LaporanSaranaPage } from "@/components/laporan-sarana-page";

export default function LaporanJambanPage() {
  return <LaporanSaranaPage title="Laporan Jamban" jenis="jamban" apiUrl="/api/laporan/jamban" kategori="JAMBAN" />;
}
