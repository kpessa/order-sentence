'use client';

import React, { ReactNode } from 'react';
import { ErrorBoundary } from './ErrorBoundary';
import { ChunkErrorBoundary } from './ChunkErrorBoundary';
import { Button } from '@/components/ui/button';
import { Alert } from '@/components/ui/alert';
import { AlertTriangle, RefreshCw, Home, Bug } from 'lucide-react';

interface RootErrorBoundaryProps {
  children: ReactNode;
}

/**
 * Root-level Error Boundary that wraps the entire application
 * Provides the final fallback for any unhandled errors
 */
export function RootErrorBoundary({ children }: RootErrorBoundaryProps) {
  const handleError = (error: Error) => {
    // This is the root level, so we want comprehensive error reporting
    const errorReport = {
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
      url: typeof window !== 'undefined' ? window.location.href : 'SSR',
      userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'SSR',
      viewport: typeof window !== 'undefined' ? {
        width: window.innerWidth,
        height: window.innerHeight
      } : null,
      localStorage: typeof window !== 'undefined' ? {
        hasReduxState: !!localStorage.getItem('persist:root')
      } : null,
    };

    console.error('[RootErrorBoundary] Critical application error:', errorReport);

    // In production, send to error tracking service
    // Example: Sentry, LogRocket, Bugsnag, etc.
    if (process.env.NODE_ENV === 'production') {
      // window.Sentry?.captureException(error, { contexts: { rootError: errorReport } });
    }
  };

  const RootErrorFallback = () => {
    const handleRefresh = () => {
      window.location.reload();
    };

    const handleGoHome = () => {
      window.location.href = '/';
    };

    const handleClearData = () => {
      // Clear all stored data and reload
      if (typeof window !== 'undefined') {
        try {
          localStorage.clear();
          sessionStorage.clear();
          
          // Clear IndexedDB databases
          if ('indexedDB' in window) {
            indexedDB.databases?.().then((databases) => {
              databases.forEach((db) => {
                if (db.name) {
                  indexedDB.deleteDatabase(db.name);
                }
              });
            });
          }
        } catch (e) {
          console.warn('Failed to clear stored data:', e);
        }
        
        window.location.reload();
      }
    };

    const handleReportBug = () => {
      // In a real app, this would open a bug report form or email
      const subject = 'Application Error Report';
      const body = `Please describe what you were doing when this error occurred:

[Your description here]

Technical details:
- Time: ${new Date().toISOString()}
- URL: ${window.location.href}
- User Agent: ${navigator.userAgent}
`;
      
      window.open(`mailto:support@example.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`);
    };

    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-background">
        <div className="max-w-2xl w-full space-y-6">
          <div className="text-center space-y-4">
            <AlertTriangle className="h-20 w-20 text-destructive mx-auto" />
            <div>
              <h1 className="text-3xl font-bold">Application Error</h1>
              <p className="text-xl text-muted-foreground mt-2">
                Something went wrong with the Drug Information Workflow app
              </p>
            </div>
          </div>

          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <div>
              <h3 className="font-semibold">What can you do?</h3>
              <div className="mt-2 space-y-2 text-sm">
                <p>Try these steps to resolve the issue:</p>
                <ol className="list-decimal list-inside space-y-1 ml-2">
                  <li>Refresh the page to reload the application</li>
                  <li>Go back to the home page and try again</li>
                  <li>Clear stored data if the problem persists</li>
                  <li>Report the bug if none of the above work</li>
                </ol>
              </div>
            </div>
          </Alert>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Button 
              onClick={handleRefresh}
              className="flex items-center justify-center gap-2"
              size="lg"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh Page
            </Button>
            
            <Button 
              onClick={handleGoHome}
              variant="outline"
              className="flex items-center justify-center gap-2"
              size="lg"
            >
              <Home className="h-4 w-4" />
              Go to Home
            </Button>
            
            <Button 
              onClick={handleClearData}
              variant="secondary"
              className="flex items-center justify-center gap-2"
              size="lg"
            >
              <AlertTriangle className="h-4 w-4" />
              Clear Data & Reload
            </Button>
            
            <Button 
              onClick={handleReportBug}
              variant="outline"
              className="flex items-center justify-center gap-2"
              size="lg"
            >
              <Bug className="h-4 w-4" />
              Report Bug
            </Button>
          </div>

          <div className="text-center text-sm text-muted-foreground">
            <p>Error ID: {`${Date.now()}-${Math.random().toString(36).substr(2, 9)}`}</p>
            <p>Time: {new Date().toLocaleString()}</p>
          </div>
        </div>
      </div>
    );
  };

  return (
    <ErrorBoundary
      context="Root Application"
      onError={handleError}
      fallback={<RootErrorFallback />}
      showDetails={process.env.NODE_ENV === 'development'}
    >
      <ChunkErrorBoundary>
        {children}
      </ChunkErrorBoundary>
    </ErrorBoundary>
  );
}