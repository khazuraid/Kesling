import * as FileSystem from "expo-file-system";
import * as SQLite from "expo-sqlite";

export type SQLiteDraftPhoto = {
  id?: number;
  uri: string;
  mimeType: string;
  timestamp: string;
  coords?: string;
};

export type SQLiteDraft = {
  localId: string;
  templateId: number;
  templateName: string;
  sasaranId?: number | null;
  namaSasaran?: string;
  alamatSasaran?: string;
  values: Record<string, string>;
  photos: SQLiteDraftPhoto[];
  signatureData?: string;
  signaturePetugasData?: string;
  lat?: number | null;
  lng?: number | null;
  createdAt: string;
  status: "DRAFT" | "SYNCING" | "SYNCED" | "FAILED";
  lastError?: string;
};

export type SQLiteDraftRow = SQLiteDraft;

let dbInstance: SQLite.SQLiteDatabase | null = null;

export async function getDB(): Promise<SQLite.SQLiteDatabase> {
  if (dbInstance) return dbInstance;
  dbInstance = await SQLite.openDatabaseAsync("kesling_mobile.db");

  await dbInstance.execAsync(`
    PRAGMA journal_mode = WAL;

    CREATE TABLE IF NOT EXISTS drafts (
      localId TEXT PRIMARY KEY NOT NULL,
      templateId INTEGER NOT NULL,
      templateName TEXT,
      sasaranId INTEGER,
      namaSasaran TEXT,
      alamatSasaran TEXT,
      valuesJson TEXT NOT NULL,
      signatureData TEXT,
      signaturePetugasData TEXT,
      lat REAL,
      lng REAL,
      createdAt TEXT NOT NULL,
      status TEXT DEFAULT 'DRAFT',
      lastError TEXT
    );

    CREATE TABLE IF NOT EXISTS draft_photos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      draftLocalId TEXT NOT NULL,
      uri TEXT NOT NULL,
      mimeType TEXT NOT NULL,
      timestamp TEXT,
      coords TEXT,
      FOREIGN KEY (draftLocalId) REFERENCES drafts(localId) ON DELETE CASCADE
    );
  `);

  return dbInstance;
}

export async function saveDraftSQLite(draft: SQLiteDraft): Promise<void> {
  const db = await getDB();
  const valuesJson = JSON.stringify(draft.values || {});

  await db.runAsync(
    `INSERT OR REPLACE INTO drafts (
      localId, templateId, templateName, sasaranId, namaSasaran, alamatSasaran,
      valuesJson, signatureData, signaturePetugasData, lat, lng, createdAt, status, lastError
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      draft.localId,
      draft.templateId,
      draft.templateName || "Inspeksi Sanitasi",
      draft.sasaranId ?? null,
      draft.namaSasaran ?? null,
      draft.alamatSasaran ?? null,
      valuesJson,
      draft.signatureData ?? null,
      draft.signaturePetugasData ?? null,
      draft.lat ?? null,
      draft.lng ?? null,
      draft.createdAt,
      draft.status || "DRAFT",
      draft.lastError ?? null,
    ],
  );

  // Clear existing photos for this draft & insert new ones
  await db.runAsync("DELETE FROM draft_photos WHERE draftLocalId = ?", [draft.localId]);

  if (Array.isArray(draft.photos) && draft.photos.length > 0) {
    for (const photo of draft.photos) {
      await db.runAsync(
        "INSERT INTO draft_photos (draftLocalId, uri, mimeType, timestamp, coords) VALUES (?, ?, ?, ?, ?)",
        [draft.localId, photo.uri, photo.mimeType, photo.timestamp || new Date().toISOString(), photo.coords || ""],
      );
    }
  }
}

export async function getAllDraftsSQLite(): Promise<SQLiteDraft[]> {
  const db = await getDB();
  const rows = await db.getAllAsync<any>("SELECT * FROM drafts WHERE status != 'SYNCED' ORDER BY createdAt DESC");

  const drafts: SQLiteDraft[] = [];

  for (const row of rows) {
    const photos = await db.getAllAsync<SQLiteDraftPhoto>(
      "SELECT id, uri, mimeType, timestamp, coords FROM draft_photos WHERE draftLocalId = ?",
      [row.localId],
    );

    let parsedValues = {};
    try {
      parsedValues = JSON.parse(row.valuesJson);
    } catch {
      parsedValues = {};
    }

    drafts.push({
      localId: row.localId,
      templateId: row.templateId,
      templateName: row.templateName,
      sasaranId: row.sasaranId,
      namaSasaran: row.namaSasaran,
      alamatSasaran: row.alamatSasaran,
      values: parsedValues,
      photos: photos || [],
      signatureData: row.signatureData,
      signaturePetugasData: row.signaturePetugasData,
      lat: row.lat,
      lng: row.lng,
      createdAt: row.createdAt,
      status: row.status,
      lastError: row.lastError,
    });
  }

  return drafts;
}

export async function deleteDraftSQLite(localId: string): Promise<void> {
  const db = await getDB();
  const photos = await db.getAllAsync<{ uri: string }>("SELECT uri FROM draft_photos WHERE draftLocalId = ?", [
    localId,
  ]);

  // Hapus file fisik foto dari storage internal HP
  for (const p of photos) {
    try {
      await FileSystem.deleteAsync(p.uri, { idempotent: true });
    } catch {}
  }

  await db.runAsync("DELETE FROM draft_photos WHERE draftLocalId = ?", [localId]);
  await db.runAsync("DELETE FROM drafts WHERE localId = ?", [localId]);
}
