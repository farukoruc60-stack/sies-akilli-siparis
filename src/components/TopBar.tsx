import React from 'react';
import { Layers, RefreshCw, UserCheck, LogOut, Database, ShieldCheck, Menu } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface TopBarProps {
  title?: string;
  onRefresh?: () => void;
  onNewOrder?: () => void;
  onToggleMobileDrawer?: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({ 
  title = 'SİES ELEKTRİK | Akıllı Sipariş Takip Platformu',
  onRefresh,
  onNewOrder,
  onToggleMobileDrawer
}) => {
  const { user, logout } = useAuth();

  return (
    <header className="app-topbar" style={{
      height: '44px',
      backgroundColor: '#FFFFFF',
      borderBottom: '1px solid #E2E8F0',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 12px',
      fontSize: '12px',
      color: '#4A5568',
      userSelect: 'none',
      zIndex: 50
    }}>
      {/* Left Brand & Title */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
        {onToggleMobileDrawer && (
          <button
            onClick={onToggleMobileDrawer}
            className="mobile-show-inline"
            style={{
              background: '#F1F5F9',
              border: '1px solid #CBD5E1',
              borderRadius: '8px',
              padding: '6px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#334155'
            }}
            title="Menüyü Aç"
          >
            <Menu size={18} />
          </button>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', shrink: 0 }}>
          <img 
            src="/sies-logo.jpg" 
            alt="SİES Logo" 
            style={{ height: '24px', objectFit: 'contain', borderRadius: '4px' }} 
          />
          <span className="desktop-company-title" style={{ fontWeight: 700, color: '#1A202C', fontSize: '12px', whiteSpace: 'nowrap' }}>
            SİES ELEKTRİK MÜMESSİLLİK SAN. VE TİC. LTD. ŞTİ.
          </span>
          <span className="mobile-company-title" style={{ fontWeight: 700, color: '#1A202C', fontSize: '12px', whiteSpace: 'nowrap' }}>
            SİES | Sipariş Takip
          </span>
        </div>

        <span className="mobile-hide" style={{ color: '#CBD5E0' }}>|</span>

        <span className="mobile-hide" style={{ fontWeight: 500, color: '#4A5568', fontSize: '12px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title}</span>
      </div>

      {/* Right User & System Status */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        {/* Postgres Status Indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#059669', background: '#D1FAE5', padding: '2px 8px', borderRadius: '12px', border: '1px solid #A7F3D0', fontWeight: 500 }}>
          <Database size={12} />
          <span>PostgreSQL Canlı Bağlı</span>
        </div>

        {/* User Info Pill */}
        {user && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11.5px', color: '#2D3748', background: '#FFFFFF', padding: '3px 10px', borderRadius: '14px', border: '1px solid #E2E8F0' }}>
            <ShieldCheck size={13} style={{ color: '#4361EE' }} />
            <span style={{ fontWeight: 600 }}>{user.name}</span>
            <span style={{ color: '#A0AEC0', fontSize: '10px' }}>({user.role === 'ADMIN' ? 'Yönetici' : 'Kullanıcı'})</span>
          </div>
        )}

        {/* Refresh & Logout Actions */}
        <button 
          onClick={onRefresh}
          style={{
            background: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: '6px',
            padding: '4px 8px',
            color: '#4A5568',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            fontSize: '11px'
          }}
          title="Verileri Yenile"
        >
          <RefreshCw size={12} />
          <span>Yenile</span>
        </button>

        {user && (
          <button 
            onClick={logout}
            style={{
              background: '#FEE2E2',
              border: '1px solid #FCA5A5',
              borderRadius: '6px',
              padding: '4px 8px',
              color: '#DC2626',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '11px',
              fontWeight: 500
            }}
            title="Oturumu Kapat"
          >
            <LogOut size={12} />
            <span>Çıkış</span>
          </button>
        )}
      </div>
    </header>
  );
};
