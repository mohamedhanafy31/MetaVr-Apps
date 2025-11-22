'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import {
  Building2,
  Settings,
  LogOut,
  Menu,
  X,
  Shield,
  MoreHorizontal,
  Mail,
  Users,
  History,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { PageTransition } from '@/components/motion/PageTransition';
import { GridPattern } from '@/components/ui/vr-effects';
import { motion } from 'framer-motion';
import { checkSessionValidity, logoutUser } from '@/lib/auth/client-session';
import { usePageTiming } from '@/hooks/usePageTiming';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { cn } from '@/lib/utils';

interface SupervisorLayoutProps {
  children: React.ReactNode;
}

const backendBaseUrl = process.env.NEXT_PUBLIC_BACKEND_URL;

export default function SupervisorLayout({ children }: SupervisorLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();
  const isMobile = useMediaQuery('(max-width: 767px)');

  usePageTiming({
    pageId: pathname || '/supervisor',
    pageType: pathname.startsWith('/supervisor/applications') ? 'config' : 'dashboard',
    metadata: { pathname },
    enabled: pathname !== '/supervisor/login',
  });

  // Close sidebar when route changes on mobile
  const handleRouteChange = () => {
    if (isMobile) {
      setSidebarOpen(false);
    }
  };

  // Handle route changes and window resize
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      handleRouteChange();
    }, 0);
    return () => clearTimeout(timeoutId);
  }, [pathname]);

  // Keep sidebar closed by default on all screen sizes
  // No automatic opening/closing based on screen size

  // Check session validity on mount and periodically
  useEffect(() => {
    if (pathname === '/supervisor/login') {
      return; // Don't check session on login page
    }

    const checkSession = async () => {
      const result = await checkSessionValidity();
      if (result.expired || !result.valid) {
        await logoutUser('supervisor');
      }
    };

    // Check immediately
    checkSession();

    // Check every 5 minutes
    const interval = setInterval(checkSession, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [pathname]);

  // Don't apply layout to login page
  if (pathname === '/supervisor/login') {
    return <>{children}</>;
  }

  const navigation = [
    {
      name: 'Dashboard',
      href: '/supervisor/dashboard',
      icon: Shield,
      current: pathname === '/supervisor/dashboard',
    },
    {
      name: 'Applications',
      href: '/supervisor/applications',
      icon: Building2,
      current: pathname.startsWith('/supervisor/applications'),
    },
    {
      name: 'Access Requests',
      href: '/supervisor/access-requests',
      icon: Mail,
      current: pathname.startsWith('/supervisor/access-requests'),
    },
    {
      name: 'Requests History',
      href: '/supervisor/requests-history',
      icon: History,
      current: pathname.startsWith('/supervisor/requests-history'),
    },
    {
      name: 'Users',
      href: '/supervisor/users',
      icon: Users,
      current: pathname.startsWith('/supervisor/users'),
    },
  ];

  const handleLogout = async () => {
    if (!backendBaseUrl) {
      console.error('Backend URL is not configured');
      window.location.href = '/supervisor/login';
      return;
    }

    try {
      const response = await fetch(`${backendBaseUrl}/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      });
      
      if (response.ok) {
        window.location.href = '/supervisor/login';
      }
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  return (
    <div className="min-h-screen bg-background relative overflow-hidden dark-mode-transition">
      {/* VR Grid Pattern */}
      <GridPattern className="text-blue-500/5 dark:text-blue-500/10" />

      {/* Animated background accents */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute -top-24 -left-24 h-72 w-72 rounded-full bg-gradient-to-r from-blue-500/20 to-purple-500/20 dark:from-blue-500/30 dark:to-purple-500/30 blur-3xl"
        animate={{
          x: [0, 30, -20, 0],
          y: [0, 20, -10, 0],
          rotate: [0, 15, -10, 0],
        }}
        transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        aria-hidden
        className="pointer-events-none absolute -bottom-24 -right-24 h-80 w-80 rounded-full bg-gradient-to-r from-cyan-500/20 to-blue-500/20 dark:from-cyan-500/30 dark:to-blue-500/30 blur-3xl"
        animate={{
          x: [0, -20, 10, 0],
          y: [0, -15, 20, 0],
          rotate: [0, -10, 8, 0],
        }}
        transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut' }}
      />
      
      {/* Sidebar - positioned over header */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-[60] w-64 bg-background/95 dark:bg-background/95 backdrop-blur-md border-r border-blue-500/20 dark:border-blue-500/30 transform transition-all duration-300 ease-in-out dark-mode-transition shadow-lg",
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      )}>
        <div className="p-4 h-full overflow-y-auto">
          {/* Logo and close button */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <Image
                src="/MetaVrLogo.png"
                alt="MetaVR Logo"
                width={32}
                height={32}
                className="rounded-lg"
                priority
              />
              <div>
                <h2 className="text-sm font-semibold">MetaVR</h2>
                <p className="text-xs text-muted-foreground">Supervisor Portal</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8"
              onClick={() => setSidebarOpen(false)}
              aria-label="Close sidebar"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* Main Navigation */}
          <nav className="space-y-2 md:space-y-1">
            {navigation.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => {
                    setSidebarOpen(false);
                  }}
                  className={`flex items-center space-x-3 px-3 py-2 rounded-lg transition-all duration-200 min-h-[44px] ${
                    item.current
                      ? 'bg-primary text-primary-foreground shadow-glow-sm'
                      : 'hover:bg-muted text-muted-foreground hover:text-foreground hover:shadow-sm'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      </aside>

      {/* Top Navigation */}
      <header className={cn(
        "border-b bg-background/80 dark:bg-background/90 backdrop-blur-sm sticky top-0 z-50 dark-mode-transition w-full transition-all duration-300",
        sidebarOpen && "pl-64"
      )}>
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              aria-label={sidebarOpen ? "Close sidebar" : "Open sidebar"}
            >
              {sidebarOpen ? <ChevronLeft className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </Button>
            <div className="flex items-center space-x-3">
              <Image
                src="/MetaVrLogo.png"
                alt="MetaVR Logo"
                width={32}
                height={32}
                className="rounded-lg w-6 h-6 md:w-8 md:h-8"
                priority
              />
              <div>
                <h1 className="text-base md:text-lg font-semibold">MetaVR Supervisor</h1>
                <p className="text-xs text-muted-foreground">Supervisor Portal</p>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-3 md:space-x-4">
            <div className="hidden md:flex items-center space-x-2">
              <Button variant="ghost" size="sm">
                <Settings className="w-4 h-4" />
              </Button>
            </div>
            
            <div className="md:hidden">
              <Button variant="ghost" size="sm">
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </div>
            
            <ThemeToggle />
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Backdrop overlay */}
        {sidebarOpen && (
          <div 
            className="fixed inset-0 z-[55] bg-black/50 backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Main Content */}
        <main className={cn(
          "flex-1 pt-4 md:pt-6 pb-20 md:pb-0 px-4 md:px-6 safe-area-inset transition-all duration-300",
          sidebarOpen && "pl-64"
        )}>
          <PageTransition>
            {children}
          </PageTransition>
        </main>
      </div>
    </div>
  );
}


