'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  Building2, 
  Search, 
  Settings, 
  Monitor,
  Globe,
  Smartphone,
  CheckCircle,
  AlertCircle,
  XCircle,
  Save,
  Copy,
} from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';

interface Application {
  id: string;
  name: string;
  description: string;
  platform: 'desktop' | 'web' | 'mobile';
  status: 'active' | 'maintenance' | 'inactive';
  path?: string | null;
  port?: number | null;
  url?: string | null;
  configPath?: string | null;
  accessCode?: string | null;
  // Configuration settings (to be implemented)
  config?: {
    sessionTimeout?: number;
    enableNotifications?: boolean;
    customSettings?: Record<string, any>;
  };
}

const platformIcons = {
  desktop: Monitor,
  web: Globe,
  mobile: Smartphone,
};

const statusOptions = {
  active: { label: 'Active', color: 'bg-green-100 text-green-800', icon: CheckCircle },
  maintenance: { label: 'Maintenance', color: 'bg-yellow-100 text-yellow-800', icon: AlertCircle },
  inactive: { label: 'Inactive', color: 'bg-red-100 text-red-800', icon: XCircle },
};

export default function SupervisorApplicationsPage() {
  const [mounted, setMounted] = useState(false);
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);
  const [isConfigDialogOpen, setIsConfigDialogOpen] = useState(false);
  const [configData, setConfigData] = useState({
    sessionTimeout: 30,
    enableNotifications: true,
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted) {
      fetchApplications();
    }
  }, [mounted]);

  // Clean up description text - remove markdown, code blocks, and truncate if too long
  const cleanDescription = (desc: string, appName?: string): string => {
    if (!desc || desc.trim() === '') {
      return appName ? `${appName} application` : 'No description available';
    }
    
    // Remove markdown code blocks
    let cleaned = desc.replace(/```[\s\S]*?```/g, '');
    // Remove inline code
    cleaned = cleaned.replace(/`[^`]+`/g, '');
    // Remove markdown links [text](url)
    cleaned = cleaned.replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1');
    // Remove URLs
    cleaned = cleaned.replace(/https?:\/\/[^\s]+/g, '');
    // Remove common package.json/README boilerplate
    cleaned = cleaned.replace(/\[Next\.js\] project bootstrapped with.*?/gi, '');
    cleaned = cleaned.replace(/See.*?for more information\./gi, '');
    cleaned = cleaned.replace(/run the development server.*?/gi, '');
    // Remove extra whitespace and newlines
    cleaned = cleaned.replace(/\n+/g, ' ').replace(/\s+/g, ' ').trim();
    
    // Truncate if too long (max 150 characters)
    if (cleaned.length > 150) {
      cleaned = cleaned.substring(0, 147) + '...';
    }
    
    return cleaned || (appName ? `${appName} application` : 'No description available');
  };

  const fetchApplications = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/applications', {
        credentials: 'include',
      });
      const result = await response.json();
      
      if (result.success) {
        const formatted = result.data.map((app: any) => ({
          id: app.id,
          name: app.name,
          description: cleanDescription(app.description || '', app.name),
          platform: app.platform || 'desktop',
          status: app.status || 'active',
          path: app.path || null,
          port: typeof app.port === 'number' ? app.port : null,
          url: app.url || null,
          configPath: app.configPath || null,
          accessCode: app.accessCode || null,
          config: app.config || {},
        }));
        setApplications(formatted);
      } else {
        toast.error('Failed to fetch applications');
      }
    } catch (error) {
      console.error('Error fetching applications:', error);
      toast.error('Failed to fetch applications');
    } finally {
      setLoading(false);
    }
  };

  const deriveConfigRoute = (configPath?: string | null) => {
    if (!configPath) return null;
    const markers = ['/src/app/', '/app/'];
    let route: string | null = null;

    for (const marker of markers) {
      const idx = configPath.lastIndexOf(marker);
      if (idx !== -1) {
        route = configPath.slice(idx + marker.length);
        break;
      }
    }

    if (!route) return null;

    route = route
      .replace(/page\.(tsx|ts|jsx|js)$/i, '')
      .replace(/\/index$/i, '')
      .replace(/\/+$/, '');

    // Return route without leading slash to avoid issues when constructing full path
    return route || null;
  };

  const openAppConfigPage = async (app: Application) => {
    const route = deriveConfigRoute(app.configPath);
    if (!route) {
      return false;
    }

    // Get supervisor ID from session
    let supervisorId: string | null = null;
    try {
      const sessionResponse = await fetch('/api/auth/session', {
        credentials: 'include',
      });
      if (sessionResponse.ok) {
        const sessionData = await sessionResponse.json();
        if (sessionData.success && sessionData.session) {
          supervisorId = sessionData.session.userId;
        }
      }
    } catch (error) {
      console.warn('[config-tracking] Failed to get session:', error);
    }

    // Track "config opened" event
    if (supervisorId) {
      try {
        await fetch('/api/page-activity', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            pageId: `app-config-${app.id}`,
            pageName: `${app.name} Config`,
            pageType: 'config',
            action: 'opened',
            appId: app.id,
            enteredAt: new Date().toISOString(),
            exitedAt: new Date().toISOString(),
            timeSpentMs: 0,
            metadata: {
              source: 'supervisor-portal',
              appName: app.name,
              appPath: app.path,
              configRoute: route,
            },
          }),
        });
      } catch (error) {
        console.warn('[config-tracking] Failed to track config open:', error);
      }
    }

    // Build tracking query parameters
    const trackingParams = new URLSearchParams();
    if (supervisorId) {
      trackingParams.set('supervisorId', supervisorId);
    }
    trackingParams.set('appId', app.id);
    trackingParams.set('source', 'supervisor-portal');
    trackingParams.set('openedAt', new Date().toISOString());

    // Check if we're in production
    const isProduction = (): boolean => {
      if (typeof window === 'undefined') return false;
      const hostname = window.location.hostname;
      return hostname !== 'localhost' && !hostname.startsWith('127.0.0.1');
    };

    // Get localhost base URL for development
    const getLocalhostBaseUrl = (): string => {
      if (typeof window === 'undefined') return 'http://localhost';
      const protocol = window.location.protocol;
      const hostname = window.location.hostname;
      // In production, use current origin; in dev, use localhost
      const prod = isProduction();
      return prod ? `${protocol}//${hostname}` : 'http://localhost';
    };

    // Convert app directory name to URL path (e.g., "card_matching" -> "card-matching")
    const getAppUrlPath = (appPath: string): string => {
      const slug = appPath.split('/').pop() || '';
      // Convert underscores to hyphens for URL-friendly paths
      return slug.replace(/_/g, '-');
    };

    const appendQueryParams = (base: string) => {
      // base already includes the full path with route, just add query params
      const separator = base.includes('?') ? '&' : '?';
      return `${base}${separator}${trackingParams.toString()}`;
    };

    const prod = isProduction();

    // Prefer app.url if explicitly set
    if (app.url) {
      // Route is already cleaned (no leading/trailing slashes)
      const urlWithRoute = route ? `${app.url.replace(/\/+$/, '')}/${route}` : app.url;
      window.open(appendQueryParams(urlWithRoute), '_blank', 'noopener,noreferrer');
      return true;
    }

    if (app.path) {
      if (prod) {
        // In production: use path-based URL (e.g., /iq-questions/config or /card-matching/config)
        const urlPath = getAppUrlPath(app.path);
        // Route is already cleaned (no leading/trailing slashes) from deriveConfigRoute
        // Construct the path: /iq-questions/config (Next.js with basePath will handle trailing slash)
        const finalPath = route ? `/${urlPath}/${route}` : `/${urlPath}`;
        window.open(
          appendQueryParams(finalPath),
          '_blank',
          'noopener,noreferrer',
        );
        return true;
      } else {
        // In development: use port-based URL if port is specified
        if (app.port) {
          const baseUrl = getLocalhostBaseUrl();
          // In dev, Next.js apps don't use basePath, so route should start with /
          const routeWithSlash = route ? `/${route}` : '';
          const urlWithRoute = route ? `${baseUrl}:${app.port}${routeWithSlash}` : `${baseUrl}:${app.port}`;
          window.open(
            appendQueryParams(urlWithRoute),
            '_blank',
            'noopener,noreferrer',
          );
          return true;
        }
        
        // Fallback: use proxy page
        const slug = app.path.split('/').pop();
        if (slug) {
          const finalPath = route ? `/apps/${slug}/${route}` : `/apps/${slug}`;
          window.open(
            appendQueryParams(finalPath),
            '_blank',
            'noopener,noreferrer',
          );
          return true;
        }
      }
    }

    return false;
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

  const handleConfigure = async (app: Application) => {
    // Check if we're in production
    const isProduction = typeof window !== 'undefined' && 
      (window.location.hostname !== 'localhost' && !window.location.hostname.startsWith('127.0.0.1'));
    
    // Warn if in production and app doesn't have a URL or path configured
    // Path-based routing works in production via nginx, so only warn if neither URL nor path is set
    if (isProduction && app.status === 'active' && !app.url && !app.path) {
      toast.warning(
        `This app is missing a production URL. Config page may not be accessible. Please contact an administrator to set the Cloud Run URL.`,
        { duration: 5000 }
      );
    }

    const openedExternal = await openAppConfigPage(app);
    if (openedExternal) {
      return;
    }

    if (!app.configPath || (!app.port && !app.url && !app.path)) {
      toast.error('This app does not have a reachable config page yet.');
    }

    setSelectedApp(app);
    setConfigData({
      sessionTimeout: app.config?.sessionTimeout || 30,
      enableNotifications: app.config?.enableNotifications ?? true,
    });
    setIsConfigDialogOpen(true);
  };

  const handleSaveConfig = async () => {
    if (!selectedApp) return;

    try {
      // TODO: Implement API endpoint for supervisor to save application configuration
      // const response = await fetch(`/api/supervisor/applications/${selectedApp.id}/config`, {
      //   method: 'PUT',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(configData),
      // });

      // For now, just show a success message
      toast.success(`Configuration saved for ${selectedApp.name}`);
      setIsConfigDialogOpen(false);
      
      // Update local state
      setApplications(prev => prev.map(app => 
        app.id === selectedApp.id 
          ? { ...app, config: { ...app.config, ...configData } }
          : app
      ));
    } catch (error) {
      console.error('Error saving configuration:', error);
      toast.error('Failed to save configuration');
    }
  };

  const filteredApplications = applications.filter(app =>
    app.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    app.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!mounted) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Application Configuration</h1>
          <p className="text-muted-foreground mt-2">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Application Configuration</h1>
        <p className="text-muted-foreground mt-2">
          Configure settings and manage applications assigned to you
        </p>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4 z-10 pointer-events-none" />
            <Input
              placeholder="Search applications..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Applications Grid */}
      {loading ? (
        <div className="text-center py-8 text-muted-foreground">Loading applications...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredApplications.map((app) => {
            const PlatformIcon = platformIcons[app.platform];
            const status = statusOptions[app.status];
            const StatusIcon = status.icon;

            return (
              <Card key={app.id} className="relative overflow-hidden hover:shadow-lg active:scale-[0.98] transition-all duration-200">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 md:p-3 rounded-lg bg-primary/10">
                        <PlatformIcon className="w-6 h-6 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-lg truncate" title={app.name}>{app.name}</CardTitle>
                        <CardDescription className="mt-1 line-clamp-2" title={app.description}>{app.description}</CardDescription>
                      </div>
                    </div>
                    <Badge className={`${status.color} text-xs md:text-sm px-2 md:px-2.5 py-1 md:py-0.5`}>
                      <StatusIcon className="w-3 h-3 mr-1" />
                      {status.label}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="text-sm text-muted-foreground space-y-2">
                      <div className="flex items-center space-x-2">
                        <Building2 className="w-4 h-4" />
                        <span className="capitalize">{app.platform}</span>
                      </div>
                      {app.accessCode && (
                        <div className="rounded-lg border border-dashed border-muted p-2">
                          <p className="text-xs text-muted-foreground mb-1">
                            Access Code
                          </p>
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-mono tracking-wide text-xs md:text-sm break-all">{app.accessCode}</span>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleCopyCode(app.accessCode!)}
                              className="h-11 md:h-8 min-w-[44px]"
                            >
                              <Copy className="w-4 h-4 mr-1" />
                              Copy
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>

                    {app.config && Object.keys(app.config).length > 0 && (
                      <div className="text-xs text-muted-foreground space-y-1">
                        <p>Session Timeout: {app.config.sessionTimeout || 'N/A'} min</p>
                        <p>Notifications: {app.config.enableNotifications ? 'Enabled' : 'Disabled'}</p>
                      </div>
                    )}

                    <Button
                      variant="vr-primary"
                      className="w-full"
                      onClick={() => handleConfigure(app)}
                    >
                      <Settings className="w-4 h-4 mr-2" />
                      Configure
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {!loading && filteredApplications.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <Building2 className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              {searchTerm ? 'No applications found matching your search' : 'No applications available'}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Configuration Dialog */}
      <Dialog open={isConfigDialogOpen} onOpenChange={setIsConfigDialogOpen}>
        <DialogContent className="max-w-[95vw] md:max-w-2xl max-h-[90vh] overflow-y-auto mx-4 md:mx-auto">
          <DialogHeader>
            <DialogTitle>Configure {selectedApp?.name}</DialogTitle>
            <DialogDescription>
              Adjust application settings and preferences. Changes will be applied immediately.
            </DialogDescription>
          </DialogHeader>

          {selectedApp && (
            <div className="space-y-6 py-4">
              {/* Basic Settings */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Basic Settings</h3>
                
                <div className="space-y-2">
                  <Label htmlFor="sessionTimeout">Session Timeout (minutes)</Label>
                  <Input
                    id="sessionTimeout"
                    type="number"
                    min="1"
                    value={configData.sessionTimeout}
                    onChange={(e) => setConfigData(prev => ({ 
                      ...prev, 
                      sessionTimeout: parseInt(e.target.value) || 1 
                    }))}
                  />
                  <p className="text-xs text-muted-foreground">
                    Time before an inactive session expires
                  </p>
                </div>
              </div>

              {/* Notification Settings */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Notification Settings</h3>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="notifications">Enable Notifications</Label>
                    <p className="text-xs text-muted-foreground">
                      Receive alerts for important application events
                    </p>
                  </div>
                  <Switch
                    id="notifications"
                    checked={configData.enableNotifications}
                    onCheckedChange={(checked) => setConfigData(prev => ({ 
                      ...prev, 
                      enableNotifications: checked 
                    }))}
                  />
                </div>
              </div>

              {/* Advanced Settings Placeholder */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Advanced Settings</h3>
                <Card className="bg-muted/50">
                  <CardContent className="pt-6">
                    <p className="text-sm text-muted-foreground text-center">
                      Advanced configuration options will be available here
                    </p>
                  </CardContent>
                </Card>
              </div>

              <div className="flex justify-end space-x-2 pt-4 border-t">
                <Button variant="outline" onClick={() => setIsConfigDialogOpen(false)}>
                  Cancel
                </Button>
                <Button variant="vr-primary" onClick={handleSaveConfig}>
                  <Save className="w-4 h-4 mr-2" />
                  Save Configuration
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}


