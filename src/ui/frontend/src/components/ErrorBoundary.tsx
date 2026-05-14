import React, { type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Card } from './UIAtoms';
import { COLORS } from '../theme';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary] Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-[#080c14] p-6 text-slate-200">
          <Card className="max-w-xl text-center" style={{ border: `1px solid ${COLORS.red}44` }}>
            <AlertTriangle className="mx-auto mb-4 text-red-500" size={48} />
            <h2 className="font-['Bebas_Neue'] text-3xl text-red-500 uppercase tracking-wider">UI Render Crash</h2>
            <p className="mb-4 text-sm text-slate-400">
              A critical error occurred while rendering the dashboard. This is usually due to unexpected data format from the AI model.
            </p>
            <div className="mb-6 rounded-lg bg-black/40 p-4 text-left font-mono text-[10px] text-red-400/80">
              {this.state.error?.toString()}
            </div>
            <button
              onClick={() => window.location.reload()}
              className="flex items-center gap-2 mx-auto rounded-full bg-red-500 px-6 py-2 text-sm font-bold text-white transition-transform hover:scale-105"
            >
              <RefreshCw size={16} />
              RELOAD APPLICATION
            </button>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}
