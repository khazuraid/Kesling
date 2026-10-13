import { ArrowRight, BarChart3, CalendarCheck, ClipboardCheck, Leaf } from "@tamagui/lucide-icons-2";
import { useRouter } from "expo-router";
import { useRef, useState } from "react";
import { Platform, Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import Animated, {
  interpolate,
  runOnJS,
  type SharedValue,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
} from "react-native-reanimated";
import { setOnboardingDone } from "../src/lib/storage";

const SLIDES = [
  {
    bg: "#0B1E33",
    glow: "#0E3B2E",
    accent: "#00C489",
    accentL: "#7CF5CE",
    tag: "INSPEKSI",
    icon: ClipboardCheck,
    title: "Periksa Lapangan\nLebih Cepat",
    desc: "Formulir digital, foto, dan tanda tangan langsung dari smartphone. Skor kepatuhan terisi otomatis.",
  },
  {
    bg: "#16130A",
    glow: "#3A3312",
    accent: "#B8CC3C",
    accentL: "#E3F09B",
    tag: "JADWAL",
    icon: CalendarCheck,
    title: "Jadwal Tersusun\nOtomatis",
    desc: "Pemeriksaan bulanan terjadwal rapi, otomatis melewati akhir pekan dan hari libur nasional.",
  },
  {
    bg: "#1F1009",
    glow: "#44200F",
    accent: "#F08A4B",
    accentL: "#FFC9A3",
    tag: "LAPORAN",
    icon: BarChart3,
    title: "Laporan Siap\nSeketika",
    desc: "Rekap kepatuhan dan RBFI tersusun otomatis. Ekspor PDF satu ketukan, siap dilaporkan.",
  },
] as const;

const MAX_W = 460; // web: konten tidak spread di layar lebar

export default function Onboarding() {
  const router = useRouter();
  const { width: winW } = useWindowDimensions();
  const frameW = Math.min(winW, MAX_W);
  const x = useSharedValue(0);
  const [index, setIndex] = useState(0);
  const scrollRef = useRef<Animated.ScrollView>(null);
  const s = SLIDES[index];

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (e) => {
      x.value = e.contentOffset.x;
    },
    onMomentumEnd: (e) => {
      runOnJS(setIndex)(Math.round(e.contentOffset.x / frameW));
    },
  });

  const finish = async () => {
    await setOnboardingDone();
    router.replace("/login");
  };

  const next = () => {
    const i = Math.min(index + 1, SLIDES.length - 1);
    scrollRef.current?.scrollTo({ x: i * frameW, animated: true });
    setIndex(i);
  };

  return (
    <View style={[styles.root, { backgroundColor: s.bg }]}>
      {/* frame: center + max-width di web, full di device */}
      <View style={[styles.frame, { width: frameW }]}>
        {/* glow ambient per-slide — lingkaran konsentris opacity menurun = radial fade, no hard edge */}
        <View style={styles.glowWrap} pointerEvents="none">
          {[380, 300, 220, 140].map((size, i) => (
            <View
              key={size}
              style={[
                styles.glowRing,
                {
                  width: size,
                  height: size,
                  borderRadius: size / 2,
                  backgroundColor: s.accent,
                  opacity: 0.05 + i * 0.04,
                },
              ]}
            />
          ))}
        </View>

        <Animated.ScrollView
          ref={scrollRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={scrollHandler}
          scrollEventThrottle={16}
          snapToInterval={frameW}
          decelerationRate="fast"
          disableIntervalMomentum
        >
          {SLIDES.map((sl) => (
            <View key={sl.tag} style={[styles.slide, { width: frameW }]}>
              {/* ilustrasi: rings + icon */}
              <View style={styles.illWrap}>
                <View style={[styles.ring, styles.ringOuter, { borderColor: `${sl.accent}14` }]} />
                <View style={[styles.ring, styles.ringMid, { borderColor: `${sl.accent}24` }]} />
                <View
                  style={[
                    styles.iconWrap,
                    {
                      backgroundColor: `${sl.accent}1A`,
                      borderColor: `${sl.accent}50`,
                      shadowColor: sl.accent,
                    },
                  ]}
                >
                  <sl.icon size={56} color={sl.accentL} strokeWidth={1.5} />
                </View>
              </View>

              {/* konten bawah */}
              <View style={styles.content}>
                <View style={[styles.tagPill, { backgroundColor: `${sl.accent}1F`, borderColor: `${sl.accent}40` }]}>
                  <View style={[styles.tagDot, { backgroundColor: sl.accent }]} />
                  <Text style={[styles.tagText, { color: sl.accentL }]}>{sl.tag}</Text>
                </View>
                <Text style={styles.title}>{sl.title}</Text>
                <Text style={styles.desc}>{sl.desc}</Text>
              </View>
            </View>
          ))}
        </Animated.ScrollView>

        {/* top bar */}
        <View style={styles.topBar} pointerEvents="box-none">
          <View style={styles.logoRow}>
            <View style={[styles.logoBox, { backgroundColor: `${s.accent}22`, borderColor: `${s.accent}45` }]}>
              <Leaf size={15} color={s.accentL} strokeWidth={1.8} />
            </View>
            <Text style={styles.logoText}>Kesling</Text>
          </View>
          <Pressable onPress={finish} hitSlop={10} style={styles.skipBtn}>
            <Text style={styles.skipText}>Lewati</Text>
          </Pressable>
        </View>

        {/* bottom bar: dots + CTA */}
        <View style={styles.bottomBar}>
          <View style={styles.dots}>
            {SLIDES.map((_, i) => (
              <Dot key={i} x={x} index={i} frameW={frameW} accent={s.accent} />
            ))}
          </View>
          <Pressable
            onPress={index === SLIDES.length - 1 ? finish : next}
            style={({ pressed }) => [
              styles.cta,
              { backgroundColor: s.accent, shadowColor: s.accent },
              pressed && { transform: [{ scale: 0.98 }] },
            ]}
          >
            <Text style={styles.ctaText}>{index === SLIDES.length - 1 ? "Mulai Sekarang" : "Lanjut"}</Text>
            <ArrowRight size={16} color="#06281E" strokeWidth={2.4} />
          </Pressable>
        </View>
      </View>
    </View>
  );
}

function Dot({ x, index, frameW, accent }: { x: SharedValue<number>; index: number; frameW: number; accent: string }) {
  const style = useAnimatedStyle(() => {
    const pos = x.value / frameW;
    const d = Math.abs(pos - index);
    const w = interpolate(d, [0, 1], [22, 7], "clamp");
    const o = interpolate(d, [0, 1], [1, 0.35], "clamp");
    return { width: w, opacity: o };
  });
  return <Animated.View style={[styles.dot, style, { backgroundColor: accent }]} />;
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: "center" },
  frame: { flex: 1 },
  glowWrap: {
    position: "absolute",
    top: -150,
    right: -150,
    width: 400,
    height: 400,
    alignItems: "center",
    justifyContent: "center",
  },
  glowRing: { position: "absolute" },
  slide: {
    flex: 1,
    paddingHorizontal: 28,
    paddingTop: 110,
    paddingBottom: 120,
    justifyContent: "space-between",
  },
  illWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 240,
  },
  ring: { position: "absolute", borderRadius: 999, borderWidth: 1 },
  ringMid: { width: 250, height: 250 },
  ringOuter: { width: 330, height: 330 },
  iconWrap: {
    width: 128,
    height: 128,
    borderRadius: 38,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    shadowOpacity: 0.5,
    shadowRadius: 40,
    shadowOffset: { width: 0, height: 12 },
    elevation: 12,
  },
  content: { gap: 14 },
  tagPill: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 7,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
  },
  tagDot: { width: 6, height: 6, borderRadius: 3 },
  tagText: { fontSize: 11, fontWeight: "800", letterSpacing: 1.4 },
  title: {
    fontSize: 32,
    fontWeight: "900",
    color: "#FFFFFF",
    letterSpacing: -1,
    lineHeight: 38,
  },
  desc: {
    fontSize: 14.5,
    lineHeight: 22,
    color: "rgba(255,255,255,0.6)",
    maxWidth: 340,
  },
  topBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingTop: Platform.OS === "web" ? 24 : 58,
  },
  logoRow: { flexDirection: "row", alignItems: "center", gap: 9 },
  logoBox: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  logoText: { fontSize: 15, fontWeight: "800", color: "#FFFFFF", letterSpacing: -0.3 },
  skipBtn: {
    backgroundColor: "rgba(6,20,14,0.55)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.22)",
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  skipText: { fontSize: 12.5, fontWeight: "700", color: "#FFFFFF" },
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 20,
    paddingHorizontal: 24,
    paddingBottom: Platform.OS === "web" ? 28 : 38,
  },
  dots: { flexDirection: "row", gap: 5, alignItems: "center", paddingRight: 8 },
  dot: { height: 6, borderRadius: 999 },
  cta: {
    flex: 1,
    height: 54,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    shadowOpacity: 0.35,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  ctaText: { color: "#06281E", fontSize: 15, fontWeight: "800", letterSpacing: -0.2 },
});
