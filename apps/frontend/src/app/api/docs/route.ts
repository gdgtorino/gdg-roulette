import { NextResponse } from 'next/server';
import { swaggerSpec } from '@/lib/swagger';

export async function GET() {
  // Only allow access in non-production environments
  if (process.env.NODE_ENV === 'production') {
    return new NextResponse('Not Found', { status: 404 });
  }

  return NextResponse.json(swaggerSpec);
}