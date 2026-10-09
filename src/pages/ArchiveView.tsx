import React, { useEffect, useState } from 'react';
import { Cloud, CheckCircle, AlertTriangle, RefreshCw, Folder, HardDrive, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface YandexStatus {
  connected: boolean;
  user?: string;
  totalSpaceMb?: number;
  usedSpaceMb?: number;
  statusMessage?: string;
  rootDir: string;
}

export const ArchiveView: React.FC = () => {
  const [status, setStatus] = useState<YandexStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const { token } = useAuth();

  const fetchYandexStatus = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/yandex/status', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setStatus(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchYandexStatus();
  }, []);

  return (
    <div style={{ padding: '1.5rem', height: '100%', overflowY: 'auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#fff' }}>Belge Arşivi & Yandex Disk Entegrasyonu</h1>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Orijinal sipariş formları ve dönüştürülmüş PDF belgelerinin bulut arşivi
          </p>
        </div>
        <button onClick={fetchYandexStatus} className="btn btn-secondary">
          <RefreshCw size={16} /> Durumu Kontrol Et
        </button>
      </div>

      {/* Yandex Connectivity Card */}
      <div style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border-color)',
        borderRadius: '12px',
        padding: '1.5rem',
        marginBottom: '1.5rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
          <Cloud size={32} color={status?.connected ? 'var(--success)' : 'var(--warning)'} />
          <div>
            <h3 style={{ fontSize: '1.1rem', color: '#fff' }}>
              Yandex Disk API Bağlantı Durumu: {status?.connected ? <span style={{ color: '#10B981' }}>AKTİF / BAĞLANDI</span> : <span style={{ color: '#F59E0B' }}>YAPILANDIRILMADI (.env Bekleniyor)</span>}
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              {status?.statusMessage || `Arşiv Kök Dizini: ${status?.rootDir || '/AkilliSiparisTakip'}`}
            </p>
          </div>
        </div>

        {status?.connected ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginTop: '1rem', fontSize: '0.85rem' }}>
            <div style={{ background: 'rgba(0,0,0,0.3)', padding: '0.75rem', borderRadius: '6px' }}>
              <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.75rem' }}>YANDEX HESABI</span>
              <strong style={{ color: '#fff' }}>{status.user}</strong>
            </div>
            <div style={{ background: 'rgba(0,0,0,0.3)', padding: '0.75rem', borderRadius: '6px' }}>
              <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.75rem' }}>TOPLAM ALAN</span>
              <strong style={{ color: '#fff' }}>{status.totalSpaceMb} MB</strong>
            </div>
            <div style={{ background: 'rgba(0,0,0,0.3)', padding: '0.75rem', borderRadius: '6px' }}>
              <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.75rem' }}>KULLANILAN ALAN</span>
              <strong style={{ color: 'var(--primary)' }}>{status.usedSpaceMb} MB</strong>
            </div>
          </div>
        ) : (
          <div style={{ background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.3)', color: '#FBBF24', padding: '1rem', borderRadius: '8px', fontSize: '0.85rem' }}>
            <AlertTriangle size={18} style={{ verticalAlign: 'middle', marginRight: '0.5rem' }} />
            Yandex Disk OAuth2 Token henüz `.env` dosyasında tanımlanmadı. Yerel belge arşivleme sorunsuz çalışmaya devam etmektedir. Token eklendiğinde arka plan senkronizasyonu otomatik başlayacaktır.
          </div>
        )}
      </div>

      {/* Recommended Folder Tree Structure */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '1.5rem' }}>
        <h3 style={{ fontSize: '1rem', color: '#fff', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Folder size={18} color="var(--primary)" /> Arşiv Klasör Hiyerarşisi
        </h3>

        <div style={{ fontFamily: 'monospace', fontSize: '0.85rem', color: '#60A5FA', background: 'rgba(0,0,0,0.4)', padding: '1rem', borderRadius: '8px' }}>
          <div>📁 /AkilliSiparisTakip/</div>
          <div style={{ paddingLeft: '1.5rem' }}>├── 📁 /OrijinalBelgeler/ (SHA-256 İmzalı Orijinal Müşteri Dosyaları)</div>
          <div style={{ paddingLeft: '1.5rem' }}>├── 📁 /PDFBelgeler/ (Dönüştürülmüş ve Metin Çıkarılmış PDF Kopya)</div>
          <div style={{ paddingLeft: '1.5rem' }}>└── 📁 /Yedekler/ (Veritabanı Günlük Yedek Arşivi)</div>
        </div>
      </div>
    </div>
  );
};
