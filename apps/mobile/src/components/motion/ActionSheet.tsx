import { X } from "@tamagui/lucide-icons-2";
import { type ReactNode, useEffect } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, { Easing, useAnimatedStyle, useSharedValue, withSpring, withTiming } from "react-native-reanimated";

const AnimatedView = Animated.View;

export type SheetItem = {
  icon?: ReactNode;
  label: string;
  onPress: () => void;
};

export function ActionSheet({
  open,
  onClose,
  items,
  title,
}: {
  open: boolean;
  onClose: () => void;
  items: SheetItem[];
  title?: string;
}) {
  const translateY = useSharedValue(400);
  const backdropOpacity = useSharedValue(0);

  useEffect(() => {
    if (open) {
      translateY.value = withSpring(0, { damping: 18, stiffness: 200 });
      backdropOpacity.value = withTiming(0.4, { duration: 200 });
    } else {
      translateY.value = withTiming(400, { duration: 200, easing: Easing.in(Easing.cubic) });
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

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      {/* Backdrop */}
      <Animated.View style={[styles.backdrop, backdropStyle]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      </Animated.View>

      {/* Sheet */}
      <AnimatedView style={[styles.sheet, sheetStyle]}>
        {/* Grabber */}
        <View style={styles.grabber} />

        {title ? <Text style={styles.title}>{title}</Text> : null}

        {items.map((item, i) => (
          <Pressable
            key={i}
            style={({ pressed }) => [styles.item, pressed && { backgroundColor: "#F7F5F2" }]}
            onPress={() => {
              item.onPress();
              onClose();
            }}
          >
            {item.icon ? <View style={styles.itemIcon}>{item.icon}</View> : null}
            <Text style={styles.itemLabel}>{item.label}</Text>
          </Pressable>
        ))}

        <View style={{ height: 8 }} />
      </AnimatedView>
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
  title: {
    fontSize: 15,
    fontWeight: "700",
    color: "#8A8580",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 8,
    textAlign: "center",
  },
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
  itemLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F1D1B",
  },
});
