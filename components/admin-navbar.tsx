'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ThemeToggle } from './theme-toggle';

export function AdminNavbar() {
  const router = useRouter();

  const handleLogout = async () => {
    await fetch('/api/admin/logout', { method: 'POST' });
    router.push('/admin/login');
  };

  return (
    <div className="navbar bg-base-300">
      <div className="flex-1">
        <Link href="/admin/events" className="btn btn-ghost text-xl">
          event management
        </Link>
      </div>
      <div className="flex-none gap-2">
        <Link href="/admin/events" className="btn btn-ghost">
          events
        </Link>
        <Link href="/admin/admins" className="btn btn-ghost">
          admins
        </Link>
        <ThemeToggle />
        <button onClick={handleLogout} className="btn btn-ghost">
          logout
        </button>
      </div>
    </div>
  );
}