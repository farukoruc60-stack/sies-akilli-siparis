import React, { useState } from 'react';
import { 
  LayoutDashboard, 
  Layers, 
  UploadCloud, 
  Users, 
  Package, 
  Factory, 
  Paintbrush, 
  Truck, 
  FileText, 
  BarChart3, 
  UserCheck, 
  Settings, 
  ChevronRight, 
  ChevronLeft,
  LogOut,
  ShieldAlert
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onUploadClick: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab, onUploadClick }) => {
  const [expanded, setExpanded] = useState(false);
  const { user, logout } = useAuth();

  const menuItems = [
    { id: 'dashboard', label: 'Gösterge Paneli', icon: LayoutDashboard },
    { id: 'orders', label: 'Sipariş Havuzu', icon: Layers },
    { id: 'upload', label: 'Yeni Sipariş Yükle', icon: UploadCloud, highlight: true },
    { id: 'customers', label: 'Müşteriler', icon: Users },
    { id: 'products', label: 'Ürün ve Sipariş Kalemleri', icon: Package },
    { id: 'production', label: 'Üretim Takibi', icon: Factory },
    { id: 'coating', label: 'Kaplama / Boya Takibi', icon: Paintbrush },
    { id: 'shipping', label: 'Sevkiyat Takibi', icon: Truck },
    { id: 'archive', label: 'Belge Arşivi', icon: FileText },
    { id: 'reports', label: 'Raporlar', icon: BarChart3 },
    { id: 'users', label: 'Kullanıcılar', icon: UserCheck },
    { id: 'settings', label: 'Sistem Ayarları', icon: Settings }
  ];

  const handleItemClick = (id: string) => {
    if (id === 'upload') {
      onUploadClick();
    } else {
      setActiveTab(id);
    }
  };

  return (
    <aside className={`sidebar-panel ${expanded ? 'expanded' : ''}`}>
      {/* Brand Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        padding: '0.75rem 1rem',
        width: '100%',
        marginBottom: '1rem',
        borderBottom: '1px solid var(--border-color)'
      }}>
        <div style={{
          width: '40px',
          height: '40px',
          borderRadius: '10px',
          background: 'linear-gradient(135deg, #00E5FF 0%, #0066FF 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 800,
          color: '#000',
          fontSize: '1.2rem',
          boxShadow: '0 0 15px rgba(0,229,255,0.4)',
          flexShrink: 0
        }}>
          S
        </div>
        {expanded && (
          <div style={{ overflow: 'hidden', whiteSpace: 'nowrap' }}>
            <div style={{ fontWeight: 700, fontSize: '1.05rem', color: '#fff' }}>SİES ELEKTRİK</div>
            <div style={{ fontSize: '0.7rem', color: 'var(--primary)', letterSpacing: '0.05em' }}>AKILLI SİPARİŞ TAKİP</div>
          </div>
        )}
      </div>

      {/* Nav Menu */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', width: '100%', padding: '0 0.5rem', flex: 1 }}>
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => handleItemClick(item.id)}
              title={item.label}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.85rem',
                padding: '0.7rem 0.85rem',
                borderRadius: '8px',
                border: item.highlight ? '1px solid var(--primary)' : '1px solid transparent',
                background: item.highlight 
                  ? 'linear-gradient(90deg, rgba(0,229,255,0.2) 0%, rgba(0,136,255,0.1) 100%)' 
                  : (isActive ? 'rgba(255, 255, 255, 0.1)' : 'transparent'),
                color: isActive || item.highlight ? 'var(--primary)' : 'var(--text-secondary)',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                width: '100%',
                textAlign: 'left'
              }}
            >
              <Icon size={20} style={{ flexShrink: 0 }} />
              {expanded && (
                <span style={{ fontSize: '0.85rem', fontWeight: isActive ? 600 : 400, whiteSpace: 'nowrap' }}>
                  {item.label}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* User Info & Toggle */}
      <div style={{
        width: '100%',
        padding: '0.75rem 0.5rem',
        borderTop: '1px solid var(--border-color)',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem'
      }}>
        {expanded && user && (
          <div style={{
            background: 'rgba(255, 255, 255, 0.04)',
            padding: '0.5rem',
            borderRadius: '6px',
            fontSize: '0.75rem'
          }}>
            <div style={{ fontWeight: 600, color: '#fff' }}>{user.name}</div>
            <div style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <ShieldAlert size={12} color="var(--primary)" /> {user.role === 'ADMIN' ? 'Yönetici' : 'Standart Kullanıcı'}
            </div>
          </div>
        )}

        <div style={{ display: 'flex', gap: '0.25rem' }}>
          <button
            onClick={() => setExpanded(!expanded)}
            title={expanded ? 'Menüyü Daralt' : 'Menüyü Genişlet'}
            style={{
              flex: 1,
              padding: '0.5rem',
              background: 'rgba(255, 255, 255, 0.05)',
              border: 'none',
              borderRadius: '6px',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            {expanded ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
          </button>
          
          <button
            onClick={logout}
            title="Oturumu Kapat"
            style={{
              padding: '0.5rem',
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '6px',
              color: '#F87171',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <LogOut size={18} />
          </button>
        </div>
      </div>
    </aside>
  );
};
