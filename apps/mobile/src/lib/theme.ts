import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useState } from "react";

const KEY = "kesling_theme";

export type ThemeName = "light" | "dark";

export async function getTheme(): Promise<ThemeName> {
  return ((await AsyncStorage.getItem(KEY)) as ThemeName) || "light";
}

/** Simple pub/sub so Provider re-reads theme after toggle without app restart. */
export const __themeListeners = new Set<() => void>();

export async function setThemePref(name: ThemeName) {
  await AsyncStorage.setItem(KEY, name);
  __themeListeners.forEach((fn) => {
    fn();
  });
}

/** ponytail: app-level override; add "system" option when user asks. */
export function useThemePref(): [ThemeName, (t: ThemeName) => void] {
  const [theme, setTheme] = useState<ThemeName>("light");
  useEffect(() => {
    getTheme().then(setTheme);
    const sync = () => {
      getTheme().then(setTheme);
    };
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
  border: "#ECE7E1",
  text: "#1F1D1B",
  sub: "#8A8580",
  accent: "#00A876",
  accentSoft: "#E6F6F0",
};

const DARK: Palette = {
  bg: "#17140F",
  card: "#211D17",
  border: "#38332B",
  text: "#F0EDE6",
  sub: "#A39D92",
  accent: "#00A876",
  accentSoft: "#123B2E",
};

/** Reactive palette utk screens dengan inline/StyleSheet hex — subscribe ke __themeListeners. */
export function usePalette(): Palette {
  const [theme] = useThemePref();
  return theme === "dark" ? DARK : LIGHT;
}
