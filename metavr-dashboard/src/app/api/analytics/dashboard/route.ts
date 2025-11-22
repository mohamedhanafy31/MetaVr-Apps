import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/auth/session';
import { db } from '@/lib/firebase/admin';

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

    // Fetch all collections
    const [usersSnapshot, applicationsSnapshot] = await Promise.all([
      db.collection('users').get(),
      db.collection('applications').get(),
    ]);

    // Calculate KPIs
    const totalUsers = usersSnapshot.size;
    const totalApplications = applicationsSnapshot.size;
    
    const kpiData = {
      totalUsers,
      totalApplications,
    };

    return NextResponse.json({
      success: true,
      data: kpiData,
    });
  } catch (error) {
    console.error('Get analytics error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch analytics data' },
      { status: 500 }
    );
  }
}
