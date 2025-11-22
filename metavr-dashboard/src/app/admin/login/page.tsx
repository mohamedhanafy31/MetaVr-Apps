'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { loginSchema, type LoginData } from '@/lib/validations/schemas';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { Loader2, Eye, EyeOff, Lock, Mail, ArrowLeft } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { toast } from 'sonner';
import { z } from 'zod';

async function clientLog(event: string, details: Record<string, unknown> = {}) {
  try {
    await fetch('/api/debug/client-log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event, details }),
    });
  } catch {}
}

const backendBaseUrl = process.env.NEXT_PUBLIC_BACKEND_URL;

export default function AdminLoginPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [formData, setFormData] = useState<LoginData>({
    email: '',
    password: '',
    rememberMe: false,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const router = useRouter();

  const handleInputChange = (field: keyof LoginData, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = (): boolean => {
    try {
      loginSchema.parse(formData);
      setErrors({});
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors: Record<string, string> = {};
        error.issues.forEach((err) => {
          if (err.path[0]) {
            newErrors[err.path[0] as string] = err.message;
          }
        });
        setErrors(newErrors);
      }
      return false;
    }
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Form submitted with data:', formData);
    
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
        await clientLog('client.login.handshake_exchange', {});
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
          const redirectPath = handshakeData.redirectTo || '/admin/dashboard';
          window.location.assign(redirectPath);
        } else {
          await clientLog('client.login.handshake_failed', { status: handshakeResponse.status });
          toast.error('Authentication failed. Please try again.');
        }
      } else {
        await response.json().catch(() => null);
        toast.error('Invalid credentials');
        await clientLog('client.login.invalid_credentials', {});
      }
    } catch (error) {
      toast.error('An error occurred. Please try again.');
      await clientLog('client.login.error', { error: String(error) });
    } finally {
      setIsSubmitting(false);
    }
  };

  const [isResettingPassword, setIsResettingPassword] = useState(false);

  const handleForgotPassword = async () => {
    const email = formData.email;
    if (!email) {
      toast.error('Please enter your email address first');
      return;
    }

    setIsResettingPassword(true);
    await clientLog('client.forgot_password.click', { email });

    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const result = await response.json().catch(() => ({}));

      if (response.ok) {
        toast.success('Password reset instructions sent to your email');
        setShowForgotPassword(false);
      } else {
        toast.error(result.message || 'Failed to send reset instructions');
      }
    } catch {
      toast.error('An error occurred. Please try again.');
    } finally {
      setIsResettingPassword(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-accent/5 to-secondary/5 dark:from-primary/10 dark:via-accent/10 dark:to-secondary/10 flex items-center justify-center p-4 dark-mode-transition">
      <div className="w-full max-w-md space-y-6">
        {/* Back to Public Site */}
        <div className="flex items-center justify-between">
          <Link 
            href="/" 
            className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors p-2 rounded-md min-h-[44px] min-w-[44px] w-fit"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Public Site
          </Link>
          <ThemeToggle />
        </div>

        {/* Logo and Title */}
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center space-x-3">
            <Image
              src="/MetaVrLogo.png"
              alt="MetaVR Logo"
              width={48}
              height={48}
              className="rounded-lg"
              priority
            />
            <div>
              <h1 className="text-2xl font-bold text-foreground">MetaVR</h1>
              <p className="text-sm text-muted-foreground">Admin Portal</p>
            </div>
          </div>
        </div>

        {/* Login Form */}
        <Card className="border-0 shadow-xl bg-background/80 backdrop-blur-sm relative">
          {isSubmitting && (
            <div className="absolute inset-0 bg-background/50 backdrop-blur-sm flex items-center justify-center rounded-lg z-10">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          )}
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Admin Login</CardTitle>
            <CardDescription>
              Sign in to access the MetaVR management dashboard
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!showForgotPassword ? (
              <form onSubmit={onSubmit} className="space-y-6" method="post">
                {/* Email Field */}
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      placeholder="admin@metavr.com"
                      className={`pl-10 ${errors.email ? 'border-error' : ''}`}
                      aria-invalid={!!errors.email}
                      aria-describedby={errors.email ? 'email-error' : undefined}
                    />
                  </div>
                  {errors.email && (
                    <p id="email-error" className="text-sm text-error" role="alert">
                      {errors.email}
                    </p>
                  )}
                </div>

                {/* Password Field */}
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      value={formData.password}
                      onChange={(e) => handleInputChange('password', e.target.value)}
                      placeholder="Enter your password"
                      className={`pl-10 pr-10 ${errors.password ? 'border-error' : ''}`}
                      aria-invalid={!!errors.password}
                      aria-describedby={errors.password ? 'password-error' : undefined}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent min-w-[44px] min-h-[44px]"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      aria-pressed={showPassword}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <Eye className="h-4 w-4 text-muted-foreground" />
                      )}
                    </Button>
                  </div>
                  {errors.password && (
                    <p id="password-error" className="text-sm text-error" role="alert">
                      {errors.password}
                    </p>
                  )}
                </div>

                {/* Remember Me */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="rememberMe" 
                      checked={formData.rememberMe}
                      onCheckedChange={(checked) => handleInputChange('rememberMe', checked === true)}
                    />
                    <Label htmlFor="rememberMe" className="text-sm">
                      Remember me
                    </Label>
                  </div>
                  <Button
                    type="button"
                    variant="link"
                    className="text-sm text-primary hover:text-primary/80 min-h-[44px]"
                    onClick={() => setShowForgotPassword(true)}
                  >
                    Forgot password?
                  </Button>
                </div>

                {/* Submit Button */}
                <Button
                  type="submit"
                  className="w-full"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Signing in...
                    </>
                  ) : (
                    'Sign In'
                  )}
                </Button>
              </form>
            ) : (
              /* Forgot Password Form */
              <div className="space-y-6">
                <div className="text-center">
                  <h3 className="text-lg font-semibold">Reset Password</h3>
                  <p className="text-sm text-muted-foreground mt-2">
                    Enter your email address and we&apos;ll send you instructions to reset your password.
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="resetEmail">Email Address</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                      <Input
                        id="resetEmail"
                        type="email"
                        value={formData.email}
                        onChange={(e) => handleInputChange('email', e.target.value)}
                        placeholder="admin@metavr.com"
                        className="pl-10"
                      />
                    </div>
                  </div>

                  <div className="flex space-x-3">
                    <Button
                      type="button"
                      variant="outline"
                      className="flex-1"
                      onClick={() => setShowForgotPassword(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      className="flex-1"
                      onClick={handleForgotPassword}
                      disabled={isResettingPassword || !formData.email}
                    >
                      {isResettingPassword ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Sending...
                        </>
                      ) : (
                        'Send Instructions'
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Security Notice */}
        <Card className="border-0 bg-background/80 backdrop-blur-sm">
          <CardContent className="pt-6">
            <div className="text-center text-sm text-muted-foreground">
              <p className="flex items-center justify-center gap-2">
                <Lock className="w-4 h-4" />
                Secure admin access with enterprise-grade authentication
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
