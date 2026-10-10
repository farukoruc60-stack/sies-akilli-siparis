import React, { useEffect, useState } from 'react';
import { UserCheck, ShieldCheck, UserPlus, CheckCircle, RefreshCw, Plus } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { User as UserType } from '../types';

export const UsersView: React.FC = () => {
  const [users, setUsers] = useState<UserType[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'ADMIN' | 'STANDARD'>('STANDARD');
  const [submitting, setSubmitting] = useState(false);
  const { token, user: currentUser } = useAuth();

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/users', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setUsers(data || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || !fullName) return alert('Lütfen tüm alanları doldurun!');

    setSubmitting(true);
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ email, password, fullName, role })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Kullanıcı eklenemedi');

      alert('✓ Yeni kullanıcı hesabı oluşturuldu!');
      setShowAddModal(false);
      setFullName(''); setEmail(''); setPassword('');
      fetchUsers();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ padding: '1.5rem', height: '100%', overflowY: 'auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-primary)' }}>Kullanıcılar ve Erişim Yetkileri</h1>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Eş zamanlı ortak sipariş havuzuna erişimi olan kayıtlı sistem kullanıcıları
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button onClick={fetchUsers} className="btn btn-secondary">
            <RefreshCw size={16} /> Yenile
          </button>
          <button onClick={() => setShowAddModal(true)} className="btn btn-primary">
            <Plus size={16} /> Yeni Kullanıcı Ekle
          </button>
        </div>
      </div>

      <div className="table-container">
        <table className="custom-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Ad Soyad / Unvan</th>
              <th>E-posta Adresi</th>
              <th>Sistem Rolü</th>
              <th>Durum</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td>{u.id}</td>
                <td><strong>{u.name || (u as any).full_name}</strong></td>
                <td>{u.email}</td>
                <td>
                  <span className={`badge ${u.role === 'ADMIN' ? 'badge-new' : 'badge-pending'}`}>
                    {u.role === 'ADMIN' ? 'YÖNETİCİ' : 'STANDART KULLANICI'}
                  </span>
                </td>
                <td>
                  <span style={{ color: '#10B981', display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.8rem', fontWeight: 600 }}>
                    <CheckCircle size={14} /> Aktif
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add User Modal */}
      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '480px', height: 'auto', padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem', color: 'var(--text-primary)' }}>Yeni Kullanıcı Hesabı Ekle</h3>
            <form onSubmit={handleCreateUser} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '0.35rem' }}>AD SOYAD *</label>
                <input type="text" required value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Örn: Ahmet Yılmaz" style={{ width: '100%', padding: '0.5rem', border: '1px solid #CBD5E1', borderRadius: '6px' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '0.35rem' }}>E-POSTA ADRESİ *</label>
                <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="ahmet@sies.com.tr" style={{ width: '100%', padding: '0.5rem', border: '1px solid #CBD5E1', borderRadius: '6px' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '0.35rem' }}>GİRİŞ ŞİFRESİ *</label>
                <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" style={{ width: '100%', padding: '0.5rem', border: '1px solid #CBD5E1', borderRadius: '6px' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '0.35rem' }}>SİSTEM ROLÜ</label>
                <select value={role} onChange={(e) => setRole(e.target.value as any)} style={{ width: '100%', padding: '0.5rem', border: '1px solid #CBD5E1', borderRadius: '6px' }}>
                  <option value="STANDARD">Standart Kullanıcı (Sipariş Görüntüleme & Sevkiyat)</option>
                  <option value="ADMIN">Yönetici (Tam Yetkili Admin)</option>
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button type="button" onClick={() => setShowAddModal(false)} className="btn btn-secondary">İptal</button>
                <button type="submit" disabled={submitting} className="btn btn-primary">{submitting ? 'Kaydediliyor...' : 'Kullanıcıyı Kaydet'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
