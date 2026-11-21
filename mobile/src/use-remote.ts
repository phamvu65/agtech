import { useCallback, useEffect, useRef, useState } from "react";
import { useSession } from "./session";
import { useResume } from "./use-resume";

export function useRemote<T>(path: string | null) {
  const { call, session } = useSession();
  const key = `${session?.token || ""}:${path || ""}`;
  const generation = useRef(0);
  const resumed = useResume();
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<{
    key: string;
    data?: T;
    at?: string;
    error?: string;
    loading: boolean;
  }>({ key: "", loading: true });
  useEffect(() => {
    const id = ++generation.current;
    if (!path) return;
    void call<T>(path)
      .then((data) => {
        if (id === generation.current)
          setState({ key, data, at: new Date().toISOString(), loading: false });
      })
      .catch((e) => {
        if (id === generation.current)
          setState((old) => ({
            ...(old.key === key ? old : {}),
            key,
            loading: false,
            error: e instanceof Error ? e.message : "Tải thất bại.",
          }));
      });
    return () => {
      generation.current = id + 1;
    };
  }, [path, key, attempt, call, resumed]);
  const refresh = useCallback(() => {
    setState((old) => ({ ...old, loading: true, error: undefined }));
    setAttempt((v) => v + 1);
  }, []);
  const visible: { data?: T; at?: string; error?: string; loading: boolean } =
    state.key === key ? state : { loading: true };
  return { ...visible, refresh };
}
