import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, Moon, Sun, Globe } from "lucide-react";
import { useAppStore } from "@/stores/appStore";

export function SettingsPanel() {
  const { showSettings, setShowSettings, theme, toggleTheme, urlHistory, clearUrlHistory } = useAppStore();

  return (
    <AnimatePresence>
      {showSettings && (
        <>
          <motion.div
            key="settings-backdrop"
            className="fixed inset-0 bg-slate-900/20 z-40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowSettings(false)}
          />
          <motion.div
            key="settings-panel"
            className="fixed right-0 top-0 h-screen w-[400px] bg-white z-50 flex flex-col shadow-2xl border-l border-slate-200"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ ease: [0.32, 0.72, 0, 1], duration: 0.3 }}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-white">
              <h2 className="text-sm font-extrabold text-slate-900 tracking-tight">Preferences</h2>
              <button onClick={() => setShowSettings(false)} className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors" aria-label="Close settings">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200">
                <div className="flex items-center gap-3">
                  {theme === "dark" ? <Moon className="w-5 h-5 text-slate-700" /> : <Sun className="w-5 h-5 text-slate-700" />}
                  <div>
                    <p className="text-sm font-bold text-slate-900">Theme</p>
                    <p className="text-[10px] text-slate-500">{theme === "dark" ? "Dark mode" : "Light mode"}</p>
                  </div>
                </div>
                <button onClick={toggleTheme}
                  className={`relative w-12 h-6 rounded-full transition-colors ${theme === "dark" ? "bg-slate-900" : "bg-slate-300"}`}
                  aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
                >
                  <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${theme === "dark" ? "translate-x-6" : "translate-x-0.5"}`} />
                </button>
              </div>

              <div>
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-3">URL History</p>
                {urlHistory.length === 0 ? (
                  <p className="text-xs text-slate-400">No recent URLs.</p>
                ) : (
                  <div className="space-y-1">
                    {urlHistory.slice(0, 10).map((url, i) => (
                      <div key={i} className="flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-lg">
                        <Globe className="w-3 h-3 text-slate-400 shrink-0" />
                        <span className="text-xs text-slate-600 truncate">{url}</span>
                      </div>
                    ))}
                    <button onClick={clearUrlHistory} className="text-[10px] font-bold text-red-500 hover:text-red-700 mt-2">
                      Clear history
                    </button>
                  </div>
                )}
              </div>

              <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
                <p className="text-xs font-bold text-amber-800">Keyboard Shortcuts</p>
                <div className="mt-2 space-y-1 text-[11px] text-amber-700">
                  <p><kbd className="px-1.5 py-0.5 bg-amber-100 rounded text-[10px] font-mono">Ctrl+S</kbd> Save project</p>
                  <p><kbd className="px-1.5 py-0.5 bg-amber-100 rounded text-[10px] font-mono">Esc</kbd> Close panel / Exit fullscreen</p>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
