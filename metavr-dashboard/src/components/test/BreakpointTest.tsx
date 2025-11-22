'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface BreakpointTestProps {
  className?: string;
}

export function BreakpointTest({ className }: BreakpointTestProps) {
  const [currentBreakpoint, setCurrentBreakpoint] = useState<string>('');
  const [windowSize, setWindowSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const updateBreakpoint = () => {
      const width = window.innerWidth;
      setWindowSize({ width, height: window.innerHeight });
      
      if (width >= 1920) setCurrentBreakpoint('3xl (1920px+)');
      else if (width >= 1536) setCurrentBreakpoint('2xl (1536px+)');
      else if (width >= 1280) setCurrentBreakpoint('xl (1280px+)');
      else if (width >= 1024) setCurrentBreakpoint('lg (1024px+)');
      else if (width >= 768) setCurrentBreakpoint('md (768px+)');
      else if (width >= 640) setCurrentBreakpoint('sm (640px+)');
      else if (width >= 375) setCurrentBreakpoint('xs (375px+)');
      else setCurrentBreakpoint('below xs (<375px)');
    };

    updateBreakpoint();
    window.addEventListener('resize', updateBreakpoint);
    return () => window.removeEventListener('resize', updateBreakpoint);
  }, []);

  const breakpoints = [
    { name: 'xs', size: '375px', description: 'Small phones' },
    { name: 'sm', size: '640px', description: 'Large phones' },
    { name: 'md', size: '768px', description: 'Tablets' },
    { name: 'lg', size: '1024px', description: 'Small laptops' },
    { name: 'xl', size: '1280px', description: 'Large laptops' },
    { name: '2xl', size: '1536px', description: 'Desktops' },
    { name: '3xl', size: '1920px', description: 'Large screens' },
  ];

  return (
    <div className={`space-y-4 ${className}`}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Responsive Breakpoint Test
            <Badge variant="outline" className="text-xs">
              {currentBreakpoint}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="text-sm text-muted-foreground">
              Current window size: {windowSize.width} × {windowSize.height}
            </div>
            
            <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-2">
              {breakpoints.map((bp) => (
                <div
                  key={bp.name}
                  className={`p-2 rounded border text-xs ${
                    currentBreakpoint.includes(bp.name)
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted'
                  }`}
                >
                  <div className="font-medium">{bp.name}</div>
                  <div className="text-xs opacity-75">{bp.size}</div>
                  <div className="text-xs opacity-75">{bp.description}</div>
                </div>
              ))}
            </div>

            {/* Responsive text sizes */}
            <div className="space-y-2">
              <h3 className="text-sm font-medium">Responsive Text Sizes:</h3>
              <div className="text-xs xs:text-sm sm:text-base md:text-lg lg:text-xl xl:text-2xl">
                This text scales with screen size
              </div>
            </div>

            {/* Responsive spacing */}
            <div className="space-y-2">
              <h3 className="text-sm font-medium">Responsive Spacing:</h3>
              <div className="bg-muted p-2 xs:p-4 sm:p-6 md:p-8 lg:p-10 xl:p-12 rounded">
                <div className="bg-primary/20 p-2 rounded text-xs">
                  Padding increases with screen size
                </div>
              </div>
            </div>

            {/* Responsive grid */}
            <div className="space-y-2">
              <h3 className="text-sm font-medium">Responsive Grid:</h3>
              <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
                {Array.from({ length: 12 }).map((_, i) => (
                  <div
                    key={i}
                    className="bg-primary/20 h-8 rounded flex items-center justify-center text-xs"
                  >
                    {i + 1}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default BreakpointTest;
