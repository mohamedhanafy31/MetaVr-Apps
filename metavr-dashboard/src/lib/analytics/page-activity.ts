import { db } from '@/lib/firebase/admin';

export interface PageActivityFilters {
  supervisorId?: string | null;
  start?: Date | null;
  end?: Date | null;
  limit?: number;
}

export interface PageUsageSummary {
  pageId: string;
  pageType: string;
  visits: number;
  totalTimeMs: number;
  avgTimeMs: number;
  lastVisit: string | null;
}

export interface SupervisorUsageSummary {
  supervisorId: string;
  visits: number;
  totalTimeMs: number;
  avgTimeMs: number;
  lastVisit: string | null;
}

export interface RecentPageActivity {
  id: string;
  pageId: string;
  pageType: string;
  supervisorId: string;
  timeSpentMs: number;
  enteredAt: string;
}

export interface PageActivitySummary {
  totals: {
    totalTimeMs: number;
    totalVisits: number;
    avgVisitMs: number;
    uniquePages: number;
    uniqueSupervisors: number;
  };
  topPages: PageUsageSummary[];
  topSupervisors: SupervisorUsageSummary[];
  recentActivity: RecentPageActivity[];
  range: {
    start: string | null;
    end: string | null;
  };
}

interface PageActivityDoc {
  supervisorId: string;
  pageId: string;
  pageType?: string;
  timeSpentMs?: number;
  enteredAt?: FirebaseFirestore.Timestamp | Date;
  exitedAt?: FirebaseFirestore.Timestamp | Date;
}

function normalizeDate(value?: FirebaseFirestore.Timestamp | Date | null): Date | null {
  if (!value) return null;
  if (value instanceof Date) {
    return value;
  }
  if (typeof value.toDate === 'function') {
    return value.toDate();
  }
  return null;
}

function toIsoString(date?: Date | null) {
  return date ? date.toISOString() : null;
}

export async function getPageActivitySummary(
  filters: PageActivityFilters = {},
): Promise<PageActivitySummary> {
  let query: FirebaseFirestore.Query = db.collection('page_activity_logs');

  if (filters.supervisorId) {
    query = query.where('supervisorId', '==', filters.supervisorId);
  }

  if (filters.start) {
    query = query.where('enteredAt', '>=', filters.start);
  }

  if (filters.end) {
    query = query.where('enteredAt', '<=', filters.end);
  }

  query = query.orderBy('enteredAt', 'desc');

  if (filters.limit) {
    query = query.limit(filters.limit);
  }

  const snapshot = await query.get();
  const pageMap = new Map<string, PageUsageSummary>();
  const supervisorMap = new Map<string, SupervisorUsageSummary>();

  let totalTimeMs = 0;
  let totalVisits = 0;

  const recentActivity: RecentPageActivity[] = [];

  snapshot.docs.forEach((doc) => {
    const data = doc.data() as PageActivityDoc & {
      pageType?: string;
      timeSpentMs?: number;
      enteredAt?: FirebaseFirestore.Timestamp | Date;
    };

    const pageId = data.pageId || 'unknown';
    const pageType = data.pageType || 'other';
    const supervisorId = data.supervisorId || 'unknown';
    const timeSpentMs = typeof data.timeSpentMs === 'number' ? data.timeSpentMs : 0;
    const enteredAtDate = normalizeDate(data.enteredAt);
    const enteredAtIso = toIsoString(enteredAtDate);

    totalTimeMs += timeSpentMs;
    totalVisits += 1;

    const existingPage = pageMap.get(pageId) || {
      pageId,
      pageType,
      visits: 0,
      totalTimeMs: 0,
      avgTimeMs: 0,
      lastVisit: enteredAtIso || null,
    };

    existingPage.visits += 1;
    existingPage.totalTimeMs += timeSpentMs;
    existingPage.avgTimeMs = existingPage.totalTimeMs / existingPage.visits;
    existingPage.lastVisit = existingPage.lastVisit || enteredAtIso;
    pageMap.set(pageId, existingPage);

    const existingSupervisor = supervisorMap.get(supervisorId) || {
      supervisorId,
      visits: 0,
      totalTimeMs: 0,
      avgTimeMs: 0,
      lastVisit: enteredAtIso || null,
    };

    existingSupervisor.visits += 1;
    existingSupervisor.totalTimeMs += timeSpentMs;
    existingSupervisor.avgTimeMs =
      existingSupervisor.totalTimeMs / existingSupervisor.visits;
    existingSupervisor.lastVisit = existingSupervisor.lastVisit || enteredAtIso;
    supervisorMap.set(supervisorId, existingSupervisor);

    if (recentActivity.length < 20) {
      recentActivity.push({
        id: doc.id,
        pageId,
        pageType,
        supervisorId,
        timeSpentMs,
        enteredAt: enteredAtIso || new Date().toISOString(),
      });
    }
  });

  const topPages = Array.from(pageMap.values()).sort((a, b) => b.totalTimeMs - a.totalTimeMs);
  const topSupervisors = Array.from(supervisorMap.values()).sort(
    (a, b) => b.totalTimeMs - a.totalTimeMs,
  );

  return {
    totals: {
      totalTimeMs,
      totalVisits,
      avgVisitMs: totalVisits ? totalTimeMs / totalVisits : 0,
      uniquePages: pageMap.size,
      uniqueSupervisors: supervisorMap.size,
    },
    topPages,
    topSupervisors,
    recentActivity,
    range: {
      start: filters.start ? filters.start.toISOString() : null,
      end: filters.end ? filters.end.toISOString() : null,
    },
  };
}

export interface AppConfigUsage {
  appId: string;
  appName?: string;
  opens: number;
  sessions: number;
  totalTimeMs: number;
  avgTimeMs: number;
  coverage: number; // sessions/opens ratio
  lastOpen: string | null;
  lastSession: string | null;
}

export interface SupervisorAppConfigUsage {
  supervisorId: string;
  apps: AppConfigUsage[];
  totals: {
    totalOpens: number;
    totalSessions: number;
    totalTimeMs: number;
  };
}

export async function getSupervisorAppConfigUsage(
  supervisorId: string,
  appId?: string | null,
  dateRange?: { start?: Date | null; end?: Date | null },
): Promise<SupervisorAppConfigUsage> {
  let opensQuery: FirebaseFirestore.Query = db.collection('page_activity_logs');
  let sessionsQuery: FirebaseFirestore.Query = db.collection('page_activity_logs');

  // Filter by supervisor
  opensQuery = opensQuery.where('supervisorId', '==', supervisorId);
  sessionsQuery = sessionsQuery.where('supervisorId', '==', supervisorId);

  // Filter by action
  opensQuery = opensQuery.where('action', '==', 'opened');
  sessionsQuery = sessionsQuery.where('action', 'in', ['session', null]);

  // Filter by appId if provided
  if (appId) {
    opensQuery = opensQuery.where('appId', '==', appId);
    sessionsQuery = sessionsQuery.where('appId', '==', appId);
  }

  // Filter by date range
  if (dateRange?.start) {
    opensQuery = opensQuery.where('enteredAt', '>=', dateRange.start);
    sessionsQuery = sessionsQuery.where('enteredAt', '>=', dateRange.start);
  }
  if (dateRange?.end) {
    opensQuery = opensQuery.where('enteredAt', '<=', dateRange.end);
    sessionsQuery = sessionsQuery.where('enteredAt', '<=', dateRange.end);
  }

  opensQuery = opensQuery.orderBy('enteredAt', 'desc');
  sessionsQuery = sessionsQuery.orderBy('enteredAt', 'desc');

  const [opensSnapshot, sessionsSnapshot] = await Promise.all([
    opensQuery.get(),
    sessionsQuery.get(),
  ]);

  const appMap = new Map<string, AppConfigUsage>();

  // Process opens
  opensSnapshot.docs.forEach((doc) => {
    const data = doc.data() as {
      appId?: string;
      pageName?: string;
      metadata?: { appName?: string };
      enteredAt?: FirebaseFirestore.Timestamp | Date;
    };

    const appIdValue = data.appId || 'unknown';
    const appName =
      data.metadata?.appName || data.pageName?.replace(' Config', '') || appIdValue;
    const enteredAtDate = normalizeDate(data.enteredAt);
    const enteredAtIso = toIsoString(enteredAtDate);

    const existing = appMap.get(appIdValue) || {
      appId: appIdValue,
      appName,
      opens: 0,
      sessions: 0,
      totalTimeMs: 0,
      avgTimeMs: 0,
      coverage: 0,
      lastOpen: null,
      lastSession: null,
    };

    existing.opens += 1;
    if (!existing.lastOpen || (enteredAtIso && enteredAtIso > existing.lastOpen)) {
      existing.lastOpen = enteredAtIso;
    }

    appMap.set(appIdValue, existing);
  });

  // Process sessions
  sessionsSnapshot.docs.forEach((doc) => {
    const data = doc.data() as {
      appId?: string;
      pageName?: string;
      metadata?: { appName?: string };
      timeSpentMs?: number;
      enteredAt?: FirebaseFirestore.Timestamp | Date;
    };

    const appIdValue = data.appId || 'unknown';
    const appName =
      data.metadata?.appName || data.pageName?.replace(' Config', '') || appIdValue;
    const timeSpentMs = typeof data.timeSpentMs === 'number' ? data.timeSpentMs : 0;
    const enteredAtDate = normalizeDate(data.enteredAt);
    const enteredAtIso = toIsoString(enteredAtDate);

    const existing = appMap.get(appIdValue) || {
      appId: appIdValue,
      appName,
      opens: 0,
      sessions: 0,
      totalTimeMs: 0,
      avgTimeMs: 0,
      coverage: 0,
      lastOpen: null,
      lastSession: null,
    };

    existing.sessions += 1;
    existing.totalTimeMs += timeSpentMs;
    existing.avgTimeMs =
      existing.sessions > 0 ? existing.totalTimeMs / existing.sessions : 0;
    if (!existing.lastSession || (enteredAtIso && enteredAtIso > existing.lastSession)) {
      existing.lastSession = enteredAtIso;
    }

    // Calculate coverage
    existing.coverage = existing.opens > 0 ? existing.sessions / existing.opens : 0;

    appMap.set(appIdValue, existing);
  });

  const apps = Array.from(appMap.values()).sort((a, b) => {
    // Sort by total opens, then by total time
    if (b.opens !== a.opens) return b.opens - a.opens;
    return b.totalTimeMs - a.totalTimeMs;
  });

  const totals = {
    totalOpens: apps.reduce((sum, app) => sum + app.opens, 0),
    totalSessions: apps.reduce((sum, app) => sum + app.sessions, 0),
    totalTimeMs: apps.reduce((sum, app) => sum + app.totalTimeMs, 0),
  };

  return {
    supervisorId,
    apps,
    totals,
  };
}


