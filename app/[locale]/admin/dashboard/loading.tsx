import { Card, CardContent, CardHeader } from '@/components/ui/card';

export default function DashboardLoading() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header Skeleton */}
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b dark:border-gray-700">
        <div className="mx-auto max-w-7xl px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <div className="h-8 bg-gray-200 dark:bg-gray-700 animate-pulse rounded w-64"></div>
              <div className="h-5 bg-gray-200 dark:bg-gray-700 animate-pulse rounded w-40"></div>
            </div>
            <div className="flex items-center space-x-3">
              <div className="h-10 w-32 bg-gray-200 dark:bg-gray-700 animate-pulse rounded"></div>
              <div className="h-10 w-24 bg-gray-200 dark:bg-gray-700 animate-pulse rounded"></div>
              <div className="h-10 w-20 bg-gray-200 dark:bg-gray-700 animate-pulse rounded"></div>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-6 py-6">
        {/* Create Event Card Skeleton */}
        <Card className="mb-8 dark:bg-gray-800 dark:border-gray-700">
          <CardHeader>
            <div className="h-6 bg-gray-200 dark:bg-gray-700 animate-pulse rounded w-40 mb-2"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 animate-pulse rounded w-64"></div>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <div className="flex-1 h-10 bg-gray-200 dark:bg-gray-700 animate-pulse rounded"></div>
              <div className="h-10 w-24 bg-gray-200 dark:bg-gray-700 animate-pulse rounded"></div>
            </div>
          </CardContent>
        </Card>

        {/* Events Grid Skeleton */}
        <div className="grid gap-6 lg:grid-cols-2">
          {[1, 2].map((i) => (
            <Card key={i} className="dark:bg-gray-800 dark:border-gray-700">
              <CardHeader>
                <div className="h-6 bg-gray-200 dark:bg-gray-700 animate-pulse rounded w-32 mb-2"></div>
                <div className="h-4 bg-gray-200 dark:bg-gray-700 animate-pulse rounded w-48"></div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[1, 2, 3].map((j) => (
                    <div
                      key={j}
                      className="h-20 bg-gray-200 dark:bg-gray-700 animate-pulse rounded"
                    ></div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
