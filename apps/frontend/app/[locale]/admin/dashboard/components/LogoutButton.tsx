'use client';

import { Button } from "@/components/ui/button";
import { useTranslation } from "@/hooks/useTranslation";
import { logout } from '@/lib/actions/auth';

export function LogoutButton() {
  const { t } = useTranslation();

  return (
    <form action={logout}>
      <Button variant="outline" type="submit">
        {t('admin.logout')}
      </Button>
    </form>
  );
}