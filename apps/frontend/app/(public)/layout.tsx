import { ReactNode } from 'react';
import { PublicNavigation } from '@/components/public/PublicNavigation';

interface PublicLayoutProps {
  children: ReactNode;
}

export default function PublicLayout({ children }: PublicLayoutProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <PublicNavigation />
      <main className="container mx-auto px-4 py-8">
        {children}
      </main>
    </div>
  );
}