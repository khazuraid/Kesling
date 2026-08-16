import AsyncStorage from "@react-native-async-storage/async-storage";
import { BarChart3, CalendarCheck, ClipboardCheck } from "@tamagui/lucide-icons-2";
import { useRouter } from "expo-router";
import { useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, {
  runOnJS,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { useAuth } from "../src/lib/auth";

export const ONBOARDING_KEY = "kesling_onboarding_done";

const SLIDES = [
  {
    icon: ClipboardCheck,
    color: "#00A876",
    soft: "#E6F6F0",
    title: "Inspeksi Lapangan",
    desc: "Isi pemeriksaan langsung dari lokasi — foto, tanda tangan, dan skor otomatis tersimpan.",
  },
  {
    icon: CalendarCheck,
    color: "#5B8DEF",
    soft: "#EAF1FE",
    title: "Jadwal Otomatis",
    desc: "Jadwal pemeriksaan dibuat otomatis per bulan, melewati hari libur nasional dan Minggu.",
  },
  {
    icon: BarChart3,
    color: "#F59E0B",
    soft: "#FEF4E2",
    title: "Laporan & Rekap",
    desc: "Rekap bulanan dan tahunan per kategori siap diekspor kapan saja.",
  },
];

const WIDTH = 360; // approx slide width; scroll handler uses contentOffset anyway

export default function Onboarding() {
  const router = useRouter();
  const x = useSharedValue(0);
  const [index, setIndex] = useState(0);
  const scrollRef = useRef<Animated.ScrollView>(null);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (e) => {
      x.value = e.contentOffset.x;
      runOnJS(setIndex)(Math.round(e.contentOffset.x / e.layoutMeasurement.width));
    },
  });

  const next = () => {
    const target = index + 1;
    scrollRef.current?.scrollTo({ x: target * WIDTH, animated: true });
  };

  const finish = async () => {
    await AsyncStorage.setItem(ONBOARDING_KEY, "1");
    router.replace("/(tabs)");
  };

  return (
    <View style={styles.root}>
      <Animated.ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        contentContainerStyle={{ width: `${SLIDES.length * 100}%` }}
      >
        {SLIDES.map((s) => (
          <View key={s.title} style={styles.slide}>
            <View style={[styles.iconWrap, { backgroundColor: s.soft }]}>
              <s.icon size={56} color={s.color} />
            </View>
            <Text style={styles.title}>{s.title}</Text>
            <Text style={styles.desc}>{s.desc}</Text>
          </View>
        ))}
      </Animated.ScrollView>

      {/* Dots */}
      <View style={styles.dots}>
        {SLIDES.map((_, i) => (
          <Dot key={i} active={i === index} x={x} index={i} />
        ))}
      </View>

      <View style={styles.btnRow}>
        <Pressable onPress={finish} hitSlop={8}>
          <Text style={styles.skip}>Lewati</Text>
        </Pressable>
        <Pressable
          onPress={index === SLIDES.length - 1 ? finish : next}
          style={({ pressed }) => [styles.cta, pressed && { transform: [{ scale: 0.97 }] }]}
        >
          <Text style={styles.ctaText}>{index === SLIDES.length - 1 ? "Mulai" : "Lanjut"}</Text>
        </Pressable>
      </View>
    </View>
  );
}

function Dot({ active, x, index }: { active: boolean; x: any; index: number }) {
  const style = useAnimatedStyle(() => {
    // width interpolates as slide i becomes active
    const pos = x.value / WIDTH;
    const d = Math.abs(pos - index);
    return {
      width: withSpring(d < 0.5 ? 24 : 8, { damping: 15 }),
      opacity: d < 0.5 ? 1 : 0.4,
    };
  });
  return <Animated.View style={[styles.dot, style, active && { backgroundColor: "#00A876" }]} />;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F7F5F2" },
  slide: {
    flex: 1,
    width: WIDTH,
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
    gap: 16,
  },
  iconWrap: {
    width: 120,
    height: 120,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  title: { fontSize: 26, fontWeight: "800", color: "#1F1D1B", textAlign: "center" },
  desc: { fontSize: 15, color: "#8A8580", textAlign: "center", lineHeight: 22 },
  dots: { flexDirection: "row", gap: 6, justifyContent: "center", marginBottom: 24 },
  dot: { height: 8, borderRadius: 4, backgroundColor: "#C9C2BA", width: 8 },
  btnRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  skip: { color: "#8A8580", fontSize: 15, fontWeight: "600" },
  cta: {
    backgroundColor: "#00A876",
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 36,
    shadowColor: "#00A876",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  ctaText: { color: "#FFFFFF", fontSize: 16, fontWeight: "700" },
});
