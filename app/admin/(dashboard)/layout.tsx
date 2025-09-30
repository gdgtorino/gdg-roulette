import { redirect } from 'next/navigation';
import { getCurrentAdmin } from '@/lib/auth/middleware';
import { AdminNavbar } from '@/components/admin-navbar';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const admin = await getCurrentAdmin();

  if (!admin) {
    redirect('/admin/login');
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-100 via-purple-100 to-pink-100 dark:from-gray-900 dark:via-purple-900 dark:to-gray-900">
      <AdminNavbar />
      <main className="container mx-auto p-8">{children}</main>
    </div>
  );
}