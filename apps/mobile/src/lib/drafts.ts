import AsyncStorage from "@react-native-async-storage/async-storage";

const DRAFTS_KEY = "kesling_drafts";

export type Draft = {
  localId: string;
  templateId: number;
  templateName?: string;
  values: Record<string, string>;
  fieldValues: Record<string, string>;
  createdAt: string;
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
  drafts.push(draft);
  await AsyncStorage.setItem(DRAFTS_KEY, JSON.stringify(drafts));
}

export async function removeDraft(localId: string): Promise<void> {
  const drafts = await getDrafts();
  await AsyncStorage.setItem(DRAFTS_KEY, JSON.stringify(drafts.filter((d) => d.localId !== localId)));
}
