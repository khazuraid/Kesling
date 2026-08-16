import { useEffect } from "react";
import { Text, View } from "react-native";
import Animated, { Easing, useAnimatedProps, useSharedValue, withSpring, withTiming } from "react-native-reanimated";
import Svg, { Circle } from "react-native-svg";
import { useCountUp } from "./primitives";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export function ProgressRing({
  size = 120,
  strokeWidth = 10,
  progress = 0,
  label,
  sublabel,
  color = "#00A876",
}: {
  size?: number;
  strokeWidth?: number;
  progress?: number;
  label?: string;
  sublabel?: string;
  color?: string;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const sv = useSharedValue(circumference);
  const pct = Math.max(0, Math.min(100, progress));
  const count = useCountUp(pct);

  useEffect(() => {
    sv.value = withSpring(circumference - (pct / 100) * circumference, {
      damping: 18,
      stiffness: 80,
    });
  }, [pct, circumference]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: sv.value,
  }));

  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      <Svg width={size} height={size}>
        {/* Track */}
        <Circle cx={size / 2} cy={size / 2} r={radius} stroke="#ECE7E1" strokeWidth={strokeWidth} fill="none" />
        {/* Progress */}
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          animatedProps={animatedProps}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <View style={{ position: "absolute", alignItems: "center" }}>
        {label ? <Text style={{ fontSize: 28, fontWeight: "800", color: "#1F1D1B" }}>{count}%</Text> : null}
        {sublabel ? <Text style={{ fontSize: 13, color: "#8A8580", marginTop: 2 }}>{sublabel}</Text> : null}
      </View>
    </View>
  );
}
