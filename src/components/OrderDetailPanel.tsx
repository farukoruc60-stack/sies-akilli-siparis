import React, { useState } from 'react';
import { 
  Building2, 
  Calendar, 
  Clock, 
  User, 
  FileText, 
  Download, 
  ExternalLink, 
  CheckCircle, 
  ShieldCheck, 
  AlertTriangle, 
  Save, 
  Edit3, 
  Layers, 
  History, 
  Truck, 
  Paintbrush, 
  Factory,
  RefreshCw,
  Plus
} from 'lucide-react';
import { Order, OrderItem, OrderDocument, OrderStatusHistory } from '../types';
import { useAuth } from '../context/AuthContext';

interface OrderDetailPanelProps {
  order: Order | null;
  items: OrderItem[];
  documents: OrderDocument[];
  history: OrderStatusHistory[];
  onRefresh: () => void;
  onUpdateOrder: (updatedItems: OrderItem[]) => Promise<void>;
  onStatusChange: (newStatus: string, notes: string) => Promise<void>;
}

export const OrderDetailPanel: React.FC<OrderDetailPanelProps> = ({
  order,
  items,
  documents,
  history,
  onRefresh,
  onUpdateOrder,
  onStatusChange
}) => {
  const [activeTab, setActiveTab] = useState<'summary' | 'items' | 'documents' | 'production' | 'shipping' | 'history'>('summary');
  const [editingItems, setEditingItems] = useState<OrderItem[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [statusNote, setStatusNote] = useState('');
  const [conflictError, setConflictError] = useState<string | null>(null);

  const { token } = useAuth();

  if (!order) {
    return (
      <div className="detail-panel" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
        <div style={{ textAlign: 'center' }}>
          <Layers size={48} style={{ marginBottom: '1rem', opacity: 0.3 }} />
          <h3>Lütfen incelemek istediğiniz siparişi sol listeden seçin</h3>
          <p style={{ fontSize: '0.85rem', marginTop: '0.5rem' }}>veya üstteki "+ Yeni Sipariş" butonuna tıklayarak belge yükleyin.</p>
        </div>
      </div>
    );
  }

  const handleStartEdit = () => {
    setEditingItems(JSON.parse(JSON.stringify(items)));
    setIsEditing(true);
    setConflictError(null);
  };

  const handleSaveEdit = async () => {
    setSaving(true);
    setConflictError(null);
    try {
      await onUpdateOrder(editingItems);
      setIsEditing(false);
    } catch (err: any) {
      setConflictError(err.message || 'Güncelleme hatası oluştu!');
    } finally {
      setSaving(false);
    }
  };

  const handleItemCellChange = (index: number, field: keyof OrderItem, val: any) => {
    const updated = [...editingItems];
    updated[index] = { ...updated[index], [field]: val };

    // Auto recalculate row total
    if (field === 'quantity' || field === 'unitPrice') {
      const q = parseFloat(String(updated[index].quantity)) || 0;
      const p = parseFloat(String(updated[index].unitPrice)) || 0;
      updated[index].lineTotal = q * p;
    }
    setEditingItems(updated);
  };

  const handleAddItemRow = () => {
    setEditingItems([
      ...editingItems,
      {
        lineNo: editingItems.length + 1,
        productName: 'Yeni Taşıyıcı Kanal Kalemi',
        widthMm: 100,
        heightMm: 50,
        thicknessMm: 1.5,
        material: 'Galvaniz',
        quantity: 10,
        unit: 'Boy',
        unitPrice: 150,
        currency: 'TRY',
        lineTotal: 1500
      }
    ]);
  };

  const handleStatusStep = async (newStatus: string) => {
    const note = prompt(`Sipariş durumunu "${newStatus}" olarak güncellemek istediğinize emin misiniz? Açıklama ekleyebilirsiniz:`, statusNote || 'Durum ilerletildi');
    if (note !== null) {
      await onStatusChange(newStatus, note);
    }
  };

  const totalOrderAmount = items.reduce((acc, it) => acc + (it.lineTotal || 0), 0);

  return (
    <div className="detail-panel">
      {/* Header Info Banner */}
      <div style={{ padding: '1.25rem 1.5rem', background: 'var(--bg-panel)', borderBottom: '1px solid var(--border-color)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <h1 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#fff' }}>{order.customer_name}</h1>
              <span className="badge badge-approved" style={{ fontSize: '0.8rem' }}>
                <ShieldCheck size={14} /> SİP NO: {order.order_no}
              </span>
              <span style={{ fontSize: '0.75rem', background: 'rgba(255,255,255,0.06)', padding: '0.2rem 0.5rem', borderRadius: '4px', color: 'var(--primary)' }}>
                Versiyon v{order.version} (Optimistic Locking Aktif)
              </span>
            </div>
            {order.customer_tax_number && (
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Building2 size={14} /> Vergi No: {order.customer_tax_number} | Müşteri Sipariş Ref: <strong>{order.customer_order_no || '-'}</strong>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button onClick={onRefresh} className="btn btn-secondary" title="Siparişi Yenile">
              <RefreshCw size={16} />
            </button>
            {isEditing ? (
              <button onClick={handleSaveEdit} disabled={saving} className="btn btn-primary">
                <Save size={16} /> {saving ? 'Kaydediliyor...' : 'Değişiklikleri Kaydet'}
              </button>
            ) : (
              <button onClick={handleStartEdit} className="btn btn-secondary">
                <Edit3 size={16} /> Düzenle
              </button>
            )}
          </div>
        </div>

        {conflictError && (
          <div style={{ background: 'rgba(239,68,68,0.2)', border: '1px solid #EF4444', color: '#F87171', padding: '0.75rem 1rem', borderRadius: '6px', fontSize: '0.85rem', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <AlertTriangle size={18} /> {conflictError}
          </div>
        )}

        {/* Quick Meta Stats Bar */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.75rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
          <div style={{ background: 'rgba(0,0,0,0.3)', padding: '0.5rem 0.75rem', borderRadius: '6px' }}>
            <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.7rem' }}>SİPARİŞ TARİHİ</span>
            <strong style={{ color: '#fff' }}>{order.order_date ? new Date(order.order_date).toLocaleDateString('tr-TR') : '-'}</strong>
          </div>
          <div style={{ background: 'rgba(0,0,0,0.3)', padding: '0.5rem 0.75rem', borderRadius: '6px' }}>
            <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.7rem' }}>TESLİM TARİHİ</span>
            <strong style={{ color: '#fff' }}>{order.requested_delivery_date ? new Date(order.requested_delivery_date).toLocaleDateString('tr-TR') : 'Belirtilmedi'}</strong>
          </div>
          <div style={{ background: 'rgba(0,0,0,0.3)', padding: '0.5rem 0.75rem', borderRadius: '6px' }}>
            <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.7rem' }}>TOPLAM KALEM / TUTAR</span>
            <strong style={{ color: 'var(--primary)' }}>{items.length} Kalem ({totalOrderAmount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} TRY)</strong>
          </div>
          <div style={{ background: 'rgba(0,0,0,0.3)', padding: '0.5rem 0.75rem', borderRadius: '6px' }}>
            <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.7rem' }}>OLUŞTURAN</span>
            <strong style={{ color: '#fff' }}>{order.creator_name || 'Sistem'}</strong>
          </div>
        </div>
      </div>

      {/* Tabs Bar */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', background: 'rgba(0,0,0,0.2)', padding: '0 1rem' }}>
        {[
          { id: 'summary', label: '1. Sipariş Özeti', icon: FileText },
          { id: 'items', label: `2. Sipariş Kalemleri (${items.length})`, icon: Layers },
          { id: 'documents', label: `3. Orijinal Belgeler (${documents.length})`, icon: ExternalLink },
          { id: 'production', label: '4. Üretim & Kaplama', icon: Factory },
          { id: 'shipping', label: '5. Sevkiyat', icon: Truck },
          { id: 'history', label: '6. İşlem Geçmişi', icon: History }
        ].map((t) => {
          const Icon = t.icon;
          const isActive = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id as any)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.75rem 1rem',
                border: 'none',
                borderBottom: isActive ? '2px solid var(--primary)' : '2px solid transparent',
                background: 'transparent',
                color: isActive ? 'var(--primary)' : 'var(--text-secondary)',
                fontWeight: isActive ? 600 : 400,
                fontSize: '0.85rem',
                cursor: 'pointer'
              }}
            >
              <Icon size={16} /> {t.label}
            </button>
          );
        })}
      </div>

      {/* Tab Contents */}
      <div style={{ padding: '1.5rem', flex: 1, overflowY: 'auto' }}>
        {/* TAB 1: SUMMARY */}
        {activeTab === 'summary' && (
          <div>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem', color: '#fff' }}>Sipariş Süreç İlerleme Hattı</h3>
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
              {[
                { status: 'REVIEW_PENDING', label: '1. Kontrol Bekliyor' },
                { status: 'APPROVED', label: '2. Onaylandı' },
                { status: 'IN_PRODUCTION', label: '3. Üretimde' },
                { status: 'COATING_PENDING', label: '4. Kaplama / Boyada' },
                { status: 'SHIPPING_PENDING', label: '5. Sevkiyatta' },
                { status: 'COMPLETED', label: '6. Tamamlandı' }
              ].map((st, idx) => {
                const isCurrent = order.status === st.status;
                return (
                  <button
                    key={st.status}
                    onClick={() => handleStatusStep(st.status)}
                    style={{
                      flex: 1,
                      minWidth: '130px',
                      padding: '0.75rem',
                      borderRadius: '8px',
                      border: isCurrent ? '1px solid var(--primary)' : '1px solid var(--border-color)',
                      background: isCurrent ? 'var(--primary-glow)' : 'var(--bg-card)',
                      color: isCurrent ? 'var(--primary)' : 'var(--text-secondary)',
                      fontSize: '0.8rem',
                      fontWeight: isCurrent ? 700 : 500,
                      cursor: 'pointer',
                      textAlign: 'center'
                    }}
                  >
                    {st.label}
                  </button>
                );
              })}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
              <div style={{ background: 'var(--bg-card)', padding: '1.25rem', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                <h4 style={{ color: 'var(--primary)', marginBottom: '0.75rem', fontSize: '0.9rem' }}>Müşteri & Adres Detayları</h4>
                <p style={{ fontSize: '0.85rem', marginBottom: '0.4rem' }}><strong>Unvan:</strong> {order.customer_name}</p>
                <p style={{ fontSize: '0.85rem', marginBottom: '0.4rem' }}><strong>Vergi Dairesi / No:</strong> {order.customer_tax_number || 'Belirtilmedi'}</p>
                <p style={{ fontSize: '0.85rem', marginBottom: '0.4rem' }}><strong>Teslimat Adresi:</strong> Sanayi Mah. 14. Cad No:88 Kocaeli</p>
                <p style={{ fontSize: '0.85rem' }}><strong>İletişim:</strong> 0262 333 4455 | siparis@musteri.com.tr</p>
              </div>

              <div style={{ background: 'var(--bg-card)', padding: '1.25rem', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                <h4 style={{ color: 'var(--primary)', marginBottom: '0.75rem', fontSize: '0.9rem' }}>İş Emri Özeti</h4>
                <p style={{ fontSize: '0.85rem', marginBottom: '0.4rem' }}><strong>Orijinal Belge SHA-256:</strong> <code style={{ fontSize: '0.75rem', color: '#60A5FA' }}>{documents[0]?.sha256Hash || 'b78a9c80e...'}</code></p>
                <p style={{ fontSize: '0.85rem', marginBottom: '0.4rem' }}><strong>Belge Arşiv Durumu:</strong> {documents[0]?.archiveStatus === 'ARCHIVED' ? <span style={{ color: '#10B981' }}>✓ Yandex Disk Arşivlendi</span> : <span style={{ color: '#FBBF24' }}>⏳ Arşiv İşleminde (Kuyrukta)</span>}</p>
                <p style={{ fontSize: '0.85rem' }}><strong>Eş Zamanlı Güncelleme Koruması:</strong> Aktif (v{order.version})</p>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: EDITABLE ORDER ITEMS TABLE */}
        {activeTab === 'items' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#fff' }}>Sipariş Satırları ve Ölçü Detayları</h3>
              {isEditing && (
                <button onClick={handleAddItemRow} className="btn btn-secondary" style={{ fontSize: '0.8rem' }}>
                  <Plus size={14} /> Yeni Satır Ekle
                </button>
              )}
            </div>

            <div className="table-container">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Müşteri Ürün Kodu</th>
                    <th>Ürün Tanımı / Model</th>
                    <th>Genişlik (mm)</th>
                    <th>Yükseklik (mm)</th>
                    <th>Kalınlık (mm)</th>
                    <th>Malzeme / Kaplama</th>
                    <th>Miktar</th>
                    <th>Birim</th>
                    <th>Birim Fiyat</th>
                    <th>Toplam Tutar</th>
                  </tr>
                </thead>
                <tbody>
                  {(isEditing ? editingItems : items).map((item, idx) => (
                    <tr key={idx}>
                      <td>{item.lineNo}</td>
                      <td>
                        {isEditing ? (
                          <input
                            type="text"
                            value={item.customerProductCode || ''}
                            onChange={(e) => handleItemCellChange(idx, 'customerProductCode', e.target.value)}
                            style={{ width: '90px', background: 'rgba(0,0,0,0.5)', border: '1px solid var(--border-color)', color: '#fff', padding: '0.2rem', borderRadius: '4px' }}
                          />
                        ) : (
                          item.customerProductCode || '-'
                        )}
                      </td>
                      <td>
                        {isEditing ? (
                          <input
                            type="text"
                            value={item.productName}
                            onChange={(e) => handleItemCellChange(idx, 'productName', e.target.value)}
                            style={{ width: '180px', background: 'rgba(0,0,0,0.5)', border: '1px solid var(--border-color)', color: '#fff', padding: '0.2rem', borderRadius: '4px' }}
                          />
                        ) : (
                          <strong>{item.productName}</strong>
                        )}
                      </td>
                      <td>
                        {isEditing ? (
                          <input
                            type="number"
                            value={item.widthMm || ''}
                            onChange={(e) => handleItemCellChange(idx, 'widthMm', parseFloat(e.target.value))}
                            style={{ width: '60px', background: 'rgba(0,0,0,0.5)', border: '1px solid var(--border-color)', color: '#fff', padding: '0.2rem', borderRadius: '4px' }}
                          />
                        ) : (
                          item.widthMm ? `${item.widthMm} mm` : '-'
                        )}
                      </td>
                      <td>
                        {isEditing ? (
                          <input
                            type="number"
                            value={item.heightMm || ''}
                            onChange={(e) => handleItemCellChange(idx, 'heightMm', parseFloat(e.target.value))}
                            style={{ width: '60px', background: 'rgba(0,0,0,0.5)', border: '1px solid var(--border-color)', color: '#fff', padding: '0.2rem', borderRadius: '4px' }}
                          />
                        ) : (
                          item.heightMm ? `${item.heightMm} mm` : '-'
                        )}
                      </td>
                      <td>
                        {isEditing ? (
                          <input
                            type="number"
                            step="0.1"
                            value={item.thicknessMm || ''}
                            onChange={(e) => handleItemCellChange(idx, 'thicknessMm', parseFloat(e.target.value))}
                            style={{ width: '60px', background: 'rgba(0,0,0,0.5)', border: '1px solid var(--border-color)', color: '#fff', padding: '0.2rem', borderRadius: '4px' }}
                          />
                        ) : (
                          item.thicknessMm ? `${item.thicknessMm} mm` : '-'
                        )}
                      </td>
                      <td>{item.material || 'Pre-Galvaniz'}</td>
                      <td>
                        {isEditing ? (
                          <input
                            type="number"
                            value={item.quantity}
                            onChange={(e) => handleItemCellChange(idx, 'quantity', parseFloat(e.target.value))}
                            style={{ width: '70px', background: 'rgba(0,0,0,0.5)', border: '1px solid var(--border-color)', color: '#fff', padding: '0.2rem', borderRadius: '4px' }}
                          />
                        ) : (
                          <strong>{item.quantity}</strong>
                        )}
                      </td>
                      <td>{item.unit || 'Adet'}</td>
                      <td>
                        {isEditing ? (
                          <input
                            type="number"
                            value={item.unitPrice}
                            onChange={(e) => handleItemCellChange(idx, 'unitPrice', parseFloat(e.target.value))}
                            style={{ width: '80px', background: 'rgba(0,0,0,0.5)', border: '1px solid var(--border-color)', color: '#fff', padding: '0.2rem', borderRadius: '4px' }}
                          />
                        ) : (
                          `${item.unitPrice} TRY`
                        )}
                      </td>
                      <td style={{ color: 'var(--primary)', fontWeight: 600 }}>
                        {(item.lineTotal || (item.quantity * item.unitPrice)).toLocaleString('tr-TR')} TRY
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: ORIGINAL DOCUMENTS & YANDEX ARCHIVE */}
        {activeTab === 'documents' && (
          <div>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem', color: '#fff' }}>Bağlı Sipariş Belgeleri ve Arşiv</h3>
            {documents.length === 0 ? (
              <p style={{ color: 'var(--text-muted)' }}>Bu sipariş için yüklenmiş henüz bir belge bulunmuyor.</p>
            ) : (
              <div style={{ display: 'grid', gap: '1rem' }}>
                {documents.map((doc) => (
                  <div key={doc.id} style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', padding: '1.25rem', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <FileText size={20} color="var(--primary)" />
                        <strong style={{ fontSize: '1rem', color: '#fff' }}>{doc.originalName}</strong>
                        <span className="badge badge-new" style={{ fontSize: '0.7rem' }}>{doc.fileType}</span>
                      </div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.4rem' }}>
                        SHA-256 Özeti: <code style={{ color: '#60A5FA' }}>{doc.sha256Hash}</code>
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                        Arşiv Durumu: <strong>{doc.archiveStatus}</strong> | Konum: {doc.yandexPath || '/AkilliSiparisTakip/OrijinalBelgeler'}
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <a
                        href={`/api/documents/${doc.id}/pdf?token=${token}`}
                        target="_blank"
                        rel="noreferrer"
                        className="btn btn-secondary"
                        style={{ textDecoration: 'none', fontSize: '0.8rem' }}
                      >
                        <ExternalLink size={14} /> PDF Önizle
                      </a>
                      <a
                        href={`/api/documents/${doc.id}/download?token=${token}`}
                        className="btn btn-primary"
                        style={{ textDecoration: 'none', fontSize: '0.8rem' }}
                      >
                        <Download size={14} /> İndir
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 4: PRODUCTION & COATING */}
        {activeTab === 'production' && (
          <div>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem', color: '#fff' }}>Üretim Hatları ve Kaplama / Boya İş Emri</h3>
            <div style={{ background: 'var(--bg-card)', padding: '1.5rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                <Factory size={28} color="var(--primary)" />
                <div>
                  <h4 style={{ color: '#fff' }}>Roll-Forming & Sac İşleme Hattı #2</h4>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Hedef Üretim Bitiş: 2 iş günü içinde</p>
                </div>
              </div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                Tüm sipariş kalemleri teknik toleranslara (±0.05mm sac kalınlığı) uygun şekilde imalata sevk edilmiştir. Kaplama türü: Pre-Galvaniz & Elektrostatik Toz Boya.
              </p>
            </div>
          </div>
        )}

        {/* TAB 5: SHIPPING */}
        {activeTab === 'shipping' && (
          <div>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem', color: '#fff' }}>Sevkiyat ve Lojistik Durumu</h3>
            <div style={{ background: 'var(--bg-card)', padding: '1.5rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                <Truck size={28} color="var(--success)" />
                <div>
                  <h4 style={{ color: '#fff' }}>Sevkiyat Planı: Sevk Bekliyor</h4>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Taşıyıcı Firma: Öz Lojistik | Araç Plaka: 41 ABC 789</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 6: HISTORY & AUDIT TIMELINE */}
        {activeTab === 'history' && (
          <div>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem', color: '#fff' }}>Sipariş Değişiklik ve İşlem Geçmişi</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {history.map((h) => (
                <div key={h.id} style={{ background: 'var(--bg-card)', padding: '0.85rem 1rem', borderRadius: '6px', borderLeft: '3px solid var(--primary)', fontSize: '0.85rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', fontSize: '0.75rem', marginBottom: '0.25rem' }}>
                    <span>İşlemi Yapan: <strong>{h.userName || 'Sistem'}</strong></span>
                    <span>{new Date(h.createdAt).toLocaleString('tr-TR')}</span>
                  </div>
                  <div style={{ color: '#fff' }}>{h.notes}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
