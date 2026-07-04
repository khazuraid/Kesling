---
name: Kesling Dashboard
description: Sistem form builder dinamis untuk pelaporan kesehatan lingkungan
colors:
  primary: "{hsl(230 25% 10%)}"
  foreground: "{hsl(230 25% 10%)}"
  background: "{hsl(240 5% 98%)}"
  card: "{hsl(0 0% 100%)}"
  muted: "{hsl(240 5% 94%)}"
  border: "{hsl(240 6% 92%)}"
  brand-primary: "oklch(0.32 0.08 5)"
  brand-accent: "oklch(0.92 0.02 15)"
  brand-ink: "oklch(0.18 0.02 10)"
  brand-surface: "oklch(0.98 0.01 15)"
typography:
  body:
    fontFamily: '"Geist", "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
    fontSize: "13px"
    fontWeight: "400"
rounded:
  premium-card: "2rem"
  premium-card-inner: "calc(2rem-0.375rem)"
  button: "9999px"
  input: "0.75rem"
spacing:
  btn-padding: "12px 24px"
  card-padding: "24px"
components:
  btn-premium:
    backgroundColor: "{colors.primary}"
    textColor: "white"
    rounded: "{rounded.button}"
    padding: "{spacing.btn-padding}"
  btn-secondary:
    backgroundColor: "white"
    textColor: "{colors.primary}"
    rounded: "{rounded.button}"
    padding: "{spacing.btn-padding}"
---

# Design System: Kesling Dashboard

## 1. Overview

**Creative North Star: "Minimalis, Elegan, Tenang"**

Antarmuka ini dirancang untuk profesional, suportif, dan meminimalisir stres bagi pekerja administratif (Admin Dinkes & Operator Puskesmas). Sistem ini menolak visual yang bising dan berfokus murni pada produktivitas tanpa hambatan. Setiap interaksi terasa cepat dan halus, bukan melompat-lompat. Tampilannya seperti dokumen editorial yang rapi atau spreadsheet modern, bukan template SaaS generik.

**Key Characteristics:**
- Fokus pada konten utama dengan tipografi sebagai pemisah ruang.
- Bayangan ambient (ambient shadows) tinggi dipadukan dengan latar putih presisi.
- Penggunaan batas ganda (Doppelrand) yang memberikan kedalaman visual mewah tanpa terasa sumpek.
- Interaksi tenang dengan animasi `ease-out` yang halus dan cepat.

## 2. Colors

Palet didominasi oleh warna netral premium dengan aksen *brand* yang hangat dan presisi.

### Primary
- **Zinc Ink** (hsl(230 25% 10%)): Digunakan sebagai warna utama untuk teks (`--foreground`) dan tombol utama (`--primary`). Warna ini memberikan tingkat keterbacaan yang sangat tinggi (kontras tinggi) tanpa kekerasan warna hitam murni.
- **Deep Mahogany** (oklch(0.32 0.08 5)): Aksen brand utama untuk elemen yang membutuhkan fokus yang elegan.

### Neutral
- **Off-White Paper** (hsl(240 5% 98%)): Warna latar belakang utama aplikasi (`--background`). Terasa ringan dan bersih.
- **Pure White** (hsl(0 0% 100%)): Digunakan khusus untuk permukaan kartu (`--card`) agar menonjol dari latar belakang.
- **Subtle Zinc Border** (hsl(240 6% 92%)): Warna batas yang sangat halus, digunakan seperlunya untuk mempertegas bentuk.

### Named Rules
**The Calm Contrast Rule.** Warna-warni mencolok dilarang keras. Status (Sukses/Error/Info) harus menggunakan pastel yang diredam (seperti `bg-emerald-50 text-emerald-700`) agar tidak memancing stres operasional.

## 3. Typography

**Body Font:** "Geist", "Inter", -apple-system, sans-serif

**Character:** Modern, bersih, sangat geometris namun tetap mudah dibaca dalam form data yang padat.

### Hierarchy
- **Body** (Regular/Medium, 13px): Teks standar untuk tabel dan form. Disengaja menggunakan ukuran 13px untuk kerapatan informasi (*information density*) khas antarmuka kelas atas.
- **Table Headings** (Semibold, 10px, uppercase, tracking-widest): Memberikan pelabelan yang tegas namun tidak berebut perhatian dengan data itu sendiri.
- **Buttons / Inputs** (Semibold, 13px): Memastikan area aksi selalu jelas.

### Named Rules
**The Wide Sub-label Rule.** Selalu gunakan `tracking-widest` dan `uppercase` untuk label kecil (seperti header tabel) agar terbaca jelas meskipun ukurannya mikro.

## 4. Elevation

Sistem ini tidak menggunakan desain datar (flat design) murni, melainkan mengandalkan bayangan ambient kelas atas (high-end ambient shadows) dan pola batas ganda (Doppelrand) untuk memisahkan bidang fungsional.

### Shadow Vocabulary
- **Premium Ambient Shadow** (`var(--shadow)`): Bayangan berlapis dengan penyebaran lebar namun kepekatan sangat rendah (`rgba(0,0,0,0.02)` dan `0.03`). Memberikan kesan kartu "mengambang" lembut.
- **Doppelrand Inner Highlight** (`inset 0 1px 1px rgba(255,255,255,0.7)`): *Glassmorphism* halus pada area dalam kartu yang memisahkan pembungkus luar dan area konten dalam.

### Named Rules
**The Glass Precision Rule.** Penggunaan *glassmorphism* (blur/transparansi) harus terkalibrasi presisi. Bukan untuk dekorasi norak, melainkan untuk menegaskan struktur (contoh: *inner borders*).

## 5. Components

### Premium Card (Doppelrand)
- **Shape:** Sangat melengkung (`2rem` radius luar, `calc(2rem-0.375rem)` radius dalam).
- **Background:** Putih murni di luar, `zinc-50/50` di dalam.
- **Shadow Strategy:** Ambient shadow di luar, inset highlight di dalam.

### Micro-interactive Buttons
- **Shape:** Full pill (`rounded-full`).
- **Primary:** Zinc-950 background dengan transisi `transform scale(0.97)` saat ditekan.
- **Hover / Focus:** Transisi sangat halus selama 160ms menggunakan kurva `ease-out` kustom.

### Premium Input
- **Style:** Background `zinc-50` dengan border tipis.
- **Focus:** Berubah ke warna putih murni dengan bayangan *ring* (`box-shadow: 0 0 0 3px rgba(24, 24, 27, 0.05)`). Memberikan kesan fungsional yang responsif.

### Modern Table
- **Style:** Tanpa garis batas vertikal. Teks data padat.
- **Hover:** Baris merespons dengan transisi warna ke `zinc-50/50`.

## 6. Do's and Don'ts

### Do:
- **Do** gunakan ruang putih (whitespace) dan tipografi tebal untuk memisahkan area antarmuka.
- **Do** gunakan animasi yang cepat dan halus (kurva ease-out kustom) tanpa efek melompat (bouncy).
- **Do** pertahankan kontras teks terhadap latar yang kuat, khusus warna gelap seperti `zinc-950` di atas `zinc-50`.

### Don't:
- **Don't** gunakan elemen visual yang berisik atau warna-warni mencolok yang mengganggu fokus.
- **Don't** gunakan layout bertumpuk (*nested cards*) yang membuat antarmuka terasa sumpek.
- **Don't** aplikasikan gaya *SaaS dashboard template* yang terlalu generik dengan border tebal di mana-mana.
- **Don't** gunakan bayangan gelap, keras, dan tidak di-blur (`box-shadow` murahan). Gunakan variabel bayangan kustom yang telah ditentukan.
