import Link from 'next/link';

export function PublicNavigation() {
  return (
    <nav className="bg-white/90 backdrop-blur-sm shadow-sm">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          <Link href="/" className="text-xl font-bold text-gray-900">
            The Draw
          </Link>

          <div className="flex items-center space-x-6">
            <Link
              href="/register"
              className="text-gray-700 hover:text-gray-900 font-medium"
            >
              Register
            </Link>
            <Link
              href="/results"
              className="text-gray-700 hover:text-gray-900 font-medium"
            >
              Results
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}