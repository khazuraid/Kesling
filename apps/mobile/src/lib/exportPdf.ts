import { Directory, EncodingType, File, Paths } from "expo-file-system";
import { shareAsync } from "expo-sharing";

// ponytail: uses backend jsPDF endpoint; local render when offline PDF needed

const BASE = process.env.EXPO_PUBLIC_API_URL || "https://kesling.biz.id";

/**
 * Download inspection PDF from backend and open share sheet.
 * Backend: /api/mobile/v1/inspection/results/[id]/pdf (jsPDF)
 */
export async function shareInspectionPdf(id: number, token: string) {
  const url = `${BASE}/api/mobile/v1/inspection/results/${id}/pdf`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error(`Gagal membuat PDF (${res.status})`);
  const blob = await res.blob();
  const base64 = await blobToBase64(blob);
  const cacheDir = new Directory(Paths.cache);
  const file = new File(cacheDir, `inspeksi-${id}.pdf`);
  file.write(base64, { encoding: EncodingType.Base64 });
  await shareAsync(file.uri, { mimeType: "application/pdf", dialogTitle: "Bagikan Hasil Inspeksi" });
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(",")[1] || "");
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
