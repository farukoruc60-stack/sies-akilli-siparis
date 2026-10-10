import React from 'react';
import { 
  Plus, 
  LayoutDashboard, 
  Layers, 
  Users as UsersIcon, 
  Package, 
  Factory, 
  Paintbrush, 
  Truck, 
  FileText, 
  BarChart3, 
  UserCheck, 
  Settings,
  LogOut,
  UploadCloud,
  ChevronDown
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onUploadClick: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab, onUploadClick }) => {
  const { user, logout } = useAuth();

  const menuSections = [
    {
      title: 'ANA MENÜ',
      items: [
        { id: 'orders', label: 'Sipariş Havuzu', icon: Layers },
        { id: 'dashboard', label: 'Gösterge Paneli', icon: LayoutDashboard }
      ]
    },
    {
      title: 'OPERASYONEL MODÜLLER',
      items: [
        { id: 'customers', label: 'Müşteriler & Cari', icon: UsersIcon },
        { id: 'products', label: 'Ürün ve Kalemler', icon: Package },
        { id: 'production', label: 'Üretim Takibi', icon: Factory },
        { id: 'coating', label: 'Kaplama / Boya Takibi', icon: Paintbrush },
        { id: 'shipping', label: 'Sevkiyat & İrsaliye', icon: Truck },
        { id: 'archive', label: 'Belge Arşivi', icon: FileText },
        { id: 'reports', label: 'Raporlar & Analitik', icon: BarChart3 }
      ]
    },
    {
      title: 'YÖNETİM',
      items: [
        { id: 'users', label: 'Kullanıcı Yönetimi', icon: UserCheck },
        { id: 'settings', label: 'Sistem Ayarları', icon: Settings }
      ]
    }
  ];

  return (
    <aside style={{
      width: '240px',
      minWidth: '240px',
      backgroundColor: '#F4F5F7',
      borderRight: '1px solid #E2E8F0',
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      userSelect: 'none',
      fontSize: '12px',
      color: '#4A5568',
      zIndex: 30
    }}>
      {/* Top Primary Action Button: + Yeni Sipariş Yükle */}
      <div style={{ padding: '12px 14px 8px 14px' }}>
        <button
          onClick={onUploadClick}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            padding: '8px 12px',
            backgroundColor: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: '16px',
            fontSize: '12.5px',
            fontWeight: 600,
            color: '#4361EE',
            cursor: 'pointer',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
            transition: 'all 0.15s ease'
          }}
        >
          <UploadCloud size={16} style={{ color: '#4361EE' }} />
          <span>+ Yeni Sipariş Yükle</span>
        </button>
      </div>

      {/* Sidebar Nav Sections */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '4px 8px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px'
      }}>
        {menuSections.map((sec, secIdx) => (
          <div key={secIdx}>
            <div style={{
              fontSize: '10.5px',
              fontWeight: 600,
              color: '#A0AEC0',
              padding: '4px 10px',
              letterSpacing: '0.04em'
            }}>
              {sec.title}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginTop: '2px' }}>
              {sec.items.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <div
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '9px',
                      padding: '6.5px 10px',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      backgroundColor: isActive ? '#E2E8F0' : 'transparent',
                      color: isActive ? '#1A202C' : '#4A5568',
                      fontWeight: isActive ? 600 : 400,
                      fontSize: '12px',
                      transition: 'background-color 0.15s ease'
                    }}
                  >
                    <Icon size={14} style={{ color: isActive ? '#4361EE' : '#718096', flexShrink: 0 }} />
                    <span style={{
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}>
                      {item.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Footer Info */}
      <div style={{
        padding: '10px 12px',
        borderTop: '1px solid #E2E8F0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        fontSize: '11px',
        color: '#718096'
      }}>
        <span>SİES v1.0.0 (Canlı)</span>
        <button
          onClick={logout}
          title="Oturumu Kapat"
          style={{
            background: 'transparent',
            border: 'none',
            color: '#A0AEC0',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center'
          }}
        >
          <LogOut size={13} />
        </button>
      </div>
    </aside>
  );
};
