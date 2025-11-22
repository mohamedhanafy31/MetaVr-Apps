'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { toast } from 'sonner';
import { Loader2, Mail, CheckCircle2, ShieldCheck } from 'lucide-react';

interface Application {
  id: string;
  name: string;
  description: string;
  platform: 'web' | 'desktop' | 'mobile';
  status: string;
}

interface ExistingAccessApp {
  appId: string;
  appKey: string;
  appName: string;
}

interface SubmitAccessResponse {
  success?: boolean;
  message?: string;
  createdRequests?: number;
  alreadyHasAccess?: ExistingAccessApp[];
}

interface SubmitRequestPayload {
  email: string;
  appIds: string[];
  name?: string;
  phone?: string;
}

export default function RequestAccessPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [selectedApps, setSelectedApps] = useState<string[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showFirstTimeDialog, setShowFirstTimeDialog] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [phone, setPhone] = useState('');
  const [checkingUser, setCheckingUser] = useState(false);
  const [showExistingAccessDialog, setShowExistingAccessDialog] = useState(false);
  const [existingAccessApps, setExistingAccessApps] = useState<ExistingAccessApp[]>([]);

  useEffect(() => {
    fetchApplications();
  }, []);

  const fetchApplications = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/applications/public?status=active');
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setApplications(result.data || []);
        }
      }
    } catch (error) {
      console.error('Failed to fetch applications:', error);
      toast.error('Failed to load applications');
    } finally {
      setLoading(false);
    }
  };

  const handleEmailChange = async (value: string) => {
    setEmail(value);
    if (value && isValidEmail(value)) {
      setCheckingUser(true);
      try {
        // Check if user exists by trying to submit (backend will tell us if name/phone needed)
        // For now, we'll show dialog if email is provided and form is being submitted
      } catch {
        // Ignore
      } finally {
        setCheckingUser(false);
      }
    }
  };

  const isValidEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const handleAppToggle = (appId: string) => {
    setSelectedApps((prev) =>
      prev.includes(appId) ? prev.filter((id) => id !== appId) : [...prev, appId]
    );
  };

  const resetForm = () => {
    setEmail('');
    setSelectedApps([]);
    setFirstName('');
    setPhone('');
  };

  const handleSuccessfulRequest = (result: SubmitAccessResponse) => {
    const duplicates: ExistingAccessApp[] = Array.isArray(result?.alreadyHasAccess) ? result.alreadyHasAccess : [];

    if (duplicates.length > 0) {
      setExistingAccessApps(duplicates);
      setShowExistingAccessDialog(true);
    } else {
      setExistingAccessApps([]);
      setShowExistingAccessDialog(false);
      if ((result?.createdRequests || 0) > 0) {
        setTimeout(() => {
          router.push('/');
        }, 2000);
      }
    }

    toast.success(result?.message || 'Access request submitted successfully!');
    resetForm();
  };

  const submitAccessRequest = async (
    payload: SubmitRequestPayload,
  ): Promise<{ success: true } | { firstTimeRequired: true }> => {
    const response = await fetch('/api/user-access/request', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const result: SubmitAccessResponse = await response.json();

    if (!response.ok) {
      if (response.status === 400 && result.message?.includes('Name and phone')) {
        setShowFirstTimeDialog(true);
        return { firstTimeRequired: true };
      }
      throw new Error(result.message || 'Failed to submit request');
    }

    setShowFirstTimeDialog(false);
    handleSuccessfulRequest(result);

    return { success: true };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isValidEmail(email)) {
      toast.error('Please enter a valid email address');
      return;
    }

    if (selectedApps.length === 0) {
      toast.error('Please select at least one application');
      return;
    }

    // Check if this is a first-time user
    // We'll determine this from the backend response
    setSubmitting(true);

    try {
      const outcome = await submitAccessRequest({
        email,
        appIds: selectedApps,
        name: firstName || undefined,
        phone: phone || undefined,
      });

      if (outcome && 'firstTimeRequired' in outcome) {
        return;
      }
    } catch (error) {
      console.error('Submit error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to submit request');
    } finally {
      setSubmitting(false);
    }
  };

  const handleFirstTimeSubmit = async () => {
    if (!firstName.trim()) {
      toast.error('Please enter your name');
      return;
    }

    if (!phone.trim()) {
      toast.error('Please enter your phone number');
      return;
    }

    setSubmitting(true);
    setShowFirstTimeDialog(false);

    try {
      await submitAccessRequest({
        email,
        appIds: selectedApps,
        name: firstName.trim(),
        phone: phone.trim(),
      });
    } catch (error) {
      console.error('Submit error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to submit request');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-accent/5 to-secondary/5 dark:from-primary/10 dark:via-accent/10 dark:to-secondary/10 dark-mode-transition">
      {/* Header */}
      <header className="border-b bg-background/80 dark:bg-background/90 backdrop-blur-sm sticky top-0 z-50 dark-mode-transition">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center space-x-3">
            <Image
              src="/MetaVrLogo.png"
              alt="MetaVR Logo"
              width={40}
              height={40}
              className="rounded-lg"
              priority
            />
            <div>
              <h1 className="text-xl font-bold text-foreground">MetaVR</h1>
              <p className="text-sm text-muted-foreground">Management Platform</p>
            </div>
          </Link>
          <div className="flex items-center space-x-4">
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-3xl flex items-center gap-2">
              <Mail className="w-8 h-8" />
              Request Access
            </CardTitle>
            <CardDescription>
              Request access to MetaVR applications. A supervisor will review your request and send you an access code via email.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Email Input */}
              <div className="space-y-2">
                <Label htmlFor="email">Email Address *</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="your.email@example.com"
                  value={email}
                  onChange={(e) => handleEmailChange(e.target.value)}
                  required
                  disabled={submitting}
                />
                {checkingUser && (
                  <p className="text-sm text-muted-foreground flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Checking...
                  </p>
                )}
              </div>

              {/* Application Selection */}
              <div className="space-y-4">
                <Label>Select Applications *</Label>
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                  </div>
                ) : applications.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No applications available at the moment.</p>
                ) : (
                  <div className="space-y-3 border rounded-lg p-4">
                    {applications.map((app) => (
                      <div key={app.id} className="flex items-start space-x-3">
                        <Checkbox
                          id={`app-${app.id}`}
                          checked={selectedApps.includes(app.id)}
                          onCheckedChange={() => handleAppToggle(app.id)}
                          disabled={submitting}
                        />
                        <div className="flex-1">
                          <Label
                            htmlFor={`app-${app.id}`}
                            className="font-medium cursor-pointer"
                          >
                            {app.name}
                          </Label>
                          {app.description && (
                            <p className="text-sm text-muted-foreground mt-1">
                              {app.description}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {selectedApps.length > 0 && (
                  <p className="text-sm text-muted-foreground flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                    {selectedApps.length} application(s) selected
                  </p>
                )}
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                className="w-full"
                disabled={submitting || loading || selectedApps.length === 0 || !email}
                loading={submitting}
              >
                {submitting ? 'Submitting...' : 'Submit Request'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* First-Time User Dialog */}
      <Dialog open={showFirstTimeDialog} onOpenChange={setShowFirstTimeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Additional Information Required</DialogTitle>
            <DialogDescription>
              This appears to be your first time requesting access. Please provide your name and phone number.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">Full Name *</Label>
              <Input
                id="firstName"
                placeholder="John Doe"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number *</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="+1234567890"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => setShowFirstTimeDialog(false)}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button
                onClick={handleFirstTimeSubmit}
                disabled={submitting || !firstName.trim() || !phone.trim()}
                loading={submitting}
              >
                Submit
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Existing Access Dialog */}
      <Dialog
        open={showExistingAccessDialog}
        onOpenChange={(open) => {
          setShowExistingAccessDialog(open);
          if (!open) {
            setExistingAccessApps([]);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Access Already Granted</DialogTitle>
            <DialogDescription>
              You already have access to the following application(s). You can continue using your current access codes.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <ul className="space-y-2">
              {existingAccessApps.map((app) => (
                <li key={`${app.appId}-${app.appKey}`} className="flex items-center gap-2 text-sm">
                  <ShieldCheck className="w-4 h-4 text-green-500" />
                  <span>{app.appName || app.appKey}</span>
                </li>
              ))}
            </ul>
            <p className="text-xs text-muted-foreground">
              Any remaining selections have been sent to your supervisor for approval.
            </p>
          </div>
          <div className="flex justify-end">
            <Button
              onClick={() => {
                setShowExistingAccessDialog(false);
                setExistingAccessApps([]);
              }}
            >
              Got it
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

