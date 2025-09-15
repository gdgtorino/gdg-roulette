import { Suspense } from 'react';
import { RegistrationForm } from '@/components/public/RegistrationForm';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

export const metadata = {
  title: 'Register for Event - The Draw',
  description: 'Register to participate in the lottery draw',
};

export default function RegisterPage() {
  return (
    <div className="max-w-md mx-auto space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900">Join the Draw</h1>
        <p className="text-gray-600 mt-2">Register to participate in the lottery</p>
      </div>

      <div className="bg-white rounded-lg shadow-lg p-6">
        <Suspense fallback={<LoadingSpinner />}>
          <RegistrationForm />
        </Suspense>
      </div>
    </div>
  );
}
