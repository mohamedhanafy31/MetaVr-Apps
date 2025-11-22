import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/auth/session';
import { db } from '@/lib/firebase/admin';
import { writeLog } from '@/lib/logger';

// PUT /api/applications/[id] - Update application
export async function PUT(request: NextRequest) {
  try {
    // Check authentication
    const session = getSessionFromRequest(request);
    if (!session || session.role !== 'admin') {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Extract ID from request URL
    const requestUrl = new URL(request.url);
    const pathSegments = requestUrl.pathname.split('/');
    const id = pathSegments[pathSegments.length - 1];

    const body = await request.json();
    const { 
      status, 
      name, 
      description, 
      platform, 
      authRequired, 
      healthCheck,
      path,
      url: appUrl,
      port,
      configPath,
      deploymentType
    } = body;

    // Get application document
    const appRef = db.collection('applications').doc(id);
    const appDoc = await appRef.get();

    if (!appDoc.exists) {
      return NextResponse.json(
        { success: false, message: 'Application not found' },
        { status: 404 }
      );
    }

    // In production, require URL for active applications
    const isProduction = process.env.NODE_ENV === 'production';
    const currentAppData = appDoc.data();
    const newStatus = status || currentAppData?.status;
    const newUrl = appUrl !== undefined ? appUrl : currentAppData?.url;
    
    if (isProduction && newStatus === 'active' && !newUrl) {
      return NextResponse.json(
        { success: false, message: 'External URL is required for active applications in production. Please provide the deployed Cloud Run URL.' },
        { status: 400 }
      );
    }

    // Prepare update data
    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    if (status) updateData.status = status;
    if (name) updateData.name = name;
    if (description) updateData.description = description;
    if (platform) updateData.platform = platform;
    if (authRequired !== undefined) updateData.authRequired = authRequired;
    if (healthCheck) updateData.healthCheck = healthCheck;
    if (path !== undefined) updateData.path = path || null;
    if (appUrl !== undefined) updateData.url = appUrl || null;
    if (port !== undefined) updateData.port = port || null;
    if (configPath !== undefined) updateData.configPath = configPath || null;
    if (deploymentType) updateData.deploymentType = deploymentType;

    // Update application
    await appRef.update(updateData);

    await writeLog('applications.update.success', { 
      userId: session.userId, 
      targetAppId: id,
      updates: Object.keys(updateData)
    });

    return NextResponse.json({
      success: true,
      message: 'Application updated successfully',
    });
  } catch (error) {
    console.error('Update application error:', error);
    await writeLog('applications.update.error', { error: String(error) });
    return NextResponse.json(
      { success: false, message: 'Failed to update application' },
      { status: 500 }
    );
  }
}

// GET /api/applications/[id] - Get single application
export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = getSessionFromRequest(request);
    if (!session || session.role !== 'admin') {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Extract ID from request URL
    const requestUrl = new URL(request.url);
    const pathSegments = requestUrl.pathname.split('/');
    const id = pathSegments[pathSegments.length - 1];

    // Get application document
    const appRef = db.collection('applications').doc(id);
    const appDoc = await appRef.get();

    if (!appDoc.exists) {
      return NextResponse.json(
        { success: false, message: 'Application not found' },
        { status: 404 }
      );
    }

    const applicationData = {
      id: appDoc.id,
      ...appDoc.data(),
    };

    return NextResponse.json({
      success: true,
      data: applicationData,
    });
  } catch (error) {
    console.error('Get application error:', error);
    await writeLog('applications.get.error', { error: String(error) });
    return NextResponse.json(
      { success: false, message: 'Failed to fetch application' },
      { status: 500 }
    );
  }
}

// DELETE /api/applications/[id] - Delete application
export async function DELETE(request: NextRequest) {
  try {
    // Check authentication - only admin can delete applications
    const session = getSessionFromRequest(request);
    if (!session || session.role !== 'admin') {
      return NextResponse.json(
        { success: false, message: 'Unauthorized - Admin access required' },
        { status: 401 }
      );
    }

    // Extract ID from request URL
    const requestUrl = new URL(request.url);
    const pathSegments = requestUrl.pathname.split('/');
    const id = pathSegments[pathSegments.length - 1];

    // Get application document to check if it exists
    const appRef = db.collection('applications').doc(id);
    const appDoc = await appRef.get();

    if (!appDoc.exists) {
      return NextResponse.json(
        { success: false, message: 'Application not found' },
        { status: 404 }
      );
    }

    const appData = appDoc.data();
    
    // Delete application
    await appRef.delete();

    await writeLog('applications.delete.success', { 
      userId: session.userId, 
      deletedAppId: id,
      deletedAppName: appData?.name
    });

    return NextResponse.json({
      success: true,
      message: 'Application deleted successfully',
    });
  } catch (error) {
    console.error('Delete application error:', error);
    await writeLog('applications.delete.error', { error: String(error) });
    return NextResponse.json(
      { success: false, message: 'Failed to delete application' },
      { status: 500 }
    );
  }
}
