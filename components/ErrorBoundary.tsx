import React from 'react';

interface State {
  error: Error | null;
}

export class ErrorBoundary extends React.Component<React.PropsWithChildren, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // eslint-disable-next-line no-console
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen bg-[#020203] text-gray-200 flex items-center justify-center p-8">
          <div className="max-w-xl w-full bg-[#111] border border-red-900/30 rounded-2xl p-8 text-center">
            <div className="text-rose-400 text-xs uppercase tracking-widest font-bold mb-4">
              System error
            </div>
            <h1 className="text-2xl font-black text-white mb-3">Quelque chose s'est mal passé</h1>
            <p className="text-gray-400 text-sm mb-6 font-mono">{this.state.error.message}</p>
            <button
              onClick={() => {
                this.setState({ error: null });
                window.location.reload();
              }}
              className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 rounded-xl font-bold"
            >
              Recharger l'application
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
