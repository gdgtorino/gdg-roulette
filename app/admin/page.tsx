'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function AdminPage() {
  const router = useRouter();

  useEffect(() => {
    // Always redirect to login page for admin root
    // The middleware will handle authentication checks
    router.replace('/admin/login');
  }, [router]);

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div>Redirecting...</div>
    </div>
  );
}
