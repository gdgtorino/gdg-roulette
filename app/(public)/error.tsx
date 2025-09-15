'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';

interface PublicErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function PublicError({ error, reset }: PublicErrorProps) {
  useEffect(() => {
    console.error('Public error:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
      <div className="text-center max-w-md">
        <div className="text-red-500 text-6xl mb-4">😞</div>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Oops! Something went wrong</h2>
        <p className="text-gray-600 mb-6">
          We encountered an error while loading the page. Please try again.
        </p>
        <div className="space-x-4">
          <Button onClick={reset}>Try Again</Button>
          <Button variant="outline" onClick={() => (window.location.href = '/')}>
            Go Home
          </Button>
        </div>
      </div>
    </div>
  );
}
