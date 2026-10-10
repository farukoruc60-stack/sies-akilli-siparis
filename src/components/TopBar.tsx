import React from 'react';
import { ChevronLeft, ChevronRight, Minus, Square, X } from 'lucide-react';

interface TopBarProps {
  title?: string;
  onRefresh?: () => void;
  onNewOrder?: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({ 
  title = 'Akıllı Sipariş Takip Platformu',
  onRefresh,
  onNewOrder
}) => {
  return (
    <div style={{
      height: '38px',
      backgroundColor: '#ECEEF1',
      borderBottom: '1px solid #DCE1E8',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 10px',
      fontSize: '12px',
      color: '#4A5568',
      userSelect: 'none',
      zIndex: 50
    }}>
      {/* Left Menu Items & Nav Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600, color: '#2D3748' }}>
          <span style={{ fontWeight: 700, color: '#1A202C' }}>Antigravity</span>
          <span style={{ fontWeight: 400, color: '#616E7C', cursor: 'pointer' }}>File</span>
          <span style={{ fontWeight: 400, color: '#616E7C', cursor: 'pointer' }}>View</span>
          <span style={{ fontWeight: 400, color: '#616E7C', cursor: 'pointer' }}>Window</span>
        </div>

        {/* History Nav Arrows */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '2px', marginLeft: '6px' }}>
          <button 
            onClick={onRefresh}
            style={{
              background: 'transparent',
              border: 'none',
              borderRadius: '4px',
              padding: '2px 4px',
              color: '#718096',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center'
            }}
            title="Geri"
          >
            <ChevronLeft size={14} />
          </button>
          <button 
            onClick={onRefresh}
            style={{
              background: 'transparent',
              border: 'none',
              borderRadius: '4px',
              padding: '2px 4px',
              color: '#718096',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center'
            }}
            title="İleri"
          >
            <ChevronRight size={14} />
          </button>
        </div>

        {/* Document Title */}
        <div style={{ 
          fontSize: '12px', 
          fontWeight: 500, 
          color: '#2D3748', 
          marginLeft: '8px',
          borderLeft: '1px solid #CBD5E0',
          paddingLeft: '12px'
        }}>
          {title}
        </div>
      </div>

      {/* Right Action Pills & Window Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        {/* Blue Update Pill */}
        <button 
          onClick={onRefresh}
          style={{
            background: '#4361EE',
            color: '#FFFFFF',
            border: 'none',
            borderRadius: '12px',
            padding: '3px 10px',
            fontSize: '11px',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            cursor: 'pointer',
            boxShadow: '0 1px 3px rgba(67, 97, 238, 0.3)'
          }}
        >
          <span>Restart to Update</span>
          <span>→</span>
        </button>

        {/* Open IDE Light Pill */}
        <button 
          onClick={onNewOrder}
          style={{
            background: '#E2E8F0',
            color: '#2D3748',
            border: '1px solid #CBD5E0',
            borderRadius: '12px',
            padding: '3px 10px',
            fontSize: '11px',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            cursor: 'pointer'
          }}
        >
          <span style={{ color: '#4361EE', fontWeight: 800 }}>▲</span>
          <span>Open IDE</span>
        </button>

        {/* Window Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginLeft: '6px', color: '#718096' }}>
          <Minus size={13} style={{ cursor: 'pointer' }} />
          <Square size={11} style={{ cursor: 'pointer' }} />
          <X size={13} style={{ cursor: 'pointer' }} />
        </div>
      </div>
    </div>
  );
};
