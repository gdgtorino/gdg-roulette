"use client";

import { useRouter, usePathname } from 'next/navigation';
import { useLocale } from 'next-intl';

export default function LanguageSwitcher() {
  const router = useRouter();
  const pathname = usePathname();
  const locale = useLocale();

  const toggleLanguage = () => {
    const newLocale = locale === 'it' ? 'en' : 'it';

    // Replace the locale in the current pathname
    const segments = pathname.split('/');
    segments[1] = newLocale; // Replace the locale segment
    const newPath = segments.join('/');

    router.push(newPath);
  };

  return (
    <button
      onClick={toggleLanguage}
      className="px-3 py-2 rounded-lg bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors flex items-center gap-2"
      aria-label="Switch language"
    >
      <span className="text-lg">
        {locale === 'it' ? '🇮🇹' : '🇬🇧'}
      </span>
      <span className="text-sm font-medium dark:text-white">
        {locale === 'it' ? 'IT' : 'EN'}
      </span>
    </button>
  );
}