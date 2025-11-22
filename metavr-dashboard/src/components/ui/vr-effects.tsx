'use client';

import { motion } from 'framer-motion';
import React, { useEffect, useState, useMemo } from 'react';

interface GridPatternProps {
  className?: string;
}

export function GridPattern({ className }: GridPatternProps) {
  return (
    <div className={`absolute inset-0 ${className}`}>
      <div className="absolute inset-0 bg-grid-pattern opacity-20" />
    </div>
  );
}

interface ParticleData {
  id: number;
  x: number;
  y: number;
  scale: number;
  duration: number;
  delay: number;
  opacity: number[];
  scaleArray: number[];
}

interface VREffectsProps {
  className?: string;
  intensity?: 'low' | 'medium' | 'high';
}

export function VREffects({ className = '', intensity = 'medium' }: VREffectsProps) {
  const [particles, setParticles] = useState<ParticleData[]>([]);
  const [mobileParticles, setMobileParticles] = useState<ParticleData[]>([]);

  const baseParticleCount = useMemo(() => {
    switch (intensity) {
      case 'low': return 8;
      case 'medium': return 15;
      case 'high': return 25;
      default: return 15;
    }
  }, [intensity]);

  useEffect(() => {
    // Generate desktop particles
    const desktopParticles: ParticleData[] = Array.from({ length: baseParticleCount }, (_, i) => {
      const x = Math.random() * 1200;
      const scale = Math.random() * 0.3 + 0.7;
      const duration = Math.random() * 8 + 8;
      const delay = Math.random() * 8;
      const opacity = [0, 0.8, 0];
      const scaleArray = [scale, scale, scale];
      
      return {
        id: i,
        x,
        y: 800 + 10,
        scale,
        duration,
        delay,
        opacity,
        scaleArray,
      };
    });

    // Generate mobile particles (reduced for performance)
    const mobileParticlesData: ParticleData[] = Array.from({ length: Math.floor(baseParticleCount * 0.1) }, (_, i) => {
      const x = Math.random() * 1200;
      const scale = Math.random() * 0.3 + 0.7;
      const duration = Math.random() * 12 + 12;
      const delay = Math.random() * 12;
      const opacity = [0, 0.8, 0];
      const scaleArray = [scale, scale, scale];
      
      return {
        id: i + baseParticleCount,
        x,
        y: 800 + 10,
        scale,
        duration,
        delay,
        opacity,
        scaleArray,
      };
    });

    const timeoutId = setTimeout(() => {
      setParticles(desktopParticles);
      setMobileParticles(mobileParticlesData);
    }, 0);
    return () => clearTimeout(timeoutId);
  }, [baseParticleCount]);

  return (
    <div className={`fixed inset-0 pointer-events-none overflow-hidden ${className}`}>
      {/* Desktop particles */}
      <div className="hidden md:block">
        {particles.map((particle) => (
          <motion.div
            key={particle.id}
            className="absolute w-1 h-1 bg-gradient-to-r from-primary/60 to-accent/60 rounded-full"
            style={{
              willChange: 'transform, opacity',
              backfaceVisibility: 'hidden',
              transform: 'translateZ(0)'
            }}
            initial={{
              x: particle.x,
              y: particle.y,
              opacity: 0,
              scale: particle.scale
            }}
            animate={{
              y: -10,
              opacity: particle.opacity,
              scale: particle.scaleArray
            }}
            transition={{
              duration: particle.duration,
              repeat: Infinity,
              delay: particle.delay,
              ease: "linear"
            }}
          />
        ))}
      </div>
      
      {/* Mobile particles (reduced count) */}
      <div className="md:hidden">
        {mobileParticles.map((particle) => (
          <motion.div
            key={particle.id}
            className="absolute w-1 h-1 bg-gradient-to-r from-primary/40 to-accent/40 rounded-full"
            style={{
              willChange: 'transform, opacity',
              backfaceVisibility: 'hidden',
              transform: 'translateZ(0)'
            }}
            initial={{
              x: particle.x,
              y: particle.y,
              opacity: 0,
              scale: particle.scale
            }}
            animate={{
              y: -10,
              opacity: particle.opacity,
              scale: particle.scaleArray
            }}
            transition={{
              duration: particle.duration,
              repeat: Infinity,
              delay: particle.delay,
              ease: "linear"
            }}
          />
        ))}
      </div>

      {/* Grid overlay */}
      <GridPattern className="opacity-10" />
      
      {/* Ambient glow */}
      <div className="absolute inset-0 bg-gradient-radial from-primary/5 via-transparent to-transparent" />
    </div>
  );
}

interface HolographicCardProps {
  children: React.ReactNode;
  className?: string;
  intensity?: 'low' | 'medium' | 'high';
}

export function HolographicCard({ children, className = '', intensity = 'medium' }: HolographicCardProps) {
  const glowIntensity = useMemo(() => {
    switch (intensity) {
      case 'low': return 'shadow-primary/20';
      case 'medium': return 'shadow-primary/30';
      case 'high': return 'shadow-primary/40';
      default: return 'shadow-primary/30';
    }
  }, [intensity]);

  return (
    <div className={`relative ${className}`}>
      <div className={`absolute inset-0 rounded-lg bg-gradient-to-r from-primary/10 via-accent/10 to-secondary/10 blur-xl ${glowIntensity}`} />
      <div className="relative bg-background/80 backdrop-blur-sm border border-primary/20 rounded-lg p-6">
        {children}
      </div>
    </div>
  );
}

interface DataVisualizationProps {
  data: Array<{ label: string; value: number; color?: string }>;
  className?: string;
}

export function DataVisualization({ data, className = '' }: DataVisualizationProps) {
  const maxValue = Math.max(...data.map(d => d.value));
  
  return (
    <div className={`space-y-4 ${className}`}>
      {data.map((item, index) => (
        <div key={index} className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">{item.label}</span>
            <span className="font-medium">{item.value}</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <motion.div
              className={`h-full rounded-full ${item.color || 'bg-primary'}`}
              initial={{ width: 0 }}
              animate={{ width: `${(item.value / maxValue) * 100}%` }}
              transition={{ duration: 1, delay: index * 0.1 }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

interface ParticleBackgroundProps {
  className?: string;
  count?: number;
}

export function ParticleBackground({ className = '', count = 50 }: ParticleBackgroundProps) {
  const [particleData, setParticleData] = useState<Array<{
    id: number;
    x: number;
    y: number;
    size: number;
    duration: number;
    delay: number;
  }>>([]);

  useEffect(() => {
    const particles = Array.from({ length: count }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 4 + 1,
      duration: Math.random() * 20 + 10,
      delay: Math.random() * 5,
    }));
    const timeoutId = setTimeout(() => {
      setParticleData(particles);
    }, 0);
    return () => clearTimeout(timeoutId);
  }, [count]);

  return (
    <div className={`absolute inset-0 overflow-hidden ${className}`}>
      {particleData.map((particle) => (
        <motion.div
          key={particle.id}
          className="absolute rounded-full bg-primary/20"
          style={{
            left: `${particle.x}%`,
            top: `${particle.y}%`,
            width: `${particle.size}px`,
            height: `${particle.size}px`,
          }}
          animate={{
            y: [0, -100, 0],
            opacity: [0, 1, 0],
          }}
          transition={{
            duration: particle.duration,
            repeat: Infinity,
            delay: particle.delay,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
}

export function FloatingCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <motion.div
      className={`relative ${className}`}
      whileHover={{ y: -5 }}
      transition={{ duration: 0.2 }}
    >
      {children}
    </motion.div>
  );
}

export function AdvancedHolographicCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <motion.div
      className={`relative ${className}`}
      whileHover={{ scale: 1.02 }}
      transition={{ duration: 0.2 }}
    >
      <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-primary/20 via-accent/20 to-secondary/20 blur-xl" />
      <div className="relative bg-background/90 backdrop-blur-sm border border-primary/30 rounded-lg p-6">
        {children}
      </div>
    </motion.div>
  );
}

export default VREffects;