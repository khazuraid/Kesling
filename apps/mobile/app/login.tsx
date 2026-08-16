import { Eye, EyeOff, ShieldCheck } from "@tamagui/lucide-icons-2";
import { useState } from "react";
import { KeyboardAvoidingView, Platform } from "react-native";
import { Input, Spinner, Text, XStack, YStack } from "tamagui";
import { AppButton } from "../src/components/ui/Button";
import { useAuth } from "../src/lib/auth";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();

  const submit = async () => {
    if (!email || !password) {
      setError("Email dan password wajib diisi.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await signIn(email, password);
    } catch (e: any) {
      setError(e?.message || "Gagal masuk. Coba lagi.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: "#F2F4F8" }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <YStack flex={1} justifyContent="center" padding="$6" gap="$5">
        {/* Brand mark */}
        <YStack alignItems="center" gap="$3" mb="$2">
          <YStack
            width={76}
            height={76}
            borderRadius={24}
            bg="$accent"
            alignItems="center"
            justifyContent="center"
            shadow={{
              shadowColor: "#007AFF",
              shadowOffset: { width: 0, height: 6 },
              shadowOpacity: 0.3,
              shadowRadius: 16,
            }}
          >
            <ShieldCheck size={38} color="white" />
          </YStack>
          <YStack alignItems="center" gap="$1">
            <Text fontSize={30} fontWeight="800" color="$fg" letterSpacing={-1.2}>
              Kesling
            </Text>
            <Text fontSize="$3.5" color="$muted">
              Sistem Informasi Kesehatan Lingkungan
            </Text>
          </YStack>
        </YStack>

        {/* Form */}
        <YStack
          bg="$card"
          borderRadius={20}
          borderWidth={1}
          borderColor="$border"
          p="$5"
          gap="$4"
          shadow={{ shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 16 }}
        >
          <Text fontSize="$5" fontWeight="700" color="$fg">
            Masuk ke akun Anda
          </Text>

          <YStack gap="$1.5">
            <Text fontSize="$2.5" color="$muted" fontWeight="600" textTransform="uppercase" letterSpacing={0.5}>
              Email
            </Text>
            <Input
              size="$4"
              borderRadius={12}
              bg="$bg"
              borderWidth={1}
              borderColor="$border"
              placeholder="nama@email.com"
              placeholderTextColor="$muted"
              color="$fg"
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
            />
          </YStack>

          <YStack gap="$1.5">
            <Text fontSize="$2.5" color="$muted" fontWeight="600" textTransform="uppercase" letterSpacing={0.5}>
              Password
            </Text>
            <XStack alignItems="center" bg="$bg" borderRadius={12} borderWidth={1} borderColor="$border" px="$3">
              <Input
                flex={1}
                unstyled
                size="$4"
                py="$2.5"
                color="$fg"
                placeholder="••••••••"
                placeholderTextColor="$muted"
                secureTextEntry={!show}
                value={password}
                onChangeText={setPassword}
              />
              <XStack onPress={() => setShow(!show)} pressStyle={{ opacity: 0.6 }} p="$1">
                {show ? <EyeOff size={20} color="$muted" /> : <Eye size={20} color="$muted" />}
              </XStack>
            </XStack>
          </YStack>

          {error ? (
            <Text color="$danger" fontSize="$3" backgroundColor="$dangerSoft" padding="$3" borderRadius={12}>
              {error}
            </Text>
          ) : null}

          <AppButton
            label={loading ? "Memproses..." : "Masuk"}
            onPress={submit}
            disabled={loading}
            icon={loading ? <Spinner color="white" size="small" /> : undefined}
          />
        </YStack>

        <Text fontSize="$2.5" color="$muted" textAlign="center">
          Dinkes Kota Cirebon • Kesehatan Lingkungan
        </Text>
      </YStack>
    </KeyboardAvoidingView>
  );
}
