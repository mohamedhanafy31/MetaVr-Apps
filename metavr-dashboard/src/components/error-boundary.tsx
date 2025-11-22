'use client';

import React from 'react';
import { clientLogger } from '@/lib/logger/client-logger';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<{ error: Error; resetError: () => void }>;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error to server
    clientLogger.error(
      'React Error Boundary caught an error',
      'ErrorBoundary',
      {
        componentStack: errorInfo.componentStack,
        errorName: error.name,
        errorMessage: error.message,
      },
      error,
      {
        url: typeof window !== 'undefined' ? window.location.href : undefined,
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
      },
    );
  }

  resetError = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError && this.state.error) {
      if (this.props.fallback) {
        const Fallback = this.props.fallback;
        return <Fallback error={this.state.error} resetError={this.resetError} />;
      }

      // Default fallback UI
      return (
        <div className="flex min-h-screen items-center justify-center p-4">
          <div className="max-w-md w-full space-y-4 text-center">
            <h1 className="text-2xl font-bold text-red-600">Something went wrong</h1>
            <p className="text-gray-600">
              {process.env.NODE_ENV === 'development' 
                ? this.state.error.message 
                : 'An unexpected error occurred. Please try refreshing the page.'}
            </p>
            {process.env.NODE_ENV === 'development' && (
              <pre className="text-left text-sm bg-gray-100 p-4 rounded overflow-auto">
                {this.state.error.stack}
              </pre>
            )}
            <button
              onClick={this.resetError}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Try again
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

