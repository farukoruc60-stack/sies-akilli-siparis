import React, { useEffect, useState } from 'react';
import { Package, Search, RefreshCw, Layers, CheckCircle2, Clock, Truck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface ProductItem {
  id: number;
  order_id: number;
  order_no: string;
  customer_name?: string;
  customer_product_code?: string;
  product_name: string;
  product_description?: string;
  quantity: number;
  shipped_quantity?: number;
  unit?: string;
  unit_price?: number;
  line_total?: number;
  status: string;
  surface_coating?: string;
  color?: string;
}

export const ProductsView: React.FC = () => {
  const [items, setItems] = useState<ProductItem[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const { token } = useAuth();

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/products', {
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
    fetchProducts();
  }, []);

  const filtered = items.filter(it => {
    const matchSearch = 
      (it.customer_product_code && it.customer_product_code.toLowerCase().includes(search.toLowerCase())) ||
      (it.product_name && it.product_name.toLowerCase().includes(search.toLowerCase())) ||
      (it.order_no && it.order_no.toLowerCase().includes(search.toLowerCase())) ||
      (it.customer_name && it.customer_name.toLowerCase().includes(search.toLowerCase()));
    
    if (statusFilter === 'ALL') return matchSearch;
    return matchSearch && it.status === statusFilter;
  });

  const getBadge = (st: string) => {
    switch (st) {
      case 'IN_PRODUCTION':
        return <span className="badge badge-production">ÜRETİMDE</span>;
      case 'COATING':
        return <span className="badge badge-pending">KAPLAMADA</span>;
      case 'PARTIALLY_SHIPPED':
        return <span className="badge" style={{ background: '#FEF3C7', color: '#B45309' }}>PARÇA SEVK</span>;
      case 'COMPLETED':
      case 'SHIPPED':
        return <span className="badge badge-completed">TAMAMLANDI / SEVK</span>;
      default:
        return <span className="badge badge-approved">BEKLEYEN / ONAYLI</span>;
    }
  };

  return (
    <div style={{ padding: '1.5rem', height: '100%', overflowY: 'auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-primary)' }}>Ürün ve Sipariş Kalemleri Kataloğu</h1>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Tüm siparişlere ait ürün kodları, üretim miktarları ve parça durum havuzu
          </p>
        </div>
        <button onClick={fetchProducts} className="btn btn-secondary">
          <RefreshCw size={16} /> Yenile
        </button>
      </div>

      {/* Filter Header */}
      <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', padding: '1rem', borderRadius: '10px', marginBottom: '1.5rem', display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ flex: 1, minWidth: '240px', display: 'flex', alignItems: 'center', gap: '0.75rem', background: '#F8FAFC', padding: '0.5rem 0.75rem', borderRadius: '6px', border: '1px solid #CBD5E1' }}>
          <Search size={16} color="#64748B" />
          <input
            type="text"
            placeholder="Ürün kodu, ürün açıklaması, müşteri veya sipariş no ara..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: '100%', border: 'none', background: 'transparent', outline: 'none', fontSize: '0.85rem' }}
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={{ background: '#F8FAFC', border: '1px solid #CBD5E1', padding: '0.5rem 0.75rem', borderRadius: '6px', fontSize: '0.85rem', color: '#0F172A' }}
        >
          <option value="ALL">Tüm Aşama Durumları</option>
          <option value="APPROVED">Onaylı / Bekleyenler</option>
          <option value="IN_PRODUCTION">Üretimdekiler</option>
          <option value="COATING">Kaplamadakiler</option>
          <option value="PARTIALLY_SHIPPED">Parçalı Sevk Edilenler</option>
          <option value="COMPLETED">Tamamlananlar</option>
        </select>
      </div>

      {/* Table Container */}
      <div className="table-container">
        <table className="custom-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Sipariş Ref</th>
              <th>Müşteri Unvanı</th>
              <th>Müşteri Ürün Kodu</th>
              <th>Ürün Açıklaması</th>
              <th>Kaplama / Boya</th>
              <th>Top. Miktar</th>
              <th>Sevk Edilen</th>
              <th>Kalan</th>
              <th>Aşama Durumu</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((it, idx) => {
              const qty = parseFloat(String(it.quantity)) || 0;
              const shipped = parseFloat(String(it.shipped_quantity || 0));
              const rem = Math.max(0, qty - shipped);

              return (
                <tr key={it.id}>
                  <td style={{ color: '#94A3B8', fontWeight: 600 }}>{idx + 1}</td>
                  <td><span className="badge badge-approved" style={{ fontSize: '0.75rem' }}>{it.order_no}</span></td>
                  <td><strong>{it.customer_name || 'Müşteri'}</strong></td>
                  <td style={{ fontWeight: 700, color: '#0284C7' }}>{it.customer_product_code || '-'}</td>
                  <td>{it.product_name}</td>
                  <td><span style={{ fontSize: '0.78rem', color: '#64748B' }}>{it.color || it.surface_coating || 'Standart'}</span></td>
                  <td style={{ fontWeight: 700 }}>{qty} {it.unit || 'Adet'}</td>
                  <td style={{ color: '#059669', fontWeight: 700 }}>{shipped}</td>
                  <td style={{ color: '#0284C7', fontWeight: 700 }}>{rem}</td>
                  <td>{getBadge(it.status)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
