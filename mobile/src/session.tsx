import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import * as SecureStore from "expo-secure-store";
import { ApiError, request } from "./api";

type Identity = { username: string; role: string };
type Session = { token: string; user: Identity };
type SessionContext = {
  session: Session | null;
  checking: boolean;
  error: string;
  retry: () => void;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  call: <T>(path: string, method?: string, body?: unknown) => Promise<T>;
};
const Context = createContext<SessionContext | null>(null);
const KEY = "agtech.session";
export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const tokenRef = useRef<string | null>(null);
  useEffect(() => {
    let active = true;
    async function restore() {
      try {
        const token = await SecureStore.getItemAsync(KEY);
        if (!active) return;
        tokenRef.current = token;
        if (token) {
          try {
            const user = await request<Identity>("/auth/me", token);
            if (active) setSession({ token, user });
          } catch (e) {
            if (e instanceof ApiError && e.status === 401) {
              await SecureStore.deleteItemAsync(KEY);
              tokenRef.current = null;
            } else throw e;
          }
        }
        if (active) setError("");
      } catch (e) {
        if (active)
          setError(
            e instanceof Error ? e.message : "Không đọc được phiên đăng nhập.",
          );
      } finally {
        if (active) setChecking(false);
      }
    }
    void restore();
    return () => {
      active = false;
    };
  }, [attempt]);
  const call = useCallback(
    async <T,>(path: string, method = "GET", body?: unknown): Promise<T> => {
      const token = tokenRef.current;
      if (!token) throw new Error("Cần đăng nhập.");
      try {
        return await request<T>(path, token, method, body);
      } catch (e) {
        if (
          e instanceof ApiError &&
          e.status === 401 &&
          tokenRef.current === token
        ) {
          tokenRef.current = null;
          setSession(null);
          await SecureStore.deleteItemAsync(KEY);
          setError("Phiên đã hết hạn hoặc tài khoản đã bị khóa.");
        }
        throw e;
      }
    },
    [],
  );
  async function login(username: string, password: string) {
    const result = await request<Identity & { access_token: string }>(
      "/auth/login",
      undefined,
      "POST",
      { username, password, transport: "bearer" },
    );
    try {
      await SecureStore.setItemAsync(KEY, result.access_token, {
        keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
      });
    } catch (e) {
      await request("/auth/logout", result.access_token, "POST").catch(
        () => {},
      );
      throw e;
    }
    tokenRef.current = result.access_token;
    setError("");
    setSession({ token: result.access_token, user: result });
  }
  async function logout() {
    await call("/auth/logout", "POST");
    await SecureStore.deleteItemAsync(KEY);
    tokenRef.current = null;
    setSession(null);
    setError("");
  }
  return (
    <Context.Provider
      value={{
        session,
        checking,
        error,
        retry: () => {
          setChecking(true);
          setAttempt((v) => v + 1);
        },
        login,
        logout,
        call,
      }}
    >
      {children}
    </Context.Provider>
  );
}
export function useSession() {
  const value = useContext(Context);
  if (!value) throw new Error("Session provider missing");
  return value;
}
