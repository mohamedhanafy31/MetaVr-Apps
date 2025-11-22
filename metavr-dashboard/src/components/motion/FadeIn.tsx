'use client';

import { motion } from 'framer-motion';
import React from 'react';
import { useReducedMotion, useAnimationPreset } from '@/hooks/useScrollAnimation';

interface FadeInProps {
  children: React.ReactNode;
  delay?: number;
  duration?: number;
  x?: number;
  y?: number;
  staggerChildren?: number;
  className?: string;
}

export function FadeIn({ 
  children, 
  delay = 0, 
  duration = 0.4, 
  x = 0, 
  y = 20,
  staggerChildren = 0,
  className
}: FadeInProps) {
  const prefersReducedMotion = useReducedMotion();
  const { config } = useAnimationPreset();

  const variants = {
    hidden: { opacity: 0, x, y },
    visible: { 
      opacity: 1, 
      x: 0, 
      y: 0, 
      transition: { 
        duration: prefersReducedMotion ? 0.1 : duration * config.duration, 
        delay
      } 
    }
  };

  const containerVariants = staggerChildren > 0 ? {
    visible: {
      transition: {
        staggerChildren: staggerChildren * config.staggerDelay
      }
    }
  } : {};

  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.2 }}
      variants={variants}
      {...(staggerChildren > 0 && { variants: { ...variants, ...containerVariants } })}
    >
      {children}
    </motion.div>
  );
}

interface ScaleInProps {
  children: React.ReactNode;
  delay?: number;
  duration?: number;
  scaleFrom?: number;
  className?: string;
}

export function ScaleIn({ 
  children, 
  delay = 0, 
  duration = 0.5, 
  scaleFrom = 0.95,
  className
}: ScaleInProps) {
  const prefersReducedMotion = useReducedMotion();
  const { config } = useAnimationPreset();

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, scale: scaleFrom }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ 
        type: prefersReducedMotion ? 'tween' : 'spring', 
        stiffness: prefersReducedMotion ? undefined : 120, 
        damping: prefersReducedMotion ? undefined : 17, 
        delay, 
        duration: prefersReducedMotion ? 0.1 : duration * config.duration
      }}
    >
      {children}
    </motion.div>
  );
}

interface SlideInProps {
  children: React.ReactNode;
  direction?: 'left' | 'right' | 'up' | 'down';
  delay?: number;
  duration?: number;
  distance?: number;
  className?: string;
}

export function SlideIn({ 
  children, 
  direction = 'left',
  delay = 0, 
  duration = 0.4,
  distance = 50,
  className
}: SlideInProps) {
  const prefersReducedMotion = useReducedMotion();
  const { config } = useAnimationPreset();

  const getInitialPosition = () => {
    switch (direction) {
      case 'left': return { x: -distance, y: 0 };
      case 'right': return { x: distance, y: 0 };
      case 'up': return { x: 0, y: -distance };
      case 'down': return { x: 0, y: distance };
      default: return { x: -distance, y: 0 };
    }
  };

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, ...getInitialPosition() }}
      whileInView={{ opacity: 1, x: 0, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ 
        duration: prefersReducedMotion ? 0.1 : duration * config.duration, 
        delay, 
        ease: "easeOut"
      }}
    >
      {children}
    </motion.div>
  );
}

interface RotateInProps {
  children: React.ReactNode;
  delay?: number;
  duration?: number;
  angle?: number;
  className?: string;
}

export function RotateIn({ 
  children, 
  delay = 0, 
  duration = 0.6,
  angle = -15,
  className
}: RotateInProps) {
  const prefersReducedMotion = useReducedMotion();
  const { config } = useAnimationPreset();

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, rotate: angle, scale: 0.8 }}
      whileInView={{ opacity: 1, rotate: 0, scale: 1 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ 
        type: prefersReducedMotion ? 'tween' : 'spring',
        stiffness: prefersReducedMotion ? undefined : 150,
        damping: prefersReducedMotion ? undefined : 18,
        duration: prefersReducedMotion ? 0.1 : duration * config.duration,
        delay
      }}
    >
      {children}
    </motion.div>
  );
}

interface StaggerContainerProps {
  children: React.ReactNode;
  staggerDelay?: number;
  className?: string;
}

export function StaggerContainer({ 
  children, 
  staggerDelay = 0.1,
  className
}: StaggerContainerProps) {
  const prefersReducedMotion = useReducedMotion();
  const { config } = useAnimationPreset();

  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.1 }}
      variants={{
        hidden: { opacity: 0 },
        visible: {
          opacity: 1,
          transition: {
            staggerChildren: prefersReducedMotion ? 0 : staggerDelay * config.staggerDelay,
            delayChildren: 0.1
          }
        }
      }}
    >
      {children}
    </motion.div>
  );
}

interface StaggerItemProps {
  children: React.ReactNode;
  className?: string;
}

export function StaggerItem({ children, className }: StaggerItemProps) {
  const prefersReducedMotion = useReducedMotion();
  const { config } = useAnimationPreset();

  return (
    <motion.div
      className={className}
      variants={{
        hidden: { opacity: 0, y: 20 },
        visible: { 
          opacity: 1, 
          y: 0,
          transition: { 
            duration: prefersReducedMotion ? 0.1 : 0.3 * config.duration, 
            ease: "easeOut"
          }
        }
      }}
    >
      {children}
    </motion.div>
  );
}

interface HoverLiftProps {
  children: React.ReactNode;
  liftDistance?: number;
  scaleAmount?: number;
  className?: string;
}

export function HoverLift({ 
  children, 
  liftDistance = 4,
  scaleAmount = 1.02,
  className
}: HoverLiftProps) {
  const prefersReducedMotion = useReducedMotion();
  const { config } = useAnimationPreset();

  if (prefersReducedMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={className}
      whileHover={{ 
        y: -liftDistance, 
        scale: scaleAmount,
        transition: { duration: 0.2 * config.duration, ease: "easeOut" }
      }}
      transition={{ duration: 0.2 * config.duration, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}

interface PulseGlowProps {
  children: React.ReactNode;
  color?: 'blue' | 'purple' | 'cyan' | 'green';
  intensity?: 'low' | 'medium' | 'high';
  className?: string;
}

export function PulseGlow({ 
  children, 
  color = 'blue',
  intensity = 'medium',
  className
}: PulseGlowProps) {
  const prefersReducedMotion = useReducedMotion();
  const { config } = useAnimationPreset();

  if (prefersReducedMotion || !config.enableGlow) {
    return <div className={className}>{children}</div>;
  }

  const colorValues = {
    blue: 'rgba(0, 102, 255, 0.4)',
    purple: 'rgba(123, 47, 255, 0.4)',
    cyan: 'rgba(0, 212, 255, 0.4)',
    green: 'rgba(0, 200, 81, 0.4)'
  };

  const intensityMultipliers = {
    low: 0.5,
    medium: 1,
    high: 1.5
  };

  const multiplier = intensityMultipliers[intensity];

  return (
    <motion.div
      className={className}
      animate={{
        boxShadow: [
          `0 0 ${10 * multiplier}px ${colorValues[color]}`,
          `0 0 ${20 * multiplier}px ${colorValues[color]}`,
          `0 0 ${10 * multiplier}px ${colorValues[color]}`
        ],
        opacity: [0.7, 1, 0.7]
      }}
      transition={{ 
        duration: 2, 
        repeat: Infinity, 
        ease: "easeInOut" 
      }}
    >
      {children}
    </motion.div>
  );
}

const MotionComponents = {
  FadeIn,
  ScaleIn,
  SlideIn,
  RotateIn,
  StaggerContainer,
  StaggerItem,
  HoverLift,
  PulseGlow
};

export default MotionComponents;