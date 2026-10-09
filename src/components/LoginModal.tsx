import React, { useState } from 'react';
import { Lock, UserCheck, Key, ShieldCheck, User } from 'lucide-react';
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
    <div className="modal-overlay" style={{ background: 'rgba(9, 13, 22, 0.92)' }}>
      <div style={{
        width: '100%',
        maxWidth: '460px',
        background: '#0E1524',
        border: '1px solid var(--border-color)',
        borderRadius: '14px',
        padding: '2rem',
        boxShadow: '0 25px 50px -12px rgba(0,0,0,0.7)'
      }}>
        {/* Logo Brand */}
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <div style={{
            width: '56px',
            height: '56px',
            borderRadius: '14px',
            background: 'linear-gradient(135deg, #00E5FF 0%, #0066FF 100%)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 800,
            fontSize: '1.8rem',
            color: '#000',
            boxShadow: '0 0 20px rgba(0,229,255,0.4)',
            marginBottom: '0.75rem'
          }}>
            S
          </div>
          <h2 style={{ fontSize: '1.3rem', fontWeight: 700, color: '#fff' }}>SİES ELEKTRİK</h2>
          <p style={{ fontSize: '0.8rem', color: 'var(--primary)', letterSpacing: '0.05em' }}>
            AKILLI SİPARİŞ TAKİP PLATFORMU
          </p>
        </div>

        {error && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid #EF4444',
            color: '#F87171',
            padding: '0.65rem 0.85rem',
            borderRadius: '6px',
            fontSize: '0.8rem',
            marginBottom: '1rem'
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>
              E-posta Adresi
            </label>
            <div style={{ position: 'relative' }}>
              <User size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.65rem 0.65rem 0.65rem 2.2rem',
                  background: 'rgba(0,0,0,0.4)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '6px',
                  color: '#fff',
                  fontSize: '0.85rem',
                  outline: 'none'
                }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>
              Parola
            </label>
            <div style={{ position: 'relative' }}>
              <Key size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.65rem 0.65rem 0.65rem 2.2rem',
                  background: 'rgba(0,0,0,0.4)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '6px',
                  color: '#fff',
                  fontSize: '0.85rem',
                  outline: 'none'
                }}
              />
            </div>
          </div>

          <button type="submit" disabled={loading} className="btn btn-primary" style={{ marginTop: '0.5rem', width: '100%', padding: '0.65rem' }}>
            <Lock size={16} /> {loading ? 'Giriş Yapılıyor...' : 'Ortak Sisteme Giriş Yap'}
          </button>
        </form>

        {/* Multi-User Fast Account Selectors for Testing */}
        <div style={{ marginTop: '1.5rem', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
            <UserCheck size={14} color="var(--primary)" /> Eş Zamanlı 6 Kullanıcı Test Seçicisi:
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
                  background: email === u.email ? 'var(--primary-glow)' : 'rgba(255,255,255,0.04)',
                  border: email === u.email ? '1px solid var(--primary)' : '1px solid transparent',
                  borderRadius: '4px',
                  color: email === u.email ? 'var(--primary)' : 'var(--text-secondary)',
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
