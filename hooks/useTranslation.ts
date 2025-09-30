'use client';

import { useState, useEffect } from 'react';
import { translations, type Language, type TranslationKey } from '@/lib/i18n';

export function useTranslation() {
  const [language, setLanguage] = useState<Language>('en');

  useEffect(() => {
    // Get initial language
    const savedLang = localStorage.getItem('language') as Language;
    const browserLang = navigator.language.startsWith('it') ? 'it' : 'en';
    setLanguage(savedLang || browserLang);

    // Listen for language changes
    const handleLanguageChange = (e: CustomEvent<Language>) => {
      setLanguage(e.detail);
    };

    window.addEventListener('languagechange', handleLanguageChange as EventListener);
    return () => window.removeEventListener('languagechange', handleLanguageChange as EventListener);
  }, []);

  const t = (key: TranslationKey, replacements?: Record<string, string>): string => {
    let text = translations[language][key] || translations['en'][key] || key;

    // Replace placeholders like {name}
    if (replacements) {
      Object.entries(replacements).forEach(([key, value]) => {
        text = text.replace(`{${key}}`, value);
      });
    }

    return text;
  };

  return { t, language };
}