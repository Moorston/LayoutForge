import { useEffect, useRef } from "react";

interface ShortcutMap {
  [key: string]: () => void;
}

export function useKeyboardShortcuts(shortcuts: ShortcutMap) {
  const refs = useRef<ShortcutMap>(shortcuts);
  refs.current = shortcuts;

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const meta = e.metaKey || e.ctrlKey;
      const key = e.key.toLowerCase();

      if (meta && key === "s") {
        e.preventDefault();
        refs.current["save"]?.();
        return;
      }

      if (!meta && !e.shiftKey) {
        const k = refs.current[key];
        if (k) {
          k();
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);
}
