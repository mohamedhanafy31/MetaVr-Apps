'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { HoverCard } from '@/components/motion/HoverCard';
import { Reveal } from '@/components/motion/Reveal';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { DeleteApplicationDialog, DeleteAllApplicationsDialog } from '@/components/ui/confirmation-dialog';
import { useDebounce } from '@/hooks/useDebounce';
import { 
  Building2, 
  Plus, 
  Search, 
  Settings, 
  Eye, 
  Monitor,
  Globe,
  Smartphone,
  Activity,
  CheckCircle,
  AlertCircle,
  XCircle,
  Trash2,
  Inbox,
  Lock,
  Unlock
} from 'lucide-react';
import { toast } from 'sonner';
// import { format } from 'date-fns';

interface Application {
  id: string;
  name: string;
  description: string;
  platform: 'desktop' | 'web' | 'mobile';
  authRequired: boolean;
  status: 'active' | 'maintenance' | 'inactive';
  path?: string | null;
  url?: string | null;
  port?: number | null;
  deploymentType?: 'manual' | 'github';
  healthCheck: {
    lastCheck: string;
    status: 'healthy' | 'warning' | 'error';
  };
  createdAt: string;
  updatedAt: string;
}

const platformLabels = {
  desktop: 'Desktop',
  web: 'Web',
  mobile: 'Mobile',
};

const statusOptions = [
  { value: 'active', label: 'Active', color: 'bg-emerald-100 text-emerald-700', icon: CheckCircle },
  { value: 'maintenance', label: 'Maintenance', color: 'bg-amber-100 text-amber-700', icon: AlertCircle },
  { value: 'inactive', label: 'Inactive', color: 'bg-slate-200 text-slate-700', icon: XCircle },
];

const healthStatusColors = {
  healthy: 'text-green-600',
  warning: 'text-yellow-600',
  error: 'text-red-600',
};

function ApplicationsManagementPageContent() {
  const searchParams = useSearchParams();
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [platformFilter, setPlatformFilter] = useState<string>('all');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [selectedApplication, setSelectedApplication] = useState<Application | null>(null);
  const [createErrors, setCreateErrors] = useState<Record<string, string>>({});

  // Form state for create/edit
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    platform: 'desktop' as 'desktop' | 'web' | 'mobile',
    authRequired: true,
    status: 'active' as 'active' | 'maintenance' | 'inactive',
    path: '',
    url: '',
    port: '',
    deploymentType: 'manual' as 'manual' | 'github',
  });

  // Confirmation dialog states
  const [deleteApplicationDialog, setDeleteApplicationDialog] = useState<{
    isOpen: boolean;
    application: Application | null;
    isLoading: boolean;
  }>({
    isOpen: false,
    application: null,
    isLoading: false
  });

  const [deleteAllApplicationsDialog, setDeleteAllApplicationsDialog] = useState<{
    isOpen: boolean;
    isLoading: boolean;
  }>({
    isOpen: false,
    isLoading: false
  });

  useEffect(() => {
    fetchApplications();
  }, []);
  
  useEffect(() => {
    // Handle URL params for view/edit after applications load
    if (applications.length > 0) {
      const viewId = searchParams.get('view');
      const editId = searchParams.get('edit');
      
      if (viewId) {
        const app = applications.find(a => a.id === viewId);
        if (app && !isViewDialogOpen) {
          setSelectedApplication(app);
          setIsViewDialogOpen(true);
        }
      }
      
      if (editId) {
        const app = applications.find(a => a.id === editId);
        if (app && !isEditDialogOpen) {
          setSelectedApplication(app);
          populateFormForEdit(app);
          setIsEditDialogOpen(true);
        }
      }
    }
  }, [applications, searchParams]);

  const fetchApplications = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/applications');
      if (response.ok) {
        const data = await response.json();
        setApplications(data.data || []);
      } else {
        toast.error('Failed to load applications');
      }
    } catch (error) {
      console.error('Error fetching applications:', error);
      toast.error('Failed to load applications');
    } finally {
      setLoading(false);
    }
  };

  const validateCreateForm = (): boolean => {
    const errors: Record<string, string> = {};
    
    if (!formData.name.trim()) {
      errors.name = 'Application name is required';
    }
    
    if (!formData.description.trim()) {
      errors.description = 'Description is required';
    }
    
    if (formData.deploymentType === 'manual' && !formData.path && !formData.url) {
      errors.path = 'Either App Path or External URL is required for manual deployment';
    }
    
    // In production, require URL for active applications
    const isProduction = typeof window !== 'undefined' && 
      (window.location.hostname !== 'localhost' && !window.location.hostname.startsWith('127.0.0.1'));
    if (isProduction && (formData.status === 'active' || !formData.status) && !formData.url) {
      errors.url = 'External URL is required for active applications in production. Please provide the deployed Cloud Run URL.';
    }
    
    setCreateErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCreateApplication = async () => {
    if (!validateCreateForm()) {
      return;
    }
    
    try {
      const response = await fetch('/api/applications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description,
          platform: formData.platform,
          authRequired: formData.authRequired,
          status: formData.status,
          path: formData.path || null,
          url: formData.url || null,
          port: formData.port ? parseInt(formData.port) : null,
          deploymentType: formData.deploymentType,
          healthCheck: {
            lastCheck: new Date().toISOString(),
            status: 'healthy',
          },
        }),
      });

      if (response.ok) {
        toast.success('Application created successfully');
        setIsCreateDialogOpen(false);
        setCreateErrors({});
        resetForm();
        fetchApplications();
      } else {
        const error = await response.json();
        toast.error(error.message || 'Failed to create application');
      }
    } catch {
      toast.error('An error occurred while creating application');
    }
  };

  const handleUpdateApplicationStatus = async (appId: string, status: 'active' | 'maintenance' | 'inactive') => {
    try {
      const response = await fetch(`/api/applications/${appId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status }),
      });

      if (response.ok) {
        toast.success(`Application ${status === 'active' ? 'activated' : status === 'maintenance' ? 'put in maintenance' : 'deactivated'} successfully`);
        fetchApplications();
      } else {
        toast.error('Failed to update application status');
      }
    } catch {
      toast.error('An error occurred');
    }
  };

  const handleDeleteAllApplications = async () => {
    setDeleteAllApplicationsDialog({
      isOpen: true,
      isLoading: false
    });
  };

  const confirmDeleteAllApplications = async () => {
    setDeleteAllApplicationsDialog(prev => ({ ...prev, isLoading: true }));
    
    try {
      const response = await fetch('/api/applications', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        toast.success('All applications deleted successfully');
        fetchApplications();
        
        setDeleteAllApplicationsDialog({
          isOpen: false,
          isLoading: false
        });
      } else {
        toast.error('Failed to delete all applications');
        setDeleteAllApplicationsDialog(prev => ({ ...prev, isLoading: false }));
      }
    } catch {
      toast.error('An error occurred while deleting applications');
      setDeleteAllApplicationsDialog(prev => ({ ...prev, isLoading: false }));
    }
  };

  const handleDeleteApplication = async (appId: string) => {
    const application = applications.find(app => app.id === appId);
    if (application) {
      setDeleteApplicationDialog({
        isOpen: true,
        application,
        isLoading: false
      });
    }
  };

  const confirmDeleteApplication = async () => {
    if (!deleteApplicationDialog.application) return;
    
    setDeleteApplicationDialog(prev => ({ ...prev, isLoading: true }));
    
    try {
      const response = await fetch(`/api/applications/${deleteApplicationDialog.application.id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        toast.success('Application deleted successfully');
        fetchApplications();
        
        setDeleteApplicationDialog({
          isOpen: false,
          application: null,
          isLoading: false
        });
      } else {
        toast.error('Failed to delete application');
        setDeleteApplicationDialog(prev => ({ ...prev, isLoading: false }));
      }
    } catch {
      toast.error('An error occurred while deleting application');
      setDeleteApplicationDialog(prev => ({ ...prev, isLoading: false }));
    }
  };

  const handleUpdateApplication = async () => {
    if (!selectedApplication) return;

    // In production, require URL for active applications
    const isProduction = typeof window !== 'undefined' && 
      (window.location.hostname !== 'localhost' && !window.location.hostname.startsWith('127.0.0.1'));
    if (isProduction && (formData.status === 'active' || !formData.status) && !formData.url) {
      toast.error('External URL is required for active applications in production. Please provide the deployed Cloud Run URL.');
      return;
    }

    try {
      const response = await fetch(`/api/applications/${selectedApplication.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description,
          platform: formData.platform,
          authRequired: formData.authRequired,
          status: formData.status,
          path: formData.path || null,
          url: formData.url || null,
          port: formData.port ? parseInt(formData.port) : null,
        }),
      });

      if (response.ok) {
        toast.success('Application updated successfully');
        setIsEditDialogOpen(false);
        fetchApplications();
        resetForm();
      } else {
        const error = await response.json();
        toast.error(error.message || 'Failed to update application');
      }
    } catch {
      toast.error('An error occurred');
    }
  };

  const populateFormForEdit = (app: Application) => {
    setFormData({
      name: app.name,
      description: app.description,
      platform: app.platform,
      authRequired: app.authRequired,
      status: app.status,
      path: app.path || '',
      url: app.url || '',
      port: app.port?.toString() || '',
      deploymentType: app.deploymentType || 'manual',
    });
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      platform: 'desktop' as 'desktop' | 'web' | 'mobile',
      authRequired: true,
      status: 'active' as 'active' | 'maintenance' | 'inactive',
      path: '',
      url: '',
      port: '',
      deploymentType: 'manual' as 'manual' | 'github',
    });
  };

  const filteredApplications = applications.filter(app => {
    const matchesSearch = app.name.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
                         app.description.toLowerCase().includes(debouncedSearchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || app.status === statusFilter;
    const matchesPlatform = platformFilter === 'all' || app.platform === platformFilter;
    
    return matchesSearch && matchesStatus && matchesPlatform;
  });
  
  const handleStatCardClick = (status: string) => {
    if (status === 'all') {
      setStatusFilter('all');
    } else {
      setStatusFilter(status);
    }
  };

  const activeApplications = applications.filter(a => a.status === 'active').length;
  const maintenanceApplications = applications.filter(a => a.status === 'maintenance').length;
  if (loading) {
    return (
      <div className="flex items-center justify-center p-4 md:p-6">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 md:h-12 md:w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground text-sm md:text-base">Loading applications...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 md:space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 rounded-xl border border-border/40 bg-gradient-to-br from-background via-background/80 to-background p-5">
        <div className="flex flex-col gap-2">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Admin · Applications</p>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Applications Management</h1>
          <p className="text-sm md:text-base text-muted-foreground">Monitor VR/AR apps, assign access, and streamline deployments.</p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-muted-foreground">Connected workspace • {applications.length} apps</div>
          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button className="w-full sm:w-auto min-h-[44px]">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Application
                </Button>
              </DialogTrigger>
            <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create New Application</DialogTitle>
                <DialogDescription>
                  Add a new VR/AR application to the platform
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Application Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => {
                      setFormData(prev => ({ ...prev, name: e.target.value }));
                      if (createErrors.name) {
                        setCreateErrors(prev => ({ ...prev, name: '' }));
                      }
                    }}
                    placeholder="VR Training Simulator"
                    className={`min-h-[44px] ${createErrors.name ? 'border-error' : ''}`}
                    aria-invalid={!!createErrors.name}
                    aria-describedby={createErrors.name ? 'name-error' : undefined}
                  />
                  {createErrors.name && (
                    <p id="name-error" className="text-sm text-error" role="alert">
                      {createErrors.name}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Input
                    id="description"
                    value={formData.description}
                    onChange={(e) => {
                      setFormData(prev => ({ ...prev, description: e.target.value }));
                      if (createErrors.description) {
                        setCreateErrors(prev => ({ ...prev, description: '' }));
                      }
                    }}
                    placeholder="Immersive training environment"
                    className={`min-h-[44px] ${createErrors.description ? 'border-error' : ''}`}
                    aria-invalid={!!createErrors.description}
                    aria-describedby={createErrors.description ? 'description-error' : undefined}
                  />
                  {createErrors.description && (
                    <p id="description-error" className="text-sm text-error" role="alert">
                      {createErrors.description}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="platform">Platform</Label>
                  <Select value={formData.platform} onValueChange={(value: string) => setFormData(prev => ({ ...prev, platform: value as 'desktop' | 'web' | 'mobile' }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select platform" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="desktop">Desktop</SelectItem>
                      <SelectItem value="web">Web</SelectItem>
                      <SelectItem value="mobile">Mobile</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="deploymentType">Deployment Type</Label>
                  <Select value={formData.deploymentType} onValueChange={(value: string) => setFormData(prev => ({ ...prev, deploymentType: value as 'manual' | 'github' }))}>
                    <SelectTrigger className="min-h-[44px]">
                      <SelectValue placeholder="Select deployment type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="manual">Manual</SelectItem>
                      <SelectItem value="github">GitHub</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="path">App Path (e.g., apps/iq-questions)</Label>
                  <Input
                    id="path"
                    value={formData.path}
                    onChange={(e) => {
                      setFormData(prev => ({ ...prev, path: e.target.value }));
                      if (createErrors.path) {
                        setCreateErrors(prev => ({ ...prev, path: '' }));
                      }
                    }}
                    placeholder="apps/iq-questions"
                    className={`min-h-[44px] ${createErrors.path ? 'border-error' : ''}`}
                    aria-invalid={!!createErrors.path}
                    aria-describedby={createErrors.path ? 'path-error' : undefined}
                  />
                  <p className="text-xs text-muted-foreground">Relative path to app directory</p>
                  {createErrors.path && (
                    <p id="path-error" className="text-sm text-error" role="alert">
                      {createErrors.path}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="url">
                    External URL {typeof window !== 'undefined' && window.location.hostname !== 'localhost' && !window.location.hostname.startsWith('127.0.0.1') && (formData.status === 'active' || !formData.status) ? '(required in production)' : '(optional)'}
                  </Label>
                  <Input
                    id="url"
                    value={formData.url}
                    onChange={(e) => {
                      setFormData(prev => ({ ...prev, url: e.target.value }));
                      if (createErrors.url) {
                        setCreateErrors(prev => ({ ...prev, url: '' }));
                      }
                    }}
                    placeholder="https://metavr-card-matching-dbgj63mjca-uc.a.run.app"
                    className={`min-h-[44px] ${createErrors.url ? 'border-error' : ''}`}
                    aria-invalid={!!createErrors.url}
                    aria-describedby={createErrors.url ? 'url-error' : undefined}
                  />
                  <p className="text-xs text-muted-foreground">
                    {typeof window !== 'undefined' && window.location.hostname !== 'localhost' && !window.location.hostname.startsWith('127.0.0.1') && (formData.status === 'active' || !formData.status)
                      ? 'Required in production. Provide the deployed Cloud Run URL.'
                      : 'Full URL if app is hosted externally (e.g., Cloud Run URL)'}
                  </p>
                  {createErrors.url && (
                    <p id="url-error" className="text-sm text-error" role="alert">
                      {createErrors.url}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="port">Port (optional, for dev servers)</Label>
                  <Input
                    id="port"
                    type="number"
                    value={formData.port}
                    onChange={(e) => setFormData(prev => ({ ...prev, port: e.target.value }))}
                    placeholder="3001"
                    className="min-h-[44px]"
                  />
                  <p className="text-xs text-muted-foreground">Port number if app runs on separate port</p>
                </div>
                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreateApplication}>
                    Create
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {/* Edit Application Dialog */}
          <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
            <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto overscroll-contain">
              <DialogHeader>
                <DialogTitle>Edit Application</DialogTitle>
                <DialogDescription>
                  Update application information and settings
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-name">Application Name</Label>
                  <Input
                    id="edit-name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="VR Shopping Experience"
                    className="min-h-[44px]"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-description">Description</Label>
                  <Input
                    id="edit-description"
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Immersive virtual shopping environment"
                    className="min-h-[44px]"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-platform">Platform</Label>
                  <Select value={formData.platform} onValueChange={(value: string) => setFormData(prev => ({ ...prev, platform: value as 'desktop' | 'web' | 'mobile' }))}>
                    <SelectTrigger className="min-h-[44px]">
                      <SelectValue placeholder="Select platform" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="desktop">Desktop</SelectItem>
                      <SelectItem value="web">Web</SelectItem>
                      <SelectItem value="mobile">Mobile</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-status">Status</Label>
                  <Select value={formData.status} onValueChange={(value: string) => setFormData(prev => ({ ...prev, status: value as 'active' | 'maintenance' | 'inactive' }))}>
                    <SelectTrigger className="min-h-[44px]">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="maintenance">Maintenance</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="edit-authRequired"
                      checked={formData.authRequired}
                      onChange={(e) => setFormData(prev => ({ ...prev, authRequired: e.target.checked }))}
                      className="rounded"
                    />
                    <Label htmlFor="edit-authRequired">Authentication Required</Label>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-path">App Path</Label>
                  <Input
                    id="edit-path"
                    value={formData.path}
                    onChange={(e) => setFormData(prev => ({ ...prev, path: e.target.value }))}
                    placeholder="apps/iq-questions"
                    className="min-h-[44px]"
                  />
                  <p className="text-xs text-muted-foreground">Relative path to app directory</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-url">
                    External URL {typeof window !== 'undefined' && window.location.hostname !== 'localhost' && !window.location.hostname.startsWith('127.0.0.1') && (formData.status === 'active' || !formData.status) ? '(required in production)' : '(optional)'}
                  </Label>
                  <Input
                    id="edit-url"
                    value={formData.url}
                    onChange={(e) => setFormData(prev => ({ ...prev, url: e.target.value }))}
                    placeholder="https://metavr-card-matching-dbgj63mjca-uc.a.run.app"
                    className="min-h-[44px]"
                  />
                  <p className="text-xs text-muted-foreground">
                    {typeof window !== 'undefined' && window.location.hostname !== 'localhost' && !window.location.hostname.startsWith('127.0.0.1') && (formData.status === 'active' || !formData.status)
                      ? 'Required in production. Provide the deployed Cloud Run URL.'
                      : 'Full URL if app is hosted externally (e.g., Cloud Run URL)'}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-port">Port (optional, for dev servers)</Label>
                  <Input
                    id="edit-port"
                    type="number"
                    value={formData.port}
                    onChange={(e) => setFormData(prev => ({ ...prev, port: e.target.value }))}
                    placeholder="3001"
                    className="min-h-[44px]"
                  />
                  <p className="text-xs text-muted-foreground">Port number if app runs on separate port</p>
                </div>
                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleUpdateApplication}>
                    Save Changes
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          </div>

          {/* View Application Details Dialog */}
          <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
            <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto overscroll-contain">
              <DialogHeader>
                <DialogTitle>Application Details</DialogTitle>
                <DialogDescription>
                  Complete information for {selectedApplication?.name}
                </DialogDescription>
              </DialogHeader>
              {selectedApplication && (
                <div className="space-y-6">
                  {/* Basic Information */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center space-x-2">
                        <div className="p-2 bg-primary/10 rounded-lg">
                          {selectedApplication.platform === 'desktop' && <Monitor className="w-5 h-5 text-primary" />}
                          {selectedApplication.platform === 'web' && <Globe className="w-5 h-5 text-primary" />}
                          {selectedApplication.platform === 'mobile' && <Smartphone className="w-5 h-5 text-primary" />}
                        </div>
                        <span>Basic Information</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label className="text-sm font-medium text-muted-foreground">Application Name</Label>
                          <p className="text-lg font-semibold">{selectedApplication.name}</p>
                        </div>
                        <div>
                          <Label className="text-sm font-medium text-muted-foreground">Platform</Label>
                          <Badge className="bg-blue-100 text-blue-800">
                            {selectedApplication.platform === 'desktop' && <Monitor className="w-3 h-3 mr-1" />}
                            {selectedApplication.platform === 'web' && <Globe className="w-3 h-3 mr-1" />}
                            {selectedApplication.platform === 'mobile' && <Smartphone className="w-3 h-3 mr-1" />}
                            {selectedApplication.platform.charAt(0).toUpperCase() + selectedApplication.platform.slice(1)}
                          </Badge>
                        </div>
                        <div>
                          <Label className="text-sm font-medium text-muted-foreground">Status</Label>
                          <Badge className={
                            selectedApplication.status === 'active' ? 'bg-green-100 text-green-800' :
                            selectedApplication.status === 'maintenance' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-gray-100 text-gray-800'
                          }>
                            {selectedApplication.status === 'active' && <CheckCircle className="w-3 h-3 mr-1" />}
                            {selectedApplication.status === 'maintenance' && <AlertCircle className="w-3 h-3 mr-1" />}
                            {selectedApplication.status === 'inactive' && <XCircle className="w-3 h-3 mr-1" />}
                            {selectedApplication.status.charAt(0).toUpperCase() + selectedApplication.status.slice(1)}
                          </Badge>
                        </div>
                        <div>
                          <Label className="text-sm font-medium text-muted-foreground">Authentication</Label>
                          <Badge className={selectedApplication.authRequired ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}>
                            {selectedApplication.authRequired ? 'Required' : 'Optional'}
                          </Badge>
                        </div>
                        <div className="md:col-span-2">
                          <Label className="text-sm font-medium text-muted-foreground">Description</Label>
                          <p className="text-lg">{selectedApplication.description}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Health Status */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center space-x-2">
                        <Activity className="w-5 h-5" />
                        <span>Health Status</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label className="text-sm font-medium text-muted-foreground">Health Status</Label>
                          <Badge className={
                            selectedApplication.healthCheck?.status === 'healthy' ? 'bg-green-100 text-green-800' :
                            selectedApplication.healthCheck?.status === 'warning' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }>
                            {selectedApplication.healthCheck?.status === 'healthy' && <CheckCircle className="w-3 h-3 mr-1" />}
                            {selectedApplication.healthCheck?.status === 'warning' && <AlertCircle className="w-3 h-3 mr-1" />}
                            {selectedApplication.healthCheck?.status === 'error' && <XCircle className="w-3 h-3 mr-1" />}
                            {selectedApplication.healthCheck?.status || 'Unknown'}
                          </Badge>
                        </div>
                        <div>
                          <Label className="text-sm font-medium text-muted-foreground">Last Health Check</Label>
                          <p className="text-lg">
                            {selectedApplication.healthCheck?.lastCheck 
                              ? new Date(selectedApplication.healthCheck.lastCheck).toLocaleString()
                              : 'Never'
                            }
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Application Information */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Application Information</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label className="text-sm font-medium text-muted-foreground">Application ID</Label>
                          <p className="text-sm font-mono bg-muted p-2 rounded">{selectedApplication.id}</p>
                        </div>
                        <div>
                          <Label className="text-sm font-medium text-muted-foreground">Created At</Label>
                          <p className="text-lg">{new Date(selectedApplication.createdAt).toLocaleString()}</p>
                        </div>
                        <div>
                          <Label className="text-sm font-medium text-muted-foreground">Last Updated</Label>
                          <p className="text-lg">{new Date(selectedApplication.updatedAt).toLocaleString()}</p>
                        </div>
                        <div>
                          <Label className="text-sm font-medium text-muted-foreground">Application Status</Label>
                          <div className="flex items-center space-x-2">
                            <Badge className={
                              selectedApplication.status === 'active' ? 'bg-green-100 text-green-800' :
                              selectedApplication.status === 'maintenance' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-gray-100 text-gray-800'
                            }>
                              {selectedApplication.status.charAt(0).toUpperCase() + selectedApplication.status.slice(1)}
                            </Badge>
                            <span className="text-sm text-muted-foreground">
                              {selectedApplication.status === 'active' ? 'Available for users' : 
                               selectedApplication.status === 'maintenance' ? 'Under maintenance' : 
                               'Not available'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
              <div className="flex justify-end pt-4">
                <Button onClick={() => setIsViewDialogOpen(false)}>
                  Close
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <Button
            variant="outline"
            onClick={handleDeleteAllApplications}
            className="w-full sm:w-auto min-h-[44px] border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Delete All Apps
          </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 w-full">
          {[
            {
              title: 'Total Applications',
              value: applications.length,
              icon: Building2,
              subtitle: 'Currently tracked',
              status: 'all',
            },
            {
              title: 'Active',
              value: activeApplications,
              icon: Activity,
              subtitle: 'Serving end-users',
              status: 'active',
            },
            {
              title: 'Maintenance',
              value: maintenanceApplications,
              icon: AlertCircle,
              subtitle: 'Paused for updates',
              status: 'maintenance',
            },
            {
              title: 'Pending Requests',
              value: 0,
              icon: Inbox,
              subtitle: 'Awaiting approval',
              status: 'all',
            },
          ].map((card, idx) => (
            <Reveal key={card.title} delay={idx * 0.05}>
              <HoverCard>
                <Card 
                  className={`h-full border-border/50 ${card.status !== 'all' ? 'cursor-pointer hover:shadow-md transition-shadow' : ''}`}
                  onClick={() => card.status !== 'all' && handleStatCardClick(card.status)}
                >
                  <CardHeader className="flex items-center justify-between space-y-0 pb-2">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">{card.title}</p>
                      <p className="text-2xl font-semibold leading-tight">{card.value}</p>
                    </div>
                    <div className="rounded-full bg-primary/10 p-2 text-primary">
                      <card.icon className="h-4 w-4" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xs text-muted-foreground">{card.subtitle}</p>
                  </CardContent>
                </Card>
              </HoverCard>
            </Reveal>
          ))}
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle>Applications</CardTitle>
            <CardDescription>Monitor and manage your VR/AR applications</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-[2fr,1fr,1fr] mb-6">
              <div className="flex flex-col gap-2">
                <Label htmlFor="applications-search" className="text-xs uppercase tracking-wide text-muted-foreground">
                  Search
                </Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <Input
                    id="applications-search"
                    placeholder="Search applications..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 min-h-[44px]"
                  />
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="applications-status-filter" className="text-xs uppercase tracking-wide text-muted-foreground">
                  Status
                </Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger id="applications-status-filter" className="min-h-[44px]">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="maintenance">Maintenance</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="applications-platform-filter" className="text-xs uppercase tracking-wide text-muted-foreground">
                  Platform
                </Label>
                <Select value={platformFilter} onValueChange={setPlatformFilter}>
                  <SelectTrigger id="applications-platform-filter" className="min-h-[44px]">
                    <SelectValue placeholder="Filter by platform" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Platforms</SelectItem>
                    <SelectItem value="desktop">Desktop</SelectItem>
                    <SelectItem value="web">Web</SelectItem>
                    <SelectItem value="mobile">Mobile</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Applications Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 auto-rows-fr">
              {filteredApplications.map((app) => {
                const StatusIcon = statusOptions.find(s => s.value === app.status)?.icon || CheckCircle;

                return (
                  <Reveal key={app.id}>
                  <HoverCard>
                  <Card className="relative flex h-full flex-col overflow-hidden hover:shadow-lg active:scale-[0.98] transition-all duration-200">
                    <CardHeader className="pb-3 flex-shrink-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                            <CardTitle className="text-lg truncate">{app.name}</CardTitle>
                            <div className="text-xs space-y-1 mt-1">
                              <div className="truncate">{platformLabels[app.platform]}</div>
                              <div className={`truncate ${healthStatusColors[app.healthCheck?.status || 'healthy']}`}>
                                {app.healthCheck?.status || 'healthy'}
                              </div>
                            </div>
                          </div>
                        <Badge className={`flex-shrink-0 ${statusOptions.find(s => s.value === app.status)?.color}`}>
                          <StatusIcon className="w-3 h-3 mr-1" />
                          {statusOptions.find(s => s.value === app.status)?.label}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4 flex-1 flex flex-col">
                      <p className="text-sm text-muted-foreground line-clamp-2 flex-shrink-0">{app.description}</p>
                      
                      <div className="flex items-center gap-2 flex-wrap flex-shrink-0">
                        <Badge variant="outline" className="text-xs">
                          {app.authRequired ? (
                            <>
                              <Lock className="w-3 h-3 mr-1" />
                              Auth Required
                            </>
                          ) : (
                            <>
                              <Unlock className="w-3 h-3 mr-1" />
                              Auth Optional
                            </>
                          )}
                        </Badge>
                        {app.healthCheck?.status && app.healthCheck.status !== 'healthy' && (
                          <Badge variant="outline" className="text-xs">
                            <AlertCircle className="w-3 h-3 mr-1" />
                            {app.healthCheck.status}
                          </Badge>
                        )}
                      </div>
                    </CardContent>
                    <CardFooter className="pt-0 flex flex-col gap-2 flex-shrink-0 mt-auto">
                      {/* Primary Actions */}
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedApplication(app);
                            setIsViewDialogOpen(true);
                          }}
                          className="flex-1 min-w-0 min-h-[44px]"
                        >
                          <Eye className="w-4 h-4 mr-1.5" />
                          <span>Details</span>
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedApplication(app);
                            populateFormForEdit(app);
                            setIsEditDialogOpen(true);
                          }}
                          className="flex-1 min-w-0 min-h-[44px]"
                        >
                          <Settings className="w-4 h-4 mr-1.5" />
                          <span>Edit</span>
                        </Button>
                      </div>
                      {/* Secondary Actions */}
                      <div className="flex items-center justify-between pt-1 border-t">
                        {app.status === 'active' ? (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleUpdateApplicationStatus(app.id, 'maintenance')}
                            className="h-9 px-3 text-xs"
                            title="Pause application"
                          >
                            <AlertCircle className="w-3.5 h-3.5 mr-1.5" />
                            <span className="hidden sm:inline">Pause</span>
                          </Button>
                        ) : app.status === 'maintenance' ? (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleUpdateApplicationStatus(app.id, 'active')}
                            className="h-9 px-3 text-xs"
                            title="Resume application"
                          >
                            <CheckCircle className="w-3.5 h-3.5 mr-1.5" />
                            <span className="hidden sm:inline">Resume</span>
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleUpdateApplicationStatus(app.id, 'active')}
                            className="h-9 px-3 text-xs"
                            title="Activate application"
                          >
                            <CheckCircle className="w-3.5 h-3.5 mr-1.5" />
                            <span className="hidden sm:inline">Activate</span>
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive hover:text-destructive/80 hover:bg-destructive/10 h-9 px-3 text-xs"
                          onClick={() => handleDeleteApplication(app.id)}
                          title="Delete application"
                        >
                          <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                          <span className="hidden sm:inline">Delete</span>
                        </Button>
                      </div>
                    </CardFooter>
                  </Card>
                  </HoverCard>
                  </Reveal>
                );
              })}
            </div>

            {filteredApplications.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                {searchTerm || statusFilter !== 'all' || platformFilter !== 'all' ? (
                  <>
                    <p className="text-lg font-semibold mb-2 text-foreground">No applications match your filters</p>
                    <p className="text-sm mb-4">Try adjusting your search or filter criteria</p>
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        setSearchTerm('');
                        setStatusFilter('all');
                        setPlatformFilter('all');
                      }}
                    >
                      Clear Filters
                    </Button>
                  </>
                ) : (
                  <>
                    <p className="text-lg font-semibold mb-2 text-foreground">No applications yet</p>
                    <p className="text-sm mb-4">Get started by creating your first application</p>
                    <Button onClick={() => setIsCreateDialogOpen(true)}>
                      <Plus className="w-4 h-4 mr-2" />
                      Create Application
                    </Button>
                  </>
                )}
              </div>
            )}
          </CardContent>
        </Card>

      {/* Confirmation Dialogs */}
      {deleteApplicationDialog.application && (
        <DeleteApplicationDialog
          isOpen={deleteApplicationDialog.isOpen}
          onClose={() => setDeleteApplicationDialog({
            isOpen: false,
            application: null,
            isLoading: false
          })}
          onConfirm={confirmDeleteApplication}
          appName={deleteApplicationDialog.application.name}
          isLoading={deleteApplicationDialog.isLoading}
        />
      )}

      <DeleteAllApplicationsDialog
        isOpen={deleteAllApplicationsDialog.isOpen}
        onClose={() => setDeleteAllApplicationsDialog({
          isOpen: false,
          isLoading: false
        })}
        onConfirm={confirmDeleteAllApplications}
        appCount={applications.length}
        isLoading={deleteAllApplicationsDialog.isLoading}
      />
    </div>
  );
}

export default function ApplicationsManagementPage() {
  return (
    <Suspense fallback={
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <p>Loading...</p>
        </div>
      </div>
    }>
      <ApplicationsManagementPageContent />
    </Suspense>
  );
}
