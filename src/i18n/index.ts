/**
 * i18n configuration using i18next + react-i18next.
 *
 * Supports English (default) and Chinese (zh) locales.
 * Locale is detected from browser language and persisted in localStorage.
 */

import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "./locales/en.json";
import zh from "./locales/zh.json";

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    zh: { translation: zh },
  },
  lng: localStorage.getItem("layoutforge_lang") || undefined, // fallback to browser detection
  fallbackLng: "en",
  interpolation: {
    escapeValue: false, // React already escapes
  },
});

// Persist language preference
i18n.on("languageChanged", (lng) => {
  localStorage.setItem("layoutforge_lang", lng);
});

export default i18n;
