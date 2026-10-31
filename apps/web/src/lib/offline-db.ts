import { type DBSchema, type IDBPDatabase, openDB } from "idb";

export interface InspectionDraft {
  draftKey: string;
  templateId: number;
  sasaranId: number | null;
  formValues: Record<string, any>;
  metaValues: Record<string, any>;
  lat: number | null;
  lng: number | null;
  updatedAt: string;
}

export interface CachedTemplate {
  id: number;
  nama: string;
  kategori?: string;
  data: any;
  updatedAt: string;
}

interface AppsKesDB extends DBSchema {
  inspection_drafts: {
    key: string;
    value: InspectionDraft;
    indexes: { "by-updated": string };
  };
  cached_templates: {
    key: number;
    value: CachedTemplate;
  };
}

const DB_NAME = "apps-kes-offline";
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<AppsKesDB>> | null = null;

export function getOfflineDB() {
  if (typeof window === "undefined") {
    return null;
  }

  if (!dbPromise) {
    dbPromise = openDB<AppsKesDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains("inspection_drafts")) {
          const draftStore = db.createObjectStore("inspection_drafts", { keyPath: "draftKey" });
          draftStore.createIndex("by-updated", "updatedAt");
        }
        if (!db.objectStoreNames.contains("cached_templates")) {
          db.createObjectStore("cached_templates", { keyPath: "id" });
        }
      },
    });
  }

  return dbPromise;
}

export async function saveInspectionDraft(draft: InspectionDraft): Promise<void> {
  const db = await getOfflineDB();
  if (!db) return;
  await db.put("inspection_drafts", draft);
}

export async function getInspectionDraft(draftKey: string): Promise<InspectionDraft | undefined> {
  const db = await getOfflineDB();
  if (!db) return undefined;
  return db.get("inspection_drafts", draftKey);
}

export async function deleteInspectionDraft(draftKey: string): Promise<void> {
  const db = await getOfflineDB();
  if (!db) return;
  await db.delete("inspection_drafts", draftKey);
}

export async function getAllInspectionDrafts(): Promise<InspectionDraft[]> {
  const db = await getOfflineDB();
  if (!db) return [];
  return db.getAllFromIndex("inspection_drafts", "by-updated");
}
