# Mobile Redesign "Industrial Premium" — Struktur + Design + Animasi

> **For Hermes:** Gunakan subagent-driven-development untuk implementasi task-by-task.

**Goal:** Rombak total visual + struktur + motion app mobile Kesling: palette warm-teal (bukan iOS biru), 3 tab + FAB (bukan 5 tab), animasi di semua interaksi pakai react-native-reanimated 4 (sudah terinstall — ZERO dependency baru).

**Architecture:** Tamagui 2.7.4 + expo-router 57. Custom floating pill TabBar dengan FAB tengah menggantikan RN Tabs default. Layer motion primitives reusable (stagger, press-scale, count-up, ring, sheet spring). Struktur IA: Hari Ini (agenda kerja) / Jadwal (kalender+rencana) / Rekap (laporan+rekap), sisanya lewat FAB & profile sheet.

**Tech Stack:** React Native 0.86, reanimated 4.5.3 + react-native-worklets (ADA), react-native-svg 15 (ADA), burnt (ADA), Tamagui core. Dependency BARU: `expo-image-picker` (foto), `react-native-signature-canvas` (TTD — pure JS WebView, no native build), `expo-local-authentication` (biometric).

---

## PART 1 — DESIGN REVIEW (keadaan sekarang)

### Skor per dimensi

| Dimensi | Skor | Kenapa |
|---|---|---|
| Color | 3/10 | #007AFF + #F2F4F8 + #8E8E93 = default iOS persis. Ribuan app sama. |
| Typography | 5/10 | Inter weight 700/800 ok, hierarchy ada, tapi zero karakter. |
| Layout | 5/10 | Card list standar, 5 tab tipis, semua screen pola sama. |
| Motion | 1/10 | **NYARIS NOL.** Hanya transisi stack default. Tidak ada entrance/press/success animation. |
| Distinctiveness | 2/10 | Tidak ada identitas. Tidak bisa dibedakan dari Tamagui starter template. |
| Hierarchy info | 6/10 | Label caps + size step cukup baik. |

### AI Slop signals (HIJAU = aman, MERAH = slop)
- MERAH: default iOS palette (#007AFF/#F2F4F8) — fingerprint "AI-generated iOS clone"
- MERAH: radius seragam 16 semua card tanpa variasi elevasi
- MERAH: zero motion — app terasa mati, semua screen statis
- HIJAU: tidak ada gradient murahan, tidak ada emoji berlebihan, copy Bahasa Indonesia natural

### Apa arti skor 10
- **Color 10**: palette punya pendapat — warm base + satu accent yang jadi identitas brand (teal kesehatan lingkungan), status colors konsisten traffic-light.
- **Motion 10**: setiap state change punya respons fisik — masuk screen = stagger, tekan = scale, sukses = check animation + haptic, angka = count-up, kalender = spring. 60fps, gesture-driven.
- **Distinctiveness 10**: orang lihat screenshot 2 detik → "itu app Kesling".

---

## PART 2 — SPESIFIKASI DESIGN BARU

### Token (light — satu-satunya theme aktif, dark dihapus dari default)

```
bg          #F7F5F2  (warm off-white, BUKAN abu dingin)
card        #FFFFFF
fg          #1F1D1B  (warm charcoal)
muted       #8A8580  (warm gray)
border      #ECE7E1  (warm)
accent      #00A876  (teal-green — identitas kesling)
accentDeep  #008A61
accentSoft  #E6F6F0
danger      #EF4444 / dangerSoft #FEECEB
warning     #F59E0B / warningSoft #FEF4E2
success     #22C55E / successSoft #EAF7EE
purple      #7C6FE0 / purpleSoft #F0EEFB (kategorisasi)
radius: card 20, pill 999, input 14, iconTile 14
```

### Struktur navigasi BARU (breaking)

```
(tabs)/
  index.tsx    → "Hari Ini"   (agenda, ring progress, libur, stat count-up)
  jadwal.tsx   → "Jadwal"     (segmented Bulanan/Tahunan, kalender dot, generate)
  rekap.tsx    → "Rekap"      (segmented Bulanan/Tahunan/Rekap tahun, progress bar)
FAB tengah → ActionSheet spring: [Pemeriksaan Baru] [Sasaran Baru] [Generate Jadwal]
Avatar (Hari Ini header) → ProfileSheet: Data Sasaran, Draft, Notifikasi, Rencana (legacy→jadwal), Logout
```

Dihapus dari tabs: `periksa`, `laporan`, `data`, `menu` (fiturnya TIDAK hilang — pindah ke FAB/sheet/Rekap).
Screen tetap: `inspection/[id]`, `inspection/result/[id]`, `sasaran/*`, `laporan/[id]`, `kategori/[id]`, `drafts`, `notifications`, `login`.

### Motion spec (reanimated 4 — semua wajib)

| Interaksi | Animasi |
|---|---|
| Screen mount | Stagger children: fade + translateY 16→0, 300ms, delay 40ms/item, easing out-cubic |
| Card/list press | scale 1→0.97 (120ms) + opacity, spring balik |
| Stat angka | Count-up 0→N (600ms, easeOut), pakai useSharedValue + useAnimatedProps/Text |
| Progress ring/bulanan | strokeDashoffset animated 0→target (800ms spring) |
| Tab bar | Indicator pill slide antar tab (spring damping 15), icon scale active 1.15, warna accent |
| FAB | Rotate 0→225° saat sheet buka + backdrop fade, sheet translateY spring (damping 18) |
| Segmented control | Indicator translateX spring mengikuti index |
| List mutate (add/remove) | Layout animation (entering: fade+slide; exiting: fade+scale 0.9) |
| Submit inspeksi sukses | SuccessCheck: circle stroke draw + path check draw + haptic notification success |
| Skeleton | Shimmer translateX loop (pengganti opacity pulse) |
| Pull refresh | native RefreshControl, warna accent |
| Toast | burnt native (sudah ada) |

### ATURAN TAMAGUI (dari pengalaman — WAJIB patuh)
- `borderRadius` NUMERIK (`borderRadius={20}`), JANGAN token `$lg`
- Config: spread `...defaultConfig.themes.light/dark` TANPA custom createTokens
- `YStack onPress` dalam `Card overflow=hidden` gagal senyap di iOS → pakai `Button unstyled` atau keluarkan dari Card
- SEMUA route stack baru WAJIB didaftarkan di root `_layout.tsx` `<Stack.Screen>`
- `router.push` harus pass SEMUA param yang dibaca `useLocalSearchParams` target

---

## PART 3 — TASKS

### Task 1: Theme palette baru
**Files:** Modify `apps/mobile/tamagui.config.ts`
Ganti light theme dengan token spec di atas (tambah `accentDeep`). Dark theme ikut disesuaikan (warm dark #17140F bg) tapi app default light-only. Jangan sentuh struktur config (spread defaultConfig tetap).
**Verify:** `npx tsc --noEmit` clean; app jalan, semua warna berubah.

### Task 2: Motion primitives
**Files:** Create `apps/mobile/src/components/motion/primitives.tsx`
Isi: `FadeIn({delay, children})` (entering fade+translateY), `Stagger({children})` (inject delay 40ms*index via cloneElement / context), `ScalePress({onPress, children})` (AnimatedPressable scale 0.97), `useCountUp(target)` hook (shared value + runOnJS set state via useAnimatedReaction), `Shimmer` (looping translateX gradient placeholder).
Base: `Animated.View`/`Animated.createAnimatedComponent(Pressable)` dari reanimated.
**Verify:** tsc clean; storybook manual: render di Hari Ini sementara.

### Task 3: ProgressRing + SuccessCheck
**Files:** Create `apps/mobile/src/components/motion/Ring.tsx`, `apps/mobile/src/components/motion/SuccessCheck.tsx`
Ring: react-native-svg `Circle` stroke=accent, strokeDashoffset from full→target via `useAnimatedProps` (reanimated SVG support), ukuran prop `size`/`strokeWidth`, tengah children (angka count-up).
SuccessCheck: Svg Circle + Path check, animated stroke draw 500ms + `expo-haptics`-ganti → burnt? TIDAK — haptics via `react-native`. NOTE: haptics TIDAK ada dependency — pakai `Haptics` dari `expo-haptics`? BELUM terinstall. PONYTAIL: skip haptics, animasi cukup. Tambah haptics hanya kalau user minta.
**Verify:** tsc clean.

### Task 4: ActionSheet (bottom sheet spring)
**Files:** Create `apps/mobile/src/components/motion/ActionSheet.tsx`
Props: `open, onClose, items: {icon,label,onPress}[]`. Backdrop (fade) + panel translateY spring masuk dari bawah, rounded 28 atas, drag-down close (Gesture.Pan, translateY follow). Reanimated `GestureDetector` + `Gesture`.
**Verify:** tsc; buka-tutup di Hari Ini sementara.

### Task 5: Floating Pill TabBar + FAB
**Files:** Create `apps/mobile/src/components/TabBar.tsx`; Modify `apps/mobile/app/(tabs)/_layout.tsx`
`<Tabs tabBar={(props)=><TabBar {...props}/>}>` — pill melayang: position absolute bottom 16, marginH 16, borderRadius 999, bg rgba(255,255,255,0.94) + border + shadow lembut. 3 slot: Hari Ini, [FAB +], Jadwal, Rekap → sebenarnya 3 tab + FAB di tengah absolut. Active: indicator pill accentSoft di belakang icon (animated x spring), icon accent + scale 1.15, label 11 semibold.
FAB: lingkaran 56 accent, icon Plus putih, rotate saat ActionSheet open.
Perhatian iOS: FAB tap target ≥44, hindari overlap home indicator (bottom 24).
**Verify:** tab switch indicator slide; FAB buka sheet.

### Task 6: Route restructure
**Files:**
- Create `apps/mobile/app/(tabs)/jadwal.tsx` (merge konten `rencana-bulanan.tsx` + `rencana-tahunan.tsx` → segmented animated)
- Create `apps/mobile/app/(tabs)/rekap.tsx` (merge `laporan.tsx` tab + `rekap.tsx` → segmented)
- Rewrite `apps/mobile/app/(tabs)/index.tsx` → "Hari Ini"
- Delete `apps/mobile/app/(tabs)/periksa.tsx`, `data.tsx`, `menu.tsx`, `laporan.tsx`
- Delete `apps/mobile/app/rencana-bulanan.tsx`, `rencana-tahunan.tsx`, `rekap.tsx` (pindah ke tab)
- Modify `apps/mobile/app/_layout.tsx`: hapus Stack.Screen yang dihapus, pastikan semua route tersisa terdaftar (sasaran/new, sasaran/[id], kategori/[id], drafts, notifications, laporan/[id], inspection/*)
Redirect: semua push "/(tabs)/periksa" → FAB flow; "/(tabs)/data" → profile sheet → Data Sasaran screen baru? SIMPLER: buat `app/sasaran/index.tsx` (list sasaran + search) sebagai screen penuh dari ProfileSheet.
**Verify:** semua navigasi jalan; tak ada "unregistered route" senyap (cek memory rule).

### Task 7: Screen "Hari Ini"
**Files:** Rewrite `apps/mobile/app/(tabs)/index.tsx`; Create `apps/mobile/src/components/ProfileSheet.tsx`
Struktur (urut): Header greeting ("Selamat pagi, Fikri" + tanggal + avatar → ProfileSheet) → Ring progress bulan ini (animated, count-up %) → Agenda Hari Ini (list sasaran terjadwal hari ini dari `api.rencanaBulanan(today)`, Stagger entrance, ScalePress → inspection/[id], status badge traffic-light, swipe kanan → buka) → kartu Libur (style tetap, masuk Stagger) → Stat row count-up (pemeriksaan bulan ini / sasaran) → recent 3 inspeksi (ListRow).
Data: dashboard + rencanaBulanan + notifications (libur) — 3 useQuery paralel.
Empty agenda: EmptyState + CTA "Buka Jadwal".
**Verify:** reload app → stagger jalan; ring animate; count-up.

### Task 8: Screen "Jadwal"
**Files:** Rewrite `apps/mobile/app/(tabs)/jadwal.tsx`
Segmented Bulanan/Tahunan (indicator translateX spring). Bulanan: kalender grid (dot: hijau selesai/biru terjadwal/merah libur/abu kosong), tap tanggal → panel list collapse (Layout animation), tombol Generate (dengan sheet konfirmasi kapasitas). Tahunan: 12 mini-card bulan + progress bar animated. Header bulan prev/next (slide fade). Libur tetap merah + panel kelola (pindahkan dari versi lama, gaya baru).
**Verify:** kalender benar (cek Minggu libur); generate skip libur (endpoint sudah ada).

### Task 9: Screen "Rekap"
**Files:** Rewrite `apps/mobile/app/(tabs)/rekap.tsx`
Segmented Bulanan/Tahunan/Rekap. Bulanan: kartu kategori progress bar animated (width % spring stagger). Tahunan: chart sederhana bar 12 bulan (Animated.View height) + persen. Rekap: angka besar count-up + triwulan/semester. Item kategori → kategori/[id].
**Verify:** data render, bar animate on mount.

### Task 10: ProfileSheet + Sasaran list screen
**Files:** Create `apps/mobile/src/components/ProfileSheet.tsx` (reuse ActionSheet): user info, menu (Data Sasaran→/sasaran, Draft→/drafts, Notifikasi→/notifications, Logout), stagger item. Create `apps/mobile/app/sasaran/index.tsx` (list + SearchBar + filter chips animated, FAB tambah kecil → sasaran/new). Register di _layout.
**Verify:** sheet buka/tutup drag; navigasi semua jalan.

### Task 11: Login redesign
**Files:** Rewrite `apps/mobile/app/login.tsx`
Warm bg, brand mark teal dengan ring pulse subtle (loop scale 1→1.04), entrance stagger (brand → form → footer), input focus border animasi ke accent, error shake (translateX keyframe), submit button ScalePress. Tetap tanpa gradient murahan.
**Verify:** login prod jalan (a@a.com).

### Task 12: Inspection form motion
**Files:** Modify `apps/mobile/app/inspection/[id].tsx`, `src/components/InspectionField.tsx`
Progress bar atas → animated width + label count. Field group entrance stagger saat section ganti. Submit sukses → full-screen SuccessCheck overlay (Task 3) 800ms → router.replace result. Ya/Tidak segmented tetap (memory: core tamagui).
**Verify:** isi inspeksi lokal, submit → check animation → result page.

### Task 13: Skeleton shimmer upgrade
**Files:** Modify `apps/mobile/src/components/ui/Skeleton.tsx`
Ganti opacity pulse → Shimmer translateX loop (Task 2), bentuk mengikuti layout target (ring card, list rows).
**Verify:** throttle jaringan → shimmer terlihat.

### Task 14: Foto bukti inspeksi (expo-image-picker)
**Files:** Add dep `expo-image-picker` (~57.0.x); Create `apps/mobile/src/components/PhotoCapture.tsx`; Modify `apps/mobile/app/inspection/[id].tsx`, `apps/mobile/src/lib/drafts.ts`, `apps/mobile/src/lib/api.ts`
PhotoCapture: tombol "Ambil Foto" → `ImagePicker.launchCameraAsync` (max 6 foto, compress quality 0.7). Preview grid thumbnail, tap → full screen, long press → hapus. Simpan path lokal di draft (base64 atau file:// URI). Saat sync → kirim sebagai `photos` array ke `/inspection/offline-sync` (backend `saveMobilePhotos` sudah ada, simpan ke `public/uploads/mobile/`).
Draft type tambah: `photos?: string[]`.
**Verify:** ambil foto di Expo Go → preview → submit → cek foto tersimpan di prod `/public/uploads/mobile/`.

### Task 15: Tanda tangan digital (react-native-signature-canvas)
**Files:** Add dep `react-native-signature-canvas` (RN 0.86 compatible, pure JS WebView — no native build); Create `apps/mobile/src/components/SignaturePad.tsx`; Modify `apps/mobile/app/inspection/[id].tsx`, `apps/mobile/src/lib/drafts.ts`
SignaturePad: modal full screen, canvas putih, stylus finger, tombol "Simpan" → encode base64 PNG. Simpan di draft sebagai `signature`. Saat sync → kirim `signature` ke offline-sync (backend sudah handle `signatureData`). Tampilkan TTD di result page.
Draft type tambah: `signature?: string`.
**Verify:** TTD di Expo Go → submit → cek `signatureData` tersimpan di DB.

### Task 16: Banner offline + draft counter
**Files:** Modify `apps/mobile/app/(tabs)/index.tsx` (Hari Ini), `apps/mobile/src/lib/drafts.ts`
Hari Ini: jika `getDrafts().length > 0` → banner oren di atas (warning bg, icon cloud-off, "X draft belum tersinkron", tap → `/drafts`). useQuery draft count, invalidate setelah sync.
**Verify:** buat draft offline → banner muncul → sync → banner hilang.

### Task 17: Filter chips (animated)
**Files:** Create `apps/mobile/src/components/ui/FilterChips.tsx`; Modify `apps/mobile/app/sasaran/index.tsx` (Task 10)
FilterChips: row horizontal scroll, chip pill animated (indicator spring ke chip aktif, bg accentSoft). State: Semua / Selesai / Terjadwal / Belum. Filter list client-side. Segmented animation reuse dari Task 2 motion primitives.
**Verify:** ganti filter → list update smooth, indicator slide.

### Task 18: Puskesmas selector (ADMIN/DINKES)
**Files:** Create `apps/mobile/src/components/PuskesmasPicker.tsx`; Modify `apps/mobile/app/(tabs)/index.tsx` + `rekap.tsx` + `jadwal.tsx`; Modify `apps/mobile/src/lib/api.ts` (tambah optional `puskesmasId` param ke dashboard/rencana/rekap calls); Modify backend routes: `dashboard/route.ts`, `rencana-bulanan/route.ts`, `rekap/route.ts` (accept `?puskesmasId=` query, allow ADMIN/DINKES only)
PuskesmasPicker: di header Hari Ini (hanya role ADMIN/DINKES), dropdown pill → bottom sheet list 21 puskesmas. Selected ID disimpan di AsyncStorage + state. Semua query mengirim puskesmasId.
Backend: if role ADMIN/DINKES → use query param; if OPERATOR → ignore, use own puskesmasId.
**Verify:** login admin → pilih puskesmas → data berubah.

### Task 19: Notifikasi deadline laporan
**Files:** Modify `apps/web/src/app/api/mobile/v1/notifications/route.ts`
Di GET notifications: cek tanggal hari ini. Jika tanggal ≤ 10 dan laporan bulan lalu belum dibuat → inject notifikasi sistem "Laporan bulanan [bulan] belum dibuat. Deadline tanggal 10." Cek via `prisma.laporan.count({ where: { bulan, tahun, puskesmasId, status: 'FINAL' } })`.
Type: tambah field `isSystem: boolean` ke response (notifikasi generated, bukan dari DB).
**Verify:** curl prod → ada notifikasi deadline kalau laporan belum ada.

### Task 20: Share/export hasil inspeksi (PDF)
**Files:** Create `apps/mobile/src/lib/share.ts`; Modify `apps/mobile/app/inspection/result/[id].tsx`
share.ts: generate HTML sederhana (nama sasaran, tanggal, skor, field values, foto URLs) → `expo-sharing` (sudah ada di SDK? cek) atau fallback `Linking.openURL('mailto:...')`. 
PONYTAIL: jika expo-sharing tidak ada → pakai `react-native.Share.share({ message: text })` (builtin, no dep). Upgrade ke PDF nanti kalau diminta.
Tombol share di result page header → Share sheet native.
**Verify:** buka result → tap share → sheet muncul.

### Task 21: Biometric login (Face ID / Touch ID)
**Files:** Add dep `expo-local-authentication`; Modify `apps/mobile/app/login.tsx`, `apps/mobile/src/lib/auth.tsx`, `apps/mobile/src/lib/storage.ts`
Setelah login sukses pertama → simpan credentials (email) di SecureStore + flag `biometricEnabled`. Saat buka app: jika flag true → auto-prompt biometric. Jika sukses → ambil token dari SecureStore → langsung ke Hari Ini (skip form). Tombol "Login dengan Face ID" di login page. Fallback: password form tetap ada.
storage.ts: `setBiometric(email)`, `getBiometricEmail()`, `clearBiometric()`.
**Verify:** login → close app → buka → Face ID prompt → langsung masuk.

### Task 22: Search global
**Files:** Create `apps/mobile/src/components/GlobalSearch.tsx`; Modify `apps/mobile/app/(tabs)/index.tsx` (Hari Ini header)
Search icon di header → modal fullscreen search. Input dengan debounce 300ms. Hasil: sasaran (nama/alamat), inspeksi (namaSasaran/tanggal), kategori. Tab hasil segmented: Semua/Sasaran/Inspeksi. Tap → navigasi ke detail. Recent searches (3 terakhir, simpan AsyncStorage).
Query: `api.sasaran()` + `api.inspectionResults()` filter client-side. PONYTAIL: backend search endpoint nanti kalau data besar.
**Verify:** ketik "tini" → muncul Warung Bu Tini → tap → detail.

### Task 23: Dark mode toggle (manual, optional)
**Files:** Modify `apps/mobile/tamagui.config.ts` (dark theme warm), `apps/mobile/components/Provider.tsx`, `apps/mobile/app/_layout.tsx`; Create `apps/mobile/src/lib/theme.ts`
PERHATIAN: user preference "NEVER dark bg" — dark mode OPSIONAL via toggle, default tetap LIGHT. Toggle di ProfileSheet. Simpan preference di AsyncStorage. Dark theme: warm dark bg #17140F (bukan hitam dingin), card #1F1C17, fg #F5F0EB, accent teal #1FB88A (lebih terang untuk dark).
Provider: useColorScheme override → baca dari theme.ts. StatusBar style dynamic.
**Verify:** toggle dark → semua screen dark warm; toggle light → kembali.

### Task 24: Export PDF hasil inspeksi
**Files:** Create `apps/mobile/src/lib/exportPdf.ts`; Modify `apps/mobile/app/inspection/result/[id].tsx`
Ganti Task 20 (Share text) → PDF proper. Generate HTML template (nama sasaran, alamat, tanggal, petugas, skor, field values, foto URLs, TTD) → render via `react-native-view-shot` + `react-native-pdf`? TERLALU BERAT. 
ALTERNATIF: generate HTML → buka di WebView → print to PDF via `expo-print` (ADA? cek). Atau: kirim ke backend `/api/mobile/v1/inspection/results/[id]/pdf` → server-side PDF (web sudah punya jsPDF + autoTable) → download + share.
PONYTAIL: pilih backend PDF (sudah ada jsPDF di web) → fetch PDF blob → `expo-sharing` atau `expo-file-system` save + Share.
Backend: create `apps/web/src/app/api/mobile/v1/inspection/results/[id]/pdf/route.ts` — reuse jsPDF logic dari web laporan.
**Verify:** buka result → tap export → PDF terdownload → share sheet.

### Task 25: Onboarding carousel (3 slide, first launch)
**Files:** Create `apps/mobile/app/onboarding.tsx`; Modify `apps/mobile/app/_layout.tsx`
3 slide: (1) "Inspeksi Lapangan" — ilustrasi pemeriksaan, (2) "Jadwal Otomatis" — kalender, (3) "Laporan & Rekap" — chart. Slide horizontal reanimated (pan gesture, spring), dots indicator animated. Tombol "Lewati" / "Mulai". Flag `onboardingDone` di AsyncStorage. Tampil hanya sekali (atau reset dari ProfileSheet).
Ilustrasi: icon lucide besar + teks, TIDAK pakai gambar eksternal.
**Verify:** install fresh → onboarding muncul → selesai → tidak muncul lagi.

### Task 26: Skor gauge chart (semicircle)
**Files:** Create `apps/mobile/src/components/motion/GaugeChart.tsx`; Modify `apps/mobile/app/inspection/result/[id].tsx` + `apps/mobile/app/(tabs)/rekap.tsx`
Semicircle gauge (SVG arc 180°) — stroke gradient hijau→kuning→merah sesuai skor. Animated stroke draw 0→target (spring 800ms). Angka count-up di tengah. Untuk result page (skor inspeksi) + Rekap (skor rata-rata puskesmas).
Color thresholds: <60 merah, 60-80 kuning, >80 hijau.
**Verify:** buka result → gauge menggambar + angka naik.

### Task 27: Offline cache (data sasaran + template)
**Files:** Create `apps/mobile/src/lib/cache.ts`; Modify `apps/mobile/src/lib/api.ts`
Cache sasaran list + template list di AsyncStorage (key `cache_sasaran`, `cache_templates`). Saat app buka: tampilkan cached data dulu (instant), lalu fetch fresh → update. Jika offline (fetch gagal) → tetap pakai cache. Timestamp cache (max 24h). 
API: `api.sasaran()` dan `api.templates()` → cek cache → return cached immediately → background refresh.
**Verify:** buka app → data muncul instant → matikan jaringan → data tetap ada.

### Task 28: Cleanup + full verify
- Hapus import/route mati; `npx tsc --noEmit` 0 error
- `npx expo export --platform ios` sukses
- Manual test di Expo Go (LAN IP): login → Hari Ini stagger → FAB → inspeksi → SuccessCheck → Jadwal generate → Rekap → ProfileSheet logout
- `pnpm run lint` (biome) clean
- Commit: `feat(mobile): total redesign industrial premium — struktur 3 tab + FAB + motion system`

---

## Files Summary

**Create:** `src/components/motion/primitives.tsx`, `src/components/motion/Ring.tsx`, `src/components/motion/SuccessCheck.tsx`, `src/components/motion/ActionSheet.tsx`, `src/components/motion/GaugeChart.tsx`, `src/components/TabBar.tsx`, `src/components/ProfileSheet.tsx`, `src/components/PhotoCapture.tsx`, `src/components/SignaturePad.tsx`, `src/components/PuskesmasPicker.tsx`, `src/components/GlobalSearch.tsx`, `src/components/ui/FilterChips.tsx`, `app/(tabs)/jadwal.tsx`, `app/(tabs)/rekap.tsx`, `app/sasaran/index.tsx`, `app/onboarding.tsx`, `src/lib/share.ts`, `src/lib/exportPdf.ts`, `src/lib/cache.ts`, `src/lib/theme.ts`

**Rewrite:** `tamagui.config.ts`, `app/(tabs)/_layout.tsx`, `app/(tabs)/index.tsx`, `app/login.tsx`, `src/components/ui/Skeleton.tsx`, `app/inspection/[id].tsx` (modify), `app/inspection/result/[id].tsx` (modify)

**Delete:** `app/(tabs)/periksa.tsx`, `app/(tabs)/data.tsx`, `app/(tabs)/menu.tsx`, `app/(tabs)/laporan.tsx`, `app/rencana-bulanan.tsx`, `app/rencana-tahunan.tsx`, `app/rekap.tsx`

**Modify:** `app/_layout.tsx` (route registry + onboarding gate), `components/Provider.tsx` (theme provider), `src/components/InspectionField.tsx`, `src/lib/drafts.ts` (add photos+signature), `src/lib/api.ts` (add puskesmasId params + cache), `src/lib/auth.tsx` (biometric), `src/lib/storage.ts` (biometric helpers), `src/types.ts` (add photos+signature+isSystem), backend: `notifications/route.ts`, `dashboard/route.ts`, `rencana-bulanan/route.ts`, `rekap/route.ts` (puskesmasId param), `apps/web/src/app/api/mobile/v1/inspection/results/[id]/pdf/route.ts` (NEW — server-side PDF)

**New deps:** `expo-image-picker`, `react-native-signature-canvas`, `expo-local-authentication`

## Tests / Validation
- `npx tsc --noEmit` setelah tiap task
- `npx expo export --platform ios` di akhir
- Manual: iPhone Expo Go LAN — checklist Task 28
- API contract TIDAK berubah (semua endpoint sama, kecuali puskesmasId param baru + PDF endpoint)

## Risks & Tradeoffs
- Reanimated 4 + worklets di Expo Go: OK (New Architecture default SDK 57)
- Custom tabBar dengan expo-router Tabs: prop `tabBar` custom didukung; fallback absolute view jika bermasalah
- Delete screen lama → grep semua `router.push` sebelum delete
- Warm bg di dark mode: app default LIGHT, dark mode opsional via toggle
- SuccessCheck overlay: tampilkan hanya jika sukses, error tetap toast
- expo-image-picker: butuh permission kamera — Expo Go handle, EAS perlu config
- react-native-signature-canvas: pure JS WebView, kompatibel Expo Go
- expo-local-authentication: Face ID/Touch ID — Expo Go handle, EAS perlu config
- Puskesmas selector: enforce server-side (OPERATOR tidak bisa lihat puskesmas lain)
- Foto size: compress 0.7, max 6 → cegah payload besar
- PDF export: backend jsPDF (sudah ada) → fetch blob → share. Lebih ringan daripada render di mobile
- Dark mode: extra complexity di semua screen — pastikan token terpakai konsisten
- Onboarding: flag AsyncStorage, bisa reset dari ProfileSheet
- Offline cache: stale data risk → tampilkan timestamp "Data per [jam]"

## Yang sengaja DILEWATI (YAGNI)
- Haptics (expo-haptics belum ada; tambah hanya jika diminta)
- Voice notes (dihapus per request)
- Multi-language (dihapus per request)
- Push notification (dihapus per request)
- Calendar export (dihapus per request)
- Map view (butuh dep + API key; upgrade nanti)
- Backend search endpoint (client-side filter dulu, backend kalau data besar)
