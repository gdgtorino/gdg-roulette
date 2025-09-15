import { notFound } from 'next/navigation';
import { getRequestConfig } from 'next-intl/server';

// Can be imported from a shared config
const locales = ['en', 'it'];

export default getRequestConfig(async ({ locale }) => {
  // Validate that the incoming `locale` parameter is valid
  if (!locales.includes(locale as string)) notFound();

  return {
    locale: locale as string,
    messages: (await import(`./public/locales/${locale}/common.json`)).default,
  };
});
