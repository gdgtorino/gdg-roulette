import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { HeaderControls } from '@/components/ClientComponents';

export default function HomePage() {
  const t = useTranslations();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-800 dark:to-gray-900 flex items-center justify-center p-4">
      <HeaderControls />
      <Card className="w-full max-w-md dark:bg-gray-800 dark:border-gray-700">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold text-gray-900 dark:text-white">
            {t('lottery.title')}
          </CardTitle>
          <CardDescription className="text-lg dark:text-gray-300">
            {t('lottery.description')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Link href="/admin" className="block">
            <Button className="w-full" size="lg">
              {t('lottery.admin')}
            </Button>
          </Link>
          <div className="text-center text-sm text-gray-600 dark:text-gray-400">
            {t('lottery.description')}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
