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
  FileCheck,
  Printer,
  Tag,
  MessageSquare,
  Share2,
  Phone,
  ArrowLeft
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
  onUpdateOrder: (
    updatedItems: OrderItem[],
    updatedFields?: { customerOrderNo?: string; requestedDeliveryDate?: string }
  ) => Promise<void>;
  onStatusChange: (newStatus: string, notes: string) => Promise<void>;
  onBackToList?: () => void;
}

export const OrderDetailPanel: React.FC<OrderDetailPanelProps> = ({
  order,
  items,
  documents,
  history,
  dispatches = [],
  onRefresh,
  onUpdateOrder,
  onStatusChange,
  onBackToList
}) => {
  const [activeTab, setActiveTab] = useState<'summary' | 'items' | 'documents' | 'production' | 'shipping' | 'history'>('summary');
  const [editingItems, setEditingItems] = useState<OrderItem[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editCustomerOrderNo, setEditCustomerOrderNo] = useState('');
  const [editRequestedDeliveryDate, setEditRequestedDeliveryDate] = useState('');
  const [saving, setSaving] = useState(false);
  const [statusNote, setStatusNote] = useState('');
  const [conflictError, setConflictError] = useState<string | null>(null);

  // Partial shipping & item selection state
  const [selectedItemIds, setSelectedItemIds] = useState<number[]>([]);
  const [batchStatus, setBatchStatus] = useState<string>('SHIPPING');
  const [batchUpdating, setBatchUpdating] = useState(false);

  // Production Form Modal & Action State
  const [productionModalOpen, setProductionModalOpen] = useState(false);
  const [createdDocId, setCreatedDocId] = useState<number | null>(null);
  const [createdDocName, setCreatedDocName] = useState<string>('');
  const [sendProdSubmitting, setSendProdSubmitting] = useState(false);
  const [productionNotes, setProductionNotes] = useState('');

  // Shipping Label Modal & Action State
  const [labelModalOpen, setLabelModalOpen] = useState(false);
  const [selectedLabelSize, setSelectedLabelSize] = useState<'100x100' | '100x50'>('100x100');
  const [createdLabelDocId, setCreatedLabelDocId] = useState<number | null>(null);
  const [createdLabelDocName, setCreatedLabelDocName] = useState<string>('');
  const [labelSubmitting, setLabelSubmitting] = useState(false);

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

  // WhatsApp Share Modal State
  const [whatsappModalOpen, setWhatsappModalOpen] = useState(false);
  const [whatsappPhone, setWhatsappPhone] = useState('');
  const [whatsappCustomText, setWhatsappCustomText] = useState('');

  // Open WhatsApp Share Modal
  const handleOpenWhatsAppModal = () => {
    if (!order) return;

    const itemsSummary = (items || [])
      .slice(0, 5)
      .map((it, idx) => `  ${idx + 1}. ${it.customerProductCode || it.customer_product_code || ''} - ${it.productName || it.product_name} (${it.quantity} ${it.unit || 'Adet'})`)
      .join('\n');

    const moreText = (items || []).length > 5 ? `\n  ... ve ${(items || []).length - 5} kalem daha.` : '';

    const text = `📦 *SİES ELEKTRİK - SİPARİŞ İŞ EMRİ BİLGİSİ*

👤 *Müşteri:* ${order.customer_name}
📑 *Sipariş No:* ${order.order_no}
📋 *Müşteri Sip Ref:* ${order.customer_order_no || '-'}
📅 *Sipariş Tarihi:* ${formatDate(order.order_date)}
📅 *Teslim Tarihi:* ${formatDate(order.requested_delivery_date)}
📊 *Kalem Sayısı:* ${(items || []).length} Kalem (${totalOrderAmount.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} TRY)

📋 *Sipariş Kalem Özeti:*
${itemsSummary}${moreText}

📌 *Sipariş Durumu:* ${order.status}

🏢 *SİES ELEKTRİK MÜMESSİLLİK SAN. VE TİC. LTD. ŞTİ.*`;

    setWhatsappCustomText(text);
    setWhatsappPhone(order.customer_tax_number || '');
    setWhatsappModalOpen(true);
  };

  const handleSendWhatsApp = () => {
    const encodedText = encodeURIComponent(whatsappCustomText);
    const cleanPhone = whatsappPhone.replace(/\D/g, '');

    const url = cleanPhone
      ? `https://api.whatsapp.com/send?phone=${cleanPhone.startsWith('90') ? cleanPhone : '90' + cleanPhone}&text=${encodedText}`
      : `https://api.whatsapp.com/send?text=${encodedText}`;

    window.open(url, '_blank');
    setWhatsappModalOpen(false);
  };

  const { token } = useAuth();

  // Handle Send Selected Items to Production & Generate PDF Form
  const handleSendToProduction = async () => {
    if (selectedItemIds.length === 0) {
      alert('Lütfen üretime gönderilecek en az bir kalem seçin!');
      return;
    }

    setSendProdSubmitting(true);
    try {
      const res = await fetch(`/api/orders/${order!.id}/production-form`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          itemIds: selectedItemIds,
          notes: productionNotes.trim()
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Üretim formu oluşturulamadı');

      setCreatedDocId(data.documentId);
      setCreatedDocName(data.originalName);
      setProductionModalOpen(true);
      setSelectedItemIds([]);
      onRefresh();
    } catch (err: any) {
      alert(`Hata: ${err.message}`);
    } finally {
      setSendProdSubmitting(false);
    }
  };

  // Handle Generate Shipping Labels PDF (100x100mm or 100x50mm)
  const handleGenerateShippingLabels = async (labelSize: '100x100' | '100x50' = '100x100') => {
    if (selectedItemIds.length === 0) {
      alert('Lütfen etiket yazdırılacak en az bir kalem seçin!');
      return;
    }

    setLabelSubmitting(true);
    try {
      const res = await fetch(`/api/orders/${order!.id}/shipping-labels`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          itemIds: selectedItemIds,
          size: labelSize
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Sevkiyat etiketi oluşturulamadı');

      setSelectedLabelSize(labelSize);
      setCreatedLabelDocId(data.documentId);
      setCreatedLabelDocName(data.originalName);
      setLabelModalOpen(true);
      onRefresh();
    } catch (err: any) {
      alert(`Hata: ${err.message}`);
    } finally {
      setLabelSubmitting(false);
    }
  };

  // Group dispatches by Waybill Number
  const waybillGroups = React.useMemo(() => {
    const map = new Map<string, {
      waybill_number: string;
      driver_name: string;
      vehicle_plate: string;
      notes?: string;
      created_at: string;
      creator_name?: string;
      items: {
        item_id: number;
        code: string;
        name: string;
        quantity_shipped: number;
      }[];
    }>();

    (dispatches || []).forEach(d => {
      const key = d.waybill_number || `IRS-${d.id}`;
      if (!map.has(key)) {
        map.set(key, {
          waybill_number: d.waybill_number,
          driver_name: d.driver_name,
          vehicle_plate: d.vehicle_plate,
          notes: d.notes,
          created_at: d.created_at,
          creator_name: d.creator_name,
          items: []
        });
      }

      map.get(key)!.items.push({
        item_id: d.order_item_id,
        code: d.customer_product_code || '-',
        name: d.product_name || 'Ürün Kalemi',
        quantity_shipped: d.quantity_shipped
      });
    });

    return Array.from(map.values());
  }, [dispatches]);

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
    setEditCustomerOrderNo(order.customer_order_no || '');
    setEditRequestedDeliveryDate(order.requested_delivery_date || '');
    setIsEditing(true);
    setConflictError(null);
    setActiveTab('items');
  };

  const handleSaveEdit = async () => {
    setSaving(true);
    setConflictError(null);
    try {
      await onUpdateOrder(editingItems, {
        customerOrderNo: editCustomerOrderNo,
        requestedDeliveryDate: editRequestedDeliveryDate
      });
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

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'Belirtilmedi';
    if (typeof dateStr === 'string' && dateStr.includes('.')) return dateStr;
    try {
      const d = new Date(dateStr);
      return isNaN(d.getTime()) ? dateStr : d.toLocaleDateString('tr-TR');
    } catch (e) {
      return dateStr;
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
        return <span className="badge badge-new" style={{ fontSize: '0.7rem', background: '#FEF3C7', color: '#B45309', border: '1px solid #FDE68A' }}>PARÇA PARÇA SEVK EDİLDİ</span>;
      case 'COMPLETED':
      case 'SHIPPED':
        return <span className="badge badge-completed" style={{ fontSize: '0.7rem' }}>SEVK EDİLDİ (TAMAMLANDI)</span>;
      default:
        return <span className="badge badge-approved" style={{ fontSize: '0.7rem' }}>ONAYLI / BEKLEYEN</span>;
    }
  };

  const totalOrderAmount = (items || []).reduce((acc, it) => {
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

          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
            {onBackToList && (
              <button onClick={onBackToList} className="btn btn-secondary" title="Sipariş Havuzuna Dön">
                <ArrowLeft size={16} /> <span>Sipariş Listesi</span>
              </button>
            )}

            <button onClick={handleOpenWhatsAppModal} className="btn btn-whatsapp" title="Siparişi WhatsApp İle Gönder / Paylaş">
              <MessageSquare size={16} /> <span>WhatsApp'tan Gönder</span>
            </button>

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

        {isEditing && (
          <div style={{ background: '#EFF6FF', border: '1px solid #93C5FD', color: '#1E40AF', padding: '0.75rem 1rem', borderRadius: '8px', marginBottom: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.88rem', fontWeight: 600 }}>
              <Edit3 size={18} color="#2563EB" />
              <span>✏️ SİPARİŞ DÜZENLEME MODU AKTİF — Müşteri Sipariş Ref, Teslim Tarihi ve aşağıdaki Kalem Detaylarını değiştirebilirsiniz.</span>
            </div>
            <button onClick={() => setIsEditing(false)} className="btn btn-secondary" style={{ padding: '0.25rem 0.6rem', fontSize: '0.8rem' }}>
              İptal Et
            </button>
          </div>
        )}

        {conflictError && (
          <div style={{ background: '#FEE2E2', border: '1px solid #FCA5A5', color: '#DC2626', padding: '0.75rem 1rem', borderRadius: '6px', fontSize: '0.85rem', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <AlertTriangle size={18} /> {conflictError}
          </div>
        )}

        {/* Quick Meta Stats / Edit Controls Bar */}
        {isEditing ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.85rem', background: '#F8FAFC', padding: '0.85rem', borderRadius: '8px', border: '1px solid #CBD5E1' }}>
            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '0.25rem' }}>Müşteri Sipariş Ref / No:</label>
              <input
                type="text"
                value={editCustomerOrderNo}
                onChange={(e) => setEditCustomerOrderNo(e.target.value)}
                style={{ width: '100%', padding: '0.4rem 0.6rem', border: '1px solid #94A3B8', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 600, color: '#0F172A', background: '#FFFFFF' }}
              />
            </div>

            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '0.25rem' }}>İstenen Teslim Tarihi:</label>
              <input
                type="date"
                value={editRequestedDeliveryDate}
                onChange={(e) => setEditRequestedDeliveryDate(e.target.value)}
                style={{ width: '100%', padding: '0.4rem 0.6rem', border: '1px solid #94A3B8', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 600, color: '#0F172A', background: '#FFFFFF' }}
              />
            </div>

            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '0.25rem' }}>Sipariş Tutarı:</label>
              <div style={{ padding: '0.4rem 0.6rem', background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 700, color: 'var(--primary)' }}>
                {(isEditing ? editingItems : items).length} Kalem ({totalOrderAmount.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} TRY)
              </div>
            </div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.75rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', padding: '0.5rem 0.75rem', borderRadius: '6px' }}>
              <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.7rem' }}>SİPARİŞ TARİHİ</span>
              <strong style={{ color: 'var(--text-primary)' }}>{formatDate(order.order_date)}</strong>
            </div>
            <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', padding: '0.5rem 0.75rem', borderRadius: '6px' }}>
              <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.7rem' }}>TESLİM TARİHİ</span>
              <strong style={{ color: 'var(--text-primary)' }}>{formatDate(order.requested_delivery_date)}</strong>
            </div>
            <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', padding: '0.5rem 0.75rem', borderRadius: '6px' }}>
              <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.7rem' }}>TOPLAM KALEM / TUTAR</span>
              <strong style={{ color: 'var(--primary)' }}>{(items || []).length} Kalem ({totalOrderAmount.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} TRY)</strong>
            </div>
            <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', padding: '0.5rem 0.75rem', borderRadius: '6px' }}>
              <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.7rem' }}>OLUŞTURAN</span>
              <strong style={{ color: 'var(--text-primary)' }}>{order.creator_name || 'Sistem'}</strong>
            </div>
          </div>
        )}
      </div>

      {/* Tabs Bar */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', background: '#FFFFFF', padding: '0 1rem' }}>
        {[
          { id: 'summary', label: '1. Sipariş Özeti', icon: FileText },
          { id: 'items', label: `2. Sipariş Kalemleri (${(items || []).length})`, icon: Layers },
          { id: 'documents', label: `3. Sipariş Belgeleri (${(documents || []).length})`, icon: ExternalLink },
          { id: 'production', label: '4. Üretim & Kaplama', icon: Factory },
          { id: 'shipping', label: `5. Sevkiyat (${waybillGroups.length} İrsaliye)`, icon: Truck },
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
                <p style={{ fontSize: '0.85rem', marginBottom: '0.4rem' }}><strong>Toplam Kalem Sayısı:</strong> {(items || []).length} Kalem</p>
                <p style={{ fontSize: '0.85rem', marginBottom: '0.4rem' }}>
                  <strong>Sevk Edilen Kalemler:</strong> {(items || []).filter(i => (i.shippedQuantity || 0) >= i.quantity).length} / {(items || []).length} Kalem Tamamlandı
                </p>
                <p style={{ fontSize: '0.85rem' }}><strong>Toplam İrsaliye Sayısı:</strong> {waybillGroups.length} Adet Sevkiyat İrsaliyesi</p>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: SELECTABLE & PARTIALLY SHIPPABLE ORDER ITEMS TABLE WITH REMAINING QUANTITY */}
        {activeTab === 'items' && (
          <div>
            {/* Batch Partial Shipping & Production Action Bar */}
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
                  <h4 style={{ fontSize: '0.95rem', color: 'var(--text-primary)' }}>Parçalı Sevkiyat & Kalem Bazlı Miktar Takibi</h4>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    Seçilen Kalem Sayısı: <strong style={{ color: 'var(--primary)' }}>{selectedItemIds.length} Kalem</strong>
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                <button
                  onClick={handleSendToProduction}
                  disabled={selectedItemIds.length === 0 || sendProdSubmitting}
                  className="btn btn-primary"
                  style={{
                    fontSize: '0.85rem',
                    padding: '0.5rem 1rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    background: selectedItemIds.length > 0 ? '#0284C7' : undefined,
                    border: selectedItemIds.length > 0 ? '1px solid #0284C7' : undefined
                  }}
                >
                  <Factory size={18} /> {sendProdSubmitting ? 'Form Oluşturuluyor...' : 'Seçili Kalemleri Üretime Gönder (Form Oluştur)'}
                </button>

                <button
                  onClick={() => handleGenerateShippingLabels('100x100')}
                  disabled={selectedItemIds.length === 0 || labelSubmitting}
                  className="btn btn-primary"
                  style={{
                    fontSize: '0.85rem',
                    padding: '0.5rem 1rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    background: selectedItemIds.length > 0 ? '#8B5CF6' : undefined,
                    border: selectedItemIds.length > 0 ? '1px solid #8B5CF6' : undefined
                  }}
                >
                  <Tag size={18} /> {labelSubmitting ? 'Etiket Hazırlanıyor...' : 'Seçili Kalemlere Etiket Yazdır'}
                </button>

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

        {/* TAB 3: SIPARIS BELGELERI */}
        {activeTab === 'documents' && (
          <div>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem', color: 'var(--text-primary)' }}>
              Sipariş Belgeleri ve Arşiv (Orijinal Sipariş, Üretim Formları ve İrsaliyeler)
            </h3>
            {documents.length === 0 ? (
              <p style={{ color: 'var(--text-muted)' }}>Bu sipariş için yüklenmiş henüz bir belge bulunmuyor.</p>
            ) : (
              <div style={{ display: 'grid', gap: '1rem' }}>
                {documents.map((doc: any) => {
                  const docName = doc.originalName || doc.original_name || 'Belge.pdf';
                  const docType = doc.fileType || doc.file_type || '.pdf';
                  const docHash = doc.sha256Hash || doc.sha256_hash || '-';
                  const isProductionForm = docName.toLowerCase().includes('üretim') || docName.toLowerCase().includes('uretim');

                  return (
                    <div
                      key={doc.id}
                      style={{
                        background: '#FFFFFF',
                        border: isProductionForm ? '2px solid #0284C7' : '1px solid #E2E8F0',
                        padding: '1.25rem',
                        borderRadius: '10px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
                          <FileText size={20} color={isProductionForm ? '#0284C7' : 'var(--primary)'} />
                          <strong style={{ fontSize: '1rem', color: '#0F172A' }}>{docName}</strong>
                          <span
                            className="badge badge-new"
                            style={{
                              fontSize: '0.7rem',
                              background: isProductionForm ? '#E0F2FE' : undefined,
                              color: isProductionForm ? '#0369A1' : undefined
                            }}
                          >
                            {isProductionForm ? 'RESMİ ÜRETİM FORMU' : docType}
                          </span>
                        </div>
                        <div style={{ fontSize: '0.78rem', color: '#64748B', marginTop: '0.4rem' }}>
                          SHA-256 Özeti: <code style={{ color: '#0284C7', background: '#F1F5F9', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>{docHash}</code>
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <a
                          href={`/api/documents/${doc.id}/pdf?token=${token}`}
                          target="_blank"
                          rel="noreferrer"
                          className="btn btn-secondary"
                          style={{ textDecoration: 'none', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                        >
                          <ExternalLink size={14} /> PDF Önizle / Yazdır
                        </a>
                        <a
                          href={`/api/documents/${doc.id}/download?token=${token}`}
                          className="btn btn-primary"
                          style={{ textDecoration: 'none', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                        >
                          <Download size={14} /> İndir
                        </a>
                      </div>
                    </div>
                  );
                })}
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

        {/* TAB 5: SHIPPING LOG & DISPATCH HISTORY (GROUPED BY WAYBILL) */}
        {activeTab === 'shipping' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div>
                <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>Sevkiyat Geçmişi ve İrsaliye Kayıtları</h3>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Toplam {waybillGroups.length} Adet Sevkiyat İrsaliyesi Düzenlendi</span>
              </div>
              <button
                onClick={handleOpenDispatchModal}
                disabled={selectedItemIds.length === 0}
                className="btn btn-primary"
                style={{ fontSize: '0.85rem' }}
              >
                <Truck size={16} /> Yeni Sevkiyat Oluştur (Seçili Kalemlerle)
              </button>
            </div>

            {waybillGroups.length === 0 ? (
              <div style={{ background: 'var(--bg-card)', padding: '2rem', borderRadius: '8px', textAlign: 'center', color: 'var(--text-muted)', border: '1px dashed var(--border-color)' }}>
                <Truck size={36} style={{ marginBottom: '0.5rem', opacity: 0.4 }} />
                <p>Bu sipariş için henüz parçalı sevkiyat irsaliyesi kesilmemiştir.</p>
                <p style={{ fontSize: '0.8rem', marginTop: '0.25rem' }}>Kalemler sekmesinden sevk edilecek kalemleri seçip "Seçilen Kalemleri Sevk Et" düğmesine tıklayın.</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gap: '1.25rem' }}>
                {waybillGroups.map((group, idx) => (
                  <div key={group.waybill_number || idx} style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderLeft: '5px solid #10B981', padding: '1.25rem', borderRadius: '10px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                        <span className="badge badge-completed" style={{ fontSize: '0.85rem', fontWeight: 700, padding: '0.35rem 0.65rem' }}>
                          <FileCheck size={16} /> İRSALİYE NO: #{group.waybill_number}
                        </span>
                        {group.vehicle_plate && (
                          <span style={{ fontSize: '0.85rem', color: '#0284C7', fontWeight: 600, background: '#E0F2FE', border: '1px solid #BAE6FD', padding: '0.25rem 0.6rem', borderRadius: '6px' }}>
                            Plaka: {group.vehicle_plate}
                          </span>
                        )}
                        {group.driver_name && (
                          <span style={{ fontSize: '0.85rem', color: '#334155', fontWeight: 600 }}>
                            <User size={14} style={{ marginRight: '4px', display: 'inline', verticalAlign: 'middle' }} /> Şoför: {group.driver_name}
                          </span>
                        )}
                        <span style={{ fontSize: '0.8rem', background: '#DCFCE7', color: '#15803D', border: '1px solid #BBF7D0', padding: '0.2rem 0.6rem', borderRadius: '6px', fontWeight: 600 }}>
                          {group.items.length} Kalem Sevk Edildi
                        </span>
                      </div>
                      <span style={{ fontSize: '0.8rem', color: '#64748B', fontWeight: 500 }}>
                        {new Date(group.created_at).toLocaleString('tr-TR')}
                      </span>
                    </div>

                    {/* Table of items in this waybill */}
                    <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '8px', overflow: 'hidden' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                        <thead>
                          <tr style={{ background: '#F1F5F9', borderBottom: '1px solid #E2E8F0', textAlign: 'left', color: '#475569', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                            <th style={{ padding: '0.6rem 0.75rem', width: '40px' }}>#</th>
                            <th style={{ padding: '0.6rem 0.75rem', width: '160px' }}>Ürün Kodu</th>
                            <th style={{ padding: '0.6rem 0.75rem' }}>Ürün Açıklaması</th>
                            <th style={{ padding: '0.6rem 0.75rem', textAlign: 'right', width: '150px' }}>Sevk Miktarı</th>
                          </tr>
                        </thead>
                        <tbody>
                          {group.items.map((item, itemIdx) => (
                            <tr key={itemIdx} style={{ borderBottom: itemIdx < group.items.length - 1 ? '1px solid #E2E8F0' : 'none', background: itemIdx % 2 === 0 ? '#FFFFFF' : '#F8FAFC' }}>
                              <td style={{ padding: '0.65rem 0.75rem', color: '#94A3B8', fontWeight: 600 }}>{itemIdx + 1}</td>
                              <td style={{ padding: '0.65rem 0.75rem', fontWeight: 700, color: '#0284C7' }}>{item.code}</td>
                              <td style={{ padding: '0.65rem 0.75rem', color: '#1E293B', fontWeight: 500 }}>{item.name}</td>
                              <td style={{ padding: '0.65rem 0.75rem', textAlign: 'right', fontWeight: 700, color: '#059669' }}>
                                {item.quantity_shipped} Sevk Edildi
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {group.notes && (
                        <div style={{ padding: '0.6rem 0.75rem', background: '#FFFBEB', borderTop: '1px solid #FEF3C7', fontSize: '0.8rem', color: '#B45309' }}>
                          <strong>Açıklama / Not:</strong> {group.notes}
                        </div>
                      )}
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
            <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem', color: 'var(--text-primary)' }}>Sipariş Değişiklik ve İşlem Geçmişi</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {history.map((h) => (
                <div key={h.id} style={{ background: 'var(--bg-card)', padding: '0.85rem 1rem', borderRadius: '6px', borderLeft: '3px solid var(--primary)', fontSize: '0.85rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', fontSize: '0.75rem', marginBottom: '0.25rem' }}>
                    <span>İşlemi Yapan: <strong>{h.userName || 'Sistem'}</strong></span>
                    <span>{new Date(h.createdAt).toLocaleString('tr-TR')}</span>
                  </div>
                  <div style={{ color: 'var(--text-primary)' }}>{h.notes}</div>
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
        <div className="modal-overlay" style={{ background: 'rgba(15,23,42,0.6)', zIndex: 1000 }}>
          <div className="modal-content" style={{ maxWidth: '680px', width: '90%', maxHeight: '90vh', overflowY: 'auto', background: '#FFFFFF', color: '#0F172A', border: '1px solid #CBD5E1', padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid #E2E8F0', paddingBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Truck size={22} color="var(--primary)" />
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0F172A' }}>Parçalı Sevkiyat İrsaliyesi Oluştur</h3>
              </div>
              <button onClick={() => setDispatchModalOpen(false)} style={{ background: 'transparent', border: 'none', color: '#64748B', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            {modalError && (
              <div style={{ background: '#FEE2E2', border: '1px solid #FCA5A5', color: '#DC2626', padding: '0.75rem', borderRadius: '6px', fontSize: '0.85rem', marginBottom: '1rem' }}>
                ⚠️ {modalError}
              </div>
            )}

            {/* Vehicle & Driver Info Form */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', color: '#64748B', fontWeight: 600, marginBottom: '0.35rem' }}>
                  ŞOFÖR ADI SOYADI *
                </label>
                <input
                  type="text"
                  placeholder="Örn: Ahmet Yılmaz"
                  value={driverName}
                  onChange={(e) => setDriverName(e.target.value)}
                  style={{ width: '100%', background: '#F8FAFC', border: '1px solid #CBD5E1', color: '#0F172A', padding: '0.5rem 0.75rem', borderRadius: '6px', fontSize: '0.9rem' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', color: '#64748B', fontWeight: 600, marginBottom: '0.35rem' }}>
                  ARAÇ PLAKASI *
                </label>
                <input
                  type="text"
                  placeholder="Örn: 34 ABC 123"
                  value={vehiclePlate}
                  onChange={(e) => setVehiclePlate(e.target.value.toUpperCase())}
                  style={{ width: '100%', background: '#F8FAFC', border: '1px solid #CBD5E1', color: '#0F172A', padding: '0.5rem 0.75rem', borderRadius: '6px', fontSize: '0.9rem' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', color: '#64748B', fontWeight: 600, marginBottom: '0.35rem' }}>
                  İRSALİYE NUMARASI *
                </label>
                <input
                  type="text"
                  placeholder="Örn: IRS-2026-0045"
                  value={waybillNumber}
                  onChange={(e) => setWaybillNumber(e.target.value)}
                  style={{ width: '100%', background: '#F8FAFC', border: '1px solid #CBD5E1', color: '#0F172A', padding: '0.5rem 0.75rem', borderRadius: '6px', fontSize: '0.9rem' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', color: '#64748B', fontWeight: 600, marginBottom: '0.35rem' }}>
                  SEVKİYAT NOTU (OPSİYONEL)
                </label>
                <input
                  type="text"
                  placeholder="Örn: 1. Parti Şantiye Teslimatı"
                  value={dispatchNotes}
                  onChange={(e) => setDispatchNotes(e.target.value)}
                  style={{ width: '100%', background: '#F8FAFC', border: '1px solid #CBD5E1', color: '#0F172A', padding: '0.5rem 0.75rem', borderRadius: '6px', fontSize: '0.9rem' }}
                />
              </div>
            </div>

            {/* Selected Items Dispatch Quantities List */}
            <h4 style={{ fontSize: '0.9rem', color: '#0284C7', marginBottom: '0.75rem', fontWeight: 700 }}>
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
                  <div key={id} style={{ background: '#F8FAFC', padding: '0.85rem 1rem', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                      <div>
                        <strong style={{ color: '#0284C7', fontSize: '0.85rem' }}>
                          {item.customerProductCode || item.customer_product_code || `Kalem #${id}`}
                        </strong>
                        <span style={{ fontSize: '0.85rem', color: '#1E293B', marginLeft: '0.5rem', fontWeight: 600 }}>
                          {item.productName || item.product_name}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.78rem', color: '#64748B' }}>
                        Sipariş: <strong>{qty} {item.unit}</strong> | Giden: <strong style={{ color: '#059669' }}>{shipped}</strong> | Kalan: <strong style={{ color: '#0284C7' }}>{remaining} {item.unit}</strong>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <label style={{ fontSize: '0.8rem', color: '#475569' }}>Bu Sevkiyatta Gönderilecek Miktar:</label>
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
                          background: '#FFFFFF',
                          border: '1px solid #0284C7',
                          color: '#0284C7',
                          fontWeight: 700,
                          padding: '0.35rem 0.5rem',
                          borderRadius: '6px',
                          fontSize: '0.95rem'
                        }}
                      />
                      <span style={{ fontSize: '0.85rem', color: '#64748B' }}>{item.unit || 'Adet'}</span>
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
        <div className="modal-overlay" style={{ background: 'rgba(15,23,42,0.7)', zIndex: 1100 }}>
          <div className="modal-content" style={{ maxWidth: '540px', width: '90%', border: '2px solid #F59E0B', background: '#FFFFFF', color: '#0F172A', padding: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem', color: '#D97706' }}>
              <AlertTriangle size={32} />
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#D97706' }}>⚠️ DİKKAT: FAZLA MİKTARDA SEVKİYAT UYARISI</h3>
                <p style={{ fontSize: '0.8rem', color: '#64748B' }}>Sipariş miktarından daha fazla teslimat yapılmak isteniyor.</p>
              </div>
            </div>

            <p style={{ fontSize: '0.88rem', color: '#1E293B', marginBottom: '1rem', lineHeight: 1.5 }}>
              Aşağıdaki kalem(ler) için girdiğiniz sevk miktarı, kalan sipariş miktarından <strong>FAZLANIZDIR</strong>:
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginBottom: '1.25rem', maxHeight: '200px', overflowY: 'auto' }}>
              {excessItemsList.map((exc) => (
                <div key={exc.itemId} style={{ background: '#FEF3C7', border: '1px solid #FDE68A', padding: '0.75rem', borderRadius: '6px', fontSize: '0.85rem' }}>
                  <div style={{ fontWeight: 700, color: '#92400E' }}>{exc.code} - {exc.name}</div>
                  <div style={{ color: '#78350F', marginTop: '0.25rem' }}>
                    Kalan Miktar: <strong>{exc.remaining}</strong> ➔ Girilen Sevk: <strong style={{ color: '#D97706' }}>{exc.dispatchQty}</strong>
                    <span style={{ color: '#DC2626', fontWeight: 700, marginLeft: '6px' }}>(+{exc.excessQty.toFixed(1)} Fazla Sevk)</span>
                  </div>
                </div>
              ))}
            </div>

            <p style={{ fontSize: '0.85rem', color: '#64748B', marginBottom: '1.25rem' }}>
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

      {/* ============================================================== */}
      {/* CREATED PRODUCTION FORM PDF PRINT / DOWNLOAD MODAL */}
      {/* ============================================================== */}
      {productionModalOpen && createdDocId && (
        <div className="modal-overlay" style={{ background: 'rgba(15,23,42,0.6)', zIndex: 1200 }}>
          <div className="modal-content" style={{ maxWidth: '880px', width: '92%', height: '88vh', display: 'flex', flexDirection: 'column', background: '#FFFFFF', color: '#0F172A', border: '1px solid #CBD5E1', borderRadius: '12px', padding: '1.25rem', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)' }}>
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', paddingBottom: '0.75rem', borderBottom: '1px solid #E2E8F0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ background: '#E0F2FE', padding: '0.5rem', borderRadius: '8px', color: '#0284C7', display: 'flex' }}>
                  <Factory size={24} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#0F172A', margin: 0 }}>✓ Resmi Üretim İş Emri Formu Oluşturuldu</h3>
                  <span style={{ fontSize: '0.82rem', color: '#64748B' }}>{createdDocName}</span>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <a
                  href={`/api/documents/${createdDocId}/download?token=${token}`}
                  download
                  className="btn btn-primary"
                  style={{ fontSize: '0.85rem', padding: '0.45rem 0.9rem', display: 'flex', alignItems: 'center', gap: '0.4rem', textDecoration: 'none', background: '#10B981', border: '1px solid #10B981', fontWeight: 600 }}
                >
                  <Download size={16} /> İndir
                </a>

                <button
                  onClick={() => {
                    const iframe = document.getElementById('prodFormIframe') as HTMLIFrameElement;
                    if (iframe && iframe.contentWindow) {
                      iframe.contentWindow.print();
                    } else {
                      window.open(`/api/documents/${createdDocId}/pdf?token=${token}`, '_blank');
                    }
                  }}
                  className="btn btn-primary"
                  style={{ fontSize: '0.85rem', padding: '0.45rem 0.9rem', display: 'flex', alignItems: 'center', gap: '0.4rem', background: '#0284C7', border: '1px solid #0284C7', fontWeight: 600 }}
                >
                  <Printer size={16} /> Yazdır
                </button>

                <button
                  onClick={() => setProductionModalOpen(false)}
                  style={{ background: '#F1F5F9', border: '1px solid #CBD5E1', color: '#64748B', borderRadius: '6px', padding: '0.45rem', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                  title="Kapat"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* PDF Iframe Viewer */}
            <div style={{ flex: 1, background: '#F8FAFC', borderRadius: '8px', overflow: 'hidden', border: '1px solid #E2E8F0' }}>
              <iframe
                id="prodFormIframe"
                src={`/api/documents/${createdDocId}/pdf?token=${token}`}
                style={{ width: '100%', height: '100%', border: 'none' }}
                title="Üretim Formu Önizleme"
              />
            </div>

            {/* Modal Footer Info */}
            <div style={{ marginTop: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', color: '#64748B' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <FileCheck size={16} color="#0284C7" />
                Bu belge otomatik olarak <strong>"3. Sipariş Belgeleri"</strong> sekmesine kaydedildi.
              </span>
              <button onClick={() => setProductionModalOpen(false)} className="btn btn-secondary" style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem' }}>
                Kapat
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* CREATED SHIPPING LABEL PDF PRINT / DOWNLOAD MODAL */}
      {/* ============================================================== */}
      {labelModalOpen && createdLabelDocId && (
        <div className="modal-overlay" style={{ background: 'rgba(15,23,42,0.6)', zIndex: 1200 }}>
          <div className="modal-content" style={{ maxWidth: '880px', width: '92%', height: '88vh', display: 'flex', flexDirection: 'column', background: '#FFFFFF', color: '#0F172A', border: '1px solid #CBD5E1', borderRadius: '12px', padding: '1.25rem', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)' }}>
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', paddingBottom: '0.75rem', borderBottom: '1px solid #E2E8F0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ background: '#F3E8FF', padding: '0.5rem', borderRadius: '8px', color: '#8B5CF6', display: 'flex' }}>
                  <Tag size={24} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#0F172A', margin: 0 }}>✓ Sevkiyat Etiketi Hazırlandı</h3>
                  <span style={{ fontSize: '0.82rem', color: '#64748B' }}>{createdLabelDocName}</span>
                </div>
              </div>

              {/* Label Size Toggle Buttons & Actions */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div style={{ display: 'flex', background: '#F1F5F9', padding: '0.2rem', borderRadius: '8px', border: '1px solid #CBD5E1' }}>
                  <button
                    onClick={() => handleGenerateShippingLabels('100x100')}
                    style={{
                      padding: '0.35rem 0.75rem',
                      borderRadius: '6px',
                      border: 'none',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      background: selectedLabelSize === '100x100' ? '#8B5CF6' : 'transparent',
                      color: selectedLabelSize === '100x100' ? '#FFFFFF' : '#475569'
                    }}
                  >
                    100mm x 100mm (Kare)
                  </button>
                  <button
                    onClick={() => handleGenerateShippingLabels('100x50')}
                    style={{
                      padding: '0.35rem 0.75rem',
                      borderRadius: '6px',
                      border: 'none',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      background: selectedLabelSize === '100x50' ? '#8B5CF6' : 'transparent',
                      color: selectedLabelSize === '100x50' ? '#FFFFFF' : '#475569'
                    }}
                  >
                    100mm x 50mm (Standart)
                  </button>
                </div>

                <a
                  href={`/api/documents/${createdLabelDocId}/download?token=${token}`}
                  download
                  className="btn btn-primary"
                  style={{ fontSize: '0.85rem', padding: '0.45rem 0.9rem', display: 'flex', alignItems: 'center', gap: '0.4rem', textDecoration: 'none', background: '#10B981', border: '1px solid #10B981', fontWeight: 600 }}
                >
                  <Download size={16} /> İndir
                </a>

                <button
                  onClick={() => {
                    const iframe = document.getElementById('labelPdfIframe') as HTMLIFrameElement;
                    if (iframe && iframe.contentWindow) {
                      iframe.contentWindow.print();
                    } else {
                      window.open(`/api/documents/${createdLabelDocId}/pdf?token=${token}`, '_blank');
                    }
                  }}
                  className="btn btn-primary"
                  style={{ fontSize: '0.85rem', padding: '0.45rem 0.9rem', display: 'flex', alignItems: 'center', gap: '0.4rem', background: '#8B5CF6', border: '1px solid #8B5CF6', fontWeight: 600 }}
                >
                  <Printer size={16} /> Etiket Yazdır
                </button>

                <button
                  onClick={() => setLabelModalOpen(false)}
                  style={{ background: '#F1F5F9', border: '1px solid #CBD5E1', color: '#64748B', borderRadius: '6px', padding: '0.45rem', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                  title="Kapat"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* PDF Iframe Viewer */}
            <div style={{ flex: 1, background: '#F8FAFC', borderRadius: '8px', overflow: 'hidden', border: '1px solid #E2E8F0' }}>
              <iframe
                id="labelPdfIframe"
                src={`/api/documents/${createdLabelDocId}/pdf?token=${token}`}
                style={{ width: '100%', height: '100%', border: 'none' }}
                title="Sevkiyat Etiketi Önizleme"
              />
            </div>

            {/* Modal Footer Info */}
            <div style={{ marginTop: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', color: '#64748B' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <FileCheck size={16} color="#8B5CF6" />
                Bu etiket belgesi otomatik olarak <strong>"3. Sipariş Belgeleri"</strong> sekmesine kaydedildi.
              </span>
              <button onClick={() => setLabelModalOpen(false)} className="btn btn-secondary" style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem' }}>
                Kapat
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* WHATSAPP DIRECT SHARE DIALOG MODAL */}
      {/* ============================================================== */}
      {whatsappModalOpen && (
        <div className="modal-overlay" style={{ background: 'rgba(15,23,42,0.6)', zIndex: 1300 }}>
          <div className="modal-content" style={{ maxWidth: '640px', width: '92%', height: 'auto', maxHeight: '90vh', background: '#FFFFFF', borderRadius: '16px', padding: '1.5rem', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', paddingBottom: '0.75rem', borderBottom: '1px solid #E2E8F0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ background: '#DCFCE7', padding: '0.6rem', borderRadius: '10px', color: '#16A34A', display: 'flex' }}>
                  <MessageSquare size={24} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#0F172A', margin: 0 }}>Siparişi WhatsApp ile Paylaş</h3>
                  <span style={{ fontSize: '0.82rem', color: '#64748B' }}>PC & Mobil Uyumlu Anlık WhatsApp Gönderimi</span>
                </div>
              </div>

              <button onClick={() => setWhatsappModalOpen(false)} style={{ background: '#F1F5F9', border: '1px solid #CBD5E1', color: '#64748B', borderRadius: '6px', padding: '0.45rem', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>

            {/* Phone Number Input */}
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '0.35rem' }}>
                ALICI WHATSAPP TELEFON NUMARASI (Opsiyonel):
              </label>
              <div style={{ position: 'relative' }}>
                <Phone size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
                <input
                  type="text"
                  placeholder="ör. 0532 123 45 67 (Boş bırakırsanız WhatsApp içinde kişi seçersiniz)"
                  value={whatsappPhone}
                  onChange={(e) => setWhatsappPhone(e.target.value)}
                  style={{ width: '100%', padding: '0.55rem 0.75rem 0.55rem 2.2rem', border: '1px solid #CBD5E1', borderRadius: '8px', fontSize: '0.85rem' }}
                />
              </div>
            </div>

            {/* Message Preview */}
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '0.35rem' }}>
                MESAJ İÇERİĞİ (İsteğe Göre Düzenlenebilir):
              </label>
              <textarea
                rows={9}
                value={whatsappCustomText}
                onChange={(e) => setWhatsappCustomText(e.target.value)}
                style={{ width: '100%', padding: '0.75rem', border: '1px solid #CBD5E1', borderRadius: '8px', fontSize: '0.83rem', fontFamily: 'monospace', color: '#0F172A', background: '#F8FAFC', lineHeight: 1.4 }}
              />
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button onClick={() => setWhatsappModalOpen(false)} className="btn btn-secondary">
                İptal
              </button>

              <button onClick={handleSendWhatsApp} className="btn btn-whatsapp" style={{ padding: '0.6rem 1.25rem', fontSize: '0.88rem' }}>
                <MessageSquare size={18} /> WhatsApp'ta Aç ve Gönder
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
