"use client";

import { useState, useEffect } from 'react';
import enTranslations from '@/public/locales/en/common.json';
import itTranslations from '@/public/locales/it/common.json';

type Translations = typeof enTranslations;

export function useTranslation() {
  const [translations, setTranslations] = useState<Translations>(itTranslations);
  const [locale, setLocale] = useState('it');

  useEffect(() => {
    const savedLang = localStorage.getItem('language') || 'it';
    setLocale(savedLang);
    setTranslations(savedLang === 'en' ? enTranslations : itTranslations);
  }, []);

  const t = (key: string): string => {
    const keys = key.split('.');
    let value: any = translations;
    
    for (const k of keys) {
      value = value?.[k];
    }
    
    return value || key;
  };

  return { t, locale };
}