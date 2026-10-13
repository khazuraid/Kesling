import { Check, CloudUpload } from "@tamagui/lucide-icons-2";
import * as Haptics from "expo-haptics";
import { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedProps,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import Svg, { Circle } from "react-native-svg";
import { C } from "../../lib/tokens";
import { ScalePress } from "./primitives";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const R = 9;
const CIRC = 2 * Math.PI * R;

export type SyncState = "idle" | "syncing" | "done";

function useSpinning(active: boolean) {
  const reduce = useReducedMotion();
  const spin = useSharedValue(0);
  useEffect(() => {
    if (active && !reduce) {
      spin.value = 0;
      spin.value = withRepeat(withTiming(360, { duration: 900, easing: Easing.inOut(Easing.ease) }), -1, false);
    } else {
      spin.value = withTiming(0, { duration: 120 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, reduce]);
  return useAnimatedStyle(() => ({ transform: [{ rotate: `${spin.value}deg` }] }));
}

function usePop(state: SyncState) {
  const reduce = useReducedMotion();
  const pop = useSharedValue(1);
  useEffect(() => {
    if (state === "done") {
      if (reduce) {
        pop.value = 1;
      } else {
        pop.value = withSequence(
          withTiming(0.85, { duration: 90, easing: Easing.out(Easing.cubic) }),
          withTiming(1.06, { duration: 140, easing: Easing.out(Easing.cubic) }),
          withTiming(1, { duration: 120, easing: Easing.out(Easing.cubic) }),
        );
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    } else {
      pop.value = 1;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, reduce]);
  return useAnimatedStyle(() => ({ transform: [{ scale: pop.value }] }));
}

/**
 * Tombol sinkron dengan animasi penuh:
 * idle → ikon upload + label
 * syncing → ikon berputar + ring progres sweep (repeating)
 * done → morph hijau, check pop (spring-ish), haptic success
 */
export function SyncButton({
  state,
  label,
  syncingLabel = "Menyinkron...",
  doneLabel = "Tersinkron",
  onPress,
  color = C.accent,
  icon,
}: {
  state: SyncState;
  label: string;
  syncingLabel?: string;
  doneLabel?: string;
  onPress?: () => void;
  color?: string;
  icon?: React.ReactNode;
}) {
  const syncing = state === "syncing";
  const done = state === "done";
  const spinStyle = useSpinning(syncing);
  const popStyle = usePop(state);
  const sweep = useSharedValue(0);

  useEffect(() => {
    if (syncing) {
      sweep.value = 0;
      sweep.value = withRepeat(withTiming(1, { duration: 1100, easing: Easing.inOut(Easing.quad) }), -1, false);
    } else {
      sweep.value = withTiming(0, { duration: 150 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [syncing]);

  const ringProps = useAnimatedProps(() => ({
    strokeDashoffset: CIRC * (1 - sweep.value * 0.75),
  }));

  return (
    <ScalePress onPress={syncing || done ? undefined : onPress}>
      <Animated.View style={[s.btn, { backgroundColor: done ? C.ok : color }, syncing && { opacity: 0.9 }, popStyle]}>
        {syncing ? (
          <View style={s.iconBox}>
            <Svg width={26} height={26} viewBox="0 0 26 26">
              <AnimatedCircle
                cx={13}
                cy={13}
                r={R}
                stroke="rgba(255,255,255,0.95)"
                strokeWidth={2.4}
                fill="none"
                strokeDasharray={CIRC}
                animatedProps={ringProps}
                strokeLinecap="round"
                rotation={-90}
                origin="13,13"
              />
            </Svg>
            <Animated.View style={[StyleSheet.absoluteFill, s.center, spinStyle]}>
              <CloudUpload size={12} color="#fff" strokeWidth={2.4} />
            </Animated.View>
          </View>
        ) : done ? (
          <Check size={17} color="#fff" strokeWidth={2.8} />
        ) : (
          (icon ?? <CloudUpload size={16} color="#fff" strokeWidth={2.2} />)
        )}
        <Text style={s.text}>{syncing ? syncingLabel : done ? doneLabel : label}</Text>
      </Animated.View>
    </ScalePress>
  );
}

/** Varian simpan — ikon awal Check, label default Menyimpan/Tersimpan. */
export function SaveButton(props: Omit<Parameters<typeof SyncButton>[0], "icon">) {
  return <SyncButton {...props} icon={<Check size={16} color="#fff" strokeWidth={2.4} />} />;
}

const s = StyleSheet.create({
  btn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 14,
    paddingVertical: 13,
    shadowColor: C.accent,
    shadowOpacity: 0.35,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  text: { fontSize: 14, fontWeight: "700", color: "#fff" },
  iconBox: { width: 26, height: 26, alignItems: "center", justifyContent: "center" },
  center: { alignItems: "center", justifyContent: "center" },
});
