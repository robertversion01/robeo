'use client';

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import hu from './locales/hu.json';
import en from './locales/en.json';

const resources = {
  hu: { translation: hu },
  en: { translation: en },
};

if (!i18n.isInitialized) {
  void i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
      resources,
      fallbackLng: 'hu',
      lng: 'hu',
      supportedLngs: ['hu', 'en'],
      interpolation: { escapeValue: false },
      detection: {
        order: ['localStorage'],
        caches: ['localStorage'],
        lookupLocalStorage: 'robeo_lang',
      },
      react: { useSuspense: false },
    });
}

export default i18n;
