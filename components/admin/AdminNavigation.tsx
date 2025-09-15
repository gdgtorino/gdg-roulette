import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { signOut } from '@/lib/auth/session';

interface AdminNavigationProps {
  user?: {
    name?: string;
    email?: string;
  };
}

export function AdminNavigation({ user }: AdminNavigationProps) {
  return (
    <nav className="bg-white shadow-sm border-b">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-8">
            <Link href="/admin/dashboard" className="text-xl font-bold text-gray-900">
              The Draw Admin
            </Link>

            <div className="hidden md:flex space-x-6">
              <Link
                href="/admin/dashboard"
                className="text-gray-700 hover:text-gray-900 font-medium"
              >
                Dashboard
              </Link>
              <Link href="/admin/events" className="text-gray-700 hover:text-gray-900 font-medium">
                Events
              </Link>
              <Link
                href="/admin/settings"
                className="text-gray-700 hover:text-gray-900 font-medium"
              >
                Settings
              </Link>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-600">Welcome, {user?.name || user?.email || 'Admin'}</span>
            <form onSubmit={(e) => { e.preventDefault(); signOut(); }}>
              <Button variant="outline" size="sm" type="submit">
                Logout
              </Button>
            </form>
          </div>
        </div>
      </div>
    </nav>
  );
}
