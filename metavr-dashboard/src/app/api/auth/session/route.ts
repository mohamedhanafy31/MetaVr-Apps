import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/auth/session';

/**
 * GET /api/auth/session
 * Check if the current session is valid
 */
export async function GET(request: NextRequest) {
  try {
    const session = getSessionFromRequest(request);

    if (!session) {
      return NextResponse.json(
        { success: false, message: 'No valid session found', expired: true },
        { status: 401 }
      );
    }

    // Check if session is expired
    if (session.expiresAt && session.expiresAt < Date.now()) {
      return NextResponse.json(
        { success: false, message: 'Session expired', expired: true },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      session: {
        userId: session.userId,
        email: session.email,
        role: session.role,
        expiresAt: session.expiresAt,
      },
    });
  } catch (error) {
    console.error('[api] Session check error:', error);
    return NextResponse.json(
      { success: false, message: 'Session check failed', expired: false },
      { status: 500 }
    );
  }
}

