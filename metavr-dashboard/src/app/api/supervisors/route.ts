import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/auth/session';
import { db } from '@/lib/firebase/admin';
import { hashPassword, generateSecurePassword } from '@/lib/auth/session';
import { writeLog } from '@/lib/logger';
import { syncAccessCodesWithBackend } from '@/lib/access-codes';

// GET /api/supervisors - List all supervisors (admin only)
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

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const limitParam = searchParams.get('limit');
    const limitNum = limitParam ? parseInt(limitParam) : 100;

    // Query supervisors only - fetch all and filter/sort in memory to avoid composite index requirement
    const query = db.collection('users')
      .where('role', '==', 'supervisor');

    const querySnapshot = await query.get();
    let supervisors = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    // Filter by status if provided
    if (status) {
      supervisors = supervisors.filter((s: any) => s.status === status);
    }

    // Sort by createdAt descending
    supervisors.sort((a: any, b: any) => {
      const aDate = a.createdAt?.toDate?.() || new Date(a.createdAt || 0);
      const bDate = b.createdAt?.toDate?.() || new Date(b.createdAt || 0);
      return bDate.getTime() - aDate.getTime();
    });

    // Apply limit
    supervisors = supervisors.slice(0, limitNum);

    await writeLog('supervisors.list.success', { 
      userId: session.userId, 
      count: supervisors.length,
      filters: { status }
    });

    return NextResponse.json({
      success: true,
      data: supervisors,
    });
  } catch (error) {
    console.error('List supervisors error:', error);
    await writeLog('supervisors.list.error', { error: String(error) });
    return NextResponse.json(
      { success: false, message: 'Failed to fetch supervisors' },
      { status: 500 }
    );
  }
}

// POST /api/supervisors - Create new supervisor (admin only)
export async function POST(request: NextRequest) {
  try {
    // Check authentication - only admin can create supervisors
    const session = getSessionFromRequest(request);
    if (!session || session.role !== 'admin') {
      return NextResponse.json(
        { success: false, message: 'Unauthorized - Admin access required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { email, displayName, metadata, assignedApplications } = body;

    // Validate required fields
    if (!email || !displayName) {
      return NextResponse.json(
        { success: false, message: 'Email and display name are required' },
        { status: 400 }
      );
    }

    // Check if a supervisor with this email already exists (allow same email for user role)
    const existingSupervisorQuery = await db
      .collection('users')
      .where('email', '==', email)
      .where('role', '==', 'supervisor')
      .get();
    if (!existingSupervisorQuery.empty) {
      return NextResponse.json(
        { success: false, message: 'A supervisor with this email already exists' },
        { status: 409 }
      );
    }

    // Generate secure password
    const password = generateSecurePassword();
    const passwordHash = await hashPassword(password);

    // Create supervisor data (role is always 'supervisor')
    const supervisorData = {
      email,
      displayName,
      passwordHash,
      role: 'supervisor', // Always set to supervisor
      status: 'active',
      metadata: metadata || {},
      assignedApplications: assignedApplications || [], // Array of application IDs
      createdAt: new Date(),
      updatedAt: new Date(),
      lastLoginAt: null,
    };

    const supervisorDocRef = await db.collection('users').add(supervisorData);

    try {
      await syncAccessCodesWithBackend(request, supervisorDocRef.id, assignedApplications || []);
    } catch (syncError) {
      console.error('Sync access codes error (create supervisor):', syncError);
    }

    try {
      await sendSupervisorWelcomeEmail(request, supervisorDocRef.id, password);
    } catch (emailError) {
      console.error('Welcome email error:', emailError);
    }

    await writeLog('supervisors.create.success', { 
      userId: session.userId, 
      newSupervisorId: supervisorDocRef.id,
      email,
      displayName
    });

    return NextResponse.json({
      success: true,
      message: 'Supervisor created successfully',
      data: {
        id: supervisorDocRef.id,
        email,
        displayName,
        role: 'supervisor',
        password, // Temporary password for admin to share
      },
    });
  } catch (error) {
    console.error('Create supervisor error:', error);
    await writeLog('supervisors.create.error', { error: String(error) });
    return NextResponse.json(
      { success: false, message: 'Failed to create supervisor' },
      { status: 500 }
    );
  }
}

async function sendSupervisorWelcomeEmail(request: NextRequest, supervisorId: string, password: string) {
  const { getBackendUrl, getBackendEndpoint } = await import('@/lib/backend-url');
  const backendUrl = getBackendUrl(request);
  const backendEndpoint = getBackendEndpoint(request, '/auth/supervisors/welcome-email');

  const sessionCookie = request.cookies.get('session')?.value;
  if (!sessionCookie) {
    return;
  }

  const origin = request.headers.get('origin') || request.headers.get('referer') || '';

  await fetch(backendEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: `session=${sessionCookie}`,
      ...(origin ? { Origin: origin } : {}),
    },
    credentials: 'include',
    body: JSON.stringify({
      supervisorId,
      password,
    }),
  }).catch((error) => {
    console.error('Failed to send welcome email:', error);
  });
}

