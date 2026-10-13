import AsyncStorage from "@react-native-async-storage/async-storage";

const DRAFTS_KEY = "kesling_drafts";

export type DraftPhoto = { base64: string; mimeType: string };

export type Draft = {
  localId: string;
  templateId: number;
  templateName?: string;
  values: Record<string, string>;
  fieldValues: Record<string, string>;
  createdAt: string;
  sasaranId?: number | null;
  photos?: DraftPhoto[];
  signature?: { base64Data: string };
  signaturePetugas?: { base64Data: string };
};

export async function getDrafts(): Promise<Draft[]> {
  try {
    const raw = await AsyncStorage.getItem(DRAFTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export async function saveDraft(draft: Draft): Promise<void> {
  const drafts = await getDrafts();
  try {
    await AsyncStorage.setItem(DRAFTS_KEY, JSON.stringify([...drafts, draft]));
  } catch {
    // ponytail: AsyncStorage ~6MB on Android — if photos blow the quota, keep the draft without them
    await AsyncStorage.setItem(
      DRAFTS_KEY,
      JSON.stringify([...drafts, { ...draft, photos: undefined, signature: undefined, signaturePetugas: undefined }]),
    );
  }
}

export async function removeDraft(localId: string): Promise<void> {
  const drafts = await getDrafts();
  await AsyncStorage.setItem(DRAFTS_KEY, JSON.stringify(drafts.filter((d) => d.localId !== localId)));
}
