import { defaultConfig } from "@tamagui/config/v5";
import { createTamagui } from "tamagui";

// ponytail: light-only default. Dark theme exists but app forces light unless toggled (Task 23).
const light = {
  ...defaultConfig.themes.light,
  bg: "#F4F6F9",
  card: "#FFFFFF",
  elevated: "#FFFFFF",
  fg: "#18181B",
  muted: "#71717A",
  border: "#E4E4E0",
  accent: "#0066FF",
  accentDeep: "#0052CC",
  accentSoft: "#EBF2FF",
  danger: "#DC2626",
  dangerSoft: "#FEF2F2",
  success: "#16A34A",
  successSoft: "#F0FDF4",
  warning: "#D97706",
  warningSoft: "#FEF6E7",
  purple: "#7C6FE0",
  purpleSoft: "#F0EEFB",
  teal: "#5AC8FA",
  white: "#FFFFFF",
  black: "#000000",
};

const dark = {
  ...defaultConfig.themes.dark,
  bg: "#0F0F11",
  card: "#1C1C1F",
  elevated: "#242428",
  fg: "#FAFAF9",
  muted: "#A1A1AA",
  border: "#2C2C30",
  accent: "#4D8DFF",
  accentDeep: "#0066FF",
  accentSoft: "rgba(77,141,255,0.16)",
  danger: "#FF6B6B",
  dangerSoft: "rgba(255,107,107,0.16)",
  success: "#4ADE80",
  successSoft: "rgba(74,222,128,0.16)",
  warning: "#FBBF24",
  warningSoft: "rgba(251,191,36,0.16)",
  purple: "#9D93EA",
  purpleSoft: "rgba(157,147,234,0.16)",
  teal: "#67E8F9",
  white: "#FFFFFF",
  black: "#000000",
};

const config = createTamagui({
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
