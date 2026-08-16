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
  }, []);
  const set = (t: ThemeName) => {
    setTheme(t);
    setThemePref(t);
  };
  return [theme, set];
}
