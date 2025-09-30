'use client';

import { useEffect, useState } from 'react';
import type { Language } from '@/lib/i18n';

export function LanguageToggle() {
  const [language, setLanguage] = useState<Language>('en');

  useEffect(() => {
    // Check saved language or browser language
    const savedLang = localStorage.getItem('language') as Language;
    const browserLang = navigator.language.startsWith('it') ? 'it' : 'en';
    const initialLang = savedLang || browserLang;

    setLanguage(initialLang);
    document.documentElement.setAttribute('lang', initialLang);
  }, []);

  const toggleLanguage = () => {
    const newLang: Language = language === 'en' ? 'it' : 'en';
    setLanguage(newLang);
    localStorage.setItem('language', newLang);
    document.documentElement.setAttribute('lang', newLang);

    // Trigger event for other components to update
    window.dispatchEvent(new CustomEvent('languagechange', { detail: newLang }));
  };

  return (
    <button
      onClick={toggleLanguage}
      className="p-2 rounded-xl hover:bg-white/50 dark:hover:bg-gray-800/50 transition-all font-semibold text-sm"
      aria-label="toggle language"
      title={language === 'en' ? 'Switch to Italian' : 'Passa all\'inglese'}
    >
      <span className="text-gray-700 dark:text-gray-300">
        {language === 'en' ? '🇬🇧 EN' : '🇮🇹 IT'}
      </span>
    </button>
  );
}