import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/auth/session';
import { db } from '@/lib/firebase/admin';
import { writeLog } from '@/lib/logger';
import { syncAccessCodesWithBackend } from '@/lib/access-codes';

// GET /api/supervisors/[id] - Get single supervisor (admin only)
export async function GET(request: NextRequest) {
  try {
    // Check authentication - only admin can access
    const session = getSessionFromRequest(request);
    if (!session || session.role !== 'admin') {
      return NextResponse.json(
        { success: false, message: 'Unauthorized - Admin access required' },
        { status: 401 }
      );
    }

    // Extract ID from URL
    const url = new URL(request.url);
    const pathSegments = url.pathname.split('/');
    const id = pathSegments[pathSegments.length - 1];

    // Get supervisor document
    const supervisorRef = db.collection('users').doc(id);
    const supervisorDoc = await supervisorRef.get();

    if (!supervisorDoc.exists) {
      return NextResponse.json(
        { success: false, message: 'Supervisor not found' },
        { status: 404 }
      );
    }

    const supervisorData = supervisorDoc.data();
    
    // Verify it's actually a supervisor
    if (supervisorData?.role !== 'supervisor') {
      return NextResponse.json(
        { success: false, message: 'User is not a supervisor' },
        { status: 400 }
      );
    }

    const supervisor = {
      id: supervisorDoc.id,
      ...supervisorData,
    };

    return NextResponse.json({
      success: true,
      data: supervisor,
    });
  } catch (error) {
    console.error('Get supervisor error:', error);
    await writeLog('supervisors.get.error', { error: String(error) });
    return NextResponse.json(
      { success: false, message: 'Failed to fetch supervisor' },
      { status: 500 }
    );
  }
}

// PUT /api/supervisors/[id] - Update supervisor (admin only)
export async function PUT(request: NextRequest) {
  try {
    // Check authentication - only admin can update supervisors
    const session = getSessionFromRequest(request);
    if (!session || session.role !== 'admin') {
      return NextResponse.json(
        { success: false, message: 'Unauthorized - Admin access required' },
        { status: 401 }
      );
    }

    // Extract ID from URL
    const url = new URL(request.url);
    const pathSegments = url.pathname.split('/');
    const id = pathSegments[pathSegments.length - 1];

    const body = await request.json();
    const { status, displayName, metadata, assignedApplications } = body;

    // Get supervisor document
    const supervisorRef = db.collection('users').doc(id);
    const supervisorDoc = await supervisorRef.get();

    if (!supervisorDoc.exists) {
      return NextResponse.json(
        { success: false, message: 'Supervisor not found' },
        { status: 404 }
      );
    }

    const supervisorData = supervisorDoc.data();
    
    // Verify it's actually a supervisor
    if (supervisorData?.role !== 'supervisor') {
      return NextResponse.json(
        { success: false, message: 'User is not a supervisor' },
        { status: 400 }
      );
    }

    // Prepare update data (role cannot be changed via this endpoint)
    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    if (status) updateData.status = status;
    if (displayName) updateData.displayName = displayName;
    if (metadata) updateData.metadata = metadata;
    if (assignedApplications !== undefined) updateData.assignedApplications = assignedApplications;

    // Update supervisor
    await supervisorRef.update(updateData);

    if (Array.isArray(assignedApplications)) {
      try {
        await syncAccessCodesWithBackend(request, id, assignedApplications);
      } catch (syncError) {
        console.error('Sync access codes error (update supervisor):', syncError);
      }
    }

    await writeLog('supervisors.update.success', { 
      userId: session.userId, 
      targetSupervisorId: id,
      updates: Object.keys(updateData)
    });

    return NextResponse.json({
      success: true,
      message: 'Supervisor updated successfully',
    });
  } catch (error) {
    console.error('Update supervisor error:', error);
    await writeLog('supervisors.update.error', { error: String(error) });
    return NextResponse.json(
      { success: false, message: 'Failed to update supervisor' },
      { status: 500 }
    );
  }
}

// DELETE /api/supervisors/[id] - Delete supervisor (admin only)
export async function DELETE(request: NextRequest) {
  try {
    // Check authentication - only admin can delete supervisors
    const session = getSessionFromRequest(request);
    if (!session || session.role !== 'admin') {
      return NextResponse.json(
        { success: false, message: 'Unauthorized - Admin access required' },
        { status: 401 }
      );
    }

    // Extract ID from URL
    const url = new URL(request.url);
    const pathSegments = url.pathname.split('/');
    const id = pathSegments[pathSegments.length - 1];

    // Get supervisor document to check if it exists
    const supervisorRef = db.collection('users').doc(id);
    const supervisorDoc = await supervisorRef.get();

    if (!supervisorDoc.exists) {
      return NextResponse.json(
        { success: false, message: 'Supervisor not found' },
        { status: 404 }
      );
    }

    const supervisorData = supervisorDoc.data();
    
    // Verify it's actually a supervisor
    if (supervisorData?.role !== 'supervisor') {
      return NextResponse.json(
        { success: false, message: 'User is not a supervisor' },
        { status: 400 }
      );
    }
    
    // Delete supervisor
    await supervisorRef.delete();

    await writeLog('supervisors.delete.success', { 
      userId: session.userId, 
      deletedSupervisorId: id,
      deletedSupervisorEmail: supervisorData?.email
    });

    return NextResponse.json({
      success: true,
      message: 'Supervisor deleted successfully',
    });
  } catch (error) {
    console.error('Delete supervisor error:', error);
    await writeLog('supervisors.delete.error', { error: String(error) });
    return NextResponse.json(
      { success: false, message: 'Failed to delete supervisor' },
      { status: 500 }
    );
  }
}

