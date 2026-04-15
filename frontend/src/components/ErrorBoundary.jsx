import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('ErrorBoundary caught:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          role="alert"
          aria-live="assertive"
          className="flex flex-col items-center justify-center min-h-[400px] p-8 text-center"
        >
          <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mb-4">
            <AlertTriangle size={32} className="text-red-400" aria-hidden="true" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Something went wrong</h2>
          <p className="text-slate-400 text-sm mb-6 max-w-md">
            An unexpected error occurred. The live data feed is still running.
          </p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="btn-primary flex items-center gap-2"
          >
            <RefreshCw size={16} aria-hidden="true" />
            Try Again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
