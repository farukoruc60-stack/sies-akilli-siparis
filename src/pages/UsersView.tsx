import React, { useEffect, useState } from 'react';
import { UserCheck, ShieldCheck, UserPlus, CheckCircle, RefreshCw, Plus, Edit3, Trash2, X, Save } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { User as UserType } from '../types';

export const UsersView: React.FC = () => {
  const [users, setUsers] = useState<UserType[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingUser, setEditingUser] = useState<UserType | null>(null);

  // Form State
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

  const handleOpenAddModal = () => {
    setEditingUser(null);
    setFullName('');
    setEmail('');
    setPassword('');
    setRole('STANDARD');
    setShowAddModal(true);
  };

  const handleOpenEditModal = (u: UserType) => {
    setEditingUser(u);
    setFullName(u.name || (u as any).full_name || '');
    setEmail(u.email || '');
    setPassword(''); // leave blank if unchanged
    setRole(u.role || 'STANDARD');
    setShowAddModal(true);
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !fullName) return alert('Lütfen Ad Soyad ve E-posta alanlarını doldurun!');
    if (!editingUser && !password) return alert('Yeni kullanıcı için şifre zorunludur!');

    setSubmitting(true);
    try {
      if (editingUser) {
        // Update user
        const res = await fetch(`/api/users/${editingUser.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ email, fullName, role, password })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Kullanıcı güncellenemedi');
        alert('✓ Kullanıcı bilgileri başarıyla güncellendi!');
      } else {
        // Create user
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
      }

      setShowAddModal(false);
      fetchUsers();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteUser = async (u: UserType) => {
    if (!window.confirm(`"${u.name || (u as any).full_name}" adlı kullanıcı hesabını silmek istediğinize emin misiniz?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/users/${u.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Kullanıcı silinemedi');

      alert('✓ Kullanıcı hesabı başarıyla silindi!');
      fetchUsers();
    } catch (err: any) {
      alert(`Hata: ${err.message}`);
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
          <button onClick={handleOpenAddModal} className="btn btn-primary">
            <Plus size={16} /> Yeni Kullanıcı Ekle
          </button>
        </div>
      </div>

      <div className="table-container">
        <table className="custom-table">
          <thead>
            <tr>
              <th style={{ width: '50px' }}>ID</th>
              <th>Ad Soyad / Unvan</th>
              <th>E-posta Adresi</th>
              <th>Sistem Rolü</th>
              <th>Durum</th>
              <th style={{ textAlign: 'right', width: '160px' }}>İşlemler</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => {
              const nameStr = u.name || (u as any).full_name;
              return (
                <tr key={u.id}>
                  <td style={{ color: '#94A3B8', fontWeight: 600 }}>{u.id}</td>
                  <td><strong>{nameStr}</strong></td>
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
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                      <button
                        onClick={() => handleOpenEditModal(u)}
                        className="btn btn-secondary"
                        style={{ padding: '0.35rem 0.65rem', fontSize: '0.8rem', gap: '0.35rem' }}
                        title="Kullanıcıyı Düzenle"
                      >
                        <Edit3 size={14} color="#0284C7" /> Düzenle
                      </button>
                      <button
                        onClick={() => handleDeleteUser(u)}
                        className="btn btn-secondary"
                        style={{ padding: '0.35rem 0.65rem', fontSize: '0.8rem', gap: '0.35rem', color: '#DC2626', borderColor: '#FCA5A5', background: '#FEE2E2' }}
                        title="Kullanıcıyı Sil"
                      >
                        <Trash2 size={14} color="#DC2626" /> Sil
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Add / Edit User Modal */}
      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '480px', height: 'auto', padding: '1.5rem', background: '#FFFFFF', color: '#0F172A', border: '1px solid #CBD5E1' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid #E2E8F0', paddingBottom: '0.75rem' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0F172A' }}>
                {editingUser ? `Kullanıcı Düzenle: ${editingUser.name || (editingUser as any).full_name}` : 'Yeni Kullanıcı Hesabı Ekle'}
              </h3>
              <button onClick={() => setShowAddModal(false)} style={{ background: 'transparent', border: 'none', color: '#64748B', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveUser} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '0.35rem' }}>AD SOYAD / UNVAN *</label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Örn: Mehmet Demir (Üretim Şefi)"
                  style={{ width: '100%', padding: '0.55rem', border: '1px solid #CBD5E1', borderRadius: '6px', fontSize: '0.9rem', background: '#F8FAFC', color: '#0F172A' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '0.35rem' }}>E-POSTA ADRESİ *</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="mehmet@sies.com.tr"
                  style={{ width: '100%', padding: '0.55rem', border: '1px solid #CBD5E1', borderRadius: '6px', fontSize: '0.9rem', background: '#F8FAFC', color: '#0F172A' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '0.35rem' }}>
                  GİRİŞ ŞİFRESİ {editingUser ? '(Boş Bırakırsanız Değişmez)' : '*'}
                </label>
                <input
                  type="password"
                  required={!editingUser}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={editingUser ? '•••••••• (Aynı Kalsın)' : '••••••••'}
                  style={{ width: '100%', padding: '0.55rem', border: '1px solid #CBD5E1', borderRadius: '6px', fontSize: '0.9rem', background: '#F8FAFC', color: '#0F172A' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '0.35rem' }}>SİSTEM ROLÜ</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as any)}
                  style={{ width: '100%', padding: '0.55rem', border: '1px solid #CBD5E1', borderRadius: '6px', fontSize: '0.9rem', background: '#F8FAFC', color: '#0F172A' }}
                >
                  <option value="STANDARD">Standart Kullanıcı (Sipariş Görüntüleme & Sevkiyat)</option>
                  <option value="ADMIN">Yönetici (Tam Yetkili Admin)</option>
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.75rem' }}>
                <button type="button" onClick={() => setShowAddModal(false)} className="btn btn-secondary">
                  İptal
                </button>
                <button type="submit" disabled={submitting} className="btn btn-primary" style={{ fontWeight: 700 }}>
                  <Save size={16} /> {submitting ? 'Kaydediliyor...' : (editingUser ? 'Değişiklikleri Kaydet' : 'Kullanıcıyı Kaydet')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
