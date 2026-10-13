import { X } from "@tamagui/lucide-icons-2";
import { type ReactNode, useEffect } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, { Easing, useAnimatedStyle, useSharedValue, withSpring, withTiming } from "react-native-reanimated";
import { C } from "../../lib/tokens";

export type SheetItem = {
  icon?: ReactNode;
  label: string;
  sublabel?: string;
  onPress: () => void;
};

export function ActionSheet({
  open,
  onClose,
  items,
  title,
  variant = "list",
}: {
  open: boolean;
  onClose: () => void;
  items: SheetItem[];
  title?: string;
  variant?: "grid" | "list";
}) {
  const translateY = useSharedValue(400);
  const backdropOpacity = useSharedValue(0);

  useEffect(() => {
    if (open) {
      translateY.value = withSpring(0, { damping: 20, stiffness: 240 });
      backdropOpacity.value = withTiming(0.5, { duration: 220 });
    } else {
      translateY.value = withTiming(400, { duration: 200, easing: Easing.in(Easing.cubic) });
      backdropOpacity.value = withTiming(0, { duration: 200 });
    }
  }, [open]);

  const sheetStyle = useAnimatedStyle(() => ({ transform: [{ translateY: translateY.value }] }));
  const backdropStyle = useAnimatedStyle(() => ({ opacity: backdropOpacity.value }));

  if (!open) return null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <Animated.View style={[s.backdrop, backdropStyle]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      </Animated.View>

      <Animated.View style={[s.sheet, sheetStyle]}>
        <View style={s.grabber} />

        {title ? (
          <View style={s.titleRow}>
            <View style={s.titleDot} />
            <Text style={s.title}>{title}</Text>
            <Pressable onPress={onClose} hitSlop={10} style={s.closeBtn}>
              <X size={18} color={C.muted} />
            </Pressable>
          </View>
        ) : null}

        <View style={variant === "grid" ? s.grid : s.list}>
          {items.map((item, i) => (
            <Pressable
              key={i}
              onPress={() => {
                onClose();
                setTimeout(item.onPress, 200);
              }}
              style={({ pressed }) => [
                variant === "grid" ? s.gridItem : s.listItem,
                pressed && { opacity: 0.7, transform: [{ scale: 0.97 }] },
              ]}
            >
              {item.icon ? <View style={s.itemIcon}>{item.icon}</View> : null}
              <View style={{ flex: 1 }}>
                <Text style={s.itemLabel}>{item.label}</Text>
                {item.sublabel ? <Text style={s.itemSub}>{item.sublabel}</Text> : null}
              </View>
            </Pressable>
          ))}
        </View>

        <View style={{ height: 40 }} />
      </Animated.View>
    </View>
  );
}

const s = StyleSheet.create({
  backdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#000",
  },
  sheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: C.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 12,
  },
  grabber: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: C.hairline,
    alignSelf: "center",
    marginBottom: 16,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  titleDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: C.accent },
  title: { flex: 1, fontSize: 18, fontWeight: "800", color: C.ink, letterSpacing: -0.3 },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: C.bg,
    alignItems: "center",
    justifyContent: "center",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 16,
    gap: 10,
  },
  gridItem: {
    width: "48%",
    backgroundColor: C.bg,
    borderRadius: 14,
    padding: 14,
  },
  list: { paddingHorizontal: 20, gap: 8 },
  listItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: C.bg,
    borderRadius: 14,
    padding: 14,
  },
  itemIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: C.accentSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  itemLabel: { fontSize: 15, fontWeight: "700", color: C.ink },
  itemSub: { fontSize: 12, color: C.muted, marginTop: 2 },
});
