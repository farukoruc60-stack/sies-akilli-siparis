import React, { useState, useEffect, useRef } from 'react';
import { X, CheckCircle, RefreshCw, FileText, Plus, Trash2, Copy, AlertTriangle, ShieldCheck, UploadCloud, Loader2, Paperclip, ChevronDown, Maximize2, Columns, ExternalLink } from 'lucide-react';
import { ExtractedCustomerInfo, OrderItem } from '../types';

const COATING_OPTIONS = [
  '304 Kalite Paslanmaz',
  '304L Kalite Paslanmaz',
  '316 Kalite Paslanmaz',
  '316L Kalite Paslanmaz',
  '304L Paslanmaz & Sıcak Daldırma Galvaniz',
  'Sıcak Daldırma Galvaniz (TS EN ISO 1461)',
  'Pregalvaniz (Sendzimir - TS EN 10346)',
  'Elektro Galvaniz',
  'Elektrostatik Toz Boyalı (RAL 9001)',
  'Elektrostatik Toz Boyalı (RAL 7035)',
  'Elektrostatik Toz Boyalı (RAL 9003)',
  'Elektrostatik Toz Boyalı (RAL 9005)',
  'Eloksallı Alüminyum',
  'Ham Alüminyum',
  'DKP Sac / Ham Siyah Sac'
];

const DEFAULT_CUSTOMERS = [
  'TERSAN TERSANECİLİK SAN. VE TİC. A.Ş.',
  'BEŞİKTAŞ TERSANE A.Ş.',
  'ALIA YACHTS',
  'SİRENA MARİNE DENİZCİLİK SAN. VE TİC. A.Ş.',
  'GETA MARİN',
  'MARKA GRUP ELK. MÜH. PROJE TAAH. SAN.',
  'KOLUMAN LOJİSTİK VE SANAYİ A.Ş.',
  'MORE ELEKTRONİK'
];

// Açılır ve Listede Yoksa Serbestçe Eklenebilir Seçici Bileşeni
interface CreatableComboboxProps {
  value: string;
  onChange: (val: string) => void;
  options: string[];
  placeholder?: string;
  required?: boolean;
}

const CreatableCombobox: React.FC<CreatableComboboxProps> = ({
  value,
  onChange,
  options,
  placeholder,
  required
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const safeVal = value || '';
  const filtered = options.filter(opt =>
    opt.toLowerCase().includes(safeVal.toLowerCase())
  );

  const isExactMatch = options.some(opt => opt.toLowerCase() === safeVal.trim().toLowerCase());

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%' }}>
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        <input
          type="text"
          value={safeVal}
          placeholder={placeholder}
          required={required}
          onFocus={() => setIsOpen(true)}
          onChange={(e) => {
            onChange(e.target.value);
            setIsOpen(true);
          }}
          style={{
            width: '100%',
            padding: '0.45rem 2rem 0.45rem 0.6rem',
            background: '#FFFFFF',
            border: '1px solid #CBD5E1',
            borderRadius: '4px',
            color: '#0F172A',
            fontSize: '0.82rem',
            fontWeight: 600
          }}
        />
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          style={{
            position: 'absolute',
            right: '6px',
            background: 'none',
            border: 'none',
            color: '#64748B',
            cursor: 'pointer',
            padding: '4px',
            display: 'flex',
            alignItems: 'center'
          }}
        >
          <ChevronDown size={15} />
        </button>
      </div>

      {isOpen && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          right: 0,
          background: '#FFFFFF',
          border: '1px solid #CBD5E1',
          borderRadius: '6px',
          boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
          zIndex: 1000,
          maxHeight: '210px',
          overflowY: 'auto',
          marginTop: '3px'
        }}>
          {filtered.length > 0 ? (
            filtered.map((opt, i) => (
              <div
                key={i}
                onMouseDown={(e) => {
                  e.preventDefault();
                  onChange(opt);
                  setIsOpen(false);
                }}
                style={{
                  padding: '7px 10px',
                  fontSize: '0.8rem',
                  color: opt === safeVal ? '#2563EB' : '#1E293B',
                  background: opt === safeVal ? '#EFF6FF' : 'transparent',
                  fontWeight: opt === safeVal ? 700 : 400,
                  cursor: 'pointer',
                  borderBottom: '1px solid #F1F5F9'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = '#F8FAFC'}
                onMouseLeave={(e) => e.currentTarget.style.background = opt === safeVal ? '#EFF6FF' : 'transparent'}
              >
                {opt}
              </div>
            ))
          ) : (
            <div style={{ padding: '8px 10px', fontSize: '0.78rem', color: '#94A3B8' }}>
              Listede bu isimde hazır seçenek bulunamadı.
            </div>
          )}

          {/* Listede yoksa girilen yeni değeri ekle/kullan */}
          {!isExactMatch && safeVal.trim().length > 0 && (
            <div
              onMouseDown={(e) => {
                e.preventDefault();
                onChange(safeVal.trim());
                setIsOpen(false);
              }}
              style={{
                padding: '8px 10px',
                fontSize: '0.8rem',
                color: '#047857',
                background: '#ECFDF5',
                cursor: 'pointer',
                fontWeight: 600,
                borderTop: '1px solid #A7F3D0',
                display: 'flex',
                alignItems: 'center',
                gap: '5px'
              }}
            >
              <span>➕ Özel Değer Olarak Kullan:</span>
              <strong style={{ textDecoration: 'underline' }}>{safeVal}</strong>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

interface VerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  documentId: number;
  pdfUrl: string;
  initialCustomerInfo: ExtractedCustomerInfo;
  initialOrderItems: OrderItem[];
  onConfirm: (customerInfo: ExtractedCustomerInfo, orderItems: OrderItem[], documentId: number) => Promise<void>;
}

export const VerificationModal: React.FC<VerificationModalProps> = ({
  isOpen,
  onClose,
  documentId,
  pdfUrl,
  initialCustomerInfo,
  initialOrderItems,
  onConfirm
}) => {
  const [customerInfo, setCustomerInfo] = useState<ExtractedCustomerInfo>(initialCustomerInfo);
  const [orderItems, setOrderItems] = useState<OrderItem[]>(initialOrderItems);
  const [customerOptions, setCustomerOptions] = useState<string[]>(DEFAULT_CUSTOMERS);
  const [saving, setSaving] = useState(false);
  const [uploadingExemption, setUploadingExemption] = useState(false);
  const [exemptionFile, setExemptionFile] = useState<{ id: number; name: string; size: number } | null>(null);
  const [exemptionError, setExemptionError] = useState<string | null>(null);
  const [splitRatio, setSplitRatio] = useState<'50-50' | '60-40' | '40-60'>('50-50');
  const [mobileTab, setMobileTab] = useState<'items' | 'pdf'>('items');
  const [isMobile, setIsMobile] = useState<boolean>(() => typeof window !== 'undefined' && window.innerWidth <= 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    // Fetch registered customers from database to populate customer dropdown
    const fetchCustomers = async () => {
      try {
        const token = localStorage.getItem('sies_auth_token') || '';
        const res = await fetch('/api/customers', {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        });
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data)) {
            const dbCustNames = data.map((c: any) => c.name).filter(Boolean);
            const combined = Array.from(new Set([...DEFAULT_CUSTOMERS, ...dbCustNames]));
            setCustomerOptions(combined);
          }
        }
      } catch (e) {
        console.warn('Customer list fetch failed:', e);
      }
    };
    fetchCustomers();
  }, []);

  if (!isOpen) return null;

  const handleCustomerChange = (field: keyof ExtractedCustomerInfo, value: any) => {
    setCustomerInfo({ ...customerInfo, [field]: value });
  };

  const handleExemptionUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingExemption(true);
    setExemptionError(null);
    try {
      const token = localStorage.getItem('sies_auth_token') || '';
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/documents/upload-exemption', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Muafiyet belgesi yüklenemedi');

      setExemptionFile({
        id: data.documentId,
        name: data.originalName,
        size: data.fileSize
      });
      setCustomerInfo(prev => ({ ...prev, exemptionDocId: data.documentId }));
    } catch (err: any) {
      setExemptionError(err.message || 'Yükleme başarısız');
    } finally {
      setUploadingExemption(false);
      if (e.target) e.target.value = '';
    }
  };

  const handleRemoveExemption = () => {
    setExemptionFile(null);
    setCustomerInfo(prev => ({ ...prev, exemptionDocId: undefined }));
  };

  const orderCurrency = (customerInfo as any)?.currency || orderItems[0]?.currency || 'TRY';

  const handleCurrencyChange = (newCurr: string) => {
    setCustomerInfo(prev => ({ ...prev, currency: newCurr } as any));
    setOrderItems(orderItems.map(it => ({ ...it, currency: newCurr })));
  };

  const handleItemChange = (index: number, field: keyof OrderItem, val: any) => {
    const copy = [...orderItems];
    copy[index] = { ...copy[index], [field]: val };

    if (field === 'quantity' || field === 'unitPrice') {
      const q = typeof copy[index].quantity === 'number'
        ? copy[index].quantity
        : parseFloat(String(copy[index].quantity || '').replace(',', '.')) || 0;
      const p = typeof copy[index].unitPrice === 'number'
        ? copy[index].unitPrice
        : parseFloat(String(copy[index].unitPrice || '').replace(',', '.')) || 0;
      copy[index].lineTotal = Math.round(q * p * 100) / 100;
    }
    setOrderItems(copy);
  };

  const handleAddRow = () => {
    setOrderItems([
      ...orderItems,
      {
        lineNo: orderItems.length + 1,
        customerProductCode: '',
        productName: '',
        productDescription: '',
        quantity: 1,
        unit: 'Adet',
        unitPrice: 0,
        currency: orderCurrency,
        lineTotal: 0,
        confidenceScore: 1.0,
        status: 'OK'
      }
    ]);
  };

  const handleClearAllRows = () => {
    if (orderItems.length === 0) return;
    if (window.confirm('Tüm sipariş kalemlerini silip temizlemek istediğinize emin misiniz?')) {
      setOrderItems([]);
    }
  };

  const handleDeleteRow = (index: number) => {
    setOrderItems(orderItems.filter((_, i) => i !== index));
  };

  const handleCopyRow = (index: number) => {
    const target = orderItems[index];
    setOrderItems([
      ...orderItems,
      {
        ...target,
        lineNo: orderItems.length + 1
      }
    ]);
  };

  const handleSave = async () => {
    if (!customerInfo.name || !customerInfo.name.trim()) {
      alert('Lütfen müşteri unvanını giriniz!');
      return;
    }

    let finalNotes = (customerInfo.notes || '').trim();
    if (!finalNotes) {
      const ask = window.prompt("Sipariş için özel bir açıklama veya üretim notunuz var mı?\n(Varsa buraya yazın, yoksa boş bırakıp 'Tamam' butonuna tıklayabilirsiniz):", "");
      if (ask !== null && ask.trim().length > 0) {
        finalNotes = ask.trim();
        setCustomerInfo(prev => ({ ...prev, notes: finalNotes }));
      }
    }

    setSaving(true);
    try {
      const sanitizedItems = orderItems.map((it, idx) => {
        const q = typeof it.quantity === 'number'
          ? it.quantity
          : parseFloat(String(it.quantity || '0').replace(',', '.')) || 0;
        const p = typeof it.unitPrice === 'number'
          ? it.unitPrice
          : parseFloat(String(it.unitPrice || '0').replace(',', '.')) || 0;
        return {
          ...it,
          lineNo: it.lineNo || idx + 1,
          quantity: q,
          unitPrice: p,
          lineTotal: Math.round(q * p * 100) / 100,
          currency: it.currency || orderCurrency
        };
      });

      await onConfirm({ ...customerInfo, notes: finalNotes || undefined, currency: orderCurrency } as any, sanitizedItems, documentId);
      onClose();
    } catch (err: any) {
      alert(`Sipariş kaydedilirken hata oluştu: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const totalAmount = orderItems.reduce((acc, it) => acc + (it.lineTotal || 0), 0);

  const formatDateToISO = (dStr?: string) => {
    if (!dStr) return '';
    const trimmed = dStr.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
    const match = trimmed.match(/^(\d{1,2})[\.\/-](\d{1,2})[\.\/-](\d{4})$/);
    if (match) {
      const day = match[1].padStart(2, '0');
      const month = match[2].padStart(2, '0');
      const year = match[3];
      return `${year}-${month}-${day}`;
    }
    return trimmed;
  };

  const isManualMode = !pdfUrl;

  return (
    <div className="modal-overlay-fullscreen">
      <div className="modal-content-fullscreen">
        {/* Modal Header */}
        <div style={{
          padding: isMobile ? '0.65rem 0.85rem' : '0.85rem 1.5rem',
          background: '#060910',
          borderBottom: '1px solid var(--border-color)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexShrink: 0,
          gap: '8px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', minWidth: 0 }}>
            <div style={{
              background: 'rgba(59, 130, 246, 0.15)',
              padding: '6px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              flexShrink: 0
            }}>
              <ShieldCheck size={isMobile ? 18 : 22} color="var(--primary)" />
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                <h2 style={{ fontSize: isMobile ? '0.92rem' : '1.15rem', fontWeight: 700, color: '#fff', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {isManualMode ? (isMobile ? '✍️ Manuel Sipariş' : '✍️ Yeni Sipariş Girişi (Manuel)') : (isMobile ? 'Belge Kontrol & Onay' : 'Otomatik Belge Okuma Kontrol ve Onay Ekranı')}
                </h2>
                <span style={{
                  background: '#1E293B',
                  color: '#93C5FD',
                  padding: '1px 6px',
                  borderRadius: '10px',
                  fontSize: '0.7rem',
                  fontWeight: 600,
                  border: '1px solid #334155',
                  whiteSpace: 'nowrap'
                }}>
                  {orderItems.length} Kalem • {totalAmount.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {orderCurrency}
                </span>
              </div>
              {!isMobile && (
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  {isManualMode
                    ? 'Müşteri bilgilerini ve sipariş kalemlerini girin, onaylayıp ortak sipariş havuzuna aktarın.'
                    : "Çıkarılan verileri sol tarafta inceleyip düzenleyin, sağ tarafta orijinal PDF'i kontrol edin."}
                </span>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
            {/* Desktop Split Ratio Controls - Only when PDF exists */}
            {!isMobile && Boolean(pdfUrl) && (
              <div style={{
                display: 'flex',
                background: '#1E293B',
                borderRadius: '6px',
                padding: '2px',
                border: '1px solid #334155'
              }}>
                <button
                  type="button"
                  onClick={() => setSplitRatio('60-40')}
                  title="Tablo Geniş (%60 Sol - %40 Sağ)"
                  style={{
                    padding: '0.25rem 0.65rem',
                    borderRadius: '4px',
                    border: 'none',
                    background: splitRatio === '60-40' ? 'var(--primary)' : 'transparent',
                    color: splitRatio === '60-40' ? '#fff' : '#94A3B8',
                    fontSize: '0.72rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  Tablo %60
                </button>
                <button
                  type="button"
                  onClick={() => setSplitRatio('50-50')}
                  title="Eşit Görünüm (%50 Sol - %50 Sağ)"
                  style={{
                    padding: '0.25rem 0.65rem',
                    borderRadius: '4px',
                    border: 'none',
                    background: splitRatio === '50-50' ? 'var(--primary)' : 'transparent',
                    color: splitRatio === '50-50' ? '#fff' : '#94A3B8',
                    fontSize: '0.72rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  50 / 50
                </button>
                <button
                  type="button"
                  onClick={() => setSplitRatio('40-60')}
                  title="PDF Geniş (%40 Sol - %60 Sağ)"
                  style={{
                    padding: '0.25rem 0.65rem',
                    borderRadius: '4px',
                    border: 'none',
                    background: splitRatio === '40-60' ? 'var(--primary)' : 'transparent',
                    color: splitRatio === '40-60' ? '#fff' : '#94A3B8',
                    fontSize: '0.72rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  PDF %60
                </button>
              </div>
            )}

            {/* Mobile Tab Switcher - Only when PDF exists */}
            {isMobile && Boolean(pdfUrl) && (
              <div style={{
                display: 'flex',
                background: '#1E293B',
                borderRadius: '8px',
                padding: '2px',
                border: '1px solid #334155'
              }}>
                <button
                  type="button"
                  onClick={() => setMobileTab('items')}
                  style={{
                    padding: '4px 8px',
                    borderRadius: '6px',
                    border: 'none',
                    background: mobileTab === 'items' ? 'var(--primary)' : 'transparent',
                    color: mobileTab === 'items' ? '#fff' : '#94A3B8',
                    fontSize: '11px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <FileText size={12} />
                  <span>Kalemler</span>
                </button>
                <button
                  type="button"
                  onClick={() => setMobileTab('pdf')}
                  style={{
                    padding: '4px 8px',
                    borderRadius: '6px',
                    border: 'none',
                    background: mobileTab === 'pdf' ? 'var(--primary)' : 'transparent',
                    color: mobileTab === 'pdf' ? '#fff' : '#94A3B8',
                    fontSize: '11px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <ExternalLink size={12} />
                  <span>PDF</span>
                </button>
              </div>
            )}

            <button
              onClick={onClose}
              title="Kapat"
              style={{
                background: '#1E293B',
                border: '1px solid #334155',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                borderRadius: '6px',
                padding: '5px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Modal Split Body */}
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          {/* Left Side: Extracted Metadata & Item Editor */}
          {(!isMobile || mobileTab === 'items') && (
            <div style={{
              width: !pdfUrl ? '100%' : (isMobile ? '100%' : (splitRatio === '50-50' ? '50%' : splitRatio === '60-40' ? '60%' : '40%')),
              borderRight: (!pdfUrl || isMobile) ? 'none' : '1px solid var(--border-color)',
              overflowY: 'auto',
              padding: isMobile ? '0.75rem' : '1.25rem',
              transition: 'width 0.2s ease',
              flex: isMobile ? 1 : 'initial'
            }}>
              {/* Customer & Order Header Information Section */}
              <div style={{ background: 'var(--bg-card)', padding: isMobile ? '0.75rem' : '1rem', borderRadius: '8px', border: '1px solid var(--border-color)', marginBottom: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.65rem' }}>
                  <h3 style={{ fontSize: isMobile ? '0.85rem' : '0.9rem', color: 'var(--primary)', margin: 0, fontWeight: 700 }}>
                    1. Müşteri ve Sipariş Başlık Bilgileri
                  </h3>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>* Zorunlu alan</span>
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: isMobile ? '0.5rem' : '0.75rem', fontSize: '0.8rem' }}>
                  <div style={{ gridColumn: isMobile ? '1' : '1 / -1' }}>
                    <label style={{ display: 'block', color: 'var(--text-muted)', marginBottom: '0.2rem', fontWeight: 600 }}>Müşteri Adı / Ticari Unvanı * (Seçin veya Yazın)</label>
                    <CreatableCombobox
                      value={customerInfo.name || ''}
                      placeholder="Müşteri unvanı seçin veya yeni firma adı yazın..."
                      options={customerOptions}
                      onChange={(val) => handleCustomerChange('name', val)}
                      required
                    />
                  </div>

                <div>
                  <label style={{ display: 'block', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>Müşteri Kendi Sipariş No</label>
                  <input
                    type="text"
                    placeholder="Örn: MŞ-2026/044"
                    value={customerInfo.orderNo || ''}
                    onChange={(e) => handleCustomerChange('orderNo', e.target.value)}
                    style={{ width: '100%', padding: '0.45rem', background: '#FFFFFF', border: '1px solid #CBD5E1', borderRadius: '4px', color: '#0F172A' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>Müşteri Proje No / Adı</label>
                  <input
                    type="text"
                    placeholder="Örn: PRJ-İST-KÖPRÜ-24"
                    value={customerInfo.projectNo || ''}
                    onChange={(e) => handleCustomerChange('projectNo', e.target.value)}
                    style={{ width: '100%', padding: '0.45rem', background: '#FFFFFF', border: '1px solid #CBD5E1', borderRadius: '4px', color: '#0F172A' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>Kaplama Cinsi (Seçin veya Yazın)</label>
                  <CreatableCombobox
                    value={customerInfo.coatingType || ''}
                    placeholder="Kaplama cinsi seçin veya serbestçe yazın..."
                    options={COATING_OPTIONS}
                    onChange={(val) => handleCustomerChange('coatingType', val)}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>Döviz / Para Birimi</label>
                  <select
                    value={orderCurrency}
                    onChange={(e) => handleCurrencyChange(e.target.value)}
                    style={{ width: '100%', padding: '0.45rem', background: '#FFFFFF', border: '1px solid #CBD5E1', borderRadius: '4px', color: '#0F172A', fontWeight: 600 }}
                  >
                    <option value="TRY">TRY (₺ - Türk Lirası)</option>
                    <option value="USD">USD ($ - Amerikan Doları)</option>
                    <option value="EUR">EUR (€ - Euro)</option>
                    <option value="GBP">GBP (£ - İngiliz Sterlini)</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>İstenen Teslim Tarihi</label>
                  <input
                    type="date"
                    value={formatDateToISO(customerInfo.deliveryDate || customerInfo.requestedDeliveryDate)}
                    onChange={(e) => {
                      handleCustomerChange('deliveryDate', e.target.value);
                      handleCustomerChange('requestedDeliveryDate', e.target.value);
                    }}
                    style={{ width: '100%', padding: '0.45rem', background: '#FFFFFF', border: '1px solid #CBD5E1', borderRadius: '4px', color: '#0F172A' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>Sipariş Tarihi</label>
                  <input
                    type="date"
                    value={formatDateToISO(customerInfo.orderDate)}
                    onChange={(e) => handleCustomerChange('orderDate', e.target.value)}
                    style={{ width: '100%', padding: '0.45rem', background: '#FFFFFF', border: '1px solid #CBD5E1', borderRadius: '4px', color: '#0F172A' }}
                  />
                </div>

                <div style={{ gridColumn: isMobile ? '1' : '1 / -1', marginTop: '0.25rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#D97706', marginBottom: '0.25rem', fontWeight: 700, fontSize: '0.82rem' }}>
                    <FileText size={14} /> Sipariş İçin Özel Bir Açıklama / Notunuz Var mı?
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Varsa özel üretim notu, sevkiyat talimatı, şantiye şartı vb. yazınız (Yoksa boş bırakabilirsiniz)..."
                    value={customerInfo.notes || ''}
                    onChange={(e) => handleCustomerChange('notes', e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      background: '#FFFBEB',
                      border: '1.5px solid #FCD34D',
                      borderRadius: '6px',
                      color: '#78350F',
                      fontSize: '0.82rem',
                      fontWeight: 600,
                      fontFamily: 'inherit',
                      resize: 'vertical'
                    }}
                  />
                  <span style={{ fontSize: '0.72rem', color: '#B45309', display: 'block', marginTop: '2px' }}>
                    ℹ️ Bu açıklama sipariş detayında ve iş emrinde belirgin sarı etiketle gösterilir.
                  </span>
                </div>
              </div>

              {/* KDV Muafiyet Belgesi Yükleme Bölümü */}
              <div style={{ marginTop: '1rem', paddingTop: '0.85rem', borderTop: '1px dashed var(--border-color)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#F59E0B', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <Paperclip size={14} /> KDV Muafiyet Belgesi (Varsa)
                  </label>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Opsiyonel</span>
                </div>

                {exemptionFile ? (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.6rem 0.85rem',
                    background: 'rgba(16, 185, 129, 0.1)',
                    border: '1px solid #10B981',
                    borderRadius: '6px',
                    fontSize: '0.8rem'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', overflow: 'hidden' }}>
                      <CheckCircle size={16} color="#10B981" />
                      <span style={{ fontWeight: 600, color: '#ECFDF5', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {exemptionFile.name}
                      </span>
                      <span style={{ fontSize: '0.72rem', color: '#9CA3AF' }}>
                        ({(exemptionFile.size / 1024).toFixed(1)} KB)
                      </span>
                      <span style={{
                        fontSize: '0.68rem',
                        background: '#065F46',
                        color: '#A7F3D0',
                        padding: '0.1rem 0.4rem',
                        borderRadius: '4px',
                        fontWeight: 600
                      }}>
                        Sipariş Belgelerine Kaydedilecek
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={handleRemoveExemption}
                      title="Belgeyi Kaldır"
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#EF4444',
                        cursor: 'pointer',
                        padding: '0.2rem',
                        display: 'flex',
                        alignItems: 'center'
                      }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ) : (
                  <div>
                    <label style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.5rem',
                      padding: '0.65rem 1rem',
                      background: 'rgba(255, 255, 255, 0.03)',
                      border: '1px dashed #64748B',
                      borderRadius: '6px',
                      cursor: uploadingExemption ? 'not-allowed' : 'pointer',
                      transition: 'all 0.2s ease',
                      fontSize: '0.78rem',
                      color: 'var(--text-secondary)'
                    }}>
                      {uploadingExemption ? (
                        <>
                          <Loader2 size={16} className="spin" color="var(--primary)" />
                          <span>Muafiyet Belgesi Yükleniyor...</span>
                        </>
                      ) : (
                        <>
                          <UploadCloud size={16} color="#F59E0B" />
                          <span>KDV Muafiyet Belgesi Seç veya Yükle (PDF, Resim)</span>
                        </>
                      )}
                      <input
                        type="file"
                        accept=".pdf,.png,.jpg,.jpeg"
                        disabled={uploadingExemption}
                        onChange={handleExemptionUpload}
                        style={{ display: 'none' }}
                      />
                    </label>

                    {exemptionError && (
                      <div style={{ color: '#EF4444', fontSize: '0.75rem', marginTop: '0.35rem' }}>
                        {exemptionError}
                      </div>
                    )}

                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.3rem' }}>
                      ℹ️ Muafiyet belgesi var ise ekleyin. Sipariş onaylandığında <b>"Sipariş Belgeleri"</b> sekmesine eklenecektir.
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Extracted Order Items Section */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '8px' }}>
                <h3 style={{ fontSize: '0.9rem', color: 'var(--primary)', fontWeight: 600, margin: 0 }}>
                  2. Sipariş Kalemleri ({orderItems.length} Kalem - Toplam {totalAmount.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {orderCurrency})
                </h3>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button onClick={handleAddRow} className="btn btn-secondary" style={{ padding: '0.3rem 0.65rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Plus size={14} /> Satır Ekle
                  </button>
                  <button
                    type="button"
                    onClick={handleClearAllRows}
                    className="btn btn-secondary"
                    style={{ padding: '0.3rem 0.65rem', fontSize: '0.75rem', color: '#EF4444', borderColor: '#FCA5A5', display: 'flex', alignItems: 'center', gap: '4px' }}
                    title="Tüm kalemleri sil ve temizle"
                  >
                    <Trash2 size={13} /> Tümünü Temizle
                  </button>
                </div>
              </div>

              {orderItems.length > 0 ? (
                <div className="table-container">
                  <table className="custom-table" style={{ fontSize: '0.8rem' }}>
                    <thead>
                      <tr>
                        <th style={{ width: '30px' }}>#</th>
                        <th>Ürün Kodu</th>
                        <th>Ürün Açıklaması</th>
                        <th style={{ width: '90px' }}>Miktar</th>
                        <th style={{ width: '80px' }}>Birim</th>
                        <th style={{ width: '100px' }}>Birim Fiyat</th>
                        <th style={{ width: '110px' }}>Toplam Tutar</th>
                        <th style={{ width: '65px' }}>İşlem</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orderItems.map((item, idx) => {
                        const qty = typeof item.quantity === 'number'
                          ? item.quantity
                          : parseFloat(String(item.quantity || '').replace(',', '.')) || 0;
                        const uPrice = typeof item.unitPrice === 'number'
                          ? item.unitPrice
                          : parseFloat(String(item.unitPrice || '').replace(',', '.')) || 0;
                        const lTotal = parseFloat(String(item.lineTotal)) || (qty * uPrice);

                        return (
                          <tr key={idx} style={{ background: (item.confidenceScore || 1) < 0.9 ? '#FEF3C7' : undefined }}>
                            <td>{idx + 1}</td>
                            <td>
                              <input
                                type="text"
                                value={item.customerProductCode || ''}
                                placeholder="Örn: 169387"
                                onChange={(e) => handleItemChange(idx, 'customerProductCode', e.target.value)}
                                style={{ width: '100%', background: '#FFFFFF', border: '1px solid #CBD5E1', color: '#0F172A', padding: '0.3rem 0.4rem', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 600 }}
                              />
                            </td>
                            <td style={{ minWidth: '320px' }}>
                              <textarea
                                rows={2}
                                value={item.productName || item.productDescription || ''}
                                placeholder="Ürün açıklaması / teknik detayları..."
                                onChange={(e) => {
                                  handleItemChange(idx, 'productName', e.target.value);
                                  handleItemChange(idx, 'productDescription', e.target.value);
                                }}
                                style={{
                                  width: '100%',
                                  background: '#FFFFFF',
                                  border: '1px solid #CBD5E1',
                                  color: '#0F172A',
                                  padding: '0.35rem 0.5rem',
                                  borderRadius: '4px',
                                  fontSize: '0.8rem',
                                  lineHeight: '1.35',
                                  resize: 'vertical',
                                  fontFamily: 'inherit',
                                  display: 'block'
                                }}
                              />
                              {(item.material || item.surfaceCoating) && (
                                <div style={{ display: 'flex', gap: '4px', marginTop: '3px', flexWrap: 'wrap' }}>
                                  {item.surfaceCoating && item.surfaceCoating !== 'Belirtilmedi' && (
                                    <span style={{ background: '#EFF6FF', color: '#1D4ED8', padding: '1px 5px', borderRadius: '3px', fontSize: '0.68rem', fontWeight: 600 }}>
                                      {item.surfaceCoating}
                                    </span>
                                  )}
                                  {item.material && item.material !== 'Çelik' && (
                                    <span style={{ background: '#F1F5F9', color: '#475569', padding: '1px 5px', borderRadius: '3px', fontSize: '0.68rem' }}>
                                      {item.material}
                                    </span>
                                  )}
                                </div>
                              )}
                            </td>
                            <td>
                              <input
                                type="text"
                                inputMode="decimal"
                                value={item.quantity === undefined || item.quantity === null ? '' : item.quantity}
                                placeholder="0"
                                onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                                style={{ width: '100%', background: '#FFFFFF', border: '1px solid #CBD5E1', color: '#0F172A', padding: '0.3rem', borderRadius: '4px', fontSize: '0.8rem', textAlign: 'right', fontWeight: 600 }}
                              />
                            </td>
                            <td>
                              <input
                                type="text"
                                value={item.unit || 'Adet'}
                                onChange={(e) => handleItemChange(idx, 'unit', e.target.value)}
                                style={{ width: '100%', background: '#FFFFFF', border: '1px solid #CBD5E1', color: '#0F172A', padding: '0.3rem', borderRadius: '4px', fontSize: '0.8rem' }}
                              />
                            </td>
                            <td>
                              <input
                                type="text"
                                inputMode="decimal"
                                value={item.unitPrice === undefined || item.unitPrice === null ? '' : item.unitPrice}
                                placeholder="0.00"
                                onChange={(e) => handleItemChange(idx, 'unitPrice', e.target.value)}
                                style={{ width: '100%', background: '#FFFFFF', border: '1px solid #CBD5E1', color: '#0F172A', padding: '0.3rem', borderRadius: '4px', fontSize: '0.8rem', textAlign: 'right' }}
                              />
                            </td>
                            <td style={{ color: 'var(--primary)', fontWeight: 600, whiteSpace: 'nowrap', textAlign: 'right' }}>
                              {lTotal.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {item.currency || orderCurrency}
                            </td>
                            <td>
                              <div style={{ display: 'flex', gap: '0.3rem', justifyContent: 'center' }}>
                                <button onClick={() => handleCopyRow(idx)} title="Satırı Kopyala" style={{ background: 'none', border: 'none', color: '#60A5FA', cursor: 'pointer', padding: '2px' }}>
                                  <Copy size={15} />
                                </button>
                                <button onClick={() => handleDeleteRow(idx)} title="Satırı Sil" style={{ background: 'none', border: 'none', color: '#F87171', cursor: 'pointer', padding: '2px' }}>
                                  <Trash2 size={15} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div style={{ padding: '2.5rem', textAlign: 'center', color: '#64748B', background: '#F8FAFC', borderRadius: '8px', border: '1px dashed #CBD5E1', marginTop: '0.5rem' }}>
                  <p style={{ margin: '0 0 0.6rem 0', fontWeight: 600, fontSize: '0.88rem' }}>Henüz hiç sipariş kalemi bulunmuyor.</p>
                  <button onClick={handleAddRow} className="btn btn-primary" style={{ padding: '0.4rem 0.85rem', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                    <Plus size={14} /> Yeni Kalem Ekle
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

          {/* Right Side: PDF Document Preview Viewer (Only if PDF exists) */}
          {Boolean(pdfUrl) && (!isMobile || mobileTab === 'pdf') && (
            <div style={{
              width: isMobile ? '100%' : (splitRatio === '50-50' ? '50%' : splitRatio === '60-40' ? '40%' : '60%'),
              background: '#0F172A',
              display: 'flex',
              flexDirection: 'column',
              height: '100%',
              transition: 'width 0.2s ease',
              flex: isMobile ? 1 : 'initial'
            }}>
              <div style={{
                padding: '0.55rem 1rem',
                background: '#0B111E',
                borderBottom: '1px solid #1E293B',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontSize: '0.8rem',
                color: '#94A3B8',
                flexShrink: 0
              }}>
                <span style={{ fontWeight: 600, color: '#E2E8F0', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <FileText size={15} color="#3B82F6" /> Orijinal Belge PDF Canlı Önizleme
                </span>
                <a
                  href={pdfUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    color: '#60A5FA',
                    fontSize: '0.75rem',
                    textDecoration: 'none',
                    background: 'rgba(59, 130, 246, 0.12)',
                    padding: '3px 8px',
                    borderRadius: '4px',
                    border: '1px solid rgba(59, 130, 246, 0.3)'
                  }}
                >
                  <ExternalLink size={12} /> Yeni Sekmede Aç
                </a>
              </div>
              <iframe
                src={pdfUrl}
                title="PDF Preview"
                style={{ width: '100%', height: 'calc(100% - 38px)', border: 'none', flex: 1 }}
              />
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div style={{
          padding: isMobile ? '0.65rem 0.85rem' : '0.85rem 1.5rem',
          background: '#060910',
          borderTop: '1px solid var(--border-color)',
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          justifyContent: 'space-between',
          alignItems: isMobile ? 'stretch' : 'center',
          gap: isMobile ? '0.5rem' : '1rem',
          flexShrink: 0
        }}>
          <span style={{ fontSize: isMobile ? '0.72rem' : '0.8rem', color: 'var(--text-muted)', textAlign: isMobile ? 'center' : 'left' }}>
            ✓ Kontrol Edildi. Onaylandıktan sonra sipariş ortak havuza aktarılacak.
          </span>

          <div style={{ display: 'flex', gap: '0.5rem', width: isMobile ? '100%' : 'auto' }}>
            <button onClick={onClose} className="btn btn-secondary" style={{ flex: isMobile ? 1 : 'initial', padding: '0.5rem 0.85rem', fontSize: '0.8rem' }}>
              İptal / Taslak
            </button>
            <button onClick={handleSave} disabled={saving} className="btn btn-primary" style={{ flex: isMobile ? 2 : 'initial', padding: '0.5rem 0.85rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
              <CheckCircle size={15} /> {saving ? 'Kaydediliyor...' : 'Onayla ve Havuza Aktar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
