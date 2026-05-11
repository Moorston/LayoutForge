/**
 * Language switcher component.
 *
 * Toggles between English and Chinese locales.
 * Preference is persisted in localStorage via i18next.
 */

import { useTranslation } from "react-i18next";

const LANGS = [
  { code: "en", label: "EN" },
  { code: "zh", label: "中文" },
] as const;

export function LanguageSwitcher() {
  const { i18n } = useTranslation();

  return (
    <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-full p-0.5">
      {LANGS.map(({ code, label }) => (
        <button
          key={code}
          onClick={() => i18n.changeLanguage(code)}
          className={`px-2.5 py-1 text-[10px] font-bold rounded-full transition-all ${
            i18n.language === code
              ? "bg-slate-900 text-white"
              : "text-slate-400 hover:text-slate-700"
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
