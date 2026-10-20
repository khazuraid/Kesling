"use client";

import { SessionProvider } from "next-auth/react";
import { ThemeProvider, useTheme } from "next-themes";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { Toaster } from "sonner";
import { TamaguiProvider } from "tamagui";
import tamaguiConfig from "../../tamagui.config";
import { QueryProvider } from "./query-provider";

function TamaguiThemeSync({ children }: { children: React.ReactNode }) {
  const { resolvedTheme } = useTheme();
  return (
    <TamaguiProvider config={tamaguiConfig} defaultTheme={resolvedTheme === "dark" ? "dark" : "light"}>
      {children}
    </TamaguiProvider>
  );
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
        <TamaguiThemeSync>
          <QueryProvider>
            <NuqsAdapter>{children}</NuqsAdapter>
          </QueryProvider>
        </TamaguiThemeSync>
      </ThemeProvider>
      <Toaster richColors position="top-right" />
    </SessionProvider>
  );
}
