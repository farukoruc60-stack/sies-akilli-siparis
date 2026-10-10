import React, { useEffect, useState } from 'react';
import { Factory, RefreshCw, CheckCircle2, Play, Layers, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface ProductionItem {
  id: number;
  order_id: number;
  order_no: string;
  customer_name?: string;
  customer_product_code?: string;
  product_name: string;
  quantity: number;
  shipped_quantity?: number;
  unit?: string;
  status: string;
}

export const ProductionView: React.FC = () => {
  const [items, setItems] = useState<ProductionItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const { token } = useAuth();

  const fetchProduction = async () => {
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
    fetchProduction();
  }, []);

  const handleBatchStatus = async (newStatus: string) => {
    if (selectedIds.length === 0) return alert('Lütfen işlem yapılacak imalat kalemlerini seçin!');

    try {
      // Group selected item IDs by order_id
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
            notes: `İmalat Takip ekranından durumu ${newStatus} yapıldı.`
          })
        });
      }

      alert(`✓ Seçilen ${selectedIds.length} kalem için durum "${newStatus}" olarak güncellendi!`);
      setSelectedIds([]);
      fetchProduction();
    } catch (err: any) {
      alert(`Hata: ${err.message}`);
    }
  };

  const toggleSelect = (id: number) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const reviewPending = items.filter(i => i.status === 'PENDING' || i.status === 'APPROVED');
  const inProduction = items.filter(i => i.status === 'IN_PRODUCTION');
  const coatingPending = items.filter(i => i.status === 'COATING');
  const completed = items.filter(i => i.status === 'COMPLETED' || i.status === 'SHIPPED' || i.status === 'PARTIALLY_SHIPPED');

  return (
    <div style={{ padding: '1.5rem', height: '100%', overflowY: 'auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-primary)' }}>Üretim Hattı ve İmalat Takip Paneli</h1>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Sac işleme, roll-forming, delme ve büküm hatlarındaki sipariş kalemlerinin canlı durumu
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button onClick={() => handleBatchStatus('IN_PRODUCTION')} disabled={selectedIds.length === 0} className="btn btn-primary" style={{ fontSize: '0.82rem', background: '#8B5CF6', border: '1px solid #8B5CF6' }}>
            <Play size={16} /> Seçilenleri Üretime Al ({selectedIds.length})
          </button>
          <button onClick={() => handleBatchStatus('COATING')} disabled={selectedIds.length === 0} className="btn btn-primary" style={{ fontSize: '0.82rem', background: '#EC4899', border: '1px solid #EC4899' }}>
            <ArrowRight size={16} /> Kaplamaya Sevk Et ({selectedIds.length})
          </button>
          <button onClick={fetchProduction} className="btn btn-secondary">
            <RefreshCw size={16} /> Yenile
          </button>
        </div>
      </div>

      {/* Production Pipeline Kanban Columns */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
        {/* Column 1: Onaylı / İmalat Bekleyenler */}
        <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '10px', padding: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', paddingBottom: '0.5rem', borderBottom: '2px solid #CBD5E1' }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#334155' }}>1. İmalat Bekleyenler</h3>
            <span style={{ fontSize: '0.8rem', background: '#E2E8F0', padding: '0.2rem 0.6rem', borderRadius: '12px', fontWeight: 700 }}>{reviewPending.length}</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {reviewPending.map((it) => (
              <div key={it.id} style={{ background: '#FFFFFF', border: selectedIds.includes(it.id) ? '2px solid #0284C7' : '1px solid #E2E8F0', borderRadius: '8px', padding: '0.85rem', cursor: 'pointer' }} onClick={() => toggleSelect(it.id)}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                  <span style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 600 }}>{it.order_no} | {it.customer_name}</span>
                  <input type="checkbox" checked={selectedIds.includes(it.id)} onChange={() => {}} />
                </div>
                <div style={{ fontWeight: 700, color: '#0284C7', fontSize: '0.85rem' }}>{it.customer_product_code || '-'}</div>
                <div style={{ fontSize: '0.82rem', color: '#1E293B', margin: '0.25rem 0' }}>{it.product_name}</div>
                <div style={{ fontSize: '0.78rem', color: '#059669', fontWeight: 700 }}>Miktar: {it.quantity} {it.unit || 'Adet'}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Column 2: Üretim / İmalat Hattında */}
        <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '10px', padding: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', paddingBottom: '0.5rem', borderBottom: '2px solid #8B5CF6' }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#6D28D9' }}>2. Roll-Forming / Üretimde</h3>
            <span style={{ fontSize: '0.8rem', background: '#DDD6FE', color: '#6D28D9', padding: '0.2rem 0.6rem', borderRadius: '12px', fontWeight: 700 }}>{inProduction.length}</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {inProduction.map((it) => (
              <div key={it.id} style={{ background: '#FFFFFF', border: selectedIds.includes(it.id) ? '2px solid #8B5CF6' : '1px solid #E2E8F0', borderRadius: '8px', padding: '0.85rem', cursor: 'pointer' }} onClick={() => toggleSelect(it.id)}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                  <span style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 600 }}>{it.order_no} | {it.customer_name}</span>
                  <input type="checkbox" checked={selectedIds.includes(it.id)} onChange={() => {}} />
                </div>
                <div style={{ fontWeight: 700, color: '#8B5CF6', fontSize: '0.85rem' }}>{it.customer_product_code || '-'}</div>
                <div style={{ fontSize: '0.82rem', color: '#1E293B', margin: '0.25rem 0' }}>{it.product_name}</div>
                <div style={{ fontSize: '0.78rem', color: '#059669', fontWeight: 700 }}>Miktar: {it.quantity} {it.unit || 'Adet'}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Column 3: Kaplama / Boyada */}
        <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '10px', padding: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', paddingBottom: '0.5rem', borderBottom: '2px solid #EC4899' }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#BE185D' }}>3. Kaplama & Fırın Boyada</h3>
            <span style={{ fontSize: '0.8rem', background: '#FCE7F3', color: '#BE185D', padding: '0.2rem 0.6rem', borderRadius: '12px', fontWeight: 700 }}>{coatingPending.length}</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {coatingPending.map((it) => (
              <div key={it.id} style={{ background: '#FFFFFF', border: selectedIds.includes(it.id) ? '2px solid #EC4899' : '1px solid #E2E8F0', borderRadius: '8px', padding: '0.85rem', cursor: 'pointer' }} onClick={() => toggleSelect(it.id)}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                  <span style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 600 }}>{it.order_no} | {it.customer_name}</span>
                  <input type="checkbox" checked={selectedIds.includes(it.id)} onChange={() => {}} />
                </div>
                <div style={{ fontWeight: 700, color: '#EC4899', fontSize: '0.85rem' }}>{it.customer_product_code || '-'}</div>
                <div style={{ fontSize: '0.82rem', color: '#1E293B', margin: '0.25rem 0' }}>{it.product_name}</div>
                <div style={{ fontSize: '0.78rem', color: '#059669', fontWeight: 700 }}>Miktar: {it.quantity} {it.unit || 'Adet'}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Column 4: Tamamlanan / Sevk Hazır */}
        <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '10px', padding: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', paddingBottom: '0.5rem', borderBottom: '2px solid #10B981' }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#047857' }}>4. Sevk Hazır / Tamamlandı</h3>
            <span style={{ fontSize: '0.8rem', background: '#D1FAE5', color: '#047857', padding: '0.2rem 0.6rem', borderRadius: '12px', fontWeight: 700 }}>{completed.length}</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {completed.map((it) => (
              <div key={it.id} style={{ background: '#FFFFFF', border: '1px solid #BBF7D0', borderRadius: '8px', padding: '0.85rem' }}>
                <span style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 600 }}>{it.order_no} | {it.customer_name}</span>
                <div style={{ fontWeight: 700, color: '#047857', fontSize: '0.85rem', marginTop: '0.2rem' }}>{it.customer_product_code || '-'}</div>
                <div style={{ fontSize: '0.82rem', color: '#1E293B', margin: '0.25rem 0' }}>{it.product_name}</div>
                <div style={{ fontSize: '0.78rem', color: '#047857', fontWeight: 700 }}>Sevk Edilen: {it.shipped_quantity || it.quantity} {it.unit || 'Adet'}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
