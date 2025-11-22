'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, Building2, Activity, Loader2, Copy } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface Application {
  id: string;
  name: string;
  status: 'active' | 'maintenance' | 'inactive';
  healthCheck?: {
    status?: 'healthy' | 'warning' | 'error';
  };
}

interface AccessCodeEntry {
  code: string;
  appId?: string;
  appName?: string;
  appPath?: string;
  updatedAt?: number;
}

export default function SupervisorDashboard() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [accessCodes, setAccessCodes] = useState<Record<string, AccessCodeEntry>>({});
  const [codesLoading, setCodesLoading] = useState(true);

  useEffect(() => {
    fetchApplications();
    fetchAccessCodes();
  }, []);

  const fetchApplications = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/applications');
      const result = await response.json();
      
      if (result.success) {
        setApplications(result.data || []);
      }
    } catch (error) {
      console.error('Error fetching applications:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAccessCodes = async () => {
    try {
      setCodesLoading(true);
      const response = await fetch('/api/supervisor/access-codes');
      const result = await response.json();

      if (result.success) {
        setAccessCodes(result.data || {});
      }
    } catch (error) {
      console.error('Error fetching access codes:', error);
    } finally {
      setCodesLoading(false);
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

  const applicationsCount = applications.length;
  const activeApplications = applications.filter(app => app.status === 'active').length;
  
  // Calculate system status based on application health
  const getSystemStatus = () => {
    if (applications.length === 0) {
      return { status: 'No Apps', color: 'text-gray-600', message: 'No applications configured' };
    }
    
    const hasErrors = applications.some(app => 
      app.healthCheck?.status === 'error' || app.status === 'inactive'
    );
    const hasWarnings = applications.some(app => 
      app.healthCheck?.status === 'warning' || app.status === 'maintenance'
    );
    
    if (hasErrors) {
      return { status: 'Issues Detected', color: 'text-red-600', message: 'Some applications have issues' };
    }
    if (hasWarnings) {
      return { status: 'Warning', color: 'text-yellow-600', message: 'Some applications need attention' };
    }
    return { status: 'Operational', color: 'text-green-600', message: 'All systems running' };
  };

  const systemStatus = getSystemStatus();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Supervisor Dashboard</h1>
        <p className="text-muted-foreground mt-2">Welcome to your supervisor control panel</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Applications</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            ) : (
              <>
                <div className="text-2xl font-bold">{applicationsCount}</div>
                <p className="text-xs text-muted-foreground">
                  {applicationsCount === 1 ? 'Configured application' : 'Configured applications'}
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Applications</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            ) : (
              <>
                <div className="text-2xl font-bold">{activeApplications}</div>
                <p className="text-xs text-muted-foreground">
                  {activeApplications === 1 ? 'Application active' : 'Applications active'}
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Status</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            ) : (
              <>
                <div className={`text-2xl font-bold ${systemStatus.color}`}>{systemStatus.status}</div>
                <p className="text-xs text-muted-foreground">{systemStatus.message}</p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Common tasks and shortcuts</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Link href="/supervisor/applications">
              <Card className="cursor-pointer hover:shadow-md transition-shadow active:scale-[0.98] md:active:scale-100">
                <CardHeader>
                  <div className="flex items-center space-x-2">
                    <Building2 className="w-5 h-5 text-primary" />
                    <CardTitle className="text-base md:text-lg">Configure Applications</CardTitle>
                  </div>
                  <CardDescription>
                    Manage and configure application settings
                  </CardDescription>
                </CardHeader>
              </Card>
            </Link>

            <Card className="cursor-pointer hover:shadow-md transition-shadow opacity-60">
              <CardHeader>
                <div className="flex items-center space-x-2">
                  <Shield className="w-5 h-5 text-primary" />
                  <CardTitle className="text-lg">View Reports</CardTitle>
                </div>
                <CardDescription>
                  Access application usage and analytics
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Per-App Access Codes</CardTitle>
          <CardDescription>Share these codes with app operators to unlock configuration pages</CardDescription>
        </CardHeader>
        <CardContent>
          {codesLoading ? (
            <div className="text-center py-6 text-muted-foreground flex items-center justify-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading access codes...
            </div>
          ) : Object.keys(accessCodes).length === 0 ? (
            <div className="text-center py-6 text-muted-foreground text-sm">
              No access codes yet. Contact an admin to assign applications.
            </div>
          ) : (
            <div className="space-y-3">
              {Object.entries(accessCodes).map(([key, entry]) => (
                <div key={key} className="rounded-lg border border-dashed border-muted p-3 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold">{entry.appName || key}</p>
                      <p className="text-xs text-muted-foreground">
                        Code is unique per app. Updated{' '}
                        {entry.updatedAt ? new Date(entry.updatedAt).toLocaleString() : 'recently'}
                      </p>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="min-h-[44px] min-w-[44px] md:min-h-0 md:min-w-0"
                      onClick={() => handleCopyCode(entry.code)}
                    >
                      <Copy className="w-4 h-4 mr-1" />
                      Copy
                    </Button>
                  </div>
                  <div className="font-mono text-lg md:text-xl tracking-widest break-all">{entry.code}</div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}


