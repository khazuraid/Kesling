# Rancangan Aplikasi Laporan Kesehatan Lingkungan Kota Cirebon

## 1. Ringkasan

Aplikasi web CRUD full dinamis untuk mengelola Laporan Bulanan Kesehatan Lingkungan Kota Cirebon. Setiap file Excel menjadi 1 halaman. Data diinput per Puskesmas per bulan, ditampilkan dalam format tabel, dan bisa di-export ke Excel/PDF.

## 2. Sumber Data (6 File Excel → 6 Halaman)

| # | File Excel | Halaman | Deskripsi |
|---|-----------|---------|-----------|
| 1 | LAPORAN TPP baru 2026.xlsx | TPP | Tempat Pengelolaan Pangan |
| 2 | LAP BUL PKAL SPAL 2026.xlsx | SPAL | Saluran Pembuangan Air Limbah |
| 3 | LAP BUL PKAL SAB 2026.xlsx | SAB | Sarana Air Bersih/Minum |
| 4 | LAP BUL RUMAH 2026.xlsx | Rumah | Pemeriksaan Rumah |
| 5 | LAP BUL JAMBAN 2026.xlsx | Jamban | Jamban Keluarga |
| 6 | LAP BUL TTU 2026.xlsx | TTU | Tempat-Tempat Umum |

## 3. Tech Stack

| Kategori | Library/Tool | Status |
|----------|-------------|--------|
| Monorepo | Turborepo | ✅ |
| Package Manager | pnpm | ✅ |
| Framework | Next.js 15 (App Router) | ✅ |
| Language | TypeScript | ✅ |
| Database | **PostgreSQL** | ✅ |
| Cache/Rate Limit | **Redis (ioredis + @upstash/redis)** | ✅ |
| ORM | Prisma | ✅ |
| Auth | NextAuth.js + bcrypt | ✅ |
| UI | Shadcn/UI + Tailwind CSS + Lucide Icons | ✅ |
| Tabel | TanStack Table + @tanstack/react-virtual | ✅ |
| Form | React Hook Form + Zod | ✅ |
| State/Fetching | TanStack React Query + Zustand + nuqs | ✅ |
| Server Actions | next-safe-action | ✅ |
| Grafik | Recharts | ✅ |
| Export Excel | SheetJS (xlsx) | ✅ |
| Import Excel | SheetJS (xlsx) | ✅ |
| Export PDF | jspdf + jspdf-autotable | ✅ |
| Cetak | react-to-print | ✅ |
| Linter/Formatter | Biome | ✅ |
| Dark Mode | next-themes | ✅ |
| Command Palette | cmdk | ✅ |
| Toast | Sonner | ✅ |
| Drag & Drop | @hello-pangea/dnd | ✅ |
| Tanggal | dayjs | ✅ |
| Logging | pino | ✅ |
| Scheduler | node-cron | ✅ |
| Email | nodemailer | ✅ |
| Image | sharp | ✅ |
| Monitoring | @sentry/nextjs | ✅ |
| Class Utility | clsx + tailwind-merge + cva | ✅ |
| Git Hooks | lefthook + commitlint | ✅ |
| Testing | Vitest + React Testing Library | ✅ |
| PWA | next-pwa | ✅ |
| Deploy | Docker + Coolify (VPS) | ✅ |
| Dev Tool | Prisma Studio | ✅ |

## 4. Data Puskesmas (21 Unit)

Kejaksan, Nelayan, Pamitran, Jalan Kembang, Gunung Sari, Kesambi, Majasem, Sunyaragi, Drajat, Jagasatru, Pulasaren, Astanagarib, Pekalangan, Pesisir, Cangkol, Kesunean, Pegambiran, Perumnas Utara, Larangan, Kalijaga, Kalitanjung

## 5. Fitur Lengkap (22 Fitur)

1. **CRUD Full** - Create, Read, Update, Delete semua data
2. **Full Dinamis** - Master data (Puskesmas, jenis sarana) bisa ditambah/edit/hapus
3. **Tabel Laporan** - Format seperti Excel, horizontal scroll
4. **Filter** - Per bulan dan tahun (tersimpan di URL via nuqs)
5. **Export Excel** - Download .xlsx dengan format mirip asli
6. **Import Excel** - Upload .xlsx untuk migrasi data lama
7. **Export PDF** - Download laporan format PDF
8. **Print** - Cetak langsung dari browser
9. **Dashboard + Grafik** - Ringkasan data + visualisasi tren
10. **Login Multi-role** - Admin Dinkes (semua akses) + Operator Puskesmas (input miliknya)
11. **Audit Log** - Riwayat perubahan (siapa, kapan, apa)
12. **Template Input Cepat** - Copy data bulan sebelumnya sebagai template
13. **Backup & Restore** - Export/import seluruh database
14. **Dark Mode** - Toggle tema gelap/terang
15. **Bulk Input** - Input semua Puskesmas sekaligus dalam 1 tabel
16. **Komentar/Catatan** - Tambah catatan per laporan
17. **Status Laporan** - Draft → Submitted → Approved
18. **Rekap Tahunan** - Generate otomatis rekap Januari-Desember
19. **Notifikasi Deadline** - Di dashboard + email (nodemailer)
20. **Command Palette** - Ctrl+K navigasi cepat
21. **Drag & Drop** - Reorder urutan master data
22. **Responsive/Mobile** - Bisa diakses dari HP

## 6. Struktur Data Per Halaman

### 6.1 TPP (Tempat Pengelolaan Pangan)
Per Puskesmas × 11 Jenis TPP:
- Jasaboga, Restoran, Rumah Makan, TPP Tertentu, Depot Air Minum, Dapur Gerai Pangan Jajanan, Gerai Pangan Jajanan, Gerai Pangan Jajanan Keliling, Pangan Jajanan Keliling Gerobak, Sentra Pangan Jajanan/Kantin, TOTAL TPP

Kolom per jenis: Terdaftar, Yang Diperiksa, Laik HSP (Jumlah), Laik HSP (%)

### 6.2 SPAL (Saluran Pembuangan Air Limbah)
Per Puskesmas × 8 Jenis Sarana:
- Riool, Septick Tank, Sumur Resapan, Saluran Tertutup, Saluran Terbuka, Sungai, Sarana Umum, Tidak Ada Sarana

Kolom kepemilikan: JML, KK, PDDK | Kolom diperiksa: JML, MS, KK, PDDK

### 6.3 SAB (Sarana Air Bersih/Minum)
Per Puskesmas × 6 Jenis Sarana:
- SGL Terlindung, SGL dengan Pompa, Sumur Bor dengan Pompa, SPT, PP/PDAM/SR, Sarana Umum

Kolom kepemilikan: JML, KK, PDDK | Kolom diperiksa: JML, MS, KK, PDDK, Inspeksi (R, S, T, AT)

### 6.4 Rumah (Pemeriksaan Rumah)
Per Puskesmas:
- Jumlah Rumah Ada, Jumlah Diperiksa
- 10 Komponen × MS/TMS: Ventilasi, Penerangan, Lantai, Kepadatan Huni, Lubang Asap Dapur, Jamban, Air Bersih, Air Limbah, Pembuangan Sampah, Kandang Ternak (+ Tidak Ada)
- Jumlah Hasil Pemeriksaan (MS/TMS)

### 6.5 Jamban
Per Puskesmas × 8 Jenis Sarana:
- Leher Angsa + Septick Tank, LA + Riool, LA + Sungai, LA + Cubluk, Pelengsengan, Cemplung, Sarana Umum, Tidak Ada Sarana

Kolom kepemilikan: JML, KK, PDDK | Kolom diperiksa: JML, MS, KK, PDDK

### 6.6 TTU (Tempat-Tempat Umum)
Per Puskesmas:
- TFU Prioritas (12): SD/MI, SMP/MTS, SMA/MA, Pasar, Terminal, Pelabuhan, Bandara, Akomodasi/Hotel, Stasiun, Tempat Rekreasi, Tempat Olah Raga, Mesjid/Gereja/Vihara
- TFU Non-Prioritas (8): Puskesmas, Praktik Mandiri, Pustu, Apotik, Perkantoran, Musholla, TK/KB, TFU Lainnya

Kolom per jenis: Jumlah Total, MS, TMS

## 7. Halaman & Route

| Route | Halaman | Fitur |
|-------|---------|-------|
| `/` | Dashboard | Ringkasan + grafik tren bulanan |
| `/login` | Login | Auth (Shadcn UI) |
| `/dashboard-pkm` | Dashboard Puskesmas | View per operator |
| `/master/puskesmas` | Master Puskesmas | CRUD + drag reorder |
| `/master/jenis-tpp` | Master Jenis TPP | CRUD + drag reorder |
| `/master/jenis-sarana` | Master Jenis Sarana | CRUD (SPAL/SAB/Jamban) |
| `/master/jenis-ttu` | Master Jenis TTU | CRUD (prioritas/non) |
| `/laporan/tpp` | Laporan TPP | CRUD + Tabel + Export |
| `/laporan/spal` | Laporan SPAL | CRUD + Tabel + Export |
| `/laporan/sab` | Laporan SAB | CRUD + Tabel + Export |
| `/laporan/rumah` | Laporan Rumah | CRUD + Tabel + Export |
| `/laporan/jamban` | Laporan Jamban | CRUD + Tabel + Export |
| `/laporan/ttu` | Laporan TTU | CRUD + Tabel + Export |
| `/laporan/bulk` | Bulk Input | Edit semua PKM sekaligus |
| `/rekap` | Rekap Tahunan | View + Export |
| `/perbandingan` | Perbandingan PKM | Ranking + PDF export |
| `/target` | Target & Capaian | Set target + progress bars |
| `/audit-log` | Audit Log | View riwayat (TanStack Table) |
| `/settings` | Pengaturan | Backup/Restore, Users |
| `/settings/users` | Manage Users | CRUD users (admin only) |

## 8. Database Schema

### Master Tables
- `user` (id, nama, email, password, role[admin/operator], puskesmas_id?, created_at, updated_at)
- `puskesmas` (id, nama, urutan, created_at, updated_at)
- `jenis_tpp` (id, nama, urutan, created_at, updated_at)
- `jenis_sarana` (id, nama, kategori[spal/sab/jamban], urutan, created_at, updated_at)
- `jenis_ttu` (id, nama, kategori[prioritas/non_prioritas], urutan, created_at, updated_at)

### Laporan Tables
- `laporan_tpp` (id, puskesmas_id, bulan, tahun, jenis_tpp_id, terdaftar, diperiksa, laik_jumlah, laik_persen, status, catatan, created_by, updated_by, created_at, updated_at)
- `laporan_spal` (id, puskesmas_id, bulan, tahun, jenis_sarana_id, jumlah, kk, pddk, diperiksa_jumlah, diperiksa_ms, diperiksa_kk, diperiksa_pddk, status, catatan, created_by, updated_by, created_at, updated_at)
- `laporan_sab` (id, puskesmas_id, bulan, tahun, jenis_sarana_id, jumlah, kk, pddk, diperiksa_jumlah, diperiksa_ms, diperiksa_kk, diperiksa_pddk, inspeksi_r, inspeksi_s, inspeksi_t, inspeksi_at, status, catatan, created_by, updated_by, created_at, updated_at)
- `laporan_rumah` (id, puskesmas_id, bulan, tahun, jumlah_rumah_ada, jumlah_diperiksa, ventilasi_ms, ventilasi_tms, penerangan_ms, penerangan_tms, lantai_ms, lantai_tms, kepadatan_huni_ms, kepadatan_huni_tms, lubang_asap_ms, lubang_asap_tms, jamban_ms, jamban_tms, air_bersih_ms, air_bersih_tms, air_limbah_ms, air_limbah_tms, sampah_ms, sampah_tms, kandang_ms, kandang_tms, kandang_tidak_ada, hasil_ms, hasil_tms, status, catatan, created_by, updated_by, created_at, updated_at)
- `laporan_jamban` (id, puskesmas_id, bulan, tahun, jenis_sarana_id, jumlah, kk, pddk, diperiksa_jumlah, diperiksa_ms, diperiksa_kk, diperiksa_pddk, status, catatan, created_by, updated_by, created_at, updated_at)
- `laporan_ttu` (id, puskesmas_id, bulan, tahun, jenis_ttu_id, jumlah_total, ms, tms, status, catatan, created_by, updated_by, created_at, updated_at)

### System Tables
- `audit_log` (id, user_id, action[create/update/delete], table_name, record_id, old_data, new_data, created_at)
- `notification` (id, user_id, title, message, is_read, created_at)
- `target` (id, tahun, jenis, puskesmas_id?, target_persen, created_at, updated_at)
- `changelog` (id, table_name, record_id, user_id, field, old_value, new_value, created_at)

## 9. Struktur Folder (Monorepo Turborepo)

```
apps-kes/
├── turbo.json
├── pnpm-workspace.yaml
├── package.json
├── biome.json
├── lefthook.yml
├── commitlint.config.js
├── docker-compose.yml
├── Dockerfile
├── .env.example
│
├── apps/
│   └── web/
│       ├── next.config.js
│       ├── tailwind.config.ts
│       ├── tsconfig.json
│       ├── src/
│       │   ├── app/
│       │   │   ├── layout.tsx
│       │   │   ├── page.tsx
│       │   │   ├── login/page.tsx
│       │   │   ├── master/
│       │   │   │   ├── puskesmas/page.tsx
│       │   │   │   ├── jenis-tpp/page.tsx
│       │   │   │   ├── jenis-sarana/page.tsx
│       │   │   │   └── jenis-ttu/page.tsx
│       │   │   ├── laporan/
│       │   │   │   ├── tpp/page.tsx
│       │   │   │   ├── spal/page.tsx
│       │   │   │   ├── sab/page.tsx
│       │   │   │   ├── rumah/page.tsx
│       │   │   │   ├── jamban/page.tsx
│       │   │   │   └── ttu/page.tsx
│       │   │   ├── rekap/page.tsx
│       │   │   ├── audit-log/page.tsx
│       │   │   ├── settings/page.tsx
│       │   │   └── api/
│       │   │       ├── auth/[...nextauth]/route.ts
│       │   │       ├── master/
│       │   │       ├── laporan/
│       │   │       ├── export/
│       │   │       ├── import/
│       │   │       └── health/route.ts
│       │   ├── components/
│       │   │   ├── ui/ (shadcn)
│       │   │   ├── layout/
│       │   │   ├── forms/
│       │   │   └── tables/
│       │   └── lib/
│       │       ├── prisma.ts
│       │       ├── auth.ts
│       │       ├── utils.ts
│       │       └── logger.ts
│       └── package.json
│
├── packages/
│   ├── database/
│   │   ├── prisma/
│   │   │   ├── schema.prisma
│   │   │   └── seed.ts
│   │   ├── index.ts
│   │   └── package.json
│   └── config/
│       ├── tailwind/
│       ├── typescript/
│       └── package.json
```

## 10. Alur Pengerjaan (Step-by-Step untuk AI)

> Ikuti urutan ini secara berurutan. Jangan loncat step. Setiap step harus selesai dan berjalan sebelum lanjut ke step berikutnya.

### PHASE 1: Foundation (Step 1-4)

#### Step 1: Init Monorepo
```
Tujuan: Setup monorepo Turborepo + pnpm
Hasil: `pnpm dev` bisa jalan tanpa error

Langkah:
1. Hapus folder `web` yang sudah ada
2. Init pnpm workspace di root `apps-kes/`
3. Setup turbo.json
4. Setup biome.json
5. Setup lefthook.yml + commitlint
6. Buat folder apps/web dan packages/database, packages/config
7. Init Next.js 14 di apps/web (--typescript --tailwind --app --src-dir)
8. Pastikan `pnpm dev` jalan

Verifikasi: Browser buka localhost:3000 tampil halaman Next.js default
```

#### Step 2: Setup Database (Prisma + MySQL)
```
Tujuan: Prisma schema lengkap + koneksi MySQL
Hasil: `pnpm prisma migrate dev` sukses, semua tabel terbuat

Langkah:
1. Install prisma di packages/database
2. Buat schema.prisma LENGKAP (semua tabel dari section 8)
3. Buat .env.example dengan DATABASE_URL
4. Export Prisma client dari packages/database/index.ts
5. Jalankan migrate dev

Verifikasi: `pnpm prisma studio` bisa buka dan tampil semua tabel
```

#### Step 3: Seed Data Master
```
Tujuan: Isi data master awal
Hasil: 21 Puskesmas + semua jenis sarana/TPP/TTU terisi di database

Langkah:
1. Buat seed.ts di packages/database/prisma/
2. Seed 21 Puskesmas
3. Seed 11 Jenis TPP (termasuk TOTAL)
4. Seed 8 Jenis Sarana SPAL
5. Seed 6 Jenis Sarana SAB
6. Seed 8 Jenis Sarana Jamban
7. Seed 12 Jenis TTU Prioritas + 8 Non-Prioritas
8. Seed 1 user admin (admin@dinkes.go.id / admin123)
9. Jalankan `pnpm prisma db seed`

Verifikasi: Buka Prisma Studio, cek semua tabel master terisi
```

#### Step 4: Setup Shadcn/UI + Base Components
```
Tujuan: Install Shadcn/UI dan komponen dasar
Hasil: Komponen UI siap dipakai

Langkah:
1. Init shadcn/ui di apps/web
2. Install komponen: button, input, select, dialog, table, form,
   dropdown-menu, sheet, badge, card, tabs, command, sonner,
   separator, skeleton, avatar, tooltip
3. Setup clsx + tailwind-merge di lib/utils.ts
4. Setup next-themes (dark mode provider)

Verifikasi: Import komponen tidak error
```

### PHASE 2: Layout & Auth (Step 5-6)

#### Step 5: Auth (NextAuth)
```
Tujuan: Login/logout berfungsi
Hasil: User bisa login, session tersimpan, route terproteksi

Langkah:
1. Install next-auth + bcrypt
2. Buat auth config (credentials provider, cek email+password dari DB)
3. Buat API route /api/auth/[...nextauth]
4. Buat middleware.ts (proteksi semua route kecuali /login)
5. Buat halaman /login (form email + password)
6. Buat hook useSession untuk client components

Verifikasi: Login dengan admin@dinkes.go.id / admin123 berhasil, redirect ke dashboard
```

#### Step 6: Layout + Navigasi
```
Tujuan: Layout utama dengan sidebar
Hasil: Semua halaman punya sidebar navigasi yang konsisten

Langkah:
1. Buat komponen Sidebar (collapsible, responsive)
   - Logo + nama app
   - Menu: Dashboard, Master Data (dropdown), Laporan (dropdown), Rekap, Audit Log, Settings
   - User info + logout button
   - Dark mode toggle
2. Buat layout.tsx yang wrap semua halaman (kecuali /login)
3. Buat komponen Header (breadcrumb, command palette trigger)
4. Setup cmdk (command palette Ctrl+K)
5. Setup Sonner (toast provider)

Verifikasi: Navigasi antar halaman berfungsi, sidebar responsive, dark mode toggle works
```

### PHASE 3: Master Data CRUD (Step 7)

#### Step 7: CRUD Master Data (Semua 4 Master)
```
Tujuan: CRUD lengkap untuk Puskesmas, Jenis TPP, Jenis Sarana, Jenis TTU
Hasil: User bisa tambah/edit/hapus/reorder semua master data

Langkah (ulangi untuk setiap master):
1. Buat API route: GET (list), POST (create), PUT (update), DELETE (delete), PATCH (reorder)
2. Buat halaman dengan TanStack Table (kolom: No, Nama, Kategori*, Aksi)
3. Buat dialog form (tambah/edit) dengan React Hook Form + Zod
4. Buat dialog konfirmasi hapus
5. Implementasi drag & drop reorder (@hello-pangea/dnd)
6. Tambah audit log di setiap operasi CUD
7. Toast notification (Sonner) untuk feedback

Urutan pengerjaan:
- /master/puskesmas (paling simple, 1 field: nama)
- /master/jenis-tpp (1 field: nama)
- /master/jenis-sarana (2 field: nama, kategori)
- /master/jenis-ttu (2 field: nama, kategori)

Verifikasi: CRUD semua master berfungsi, reorder tersimpan, audit log tercatat
```

### PHASE 4: Halaman Laporan (Step 8-13)

#### Step 8: Laporan TPP
```
Tujuan: CRUD + tabel laporan TPP
Hasil: User bisa input/edit/hapus data TPP, lihat tabel format Excel

Langkah:
1. Buat API route CRUD untuk laporan_tpp
2. Buat filter bulan/tahun (nuqs - URL state)
3. Buat tabel horizontal: baris=Puskesmas, kolom=JenisTPP × (Terdaftar, Diperiksa, Laik Jml, %)
4. Buat form input (modal) - pilih Puskesmas, isi data per jenis TPP
5. Bulk input mode: tabel editable semua Puskesmas sekaligus
6. Template input: tombol "Copy dari bulan sebelumnya"
7. Status laporan (Draft/Submitted/Approved)
8. Catatan per laporan
9. Audit log

Verifikasi: Input data TPP untuk 3 Puskesmas, lihat tabel terisi, edit, hapus berfungsi
```

#### Step 9: Laporan SPAL
```
Tujuan: CRUD + tabel laporan SPAL
Hasil: Sama seperti TPP tapi dengan struktur kolom SPAL

Langkah: Sama seperti Step 8, sesuaikan:
- Kolom: JenisSarana(SPAL) × (JML, KK, PDDK | Diperiksa: JML, MS, KK, PDDK)
- Jenis sarana dari master jenis_sarana WHERE kategori='spal'

Verifikasi: CRUD SPAL berfungsi lengkap
```

#### Step 10: Laporan SAB
```
Tujuan: CRUD + tabel laporan SAB (ada tambahan kolom inspeksi)
Hasil: Sama seperti SPAL + kolom inspeksi R/S/T/AT

Langkah: Sama seperti Step 9, tambahan:
- Kolom inspeksi: R (Rendah), S (Sedang), T (Tinggi), AT (Amat Tinggi)
- Jenis sarana dari master jenis_sarana WHERE kategori='sab'

Verifikasi: CRUD SAB berfungsi termasuk data inspeksi
```

#### Step 11: Laporan Rumah
```
Tujuan: CRUD + tabel laporan pemeriksaan rumah
Hasil: User bisa input 10 komponen MS/TMS per Puskesmas

Langkah: Sama seperti Step 8, sesuaikan:
- Kolom: Jml Rumah Ada, Jml Diperiksa, 10 Komponen × (MS, TMS), Kandang (MS, TMS, Tidak Ada), Hasil (MS, TMS)
- Tidak pakai jenis_sarana (flat per Puskesmas)

Verifikasi: CRUD Rumah berfungsi lengkap
```

#### Step 12: Laporan Jamban
```
Tujuan: CRUD + tabel laporan jamban
Hasil: Sama seperti SPAL tapi jenis sarana jamban

Langkah: Sama seperti Step 9, sesuaikan:
- Jenis sarana dari master jenis_sarana WHERE kategori='jamban'

Verifikasi: CRUD Jamban berfungsi lengkap
```

#### Step 13: Laporan TTU
```
Tujuan: CRUD + tabel laporan TTU (2 section: prioritas + non-prioritas)
Hasil: User bisa input data TTU per Puskesmas

Langkah: Sama seperti Step 8, sesuaikan:
- Tabel dibagi 2 section: TFU Prioritas dan Non-Prioritas
- Kolom per jenis: Jumlah Total, MS, TMS
- Jenis dari master jenis_ttu

Verifikasi: CRUD TTU berfungsi, 2 section tampil benar
```

### PHASE 5: Fitur Tambahan (Step 14-19)

#### Step 14: Export Excel
```
Tujuan: Setiap halaman laporan bisa export ke .xlsx
Hasil: File Excel terdownload dengan format mirip asli

Langkah:
1. Buat API route /api/export/[jenis] (tpp/spal/sab/rumah/jamban/ttu)
2. Generate Excel dengan SheetJS: header merged, styling, semua data
3. Tambah tombol "Export Excel" di setiap halaman laporan
4. Export rekap tahunan (semua bulan dalam 1 file, per sheet)

Verifikasi: Download Excel, buka di Excel/Sheets, format benar
```

#### Step 15: Import Excel
```
Tujuan: Upload file .xlsx untuk import data
Hasil: User upload Excel, data masuk ke database

Langkah:
1. Buat API route /api/import/[jenis]
2. Parse Excel dengan SheetJS (read mode)
3. Mapping kolom Excel → kolom database
4. Preview data sebelum import (tampilkan di tabel)
5. Konfirmasi import
6. Buat halaman /import dengan upload area

Verifikasi: Upload file Excel asli, data masuk ke database dengan benar
```

#### Step 16: Export PDF + Print
```
Tujuan: Cetak/download laporan format PDF
Hasil: PDF terdownload atau print dialog muncul

Langkah:
1. Buat komponen PrintableTable (format cetak)
2. Implementasi react-to-print untuk print langsung
3. Implementasi jspdf + jspdf-autotable untuk download PDF
4. Tambah tombol "Print" dan "Download PDF" di setiap halaman laporan

Verifikasi: Print preview benar, PDF terdownload dengan format tabel
```

#### Step 17: Dashboard + Grafik
```
Tujuan: Halaman dashboard dengan ringkasan dan grafik
Hasil: Dashboard informatif dengan data real-time

Langkah:
1. Card ringkasan: total data per jenis laporan, bulan terakhir
2. Grafik tren (Recharts): line chart per bulan
3. Status overview: berapa Draft/Submitted/Approved
4. Notifikasi deadline (laporan yang belum diinput bulan ini)
5. Quick links ke halaman yang sering diakses

Verifikasi: Dashboard tampil data real dari database
```

#### Step 18: Rekap Tahunan
```
Tujuan: Generate rekap Januari-Desember
Hasil: Tabel rekap per tahun + export

Langkah:
1. Buat halaman /rekap dengan filter tahun
2. Tampilkan ringkasan per bulan (12 kolom) per jenis laporan
3. Bisa drill-down ke detail per bulan
4. Export rekap ke Excel (semua jenis dalam 1 file, per sheet)

Verifikasi: Rekap tahunan tampil benar, export berfungsi
```

#### Step 19: Notifikasi + Scheduler
```
Tujuan: Notifikasi deadline input laporan
Hasil: User dapat notifikasi di dashboard + email

Langkah:
1. Setup node-cron: cek setiap tanggal 5 bulan berjalan
2. Cek Puskesmas mana yang belum input bulan sebelumnya
3. Simpan notifikasi ke tabel notification
4. Kirim email via nodemailer (opsional, jika SMTP dikonfigurasi)
5. Tampilkan badge notifikasi di sidebar
6. Halaman notifikasi (mark as read)

Verifikasi: Notifikasi muncul untuk Puskesmas yang belum input
```

### PHASE 6: Polish & Deploy (Step 20-22)

#### Step 20: Audit Log + Backup/Restore
```
Tujuan: Riwayat perubahan + backup database
Hasil: Admin bisa lihat siapa mengubah apa, backup/restore data

Langkah:
1. Halaman /audit-log: tabel dengan filter (user, action, table, tanggal)
2. Detail perubahan (old vs new data)
3. Halaman /settings: tombol Backup (export JSON) + Restore (upload JSON)
4. Backup mencakup semua data (master + laporan)

Verifikasi: Audit log tercatat setiap CUD, backup/restore berfungsi
```

#### Step 21: Docker + Coolify Setup
```
Tujuan: Siap deploy ke VPS via Coolify
Hasil: `docker-compose up` jalan, app accessible

Langkah:
1. Buat Dockerfile (multi-stage: deps → builder → runner)
2. Buat docker-compose.yml (app + mysql + volume)
3. Buat .env.example lengkap
4. Buat API route /api/health (untuk Coolify health check)
5. Buat README.md dengan instruksi deploy Coolify
6. Setup Sentry (@sentry/nextjs) untuk error monitoring

Verifikasi: `docker-compose up` → app jalan di localhost:3000, MySQL connected
```

#### Step 22: Final Polish
```
Tujuan: Responsive, performance, UX final
Hasil: App siap production

Langkah:
1. Test responsive semua halaman (mobile, tablet, desktop)
2. Loading states (skeleton) di semua halaman
3. Error boundaries
4. SEO meta tags (title per halaman)
5. Favicon + logo
6. README.md lengkap (setup, development, deploy)

Verifikasi: Lighthouse score > 80, responsive OK, no console errors
```

---

## 11. Catatan Penting untuk AI

1. **Jangan skip step** - Setiap step harus selesai dan diverifikasi sebelum lanjut
2. **Jangan buat file kosong** - Setiap file yang dibuat harus berisi kode yang berfungsi
3. **Test setiap step** - Pastikan `pnpm dev` tidak error setelah setiap perubahan
4. **Gunakan Prisma client dari packages/database** - Jangan buat Prisma client baru di apps/web
5. **Konsisten** - Semua halaman laporan punya pattern yang sama (filter, tabel, CRUD, export)
6. **Audit log** - Setiap operasi Create/Update/Delete harus tercatat
7. **Status laporan** - Semua tabel laporan punya field status dan catatan
8. **Responsive** - Gunakan Sheet (mobile sidebar) + responsive table
9. **Type-safe** - Gunakan Zod schema untuk validasi, infer types dari Prisma
10. **Error handling** - Semua API route harus handle error dengan proper HTTP status

## 12. Design Guidelines

### Warna

| Fungsi | Warna | Hex | Penggunaan |
|--------|-------|-----|-----------|
| Primer | Teal | #0d9488 | Sidebar aktif, tombol utama, link |
| MS (Memenuhi Syarat) | Hijau | #10b981 | Badge, angka positif |
| TMS (Tidak Memenuhi Syarat) | Merah | #ef4444 | Badge, angka negatif |
| Draft | Abu-abu | #6b7280 | Status badge |
| Submitted | Biru | #3b82f6 | Status badge |
| Approved | Hijau | #10b981 | Status badge |
| Background | Putih/Dark | #ffffff / #0f172a | Sesuai tema |
| Sidebar | Slate | #1e293b | Background sidebar |

### Typography

| Elemen | Font | Size | Weight |
|--------|------|------|--------|
| Heading 1 | Inter | 24px | Bold |
| Heading 2 | Inter | 20px | Semibold |
| Body | Inter | 14px | Regular |
| Table Cell | Inter | 13px | Regular |
| Table Header | Inter | 13px | Semibold |
| Badge | Inter | 12px | Medium |

### Layout

| Komponen | Ukuran |
|----------|--------|
| Sidebar (expanded) | 260px |
| Sidebar (collapsed) | 60px |
| Content max-width | Full (fluid) |
| Content padding | 24px |
| Card border-radius | 8px (rounded-lg) |
| Table row height | 40px (compact) |
| Dialog max-width | 640px (md) / 900px (lg untuk bulk input) |

### Komponen Utama

#### Dashboard
```
┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐
│ 📊 TPP   │ │ 🚰 SPAL  │ │ 💧 SAB   │ │ 🏠 Rumah │
│ 156 data │ │ 89 data  │ │ 102 data │ │ 210 data │
│ +12 bln  │ │ +5 bln   │ │ +8 bln   │ │ +15 bln  │
└──────────┘ └──────────┘ └──────────┘ └──────────┘
┌──────────┐ ┌──────────┐
│ 🚽 Jamban│ │ 🏢 TTU   │
│ 95 data  │ │ 78 data  │
│ +7 bln   │ │ +6 bln   │
└──────────┘ └──────────┘

┌─ Grafik Tren Bulanan ────────────────────────────────┐
│ (Line chart - Recharts)                              │
└──────────────────────────────────────────────────────┘

┌─ Status Laporan ──────────┐ ┌─ Deadline ────────────┐
│ Draft: 12 | Sub: 8 | App:5│ │ ⚠ 3 Puskesmas belum  │
└───────────────────────────┘ │   input bulan ini     │
                              └────────────────────────┘
```

#### Tabel Laporan (Sticky Column + Horizontal Scroll)
```
┌────┬────────────┬─── Jasaboga ───┬─── Restoran ───┬─── ...
│ No │ Puskesmas  │ Tdf │ Prk │ %  │ Tdf │ Prk │ %  │
├────┼────────────┼─────┼─────┼────┼─────┼─────┼────┤
│ 1  │ Kejaksan   │  5  │  3  │60% │  8  │  6  │75% │
│ 2  │ Nelayan    │  3  │  2  │67% │  4  │  3  │75% │
├────┼────────────┼─────┼─────┼────┼─────┼─────┼────┤
│    │ TOTAL      │  45 │  32 │71% │  62 │  48 │77% │
└────┴────────────┴─────┴─────┴────┴─────┴─────┴────┘
 ← sticky left →   ← horizontal scroll →
```

#### Form Input (Modal)
```
┌─────────────────────────────────────┐
│ Input Data TPP                    ✕ │
├─────────────────────────────────────┤
│ Puskesmas: [Kejaksan        ▼]     │
│ Bulan:     [April           ▼]     │
│ Tahun:     [2026            ▼]     │
│                                     │
│ ┌─────────────┬─────┬─────┬──────┐ │
│ │ Jenis TPP   │ Tdf │ Prk │ Laik │ │
│ ├─────────────┼─────┼─────┼──────┤ │
│ │ Jasaboga    │ [5] │ [3] │ [2]  │ │
│ │ Restoran    │ [8] │ [6] │ [5]  │ │
│ │ Rumah Makan │ [4] │ [3] │ [3]  │ │
│ └─────────────┴─────┴─────┴──────┘ │
│                                     │
│              [Batal] [💾 Simpan]    │
└─────────────────────────────────────┘
```

#### Sidebar
```
┌────────────────────┐
│ 🏥 Kesling Cirebon │
├────────────────────┤
│ 📊 Dashboard       │
│                    │
│ 📁 Master Data   ▼ │
│   • Puskesmas      │
│   • Jenis TPP      │
│   • Jenis Sarana   │
│   • Jenis TTU      │
│                    │
│ 📋 Laporan       ▼ │
│   • TPP            │
│   • SPAL           │
│   • SAB            │
│   • Rumah          │
│   • Jamban         │
│   • TTU            │
│                    │
│ 📈 Rekap Tahunan   │
│ 📝 Audit Log       │
│ ⚙️  Settings       │
├────────────────────┤
│ 🌙/☀️  │  👤 Admin  │
│         │  [Logout] │
└────────────────────┘
```

### Referensi Design

| Referensi | Ambil Apa |
|-----------|-----------|
| ui.shadcn.com/examples/dashboard | Layout sidebar + content |
| ui.shadcn.com/examples/tasks | Data table + filter + actions |
| tremor.so | Dashboard cards + charts style |
| cal.com (GitHub) | Monorepo Next.js + Prisma pattern |

### Responsive Breakpoints

| Breakpoint | Layout |
|-----------|--------|
| Desktop (≥1280px) | Sidebar expanded + full table |
| Tablet (768-1279px) | Sidebar collapsed (icon only) + table scroll |
| Mobile (<768px) | Sidebar = Sheet (slide) + table scroll + stacked cards |
