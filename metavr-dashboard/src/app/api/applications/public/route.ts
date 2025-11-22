import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import { join } from 'path';
import { db } from '@/lib/firebase/admin';
import { writeLog } from '@/lib/logger';

let cachedAppsMap: Record<
  string,
  {
    name?: string;
    description?: string;
    platform?: 'web' | 'desktop' | 'mobile';
    port?: number;
    url?: string;
    configPath?: string;
  }
> | null = null;

async function loadAppsMap(): Promise<typeof cachedAppsMap> {
  if (cachedAppsMap) {
    return cachedAppsMap;
  }

  try {
    const appsDir = join(process.cwd(), '..', 'apps');
    const mapPath = join(appsDir, 'apps-map.json');
    const raw = await fs.readFile(mapPath, 'utf-8');
    cachedAppsMap = JSON.parse(raw);
  } catch (error) {
    console.warn('Unable to load apps-map.json:', error);
    cachedAppsMap = {};
  }

  return cachedAppsMap;
}

// GET /api/applications/public - List public applications (no auth required)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'active';
    const platform = searchParams.get('platform');
    const limitParam = searchParams.get('limit');
    const limitNum = limitParam ? parseInt(limitParam) : 100;
    const autoSync = searchParams.get('autoSync') !== 'false'; // Default to true

    // Fetch all applications and filter/sort in memory to avoid composite index requirement
    let query = db.collection('applications').limit(limitNum * 2); // Fetch more to account for filtering

    const querySnapshot = await query.get();
    let applications = querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        name: data.name,
        description: data.description || '',
        platform: data.platform || 'web',
        status: data.status,
        path: data.path || null,
        url: data.url || null,
        port: data.port || null,
        authRequired: data.authRequired !== false,
        // Only return public-safe fields
        createdAt: data.createdAt,
      };
    });

    // Auto-sync if no apps found and autoSync is enabled
    if (applications.length === 0 && autoSync) {
      try {
        const { syncAppsToDatabase } = await import('@/lib/app-discovery');
        await syncAppsToDatabase();
        // Re-fetch after sync
        const newQuerySnapshot = await query.get();
        applications = newQuerySnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            name: data.name,
            description: data.description || '',
            platform: data.platform || 'web',
            status: data.status,
            path: data.path || null,
            url: data.url || null,
            port: data.port || null,
            authRequired: data.authRequired !== false,
            createdAt: data.createdAt,
          };
        });
      } catch (syncError) {
        console.error('Auto-sync failed:', syncError);
        // Continue with empty array if sync fails
      }
    }

    // Filter by status
    if (status) {
      applications = applications.filter((app: any) => app.status === status);
    }

    // Filter by platform
    if (platform) {
      applications = applications.filter((app: any) => app.platform === platform);
    }

    // Filter out sensitive information and only return apps with path or url
    applications = applications.filter((app: any) => app.path || app.url);
    
    // Filter out ignored directories (logs, node_modules, etc.)
    const ignoredPaths = ['logs', 'node_modules', '.git', '.next', 'dist', 'build', '.cache'];
    applications = applications.filter((app: any) => {
      if (!app.path) return true;
      const pathParts = app.path.split('/');
      const lastPart = pathParts[pathParts.length - 1];
      return !ignoredPaths.includes(lastPart);
    });

    const appsMap = await loadAppsMap();
    applications = applications.map((app: any) => {
      if (!appsMap) return app;
      const slug = app.path?.split('/').pop();
      const manualEntry =
        (slug && (appsMap[slug] || appsMap[`apps/${slug}`])) ||
        appsMap[app.id] ||
        appsMap[app.name];

      if (manualEntry?.description) {
        return {
          ...app,
          description: manualEntry.description,
        };
      }
      return app;
    });

    // Sort by createdAt descending
    applications.sort((a: any, b: any) => {
      const aDate = a.createdAt?.toDate?.() || new Date(a.createdAt || 0);
      const bDate = b.createdAt?.toDate?.() || new Date(b.createdAt || 0);
      return bDate.getTime() - aDate.getTime();
    });

    // Apply limit after filtering
    applications = applications.slice(0, limitNum);

    await writeLog('applications.public.list.success', { 
      count: applications.length,
      filters: { status, platform }
    });

    return NextResponse.json({
      success: true,
      data: applications,
    });
  } catch (error) {
    console.error('List public applications error:', error);
    await writeLog('applications.public.list.error', { error: String(error) });
    return NextResponse.json(
      { success: false, message: 'Failed to fetch applications' },
      { status: 500 }
    );
  }
}

