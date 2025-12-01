// ================================
// Comprehensive Error Boundaries
// ================================
// Provides error boundaries for different parts of the application
// with better error handling and recovery options

"use client";

import React, { Component, ReactNode, ErrorInfo } from "react";
import { AlertCircle, RefreshCw, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onReset?: () => void;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  resetKeys?: Array<string | number>;
  resetOnPropsChange?: boolean;
  showDetails?: boolean;
  title?: string;
  description?: string;
}

/**
 * Base Error Boundary Component
 * Catches JavaScript errors anywhere in the child component tree
 */
class ErrorBoundaryBase extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error to console in development
    if (process.env.NODE_ENV === "development") {
      console.error("ErrorBoundary caught an error:", error, errorInfo);
    }

    // Call optional error handler
    this.props.onError?.(error, errorInfo);

    // Update state with error info
    this.setState({
      error,
      errorInfo,
    });

    // TODO: Log to error tracking service (e.g., Sentry, LogRocket)
    // logErrorToService(error, errorInfo);
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps) {
    // Reset error boundary when resetKeys change
    if (this.props.resetKeys && this.props.resetOnPropsChange) {
      const hasResetKeyChanged = this.props.resetKeys.some(
        (key, index) => key !== prevProps.resetKeys?.[index]
      );

      if (hasResetKeyChanged && this.state.hasError) {
        this.resetErrorBoundary();
      }
    }
  }

  resetErrorBoundary = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });

    // Call optional reset handler
    this.props.onReset?.();
  };

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <Card className="m-4 border-red-200 dark:border-red-800">
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-500" />
              <CardTitle className="text-red-600 dark:text-red-400">
                {this.props.title || "Something went wrong"}
              </CardTitle>
            </div>
            <CardDescription>
              {this.props.description || "An unexpected error occurred. Please try again."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {this.props.showDetails && this.state.error && (
              <div className="rounded-md bg-red-50 dark:bg-red-900/20 p-3 text-sm">
                <p className="font-mono text-xs text-red-800 dark:text-red-200">
                  {this.state.error.toString()}
                </p>
                {this.state.errorInfo && (
                  <details className="mt-2">
                    <summary className="cursor-pointer text-red-600 dark:text-red-400">
                      Stack trace
                    </summary>
                    <pre className="mt-2 overflow-auto text-xs">
                      {this.state.errorInfo.componentStack}
                    </pre>
                  </details>
                )}
              </div>
            )}

            <div className="flex gap-2">
              <Button
                onClick={this.resetErrorBoundary}
                variant="default"
                className="flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Try Again
              </Button>
              <Button
                onClick={() => {
                  window.location.href = "/";
                }}
                variant="outline"
                className="flex items-center gap-2"
              >
                <Home className="w-4 h-4" />
                Go Home
              </Button>
            </div>
          </CardContent>
        </Card>
      );
    }

    return this.props.children;
  }
}

/**
 * Chat-specific Error Boundary
 * Wraps chat components with chat-specific error handling
 */
export function ChatErrorBoundary({
  children,
  onReset,
}: {
  children: ReactNode;
  onReset?: () => void;
}) {
  return (
    <ErrorBoundaryBase
      title="Chat Error"
      description="An error occurred while loading the chat. Please try refreshing."
      onReset={onReset}
      onError={(error, errorInfo) => {
        console.error("Chat error:", error, errorInfo);
        // TODO: Log to error tracking service
      }}
    >
      {children}
    </ErrorBoundaryBase>
  );
}

/**
 * Socket Error Boundary
 * Catches errors related to Socket.IO connections
 */
export function SocketErrorBoundary({
  children,
  onReset,
}: {
  children: ReactNode;
  onReset?: () => void;
}) {
  return (
    <ErrorBoundaryBase
      title="Connection Error"
      description="There was a problem with the real-time connection. Please try reconnecting."
      onReset={onReset}
      resetOnPropsChange={true}
      onError={(error, errorInfo) => {
        console.error("Socket error:", error, errorInfo);
        // TODO: Log to error tracking service
      }}
    >
      {children}
    </ErrorBoundaryBase>
  );
}

/**
 * API Error Boundary
 * Catches errors from API calls
 */
export function ApiErrorBoundary({
  children,
  onReset,
  resetKeys,
}: {
  children: ReactNode;
  onReset?: () => void;
  resetKeys?: Array<string | number>;
}) {
  return (
    <ErrorBoundaryBase
      title="API Error"
      description="An error occurred while fetching data. Please try again."
      onReset={onReset}
      resetKeys={resetKeys}
      resetOnPropsChange={true}
      onError={(error, errorInfo) => {
        console.error("API error:", error, errorInfo);
        // TODO: Log to error tracking service
      }}
    >
      {children}
    </ErrorBoundaryBase>
  );
}

/**
 * Generic Error Boundary with custom fallback
 */
export function ErrorBoundary(props: ErrorBoundaryProps) {
  return <ErrorBoundaryBase {...props} />;
}

export default ErrorBoundary;

