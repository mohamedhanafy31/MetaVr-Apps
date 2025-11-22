import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/auth/session';
import { fetchSupervisorAccessCodes } from '@/lib/access-codes';

export async function GET(request: NextRequest) {
  try {
    const session = getSessionFromRequest(request);
    if (!session || !['admin', 'supervisor'].includes(session.role)) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 },
      );
    }

    const targetUserId =
      session.role === 'admin'
        ? (request.nextUrl.searchParams.get('supervisorId') || session.userId)
        : session.userId;

    const accessCodes = await fetchSupervisorAccessCodes(targetUserId);

    return NextResponse.json({
      success: true,
      data: accessCodes,
    });
  } catch (error) {
    console.error('Fetch supervisor access codes error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to load access codes' },
      { status: 500 },
    );
  }
}


