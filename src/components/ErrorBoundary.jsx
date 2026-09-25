import React from 'react';
import { AlertOctagon, RotateCcw } from 'lucide-react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ClauseGuard caught an unhandled UI exception:', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary" role="alert" aria-live="assertive">
          <div className="card error-boundary-card">
            <div className="error-boundary-icon"><AlertOctagon size={32} /></div>
            <h2>Something went wrong in the interface</h2>
            <p>ClauseGuard encountered an unexpected UI exception. Your document was not sent to a server by this recovery screen.</p>
            {this.state.error?.message && <pre className="error-boundary-message">{this.state.error.message}</pre>}
            <button className="primary-button" onClick={this.handleReset} type="button"><RotateCcw size={16} /> Reload application</button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
