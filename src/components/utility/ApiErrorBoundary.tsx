'use client';

import React, { ReactNode } from 'react';
import { ErrorBoundary } from './ErrorBoundary';
import { Button } from '@/components/ui/button';
import { Alert } from '@/components/ui/alert';
import { RefreshCw, AlertCircle } from 'lucide-react';

interface ApiErrorBoundaryProps {
  children: ReactNode;
  apiName?: string;
  onRetry?: () => void;
}

/**
 * Specialized Error Boundary for API-related errors
 * Provides specific messaging and retry functionality for API failures
 */
export function ApiErrorBoundary({ children, apiName = 'API', onRetry }: ApiErrorBoundaryProps) {
  const handleError = (error: Error) => {
    // Log API-specific error details
    console.error(`[ApiErrorBoundary - ${apiName}]`, {
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
    });

    // You could send this to an error tracking service with API-specific context
  };

  const ApiErrorFallback = () => (
    <div className="flex items-center justify-center p-6 min-h-[200px]">
      <div className="max-w-md w-full space-y-4">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <div className="space-y-3">
            <div>
              <h3 className="font-semibold">Unable to load data</h3>
              <p className="text-sm text-muted-foreground mt-1">
                There was a problem connecting to the {apiName} service. This might be due to:
              </p>
              <ul className="text-sm text-muted-foreground mt-2 ml-4 list-disc space-y-1">
                <li>Network connectivity issues</li>
                <li>Temporary service unavailability</li>
                <li>Invalid data format</li>
              </ul>
            </div>

            <div className="flex gap-2 pt-2">
              {onRetry && (
                <Button 
                  onClick={onRetry}
                  variant="outline" 
                  size="sm"
                  className="flex items-center gap-2"
                >
                  <RefreshCw className="h-3 w-3" />
                  Retry
                </Button>
              )}
              <Button 
                onClick={() => window.location.reload()}
                variant="secondary" 
                size="sm"
              >
                Refresh Page
              </Button>
            </div>
          </div>
        </Alert>
      </div>
    </div>
  );

  return (
    <ErrorBoundary
      context={`${apiName} API`}
      onError={handleError}
      fallback={<ApiErrorFallback />}
      showDetails={process.env.NODE_ENV === 'development'}
    >
      {children}
    </ErrorBoundary>
  );
}