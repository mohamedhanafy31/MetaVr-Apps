import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import { join } from 'path';
import { getSessionFromRequest } from '@/lib/auth/session';
import { db } from '@/lib/firebase/admin';
import { writeLog } from '@/lib/logger';

type ManualConfig = Record<
  string,
  {
    port?: number;
    url?: string;
    configPath?: string;
    description?: string;
    name?: string;
    platform?: string;
    appKey?: string;
  }
>;

let cachedManualConfig: ManualConfig | null = null;

async function loadManualConfig(): Promise<ManualConfig> {
  if (cachedManualConfig) return cachedManualConfig;

  try {
    const appsDir = join(process.cwd(), '..', 'apps');
    const configPath = join(appsDir, 'apps-map.json');
    const raw = await fs.readFile(configPath, 'utf-8');
    cachedManualConfig = JSON.parse(raw) as ManualConfig;
  } catch (error) {
    console.warn('[applications] Unable to read apps-map.json:', error);
    cachedManualConfig = {};
  }

  return cachedManualConfig!;
}

function getManualEntryForPath(manualConfig: ManualConfig, path?: string | null) {
  if (!path) return null;
  const normalized = path.replace(/^apps\//, '');
  return manualConfig[normalized] || manualConfig[`apps/${normalized}`];
}

function deriveAppKey(path?: string | null, fallbackId?: string | null) {
  if (!path && !fallbackId) {
    return null;
  }
  if (path) {
    const slug = path.split('/').filter(Boolean).pop();
    if (slug) {
      return slug;
    }
  }
  return fallbackId ?? null;
}

// GET /api/applications - List all applications
export async function GET(request: NextRequest) {
  try {
    // Check authentication - allow admin and supervisor
    const session = getSessionFromRequest(request);
    if (!session || !['admin', 'supervisor'].includes(session.role)) {
      const response = NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
      // Prevent browser caching to avoid redirect loops
      response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
      response.headers.set('Pragma', 'no-cache');
      response.headers.set('Expires', '0');
      return response;
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const platform = searchParams.get('platform');
    const limitParam = searchParams.get('limit');
    const limitNum = limitParam ? parseInt(limitParam) : 100;

    let query = db.collection('applications').orderBy('createdAt', 'desc').limit(limitNum);

    if (status) {
      query = query.where('status', '==', status);
    }

    if (platform) {
      query = query.where('platform', '==', platform);
    }

    const querySnapshot = await query.get();
    const manualConfig = await loadManualConfig();
    let applications = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    applications = applications.map((app: any) => {
      const manualEntry = getManualEntryForPath(manualConfig, app.path);
      const merged = {
        ...app,
        name: manualEntry?.name || app.name,
        description: manualEntry?.description || app.description || '',
        platform: manualEntry?.platform || app.platform || 'desktop',
        port: typeof app.port === 'number' ? app.port : manualEntry?.port ?? app.port ?? null,
        url: typeof app.url === 'string' ? app.url : manualEntry?.url ?? app.url ?? null,
        configPath:
          typeof app.configPath === 'string'
            ? app.configPath
            : manualEntry?.configPath ?? app.configPath ?? null,
      };

      merged.appKey = manualEntry?.appKey || deriveAppKey(app.path, app.id);

      return merged;
    });

    // If user is a supervisor, filter by assigned applications
    if (session.role === 'supervisor') {
      const supervisorDoc = await db.collection('users').doc(session.userId).get();
      if (supervisorDoc.exists) {
        const supervisorData = supervisorDoc.data();
        const assignedAppIds: string[] = (supervisorData?.assignedApplications || []).map(
          (value: any) => String(value),
        );
        const accessCodes: Record<string, { code?: string }> = supervisorData?.accessCodes || {};
        
        if (assignedAppIds.length > 0) {
          applications = applications
            .filter((app: any) => {
              const slug = typeof app.path === 'string' ? app.path.split('/').pop() : null;
              return (
                assignedAppIds.includes(app.id) ||
                (app.path && assignedAppIds.includes(app.path)) ||
                (slug && assignedAppIds.includes(slug)) ||
                (app.appKey && assignedAppIds.includes(app.appKey))
              );
            })
            .map((app: any) => {
              const codeEntry = app.appKey ? accessCodes[app.appKey] : undefined;
              return {
                ...app,
                accessCode: codeEntry?.code ?? null,
              };
            });
        } else {
          applications = [];
        }
      } else {
        applications = [];
      }
    }

    await writeLog('applications.list.success', { 
      userId: session.userId, 
      count: applications.length,
      filters: { status, platform },
      role: session.role
    });

    const response = NextResponse.json({
      success: true,
      data: applications,
    });
    // Prevent browser caching to avoid redirect loops
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
    return response;
  } catch (error) {
    console.error('List applications error:', error);
    await writeLog('applications.list.error', { error: String(error) });
    const errorResponse = NextResponse.json(
      { success: false, message: 'Failed to fetch applications' },
      { status: 500 }
    );
    // Prevent browser caching to avoid redirect loops
    errorResponse.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
    errorResponse.headers.set('Pragma', 'no-cache');
    errorResponse.headers.set('Expires', '0');
    return errorResponse;
  }
}

// POST /api/applications - Create new application
export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = getSessionFromRequest(request);
    if (!session || session.role !== 'admin') {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { 
      name, 
      description, 
      platform, 
      authRequired, 
      status,
      path,
      url,
      port,
      configPath,
      deploymentType = 'manual',
      healthCheck = {
        lastCheck: new Date(),
        status: 'healthy',
      }
    } = body;

    // Validate required fields
    if (!name || !description || !platform) {
      return NextResponse.json(
        { success: false, message: 'Missing required fields' },
        { status: 400 }
      );
    }

    // In production, require URL for active applications
    const isProduction = process.env.NODE_ENV === 'production';
    if (isProduction && (status === 'active' || !status) && !url) {
      return NextResponse.json(
        { success: false, message: 'External URL is required for active applications in production. Please provide the deployed Cloud Run URL.' },
        { status: 400 }
      );
    }

    // Check if application already exists
    const existingAppQuery = await db.collection('applications').where('name', '==', name).get();
    if (!existingAppQuery.empty) {
      return NextResponse.json(
        { success: false, message: 'Application with this name already exists' },
        { status: 409 }
      );
    }

    // Create application data
    const applicationData = {
      name,
      description,
      platform: platform || 'desktop',
      authRequired: authRequired !== false,
      status: status || 'active',
      path: path || null,
      url: url || null,
      port: port || null,
      deploymentType: deploymentType || 'manual',
      configPath: configPath || null,
      healthCheck: {
        lastCheck: healthCheck.lastCheck || new Date(),
        status: healthCheck.status || 'healthy',
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const applicationDocRef = await db.collection('applications').add(applicationData);

    await writeLog('applications.create.success', { 
      userId: session.userId, 
      newAppId: applicationDocRef.id,
      name,
      platform
    });

    return NextResponse.json({
      success: true,
      message: 'Application created successfully',
      data: {
        id: applicationDocRef.id,
        name,
        platform,
        status,
      },
    });
  } catch (error) {
    console.error('Create application error:', error);
    await writeLog('applications.create.error', { error: String(error) });
    return NextResponse.json(
      { success: false, message: 'Failed to create application' },
      { status: 500 }
    );
  }
}

// DELETE /api/applications - Delete all applications
export async function DELETE(request: NextRequest) {
  try {
    // Check authentication - only admin can delete all applications
    const session = getSessionFromRequest(request);
    if (!session || session.role !== 'admin') {
      return NextResponse.json(
        { success: false, message: 'Unauthorized - Admin access required' },
        { status: 401 }
      );
    }

    // Get all applications
    const applicationsSnapshot = await db.collection('applications').get();
    
    if (applicationsSnapshot.empty) {
      return NextResponse.json({
        success: true,
        message: 'No applications to delete',
        data: { deletedCount: 0 }
      });
    }

    // Delete all applications in batch
    const batch = db.batch();
    applicationsSnapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });

    await batch.commit();

    await writeLog('applications.delete_all.success', { 
      userId: session.userId, 
      deletedCount: applicationsSnapshot.docs.length
    });

    return NextResponse.json({
      success: true,
      message: `Successfully deleted ${applicationsSnapshot.docs.length} applications`,
      data: { deletedCount: applicationsSnapshot.docs.length }
    });
  } catch (error) {
    console.error('Delete all applications error:', error);
    await writeLog('applications.delete_all.error', { error: String(error) });
    return NextResponse.json(
      { success: false, message: 'Failed to delete all applications' },
      { status: 500 }
    );
  }
}