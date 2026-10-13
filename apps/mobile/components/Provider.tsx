import { ToastProvider, ToastViewport } from "@tamagui/toast";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { TamaguiProvider, type TamaguiProviderProps } from "tamagui";
import { AuthProvider } from "../src/lib/auth";
import { getTheme } from "../src/lib/theme";
import config from "../tamagui.config";
import { CurrentToast } from "./CurrentToast";

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30_000 } },
});

/** Manual theme override (default light). No `key`: defaultTheme prop change
 * re-themes in place; keying would remount the whole tree (state loss + reanimated
 * shared-value crashes mid-animation). */
export function Provider({ children, ...rest }: Omit<TamaguiProviderProps, "config" | "defaultTheme">) {
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    getTheme().then(setTheme);
    const sub = require("../src/lib/theme").__themeListeners as Set<() => void>;
    const onChange = () => getTheme().then(setTheme);
    sub.add(onChange);
    return () => {
      sub.delete(onChange);
    };
  }, []);

  return (
    <TamaguiProvider config={config} defaultTheme={theme} {...rest}>
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
