import { createContext, type ReactNode, useContext, useEffect, useState } from "react";
import { type ApiUser, api, setMemToken } from "./api";
import { deleteToken, getToken, setToken } from "./storage";

type AuthState = {
  user: ApiUser | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
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

  const signOut = async () => {
    setMemToken(null);
    await deleteToken();
    setUser(null);
  };

  return <AuthContext.Provider value={{ user, loading, signIn, signOut }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
