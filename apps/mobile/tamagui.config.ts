import { defaultConfig } from "@tamagui/config/v5";
import { createTamagui } from "tamagui";

// ponytail: light-only default. Dark theme exists but app forces light unless toggled (Task 23).
const light = {
  ...defaultConfig.themes.light,
  bg: "#F7F5F2",
  card: "#FFFFFF",
  elevated: "#FFFFFF",
  fg: "#1F1D1B",
  muted: "#8A8580",
  border: "#ECE7E1",
  accent: "#00A876",
  accentDeep: "#008A61",
  accentSoft: "#E6F6F0",
  danger: "#EF4444",
  dangerSoft: "#FEECEB",
  success: "#22C55E",
  successSoft: "#EAF7EE",
  warning: "#F59E0B",
  warningSoft: "#FEF4E2",
  purple: "#7C6FE0",
  purpleSoft: "#F0EEFB",
  teal: "#5AC8FA",
  white: "#FFFFFF",
  black: "#000000",
};

const dark = {
  ...defaultConfig.themes.dark,
  bg: "#17140F",
  card: "#1F1C17",
  elevated: "#252119",
  fg: "#F5F0EB",
  muted: "#9A938A",
  border: "#2E2920",
  accent: "#1FB88A",
  accentDeep: "#00A876",
  accentSoft: "rgba(31,184,138,0.16)",
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
