import { useCallback, useState } from "react";
import { RefreshControl } from "react-native";
import { ScrollView, type ScrollViewProps, YStack } from "tamagui";

type ScreenProps = ScrollViewProps & {
  children: React.ReactNode;
  onRefresh?: () => Promise<void>;
  refreshTint?: string;
};

// Standard screen shell — bg + safe scroll + optional pull-to-refresh
export function Screen({ children, onRefresh, refreshTint = "#007AFF", ...props }: ScreenProps) {
  const [refreshing, setRefreshing] = useState(false);
  const handleRefresh = useCallback(async () => {
    if (!onRefresh) return;
    setRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setRefreshing(false);
    }
  }, [onRefresh]);

  return (
    <ScrollView
      flex={1}
      bg="$bg"
      showsVerticalScrollIndicator={false}
      refreshControl={
        onRefresh ? (
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={refreshTint} />
        ) : undefined
      }
      {...props}
    >
      {children}
    </ScrollView>
  );
}
