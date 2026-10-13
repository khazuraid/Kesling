import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useState } from "react";

const KEY = "kesling_theme";

export type ThemeName = "light" | "dark";

export async function getTheme(): Promise<ThemeName> {
  return ((await AsyncStorage.getItem(KEY)) as ThemeName) || "light";
}

export const __themeListeners = new Set<() => void>();

export async function setThemePref(name: ThemeName) {
  await AsyncStorage.setItem(KEY, name);
  __themeListeners.forEach((fn) => {
    fn();
  });
}

export function useThemePref(): [ThemeName, (t: ThemeName) => void] {
  const [theme, setTheme] = useState<ThemeName>("light");
  useEffect(() => {
    getTheme().then(setTheme);
    const sync = () => getTheme().then(setTheme);
    __themeListeners.add(sync);
    return () => {
      __themeListeners.delete(sync);
    };
  }, []);
  const set = (t: ThemeName) => {
    setTheme(t);
    setThemePref(t);
  };
  return [theme, set];
}

export type Palette = {
  bg: string;
  card: string;
  border: string;
  text: string;
  sub: string;
  accent: string;
  accentSoft: string;
};

const LIGHT: Palette = {
  bg: "#F7F5F2",
  card: "#FFFFFF",
  border: "rgba(28,25,23,0.08)",
  text: "#1B1917",
  sub: "#57534E",
  accent: "#00A876",
  accentSoft: "#E0F4EE",
};

const DARK: Palette = {
  bg: "#17140F",
  card: "#242019",
  border: "rgba(250,248,244,0.1)",
  text: "#FAF8F4",
  sub: "#A8A29E",
  accent: "#00A876",
  accentSoft: "rgba(0,168,118,0.18)",
};

export function usePalette(): Palette {
  const [theme] = useThemePref();
  return theme === "dark" ? DARK : LIGHT;
}
