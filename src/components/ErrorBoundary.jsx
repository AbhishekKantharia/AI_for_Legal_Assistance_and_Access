import React from 'react';
import { AlertOctagon, RotateCcw } from 'lucide-react';

/**
 * Enterprise React Error Boundary
 * Catches runtime errors in the component tree and renders an accessible fallback UI.
 */
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('JurisEase Caught Unhandled UI Exception:', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          role="alert"
          aria-live="assertive"
          style={{
            minHeight: '60vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
          }}
        >
          <div
            className="card"
            style={{
              maxWidth: '560px',
              width: '100%',
              textAlign: 'center',
              borderLeft: '4px solid var(--status-critical)',
              padding: '32px 24px',
            }}
          >
            <div
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                background: 'var(--status-critical-bg)',
                color: 'var(--status-critical)',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '16px',
              }}
            >
              <AlertOctagon size={32} />
            </div>

            <h2 style={{ fontSize: '1.25rem', marginBottom: '8px' }}>
              Something went wrong in the interface
            </h2>

            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', lineHeight: 1.5, marginBottom: '20px' }}>
              JurisEase encountered an unexpected UI exception. Your confidential text has not been lost.
            </p>

            {this.state.error?.message && (
              <pre
                style={{
                  background: 'var(--bg-secondary)',
                  padding: '12px',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '0.75rem',
                  fontFamily: 'var(--font-mono)',
                  textAlign: 'left',
                  overflowX: 'auto',
                  marginBottom: '20px',
                  color: 'var(--text-muted)',
                }}
              >
                {this.state.error.message}
              </pre>
            )}

            <button onClick={this.handleReset} className="btn btn-primary" style={{ margin: '0 auto' }}>
              <RotateCcw size={16} />
              <span>Reload Application</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
