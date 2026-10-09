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
  Plus,
  CheckSquare,
  Square,
  PackageCheck,
  ArrowRight
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

  // Partial shipping & item selection state
  const [selectedItemIds, setSelectedItemIds] = useState<number[]>([]);
  const [batchStatus, setBatchStatus] = useState<string>('SHIPPING');
  const [batchUpdating, setBatchUpdating] = useState(false);

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

    if (field === 'quantity' || field === 'unitPrice' || field === 'unit_price') {
      const q = parseFloat(String(updated[index].quantity)) || 0;
      const p = parseFloat(String(updated[index].unitPrice ?? updated[index].unit_price)) || 0;
      updated[index].lineTotal = q * p;
    }
    setEditingItems(updated);
  };

  const handleAddItemRow = () => {
    setEditingItems([
      ...editingItems,
      {
        lineNo: editingItems.length + 1,
        productName: 'Yeni Taşıyıcı Eleman Kalemi',
        customerProductCode: `KOD-${editingItems.length + 1}`,
        material: 'Galvaniz',
        quantity: 10,
        unit: 'Boy',
        unitPrice: 150,
        currency: 'TRY',
        lineTotal: 1500,
        status: 'PENDING'
      }
    ]);
  };

  // Select item handlers
  const handleToggleSelectAll = () => {
    if (selectedItemIds.length === items.length) {
      setSelectedItemIds([]);
    } else {
      setSelectedItemIds(items.map((it, idx) => it.id || idx + 1));
    }
  };

  const handleToggleSelectItem = (id: number) => {
    if (selectedItemIds.includes(id)) {
      setSelectedItemIds(selectedItemIds.filter(i => i !== id));
    } else {
      setSelectedItemIds([...selectedItemIds, id]);
    }
  };

  // Batch Partial Shipping & Status Update
  const handleBatchItemStatusUpdate = async () => {
    if (selectedItemIds.length === 0) {
      alert('Lütfen parçalı sevk edilecek veya durumu değiştirilecek kalemleri seçin!');
      return;
    }

    setBatchUpdating(true);
    try {
      const res = await fetch(`/api/orders/${order.id}/items/status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          itemIds: selectedItemIds,
          newStatus: batchStatus,
          notes: `Seçilen ${selectedItemIds.length} kalem durumu ${batchStatus} olarak güncellendi (Parçalı Sevk).`
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Kalem durumu güncellenemedi');

      alert(`✓ Seçilen ${selectedItemIds.length} kalem başarıyla "${batchStatus}" durumuna geçirildi!`);
      setSelectedItemIds([]);
      onRefresh();
    } catch (err: any) {
      alert(`Hata: ${err.message}`);
    } finally {
      setBatchUpdating(false);
    }
  };

  const handleStatusStep = async (newStatus: string) => {
    const note = prompt(`Sipariş genel durumunu "${newStatus}" olarak güncellemek istediğinize emin misiniz? Açıklama ekleyebilirsiniz:`, statusNote || 'Durum ilerletildi');
    if (note !== null) {
      await onStatusChange(newStatus, note);
    }
  };

  const getItemStatusBadge = (st?: string) => {
    switch (st) {
      case 'IN_PRODUCTION':
        return <span className="badge badge-production" style={{ fontSize: '0.7rem' }}>ÜRETİMDE</span>;
      case 'COATING':
        return <span className="badge badge-pending" style={{ fontSize: '0.7rem' }}>KAPLAMADA</span>;
      case 'SHIPPING':
        return <span className="badge badge-new" style={{ fontSize: '0.7rem' }}>SEVKİYATTA</span>;
      case 'COMPLETED':
      case 'SHIPPED':
        return <span className="badge badge-completed" style={{ fontSize: '0.7rem' }}>SEVK EDİLDİ</span>;
      default:
        return <span className="badge badge-approved" style={{ fontSize: '0.7rem' }}>ONAYLI / BEKLEYEN</span>;
    }
  };

  const totalOrderAmount = items.reduce((acc, it) => {
    const qty = parseFloat(String(it.quantity)) || 0;
    const price = parseFloat(String(it.unitPrice ?? it.unit_price)) || 0;
    const total = parseFloat(String(it.lineTotal ?? it.line_total)) || (qty * price);
    return acc + total;
  }, 0);

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
            <strong style={{ color: 'var(--primary)' }}>{items.length} Kalem ({totalOrderAmount.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} TRY)</strong>
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
            <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem', color: '#fff' }}>Sipariş Genel Süreç Hattı</h3>
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
              {[
                { status: 'REVIEW_PENDING', label: '1. Kontrol Bekliyor' },
                { status: 'APPROVED', label: '2. Onaylandı' },
                { status: 'IN_PRODUCTION', label: '3. Üretimde' },
                { status: 'COATING_PENDING', label: '4. Kaplama / Boyada' },
                { status: 'SHIPPING_PENDING', label: '5. Sevkiyatta' },
                { status: 'COMPLETED', label: '6. Tamamlandı' }
              ].map((st) => {
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
                <p style={{ fontSize: '0.85rem', marginBottom: '0.4rem' }}><strong>Teslimat Adresi:</strong> PERPA - ŞİŞLİ / İSTANBUL</p>
                <p style={{ fontSize: '0.85rem' }}><strong>İletişim:</strong> 0505 008 25 62 | info@markaelektrik.com.tr</p>
              </div>

              <div style={{ background: 'var(--bg-card)', padding: '1.25rem', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                <h4 style={{ color: 'var(--primary)', marginBottom: '0.75rem', fontSize: '0.9rem' }}>İş Emri & Parçalı Sevk Özeti</h4>
                <p style={{ fontSize: '0.85rem', marginBottom: '0.4rem' }}><strong>Toplam Kalem Sayısı:</strong> {items.length} Kalem</p>
                <p style={{ fontSize: '0.85rem', marginBottom: '0.4rem' }}>
                  <strong>Sevk Edilen Kalemler:</strong> {items.filter(i => i.status === 'COMPLETED' || i.status === 'SHIPPED').length} / {items.length} Kalem
                </p>
                <p style={{ fontSize: '0.85rem' }}><strong>Eş Zamanlı Güncelleme Koruması:</strong> Aktif (v{order.version})</p>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: SELECTABLE & PARTIALLY SHIPPABLE ORDER ITEMS TABLE */}
        {activeTab === 'items' && (
          <div>
            {/* Batch Partial Shipping Action Bar */}
            <div style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              borderRadius: '8px',
              padding: '0.85rem 1.25rem',
              marginBottom: '1rem',
              display: 'flex',
              justify: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '0.75rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <PackageCheck size={20} color="var(--primary)" />
                <div>
                  <h4 style={{ fontSize: '0.9rem', color: '#fff' }}>Parçalı Sevkiyat & Kalem Bazlı Durum Takibi</h4>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    Seçilen Kalem Sayısı: <strong style={{ color: 'var(--primary)' }}>{selectedItemIds.length} Kalem</strong>
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <select
                  value={batchStatus}
                  onChange={(e) => setBatchStatus(e.target.value)}
                  style={{
                    background: 'rgba(0,0,0,0.5)',
                    color: '#fff',
                    border: '1px solid var(--border-color)',
                    padding: '0.4rem 0.75rem',
                    borderRadius: '6px',
                    fontSize: '0.85rem'
                  }}
                >
                  <option value="IN_PRODUCTION">Üretime Al (IN_PRODUCTION)</option>
                  <option value="COATING">Kaplama / Boyaya Sevk Et (COATING)</option>
                  <option value="SHIPPING">Sevkiyata Al (SHIPPING)</option>
                  <option value="COMPLETED">Parça Parça Sevk Et (COMPLETED)</option>
                </select>

                <button
                  onClick={handleBatchItemStatusUpdate}
                  disabled={batchUpdating || selectedItemIds.length === 0}
                  className="btn btn-primary"
                  style={{ fontSize: '0.8rem', padding: '0.4rem 0.85rem' }}
                >
                  <ArrowRight size={16} /> {batchUpdating ? 'Güncelleniyor...' : 'Seçilen Kalemleri Sevk Et / Durum Değiştir'}
                </button>

                {isEditing && (
                  <button onClick={handleAddItemRow} className="btn btn-secondary" style={{ fontSize: '0.8rem', padding: '0.4rem 0.75rem' }}>
                    <Plus size={14} /> Yeni Satır Ekle
                  </button>
                )}
              </div>
            </div>

            {/* Table */}
            <div className="table-container">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th style={{ width: '36px' }}>
                      <input
                        type="checkbox"
                        checked={selectedItemIds.length === items.length && items.length > 0}
                        onChange={handleToggleSelectAll}
                        title="Tümünü Seç / Seçimi Kaldır"
                      />
                    </th>
                    <th>#</th>
                    <th>Ürün Kodu</th>
                    <th>Ürün Açıklaması</th>
                    <th>Miktar</th>
                    <th>Birim</th>
                    <th>Birim Fiyat</th>
                    <th>Toplam Tutar</th>
                    <th>Kalem Durumu</th>
                  </tr>
                </thead>
                <tbody>
                  {(isEditing ? editingItems : items).map((item, idx) => {
                    const itemId = item.id || idx + 1;
                    const isSelected = selectedItemIds.includes(itemId);
                    const qty = parseFloat(String(item.quantity)) || 0;
                    const uPrice = parseFloat(String(item.unitPrice ?? item.unit_price)) || 0;
                    const lTotal = parseFloat(String(item.lineTotal ?? item.line_total)) || (qty * uPrice);

                    return (
                      <tr key={idx} style={{ background: isSelected ? 'rgba(0, 229, 255, 0.08)' : undefined }}>
                        <td>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleSelectItem(itemId)}
                          />
                        </td>
                        <td>{item.lineNo || item.line_no || idx + 1}</td>
                        <td>
                          {isEditing ? (
                            <input
                              type="text"
                              value={item.customerProductCode || item.customer_product_code || ''}
                              onChange={(e) => handleItemCellChange(idx, 'customerProductCode', e.target.value)}
                              style={{ width: '90px', background: 'rgba(0,0,0,0.5)', border: '1px solid var(--border-color)', color: '#fff', padding: '0.2rem', borderRadius: '4px' }}
                            />
                          ) : (
                            <strong style={{ color: 'var(--primary)' }}>{item.customerProductCode || item.customer_product_code || '-'}</strong>
                          )}
                        </td>
                        <td>
                          {isEditing ? (
                            <input
                              type="text"
                              value={item.productName || item.product_name || ''}
                              onChange={(e) => handleItemCellChange(idx, 'productName', e.target.value)}
                              style={{ width: '240px', background: 'rgba(0,0,0,0.5)', border: '1px solid var(--border-color)', color: '#fff', padding: '0.2rem', borderRadius: '4px' }}
                            />
                          ) : (
                            <strong>{item.productName || item.product_name}</strong>
                          )}
                        </td>
                        <td>
                          {isEditing ? (
                            <input
                              type="number"
                              step="0.1"
                              value={qty}
                              onChange={(e) => handleItemCellChange(idx, 'quantity', parseFloat(e.target.value))}
                              style={{ width: '70px', background: 'rgba(0,0,0,0.5)', border: '1px solid var(--border-color)', color: '#fff', padding: '0.2rem', borderRadius: '4px' }}
                            />
                          ) : (
                            <strong>{qty}</strong>
                          )}
                        </td>
                        <td>{item.unit || 'Adet'}</td>
                        <td>
                          {isEditing ? (
                            <input
                              type="number"
                              step="0.01"
                              value={uPrice}
                              onChange={(e) => handleItemCellChange(idx, 'unitPrice', parseFloat(e.target.value))}
                              style={{ width: '80px', background: 'rgba(0,0,0,0.5)', border: '1px solid var(--border-color)', color: '#fff', padding: '0.2rem', borderRadius: '4px' }}
                            />
                          ) : (
                            `${uPrice.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} TRY`
                          )}
                        </td>
                        <td style={{ color: 'var(--primary)', fontWeight: 600, whiteSpace: 'nowrap' }}>
                          {lTotal.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} TRY
                        </td>
                        <td>
                          {getItemStatusBadge(item.status)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: ORIGINAL DOCUMENTS */}
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
            <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem', color: '#fff' }}>Üretim ve Kaplama İş Emri Takibi</h3>
            <div style={{ background: 'var(--bg-card)', padding: '1.5rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                <Factory size={28} color="var(--primary)" />
                <div>
                  <h4 style={{ color: '#fff' }}>Sac İşleme & Roll-Forming Hattı</h4>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>SİES TS 822 Standartlarında İmalat</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: SHIPPING */}
        {activeTab === 'shipping' && (
          <div>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem', color: '#fff' }}>Sevkiyat ve Lojistik Planı</h3>
            <div style={{ background: 'var(--bg-card)', padding: '1.5rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                <Truck size={28} color="var(--success)" />
                <div>
                  <h4 style={{ color: '#fff' }}>Parçalı Sevkiyat Modülü Aktif</h4>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Kalemler seçilerek parça parça sevk edilebilir.</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 6: HISTORY */}
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
