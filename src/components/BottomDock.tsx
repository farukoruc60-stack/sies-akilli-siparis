import React, { useState } from 'react';
import { Sparkles, Mic, Square, Send, ChevronUp, Terminal, Layers } from 'lucide-react';

interface BottomDockProps {
  onSearchOrExecute?: (text: string) => void;
  onNewOrder?: () => void;
  activeTaskCount?: number;
}

export const BottomDock: React.FC<BottomDockProps> = ({ 
  onSearchOrExecute, 
  onNewOrder,
  activeTaskCount = 1 
}) => {
  const [inputText, setInputText] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputText.trim() && onSearchOrExecute) {
      onSearchOrExecute(inputText.trim());
      setInputText('');
    }
  };

  return (
    <div style={{
      position: 'fixed',
      bottom: '16px',
      left: 'calc(250px + (100vw - 250px) / 2)',
      transform: 'translateX(-50%)',
      width: '90%',
      maxWidth: '780px',
      backgroundColor: '#FFFFFF',
      border: '1px solid #E2E8F0',
      borderRadius: '24px',
      boxShadow: '0 8px 30px rgba(0, 0, 0, 0.08), 0 2px 8px rgba(0, 0, 0, 0.04)',
      padding: '8px 14px',
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
      zIndex: 40,
      backdropFilter: 'blur(8px)'
    }}>
      {/* Top Status Bar Indicator inside dock */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        fontSize: '11px',
        color: '#718096',
        padding: '0 4px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{
            width: '7px',
            height: '7px',
            borderRadius: '50%',
            backgroundColor: '#10B981',
            boxShadow: '0 0 6px rgba(16, 185, 129, 0.6)'
          }} />
          <span style={{ fontWeight: 500, color: '#4A5568' }}>{activeTaskCount} task running</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ cursor: 'pointer', color: '#718096' }}>Explored 3 files ›</span>
          <span style={{ cursor: 'pointer', color: '#718096' }}>Running 2 commands ∨</span>
        </div>
      </div>

      {/* Main Input Form Row */}
      <form onSubmit={handleSubmit} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <input 
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Ask anything, @ to mention, / for actions"
          style={{
            flex: 1,
            border: 'none',
            outline: 'none',
            fontSize: '13px',
            color: '#1A202C',
            backgroundColor: 'transparent',
            padding: '4px 0'
          }}
        />

        {/* Model Selector Pill */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          backgroundColor: '#F1F5F9',
          border: '1px solid #E2E8F0',
          borderRadius: '14px',
          padding: '4px 10px',
          fontSize: '11px',
          fontWeight: 600,
          color: '#4A5568',
          cursor: 'pointer',
          whiteSpace: 'nowrap'
        }}>
          <span style={{ color: '#4361EE' }}>+</span>
          <span>Gemini 3.5 Flash High</span>
          <ChevronUp size={12} style={{ color: '#A0AEC0' }} />
        </div>

        {/* Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <button 
            type="button"
            style={{
              background: 'transparent',
              border: 'none',
              color: '#A0AEC0',
              cursor: 'pointer',
              padding: '4px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            <Mic size={15} />
          </button>

          <button 
            type="submit"
            style={{
              width: '24px',
              height: '24px',
              borderRadius: '6px',
              backgroundColor: '#EF4444',
              color: '#FFFFFF',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer'
            }}
            title="Durdur / Çalıştır"
          >
            <Square size={10} fill="#FFFFFF" />
          </button>
        </div>
      </form>
    </div>
  );
};
