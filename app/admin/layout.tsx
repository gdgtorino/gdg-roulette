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
    <div className="min-h-screen">
      <AdminNavbar />
      <main className="container mx-auto p-8">{children}</main>
    </div>
  );
}