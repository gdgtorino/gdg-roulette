import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

export default function PublicLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
      <div className="text-center">
        <LoadingSpinner size="lg" />
        <p className="text-gray-600 mt-4">Loading...</p>
      </div>
    </div>
  );
}
