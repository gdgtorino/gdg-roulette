import { NextRequest, NextResponse } from 'next/server';
import { redisService } from '@/lib/redis';
import { validateAuth, createAuthResponse } from '@/lib/auth-middleware';

// Delete admin (protected) - prevent self-deletion
export async function DELETE(
  request: NextRequest,
  { params }: { params: { username: string } }
) {
  const admin = validateAuth(request);

  if (!admin) {
    return createAuthResponse('Access token required');
  }

  try {
    const { username } = params;

    // Prevent self-deletion
    if (username === admin.username) {
      return NextResponse.json(
        { error: 'Cannot delete yourself' },
        { status: 400 }
      );
    }

    const adminToDelete = await redisService.getAdmin(username);
    if (!adminToDelete) {
      return NextResponse.json(
        { error: 'Admin not found' },
        { status: 404 }
      );
    }

    await redisService.deleteAdmin(username);
    return NextResponse.json({ message: 'Admin deleted successfully' });
  } catch (error) {
    console.error('Delete admin error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}