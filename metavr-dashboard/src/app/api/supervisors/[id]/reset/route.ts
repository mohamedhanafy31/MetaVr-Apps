import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest, hashPassword } from '@/lib/auth/session';
import { db } from '@/lib/firebase/admin';
import { writeLog } from '@/lib/logger';

const FALLBACK_PASSWORD = 'hiSupervisor123!';

export async function POST(request: NextRequest) {
  try {
    const session = getSessionFromRequest(request);
    if (!session || session.role !== 'admin') {
      return NextResponse.json(
        { success: false, message: 'Unauthorized - Admin access required' },
        { status: 401 },
      );
    }

    const pathSegments = request.nextUrl.pathname.split('/').filter(Boolean);
    // Path pattern: api/supervisors/[id]/reset
    const supervisorId = pathSegments[pathSegments.length - 2];

    if (!supervisorId) {
      return NextResponse.json(
        { success: false, message: 'Supervisor ID is required' },
        { status: 400 },
      );
    }

    const supervisorRef = db.collection('users').doc(supervisorId);
    const supervisorDoc = await supervisorRef.get();

    if (!supervisorDoc.exists) {
      return NextResponse.json(
        { success: false, message: 'Supervisor not found' },
        { status: 404 },
      );
    }

    const supervisorData = supervisorDoc.data();
    if (supervisorData?.role !== 'supervisor') {
      return NextResponse.json(
        { success: false, message: 'User is not a supervisor' },
        { status: 400 },
      );
    }

    const passwordHash = await hashPassword(FALLBACK_PASSWORD);
    await supervisorRef.update({
      passwordHash,
      passwordNeedsReset: true,
      updatedAt: new Date(),
      temporaryPasswordIssuedAt: new Date(),
    });

    await writeLog('supervisors.passwordReset.success', {
      userId: session.userId,
      targetSupervisorId: supervisorId,
    });

    return NextResponse.json({
      success: true,
      message: 'Supervisor password reset successfully',
      data: { password: FALLBACK_PASSWORD },
    });
  } catch (error) {
    console.error('Reset supervisor password error:', error);
    await writeLog('supervisors.passwordReset.error', { error: String(error) });
    return NextResponse.json(
      { success: false, message: 'Failed to reset supervisor password' },
      { status: 500 },
    );
  }
}


