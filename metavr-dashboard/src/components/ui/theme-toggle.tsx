'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Sun, Moon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/hooks/useTheme';
import { useEffect, useState } from 'react';

interface ThemeToggleProps {
  className?: string;
  showLabel?: boolean;
}

export function ThemeToggle({ className, showLabel = false }: ThemeToggleProps) {
  const { theme, setTheme, actualTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Prevent hydration mismatch by only rendering after mount
  useEffect(() => {
    setMounted(true);
  }, []);

  const cycleTheme = () => {
    // Cycle between light and dark, skipping system
    if (theme === 'light') {
      setTheme('dark');
    } else if (theme === 'dark') {
      setTheme('light');
    } else {
      // If system, switch to light
      setTheme('light');
    }
  };

  // Use a default icon during SSR to prevent hydration mismatch
  const Icon = mounted ? (actualTheme === 'light' ? Sun : Moon) : Sun;
  const label = mounted ? (actualTheme === 'light' ? 'Light' : 'Dark') : 'Light';

  return (
    <motion.div 
      className={className}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
    >
      <Button
        variant="ghost"
        size="sm"
        onClick={cycleTheme}
        className="relative overflow-hidden dark-mode-transition"
      >
        {mounted ? (
          <AnimatePresence mode="wait">
            <motion.div
              key={actualTheme}
              initial={{ opacity: 0, rotate: -90 }}
              animate={{ opacity: 1, rotate: 0 }}
              exit={{ opacity: 0, rotate: 90 }}
              transition={{ duration: 0.2 }}
              className="flex items-center"
            >
              <Icon className="w-4 h-4" />
              {showLabel && <span className="ml-2">{label}</span>}
            </motion.div>
          </AnimatePresence>
        ) : (
          <div className="flex items-center">
            <Sun className="w-4 h-4" />
            {showLabel && <span className="ml-2">Light</span>}
          </div>
        )}
        
        {/* Glow effect for dark mode */}
        {mounted && actualTheme === 'dark' && (
          <motion.div
            className="absolute inset-0 rounded-md bg-gradient-to-r from-blue-500/20 to-purple-500/20"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.3, 0] }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: 'easeInOut'
            }}
          />
        )}
      </Button>
    </motion.div>
  );
}

export default ThemeToggle;