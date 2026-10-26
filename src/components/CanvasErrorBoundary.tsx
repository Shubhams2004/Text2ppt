import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RotateCcw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackSlideTitle?: string;
  onResetSlide?: () => void;
}

interface State {
  hasError: boolean;
  errorMessage: string;
}

export class CanvasErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    errorMessage: '',
  };

  public static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      errorMessage: error.message || 'An unexpected rendering error occurred.',
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('CanvasErrorBoundary caught an error:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, errorMessage: '' });
    if (this.props.onResetSlide) {
      this.props.onResetSlide();
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="w-full h-full min-h-[300px] flex items-center justify-center p-6 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl select-none">
          <div className="max-w-md w-full text-center space-y-4">
            <div className="w-12 h-12 mx-auto rounded-full bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900 text-rose-600 dark:text-rose-400 flex items-center justify-center">
              <AlertCircle className="w-6 h-6" />
            </div>

            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Slide Rendering Issue Detected
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
                A rendering glitch occurred on this slide
                {this.props.fallbackSlideTitle ? ` ("${this.props.fallbackSlideTitle}")` : ''}.
                The presentation data is safe.
              </p>
              {this.state.errorMessage && (
                <div className="mt-2 p-2 rounded-lg bg-rose-50/70 dark:bg-rose-950/30 border border-rose-200/50 dark:border-rose-900/50 text-[11px] font-mono text-rose-700 dark:text-rose-300 truncate max-w-sm mx-auto">
                  {this.state.errorMessage}
                </div>
              )}
            </div>

            <div className="pt-2 flex justify-center gap-2">
              <button
                type="button"
                onClick={this.handleReset}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-medium flex items-center gap-1.5 shadow-xs cursor-pointer transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Recover Canvas</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
