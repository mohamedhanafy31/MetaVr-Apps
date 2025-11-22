'use client';

import { useCallback, useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Users, Clock, Shield, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

interface UserUsageRow {
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

interface UserUsageSummary {
  rows: UserUsageRow[];
  totals: {
    totalUserTimeMs: number;
    totalUserSessions: number;
    monitoredUsers: number;
  };
}

const RANGE_OPTIONS = [
  { label: '24h', value: '24h' },
  { label: '7d', value: '7d' },
  { label: '30d', value: '30d' },
];

const formatDuration = (ms: number) => {
  if (!ms || Number.isNaN(ms)) return '0s';
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours) {
    return `${hours}h ${minutes}m`;
  }
  if (minutes) {
    return `${minutes}m ${seconds}s`;
  }
  return `${seconds}s`;
};

const formatDateTime = (iso: string | null) => {
  if (!iso) return '—';
  try {
    const date = new Date(iso);
    return Intl.DateTimeFormat(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(date);
  } catch {
    return iso;
  }
};

export default function AdminUsersPage() {
  const [summary, setSummary] = useState<UserUsageSummary | null>(null);
  const [range, setRange] = useState<string>('7d');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUsage = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/admin/users/usage?range=${range}&limit=2000`, {
        credentials: 'include',
      });
      const payload = await response.json();
      if (!response.ok || !payload.success) {
        throw new Error(payload?.message || 'Request failed');
      }
      setSummary(payload.data);
    } catch (err) {
      console.error('Failed to load user usage', err);
      setError(err instanceof Error ? err.message : 'Failed to load usage');
      setSummary(null);
    } finally {
      setLoading(false);
    }
  }, [range]);

  useEffect(() => {
    fetchUsage();
  }, [fetchUsage]);

  const renderContent = () => {
    if (loading) {
      return (
        <Card>
          <CardHeader>
            <CardTitle>User Activity Overview</CardTitle>
            <CardDescription>Loading user telemetry…</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[1, 2, 3].map((row) => (
                <div key={row} className="h-16 animate-pulse rounded-lg bg-muted" />
              ))}
            </div>
          </CardContent>
        </Card>
      );
    }

    if (error) {
      return (
        <Card>
          <CardHeader>
            <CardTitle>User Activity Overview</CardTitle>
            <CardDescription>We couldn&apos;t load usage insights right now.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center gap-3 py-10 text-center">
              <p className="text-sm text-muted-foreground">{error}</p>
              <Button onClick={fetchUsage} variant="outline" size="sm">
                <RefreshCw className="mr-2 h-4 w-4" /> Try again
              </Button>
            </div>
          </CardContent>
        </Card>
      );
    }

    if (!summary || summary.rows.length === 0) {
      return (
        <Card>
          <CardHeader>
            <CardTitle>User Activity Overview</CardTitle>
            <CardDescription>No tracked sessions in the selected range.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="py-10 text-center text-sm text-muted-foreground">
              We haven&apos;t recorded any user sessions for this period. Encourage supervisors to
              approve more access requests or verify that apps are emitting tracking events.
            </div>
          </CardContent>
        </Card>
      );
    }

    return (
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle>User Activity Overview</CardTitle>
              <CardDescription>
                Monitoring {summary.totals.monitoredUsers} user/app combinations for the selected
                window.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {RANGE_OPTIONS.map((option) => (
                <Button
                  key={option.value}
                  variant={option.value === range ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setRange(option.value)}
                  className={cn(
                    'whitespace-nowrap',
                    option.value === range && 'shadow-glow-sm',
                  )}
                >
                  {option.label}
                </Button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border bg-card/80 p-4 shadow-sm backdrop-blur">
              <div className="flex items-center gap-3">
                <Users className="h-5 w-5 text-primary" />
                <p className="text-sm text-muted-foreground">Tracked Users</p>
              </div>
              <p className="mt-2 text-2xl font-semibold">
                {summary.totals.monitoredUsers.toLocaleString()}
              </p>
            </div>
            <div className="rounded-2xl border bg-card/80 p-4 shadow-sm backdrop-blur">
              <div className="flex items-center gap-3">
                <Clock className="h-5 w-5 text-primary" />
                <p className="text-sm text-muted-foreground">Total User Time</p>
              </div>
              <p className="mt-2 text-2xl font-semibold">
                {formatDuration(summary.totals.totalUserTimeMs)}
              </p>
              <p className="text-xs text-muted-foreground">
                {summary.totals.totalUserSessions.toLocaleString()} sessions
              </p>
            </div>
            <div className="rounded-2xl border bg-card/80 p-4 shadow-sm backdrop-blur">
              <div className="flex items-center gap-3">
                <Shield className="h-5 w-5 text-primary" />
                <p className="text-sm text-muted-foreground">Average per session</p>
              </div>
              <p className="mt-2 text-2xl font-semibold">
                {formatDuration(
                  summary.totals.totalUserSessions
                    ? summary.totals.totalUserTimeMs / summary.totals.totalUserSessions
                    : 0,
                )}
              </p>
            </div>
          </div>

          <div className="rounded-2xl border bg-card/80 p-0 shadow-sm backdrop-blur">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Supervisor</TableHead>
                  <TableHead>Application</TableHead>
                  <TableHead>User Usage</TableHead>
                  <TableHead>Supervisor Usage</TableHead>
                  <TableHead>Last Activity</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {summary.rows.map((row) => (
                  <TableRow key={`${row.userId ?? row.userEmail}-${row.appId}`} variant="hover-lift">
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">
                          {row.userName || row.userEmail || row.userId || 'Unknown user'}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {row.userEmail || row.userId || '—'}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span>{row.supervisorName || row.supervisorId || 'Pending assignment'}</span>
                        <span className="text-xs text-muted-foreground">
                          {row.supervisorEmail || row.supervisorId || '—'}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{row.appName || row.appId}</span>
                        <Badge variant="secondary" className="text-xs">
                          {row.appId}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-semibold">
                          {formatDuration(row.totalUserTimeMs)}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {row.totalUserSessions.toLocaleString()} sessions
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span>{formatDuration(row.totalSupervisorTimeMs)}</span>
                        <span className="text-xs text-muted-foreground">
                          {row.supervisorSessions.toLocaleString()} sessions
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col text-xs">
                        <span>User: {formatDateTime(row.lastUserActivity)}</span>
                        <span>Supervisor: {formatDateTime(row.lastSupervisorActivity)}</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Users</h1>
        <p className="text-sm text-muted-foreground">
          Understand how approved users spend time inside each application and how their supervisors
          support them.
        </p>
      </div>
      {renderContent()}
    </div>
  );
}


