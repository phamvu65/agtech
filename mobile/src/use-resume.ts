import { useEffect, useState } from "react";
import { AppState } from "react-native";

export function useResume() {
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let previous = AppState.currentState;
    const subscription = AppState.addEventListener("change", (next) => {
      if (next === "active" && previous !== "active") setRevision((v) => v + 1);
      previous = next;
    });
    return () => subscription.remove();
  }, []);
  return revision;
}
