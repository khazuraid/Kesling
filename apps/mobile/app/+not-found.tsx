import { Link, Stack } from "expo-router";
import { Text, YStack } from "tamagui";

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: "Tidak Ditemukan" }} />
      <YStack flex={1} bg="$bg" alignItems="center" justifyContent="center" gap="$4" p="$5">
        <Text fontSize="$6" fontWeight="700" color="$fg">
          Halaman tidak ditemukan
        </Text>
        <Link href="/" style={{ textDecorationLine: "none" }}>
          <YStack bg="$accent" borderRadius={10} paddingHorizontal="$5" paddingVertical="$3">
            <Text fontSize="$4" fontWeight="600" color="white">
              Kembali ke Beranda
            </Text>
          </YStack>
        </Link>
      </YStack>
    </>
  );
}
