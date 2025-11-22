'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AdvancedHolographicCard } from '@/components/ui/vr-effects';
import { FadeIn } from '@/components/motion/FadeIn';
import { HoverCard } from '@/components/motion/HoverCard';
import {
  Users,
  Building2,
  Eye,
  Settings,
  Activity,
} from 'lucide-react';
import { toast } from 'sonner';

interface Application {
  id: string;
  name: string;
  description: string;
  platform: 'mobile' | 'web' | 'desktop';
  status: 'active' | 'inactive' | 'maintenance';
  authRequired: boolean;
  iconUrl?: string;
}

interface KPIData {
  totalUsers: number;
  totalApplications: number;
  userChangePercent?: number;
}

interface PageUsageRow {
  pageId: string;
  pageType: string;
  visits: number;
  totalTimeMs: number;
  avgTimeMs: number;
  lastVisit: string | null;
}

interface SupervisorUsageRow {
  supervisorId: string;
  visits: number;
  totalTimeMs: number;
  avgTimeMs: number;
  lastVisit: string | null;
}

interface RecentUsageRow {
  id: string;
  pageId: string;
  pageType: string;
  supervisorId: string;
  timeSpentMs: number;
  enteredAt: string;
}

interface PageActivitySummary {
  totals: {
    totalTimeMs: number;
    totalVisits: number;
    avgVisitMs: number;
    uniquePages: number;
    uniqueSupervisors: number;
  };
  topPages: PageUsageRow[];
  topSupervisors: SupervisorUsageRow[];
  recentActivity: RecentUsageRow[];
  range: {
    start: string | null;
    end: string | null;
  };
}

const formatDuration = (ms: number) => {
  if (!ms || Number.isNaN(ms)) return '0s';
  const totalSeconds = Math.round(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60);
    const remMinutes = minutes % 60;
    return `${hours}h ${remMinutes}m`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }
  return `${seconds}s`;
};

export default function AdminDashboard() {
  const router = useRouter();
  const [kpiData, setKpiData] = useState<KPIData>({
    totalUsers: 0,
    totalApplications: 0,
  });
  const [applications, setApplications] = useState<Application[]>([]);
  const [pageActivity, setPageActivity] = useState<PageActivitySummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      // Fetch KPI data
      const kpiResponse = await fetch('/api/analytics/dashboard');
      if (kpiResponse.ok) {
        const kpiData = await kpiResponse.json();
        setKpiData(kpiData.data);
      }

      // Fetch applications
      const appsResponse = await fetch('/api/applications');
      if (appsResponse.ok) {
        const appsData = await appsResponse.json();
        setApplications(appsData.data);
      }

      const activityResponse = await fetch('/api/page-activity?rangeHours=168&limit=500');
      if (activityResponse.ok) {
        const activityData = await activityResponse.json();
        if (activityData.success) {
          setPageActivity(activityData.data);
        } else {
          setPageActivity(null);
        }
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4 md:space-y-6">
        {/* KPI Cards Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
          {[1, 2].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="h-4 bg-muted rounded w-1/3"></div>
                <div className="h-4 w-4 bg-muted rounded"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-muted rounded w-1/2 mb-2"></div>
                <div className="h-3 bg-muted rounded w-2/3"></div>
              </CardContent>
            </Card>
          ))}
        </div>
        {/* Activity Card Skeleton */}
        <Card className="animate-pulse">
          <CardHeader>
            <div className="h-6 bg-muted rounded w-1/4 mb-2"></div>
            <div className="h-4 bg-muted rounded w-1/2"></div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[1, 2].map((i) => (
                <div key={i} className="space-y-3">
                  <div className="h-4 bg-muted rounded w-1/3"></div>
                  {[1, 2, 3].map((j) => (
                    <div key={j} className="h-16 bg-muted rounded"></div>
                  ))}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        {/* Applications Skeleton */}
        <Card className="animate-pulse">
          <CardHeader>
            <div className="h-6 bg-muted rounded w-1/4 mb-2"></div>
            <div className="h-4 bg-muted rounded w-1/2"></div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
              {[1, 2].map((i) => (
                <div key={i} className="h-48 bg-muted rounded"></div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 w-full">
              <FadeIn delay={0}>
                <AdvancedHolographicCard>
                  <HoverCard>
                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm md:text-sm font-medium">Total Users</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-xl md:text-2xl font-bold">{kpiData.totalUsers}</div>
                        <p className="text-xs md:text-xs text-muted-foreground">
                          {kpiData.userChangePercent !== undefined 
                            ? `${kpiData.userChangePercent > 0 ? '+' : ''}${kpiData.userChangePercent}% from last month`
                            : 'No previous data available'
                          }
                        </p>
                      </CardContent>
                    </Card>
                  </HoverCard>
                </AdvancedHolographicCard>
              </FadeIn>

              <FadeIn delay={0.1}>
                <AdvancedHolographicCard>
                  <HoverCard>
                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm md:text-sm font-medium">Applications</CardTitle>
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-xl md:text-2xl font-bold">{kpiData.totalApplications}</div>
                        <p className="text-xs md:text-xs text-muted-foreground">
                          {applications.filter(app => app.status === 'active').length} active
                        </p>
                      </CardContent>
                    </Card>
                  </HoverCard>
                </AdvancedHolographicCard>
              </FadeIn>

      </div>

      {pageActivity ? (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg md:text-xl">Supervisor Page Usage</CardTitle>
                <CardDescription>
                  Last 7 days · {pageActivity.totals.totalVisits} visits ·{' '}
                  {formatDuration(pageActivity.totals.totalTimeMs)} total time
                </CardDescription>
              </div>
              <Badge variant="secondary" className="flex items-center space-x-1">
                <Activity className="w-4 h-4" />
                <span>{pageActivity.totals.uniquePages} pages</span>
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <p className="text-sm font-semibold mb-3">Top Pages</p>
                <div className="space-y-3">
                  {pageActivity.topPages.slice(0, 4).map((page) => (
                    <div
                      key={page.pageId}
                      className="flex items-center justify-between rounded-lg border p-3"
                    >
                      <div>
                        <p className="text-sm font-medium truncate">{page.pageId}</p>
                        <p className="text-xs text-muted-foreground capitalize">
                          {page.pageType} · {page.visits} visits
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold font-mono">
                          {formatDuration(page.totalTimeMs)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          avg {formatDuration(page.avgTimeMs)}
                        </p>
                      </div>
                    </div>
                  ))}
                  {pageActivity.topPages.length === 0 && (
                    <p className="text-sm text-muted-foreground">No activity recorded yet.</p>
                  )}
                </div>
              </div>
              <div>
                <p className="text-sm font-semibold mb-3">Most Active Supervisors</p>
                <div className="space-y-3">
                  {pageActivity.topSupervisors.slice(0, 4).map((supervisor) => (
                    <div
                      key={supervisor.supervisorId}
                      className="flex items-center justify-between rounded-lg border p-3"
                    >
                      <div>
                        <p className="text-sm font-medium truncate">{supervisor.supervisorId}</p>
                        <p className="text-xs text-muted-foreground">
                          {supervisor.visits} visits · avg {formatDuration(supervisor.avgTimeMs)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold font-mono">
                          {formatDuration(supervisor.totalTimeMs)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Last {supervisor.lastVisit ? new Date(supervisor.lastVisit).toLocaleDateString() : 'N/A'}
                        </p>
                      </div>
                    </div>
                  ))}
                  {pageActivity.topSupervisors.length === 0 && (
                    <p className="text-sm text-muted-foreground">No supervisor activity yet.</p>
                  )}
                </div>
              </div>
            </div>
            {pageActivity.recentActivity.length > 0 && (
              <div className="mt-6">
                <p className="text-sm font-semibold mb-3">Recent Activity</p>
                <div className="space-y-2 text-sm">
                  {pageActivity.recentActivity.slice(0, 5).map((entry) => (
                    <div key={entry.id} className="flex items-center justify-between">
                      <div className="truncate">
                        <span className="font-medium">{entry.pageId}</span>
                        <span className="text-muted-foreground">
                          {' '}
                          · {entry.pageType} · {entry.supervisorId}
                        </span>
                      </div>
                      <div className="text-right text-muted-foreground">
                        <span className="font-mono">{formatDuration(entry.timeSpentMs)}</span>
                        <span className="ml-2">
                          {new Date(entry.enteredAt).toLocaleTimeString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg md:text-xl">Supervisor Page Usage</CardTitle>
            <CardDescription>No activity data available</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground text-center py-8">
              No supervisor activity has been recorded yet.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Application Status */}
            <Card>
              <CardHeader>
                <CardTitle>Application Status</CardTitle>
                <CardDescription>
                  Monitor your VR/AR applications and their status
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 w-full auto-rows-fr">
                  {applications.map((app) => (
                    <Card key={app.id} className="relative overflow-hidden hover:shadow-lg active:scale-[0.98] transition-all duration-200 flex h-full flex-col">
                      <CardHeader className="pb-3 flex-shrink-0">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                              <CardTitle className="text-lg truncate">{app.name}</CardTitle>
                              <div className="text-xs space-y-1 mt-1">
                                <div className="truncate">{app.platform}</div>
                                <div className="text-muted-foreground truncate">{app.status}</div>
                              </div>
                          </div>
                          <Badge className={
                            app.status === 'active' ? 'bg-green-100 text-green-800' :
                            app.status === 'maintenance' ? 'bg-orange-100 text-orange-800' :
                            'bg-red-100 text-red-800'
                          }>
                            {app.status}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4 flex-1 flex flex-col">
                        <div className="flex items-center space-x-2 flex-shrink-0">
                          <span className="text-sm text-muted-foreground line-clamp-2">Description: {app.description || 'No description'}</span>
                        </div>
                        
                        <div className="text-sm text-muted-foreground space-y-1 flex-shrink-0">
                          <div>Authentication: {app.authRequired ? 'Required' : 'Optional'}</div>
                          <div>Visibility: {app.status === 'active' ? 'Live for users' : app.status === 'maintenance' ? 'Under maintenance' : 'Inactive'}</div>
                        </div>
                      </CardContent>
                      <CardFooter className="pt-2 flex-shrink-0 mt-auto">
                        <div className="flex space-x-2 w-full">
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1 min-h-[44px]"
                            onClick={() => router.push(`/admin/applications?view=${app.id}`)}
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            Details
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1 min-h-[44px]"
                            onClick={() => router.push(`/admin/applications?edit=${app.id}`)}
                          >
                            <Settings className="w-4 h-4 mr-1" />
                            Edit
                          </Button>
                        </div>
                      </CardFooter>
                    </Card>
                  ))}
                </div>
              </CardContent>
      </Card>
    </div>
  );
}
