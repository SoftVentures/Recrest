import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  override state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    // Dev-only trace; production builds get hand-off to telemetry later.
    if (import.meta.env.DEV) {
      console.error("[ErrorBoundary]", error, info.componentStack);
    }
  }

  override render(): ReactNode {
    if (this.state.error) {
      return (
        this.props.fallback ?? (
          <div
            className="flex h-full items-center justify-center p-10"
            data-testid="error-boundary-fallback"
          >
            <div className="max-w-md rounded-md border border-destructive bg-destructive/10 p-5 text-sm text-destructive">
              <div className="mb-2 font-semibold">Something went wrong.</div>
              <div className="text-xs opacity-80">{this.state.error.message}</div>
            </div>
          </div>
        )
      );
    }
    return this.props.children;
  }
}
