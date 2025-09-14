'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';

// Dynamically import SwaggerUI to avoid SSR issues
const SwaggerUI = dynamic(() => import('swagger-ui-react'), { ssr: false });

export default function ApiDocsPage() {
  const [swaggerSpec, setSwaggerSpec] = useState(null);
  const [isProduction, setIsProduction] = useState(false);

  useEffect(() => {
    fetch('/api/docs')
      .then(response => {
        if (response.status === 404) {
          setIsProduction(true);
          return null;
        }
        return response.json();
      })
      .then(spec => {
        if (spec) {
          setSwaggerSpec(spec);
        }
      })
      .catch(error => {
        console.error('Failed to load API documentation:', error);
      });
  }, []);

  if (isProduction) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-4">API Documentation</h1>
        <p className="text-gray-600">
          API documentation is only available in development environments.
        </p>
      </div>
    );
  }

  if (!swaggerSpec) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-4">Loading API Documentation...</h1>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">The Draw API Documentation</h1>
      <SwaggerUI spec={swaggerSpec} />
    </div>
  );
}