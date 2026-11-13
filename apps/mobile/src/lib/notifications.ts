import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

Notifications.setNotificationHandler({
  handleNotification: async () =>
    ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }) as any,
});

export async function registerForPushNotifications(): Promise<string | null> {
  if (Platform.OS === "web") return null;

  const perm = (await Notifications.getPermissionsAsync()) as any;
  let granted = perm.granted || perm.status === "granted";

  if (!granted) {
    const requested = (await Notifications.requestPermissionsAsync()) as any;
    granted = requested.granted || requested.status === "granted";
  }

  if (!granted) {
    console.warn("Izin notifikasi tidak diberikan.");
    return null;
  }

  try {
    const token = (await Notifications.getExpoPushTokenAsync()).data;
    return token;
  } catch (e) {
    console.warn("Gagal mendapatkan push token Expo:", e);
    return null;
  }
}

/**
 * Pengingat jadwal inspeksi harian lokal
 */
export async function scheduleDailyInspectionReminder(hour = 8, minute = 0): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();

  await Notifications.scheduleNotificationAsync({
    content: {
      title: "Jadwal Inspeksi Hari Ini",
      body: "Ada sasaran IKL yang menunggu verifikasi di wilayah binaan Anda. Ketuk untuk memeriksa.",
      sound: true,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
    },
  });
}
