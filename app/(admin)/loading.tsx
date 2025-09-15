import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

export default function AdminLoading() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <LoadingSpinner size="lg" />
        <p className="text-gray-600 mt-4">Loading admin panel...</p>
      </div>
    </div>
  );
}
