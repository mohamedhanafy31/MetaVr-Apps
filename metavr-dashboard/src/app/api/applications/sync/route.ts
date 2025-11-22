import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/auth/session';
import { syncAppsToDatabase } from '@/lib/app-discovery';
import { writeLog } from '@/lib/logger';

// POST /api/applications/sync - Sync apps from apps/ directory to database
export async function POST(request: NextRequest) {
  try {
    // Check authentication - only admin can sync apps
    const session = getSessionFromRequest(request);
    if (!session || session.role !== 'admin') {
      return NextResponse.json(
        { success: false, message: 'Unauthorized - Admin access required' },
        { status: 401 }
      );
    }

    const result = await syncAppsToDatabase();

    return NextResponse.json({
      success: true,
      message: `Apps synced successfully. Created: ${result.created}, Updated: ${result.updated}, Deleted: ${result.deleted}, Errors: ${result.errors}`,
      data: result,
    });
  } catch (error) {
    console.error('Sync apps error:', error);
    await writeLog('apps.sync.error', { error: String(error) });
    return NextResponse.json(
      { success: false, message: 'Failed to sync apps', error: String(error) },
      { status: 500 }
    );
  }
}

// GET /api/applications/sync - Get sync status (discover apps without syncing)
export async function GET(request: NextRequest) {
  try {
    // Check authentication - only admin can view sync status
    const session = getSessionFromRequest(request);
    if (!session || session.role !== 'admin') {
      return NextResponse.json(
        { success: false, message: 'Unauthorized - Admin access required' },
        { status: 401 }
      );
    }

    const { discoverApps } = await import('@/lib/app-discovery');
    const discoveredApps = await discoverApps();

    return NextResponse.json({
      success: true,
      data: {
        discovered: discoveredApps.length,
        apps: discoveredApps,
      },
    });
  } catch (error) {
    console.error('Discover apps error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to discover apps', error: String(error) },
      { status: 500 }
    );
  }
}

