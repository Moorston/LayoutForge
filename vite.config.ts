import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { defineConfig, loadEnv } from "vite";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, ".", "");

  /** Helper: read from vite env first, then process.env, fallback to empty string. */
  const e = (key: string) => JSON.stringify(env[key] ?? process.env[key] ?? "");

  return {
    plugins: [react(), tailwindcss()],
    define: {
      global: "window",

      // ── Active provider & model (non-secret hints for the UI) ──────────────
      "process.env.AI_PROVIDER": e("AI_PROVIDER"),
      "process.env.AI_MODEL_TEXT": e("AI_MODEL_TEXT"),
      "process.env.AI_MODEL_VISION": e("AI_MODEL_VISION"),
      "process.env.AI_API_BASE_URL": e("AI_API_BASE_URL"),

      // ── Legacy MiMo variables (kept for backwards compatibility) ───────────
      "process.env.MIMO_API_BASE_URL": e("MIMO_API_BASE_URL"),
      "process.env.MIMO_MODEL_TEXT": e("MIMO_MODEL_TEXT"),
      "process.env.MIMO_MODEL_VISION": e("MIMO_MODEL_VISION"),
      "process.env.MIMO_VISION_BASE_URL": e("MIMO_VISION_BASE_URL"),

      "process.env.NODE_ENV": JSON.stringify(mode),
    },
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== "true",
    },
  };
});
