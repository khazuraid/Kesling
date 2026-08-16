import { Bell, ClipboardList, Database, FileText, LogOut } from "@tamagui/lucide-icons-2";
import { useRouter } from "expo-router";
import { useEffect } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, { Easing, useAnimatedStyle, useSharedValue, withSpring, withTiming } from "react-native-reanimated";
import { useAuth } from "../../src/lib/auth";

export function ProfileSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const translateY = useSharedValue(500);
  const backdropOpacity = useSharedValue(0);

  useEffect(() => {
    if (open) {
      translateY.value = withSpring(0, { damping: 18, stiffness: 200 });
      backdropOpacity.value = withTiming(0.4, { duration: 200 });
    } else {
      translateY.value = withTiming(500, { duration: 200, easing: Easing.in(Easing.cubic) });
      backdropOpacity.value = withTiming(0, { duration: 200 });
    }
  }, [open]);

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));
  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  if (!open) return null;

  const items = [
    { icon: <Database size={18} color="#00A876" />, label: "Data Sasaran", onPress: () => router.push("/sasaran") },
    {
      icon: <ClipboardList size={18} color="#00A876" />,
      label: "Draft Inspeksi",
      onPress: () => router.push("/drafts"),
    },
    { icon: <Bell size={18} color="#00A876" />, label: "Notifikasi", onPress: () => router.push("/notifications") },
  ];

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <Animated.View style={[styles.backdrop, backdropStyle]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      </Animated.View>

      <Animated.View style={[styles.sheet, sheetStyle]}>
        <View style={styles.grabber} />

        {/* User header */}
        <View style={styles.userHeader}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{(user?.name || "P")[0].toUpperCase()}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.userName}>{user?.name}</Text>
            <Text style={styles.userMeta}>
              {user?.role} · {user?.puskesmasNama || "—"}
            </Text>
          </View>
        </View>

        {items.map((item) => (
          <Pressable
            key={item.label}
            style={({ pressed }) => [styles.item, pressed && { backgroundColor: "#F7F5F2" }]}
            onPress={() => {
              item.onPress();
              onClose();
            }}
          >
            <View style={styles.itemIcon}>{item.icon}</View>
            <Text style={styles.itemLabel}>{item.label}</Text>
          </Pressable>
        ))}

        <Pressable
          style={({ pressed }) => [styles.item, pressed && { backgroundColor: "#FEECEB" }]}
          onPress={() => {
            signOut();
            onClose();
          }}
        >
          <View style={[styles.itemIcon, { backgroundColor: "#FEECEB" }]}>
            <LogOut size={18} color="#EF4444" />
          </View>
          <Text style={[styles.itemLabel, { color: "#EF4444" }]}>Logout</Text>
        </Pressable>

        <View style={{ height: 12 }} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "#000",
  },
  sheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingBottom: 34,
    paddingHorizontal: 20,
    paddingTop: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
  },
  grabber: {
    width: 40,
    height: 5,
    borderRadius: 3,
    backgroundColor: "#ECE7E1",
    alignSelf: "center",
    marginBottom: 16,
  },
  userHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 12,
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#ECE7E1",
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#00A876",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontSize: 22, fontWeight: "800", color: "#FFFFFF" },
  userName: { fontSize: 17, fontWeight: "700", color: "#1F1D1B" },
  userMeta: { fontSize: 12, color: "#8A8580", marginTop: 2 },
  item: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderRadius: 14,
    gap: 14,
  },
  itemIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#E6F6F0",
    alignItems: "center",
    justifyContent: "center",
  },
  itemLabel: { fontSize: 16, fontWeight: "600", color: "#1F1D1B" },
});
