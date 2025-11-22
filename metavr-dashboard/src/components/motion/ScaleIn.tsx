'use client';

import { motion } from 'framer-motion';
import React from 'react';
import { useReducedMotion, useAnimationPreset } from '@/hooks/useScrollAnimation';

interface ScaleInProps {
  children: React.ReactNode;
  delay?: number;
  duration?: number;
  scaleFrom?: number;
  className?: string;
  spring?: boolean;
}

export function ScaleIn({ 
  children, 
  delay = 0, 
  duration = 0.5, 
  scaleFrom = 0.95,
  className,
  spring = true
}: ScaleInProps) {
  const prefersReducedMotion = useReducedMotion();
  const { config } = useAnimationPreset();

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, scale: scaleFrom }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ 
        type: prefersReducedMotion ? 'tween' : (spring ? 'spring' : 'tween'), 
        stiffness: prefersReducedMotion ? undefined : (spring ? 120 : undefined), 
        damping: prefersReducedMotion ? undefined : (spring ? 17 : undefined), 
        delay, 
        duration: prefersReducedMotion ? 0.1 : duration * config.duration,
        ease: spring ? undefined : [0.25, 0.46, 0.45, 0.94]
      }}
    >
      {children}
    </motion.div>
  );
}

export default ScaleIn;