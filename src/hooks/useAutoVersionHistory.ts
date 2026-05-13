import { useEffect, useRef, useCallback } from "react";

export interface VersionSnapshot {
  id: string;
  timestamp: number;
  html: string;
  css: string;
  label: string;
}

const STORAGE_KEY = "layout_forge_version_snapshots";
const MAX_SNAPSHOTS = 20;
const DEBOUNCE_MS = 2000;
const MAX_STORAGE_BYTES = 512_000; // 500KB limit for version snapshots

function loadSnapshots(): VersionSnapshot[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveSnapshots(snapshots: VersionSnapshot[]) {
  let json = JSON.stringify(snapshots);
  if (json.length > MAX_STORAGE_BYTES) {
    snapshots = snapshots.slice(0, Math.floor(snapshots.length / 2));
    json = JSON.stringify(snapshots);
  }
  try {
    localStorage.setItem(STORAGE_KEY, json);
  } catch {
    // localStorage full — trim more aggressively
    snapshots = snapshots.slice(0, 5);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshots));
  }
  return snapshots;
}

export function useAutoVersionHistory(
  html: string,
  css: string,
  active: boolean,
) {
  const lastRef = useRef<string>("");
  const snapshotsRef = useRef<VersionSnapshot[]>(loadSnapshots());
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const takeSnapshot = useCallback(
    (label: string) => {
      if (!active || !html.trim()) return;
      const key = `${html.slice(0, 100)}|${css.slice(0, 50)}`;
      if (key === lastRef.current) return;
      lastRef.current = key;

      const snapshot: VersionSnapshot = {
        id: crypto.randomUUID(),
        timestamp: Date.now(),
        html,
        css,
        label,
      };

      snapshotsRef.current = [snapshot, ...snapshotsRef.current].slice(
        0,
        MAX_SNAPSHOTS,
      );
      snapshotsRef.current = saveSnapshots(snapshotsRef.current);
    },
    [html, css, active],
  );

  useEffect(() => {
    if (!active || !html.trim()) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      takeSnapshot("Auto-save");
    }, DEBOUNCE_MS);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [html, css, active, takeSnapshot]);

  const getSnapshots = useCallback(() => snapshotsRef.current, []);

  const clearSnapshots = useCallback(() => {
    snapshotsRef.current = [];
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  return { getSnapshots, takeSnapshot, clearSnapshots };
}
