import { useEffect, useRef, useState } from 'react';
import { useInView } from 'framer-motion';

interface UseScrollAnimationOptions {
  threshold?: number;
  rootMargin?: string;
  triggerOnce?: boolean;
  staggerDelay?: number;
}

export function useScrollAnimation(options: UseScrollAnimationOptions = {}) {
  const {
    triggerOnce = true
  } = options;

  const ref = useRef(null);
  const isInView = useInView(ref, {
    once: triggerOnce
  });

  return {
    ref,
    isInView
  };
}

export function useStaggeredScrollAnimation(
  itemCount: number,
  options: UseScrollAnimationOptions = {}
) {
  const {
    triggerOnce = true,
    staggerDelay = 0.1
  } = options;

  const ref = useRef(null);
  const isInView = useInView(ref, {
    once: triggerOnce
  });

  const [visibleItems, setVisibleItems] = useState<number[]>([]);

  useEffect(() => {
    if (isInView) {
      const timeouts: NodeJS.Timeout[] = [];
      
      for (let i = 0; i < itemCount; i++) {
        const timeout = setTimeout(() => {
          setVisibleItems(prev => [...prev, i]);
        }, i * staggerDelay * 1000);
        
        timeouts.push(timeout);
      }

      return () => {
        timeouts.forEach(clearTimeout);
      };
    }
  }, [isInView, itemCount, staggerDelay]);

  return {
    ref,
    isInView,
    visibleItems
  };
}

export function useIntersectionObserver(
  callback: (entries: IntersectionObserverEntry[]) => void,
  options: IntersectionObserverInit = {}
) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(callback, {
      threshold: 0.1,
      rootMargin: '0px',
      ...options
    });

    observer.observe(element);

    return () => {
      observer.unobserve(element);
    };
  }, [callback, options]);

  return ref;
}

export function useAnimationSequence(
  steps: Array<{
    delay?: number;
    duration?: number;
    callback: () => void;
  }>
) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isRunning, setIsRunning] = useState(false);

  const startSequence = () => {
    setIsRunning(true);
    setCurrentStep(0);
  };

  const stopSequence = () => {
    setIsRunning(false);
    setCurrentStep(0);
  };

  useEffect(() => {
    if (!isRunning || currentStep >= steps.length) {
      if (currentStep >= steps.length) {
        const timeoutId = setTimeout(() => {
          setIsRunning(false);
        }, 0);
        return () => clearTimeout(timeoutId);
      }
      return;
    }

    const step = steps[currentStep];
    const timeout = setTimeout(() => {
      step.callback();
      setCurrentStep(prev => prev + 1);
    }, step.delay || 0);

    return () => clearTimeout(timeout);
  }, [isRunning, currentStep, steps]);

  return {
    startSequence,
    stopSequence,
    isRunning,
    currentStep
  };
}

export function useReducedMotion() {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const timeoutId = setTimeout(() => {
      setPrefersReducedMotion(mediaQuery.matches);
    }, 0);

    const handleChange = (event: MediaQueryListEvent) => {
      setPrefersReducedMotion(event.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => {
      clearTimeout(timeoutId);
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, []);

  return prefersReducedMotion;
}

export function usePerformanceMode() {
  const [isLowPerformance, setIsLowPerformance] = useState(false);

  useEffect(() => {
    // Check for low-end device indicators
    const checkPerformance = () => {
      const isMobile = window.innerWidth < 768;
    const nav = navigator as Navigator & {
      connection?: { effectiveType?: string };
      deviceMemory?: number;
    };
    const isSlowConnection = nav.connection &&
      (nav.connection.effectiveType === 'slow-2g' ||
       nav.connection.effectiveType === '2g');
    const hasLowMemory = nav.deviceMemory && nav.deviceMemory < 4;
      
      setIsLowPerformance(Boolean(isMobile || isSlowConnection || hasLowMemory));
    };

    checkPerformance();
    
    // Recheck on resize
    window.addEventListener('resize', checkPerformance);
    return () => window.removeEventListener('resize', checkPerformance);
  }, []);

  return isLowPerformance;
}

export function useAnimationControls() {
  const [isAnimating, setIsAnimating] = useState(false);
  const [animationSpeed, setAnimationSpeed] = useState<'slow' | 'normal' | 'fast'>('normal');

  const startAnimation = () => setIsAnimating(true);
  const stopAnimation = () => setIsAnimating(false);
  const pauseAnimation = () => setIsAnimating(false);

  const getAnimationDuration = (baseDuration: number) => {
    const multipliers = {
      slow: 1.5,
      normal: 1,
      fast: 0.7
    };
    return baseDuration * multipliers[animationSpeed];
  };

  return {
    isAnimating,
    animationSpeed,
    startAnimation,
    stopAnimation,
    pauseAnimation,
    setAnimationSpeed,
    getAnimationDuration
  };
}

export function useElementSize() {
  const ref = useRef<HTMLElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const updateSize = () => {
      setSize({
        width: element.offsetWidth,
        height: element.offsetHeight
      });
    };

    updateSize();
    
    const resizeObserver = new ResizeObserver(updateSize);
    resizeObserver.observe(element);

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  return { ref, size };
}

export function useAnimationPreset(preset: 'mobile' | 'desktop' | 'auto' = 'auto') {
  const prefersReducedMotion = useReducedMotion();
  const isLowPerformance = usePerformanceMode();
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const getPreset = () => {
    if (preset === 'auto') {
      if (prefersReducedMotion || isLowPerformance) return 'reduced';
      if (isMobile) return 'mobile';
      return 'desktop';
    }
    return preset;
  };

  const getAnimationConfig = () => {
    const currentPreset = getPreset();
    
    switch (currentPreset) {
      case 'reduced':
        return {
          duration: 0.1,
          ease: 'linear',
          staggerDelay: 0,
          particleCount: 0,
          enableGlow: false,
          enableFloat: false
        };
      case 'mobile':
        return {
          duration: 0.2,
          ease: 'easeOut',
          staggerDelay: 0.05,
          particleCount: 5,
          enableGlow: true,
          enableFloat: false
        };
      case 'desktop':
        return {
          duration: 0.3,
          ease: 'easeInOut',
          staggerDelay: 0.1,
          particleCount: 20,
          enableGlow: true,
          enableFloat: true
        };
      default:
        return {
          duration: 0.3,
          ease: 'easeInOut',
          staggerDelay: 0.1,
          particleCount: 10,
          enableGlow: true,
          enableFloat: true
        };
    }
  };

  return {
    preset: getPreset(),
    config: getAnimationConfig(),
    prefersReducedMotion,
    isLowPerformance,
    isMobile
  };
}

const ScrollAnimationHooks = {
  useScrollAnimation,
  useStaggeredScrollAnimation,
  useIntersectionObserver,
  useAnimationSequence,
  useReducedMotion,
  usePerformanceMode,
  useAnimationControls,
  useElementSize,
  useAnimationPreset
};

export default ScrollAnimationHooks;