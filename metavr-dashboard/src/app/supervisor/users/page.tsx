'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Mail,
  User,
  Phone,
  Loader2,
  Search,
  Shield,
  CheckCircle2,
  XCircle,
  RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';

interface UserApp {
  appKey: string;
  appName: string;
  appId: string;
  enabled: boolean;
  accessCode: string;
}

interface UserWithAccess {
  userId: string;
  email: string;
  name: string;
  phone: string;
  apps: UserApp[];
}

export default function UsersManagementPage() {
  const [users, setUsers] = useState<UserWithAccess[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [toggling, setToggling] = useState<string | null>(null); // userId:appKey

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/user-access/users');
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          setUsers(result.data);
        }
      } else {
        toast.error('Failed to fetch users');
      }
    } catch (error) {
      console.error('Failed to fetch users:', error);
      toast.error('Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleAccess = async (userId: string, appKey: string, currentEnabled: boolean) => {
    const toggleKey = `${userId}:${appKey}`;
    setToggling(toggleKey);

    try {
      const response = await fetch('/api/user-access/toggle-access', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          appKey,
          enabled: !currentEnabled,
        }),
      });

      const result = await response.json();

      if (result.success) {
        toast.success(result.message || `App access ${!currentEnabled ? 'enabled' : 'disabled'} successfully`);
        // Update local state
        setUsers((prevUsers) =>
          prevUsers.map((user) =>
            user.userId === userId
              ? {
                  ...user,
                  apps: user.apps.map((app) =>
                    app.appKey === appKey ? { ...app, enabled: !currentEnabled } : app
                  ),
                }
              : user
          )
        );
      } else {
        toast.error(result.message || 'Failed to toggle access');
      }
    } catch (error) {
      console.error('Toggle access error:', error);
      toast.error('Failed to toggle access');
    } finally {
      setToggling(null);
    }
  };

  const filteredUsers = (): UserWithAccess[] => {
    if (!searchTerm) return users;

    const lowerSearch = searchTerm.toLowerCase();
    return users.filter(
      (user) =>
        user.email.toLowerCase().includes(lowerSearch) ||
        user.name.toLowerCase().includes(lowerSearch) ||
        user.phone.includes(lowerSearch)
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">User Access Management</h1>
        <p className="text-muted-foreground mt-2">
          Manage user access to applications. Enable or disable access for specific apps.
        </p>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Search by email, name, or phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Users Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : filteredUsers().length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Shield className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              {searchTerm ? 'No users match your search' : 'No users with approved access found'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredUsers().map((user) => (
            <Card key={user.userId} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <User className="w-5 h-5 text-primary" />
                      {user.name || 'No Name'}
                    </CardTitle>
                    <CardDescription className="mt-2 space-y-1">
                      <div className="flex items-center gap-2 text-sm">
                        <Mail className="w-4 h-4" />
                        {user.email}
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Phone className="w-4 h-4" />
                        {user.phone || 'N/A'}
                      </div>
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium mb-3 block">Application Access</Label>
                    <div className="space-y-3">
                      {user.apps.map((app) => {
                        const toggleKey = `${user.userId}:${app.appKey}`;
                        const isToggling = toggling === toggleKey;
                        return (
                          <div
                            key={app.appKey}
                            className="flex items-center justify-between p-3 rounded-lg border bg-muted/50"
                          >
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <p className="font-medium text-sm truncate">{app.appName}</p>
                                {app.enabled ? (
                                  <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 text-xs">
                                    <CheckCircle2 className="w-3 h-3 mr-1" />
                                    Active
                                  </Badge>
                                ) : (
                                  <Badge className="bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200 text-xs">
                                    <XCircle className="w-3 h-3 mr-1" />
                                    Disabled
                                  </Badge>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground font-mono">
                                Code: {app.accessCode}
                              </p>
                            </div>
                            <div className="ml-4 flex items-center">
                              {isToggling ? (
                                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                              ) : (
                                <Switch
                                  checked={app.enabled}
                                  onCheckedChange={() => handleToggleAccess(user.userId, app.appKey, app.enabled)}
                                  disabled={isToggling}
                                />
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

