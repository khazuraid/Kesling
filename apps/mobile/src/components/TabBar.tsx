import { BarChart3, ClipboardList, Home, Plus } from "@tamagui/lucide-icons-2";
import { LinearGradient } from "expo-linear-gradient";
import { useEffect } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from "react-native-reanimated";
import { C } from "../lib/tokens";

type Route = { key: string; name: string };
type TabBarProps = {
  state: { routes: Route[]; index: number };
  descriptors: any;
  navigation: any;
  onFabPress?: () => void;
  fabOpen?: boolean;
};

const ICONS: Record<string, any> = {
  index: Home,
  pemeriksaan: ClipboardList,
  rekap: BarChart3,
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
  const label = options.title ?? route.name;
  const Icon = ICONS[route.name] ?? (options.tabBarIcon as any);

  const scale = useSharedValue(1);
  const pillOpacity = useSharedValue(isFocused ? 1 : 0);

  useEffect(() => {
    pillOpacity.value = withTiming(isFocused ? 1 : 0, { duration: 220 });
  }, [isFocused]);

  const pillStyle = useAnimatedStyle(() => ({ opacity: pillOpacity.value }));
  const scaleStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const onPress = () => {
    const event = navigation.emit({
      type: "tabPress",
      target: route.key,
      canPreventDefault: true,
    });
    if (!isFocused && !event.defaultPrevented) navigation.navigate(route.name);
  };

  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => (scale.value = withSpring(0.9, { damping: 12 }))}
      onPressOut={() => (scale.value = withSpring(1, { damping: 12 }))}
      style={styles.tabSlot}
    >
      <Animated.View style={[styles.tabInner, scaleStyle]}>
        <View style={styles.iconWrap}>
          <Animated.View style={[styles.pill, pillStyle]} pointerEvents="none" />
          {Icon ? <Icon color={isFocused ? C.accent : C.ink2} size={21} strokeWidth={isFocused ? 2.3 : 1.8} /> : null}
        </View>
        <Text
          style={[styles.tabLabel, { color: isFocused ? C.accent : C.ink2, fontWeight: isFocused ? "700" : "500" }]}
        >
          {label}
        </Text>
      </Animated.View>
    </Pressable>
  );
}

export function TabBar({ state, descriptors, navigation, onFabPress, fabOpen }: TabBarProps) {
  const routes = state.routes;
  const fabScale = useSharedValue(1);
  const fabRotate = useSharedValue(0);

  useEffect(() => {
    fabRotate.value = withSpring(fabOpen ? 45 : 0, { damping: 15, stiffness: 260 });
    fabScale.value = withSpring(fabOpen ? 0.92 : 1, { damping: 14 });
  }, [fabOpen]);

  const fabStyle = useAnimatedStyle(() => ({
    transform: [{ scale: fabScale.value }, { rotate: `${fabRotate.value}deg` }],
  }));

  return (
    <View style={styles.container} pointerEvents="box-none">
      <View style={styles.bar}>
        {/* Tab pertama (Beranda) */}
        {routes[0] && (
          <TabItem
            key={routes[0].key}
            route={routes[0]}
            isFocused={state.index === 0}
            descriptors={descriptors}
            navigation={navigation}
          />
        )}

        {/* Tab kedua jika ada 3 routes (Draft) */}
        {routes.length > 2 && routes[1] && (
          <TabItem
            key={routes[1].key}
            route={routes[1]}
            isFocused={state.index === 1}
            descriptors={descriptors}
            navigation={navigation}
          />
        )}

        {/* FAB slot TENGAH (V40) */}
        <Pressable
          onPress={onFabPress}
          onPressIn={() => {
            fabScale.value = withSpring(0.88, { damping: 14 });
          }}
          onPressOut={() => {
            fabScale.value = withSpring(fabOpen ? 0.92 : 1, { damping: 14 });
          }}
          style={styles.tabSlot}
        >
          <View style={styles.fabCol}>
            <Animated.View style={fabStyle}>
              <LinearGradient
                colors={["#5B8DEF", "#7C3AED"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.fabBtn}
              >
                <Plus size={22} color="#FFFFFF" strokeWidth={2.6} />
              </LinearGradient>
            </Animated.View>
            <Text style={styles.fabLabel}>Periksa</Text>
          </View>
        </Pressable>

        {/* Tab Rekap (route terakhir) */}
        {routes.length > 1 && (
          <TabItem
            key={routes[routes.length - 1].key}
            route={routes[routes.length - 1]}
            isFocused={state.index === routes.length - 1}
            descriptors={descriptors}
            navigation={navigation}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 30,
  },
  bar: {
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.06)",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 6,
    paddingBottom: 10,
  },
  tabSlot: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  tabInner: {
    alignItems: "center",
    gap: 5,
    paddingVertical: 10,
  },
  iconWrap: {
    width: 44,
    height: 30,
    alignItems: "center",
    justifyContent: "center",
  },
  pill: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 999,
    backgroundColor: "rgba(37,99,235,0.08)",
  },
  tabLabel: {
    fontSize: 10,
    letterSpacing: 0.3,
  },
  fabCol: {
    alignItems: "center",
    gap: 5,
    paddingVertical: 6,
  },
  fabBtn: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#7C3AED",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 18,
    elevation: 8,
  },
  fabLabel: {
    fontSize: 10,
    fontWeight: "500",
    color: C.ink2,
    letterSpacing: 0.3,
  },
});
