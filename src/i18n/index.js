import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { LANGUAGES, DEFAULT_LANGUAGE, getLanguageConfig } from './languages';

import en from './locales/en.json';
import hi from './locales/hi.json';
import mr from './locales/mr.json';
import gu from './locales/gu.json';
import bn from './locales/bn.json';
import ta from './locales/ta.json';
import te from './locales/te.json';
import kn from './locales/kn.json';
import ml from './locales/ml.json';
import pa from './locales/pa.json';
import or from './locales/or.json';
import as from './locales/as.json';
import ur from './locales/ur.json';

const resources = {
  en: { translation: en },
  hi: { translation: hi },
  mr: { translation: mr },
  gu: { translation: gu },
  bn: { translation: bn },
  ta: { translation: ta },
  te: { translation: te },
  kn: { translation: kn },
  ml: { translation: ml },
  pa: { translation: pa },
  or: { translation: or },
  as: { translation: as },
  ur: { translation: ur },
};

export const STORAGE_KEY = 'dukaansathi_language';

// Detect initial language safely from URL query param, localStorage or fallback to English
const getInitialLang = () => {
  if (typeof window === 'undefined') return DEFAULT_LANGUAGE;
  try {
    const urlParams = new URLSearchParams(window.location.search);
    const queryLang = urlParams.get('lang');
    if (queryLang && resources[queryLang]) return queryLang;
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && resources[saved]) return saved;
  } catch (e) {
    console.warn('[i18n] Error reading initial language:', e);
  }
  return DEFAULT_LANGUAGE;
};

const initialLanguage = getInitialLang();

// Apply initial document direction and lang synchronously to prevent UI flicker
if (typeof document !== 'undefined') {
  const cfg = getLanguageConfig(initialLanguage);
  document.documentElement.lang = cfg.code;
  document.documentElement.dir = cfg.dir;
}

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: initialLanguage,
    fallbackLng: DEFAULT_LANGUAGE,
    interpolation: {
      escapeValue: false, // React already escapes values
    },
    react: {
      useSuspense: false,
    },
  });

// Listen to language change to update localStorage and document direction (LTR/RTL)
i18n.on('languageChanged', (lng) => {
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_KEY, lng);
    } catch (e) {
      console.warn('[i18n] Failed to save language to localStorage:', e);
    }
    const cfg = getLanguageConfig(lng);
    document.documentElement.lang = cfg.code;
    document.documentElement.dir = cfg.dir;
  }
});

export default i18n;
