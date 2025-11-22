import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/auth/session';
import {
  getPageActivitySummary,
  getSupervisorAppConfigUsage,
} from '@/lib/analytics/page-activity';

const AUTHORIZED_ROLES = ['admin', 'moderator'];

function parseDate(value: string | null): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function resolveRange(
  rangeParam: string | null,
  startParam: string | null,
  endParam: string | null,
) {
  const now = new Date();
  const startFromParam = parseDate(startParam);
  const endFromParam = parseDate(endParam);

  if (startFromParam || endFromParam) {
    return {
      start: startFromParam ?? null,
      end: endFromParam ?? now,
    };
  }

  switch (rangeParam) {
    case '7d': {
      return { start: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000), end: now };
    }
    case '30d': {
      return { start: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000), end: now };
    }
    case '24h': {
      return { start: new Date(now.getTime() - 24 * 60 * 60 * 1000), end: now };
    }
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

    // Extract ID from URL
    const url = new URL(request.url);
    const pathSegments = url.pathname.split('/');
    const supervisorId = pathSegments[pathSegments.length - 2]; // -2 because last segment is "usage"
    if (!supervisorId) {
      return NextResponse.json(
        { success: false, message: 'Supervisor ID is required' },
        { status: 400 },
      );
    }

    const { searchParams } = new URL(request.url);
    const pageType = searchParams.get('pageType') ?? 'all';
    const rangeParam = searchParams.get('range');
    const startParam = searchParams.get('start');
    const endParam = searchParams.get('end');
    const limitParam = searchParams.get('limit');

    const limit = Math.min(Math.max(Number(limitParam) || 500, 1), 5000);
    const { start, end } = resolveRange(rangeParam, startParam, endParam);

    const [summary, appConfigUsage] = await Promise.all([
      getPageActivitySummary({
        supervisorId,
        start: start ?? undefined,
        end: end ?? undefined,
        limit,
      }),
      getSupervisorAppConfigUsage(supervisorId, null, {
        start: start ?? undefined,
        end: end ?? undefined,
      }),
    ]);

    const entries = summary.topPages.filter((page) => {
      if (pageType === 'all') return true;
      return page.pageType === pageType;
    });

    return NextResponse.json({
      success: true,
      data: {
        supervisorId,
        totals: summary.totals,
        entries,
        appConfigUsage,
        range: summary.range,
      },
    });
  } catch (error) {
    console.error('Fetch supervisor usage error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch supervisor usage' },
      { status: 500 },
    );
  }
}


