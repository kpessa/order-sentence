'use client';

import React, { ReactNode } from 'react';
import { ErrorBoundary } from './ErrorBoundary';
import { Button } from '@/components/ui/button';
import { Alert } from '@/components/ui/alert';
import { Download, RefreshCw, AlertCircle } from 'lucide-react';

interface ChunkErrorBoundaryProps {
  children: ReactNode;
}

/**
 * Specialized Error Boundary for chunk loading errors
 * Handles errors related to dynamic imports and code splitting
 */
export function ChunkErrorBoundary({ children }: ChunkErrorBoundaryProps) {
  const handleError = (error: Error) => {
    // Check if this is a chunk loading error
    const isChunkError =
      error.message.includes('Loading chunk') ||
      error.message.includes('ChunkLoadError') ||
      error.name === 'ChunkLoadError';

    console.error('[ChunkErrorBoundary]', {
      message: error.message,
      isChunkError,
      stack: error.stack,
      timestamp: new Date().toISOString(),
    });

    // If it's a chunk error, we might want to handle it differently
    if (isChunkError) {
      console.warn(
        '[ChunkErrorBoundary] Detected chunk loading error - this usually means the app was updated'
      );
    }
  };

  const ChunkErrorFallback = () => {
    const handleRefresh = () => {
      // For chunk errors, we want to force a full page reload to get the latest code
      window.location.reload();
    };

    const handleClearCache = () => {
      // Clear service worker cache and reload
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistrations().then((registrations) => {
          registrations.forEach((registration) => {
            registration.unregister();
          });
        });
      }

      // Clear browser caches
      if ('caches' in window) {
        caches.keys().then((names) => {
          names.forEach((name) => {
            caches.delete(name);
          });
        });
      }

      // Force reload
      window.location.reload();
    };

    return (
      <div className="min-h-[300px] flex items-center justify-center p-4">
        <div className="max-w-md w-full space-y-4">
          <Alert variant="default" className="">
            <Download className="h-4 w-4" />
            <div className="space-y-3">
              <div>
                <h3 className="font-semibold">Update Required</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  The application has been updated. Please refresh the page to
                  get the latest version.
                </p>
              </div>

              <div className="bg-muted p-3 rounded-md text-sm">
                <p className="font-medium mb-2">What happened?</p>
                <ul className="space-y-1 text-muted-foreground">
                  <li>• The app code was updated while you were using it</li>
                  <li>• Some JavaScript files are no longer available</li>
                  <li>• A refresh will load the latest version</li>
                </ul>
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  onClick={handleRefresh}
                  variant="default"
                  size="sm"
                  className="flex items-center gap-2"
                >
                  <RefreshCw className="h-3 w-3" />
                  Refresh Page
                </Button>
                <Button
                  onClick={handleClearCache}
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2"
                >
                  <AlertCircle className="h-3 w-3" />
                  Clear Cache & Refresh
                </Button>
              </div>
            </div>
          </Alert>
        </div>
      </div>
    );
  };

  return (
    <ErrorBoundary
      context="Chunk Loading"
      onError={handleError}
      fallback={<ChunkErrorFallback />}
      showDetails={false} // Chunk errors are usually not useful to show details for
    >
      {children}
    </ErrorBoundary>
  );
}
