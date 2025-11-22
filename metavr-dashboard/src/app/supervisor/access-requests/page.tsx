'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Mail,
  User,
  Phone,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Loader2,
  Search,
  AlertCircle,
} from 'lucide-react';
import { toast } from 'sonner';

interface ExistingUserApp {
  appKey: string;
  appName: string;
  enabled: boolean;
  grantedAt?: number;
}

interface AccessRequest {
  id: string;
  email: string;
  name: string;
  phone: string;
  appId: string;
  appKey: string;
  appPath: string;
  appName: string;
  status: 'pending' | 'approved' | 'rejected';
  requestedAt: string | Date;
  reviewedAt?: string | Date | null;
  reviewedBy?: string | null;
  rejectionReason?: string | null;
  userId?: string; // User ID for regenerate code
  existingApps?: ExistingUserApp[];
}

interface GroupedRequests {
  [appKey: string]: {
    appName: string;
    requests: AccessRequest[];
  };
}

export default function AccessRequestsPage() {
  const [requests, setRequests] = useState<GroupedRequests>({});
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<AccessRequest | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [processing, setProcessing] = useState<string | null>(null);

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/user-access/requests');
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          // Transform the data to include request IDs
          const transformed: GroupedRequests = {};
          for (const [appKey, requestList] of Object.entries(result.data)) {
            if (Array.isArray(requestList) && requestList.length > 0) {
              const typedRequests = requestList as AccessRequest[];
              transformed[appKey] = {
                appName: typedRequests[0].appName || appKey,
                requests: typedRequests.map((req, index) => ({
                  ...req,
                  id: req.id || `${appKey}-${index}`, // Use Firestore doc ID if available
                })),
              };
            }
          }
          setRequests(transformed);
        }
      } else {
        toast.error('Failed to fetch access requests');
      }
    } catch (error) {
      console.error('Failed to fetch requests:', error);
      toast.error('Failed to fetch access requests');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (request: AccessRequest) => {
    if (!request.id) {
      toast.error('Invalid request ID');
      return;
    }

    setProcessing(request.id);
    try {
      const response = await fetch('/api/user-access/approve', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ requestId: request.id }),
      });

      const result = await response.json();

      if (result.success) {
        toast.success('Access request approved. Access code sent via email.');
        // Update request with userId if returned
        if (result.userId && request.id) {
          setRequests((prev) => {
            const updated = { ...prev };
            for (const appKey in updated) {
              updated[appKey].requests = updated[appKey].requests.map((req) =>
                req.id === request.id ? { ...req, userId: result.userId } : req
              );
            }
            return updated;
          });
        }
        await fetchRequests();
      } else {
        toast.error(result.message || 'Failed to approve request');
      }
    } catch (error) {
      console.error('Approve error:', error);
      toast.error('Failed to approve request');
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async () => {
    if (!selectedRequest || !selectedRequest.id) {
      toast.error('Invalid request');
      return;
    }

    setProcessing(selectedRequest.id);
    try {
      const response = await fetch('/api/user-access/reject', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requestId: selectedRequest.id,
          reason: rejectionReason || undefined,
        }),
      });

      const result = await response.json();

      if (result.success) {
        toast.success('Access request rejected. Notification sent via email.');
        setRejectDialogOpen(false);
        setSelectedRequest(null);
        setRejectionReason('');
        await fetchRequests();
      } else {
        toast.error(result.message || 'Failed to reject request');
      }
    } catch (error) {
      console.error('Reject error:', error);
      toast.error('Failed to reject request');
    } finally {
      setProcessing(null);
    }
  };

  const handleRegenerateCode = async (request: AccessRequest) => {
    if (!request.userId) {
      toast.error('User ID not available. Please refresh the page.');
      return;
    }

    setProcessing(request.id);
    try {
      const response = await fetch('/api/user-access/regenerate-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: request.userId,
          appKey: request.appKey,
        }),
      });

      const result = await response.json();

      if (result.success) {
        toast.success('Access code regenerated and sent via email.');
        await fetchRequests();
      } else {
        toast.error(result.message || 'Failed to regenerate code');
      }
    } catch (error) {
      console.error('Regenerate error:', error);
      toast.error('Failed to regenerate code');
    } finally {
      setProcessing(null);
    }
  };

  const openRejectDialog = (request: AccessRequest) => {
    setSelectedRequest(request);
    setRejectionReason('');
    setRejectDialogOpen(true);
  };

  const filteredRequests = (): GroupedRequests => {
    if (!searchTerm) return requests;

    const filtered: GroupedRequests = {};
    const lowerSearch = searchTerm.toLowerCase();

    for (const [appKey, group] of Object.entries(requests)) {
      const matchingRequests = group.requests.filter((req) => {
        const emailMatch = (req.email || '').toLowerCase().includes(lowerSearch);
        const nameMatch = (req.name || '').toLowerCase().includes(lowerSearch);
        const phoneMatch = (req.phone || '').toLowerCase().includes(lowerSearch);
        return emailMatch || nameMatch || phoneMatch;
      });

      if (matchingRequests.length > 0) {
        filtered[appKey] = {
          appName: group.appName,
          requests: matchingRequests,
        };
      }
    }

    return filtered;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return (
          <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Approved
          </Badge>
        );
      case 'rejected':
        return (
          <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
            <XCircle className="w-3 h-3 mr-1" />
            Rejected
          </Badge>
        );
      default:
        return (
          <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
            <AlertCircle className="w-3 h-3 mr-1" />
            Pending
          </Badge>
        );
    }
  };

  return (
    <div className="space-y-4 md:space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">User Access Requests</h1>
        <p className="text-sm md:text-base text-muted-foreground mt-2">
          Review and manage user access requests for applications
        </p>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-4 md:pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Search by email, name, or phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 text-sm md:text-base"
            />
          </div>
        </CardContent>
      </Card>

      {/* Requests by App */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : Object.keys(filteredRequests()).length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Mail className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              {searchTerm ? 'No requests match your search' : 'No access requests found'}
            </p>
          </CardContent>
        </Card>
      ) : (
        Object.entries(filteredRequests()).map(([appKey, group]) => (
          <Card key={appKey}>
            <CardHeader>
              <CardTitle className="text-lg md:text-xl truncate pr-4">{group.appName} - Access Requests</CardTitle>
              <CardDescription className="text-xs md:text-sm">
                {group.requests.length} request(s) for this application
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Desktop/Laptop Table View - Full Width */}
              <div className="hidden xl:block overflow-x-auto -mx-6 px-6">
                <div className="min-w-full">
                  <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Email</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Current Access</TableHead>
                      <TableHead>Requested</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {group.requests.map((request) => (
                      <TableRow key={request.id || `${appKey}-${request.email}`}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Mail className="w-4 h-4 text-muted-foreground" />
                            {request.email || '—'}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-muted-foreground" />
                            {request.name || '—'}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Phone className="w-4 h-4 text-muted-foreground" />
                            {request.phone || '—'}
                          </div>
                        </TableCell>
                        <TableCell>{getStatusBadge(request.status)}</TableCell>
                        <TableCell>
                          {request.existingApps && request.existingApps.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {request.existingApps.map((app) => (
                                <Badge
                                  key={`${request.id}-${app.appKey}`}
                                  variant={app.enabled ? 'secondary' : 'outline'}
                                  className="text-xs"
                                >
                                  {app.appName || app.appKey}
                                </Badge>
                              ))}
                            </div>
                          ) : (
                            <span className="text-sm text-muted-foreground">None</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {request.requestedAt
                            ? new Date(request.requestedAt).toLocaleString()
                            : 'N/A'}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2 flex-wrap">
                            {request.status === 'pending' && (
                              <>
                                <Button
                                  size="sm"
                                  variant="default"
                                  onClick={() => handleApprove(request)}
                                  disabled={processing === request.id}
                                  className="min-w-[100px]"
                                >
                                  {processing === request.id ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                  ) : (
                                    <>
                                      <CheckCircle2 className="w-4 h-4 mr-1.5" />
                                      Approve
                                    </>
                                  )}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => openRejectDialog(request)}
                                  disabled={processing === request.id}
                                  className="min-w-[100px]"
                                >
                                  <XCircle className="w-4 h-4 mr-1.5" />
                                  Reject
                                </Button>
                              </>
                            )}
                            {request.status === 'approved' && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleRegenerateCode(request)}
                                disabled={processing === request.id}
                                className="min-w-[140px]"
                              >
                                <RefreshCw className="w-4 h-4 mr-1.5" />
                                Regenerate Code
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                </div>
              </div>

              {/* Medium Table View - Between Tablet and Laptop (1024px - 1279px) */}
              <div className="hidden lg:block xl:hidden overflow-x-auto -mx-6 px-6">
                <div className="min-w-full">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="min-w-[140px]">Email</TableHead>
                        <TableHead className="min-w-[100px]">Name</TableHead>
                        <TableHead className="min-w-[90px]">Phone</TableHead>
                        <TableHead className="min-w-[90px]">Status</TableHead>
                        <TableHead className="min-w-[120px]">Current Access</TableHead>
                        <TableHead className="min-w-[100px]">Requested</TableHead>
                        <TableHead className="text-right min-w-[180px]">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {group.requests.map((request) => (
                        <TableRow key={request.id || `${appKey}-${request.email}`}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Mail className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                              <span className="truncate max-w-[120px]">{request.email || '—'}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <User className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                              <span className="truncate max-w-[80px]">{request.name || '—'}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Phone className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                              <span className="truncate max-w-[70px]">{request.phone || '—'}</span>
                            </div>
                          </TableCell>
                          <TableCell>{getStatusBadge(request.status)}</TableCell>
                          <TableCell>
                            {request.existingApps && request.existingApps.length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {request.existingApps.map((app) => (
                                  <Badge
                                    key={`${request.id}-${app.appKey}`}
                                    variant={app.enabled ? 'secondary' : 'outline'}
                                    className="text-xs"
                                  >
                                    {app.appName || app.appKey}
                                  </Badge>
                                ))}
                              </div>
                            ) : (
                              <span className="text-sm text-muted-foreground">None</span>
                            )}
                          </TableCell>
                          <TableCell className="text-sm">
                            {request.requestedAt
                              ? new Date(request.requestedAt).toLocaleDateString()
                              : 'N/A'}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2 flex-wrap">
                              {request.status === 'pending' && (
                                <>
                                  <Button
                                    size="sm"
                                    variant="default"
                                    onClick={() => handleApprove(request)}
                                    disabled={processing === request.id}
                                    className="min-w-[85px] text-xs"
                                  >
                                    {processing === request.id ? (
                                      <Loader2 className="w-3 h-3 animate-spin" />
                                    ) : (
                                      <>
                                        <CheckCircle2 className="w-3 h-3 mr-1" />
                                        Approve
                                      </>
                                    )}
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    onClick={() => openRejectDialog(request)}
                                    disabled={processing === request.id}
                                    className="min-w-[85px] text-xs"
                                  >
                                    <XCircle className="w-3 h-3 mr-1" />
                                    Reject
                                  </Button>
                                </>
                              )}
                              {request.status === 'approved' && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleRegenerateCode(request)}
                                  disabled={processing === request.id}
                                  className="min-w-[100px] text-xs"
                                >
                                  <RefreshCw className="w-3 h-3 mr-1" />
                                  Regenerate
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {/* Small Tablet Table View - Between Tablet and Laptop (768px - 1023px) */}
              <div className="hidden md:block lg:hidden overflow-x-auto -mx-6 px-6">
                <div className="min-w-full">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="min-w-[140px]">User Info</TableHead>
                        <TableHead className="min-w-[80px]">Status</TableHead>
                        <TableHead className="min-w-[100px]">Current Access</TableHead>
                        <TableHead className="min-w-[80px]">Requested</TableHead>
                        <TableHead className="text-right min-w-[160px]">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {group.requests.map((request) => (
                        <TableRow key={request.id || `${appKey}-${request.email}`}>
                          <TableCell>
                            <div className="flex items-center gap-1.5">
                              <Mail className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                              <span className="truncate max-w-[110px] text-sm font-medium">{request.email || '—'}</span>
                            </div>
                            <div className="flex items-center gap-1.5 mt-1">
                              <User className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                              <span className="truncate max-w-[100px] text-xs text-muted-foreground">{request.name || '—'}</span>
                            </div>
                            <div className="flex items-center gap-1.5 mt-1">
                              <Phone className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                              <span className="truncate max-w-[100px] text-xs text-muted-foreground">{request.phone || '—'}</span>
                            </div>
                          </TableCell>
                          <TableCell>{getStatusBadge(request.status)}</TableCell>
                          <TableCell>
                            {request.existingApps && request.existingApps.length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {request.existingApps.map((app) => (
                                  <Badge
                                    key={`${request.id}-${app.appKey}`}
                                    variant={app.enabled ? 'secondary' : 'outline'}
                                    className="text-xs"
                                  >
                                    {app.appName || app.appKey}
                                  </Badge>
                                ))}
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground">None</span>
                            )}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {request.requestedAt
                              ? new Date(request.requestedAt).toLocaleDateString()
                              : 'N/A'}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex flex-col gap-1.5 items-end">
                              {request.status === 'pending' && (
                                <>
                                  <Button
                                    size="sm"
                                    variant="default"
                                    onClick={() => handleApprove(request)}
                                    disabled={processing === request.id}
                                    className="min-w-[75px] text-xs h-7"
                                  >
                                    {processing === request.id ? (
                                      <Loader2 className="w-3 h-3 animate-spin" />
                                    ) : (
                                      <>
                                        <CheckCircle2 className="w-3 h-3 mr-1" />
                                        Approve
                                      </>
                                    )}
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    onClick={() => openRejectDialog(request)}
                                    disabled={processing === request.id}
                                    className="min-w-[75px] text-xs h-7"
                                  >
                                    <XCircle className="w-3 h-3 mr-1" />
                                    Reject
                                  </Button>
                                </>
                              )}
                              {request.status === 'approved' && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleRegenerateCode(request)}
                                  disabled={processing === request.id}
                                  className="min-w-[90px] text-xs h-7"
                                >
                                  <RefreshCw className="w-3 h-3 mr-1" />
                                  Regenerate
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {/* Mobile Card View */}
              <div className="md:hidden space-y-4">
                {group.requests.map((request) => (
                  <Card key={request.id || `${appKey}-${request.email}`} className="border">
                    <CardContent className="pt-6">
                      <div className="space-y-4">
                        {/* User Info */}
                        <div className="space-y-2">
                          <div className="flex items-start gap-2">
                            <Mail className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                            <div className="flex-1 min-w-0">
                              <span className="text-sm font-medium">Email: </span>
                              <span className="text-sm break-words">{request.email || '—'}</span>
                            </div>
                          </div>
                          <div className="flex items-start gap-2">
                            <User className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                            <div className="flex-1 min-w-0">
                              <span className="text-sm font-medium">Name: </span>
                              <span className="text-sm break-words">{request.name || '—'}</span>
                            </div>
                          </div>
                          <div className="flex items-start gap-2">
                            <Phone className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                            <div className="flex-1 min-w-0">
                              <span className="text-sm font-medium">Phone: </span>
                              <span className="text-sm break-words">{request.phone || '—'}</span>
                            </div>
                          </div>
                        </div>

                        {/* Status */}
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">Status:</span>
                          {getStatusBadge(request.status)}
                        </div>

                        {/* Current Access */}
                        <div>
                          <span className="text-sm font-medium">Current Access:</span>
                          <div className="mt-1">
                            {request.existingApps && request.existingApps.length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {request.existingApps.map((app) => (
                                  <Badge
                                    key={`${request.id}-${app.appKey}`}
                                    variant={app.enabled ? 'secondary' : 'outline'}
                                    className="text-xs"
                                  >
                                    {app.appName || app.appKey}
                                  </Badge>
                                ))}
                              </div>
                            ) : (
                              <span className="text-sm text-muted-foreground">None</span>
                            )}
                          </div>
                        </div>

                        {/* Requested Date */}
                        <div>
                          <span className="text-sm font-medium">Requested:</span>
                          <span className="text-sm text-muted-foreground ml-2">
                            {request.requestedAt
                              ? new Date(request.requestedAt).toLocaleString()
                              : 'N/A'}
                          </span>
                        </div>

                        {/* Actions - Always visible at bottom */}
                        <div className="pt-2 border-t">
                          <div className="flex flex-col gap-2">
                            {request.status === 'pending' && (
                              <>
                                <Button
                                  size="sm"
                                  variant="default"
                                  onClick={() => handleApprove(request)}
                                  disabled={processing === request.id}
                                  className="w-full"
                                >
                                  {processing === request.id ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                  ) : (
                                    <>
                                      <CheckCircle2 className="w-4 h-4 mr-1.5" />
                                      Approve
                                    </>
                                  )}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => openRejectDialog(request)}
                                  disabled={processing === request.id}
                                  className="w-full"
                                >
                                  <XCircle className="w-4 h-4 mr-1.5" />
                                  Reject
                                </Button>
                              </>
                            )}
                            {request.status === 'approved' && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleRegenerateCode(request)}
                                disabled={processing === request.id}
                                className="w-full"
                              >
                                <RefreshCw className="w-4 h-4 mr-1.5" />
                                Regenerate Code
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        ))
      )}

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent className="max-w-[95vw] md:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg md:text-xl">Reject Access Request</DialogTitle>
            <DialogDescription className="text-sm md:text-base">
              Are you sure you want to reject this access request? A notification will be sent to the user.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {selectedRequest && (
              <div className="space-y-2">
                <p className="text-sm break-words">
                  <strong>User:</strong> {selectedRequest.name} ({selectedRequest.email})
                </p>
                <p className="text-sm break-words">
                  <strong>Application:</strong> {selectedRequest.appName}
                </p>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="reason">Rejection Reason (Optional)</Label>
              <Textarea
                id="reason"
                placeholder="Enter reason for rejection..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows={3}
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => {
                  setRejectDialogOpen(false);
                  setSelectedRequest(null);
                  setRejectionReason('');
                }}
                disabled={processing !== null}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleReject}
                disabled={processing !== null}
                loading={processing !== null}
              >
                Reject Request
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

