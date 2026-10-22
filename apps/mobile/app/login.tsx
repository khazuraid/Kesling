import { AlertTriangle, AtSign, Eye, EyeOff, Fingerprint, KeyRound } from "@tamagui/lucide-icons-2";
import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { useAuth } from "../src/lib/auth";

// Design: "Kesling Mobile" LoginScreen — dark #0D1117, glow blobs, gradient app icon, bottom-sheet card
const BG = "#0D1117";
const CARD = "#161B22";
const INPUT_BG = "rgba(255,255,255,0.05)";
const HAIRLINE_D = "rgba(255,255,255,0.09)";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState("");
  const [bioAvail, setBioAvail] = useState(false);
  const [bioBusy, setBioBusy] = useState(false);
  const { signIn, signInWithToken } = useAuth();

  useEffect(() => {
    (async () => {
      try {
        const LocalAuth = require("expo-local-authentication").default as typeof import("expo-local-authentication");
        const has = await LocalAuth.hasHardwareAsync();
        const enrolled = await LocalAuth.isEnrolledAsync();
        setBioAvail(has && enrolled);
      } catch {}
    })();
  }, []);

  const formOpacity = useSharedValue(0);
  const formY = useSharedValue(24);
  const shakeX = useSharedValue(0);

  useEffect(() => {
    formOpacity.value = withDelay(100, withTiming(1, { duration: 400 }));
    formY.value = withDelay(100, withSpring(0, { damping: 16 }));
  }, []);

  const shakeStyle = useAnimatedStyle(() => ({ transform: [{ translateX: shakeX.value }] }));
  const formStyle = useAnimatedStyle(() => ({ opacity: formOpacity.value, transform: [{ translateY: formY.value }] }));

  const showError = (msg: string) => {
    setError(msg);
    shakeX.value = withSequence(
      withTiming(-8, { duration: 50 }),
      withTiming(8, { duration: 50 }),
      withTiming(-5, { duration: 40 }),
      withTiming(0, { duration: 40 }),
    );
  };

  const submit = async () => {
    if (!email.trim() || !password) return showError("Email dan password wajib diisi.");
    setLoading(true);
    setError("");
    try {
      await signIn(email.trim(), password);
    } catch (e: any) {
      showError(
        e?.message === "invalid_credentials" || /401|salah/i.test(e?.message || "")
          ? "Email atau password salah."
          : "Gagal masuk. Coba lagi.",
      );
    } finally {
      setLoading(false);
    }
  };

  const biometricLogin = async () => {
    try {
      const LocalAuth = require("expo-local-authentication").default as typeof import("expo-local-authentication");
      setBioBusy(true);
      const ok = await LocalAuth.authenticateAsync({ promptMessage: "Masuk dengan biometrik" });
      setBioBusy(false);
      if (!ok.success) return;
      const SecureStore = require("expo-secure-store").default as typeof import("expo-secure-store");
      const token = await SecureStore.getItemAsync("kesling_token");
      if (!token) return showError("Sesi biometrik kedaluwarsa. Masuk manual.");
      setLoading(true);
      try {
        await signInWithToken();
      } catch {
        showError("Sesi tidak valid. Masuk manual.");
      } finally {
        setLoading(false);
      }
    } catch {
      setBioBusy(false);
      showError("Biometrik tidak tersedia.");
    }
  };

  return (
    <KeyboardAvoidingView style={s.root} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
        {/* Glow blobs */}
        <View style={s.blobTop} pointerEvents="none" />
        <View style={s.blobBottom} pointerEvents="none" />

        <Animated.View style={formStyle}>
          {/* Logo area */}
          <View style={s.logoWrap}>
            <View style={s.appIcon}>
              <Image
                source={require("../assets/images/icon.png")}
                style={{ width: "100%", height: "100%", borderRadius: 20 }}
                resizeMode="contain"
              />
            </View>
            <Text style={s.logoName}>Kesling</Text>
            <Text style={s.logoSub}>Sistem Informasi Kesehatan Lingkungan</Text>
            <View style={s.pillRow}>
              {["Inspeksi", "Jadwal", "Laporan"].map((l) => (
                <View key={l} style={s.pill}>
                  <Text style={s.pillText}>{l}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Form card — bottom-sheet style */}
          <View style={s.card}>
            {/* Handle */}
            <View style={s.handle} />
            <Text style={s.cardTitle}>Masuk ke akun</Text>
            <Text style={s.cardSub}>Gunakan email dinas yang terdaftar</Text>

            <View style={s.fieldGap}>
              {/* Email */}
              <View>
                <Text style={s.label}>EMAIL</Text>
                <View style={[s.inputWrap, focused === "email" && s.inputActive]}>
                  <View style={s.inputIcon}>
                    <AtSign size={16} color={focused === "email" ? "#60A5FA" : "rgba(255,255,255,0.25)"} />
                  </View>
                  <TextInput
                    style={s.input}
                    placeholder="nama@dinas.go.id"
                    placeholderTextColor="rgba(255,255,255,0.3)"
                    autoCapitalize="none"
                    keyboardType="email-address"
                    value={email}
                    onChangeText={setEmail}
                    onFocus={() => setFocused("email")}
                    onBlur={() => setFocused("")}
                  />
                </View>
              </View>

              {/* Password */}
              <View>
                <Text style={s.label}>PASSWORD</Text>
                <View style={[s.inputWrap, focused === "password" && s.inputActive]}>
                  <View style={s.inputIcon}>
                    <KeyRound size={16} color={focused === "password" ? "#60A5FA" : "rgba(255,255,255,0.25)"} />
                  </View>
                  <TextInput
                    style={s.input}
                    placeholder="••••••••"
                    placeholderTextColor="rgba(255,255,255,0.3)"
                    secureTextEntry={!show}
                    value={password}
                    onChangeText={setPassword}
                    onFocus={() => setFocused("password")}
                    onBlur={() => setFocused("")}
                  />
                  <Pressable onPress={() => setShow((p) => !p)} hitSlop={8} style={s.eyeBtn}>
                    {show ? (
                      <EyeOff size={18} color={show ? "#60A5FA" : "rgba(255,255,255,0.25)"} strokeWidth={2} />
                    ) : (
                      <Eye size={18} color={show ? "#60A5FA" : "rgba(255,255,255,0.25)"} strokeWidth={2} />
                    )}
                  </Pressable>
                </View>
              </View>
            </View>

            {error ? (
              <Animated.View style={[s.errRow, shakeStyle]}>
                <AlertTriangle size={15} color="#FCA5A5" strokeWidth={2.2} />
                <Text style={s.errText}>{error}</Text>
              </Animated.View>
            ) : null}

            <Pressable
              onPress={() =>
                Alert.alert(
                  "Lupa Password",
                  "Hubungi admin Dinas Kesehatan / operator aplikasi untuk reset password akun Anda.",
                )
              }
              hitSlop={8}
              style={s.forgotRow}
            >
              <Text style={s.forgotText}>Lupa password?</Text>
            </Pressable>

            <Pressable
              onPress={loading ? undefined : submit}
              disabled={loading}
              style={({ pressed }) => [s.loginBtn, (pressed || loading) && { opacity: 0.85 }]}
            >
              <LinearGradient
                colors={loading ? ["rgba(255,255,255,0.08)", "rgba(255,255,255,0.08)"] : ["#00A876", "#00A876"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={s.loginBtnFill}
              >
                {loading ? <ActivityIndicator color="rgba(255,255,255,0.6)" size="small" /> : null}
                <Text style={s.loginText}>{loading ? "Memverifikasi..." : "Masuk"}</Text>
              </LinearGradient>
            </Pressable>

            {bioAvail ? (
              <Pressable
                onPress={bioBusy ? undefined : biometricLogin}
                disabled={bioBusy}
                style={({ pressed }) => [s.bioBtn, pressed && { opacity: 0.7 }]}
              >
                <Fingerprint size={19} color="rgba(255,255,255,0.75)" strokeWidth={1.8} />
                <Text style={s.bioText}>{bioBusy ? "Memverifikasi..." : "Masuk dengan Biometrik"}</Text>
              </Pressable>
            ) : null}
          </View>
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  content: { flexGrow: 1, justifyContent: "center", paddingHorizontal: 24, paddingVertical: 48 },
  blobTop: {
    position: "absolute",
    top: -80,
    left: -60,
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: "rgba(37,99,235,0.18)",
  },
  blobBottom: {
    position: "absolute",
    bottom: 40,
    right: -80,
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: "rgba(124,58,237,0.14)",
  },
  logoWrap: { alignItems: "center", marginBottom: 30 },
  appIcon: {
    width: 72,
    height: 72,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#00A876",
    shadowOpacity: 0.4,
    shadowRadius: 32,
    shadowOffset: { width: 0, height: 12 },
    elevation: 8,
    marginBottom: 14,
  },
  logoName: { fontSize: 28, fontWeight: "900", color: "#fff", letterSpacing: -0.8 },
  logoSub: { fontSize: 12, color: "rgba(255,255,255,0.35)", marginTop: 6, textAlign: "center" },
  pillRow: { flexDirection: "row", gap: 8, marginTop: 14 },
  pill: {
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  pillText: { fontSize: 11, fontWeight: "600", color: "rgba(255,255,255,0.35)" },
  card: {
    backgroundColor: CARD,
    borderWidth: 1,
    borderColor: HAIRLINE_D,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    padding: 24,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.1)",
    alignSelf: "center",
    marginBottom: 20,
  },
  cardTitle: { fontSize: 20, fontWeight: "800", color: "#fff", letterSpacing: -0.5, marginBottom: 6 },
  cardSub: { fontSize: 13, color: "rgba(255,255,255,0.35)", marginBottom: 24 },
  fieldGap: { gap: 12, marginBottom: 20 },
  label: { fontSize: 11, fontWeight: "700", color: "rgba(255,255,255,0.35)", letterSpacing: 1, marginBottom: 8 },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    height: 50,
    backgroundColor: INPUT_BG,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.08)",
    paddingHorizontal: 14,
  },
  inputActive: { borderColor: "rgba(96,165,250,0.4)", backgroundColor: "rgba(96,165,250,0.06)" },
  input: { flex: 1, fontSize: 15, color: "#fff", paddingVertical: 0 },
  inputIcon: { marginRight: 10 },
  eyeBtn: { padding: 4 },
  errRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    backgroundColor: "rgba(220,38,38,0.12)",
    borderWidth: 1,
    borderColor: "rgba(220,38,38,0.25)",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 14,
  },
  errText: { flex: 1, fontSize: 12.5, fontWeight: "600", color: "#FCA5A5" },
  forgotRow: { alignSelf: "flex-end", marginBottom: 20, marginTop: -6 },
  forgotText: { fontSize: 12, color: "#60A5FA", fontWeight: "600" },
  loginBtn: {
    borderRadius: 16,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    height: 56,
    shadowColor: "#00A876",
    shadowOpacity: 0.35,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  loginBtnFill: {
    flex: 1,
    alignSelf: "stretch",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  loginText: { fontSize: 16, fontWeight: "800", color: "#fff" },
  bioBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: HAIRLINE_D,
    borderRadius: 14,
    height: 48,
    marginTop: 12,
  },
  bioText: { fontSize: 14, fontWeight: "700", color: "rgba(255,255,255,0.75)" },
});
