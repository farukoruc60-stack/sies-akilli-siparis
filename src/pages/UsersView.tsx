import React, { useEffect, useState } from 'react';
import { UserCheck, ShieldCheck, UserPlus, ShieldAlert, CheckCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { User as UserType } from '../types';

export const UsersView: React.FC = () => {
  const [users, setUsers] = useState<UserType[]>([]);
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

  return (
    <div style={{ padding: '1.5rem', height: '100%', overflowY: 'auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#fff' }}>Kullanıcılar ve Erişim Yetkileri</h1>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Eş zamanlı ortak sipariş havuzuna erişimi olan kayıtlı sistem kullanıcıları
          </p>
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
                <td><strong>{u.name}</strong></td>
                <td>{u.email}</td>
                <td>
                  <span className={`badge ${u.role === 'ADMIN' ? 'badge-new' : 'badge-pending'}`}>
                    {u.role === 'ADMIN' ? 'YÖNETİCİ' : 'STANDART KULLANICI'}
                  </span>
                </td>
                <td>
                  <span style={{ color: '#10B981', display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.8rem' }}>
                    <CheckCircle size={14} /> Aktif
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
