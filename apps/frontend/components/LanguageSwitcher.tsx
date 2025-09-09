"use client";

import { useRouter, usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';

export default function LanguageSwitcher() {
  const router = useRouter();
  const pathname = usePathname();
  const [currentLang, setCurrentLang] = useState('it');

  useEffect(() => {
    const savedLang = localStorage.getItem('language') || 'it';
    setCurrentLang(savedLang);
  }, []);

  const toggleLanguage = () => {
    const newLang = currentLang === 'it' ? 'en' : 'it';
    setCurrentLang(newLang);
    localStorage.setItem('language', newLang);
    // Reload page to apply new language
    window.location.reload();
  };

  return (
    <button
      onClick={toggleLanguage}
      className="px-3 py-2 rounded-lg bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors flex items-center gap-2"
      aria-label="Switch language"
    >
      <span className="text-lg">
        {currentLang === 'it' ? '🇮🇹' : '🇬🇧'}
      </span>
      <span className="text-sm font-medium dark:text-white">
        {currentLang === 'it' ? 'IT' : 'EN'}
      </span>
    </button>
  );
}