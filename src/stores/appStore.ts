import { create } from "zustand";
import type { ExportFormat, BrandKit, GenerationMode } from "@/lib/types";
import { loadBrandKit, buildBrandKitPromptContext } from "@/lib/brandKit";

export type ThemeMode = "light" | "dark";

interface AppStore {
  theme: ThemeMode;
  setTheme: (mode: ThemeMode) => void;
  toggleTheme: () => void;

  selectedStack: ExportFormat;
  setSelectedStack: (stack: ExportFormat) => void;
  enableRefinement: boolean;
  setEnableRefinement: (v: boolean) => void;
  generationMode: GenerationMode;
  setGenerationMode: (mode: GenerationMode) => void;

  brandKit: BrandKit;
  setBrandKit: (kit: BrandKit) => void;
  brandKitContext: string | undefined;

  urlHistory: string[];
  addToUrlHistory: (url: string) => void;
  clearUrlHistory: () => void;

  showSettings: boolean;
  setShowSettings: (v: boolean) => void;
}

const initialKit = loadBrandKit();

export const useAppStore = create<AppStore>((set, get) => ({
  theme: (localStorage.getItem("layout_forge_theme") as ThemeMode) || "light",
  setTheme: (mode) => {
    localStorage.setItem("layout_forge_theme", mode);
    set({ theme: mode });
  },
  toggleTheme: () => {
    const next = get().theme === "light" ? "dark" : "light";
    localStorage.setItem("layout_forge_theme", next);
    set({ theme: next });
  },

  selectedStack: "html",
  setSelectedStack: (stack) => set({ selectedStack: stack }),
  enableRefinement: true,
  setEnableRefinement: (v) => set({ enableRefinement: v }),
  generationMode: "replicate",
  setGenerationMode: (mode) => set({ generationMode: mode }),

  brandKit: initialKit,
  setBrandKit: (kit) => {
    localStorage.setItem("layout_forge_brand_kit", JSON.stringify(kit));
    set({
      brandKit: kit,
      brandKitContext:
        kit.companyName !== "My Company"
          ? buildBrandKitPromptContext(kit)
          : undefined,
    });
  },
  brandKitContext:
    initialKit.companyName !== "My Company"
      ? buildBrandKitPromptContext(initialKit)
      : undefined,

  urlHistory: (() => {
    try {
      const h = localStorage.getItem("layout_forge_url_history");
      return h ? JSON.parse(h) : [];
    } catch {
      return [];
    }
  })(),
  addToUrlHistory: (url) => {
    const prev = get().urlHistory.filter((u) => u !== url);
    const next = [url, ...prev].slice(0, 20);
    localStorage.setItem("layout_forge_url_history", JSON.stringify(next));
    set({ urlHistory: next });
  },
  clearUrlHistory: () => {
    localStorage.removeItem("layout_forge_url_history");
    set({ urlHistory: [] });
  },

  showSettings: false,
  setShowSettings: (v) => set({ showSettings: v }),
}));
