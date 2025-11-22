'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Building2,
  TrendingUp,
  Home
} from 'lucide-react';

interface MobileBottomNavProps {
  className?: string;
}

export function MobileBottomNav({ className }: MobileBottomNavProps) {
  const pathname = usePathname();

  const navigation = [
    {
      name: 'Dashboard',
      href: '/admin/dashboard',
      icon: Home,
      current: pathname === '/admin/dashboard',
    },
    {
      name: 'Apps',
      href: '/admin/applications',
      icon: Building2,
      current: pathname.startsWith('/admin/applications'),
    },
    {
      name: 'Analytics',
      href: '/admin/analytics',
      icon: TrendingUp,
      current: pathname.startsWith('/admin/analytics'),
    },
  ];

  return (
    <motion.div
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className={`fixed bottom-0 left-0 right-0 z-50 bg-background/95 dark:bg-background/95 backdrop-blur-md border-t border-blue-500/20 dark:border-blue-500/30 dark-mode-transition ${className}`}
    >
      <nav className="flex items-center justify-around px-2 py-2">
        {navigation.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.name}
              href={item.href}
              className="flex flex-col items-center space-y-1 px-3 py-2 rounded-lg transition-all duration-200 min-w-0 flex-1 justify-center"
              style={{ minHeight: '60px' }}
            >
              <motion.div
                className={`relative p-2 rounded-lg transition-all duration-200 ${
                  item.current
                    ? 'bg-primary text-primary-foreground shadow-glow-sm'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                }`}
                whileTap={{ scale: 0.95 }}
                transition={{ duration: 0.1 }}
              >
                <Icon className="w-5 h-5" />
                {/* Active indicator */}
                {item.current && (
                  <motion.div
                    className="absolute -top-1 -right-1 w-2 h-2 bg-blue-500 rounded-full"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ duration: 0.2 }}
                  />
                )}
              </motion.div>
              <span className={`text-xs font-medium truncate max-w-full ${
                item.current ? 'text-primary' : 'text-muted-foreground'
              }`}>
                {item.name}
              </span>
            </Link>
          );
        })}
      </nav>
    </motion.div>
  );
}

export default MobileBottomNav;
