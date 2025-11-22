import { NextRequest, NextResponse } from 'next/server';
import { verifySessionToken } from '@/lib/auth/session';
import { writeLog, LOGGER_PATHS } from '@/lib/logger';

export async function GET(request: NextRequest) {
  const cookie = request.cookies.get('session')?.value || null;
  const parsed = cookie ? verifySessionToken(cookie) : null;
  await writeLog('debug.whoami', { hasCookie: Boolean(cookie), parsed });
  return NextResponse.json({
    hasCookie: Boolean(cookie),
    session: parsed,
    logFile: LOGGER_PATHS.LOG_FILE,
  });
}
