'use client';

import { useEffect, useState } from 'react';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);

    // get saved theme or detect os preference
    const savedTheme = localStorage.getItem('theme');
    const osTheme = window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light';

    const theme = savedTheme || osTheme;
    document.documentElement.setAttribute('data-theme', theme);
  }, []);

  if (!mounted) {
    return null; // prevent ssr mismatch
  }

  return <>{children}</>;
}