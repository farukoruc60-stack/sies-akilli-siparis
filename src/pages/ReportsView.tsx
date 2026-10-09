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
          <h1 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#fff' }}>Raporlar ve Dışa Aktarım</h1>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Sipariş verilerini ve imalat kalemlerini Excel/CSV formatında indirin
          </p>
        </div>
        <button onClick={handleExportExcel} className="btn btn-primary">
          <FileSpreadsheet size={18} /> Excel (CSV) İndir
        </button>
      </div>

      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '1.5rem' }}>
        <h3 style={{ fontSize: '1rem', color: '#fff', marginBottom: '1rem' }}>Filtrelenmiş Sipariş Raporu</h3>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
          Veritabanındaki tüm canlı siparişler, kalem sayıları ve imalat durumları ile birlikte Excel veya CSV tablolarına aktarılabilir.
        </p>
      </div>
    </div>
  );
};
