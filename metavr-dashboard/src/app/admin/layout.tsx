'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import {
  Building2,
  TrendingUp,
  Bell,
  Search,
  Settings,
  LogOut,
  Menu,
  X,
  MoreHorizontal,
  Shield,
  Users,
  ChevronLeft,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { PageTransition } from '@/components/motion/PageTransition';
import { GridPattern } from '@/components/ui/vr-effects';
import { MobileBottomNav } from '@/components/navigation/MobileBottomNav';
import { MobileCollapsibleNav } from '@/components/navigation/CollapsibleNav';
import { motion } from 'framer-motion';
import { checkSessionValidity, logoutUser } from '@/lib/auth/client-session';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { cn } from '@/lib/utils';

interface AdminLayoutProps {
  children: React.ReactNode;
}

const backendBaseUrl = process.env.NEXT_PUBLIC_BACKEND_URL;

export default function AdminLayout({ children }: AdminLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();
  const isDesktop = useMediaQuery('(min-width: 768px)');

  // Close sidebar when route changes on mobile
  const handleRouteChange = () => {
    if (!isDesktop) {
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
    if (pathname === '/admin/login') {
      return; // Don't check session on login page
    }

    const checkSession = async () => {
      const result = await checkSessionValidity();
      if (result.expired || !result.valid) {
        await logoutUser('admin');
      }
    };

    // Check immediately
    checkSession();

    // Check every 5 minutes
    const interval = setInterval(checkSession, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [pathname]);

  // Don't apply admin layout to login page
  if (pathname === '/admin/login') {
    return <>{children}</>;
  }

  const navigation = [
    {
      name: 'Dashboard',
      href: '/admin/dashboard',
      icon: TrendingUp,
      current: pathname === '/admin/dashboard',
    },
    {
      name: 'Supervisors',
      href: '/admin/supervisors',
      icon: Shield,
      current: pathname.startsWith('/admin/supervisors'),
    },
    {
      name: 'Applications',
      href: '/admin/applications',
      icon: Building2,
      current: pathname.startsWith('/admin/applications'),
    },
    {
      name: 'Users',
      href: '/admin/users',
      icon: Users,
      current: pathname.startsWith('/admin/users'),
    },
    // Analytics page not yet implemented - uncomment when ready
    // {
    //   name: 'Analytics',
    //   href: '/admin/analytics',
    //   icon: TrendingUp,
    //   current: pathname.startsWith('/admin/analytics'),
    // },
  ];

  const handleLogout = async () => {
    if (!backendBaseUrl) {
      console.error('Backend URL is not configured');
      window.location.href = '/admin/login';
      return;
    }

    try {
      const response = await fetch(`${backendBaseUrl}/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      });
      
      if (response.ok) {
        window.location.href = '/admin/login';
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
      <aside 
        id="mobile-sidebar"
        className={cn(
          "fixed inset-y-0 left-0 z-[60] w-64 bg-background/95 dark:bg-background/95 backdrop-blur-md border-r border-blue-500/20 dark:border-blue-500/30 transform transition-all duration-300 ease-in-out dark-mode-transition shadow-lg",
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
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
                <p className="text-xs text-muted-foreground">Admin Portal</p>
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
          <nav className="space-y-2 mb-6">
            {navigation.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => {
                    setSidebarOpen(false);
                  }}
                  className={cn(
                    "flex items-center space-x-3 px-3 rounded-lg transition-all duration-200 min-h-[44px]",
                    item.current
                      ? 'bg-primary text-primary-foreground shadow-glow-sm'
                      : 'hover:bg-muted text-muted-foreground hover:text-foreground hover:shadow-sm'
                  )}
                >
                  <Icon className="w-5 h-5" />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>

          {/* Mobile Collapsible Sections */}
          <div className="md:hidden">
            <MobileCollapsibleNav />
          </div>
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
              className="h-11 w-11 min-w-[44px] min-h-[44px] md:h-8 md:w-8"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              aria-label={sidebarOpen ? "Close sidebar" : "Open sidebar"}
              aria-expanded={sidebarOpen}
              aria-controls="mobile-sidebar"
            >
              {sidebarOpen ? <ChevronLeft className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </Button>
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
                <h1 className="text-lg font-semibold">MetaVR Dashboard</h1>
                <p className="text-xs text-muted-foreground">Admin Portal</p>
              </div>
            </div>
          </div>

              <div className="flex items-center space-x-2 md:space-x-4">
                {/* Mobile: Collapsible action buttons */}
                <div className="hidden md:flex items-center space-x-2">
                  <Button variant="ghost" size="sm" className="h-11 w-11 min-w-[44px] min-h-[44px] md:h-8 md:w-8">
                    <Search className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="sm" className="h-11 w-11 min-w-[44px] min-h-[44px] md:h-8 md:w-8">
                    <Settings className="w-4 h-4" />
                  </Button>
                </div>
                
                {/* Mobile: Dropdown menu for actions */}
                <div className="md:hidden">
                  <Button variant="ghost" size="sm" className="h-11 w-11 min-w-[44px] min-h-[44px]">
                    <MoreHorizontal className="w-4 h-4" />
                  </Button>
                </div>
                
                {/* Always visible buttons */}
                <Button variant="ghost" size="sm" className="relative h-11 w-11 min-w-[44px] min-h-[44px] md:h-8 md:w-8">
                  <Bell className="w-4 h-4" />
                  {/* Notification badge - hide when count is 0 */}
                  {/* TODO: Implement real notification count */}
                  {/* {notificationCount > 0 && (
                    <Badge className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs">
                      {notificationCount}
                    </Badge>
                  )} */}
                </Button>
                <ThemeToggle />
                <Button variant="ghost" size="sm" onClick={handleLogout} className="h-11 w-11 min-w-[44px] min-h-[44px] md:h-8 md:w-8">
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
          "flex-1 pb-20 md:pb-0 px-4 md:px-6 pt-4 md:pt-6 transition-all duration-300",
          sidebarOpen && "pl-64"
        )}>
          <PageTransition>
            {children}
          </PageTransition>
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <div className="md:hidden">
        <MobileBottomNav />
      </div>
    </div>
  );
}



