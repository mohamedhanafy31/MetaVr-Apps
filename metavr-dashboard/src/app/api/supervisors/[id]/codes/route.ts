import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/auth/session';
import { regenerateAccessCodeWithBackend } from '@/lib/access-codes';

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const session = getSessionFromRequest(request);
    if (!session || session.role !== 'admin') {
      return NextResponse.json(
        { success: false, message: 'Unauthorized - Admin access required' },
        { status: 401 },
      );
    }

    const { id } = await context.params;
    const body = await request.json();
    const appKey = body?.appKey;

    if (!appKey || typeof appKey !== 'string') {
      return NextResponse.json(
        { success: false, message: 'appKey is required' },
        { status: 400 },
      );
    }

    const response = await regenerateAccessCodeWithBackend(request, id, appKey);

    return NextResponse.json({
      success: true,
      data: response?.data || null,
    });
  } catch (error) {
    console.error('Regenerate access code error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to regenerate access code' },
      { status: 500 },
    );
  }
}


