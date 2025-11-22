'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { Eye, EyeOff, ArrowLeft, Shield } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { toast } from 'sonner';

async function clientLog(event: string, details: Record<string, unknown> = {}) {
  try {
    await fetch('/api/debug/client-log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event, details }),
    });
  } catch {
    // Ignore logging errors
  }
}

const backendBaseUrl = process.env.NEXT_PUBLIC_BACKEND_URL;

export default function SupervisorLoginPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    rememberMe: false,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const router = useRouter();

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    }
    
    if (!formData.password) {
      newErrors.password = 'Password is required';
    }
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return false;
    }
    return true;
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    if (!backendBaseUrl) {
      toast.error('Backend connection is not configured.');
      return;
    }

    setIsSubmitting(true);
    await clientLog('client.login.submit', { email: formData?.email, rememberMe: formData?.rememberMe });
    
    try {
      const response = await fetch(`${backendBaseUrl}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(formData),
      });

      await clientLog('client.login.response', { ok: response.ok, status: response.status });

      if (response.ok) {
        await response.json().catch(() => null);
        await clientLog('client.login.navigate_handshake', {});
        const handshakeResponse = await fetch(`${backendBaseUrl}/auth/handshake`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({}),
        });
        
        if (handshakeResponse.ok) {
          const handshakeData = await handshakeResponse.json().catch(() => ({}));
          const redirectPath = handshakeData.redirectTo || '/supervisor/dashboard';
          window.location.assign(redirectPath);
        } else {
          await clientLog('client.login.handshake_failed', { status: handshakeResponse.status });
          toast.error('Authentication failed. Please try again.');
        }
      } else {
        const errorData = await response.json().catch(() => null);
        toast.error(errorData?.message || 'Invalid credentials');
        await clientLog('client.login.error', { status: response.status, message: errorData?.message });
      }
    } catch (error) {
      console.error('Login error:', error);
      toast.error('An error occurred. Please try again.');
      await clientLog('client.login.exception', { error: String(error) });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-accent/5 to-secondary/5 dark:from-primary/10 dark:via-accent/10 dark:to-secondary/10 dark-mode-transition flex items-center justify-center p-4">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-md max-w-[calc(100vw-2rem)] space-y-6">
        <Link href="/" className="flex items-center space-x-2 text-muted-foreground hover:text-foreground transition-colors py-2 -ml-2 pl-2 pr-2 rounded-md hover:bg-muted/50 min-h-[44px]">
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Public Site</span>
        </Link>

        <div className="text-center space-y-2">
          <div className="flex justify-center mb-4">
            <Image
              src="/MetaVrLogo.png"
              alt="MetaVR Logo"
              width={64}
              height={64}
              className="rounded-lg"
              priority
            />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center justify-center gap-2">
              <Shield className="w-8 h-8" />
              MetaVR
            </h1>
            <p className="text-muted-foreground mt-2">Supervisor Portal</p>
          </div>
        </div>

        <Card className="border-0 shadow-xl bg-background/80 backdrop-blur-sm">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Supervisor Login</CardTitle>
            <CardDescription>
              Sign in to access the MetaVR supervisor dashboard
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={onSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <div className="relative">
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    placeholder="supervisor@metavr.com"
                    className={`pl-10 ${errors.email ? 'border-error' : ''}`}
                    disabled={isSubmitting}
                  />
                </div>
                {errors.email && (
                  <p className="text-sm text-error">{errors.email}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={(e) => handleInputChange('password', e.target.value)}
                    placeholder="Enter your password"
                    className={`pl-10 pr-10 ${errors.password ? 'border-error' : ''}`}
                    disabled={isSubmitting}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={isSubmitting}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                </div>
                {errors.password && (
                  <p className="text-sm text-error">{errors.password}</p>
                )}
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="rememberMe"
                    checked={formData.rememberMe}
                    onCheckedChange={(checked) => handleInputChange('rememberMe', checked as boolean)}
                    disabled={isSubmitting}
                  />
                  <Label htmlFor="rememberMe" className="text-sm font-normal cursor-pointer">
                    Remember me
                  </Label>
                </div>
              </div>

              <Button
                type="submit"
                variant="vr-primary"
                className="w-full"
                disabled={isSubmitting}
                loading={isSubmitting}
              >
                {isSubmitting ? 'Signing in...' : 'Sign In'}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-sm text-muted-foreground">
          <Shield className="w-4 h-4 inline mr-1" />
          Secure supervisor access with enterprise-grade authentication
        </p>
      </div>
    </div>
  );
}

