# Rekapitulasi Aplikasi Kesling Dashboard

Dokumen ini berisi rangkuman teknis dan fungsional dari **Aplikasi Kesling Dashboard** (Kesehatan Lingkungan), mencakup arsitektur, fitur utama, teknologi yang digunakan, serta konsep desain antarmuka (UI/UX).

---

## 1. Arsitektur & Teknologi (Tech Stack)

Aplikasi ini dibangun menggunakan arsitektur *Monorepo* dengan **Turborepo** untuk memisahkan logika antarmuka (Frontend/Backend) dengan modul basis data.

*   **Framework Utama:** Next.js 14/15 (App Router)
*   **Bahasa Pemrograman:** TypeScript
*   **Basis Data (Database):** PostgreSQL
*   **ORM:** Prisma (`packages/database`)
*   **Autentikasi:** NextAuth.js (Role-based: `ADMIN` & `OPERATOR`)
*   **Styling:** Tailwind CSS + Vanilla CSS (Custom Design Tokens)
*   **State Management / Fetching:** React Query (@tanstack/react-query)
*   **Komponen UI:** Radix UI (shadcn/ui primitives), Lucide Icons
*   **Infrastruktur & Deployment:** Docker & Docker Compose (`docker-compose.yml`)

---

## 2. Struktur Monorepo

*   `apps/web/`: Aplikasi utama (Next.js) yang memuat antarmuka pengguna, API routes, dan komponen *frontend*.
*   `packages/database/`: Modul basis data berisi skema Prisma (`schema.prisma`), *migrations*, dan *Prisma Client* yang di-*share* ke dalam aplikasi web.

---

## 3. Penjelasan Rinci Fitur & Routing Aplikasi

### A. Dashboard & Analitik
*   **Dashboard Overview (`/`)**
    *   **Deskripsi:** Halaman utama yang diperuntukkan bagi Admin Kabupaten.
    *   **Fungsi:** Menampilkan ringkasan capaian kinerja global secara keseluruhan, melihat tren kepatuhan data secara waktu nyata, serta diagram distribusi data pelaporan.
*   **Dashboard PKM (`/dashboard-pkm`)**
    *   **Deskripsi:** Tampilan dashboard yang dikhususkan untuk memantau fasilitas kesehatan.
    *   **Fungsi:** Menampilkan performa spesifik per Puskesmas, memberikan informasi perbandingan indikator antara rasio target yang harus dicapai berbanding dengan defisit (kekurangan) capaian yang ada.
*   **Perbandingan Kinerja (`/perbandingan`)**
    *   **Deskripsi:** Halaman papan peringkat (*Leaderboard*).
    *   **Fungsi:** Membandingkan capaian kinerja antar-puskesmas berdasarkan indeks atau indikator kepatuhan tertentu sehingga memicu kompetisi yang sehat.
*   **Rekapitulasi Tahunan (`/rekap`)**
    *   **Deskripsi:** Halaman laporan tabuler komprehensif.
    *   **Fungsi:** Menampilkan daftar indikator data secara lengkap per bulan. Terintegrasi dengan fitur *filter* yang memungkinkan pencarian spesifik berdasarkan nama Puskesmas dan/atau tahun tertentu.

### B. Dynamic Report Builder & Form Input
*   **System Builder Studio (`/laporan-builder`)**
    *   **Deskripsi:** Mesin pembuat formulir (*Form Generator*) tingkat lanjut dengan akses khusus Admin.
    *   **Fungsi:** Digunakan untuk merancang struktur pelaporan yang dinamis. Admin bebas merancang kategori, sub-kategori, mengatur *parameter input* yang dibutuhkan, hingga menyematkan formula matematika (*Numerator*/*Denominator*) yang secara otomatis akan mengkalkulasi nilai saat data dimasukkan.
*   **Form Input Laporan (`/laporan/[categoryCode]`)**
    *   **Deskripsi:** Halaman antarmuka pamasukan data (*Data Entry*).
    *   **Fungsi:** Mengadaptasi dan me-*render* tampilan form secara otomatis berdasarkan skema/konfigurasi yang telah diset pada *System Builder Studio*. Operator mengisi data sesuai parameter dan formula yang telah digenerasi.

### C. Pengaturan & Manajemen (Settings)
*   **Master Data (`/settings`)**
    *   **Deskripsi:** Pusat pengaturan dasar aplikasi.
    *   **Fungsi:** Tempat untuk mengkonfigurasi atau menambahkan data induk (contoh: Menambah/mengedit daftar Master Puskesmas atau cakupan wilayah).
*   **Manajemen Pengguna (`/settings/users`)**
    *   **Deskripsi:** Modul pengaturan akun dan hak akses (*Role-Based Access Control*).
    *   **Fungsi:** Mengatur otorisasi wewenang antara pengguna `ADMIN` (Level Kabupaten) dan `OPERATOR` (Level Puskesmas).
*   **Impor & Sinkronisasi (`/settings/import`)**
    *   **Deskripsi:** Fasilitas *Bulk Action*.
    *   **Fungsi:** Memungkinkan pengguna untuk mengunggah konfigurasi struktur baru maupun entri data secara massal menggunakan berkas *spreadsheet* (Excel / `.xlsx`).

### D. Keamanan, Sistem Log & Autentikasi
*   **Audit Log (`/audit-log`)**
    *   **Deskripsi:** Sistem pelacakan riwayat aktivitas berdesain khusus (*Dark-Neon Console*).
    *   **Fungsi:** Merekam dan melacak setiap jejak rekam perubahan sistem (*Create, Update, Delete*). Secara transparan memperlihatkan detail perbedaan data sebelum dan sesudah diedit menggunakan tampilan *JSON Diff* (*developer-grade*).
*   **Profil (`/profile`)**
    *   **Deskripsi:** Halaman pengelolaan akun personal.
    *   **Fungsi:** Melihat detail akun yang sedang aktif (profil pengguna) dan mengganti *password* secara aman.
*   **Autentikasi (`/login`)**
    *   **Deskripsi:** Halaman gerbang masuk aplikasi.
    *   **Fungsi:** Melayani proses login aman menggunakan sistem yang terintegrasi dengan `NextAuth.js` (Route ini berada di luar *layout* utama).

---

## 4. UI/UX & Design System

Aplikasi ini menggunakan filosofi **Modern Premium Dashboard** dengan pengaruh desain antarmuka kelas atas (*high-end aesthetic* seperti lini Vercel, Linear, dan Emil Kowalski).

*   **Doppelrand (Double Border) Layout:** Kartu dan kontainer menggunakan kelas `.card-premium` dan `.card-inner` yang memberikan efek *border* bertingkat untuk kedalaman visual yang mewah.
*   **Glassmorphism & Shadows:** Penggunaan bayangan (*shadows*) yang sangat halus dan terkalibrasi (`shadow-[0_8px_30px_rgb(0,0,0,0.02)]`) dikombinasikan dengan latar putih presisi.
*   **Premium Typography:** Penggunaan *tracking-tight* untuk *heading* dan *tracking-widest* (uppercase) untuk teks pelabelan (sub-label).
*   **Micro-interactions & Animation:** Tombol (`.btn-premium`) memiliki efek transisi *scale-down* ketika ditekan, dan indikator warna memiliki animasi *pulse* serta *glow effect*.
*   **Dark-Neon Console:** Detail teknis (seperti JSON di Audit Log) menggunakan *dark theme* (`bg-[#09090b]`) dipadukan dengan teks warna *neon* tembus pandang (Zamrud dan Merah Muda) untuk kesan *developer-grade* dan futuristik.
*   **Tabel Modern:** Komponen tabel (`.table-modern`) dirombak bebas garis batas vertikal dengan gaya *clean-cut* untuk keterbacaan data yang padat.

---

## 5. Deployment Flow

Setiap terjadi pembaruan konfigurasi struktur atau antarmuka, perintah rilis di server (melalui *Docker*) adalah:

```bash
docker compose up -d --build web
```
Perintah ini akan menyuruh Docker untuk mengkompilasi ulang berkas Next.js (*optimized production build*) dan mengunduh pembaruan *schema database* sebelum me-restart layanan.
