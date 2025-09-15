import { useTranslations } from 'next-intl';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { HeaderControls } from '@/components/ClientComponents';
import { LoginForm } from './components/LoginForm';

export default function AdminPage() {
  const t = useTranslations();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-800 dark:to-gray-900 flex items-center justify-center p-4">
      <HeaderControls />
      <Card className="w-full max-w-md dark:bg-gray-800 dark:border-gray-700">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-gray-900 dark:text-white">
            {t('admin.loginTitle')}
          </CardTitle>
          <CardDescription className="dark:text-gray-300">
            {t('admin.loginDescription')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <LoginForm />
        </CardContent>
      </Card>
    </div>
  );
}
