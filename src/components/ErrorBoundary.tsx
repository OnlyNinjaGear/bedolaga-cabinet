import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';

interface ErrorBoundaryProps {
  children: ReactNode;
  level?: 'app' | 'page' | 'widget';
  onReset?: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

function isChunkLoadError(error: Error): boolean {
  const msg = error.message || '';
  return (
    msg.includes('dynamically imported module') ||
    msg.includes('Importing a module script failed') ||
    msg.includes('Failed to fetch dynamically imported module') ||
    msg.includes('Loading chunk') ||
    msg.includes('ChunkLoadError') ||
    error.name === 'ChunkLoadError'
  );
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary]', error, errorInfo);

    // Auto-reload on chunk load failures (stale deploy)
    if (isChunkLoadError(error)) {
      const reloadKey = 'chunk_reload_ts';
      const lastReload = Number(sessionStorage.getItem(reloadKey) || '0');
      const now = Date.now();
      // Prevent reload loop — only auto-reload once per 30 seconds
      if (now - lastReload > 30_000) {
        sessionStorage.setItem(reloadKey, String(now));
        window.location.reload();
        return;
      }
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    this.props.onReset?.();
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    const { level = 'page' } = this.props;
    const isChunk = this.state.error ? isChunkLoadError(this.state.error) : false;

    if (level === 'app') {
      return (
        <div className="bg-background flex min-h-screen items-center justify-center p-4">
          <div className="max-w-md text-center">
            <div className="mb-4 text-4xl">⚠️</div>
            <h1 className="text-foreground mb-2 text-xl font-bold">Something went wrong</h1>
            <p className="text-muted-foreground mb-6">
              An unexpected error occurred. Please try reloading the page.
            </p>
            <Button onClick={() => window.location.reload()} className="px-6 py-3">
              Reload page
            </Button>
          </div>
        </div>
      );
    }

    if (level === 'widget') {
      return (
        <div className="border-error-500/30 bg-error-500/10 rounded-xl border p-4 text-center">
          <p className="text-error-400 text-sm">Failed to load this section</p>
          <Button
            variant="ghost"
            size="sm"
            onClick={this.handleReset}
            className="text-primary hover:text-primary/70 mt-2 text-sm"
          >
            Try again
          </Button>
        </div>
      );
    }

    // level === 'page' (default)
    return (
      <div className="flex min-h-[50vh] items-center justify-center p-4">
        <div className="max-w-md text-center">
          <div className="mb-4 text-4xl">⚠️</div>
          <h1 className="text-foreground mb-2 text-xl font-bold">Something went wrong</h1>
          <p className="text-muted-foreground mb-6 text-sm">
            {isChunk
              ? 'App was updated. Reloading...'
              : this.state.error?.message || 'An unexpected error occurred'}
          </p>
          <Button onClick={() => window.location.reload()} className="px-6 py-3">
            {isChunk ? 'Reload' : 'Try again'}
          </Button>
        </div>
      </div>
    );
  }
}
