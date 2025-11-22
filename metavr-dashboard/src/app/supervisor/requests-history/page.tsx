'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { History, Loader2, RefreshCw, Search } from 'lucide-react';
import { toast } from 'sonner';

type AccessRequestHistory = {
  id: string;
  email: string;
  name: string;
  phone?: string;
  appId: string;
  appKey: string;
  appName: string;
  appPath?: string;
  status: 'pending' | 'approved' | 'rejected';
  requestedAt?: string | null;
  reviewedAt?: string | null;
  reviewedBy?: string | null;
  rejectionReason?: string | null;
};

type StatusFilter = 'all' | 'pending' | 'approved' | 'rejected';

type UserLookup = Record<
  string,
  {
    name?: string;
    phone?: string;
  }
>;

const STATUS_LABELS: Record<StatusFilter, string> = {
  all: 'All statuses',
  pending: 'Pending',
  approved: 'Approved',
  rejected: 'Rejected',
};

export default function RequestsHistoryPage() {
  const [history, setHistory] = useState<AccessRequestHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [userLookup, setUserLookup] = useState<UserLookup>({});

  const fetchHistory = async (initial = false) => {
    try {
      if (initial) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }

      const [historyResponse, usersResponse] = await Promise.allSettled([
        fetch('/api/user-access/history?limit=200'),
        fetch('/api/user-access/users'),
      ]);

      if (historyResponse.status === 'fulfilled') {
        const result = await historyResponse.value.json();

        if (historyResponse.value.ok && result.success) {
          setHistory(Array.isArray(result.data) ? result.data : []);
        } else {
          toast.error(result.message || 'Failed to fetch request history');
        }
      } else {
        toast.error('Failed to fetch request history');
        console.error(historyResponse.reason);
      }

      if (usersResponse.status === 'fulfilled') {
        try {
          const result = await usersResponse.value.json();
          if (usersResponse.value.ok && result.success && Array.isArray(result.data)) {
            const lookup: UserLookup = {};
            for (const user of result.data) {
              if (!user?.email) continue;
              lookup[user.email.toLowerCase()] = {
                name: user.name || undefined,
                phone: user.phone || undefined,
              };
            }
            setUserLookup(lookup);
          }
        } catch (error) {
          console.error('Failed to parse users response:', error);
        }
      } else {
        console.error('Failed to fetch users with access:', usersResponse.reason);
      }
    } catch (error) {
      console.error('Failed to fetch request history:', error);
      toast.error('Failed to fetch request history');
    } finally {
      if (initial) {
        setLoading(false);
      }
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchHistory(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredHistory = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    return history.filter((entry) => {
      const matchesStatus = statusFilter === 'all' || entry.status === statusFilter;
      if (!matchesStatus) {
        return false;
      }

      if (!term) {
        return true;
      }

      return (
        entry.email?.toLowerCase().includes(term) ||
        entry.name?.toLowerCase().includes(term) ||
        entry.appName?.toLowerCase().includes(term) ||
        entry.appKey?.toLowerCase().includes(term) ||
        entry.phone?.toLowerCase().includes(term)
      );
    });
  }, [history, searchTerm, statusFilter]);

  const getEnrichedRequester = (entry: AccessRequestHistory) => {
    const emailKey = entry.email?.toLowerCase() || '';
    const userInfo = userLookup[emailKey];

    const name = entry.name?.trim() || userInfo?.name || 'Unknown user';
    const phone = entry.phone?.trim() || userInfo?.phone || '';

    return {
      name,
      phone,
    };
  };

  const formatDate = (value?: string | null) => {
    if (!value) return '—';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString();
  };

  const getStatusBadge = (status: AccessRequestHistory['status']) => {
    switch (status) {
      case 'approved':
        return (
          <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
            Approved
          </Badge>
        );
      case 'rejected':
        return (
          <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
            Rejected
          </Badge>
        );
      default:
        return (
          <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
            Pending
          </Badge>
        );
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Requests History</h1>
        <p className="text-muted-foreground mt-2">
          View every access request you have reviewed, including status and notes
        </p>
      </div>

      <Card>
        <CardContent className="pt-6 space-y-4 lg:space-y-0 lg:flex lg:items-center lg:justify-between">
          <div className="relative w-full lg:max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Search by email, name, phone, or app..."
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
            <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as StatusFilter)}>
              <SelectTrigger className="min-h-[44px] w-full sm:w-[200px]">
                <SelectValue placeholder="Filter status" />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(STATUS_LABELS) as StatusFilter[]).map((key) => (
                  <SelectItem key={key} value={key}>
                    {STATUS_LABELS[key]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              className="min-h-[44px]"
              onClick={() => fetchHistory(false)}
              disabled={refreshing}
            >
              {refreshing ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <RefreshCw className="w-4 h-4 mr-2" />
              )}
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : filteredHistory.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center space-y-4">
            <History className="w-12 h-12 mx-auto text-muted-foreground" />
            <div>
              <p className="font-medium">No requests found</p>
              <p className="text-muted-foreground">
                {searchTerm
                  ? 'No history entries match your search.'
                  : 'Requests you review will appear here once processed.'}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Request Activity</CardTitle>
            <CardDescription>
              Showing {filteredHistory.length} entr{filteredHistory.length === 1 ? 'y' : 'ies'}
            </CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Requester</TableHead>
                  <TableHead>Application</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Requested</TableHead>
                  <TableHead>Reviewed</TableHead>
                  <TableHead>Reviewer</TableHead>
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredHistory.map((entry) => {
                  const enriched = getEnrichedRequester(entry);
                  return (
                    <TableRow key={entry.id}>
                      <TableCell>
                        <div className="space-y-1">
                          <p className="font-medium">{enriched.name}</p>
                          <p className="text-sm text-muted-foreground">{entry.email}</p>
                          {(enriched.phone || entry.phone) && (
                            <p className="text-sm text-muted-foreground">
                              {enriched.phone || entry.phone}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <p className="font-medium">{entry.appName}</p>
                          <p className="text-sm text-muted-foreground">{entry.appKey}</p>
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(entry.status)}</TableCell>
                      <TableCell>{formatDate(entry.requestedAt)}</TableCell>
                      <TableCell>{formatDate(entry.reviewedAt)}</TableCell>
                      <TableCell>{entry.reviewedBy || '—'}</TableCell>
                      <TableCell className="max-w-xs whitespace-pre-wrap text-sm">
                        {entry.status === 'rejected'
                          ? entry.rejectionReason || 'Rejected without reason'
                          : entry.status === 'approved'
                            ? 'Approved'
                            : 'Pending'}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}


