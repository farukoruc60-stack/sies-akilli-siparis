import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error caught by ErrorBoundary:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div style={{
          width: '100vw',
          height: '100vh',
          backgroundColor: '#FAFBFD',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2rem',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
        }}>
          <div style={{
            maxWidth: '500px',
            background: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: '16px',
            padding: '2.5rem 2rem',
            textAlign: 'center',
            boxShadow: '0 10px 30px rgba(0, 0, 0, 0.06)'
          }}>
            <div style={{
              width: '50px',
              height: '50px',
              borderRadius: '50%',
              backgroundColor: '#FEF2F2',
              border: '1px solid #FCA5A5',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#EF4444',
              marginBottom: '1rem'
            }}>
              <AlertTriangle size={24} />
            </div>

            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#1A202C', marginBottom: '0.5rem' }}>
              Arayüz Yüklenirken Bir Hata Oluştu
            </h2>

            <p style={{ fontSize: '0.85rem', color: '#718096', marginBottom: '1.5rem', lineHeight: '1.5' }}>
              {this.state.error?.message || 'Beklenmeyen bir istemci hatası nedeniyle sayfa durduruldu.'}
            </p>

            <button
              onClick={this.handleReset}
              style={{
                backgroundColor: '#4361EE',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '10px',
                padding: '0.65rem 1.25rem',
                fontSize: '0.875rem',
                fontWeight: 600,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(67, 97, 238, 0.3)'
              }}
            >
              <RefreshCw size={16} />
              <span>Sayfayı Yenile ve Devam Et</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
