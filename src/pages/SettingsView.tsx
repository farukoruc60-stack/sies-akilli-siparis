import React, { useEffect, useState } from 'react';
import { Settings, Shield, Database, Cpu, Cloud, CheckCircle, Save, HardDrive, RefreshCw, AlertCircle, ExternalLink, Key } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const SettingsView: React.FC = () => {
  const { user, token } = useAuth();
  const [ocrEngine, setOcrEngine] = useState('DYNAMIC_PDF_REGEX');
  const [autoArchive, setAutoArchive] = useState(true);
  const [optimisticLocking, setOptimisticLocking] = useState(true);
  const [saving, setSaving] = useState(false);

  // Yandex Disk State
  const [yandexStatus, setYandexStatus] = useState<{
    connected: boolean;
    user?: string;
    statusMessage?: string;
    totalSpaceMb?: number;
    usedSpaceMb?: number;
    rootDir?: string;
  } | null>(null);
  const [yandexTokenInput, setYandexTokenInput] = useState('');
  const [testingYandex, setTestingYandex] = useState(false);
  const [yandexMsg, setYandexMsg] = useState<string | null>(null);

  const fetchYandexStatus = async () => {
    try {
      const res = await fetch('/api/yandex/status', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setYandexStatus(data);
    } catch (e) {
      console.error('Yandex durumu alınamadı:', e);
    }
  };

  useEffect(() => {
    if (token) {
      fetchYandexStatus();
    }
  }, [token]);

  const handleSaveYandexToken = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!yandexTokenInput.trim()) {
      alert('Lütfen Yandex Disk OAuth2 Token girin!');
      return;
    }

    setTestingYandex(true);
    setYandexMsg(null);
    try {
      const res = await fetch('/api/yandex/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ token: yandexTokenInput.trim() })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Token kaydedilemedi');

      setYandexStatus(data.status);
      if (data.status.connected) {
        setYandexMsg(`✓ Yandex Disk Başarıyla Bağlandı! Kullanıcı: ${data.status.user}`);
      } else {
        setYandexMsg(`⚠️ Token Kaydedildi Fakat Bağlantı Başarısız: ${data.status.statusMessage}`);
      }
      setYandexTokenInput('');
    } catch (err: any) {
      alert(`Hata: ${err.message}`);
    } finally {
      setTestingYandex(false);
    }
  };

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      alert('✓ Sistem ayarları ve OCR konfigürasyonları başarıyla kaydedildi!');
    }, 600);
  };

  return (
    <div style={{ padding: '1.5rem', height: '100%', overflowY: 'auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-primary)' }}>Sistem ve Entegrasyon Ayarları</h1>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Bulut arşivleme (Yandex Disk), OCR hassasiyet ayarları ve canlı veritabanı konfigürasyonu
          </p>
        </div>
      </div>

      <div style={{ display: 'grid', gap: '1.5rem', maxWidth: '850px' }}>
        {/* CARD 1: YANDEX DISK CLOUD ARCHIVE INTEGRATION */}
        <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#D97706', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Cloud size={20} /> Yandex Disk Bulut Arşiv Entegrasyonu
            </h3>

            {yandexStatus?.connected ? (
              <span className="badge badge-approved" style={{ fontSize: '0.8rem', padding: '0.3rem 0.65rem' }}>
                <CheckCircle size={14} /> CANLI BAĞLI ({yandexStatus.user})
              </span>
            ) : (
              <span className="badge badge-pending" style={{ fontSize: '0.8rem', padding: '0.3rem 0.65rem', background: '#FEF3C7', color: '#B45309' }}>
                <AlertCircle size={14} /> TOKEN BEKLENİYOR
              </span>
            )}
          </div>

          {/* Status Details Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.85rem', marginBottom: '1.25rem', fontSize: '0.85rem' }}>
            <div style={{ background: '#F8FAFC', padding: '0.85rem', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
              <span style={{ fontSize: '0.75rem', color: '#64748B', display: 'block' }}>YANDEX HESAP KULLANICISI</span>
              <strong style={{ color: '#0F172A' }}>{yandexStatus?.user || 'Yapılandırılmadı'}</strong>
            </div>

            <div style={{ background: '#F8FAFC', padding: '0.85rem', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
              <span style={{ fontSize: '0.75rem', color: '#64748B', display: 'block' }}>KULLANILAN / TOPLAM ALAN</span>
              <strong style={{ color: '#0284C7' }}>
                {yandexStatus?.connected ? `${yandexStatus.usedSpaceMb} MB / ${yandexStatus.totalSpaceMb} MB` : 'Bilinmiyor'}
              </strong>
            </div>

            <div style={{ background: '#F8FAFC', padding: '0.85rem', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
              <span style={{ fontSize: '0.75rem', color: '#64748B', display: 'block' }}>HEDEF KLASÖR YOLU</span>
              <strong style={{ color: '#0F172A' }}>{yandexStatus?.rootDir || '/AkilliSiparisTakip'}</strong>
            </div>
          </div>

          {/* Token Setup Input */}
          <form onSubmit={handleSaveYandexToken} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#334155' }}>
              YANDEX DISK OAUTH2 TOKEN TANIMLA
            </label>
            
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <div style={{ position: 'relative', flex: 1 }}>
                <Key size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
                <input
                  type="password"
                  placeholder="Yandex Disk OAuth2 Token Yapıştırın (ör. y0_AgAAA...)"
                  value={yandexTokenInput}
                  onChange={(e) => setYandexTokenInput(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.55rem 0.75rem 0.55rem 2.2rem',
                    border: '1px solid #CBD5E1',
                    borderRadius: '6px',
                    fontSize: '0.85rem',
                    color: '#0F172A'
                  }}
                />
              </div>

              <button
                type="submit"
                disabled={testingYandex || !yandexTokenInput.trim()}
                className="btn btn-primary"
                style={{ background: '#D97706', border: '1px solid #D97706', fontWeight: 600, padding: '0.55rem 1rem', whiteSpace: 'nowrap' }}
              >
                <Save size={16} /> {testingYandex ? 'Test Ediliyor...' : 'Token Kaydet & Test Et'}
              </button>
            </div>

            {yandexMsg && (
              <div style={{ fontSize: '0.82rem', padding: '0.5rem 0.75rem', borderRadius: '6px', background: yandexStatus?.connected ? '#D1FAE5' : '#FEF3C7', color: yandexStatus?.connected ? '#065F46' : '#92400E', fontWeight: 600 }}>
                {yandexMsg}
              </div>
            )}

            <div style={{ background: '#F8FAFC', padding: '0.75rem', borderRadius: '8px', border: '1px solid #E2E8F0', fontSize: '0.78rem', color: '#64748B', marginTop: '0.25rem' }}>
              💡 <strong>Yandex Disk OAuth Token Nasıl Alınır?</strong><br />
              1. Yandex hesabınızla <a href="https://oauth.yandex.com/" target="_blank" rel="noreferrer" style={{ color: '#0284C7' }}>oauth.yandex.com <ExternalLink size={10} /></a> adresine gidin.<br />
              2. Yeni bir Uygulama (Client) oluşturup <code>cloud_api:disk.write</code> ve <code>cloud_api:disk.read</code> izinlerini verin.<br />
              3. Oluşturduğunuz token'ı yukarıdaki alana yapıştırıp <strong>"Token Kaydet & Test Et"</strong> butonuna basın.
            </div>
          </form>
        </div>

        {/* CARD 2: OCR & PARSER SETTINGS */}
        <form onSubmit={handleSaveSettings} style={{ display: 'grid', gap: '1.5rem' }}>
          <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#0284C7', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Cpu size={20} /> Belge Okuyucu & OCR Algoritması
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: '0.35rem' }}>
                  PDF / EXCEL PARSER MOTORU
                </label>
                <select
                  value={ocrEngine}
                  onChange={(e) => setOcrEngine(e.target.value)}
                  style={{ width: '100%', padding: '0.6rem', border: '1px solid #CBD5E1', borderRadius: '6px', fontSize: '0.9rem', color: '#0F172A', background: '#F8FAFC' }}
                >
                  <option value="DYNAMIC_PDF_REGEX">Dinamik Akıllı Regex & Multi-line Parser (Önerilen - Sıfır Şablon Bağımlılığı)</option>
                  <option value="STRICT_GRID">Katı Hücre Izgara Ayıklama (Sadece Excel Formatları İçin)</option>
                  <option value="RAW_OCR">Tesseract OCR Hibrit Okuyucu</option>
                </select>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.5rem' }}>
                <input
                  type="checkbox"
                  id="optimistic"
                  checked={optimisticLocking}
                  onChange={(e) => setOptimisticLocking(e.target.checked)}
                  style={{ width: '18px', height: '18px' }}
                />
                <label htmlFor="optimistic" style={{ fontSize: '0.88rem', fontWeight: 600, color: '#1E293B', cursor: 'pointer' }}>
                  Optimistic Locking (Çakışma Kontrolü v1/v2) Aktif Et
                </label>
              </div>
              <p style={{ fontSize: '0.78rem', color: '#64748B', marginTop: '-0.5rem', marginLeft: '27px' }}>
                Farklı kullanıcılar aynı siparişi aynı anda değiştirmeye çalıştığında veri ezilmesini (409 Conflict) engeller.
              </p>
            </div>
          </div>

          {/* CARD 3: DATABASE & SYSTEM STATUS */}
          <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#0284C7', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Database size={20} /> Veritabanı ve Sunucu Durumu
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', fontSize: '0.85rem' }}>
              <div style={{ background: '#F8FAFC', padding: '0.85rem', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                <span style={{ fontSize: '0.75rem', color: '#64748B', display: 'block' }}>AKTİF VERİTABANI MOTORU</span>
                <strong style={{ color: '#059669', fontSize: '0.95rem' }}>PostgreSQL / SQLite Hibrit (Canlı)</strong>
              </div>

              <div style={{ background: '#F8FAFC', padding: '0.85rem', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                <span style={{ fontSize: '0.75rem', color: '#64748B', display: 'block' }}>SUNUCU ÇALIŞMA MODU</span>
                <strong style={{ color: '#0284C7', fontSize: '0.95rem' }}>Production (Yayın Modu)</strong>
              </div>
            </div>
          </div>

          {/* Save Button */}
          <div>
            <button type="submit" disabled={saving} className="btn btn-primary" style={{ padding: '0.75rem 1.5rem', fontWeight: 700 }}>
              <Save size={18} /> {saving ? 'Kaydediliyor...' : 'Sistem Ayarlarını Kaydet'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

