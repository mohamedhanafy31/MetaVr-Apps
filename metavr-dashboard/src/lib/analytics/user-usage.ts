import { db } from '@/lib/firebase/admin';

function normalizeDate(value?: FirebaseFirestore.Timestamp | Date | null): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value.toDate === 'function') {
    return value.toDate();
  }
  return null;
}

function toIsoString(date?: Date | null) {
  return date ? date.toISOString() : null;
}

export interface UserUsageFilters {
  start?: Date | null;
  end?: Date | null;
  limit?: number;
}

export interface UserUsageRow {
  userId: string | null;
  userEmail?: string | null;
  userName?: string | null;
  supervisorId?: string | null;
  supervisorName?: string | null;
  supervisorEmail?: string | null;
  appId: string;
  appName?: string | null;
  totalUserTimeMs: number;
  totalUserSessions: number;
  lastUserActivity: string | null;
  totalSupervisorTimeMs: number;
  supervisorSessions: number;
  lastSupervisorActivity: string | null;
}

export interface UserUsageSummary {
  rows: UserUsageRow[];
  totals: {
    totalUserTimeMs: number;
    totalUserSessions: number;
    monitoredUsers: number;
  };
}

export async function getUserUsageSummary(filters: UserUsageFilters = {}): Promise<UserUsageSummary> {
  let userQuery: FirebaseFirestore.Query = db.collection('page_activity_logs').where('userRole', '==', 'user');
  let supervisorQuery: FirebaseFirestore.Query = db.collection('page_activity_logs').where('userRole', '==', 'supervisor');

  if (filters.start) {
    userQuery = userQuery.where('enteredAt', '>=', filters.start);
    supervisorQuery = supervisorQuery.where('enteredAt', '>=', filters.start);
  }

  if (filters.end) {
    userQuery = userQuery.where('enteredAt', '<=', filters.end);
    supervisorQuery = supervisorQuery.where('enteredAt', '<=', filters.end);
  }

  userQuery = userQuery.orderBy('enteredAt', 'desc');
  supervisorQuery = supervisorQuery.orderBy('enteredAt', 'desc');

  if (filters.limit) {
    userQuery = userQuery.limit(filters.limit);
    supervisorQuery = supervisorQuery.limit(filters.limit);
  }

  const [userSnapshot, supervisorSnapshot] = await Promise.all([userQuery.get(), supervisorQuery.get()]);

  type UserUsageKey = string;
  const userUsageMap = new Map<
    UserUsageKey,
    {
      userId: string | null;
      userEmail?: string | null;
      supervisorId?: string | null;
      appId: string;
      appName?: string;
      totalUserTimeMs: number;
      totalUserSessions: number;
      lastUserActivity: string | null;
    }
  >();

  const supervisorUsageMap = new Map<
    string,
    {
      totalSupervisorTimeMs: number;
      supervisorSessions: number;
      lastSupervisorActivity: string | null;
    }
  >();

  const userIds = new Set<string>();
  const supervisorIds = new Set<string>();
  const appIds = new Set<string>();

  userSnapshot.docs.forEach((doc) => {
    const data = doc.data() as {
      userId?: string;
      userEmail?: string;
      supervisorId?: string;
      appId?: string;
      timeSpentMs?: number;
      enteredAt?: FirebaseFirestore.Timestamp | Date;
      metadata?: { appName?: string };
    };

    const keyUserId = data.userId || null;
    const keyAppId = data.appId || 'unknown';
    const usageKey = `${keyUserId ?? data.userEmail ?? 'anonymous'}::${keyAppId}`;
    const timeSpentMs = typeof data.timeSpentMs === 'number' ? data.timeSpentMs : 0;
    const enteredAtIso = toIsoString(normalizeDate(data.enteredAt));

    const existing = userUsageMap.get(usageKey) || {
      userId: keyUserId,
      userEmail: data.userEmail ?? null,
      supervisorId: data.supervisorId ?? null,
      appId: keyAppId,
      appName: typeof data.metadata?.appName === 'string' ? data.metadata.appName : undefined,
      totalUserTimeMs: 0,
      totalUserSessions: 0,
      lastUserActivity: null,
    };

    existing.totalUserTimeMs += timeSpentMs;
    existing.totalUserSessions += 1;
    if (!existing.lastUserActivity || (enteredAtIso && enteredAtIso > existing.lastUserActivity)) {
      existing.lastUserActivity = enteredAtIso;
    }

    userUsageMap.set(usageKey, existing);

    if (keyUserId) {
      userIds.add(keyUserId);
    }
    if (existing.supervisorId) {
      supervisorIds.add(existing.supervisorId);
    }
    if (keyAppId) {
      appIds.add(keyAppId);
    }
  });

  supervisorSnapshot.docs.forEach((doc) => {
    const data = doc.data() as {
      supervisorId?: string;
      appId?: string;
      timeSpentMs?: number;
      enteredAt?: FirebaseFirestore.Timestamp | Date;
    };

    const supId = data.supervisorId || 'unknown';
    const appId = data.appId || 'unknown';
    const mapKey = `${supId}::${appId}`;
    const timeSpentMs = typeof data.timeSpentMs === 'number' ? data.timeSpentMs : 0;
    const enteredAtIso = toIsoString(normalizeDate(data.enteredAt));

    const existing = supervisorUsageMap.get(mapKey) || {
      totalSupervisorTimeMs: 0,
      supervisorSessions: 0,
      lastSupervisorActivity: null,
    };

    existing.totalSupervisorTimeMs += timeSpentMs;
    existing.supervisorSessions += 1;
    if (
      !existing.lastSupervisorActivity ||
      (enteredAtIso && enteredAtIso > existing.lastSupervisorActivity)
    ) {
      existing.lastSupervisorActivity = enteredAtIso;
    }

    supervisorUsageMap.set(mapKey, existing);
  });

  const [userDetailsEntries, supervisorDetailsEntries, applicationEntries] = await Promise.all([
    Promise.all(
      Array.from(userIds).map(async (id) => {
        const doc = await db.collection('users').doc(id).get();
        return [id, doc.exists ? doc.data() : undefined] as const;
      }),
    ),
    Promise.all(
      Array.from(supervisorIds).map(async (id) => {
        const doc = await db.collection('users').doc(id).get();
        return [id, doc.exists ? doc.data() : undefined] as const;
      }),
    ),
    Promise.all(
      Array.from(appIds).map(async (id) => {
        const doc = await db.collection('applications').doc(id).get();
        return [id, doc.exists ? doc.data() : undefined] as const;
      }),
    ),
  ]);

  const userDetails = new Map<string, FirebaseFirestore.DocumentData | undefined>(userDetailsEntries);
  const supervisorDetails = new Map<string, FirebaseFirestore.DocumentData | undefined>(
    supervisorDetailsEntries,
  );
  const applicationDetails = new Map<string, FirebaseFirestore.DocumentData | undefined>(
    applicationEntries,
  );

  const rows: UserUsageRow[] = Array.from(userUsageMap.values()).map((usage) => {
    const supKey = `${usage.supervisorId || 'unknown'}::${usage.appId}`;
    const supervisorStats = supervisorUsageMap.get(supKey);
    const userData = usage.userId ? userDetails.get(usage.userId) : undefined;
    const supervisorData = usage.supervisorId ? supervisorDetails.get(usage.supervisorId) : undefined;
    const appData = applicationDetails.get(usage.appId);

    return {
      userId: usage.userId ?? null,
      userEmail: usage.userEmail ?? (userData?.email as string | undefined) ?? null,
      userName:
        (userData?.displayName as string) ||
        (userData?.name as string) ||
        (usage.userEmail ?? usage.userId ?? null),
      supervisorId: usage.supervisorId ?? null,
      supervisorName:
        (supervisorData?.displayName as string) ||
        (supervisorData?.name as string) ||
        usage.supervisorId ||
        null,
      supervisorEmail: (supervisorData?.email as string | undefined) ?? null,
      appId: usage.appId,
      appName: usage.appName ?? (appData?.name as string | undefined) ?? null,
      totalUserTimeMs: usage.totalUserTimeMs,
      totalUserSessions: usage.totalUserSessions,
      lastUserActivity: usage.lastUserActivity,
      totalSupervisorTimeMs: supervisorStats?.totalSupervisorTimeMs ?? 0,
      supervisorSessions: supervisorStats?.supervisorSessions ?? 0,
      lastSupervisorActivity: supervisorStats?.lastSupervisorActivity ?? null,
    };
  });

  rows.sort((a, b) => b.totalUserTimeMs - a.totalUserTimeMs);

  const totals = rows.reduce(
    (acc, row) => {
      acc.totalUserTimeMs += row.totalUserTimeMs;
      acc.totalUserSessions += row.totalUserSessions;
      acc.monitoredUsers += 1;
      return acc;
    },
    { totalUserTimeMs: 0, totalUserSessions: 0, monitoredUsers: 0 },
  );

  return {
    rows,
    totals,
  };
}


