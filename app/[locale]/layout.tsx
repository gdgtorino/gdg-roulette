import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { cookies } from 'next/headers';
import { unstable_noStore } from 'next/cache';
import '../globals.css';
import { ThemeProvider } from '@/components/ThemeProvider';

const locales = ['en', 'it'];

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params: { locale },
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  // Mark as dynamic due to cookies usage
  unstable_noStore();

  // Validate that the incoming `locale` parameter is valid
  if (!locales.includes(locale)) notFound();

  // Providing all messages to the client
  // side is the easiest way to get started
  const messages = await getMessages();

  // Get theme from cookies
  const cookieStore = cookies();
  const themeValue = cookieStore.get('theme')?.value;
  const theme = (themeValue === 'dark' ? 'dark' : 'light') as 'light' | 'dark';

  return (
    <html lang={locale} suppressHydrationWarning className={theme}>
      <body className="bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100">
        <NextIntlClientProvider messages={messages}>
          <ThemeProvider initialTheme={theme}>{children}</ThemeProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
