import { ToastProvider, ToastViewport } from "@tamagui/toast";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useColorScheme } from "react-native";
import { TamaguiProvider, type TamaguiProviderProps } from "tamagui";
import { AuthProvider } from "../src/lib/auth";
import config from "../tamagui.config";
import { CurrentToast } from "./CurrentToast";

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30_000 } },
});

export function Provider({ children, ...rest }: Omit<TamaguiProviderProps, "config" | "defaultTheme">) {
  const colorScheme = useColorScheme();

  return (
    <TamaguiProvider config={config} defaultTheme={colorScheme === "dark" ? "dark" : "light"} {...rest}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <ToastProvider swipeDirection="horizontal" duration={6000}>
            {children}
            <CurrentToast />
            <ToastViewport top="$8" left={0} right={0} />
          </ToastProvider>
        </AuthProvider>
      </QueryClientProvider>
    </TamaguiProvider>
  );
}
