import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function QRPageLoading() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header Skeleton */}
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b dark:border-gray-700">
        <div className="mx-auto max-w-4xl px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <div className="h-8 bg-gray-200 dark:bg-gray-700 animate-pulse rounded w-48"></div>
              <div className="h-5 bg-gray-200 dark:bg-gray-700 animate-pulse rounded w-64"></div>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-10 w-32 bg-gray-200 dark:bg-gray-700 animate-pulse rounded"></div>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-6 py-6">
        <div className="grid gap-6 lg:grid-cols-2">
          {/* QR Code Card Skeleton */}
          <Card className="dark:bg-gray-800 dark:border-gray-700">
            <CardHeader>
              <div className="h-6 bg-gray-200 dark:bg-gray-700 animate-pulse rounded w-40 mb-2"></div>
              <div className="h-4 bg-gray-200 dark:bg-gray-700 animate-pulse rounded w-56"></div>
            </CardHeader>
            <CardContent className="text-center">
              <div className="mb-6 flex justify-center">
                <div className="w-64 h-64 bg-gray-200 dark:bg-gray-700 animate-pulse rounded-lg"></div>
              </div>
              <div className="mb-4">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 animate-pulse rounded w-32 mb-2 mx-auto"></div>
                <div className="h-10 bg-gray-200 dark:bg-gray-700 animate-pulse rounded"></div>
              </div>
              <div className="mb-6">
                <div className="h-8 bg-gray-200 dark:bg-gray-700 animate-pulse rounded w-32 mx-auto"></div>
              </div>
              <div className="h-12 bg-gray-200 dark:bg-gray-700 animate-pulse rounded w-48 mx-auto"></div>
            </CardContent>
          </Card>

          {/* Participants List Skeleton */}
          <Card className="dark:bg-gray-800 dark:border-gray-700">
            <CardHeader>
              <div className="h-6 bg-gray-200 dark:bg-gray-700 animate-pulse rounded w-48 mb-2"></div>
              <div className="h-4 bg-gray-200 dark:bg-gray-700 animate-pulse rounded w-40"></div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="h-16 bg-gray-200 dark:bg-gray-700 animate-pulse rounded-lg"></div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}