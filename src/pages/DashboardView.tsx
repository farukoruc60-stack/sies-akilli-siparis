import React, { useEffect, useState } from 'react';
import { Layers, Clock, AlertCircle, Factory, Paintbrush, Truck, CheckCircle2, FileText, RefreshCw } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface DashboardStats {
  totalOrders: number;
  todayOrders: number;
  reviewPending: number;
  inProduction: number;
  coatingPending: number;
  shippingPending: number;
  completed: number;
  pendingArchive: number;
}

export const DashboardView: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const { token } = useAuth();

  const fetchStats = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/dashboard', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setStats(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const cards = [
    { title: 'Toplam Sipariş Havuzu', value: stats?.totalOrders || 0, icon: Layers, color: '#3B82F6' },
    { title: 'Bugün Eklenen Siparişler', value: stats?.todayOrders || 0, icon: Clock, color: '#10B981' },
    { title: 'Kontrol Bekleyenler', value: stats?.reviewPending || 0, icon: AlertCircle, color: '#F59E0B' },
    { title: 'Üretimde Olanlar', value: stats?.inProduction || 0, icon: Factory, color: '#8B5CF6' },
    { title: 'Kaplama / Boya Bekleyenler', value: stats?.coatingPending || 0, icon: Paintbrush, color: '#EC4899' },
    { title: 'Sevkiyat Bekleyenler', value: stats?.shippingPending || 0, icon: Truck, color: '#06B6D4' },
    { title: 'Tamamlanan Siparişler', value: stats?.completed || 0, icon: CheckCircle2, color: '#10B981' },
    { title: 'Arşiv Bekleyen Belgeler', value: stats?.pendingArchive || 0, icon: FileText, color: '#F97316' }
  ];

  return (
    <div style={{ padding: '1.5rem', height: '100%', overflowY: 'auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#fff' }}>Gösterge Paneli</h1>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Canlı veritabanı istatistikleri ve anlık sipariş durumu
          </p>
        </div>
        <button onClick={fetchStats} className="btn btn-secondary">
          <RefreshCw size={16} /> Verileri Yenile
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        {cards.map((c, idx) => {
          const Icon = c.icon;
          return (
            <div key={idx} style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              borderRadius: '12px',
              padding: '1.25rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>
                  {c.title}
                </span>
                <span style={{ fontSize: '1.8rem', fontWeight: 800, color: '#fff' }}>
                  {loading ? '...' : c.value}
                </span>
              </div>
              <div style={{
                width: '44px',
                height: '44px',
                borderRadius: '10px',
                background: `${c.color}20`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: c.color
              }}>
                <Icon size={24} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
