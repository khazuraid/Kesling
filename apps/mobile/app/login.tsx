import * as Haptics from "expo-haptics";
import {
  AlertTriangle,
  AtSign,
  Eye,
  EyeOff,
  Fingerprint,
  KeyRound,
  Lock,
  QrCode,
  ShieldCheck,
  Smartphone,
} from "lucide-react-native";
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
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../src/lib/auth";

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [bioAvail, setBioAvail] = useState(false);
  const [bioBusy, setBioBusy] = useState(false);
  const { signIn, signInWithToken } = useAuth();

  // State untuk alur verifikasi OTP perangkat baru
  const [isOtpStep, setIsOtpStep] = useState(false);
  const [otpCode, setOtpCode] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const LocalAuth = require("expo-local-authentication");
        const has = await LocalAuth.hasHardwareAsync();
        const enrolled = await LocalAuth.isEnrolledAsync();
        setBioAvail(has && enrolled);
      } catch {}
    })();
  }, []);

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      setError("Email dan kata sandi wajib diisi");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }

    setError("");
    setLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    try {
      await signIn(email.trim().toLowerCase(), password);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err: any) {
      const msg = err?.message || "Gagal masuk. Periksa kembali email & kata sandi.";
      // Simulasi trigger OTP jika mendeteksi security challenge
      if (msg.toLowerCase().includes("otp") || msg.toLowerCase().includes("perangkat baru")) {
        setIsOtpStep(true);
      } else {
        setError(msg);
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (otpCode.length < 6) {
      setError("Masukkan 6-digit kode OTP");
      return;
    }
    setLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await signIn(email.trim().toLowerCase(), password);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err: any) {
      setError(err?.message || "Kode OTP salah atau telah kadaluarsa");
    } finally {
      setLoading(false);
    }
  };

  const handleBiometricAuth = async () => {
    if (bioBusy) return;
    setBioBusy(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    try {
      await signInWithToken();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err: any) {
      setError(err?.message || "Sidik jari tidak cocok atau sesi berakhir.");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setBioBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={[s.root, { paddingTop: insets.top, paddingBottom: insets.bottom }]}
    >
      <ScrollView
        contentContainerStyle={s.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Logo & Civic Identity Header */}
        <View style={s.headerBox}>
          <View style={s.emblemBox}>
            <ShieldCheck size={36} color="#047857" strokeWidth={2.4} />
          </View>
          <Text style={s.appTitle}>SILAPOR KESLING</Text>
          <Text style={s.appSubtitle}>Dinas Kesehatan Pemerintah Kota Cirebon</Text>
        </View>

        {/* Card Form */}
        <View style={s.card}>
          <Text style={s.cardTitle}>{isOtpStep ? "Verifikasi Perangkat Baru" : "Masuk Petugas Sanitarian"}</Text>
          <Text style={s.cardDesc}>
            {isOtpStep
              ? "Masukkan 6-digit kode keamanan yang dikirimkan ke email terdaftar Anda."
              : "Gunakan akun resmi yang telah didaftarkan oleh Administrator Dinkes."}
          </Text>

          {error ? (
            <View style={s.errorBox}>
              <AlertTriangle size={16} color="#DC2626" strokeWidth={2.2} />
              <Text style={s.errorText}>{error}</Text>
            </View>
          ) : null}

          {!isOtpStep ? (
            <View style={s.formFields}>
              {/* Field Email */}
              <View style={s.inputWrap}>
                <Text style={s.inputLabel}>Email Resmi Dinkes</Text>
                <View style={s.inputRow}>
                  <AtSign size={18} color="#64748B" strokeWidth={2} />
                  <TextInput
                    value={email}
                    onChangeText={(t) => {
                      setEmail(t);
                      setError("");
                    }}
                    placeholder="nama@cirebonkota.go.id"
                    placeholderTextColor="#94A3B8"
                    autoCapitalize="none"
                    keyboardType="email-address"
                    style={s.textInput}
                  />
                </View>
              </View>

              {/* Field Password */}
              <View style={s.inputWrap}>
                <Text style={s.inputLabel}>Kata Sandi</Text>
                <View style={s.inputRow}>
                  <KeyRound size={18} color="#64748B" strokeWidth={2} />
                  <TextInput
                    value={password}
                    onChangeText={(t) => {
                      setPassword(t);
                      setError("");
                    }}
                    placeholder="••••••••"
                    placeholderTextColor="#94A3B8"
                    secureTextEntry={!showPassword}
                    style={s.textInput}
                  />
                  <Pressable onPress={() => setShowPassword(!showPassword)} hitSlop={8}>
                    {showPassword ? (
                      <EyeOff size={18} color="#64748B" strokeWidth={2} />
                    ) : (
                      <Eye size={18} color="#64748B" strokeWidth={2} />
                    )}
                  </Pressable>
                </View>
              </View>

              {/* Tombol Masuk */}
              <Pressable onPress={handleLogin} disabled={loading} style={[s.btnLogin, loading && s.btnDisabled]}>
                {loading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={s.btnLoginText}>Masuk ke Sistem</Text>
                )}
              </Pressable>

              {/* Biometric Unlock Option */}
              {bioAvail && (
                <Pressable onPress={handleBiometricAuth} disabled={bioBusy} style={s.btnBiometric}>
                  <Fingerprint size={22} color="#047857" strokeWidth={2.2} />
                  <Text style={s.btnBiometricText}>Buka Cepat dengan Sidik Jari</Text>
                </Pressable>
              )}
            </View>
          ) : (
            <View style={s.formFields}>
              <View style={s.inputWrap}>
                <Text style={s.inputLabel}>Kode OTP (6-Digit)</Text>
                <TextInput
                  value={otpCode}
                  onChangeText={(t) => setOtpCode(t.replace(/[^0-9]/g, "").slice(0, 6))}
                  placeholder="000000"
                  placeholderTextColor="#94A3B8"
                  keyboardType="numeric"
                  maxLength={6}
                  style={[s.textInput, s.otpInput]}
                />
              </View>

              <Pressable
                onPress={handleVerifyOtp}
                disabled={loading || otpCode.length < 6}
                style={[s.btnLogin, (loading || otpCode.length < 6) && s.btnDisabled]}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={s.btnLoginText}>Verifikasi & Lanjutkan</Text>
                )}
              </Pressable>

              <Pressable onPress={() => setIsOtpStep(false)} style={s.btnBackLogin}>
                <Text style={s.btnBackLoginText}>Gunakan Akun Lain</Text>
              </Pressable>
            </View>
          )}
        </View>

        {/* Footer Support */}
        <View style={s.footerBox}>
          <Text style={s.footerText}>Pusat Bantuan & Lupa Sandi: Hubungi Admin Kesling Dinkes</Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingVertical: 24,
    justifyContent: "center",
  },
  headerBox: {
    alignItems: "center",
    marginBottom: 24,
  },
  emblemBox: {
    width: 68,
    height: 68,
    borderRadius: 24,
    backgroundColor: "#ECFDF5",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#A7F3D0",
    marginBottom: 14,
    shadowColor: "#047857",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 4,
  },
  appTitle: {
    fontSize: 22,
    fontWeight: "900",
    color: "#0F172A",
    letterSpacing: -0.5,
  },
  appSubtitle: {
    fontSize: 13,
    color: "#64748B",
    fontWeight: "600",
    marginTop: 3,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 22,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 4,
    gap: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0F172A",
  },
  cardDesc: {
    fontSize: 12.5,
    color: "#64748B",
    lineHeight: 18,
    marginTop: -8,
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FEF2F2",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#FCA5A5",
  },
  errorText: {
    fontSize: 12,
    color: "#DC2626",
    fontWeight: "600",
    flex: 1,
  },
  formFields: {
    gap: 14,
  },
  inputWrap: {
    gap: 6,
  },
  inputLabel: {
    fontSize: 12.5,
    fontWeight: "700",
    color: "#334155",
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderWidth: 1.5,
    borderColor: "#CBD5E1",
    borderRadius: 14,
    paddingHorizontal: 14,
    minHeight: 50,
    gap: 10,
  },
  textInput: {
    flex: 1,
    fontSize: 14,
    color: "#0F172A",
  },
  otpInput: {
    fontSize: 24,
    fontWeight: "900",
    letterSpacing: 10,
    textAlign: "center",
    minHeight: 56,
    backgroundColor: "#F8FAFC",
    borderWidth: 1.5,
    borderColor: "#047857",
    borderRadius: 14,
  },
  btnLogin: {
    minHeight: 52,
    backgroundColor: "#047857",
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 6,
    shadowColor: "#047857",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 8,
    elevation: 4,
  },
  btnDisabled: {
    opacity: 0.6,
  },
  btnLoginText: {
    fontSize: 15,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  btnBiometric: {
    minHeight: 48,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#047857",
    backgroundColor: "#ECFDF5",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  btnBiometricText: {
    fontSize: 13.5,
    fontWeight: "700",
    color: "#047857",
  },
  btnBackLogin: {
    alignItems: "center",
    paddingVertical: 8,
  },
  btnBackLoginText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#64748B",
  },
  footerBox: {
    alignItems: "center",
    marginTop: 24,
  },
  footerText: {
    fontSize: 11.5,
    color: "#94A3B8",
    textAlign: "center",
  },
});
