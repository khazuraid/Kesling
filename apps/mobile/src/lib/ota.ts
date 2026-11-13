import * as Updates from "expo-updates";
import { Alert } from "react-native";

export interface UpdateCheckResult {
  isAvailable: boolean;
  isChecking: boolean;
  manifest?: any;
}

/**
 * Cek dan pasang OTA update dari EAS nirkabel
 */
export async function checkAndApplyUpdates(silent = false): Promise<boolean> {
  if (__DEV__) {
    if (!silent) {
      Alert.alert("Mode Development", "OTA Updates (expo-updates) hanya aktif di build release APK / Standalone.");
    }
    return false;
  }

  try {
    const update = await Updates.checkForUpdateAsync();
    if (update.isAvailable) {
      if (!silent) {
        Alert.alert("Pembaruan Tersedia", "Versi baru SILAPOR KESLING ditemukan. Mengunduh dan menerapkan...");
      }
      await Updates.fetchUpdateAsync();
      await Updates.reloadAsync();
      return true;
    } else {
      if (!silent) {
        Alert.alert("Versi Terkini", "Aplikasi sudah menggunakan versi terbaru.");
      }
      return false;
    }
  } catch (err: any) {
    if (!silent) {
      Alert.alert("Info Pembaruan", "Belum dapat memeriksa pembaruan: " + (err?.message || err));
    }
    return false;
  }
}
