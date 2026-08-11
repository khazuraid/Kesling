# Mobile App — apps-kes

Expo (React Native) app untuk operator puskesmas. Folder: `apps/mobile/`.
Backend API: Next.js route handlers di `apps/web/src/app/api/mobile/v1/`.

## Struktur

```
apps/mobile/
  .env                    # EXPO_PUBLIC_API_BASE_URL (IP lokal dev / URL prod)
  expo-env.d.ts           # Expo type refs (jangan edit)
  components/ui/           # Komponen UI bersama
```

## Setup

```bash
cd apps/mobile
# Set API base URL (IP lokal komputer yang menjalankan web dev server)
echo 'EXPO_PUBLIC_API_BASE_URL=http://192.168.x.x:3000' > .env
npx expo start
```

Test di iPhone via Expo Go.

## Auth

Dua cara login:

1. **Email + Password** — POST `/api/mobile/v1/auth/login` → token + user object. Token disimpan di device, dikirim via `Authorization: Bearer <token>`.
2. **QR Link** — Operator scan QR dari web profile (`/profile` → GET `/api/mobile/v1/auth/link`). QR berisi JSON `{ type, version, baseUrl, token, user }`. App parse & simpan token.

Token: HMAC-SHA256 signed, TTL 30 hari. Secret = `NEXTAUTH_SECRET`.
Verifikasi: `verifyMobileToken()` di `apps/web/src/lib/mobile-auth.ts`.

## API Endpoints

Base: `${EXPO_PUBLIC_API_BASE_URL}/api/mobile/v1`

| Method | Path | Auth | Deskripsi |
|--------|------|------|-----------|
| POST | `/auth/login` | — | Login email+password → `{ token, user }` |
| GET | `/auth/link` | web session | Generate QR code untuk link mobile |
| GET | `/me` | Bearer | Profil user login |
| GET | `/dashboard` | Bearer | Statistik: template count, sasaran count, inspect count bulan ini, 5 inspect terakhir |
| GET | `/sasaran?subCategoryId=` | Bearer | List sasaran puskesmas (max 50) |
| GET | `/inspection/templates` | Bearer | List template aktif (puskesmas + global) |
| POST | `/inspection/templates` | Bearer | Buat template baru (scope: puskesmas operator) |
| GET | `/inspection/templates/:id` | Bearer | Detail template + fields |
| POST | `/inspection/offline-sync` | Bearer | Sync draft inspect offline → server. Auto-APPROVED, aggregate ke laporan |
| GET | `/laporan/categories` | Bearer | List kategori + sub-kategori laporan dinamis |

### Auth Header

```
Authorization: Bearer <token>
```

Semua endpoint kecuali `/auth/login` dan `/auth/link` butuh Bearer token.

## Offline Sync

POST `/inspection/offline-sync` — kirim draft inspect yang dibuat offline.

Request body:
```json
{
  "localId": "uuid-lokal",
  "templateId": 1,
  "values": { "nama": "...", "alamat": "...", "hasil": "..." },
  "fieldValues": { "1": "nilai field 1", "2": "nilai field 2" },
  "photos": [{ "base64": "...", "mimeType": "image/jpeg" }],
  "signature": { ... },
  "lat": -6.2,
  "lng": 106.8,
  "createdAt": "2026-08-11T00:00:00Z"
}
```

Flow:
1. Cek duplikat via `auditLog.newData.localId` → skip jika sudah sync.
2. Cari template aktif (puskesmas/global).
3. Simpan foto ke `public/uploads/mobile/` (max 6).
4. Simpan signature dengan `source: "mobile"`.
5. Create `inspectionResult` status `APPROVED` + audit log.
6. `aggregateInspectionToLaporan()` → update DynamicLaporan.

Response: `{ id, status, syncedAt }` atau `{ id, status, syncedAt, duplicate: true }`.

## User Object

```json
{
  "id": 1,
  "email": "ops@puskesmas.id",
  "name": "Nama Operator",
  "role": "OPERATOR",
  "puskesmasId": 1,
  "puskesmasNama": "Puskesmas X"
}
```

Role: `ADMIN`, `DINKES`, `OPERATOR`, `PETUGAS`.

## UI Design Spec

Hybrid: Swiss flat + iOS grouped.

- **Beranda + Periksa**: Swiss flat. Background `#173F39`, radius 0, no shadow.
- **Laporan + Data + Menu**: iOS grouped. `IOCard` / `IOListRow`, radius 10, bg `#F2F2F7`.
- Komponen: `IOCard`, `IOListRow` di `components/ui/`.
- 10 item/page (laporan), 25 item/page (sasaran).
- Tidak ada create template/kategori/sasaran di HP (web only).

## Environment

| Env | Lokasi | Contoh |
|-----|--------|--------|
| `EXPO_PUBLIC_API_BASE_URL` | `apps/mobile/.env` | `http://192.168.x.x:3000` (dev) / `https://kesling.biz.id` (prod) |

Backend butuh `NEXTAUTH_SECRET` sama antara web & mobile auth signing.

## Catatan

- Mobile app belum di-commit (hanya `.env`, `expo-env.d.ts`, `components/ui/`).
- CORS untuk mobile API sudah di-configure (commit `9455866`).
- Telegram Mini App auto-login terpisah (via `initData`), tidak pakai mobile API.
