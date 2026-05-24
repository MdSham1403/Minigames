import { Component } from 'react';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('Game crashed:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[300px] gap-4 text-center px-6">
          <p className="text-5xl">💥</p>
          <h2 className="text-xl font-bold text-white">Oops! The game crashed</h2>
          <p className="text-gray-400 text-sm max-w-sm">
            Something went wrong with this game. Don't worry, your other games are fine.
          </p>
          <p className="text-gray-600 text-xs font-mono bg-gray-800 px-4 py-2 rounded-xl max-w-xs truncate">
            {this.state.error?.message || 'Unknown error'}
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => this.setState({ hasError: false, error: null })}
              className="btn-primary px-6 py-2"
            >
              🔄 Retry
            </button>
            {this.props.onBack && (
              <button onClick={this.props.onBack} className="btn-secondary px-6 py-2">
                ← Back to lobby
              </button>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
