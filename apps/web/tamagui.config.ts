import { defaultConfig } from "@tamagui/config/v5";
import { createTamagui } from "tamagui";

const light = {
  ...defaultConfig.themes.light,
  bg: "#F8FAFC",
  background: "#F8FAFC",
  card: "#FFFFFF",
  surface: "#FFFFFF",
  elevated: "#FFFFFF",
  fg: "#0F172A",
  color: "#0F172A",
  muted: "#64748B",
  border: "#E2E8F0",
  primary: "#059669",
  primaryHover: "#047857",
  primarySubtle: "#ECFDF5",
  accent: "#10B981",
  success: "#10B981",
  warning: "#F59E0B",
  danger: "#EF4444",
};

const dark = {
  ...defaultConfig.themes.dark,
  bg: "#0B1311",
  background: "#0B1311",
  card: "#121F1B",
  surface: "#121F1B",
  elevated: "#182A25",
  fg: "#F8FAFC",
  color: "#F8FAFC",
  muted: "#94A3B8",
  border: "#1E362E",
  primary: "#10B981",
  primaryHover: "#059669",
  primarySubtle: "rgba(16, 185, 129, 0.15)",
  accent: "#34D399",
  success: "#10B981",
  warning: "#FBBF24",
  danger: "#F87171",
};

export const config = createTamagui({
  ...defaultConfig,
  themes: {
    ...defaultConfig.themes,
    light,
    dark,
  },
});

export default config;
export type Conf = typeof config;

declare module "tamagui" {
  interface TamaguiCustomConfig extends Conf {}
}
