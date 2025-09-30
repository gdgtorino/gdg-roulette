import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/middleware';
import { prisma } from '@/lib/db/prisma';

// remove participant
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; participantId: string }> }
) {
  try {
    await requireAuth();
    const { participantId } = await params;

    await prisma.participant.delete({
      where: { id: participantId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message === 'unauthorized') {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }

    return NextResponse.json(
      { error: 'internal server error' },
      { status: 500 }
    );
  }
}