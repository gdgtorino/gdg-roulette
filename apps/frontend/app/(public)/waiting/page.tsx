import { Suspense } from 'react';
import { WaitingRoom } from '@/components/public/WaitingRoom';
import { ParticipantStatus } from '@/components/public/ParticipantStatus';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

export const metadata = {
  title: 'Waiting Room - The Draw',
  description: 'Waiting for the lottery draw to begin',
};

export default function WaitingPage() {
  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900">Waiting Room</h1>
        <p className="text-gray-600 mt-2">The draw will begin soon</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <Suspense fallback={<LoadingSpinner />}>
            <WaitingRoom />
          </Suspense>
        </div>

        <div>
          <Suspense fallback={<LoadingSpinner />}>
            <ParticipantStatus />
          </Suspense>
        </div>
      </div>
    </div>
  );
}