import * as Location from "expo-location";

export interface AccurateCoordinates {
  lat: number;
  lng: number;
  accuracy: number | null;
  altitude: number | null;
}

export async function requestLocationPermission(): Promise<boolean> {
  const { status } = await Location.requestForegroundPermissionsAsync();
  return status === "granted";
}

/**
 * Membaca posisi GPS terkini dengan mode balanced untuk penghematan baterai
 */
export async function getBalancedLocation(): Promise<AccurateCoordinates | null> {
  try {
    const hasPerm = await requestLocationPermission();
    if (!hasPerm) return null;

    const loc = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });

    return {
      lat: Number(loc.coords.latitude.toFixed(6)),
      lng: Number(loc.coords.longitude.toFixed(6)),
      accuracy: loc.coords.accuracy ? Math.round(loc.coords.accuracy) : null,
      altitude: loc.coords.altitude ? Math.round(loc.coords.altitude) : null,
    };
  } catch (err) {
    console.warn("Gagal membaca GPS balanced:", err);
    return null;
  }
}

/**
 * Membaca posisi GPS presisi tinggi (Highest Accuracy) khusus saat tag koordinat IKL
 */
export async function getHighAccuracyLocation(): Promise<AccurateCoordinates | null> {
  try {
    const hasPerm = await requestLocationPermission();
    if (!hasPerm) return null;

    const loc = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Highest,
    });

    return {
      lat: Number(loc.coords.latitude.toFixed(6)),
      lng: Number(loc.coords.longitude.toFixed(6)),
      accuracy: loc.coords.accuracy ? Math.round(loc.coords.accuracy) : null,
      altitude: loc.coords.altitude ? Math.round(loc.coords.altitude) : null,
    };
  } catch (err) {
    console.warn("Gagal membaca GPS presisi tinggi:", err);
    return null;
  }
}
