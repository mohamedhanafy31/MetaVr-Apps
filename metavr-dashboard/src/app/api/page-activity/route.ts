import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/auth/session';
import { db } from '@/lib/firebase/admin';
import { getPageActivitySummary } from '@/lib/analytics/page-activity';

const ALLOWED_POST_ROLES = ['supervisor', 'admin'];
const ALLOWED_GET_ROLES = ['admin'];

function parseDate(value: string | null): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      pageId,
      pageName,
      pageType = 'other',
      enteredAt,
      exitedAt,
      metadata,
      sessionId,
      action, // 'opened' | 'session' | null
      appId, // For config pages
      supervisorId: bodySupervisorId, // For app tracking (from URL params)
      userId: bodyUserId,
      userEmail: bodyUserEmail,
      userRole: bodyUserRole,
    } = body || {};

    // Try to get session (for dashboard requests)
    const session = getSessionFromRequest(request);
    let supervisorId: string | undefined;
    let userRole: string;
    let userId: string | undefined;
    let resolvedUserEmail: string | undefined;

    if (session && ALLOWED_POST_ROLES.includes(session.role)) {
      // Authenticated request from dashboard
      supervisorId = session.userId;
      userRole = session.role;
    } else if (bodyUserId && typeof bodyUserId === 'string' && bodyUserRole === 'user') {
      const userDoc = await db.collection('users').doc(bodyUserId).get();
      if (!userDoc.exists) {
        return NextResponse.json(
          { success: false, message: 'Invalid user ID' },
          { status: 400 },
        );
      }
      const userData = userDoc.data();
      if (userData?.role !== 'user') {
        return NextResponse.json(
          { success: false, message: 'Invalid user ID' },
          { status: 400 },
        );
      }

      userId = bodyUserId;
      resolvedUserEmail = typeof bodyUserEmail === 'string' ? bodyUserEmail : (userData?.email as string | undefined);
      userRole = 'user';

      const providedSupervisorId = typeof bodySupervisorId === 'string' ? bodySupervisorId : undefined;
      if (providedSupervisorId) {
        const supervisorDoc = await db.collection('users').doc(providedSupervisorId).get();
        if (!supervisorDoc.exists || supervisorDoc.data()?.role !== 'supervisor') {
          return NextResponse.json(
            { success: false, message: 'Invalid supervisor ID' },
            { status: 400 },
          );
        }
        supervisorId = providedSupervisorId;
      } else if (appId && userData?.accessSupervisors) {
        const supervisorMap = userData.accessSupervisors as Record<string, string>;
        supervisorId = supervisorMap?.[appId];
      }

      if (!supervisorId) {
        return NextResponse.json(
          { success: false, message: 'Supervisor reference required for user tracking' },
          { status: 400 },
        );
      }
    } else if (bodySupervisorId && typeof bodySupervisorId === 'string') {
      // Unauthenticated request from app (supervisorId from URL params)
      // Validate supervisor exists
      const supervisorDoc = await db.collection('users').doc(bodySupervisorId).get();
      if (!supervisorDoc.exists) {
        return NextResponse.json(
          { success: false, message: 'Invalid supervisor ID' },
          { status: 400 },
        );
      }
      const supervisorData = supervisorDoc.data();
      if (supervisorData?.role !== 'supervisor') {
        return NextResponse.json(
          { success: false, message: 'Invalid supervisor ID' },
          { status: 400 },
        );
      }
      supervisorId = bodySupervisorId;
      userRole = 'supervisor';
    } else {
      return NextResponse.json(
        { success: false, message: 'Unauthorized - session or supervisorId required' },
        { status: 401 },
      );
    }

    if (!pageId || typeof pageId !== 'string') {
      return NextResponse.json(
        { success: false, message: 'pageId is required' },
        { status: 400 },
      );
    }

    if (userRole === 'user' && (!appId || typeof appId !== 'string')) {
      return NextResponse.json(
        { success: false, message: 'appId is required for user events' },
        { status: 400 },
      );
    }

    const enteredDate = parseDate(enteredAt) ?? new Date();
    let exitedDate = parseDate(exitedAt);
    
    // For "opened" events, set exitedAt same as enteredAt
    if (action === 'opened') {
      exitedDate = enteredDate;
    } else {
      exitedDate = exitedDate ?? new Date();
    }

    if (exitedDate.getTime() < enteredDate.getTime()) {
      return NextResponse.json(
        { success: false, message: 'exitedAt must be after enteredAt' },
        { status: 400 },
      );
    }

    const timeSpentMs = action === 'opened' ? 0 : exitedDate.getTime() - enteredDate.getTime();
    const metadataPayload =
      metadata && typeof metadata === 'object'
        ? metadata
        : undefined;

    const requestSource = userId
      ? 'user-app'
      : bodySupervisorId
        ? 'app-config-page'
        : 'dashboard';

    await db.collection('page_activity_logs').add({
      supervisorId,
      userId: userId ?? null,
      userEmail: resolvedUserEmail ?? null,
      userRole,
      pageId,
      pageName: pageName ?? null,
      pageType,
      action: action ?? null, // 'opened' | 'session' | null
      appId: appId ?? null, // For config pages
      sessionId: sessionId ?? null,
      metadata: {
        ...(metadataPayload || {}),
        userAgent: request.headers.get('user-agent'),
        source: requestSource,
      },
      enteredAt: enteredDate,
      exitedAt: exitedDate,
      timeSpentMs,
      createdAt: new Date(),
    });

    // Add CORS headers for cross-origin requests from apps
    const response = NextResponse.json({ success: true });
    const origin = request.headers.get('origin');
    if (origin) {
      response.headers.set('Access-Control-Allow-Origin', origin);
      response.headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
      response.headers.set('Access-Control-Allow-Headers', 'Content-Type');
      response.headers.set('Access-Control-Allow-Credentials', 'true');
    }

    return response;
  } catch (error) {
    console.error('Page activity log error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to record page activity' },
      { status: 500 },
    );
  }
}

export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get('origin');
  const response = new NextResponse(null, { status: 204 });
  if (origin) {
    response.headers.set('Access-Control-Allow-Origin', origin);
    response.headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type');
    response.headers.set('Access-Control-Allow-Credentials', 'true');
  }
  return response;
}

export async function GET(request: NextRequest) {
  try {
    const session = getSessionFromRequest(request);
    if (!session || !ALLOWED_GET_ROLES.includes(session.role)) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const supervisorId = searchParams.get('supervisorId');
    const rangeHours = Number(searchParams.get('rangeHours') || 168);
    const limit = Number(searchParams.get('limit') || 500);

    const now = new Date();
    const start = new Date(now.getTime() - Math.max(rangeHours, 1) * 60 * 60 * 1000);

    const data = await getPageActivitySummary({
      supervisorId: supervisorId || undefined,
      start,
      end: now,
      limit: Math.min(Math.max(limit, 1), 2000),
    });

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error('Get page activity summary error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch page activity summary' },
      { status: 500 },
    );
  }
}


