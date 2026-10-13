# Rancangan Design Aplikasi Mobile — Kesling

Sistem Informasi Kesehatan Lingkungan · Expo Router + Tamagui
Sumber: struktur aktual `apps/mobile/app/**` — 17 screen + komponen inti.

---

## 1. Design System — "Kanso"

Prinsip: minimal Jepang + futuristik. Whitespace sebagai separator, hairline borders, tipografi dominan. Motion wajib.

### Warna (light)
| Token | Nilai | Pakai |
|---|---|---|
| bg | #FAFAF9 | latar screen |
| surface | #FFFFFF | kartu, sheet |
| ink | #18181B | teks utama |
| ink2 | #52525B | teks sekunder |
| muted | #A1A1AA | caption, placeholder |
| hairline | #E4E4E0 | border 1px |
| accent | #0066FF | CTA, link, aktif |
| accentSoft | #EBF2FF | chip aktif, ikon soft |
| ok | #16A34A | skor tinggi, sukses |
| warn | #D97706 | skor sedang, deadline dekat |
| err | #DC2626 | skor rendah, error, KRITIS |
| dark | #0F0F11 | hero surface gelap |

Dark mode: warm dark (#17140F), opsional via toggle, default light.

### Tipografi (Inter)
| Style | Size/Weight | Pakai |
|---|---|---|
| display | 34/800, ls -1 | greeting beranda, angka besar |
| title | 22/700, ls -0.5 | judul page |
| heading | 16/600 | judul section/kartu |
| body | 15/400 | teks isi |
| sub | 13/400 (ink2) | subtitle, deskripsi |
| caption | 11/500 (muted) | waktu, meta |
| label | 10/700, ls 1.4, UPPERCASE | label section |

### Spacing & Radius
- Space: xs 4 · sm 8 · md 16 · lg 24 · xl 32 · xxl 48
- Radius: sm 8 · md 14 · lg 20 · xl 28 · full 999
- Border: hairline 1px #E4E4E0, tanpa shadow (flat). Elevation via surface beda + hairline.
- Font mono: SpaceMono (fallback system) untuk angka/skor.

### Motion (wajib, reanimated + spring)
- Screen masuk: fade + translateY 12→0
- List: stagger 40ms per item
- Gauge/Ring: animasi angka 0→nilai + progress spring
- SuccessCheck: animasi centang setelah submit
- ActionSheet/ProfileSheet: slide-up + backdrop fade
- Tab switch: cross-fade ikon, FAB scale press

---

## 2. Struktur Navigasi

```
_layout (Stack root, auth guard)
├── onboarding (slide horizontal, sekali saja → AsyncStorage)
├── login
└── (tabs) — 3 tab + FAB
    ├── index      → Beranda
    ├── pemeriksaan → alias Draft
    └── rekap      → Rekap
Stack lain: sasaran/*, periksa, kategori/[id], inspection/*, laporan/[id],
            drafts, draft/edit/[localId], notifications, +not-found
FAB (tengah) → periksa (pilih formulir)
```

Semua route stack WAJIB terdaftar di root `_layout` `<Stack.Screen>`.

---

## 3. Daftar Screen (17)

### 3.1 Onboarding — `onboarding.tsx`
- 3 slide swipe horizontal + indikator dot, progres animasi.
- Slide: ikon besar di soft-bg berwarna, title, desc.
  1. Inspeksi Lapangan (#0066FF / #EBF2FF) — foto, TTD, skor otomatis
  2. Jadwal Otomatis (#5B8DEF / #EAF1FE) — jadwal bulanan, lewati libur
  3. Laporan & Rekap (#F59E0B / #FEF4E2) — ekspor bulanan/tahunan
- Tombol: "Lewati" (ghost, kiri-atas), "Lanjut" / "Mulai" (accent, bawah).
- Sekali tampil; key `kesling_onboarding_done`.

### 3.2 Login — `login.tsx`
- Logo + wordmark Kesling, tagline "Sistem Informasi Kesehatan Lingkungan".
- Kartu putih: label EMAIL, PASSWORD (uppercase label style), input hairline, focus ring accent.
- Tombol Masuk full-width accent, state loading.
- Error banner merah soft di atas form.
- (Biometric masuk via halaman/setting terpisah bila ada.)

### 3.3 Beranda — `(tabs)/index.tsx`
- Header custom: greeting per waktu (Pagi/Siang/Sore/Malam) + tanggal, badge role (ADMIN/DINKES), avatar → ProfileSheet.
- GlobalSearch bar (hairline pill) → buka overlay search.
- PuskesmasPicker (dropdown/current puskesmas).
- Kartu status ringkas: hitung KRITIS / perlu tindakan (warna err/warn, angka display).
- Agenda hari ini: daftar sasaran terjadwal (jam, nama, status chip, prioritas didahulukan).
- Shortcut bar: Drafts (badge count), Notifikasi (badge unread), Sasaran.
- Semua list: skeleton saat load, pull-to-refresh.

### 3.4 Draft — `(tabs)/pemeriksaan.tsx` → `drafts.tsx`
- PageHeader "Draft".
- List kartu draft: nama sasaran, kategori, tanggal, progress terisi (x/y field), chip status lokal/offline.
- Aksi per item: lanjut edit → `draft/edit/[localId]`, hapus (swipe/konfirmasi).
- Pagination: ‹ Sebelumnya / Berikutnya ›.
- EmptyState: ilustrasi + CTA "Mulai Pemeriksaan" → periksa.
- Tombol "Selesai" (tandai draft selesai/sync).

### 3.5 Rekap — `(tabs)/rekap.tsx`
- PageHeader "Rekap" + pilih tahun.
- Hero: GaugeChart capaian keseluruhan % (animasi spring, warna: ok ≥80, warn 50–79, err <50).
- Section per kategori: Ring/bar mini + persen, tap → detail.
- State: skeleton "Memuat rekap...", error "Gagal memuat. Tarik ke bawah untuk coba lagi."

### 3.6 Sasaran (list) — `sasaran/index.tsx`
- PageHeader "Sasaran" + tombol tambah.
- Filter chips: semua / per kategori / status; urutan: prioritas didahulukan.
- List: nomor urut, label/nama, chip status, sub-teks kategori.
- EmptyState "Memuat sasaran..." / kosong.

### 3.7 Sasaran Baru — `sasaran/new.tsx`
- Form: pilih KATEGORI (wajib, list modal), lalu DATA DASAR dinamis per kategori (input sesuai tipe field).
- Validasi inline, tombol Simpan accent sticky bottom.

### 3.8 Edit Sasaran — `sasaran/[id].tsx`
- Sama seperti form baru, terisi data existing.
- Toggle prioritas: "Sasaran prioritas — wajib diperiksa lebih awal".
- Section RIWAYAT PEMERIKSAAN: list hasil + StatusBadge, tap → hasil detail.

### 3.9 Pilih Formulir — `periksa.tsx`
- PageHeader "Pemeriksaan", subtitle "Pilih formulir untuk memulai".
- Search + filter chips kategori; counter "{n} Formulir".
- List formulir → `kategori/[id]` → sub-kategori → `inspection/[id]`.
- Skeleton / error + pull-to-refresh.

### 3.10 Detail Kategori — `kategori/[id].tsx`
- PageHeader nama kategori, subtitle "{n} sub-kategori".
- CardGroup ListRow per sub-kategori (chevron right) → form pemeriksaan.

### 3.11 Form Pemeriksaan — `inspection/[id].tsx`
Screen paling kompleks. Layout:
- Sticky top: judul form, progress bar animasi (x% field terisi), tombol Simpan Draft.
- Pilih/tautkan sasaran (bisa buat baru), input nama & alamat bila sasaran baru.
- Grup pertanyaan collapsible (accordion, chevron up/down); progress per grup.
- InspectionField per pertanyaan: Ya/Tidak segmented control (tamagui core), beberapa tipe input (pilihan/teks/angka).
- Section media: PhotoCapture grid (max 6 foto, badge jumlah), SignaturePad (canvas, tombol bersihkan).
- Bottom bar sticky: tombol Simpan accent (loading), opsi simpan draft offline.
- Sukses: overlay SuccessCheck animasi → auto ke hasil.
- KeyboardAvoidingView; offline → draft lokal + banner offline.

### 3.12 Hasil Pemeriksaan — `inspection/result/[id].tsx`
- Hero: GaugeChart skor besar + StatusBadge (kategori/skor).
- Detail: sasaran, tanggal, petugas, rincian jawaban per grup.
- Foto: grid thumbnail → full view.
- Tanda tangan: render image TTD.
- Aksi: Share2 (export PDF via shareInspectionPdf), Trash2 (hapus, Alert konfirmasi).

### 3.13 Edit Draft — `draft/edit/[localId].tsx`
- Sama dengan 3.11, nilai dimuat dari draft lokal (localId), bukan server.
- Banner "Draft offline — belum tersinkron".
- Simpan → coba sync bila online, else tetap draft.

### 3.14 Detail Laporan — `laporan/[id].tsx`
- Ringkasan laporan per sasaran/kategori, periode.
- Konten agregat hasil pemeriksaan (skor, status, rekap item).
- Aksi ekspor/bagikan PDF.
- EmptyState "Laporan tidak ditemukan."

### 3.15 Notifikasi — `notifications.tsx`
- PageHeader + tombol "Tandai semua dibaca" (CheckCheck).
- List: ikon tipe (Bell/CalendarDays/FileWarning/Clock), judul, isi, timeAgo ("Baru saja", "n menit lalu", "n jam lalu", "n hari lalu").
- Unread: dot accent / bg accentSoft; tap → markOneRead + navigasi target.
- Skeleton list, EmptyState.

### 3.16 Drafts (full) — `drafts.tsx`
- Sama 3.4 (halaman asli; tab hanya re-export).

### 3.17 404 — `+not-found.tsx`
- Ilustrasi sederhana, teks "Halaman tidak ditemukan", tombol kembali Beranda.

---

## 4. Komponen Inti (ikut didesain)

| Komponen | Catatan design |
|---|---|
| TabBar + FAB | 3 tab (Beranda/Draft/Rekap), FAB tengah accent, active tint accent, inactive muted; notch/pill. `YStack onPress` dalam `Card overflow=hidden` gagal di iOS — pakai `Button unstyled`. |
| GaugeChart | Donut setengah/penuh, animasi nilai, warna skor dinamis (ok/warn/err). |
| Ring | Lingkaran progress kecil untuk kartu rekap. |
| ActionSheet | Slide-up + backdrop, opsi list, handle bar. |
| SignaturePad | Canvas putih hairline, tombol bersihkan, hasil base64. |
| PhotoCapture | Grid 3 kolom, tambah/kurang, maks 6, badge count, preview. |
| PuskesmasPicker | Sheet pilih puskesmas, current di header beranda. |
| ProfileSheet | Slide-up profil: nama, role, toggle dark mode, logout. |
| SegmentedControl | Ya/Tidak dan filter; pill sliding accent. |
| StatusBadge | Warna per status: sukses ok, menunggu warn, gagal/kritis err. |
| Skeleton | Blok abu beranimasi shimmer, bentuk mengikuti konten. |
| EmptyState / ErrorState | Ikon soft-bg, judul, sub, CTA retry. |
| GlobalSearch | Overlay full, input auto-focus, hasil grouped (sasaran/laporan/pemeriksaan), recent. |
| SuccessCheck | Animasi lingkaran + centang spring. |
| UI kit (`src/components/ui`) | Button (primary/ghost/danger, loading), Badge, Card/CardGroup, ListRow, Header, SearchBar, Screen, States. Semua UI dari core `tamagui`, radius numeric. |

---

## 5. State & Aturan Umum

- Loading: Skeleton (bukan spinner) untuk list; Spinner kecil hanya untuk aksi.
- Error: ErrorState + retry / pull-to-refresh.
- Offline: banner offline di atas konten; data dari cache (`cacheGet/cacheSet`); draft lokal; sync otomatis saat online, dedup via `auditLog.newData.localId`.
- Foto: simpan `public/uploads/mobile/`, maks 6 per pemeriksaan.
- Approval: submit → auto-approve → `aggregateInspectionToLaporan()`.
- Skor: dihitung otomatis dari jawaban (aturan resmi), tampil di GaugeChart.
- Semua list: paginasi/pull-to-refresh, stagger animasi masuk.

## 6. Catatan Teknis Design

- Token di `src/lib/tokens.ts` (C, FONT, SPACE, RADIUS, TEXT) — design mengacu token ini.
- Radius Tamagui: numeric `{16}`, BUKAN `$lg`.
- Semua route stack didaftarkan di `_layout` root.
- Param router.push harus lengkap sesuai `useLocalSearchParams` target.
