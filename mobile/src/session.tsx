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
import { useResume } from "./use-resume";

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
let storageQueue: Promise<unknown> = Promise.resolve();
function storage<T>(action: () => Promise<T>): Promise<T> {
  const result = storageQueue.then(action, action);
  storageQueue = result.catch(() => {});
  return result;
}
export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const tokenRef = useRef<string | null>(null);
  const epoch = useRef(0);
  const authMutation = useRef(false);
  const resumed = useResume();
  useEffect(() => {
    if (authMutation.current) return;
    let active = true;
    const version = ++epoch.current;
    async function restore() {
      try {
        const token = await storage(() => SecureStore.getItemAsync(KEY));
        if (!active || epoch.current !== version) return;
        tokenRef.current = token;
        if (token) {
          try {
            const user = await request<Identity>("/auth/me", token);
            if (
              active &&
              epoch.current === version &&
              tokenRef.current === token
            )
              setSession({ token, user });
          } catch (e) {
            if (e instanceof ApiError && e.status === 401) {
              if (
                !active ||
                epoch.current !== version ||
                tokenRef.current !== token
              )
                return;
              await storage(() => SecureStore.deleteItemAsync(KEY));
              if (epoch.current === version) {
                tokenRef.current = null;
                setSession(null);
              }
            } else throw e;
          }
        }
        if (active && epoch.current === version) setError("");
      } catch (e) {
        if (active && epoch.current === version)
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
  }, [attempt, resumed]);
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
          ++epoch.current;
          tokenRef.current = null;
          setSession(null);
          await storage(() => SecureStore.deleteItemAsync(KEY));
          setError("Phiên đã hết hạn hoặc tài khoản đã bị khóa.");
        }
        throw e;
      }
    },
    [],
  );
  async function login(username: string, password: string) {
    if (authMutation.current) throw new Error("Đang xử lý phiên đăng nhập.");
    authMutation.current = true;
    const version = ++epoch.current;
    try {
      const result = await request<Identity & { access_token: string }>(
        "/auth/login",
        undefined,
        "POST",
        { username, password, transport: "bearer" },
      );
      try {
        if (version !== epoch.current)
          throw new Error("Phiên đã thay đổi. Hãy thử lại.");
        await storage(() =>
          SecureStore.setItemAsync(KEY, result.access_token, {
            keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
          }),
        );
      } catch (error) {
        await request("/auth/logout", result.access_token, "POST").catch(
          () => {},
        );
        throw error;
      }
      tokenRef.current = result.access_token;
      setError("");
      setSession({
        token: result.access_token,
        user: { username: result.username, role: result.role },
      });
    } finally {
      authMutation.current = false;
    }
  }
  async function logout() {
    if (authMutation.current) throw new Error("Đang xử lý phiên đăng nhập.");
    authMutation.current = true;
    ++epoch.current;
    try {
      await call("/auth/logout", "POST");
      await storage(() => SecureStore.deleteItemAsync(KEY));
      tokenRef.current = null;
      setSession(null);
      setError("");
    } finally {
      authMutation.current = false;
    }
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
