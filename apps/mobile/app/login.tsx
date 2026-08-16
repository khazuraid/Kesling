import { Eye, EyeOff, ShieldCheck } from "@tamagui/lucide-icons-2";
import { useEffect, useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { useAuth } from "../src/lib/auth";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();

  const logoScale = useSharedValue(1);
  const logoPulse = useSharedValue(0);
  const shakeX = useSharedValue(0);
  const formOpacity = useSharedValue(0);
  const formY = useSharedValue(24);

  useEffect(() => {
    // ring pulse loop
    logoPulse.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      false,
    );
    // stagger entrance
    formOpacity.value = withDelay(150, withTiming(1, { duration: 400 }));
    formY.value = withDelay(150, withSpring(0, { damping: 16 }));
  }, []);

  const logoStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + logoPulse.value * 0.06 }],
  }));
  const ringStyle = useAnimatedStyle(() => ({
    opacity: 0.35 * (1 - logoPulse.value),
    transform: [{ scale: 1 + logoPulse.value * 0.55 }],
  }));
  const shakeStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shakeX.value }],
  }));
  const formStyle = useAnimatedStyle(() => ({
    opacity: formOpacity.value,
    transform: [{ translateY: formY.value }],
  }));

  const submit = async () => {
    if (!email || !password) {
      setError("Email dan password wajib diisi.");
      shakeX.value = withSequence(
        withSpring(-10, { damping: 8 }),
        withSpring(10, { damping: 8 }),
        withSpring(-6, { damping: 8 }),
        withSpring(0, { damping: 8 }),
      );
      return;
    }
    setLoading(true);
    setError("");
    try {
      await signIn(email, password);
    } catch (e: any) {
      setError(e?.message || "Gagal masuk. Coba lagi.");
      shakeX.value = withSequence(
        withSpring(-10, { damping: 8 }),
        withSpring(10, { damping: 8 }),
        withSpring(-6, { damping: 8 }),
        withSpring(0, { damping: 8 }),
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={styles.center}>
        {/* Brand with pulse ring */}
        <View style={styles.brandWrap}>
          <Animated.View style={[styles.pulseRing, ringStyle]} />
          <Animated.View style={[styles.logo, logoStyle]}>
            <ShieldCheck size={38} color="#FFFFFF" />
          </Animated.View>
        </View>
        <Text style={styles.brandTitle}>Kesling</Text>
        <Text style={styles.brandSub}>Sistem Informasi Kesehatan Lingkungan</Text>

        {/* Form card — staggered entrance */}
        <Animated.View style={[styles.card, formStyle, shakeStyle]}>
          <Text style={styles.cardTitle}>Masuk ke akun Anda</Text>

          <Text style={styles.label}>EMAIL</Text>
          <TextInput
            style={styles.input}
            placeholder="nama@email.com"
            placeholderTextColor="#8A8580"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />

          <Text style={styles.label}>PASSWORD</Text>
          <View style={styles.pwWrap}>
            <TextInput
              style={[styles.input, { flex: 1, borderWidth: 0, backgroundColor: "transparent" }]}
              placeholder="••••••••"
              placeholderTextColor="#8A8580"
              secureTextEntry={!show}
              value={password}
              onChangeText={setPassword}
            />
            <Pressable onPress={() => setShow(!show)} hitSlop={8} style={{ padding: 6 }}>
              {show ? <EyeOff size={20} color="#8A8580" /> : <Eye size={20} color="#8A8580" />}
            </Pressable>
          </View>

          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <Pressable
            onPress={submit}
            disabled={loading}
            style={({ pressed }) => [styles.submitBtn, pressed && { transform: [{ scale: 0.97 }], opacity: 0.9 }]}
          >
            <Text style={styles.submitText}>{loading ? "Memproses..." : "Masuk"}</Text>
          </Pressable>
        </Animated.View>

        <Text style={styles.footer}>Dinkes Kota Cirebon • Kesehatan Lingkungan</Text>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F7F5F2" },
  center: { flex: 1, justifyContent: "center", padding: 24, gap: 12 },
  brandWrap: {
    width: 110,
    height: 110,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    marginBottom: 8,
  },
  pulseRing: {
    position: "absolute",
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: "#E6F6F0",
  },
  logo: {
    width: 76,
    height: 76,
    borderRadius: 24,
    backgroundColor: "#00A876",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#00A876",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  brandTitle: { fontSize: 30, fontWeight: "800", color: "#1F1D1B", letterSpacing: -1.2, textAlign: "center" },
  brandSub: { fontSize: 13, color: "#8A8580", textAlign: "center", marginBottom: 12 },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#ECE7E1",
    padding: 20,
    gap: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 16,
    elevation: 4,
  },
  cardTitle: { fontSize: 17, fontWeight: "700", color: "#1F1D1B" },
  label: { fontSize: 10, fontWeight: "800", color: "#8A8580", letterSpacing: 1 },
  input: {
    backgroundColor: "#F7F5F2",
    borderWidth: 1,
    borderColor: "#ECE7E1",
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 46,
    fontSize: 15,
    color: "#1F1D1B",
  },
  pwWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F7F5F2",
    borderWidth: 1,
    borderColor: "#ECE7E1",
    borderRadius: 12,
    paddingHorizontal: 14,
  },
  errorBox: { backgroundColor: "#FEECEB", borderRadius: 12, padding: 12 },
  errorText: { color: "#EF4444", fontSize: 13 },
  submitBtn: {
    backgroundColor: "#00A876",
    borderRadius: 14,
    height: 50,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#00A876",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  submitText: { color: "#FFFFFF", fontSize: 16, fontWeight: "700" },
  footer: { fontSize: 11, color: "#8A8580", textAlign: "center", marginTop: 8 },
});
