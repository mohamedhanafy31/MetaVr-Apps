'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface CollapsibleSectionProps {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  className?: string;
}

export function CollapsibleSection({ 
  title, 
  children, 
  defaultOpen = false,
  className = '' 
}: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className={`border border-blue-500/20 dark:border-blue-500/30 rounded-lg overflow-hidden ${className}`}>
      <Button
        variant="ghost"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full justify-between p-4 hover:bg-muted/50 transition-colors duration-200"
      >
        <span className="font-medium text-left">{title}</span>
        <motion.div
          animate={{ rotate: isOpen ? 90 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronRight className="w-4 h-4" />
        </motion.div>
      </Button>
      
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="p-4 pt-0 space-y-2">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

interface MobileCollapsibleNavProps {
  className?: string;
}

export function MobileCollapsibleNav({ className }: MobileCollapsibleNavProps) {
  return (
    <div className={`space-y-3 ${className}`}>
      <CollapsibleSection title="Quick Actions" defaultOpen={true}>
        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" size="sm" className="text-xs">
            New User
          </Button>
          <Button variant="outline" size="sm" className="text-xs">
            New App
          </Button>
          <Button variant="outline" size="sm" className="text-xs">
            View Reports
          </Button>
          <Button variant="outline" size="sm" className="text-xs">
            Settings
          </Button>
        </div>
      </CollapsibleSection>

      <CollapsibleSection title="Recent Activity">
        <div className="space-y-2 text-sm">
          <div className="flex items-center justify-between p-2 bg-muted/30 rounded">
            <span>User registration</span>
            <span className="text-xs text-muted-foreground">2m ago</span>
          </div>
          <div className="flex items-center justify-between p-2 bg-muted/30 rounded">
            <span>App deployment</span>
            <span className="text-xs text-muted-foreground">5m ago</span>
          </div>
          <div className="flex items-center justify-between p-2 bg-muted/30 rounded">
            <span>Access request</span>
            <span className="text-xs text-muted-foreground">10m ago</span>
          </div>
        </div>
      </CollapsibleSection>

      <CollapsibleSection title="System Status">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm">Server Status</span>
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">Database</span>
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">API Services</span>
            <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse" />
          </div>
        </div>
      </CollapsibleSection>
    </div>
  );
}

const CollapsibleNavComponents = { CollapsibleSection, MobileCollapsibleNav };

export default CollapsibleNavComponents;
