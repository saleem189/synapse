// ================================
// Error Boundary Component (Consolidated)
// ================================
// Unified error boundary for the entire application
// Supports different levels (page, component, inline) and custom fallbacks

"use client";

import React, { Component, ReactNode, ErrorInfo } from "react";
import { AlertCircle, RefreshCw, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { logger } from "@/lib/logger";

export type ErrorBoundaryLevel = 'page' | 'component' | 'inline';

export interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode; // Custom fallback UI
  onError?: (error: Error, errorInfo: ErrorInfo) => void; // Error callback
  onReset?: () => void; // Reset callback
  resetKeys?: Array<string | number>; // Keys that trigger reset when changed
  resetOnPropsChange?: boolean; // Auto-reset when resetKeys change
  showDetails?: boolean; // Show error details (default: dev mode only)
  title?: string; // Custom error title
  description?: string; // Custom error description
  level?: ErrorBoundaryLevel; // Error boundary level (affects UI size)
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * Unified Error Boundary Component
 * 
 * Supports multiple levels and use cases:
 * - Page level: Full-page error UI
 * - Component level: Card-based error UI
 * - Inline level: Compact error UI
 * 
 * @example
 * ```tsx
 * // Page level
 * <ErrorBoundary level="page">
 *   <YourPage />
 * </ErrorBoundary>
 * 
 * // Component level with custom fallback
 * <ErrorBoundary 
 *   level="component" 
 *   fallback={<CustomErrorUI />}
 *   onError={(error) => logger.error(error)}
 * >
 *   <YourComponent />
 * </ErrorBoundary>
 * 
 * // Inline with reset keys
 * <ErrorBoundary 
 *   level="inline"
 *   resetKeys={[roomId]}
 *   resetOnPropsChange={true}
 * >
 *   <MessageList />
 * </ErrorBoundary>
 * ```
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error using centralized logger
    const errorMessage = error?.message || "Unknown error";
    const errorStack = error?.stack || "No stack trace available";
    
    logger.error("Error caught by boundary", error instanceof Error ? error : new Error(errorMessage), {
      error: errorMessage,
      stack: errorStack,
      componentStack: errorInfo?.componentStack || "No component stack",
    });

    // Update state with error info
    this.setState({
      error: error || new Error(errorMessage),
      errorInfo,
    });

    // Call custom error handler if provided
    this.props.onError?.(error || new Error(errorMessage), errorInfo);
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

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = "/";
  };

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const level = this.props.level || 'component';
      const showDetails = this.props.showDetails ?? (process.env.NODE_ENV === "development");

      // Page level - full page error UI
      if (level === 'page') {
        return (
          <div className="min-h-screen flex items-center justify-center bg-surface-50 dark:bg-surface-950 p-4">
            <Card className="w-full max-w-2xl">
              <CardHeader>
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
                    <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
                  </div>
                  <div>
                    <CardTitle className="text-xl">
                      {this.props.title || "Something went wrong"}
                    </CardTitle>
                    <CardDescription className="mt-1">
                      {this.props.description || "An unexpected error occurred. Please try again."}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {showDetails && this.state.error && (
                  <div className="p-4 bg-surface-100 dark:bg-surface-800 rounded-lg">
                    <p className="text-sm font-semibold text-surface-900 dark:text-surface-100 mb-2">
                      Error Details (Development Only):
                    </p>
                    <p className="text-sm text-red-600 dark:text-red-400 font-mono mb-2">
                      {this.state.error.toString()}
                    </p>
                    {this.state.errorInfo && (
                      <details className="mt-2">
                        <summary className="text-xs text-surface-600 dark:text-surface-400 cursor-pointer hover:text-surface-900 dark:hover:text-surface-100">
                          Component Stack
                        </summary>
                        <pre className="mt-2 text-xs text-surface-600 dark:text-surface-400 overflow-auto max-h-40 font-mono">
                          {this.state.errorInfo.componentStack}
                        </pre>
                      </details>
                    )}
                  </div>
                )}

                <div className="flex flex-col sm:flex-row gap-2">
                  <Button onClick={this.resetErrorBoundary} variant="default" className="flex-1">
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Try Again
                  </Button>
                  <Button onClick={this.handleReload} variant="outline" className="flex-1">
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Reload Page
                  </Button>
                  <Button onClick={this.handleGoHome} variant="outline" className="flex-1">
                    <Home className="w-4 h-4 mr-2" />
                    Go Home
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        );
      }

      // Inline level - compact error UI
      if (level === 'inline') {
        return (
          <div className="p-2 border border-red-200 dark:border-red-800 rounded-lg bg-red-50 dark:bg-red-900/20">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-red-800 dark:text-red-200">
                  {this.props.title || "Error"}
                </p>
                <p className="text-xs text-red-600 dark:text-red-400">
                  {this.props.description || "Something went wrong"}
                </p>
              </div>
              <Button onClick={this.resetErrorBoundary} size="sm" variant="outline">
                <RefreshCw className="w-3 h-3 mr-1" />
                Retry
              </Button>
            </div>
          </div>
        );
      }

      // Component level - card-based error UI (default)
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
            {showDetails && this.state.error && (
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
                onClick={this.handleGoHome}
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
 * Higher-order component to wrap components with Error Boundary
 */
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  fallback?: ReactNode,
  level?: ErrorBoundaryLevel
) {
  return function WithErrorBoundaryComponent(props: P) {
    return (
      <ErrorBoundary fallback={fallback} level={level}>
        <Component {...props} />
      </ErrorBoundary>
    );
  };
}

/**
 * Convenience components for common use cases
 */
export function ChatErrorBoundary({
  children,
  onReset,
}: {
  children: ReactNode;
  onReset?: () => void;
}) {
  return (
    <ErrorBoundary
      level="component"
      title="Chat Error"
      description="An error occurred while loading the chat. Please try refreshing."
      onReset={onReset}
    >
      {children}
    </ErrorBoundary>
  );
}

export function MessageInputErrorBoundary({
  children,
  onReset,
}: {
  children: ReactNode;
  onReset?: () => void;
}) {
  return (
    <ErrorBoundary
      level="inline"
      title="Message input error"
      description="Unable to load message input"
      onReset={onReset}
    >
      {children}
    </ErrorBoundary>
  );
}

export function MessageListErrorBoundary({
  children,
  onReset,
}: {
  children: ReactNode;
  onReset?: () => void;
}) {
  return (
    <ErrorBoundary
      level="component"
      title="Failed to load messages"
      description="There was an error displaying messages"
      onReset={onReset}
    >
      {children}
    </ErrorBoundary>
  );
}

/**
 * Error Boundary Wrapper for server components
 */
export function ErrorBoundaryWrapper({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary
      level="page"
      onError={(error, errorInfo) => {
        logger.error("Application error", {
          error: error.message,
          stack: error.stack,
          componentStack: errorInfo.componentStack,
        });
      }}
    >
      {children}
    </ErrorBoundary>
  );
}
