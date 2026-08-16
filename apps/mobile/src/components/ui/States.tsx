import { Text, YStack } from "tamagui";
import { AppButton } from "./Button";

export function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
}: {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <YStack alignItems="center" paddingVertical="$10" paddingHorizontal="$6" gap="$3">
      {icon ? (
        <YStack
          width={72}
          height={72}
          borderRadius={20}
          bg="$bg"
          borderWidth={1}
          borderColor="$border"
          alignItems="center"
          justifyContent="center"
        >
          {icon}
        </YStack>
      ) : null}
      <Text fontSize="$5" fontWeight="700" color="$fg" textAlign="center">
        {title}
      </Text>
      {description ? (
        <Text fontSize="$3" color="$muted" textAlign="center" lineHeight={20}>
          {description}
        </Text>
      ) : null}
      {actionLabel && onAction ? (
        <YStack marginTop="$2">
          <AppButton label={actionLabel} onPress={onAction} />
        </YStack>
      ) : null}
    </YStack>
  );
}

export function ErrorState({ message, onRetry }: { message?: string; onRetry?: () => void }) {
  return (
    <YStack alignItems="center" paddingVertical="$10" paddingHorizontal="$6" gap="$3">
      <YStack width={72} height={72} borderRadius={20} bg="$dangerSoft" alignItems="center" justifyContent="center">
        <Text fontSize="$6" color="$danger" fontWeight="800">
          !
        </Text>
      </YStack>
      <Text fontSize="$5" fontWeight="700" color="$fg" textAlign="center">
        Terjadi Kesalahan
      </Text>
      <Text fontSize="$3" color="$muted" textAlign="center" lineHeight={20}>
        {message || "Gagal memuat data. Periksa koneksi internet Anda."}
      </Text>
      {onRetry ? (
        <YStack marginTop="$2">
          <AppButton label="Coba Lagi" variant="secondary" onPress={onRetry} />
        </YStack>
      ) : null}
    </YStack>
  );
}
