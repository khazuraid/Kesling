import { useEffect } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";

type Route = { key: string; name: string };
type TabBarProps = {
  state: { routes: Route[]; index: number };
  descriptors: any;
  navigation: any;
  onFabPress?: () => void;
  fabOpen?: boolean;
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
  const Icon = options.tabBarIcon as any;

  const scale = useSharedValue(1);
  const scaleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const onPress = () => {
    const event = navigation.emit({
      type: "tabPress",
      target: route.key,
      canPreventDefault: true,
    });
    if (!isFocused && !event.defaultPrevented) {
      navigation.navigate(route.name);
    }
  };

  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => (scale.value = withSpring(1.1, { damping: 14 }))}
      onPressOut={() => (scale.value = withSpring(1, { damping: 14 }))}
      style={styles.tabSlot}
    >
      <Animated.View style={[styles.tabInner, scaleStyle, isFocused && styles.tabInnerActive]}>
        {Icon ? <Icon color={isFocused ? "#00A876" : "#8A8580"} size={22} focused={isFocused} /> : null}
        <Text style={[styles.tabLabel, isFocused && styles.tabLabelActive]}>{label}</Text>
      </Animated.View>
    </Pressable>
  );
}

export function TabBar({ state, descriptors, navigation, onFabPress, fabOpen }: TabBarProps) {
  const routes = state.routes;
  const left = routes.slice(0, 2);
  const right = routes.slice(2);

  const fabRotate = useSharedValue(0);
  useEffect(() => {
    fabRotate.value = withSpring(fabOpen ? 225 : 0, { damping: 14, stiffness: 200 });
  }, [fabOpen]);
  const fabStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${fabRotate.value}deg` }],
  }));

  return (
    <View pointerEvents="box-none" style={styles.container}>
      <View style={styles.bar}>
        {left.map((route, i) => (
          <TabItem
            key={route.key}
            route={route}
            isFocused={state.index === i}
            descriptors={descriptors}
            navigation={navigation}
          />
        ))}
        <Pressable onPress={onFabPress} style={styles.fabHit} hitSlop={8}>
          <Animated.View style={[styles.fab, fabStyle]}>
            <Text style={styles.fabIcon}>+</Text>
          </Animated.View>
        </Pressable>
        {right.map((route, i) => (
          <TabItem
            key={route.key}
            route={route}
            isFocused={state.index === i + 2}
            descriptors={descriptors}
            navigation={navigation}
          />
        ))}
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
    height: 92,
  },
  bar: {
    position: "absolute",
    bottom: 16,
    left: 16,
    right: 16,
    height: 62,
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.94)",
    borderWidth: 1,
    borderColor: "#ECE7E1",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 24,
    elevation: 12,
    paddingHorizontal: 6,
  },
  tabSlot: {
    flex: 1,
    height: 62,
    alignItems: "center",
    justifyContent: "center",
  },
  tabInner: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
  },
  tabInnerActive: {
    backgroundColor: "#E6F6F0",
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#8A8580",
    marginTop: 2,
  },
  tabLabelActive: {
    color: "#00A876",
    fontWeight: "700",
  },
  fabHit: {
    width: 64,
    height: 64,
    alignItems: "center",
    justifyContent: "center",
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#00A876",
    alignItems: "center",
    justifyContent: "center",
    marginTop: -28,
    shadowColor: "#00A876",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  fabIcon: {
    fontSize: 30,
    fontWeight: "600",
    color: "#FFFFFF",
    lineHeight: 34,
    marginTop: -2,
  },
});
