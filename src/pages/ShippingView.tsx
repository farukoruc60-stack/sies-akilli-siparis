import React, { useEffect, useState } from 'react';
import { Truck, Search, RefreshCw, FileCheck, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface GlobalDispatch {
  id: number;
  order_id: number;
  order_no: string;
  customer_name?: string;
  customer_product_code?: string;
  product_name?: string;
  quantity_shipped: number;
  driver_name: string;
  vehicle_plate: string;
  waybill_number: string;
  notes?: string;
  created_at: string;
  creator_name?: string;
}

export const ShippingView: React.FC = () => {
  const [dispatches, setDispatches] = useState<GlobalDispatch[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const { token } = useAuth();

  const fetchDispatches = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/dispatches/all', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setDispatches(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDispatches();
  }, []);

  // Group by waybill_number
  const waybillGroups = React.useMemo(() => {
    const map = new Map<string, {
      waybill_number: string;
      driver_name: string;
      vehicle_plate: string;
      customer_name?: string;
      order_no?: string;
      created_at: string;
      items: {
        code: string;
        name: string;
        qty: number;
      }[];
    }>();

    dispatches.forEach(d => {
      const key = d.waybill_number || `IRS-${d.id}`;
      if (!map.has(key)) {
        map.set(key, {
          waybill_number: d.waybill_number,
          driver_name: d.driver_name,
          vehicle_plate: d.vehicle_plate,
          customer_name: d.customer_name,
          order_no: d.order_no,
          created_at: d.created_at,
          items: []
        });
      }

      map.get(key)!.items.push({
        code: d.customer_product_code || '-',
        name: d.product_name || 'Ürün Kalemi',
        qty: d.quantity_shipped
      });
    });

    return Array.from(map.values());
  }, [dispatches]);

  const filteredGroups = waybillGroups.filter(wb => 
    wb.waybill_number.toLowerCase().includes(search.toLowerCase()) ||
    wb.vehicle_plate.toLowerCase().includes(search.toLowerCase()) ||
    wb.driver_name.toLowerCase().includes(search.toLowerCase()) ||
    (wb.customer_name && wb.customer_name.toLowerCase().includes(search.toLowerCase())) ||
    (wb.order_no && wb.order_no.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div style={{ padding: '1.5rem', height: '100%', overflowY: 'auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-primary)' }}>Sevkiyat ve İrsaliye Takip Merkezi</h1>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Kesilen tüm parçalı sevkiyat irsaliyeleri, araç plakaları, şoförler ve sevk edilen ürün kalemleri
          </p>
        </div>

        <button onClick={fetchDispatches} className="btn btn-secondary">
          <RefreshCw size={16} /> Yenile
        </button>
      </div>

      {/* Search Header */}
      <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', padding: '1rem', borderRadius: '10px', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <Search size={18} color="#64748B" />
        <input
          type="text"
          placeholder="İrsaliye numarası (#IRS-...), araç plakası, şoför adı veya müşteri ara..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ width: '100%', border: 'none', background: 'transparent', fontSize: '0.9rem', color: 'var(--text-primary)', outline: 'none' }}
        />
      </div>

      {/* Waybill Cards Grid */}
      <div style={{ display: 'grid', gap: '1.25rem' }}>
        {filteredGroups.map((group, idx) => (
          <div key={group.waybill_number || idx} style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderLeft: '5px solid #10B981', padding: '1.25rem', borderRadius: '10px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                <span className="badge badge-completed" style={{ fontSize: '0.85rem', fontWeight: 700, padding: '0.35rem 0.65rem' }}>
                  <FileCheck size={16} /> İRSALİYE NO: #{group.waybill_number}
                </span>
                <span style={{ fontSize: '0.85rem', color: '#0284C7', fontWeight: 700, background: '#E0F2FE', border: '1px solid #BAE6FD', padding: '0.25rem 0.6rem', borderRadius: '6px' }}>
                  SİP NO: {group.order_no}
                </span>
                <span style={{ fontSize: '0.85rem', color: '#1E293B', fontWeight: 700 }}>
                  {group.customer_name}
                </span>
                {group.vehicle_plate && (
                  <span style={{ fontSize: '0.85rem', color: '#0284C7', fontWeight: 600 }}>
                    Plaka: <strong>{group.vehicle_plate}</strong>
                  </span>
                )}
                {group.driver_name && (
                  <span style={{ fontSize: '0.85rem', color: '#334155', fontWeight: 600 }}>
                    <User size={14} style={{ marginRight: '4px', display: 'inline', verticalAlign: 'middle' }} /> Şoför: {group.driver_name}
                  </span>
                )}
                <span style={{ fontSize: '0.8rem', background: '#DCFCE7', color: '#15803D', border: '1px solid #BBF7D0', padding: '0.2rem 0.6rem', borderRadius: '6px', fontWeight: 600 }}>
                  {group.items.length} Kalem Sevk Edildi
                </span>
              </div>
              <span style={{ fontSize: '0.8rem', color: '#64748B', fontWeight: 500 }}>
                {new Date(group.created_at).toLocaleString('tr-TR')}
              </span>
            </div>

            {/* Table of items */}
            <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '8px', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ background: '#F1F5F9', borderBottom: '1px solid #E2E8F0', textAlign: 'left', color: '#475569', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                    <th style={{ padding: '0.6rem 0.75rem', width: '40px' }}>#</th>
                    <th style={{ padding: '0.6rem 0.75rem', width: '160px' }}>Ürün Kodu</th>
                    <th style={{ padding: '0.6rem 0.75rem' }}>Ürün Açıklaması</th>
                    <th style={{ padding: '0.6rem 0.75rem', textAlign: 'right', width: '150px' }}>Sevk Miktarı</th>
                  </tr>
                </thead>
                <tbody>
                  {group.items.map((item, itemIdx) => (
                    <tr key={itemIdx} style={{ borderBottom: itemIdx < group.items.length - 1 ? '1px solid #E2E8F0' : 'none', background: itemIdx % 2 === 0 ? '#FFFFFF' : '#F8FAFC' }}>
                      <td style={{ padding: '0.65rem 0.75rem', color: '#94A3B8', fontWeight: 600 }}>{itemIdx + 1}</td>
                      <td style={{ padding: '0.65rem 0.75rem', fontWeight: 700, color: '#0284C7' }}>{item.code}</td>
                      <td style={{ padding: '0.65rem 0.75rem', color: '#1E293B', fontWeight: 500 }}>{item.name}</td>
                      <td style={{ padding: '0.65rem 0.75rem', textAlign: 'right', fontWeight: 700, color: '#059669' }}>
                        {item.qty} Sevk Edildi
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
