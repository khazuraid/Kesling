---
target: Dashboard Overview (apps/web/src/app/(app)/page.tsx)
total_score: 29
p0_count: 0
p1_count: 1
timestamp: 2026-06-03T02-39-15Z
slug: apps-web-src-app-app-page-tsx
---
#### Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | Skeletons dan progress bar sudah baik |
| 2 | Match System / Real World | 4 | Terminologi Puskesmas & Indikator jelas |
| 3 | User Control and Freedom | 3 | Fungsi Export tersedia di berbagai tempat |
| 4 | Consistency and Standards | 3 | Penggunaan komponen premium konsisten |
| 5 | Error Prevention | 3 | n/a |
| 6 | Recognition Rather Than Recall | 4 | Tabel data sangat eksplisit |
| 7 | Flexibility and Efficiency | 2 | Kurangnya filtering kompleks di dashboard |
| 8 | Aesthetic and Minimalist Design | 3 | Layout rapi, namun ada inkonsistensi tema (card gelap) |
| 9 | Error Recovery | 3 | n/a |
| 10 | Help and Documentation | 1 | Tidak ada tombol bantuan atau tooltips |
| **Total** | | **29/40** | **Good** |

#### Anti-Patterns Verdict

**LLM assessment**: Desain sudah cukup matang dan berhasil menerapkan estetika "Doppelrand" (double border). Namun, ada dua jebakan pola yang terlihat:
1. **The Random Dark Section**: Ada satu card ("Completion Rate") yang berwarna sangat gelap (`bg-zinc-950`) di tengah barisan card putih. Ini mengganggu *flow* visual dan terlihat seperti tempelan acak.
2. **Low-Contrast Micro Typography**: Penggunaan `text-zinc-400` pada teks berukuran `10px` / `11px` terlihat estetik namun dipastikan **gagal** lolos uji rasio kontras WCAG (4.5:1).

**Deterministic scan**: Tidak ada *AI slop* generik seperti *hero-metric template* murahan yang terdeteksi, skor kode dasar cukup bersih (`[]`).

#### Overall Impression
Aplikasi ini sudah mengarah ke "Modern Premium Dashboard" yang diinginkan. Namun, eksekusi warna untuk teks-teks kecil (label, tabel header) terlalu mengorbankan aksesibilitas demi estetika minimalis. Card yang tiba-tiba gelap di area atas juga memecah konsentrasi.

#### What's Working
- **Doppelrand Layout**: Efek kedalaman bayangan (ambient shadows) bekerja sangat baik memisahkan struktur.
- **Tabel Clean-Cut**: Penghilangan garis batas vertikal pada tabel sangat membantu *information density* tanpa terlihat sumpek.

#### Priority Issues
- **[P1] Aksesibilitas Kontras Teks (Low Contrast)**
  - **Why it matters**: Label tabel (`text-zinc-400` di atas `bg-zinc-50`) tidak dapat dibaca jelas oleh pengguna dengan mata lelah atau di layar berkualitas rendah.
  - **Fix**: Ubah warna teks label kecil (khususnya header tabel dan *eyebrow*) minimal ke `text-zinc-500` atau `text-zinc-600`.
  - **Suggested command**: `$impeccable typeset`
- **[P2] Ukuran Teks Terlalu Kecil (Micro-Typography)**
  - **Why it matters**: Ukuran `10px` berada di bawah standar minimum kemudahan membaca di web (idealnya minimum `11px` atau `12px` untuk label).
  - **Fix**: Naikkan ukuran `text-[10px]` menjadi `text-[11px]` atau `text-xs`.
  - **Suggested command**: `$impeccable typeset`
- **[P2] Inkonsistensi Tema Card (Dark Card di Light Mode)**
  - **Why it matters**: Card "Completion Rate" yang gelap tiba-tiba mematahkan konsistensi visual halaman *light mode*.
  - **Fix**: Ubah card tersebut menjadi *light mode* dengan aksen warna Emerald yang lebih terkontrol, atau gunakan border Emerald agar tetap *stand out* tanpa harus gelap gulita.
  - **Suggested command**: `$impeccable polish`

#### Persona Red Flags

**Sam (Accessibility-Dependent User)**: Kontras warna abu-abu pada latar terang akan menyulitkan Sam. Selain itu, belum terlihat apakah tabel memiliki struktur `aria-label` yang ramah *screen reader*.
**Alex (Impatient Power User)**: Alex mungkin ingin langsung mengeklik card "Completion Rate" untuk melihat detail siapa yang belum mengumpulkan laporan, tapi elemen tersebut belum dapat diklik.

#### Minor Observations
- Efek hover pada baris tabel (`hover:bg-zinc-50/50`) mungkin terlalu halus, bisa dinaikkan sedikit intensitasnya.

#### Questions to Consider
- "Apakah card 'Completion Rate' sengaja dibuat gelap agar paling menonjol, atau kita bisa menggunakan cara elegan lain (misal: warna aksen spesifik) yang tidak merusak tema?"
- "Apakah data yang banyak di *dashboard* memerlukan fitur pencarian instan (*quick search*)?"
