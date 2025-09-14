import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

export default function EventLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-100 flex items-center justify-center">
      <div className="text-center">
        <LoadingSpinner size="lg" />
        <p className="text-gray-600 mt-4">Loading event...</p>
      </div>
    </div>
  );
}