'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { ScaleIn, FadeIn } from '@/components/motion/FadeIn';
import { Play, ArrowRight, Sparkles, Zap, Globe, Users, Shield, Rocket, Monitor, Smartphone, Loader2 } from 'lucide-react';

interface Application {
  id: string;
  name: string;
  description: string;
  platform: 'web' | 'desktop' | 'mobile';
  status: string;
  path: string | null;
  url: string | null;
  port: number | null;
  authRequired: boolean;
}

// Platform icons mapping
const platformIcons = {
  web: Globe,
  desktop: Monitor,
  mobile: Smartphone,
};

// Platform gradients mapping
const platformGradients = {
  web: 'from-blue-500 to-cyan-500',
  desktop: 'from-purple-500 to-pink-500',
  mobile: 'from-green-500 to-emerald-500',
};

// Platform glow colors
const platformGlowColors = {
  web: 'blue' as const,
  desktop: 'purple' as const,
  mobile: 'green' as const,
};

export default function LandingPage() {
  const [hoveredApp, setHoveredApp] = useState<string | null>(null);
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);

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
    } finally {
      setLoading(false);
    }
  };

  // Get localhost base URL for development
  const getLocalhostBaseUrl = (): string => {
    if (typeof window === 'undefined') return 'http://localhost';
    const protocol = window.location.protocol;
    const hostname = window.location.hostname;
    // In production, use current origin; in dev, use localhost
    const isProduction = hostname !== 'localhost' && !hostname.startsWith('127.0.0.1');
    return isProduction ? `${protocol}//${hostname}` : 'http://localhost';
  };

  // Check if we're in production
  const isProduction = (): boolean => {
    if (typeof window === 'undefined') return false;
    const hostname = window.location.hostname;
    return hostname !== 'localhost' && !hostname.startsWith('127.0.0.1');
  };

  // Convert app directory name to URL path (e.g., "card_matching" -> "card-matching")
  const getAppUrlPath = (appPath: string): string => {
    const slug = appPath.split('/').pop() || '';
    // Convert underscores to hyphens for URL-friendly paths
    return slug.replace(/_/g, '-');
  };

  const handlePlay = (app: Application) => {
    // Prefer app.url if explicitly set
    if (app.url) {
      window.open(app.url, '_blank');
      return;
    }

    // If app has a path, construct the app URL
    if (app.path) {
      const prod = isProduction();
      
      if (prod) {
        // In production: use path-based URL (e.g., /iq-questions/ or /card-matching/)
        const urlPath = getAppUrlPath(app.path);
        window.open(`/${urlPath}/`, '_blank');
        return;
      } else {
        // In development: use port-based URL if port is specified
        if (app.port) {
          const baseUrl = getLocalhostBaseUrl();
          window.open(`${baseUrl}:${app.port}`, '_blank');
          return;
        }
        
        // Fallback: navigate to proxy page
        const slug = app.path.split('/').pop();
        window.location.href = `/apps/${slug}`;
        return;
      }
    }

    console.warn('App has no path or URL:', app);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-accent/5 to-secondary/5 dark:from-primary/10 dark:via-accent/10 dark:to-secondary/10 dark-mode-transition">
      {/* Header */}
      <header className="border-b bg-background/80 dark:bg-background/90 backdrop-blur-sm sticky top-0 z-50 dark-mode-transition">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
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
          </div>
          <div className="flex items-center space-x-4">
            <Button variant="outline" asChild>
              <Link href="/request-access">Request Access</Link>
            </Button>
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-16 md:py-24">
        <FadeIn>
          <div className="text-center space-y-6 max-w-4xl mx-auto mb-16">
            <h2 className="text-5xl md:text-6xl font-bold text-foreground leading-tight">
              Welcome to{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-accent to-secondary">
                MetaVR
            </span>
          </h2>
            <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto">
              Experience the future of immersive technology. Access cutting-edge VR and AR applications designed to transform how you work, learn, and create.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-4">
              <Button variant="vr-outline" size="lg" className="w-full sm:w-auto">
                Learn More
              </Button>
            </div>
          </div>
        </FadeIn>

        {/* Apps Grid */}
        <div className="space-y-8">
          <div className="text-center">
            <h3 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Available Applications
            </h3>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Explore our collection of immersive VR and AR applications. Click Play to launch any application you have access to.
          </p>
        </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : applications.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground text-lg">
                No applications available at the moment.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {applications.map((app, index) => {
                const Icon = platformIcons[app.platform] || Globe;
                const gradient = platformGradients[app.platform] || platformGradients.web;
                const glowColor = platformGlowColors[app.platform] || platformGlowColors.web;
                
                return (
                  <ScaleIn key={app.id} delay={index * 0.1}>
                    <Card
                      variant="premium"
                      glowColor={glowColor}
                      className="relative overflow-hidden group cursor-pointer transition-all duration-300"
                      onMouseEnter={() => setHoveredApp(app.id)}
                      onMouseLeave={() => setHoveredApp(null)}
                    >
                      {/* Gradient Background */}
                      <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-0 group-hover:opacity-10 transition-opacity duration-300`} />
                      
                      <CardHeader className="relative">
                        <div className="flex items-start justify-between mb-4">
                          <div className={`p-3 rounded-lg bg-gradient-to-br ${gradient} shadow-lg`}>
                            <Icon className="w-6 h-6 text-white" />
                          </div>
                          <Badge variant="secondary" className="bg-accent/10 text-accent capitalize">
                            {app.platform}
                          </Badge>
                        </div>
                        <CardTitle className="text-xl mb-2">{app.name}</CardTitle>
                        <CardDescription className="text-base">
                          {app.description || 'No description available.'}
                        </CardDescription>
                      </CardHeader>
                      
                      <CardContent className="relative">
                        <Button
                          variant="vr-primary"
                          className="w-full group/btn"
                          onClick={() => handlePlay(app)}
                        >
                          <Play className="w-5 h-5 mr-2 group-hover/btn:translate-x-1 transition-transform" />
                          Play
                        </Button>
                      </CardContent>

                      {/* Hover Effect Overlay */}
                      {hoveredApp === app.id && (
                        <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-5 pointer-events-none`} />
                      )}
                    </Card>
                  </ScaleIn>
                );
              })}
            </div>
          )}
                </div>

        {/* Features Section */}
        <section className="mt-24">
          <FadeIn>
            <div className="text-center mb-12">
              <h3 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                Why Choose MetaVR?
                  </h3>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Built for professionals who demand the best in immersive technology
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <Card variant="floating" className="text-center">
                <CardHeader>
                  <div className="mx-auto w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center mb-4">
                    <Zap className="w-6 h-6 text-white" />
                  </div>
                  <CardTitle>Lightning Fast</CardTitle>
                  <CardDescription>
                    Optimized performance for seamless VR/AR experiences
                  </CardDescription>
                </CardHeader>
              </Card>

              <Card variant="floating" className="text-center">
                <CardHeader>
                  <div className="mx-auto w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center mb-4">
                    <Shield className="w-6 h-6 text-white" />
                  </div>
                  <CardTitle>Secure & Private</CardTitle>
                  <CardDescription>
                    Enterprise-grade security for your sensitive data
                  </CardDescription>
                </CardHeader>
              </Card>

              <Card variant="floating" className="text-center">
                <CardHeader>
                  <div className="mx-auto w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-500 rounded-lg flex items-center justify-center mb-4">
                    <Rocket className="w-6 h-6 text-white" />
                </div>
                  <CardTitle>Always Evolving</CardTitle>
                  <CardDescription>
                    Regular updates with new features and improvements
                  </CardDescription>
                </CardHeader>
          </Card>
        </div>
          </FadeIn>
        </section>
      </section>

      {/* Footer */}
      <footer className="border-t bg-background/80 backdrop-blur-sm mt-16">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-muted-foreground text-center md:text-left">
              &copy; 2025 MetaVR. All rights reserved.
            </p>
            <div className="flex gap-6">
              <Link href="#" className="text-muted-foreground hover:text-foreground transition-colors">
                Terms of Service
              </Link>
              <Link href="#" className="text-muted-foreground hover:text-foreground transition-colors">
                Privacy Policy
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
