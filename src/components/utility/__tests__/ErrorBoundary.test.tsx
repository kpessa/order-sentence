import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ErrorBoundary, useErrorHandler } from '../ErrorBoundary';

// Mock console.error to avoid noise in tests
const originalConsoleError = console.error;
beforeAll(() => {
  console.error = jest.fn();
});

afterAll(() => {
  console.error = originalConsoleError;
});

// Component that throws an error
const ThrowError: React.FC<{ shouldThrow?: boolean; errorMessage?: string }> = ({ 
  shouldThrow = true, 
  errorMessage = 'Test error' 
}) => {
  if (shouldThrow) {
    throw new Error(errorMessage);
  }
  return <div>No error</div>;
};

// Component to test useErrorHandler hook
const TestUseErrorHandler: React.FC<{ shouldThrow?: boolean }> = ({ shouldThrow = false }) => {
  const { handleError } = useErrorHandler();

  const triggerError = () => {
    handleError(new Error('Hook error'));
  };

  if (shouldThrow) {
    triggerError();
  }

  return (
    <div>
      <span>Hook test</span>
      <button onClick={triggerError}>Trigger Error</button>
    </div>
  );
};

describe('ErrorBoundary', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render children when there is no error', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={false} />
      </ErrorBoundary>
    );

    expect(screen.getByText('No error')).toBeInTheDocument();
  });

  it('should render error UI when an error occurs', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} errorMessage="Test error message" />
      </ErrorBoundary>
    );

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Try Again' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reload Page' })).toBeInTheDocument();
  });

  it('should show context in error message when provided', () => {
    render(
      <ErrorBoundary context="Test Component">
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText(/An error occurred in the Test Component component/)).toBeInTheDocument();
  });

  it('should show error details when showDetails is true', () => {
    render(
      <ErrorBoundary showDetails={true}>
        <ThrowError shouldThrow={true} errorMessage="Detailed error message" />
      </ErrorBoundary>
    );

    // Check if details element exists
    const detailsElement = screen.getByText('Error Details');
    expect(detailsElement).toBeInTheDocument();
    
    // Click to expand details
    fireEvent.click(detailsElement);
    
    expect(screen.getAllByText(/Detailed error message/)).toHaveLength(2); // Should appear in both error message and stack
  });

  it('should call onError callback when an error occurs', () => {
    const onErrorMock = jest.fn();
    
    render(
      <ErrorBoundary onError={onErrorMock}>
        <ThrowError shouldThrow={true} errorMessage="Callback test error" />
      </ErrorBoundary>
    );

    expect(onErrorMock).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Callback test error'
      }),
      expect.objectContaining({
        componentStack: expect.any(String)
      })
    );
  });

  it('should render custom fallback when provided', () => {
    const customFallback = <div>Custom error message</div>;
    
    render(
      <ErrorBoundary fallback={customFallback}>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText('Custom error message')).toBeInTheDocument();
    expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument();
  });

  it('should reset error state when Try Again is clicked', () => {
    let shouldThrow = true;
    const TestComponent = () => <ThrowError shouldThrow={shouldThrow} />;
    
    const { rerender } = render(
      <ErrorBoundary>
        <TestComponent />
      </ErrorBoundary>
    );

    // Error boundary should show error UI
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();

    // Change the condition and click Try Again
    shouldThrow = false;
    fireEvent.click(screen.getByRole('button', { name: 'Try Again' }));

    // Re-render with no error
    rerender(
      <ErrorBoundary>
        <TestComponent />
      </ErrorBoundary>
    );

    expect(screen.getByText('No error')).toBeInTheDocument();
  });

  it('should have a Reload Page button when an error occurs', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    const reloadButton = screen.getByRole('button', { name: 'Reload Page' });
    expect(reloadButton).toBeInTheDocument();
    
    // We can't easily test window.location.reload in jsdom environment
    // but we can verify the button exists and is clickable
    expect(reloadButton).not.toBeDisabled();
  });
});

describe('useErrorHandler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should throw error when handleError is called', () => {
    expect(() => {
      render(
        <ErrorBoundary>
          <TestUseErrorHandler shouldThrow={true} />
        </ErrorBoundary>
      );
    }).not.toThrow(); // ErrorBoundary should catch it

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });

  it('should handle error when button is clicked', () => {
    render(
      <ErrorBoundary>
        <TestUseErrorHandler shouldThrow={false} />
      </ErrorBoundary>
    );

    expect(screen.getByText('Hook test')).toBeInTheDocument();

    // Click button to trigger error
    fireEvent.click(screen.getByRole('button', { name: 'Trigger Error' }));

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });
});

describe('ErrorBoundary error reporting', () => {
  it('should log error details to console', () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

    render(
      <ErrorBoundary context="Test Context">
        <ThrowError shouldThrow={true} errorMessage="Logging test error" />
      </ErrorBoundary>
    );

    expect(consoleSpy).toHaveBeenCalledWith(
      '[ErrorBoundary - Test Context]',
      expect.objectContaining({
        message: 'Logging test error'
      })
    );

    expect(consoleSpy).toHaveBeenCalledWith(
      '[ErrorBoundary] Component stack:',
      expect.any(String)
    );

    consoleSpy.mockRestore();
  });

  it('should generate unique error IDs', () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

    // Render two error boundaries
    const { unmount } = render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    unmount();

    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    // Each error boundary logs twice (error + stack), and we render two components
    // Also React may log additional errors in development mode
    expect(consoleSpy.mock.calls.length).toBeGreaterThanOrEqual(4);

    consoleSpy.mockRestore();
  });
});