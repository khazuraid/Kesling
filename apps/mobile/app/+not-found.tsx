import { Link, Stack } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { C } from "../src/lib/tokens";

const BG = C.bgScreen;

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: "Tidak Ditemukan" }} />
      <View style={s.root}>
        <Text style={s.code}>404</Text>
        <Text style={s.title}>Halaman tidak ditemukan</Text>
        <Text style={s.sub}>Halaman yang Anda tuju tidak tersedia.</Text>
        <Link href="/" asChild>
          <Pressable style={({ pressed }) => [s.btn, pressed && { opacity: 0.8 }]}>
            <Text style={s.btnText}>Kembali ke Beranda</Text>
          </Pressable>
        </Link>
      </View>
    </>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG, alignItems: "center", justifyContent: "center", paddingHorizontal: 32, gap: 6 },
  code: { fontSize: 56, fontWeight: "900", color: C.accent, letterSpacing: -2, marginBottom: 4 },
  title: { fontSize: 18, fontWeight: "800", color: C.ink, letterSpacing: -0.4 },
  sub: { fontSize: 13, color: C.muted, marginBottom: 20 },
  btn: {
    backgroundColor: C.accent,
    borderRadius: 14,
    paddingHorizontal: 24,
    paddingVertical: 13,
  },
  btnText: { fontSize: 14, fontWeight: "800", color: "#fff" },
});
