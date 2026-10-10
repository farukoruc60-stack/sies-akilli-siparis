import React, { useEffect, useState } from 'react';
import { Users, Building2, Phone, Mail, MapPin, Plus, Search, RefreshCw, FileText } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface Customer {
  id: number;
  name: string;
  tax_office?: string;
  tax_number?: string;
  address?: string;
  phone?: string;
  email?: string;
  total_orders?: number;
  last_order_date?: string;
}

export const CustomersView: React.FC = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const { token } = useAuth();

  // Form State
  const [name, setName] = useState('');
  const [taxOffice, setTaxOffice] = useState('');
  const [taxNumber, setTaxNumber] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/customers', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setCustomers(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return alert('Lütfen müşteri unvanını girin!');

    setSubmitting(true);
    try {
      const res = await fetch('/api/customers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ name, taxOffice, taxNumber, address, phone, email })
      });
      if (!res.ok) throw new Error('Müşteri eklenemedi');
      alert('✓ Yeni müşteri başarıyla oluşturuldu!');
      setShowAddModal(false);
      setName(''); setTaxOffice(''); setTaxNumber(''); setAddress(''); setPhone(''); setEmail('');
      fetchCustomers();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const filtered = customers.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.tax_number && c.tax_number.includes(search)) ||
    (c.phone && c.phone.includes(search))
  );

  return (
    <div style={{ padding: '1.5rem', height: '100%', overflowY: 'auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-primary)' }}>Müşteriler ve Cari Rehberi</h1>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Kayıtlı müşteri unvanları, vergi bilgileri ve geçmiş sipariş istatistikleri
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button onClick={fetchCustomers} className="btn btn-secondary">
            <RefreshCw size={16} /> Yenile
          </button>
          <button onClick={() => setShowAddModal(true)} className="btn btn-primary">
            <Plus size={16} /> Yeni Müşteri Ekle
          </button>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', padding: '1rem', borderRadius: '10px', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <Search size={18} color="#64748B" />
        <input
          type="text"
          placeholder="Müşteri unvanı, vergi numarası veya telefon ara..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ width: '100%', border: 'none', background: 'transparent', fontSize: '0.9rem', color: 'var(--text-primary)', outline: 'none' }}
        />
      </div>

      {/* Customer Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.25rem' }}>
        {filtered.map((c) => (
          <div key={c.id} style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '1.25rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#0284C7' }}>{c.name}</h3>
                <span className="badge badge-approved" style={{ fontSize: '0.75rem' }}>
                  <FileText size={12} /> {c.total_orders || 0} Sipariş
                </span>
              </div>

              <div style={{ fontSize: '0.82rem', color: '#475569', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Building2 size={14} color="#64748B" />
                  <span>Vergi D / No: <strong>{c.tax_office || '-'} / {c.tax_number || '-'}</strong></span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Phone size={14} color="#64748B" />
                  <span>İletişim: <strong>{c.phone || 'Belirtilmedi'}</strong></span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Mail size={14} color="#64748B" />
                  <span>E-posta: <strong>{c.email || 'Belirtilmedi'}</strong></span>
                </div>
                {c.address && (
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', marginTop: '0.2rem' }}>
                    <MapPin size={14} color="#64748B" style={{ marginTop: '2px', flexShrink: 0 }} />
                    <span style={{ fontSize: '0.78rem', color: '#64748B' }}>{c.address}</span>
                  </div>
                )}
              </div>
            </div>

            <div style={{ marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid #F1F5F9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', color: '#94A3B8' }}>
              <span>Son Sipariş: {c.last_order_date ? new Date(c.last_order_date).toLocaleDateString('tr-TR') : 'Henüz Yok'}</span>
              <span style={{ color: '#10B981', fontWeight: 600 }}>● Aktif Müşteri</span>
            </div>
          </div>
        ))}
      </div>

      {/* Add Customer Modal */}
      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '520px', height: 'auto', padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem', color: 'var(--text-primary)' }}>Yeni Müşteri Oluştur</h3>
            <form onSubmit={handleCreateCustomer} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '0.35rem' }}>MÜŞTERİ FİRMA UNVANI *</label>
                <input type="text" required value={name} onChange={(e) => setName(e.target.value)} placeholder="Örn: ALIA YACHT CO." style={{ width: '100%', padding: '0.5rem', border: '1px solid #CBD5E1', borderRadius: '6px' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '0.35rem' }}>VERGİ DAİRESİ</label>
                  <input type="text" value={taxOffice} onChange={(e) => setTaxOffice(e.target.value)} placeholder="Tuzla V.D." style={{ width: '100%', padding: '0.5rem', border: '1px solid #CBD5E1', borderRadius: '6px' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '0.35rem' }}>VERGİ NUMARASI</label>
                  <input type="text" value={taxNumber} onChange={(e) => setTaxNumber(e.target.value)} placeholder="1234567890" style={{ width: '100%', padding: '0.5rem', border: '1px solid #CBD5E1', borderRadius: '6px' }} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '0.35rem' }}>TELEFON</label>
                  <input type="text" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="0216 123 45 67" style={{ width: '100%', padding: '0.5rem', border: '1px solid #CBD5E1', borderRadius: '6px' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '0.35rem' }}>E-POSTA</label>
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="info@firma.com" style={{ width: '100%', padding: '0.5rem', border: '1px solid #CBD5E1', borderRadius: '6px' }} />
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '0.35rem' }}>ADRES</label>
                <textarea value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Firma açık adresi..." rows={2} style={{ width: '100%', padding: '0.5rem', border: '1px solid #CBD5E1', borderRadius: '6px' }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button type="button" onClick={() => setShowAddModal(false)} className="btn btn-secondary">İptal</button>
                <button type="submit" disabled={submitting} className="btn btn-primary">{submitting ? 'Kaydediliyor...' : 'Müşteriyi Kaydet'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
