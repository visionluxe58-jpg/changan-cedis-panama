import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertOctagon, RefreshCw, RotateCcw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackMessage?: string;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary capturó una excepción no controlada:', error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleRecuperar = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  private handleReiniciarAlmacen = () => {
    if (typeof window !== 'undefined') {
      try {
        // Limpieza de estado transitorio de UI para recuperar
        window.location.reload();
      } catch (e) {
        console.error(e);
      }
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[400px] flex items-center justify-center p-6 bg-slate-950 text-slate-100 rounded-2xl border border-rose-900/50 my-6 shadow-2xl">
          <div className="max-w-lg w-full bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 text-center">
            <div className="w-14 h-14 bg-rose-950/80 border border-rose-700/60 rounded-2xl mx-auto flex items-center justify-center text-rose-400 shadow-lg shadow-rose-950/50">
              <AlertOctagon className="w-7 h-7" />
            </div>

            <div className="space-y-1">
              <h2 className="text-lg font-black text-white">
                Recuperación de Vista Operativa CEDIS
              </h2>
              <p className="text-xs text-slate-400">
                Se detectó una discrepancia en el renderizado de datos. La aplicación interceptó el error para prevenir la pantalla en blanco.
              </p>
            </div>

            {this.state.error && (
              <div className="bg-slate-950 border border-rose-900/40 rounded-xl p-3 text-left">
                <div className="text-[11px] font-mono text-rose-300 font-bold break-words">
                  {this.state.error.message || 'Error de renderizado'}
                </div>
              </div>
            )}

            <div className="flex flex-col sm:flex-row items-center justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={this.handleRecuperar}
                className="w-full sm:w-auto px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow transition cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Restaurar Vista</span>
              </button>

              <button
                type="button"
                onClick={this.handleReiniciarAlmacen}
                className="w-full sm:w-auto px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 border border-slate-700 transition cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
                <span>Recargar Aplicación</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
