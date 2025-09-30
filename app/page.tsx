'use client';

import Link from 'next/link';
import { useTranslation } from '@/hooks/useTranslation';

export default function Home() {
  const { t } = useTranslation();

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-100 via-purple-100 to-pink-100 dark:from-gray-900 dark:via-purple-900 dark:to-gray-900 p-4">
      <div className="text-center">
        <h1 className="text-6xl font-bold mb-6 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent animate-gradient">
          {t('gdg_torino')}
        </h1>
        <p className="text-xl text-gray-600 dark:text-gray-400 mb-8">
          {t('event_raffle_system')}
        </p>
        <Link
          href="/admin/login"
          className="inline-block py-4 px-8 rounded-2xl bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 text-white font-semibold shadow-lg hover:shadow-2xl transform hover:scale-[1.05] active:scale-[0.98] transition-all duration-300"
        >
          {t('admin_login')}
        </Link>
      </div>
    </main>
  );
}