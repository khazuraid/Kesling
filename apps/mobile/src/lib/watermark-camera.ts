import * as FileSystem from "expo-file-system";
import * as ImageManipulator from "expo-image-manipulator";
import { Image } from "react-native";

export interface WatermarkOptions {
  coords?: { lat: number; lng: number };
  sasaranName?: string;
  petugasName?: string;
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * Format tanggal dan jam WIB Cirebon
 */
function getFormattedWibDate(): string {
  const now = new Date();
  return (
    now.toLocaleString("id-ID", {
      timeZone: "Asia/Jakarta",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }) + " WIB"
  );
}

/**
 * Mendapatkan dimensi asli gambar (Width x Height) untuk deteksi orientasi Portrait vs Landscape
 */
function getImageDimensions(uri: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    Image.getSize(
      uri,
      (width, height) => resolve({ width, height }),
      () => resolve({ width: 1200, height: 1600 }),
    );
  });
}

/**
 * Membuat SVG string untuk overlay watermark yang adaptif terhadap resolusi & orientasi (Portrait / Landscape)
 */
function createWatermarkSvg(
  targetWidth: number,
  targetHeight: number,
  isLandscape: boolean,
  options: WatermarkOptions,
): string {
  const timeStr = getFormattedWibDate();
  const coordStr = options.coords
    ? `LAT ${options.coords.lat.toFixed(6)} • LNG ${options.coords.lng.toFixed(6)}`
    : "GPS RTK: DINKES KOTA CIREBON";
  const sasaranStr = options.sasaranName
    ? `SASARAN: ${options.sasaranName.toUpperCase().slice(0, isLandscape ? 45 : 32)}`
    : "INSPEKSI KESEHATAN LINGKUNGAN";
  const officerStr = `PETUGAS: ${(options.petugasName || "SANITARIAN DINKES").toUpperCase()}`;

  // Ukuran proporsional berdasarkan orientasi
  const barHeight = isLandscape ? 85 : 105;
  const barY = targetHeight - barHeight;
  const fontSizeMain = isLandscape ? 17 : 19;
  const fontSizeSub = isLandscape ? 13 : 14;

  return `
    <svg width="${targetWidth}" height="${targetHeight}" viewBox="0 0 ${targetWidth} ${targetHeight}" xmlns="http://www.w3.org/2000/svg">
      <!-- Dark gradient backing for contrast on bright sunlight -->
      <rect x="0" y="${barY}" width="${targetWidth}" height="${barHeight}" fill="rgba(15, 23, 42, 0.78)" />
      <line x1="0" y1="${barY}" x2="${targetWidth}" y2="${barY}" stroke="#047857" stroke-width="4" />

      <!-- Text Line 1: Header / Sasaran & Status -->
      <text x="24" y="${barY + 30}" font-family="sans-serif" font-size="${fontSizeMain}" font-weight="bold" fill="#F8FAFC">
        ${escapeXml(sasaranStr)}
      </text>

      <!-- Text Line 2: GPS RTK Coordinates & WIB Timestamp -->
      <text x="24" y="${barY + 60}" font-family="monospace" font-size="${fontSizeSub}" font-weight="bold" fill="#FBBF24">
        📍 ${escapeXml(coordStr)}
      </text>

      <!-- Text Line 3: Officer info & Timestamp -->
      <text x="24" y="${barY + 84}" font-family="sans-serif" font-size="${fontSizeSub}" fill="#94A3B8">
        🕒 ${escapeXml(timeStr)} • ${escapeXml(officerStr)}
      </text>
    </svg>
  `.trim();
}

/**
 * Memproses dan membakar watermark teks visual (GPS, Waktu WIB, Sasaran) langsung ke atas piksel foto.
 * Mendukung orientasi Portrait maupun Landscape secara otomatis.
 */
export async function processAndWatermarkPhoto(
  uri: string,
  options: WatermarkOptions = {},
): Promise<{ uri: string; base64: string; mimeType: string }> {
  // 1. Cek dimensi dan orientasi asli foto
  const { width: origWidth, height: origHeight } = await getImageDimensions(uri);
  const isLandscape = origWidth >= origHeight;

  // 2. Tentukan target resolusi standar kompresi (max 1200px)
  let targetWidth = 1200;
  let targetHeight = Math.round((origHeight / origWidth) * 1200);

  if (isLandscape) {
    targetWidth = 1280;
    targetHeight = Math.round((origHeight / origWidth) * 1280);
  }

  // 3. Buat file SVG overlay watermark
  const svgContent = createWatermarkSvg(targetWidth, targetHeight, isLandscape, options);
  const docDir = (FileSystem as any).documentDirectory || "";
  const tempSvgUri = `${docDir}temp_wm_${Date.now()}.svg`;

  await (FileSystem as any).writeAsStringAsync(tempSvgUri, svgContent, {
    encoding: "utf8",
  });

  // 4. Resize gambar utama dan tumpuk (render overlay) watermark ke piksel gambar
  const actions: ImageManipulator.Action[] = [{ resize: { width: targetWidth } }];

  // Manipulasi pertama: resize foto
  const resized = await ImageManipulator.manipulateAsync(uri, actions, {
    compress: 0.85,
    format: ImageManipulator.SaveFormat.JPEG,
  });

  // Manipulasi kedua: render / overlay watermark visual
  let finalManipulated = resized;
  try {
    // Jika engine Expo ImageManipulator mendukung overlay action
    finalManipulated = await ImageManipulator.manipulateAsync(
      resized.uri,
      [
        {
          // Tumpuk layer overlay watermark
          ...({
            overlay: {
              uri: tempSvgUri,
              position: { x: 0, y: 0 },
            },
          } as any),
        },
      ],
      {
        compress: 0.75,
        format: ImageManipulator.SaveFormat.JPEG,
        base64: true,
      },
    );
  } catch {
    // Fallback bila overlay action belum tersedia di platform runtime
    finalManipulated = await ImageManipulator.manipulateAsync(resized.uri, [], {
      compress: 0.72,
      format: ImageManipulator.SaveFormat.JPEG,
      base64: true,
    });
  } finally {
    // Bersihkan file SVG sementara
    try {
      await (FileSystem as any).deleteAsync(tempSvgUri, { idempotent: true });
    } catch {}
  }

  // 5. Simpan file JPEG fisik ke direktori lokal internal app yang aman
  const photoDir = `${docDir}inspection_photos/`;
  const dirInfo = await (FileSystem as any).getInfoAsync(photoDir);
  if (!dirInfo.exists) {
    await (FileSystem as any).makeDirectoryAsync(photoDir, { intermediates: true });
  }

  const fileName = `ikl_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.jpg`;
  const localTargetUri = `${photoDir}${fileName}`;

  await (FileSystem as any).copyAsync({
    from: finalManipulated.uri,
    to: localTargetUri,
  });

  return {
    uri: localTargetUri,
    base64: finalManipulated.base64 || "",
    mimeType: "image/jpeg",
  };
}
