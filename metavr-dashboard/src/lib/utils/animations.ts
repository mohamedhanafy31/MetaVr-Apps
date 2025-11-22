import { Variants, Transition } from 'framer-motion';

// Animation Durations
export const DURATION_FAST = 0.15;
export const DURATION_NORMAL = 0.3;
export const DURATION_SLOW = 0.5;
export const DURATION_VERY_SLOW = 0.8;

// Easing Functions
export const EASE_IN_OUT = "easeInOut";
export const EASE_OUT = "easeOut";
export const EASE_IN = "easeIn";
export const EASE_LINEAR = "linear";
export const EASE_BOUNCE = "easeOut";

// Spring Physics Presets
export const SPRING_GENTLE: Transition = { type: "spring", stiffness: 120, damping: 14 };
export const SPRING_MODERATE: Transition = { type: "spring", stiffness: 150, damping: 18 };
export const SPRING_BOUNCY: Transition = { type: "spring", stiffness: 200, damping: 25 };
export const SPRING_STIFF: Transition = { type: "spring", stiffness: 300, damping: 30 };

// Common Animation Variants

export const fadeInVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: DURATION_NORMAL, ease: EASE_IN_OUT } },
};

export const slideInFromLeftVariants: Variants = {
  hidden: { opacity: 0, x: -50 },
  visible: { opacity: 1, x: 0, transition: { duration: DURATION_NORMAL, ease: EASE_OUT } },
};

export const slideInFromRightVariants: Variants = {
  hidden: { opacity: 0, x: 50 },
  visible: { opacity: 1, x: 0, transition: { duration: DURATION_NORMAL, ease: EASE_OUT } },
};

export const scaleUpVariants: Variants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { opacity: 1, scale: 1, transition: { ...SPRING_GENTLE, duration: DURATION_NORMAL } },
};

export const scaleDownVariants: Variants = {
  hidden: { opacity: 0, scale: 1.05 },
  visible: { opacity: 1, scale: 1, transition: { ...SPRING_GENTLE, duration: DURATION_NORMAL } },
};

export const rotateInVariants: Variants = {
  hidden: { opacity: 0, rotate: -15, scale: 0.8 },
  visible: { opacity: 1, rotate: 0, scale: 1, transition: { ...SPRING_MODERATE, duration: DURATION_SLOW } },
};

export const flipInVariants: Variants = {
  hidden: { opacity: 0, rotateY: -90 },
  visible: { opacity: 1, rotateY: 0, transition: { duration: DURATION_SLOW, ease: EASE_OUT } },
};

// VR-Specific Animation Variants

export const pulseGlowVariants: Variants = {
  initial: { boxShadow: "0 0 10px rgba(0, 102, 255, 0.3)", opacity: 0.7 },
  animate: {
    boxShadow: ["0 0 10px rgba(0, 102, 255, 0.3)", "0 0 20px rgba(0, 102, 255, 0.5)", "0 0 10px rgba(0, 102, 255, 0.3)"],
    opacity: [0.7, 1, 0.7],
    transition: { duration: 2, repeat: Infinity, ease: EASE_IN_OUT }
  }
};

export const shimmerVariants: Variants = {
  animate: {
    backgroundPosition: ["-200% 0", "200% 0"],
    transition: { duration: 3, repeat: Infinity, ease: EASE_IN_OUT }
  }
};

export const floatSubtleVariants: Variants = {
  animate: {
    y: ["0px", "-4px", "0px"],
    transition: { duration: 6, repeat: Infinity, ease: EASE_IN_OUT }
  }
};

export const floatStrongVariants: Variants = {
  animate: {
    y: ["0px", "-8px", "0px"],
    transition: { duration: 4, repeat: Infinity, ease: EASE_IN_OUT }
  }
};

export const neonGlowVariants: Variants = {
  initial: { textShadow: "0 0 5px rgba(0, 102, 255, 0.3)" },
  animate: {
    textShadow: ["0 0 5px rgba(0, 102, 255, 0.3)", "0 0 20px rgba(0, 102, 255, 0.3), 0 0 30px rgba(0, 102, 255, 0.3)", "0 0 5px rgba(0, 102, 255, 0.3)"],
    transition: { duration: 2, repeat: Infinity, ease: EASE_IN_OUT, repeatType: "reverse" }
  }
};

export const holographicVariants: Variants = {
  initial: { 
    background: "linear-gradient(45deg, rgba(0, 102, 255, 0.1), rgba(123, 47, 255, 0.1), rgba(0, 212, 255, 0.1))",
    backgroundPosition: "-200% 0"
  },
  animate: {
    backgroundPosition: ["-200% 0", "200% 0"],
    transition: { duration: 3, repeat: Infinity, ease: EASE_IN_OUT }
  }
};

// Stagger Animation Variants

export const staggerContainerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.1
    }
  }
};

export const staggerItemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { duration: DURATION_NORMAL, ease: EASE_IN_OUT }
  }
};

export const staggerFadeVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { 
    opacity: 1,
    transition: { duration: DURATION_NORMAL, ease: EASE_IN_OUT }
  }
};

// Hover Animation Variants

export const hoverLiftVariants: Variants = {
  rest: { y: 0, scale: 1 },
  hover: { 
    y: -4, 
    scale: 1.02,
    transition: { duration: DURATION_FAST, ease: EASE_OUT }
  }
};

export const hoverGlowVariants: Variants = {
  rest: { boxShadow: "0 0 0px rgba(0, 102, 255, 0)" },
  hover: { 
    boxShadow: "0 0 20px rgba(0, 102, 255, 0.4)",
    transition: { duration: DURATION_FAST, ease: EASE_OUT }
  }
};

export const hoverRotateVariants: Variants = {
  rest: { rotate: 0 },
  hover: { 
    rotate: 5,
    transition: { duration: DURATION_FAST, ease: EASE_OUT }
  }
};

// Loading Animation Variants

export const loadingSpinnerVariants: Variants = {
  animate: {
    rotate: 360,
    transition: { duration: 1, repeat: Infinity, ease: EASE_LINEAR }
  }
};

export const loadingPulseVariants: Variants = {
  animate: {
    opacity: [0.5, 1, 0.5],
    scale: [0.95, 1.05, 0.95],
    transition: { duration: 1.5, repeat: Infinity, ease: EASE_IN_OUT }
  }
};

export const loadingWaveVariants: Variants = {
  animate: {
    y: ["0%", "-100%", "0%"],
    transition: { duration: 1.5, repeat: Infinity, ease: EASE_IN_OUT }
  }
};

// Page Transition Variants

export const pageTransitionVariants: Variants = {
  initial: { opacity: 0, y: 20 },
  animate: { 
    opacity: 1, 
    y: 0,
    transition: { duration: DURATION_NORMAL, ease: EASE_IN_OUT }
  },
  exit: { 
    opacity: 0, 
    y: -20,
    transition: { duration: DURATION_FAST, ease: EASE_IN }
  }
};

export const slidePageVariants: Variants = {
  initial: { opacity: 0, x: 100 },
  animate: { 
    opacity: 1, 
    x: 0,
    transition: { duration: DURATION_NORMAL, ease: EASE_OUT }
  },
  exit: { 
    opacity: 0, 
    x: -100,
    transition: { duration: DURATION_FAST, ease: EASE_IN }
  }
};

// Utility Functions

export const createStaggerDelay = (index: number, baseDelay: number = 0.1): number => {
  return baseDelay * index;
};

export const createRandomDelay = (min: number = 0, max: number = 0.5): number => {
  return Math.random() * (max - min) + min;
};

export const createEasingFunction = (x1: number, y1: number, x2: number, y2: number): number[] => {
  return [x1, y1, x2, y2];
};

// Performance Optimized Variants (for mobile)

export const mobileOptimizedVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { 
    opacity: 1,
    transition: { duration: DURATION_FAST, ease: EASE_OUT }
  }
};

export const reducedMotionVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { 
    opacity: 1,
    transition: { duration: 0.1 }
  }
};

// Export all variants as a single object for easy importing
export const animations = {
  // Basic animations
  fadeIn: fadeInVariants,
  slideInFromLeft: slideInFromLeftVariants,
  slideInFromRight: slideInFromRightVariants,
  scaleUp: scaleUpVariants,
  scaleDown: scaleDownVariants,
  rotateIn: rotateInVariants,
  flipIn: flipInVariants,
  
  // VR-specific animations
  pulseGlow: pulseGlowVariants,
  shimmer: shimmerVariants,
  floatSubtle: floatSubtleVariants,
  floatStrong: floatStrongVariants,
  neonGlow: neonGlowVariants,
  holographic: holographicVariants,
  
  // Stagger animations
  staggerContainer: staggerContainerVariants,
  staggerItem: staggerItemVariants,
  staggerFade: staggerFadeVariants,
  
  // Hover animations
  hoverLift: hoverLiftVariants,
  hoverGlow: hoverGlowVariants,
  hoverRotate: hoverRotateVariants,
  
  // Loading animations
  loadingSpinner: loadingSpinnerVariants,
  loadingPulse: loadingPulseVariants,
  loadingWave: loadingWaveVariants,
  
  // Page transitions
  pageTransition: pageTransitionVariants,
  slidePage: slidePageVariants,
  
  // Performance optimized
  mobileOptimized: mobileOptimizedVariants,
  reducedMotion: reducedMotionVariants
};

export default animations;