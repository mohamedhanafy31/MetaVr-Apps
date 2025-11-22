'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';

// Check if we're in production
function isProduction(): boolean {
  if (typeof window === 'undefined') return false;
  const hostname = window.location.hostname;
  return hostname !== 'localhost' && !hostname.startsWith('127.0.0.1');
}

// Get localhost base URL for development
function getLocalhostBaseUrl(): string {
  if (typeof window === 'undefined') return 'http://localhost';
  const protocol = window.location.protocol;
  const hostname = window.location.hostname;
  // In production, use current origin; in dev, use localhost
  const prod = isProduction();
  return prod ? `${protocol}//${hostname}` : 'http://localhost';
}

// Convert app directory name to URL path (e.g., "card_matching" -> "card-matching")
function getAppUrlPath(appPath: string): string {
  const slug = appPath.split('/').pop() || '';
  // Convert underscores to hyphens for URL-friendly paths
  return slug.replace(/_/g, '-');
}

export default function AppProxyPage() {
  const params = useParams();
  const slug = Array.isArray(params.slug) ? params.slug.join('/') : params.slug;
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch app info to get port or URL
    const fetchAppInfo = async () => {
      try {
        const response = await fetch('/api/applications/public');
        const result = await response.json();
        
        if (result.success && result.data) {
          const app = result.data.find((a: any) => {
            const appSlug = a.path?.split('/').pop();
            return appSlug === slug || a.path === `apps/${slug}`;
          });

          if (app) {
            const prod = isProduction();
            
            // Prefer app.url if explicitly set
            if (app.url) {
              window.location.href = app.url;
              return;
            }
            
            if (app.path) {
              if (prod) {
                // In production: use path-based URL (e.g., /iq-questions/ or /card-matching/)
                const urlPath = getAppUrlPath(app.path);
                window.location.href = `/${urlPath}/`;
                return;
              } else {
                // In development: use port-based URL if port is specified
                if (app.port) {
                  const baseUrl = getLocalhostBaseUrl();
                  window.location.href = `${baseUrl}:${app.port}`;
                  return;
                }
              }
            }
          }
        }

        // If no app found or no port/URL configured, show error
        setError(
          `Application "${slug}" is not configured with a port or URL. ` +
          `Please start the app on a separate port and configure it in the admin panel.`
        );
        setLoading(false);
      } catch (err) {
        setError('Failed to load application information.');
        setLoading(false);
      }
    };

    fetchAppInfo();
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground">Loading application...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-accent/5 to-secondary/5 dark:from-primary/10 dark:via-accent/10 dark:to-secondary/10">
        <div className="text-center space-y-6 max-w-lg mx-auto p-8">
          <div className="space-y-3">
            <div className="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center">
              <svg
                className="w-8 h-8 text-muted-foreground"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-foreground">Application Temporarily Unavailable</h1>
            <p className="text-lg text-muted-foreground">
              This application is currently being set up or is temporarily offline.
            </p>
          </div>

          <div className="bg-card border border-border rounded-lg p-6 space-y-4 text-left">
            <div className="space-y-2">
              <h2 className="font-semibold text-foreground">What you can do:</h2>
              <ul className="space-y-2 text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>Try again in a few moments - the application may be starting up</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>Check back later if the application is under maintenance</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>Contact support if this issue persists</span>
                </li>
              </ul>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <a
              href="/"
              className="inline-flex items-center justify-center px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium"
            >
              ← Back to Home
            </a>
            <button
              onClick={() => window.location.reload()}
              className="inline-flex items-center justify-center px-6 py-3 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 transition-colors font-medium"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}

