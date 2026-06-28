import { Component, type ErrorInfo, type ReactNode } from 'react';
import { GlassPanel, Button } from '@/components/ui';

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('[CareSync] UI error boundary:', error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen bg-command-bg flex items-center justify-center p-6">
          <GlassPanel className="p-6 max-w-md text-center">
            <h1 className="text-lg font-bold text-tier-5 mb-2">System Error</h1>
            <p className="text-sm text-command-muted mb-4">
              The command center encountered an unexpected error. Mock fallback remains available.
            </p>
            <p className="text-xs font-mono text-command-muted mb-4">{this.state.error.message}</p>
            <Button onClick={() => window.location.reload()}>Reload Command Center</Button>
          </GlassPanel>
        </div>
      );
    }
    return this.props.children;
  }
}
