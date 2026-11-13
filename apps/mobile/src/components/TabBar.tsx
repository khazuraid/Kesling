import * as Haptics from "expo-haptics";
import { ClipboardList, Home, MapPin, Plus, User } from "lucide-react-native";
import { useEffect } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type Route = { key: string; name: string };
type TabBarProps = {
  state: { routes: Route[]; index: number };
  descriptors: any;
  navigation: any;
  onFabPress?: () => void;
};

const TAB_CONFIG: Record<string, { label: string; icon: any }> = {
  index: { label: "Beranda", icon: Home },
  pemeriksaan: { label: "Inspeksi", icon: ClipboardList },
  peta: { label: "Peta", icon: MapPin },
  akun: { label: "Akun", icon: User },
};

function TabItem({
  route,
  isFocused,
  descriptors,
  navigation,
}: {
  route: Route;
  isFocused: boolean;
  descriptors: any;
  navigation: any;
}) {
  const { options } = descriptors[route.key];
  const config = TAB_CONFIG[route.name] || {
    label: options.title || route.name,
    icon: Home,
  };
  const Icon = config.icon;

  const scale = useSharedValue(1);

  const scaleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const onPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const event = navigation.emit({
      type: "tabPress",
      target: route.key,
      canPreventDefault: true,
    });
    if (!isFocused && !event.defaultPrevented) {
      navigation.navigate(route.name);
    }
  };

  const activeColor = "#047857"; // Civic Emerald
  const inactiveColor = "#94A3B8"; // Slate 400

  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected: isFocused }}
      accessibilityLabel={`Tab ${config.label}`}
      onPress={onPress}
      onPressIn={() => (scale.value = withSpring(0.92, { damping: 14 }))}
      onPressOut={() => (scale.value = withSpring(1, { damping: 14 }))}
      style={s.tabItem}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
    >
      <Animated.View style={[s.tabItemInner, scaleStyle]}>
        <View style={[s.iconBox, isFocused && s.iconBoxActive]}>
          <Icon size={20} color={isFocused ? activeColor : inactiveColor} strokeWidth={isFocused ? 2.2 : 1.8} />
        </View>
        <Text style={[s.tabLabel, { color: isFocused ? activeColor : inactiveColor }]}>{config.label}</Text>
      </Animated.View>
    </Pressable>
  );
}

export function TabBar({ state, descriptors, navigation, onFabPress }: TabBarProps) {
  const insets = useSafeAreaInsets();
  const fabScale = useSharedValue(1);

  const fabAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: fabScale.value }],
  }));

  const handleFabPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onFabPress?.();
  };

  return (
    <View style={[s.wrapper, { paddingBottom: Math.max(insets.bottom, 12) }]}>
      <View style={s.container}>
        {state.routes.map((route, i) => {
          const isFocused = state.index === i;
          return (
            <TabItem
              key={route.key}
              route={route}
              isFocused={isFocused}
              descriptors={descriptors}
              navigation={navigation}
            />
          );
        })}
      </View>

      {/* Floating Center Action Button */}
      {onFabPress && (
        <View style={s.fabWrapper} pointerEvents="box-none">
          <Pressable
            onPress={handleFabPress}
            onPressIn={() => (fabScale.value = withSpring(0.88, { damping: 12 }))}
            onPressOut={() => (fabScale.value = withSpring(1, { damping: 12 }))}
            style={s.fabPressable}
          >
            <Animated.View style={[s.fab, fabAnimatedStyle]}>
              <Plus size={24} color="#FFFFFF" strokeWidth={2.6} />
            </Animated.View>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  wrapper: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "transparent",
    alignItems: "center",
  },
  container: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: 28,
    marginHorizontal: 16,
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 8,
    width: "92%",
    maxWidth: 420,
    justifyContent: "space-around",
    alignItems: "center",
  },
  tabItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 48,
  },
  tabItemInner: {
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
  },
  iconBox: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  iconBoxActive: {
    backgroundColor: "#ECFDF5",
  },
  tabLabel: {
    fontSize: 10.5,
    fontWeight: "700",
    letterSpacing: -0.2,
  },
  fabWrapper: {
    position: "absolute",
    top: -24,
    alignSelf: "center",
    zIndex: 10,
  },
  fabPressable: {
    shadowColor: "#047857",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28,
    shadowRadius: 10,
    elevation: 10,
  },
  fab: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#047857",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: "#FFFFFF",
  },
});
