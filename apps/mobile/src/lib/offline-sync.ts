import * as FileSystem from "expo-file-system";
import { getActiveToken } from "./api";
import { deleteDraftSQLite, getAllDraftsSQLite, saveDraftSQLite } from "./sqlite-drafts";

const BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || "https://kesling.biz.id";

export async function syncAllDrafts(): Promise<{
  successCount: number;
  failCount: number;
  errors: string[];
}> {
  const token = await getActiveToken();
  if (!token) {
    return { successCount: 0, failCount: 0, errors: ["Belum terautentikasi (Sesi habis)"] };
  }

  const drafts = await getAllDraftsSQLite();
  if (drafts.length === 0) {
    return { successCount: 0, failCount: 0, errors: [] };
  }

  let successCount = 0;
  let failCount = 0;
  const errors: string[] = [];

  for (const draft of drafts) {
    try {
      // Siapkan foto base64 dari filesystem lokal
      const photosPayload: Array<{ base64: string; mimeType: string }> = [];
      for (const p of draft.photos) {
        try {
          const base64Data = await (FileSystem as any).readAsStringAsync(p.uri, {
            encoding: "base64",
          });
          photosPayload.push({
            base64: base64Data,
            mimeType: p.mimeType || "image/jpeg",
          });
        } catch (e) {
          console.warn("Gagal membaca file foto draft:", p.uri, e);
        }
      }

      const payload = {
        submissions: [
          {
            localId: draft.localId,
            templateId: draft.templateId,
            sasaranId: draft.sasaranId,
            values: {
              ...draft.values,
              nama: draft.namaSasaran || draft.values.nama || "",
              alamat: draft.alamatSasaran || draft.values.alamat || "",
            },
            photos: photosPayload,
            signature: draft.signatureData ? { base64Data: draft.signatureData } : undefined,
            signaturePetugas: draft.signaturePetugasData ? { base64Data: draft.signaturePetugasData } : undefined,
            createdAt: draft.createdAt,
          },
        ],
      };

      const res = await fetch(`${BASE_URL}/api/mobile/v1/inspection/offline-sync`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || `HTTP ${res.status}`);
      }

      const resData = await res.json();
      if (resData.failed > 0 && resData.results?.[0]?.error) {
        throw new Error(resData.results[0].error);
      }

      // Berhasil disinkron -> hapus dari SQLite lokal & file fisik foto
      await deleteDraftSQLite(draft.localId);
      successCount++;
    } catch (err: any) {
      failCount++;
      const msg = err?.message || "Gagal menghubungi server";
      errors.push(`${draft.templateName || "Inspeksi"}: ${msg}`);
      // Tandai status gagal di SQLite
      await saveDraftSQLite({
        ...draft,
        status: "FAILED",
        lastError: msg,
      });
    }
  }

  return { successCount, failCount, errors };
}

// Alias for seamless backward compatibility
export const syncAllDraftsOffline = async () => {
  const res = await syncAllDrafts();
  return {
    synced: res.successCount,
    failed: res.failCount,
    errors: res.errors,
  };
};
