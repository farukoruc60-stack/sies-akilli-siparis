import React, { useEffect, useState } from 'react';
import { Paintbrush, RefreshCw, CheckCircle2, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface CoatingItem {
  id: number;
  order_id: number;
  order_no: string;
  customer_name?: string;
  customer_product_code?: string;
  product_name: string;
  color?: string;
  surface_coating?: string;
  quantity: number;
  shipped_quantity?: number;
  unit?: string;
  status: string;
}

export const CoatingView: React.FC = () => {
  const [items, setItems] = useState<CoatingItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const { token } = useAuth();

  const fetchCoating = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/production', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setItems(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCoating();
  }, []);

  const handleBatchStatus = async (newStatus: string) => {
    if (selectedIds.length === 0) return alert('Lütfen işlem yapılacak kalemleri seçin!');

    try {
      const groups = new Map<number, number[]>();
      selectedIds.forEach(id => {
        const item = items.find(i => i.id === id);
        if (item) {
          if (!groups.has(item.order_id)) groups.set(item.order_id, []);
          groups.get(item.order_id)!.push(id);
        }
      });

      for (const [orderId, itemIds] of groups.entries()) {
        await fetch(`/api/orders/${orderId}/items/status`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            itemIds,
            newStatus,
            notes: `Kaplama/Boya Takip ekranından durumu ${newStatus} yapıldı.`
          })
        });
      }

      alert(`✓ Seçilen ${selectedIds.length} kalem için kaplama/boya durumu güncellendi!`);
      setSelectedIds([]);
      fetchCoating();
    } catch (err: any) {
      alert(`Hata: ${err.message}`);
    }
  };

  const toggleSelect = (id: number) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const coatingItems = items.filter(i => i.status === 'COATING' || (i.color || i.surface_coating));

  return (
    <div style={{ padding: '1.5rem', height: '100%', overflowY: 'auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-primary)' }}>Kaplama ve Elektrostatik Boya Takibi</h1>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Fırın boya (RAL 9003 vb.), galvaniz ve özel yüzey işlem tesisindeki sipariş parçaları
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button onClick={() => handleBatchStatus('COATING')} disabled={selectedIds.length === 0} className="btn btn-primary" style={{ background: '#EC4899', border: '1px solid #EC4899' }}>
            <Paintbrush size={16} /> Fırın Boyaya Al ({selectedIds.length})
          </button>
          <button onClick={() => handleBatchStatus('SHIPPING')} disabled={selectedIds.length === 0} className="btn btn-primary" style={{ background: '#10B981', border: '1px solid #10B981' }}>
            <CheckCircle2 size={16} /> Boyadan Teslim Al & Sevkiyata Hazırla ({selectedIds.length})
          </button>
          <button onClick={fetchCoating} className="btn btn-secondary">
            <RefreshCw size={16} /> Yenile
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', padding: '1.25rem', borderRadius: '10px' }}>
          <span style={{ fontSize: '0.78rem', color: '#64748B', display: 'block' }}>KAPLAMADAKİ TOPLAM KALEM</span>
          <strong style={{ fontSize: '1.6rem', color: '#EC4899' }}>{coatingItems.filter(i => i.status === 'COATING').length} Kalem</strong>
        </div>
        <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', padding: '1.25rem', borderRadius: '10px' }}>
          <span style={{ fontSize: '0.78rem', color: '#64748B', display: 'block' }}>RAL 9003 BEYAZ BOYA HATTINDA</span>
          <strong style={{ fontSize: '1.6rem', color: '#0284C7' }}>{coatingItems.filter(i => (i.color || '').includes('9003')).length} Kalem</strong>
        </div>
        <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', padding: '1.25rem', borderRadius: '10px' }}>
          <span style={{ fontSize: '0.78rem', color: '#64748B', display: 'block' }}>TESLİME HAZIR BOYANMIŞ KALEMLER</span>
          <strong style={{ fontSize: '1.6rem', color: '#10B981' }}>{coatingItems.filter(i => i.status === 'SHIPPING' || i.status === 'COMPLETED').length} Kalem</strong>
        </div>
      </div>

      {/* Coating Items Table */}
      <div className="table-container">
        <table className="custom-table">
          <thead>
            <tr>
              <th style={{ width: '40px' }}>Seç</th>
              <th>Sipariş Ref</th>
              <th>Müşteri Unvanı</th>
              <th>Müşteri Ürün Kodu</th>
              <th>Ürün Açıklaması</th>
              <th>Boya / Yüzey Kaplama</th>
              <th>Miktar</th>
              <th>Durum</th>
            </tr>
          </thead>
          <tbody>
            {coatingItems.map((it) => (
              <tr key={it.id} style={{ background: selectedIds.includes(it.id) ? '#F0F9FF' : undefined }}>
                <td>
                  <input type="checkbox" checked={selectedIds.includes(it.id)} onChange={() => toggleSelect(it.id)} />
                </td>
                <td><span className="badge badge-approved" style={{ fontSize: '0.75rem' }}>{it.order_no}</span></td>
                <td><strong>{it.customer_name}</strong></td>
                <td style={{ fontWeight: 700, color: '#EC4899' }}>{it.customer_product_code || '-'}</td>
                <td>{it.product_name}</td>
                <td><span style={{ fontWeight: 700, color: '#0284C7' }}>{it.color || it.surface_coating || 'RAL 9003 White'}</span></td>
                <td style={{ fontWeight: 700 }}>{it.quantity} {it.unit || 'Adet'}</td>
                <td>
                  <span className={`badge ${it.status === 'COATING' ? 'badge-pending' : 'badge-completed'}`}>
                    {it.status === 'COATING' ? 'KAPLAMADA' : 'HAZIR / TAMAMLANDI'}
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
