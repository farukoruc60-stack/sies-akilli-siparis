import React, { useState } from 'react';
import { Lock, UserCheck, Key, ShieldCheck, User, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const LoginModal: React.FC = () => {
  const { login } = useAuth();
  const [email, setEmail] = useState('admin@sies.com.tr');
  const [password, setPassword] = useState('Admin2026!');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Giriş başarısız!');
      }

      login(data.token, data.user);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const sampleUsers = [
    { email: 'admin@sies.com.tr', pass: 'Admin2026!', label: 'Yönetici (Sistem Admin)' },
    { email: 'sales@sies.com.tr', pass: 'Sies1234!', label: 'Ahmet Yılmaz (Satış)' },
    { email: 'planning@sies.com.tr', pass: 'Sies1234!', label: 'Zeynep Kaya (Planlama)' },
    { email: 'quality@sies.com.tr', pass: 'Sies1234!', label: 'Hakan Şen (Kalite Müdürü)' },
    { email: 'production@sies.com.tr', pass: 'Sies1234!', label: 'Mehmet Demir (Üretim)' },
    { email: 'logistics@sies.com.tr', pass: 'Sies1234!', label: 'Serkan Can (Sevkiyat)' }
  ];

  const handleSelectPresetUser = (u: typeof sampleUsers[0]) => {
    setEmail(u.email);
    setPassword(u.pass);
  };

  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      backgroundColor: '#FAFBFD',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1.5rem',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      <div style={{
        width: '100%',
        maxWidth: '440px',
        background: '#FFFFFF',
        border: '1px solid #E2E8F0',
        borderRadius: '16px',
        padding: '2.5rem 2rem',
        boxShadow: '0 10px 30px rgba(0,0,0,0.06)'
      }}>
        {/* Logo Brand */}
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '14px',
            background: 'linear-gradient(135deg, #4361EE 0%, #3B82F6 100%)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 800,
            fontSize: '1.5rem',
            color: '#FFFFFF',
            boxShadow: '0 4px 12px rgba(67, 97, 238, 0.3)',
            marginBottom: '0.75rem'
          }}>
            ▲
          </div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#1A202C' }}>SİES ELEKTRİK</h2>
          <p style={{ fontSize: '0.8rem', color: '#4361EE', letterSpacing: '0.04em', fontWeight: 600, marginTop: '2px' }}>
            AKILLI SİPARİŞ TAKİP PLATFORMU
          </p>
        </div>

        {error && (
          <div style={{
            background: '#FEE2E2',
            border: '1px solid #FCA5A5',
            color: '#DC2626',
            padding: '0.65rem 0.85rem',
            borderRadius: '8px',
            fontSize: '0.8rem',
            marginBottom: '1rem'
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', color: '#718096', marginBottom: '0.3rem', fontWeight: 500 }}>
              E-posta Adresi
            </label>
            <div style={{ position: 'relative' }}>
              <User size={15} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#A0AEC0' }} />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.6rem 0.6rem 0.6rem 2.2rem',
                  background: '#F8FAFC',
                  border: '1px solid #E2E8F0',
                  borderRadius: '8px',
                  color: '#1A202C',
                  fontSize: '0.85rem',
                  outline: 'none'
                }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', color: '#718096', marginBottom: '0.3rem', fontWeight: 500 }}>
              Parola
            </label>
            <div style={{ position: 'relative' }}>
              <Key size={15} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#A0AEC0' }} />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.6rem 0.6rem 0.6rem 2.2rem',
                  background: '#F8FAFC',
                  border: '1px solid #E2E8F0',
                  borderRadius: '8px',
                  color: '#1A202C',
                  fontSize: '0.85rem',
                  outline: 'none'
                }}
              />
            </div>
          </div>

          <button 
            type="submit" 
            disabled={loading} 
            style={{
              marginTop: '0.5rem',
              width: '100%',
              padding: '0.65rem',
              backgroundColor: '#4361EE',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '10px',
              fontWeight: 600,
              fontSize: '0.875rem',
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(67, 97, 238, 0.3)'
            }}
          >
            {loading ? 'Giriş Yapılıyor...' : 'Sisteme Giriş Yap'}
          </button>
        </form>

        {/* Multi-User Fast Account Selectors for Testing */}
        <div style={{ marginTop: '1.5rem', borderTop: '1px solid #E2E8F0', paddingTop: '1rem' }}>
          <div style={{ fontSize: '0.75rem', color: '#718096', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
            <UserCheck size={13} color="#4361EE" /> Test Kullanıcısı Hızlı Seçici:
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.35rem' }}>
            {sampleUsers.map((u) => (
              <button
                key={u.email}
                type="button"
                onClick={() => handleSelectPresetUser(u)}
                style={{
                  padding: '0.35rem 0.5rem',
                  fontSize: '0.7rem',
                  background: email === u.email ? '#EFF6FF' : '#F8FAFC',
                  border: email === u.email ? '1px solid #4361EE' : '1px solid #E2E8F0',
                  borderRadius: '6px',
                  color: email === u.email ? '#4361EE' : '#4A5568',
                  cursor: 'pointer',
                  textAlign: 'left',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}
              >
                {u.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
