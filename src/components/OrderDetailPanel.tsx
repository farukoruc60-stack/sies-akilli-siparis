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
  PackageCheck,
  ArrowRight,
  X,
  FileCheck
} from 'lucide-react';
import { Order, OrderItem, OrderDocument, OrderStatusHistory, DispatchRecord } from '../types';
import { useAuth } from '../context/AuthContext';

interface OrderDetailPanelProps {
  order: Order | null;
  items: OrderItem[];
  documents: OrderDocument[];
  history: OrderStatusHistory[];
  dispatches?: DispatchRecord[];
  onRefresh: () => void;
  onUpdateOrder: (updatedItems: OrderItem[]) => Promise<void>;
  onStatusChange: (newStatus: string, notes: string) => Promise<void>;
}

export const OrderDetailPanel: React.FC<OrderDetailPanelProps> = ({
  order,
  items,
  documents,
  history,
  dispatches = [],
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

  // Detailed Sevkiyat Modal State
  const [dispatchModalOpen, setDispatchModalOpen] = useState(false);
  const [driverName, setDriverName] = useState('');
  const [vehiclePlate, setVehiclePlate] = useState('');
  const [waybillNumber, setWaybillNumber] = useState('');
  const [dispatchNotes, setDispatchNotes] = useState('');
  const [dispatchQuantities, setDispatchQuantities] = useState<{ [itemId: number]: number }>({});
  const [dispatchSubmitting, setDispatchSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // Excess Shipment Warning Modal State
  const [excessWarningOpen, setExcessWarningOpen] = useState(false);
  const [excessItemsList, setExcessItemsList] = useState<{
    itemId: number;
    code: string;
    name: string;
    remaining: number;
    dispatchQty: number;
    excessQty: number;
  }[]>([]);

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

    if (field === 'quantity' || field === 'unitPrice' || (field as string) === 'unit_price') {
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
        shippedQuantity: 0,
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

  // Open Sevkiyat Modal
  const handleOpenDispatchModal = () => {
    if (selectedItemIds.length === 0) {
      alert('Lütfen sevk edilecek kalemleri seçin!');
      return;
    }

    // Initialize quantities with remaining quantity per item
    const initialQtyMap: { [itemId: number]: number } = {};
    items.forEach((item, idx) => {
      const id = item.id || idx + 1;
      if (selectedItemIds.includes(id)) {
        const shipped = item.shippedQuantity || 0;
        const rem = Math.max(0, item.quantity - shipped);
        initialQtyMap[id] = rem > 0 ? rem : item.quantity;
      }
    });

    setDispatchQuantities(initialQtyMap);
    if (!waybillNumber) {
      setWaybillNumber(`IRS-2026-${Math.floor(1000 + Math.random() * 9000)}`);
    }
    setModalError(null);
    setDispatchModalOpen(true);
  };

  // Execute Dispatch Logic
  const handlePerformDispatch = async (forceExcessConfirm = false) => {
    setModalError(null);

    if (!driverName.trim() || !vehiclePlate.trim() || !waybillNumber.trim()) {
      setModalError('Lütfen Şoför Adı, Araç Plakası ve İrsaliye Numarasını eksiksiz girin!');
      return;
    }

    // Check for items where dispatch quantity > remaining quantity
    if (!forceExcessConfirm) {
      const excessList: typeof excessItemsList = [];
      selectedItemIds.forEach((id) => {
        const item = items.find((it, idx) => (it.id || idx + 1) === id);
        if (item) {
          const shipped = item.shippedQuantity || 0;
          const rem = Math.max(0, item.quantity - shipped);
          const dispatchQty = dispatchQuantities[id] || 0;
          if (dispatchQty > rem + 0.001) {
            excessList.push({
              itemId: id,
              code: item.customerProductCode || item.customer_product_code || `Kalem #${id}`,
              name: item.productName || item.product_name,
              remaining: rem,
              dispatchQty: dispatchQty,
              excessQty: dispatchQty - rem
            });
          }
        }
      });

      if (excessList.length > 0) {
        setExcessItemsList(excessList);
        setExcessWarningOpen(true);
        return;
      }
    }

    // Run Dispatch API call
    setDispatchSubmitting(true);
    try {
      const payloadDispatches = selectedItemIds.map(id => ({
        itemId: id,
        dispatchQuantity: dispatchQuantities[id] || 0
      }));

      const res = await fetch(`/api/orders/${order.id}/dispatch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          driverName: driverName.trim(),
          vehiclePlate: vehiclePlate.trim().toUpperCase(),
          waybillNumber: waybillNumber.trim(),
          notes: dispatchNotes.trim(),
          dispatches: payloadDispatches
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Sevkiyat kaydedilemedi');

      alert(`✓ İrsaliye No #${waybillNumber} ile ${selectedItemIds.length} kalem için parçalı sevkiyat başarıyla gerçekleştirildi!`);
      setDispatchModalOpen(false);
      setExcessWarningOpen(false);
      setSelectedItemIds([]);
      onRefresh();
    } catch (err: any) {
      setModalError(err.message || 'Sevkiyat hatası oluştu!');
    } finally {
      setDispatchSubmitting(false);
    }
  };

  // Batch Simple Status Update (Üretime al, Kaplamaya al vb.)
  const handleBatchItemStatusUpdate = async () => {
    if (selectedItemIds.length === 0) {
      alert('Lütfen işlem yapılacak kalemleri seçin!');
      return;
    }

    if (batchStatus === 'COMPLETED' || batchStatus === 'SHIPPING') {
      handleOpenDispatchModal();
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
          notes: `Seçilen ${selectedItemIds.length} kalem durumu ${batchStatus} olarak güncellendi.`
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
      case 'PARTIALLY_SHIPPED':
        return <span className="badge badge-new" style={{ fontSize: '0.7rem', background: 'rgba(245,158,11,0.2)', color: '#F59E0B', border: '1px solid #F59E0B' }}>PARÇA PARÇA SEVK EDİLDİ</span>;
      case 'COMPLETED':
      case 'SHIPPED':
        return <span className="badge badge-completed" style={{ fontSize: '0.7rem' }}>SEVK EDİLDİ (TAMAMLANDI)</span>;
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
      <div style={{ padding: '1.25rem 1.5rem', background: '#FFFFFF', borderBottom: '1px solid var(--border-color)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <h1 style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-primary)' }}>{order.customer_name}</h1>
              <span className="badge badge-approved" style={{ fontSize: '0.8rem' }}>
                <ShieldCheck size={14} /> SİP NO: {order.order_no}
              </span>
              <span style={{ fontSize: '0.75rem', background: '#E0F2FE', border: '1px solid #BAE6FD', padding: '0.2rem 0.5rem', borderRadius: '4px', color: '#0369A1', fontWeight: 600 }}>
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
                <Save size={16} /> {saving ? 'Kaydedilizce...' : 'Değişiklikleri Kaydet'}
              </button>
            ) : (
              <button onClick={handleStartEdit} className="btn btn-secondary">
                <Edit3 size={16} /> Düzenle
              </button>
            )}
          </div>
        </div>

        {conflictError && (
          <div style={{ background: '#FEE2E2', border: '1px solid #FCA5A5', color: '#DC2626', padding: '0.75rem 1rem', borderRadius: '6px', fontSize: '0.85rem', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <AlertTriangle size={18} /> {conflictError}
          </div>
        )}

        {/* Quick Meta Stats Bar */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.75rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
          <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', padding: '0.5rem 0.75rem', borderRadius: '6px' }}>
            <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.7rem' }}>SİPARİŞ TARİHİ</span>
            <strong style={{ color: 'var(--text-primary)' }}>{order.order_date ? new Date(order.order_date).toLocaleDateString('tr-TR') : '-'}</strong>
          </div>
          <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', padding: '0.5rem 0.75rem', borderRadius: '6px' }}>
            <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.7rem' }}>TESLİM TARİHİ</span>
            <strong style={{ color: 'var(--text-primary)' }}>{order.requested_delivery_date ? new Date(order.requested_delivery_date).toLocaleDateString('tr-TR') : 'Belirtilmedi'}</strong>
          </div>
          <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', padding: '0.5rem 0.75rem', borderRadius: '6px' }}>
            <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.7rem' }}>TOPLAM KALEM / TUTAR</span>
            <strong style={{ color: 'var(--primary)' }}>{items.length} Kalem ({totalOrderAmount.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} TRY)</strong>
          </div>
          <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', padding: '0.5rem 0.75rem', borderRadius: '6px' }}>
            <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.7rem' }}>OLUŞTURAN</span>
            <strong style={{ color: 'var(--text-primary)' }}>{order.creator_name || 'Sistem'}</strong>
          </div>
        </div>
      </div>

      {/* Tabs Bar */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', background: '#FFFFFF', padding: '0 1rem' }}>
        {[
          { id: 'summary', label: '1. Sipariş Özeti', icon: FileText },
          { id: 'items', label: `2. Sipariş Kalemleri (${items.length})`, icon: Layers },
          { id: 'documents', label: `3. Orijinal Belgeler (${documents.length})`, icon: ExternalLink },
          { id: 'production', label: '4. Üretim & Kaplama', icon: Factory },
          { id: 'shipping', label: `5. Sevkiyat (${dispatches.length})`, icon: Truck },
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
                  <strong>Sevk Edilen Kalemler:</strong> {items.filter(i => (i.shippedQuantity || 0) >= i.quantity).length} / {items.length} Kalem Tamamlandı
                </p>
                <p style={{ fontSize: '0.85rem' }}><strong>Toplam İrsaliye Sayısı:</strong> {dispatches.length} Adet Sevkiyat İrsaliyesi</p>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: SELECTABLE & PARTIALLY SHIPPABLE ORDER ITEMS TABLE WITH REMAINING QUANTITY */}
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
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '0.75rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <PackageCheck size={22} color="var(--primary)" />
                <div>
                  <h4 style={{ fontSize: '0.95rem', color: '#fff' }}>Parçalı Sevkiyat & Kalem Bazlı Miktar Takibi</h4>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    Seçilen Kalem Sayısı: <strong style={{ color: 'var(--primary)' }}>{selectedItemIds.length} Kalem</strong>
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <button
                  onClick={handleOpenDispatchModal}
                  disabled={selectedItemIds.length === 0}
                  className="btn btn-primary"
                  style={{ fontSize: '0.85rem', padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', background: selectedItemIds.length > 0 ? '#10B981' : undefined, border: selectedItemIds.length > 0 ? '1px solid #10B981' : undefined }}
                >
                  <Truck size={18} /> Seçilen Kalemleri Sevk Et (Şoför/Plaka/Miktar Gir)
                </button>

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
                </select>

                <button
                  onClick={handleBatchItemStatusUpdate}
                  disabled={batchUpdating || selectedItemIds.length === 0}
                  className="btn btn-secondary"
                  style={{ fontSize: '0.8rem', padding: '0.4rem 0.75rem' }}
                >
                  <ArrowRight size={14} /> Durum Değiştir
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
                    <th>Sipariş Miktarı</th>
                    <th>Giden Miktar</th>
                    <th>Kalan Miktar</th>
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
                    const shipped = parseFloat(String(item.shippedQuantity || 0));
                    const remaining = Math.max(0, qty - shipped);
                    const isExcess = shipped > qty;
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
                              style={{ width: '220px', background: 'rgba(0,0,0,0.5)', border: '1px solid var(--border-color)', color: '#fff', padding: '0.2rem', borderRadius: '4px' }}
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
                        <td>
                          <strong style={{ color: shipped > 0 ? '#10B981' : 'var(--text-muted)' }}>{shipped}</strong>
                        </td>
                        <td>
                          {isExcess ? (
                            <span style={{ color: '#F59E0B', fontWeight: 700, fontSize: '0.78rem' }}>
                              0 <span style={{ fontSize: '0.7rem', color: '#F87171' }}>(+{(shipped - qty).toFixed(1)} Fazla)</span>
                            </span>
                          ) : (
                            <strong style={{ color: remaining > 0 ? '#00E5FF' : '#9CA3AF' }}>{remaining}</strong>
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
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>SİES TS 822 Standartlarında İmalat Takibi</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: SHIPPING LOG & DISPATCH HISTORY */}
        {activeTab === 'shipping' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#fff' }}>Sevkiyat Geçmişi ve İrsaliye Kayıtları</h3>
              <button
                onClick={handleOpenDispatchModal}
                disabled={selectedItemIds.length === 0}
                className="btn btn-primary"
                style={{ fontSize: '0.85rem' }}
              >
                <Truck size={16} /> Yeni Sevkiyat Oluştur (Seçili Kalemlerle)
              </button>
            </div>

            {dispatches.length === 0 ? (
              <div style={{ background: 'var(--bg-card)', padding: '2rem', borderRadius: '8px', textAlign: 'center', color: 'var(--text-muted)', border: '1px dashed var(--border-color)' }}>
                <Truck size={36} style={{ marginBottom: '0.5rem', opacity: 0.4 }} />
                <p>Bu sipariş için henüz parçalı sevkiyat irsaliyesi kesilmemiştir.</p>
                <p style={{ fontSize: '0.8rem', marginTop: '0.25rem' }}>Kalemler sekmesinden sevk edilecek kalemleri seçip "Seçilen Kalemleri Sevk Et" düğmesine tıklayın.</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gap: '1rem' }}>
                {dispatches.map((disp) => (
                  <div key={disp.id} style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderLeft: '4px solid #10B981', padding: '1.25rem', borderRadius: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <span className="badge badge-completed" style={{ fontSize: '0.8rem' }}>
                            <FileCheck size={14} /> İRSALİYE NO: #{disp.waybill_number}
                          </span>
                          <span style={{ fontSize: '0.85rem', color: '#fff', fontWeight: 600 }}>
                            <User size={14} style={{ marginRight: '4px', display: 'inline' }} /> Şoför: {disp.driver_name}
                          </span>
                          <span style={{ fontSize: '0.85rem', color: 'var(--primary)', fontWeight: 600 }}>
                            Plaka: {disp.vehicle_plate}
                          </span>
                        </div>
                      </div>
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                        {new Date(disp.created_at).toLocaleString('tr-TR')}
                      </span>
                    </div>

                    <div style={{ background: 'rgba(0,0,0,0.3)', padding: '0.75rem 1rem', borderRadius: '6px', fontSize: '0.85rem', color: '#fff' }}>
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', display: 'block', marginBottom: '0.25rem' }}>SEVK EDİLEN KALEM:</span>
                      <strong>{disp.customer_product_code || '-'}</strong> - {disp.product_name} ➔ <strong style={{ color: '#10B981' }}>{disp.quantity_shipped} Sevk Edildi</strong>
                      {disp.notes && <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>Açıklama: {disp.notes}</div>}
                    </div>
                  </div>
                ))}
              </div>
            )}
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

      {/* ============================================================== */}
      {/* DETAILED SEVKİYAT GİRİŞİ MODAL DIALOG */}
      {/* ============================================================== */}
      {dispatchModalOpen && (
        <div className="modal-overlay" style={{ background: 'rgba(0,0,0,0.8)', zIndex: 1000 }}>
          <div className="modal-content" style={{ maxWidth: '650px', width: '90%', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Truck size={22} color="var(--primary)" />
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff' }}>Parçalı Sevkiyat İrsaliyesi Oluştur</h3>
              </div>
              <button onClick={() => setDispatchModalOpen(false)} style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            {modalError && (
              <div style={{ background: 'rgba(239,68,68,0.2)', border: '1px solid #EF4444', color: '#F87171', padding: '0.75rem', borderRadius: '6px', fontSize: '0.85rem', marginBottom: '1rem' }}>
                ⚠️ {modalError}
              </div>
            )}

            {/* Vehicle & Driver Info Form */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                  ŞOFÖR ADI SOYADI *
                </label>
                <input
                  type="text"
                  placeholder="Örn: Ahmet Yılmaz"
                  value={driverName}
                  onChange={(e) => setDriverName(e.target.value)}
                  style={{ width: '100%', background: 'rgba(0,0,0,0.5)', border: '1px solid var(--border-color)', color: '#fff', padding: '0.5rem 0.75rem', borderRadius: '6px', fontSize: '0.9rem' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                  ARAÇ PLAKASI *
                </label>
                <input
                  type="text"
                  placeholder="Örn: 34 ABC 123"
                  value={vehiclePlate}
                  onChange={(e) => setVehiclePlate(e.target.value.toUpperCase())}
                  style={{ width: '100%', background: 'rgba(0,0,0,0.5)', border: '1px solid var(--border-color)', color: '#fff', padding: '0.5rem 0.75rem', borderRadius: '6px', fontSize: '0.9rem' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                  İRSALİYE NUMARASI *
                </label>
                <input
                  type="text"
                  placeholder="Örn: IRS-2026-0045"
                  value={waybillNumber}
                  onChange={(e) => setWaybillNumber(e.target.value)}
                  style={{ width: '100%', background: 'rgba(0,0,0,0.5)', border: '1px solid var(--border-color)', color: '#fff', padding: '0.5rem 0.75rem', borderRadius: '6px', fontSize: '0.9rem' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                  SEVKİYAT NOTU (OPSİYONEL)
                </label>
                <input
                  type="text"
                  placeholder="Örn: 1. Parti Şantiye Teslimatı"
                  value={dispatchNotes}
                  onChange={(e) => setDispatchNotes(e.target.value)}
                  style={{ width: '100%', background: 'rgba(0,0,0,0.5)', border: '1px solid var(--border-color)', color: '#fff', padding: '0.5rem 0.75rem', borderRadius: '6px', fontSize: '0.9rem' }}
                />
              </div>
            </div>

            {/* Selected Items Dispatch Quantities List */}
            <h4 style={{ fontSize: '0.9rem', color: 'var(--primary)', marginBottom: '0.75rem' }}>
              Sevk Edilecek Kalem Miktarlarını Belirleyin ({selectedItemIds.length} Kalem Seçili)
            </h4>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem', maxHeight: '300px', overflowY: 'auto' }}>
              {selectedItemIds.map((id) => {
                const item = items.find((it, idx) => (it.id || idx + 1) === id);
                if (!item) return null;

                const qty = parseFloat(String(item.quantity)) || 0;
                const shipped = parseFloat(String(item.shippedQuantity || 0));
                const remaining = Math.max(0, qty - shipped);

                return (
                  <div key={id} style={{ background: 'var(--bg-card)', padding: '0.85rem 1rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                      <div>
                        <strong style={{ color: 'var(--primary)', fontSize: '0.85rem' }}>
                          {item.customerProductCode || item.customer_product_code || `Kalem #${id}`}
                        </strong>
                        <span style={{ fontSize: '0.85rem', color: '#fff', marginLeft: '0.5rem' }}>
                          {item.productName || item.product_name}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                        Sipariş: <strong>{qty} {item.unit}</strong> | Giden: <strong style={{ color: '#10B981' }}>{shipped}</strong> | Kalan: <strong style={{ color: '#00E5FF' }}>{remaining} {item.unit}</strong>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Bu Sevkiyatta Gönderilecek Miktar:</label>
                      <input
                        type="number"
                        step="0.1"
                        value={dispatchQuantities[id] ?? remaining}
                        onChange={(e) => setDispatchQuantities({
                          ...dispatchQuantities,
                          [id]: parseFloat(e.target.value) || 0
                        })}
                        style={{
                          width: '110px',
                          background: 'rgba(0,0,0,0.6)',
                          border: '1px solid var(--primary)',
                          color: '#00E5FF',
                          fontWeight: 700,
                          padding: '0.35rem 0.5rem',
                          borderRadius: '6px',
                          fontSize: '0.95rem'
                        }}
                      />
                      <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{item.unit || 'Adet'}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Modal Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button onClick={() => setDispatchModalOpen(false)} className="btn btn-secondary">
                İptal
              </button>
              <button
                onClick={() => handlePerformDispatch(false)}
                disabled={dispatchSubmitting}
                className="btn btn-primary"
                style={{ background: '#10B981', border: '1px solid #10B981', fontWeight: 700 }}
              >
                {dispatchSubmitting ? 'Sevkiyat Kaydediliyor...' : '✓ Sevkiyatı Onayla ve İrsaliyeyi Kes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* EXCESS QUANTITY CONFIRMATION WARNING MODAL */}
      {/* ============================================================== */}
      {excessWarningOpen && (
        <div className="modal-overlay" style={{ background: 'rgba(0,0,0,0.85)', zIndex: 1100 }}>
          <div className="modal-content" style={{ maxWidth: '540px', width: '90%', border: '2px solid #F59E0B' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem', color: '#F59E0B' }}>
              <AlertTriangle size={32} />
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#F59E0B' }}>⚠️ DİKKAT: FAZLA MİKTARDA SEVKİYAT UYARISI</h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Sipariş miktarından daha fazla teslimat yapılmak isteniyor.</p>
              </div>
            </div>

            <p style={{ fontSize: '0.88rem', color: '#fff', marginBottom: '1rem', lineHeight: 1.5 }}>
              Aşağıdaki kalem(ler) için girdiğiniz sevk miktarı, kalan sipariş miktarından <strong>FAZLANIZDIR</strong>:
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginBottom: '1.25rem', maxHeight: '200px', overflowY: 'auto' }}>
              {excessItemsList.map((exc) => (
                <div key={exc.itemId} style={{ background: 'rgba(245, 158, 11, 0.15)', border: '1px solid #F59E0B', padding: '0.75rem', borderRadius: '6px', fontSize: '0.85rem' }}>
                  <div style={{ fontWeight: 700, color: '#fff' }}>{exc.code} - {exc.name}</div>
                  <div style={{ color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                    Kalan Miktar: <strong>{exc.remaining}</strong> ➔ Girilen Sevk: <strong style={{ color: '#F59E0B' }}>{exc.dispatchQty}</strong>
                    <span style={{ color: '#EF4444', fontWeight: 700, marginLeft: '6px' }}>(+{exc.excessQty.toFixed(1)} Fazla Sevk)</span>
                  </div>
                </div>
              ))}
            </div>

            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
              Yine de bu miktar üzerinden sevkiyatı gerçekleştirmek istiyor musunuz?
            </p>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button onClick={() => setExcessWarningOpen(false)} className="btn btn-secondary">
                Düzelt / İptal Et
              </button>
              <button
                onClick={() => handlePerformDispatch(true)}
                disabled={dispatchSubmitting}
                className="btn btn-primary"
                style={{ background: '#F59E0B', border: '1px solid #F59E0B', color: '#000', fontWeight: 700 }}
              >
                {dispatchSubmitting ? 'İşleniyor...' : '⚠️ Evet, Fazla Sevkiyatı Onayla'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
