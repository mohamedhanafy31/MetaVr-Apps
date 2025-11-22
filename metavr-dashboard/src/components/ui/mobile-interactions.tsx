'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, PanInfo } from 'framer-motion';

interface SwipeableCardProps {
  children: React.ReactNode;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  leftAction?: React.ReactNode;
  rightAction?: React.ReactNode;
  className?: string;
}

export function SwipeableCard({ 
  children, 
  onSwipeLeft, 
  onSwipeRight, 
  leftAction, 
  rightAction,
  className = '' 
}: SwipeableCardProps) {
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const handleDrag = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (window.innerWidth > 768) return; // Only on mobile
    
    const threshold = 50;
    const velocity = info.velocity.x;
    const offset = info.offset.x;

    setDragOffset(offset);

    // Swipe detection
    if (Math.abs(offset) > threshold || Math.abs(velocity) > 500) {
      if (offset > 0 && onSwipeRight) {
        onSwipeRight();
      } else if (offset < 0 && onSwipeLeft) {
        onSwipeLeft();
      }
    }
  };

  const handleDragEnd = () => {
    setDragOffset(0);
    setIsDragging(false);
  };

  const handleDragStart = () => {
    if (window.innerWidth <= 768) {
      setIsDragging(true);
    }
  };

  return (
    <div className={`relative overflow-hidden ${className}`}>
      {/* Left Action */}
      {leftAction && (
        <div 
          className={`absolute left-0 top-0 h-full flex items-center justify-center bg-green-500 text-white px-4 transition-opacity duration-200 ${
            dragOffset > 0 ? 'opacity-100' : 'opacity-0'
          }`}
          style={{ width: Math.min(Math.abs(dragOffset), 80) }}
        >
          {leftAction}
        </div>
      )}

      {/* Right Action */}
      {rightAction && (
        <div 
          className={`absolute right-0 top-0 h-full flex items-center justify-center bg-red-500 text-white px-4 transition-opacity duration-200 ${
            dragOffset < 0 ? 'opacity-100' : 'opacity-0'
          }`}
          style={{ width: Math.min(Math.abs(dragOffset), 80) }}
        >
          {rightAction}
        </div>
      )}

      {/* Main Card */}
      <motion.div
        ref={cardRef}
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.1}
        onDrag={handleDrag}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        animate={{ x: dragOffset }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className={`bg-background ${isDragging ? 'shadow-lg' : ''}`}
        style={{ 
          cursor: window.innerWidth <= 768 ? 'grab' : 'default',
          touchAction: 'pan-y'
        }}
      >
        {children}
      </motion.div>
    </div>
  );
}

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: React.ReactNode;
  className?: string;
}

export function PullToRefresh({ onRefresh, children, className = '' }: PullToRefreshProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [isPulling, setIsPulling] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (window.innerWidth > 768) return; // Only on mobile

    let startY = 0;
    let currentY = 0;

    const handleTouchStart = (e: TouchEvent) => {
      if (containerRef.current?.scrollTop === 0) {
        startY = e.touches[0].clientY;
        setIsPulling(true);
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isPulling) return;
      
      currentY = e.touches[0].clientY;
      const distance = Math.max(0, currentY - startY);
      
      if (distance > 0 && containerRef.current?.scrollTop === 0) {
        e.preventDefault();
        setPullDistance(Math.min(distance, 100));
      }
    };

    const handleTouchEnd = async () => {
      if (pullDistance > 60 && !isRefreshing) {
        setIsRefreshing(true);
        await onRefresh();
        setIsRefreshing(false);
      }
      
      setPullDistance(0);
      setIsPulling(false);
    };

    const container = containerRef.current;
    if (container) {
      container.addEventListener('touchstart', handleTouchStart, { passive: false });
      container.addEventListener('touchmove', handleTouchMove, { passive: false });
      container.addEventListener('touchend', handleTouchEnd);
    }

    return () => {
      if (container) {
        container.removeEventListener('touchstart', handleTouchStart);
        container.removeEventListener('touchmove', handleTouchMove);
        container.removeEventListener('touchend', handleTouchEnd);
      }
    };
  }, [pullDistance, isPulling, isRefreshing, onRefresh]);

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Pull indicator */}
      <div 
        className={`absolute top-0 left-0 right-0 flex items-center justify-center bg-primary/10 transition-all duration-200 ${
          pullDistance > 0 ? 'opacity-100' : 'opacity-0'
        }`}
        style={{ height: pullDistance }}
      >
        {isRefreshing ? (
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
        ) : (
          <div className="text-primary text-sm">
            {pullDistance > 60 ? 'Release to refresh' : 'Pull to refresh'}
          </div>
        )}
      </div>

      {/* Content */}
      <div style={{ transform: `translateY(${pullDistance}px)` }}>
        {children}
      </div>
    </div>
  );
}

interface MobileOptimizedButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
  disabled?: boolean;
}

export function MobileOptimizedButton({ 
  children, 
  onClick, 
  variant = 'default', 
  size = 'default',
  className = '',
  disabled = false
}: MobileOptimizedButtonProps) {
  const baseClasses = "inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none";
  
  const variantClasses = {
    default: "bg-primary text-primary-foreground hover:bg-primary/90",
    destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
    outline: "border border-input hover:bg-accent hover:text-accent-foreground",
    secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
    ghost: "hover:bg-accent hover:text-accent-foreground",
    link: "text-primary underline-offset-4 hover:underline"
  };

  const sizeClasses = {
    default: "h-10 px-4 py-2",
    sm: "h-9 px-3",
    lg: "h-11 px-8",
    icon: "h-10 w-10"
  };

  // Mobile-specific sizing
  const mobileClasses = "min-h-[44px] min-w-[44px] text-base";

  return (
    <button
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${mobileClasses} ${className}`}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
}
