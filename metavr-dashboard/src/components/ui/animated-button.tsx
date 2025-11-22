'use client';

import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { VariantProps } from 'class-variance-authority';
import React from 'react';

interface AnimatedButtonProps extends React.ComponentProps<"button">, VariantProps<typeof Button> {
  children: React.ReactNode;
  ripple?: boolean;
}

export function AnimatedButton({ children, ripple = true, className, ...props }: AnimatedButtonProps) {
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      className="relative overflow-hidden"
    >
      <Button
        className={`relative ${className}`}
        {...props}
      >
        {children}
        {ripple && (
          <motion.div
            className="absolute inset-0 bg-white/20 rounded-full"
            initial={{ scale: 0, opacity: 0 }}
            whileTap={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.2 }}
          />
        )}
      </Button>
    </motion.div>
  );
}

export default AnimatedButton;
