import { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, { Easing, useAnimatedProps, useSharedValue, withDelay, withTiming } from "react-native-reanimated";
import Svg, { Circle, Path } from "react-native-svg";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const AnimatedPath = Animated.createAnimatedComponent(Path);

export function SuccessCheck({ visible, onComplete }: { visible: boolean; onComplete?: () => void }) {
  const circleSv = useSharedValue(0);
  const checkSv = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      circleSv.value = 0;
      checkSv.value = 0;
      circleSv.value = withTiming(1, { duration: 400, easing: Easing.out(Easing.cubic) });
      checkSv.value = withDelay(300, withTiming(1, { duration: 300, easing: Easing.out(Easing.cubic) }));
      const t = setTimeout(() => onComplete?.(), 900);
      return () => clearTimeout(t);
    }
  }, [visible]);

  const size = 120;
  const r = 54;
  const circumference = 2 * Math.PI * r;

  const circleProps = useAnimatedProps(() => ({
    strokeDashoffset: (1 - circleSv.value) * circumference,
  }));
  const checkProps = useAnimatedProps(() => ({
    strokeDashoffset: (1 - checkSv.value) * 60,
  }));

  if (!visible) return null;

  return (
    <View style={styles.overlay}>
      <View style={styles.card}>
        <View style={{ width: size, height: size }}>
          <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
            <Circle
              cx={size / 2}
              cy={size / 2}
              r={r}
              stroke="#22C55E"
              strokeWidth={6}
              fill="none"
              strokeDasharray={circumference}
              strokeLinecap="round"
              transform={`rotate(-90 ${size / 2} ${size / 2})`}
            />
          </Svg>
          <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
            <AnimatedPath
              d="M 38 60 L 54 76 L 82 46"
              stroke="#22C55E"
              strokeWidth={6}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray={60}
              animatedProps={checkProps}
            />
          </Svg>
        </View>
        <Text style={styles.text}>Inspeksi Selesai</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(0,0,0,0.4)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 999,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 32,
    alignItems: "center",
    gap: 16,
  },
  text: {
    fontSize: 17,
    fontWeight: "700",
    color: "#1F1D1B",
  },
});
