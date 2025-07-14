'use client';

import React, { ReactNode } from 'react';
import { ErrorBoundary } from './ErrorBoundary';
import { Button } from '@/components/ui/button';
import { Alert } from '@/components/ui/alert';
import { Home, RefreshCw, AlertTriangle } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface RouteErrorBoundaryProps {
  children: ReactNode;
  routeName?: string;
}

/**
 * Specialized Error Boundary for route/page-level errors
 * Provides navigation options and route-specific error handling
 */
export function RouteErrorBoundary({
  children,
  routeName,
}: RouteErrorBoundaryProps) {
  const router = useRouter();

  const handleError = (error: Error) => {
    // Log route-specific error details
    console.error(`[RouteErrorBoundary${routeName ? ` - ${routeName}` : ''}]`, {
      message: error.message,
      stack: error.stack,
      route: typeof window !== 'undefined' ? window.location.pathname : 'SSR',
      timestamp: new Date().toISOString(),
    });
  };

  const RouteErrorFallback = () => {
    const handleGoHome = () => {
      router.push('/');
    };

    const handleRefresh = () => {
      window.location.reload();
    };

    const handleGoBack = () => {
      if (window.history.length > 1) {
        router.back();
      } else {
        router.push('/');
      }
    };

    return (
      <div className="min-h-[400px] flex items-center justify-center p-4">
        <div className="max-w-lg w-full space-y-6 text-center">
          <div className="space-y-3">
            <AlertTriangle className="h-16 w-16 text-destructive mx-auto" />
            <h1 className="text-2xl font-bold">Page Error</h1>
            <p className="text-muted-foreground">
              {routeName
                ? `There was a problem loading the ${routeName} page.`
                : 'There was a problem loading this page.'}
            </p>
          </div>

          <Alert variant="destructive" className="text-left">
            <AlertTriangle className="h-4 w-4" />
            <div>
              <h3 className="font-semibold">What happened?</h3>
              <p className="text-sm mt-1">
                A JavaScript error occurred while rendering this page. This
                could be due to:
              </p>
              <ul className="text-sm mt-2 ml-4 list-disc space-y-1">
                <li>Invalid data being passed to components</li>
                <li>Missing required properties</li>
                <li>Third-party library conflicts</li>
                <li>Network issues during page load</li>
              </ul>
            </div>
          </Alert>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              onClick={handleRefresh}
              variant="default"
              size="default"
              className="flex items-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh Page
            </Button>

            <Button onClick={handleGoBack} variant="outline" size="default" className="">
              Go Back
            </Button>

            <Button
              onClick={handleGoHome}
              variant="secondary"
              size="default"
              className="flex items-center gap-2"
            >
              <Home className="h-4 w-4" />
              Go Home
            </Button>
          </div>

          {process.env.NODE_ENV === 'development' && (
            <details className="text-left">
              <summary className="cursor-pointer text-sm font-medium mb-2">
                Development Information
              </summary>
              <div className="text-xs text-muted-foreground space-y-1">
                <div>
                  Route:{' '}
                  {typeof window !== 'undefined'
                    ? window.location.pathname
                    : 'SSR'}
                </div>
                <div>Time: {new Date().toLocaleString()}</div>
                <div>
                  User Agent:{' '}
                  {typeof window !== 'undefined'
                    ? window.navigator.userAgent
                    : 'SSR'}
                </div>
              </div>
            </details>
          )}
        </div>
      </div>
    );
  };

  return (
    <ErrorBoundary
      context={`Route${routeName ? ` (${routeName})` : ''}`}
      onError={handleError}
      fallback={<RouteErrorFallback />}
      showDetails={process.env.NODE_ENV === 'development'}
    >
      {children}
    </ErrorBoundary>
  );
}
