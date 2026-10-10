import React from 'react';
import { BarChart3, Download, FileSpreadsheet, Calendar, Filter } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const ReportsView: React.FC = () => {
  const { token } = useAuth();

  const handleExportExcel = async () => {
    try {
      const res = await fetch('/api/orders?limit=1000', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      const orders = data.orders || [];

      // Create CSV format for download
      const headers = ['Sipariş No', 'Müşteri Unvanı', 'Müşteri Sipariş No', 'Sipariş Tarihi', 'Durum', 'Toplam Kalem'];
      const rows = orders.map((o: any) => [
        o.order_no,
        `"${o.customer_name}"`,
        o.customer_order_no || '',
        o.order_date || '',
        o.status,
        o.total_items || 0
      ]);

      const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `SIES_Siparis_Raporu_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      alert('Rapor indirilirken hata oluştu');
    }
  };

  return (
    <div style={{ padding: '1.5rem', height: '100%', overflowY: 'auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-primary)' }}>Raporlar ve Veri Dışa Aktarımı</h1>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Sipariş verilerini, imalat kalemlerini ve sevkiyat kayıtlarını Excel / CSV formatında indirin
          </p>
        </div>
        <button onClick={handleExportExcel} className="btn btn-primary" style={{ padding: '0.6rem 1.2rem', fontWeight: 700 }}>
          <FileSpreadsheet size={18} /> Tüm Siparişleri Excel (CSV) İndir
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.25rem' }}>
        <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <h3 style={{ fontSize: '1.05rem', color: '#0284C7', fontWeight: 700, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <BarChart3 size={20} /> Sipariş Havuzu İstatistik Raporu
          </h3>
          <p style={{ fontSize: '0.85rem', color: '#475569', marginBottom: '1rem' }}>
            Veritabanındaki tüm onaylı, üretimdeki ve sevk edilmiş siparişlerin genel dökümü.
          </p>
          <button onClick={handleExportExcel} className="btn btn-secondary" style={{ width: '100%', justifyContent: 'center' }}>
            <Download size={16} /> Sipariş Listesini İndir (CSV)
          </button>
        </div>

        <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <h3 style={{ fontSize: '1.05rem', color: '#10B981', fontWeight: 700, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <FileSpreadsheet size={20} /> İrsaliye & Sevkiyat Raporu
          </h3>
          <p style={{ fontSize: '0.85rem', color: '#475569', marginBottom: '1rem' }}>
            Düzenlenen tüm irsaliyeler, araç plakaları, şoförler ve sevk edilen parça detayları.
          </p>
          <button onClick={handleExportExcel} className="btn btn-secondary" style={{ width: '100%', justifyContent: 'center' }}>
            <Download size={16} /> Sevkiyat Raporunu İndir (CSV)
          </button>
        </div>
      </div>
    </div>
  );
};
