import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/auth/session';
import { getUserUsageSummary } from '@/lib/analytics/user-usage';

const AUTHORIZED_ROLES = ['admin'];

function parseDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function resolveRange(range?: string | null, startParam?: string | null, endParam?: string | null) {
  const now = new Date();
  const manualStart = parseDate(startParam);
  const manualEnd = parseDate(endParam);

  if (manualStart || manualEnd) {
    return {
      start: manualStart ?? null,
      end: manualEnd ?? now,
    };
  }

  switch (range) {
    case '24h':
      return { start: new Date(now.getTime() - 24 * 60 * 60 * 1000), end: now };
    case '7d':
      return { start: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000), end: now };
    case '30d':
      return { start: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000), end: now };
    default:
      return { start: null, end: now };
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = getSessionFromRequest(request);
    if (!session || !AUTHORIZED_ROLES.includes(session.role)) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const range = searchParams.get('range');
    const startParam = searchParams.get('start');
    const endParam = searchParams.get('end');
    const limitParam = searchParams.get('limit');

    const limit = Math.min(Math.max(Number(limitParam) || 1000, 1), 5000);
    const { start, end } = resolveRange(range, startParam, endParam);

    const summary = await getUserUsageSummary({
      start: start ?? undefined,
      end: end ?? undefined,
      limit,
    });

    return NextResponse.json({
      success: true,
      data: summary,
    });
  } catch (error) {
    console.error('Get user usage summary error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch user usage summary' },
      { status: 500 },
    );
  }
}


