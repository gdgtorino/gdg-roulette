"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import DarkModeToggle from "@/components/DarkModeToggle";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { useTranslation } from "@/hooks/useTranslation";

export default function HomePage() {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-800 dark:to-gray-900 flex items-center justify-center p-4">
      <div className="absolute top-4 right-4 flex gap-2">
        <LanguageSwitcher />
        <DarkModeToggle />
      </div>
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