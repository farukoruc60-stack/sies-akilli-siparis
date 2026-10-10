import React from 'react';
import { 
  Plus, 
  Clock, 
  Calendar, 
  Settings, 
  ChevronDown, 
  Layers, 
  Users as UsersIcon, 
  Package, 
  Factory, 
  Paintbrush, 
  Truck, 
  FileText, 
  BarChart3, 
  UserCheck, 
  LogOut,
  Folder,
  SlidersHorizontal,
  Circle
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onUploadClick: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab, onUploadClick }) => {
  const { user, logout } = useAuth();

  const mainNav = [
    { id: 'orders', label: 'Sipariş Havuzu', icon: Layers },
    { id: 'dashboard', label: 'Gösterge Paneli', icon: BarChart3 },
    { id: 'archive', label: 'Zamanlanmış İşler & Arşiv', icon: Calendar }
  ];

  const projectsList = [
    { id: 'orders', label: 'Akıllı Sipariş Takip Platformu', active: activeTab === 'orders' || activeTab === 'dashboard', dotColor: '#3B82F6' },
    { id: 'customers', label: 'Müşteriler & Cari Yönetimi', active: activeTab === 'customers', subtitle: '1mo', dotColor: '#10B981' },
    { id: 'products', label: 'Ürün ve Sipariş Kalemleri', active: activeTab === 'products', subtitle: '1mo', dotColor: '#6366F1' },
    { id: 'production', label: 'Üretim Takibi & İş Emri', active: activeTab === 'production', subtitle: '2mo', dotColor: '#F59E0B' },
    { id: 'coating', label: 'Kaplama / Boya Takibi', active: activeTab === 'coating', subtitle: '2mo', dotColor: '#3B82F6' },
    { id: 'shipping', label: 'Sevkiyat & Parçalı İrsaliye', active: activeTab === 'shipping', subtitle: '1mo', dotColor: '#10B981' },
    { id: 'reports', label: 'Raporlar ve Analitik', active: activeTab === 'reports', subtitle: '3mo', dotColor: '#64748B' },
    { id: 'users', label: 'Kullanıcı Yönetimi', active: activeTab === 'users', subtitle: '3mo', dotColor: '#64748B' }
  ];

  return (
    <aside style={{
      width: '250px',
      minWidth: '250px',
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
      {/* Top New Button */}
      <div style={{ padding: '12px 14px 8px 14px' }}>
        <button
          onClick={onUploadClick}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '7px 12px',
            backgroundColor: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: '16px',
            fontSize: '12px',
            fontWeight: 500,
            color: '#2D3748',
            cursor: 'pointer',
            boxShadow: '0 1px 2px rgba(0, 0, 0, 0.04)',
            transition: 'all 0.15s ease'
          }}
        >
          <Plus size={14} style={{ color: '#4A5568' }} />
          <span>New Conversation</span>
        </button>
      </div>

      {/* Primary Links */}
      <div style={{ padding: '4px 8px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
        <div 
          onClick={() => setActiveTab('orders')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '5px 8px',
            borderRadius: '6px',
            cursor: 'pointer',
            color: activeTab === 'orders' ? '#1A202C' : '#4A5568',
            backgroundColor: activeTab === 'orders' ? '#E2E8F0' : 'transparent',
            fontWeight: activeTab === 'orders' ? 500 : 400
          }}
        >
          <Clock size={13} style={{ color: '#718096' }} />
          <span>Conversation History</span>
        </div>

        <div 
          onClick={() => setActiveTab('reports')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '5px 8px',
            borderRadius: '6px',
            cursor: 'pointer',
            color: activeTab === 'reports' ? '#1A202C' : '#4A5568',
            backgroundColor: activeTab === 'reports' ? '#E2E8F0' : 'transparent',
            fontWeight: activeTab === 'reports' ? 500 : 400
          }}
        >
          <Calendar size={13} style={{ color: '#718096' }} />
          <span>Scheduled Tasks</span>
        </div>
      </div>

      {/* Projects Section Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 12px 4px 12px',
        fontSize: '11px',
        color: '#A0AEC0',
        fontWeight: 500
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span>Projects</span>
          <ChevronDown size={11} style={{ cursor: 'pointer' }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <SlidersHorizontal size={11} style={{ cursor: 'pointer' }} />
          <Plus size={11} style={{ cursor: 'pointer' }} />
        </div>
      </div>

      {/* Conversations / Modüller Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '8px 12px 4px 12px',
        fontSize: '11px',
        color: '#A0AEC0',
        fontWeight: 500
      }}>
        <span>Conversations</span>
        <Plus size={11} style={{ cursor: 'pointer' }} />
      </div>

      {/* Projects / Modules Nav List */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '2px 8px',
        display: 'flex',
        flexDirection: 'column',
        gap: '2px'
      }}>
        {projectsList.map((item) => (
          <div
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '6px 8px',
              borderRadius: '6px',
              cursor: 'pointer',
              backgroundColor: item.active ? '#E2E8F0' : 'transparent',
              color: item.active ? '#1A202C' : '#4A5568',
              fontWeight: item.active ? 600 : 400,
              fontSize: '11.5px',
              transition: 'background-color 0.15s ease'
            }}
          >
            <span style={{
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              maxWidth: '170px'
            }}>
              {item.label}
            </span>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              {item.subtitle && (
                <span style={{ fontSize: '10px', color: '#A0AEC0' }}>{item.subtitle}</span>
              )}
              {item.dotColor && (
                <span style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  backgroundColor: item.dotColor,
                  flexShrink: 0
                }} />
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Bottom Settings & User Footer */}
      <div style={{
        padding: '10px 12px',
        borderTop: '1px solid #E2E8F0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        fontSize: '11.5px'
      }}>
        <div 
          onClick={() => setActiveTab('settings')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            cursor: 'pointer',
            color: '#4A5568'
          }}
        >
          <Settings size={13} style={{ color: '#718096' }} />
          <span>Settings</span>
        </div>

        {user && (
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
        )}
      </div>
    </aside>
  );
};
