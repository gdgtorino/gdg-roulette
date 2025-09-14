import { Suspense } from 'react';
import { ResultsDisplay } from '@/components/public/ResultsDisplay';
import { WinnersList } from '@/components/public/WinnersList';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

export const metadata = {
  title: 'Results - The Draw',
  description: 'Lottery draw results and winners',
};

export default function ResultsPage() {
  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900">Draw Results</h1>
        <p className="text-gray-600 mt-2">Congratulations to all winners!</p>
      </div>

      <Suspense fallback={<LoadingSpinner />}>
        <ResultsDisplay />
      </Suspense>

      <Suspense fallback={<LoadingSpinner />}>
        <WinnersList />
      </Suspense>
    </div>
  );
}