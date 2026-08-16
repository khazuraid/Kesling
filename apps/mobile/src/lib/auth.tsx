import AsyncStorage from "@react-native-async-storage/async-storage";
import * as LocalAuthentication from "expo-local-authentication";
import { createContext, type ReactNode, useContext, useEffect, useState } from "react";
import { type ApiUser, api, setMemToken } from "./api";
import { deleteToken, getToken, setToken } from "./storage";

const BIOMETRIC_KEY = "kesling_biometric_enabled";

export async function isBiometricEnabled(): Promise<boolean> {
  return (await AsyncStorage.getItem(BIOMETRIC_KEY)) === "1";
}

export async function setBiometricEnabled(on: boolean) {
  if (on) await AsyncStorage.setItem(BIOMETRIC_KEY, "1");
  else await AsyncStorage.removeItem(BIOMETRIC_KEY);
}

export async function biometricAvailable(): Promise<boolean> {
  const has = await LocalAuthentication.hasHardwareAsync();
  const enrolled = await LocalAuthentication.isEnrolledAsync();
  return has && enrolled;
}

type AuthState = {
  user: ApiUser | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signInWithToken: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthState>(null as never);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<ApiUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const token = await getToken();
      if (!token) {
        setLoading(false);
        return;
      }
      // Biometric gate — app lock saat dibuka ulang
      if (await isBiometricEnabled()) {
        const res = await LocalAuthentication.authenticateAsync({
          promptMessage: "Buka Kesling",
          fallbackLabel: "Gunakan sandi",
        });
        if (!res.success) {
          // Lock: jangan restore sesi, user harus login manual
          setLoading(false);
          return;
        }
      }
      setMemToken(token);
      try {
        setUser(await api.me());
      } catch {
        await deleteToken();
        setMemToken(null);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { token, user: u } = await api.login(email, password);
    setMemToken(token);
    await setToken(token);
    setUser(u);
  };

  /** Biometric path: restore session from stored token (already authenticated). */
  const signInWithToken = async () => {
    const token = await getToken();
    if (!token) throw new Error("Sesi tidak ditemukan. Masuk dengan email dan sandi.");
    setMemToken(token);
    try {
      setUser(await api.me());
    } catch (e) {
      setMemToken(null);
      throw e;
    }
  };

  const signOut = async () => {
    setMemToken(null);
    await deleteToken();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signInWithToken, signOut }}>{children}</AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
