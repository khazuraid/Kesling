import { useEffect, useRef } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, { Easing, useAnimatedProps, useSharedValue, withTiming } from "react-native-reanimated";
import Svg, { Path } from "react-native-svg";
import { useCountUp } from "./primitives";

const AnimatedPath = Animated.createAnimatedComponent(Path);

/**
 * Semicircle gauge: <60 red, 60-80 yellow, >80 green.
 * ponytail: single arc (no gradient); add gradient when design asks.
 */
export function GaugeChart({
  value,
  size = 180,
  strokeWidth = 14,
  label,
}: {
  value: number;
  size?: number;
  strokeWidth?: number;
  label?: string;
}) {
  const pct = Math.max(0, Math.min(100, value));
  const color = pct < 60 ? "#EF4444" : pct < 80 ? "#F59E0B" : "#22C55E";
  const progress = useSharedValue(0);
  const count = useCountUp(pct, 800);

  const r = (size - strokeWidth) / 2;
  // semicircle arc from 180° to 0°
  const cx = size / 2;
  const cy = size / 2;
  const startX = cx - r;
  const endX = cx + r;
  const arcLen = Math.PI * r;

  useEffect(() => {
    progress.value = withTiming(pct / 100, { duration: 800, easing: Easing.out(Easing.cubic) });
  }, [pct]);

  const animatedProps = useAnimatedProps(() => ({
    // dasharray trick: draw fraction of semicircle length
    strokeDasharray: [arcLen * progress.value, arcLen],
  }));

  return (
    <View style={{ width: size, height: size / 2 + 36, alignItems: "center" }}>
      <Svg width={size} height={size / 2 + 8}>
        {/* Track */}
        <Path
          d={`M ${startX} ${cy} A ${r} ${r} 0 0 1 ${endX} ${cy}`}
          stroke="#ECE7E1"
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
        />
        {/* Value */}
        <AnimatedPath
          d={`M ${startX} ${cy} A ${r} ${r} 0 0 1 ${endX} ${cy}`}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          animatedProps={animatedProps}
        />
      </Svg>
      <View style={styles.valueWrap}>
        <Text style={[styles.value, { color }]}>{count}</Text>
        {label ? <Text style={styles.label}>{label}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  valueWrap: { position: "absolute", bottom: 0, alignItems: "center" },
  value: { fontSize: 32, fontWeight: "800" },
  label: { fontSize: 12, color: "#8A8580", marginTop: 2 },
});
