# Panduan Konfigurasi & Deploy ke Coolify VPS

Dokumen ini menjelaskan langkah-langkah untuk mendeploy proyek ini ke VPS menggunakan **Coolify** dengan file Docker Compose (`docker-compose.coolify.yml`) yang telah disesuaikan.

---

## 1. File Konfigurasi Docker Compose

Kami telah membuat file **`docker-compose.coolify.yml`** di root direktori. File ini dirancang khusus untuk Coolify dengan ketentuan:
- **Tanpa Custom Network**: Menghindari masalah routing HTTPS dan proxy Traefik di Coolify.
- **Tanpa Container Name**: Membiarkan Coolify membuat nama container unik secara otomatis untuk mencegah konflik.
- **Dynamic Password Generation**: Menggunakan password database PostgreSQL yang di-generate otomatis oleh Coolify (`${SERVICE_PASSWORD_POSTGRES}`).
- **Pemisahan Worker**: Container `app` menjalankan server utama Next.js (dengan auto-migration), sedangkan container `worker` menjalankan background queue worker (`node apps/web/worker.js`) tanpa menjalankan ulang migrasi database.

---

## 2. Langkah-Langkah Deploy di Dashboard Coolify

1. **Buat Resource Baru**:
   - Buka dashboard Coolify Anda.
   - Pilih **Project** > **Environment** (biasanya `production`).
   - Klik **+ Add Resource** dan pilih **Docker Compose**.

2. **Koneksikan Git Repository**:
   - Hubungkan ke repository Git tempat proyek ini berada.
   - Atur **Compose File Path** ke `docker-compose.coolify.yml` (atau Anda bisa memilih untuk langsung copy-paste isi file `docker-compose.coolify.yml` ke dalam editor compose Coolify).

3. **Konfigurasi Domain**:
   - Setelah mendeteksi file Compose, Coolify akan menampilkan daftar service.
   - Di service **`app`**, masukkan domain publik Anda di kolom **Domains** (contoh: `https://kesling.cirebon.go.id` atau `http://vps-ip:3000`). Coolify/Traefik akan otomatis melakukan routing HTTPS ke port internal `3000` dari aplikasi.
   - Untuk service `worker`, `postgres`, dan `redis`, biarkan kolom domain kosong agar tidak terekspos ke luar (hanya bisa diakses secara internal dari dalam network cluster).

---

## 3. Konfigurasi Environment Variables

Coolify akan otomatis mendeteksi variabel yang menggunakan format `${VAR_NAME}` di file compose dan meminta Anda mengisinya di tab **Environment Variables**:

| Nama Variabel | Deskripsi / Nilai |
|---|---|
| `NEXTAUTH_URL` | Masukkan URL publik aplikasi Anda (contoh: `https://kesling.cirebon.go.id`). |
| `NEXTAUTH_SECRET` | String acak untuk enkripsi JWT/Session (samakan dengan secret di env lokal agar session user tidak invalid). |
| `CRON_SECRET` | Token keamanan untuk API Cron/Job Scheduler. |
| `SERVICE_PASSWORD_POSTGRES` | Biarkan kosong atau biarkan Coolify meng-generate password acak yang aman. Nilai ini akan otomatis diinjeksi ke variable database. |

---

## 4. Keamanan & Persistence Data

- **Database Persistence**: PostgreSQL menggunakan volume `pgdata` yang dideklarasikan di bagian bawah compose. Data database Anda akan tetap aman dan persisten bahkan ketika kontainer direstart atau dideploy ulang.
- **Auto Database Migration**: Migrasi skema database dijalankan otomatis saat kontainer `app` pertama kali naik menggunakan script `docker-entrypoint.sh` yang mendeteksi migrasi SQL baru dan menjalankannya secara aman sebelum server Next.js aktif.
