'use client';

import DarkModeToggle from '@/components/DarkModeToggle';
import LanguageSwitcher from '@/components/LanguageSwitcher';

export function HeaderControls() {
  return (
    <div className="absolute top-4 right-4 flex gap-2">
      <LanguageSwitcher />
      <DarkModeToggle />
    </div>
  );
}
