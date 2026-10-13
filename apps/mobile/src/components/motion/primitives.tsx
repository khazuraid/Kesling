import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { Pressable, View } from "react-native";
import Animated, {
  Easing,
  runOnJS,
  useAnimatedReaction,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSpring,
  withTiming,
} from "react-native-reanimated";

// ─── FadeIn: entrance fade + translateY ───
export function FadeIn({ delay = 0, children }: { delay?: number; children: ReactNode }) {
  const reduce = useReducedMotion();
  const sv = useSharedValue(reduce ? 1 : 0);
  useEffect(() => {
    if (reduce) {
      sv.value = 1;
      return;
    }
    sv.value = withDelay(delay, withTiming(1, { duration: 300, easing: Easing.out(Easing.cubic) }));
  }, [delay, reduce]);
  const style = useAnimatedStyle(() => ({
    opacity: sv.value,
    transform: [{ translateY: reduce ? 0 : (1 - sv.value) * 16 }],
  }));
  return <Animated.View style={style}>{children}</Animated.View>;
}

// ─── Stagger: inject delay per child ───
export function Stagger({
  children,
  step = 40,
  initialDelay = 0,
}: {
  children: ReactNode[];
  step?: number;
  initialDelay?: number;
}) {
  return (
    <>
      {Array.isArray(children)
        ? children.map((child, i) => (
            <FadeIn key={i} delay={initialDelay + i * step}>
              {child}
            </FadeIn>
          ))
        : children}
    </>
  );
}

// ─── ScalePress: button/card press scale ───
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
export function ScalePress({
  onPress,
  children,
  scale = 0.97,
  style,
}: {
  onPress?: () => void;
  children: ReactNode;
  scale?: number;
  style?: any;
}) {
  const sv = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: sv.value }],
  }));
  return (
    <AnimatedPressable
      onPressIn={() => {
        sv.value = withSpring(scale, { damping: 15, stiffness: 300 });
      }}
      onPressOut={() => {
        sv.value = withSpring(1, { damping: 15, stiffness: 300 });
      }}
      onPress={onPress}
      style={[style, animatedStyle]}
    >
      {children}
    </AnimatedPressable>
  );
}

// ─── useCountUp: animate number 0→target ───
export function useCountUp(target: number, duration = 600) {
  const sv = useSharedValue(0);
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    sv.value = 0;
    sv.value = withTiming(target, {
      duration,
      easing: Easing.out(Easing.cubic),
    });
  }, [target, duration]);
  useAnimatedReaction(
    () => sv.value,
    (v) => runOnJS(setDisplay)(Math.round(v)),
  );
  return display;
}

// ─── ListSkeleton: baris kartu shimmer menyerupai list ───
export function ListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <View style={{ gap: 10 }}>
      {Array.from({ length: rows }).map((_, i) => (
        <View
          key={i}
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 12,
            backgroundColor: "#FFFFFF",
            borderRadius: 20,
            padding: 14,
          }}
        >
          <Shimmer width={44} height={44} borderRadius={14} />
          <View style={{ flex: 1, gap: 7 }}>
            <Shimmer width={"72%"} height={14} borderRadius={7} />
            <Shimmer width={"45%"} height={10} borderRadius={5} />
          </View>
          <Shimmer width={30} height={30} borderRadius={15} />
        </View>
      ))}
    </View>
  );
}

// ─── Shimmer: looping skeleton placeholder ───
export function Shimmer({
  width,
  height,
  borderRadius = 8,
  style,
}: {
  width: number | string;
  height: number;
  borderRadius?: number;
  style?: any;
}) {
  const reduce = useReducedMotion();
  const translateX = useSharedValue(-1);
  useEffect(() => {
    if (reduce) return;
    translateX.value = withRepeat(withTiming(1, { duration: 1000, easing: Easing.inOut(Easing.ease) }), -1, false);
  }, [reduce]);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value * (typeof width === "number" ? width : 200) }],
  }));
  return (
    <View
      style={[
        {
          width,
          height,
          borderRadius,
          backgroundColor: "#E4E4E0",
          overflow: "hidden",
        },
        style,
      ]}
    >
      <Animated.View
        style={[
          {
            width: "100%",
            height: "100%",
            backgroundColor: "rgba(255,255,255,0.4)",
          },
          animatedStyle,
        ]}
      />
    </View>
  );
}
