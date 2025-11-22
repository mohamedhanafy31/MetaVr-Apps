'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ConfirmationDialog, DeleteUserDialog } from '@/components/ui/confirmation-dialog';
import {
  Plus,
  Search,
  UserCheck,
  UserX,
  Edit,
  Trash2,
  Shield,
  KeyRound,
  Loader2,
  Copy,
  RefreshCcw,
  Activity,
} from 'lucide-react';
import { toast } from 'sonner';

interface SupervisorAccessCode {
  code: string;
  appId?: string;
  appName?: string;
  appPath?: string;
  updatedAt?: number;
}

interface Supervisor {
  id: string;
  email: string;
  displayName: string;
  role: 'supervisor';
  company?: string;
  status: 'active' | 'inactive' | 'suspended';
  createdAt: string;
  lastLogin?: string;
  assignedApplications?: string[];
  accessCodes?: Record<string, SupervisorAccessCode>;
}

interface UsageEntry {
  pageId: string;
  pageType: 'dashboard' | 'config' | 'other';
  visits: number;
  totalTimeMs: number;
  avgTimeMs: number;
  lastVisit: string | null;
}

interface UsageTotals {
  totalTimeMs: number;
  totalVisits: number;
  avgVisitMs: number;
  uniquePages: number;
  uniqueSupervisors: number;
}

interface AppConfigUsage {
  appId: string;
  appName?: string;
  opens: number;
  sessions: number;
  totalTimeMs: number;
  avgTimeMs: number;
  coverage: number;
  lastOpen: string | null;
  lastSession: string | null;
}

interface SupervisorUsageResponse {
  supervisorId: string;
  totals: UsageTotals;
  entries: UsageEntry[];
  appConfigUsage?: {
    supervisorId: string;
    apps: AppConfigUsage[];
    totals: {
      totalOpens: number;
      totalSessions: number;
      totalTimeMs: number;
    };
  };
  range: {
    start: string | null;
    end: string | null;
  };
}

export default function SupervisorsPage() {
  const [mounted, setMounted] = useState(false);
  const [supervisors, setSupervisors] = useState<Supervisor[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingSupervisor, setEditingSupervisor] = useState<Supervisor | null>(null);
  const [formData, setFormData] = useState({
    email: '',
    displayName: '',
    company: '',
    assignedApplications: [] as string[]
  });
  const [availableApplications, setAvailableApplications] = useState<Array<{id: string, name: string}>>([]);
  const [createdPassword, setCreatedPassword] = useState<string | null>(null);
  const [resetPassword, setResetPassword] = useState<string | null>(null);
  const [resettingSupervisorId, setResettingSupervisorId] = useState<string | null>(null);
  const [regeneratingCode, setRegeneratingCode] = useState<string | null>(null);

  const TEMP_PASSWORD = 'hiSupervisor123!';

  // Confirmation dialog states
  const [deleteSupervisorDialog, setDeleteSupervisorDialog] = useState<{
    isOpen: boolean;
    supervisor: Supervisor | null;
    isLoading: boolean;
  }>({
    isOpen: false,
    supervisor: null,
    isLoading: false
  });

  const [resetPasswordDialog, setResetPasswordDialog] = useState<{
    isOpen: boolean;
    supervisor: Supervisor | null;
    isLoading: boolean;
  }>({
    isOpen: false,
    supervisor: null,
    isLoading: false,
  });

  // Helper function to safely format dates
  const formatDate = (dateValue: any): string => {
    if (!dateValue) return 'Never';
    
    try {
      // Handle Firestore Timestamp
      if (dateValue.toDate && typeof dateValue.toDate === 'function') {
        const date = dateValue.toDate();
        if (date instanceof Date && !isNaN(date.getTime())) {
          return date.toISOString().split('T')[0];
        }
      }
      
      // Handle Date object
      if (dateValue instanceof Date) {
        if (!isNaN(dateValue.getTime())) {
          return dateValue.toISOString().split('T')[0];
        }
      }
      
      // Handle string or number
      if (typeof dateValue === 'string' || typeof dateValue === 'number') {
        const date = new Date(dateValue);
        if (!isNaN(date.getTime())) {
          return date.toISOString().split('T')[0];
        }
      }
      
      return 'Never';
    } catch {
      return 'Never';
    }
  };

  const formatDateTime = (value: any): string => {
    if (!value) return 'Unknown';
    try {
      let date: Date | null = null;
      if (typeof value === 'number') {
        date = new Date(value);
      } else if (value?.toDate && typeof value.toDate === 'function') {
        date = value.toDate();
      } else if (value instanceof Date) {
        date = value;
      } else if (typeof value === 'string') {
        date = new Date(value);
      }

      if (!date || isNaN(date.getTime())) {
        return 'Unknown';
      }

      return `${date.toISOString().split('T')[0]} ${date.toISOString().split('T')[1]?.slice(0, 5) ?? ''}`.trim();
    } catch {
      return 'Unknown';
    }
  };

const PAGE_NAME_OVERRIDES: Record<string, string> = {
  '/supervisor/dashboard': 'Supervisor Dashboard',
  '/supervisor/applications': 'Applications Overview',
};

const formatDuration = (ms?: number | null) => {
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

const getFriendlyPageName = (
  pageId: string,
  pageType: UsageEntry['pageType'],
  apps: Array<{ id: string; name: string }>,
) => {
  if (PAGE_NAME_OVERRIDES[pageId]) {
    return PAGE_NAME_OVERRIDES[pageId];
  }

  if (pageType === 'config') {
    const slugMatch = pageId.match(/\/apps\/([^/]+)/i);
    const slug = slugMatch?.[1];
    if (slug) {
      const matchedApp =
        apps.find((app) => app.id === slug || app.id.endsWith(`/${slug}`)) ||
        apps.find((app) => app.id.toLowerCase().includes(slug.toLowerCase()));
      if (matchedApp) {
        return `${matchedApp.name} Config`;
      }
    }
    return `Config: ${pageId}`;
  }

  if (!pageId || pageId === '/') {
    return 'Unknown Page';
  }

  return pageId.replace(/^\/+/, '').split('/').map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1)).join(' / ');
};

interface SupervisorUsageDialogProps {
  supervisor: Supervisor;
  availableApplications: Array<{ id: string; name: string }>;
}

const SupervisorUsageDialog = ({ supervisor, availableApplications }: SupervisorUsageDialogProps) => {
  const [open, setOpen] = useState(false);
  const [range, setRange] = useState('all');
  const [pageType, setPageType] = useState('all');
  const [usage, setUsage] = useState<SupervisorUsageResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchUsage = useCallback(async () => {
    if (!open) return;
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams({
        range,
        pageType,
        limit: '1000',
      });
      const response = await fetch(`/api/admin/supervisors/${supervisor.id}/usage?${params.toString()}`, {
        credentials: 'include',
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        setError(result.message || 'Failed to load usage data');
        setUsage(null);
        return;
      }
      setUsage(result.data as SupervisorUsageResponse);
    } catch (err) {
      console.error('Fetch supervisor usage error:', err);
      setError('Failed to load usage data');
      setUsage(null);
    } finally {
      setLoading(false);
    }
  }, [open, pageType, range, supervisor.id]);

  useEffect(() => {
    fetchUsage();
  }, [fetchUsage]);

  const entries = usage?.entries ?? [];
  const totals = usage?.totals;

  return (
    <Dialog open={open} onOpenChange={(next) => {
      setOpen(next);
      if (!next) {
        setUsage(null);
        setError(null);
        setLoading(false);
      }
    }}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="w-full sm:w-auto min-h-[44px]">
          <Activity className="w-4 h-4 mr-1" />
          Usage
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl w-full max-h-[85vh] overflow-y-auto overscroll-contain p-4 md:p-6">
        <DialogHeader className="pb-2 md:pb-4">
          <DialogTitle className="truncate">Usage for {supervisor.displayName}</DialogTitle>
          <DialogDescription className="text-xs md:text-sm">
            Track time spent across dashboard and configuration pages.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 md:space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Time Range</Label>
              <Select value={range} onValueChange={setRange} disabled={loading}>
                <SelectTrigger className="min-h-[44px]">
                  <SelectValue placeholder="All time" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All time</SelectItem>
                  <SelectItem value="30d">Last 30 days</SelectItem>
                  <SelectItem value="7d">Last 7 days</SelectItem>
                  <SelectItem value="24h">Last 24 hours</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Page Type</Label>
              <Select value={pageType} onValueChange={setPageType} disabled={loading}>
                <SelectTrigger className="min-h-[44px]">
                  <SelectValue placeholder="All pages" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All pages</SelectItem>
                  <SelectItem value="dashboard">Dashboard</SelectItem>
                  <SelectItem value="config">Config</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {totals && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 md:gap-4 text-sm text-muted-foreground">
              <div className="min-w-0">
                <p className="text-xs uppercase mb-1">Total time</p>
                <p className="text-sm md:text-base font-semibold text-foreground truncate" title={formatDuration(totals.totalTimeMs)}>{formatDuration(totals.totalTimeMs)}</p>
              </div>
              <div className="min-w-0">
                <p className="text-xs uppercase mb-1">Total visits</p>
                <p className="text-sm md:text-base font-semibold text-foreground">{totals.totalVisits}</p>
              </div>
              <div className="min-w-0">
                <p className="text-xs uppercase mb-1">Average visit</p>
                <p className="text-sm md:text-base font-semibold text-foreground truncate" title={formatDuration(totals.avgVisitMs)}>{formatDuration(totals.avgVisitMs)}</p>
              </div>
              <div className="min-w-0">
                <p className="text-xs uppercase mb-1">Unique pages</p>
                <p className="text-sm md:text-base font-semibold text-foreground">{totals.uniquePages}</p>
              </div>
            </div>
          )}

          {error && (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 text-destructive px-3 py-2 text-sm">
              {error}
            </div>
          )}

          <div className="border rounded-lg overflow-hidden">
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto scrollbar-thin -mx-1 px-1">
              <table className="w-full text-sm">
                <thead className="bg-muted/60 text-muted-foreground sticky top-0 z-10">
                  <tr>
                    <th className="text-left px-3 md:px-4 py-2.5 font-medium min-w-[160px]">Page</th>
                    <th className="text-left px-3 md:px-4 py-2.5 font-medium min-w-[70px]">Type</th>
                    <th className="text-right px-3 md:px-4 py-2.5 font-medium min-w-[60px]">Visits</th>
                    <th className="text-right px-3 md:px-4 py-2.5 font-medium min-w-[85px]">Total Time</th>
                    <th className="text-right px-3 md:px-4 py-2.5 font-medium min-w-[85px]">Avg Time</th>
                    <th className="text-right px-3 md:px-4 py-2.5 font-medium min-w-[150px]">Last Visit</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="text-center py-8">
                        <Loader2 className="w-5 h-5 mx-auto animate-spin text-muted-foreground" />
                        <p className="text-xs text-muted-foreground mt-2">Loading usage...</p>
                      </td>
                    </tr>
                  ) : entries.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-8 text-muted-foreground text-sm">
                        No activity recorded for the selected filters.
                      </td>
                    </tr>
                  ) : (
                    entries.map((entry) => {
                      const lastVisitDate = entry.lastVisit ? new Date(entry.lastVisit) : null;
                      const fullDate = lastVisitDate ? lastVisitDate.toLocaleString() : 'N/A';
                      return (
                        <tr key={`${entry.pageId}-${entry.pageType}`} className="border-t hover:bg-muted/30 transition-colors">
                          <td className="px-3 md:px-4 py-3 max-w-[200px]">
                            <div className="font-medium text-foreground truncate text-sm" title={getFriendlyPageName(entry.pageId, entry.pageType, availableApplications)}>
                              {getFriendlyPageName(entry.pageId, entry.pageType, availableApplications)}
                            </div>
                            <div className="text-xs text-muted-foreground truncate break-all mt-0.5" title={entry.pageId}>{entry.pageId}</div>
                          </td>
                          <td className="px-3 md:px-4 py-3 capitalize text-sm">{entry.pageType}</td>
                          <td className="px-3 md:px-4 py-3 text-right font-mono text-sm">{entry.visits}</td>
                          <td className="px-3 md:px-4 py-3 text-right font-mono text-sm">{formatDuration(entry.totalTimeMs)}</td>
                          <td className="px-3 md:px-4 py-3 text-right font-mono text-sm">{formatDuration(entry.avgTimeMs)}</td>
                          <td className="px-3 md:px-4 py-3 text-right text-muted-foreground text-xs" title={fullDate}>
                            {fullDate}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
            
            {/* Mobile Card Layout */}
            <div className="md:hidden space-y-2 p-2">
              {loading ? (
                <div className="text-center py-8">
                  <Loader2 className="w-5 h-5 mx-auto animate-spin text-muted-foreground" />
                  <p className="text-xs text-muted-foreground mt-2">Loading usage...</p>
                </div>
              ) : entries.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  No activity recorded for the selected filters.
                </div>
              ) : (
                entries.map((entry) => {
                  const lastVisitDate = entry.lastVisit ? new Date(entry.lastVisit) : null;
                  const shortDate = lastVisitDate ? lastVisitDate.toLocaleDateString() : 'N/A';
                  return (
                    <Card key={`${entry.pageId}-${entry.pageType}`} className="p-3">
                      <div className="space-y-2">
                        <div>
                          <p className="font-medium text-sm">{getFriendlyPageName(entry.pageId, entry.pageType, availableApplications)}</p>
                          <p className="text-xs text-muted-foreground break-all">{entry.pageId}</p>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <span className="text-muted-foreground">Type:</span> <span className="capitalize">{entry.pageType}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Visits:</span> <span className="font-mono">{entry.visits}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Total Time:</span> <span className="font-mono">{formatDuration(entry.totalTimeMs)}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Avg Time:</span> <span className="font-mono">{formatDuration(entry.avgTimeMs)}</span>
                          </div>
                          <div className="col-span-2">
                            <span className="text-muted-foreground">Last Visit:</span> <span>{shortDate}</span>
                          </div>
                        </div>
                      </div>
                    </Card>
                  );
                })
              )}
            </div>
          </div>

          {usage?.appConfigUsage && usage.appConfigUsage.apps.length > 0 && (
            <div className="space-y-3 md:space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-1">
                <h3 className="text-sm md:text-base font-semibold">Config Pages by App</h3>
                <div className="text-xs text-muted-foreground flex flex-wrap gap-x-2 gap-y-1">
                  <span>{usage.appConfigUsage.totals.totalOpens} opens</span>
                  <span className="hidden sm:inline">·</span>
                  <span>{usage.appConfigUsage.totals.totalSessions} sessions</span>
                  <span className="hidden sm:inline">·</span>
                  <span>{formatDuration(usage.appConfigUsage.totals.totalTimeMs)} total</span>
                </div>
              </div>
              <div className="space-y-3">
                {usage.appConfigUsage.apps.map((app) => {
                  const coveragePercent = Math.round(app.coverage * 100);
                  const untrackedOpens = app.opens - app.sessions;
                  const lastSessionDate = app.lastSession ? new Date(app.lastSession) : null;
                  return (
                    <div key={app.appId} className="border rounded-lg p-3 md:p-4 space-y-3 w-full bg-card">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <h4 className="font-medium text-sm md:text-base truncate" title={app.appName || app.appId}>{app.appName || app.appId}</h4>
                          <p className="text-xs text-muted-foreground mt-0.5">Config Page</p>
                        </div>
                        <Badge variant="secondary" className="text-xs flex-shrink-0 w-fit">
                          {coveragePercent}% coverage
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 md:gap-4 text-sm">
                        <div className="min-w-0">
                          <p className="text-xs text-muted-foreground mb-1">Opens</p>
                          <p className="font-mono font-semibold text-sm md:text-base">{app.opens}</p>
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs text-muted-foreground mb-1">Sessions</p>
                          <p className="font-mono font-semibold text-sm md:text-base">{app.sessions}</p>
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs text-muted-foreground mb-1">Time Spent</p>
                          <p className="font-mono font-semibold text-sm md:text-base truncate" title={formatDuration(app.totalTimeMs)}>{formatDuration(app.totalTimeMs)}</p>
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs text-muted-foreground mb-1">Avg Time</p>
                          <p className="font-mono font-semibold text-sm md:text-base truncate" title={formatDuration(app.avgTimeMs)}>{formatDuration(app.avgTimeMs)}</p>
                        </div>
                      </div>
                      {untrackedOpens > 0 && (
                        <p className="text-xs text-muted-foreground break-words pt-1 border-t">
                          {untrackedOpens} open{untrackedOpens !== 1 ? 's' : ''} from external URLs (time not tracked)
                        </p>
                      )}
                      {lastSessionDate && (
                        <p className="text-xs text-muted-foreground break-words">
                          <span className="hidden sm:inline">Last session: {lastSessionDate.toLocaleString()}</span>
                          <span className="sm:hidden">Last: {lastSessionDate.toLocaleDateString()}</span>
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

  // Prevent hydration mismatch by only rendering after mount
  useEffect(() => {
    setMounted(true);
  }, []);

  const getApplicationDisplayName = (appId?: string, fallback?: string) => {
    if (fallback) return fallback;
    if (!appId) return fallback || 'Unknown application';
    const app = availableApplications.find((item) => item.id === appId);
    return app?.name || fallback || appId;
  };

  // Fetch supervisors and applications
  useEffect(() => {
    if (mounted) {
      fetchSupervisors();
      fetchApplications();
    }
  }, [statusFilter, mounted]);

  const fetchApplications = async () => {
    try {
      const response = await fetch('/api/applications');
      const result = await response.json();
      
      if (result.success) {
        const apps = result.data.map((app: any) => ({
          id: app.id,
          name: app.name,
        }));
        setAvailableApplications(apps);
      }
    } catch (error) {
      console.error('Error fetching applications:', error);
    }
  };

  const fetchSupervisors = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (statusFilter !== 'all') {
        params.append('status', statusFilter);
      }
      
      const response = await fetch(`/api/supervisors?${params.toString()}`, {
        credentials: 'include', // Ensure cookies are sent
      });
      
      if (response.status === 401) {
        const result = await response.json().catch(() => ({}));
        console.error('[supervisors] Unauthorized:', result.message || 'Session expired or invalid');
        // Session expired or invalid - redirect to login
        window.location.href = '/admin/login';
        return;
      }
      
      if (!response.ok) {
        const result = await response.json().catch(() => ({}));
        console.error('[supervisors] Error:', result.message || `HTTP ${response.status}`);
        toast.error(result.message || 'Failed to fetch supervisors');
        return;
      }
      
      const result = await response.json();
      
      if (result.success) {
        const formatted = result.data.map((s: any) => ({
          id: s.id,
          email: s.email,
          displayName: s.displayName,
          role: 'supervisor' as const,
          company: s.metadata?.company || '',
          status: s.status || 'active',
          createdAt: formatDate(s.createdAt),
          lastLogin: formatDate(s.lastLoginAt),
          assignedApplications: s.assignedApplications || [],
          accessCodes: s.accessCodes || {},
        }));
        setSupervisors(formatted);
      } else {
        toast.error('Failed to fetch supervisors');
      }
    } catch (error) {
      console.error('Error fetching supervisors:', error);
      toast.error('Failed to fetch supervisors');
    } finally {
      setLoading(false);
    }
  };

  const filteredSupervisors = supervisors.filter(supervisor => {
    const matchesSearch = 
      supervisor.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      supervisor.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (supervisor.company && supervisor.company.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (supervisor.assignedApplications && supervisor.assignedApplications.some(appId => {
        const app = availableApplications.find(a => a.id === appId);
        return app?.name.toLowerCase().includes(searchTerm.toLowerCase());
      }));
    const matchesStatus = statusFilter === 'all' || supervisor.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });
  
  const statusCounts = {
    all: supervisors.length,
    active: supervisors.filter(s => s.status === 'active').length,
    inactive: supervisors.filter(s => s.status === 'inactive').length,
    suspended: supervisors.filter(s => s.status === 'suspended').length,
  };

  const handleCreateSupervisor = async () => {
    if (!formData.email || !formData.displayName) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      const response = await fetch('/api/supervisors', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email,
          displayName: formData.displayName,
          metadata: {
            company: formData.company || '',
          },
          assignedApplications: formData.assignedApplications || [],
        }),
      });

      const result = await response.json();

      if (result.success) {
        setCreatedPassword(result.data.password);
        toast.success('Supervisor created successfully!');
        setIsCreateDialogOpen(false);
        setFormData({
          email: '',
          displayName: '',
          company: '',
          assignedApplications: []
        });
        fetchSupervisors();
      } else {
        toast.error(result.message || 'Failed to create supervisor');
      }
    } catch (error) {
      console.error('Error creating supervisor:', error);
      toast.error('Failed to create supervisor');
    }
  };

  const handleEditSupervisor = (supervisor: Supervisor) => {
    setEditingSupervisor(supervisor);
    setFormData({
      email: supervisor.email,
      displayName: supervisor.displayName,
      company: supervisor.company || '',
      assignedApplications: supervisor.assignedApplications || []
    });
    setIsEditDialogOpen(true);
  };

  const handleUpdateSupervisor = async () => {
    if (!editingSupervisor) return;

    try {
      const response = await fetch(`/api/supervisors/${editingSupervisor.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          displayName: formData.displayName,
          metadata: {
            company: formData.company || '',
          },
          assignedApplications: formData.assignedApplications || [],
        }),
      });

      const result = await response.json();

      if (result.success) {
        toast.success('Supervisor updated successfully');
        setIsEditDialogOpen(false);
        setEditingSupervisor(null);
        fetchSupervisors();
      } else {
        toast.error(result.message || 'Failed to update supervisor');
      }
    } catch (error) {
      console.error('Error updating supervisor:', error);
      toast.error('Failed to update supervisor');
    }
  };

  const handleDeleteSupervisor = (supervisorId: string) => {
    const supervisor = supervisors.find(s => s.id === supervisorId);
    if (supervisor) {
      setDeleteSupervisorDialog({
        isOpen: true,
        supervisor,
        isLoading: false
      });
    }
  };

  const confirmDeleteSupervisor = async () => {
    if (!deleteSupervisorDialog.supervisor) return;
    
    setDeleteSupervisorDialog(prev => ({ ...prev, isLoading: true }));
    
    try {
      const response = await fetch(`/api/supervisors/${deleteSupervisorDialog.supervisor.id}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (result.success) {
        toast.success('Supervisor deleted successfully');
        fetchSupervisors();
        setDeleteSupervisorDialog({
          isOpen: false,
          supervisor: null,
          isLoading: false
        });
      } else {
        toast.error(result.message || 'Failed to delete supervisor');
        setDeleteSupervisorDialog(prev => ({ ...prev, isLoading: false }));
      }
    } catch (error) {
      console.error('Error deleting supervisor:', error);
      toast.error('Failed to delete supervisor');
      setDeleteSupervisorDialog(prev => ({ ...prev, isLoading: false }));
    }
  };

  const handleToggleStatus = async (supervisorId: string) => {
    const supervisor = supervisors.find(s => s.id === supervisorId);
    if (!supervisor) return;

    const newStatus = supervisor.status === 'active' ? 'inactive' : 'active';

    try {
      const response = await fetch(`/api/supervisors/${supervisorId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: newStatus,
        }),
      });

      const result = await response.json();

      if (result.success) {
        toast.success(`Supervisor ${newStatus === 'active' ? 'activated' : 'deactivated'} successfully`);
        fetchSupervisors();
      } else {
        toast.error(result.message || 'Failed to update supervisor status');
      }
    } catch (error) {
      console.error('Error updating supervisor status:', error);
      toast.error('Failed to update supervisor status');
    }
  };

  const handleResetPassword = (supervisor: Supervisor) => {
    setResetPasswordDialog({
      isOpen: true,
      supervisor,
      isLoading: false,
    });
  };

  const confirmResetPassword = async () => {
    if (!resetPasswordDialog.supervisor) return;

    const supervisor = resetPasswordDialog.supervisor;

    try {
      setResetPasswordDialog(prev => ({ ...prev, isLoading: true }));
      setResettingSupervisorId(supervisor.id);
      const response = await fetch(`/api/supervisors/${supervisor.id}/reset`, {
        method: 'POST',
      });
      const result = await response.json();

      if (response.ok) {
        const password = result.data?.password || TEMP_PASSWORD;
        setResetPassword(password);
        setResetPasswordDialog({
          isOpen: false,
          supervisor: null,
          isLoading: false,
        });
      } else {
        toast.error(result.message || 'Failed to reset password');
        setResetPasswordDialog(prev => ({ ...prev, isLoading: false }));
      }
    } catch (error) {
      console.error('Error resetting supervisor password:', error);
      toast.error('Failed to reset password');
      setResetPasswordDialog(prev => ({ ...prev, isLoading: false }));
    } finally {
      setResettingSupervisorId(null);
    }
  };

  const handleRegenerateCode = async (supervisorId: string, appKey: string) => {
    try {
      setRegeneratingCode(`${supervisorId}:${appKey}`);
      const response = await fetch(`/api/supervisors/${supervisorId}/codes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ appKey }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        toast.success('Access code regenerated');
        fetchSupervisors();
      } else {
        toast.error(result.message || 'Failed to regenerate access code');
      }
    } catch (error) {
      console.error('Error regenerating access code:', error);
      toast.error('Failed to regenerate access code');
    } finally {
      setRegeneratingCode(null);
    }
  };

  const handleCopyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      toast.success('Access code copied to clipboard');
    } catch (error) {
      console.error('Copy access code error:', error);
      toast.error('Failed to copy access code');
    }
  };

  // Prevent hydration mismatch - don't render Radix UI components during SSR
  if (!mounted) {
    return (
      <div className="space-y-4 md:space-y-6">
        <div className="flex flex-col gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
              <Shield className="w-6 h-6 md:w-8 md:h-8" />
              Supervisor Management
            </h1>
            <p className="text-sm md:text-base text-muted-foreground">Create and manage supervisor accounts</p>
          </div>
        </div>
        <Card>
          <CardContent className="py-8">
            <div className="text-center text-muted-foreground">Loading...</div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
            <Shield className="w-6 h-6 md:w-8 md:h-8" />
            Supervisor Management
          </h1>
          <p className="text-sm md:text-base text-muted-foreground">Create and manage supervisor accounts</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="w-full sm:w-auto min-h-[44px]">
                <Plus className="w-4 h-4 mr-2" />
                Create Supervisor
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto scrollbar-thin scrollbar-thumb-muted/70 scrollbar-track-transparent">
              <DialogHeader>
                <DialogTitle>Create New Supervisor</DialogTitle>
                <DialogDescription>
                  Create a new supervisor account
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 md:space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                      placeholder="supervisor@example.com"
                      className="w-full min-h-[44px]"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="displayName">Display Name *</Label>
                    <Input
                      id="displayName"
                      value={formData.displayName}
                      onChange={(e) => setFormData(prev => ({ ...prev, displayName: e.target.value }))}
                      placeholder="John Doe"
                      className="w-full min-h-[44px]"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="company">Company</Label>
                  <Input
                    id="company"
                    value={formData.company}
                    onChange={(e) => setFormData(prev => ({ ...prev, company: e.target.value }))}
                    placeholder="Acme Corp"
                    className="w-full min-h-[44px]"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Assigned Applications</Label>
                  <div className="border rounded-md p-4 max-h-48 overflow-y-auto space-y-2">
                    {availableApplications.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No applications available</p>
                    ) : (
                      availableApplications.map((app) => (
                        <div key={app.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={`app-${app.id}`}
                            checked={formData.assignedApplications.includes(app.id)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setFormData(prev => ({
                                  ...prev,
                                  assignedApplications: [...prev.assignedApplications, app.id]
                                }));
                              } else {
                                setFormData(prev => ({
                                  ...prev,
                                  assignedApplications: prev.assignedApplications.filter(id => id !== app.id)
                                }));
                              }
                            }}
                          />
                          <Label
                            htmlFor={`app-${app.id}`}
                            className="text-sm font-normal cursor-pointer flex-1"
                          >
                            {app.name}
                          </Label>
                        </div>
                      ))
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Select which applications this supervisor can access and configure
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-2">
                  <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)} className="w-full sm:w-auto">
                    Cancel
                  </Button>
                  <Button onClick={handleCreateSupervisor} className="w-full sm:w-auto">
                    Create
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Password Display Dialog - Create */}
      {createdPassword && (
        <Dialog open={!!createdPassword} onOpenChange={() => setCreatedPassword(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Supervisor Created Successfully</DialogTitle>
              <DialogDescription>
                ⚠️ Please save this temporary password. It will not be shown again.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-lg">
                <Label className="text-sm text-muted-foreground">Temporary Password:</Label>
                <div className="flex items-center gap-2 mt-2">
                  <p className="text-lg font-mono font-bold flex-1 break-all">{createdPassword}</p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={async () => {
                      await navigator.clipboard.writeText(createdPassword);
                      toast.success('Password copied to clipboard');
                    }}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              <Button onClick={() => setCreatedPassword(null)} className="w-full">
                I've Saved the Password
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Password Display Dialog - Reset */}
      {resetPassword && (
        <Dialog open={!!resetPassword} onOpenChange={() => setResetPassword(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Password Reset Successfully</DialogTitle>
              <DialogDescription>
                ⚠️ Please save this temporary password. It will not be shown again.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-lg">
                <Label className="text-sm text-muted-foreground">Temporary Password:</Label>
                <div className="flex items-center gap-2 mt-2">
                  <p className="text-lg font-mono font-bold flex-1 break-all">{resetPassword}</p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={async () => {
                      await navigator.clipboard.writeText(resetPassword);
                      toast.success('Password copied to clipboard');
                    }}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              <Button onClick={() => setResetPassword(null)} className="w-full">
                I've Saved the Password
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Supervisors</CardTitle>
          <CardDescription>Manage supervisor accounts and assignments</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  id="search"
                  placeholder="Search supervisors..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 min-h-[44px] text-base"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px] min-h-[44px] text-base">
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses ({statusCounts.all})</SelectItem>
                <SelectItem value="active">Active ({statusCounts.active})</SelectItem>
                <SelectItem value="inactive">Inactive ({statusCounts.inactive})</SelectItem>
                <SelectItem value="suspended">Suspended ({statusCounts.suspended})</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading supervisors...</div>
          ) : (
            <>
              {/* Desktop Card View */}
              <div className="hidden md:grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 auto-rows-fr">
                {filteredSupervisors.map((supervisor) => (
                  <Card key={supervisor.id} className="relative overflow-hidden hover:shadow-lg active:scale-[0.98] transition-all duration-200 flex h-full flex-col">
                    <CardHeader className="pb-3 flex-shrink-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <CardTitle className="text-lg truncate">{supervisor.displayName}</CardTitle>
                          <div className="text-xs space-y-1 mt-1">
                            <div className="truncate break-all">{supervisor.email}</div>
                            {supervisor.company && (
                              <div className="text-muted-foreground truncate">{supervisor.company}</div>
                            )}
                          </div>
                        </div>
                        <Badge className={`flex-shrink-0 ${supervisor.status === 'active' ? 'bg-green-100 text-green-800' : supervisor.status === 'inactive' ? 'bg-gray-100 text-gray-800' : 'bg-red-100 text-red-800'}`}>
                          {supervisor.status === 'active' ? (
                            <UserCheck className="w-3 h-3 mr-1" />
                          ) : (
                            <UserX className="w-3 h-3 mr-1" />
                          )}
                          {supervisor.status}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4 flex-1 flex flex-col">
                      <div className="flex items-center space-x-2 flex-shrink-0">
                        <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                          <Shield className="w-3 h-3 mr-1" />
                          Supervisor
                        </Badge>
                      </div>
                      
                      <div className="space-y-1 flex-shrink-0">
                        {supervisor.company && (
                          <div className="text-sm text-muted-foreground">
                            <div className="truncate">Company: {supervisor.company}</div>
                          </div>
                        )}
                        {supervisor.assignedApplications && supervisor.assignedApplications.length > 0 && (
                          <div className="text-sm text-muted-foreground">
                            <div className="font-medium mb-1">Assigned Apps:</div>
                            <div className="flex flex-wrap gap-1">
                              {supervisor.assignedApplications.slice(0, 3).map((appId) => {
                                const app = availableApplications.find(a => a.id === appId);
                                return app ? (
                                  <Badge key={appId} variant="outline" className="text-xs">
                                    {app.name}
                                  </Badge>
                                ) : null;
                              })}
                              {supervisor.assignedApplications.length > 3 && (
                                <Badge variant="outline" className="text-xs">
                                  +{supervisor.assignedApplications.length - 3} more
                                </Badge>
                              )}
                            </div>
                          </div>
                        )}
                        {(!supervisor.assignedApplications || supervisor.assignedApplications.length === 0) && (
                          <div className="text-sm text-muted-foreground">
                            <div className="text-xs italic">No applications assigned</div>
                          </div>
                        )}
                        <div className="text-sm text-muted-foreground">
                          <div className="truncate">Last Login: {supervisor.lastLogin || 'Never'}</div>
                        </div>
                        {supervisor.accessCodes && Object.keys(supervisor.accessCodes).length > 0 && (
                          <div className="space-y-2 flex-shrink-0 pt-2 border-t">
                            <div className="text-sm font-medium">Access Codes:</div>
                            <div className="space-y-1">
                              {Object.entries(supervisor.accessCodes).slice(0, 2).map(([key, entry]) => (
                                <div key={key} className="flex items-center justify-between text-xs bg-muted/50 p-2 rounded">
                                  <span className="truncate flex-1 min-w-0">
                                    <span className="font-medium">{getApplicationDisplayName(entry.appId, entry.appName)}:</span>
                                    <span className="font-mono ml-1 text-[10px]">{entry.code}</span>
                                  </span>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-6 w-6 flex-shrink-0"
                                    onClick={() => handleCopyCode(entry.code)}
                                    title="Copy code"
                                  >
                                    <Copy className="w-3 h-3" />
                                  </Button>
                                </div>
                              ))}
                              {Object.keys(supervisor.accessCodes).length > 2 && (
                                <Button
                                  variant="link"
                                  size="sm"
                                  onClick={() => handleEditSupervisor(supervisor)}
                                  className="text-xs h-auto p-0"
                                >
                                  View all {Object.keys(supervisor.accessCodes).length} codes
                                </Button>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </CardContent>
                    <CardFooter className="pt-4 space-y-2 flex-shrink-0 mt-auto">
                        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEditSupervisor(supervisor)}
                            className="w-full min-h-[44px] active:scale-[0.98]"
                          >
                            <Edit className="w-4 h-4 mr-1" />
                            <span className="hidden sm:inline">Edit</span>
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleToggleStatus(supervisor.id)}
                            className="w-full min-h-[44px] active:scale-[0.98]"
                          >
                            {supervisor.status === 'active' ? (
                              <UserX className="w-4 h-4 mr-1" />
                            ) : (
                              <UserCheck className="w-4 h-4 mr-1" />
                            )}
                            <span className="hidden sm:inline">{supervisor.status === 'active' ? 'Disable' : 'Enable'}</span>
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleResetPassword(supervisor)}
                            className="w-full min-h-[44px] active:scale-[0.98]"
                            disabled={resettingSupervisorId === supervisor.id}
                          >
                            {resettingSupervisorId === supervisor.id ? (
                              <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                            ) : (
                              <KeyRound className="w-4 h-4 mr-1" />
                            )}
                            <span className="hidden sm:inline">Reset Pwd</span>
                          </Button>
                          <SupervisorUsageDialog
                            supervisor={supervisor}
                            availableApplications={availableApplications}
                          />
                        </div>
                        <div className="flex flex-col sm:flex-row gap-2">
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDeleteSupervisor(supervisor.id)}
                            className="w-full sm:flex-1 min-h-[44px] active:scale-[0.98]"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete
                          </Button>
                        </div>
                    </CardFooter>
                  </Card>
                ))}
              </div>

              {/* Mobile Card View */}
              <div className="md:hidden space-y-4">
                {filteredSupervisors.map((supervisor) => (
                  <Card key={supervisor.id} className="relative overflow-hidden hover:shadow-lg active:scale-[0.98] transition-all duration-200">
                    <CardHeader className="pb-3 flex-shrink-0">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <CardTitle className="text-lg truncate">{supervisor.displayName}</CardTitle>
                          <CardDescription className="flex items-center space-x-2 mt-1">
                            <span className="truncate break-all">{supervisor.email}</span>
                            {supervisor.company && (
                              <>
                                <span>•</span>
                                <span className="text-muted-foreground truncate">{supervisor.company}</span>
                              </>
                            )}
                          </CardDescription>
                        </div>
                        <Badge className={supervisor.status === 'active' ? 'bg-green-100 text-green-800' : supervisor.status === 'inactive' ? 'bg-gray-100 text-gray-800' : 'bg-red-100 text-red-800'}>
                          {supervisor.status === 'active' ? (
                            <UserCheck className="w-3 h-3 mr-1" />
                          ) : (
                            <UserX className="w-3 h-3 mr-1" />
                          )}
                          {supervisor.status}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center space-x-2">
                        <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                          <Shield className="w-3 h-3 mr-1" />
                          Supervisor
                        </Badge>
                      </div>
                      
                      <div className="space-y-1">
                        {supervisor.company && (
                          <div className="text-sm text-muted-foreground">
                            <div className="truncate">Company: {supervisor.company}</div>
                          </div>
                        )}
                        {supervisor.assignedApplications && supervisor.assignedApplications.length > 0 && (
                          <div className="text-sm text-muted-foreground">
                            <div className="font-medium mb-1">Assigned Apps:</div>
                            <div className="flex flex-wrap gap-1">
                              {supervisor.assignedApplications.slice(0, 3).map((appId) => {
                                const app = availableApplications.find(a => a.id === appId);
                                return app ? (
                                  <Badge key={appId} variant="outline" className="text-xs">
                                    {app.name}
                                  </Badge>
                                ) : null;
                              })}
                              {supervisor.assignedApplications.length > 3 && (
                                <Badge variant="outline" className="text-xs">
                                  +{supervisor.assignedApplications.length - 3} more
                                </Badge>
                              )}
                            </div>
                          </div>
                        )}
                        {(!supervisor.assignedApplications || supervisor.assignedApplications.length === 0) && (
                          <div className="text-sm text-muted-foreground">
                            <div className="text-xs italic">No applications assigned</div>
                          </div>
                        )}
                        <div className="text-sm text-muted-foreground">
                          <div className="truncate">Last Login: {supervisor.lastLogin || 'Never'}</div>
                        </div>
                        {supervisor.accessCodes && Object.keys(supervisor.accessCodes).length > 0 && (
                          <div className="space-y-2 flex-shrink-0 pt-2 border-t">
                            <div className="text-sm font-medium">Access Codes:</div>
                            <div className="space-y-1">
                              {Object.entries(supervisor.accessCodes).slice(0, 2).map(([key, entry]) => (
                                <div key={key} className="flex items-center justify-between text-xs bg-muted/50 p-2 rounded">
                                  <span className="truncate flex-1 min-w-0">
                                    <span className="font-medium">{getApplicationDisplayName(entry.appId, entry.appName)}:</span>
                                    <span className="font-mono ml-1 text-[10px] break-all">{entry.code}</span>
                                  </span>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-6 w-6 flex-shrink-0 ml-2"
                                    onClick={() => handleCopyCode(entry.code)}
                                    title="Copy code"
                                  >
                                    <Copy className="w-3 h-3" />
                                  </Button>
                                </div>
                              ))}
                              {Object.keys(supervisor.accessCodes).length > 2 && (
                                <Button
                                  variant="link"
                                  size="sm"
                                  onClick={() => handleEditSupervisor(supervisor)}
                                  className="text-xs h-auto p-0"
                                >
                                  View all {Object.keys(supervisor.accessCodes).length} codes
                                </Button>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </CardContent>
                    <CardFooter className="pt-4 space-y-2">
                        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEditSupervisor(supervisor)}
                            className="w-full min-h-[44px] active:scale-[0.98]"
                          >
                            <Edit className="w-4 h-4 mr-1" />
                            <span className="hidden sm:inline">Edit</span>
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleToggleStatus(supervisor.id)}
                            className="w-full min-h-[44px] active:scale-[0.98]"
                          >
                            {supervisor.status === 'active' ? (
                              <UserX className="w-4 h-4 mr-1" />
                            ) : (
                              <UserCheck className="w-4 h-4 mr-1" />
                            )}
                            <span className="hidden sm:inline">{supervisor.status === 'active' ? 'Disable' : 'Enable'}</span>
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleResetPassword(supervisor)}
                            className="w-full min-h-[44px] active:scale-[0.98]"
                            disabled={resettingSupervisorId === supervisor.id}
                          >
                            {resettingSupervisorId === supervisor.id ? (
                              <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                            ) : (
                              <KeyRound className="w-4 h-4 mr-1" />
                            )}
                            <span className="hidden sm:inline">Reset Pwd</span>
                          </Button>
                          <SupervisorUsageDialog
                            supervisor={supervisor}
                            availableApplications={availableApplications}
                          />
                        </div>
                        <div className="flex flex-col gap-2">
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDeleteSupervisor(supervisor.id)}
                            className="w-full min-h-[44px] active:scale-[0.98]"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete
                          </Button>
                        </div>
                    </CardFooter>
                  </Card>
                ))}
              </div>

              {filteredSupervisors.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No supervisors found
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Edit Supervisor Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto scrollbar-thin scrollbar-thumb-muted/70 scrollbar-track-transparent">
          <DialogHeader>
            <DialogTitle>Edit Supervisor</DialogTitle>
            <DialogDescription>
              Update supervisor account information and settings
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-email">Email Address</Label>
              <Input
                id="edit-email"
                type="email"
                value={formData.email}
                disabled
                className="bg-muted min-h-[44px]"
              />
              <p className="text-xs text-muted-foreground">Email cannot be changed</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-displayName">Display Name</Label>
              <Input
                id="edit-displayName"
                value={formData.displayName}
                onChange={(e) => setFormData(prev => ({ ...prev, displayName: e.target.value }))}
                className="min-h-[44px]"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-company">Company</Label>
              <Input
                id="edit-company"
                value={formData.company}
                onChange={(e) => setFormData(prev => ({ ...prev, company: e.target.value }))}
                className="min-h-[44px]"
              />
            </div>
            <div className="space-y-2">
              <Label>Assigned Applications</Label>
              <div className="border rounded-md p-4 max-h-48 overflow-y-auto space-y-2">
                {availableApplications.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No applications available</p>
                ) : (
                  availableApplications.map((app) => (
                    <div key={app.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`edit-app-${app.id}`}
                        checked={formData.assignedApplications.includes(app.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setFormData(prev => ({
                              ...prev,
                              assignedApplications: [...prev.assignedApplications, app.id]
                            }));
                          } else {
                            setFormData(prev => ({
                              ...prev,
                              assignedApplications: prev.assignedApplications.filter(id => id !== app.id)
                            }));
                          }
                        }}
                      />
                      <Label
                        htmlFor={`edit-app-${app.id}`}
                        className="text-sm font-normal cursor-pointer flex-1"
                      >
                        {app.name}
                      </Label>
                    </div>
                  ))
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Select which applications this supervisor can access and configure
              </p>
            </div>
            {editingSupervisor?.accessCodes &&
              Object.keys(editingSupervisor.accessCodes).length > 0 && (
                <div className="space-y-3">
                  <Label>Existing Access Codes</Label>
                  <div className="space-y-2">
                    {Object.entries(editingSupervisor.accessCodes).map(([key, entry]) => (
                      <div
                        key={`edit-${editingSupervisor.id}-${key}`}
                        className="rounded-xl border border-dashed border-muted/60 p-3 space-y-1"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div>
                            <p className="text-sm font-medium">
                              {getApplicationDisplayName(entry.appId, entry.appName) || key}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Updated {formatDateTime(entry.updatedAt)}
                            </p>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-11 w-11 min-w-[44px] min-h-[44px] md:h-8 md:w-8"
                              onClick={() => handleCopyCode(entry.code)}
                            >
                              <Copy className="w-4 h-4" />
                              <span className="sr-only">Copy code</span>
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-11 w-11 min-w-[44px] min-h-[44px] md:h-8 md:w-8"
                              onClick={() => handleRegenerateCode(editingSupervisor.id, key)}
                              disabled={regeneratingCode === `${editingSupervisor.id}:${key}`}
                            >
                              {regeneratingCode === `${editingSupervisor.id}:${key}` ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <RefreshCcw className="w-4 h-4" />
                              )}
                              <span className="sr-only">Regenerate code</span>
                            </Button>
                          </div>
                        </div>
                        <div className="font-mono text-sm md:text-base tracking-wide break-all">{entry.code}</div>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Provide these codes to the supervisor; each app has its own unique code.
                  </p>
                </div>
              )}
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleUpdateSupervisor}>
                Save Changes
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialogs */}
      {deleteSupervisorDialog.supervisor && (
        <DeleteUserDialog
          isOpen={deleteSupervisorDialog.isOpen}
          onClose={() => setDeleteSupervisorDialog({
            isOpen: false,
            supervisor: null,
            isLoading: false
          })}
          onConfirm={confirmDeleteSupervisor}
          userName={deleteSupervisorDialog.supervisor.displayName}
          userEmail={deleteSupervisorDialog.supervisor.email}
          isLoading={deleteSupervisorDialog.isLoading}
        />
      )}

      {resetPasswordDialog.supervisor && (
        <ConfirmationDialog
          isOpen={resetPasswordDialog.isOpen}
          onClose={() => setResetPasswordDialog({
            isOpen: false,
            supervisor: null,
            isLoading: false,
          })}
          onConfirm={confirmResetPassword}
          title="Reset Supervisor Password"
          description={`Are you sure you want to reset the password for ${resetPasswordDialog.supervisor.displayName}?`}
          confirmText="Reset Password"
          cancelText="Cancel"
          variant="warning"
          icon={<KeyRound className="w-6 h-6" />}
          isLoading={resetPasswordDialog.isLoading}
          destructiveText="A new temporary password will be generated and must be shared securely."
        />
      )}
    </div>
  );
}

