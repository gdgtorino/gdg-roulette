import { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { AdminNavigation } from '@/components/admin/AdminNavigation';
import { checkAuthSession } from '@/lib/auth/session';

interface AdminLayoutProps {
  children: ReactNode;
}

export default async function AdminLayout({ children }: AdminLayoutProps) {
  const session = await checkAuthSession();

  if (!session || !session.adminId) {
    redirect('/admin');
  }

  // Create user object from session data for AdminNavigation
  const user = {
    name: session.username,
    email: session.username // Using username as fallback for email
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNavigation user={user} />
      <main className="container mx-auto px-4 py-8">
        {children}
      </main>
    </div>
  );
}