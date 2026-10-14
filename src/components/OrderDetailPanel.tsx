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
  Copy,
  PackageCheck,
  ArrowRight,
  X,
  FileCheck,
  Printer,
  Tag,
  MessageSquare,
  Share2,
  Phone,
  ArrowLeft,
  Trash2,
  Sparkles,
  TrendingUp,
  Award,
  CheckCheck,
  Activity,
  CheckCircle2,
  Clock3,
  CalendarDays,
  FileSpreadsheet,
  ArrowUpDown,
  Search,
  Eye,
  FileUp,
  Upload,
  Check
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { Order, OrderItem, OrderDocument, OrderStatusHistory, DispatchRecord, CustomerInsights, ProductionOrder, SubcontractOrder } from '../types';
import { useAuth } from '../context/AuthContext';
import { toTurkishErrorMessage } from '../utils/errorMessage';

interface OrderDetailPanelProps {
  order: Order | null;
  items: OrderItem[];
  documents: OrderDocument[];
  history: OrderStatusHistory[];
  dispatches?: DispatchRecord[];
  productionOrders?: ProductionOrder[];
  subcontractOrders?: SubcontractOrder[];
  customerInsights?: CustomerInsights | null;
  isLoading?: boolean;
  onRefresh: () => void;
  onUpdateOrder: (
    updatedItems: OrderItem[],
    updatedFields?: {
      customerName?: string;
      customerOrderNo?: string;
      projectNo?: string;
      coatingType?: string;
      requestedDeliveryDate?: string;
      notes?: string;
    }
  ) => Promise<void>;
  onDeleteOrder: (orderId: number) => Promise<boolean | void>;
  onStatusChange: (newStatus: string, notes: string) => Promise<void>;
  onBackToList?: () => void;
}

export const OrderDetailPanel: React.FC<OrderDetailPanelProps> = ({
  order,
  items,
  documents,
  history,
  dispatches = [],
  productionOrders = [],
  subcontractOrders = [],
  customerInsights,
  isLoading = false,
  onRefresh,
  onUpdateOrder,
  onDeleteOrder,
  onStatusChange,
  onBackToList
}) => {
  const [activeTab, setActiveTab] = useState<'summary' | 'items' | 'documents' | 'production' | 'subcontract' | 'shipping' | 'history'>('summary');
  const [editingItems, setEditingItems] = useState<OrderItem[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editCustomerName, setEditCustomerName] = useState('');
  const [editCustomerOrderNo, setEditCustomerOrderNo] = useState('');
  const [editProjectNo, setEditProjectNo] = useState('');
  const [editCoatingType, setEditCoatingType] = useState('');
  const [editRequestedDeliveryDate, setEditRequestedDeliveryDate] = useState('');
  const [editOrderNotes, setEditOrderNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [statusNote, setStatusNote] = useState('');
  const [conflictError, setConflictError] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isMobile, setIsMobile] = useState<boolean>(() => typeof window !== 'undefined' && window.innerWidth <= 768);

  React.useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Partial shipping & item selection state
  const [selectedItemIds, setSelectedItemIds] = useState<number[]>([]);
  const [batchStatus, setBatchStatus] = useState<string>('SHIPPING');
  const [batchUpdating, setBatchUpdating] = useState(false);
  const [isDeletingItems, setIsDeletingItems] = useState(false);

  React.useEffect(() => {
    setSelectedItemIds([]);
    setIsEditing(false);
    setConflictError(null);
  }, [order?.id]);

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
  const [dispatchDate, setDispatchDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [driverName, setDriverName] = useState('');
  const [vehiclePlate, setVehiclePlate] = useState('');
  const [waybillNumber, setWaybillNumber] = useState('');
  const [dispatchNotes, setDispatchNotes] = useState('');
  const [dispatchQuantities, setDispatchQuantities] = useState<{ [itemId: number]: number }>({});
  const [dispatchSubmitting, setDispatchSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // Excel-like Item Table Filtering & Sorting State (1.4)
  const [itemSearchQuery, setItemSearchQuery] = useState('');
  const [itemSortField, setItemSortField] = useState<'lineNo' | 'code' | 'name' | 'quantity' | 'remaining'>('lineNo');
  const [itemSortAsc, setItemSortAsc] = useState<boolean>(true);
  const excelFileInputRef = React.useRef<HTMLInputElement>(null);

  // Document Re-reading OCR State (1.5)
  const [isReReading, setIsReReading] = useState(false);
  const [reReadData, setReReadData] = useState<any>(null);
  const [reReadModalOpen, setReReadModalOpen] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importPreviewItems, setImportPreviewItems] = useState<any[]>([]);
  const [importFileName, setImportFileName] = useState('');
  const [isUploadingDoc, setIsUploadingDoc] = useState(false);
  const newDocInputRef = React.useRef<HTMLInputElement>(null);

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

  const { token, user } = useAuth();

  // WhatsApp Share Modal State
  const [whatsappModalOpen, setWhatsappModalOpen] = useState(false);
  const [whatsappPhone, setWhatsappPhone] = useState('');
  const [whatsappCustomText, setWhatsappCustomText] = useState('');

  // Open WhatsApp Share Modal
  const handleOpenWhatsAppModal = () => {
    if (!order) return;

    // Seçili olan kalemler varsa seçilenleri, yoksa tüm kalemleri al (kesinti/kısaltma olmadan tamamı)
    const targetItems = (selectedItemIds.length > 0
      ? (items || []).filter(it => selectedItemIds.includes(it.id!))
      : (items || []));

    const itemsSummary = targetItems
      .map((it, idx) => {
        const code = it.customerProductCode || it.customer_product_code || it.internalProductCode || it.internal_product_code || '';
        const name = it.productName || it.product_name || 'Ürün';
        const qty = it.quantity || 0;
        const unit = it.unit || 'Adet';
        const codePrefix = code ? `${code} - ` : '';
        return `  ${idx + 1}. ${codePrefix}${name} (${qty} ${unit})`;
      })
      .join('\n');

    const customerName = fixTurkishEncoding(order.customer_name);
    const coatingText = order.coating_type ? fixTurkishEncoding(order.coating_type) : 'Belirtilmedi';
    const senderName = user?.name || user?.email || 'Faruk ORUÇ (Kalite Müdürü)';
    const projectText = order.project_no ? `\n🏗️ *Proje / Gemi No:* ${fixTurkishEncoding(order.project_no)}` : '';
    const notesText = order.notes && order.notes.trim() ? `\n📝 *Özel Sipariş Notu:* ${fixTurkishEncoding(order.notes)}` : '';

    const text = `📦 *SİES ELEKTRİK - SİPARİŞ İŞ EMRİ BİLGİSİ*

👤 *Müşteri:* ${customerName}
📑 *Sipariş No:* ${order.order_no}
📋 *Müşteri Sip Ref:* ${order.customer_order_no || '-'}${projectText}
🎨 *Kaplama Cinsi:* ${coatingText}
📅 *Sipariş Tarihi:* ${formatDate(order.order_date)}
📅 *Teslim Tarihi:* ${formatDate(order.requested_delivery_date)}${notesText}
👤 *İş Emrini Gönderen:* ${senderName}

📋 *Sipariş Kalemleri:*
${itemsSummary}

📌 *Sipariş Durumu:* ${getStatusTurkishLabel(order.status)}

🏢 *SİES ELEKTRİK MÜMESSİLLİK SAN. VE TİC. LTD. ŞTİ.*`;

    setWhatsappCustomText(text);
    const phone = order.phone || order.customer_tax_number || '';
    setWhatsappPhone(phone);
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
      dispatch_date?: string;
      notes?: string;
      created_at: string;
      creator_name?: string;
      status?: string;
      cancellation_reason?: string;
      items: {
        dispatch_id: number;
        item_id: number;
        code: string;
        name: string;
        quantity_shipped: number;
        status?: string;
        cancellation_reason?: string;
      }[];
    }>();

    (dispatches || []).forEach(d => {
      const key = d.waybill_number || `IRS-${d.id}`;
      if (!map.has(key)) {
        map.set(key, {
          waybill_number: d.waybill_number,
          driver_name: d.driver_name,
          vehicle_plate: d.vehicle_plate,
          dispatch_date: (d as any).dispatch_date || d.created_at,
          notes: d.notes,
          created_at: d.created_at,
          creator_name: d.creator_name,
          status: d.status || 'ACTIVE',
          cancellation_reason: d.cancellation_reason,
          items: []
        });
      }

      map.get(key)!.items.push({
        dispatch_id: d.id,
        item_id: d.order_item_id,
        code: d.customer_product_code || '-',
        name: d.product_name || 'Ürün Kalemi',
        quantity_shipped: d.quantity_shipped,
        status: d.status || 'ACTIVE',
        cancellation_reason: d.cancellation_reason
      });
    });

    return Array.from(map.values());
  }, [dispatches]);

  // Dispatch Waybill PDF Print & Cancel Handlers
  const [printingWaybill, setPrintingWaybill] = useState<string | null>(null);

  const handlePrintWaybillPdf = async (waybillNumber: string) => {
    if (!order?.id || !token) return;
    setPrintingWaybill(waybillNumber);
    try {
      const res = await fetch(`/api/orders/${order.id}/dispatch/waybill-pdf`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ waybillNumber })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'İrsaliye PDF oluşturulamadı!');
      window.open(`/api/documents/${data.documentId}/pdf?token=${token}`, '_blank');
    } catch (err: any) {
      alert('İrsaliye Yazdırma Hatası: ' + err.message);
    } finally {
      setPrintingWaybill(null);
    }
  };

  const handleCancelDispatchItem = async (dispatchId: number, waybillNo: string) => {
    if (!order?.id || !token) return;
    const reason = window.prompt(`İrsaliye #${waybillNo} sevkiyat kaydını iptal etmek ve sevk edilen miktarı geri almak istediğinize emin misiniz?\n\nLütfen iptal gerekçesini belirtiniz:`);
    if (reason === null) return;
    try {
      const res = await fetch(`/api/orders/${order.id}/dispatch/${dispatchId}/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ reason: reason.trim() || 'Kullanıcı tarafından iptal edildi.' })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Sevkiyat iptal edilemedi!');
      alert('✓ Sevkiyat kaydı başarıyla iptal edildi ve stok miktarı geri yüklendi.');
      onRefresh();
    } catch (err: any) {
      alert('Sevkiyat İptal Hatası: ' + err.message);
    }
  };

  // Work Order (Üretim Emri) State & Handlers
  const [createWOModalOpen, setCreateWOModalOpen] = useState(false);
  const [woItemId, setWoItemId] = useState<number | ''>('');
  const [woDepartment, setWoDepartment] = useState('Talaşlı İmalat');
  const [woPlannedQty, setWoPlannedQty] = useState<number | ''>('');
  const [woStartDate, setWoStartDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [woPlannedEndDate, setWoPlannedEndDate] = useState('');
  const [woNotes, setWoNotes] = useState('');
  const [woSubmitting, setWoSubmitting] = useState(false);

  // Update Work Order Progress Modal State
  const [updateWOModalOpen, setUpdateWOModalOpen] = useState(false);
  const [selectedWO, setSelectedWO] = useState<ProductionOrder | null>(null);
  const [woProducedQty, setWoProducedQty] = useState<number | ''>('');
  const [woDefectQty, setWoDefectQty] = useState<number | ''>('');
  const [woActualEndDate, setWoActualEndDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [woStatus, setWoStatus] = useState<string>('IN_PROGRESS');
  const [woUpdateNotes, setWoUpdateNotes] = useState('');
  const [woUpdating, setWoUpdating] = useState(false);

  const handleOpenCreateWO = (defaultItemId?: number) => {
    if (defaultItemId) setWoItemId(defaultItemId);
    else if (items.length > 0) setWoItemId(items[0].id || '');
    setWoDepartment('Talaşlı İmalat');
    setWoPlannedQty('');
    setWoStartDate(new Date().toISOString().split('T')[0]);
    setWoPlannedEndDate('');
    setWoNotes('');
    setCreateWOModalOpen(true);
  };

  const handleCreateWorkOrder = async () => {
    if (!order?.id || !token || !woItemId) return;
    const qty = parseFloat(String(woPlannedQty));
    if (isNaN(qty) || qty <= 0) {
      alert('Lütfen geçerli bir planlanan üretim miktarı giriniz!');
      return;
    }
    setWoSubmitting(true);
    try {
      const res = await fetch(`/api/orders/${order.id}/work-orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          orderItemId: woItemId,
          department: woDepartment,
          plannedQuantity: qty,
          startDate: woStartDate,
          plannedEndDate: woPlannedEndDate,
          notes: woNotes
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'İş emri oluşturulamadı!');
      setCreateWOModalOpen(false);
      onRefresh();
    } catch (err: any) {
      alert('İş Emri Oluşturma Hatası: ' + err.message);
    } finally {
      setWoSubmitting(false);
    }
  };

  const handleOpenUpdateWO = (wo: ProductionOrder) => {
    setSelectedWO(wo);
    setWoProducedQty(wo.produced_quantity || '');
    setWoDefectQty(wo.defect_quantity || '');
    setWoActualEndDate(wo.actual_end_date || new Date().toISOString().split('T')[0]);
    setWoStatus(wo.status || 'IN_PROGRESS');
    setWoUpdateNotes(wo.notes || '');
    setUpdateWOModalOpen(true);
  };

  const handleUpdateWorkOrderProgress = async () => {
    if (!order?.id || !token || !selectedWO) return;
    setWoUpdating(true);
    try {
      const res = await fetch(`/api/orders/${order.id}/work-orders/${selectedWO.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          producedQuantity: woProducedQty !== '' ? parseFloat(String(woProducedQty)) : 0,
          defectQuantity: woDefectQty !== '' ? parseFloat(String(woDefectQty)) : 0,
          actualEndDate: woActualEndDate,
          status: woStatus,
          notes: woUpdateNotes
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'İş emri güncellenemedi!');
      setUpdateWOModalOpen(false);
      onRefresh();
    } catch (err: any) {
      alert('İş Emri Güncelleme Hatası: ' + err.message);
    } finally {
      setWoUpdating(false);
    }
  };

  // Subcontract / Coating State & Handlers
  const [createSubModalOpen, setCreateSubModalOpen] = useState(false);
  const [subItemId, setSubItemId] = useState<number | ''>('');
  const [subContractorName, setSubContractorName] = useState('');
  const [subOperationType, setSubOperationType] = useState('KAPLAMA');
  const [subWaybillNo, setSubWaybillNo] = useState('');
  const [subSentQty, setSubSentQty] = useState<number | ''>('');
  const [subSentDate, setSubSentDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [subExpectedReturnDate, setSubExpectedReturnDate] = useState('');
  const [subNotes, setSubNotes] = useState('');
  const [subSubmitting, setSubSubmitting] = useState(false);

  // Subcontract Return Modal State
  const [returnSubModalOpen, setReturnSubModalOpen] = useState(false);
  const [selectedSub, setSelectedSub] = useState<SubcontractOrder | null>(null);
  const [subReturnedQty, setSubReturnedQty] = useState<number | ''>('');
  const [subDefectQty, setSubDefectQty] = useState<number | ''>('');
  const [subActualReturnDate, setSubActualReturnDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [subReturnNotes, setSubReturnNotes] = useState('');
  const [subReturning, setSubReturning] = useState(false);

  const handleOpenCreateSub = (defaultItemId?: number) => {
    if (defaultItemId) setSubItemId(defaultItemId);
    else if (items.length > 0) setSubItemId(items[0].id || '');
    setSubContractorName('');
    setSubOperationType('KAPLAMA');
    setSubWaybillNo('');
    setSubSentQty('');
    setSubSentDate(new Date().toISOString().split('T')[0]);
    setSubExpectedReturnDate('');
    setSubNotes('');
    setCreateSubModalOpen(true);
  };

  const handleCreateSubcontract = async () => {
    if (!order?.id || !token || !subItemId) return;
    if (!subContractorName.trim()) {
      alert('Lütfen fason / kaplama firma adını belirtiniz!');
      return;
    }
    const qty = parseFloat(String(subSentQty));
    if (isNaN(qty) || qty <= 0) {
      alert('Lütfen geçerli bir gönderilen miktar giriniz!');
      return;
    }
    setSubSubmitting(true);
    try {
      const res = await fetch(`/api/orders/${order.id}/subcontract`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          orderItemId: subItemId,
          subcontractorName: subContractorName.trim(),
          operationType: subOperationType,
          waybillNo: subWaybillNo.trim(),
          sentQuantity: qty,
          sentDate: subSentDate,
          expectedReturnDate: subExpectedReturnDate,
          notes: subNotes
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Fason kaydı oluşturulamadı!');
      setCreateSubModalOpen(false);
      onRefresh();
    } catch (err: any) {
      alert('Fason Gönderim Hatası: ' + err.message);
    } finally {
      setSubSubmitting(false);
    }
  };

  const handleOpenReturnSub = (sub: SubcontractOrder) => {
    setSelectedSub(sub);
    const pending = Math.max(0, sub.sent_quantity - sub.returned_quantity - sub.defect_quantity);
    setSubReturnedQty(pending);
    setSubDefectQty(0);
    setSubActualReturnDate(new Date().toISOString().split('T')[0]);
    setSubReturnNotes('');
    setReturnSubModalOpen(true);
  };

  const handleReceiveSubcontractReturn = async () => {
    if (!order?.id || !token || !selectedSub) return;
    const retQty = parseFloat(String(subReturnedQty)) || 0;
    const defQty = parseFloat(String(subDefectQty)) || 0;
    if (retQty < 0 || defQty < 0) {
      alert('Miktar negatif olamaz!');
      return;
    }
    setSubReturning(true);
    try {
      const res = await fetch(`/api/orders/${order.id}/subcontract/${selectedSub.id}/return`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          returnedQuantity: (selectedSub.returned_quantity || 0) + retQty,
          defectQuantity: (selectedSub.defect_quantity || 0) + defQty,
          actualReturnDate: subActualReturnDate,
          notes: subReturnNotes
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Mal kabul kaydı tamamlanamadı!');
      setReturnSubModalOpen(false);
      onRefresh();
    } catch (err: any) {
      alert('Mal Kabul Hatası: ' + err.message);
    } finally {
      setSubReturning(false);
    }
  };

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
    setEditCustomerName(order.customer_name || '');
    setEditCustomerOrderNo(order.customer_order_no || '');
    setEditProjectNo(order.project_no || '');
    setEditCoatingType(order.coating_type || '');
    setEditOrderNotes(order.notes || '');

    // Format requested delivery date as YYYY-MM-DD for HTML input[type="date"]
    let initDate = '';
    if (order.requested_delivery_date) {
      const d = String(order.requested_delivery_date).split('T')[0].trim();
      if (/^\d{4}-\d{2}-\d{2}$/.test(d)) {
        initDate = d;
      }
    }
    setEditRequestedDeliveryDate(initDate);
    setIsEditing(true);
    setConflictError(null);
    setActiveTab('items');
  };

  const handleSaveEdit = async () => {
    setSaving(true);
    setConflictError(null);
    try {
      const sanitizedItems = editingItems.map((it, idx) => {
        const q = typeof it.quantity === 'number'
          ? it.quantity
          : parseFloat(String(it.quantity || '0').replace(',', '.')) || 0;
        const p = typeof (it.unitPrice ?? it.unit_price) === 'number'
          ? (it.unitPrice ?? it.unit_price)
          : parseFloat(String(it.unitPrice ?? it.unit_price ?? '0').replace(',', '.')) || 0;
        const code = (it.customerProductCode ?? it.customer_product_code ?? '').trim();
        const name = (it.productName ?? it.product_name ?? 'Ürün').trim();
        const desc = (it.productDescription ?? it.product_description ?? name).trim() || name;
        const unit = (it.unit || 'Adet').trim();
        const total = Math.round(q * p * 100) / 100;
        const curr = it.currency || (order as any)?.currency || 'TRY';

        const prodQ = typeof (it.productionQuantity ?? it.production_quantity) === 'number'
          ? (it.productionQuantity ?? it.production_quantity)
          : parseFloat(String(it.productionQuantity ?? it.production_quantity ?? '0').replace(',', '.')) || 0;
        const coatQ = typeof (it.coatingQuantity ?? it.coating_quantity) === 'number'
          ? (it.coatingQuantity ?? it.coating_quantity)
          : parseFloat(String(it.coatingQuantity ?? it.coating_quantity ?? '0').replace(',', '.')) || 0;

        return {
          id: it.id,
          lineNo: idx + 1,
          line_no: idx + 1,
          customerProductCode: code,
          customer_product_code: code,
          internalProductCode: it.internalProductCode || it.internal_product_code || '',
          productName: name,
          product_name: name,
          productDescription: desc,
          product_description: desc,
          quantity: q,
          productionQuantity: prodQ,
          production_quantity: prodQ,
          coatingQuantity: coatQ,
          coating_quantity: coatQ,
          shippedQuantity: it.shippedQuantity || it.shipped_quantity || 0,
          shipped_quantity: it.shippedQuantity || it.shipped_quantity || 0,
          unit: unit,
          unitPrice: p,
          unit_price: p,
          lineTotal: total,
          line_total: total,
          currency: curr,
          status: it.status || 'APPROVED'
        };
      });

      await onUpdateOrder(sanitizedItems, {
        customerName: editCustomerName.trim() || undefined,
        customerOrderNo: editCustomerOrderNo.trim() || undefined,
        projectNo: editProjectNo.trim() || undefined,
        coatingType: editCoatingType.trim() || undefined,
        requestedDeliveryDate: editRequestedDeliveryDate.trim() || undefined,
        notes: editOrderNotes.trim()
      });
      setIsEditing(false);
    } catch (err: any) {
      setConflictError(toTurkishErrorMessage(err.message || 'Güncelleme hatası oluştu!'));
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!order) return;
    setIsDeleting(true);
    setConflictError(null);
    try {
      await onDeleteOrder(order.id);
      setShowDeleteModal(false);
    } catch (err: any) {
      setConflictError(toTurkishErrorMessage(err.message || 'Sipariş silinirken hata oluştu!'));
    } finally {
      setIsDeleting(false);
    }
  };

  const handleItemCellChange = (index: number, field: string, val: any) => {
    const updated = [...editingItems];
    const item = { ...updated[index] };

    if (field === 'productName' || field === 'product_name') {
      item.productName = val;
      item.product_name = val;
      item.productDescription = val;
      item.product_description = val;
    } else if (field === 'customerProductCode' || field === 'customer_product_code') {
      item.customerProductCode = val;
      item.customer_product_code = val;
    } else if (field === 'unit') {
      item.unit = val;
    } else if (field === 'quantity') {
      item.quantity = val;
      const q = typeof val === 'number' ? val : parseFloat(String(val || '').replace(',', '.')) || 0;
      const p = typeof (item.unitPrice ?? item.unit_price) === 'number'
        ? (item.unitPrice ?? item.unit_price)
        : parseFloat(String(item.unitPrice ?? item.unit_price ?? '').replace(',', '.')) || 0;
      item.lineTotal = Math.round(q * p * 100) / 100;
      item.line_total = item.lineTotal;
    } else if (field === 'unitPrice' || field === 'unit_price') {
      item.unitPrice = val;
      item.unit_price = val;
      const p = typeof val === 'number' ? val : parseFloat(String(val || '').replace(',', '.')) || 0;
      const q = typeof item.quantity === 'number'
        ? item.quantity
        : parseFloat(String(item.quantity || '').replace(',', '.')) || 0;
      item.lineTotal = Math.round(q * p * 100) / 100;
      item.line_total = item.lineTotal;
    } else if (field === 'productionQuantity' || field === 'production_quantity') {
      const pq = typeof val === 'number' ? val : parseFloat(String(val || '').replace(',', '.')) || 0;
      item.productionQuantity = pq;
      item.production_quantity = pq;
    } else if (field === 'coatingQuantity' || field === 'coating_quantity') {
      const cq = typeof val === 'number' ? val : parseFloat(String(val || '').replace(',', '.')) || 0;
      item.coatingQuantity = cq;
      item.coating_quantity = cq;
    } else {
      (item as any)[field] = val;
    }

    updated[index] = item;
    setEditingItems(updated);
  };

  const handleDeleteItemRow = (index: number) => {
    if (editingItems.length <= 1) {
      if (!window.confirm('Siparişte sadece 1 kalem kaldı. Bu kalemi de silmek istediğinize emin misiniz?')) {
        return;
      }
    }
    const updated = editingItems.filter((_, idx) => idx !== index);
    const renumbered = updated.map((it, idx) => ({
      ...it,
      lineNo: idx + 1,
      line_no: idx + 1
    }));
    setEditingItems(renumbered);
  };

  const handleCopyItemRow = (index: number) => {
    const target = editingItems[index];
    const nextLineNo = editingItems.length + 1;
    const copy = {
      ...target,
      id: undefined,
      lineNo: nextLineNo,
      line_no: nextLineNo
    };
    setEditingItems([...editingItems, copy]);
  };

  const handleAddItemRow = () => {
    const nextLineNo = editingItems.length + 1;
    setEditingItems([
      ...editingItems,
      {
        lineNo: nextLineNo,
        line_no: nextLineNo,
        customerProductCode: `KALEM-${nextLineNo}`,
        customer_product_code: `KALEM-${nextLineNo}`,
        productName: 'Yeni Sipariş Kalemi',
        product_name: 'Yeni Sipariş Kalemi',
        productDescription: 'Yeni Sipariş Kalemi',
        product_description: 'Yeni Sipariş Kalemi',
        quantity: 1,
        shippedQuantity: 0,
        unit: 'Adet',
        unitPrice: 0,
        unit_price: 0,
        currency: (order as any)?.currency || 'TRY',
        lineTotal: 0,
        line_total: 0,
        status: 'PENDING'
      }
    ]);
  };

  // Select item handlers
  const handleToggleSelectAll = () => {
    const list = isEditing ? editingItems : items;
    if (selectedItemIds.length === list.length) {
      setSelectedItemIds([]);
    } else {
      setSelectedItemIds(list.map((it, idx) => it.id || idx + 1));
    }
  };

  const handleToggleSelectItem = (id: number) => {
    if (selectedItemIds.includes(id)) {
      setSelectedItemIds(selectedItemIds.filter(i => i !== id));
    } else {
      setSelectedItemIds([...selectedItemIds, id]);
    }
  };

  const handleDeleteSelectedItems = async () => {
    if (selectedItemIds.length === 0) {
      alert('Lütfen silinecek en az bir kalem seçin!');
      return;
    }

    const count = selectedItemIds.length;
    const confirmMsg = `Seçili ${count} kalemi siparişten silmek istediğinize emin misiniz?`;
    if (!window.confirm(confirmMsg)) return;

    if (isEditing) {
      const updated = editingItems
        .filter((item, idx) => {
          const itemId = item.id || idx + 1;
          return !selectedItemIds.includes(itemId);
        })
        .map((it, idx) => ({ ...it, lineNo: idx + 1, line_no: idx + 1 }));
      setEditingItems(updated);
      setSelectedItemIds([]);
      return;
    }

    if (!order) return;
    setIsDeletingItems(true);
    try {
      const res = await fetch(`/api/orders/${order.id}/items/delete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ itemIds: selectedItemIds })
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Kalemler silinirken hata oluştu');
      }

      setSelectedItemIds([]);
      await onRefresh();
      alert(`Seçili ${count} kalem başarıyla silindi.`);
    } catch (err: any) {
      alert(toTurkishErrorMessage(err, 'Kalemler silinemedi'));
    } finally {
      setIsDeletingItems(false);
    }
  };

  const handleDirectDeleteItem = async (itemId: number) => {
    if (!order) return;
    if (!window.confirm('Bu kalemi siparişten silmek istediğinize emin misiniz?')) {
      return;
    }
    setIsDeletingItems(true);
    try {
      const res = await fetch(`/api/orders/${order.id}/items/delete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ itemIds: [itemId] })
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Kalem silinirken hata oluştu');
      }

      setSelectedItemIds(prev => prev.filter(id => id !== itemId));
      await onRefresh();
    } catch (err: any) {
      alert(toTurkishErrorMessage(err, 'Kalem silinemedi'));
    } finally {
      setIsDeletingItems(false);
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
          dispatchDate: dispatchDate || new Date().toISOString().split('T')[0],
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

  // 1.4 Excel Export Function
  const handleExportItemsToExcel = () => {
    if (!order) return;
    const targetList = isEditing ? editingItems : items;
    if (!targetList || targetList.length === 0) {
      alert('Dışa aktarılacak sipariş kalemi bulunamadı!');
      return;
    }

    const exportRows = targetList.map((item, idx) => {
      const qty = parseFloat(String(item.quantity)) || 0;
      const prodQty = parseFloat(String(item.productionQuantity || 0));
      const coatQty = parseFloat(String(item.coatingQuantity || 0));
      const shipQty = parseFloat(String(item.shippedQuantity || 0));
      const remQty = Math.max(0, qty - shipQty);
      const uPrice = parseFloat(String(item.unitPrice ?? item.unit_price)) || 0;
      const lTotal = parseFloat(String(item.lineTotal ?? item.line_total)) || (qty * uPrice);

      return {
        'Sıra No': item.lineNo || item.line_no || idx + 1,
        'Müşteri Ürün Kodu': item.customerProductCode || item.customer_product_code || '',
        'Ürün Açıklaması': item.productName || item.product_name || item.productDescription || item.product_description || '',
        'Sipariş Miktarı': qty,
        'Üretim Miktarı': prodQty,
        'Kaplama Miktarı': coatQty,
        'Sevk Edilen Miktar': shipQty,
        'Kalan Miktar': remQty,
        'Birim': item.unit || 'Adet',
        'Birim Fiyat': uPrice,
        'Toplam Tutar': lTotal,
        'Para Birimi': item.currency || (order as any)?.currency || 'TRY',
        'Kalem Durumu': item.status || 'APPROVED'
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(exportRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Siparis_Kalemleri');
    const filename = `Siparis_${order.order_no || 'Detay'}_Kalemler.xlsx`;
    XLSX.writeFile(workbook, filename);
  };

  // 1.4 Excel Import File Change Handler
  const handleExcelFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportFileName(file.name);
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws, { defval: '' }) as any[];

        if (!data || data.length === 0) {
          alert('Seçilen Excel dosyasında veri satırı bulunamadı!');
          return;
        }

        const parsedItems = data.map((row, idx) => {
          const code = String(row['Müşteri Ürün Kodu'] || row['Ürün Kodu'] || row['Stok Kodu'] || row['Kod'] || row['Product Code'] || row['Item Code'] || `KALEM-${idx + 1}`).trim();
          const name = String(row['Ürün Açıklaması'] || row['Ürün Adı'] || row['Açıklama'] || row['Tanım'] || row['Description'] || row['Product Name'] || code).trim();
          const rawQty = row['Sipariş Miktarı'] || row['Miktar'] || row['Adet'] || row['Quantity'] || row['Qty'] || 1;
          const qty = parseFloat(String(rawQty).replace(',', '.')) || 1;
          const unit = String(row['Birim'] || row['Unit'] || 'Adet').trim();
          const rawPrice = row['Birim Fiyat'] || row['Fiyat'] || row['Unit Price'] || row['Price'] || 0;
          const price = parseFloat(String(rawPrice).replace(',', '.')) || 0;
          const lineTotal = Math.round(qty * price * 100) / 100;

          return {
            lineNo: idx + 1,
            customerProductCode: code,
            customer_product_code: code,
            productName: name,
            product_name: name,
            quantity: qty,
            shippedQuantity: 0,
            productionQuantity: 0,
            coatingQuantity: 0,
            unit: unit,
            unitPrice: price,
            unit_price: price,
            lineTotal: lineTotal,
            line_total: lineTotal,
            currency: (order as any)?.currency || 'TRY',
            status: 'APPROVED'
          };
        });

        setImportPreviewItems(parsedItems);
        setImportModalOpen(true);
      } catch (err: any) {
        alert('Excel dosyası okunurken hata oluştu: ' + err.message);
      } finally {
        if (e.target) e.target.value = '';
      }
    };
    reader.readAsBinaryString(file);
  };

  // 1.4 Confirm Excel Import
  const handleConfirmImport = async (mode: 'append' | 'replace') => {
    if (!order || importPreviewItems.length === 0) return;

    let finalItems: any[] = [];
    if (mode === 'append') {
      const current = isEditing ? editingItems : items;
      const startLine = current.length;
      const renumberedImport = importPreviewItems.map((it, idx) => ({
        ...it,
        lineNo: startLine + idx + 1,
        line_no: startLine + idx + 1
      }));
      finalItems = [...current, ...renumberedImport];
    } else {
      finalItems = importPreviewItems;
    }

    if (isEditing) {
      setEditingItems(finalItems);
      setImportModalOpen(false);
      alert(`Excel'den ${importPreviewItems.length} kalem düzenleme tablosuna aktarıldı. "Kaydet" butonuna tıklayarak onaylayabilirsiniz.`);
    } else {
      try {
        await onUpdateOrder(finalItems);
        setImportModalOpen(false);
        alert(`✓ Excel'den ${importPreviewItems.length} kalem başarıyla siparişe aktarıldı!`);
      } catch (err: any) {
        alert('Kalemler kaydedilirken hata oluştu: ' + err.message);
      }
    }
  };

  // 1.5 Re-Read Document OCR Handler
  const handleReReadDocument = async (docId?: number) => {
    const targetDoc = docId 
      ? documents.find(d => d.id === docId)
      : (documents && documents[0]);

    if (!targetDoc) {
      alert('Yeniden taranacak bir sipariş belgesi bulunamadı!');
      return;
    }

    setIsReReading(true);
    try {
      const res = await fetch(`/api/documents/${targetDoc.id}/re-read`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Belge yeniden okunamadı');

      setReReadData(data.extracted);
      setReReadModalOpen(true);
    } catch (err: any) {
      alert('Belge yeniden taranırken hata oluştu: ' + err.message);
    } finally {
      setIsReReading(false);
    }
  };

  // 1.5 Apply Re-Read Data with User Confirmation
  const handleApplyReReadData = async () => {
    if (!reReadData || !order) return;
    try {
      const extractedItems = (reReadData.orderItems || reReadData.items || []).map((it: any, idx: number) => ({
        lineNo: idx + 1,
        line_no: idx + 1,
        customerProductCode: it.customerProductCode || it.customer_product_code || `KALEM-${idx + 1}`,
        customer_product_code: it.customerProductCode || it.customer_product_code || `KALEM-${idx + 1}`,
        productName: it.productName || it.product_name || 'Ürün',
        product_name: it.productName || it.product_name || 'Ürün',
        quantity: parseFloat(String(it.quantity || 1)) || 1,
        unit: it.unit || 'Adet',
        unitPrice: parseFloat(String(it.unitPrice || 0)) || 0,
        unit_price: parseFloat(String(it.unitPrice || 0)) || 0,
        lineTotal: parseFloat(String(it.lineTotal || 0)) || 0,
        currency: reReadData.currency || (order as any)?.currency || 'TRY',
        status: 'APPROVED'
      }));

      const cust = reReadData.customerInfo || {};
      await onUpdateOrder(extractedItems.length > 0 ? extractedItems : items, {
        customerName: cust.customerName || undefined,
        customerOrderNo: cust.customerOrderNo || undefined,
        projectNo: cust.projectNo || undefined,
        coatingType: cust.coatingType || undefined,
        requestedDeliveryDate: cust.requestedDeliveryDate || undefined,
        notes: cust.notes || undefined
      });

      setReReadModalOpen(false);
      alert('✓ Taranan belge verileri kullanıcı onayıyla siparişe başarıyla aktarıldı!');
    } catch (err: any) {
      alert('Veriler aktarılırken hata: ' + err.message);
    }
  };

  // 1.5 Upload New Document Attached to Order
  const handleUploadNewDoc = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !order) return;

    setIsUploadingDoc(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch(`/api/orders/${order.id}/documents`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: formData
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Belge yüklenemedi');

      alert(`✓ Yeni belge "${data.originalName}" başarıyla siparişe eklendi!`);
      onRefresh();
    } catch (err: any) {
      alert('Belge yüklenirken hata: ' + err.message);
    } finally {
      setIsUploadingDoc(false);
      if (e.target) e.target.value = '';
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

  // Dedicated Tab 4 Production & Coating status updater
  const handleUpdateItemProductionStatus = async (itemIds: number[], newStatus: string) => {
    if (!itemIds || itemIds.length === 0) return;
    setBatchUpdating(true);
    try {
      const res = await fetch(`/api/orders/${order.id}/items/status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          itemIds,
          newStatus,
          notes: `İmalat & Kaplama panelinden kalem durumu "${newStatus}" yapıldı.`
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Kalem durumu güncellenemedi');
      onRefresh();
    } catch (err: any) {
      alert(`Hata: ${err.message}`);
    } finally {
      setBatchUpdating(false);
    }
  };

  // Generate production work order for all items
  const handleGenerateFullProductionForm = async () => {
    const allIds = items.map((it, idx) => it.id || idx + 1);
    if (allIds.length === 0) return;
    setSendProdSubmitting(true);
    try {
      const res = await fetch(`/api/orders/${order!.id}/production-form`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          itemIds: allIds,
          notes: `Tüm sipariş kalemleri için Resmi Üretim İş Emri Formu oluşturuldu.`
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Üretim formu oluşturulamadı');

      setCreatedDocId(data.documentId);
      setCreatedDocName(data.originalName);
      setProductionModalOpen(true);
      onRefresh();
    } catch (err: any) {
      alert(`Hata: ${err.message}`);
    } finally {
      setSendProdSubmitting(false);
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
    
    let cleanStr = String(dateStr).trim();
    if (cleanStr.includes('T')) {
      cleanStr = cleanStr.split('T')[0];
    }
    
    const isoMatch = cleanStr.match(/^(\d{4})[\.\/\-](\d{1,2})[\.\/\-](\d{1,2})$/);
    if (isoMatch) {
      const year = isoMatch[1];
      const month = isoMatch[2].padStart(2, '0');
      const day = isoMatch[3].padStart(2, '0');
      return `${day}.${month}.${year}`;
    }

    const trMatch = cleanStr.match(/^(\d{1,2})[\.\/\-](\d{1,2})[\.\/\-](\d{4})$/);
    if (trMatch) {
      const day = trMatch[1].padStart(2, '0');
      const month = trMatch[2].padStart(2, '0');
      const year = trMatch[3];
      return `${day}.${month}.${year}`;
    }

    try {
      const d = new Date(dateStr);
      if (!isNaN(d.getTime())) {
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();
        return `${day}.${month}.${year}`;
      }
    } catch (e) {}

    return String(dateStr);
  };

  const fixTurkishEncoding = (text?: string): string => {
    if (!text) return '';
    return String(text)
      .replace(/Ä°/g, 'İ')
      .replace(/i̇/g, 'i')
      .replace(/Ä±/g, 'ı')
      .replace(/Åž/g, 'Ş')
      .replace(/ÅŸ/g, 'ş')
      .replace(/Äž/g, 'Ğ')
      .replace(/ÄŸ/g, 'ğ')
      .replace(/Ãœ/g, 'Ü')
      .replace(/Ã¼/g, 'ü')
      .replace(/Ã–/g, 'Ö')
      .replace(/Ã¶/g, 'ö')
      .replace(/Ã‡/g, 'Ç')
      .replace(/Ã§/g, 'ç');
  };

  const getStatusTurkishLabel = (st?: string) => {
    if (!st) return 'Yeni Sipariş';
    const upper = st.toUpperCase();
    if (upper === 'NEW' || upper === 'YENI' || upper === 'YENİ') return 'Yeni Sipariş';
    if (upper === 'PRODUCTION_PENDING') return 'Üretim Bekliyor';
    if (upper === 'IN_PRODUCTION' || upper === 'PRODUCTION' || upper === 'ÜRETİMDE' || upper === 'URETIMDE') return 'Üretimde';
    if (upper === 'COATING_PENDING') return 'Kaplama Bekliyor';
    if (upper === 'COATING' || upper === 'KAPLAMADA') return 'Kaplamada';
    if (upper === 'READY_FOR_SHIPPING') return 'Sevkiyata Hazır';
    if (upper === 'PARTIAL_SHIPPED' || upper === 'PARTIAL_SHIPPING' || upper === 'SHIPPING_PENDING' || upper === 'KISMI SEVK' || upper === 'KISMİ SEVK') return 'Kısmi Sevk Edildi';
    if (upper === 'COMPLETED' || upper === 'TAMAMLANDI') return 'Tamamlandı';
    if (upper === 'OVERDUE' || upper === 'GECİKMİŞ' || upper === 'GECIKMIS') return 'Gecikmiş';
    if (upper === 'PAINTING' || upper === 'BOYADA') return 'Boyada';
    if (upper === 'PACKAGING' || upper === 'PAKETLEMEDE') return 'Paketlemede';
    if (upper === 'REVIEW_PENDING' || upper === 'BEKLEMEDE') return 'Beklemede';
    if (upper === 'CANCELLED' || upper === 'İPTAL') return 'İptal';
    return st;
  };

  const getStatusColor = (st?: string) => {
    if (!st) return '#059669';
    const upper = st.toUpperCase();
    if (upper === 'NEW' || upper === 'YENI' || upper === 'YENİ') return '#059669';
    if (upper === 'PRODUCTION_PENDING') return '#0284C7';
    if (upper === 'IN_PRODUCTION' || upper === 'PRODUCTION' || upper === 'ÜRETİMDE' || upper === 'URETIMDE') return '#0284C7';
    if (upper === 'COATING_PENDING') return '#8B5CF6';
    if (upper === 'COATING' || upper === 'KAPLAMADA') return '#8B5CF6';
    if (upper === 'READY_FOR_SHIPPING') return '#D97706';
    if (upper === 'PARTIAL_SHIPPED' || upper === 'PARTIAL_SHIPPING' || upper === 'KISMI SEVK' || upper === 'KISMİ SEVK') return '#EA580C';
    if (upper === 'COMPLETED' || upper === 'TAMAMLANDI') return '#10B981';
    if (upper === 'OVERDUE' || upper === 'GECİKMİŞ' || upper === 'GECIKMIS') return '#DC2626';
    if (upper === 'PAINTING' || upper === 'BOYADA') return '#7C3AED';
    if (upper === 'PACKAGING' || upper === 'PAKETLEMEDE') return '#0284C7';
    return '#475569';
  };

  // 1.3 Delivery Date Urgency Info (Yeşil / Turuncu / Kırmızı / Gri)
  const getDeliveryUrgencyInfo = (dateStr?: string, status?: string) => {
    if (status === 'COMPLETED') {
      return {
        color: '#64748B',
        bg: '#F1F5F9',
        border: '#CBD5E1',
        label: 'Tamamlandı',
        urgency: 'completed'
      };
    }
    if (!dateStr) {
      return {
        color: '#64748B',
        bg: '#F8FAFC',
        border: '#E2E8F0',
        label: 'Tarih Belirtilmedi',
        urgency: 'none'
      };
    }

    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const target = new Date(dateStr);
      target.setHours(0, 0, 0, 0);
      const diffTime = target.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays < 0) {
        return {
          color: '#DC2626',
          bg: '#FEF2F2',
          border: '#FCA5A5',
          label: `${Math.abs(diffDays)}G Gecikti!`,
          urgency: 'overdue'
        };
      }
      if (diffDays === 0) {
        return {
          color: '#D97706',
          bg: '#FFFBEB',
          border: '#FDE68A',
          label: 'Bugün Teslim!',
          urgency: 'urgent'
        };
      }
      if (diffDays <= 3) {
        return {
          color: '#D97706',
          bg: '#FFFBEB',
          border: '#FDE68A',
          label: `${diffDays} Gün Kaldı`,
          urgency: 'soon'
        };
      }
      return {
        color: '#059669',
        bg: '#ECFDF5',
        border: '#A7F3D0',
        label: `${diffDays} Gün Var`,
        urgency: 'normal'
      };
    } catch {
      return {
        color: '#64748B',
        bg: '#F8FAFC',
        border: '#E2E8F0',
        label: '-',
        urgency: 'none'
      };
    }
  };

  // 1.4 Memoized Filtered and Sorted Items for the Excel-like Table
  const filteredAndSortedItems = React.useMemo(() => {
    let list = isEditing ? [...editingItems] : [...items];

    if (itemSearchQuery.trim()) {
      const q = itemSearchQuery.trim().toLowerCase();
      list = list.filter(it => {
        const code = (it.customerProductCode || it.customer_product_code || '').toLowerCase();
        const name = (it.productName || it.product_name || it.productDescription || it.product_description || '').toLowerCase();
        return code.includes(q) || name.includes(q);
      });
    }

    list.sort((a, b) => {
      let valA: any = 0;
      let valB: any = 0;

      if (itemSortField === 'code') {
        valA = (a.customerProductCode || a.customer_product_code || '').toLowerCase();
        valB = (b.customerProductCode || b.customer_product_code || '').toLowerCase();
      } else if (itemSortField === 'name') {
        valA = (a.productName || a.product_name || a.productDescription || '').toLowerCase();
        valB = (b.productName || b.product_name || b.productDescription || '').toLowerCase();
      } else if (itemSortField === 'quantity') {
        valA = parseFloat(String(a.quantity || 0));
        valB = parseFloat(String(b.quantity || 0));
      } else if (itemSortField === 'remaining') {
        valA = Math.max(0, (parseFloat(String(a.quantity || 0)) - parseFloat(String(a.shippedQuantity || 0))));
        valB = Math.max(0, (parseFloat(String(b.quantity || 0)) - parseFloat(String(b.shippedQuantity || 0))));
      } else {
        valA = a.lineNo || a.line_no || 0;
        valB = b.lineNo || b.line_no || 0;
      }

      if (valA < valB) return itemSortAsc ? -1 : 1;
      if (valA > valB) return itemSortAsc ? 1 : -1;
      return 0;
    });

    return list;
  }, [items, editingItems, isEditing, itemSearchQuery, itemSortField, itemSortAsc]);




  const getItemStatusBadge = (st?: string) => {
    switch (st) {
      case 'IN_PRODUCTION':
        return <span className="badge badge-production" style={{ fontSize: '0.7rem' }}>ÜRETİMDE</span>;
      case 'COATING':
        return <span className="badge badge-pending" style={{ fontSize: '0.7rem' }}>KAPLAMADA</span>;
      case 'PAINTING':
        return <span className="badge" style={{ fontSize: '0.7rem', background: '#FCE7F3', color: '#BE185D', border: '1px solid #FBCFE8' }}>BOYADA</span>;
      case 'PACKAGING':
        return <span className="badge" style={{ fontSize: '0.7rem', background: '#E0F2FE', color: '#0369A1', border: '1px solid #BAE6FD' }}>PAKETLEMEDE</span>;
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

  // Dashboard Metrics & Calculations
  const totalItemsCount = (items || []).length;
  const totalQuantity = (items || []).reduce((acc, it) => acc + (Number(it.quantity) || 0), 0);
  const totalShippedQuantity = (items || []).reduce((acc, it) => acc + (Number(it.shippedQuantity) || 0), 0);
  const remainingQuantity = Math.max(0, totalQuantity - totalShippedQuantity);
  const shippingProgressPercent = totalQuantity > 0 ? Math.min(100, Math.round((totalShippedQuantity / totalQuantity) * 100)) : 0;
  const fullyShippedItemsCount = (items || []).filter(i => (Number(i.shippedQuantity) || 0) >= (Number(i.quantity) || 0) && (Number(i.quantity) || 0) > 0).length;
  const partiallyShippedItemsCount = (items || []).filter(i => (Number(i.shippedQuantity) || 0) > 0 && (Number(i.shippedQuantity) || 0) < (Number(i.quantity) || 0)).length;
  const unshippedItemsCount = (items || []).filter(i => (Number(i.shippedQuantity) || 0) === 0).length;

  const getDeliveryStatusBadge = (dateStr?: string) => {
    if (!dateStr) return { label: 'Tarih Belirtilmedi', bg: '#F1F5F9', color: '#64748B', border: '#CBD5E1' };
    const target = new Date(dateStr).getTime();
    if (isNaN(target)) return { label: 'Belirtilmedi', bg: '#F1F5F9', color: '#64748B', border: '#CBD5E1' };
    const now = new Date().setHours(0, 0, 0, 0);
    const diffDays = Math.ceil((target - now) / (1000 * 60 * 60 * 24));
    if (diffDays < 0) {
      return { label: `⚠️ ${Math.abs(diffDays)} Gün Gecikti`, bg: '#FEF2F2', color: '#DC2626', border: '#FCA5A5' };
    }
    if (diffDays === 0) {
      return { label: '⚡ Bugün Teslim', bg: '#FFFBEB', color: '#D97706', border: '#FCD34D' };
    }
    if (diffDays <= 3) {
      return { label: `⏳ ${diffDays} Gün Kaldı (Kritik)`, bg: '#FEF3C7', color: '#B45309', border: '#FDE68A' };
    }
    return { label: `⏱️ ${diffDays} Gün Kaldı`, bg: '#ECFDF5', color: '#059669', border: '#A7F3D0' };
  };

  const formatFullDateTime = (dateStr?: string) => {
    if (!dateStr) return 'Belirtilmedi';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch {
      return String(dateStr);
    }
  };

  return (
    <div className="detail-panel">
      {/* Mobile Sticky Back Bar */}
      {onBackToList && (
        <div className="mobile-show-block" style={{ padding: '8px 12px', background: '#3B82F6', borderBottom: '1px solid #2563EB' }}>
          <button 
            onClick={onBackToList} 
            style={{ 
              width: '100%', 
              background: '#FFFFFF', 
              color: '#1E40AF', 
              border: 'none', 
              borderRadius: '8px', 
              padding: '8px 12px', 
              fontWeight: 700, 
              fontSize: '13px', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              gap: '6px',
              cursor: 'pointer'
            }}
          >
            <ArrowLeft size={18} /> Sipariş Listesine Dön
          </button>
        </div>
      )}

      {/* Header Info Banner */}
      <div className="order-detail-header" style={{ padding: isMobile ? '0.75rem 0.85rem' : '1rem 1.25rem', background: '#FFFFFF', borderBottom: '1px solid var(--border-color)' }}>
        <div className="order-header-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '0.65rem' }}>
          <div style={{ flex: 1, minWidth: isMobile ? '100%' : '260px' }}>
            {isEditing ? (
              <div style={{ marginBottom: '0.4rem' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#2563EB', display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '3px' }}>
                  <Building2 size={14} color="#2563EB" /> Firma Adı / Müşteri Ticari Ünvanı (Düzenle):
                </label>
                <input
                  type="text"
                  value={editCustomerName}
                  onChange={(e) => setEditCustomerName(e.target.value)}
                  placeholder="Firma / Müşteri Adını Yazın..."
                  style={{
                    width: '100%',
                    padding: '0.5rem 0.75rem',
                    fontSize: isMobile ? '1rem' : '1.15rem',
                    fontWeight: 700,
                    color: '#0F172A',
                    background: '#EFF6FF',
                    border: '2px solid #3B82F6',
                    borderRadius: '6px',
                    outline: 'none',
                    boxShadow: '0 0 0 3px rgba(59, 130, 246, 0.15)'
                  }}
                />
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                <h1 style={{ fontSize: isMobile ? '1.05rem' : '1.25rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>{fixTurkishEncoding(order.customer_name)}</h1>
                <span className="badge badge-approved" style={{ fontSize: '0.72rem' }}>
                  <ShieldCheck size={12} /> SİP NO: {order.order_no}
                </span>
                <span className="mobile-hide" style={{ fontSize: '0.7rem', background: '#E0F2FE', border: '1px solid #BAE6FD', padding: '0.15rem 0.4rem', borderRadius: '4px', color: '#0369A1', fontWeight: 600 }}>
                  v{order.version}
                </span>
              </div>
            )}
            {order.customer_tax_number && (
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap' }}>
                <Building2 size={12} /> Vergi: {order.customer_tax_number} | Ref: <strong>{order.customer_order_no || '-'}</strong>
              </div>
            )}
          </div>

          <div className="order-header-actions" style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', flexWrap: 'wrap', width: isMobile ? '100%' : 'auto' }}>
            <button
              onClick={handleOpenWhatsAppModal}
              className="btn btn-whatsapp"
              style={{ flex: isMobile ? '1 1 100%' : 'initial', padding: isMobile ? '0.5rem 0.75rem' : '0.4rem 0.85rem' }}
              title="Siparişi WhatsApp İle Gönder / Paylaş"
            >
              <MessageSquare size={16} /> <span>WhatsApp'tan Gönder</span>
            </button>

            <button
              onClick={onRefresh}
              className="btn btn-secondary"
              style={{ flex: isMobile ? 1 : 'initial', padding: isMobile ? '0.5rem' : '0.4rem 0.75rem' }}
              title="Siparişi Yenile"
            >
              <RefreshCw size={15} />
              {isMobile && <span>Yenile</span>}
            </button>

            {isEditing ? (
              <button
                onClick={handleSaveEdit}
                disabled={saving}
                className="btn btn-primary"
                style={{ flex: isMobile ? 2 : 'initial', padding: isMobile ? '0.5rem' : '0.4rem 0.85rem' }}
              >
                <Save size={15} /> <span>{saving ? 'Kaydediliyor...' : 'Kaydet'}</span>
              </button>
            ) : (
              <button
                onClick={handleStartEdit}
                className="btn btn-secondary"
                style={{ flex: isMobile ? 2 : 'initial', padding: isMobile ? '0.5rem' : '0.4rem 0.75rem' }}
              >
                <Edit3 size={15} /> <span>Düzenle</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setShowDeleteModal(true)}
              disabled={isDeleting}
              style={{
                flex: isMobile ? 2 : 'initial',
                background: '#FEF2F2',
                color: '#DC2626',
                border: '1px solid #FECACA',
                padding: isMobile ? '0.5rem 0.75rem' : '0.45rem 0.75rem',
                borderRadius: '6px',
                fontSize: '0.8rem',
                fontWeight: 600,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '5px',
                cursor: isDeleting ? 'not-allowed' : 'pointer',
                transition: 'all 0.15s ease'
              }}
              title="Bu siparişi kalıcı olarak sil"
            >
              <Trash2 size={15} color="#DC2626" />
              <span>Sil</span>
            </button>
          </div>
        </div>

        {isEditing && (
          <div style={{ background: '#EFF6FF', border: '1px solid #93C5FD', color: '#1E40AF', padding: '0.65rem 0.85rem', borderRadius: '8px', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.82rem', fontWeight: 600 }}>
              <Edit3 size={16} color="#2563EB" />
              <span>✏️ SİPARİŞ DÜZENLEME MODU AKTİF</span>
            </div>
            <button onClick={() => setIsEditing(false)} className="btn btn-secondary" style={{ padding: '0.25rem 0.55rem', fontSize: '0.75rem' }}>
              İptal
            </button>
          </div>
        )}

        {conflictError && (
          <div style={{ background: '#FEE2E2', border: '1px solid #FCA5A5', color: '#DC2626', padding: '0.65rem 0.85rem', borderRadius: '6px', fontSize: '0.82rem', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <AlertTriangle size={16} /> {conflictError}
          </div>
        )}

        {/* Quick Meta Stats / Edit Controls Bar */}
        {isEditing ? (
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem', background: '#F8FAFC', padding: isMobile ? '0.65rem' : '0.85rem', borderRadius: '8px', border: '1px solid #CBD5E1' }}>
            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '0.25rem' }}>Müşteri Sipariş Ref / No:</label>
              <input
                type="text"
                placeholder="Örn: MŞ-2026/044"
                value={editCustomerOrderNo}
                onChange={(e) => setEditCustomerOrderNo(e.target.value)}
                style={{ width: '100%', padding: '0.4rem 0.6rem', border: '1px solid #94A3B8', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 600, color: '#0F172A', background: '#FFFFFF' }}
              />
            </div>

            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '0.25rem' }}>Müşteri Proje No / Adı:</label>
              <input
                type="text"
                placeholder="Örn: PRJ-İST-KÖPRÜ-24"
                value={editProjectNo}
                onChange={(e) => setEditProjectNo(e.target.value)}
                style={{ width: '100%', padding: '0.4rem 0.6rem', border: '1px solid #94A3B8', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 600, color: '#0F172A', background: '#FFFFFF' }}
              />
            </div>

            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '0.25rem' }}>Kaplama Cinsi:</label>
              <input
                type="text"
                placeholder="Örn: Sıcak Daldırma Galvaniz, Eloksal..."
                value={editCoatingType}
                onChange={(e) => setEditCoatingType(e.target.value)}
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

            <div style={{ gridColumn: isMobile ? '1' : '1 / -1', marginTop: '0.25rem' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#B45309', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '0.25rem' }}>
                <FileText size={14} color="#D97706" /> Sipariş Özel Açıklaması / Üretim Notu:
              </label>
              <textarea
                rows={2}
                value={editOrderNotes}
                onChange={(e) => setEditOrderNotes(e.target.value)}
                placeholder="Özel üretim şartı, müşteri notu, sevkiyat talimatı vb. (Varsa yazın)..."
                style={{
                  width: '100%',
                  padding: '0.5rem 0.65rem',
                  border: '1.5px solid #F59E0B',
                  borderRadius: '6px',
                  fontSize: '0.85rem',
                  color: '#78350F',
                  background: '#FFFBEB',
                  fontWeight: 600,
                  fontFamily: 'inherit',
                  resize: 'vertical'
                }}
              />
            </div>
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(auto-fit, minmax(150px, 1fr))',
            gap: isMobile ? '0.4rem' : '0.75rem',
            fontSize: '0.8rem',
            color: 'var(--text-secondary)'
          }}>
            <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', padding: isMobile ? '0.4rem 0.55rem' : '0.5rem 0.75rem', borderRadius: '6px' }}>
              <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: isMobile ? '0.65rem' : '0.7rem' }}>SİPARİŞ TARİHİ</span>
              <strong style={{ color: 'var(--text-primary)', fontSize: isMobile ? '0.78rem' : '0.82rem' }}>{formatDate(order.order_date)}</strong>
            </div>
            {(() => {
              const urgency = getDeliveryUrgencyInfo(order.requested_delivery_date, order.status);
              return (
                <div style={{
                  background: urgency.bg,
                  border: `1.5px solid ${urgency.border}`,
                  padding: isMobile ? '0.4rem 0.55rem' : '0.5rem 0.75rem',
                  borderRadius: '6px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: urgency.color, display: 'block', fontSize: isMobile ? '0.65rem' : '0.7rem', fontWeight: 700 }}>
                      TESLİM TARİHİ
                    </span>
                    <span style={{
                      fontSize: '0.65rem',
                      fontWeight: 800,
                      color: urgency.color,
                      background: 'rgba(255,255,255,0.85)',
                      padding: '1px 4px',
                      borderRadius: '4px',
                      border: `1px solid ${urgency.border}`
                    }}>
                      {urgency.label}
                    </span>
                  </div>
                  <strong style={{ color: urgency.color, fontSize: isMobile ? '0.78rem' : '0.85rem', display: 'block', marginTop: '2px' }}>
                    {formatDate(order.requested_delivery_date)}
                  </strong>
                </div>
              );
            })()}
            <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', padding: isMobile ? '0.4rem 0.55rem' : '0.5rem 0.75rem', borderRadius: '6px' }}>
              <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: isMobile ? '0.65rem' : '0.7rem' }}>KAPLAMA CİNSİ</span>
              <strong style={{ color: order.coating_type ? '#0284C7' : 'var(--text-muted)', fontSize: isMobile ? '0.78rem' : '0.82rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block' }}>{fixTurkishEncoding(order.coating_type) || 'Belirtilmedi'}</strong>
            </div>
            <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', padding: isMobile ? '0.4rem 0.55rem' : '0.5rem 0.75rem', borderRadius: '6px' }}>
              <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: isMobile ? '0.65rem' : '0.7rem' }}>PROJE NO</span>
              <strong style={{ color: 'var(--text-primary)', fontSize: isMobile ? '0.78rem' : '0.82rem' }}>{fixTurkishEncoding(order.project_no) || 'Belirtilmedi'}</strong>
            </div>
            <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', padding: isMobile ? '0.4rem 0.55rem' : '0.5rem 0.75rem', borderRadius: '6px' }}>
              <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: isMobile ? '0.65rem' : '0.7rem' }}>TOPLAM KALEM</span>
              <strong style={{ color: 'var(--primary)', fontSize: isMobile ? '0.78rem' : '0.82rem' }}>
                {isLoading && items.length === 0 ? `${order.total_items || 0} Kalem (Yükleniyor...)` : `${(items || []).length} Kalem`}
              </strong>
            </div>
            <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', padding: isMobile ? '0.4rem 0.55rem' : '0.5rem 0.75rem', borderRadius: '6px' }}>
              <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: isMobile ? '0.65rem' : '0.7rem' }}>DURUM</span>
              <strong style={{ color: getStatusColor(order.status), fontSize: isMobile ? '0.78rem' : '0.82rem' }}>{getStatusTurkishLabel(order.status)}</strong>
            </div>
          </div>
        )}
      </div>

      {/* Prominent Special Order Note Banner */}
      {order.notes && order.notes.trim() && (
        <div style={{
          margin: isMobile ? '0.65rem 0.75rem 0' : '0.85rem 1.25rem 0',
          background: 'linear-gradient(135deg, #FFFBEB 0%, #FEF3C7 100%)',
          border: '1.5px solid #F59E0B',
          borderLeft: '6px solid #D97706',
          borderRadius: '8px',
          padding: '0.85rem 1.15rem',
          boxShadow: '0 2px 6px rgba(217, 119, 6, 0.08)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#B45309', fontWeight: 800, fontSize: '0.82rem', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>
            <FileText size={16} color="#D97706" />
            <span>📌 DİKKAT: SİPARİŞ ÖZEL AÇIKLAMASI & ÜRETİM NOTU</span>
          </div>
          <div style={{ color: '#78350F', fontSize: '0.92rem', fontWeight: 700, lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
            {fixTurkishEncoding(order.notes)}
          </div>
        </div>
      )}

      {/* 1.5 Quick Document Action Strip */}
      <div style={{
        margin: isMobile ? '0.65rem 0.75rem 0' : '0.75rem 1.25rem 0',
        padding: '0.6rem 0.85rem',
        background: '#F8FAFC',
        border: '1px solid #E2E8F0',
        borderRadius: '8px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '0.5rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', color: '#475569', fontWeight: 600 }}>
          <ExternalLink size={16} color="var(--primary)" />
          <span>Sipariş Belgeleri:</span>
          <span style={{ color: '#0284C7', fontWeight: 700 }}>
            {documents.length > 0 ? `${documents.length} Belge Kayıtlı` : 'Belge Yok'}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
          {documents.length > 0 && (
            <a
              href={`/api/documents/${documents[0].id}/pdf?token=${token}`}
              target="_blank"
              rel="noreferrer"
              className="btn btn-secondary"
              style={{ padding: '0.35rem 0.65rem', fontSize: '0.78rem', display: 'inline-flex', alignItems: 'center', gap: '4px', textDecoration: 'none' }}
              title="Orijinal Müşteri Sipariş Formunu Yeni Sekmede Aç"
            >
              <FileText size={14} color="#0284C7" /> Orijinal Belgeyi Aç
            </a>
          )}

          {documents.length > 0 && (
            <button
              onClick={() => setActiveTab('documents')}
              className="btn btn-secondary"
              style={{ padding: '0.35rem 0.65rem', fontSize: '0.78rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
              title="PDF ve Belgeleri İncele"
            >
              <Eye size={14} color="#059669" /> PDF Olarak Görüntüle
            </button>
          )}

          <input
            type="file"
            ref={newDocInputRef}
            style={{ display: 'none' }}
            onChange={handleUploadNewDoc}
            accept=".pdf,.xlsx,.xls,.doc,.docx,.png,.jpg,.jpeg"
          />

          <button
            onClick={() => newDocInputRef.current?.click()}
            disabled={isUploadingDoc}
            className="btn btn-secondary"
            style={{ padding: '0.35rem 0.65rem', fontSize: '0.78rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
            title="Siparişe Yeni Belge / Revize Form Ekle"
          >
            <Upload size={14} color="#8B5CF6" /> {isUploadingDoc ? 'Yükleniyor...' : 'Yeni Belge Ekle'}
          </button>

          {documents.length > 0 && (
            <button
              onClick={() => handleReReadDocument()}
              disabled={isReReading}
              className="btn btn-secondary"
              style={{ padding: '0.35rem 0.65rem', fontSize: '0.78rem', display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#FEF3C7', color: '#B45309', border: '1px solid #FDE68A' }}
              title="Yapay zeka ile belgeden ürün kodları, miktarları ve firma bilgisini yeniden oku (onayınıza sunulur)"
            >
              <RefreshCw size={14} className={isReReading ? 'spin' : ''} color="#D97706" /> {isReReading ? 'Taranıyor...' : 'Yeniden Veri Oku'}
            </button>
          )}

          <button
            onClick={() => setActiveTab('documents')}
            className="btn btn-secondary"
            style={{ padding: '0.35rem 0.65rem', fontSize: '0.78rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
            title="Tüm Yüklenen Belge Versiyonları ve Tarihçesi"
          >
            <History size={14} color="#64748B" /> Belge Geçmişi
          </button>
        </div>
      </div>


      {/* Tabs Bar */}
      <div style={{
        display: 'flex',
        borderBottom: '1px solid var(--border-color)',
        background: '#FFFFFF',
        padding: isMobile ? '0 0.5rem' : '0 1rem',
        overflowX: 'auto',
        whiteSpace: 'nowrap',
        WebkitOverflowScrolling: 'touch',
        scrollbarWidth: 'none'
      }}>
        {[
          { id: 'summary', label: isMobile ? '1. Özet' : '1. Sipariş Özeti', icon: FileText },
          { id: 'items', label: isMobile ? `2. Kalemler (${isLoading && items.length === 0 ? (order.total_items || 0) : (items || []).length})` : `2. Sipariş Kalemleri (${isLoading && items.length === 0 ? (order.total_items || 0) : (items || []).length})`, icon: Layers },
          { id: 'documents', label: isMobile ? `3. Belgeler (${isLoading && documents.length === 0 ? (order.total_docs || 0) : (documents || []).length})` : `3. Sipariş Belgeleri (${isLoading && documents.length === 0 ? (order.total_docs || 0) : (documents || []).length})`, icon: ExternalLink },
          { id: 'production', label: isMobile ? `4. İş Emirleri (${(productionOrders || []).length})` : `4. Üretim Emirleri (${(productionOrders || []).length} İş Emri)`, icon: Factory },
          { id: 'subcontract', label: isMobile ? `5. Kaplama (${(subcontractOrders || []).length})` : `5. Kaplama & Fason (${(subcontractOrders || []).length} Parti)`, icon: Paintbrush },
          { id: 'shipping', label: isMobile ? `6. Sevk (${waybillGroups.length})` : `6. Sevkiyat & İrsaliye (${waybillGroups.length} İrsaliye)`, icon: Truck },
          { id: 'history', label: isMobile ? '7. Geçmiş' : '7. İşlem Geçmişi & Audit', icon: History }
        ].map((t) => {
          const Icon = t.icon;
          const isActive = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id as any)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: isMobile ? '0.65rem 0.75rem' : '0.75rem 1rem',
                border: 'none',
                borderBottom: isActive ? '2px solid var(--primary)' : '2px solid transparent',
                background: 'transparent',
                color: isActive ? 'var(--primary)' : 'var(--text-secondary)',
                fontWeight: isActive ? 700 : 500,
                fontSize: isMobile ? '0.8rem' : '0.85rem',
                cursor: 'pointer',
                flexShrink: 0
              }}
            >
              <Icon size={isMobile ? 14 : 16} /> {t.label}
            </button>
          );
        })}
      </div>

      {/* Tab Contents */}
      <div style={{ padding: isMobile ? '0.75rem 0.65rem' : '1.5rem', flex: 1, overflowY: 'auto' }}>
        {/* TAB 1: SUMMARY - EXECUTIVE ORDER DASHBOARD & AI CUSTOMER INTELLIGENCE */}
        {activeTab === 'summary' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? '0.75rem' : '1.25rem' }}>
            {/* 1. Sipariş Genel Süreç Hattı (Interactive Stepper) */}
            <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '12px', padding: isMobile ? '0.75rem' : '1rem 1.25rem', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.65rem', flexWrap: 'wrap', gap: '0.4rem' }}>
                <span style={{ fontSize: isMobile ? '0.78rem' : '0.85rem', fontWeight: 700, color: '#334155', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Activity size={15} color="var(--primary)" /> SİPARİŞ GENEL İŞ AKIŞI
                </span>
                <span style={{ fontSize: '0.7rem', color: '#64748B' }}>
                  Aşamalara tıklayarak durumu güncelleyin
                </span>
              </div>
              <div style={{
                display: 'flex',
                gap: isMobile ? '0.35rem' : '0.5rem',
                overflowX: isMobile ? 'auto' : 'visible',
                flexWrap: isMobile ? 'nowrap' : 'wrap',
                WebkitOverflowScrolling: 'touch',
                scrollbarWidth: 'none',
                paddingBottom: isMobile ? '4px' : '0'
              }}>
                {[
                  { status: 'NEW', label: '1. Yeni' },
                  { status: 'IN_PRODUCTION', label: '2. Üretimde' },
                  { status: 'COATING', label: '3. Kaplamada' },
                  { status: 'PAINTING', label: '4. Boyada' },
                  { status: 'PACKAGING', label: '5. Paketlemede' },
                  { status: 'PARTIAL_SHIPPING', label: '6. Kısmi Sevk' },
                  { status: 'COMPLETED', label: '7. Tamamlandı' }
                ].map((st) => {
                  const isCurrent = order.status === st.status;
                  return (
                    <button
                      key={st.status}
                      onClick={() => handleStatusStep(st.status)}
                      style={{
                        flex: isMobile ? '0 0 auto' : 1,
                        minWidth: isMobile ? '92px' : '120px',
                        padding: isMobile ? '0.45rem 0.5rem' : '0.65rem 0.5rem',
                        borderRadius: '8px',
                        border: isCurrent ? '2px solid var(--primary)' : '1px solid #E2E8F0',
                        background: isCurrent ? 'rgba(67, 97, 238, 0.08)' : '#F8FAFC',
                        color: isCurrent ? 'var(--primary)' : '#64748B',
                        fontSize: isMobile ? '0.72rem' : '0.8rem',
                        fontWeight: isCurrent ? 700 : 500,
                        cursor: 'pointer',
                        textAlign: 'center',
                        boxShadow: isCurrent ? '0 0 0 1px var(--primary)' : 'none',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      {st.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. Dörtlü Yönetici KPI Metrik Kartları */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(auto-fit, minmax(230px, 1fr))',
              gap: isMobile ? '0.5rem' : '1rem'
            }}>
              {/* Kart 1: Ekleyen Kullanıcı & Kayıt Zamanı */}
              <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '12px', padding: isMobile ? '0.65rem 0.75rem' : '1rem 1.1rem', display: 'flex', flexDirection: 'column', gap: '0.4rem', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: isMobile ? '0.65rem' : '0.72rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Ekleyen & Kayıt
                  </span>
                  <div style={{ width: '24px', height: '24px', borderRadius: '6px', background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <User size={13} color="#3B82F6" />
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: isMobile ? '0.85rem' : '1rem', fontWeight: 700, color: '#0F172A', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {order.creator_name || 'Sistem / Yetkili'}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: '#64748B', display: 'flex', alignItems: 'center', gap: '3px', marginTop: '2px' }}>
                    <Clock size={11} /> {formatFullDateTime(order.created_at)}
                  </div>
                </div>
              </div>

              {/* Kart 2: İstenen Teslim Tarihi & Kalan Süre */}
              {(() => {
                const badge = getDeliveryStatusBadge(order.requested_delivery_date);
                return (
                  <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '12px', padding: isMobile ? '0.65rem 0.75rem' : '1rem 1.1rem', display: 'flex', flexDirection: 'column', gap: '0.4rem', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: isMobile ? '0.65rem' : '0.72rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        Teslim Tarihi
                      </span>
                      <div style={{ width: '24px', height: '24px', borderRadius: '6px', background: '#FEF3C7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <CalendarDays size={13} color="#D97706" />
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: isMobile ? '0.85rem' : '1rem', fontWeight: 700, color: '#0F172A' }}>
                        {formatDate(order.requested_delivery_date)}
                      </div>
                      <div style={{ marginTop: '2px' }}>
                        <span style={{
                          display: 'inline-block',
                          padding: '0.1rem 0.4rem',
                          borderRadius: '4px',
                          fontSize: '0.68rem',
                          fontWeight: 700,
                          background: badge.bg,
                          color: badge.color,
                          border: `1px solid ${badge.border}`
                        }}>
                          {badge.label}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Kart 3: Kaplama Cinsi & Müşteri Projesi */}
              <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '12px', padding: isMobile ? '0.65rem 0.75rem' : '1rem 1.1rem', display: 'flex', flexDirection: 'column', gap: '0.4rem', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: isMobile ? '0.65rem' : '0.72rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Kaplama & Proje
                  </span>
                  <div style={{ width: '24px', height: '24px', borderRadius: '6px', background: '#F5F3FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Paintbrush size={13} color="#8B5CF6" />
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: isMobile ? '0.85rem' : '1rem', fontWeight: 700, color: order.coating_type ? '#7C3AED' : '#64748B', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {order.coating_type || 'Belirtilmedi'}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: '#64748B', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {order.project_no ? `Proje: ${order.project_no}` : (order.customer_order_no ? `Ref: ${order.customer_order_no}` : 'Tanımsız')}
                  </div>
                </div>
              </div>

              {/* Kart 4: Kalem Sayısı & Sipariş Tutarı */}
              <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '12px', padding: isMobile ? '0.65rem 0.75rem' : '1rem 1.1rem', display: 'flex', flexDirection: 'column', gap: '0.4rem', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: isMobile ? '0.65rem' : '0.72rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Tutar & Kalem
                  </span>
                  <div style={{ width: '24px', height: '24px', borderRadius: '6px', background: '#ECFDF5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Tag size={13} color="#10B981" />
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: isMobile ? '0.85rem' : '1rem', fontWeight: 700, color: '#059669', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {isLoading && items.length === 0 ? 'Hesaplanıyor...' : `${totalOrderAmount.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} TRY`}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: '#64748B', marginTop: '2px' }}>
                    {isLoading && items.length === 0 ? `${order.total_items || 0} Kalem` : `${totalItemsCount} Kalem • ${totalQuantity.toLocaleString('tr-TR')} Adet`}
                  </div>
                </div>
              </div>
            </div>

            {/* 3. "Kaçı Gitti, Kaçı Kaldı?" Sevkiyat ve Teslimat İlerleme Paneli */}
            <div style={{
              background: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: '12px',
              padding: isMobile ? '0.75rem' : '1.25rem',
              boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '28px', height: '28px', borderRadius: '6px', background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Truck size={16} color="#2563EB" />
                  </div>
                  <div>
                    <h4 style={{ fontSize: isMobile ? '0.85rem' : '0.95rem', fontWeight: 700, color: '#0F172A', margin: 0 }}>
                      Kaçı Gitti, Kaçı Kaldı?
                    </h4>
                    <span style={{ fontSize: '0.72rem', color: '#64748B' }}>
                      Toplam {totalQuantity.toLocaleString('tr-TR')} birimlik sevk dağılımı
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{
                    padding: '0.2rem 0.55rem',
                    borderRadius: '20px',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    background: shippingProgressPercent === 100 ? '#ECFDF5' : (shippingProgressPercent > 0 ? '#EFF6FF' : '#F1F5F9'),
                    color: shippingProgressPercent === 100 ? '#059669' : (shippingProgressPercent > 0 ? '#2563EB' : '#64748B'),
                    border: `1px solid ${shippingProgressPercent === 100 ? '#A7F3D0' : (shippingProgressPercent > 0 ? '#BFDBFE' : '#CBD5E1')}`
                  }}>
                    %{shippingProgressPercent} Sevk Edildi
                  </span>
                </div>
              </div>

              {/* Büyük İlerleme Çubuğu */}
              <div style={{ width: '100%', height: '12px', background: '#F1F5F9', borderRadius: '10px', overflow: 'hidden', marginBottom: '0.75rem', border: '1px solid #E2E8F0' }}>
                <div style={{
                  height: '100%',
                  width: `${shippingProgressPercent}%`,
                  background: shippingProgressPercent === 100 ? '#10B981' : 'linear-gradient(90deg, #3B82F6 0%, #10B981 100%)',
                  borderRadius: '10px',
                  transition: 'width 0.4s ease'
                }} />
              </div>

              {/* 3 Metrik Kutucuğu */}
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.65rem', marginBottom: '0.75rem' }}>
                <div style={{ background: '#F8FAFC', borderLeft: '4px solid #3B82F6', padding: isMobile ? '0.55rem 0.75rem' : '0.75rem 1rem', borderRadius: '6px' }}>
                  <span style={{ fontSize: '0.68rem', color: '#64748B', fontWeight: 600, display: 'block' }}>TOPLAM SİPARİŞ MİKTARI</span>
                  <strong style={{ fontSize: isMobile ? '0.95rem' : '1.05rem', color: '#0F172A' }}>{totalQuantity.toLocaleString('tr-TR')} Adet</strong>
                  <span style={{ fontSize: '0.7rem', color: '#64748B', display: 'block', marginTop: '1px' }}>{totalItemsCount} farklı kalem</span>
                </div>

                <div style={{ background: '#ECFDF5', borderLeft: '4px solid #10B981', padding: isMobile ? '0.55rem 0.75rem' : '0.75rem 1rem', borderRadius: '6px' }}>
                  <span style={{ fontSize: '0.68rem', color: '#047857', fontWeight: 600, display: 'block' }}>SEVK EDİLEN (GİTTİ)</span>
                  <strong style={{ fontSize: isMobile ? '0.95rem' : '1.05rem', color: '#059669' }}>{totalShippedQuantity.toLocaleString('tr-TR')} Adet</strong>
                  <span style={{ fontSize: '0.7rem', color: '#047857', display: 'block', marginTop: '1px' }}>%{shippingProgressPercent} teslim edildi</span>
                </div>

                <div style={{ background: '#FFFBEB', borderLeft: '4px solid #F59E0B', padding: isMobile ? '0.55rem 0.75rem' : '0.75rem 1rem', borderRadius: '6px' }}>
                  <span style={{ fontSize: '0.68rem', color: '#B45309', fontWeight: 600, display: 'block' }}>KALAN MİKTAR (KALDI)</span>
                  <strong style={{ fontSize: isMobile ? '0.95rem' : '1.05rem', color: '#D97706' }}>{remainingQuantity.toLocaleString('tr-TR')} Adet</strong>
                  <span style={{ fontSize: '0.7rem', color: '#B45309', display: 'block', marginTop: '1px' }}>%{100 - shippingProgressPercent} üretimde / depoda</span>
                </div>
              </div>

              {/* Kalem Durum Hapları */}
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', paddingTop: '0.5rem', borderTop: '1px solid #F1F5F9' }}>
                <span style={{ fontSize: '0.75rem', color: '#059669', background: '#ECFDF5', border: '1px solid #A7F3D0', padding: '0.2rem 0.6rem', borderRadius: '6px', fontWeight: 600 }}>
                  ✓ {fullyShippedItemsCount} Kalem Tamamı Teslim Edildi
                </span>
                <span style={{ fontSize: '0.75rem', color: '#2563EB', background: '#EFF6FF', border: '1px solid #BFDBFE', padding: '0.2rem 0.6rem', borderRadius: '6px', fontWeight: 600 }}>
                  🚚 {partiallyShippedItemsCount} Kalem Kısmi Sevk Edildi
                </span>
                <span style={{ fontSize: '0.75rem', color: '#64748B', background: '#F8FAFC', border: '1px solid #E2E8F0', padding: '0.2rem 0.6rem', borderRadius: '6px', fontWeight: 600 }}>
                  📦 {unshippedItemsCount} Kalem Sevk Bekliyor
                </span>
                <span style={{ fontSize: '0.75rem', color: '#7C3AED', background: '#F5F3FF', border: '1px solid #DDD6FE', padding: '0.2rem 0.6rem', borderRadius: '6px', fontWeight: 600, marginLeft: 'auto' }}>
                  📋 {waybillGroups.length} Adet Sevkiyat İrsaliyesi Kesildi
                </span>
              </div>
            </div>

            {/* 4. İki Kolonlu Alt Panel: Belgeler ve Kullanıcı Denetim Tarihçesi */}
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(320px, 1fr))', gap: isMobile ? '0.75rem' : '1.25rem' }}>
              {/* Sol Kolon: İlişkili Belgeler & Hızlı Erişim */}
              <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '12px', padding: isMobile ? '0.75rem' : '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <FileText size={18} color="var(--primary)" />
                    <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0F172A', margin: 0 }}>
                      İlişkili Sipariş Belgeleri ({(documents || []).length})
                    </h4>
                  </div>
                  <button
                    onClick={() => setActiveTab('documents')}
                    style={{ background: 'transparent', border: 'none', color: 'var(--primary)', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer' }}
                  >
                    Tümünü Gör →
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {/* Orijinal Belge */}
                  {(() => {
                    const origDoc = (documents || []).find(d => d.file_type === 'ORIGINAL_ORDER' || (d as any).document_type === 'ORIGINAL_ORDER' || !d.original_name?.includes('Muafiyet'));
                    return (
                      <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', padding: '0.65rem 0.85rem', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <FileText size={16} color="#DC2626" />
                          <div>
                            <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#1E293B' }}>
                              {fixTurkishEncoding(origDoc?.original_name || origDoc?.file_name || 'Orijinal Müşteri Sipariş Formu')}
                            </div>
                            <span style={{ fontSize: '0.7rem', color: '#64748B' }}>Orijinal Taranan PDF / Form</span>
                          </div>
                        </div>
                        {origDoc ? (
                          <a
                            href={`/api/documents/${origDoc.id}/pdf?token=${token}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ fontSize: '0.75rem', color: 'var(--primary)', fontWeight: 600, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}
                          >
                            <ExternalLink size={13} /> Görüntüle
                          </a>
                        ) : (
                          <span style={{ fontSize: '0.72rem', color: '#94A3B8' }}>Belge yok</span>
                        )}
                      </div>
                    );
                  })()}

                  {/* KDV Muafiyet Belgesi */}
                  {(() => {
                    const exemptionDoc = (documents || []).find(d => 
                      d.file_type === 'KDV_EXEMPTION' || 
                      (d as any).document_type === 'KDV_EXEMPTION' || 
                      (d.file_name && d.file_name.toLowerCase().includes('muafiyet')) ||
                      (d.original_name && d.original_name.toLowerCase().includes('muafiyet'))
                    );
                    return (
                      <div style={{ background: exemptionDoc ? '#ECFDF5' : '#F8FAFC', border: exemptionDoc ? '1px solid #A7F3D0' : '1px solid #E2E8F0', padding: '0.65rem 0.85rem', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <ShieldCheck size={16} color={exemptionDoc ? '#059669' : '#94A3B8'} />
                          <div>
                            <div style={{ fontSize: '0.8rem', fontWeight: 600, color: exemptionDoc ? '#065F46' : '#64748B' }}>
                              {exemptionDoc ? fixTurkishEncoding(exemptionDoc.original_name || exemptionDoc.file_name || 'KDV Muafiyet Belgesi') : 'KDV Muafiyet Belgesi Yok'}
                            </div>
                            <span style={{ fontSize: '0.7rem', color: exemptionDoc ? '#047857' : '#94A3B8' }}>
                              {exemptionDoc ? 'KDV İstisna Yazısı Ekli' : 'İhracat / KDV Muafiyeti girilmedi (Opsiyonel)'}
                            </span>
                          </div>
                        </div>
                        {exemptionDoc && (
                          <a
                            href={`/api/documents/${exemptionDoc.id}/pdf?token=${token}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ fontSize: '0.75rem', color: '#059669', fontWeight: 600, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}
                          >
                            <ExternalLink size={13} /> İncele
                          </a>
                        )}
                      </div>
                    );
                  })()}

                  {/* Son İrsaliye Belgeleri */}
                  {waybillGroups.slice(0, 2).map((wb, wbIdx) => (
                    <div key={wbIdx} style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', padding: '0.65rem 0.85rem', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Truck size={16} color="#3B82F6" />
                        <div>
                          <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#1E293B' }}>
                            İrsaliye: {wb.waybill_number}
                          </div>
                          <span style={{ fontSize: '0.7rem', color: '#64748B' }}>
                            {wb.vehicle_plate} • {wb.driver_name} • {formatDate(wb.created_at)}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => setActiveTab('shipping')}
                        style={{ background: 'transparent', border: 'none', color: '#3B82F6', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}
                      >
                        Detay →
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Sağ Kolon: Kullanıcı İşlem Tarihçesi & Denetim İzi */}
              <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '12px', padding: isMobile ? '0.75rem' : '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <History size={18} color="var(--primary)" />
                    <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0F172A', margin: 0 }}>
                      Kullanıcı İşlemleri & Denetim İzi
                    </h4>
                  </div>
                  <button
                    onClick={() => setActiveTab('history')}
                    style={{ background: 'transparent', border: 'none', color: 'var(--primary)', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer' }}
                  >
                    Tümünü Gör →
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                  {/* Sipariş Kayıt Tarihçesi */}
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                    <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '2px' }}>
                      <CheckCircle size={13} color="#2563EB" />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#1E293B' }}>
                        Sipariş Oluşturuldu
                      </div>
                      <div style={{ fontSize: '0.72rem', color: '#64748B' }}>
                        <strong>{order.creator_name || 'Yetkili Kullanıcı'}</strong> tarafından sisteme aktarıldı • {formatFullDateTime(order.created_at)}
                      </div>
                    </div>
                  </div>

                  {/* Son Durum Hareketleri */}
                  {(history || []).slice(0, 3).map((h, hIdx) => (
                    <div key={hIdx} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                      <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '2px' }}>
                        <RefreshCw size={12} color="#64748B" />
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#1E293B' }}>
                          Durum: {h.status_to || (h as any).new_status || 'Güncellendi'}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: '#64748B' }}>
                          <strong>{(h as any).user_name || (h as any).created_by_name || 'Kullanıcı'}</strong>: {h.notes || 'Durum değişikliği'} • {formatFullDateTime(h.created_at)}
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Son Sevkiyat Kaydı */}
                  {(dispatches || []).slice(0, 1).map((d, dIdx) => (
                    <div key={dIdx} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                      <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#ECFDF5', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '2px' }}>
                        <Truck size={12} color="#059669" />
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#065F46' }}>
                          Sevkiyat İrsaliyesi: {d.waybill_number}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: '#64748B' }}>
                          <strong>{d.created_by_name || 'Sevkiyat Sorumlusu'}</strong> • Araç: {d.license_plate || '-'} • {formatFullDateTime(d.created_at)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
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

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap', width: isMobile ? '100%' : 'auto' }}>
                <button
                  onClick={handleSendToProduction}
                  disabled={selectedItemIds.length === 0 || sendProdSubmitting}
                  className="btn btn-primary"
                  style={{
                    fontSize: isMobile ? '0.75rem' : '0.85rem',
                    padding: isMobile ? '0.45rem 0.65rem' : '0.5rem 1rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    flex: isMobile ? '1 1 auto' : 'initial',
                    background: selectedItemIds.length > 0 ? '#0284C7' : undefined,
                    border: selectedItemIds.length > 0 ? '1px solid #0284C7' : undefined
                  }}
                >
                  <Factory size={16} /> <span>{sendProdSubmitting ? 'Oluşturuluyor...' : isMobile ? 'Üretime Gönder' : 'Seçili Kalemleri Üretime Gönder (Form Oluştur)'}</span>
                </button>

                <button
                  onClick={() => handleGenerateShippingLabels('100x100')}
                  disabled={selectedItemIds.length === 0 || labelSubmitting}
                  className="btn btn-primary"
                  style={{
                    fontSize: isMobile ? '0.75rem' : '0.85rem',
                    padding: isMobile ? '0.45rem 0.65rem' : '0.5rem 1rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    flex: isMobile ? '1 1 auto' : 'initial',
                    background: selectedItemIds.length > 0 ? '#8B5CF6' : undefined,
                    border: selectedItemIds.length > 0 ? '1px solid #8B5CF6' : undefined
                  }}
                >
                  <Tag size={16} /> <span>{labelSubmitting ? 'Hazırlanıyor...' : isMobile ? 'Etiket Yazdır' : 'Seçili Kalemlere Etiket Yazdır'}</span>
                </button>

                <button
                  onClick={handleOpenDispatchModal}
                  disabled={selectedItemIds.length === 0}
                  className="btn btn-primary"
                  style={{
                    fontSize: isMobile ? '0.75rem' : '0.85rem',
                    padding: isMobile ? '0.45rem 0.65rem' : '0.5rem 1rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    flex: isMobile ? '1 1 auto' : 'initial',
                    background: selectedItemIds.length > 0 ? '#10B981' : undefined,
                    border: selectedItemIds.length > 0 ? '1px solid #10B981' : undefined
                  }}
                >
                  <Truck size={16} /> <span>{isMobile ? 'Sevk Et' : 'Seçilen Kalemleri Sevk Et (Şoför/Plaka/Miktar Gir)'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleDeleteSelectedItems}
                  disabled={selectedItemIds.length === 0 || isDeletingItems}
                  className="btn btn-primary"
                  style={{
                    fontSize: isMobile ? '0.75rem' : '0.85rem',
                    padding: isMobile ? '0.45rem 0.65rem' : '0.5rem 1rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    flex: isMobile ? '1 1 auto' : 'initial',
                    background: selectedItemIds.length > 0 ? '#DC2626' : undefined,
                    border: selectedItemIds.length > 0 ? '1px solid #B91C1C' : undefined,
                    color: '#fff',
                    fontWeight: 700
                  }}
                  title="Seçili kalemleri siparişten sil"
                >
                  <Trash2 size={16} /> <span>{isDeletingItems ? 'Siliniyor...' : (isMobile ? 'Sil' : `Seçili Kalemi Sil ${selectedItemIds.length > 0 ? `(${selectedItemIds.length})` : ''}`)}</span>
                </button>

                <button
                  type="button"
                  onClick={handleExportItemsToExcel}
                  className="btn btn-secondary"
                  style={{
                    fontSize: isMobile ? '0.75rem' : '0.82rem',
                    padding: isMobile ? '0.45rem 0.65rem' : '0.5rem 0.85rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    background: '#F0FDF4',
                    border: '1px solid #BBF7D0',
                    color: '#15803D',
                    fontWeight: 600
                  }}
                  title="Tüm sipariş kalemlerini ve aşama ilerlemelerini Excel dosyası (.xlsx) olarak indir"
                >
                  <FileSpreadsheet size={15} color="#16A34A" /> <span>Excel'e Aktar</span>
                </button>

                <input
                  type="file"
                  ref={excelFileInputRef}
                  style={{ display: 'none' }}
                  accept=".xlsx,.xls,.csv"
                  onChange={handleExcelFileChange}
                />

                <button
                  type="button"
                  onClick={() => excelFileInputRef.current?.click()}
                  className="btn btn-secondary"
                  style={{
                    fontSize: isMobile ? '0.75rem' : '0.82rem',
                    padding: isMobile ? '0.45rem 0.65rem' : '0.5rem 0.85rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    background: '#EFF6FF',
                    border: '1px solid #BFDBFE',
                    color: '#1D4ED8',
                    fontWeight: 600
                  }}
                  title="Excel (.xlsx, .xls) veya CSV dosyasından sipariş kalemlerini içe aktar"
                >
                  <FileUp size={15} color="#2563EB" /> <span>Excel'den İçe Aktar</span>
                </button>

                <div style={{ display: 'flex', gap: '0.35rem', flex: isMobile ? '1 1 100%' : 'initial', alignItems: 'center' }}>
                  <select
                    value={batchStatus}
                    onChange={(e) => setBatchStatus(e.target.value)}
                    style={{
                      background: 'rgba(0,0,0,0.5)',
                      color: '#fff',
                      border: '1px solid var(--border-color)',
                      padding: '0.35rem 0.5rem',
                      borderRadius: '6px',
                      fontSize: '0.78rem',
                      flex: 1
                    }}
                  >
                    <option value="IN_PRODUCTION">Üretime Al</option>
                    <option value="COATING">Kaplamaya Sevk Et</option>
                    <option value="SHIPPING">Sevkiyata Al</option>
                  </select>

                  <button
                    onClick={handleBatchItemStatusUpdate}
                    disabled={batchUpdating || selectedItemIds.length === 0}
                    className="btn btn-secondary"
                    style={{ fontSize: '0.75rem', padding: '0.4rem 0.6rem' }}
                  >
                    <ArrowRight size={13} /> Durum
                  </button>

                  {isEditing && (
                    <button
                      type="button"
                      onClick={handleAddItemRow}
                      className="btn btn-primary"
                      style={{ fontSize: '0.8rem', padding: '0.4rem 0.85rem', display: 'flex', alignItems: 'center', gap: '5px', background: '#16A34A', borderColor: '#15803D', fontWeight: 700 }}
                    >
                      <Plus size={14} /> Yeni Kalem Ekle
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* 1.4 Search & Quick Filter Strip */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '0.75rem',
              gap: '0.75rem',
              flexWrap: 'wrap'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, minWidth: '240px' }}>
                <div style={{ position: 'relative', width: '100%' }}>
                  <Search size={15} color="#64748B" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
                  <input
                    type="text"
                    value={itemSearchQuery}
                    onChange={(e) => setItemSearchQuery(e.target.value)}
                    placeholder="Ürün kodu veya açıklamasında hızlı filtrele (Excel arama)..."
                    style={{
                      width: '100%',
                      padding: '0.45rem 0.75rem 0.45rem 2rem',
                      borderRadius: '6px',
                      border: '1px solid #CBD5E1',
                      background: '#FFFFFF',
                      color: '#0F172A',
                      fontSize: '0.82rem',
                      fontWeight: 500
                    }}
                  />
                  {itemSearchQuery && (
                    <button
                      onClick={() => setItemSearchQuery('')}
                      style={{
                        position: 'absolute',
                        right: '8px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'transparent',
                        border: 'none',
                        color: '#94A3B8',
                        cursor: 'pointer',
                        fontSize: '0.8rem'
                      }}
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.78rem', color: '#64748B', flexWrap: 'wrap' }}>
                <span style={{ fontWeight: 600 }}>Sıralama:</span>
                <button
                  type="button"
                  onClick={() => {
                    if (itemSortField === 'code') setItemSortAsc(!itemSortAsc);
                    else { setItemSortField('code'); setItemSortAsc(true); }
                  }}
                  className="btn btn-secondary"
                  style={{ padding: '0.3rem 0.55rem', fontSize: '0.75rem', fontWeight: itemSortField === 'code' ? 700 : 500, color: itemSortField === 'code' ? '#0284C7' : undefined }}
                >
                  <ArrowUpDown size={12} /> Kod {itemSortField === 'code' ? (itemSortAsc ? '↑' : '↓') : ''}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (itemSortField === 'name') setItemSortAsc(!itemSortAsc);
                    else { setItemSortField('name'); setItemSortAsc(true); }
                  }}
                  className="btn btn-secondary"
                  style={{ padding: '0.3rem 0.55rem', fontSize: '0.75rem', fontWeight: itemSortField === 'name' ? 700 : 500, color: itemSortField === 'name' ? '#0284C7' : undefined }}
                >
                  <ArrowUpDown size={12} /> Ürün Adı {itemSortField === 'name' ? (itemSortAsc ? '↑' : '↓') : ''}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (itemSortField === 'quantity') setItemSortAsc(!itemSortAsc);
                    else { setItemSortField('quantity'); setItemSortAsc(true); }
                  }}
                  className="btn btn-secondary"
                  style={{ padding: '0.3rem 0.55rem', fontSize: '0.75rem', fontWeight: itemSortField === 'quantity' ? 700 : 500, color: itemSortField === 'quantity' ? '#0284C7' : undefined }}
                >
                  <ArrowUpDown size={12} /> Miktar {itemSortField === 'quantity' ? (itemSortAsc ? '↑' : '↓') : ''}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (itemSortField === 'remaining') setItemSortAsc(!itemSortAsc);
                    else { setItemSortField('remaining'); setItemSortAsc(true); }
                  }}
                  className="btn btn-secondary"
                  style={{ padding: '0.3rem 0.55rem', fontSize: '0.75rem', fontWeight: itemSortField === 'remaining' ? 700 : 500, color: itemSortField === 'remaining' ? '#0284C7' : undefined }}
                >
                  <ArrowUpDown size={12} /> Kalan {itemSortField === 'remaining' ? (itemSortAsc ? '↑' : '↓') : ''}
                </button>
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
                        checked={selectedItemIds.length === (isEditing ? editingItems : items).length && (isEditing ? editingItems : items).length > 0}
                        onChange={handleToggleSelectAll}
                        title="Tümünü Seç / Seçimi Kaldır"
                      />
                    </th>
                    <th style={{ width: '35px' }}>#</th>
                    <th style={{ minWidth: isEditing ? '110px' : '90px' }}>Ürün Kodu</th>
                    <th style={{ minWidth: isEditing ? '300px' : '220px' }}>Ürün Açıklaması</th>
                    <th style={{ width: isEditing ? '85px' : '75px' }}>Sipariş</th>
                    <th style={{ minWidth: '110px' }}>{isEditing ? 'Üretim (Adet)' : 'Üretim Aşaması'}</th>
                    <th style={{ minWidth: '110px' }}>{isEditing ? 'Kaplama (Adet)' : 'Kaplama Aşaması'}</th>
                    {!isEditing && <th style={{ minWidth: '110px' }}>Sevkiyat</th>}
                    {!isEditing && <th style={{ width: '75px' }}>Kalan</th>}
                    <th style={{ width: isEditing ? '90px' : '65px' }}>Birim</th>
                    <th style={{ width: isEditing ? '90px' : '85px' }}>Birim Fiyat</th>
                    <th style={{ width: '105px' }}>Toplam Tutar</th>
                    <th style={{ width: isEditing ? '85px' : '100px', textAlign: 'center' }}>
                      {isEditing ? 'İşlemler' : 'Kalem Durumu'}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading && items.length === 0 ? (
                    <tr>
                      <td colSpan={13} style={{ textAlign: 'center', padding: '3.5rem 1rem', background: '#F8FAFC' }}>
                        <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
                          <Clock size={30} color="var(--primary)" style={{ animation: 'spin 1s linear infinite' }} />
                          <div style={{ fontSize: '0.95rem', fontWeight: 600, color: '#1E293B' }}>
                            Sipariş kalemleri yükleniyor...
                          </div>
                          <div style={{ fontSize: '0.75rem', color: '#64748B' }}>
                            Lütfen bekleyin, veriler aktarılıyor.
                          </div>
                        </div>
                      </td>
                    </tr>
                  ) : filteredAndSortedItems.length === 0 ? (
                    <tr>
                      <td colSpan={13} style={{ textAlign: 'center', padding: '2.5rem', color: '#94A3B8' }}>
                        {itemSearchQuery ? 'Arama kriterine uygun sipariş kalemi bulunamadı.' : 'Bu siparişe ait kayıtlı ürün kalemi bulunamadı.'}
                      </td>
                    </tr>
                  ) : (
                    filteredAndSortedItems.map((item, idx) => {
                      const itemId = item.id || idx + 1;
                      const isSelected = selectedItemIds.includes(itemId);
                      const qty = parseFloat(String(item.quantity)) || 0;
                      const prodQty = parseFloat(String(item.productionQuantity || item.production_quantity || 0));
                      const coatQty = parseFloat(String(item.coatingQuantity || item.coating_quantity || 0));
                      const shipped = parseFloat(String(item.shippedQuantity || item.shipped_quantity || 0));
                      const remaining = Math.max(0, qty - shipped);
                      const isExcess = shipped > qty;

                      const prodPct = qty > 0 ? Math.min(100, Math.round((prodQty / qty) * 100)) : 0;
                      const coatPct = qty > 0 ? Math.min(100, Math.round((coatQty / qty) * 100)) : 0;
                      const shipPct = qty > 0 ? Math.min(100, Math.round((shipped / qty) * 100)) : 0;

                      const uPrice = parseFloat(String(item.unitPrice ?? item.unit_price)) || 0;
                      const lTotal = parseFloat(String(item.lineTotal ?? item.line_total)) || (qty * uPrice);

                      return (
                        <tr key={idx} style={{ background: isSelected ? 'rgba(0, 229, 255, 0.08)' : (isEditing ? '#FAFAFA' : undefined) }}>
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
                                placeholder="Ürün Kodu"
                                style={{ width: '100%', minWidth: '95px', background: '#FFFFFF', border: '1px solid #CBD5E1', color: '#0284C7', padding: '0.35rem 0.5rem', borderRadius: '4px', fontWeight: 700, fontSize: '0.82rem' }}
                              />
                            ) : (
                              <strong style={{ color: 'var(--primary)' }}>{item.customerProductCode || item.customer_product_code || '-'}</strong>
                            )}
                          </td>
                          <td>
                            {isEditing ? (
                              <textarea
                                rows={2}
                                value={item.productName || item.product_name || item.productDescription || item.product_description || ''}
                                onChange={(e) => handleItemCellChange(idx, 'productName', e.target.value)}
                                placeholder="Ürün adı veya açıklamasını giriniz..."
                                style={{ width: '100%', minWidth: '260px', background: '#FFFFFF', border: '1px solid #CBD5E1', color: '#0F172A', padding: '0.35rem 0.5rem', borderRadius: '4px', fontSize: '0.82rem', fontWeight: 600, fontFamily: 'inherit', resize: 'vertical' }}
                              />
                            ) : (
                              <strong>{item.productName || item.product_name}</strong>
                            )}
                          </td>
                          <td>
                            {isEditing ? (
                              <input
                                type="text"
                                inputMode="decimal"
                                value={item.quantity === undefined || item.quantity === null ? '' : item.quantity}
                                placeholder="0"
                                onChange={(e) => handleItemCellChange(idx, 'quantity', e.target.value)}
                                style={{ width: '100%', minWidth: '65px', background: '#FFFFFF', border: '1px solid #CBD5E1', color: '#0F172A', padding: '0.35rem 0.5rem', borderRadius: '4px', textAlign: 'right', fontWeight: 700, fontSize: '0.85rem' }}
                              />
                            ) : (
                              <strong>{qty}</strong>
                            )}
                          </td>

                          {/* 1.2 Üretim Aşaması İlerleme Çubuğu */}
                          <td>
                            {isEditing ? (
                              <input
                                type="text"
                                inputMode="decimal"
                                value={(item.productionQuantity ?? item.production_quantity) ?? ''}
                                placeholder="0"
                                onChange={(e) => handleItemCellChange(idx, 'productionQuantity', e.target.value)}
                                style={{ width: '100%', minWidth: '65px', background: '#FFFFFF', border: '1px solid #CBD5E1', color: '#0284C7', padding: '0.35rem 0.5rem', borderRadius: '4px', textAlign: 'right', fontWeight: 700, fontSize: '0.85rem' }}
                              />
                            ) : (
                              <div style={{ minWidth: '95px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', fontWeight: 700, color: '#0284C7', marginBottom: '2px' }}>
                                  <span>%{prodPct}</span>
                                  <span>{prodQty} / {qty}</span>
                                </div>
                                <div style={{ width: '100%', height: '6px', background: '#E0F2FE', borderRadius: '3px', overflow: 'hidden' }}>
                                  <div style={{ width: `${prodPct}%`, height: '100%', background: '#0284C7', borderRadius: '3px', transition: 'width 0.3s ease' }} />
                                </div>
                              </div>
                            )}
                          </td>

                          {/* 1.2 Kaplama Aşaması İlerleme Çubuğu */}
                          <td>
                            {isEditing ? (
                              <input
                                type="text"
                                inputMode="decimal"
                                value={(item.coatingQuantity ?? item.coating_quantity) ?? ''}
                                placeholder="0"
                                onChange={(e) => handleItemCellChange(idx, 'coatingQuantity', e.target.value)}
                                style={{ width: '100%', minWidth: '65px', background: '#FFFFFF', border: '1px solid #CBD5E1', color: '#8B5CF6', padding: '0.35rem 0.5rem', borderRadius: '4px', textAlign: 'right', fontWeight: 700, fontSize: '0.85rem' }}
                              />
                            ) : (
                              <div style={{ minWidth: '95px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', fontWeight: 700, color: '#8B5CF6', marginBottom: '2px' }}>
                                  <span>%{coatPct}</span>
                                  <span>{coatQty} / {qty}</span>
                                </div>
                                <div style={{ width: '100%', height: '6px', background: '#F5F3FF', borderRadius: '3px', overflow: 'hidden' }}>
                                  <div style={{ width: `${coatPct}%`, height: '100%', background: '#8B5CF6', borderRadius: '3px', transition: 'width 0.3s ease' }} />
                                </div>
                              </div>
                            )}
                          </td>

                          {/* 1.2 Sevkiyat Aşaması İlerleme Çubuğu */}
                          {!isEditing && (
                            <td>
                              <div style={{ minWidth: '95px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', fontWeight: 700, color: '#10B981', marginBottom: '2px' }}>
                                  <span>%{shipPct}</span>
                                  <span>{shipped} / {qty}</span>
                                </div>
                                <div style={{ width: '100%', height: '6px', background: '#ECFDF5', borderRadius: '3px', overflow: 'hidden' }}>
                                  <div style={{ width: `${shipPct}%`, height: '100%', background: '#10B981', borderRadius: '3px', transition: 'width 0.3s ease' }} />
                                </div>
                              </div>
                            </td>
                          )}

                          {/* Kalan Miktar */}
                          {!isEditing && (
                            <td>
                              {isExcess ? (
                                <span style={{ color: '#F59E0B', fontWeight: 700, fontSize: '0.78rem' }}>
                                  0 <span style={{ fontSize: '0.7rem', color: '#F87171' }}>(+{(shipped - qty).toFixed(1)} Fazla)</span>
                                </span>
                              ) : (
                                <strong style={{ color: remaining > 0 ? (remaining === qty ? '#DC2626' : '#EA580C') : '#059669', fontSize: '0.85rem' }}>
                                  {remaining}
                                </strong>
                              )}
                            </td>
                          )}

                          <td>
                            {isEditing ? (
                              <select
                                value={item.unit || 'Adet'}
                                onChange={(e) => handleItemCellChange(idx, 'unit', e.target.value)}
                                style={{ width: '100%', minWidth: '75px', background: '#FFFFFF', border: '1px solid #CBD5E1', color: '#0F172A', padding: '0.35rem 0.4rem', borderRadius: '4px', fontWeight: 600, fontSize: '0.82rem' }}
                              >
                                <option value="Adet">Adet</option>
                                <option value="Metre">Metre</option>
                                <option value="Boy">Boy</option>
                                <option value="Kg">Kg</option>
                                <option value="Set">Set</option>
                                <option value="Paket">Paket</option>
                                <option value="Plaka">Plaka</option>
                              </select>
                            ) : (
                              item.unit || 'Adet'
                            )}
                          </td>
                          <td>
                            {isEditing ? (
                              <input
                                type="text"
                                inputMode="decimal"
                                value={(item.unitPrice ?? item.unit_price) === undefined || (item.unitPrice ?? item.unit_price) === null ? '' : (item.unitPrice ?? item.unit_price)}
                                placeholder="0.00"
                                onChange={(e) => handleItemCellChange(idx, 'unitPrice', e.target.value)}
                                style={{ width: '100%', minWidth: '75px', background: '#FFFFFF', border: '1px solid #CBD5E1', color: '#0F172A', padding: '0.35rem 0.5rem', borderRadius: '4px', textAlign: 'right', fontWeight: 700, fontSize: '0.85rem' }}
                              />
                            ) : (
                              `${uPrice.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${item.currency || (order as any)?.currency || 'TRY'}`
                            )}
                          </td>
                          <td style={{ color: 'var(--primary)', fontWeight: 600, whiteSpace: 'nowrap' }}>
                            {lTotal.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {item.currency || (order as any)?.currency || 'TRY'}
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            {isEditing ? (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'center' }}>
                                <button
                                  type="button"
                                  onClick={() => handleCopyItemRow(idx)}
                                  title="Bu kalemi çoğalt / kopyala"
                                  style={{
                                    background: '#EFF6FF',
                                    border: '1px solid #BFDBFE',
                                    color: '#2563EB',
                                    padding: '4px 6px',
                                    borderRadius: '4px',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                  }}
                                >
                                  <Copy size={13} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteItemRow(idx)}
                                  title="Bu kalemi siparişten sil"
                                  style={{
                                    background: '#FEF2F2',
                                    border: '1px solid #FECACA',
                                    color: '#DC2626',
                                    padding: '4px 6px',
                                    borderRadius: '4px',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                  }}
                                >
                                  <Trash2 size={13} />
                                </button>
                              </div>
                            ) : (
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                                {getItemStatusBadge(item.status)}
                                {item.id && (
                                  <button
                                    type="button"
                                    onClick={() => handleDirectDeleteItem(item.id!)}
                                    title="Bu kalemi siparişten sil"
                                    style={{
                                      background: 'rgba(239, 68, 68, 0.08)',
                                      border: '1px solid rgba(239, 68, 68, 0.2)',
                                      color: '#EF4444',
                                      cursor: 'pointer',
                                      padding: '3px 5px',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      borderRadius: '4px'
                                    }}
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                )}
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {isEditing && (
              <div style={{
                marginTop: '0.85rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '0.85rem 1.15rem',
                background: '#F0FDF4',
                borderRadius: '8px',
                border: '1.5px dashed #22C55E',
                flexWrap: 'wrap',
                gap: '0.5rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#166534', fontSize: '0.82rem', fontWeight: 600 }}>
                  <ShieldCheck size={18} color="#16A34A" />
                  <span>İhtiyaç halinde yeni sipariş kalemi ekleyebilir veya satırdaki 🗑️ butonundan silebilirsiniz.</span>
                </div>
                <button
                  type="button"
                  onClick={handleAddItemRow}
                  className="btn btn-primary"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '0.5rem 1.15rem',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    background: '#16A34A',
                    borderColor: '#15803D'
                  }}
                >
                  <Plus size={16} /> Yeni Kalem Ekle
                </button>
              </div>
            )}
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
                  const docName = fixTurkishEncoding(doc.originalName || doc.original_name || 'Belge.pdf');
                  const docType = doc.fileType || doc.file_type || '.pdf';
                  const docHash = doc.sha256Hash || doc.sha256_hash || '-';
                  const isProductionForm = docName.toLowerCase().includes('üretim') || docName.toLowerCase().includes('uretim');
                  const isExemptionDoc = docName.toLowerCase().includes('muafiyet');

                  return (
                    <div
                      key={doc.id}
                      style={{
                        background: '#FFFFFF',
                        border: isExemptionDoc ? '2px solid #F59E0B' : isProductionForm ? '2px solid #0284C7' : '1px solid #E2E8F0',
                        padding: isMobile ? '0.75rem 0.85rem' : '1.25rem',
                        borderRadius: '10px',
                        display: 'flex',
                        flexDirection: isMobile ? 'column' : 'row',
                        justifyContent: 'space-between',
                        alignItems: isMobile ? 'stretch' : 'center',
                        gap: isMobile ? '0.75rem' : '0.5rem',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', flexWrap: 'wrap' }}>
                          <FileText size={isMobile ? 18 : 20} color={isExemptionDoc ? '#D97706' : isProductionForm ? '#0284C7' : 'var(--primary)'} />
                          <strong style={{ fontSize: isMobile ? '0.88rem' : '1rem', color: '#0F172A' }}>{docName}</strong>
                          {isExemptionDoc ? (
                            <span
                              className="badge"
                              style={{
                                fontSize: '0.72rem',
                                background: '#FEF3C7',
                                color: '#B45309',
                                border: '1px solid #FDE68A',
                                fontWeight: 700
                              }}
                            >
                              KDV MUAFİYET BELGESİ
                            </span>
                          ) : (
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
                          )}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: '0.35rem', wordBreak: 'break-all' }}>
                          SHA-256: <code style={{ color: '#0284C7', background: '#F1F5F9', padding: '0.1rem 0.35rem', borderRadius: '4px', fontSize: '0.72rem' }}>{isMobile ? `${docHash.slice(0, 16)}...` : docHash}</code>
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '0.5rem', width: isMobile ? '100%' : 'auto' }}>
                        <a
                          href={`/api/documents/${doc.id}/pdf?token=${token}`}
                          target="_blank"
                          rel="noreferrer"
                          className="btn btn-secondary"
                          style={{ flex: isMobile ? 1 : 'initial', textDecoration: 'none', fontSize: isMobile ? '0.75rem' : '0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', padding: isMobile ? '0.45rem' : '0.4rem 0.85rem' }}
                        >
                          <ExternalLink size={14} /> Görüntüle
                        </a>
                        <a
                          href={`/api/documents/${doc.id}/download?token=${token}`}
                          className="btn btn-primary"
                          style={{ flex: isMobile ? 1 : 'initial', textDecoration: 'none', fontSize: isMobile ? '0.75rem' : '0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', padding: isMobile ? '0.45rem' : '0.4rem 0.85rem' }}
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

        {/* TAB 4: PRODUCTION & COATING (COMPREHENSIVE WORKSHOP CONTROL CENTER) */}
        {activeTab === 'production' && (() => {
          const prodItems = items || [];
          const prodTotalQty = prodItems.reduce((acc, it) => acc + (Number(it.quantity) || 0), 0);
          const inProdCount = prodItems.filter(it => it.status === 'IN_PRODUCTION').length;
          const coatingCount = prodItems.filter(it => it.status === 'COATING' || it.status === 'PAINTING').length;
          const packagingCount = prodItems.filter(it => it.status === 'PACKAGING').length;
          const completedCount = prodItems.filter(it => it.status === 'COMPLETED' || it.status === 'SHIPPED' || it.status === 'PARTIALLY_SHIPPED').length;

          const coatingName = fixTurkishEncoding(order.coating_type) || 'Belirtilmedi';
          const lowerCoating = coatingName.toLowerCase();
          const isStainless = lowerCoating.includes('paslanmaz') || lowerCoating.includes('304') || lowerCoating.includes('316');
          const isHotDip = lowerCoating.includes('sıcak daldırma') || lowerCoating.includes('sicak daldirma') || lowerCoating.includes('galvaniz');
          const isElectrostatic = lowerCoating.includes('boya') || lowerCoating.includes('toz') || lowerCoating.includes('ral') || lowerCoating.includes('elektrostatik');
          const isPregalv = lowerCoating.includes('pregalvaniz') || lowerCoating.includes('pre-galvaniz');

          const existingProdDoc = (documents || []).find(d => 
            d.file_type === 'PRODUCTION_FORM' || 
            (d as any).document_type === 'PRODUCTION_FORM' ||
            (d.original_name && (d.original_name.toLowerCase().includes('üretim') || d.original_name.toLowerCase().includes('uretim')))
          );

          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {/* 1. Header & Quick Production Actions */}
              <div style={{
                background: '#FFFFFF',
                border: '1px solid #E2E8F0',
                borderRadius: '12px',
                padding: isMobile ? '0.85rem' : '1.25rem',
                display: 'flex',
                flexDirection: isMobile ? 'column' : 'row',
                justifyContent: 'space-between',
                alignItems: isMobile ? 'stretch' : 'center',
                gap: '1rem',
                boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                  <div style={{
                    width: '46px',
                    height: '46px',
                    borderRadius: '10px',
                    background: '#EFF6FF',
                    border: '1px solid #BFDBFE',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    <Factory size={24} color="#2563EB" />
                  </div>
                  <div>
                    <h3 style={{ fontSize: isMobile ? '1rem' : '1.15rem', fontWeight: 700, color: '#0F172A', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                      Üretim & Yüzey Kaplama Kontrol Paneli
                    </h3>
                    <p style={{ fontSize: '0.8rem', color: '#64748B', margin: '3px 0 0 0' }}>
                      SİES TS EN 61537 Kablo Taşıma ve TS EN ISO 1461 Galvanizleme Standartlarında İmalat Süreci
                    </p>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', width: isMobile ? '100%' : 'auto' }}>
                  {existingProdDoc ? (
                    <a
                      href={`/api/documents/${existingProdDoc.id}/pdf?token=${token}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-secondary"
                      style={{
                        flex: isMobile ? 1 : 'initial',
                        fontSize: '0.82rem',
                        padding: '0.5rem 0.85rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        textDecoration: 'none',
                        color: '#1D4ED8',
                        background: '#EFF6FF',
                        border: '1px solid #93C5FD',
                        fontWeight: 600
                      }}
                      title="Mevcut Resmi Üretim İş Emri Formunu Görüntüle"
                    >
                      <FileText size={15} color="#2563EB" />
                      <span>İş Emri Formu (PDF)</span>
                    </a>
                  ) : null}

                  <button
                    onClick={handleGenerateFullProductionForm}
                    disabled={sendProdSubmitting || prodItems.length === 0}
                    className="btn btn-primary"
                    style={{
                      flex: isMobile ? 2 : 'initial',
                      fontSize: '0.82rem',
                      padding: '0.5rem 1rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      background: '#2563EB'
                    }}
                  >
                    <Printer size={15} />
                    <span>{sendProdSubmitting ? 'Hazırlanıyor...' : existingProdDoc ? 'Formu Yeniden Bas' : '⚡ Resmi İş Emri Oluştur & Bas'}</span>
                  </button>

                  <button
                    onClick={() => {
                      setSelectedItemIds(prodItems.map((it, idx) => it.id || idx + 1));
                      handleGenerateShippingLabels('100x100');
                    }}
                    disabled={labelSubmitting || prodItems.length === 0}
                    className="btn btn-secondary"
                    style={{
                      flex: isMobile ? 1 : 'initial',
                      fontSize: '0.82rem',
                      padding: '0.5rem 0.85rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      background: '#FAF5FF',
                      border: '1px solid #E9D5FF',
                      color: '#7E22CE',
                      fontWeight: 600
                    }}
                    title="Bu siparişin tüm kalemleri için 100x100mm etiket bas"
                  >
                    <Tag size={15} color="#9333EA" />
                    <span>Palet Etiketi Bas</span>
                  </button>

                  <button
                    onClick={() => handleOpenCreateWO()}
                    className="btn btn-primary"
                    style={{
                      flex: isMobile ? 2 : 'initial',
                      fontSize: '0.82rem',
                      padding: '0.5rem 1rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      background: '#059669',
                      borderColor: '#047857'
                    }}
                  >
                    <Plus size={15} />
                    <span>+ Yeni İş Emri Aç</span>
                  </button>
                </div>
              </div>

              {/* İş Emirleri Listesi (Üretim Takibi) */}
              <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '12px', padding: isMobile ? '0.75rem' : '1.25rem', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <div>
                    <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0F172A', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Factory size={16} color="var(--primary)" /> Üretim İş Emirleri Takibi ({(productionOrders || []).length} İş Emri)
                    </h4>
                    <span style={{ fontSize: '0.75rem', color: '#64748B' }}>
                      Her iş emri için bölüm, başlangıç, planlanan miktar ve gerçekleşen üretim takibi.
                    </span>
                  </div>
                  <button
                    onClick={() => handleOpenCreateWO()}
                    className="btn btn-secondary"
                    style={{ fontSize: '0.78rem', padding: '0.35rem 0.75rem', display: 'flex', alignItems: 'center', gap: '4px', background: '#ECFDF5', color: '#047857', border: '1px solid #A7F3D0', fontWeight: 600 }}
                  >
                    <Plus size={14} /> Yeni İş Emri Aç
                  </button>
                </div>

                {(productionOrders || []).length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '1.5rem', background: '#F8FAFC', borderRadius: '8px', border: '1px dashed #CBD5E1', color: '#64748B', fontSize: '0.85rem' }}>
                    <p style={{ margin: 0 }}>Bu sipariş için henüz bağımsız üretim iş emri açılmamıştır.</p>
                    <button
                      onClick={() => handleOpenCreateWO()}
                      className="btn btn-secondary"
                      style={{ marginTop: '0.75rem', fontSize: '0.78rem' }}
                    >
                      + İlk İş Emrini Oluştur
                    </button>
                  </div>
                ) : (
                  <div className="table-container" style={{ border: '1px solid #E2E8F0', borderRadius: '8px' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                      <thead>
                        <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0', textAlign: 'left', color: '#475569', fontSize: '0.72rem', textTransform: 'uppercase' }}>
                          <th style={{ padding: '0.6rem 0.75rem' }}>İş Emri No</th>
                          <th style={{ padding: '0.6rem 0.75rem' }}>Ürün</th>
                          <th style={{ padding: '0.6rem 0.75rem' }}>Bölüm / Atölye</th>
                          <th style={{ padding: '0.6rem 0.75rem', textAlign: 'right' }}>Planlanan</th>
                          <th style={{ padding: '0.6rem 0.75rem', textAlign: 'right' }}>Üretilen</th>
                          <th style={{ padding: '0.6rem 0.75rem', textAlign: 'right' }}>Fire / Hatalı</th>
                          <th style={{ padding: '0.6rem 0.75rem' }}>Tarihler</th>
                          <th style={{ padding: '0.6rem 0.75rem' }}>Durum</th>
                          <th style={{ padding: '0.6rem 0.75rem', textAlign: 'center' }}>İşlem</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(productionOrders || []).map((wo) => {
                          const planned = wo.planned_quantity || 0;
                          const produced = wo.produced_quantity || 0;
                          const pct = planned > 0 ? Math.min(100, Math.round((produced / planned) * 100)) : 0;
                          return (
                            <tr key={wo.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                              <td style={{ padding: '0.6rem 0.75rem', fontWeight: 700, color: '#0284C7' }}>
                                {wo.work_order_no}
                              </td>
                              <td style={{ padding: '0.6rem 0.75rem' }}>
                                <div style={{ fontWeight: 600, color: '#0F172A' }}>{wo.customer_product_code || '-'}</div>
                                <div style={{ fontSize: '0.72rem', color: '#64748B' }}>{wo.product_name}</div>
                              </td>
                              <td style={{ padding: '0.6rem 0.75rem', fontWeight: 600, color: '#334155' }}>
                                {wo.department}
                              </td>
                              <td style={{ padding: '0.6rem 0.75rem', textAlign: 'right', fontWeight: 700 }}>
                                {planned.toLocaleString('tr-TR')}
                              </td>
                              <td style={{ padding: '0.6rem 0.75rem', textAlign: 'right', fontWeight: 700, color: '#059669' }}>
                                {produced.toLocaleString('tr-TR')} ({pct}%)
                              </td>
                              <td style={{ padding: '0.6rem 0.75rem', textAlign: 'right', color: (wo.defect_quantity || 0) > 0 ? '#DC2626' : '#64748B' }}>
                                {wo.defect_quantity || 0}
                              </td>
                              <td style={{ padding: '0.6rem 0.75rem', fontSize: '0.75rem', color: '#64748B' }}>
                                <div>Başlangıç: {formatDate(wo.start_date)}</div>
                                {wo.planned_end_date && <div>Plan Bitiş: {formatDate(wo.planned_end_date)}</div>}
                              </td>
                              <td style={{ padding: '0.6rem 0.75rem' }}>
                                <span style={{
                                  padding: '2px 8px',
                                  borderRadius: '4px',
                                  fontSize: '0.7rem',
                                  fontWeight: 700,
                                  background: wo.status === 'COMPLETED' ? '#ECFDF5' : wo.status === 'CANCELLED' ? '#FEE2E2' : '#EFF6FF',
                                  color: wo.status === 'COMPLETED' ? '#059669' : wo.status === 'CANCELLED' ? '#DC2626' : '#1D4ED8',
                                  border: `1px solid ${wo.status === 'COMPLETED' ? '#A7F3D0' : wo.status === 'CANCELLED' ? '#FECACA' : '#BFDBFE'}`
                                }}>
                                  {wo.status === 'COMPLETED' ? 'TAMAMLANDI' : wo.status === 'CANCELLED' ? 'İPTAL' : 'ÜRETİMDE'}
                                </span>
                              </td>
                              <td style={{ padding: '0.6rem 0.75rem', textAlign: 'center' }}>
                                <button
                                  onClick={() => handleOpenUpdateWO(wo)}
                                  className="btn btn-secondary"
                                  style={{ padding: '3px 8px', fontSize: '0.72rem', background: '#F8FAFC', border: '1px solid #CBD5E1', color: '#0F172A', fontWeight: 600 }}
                                >
                                  ✏️ İlerleme Gir
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* 2. Dörtlü KPI Metrikleri */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: isMobile ? '0.5rem' : '1rem'
              }}>
                {/* KPI 1: Kaplama Cinsi & Teknik Şartname */}
                <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '12px', padding: isMobile ? '0.75rem' : '1rem', display: 'flex', flexDirection: 'column', gap: '0.4rem', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
                  <span style={{ fontSize: '0.7rem', color: '#64748B', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    KAPLAMA & YÜZEY İŞLEMİ
                  </span>
                  <div style={{ fontSize: isMobile ? '0.95rem' : '1.1rem', fontWeight: 800, color: '#0284C7', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {coatingName}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#475569', marginTop: 'auto' }}>
                    {isStainless ? '🛡️ TS EN 10088 Pasivasyon & Asitleme' :
                     isHotDip ? '🔥 TS EN ISO 1461 (450°C Çinko Min 55µm)' :
                     isElectrostatic ? '🎨 200°C Fırın Boya / RAL Rengi' :
                     isPregalv ? '⚡ TS EN 10346 Sürekli Galvaniz' :
                     'Standart TS EN 61537 Kablo Taşıma'}
                  </div>
                </div>

                {/* KPI 2: Toplam İmalat Kalemi & Miktarı */}
                <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '12px', padding: isMobile ? '0.75rem' : '1rem', display: 'flex', flexDirection: 'column', gap: '0.4rem', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
                  <span style={{ fontSize: '0.7rem', color: '#64748B', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    TOPLAM İMALAT HACMİ
                  </span>
                  <div style={{ fontSize: isMobile ? '0.95rem' : '1.1rem', fontWeight: 800, color: '#10B981' }}>
                    {prodItems.length} Kalem <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#64748B' }}>({prodTotalQty.toLocaleString('tr-TR')} Adet/Boy)</span>
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#475569', marginTop: 'auto', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    <span>Hazır: <strong style={{ color: '#059669' }}>{completedCount}</strong></span> •
                    <span>İmalatta: <strong style={{ color: '#D97706' }}>{inProdCount}</strong></span> •
                    <span>Kaplamada: <strong style={{ color: '#7C3AED' }}>{coatingCount}</strong></span>
                  </div>
                </div>

                {/* KPI 3: Genel Sipariş Durumu */}
                <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '12px', padding: isMobile ? '0.75rem' : '1rem', display: 'flex', flexDirection: 'column', gap: '0.4rem', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
                  <span style={{ fontSize: '0.7rem', color: '#64748B', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    GÜNCEL SİPARİŞ AŞAMASI
                  </span>
                  <div style={{ fontSize: isMobile ? '0.95rem' : '1.1rem', fontWeight: 800, color: getStatusColor(order.status) }}>
                    {getStatusTurkishLabel(order.status)}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#64748B', marginTop: 'auto' }}>
                    Ref: <strong>{order.customer_order_no || order.order_no}</strong>
                  </div>
                </div>

                {/* KPI 4: İmalat Teslim Tarihi & Termin */}
                <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '12px', padding: isMobile ? '0.75rem' : '1rem', display: 'flex', flexDirection: 'column', gap: '0.4rem', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
                  <span style={{ fontSize: '0.7rem', color: '#64748B', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    İSTENEN TESLİM TERMİNİ
                  </span>
                  <div style={{ fontSize: isMobile ? '0.95rem' : '1.1rem', fontWeight: 800, color: '#334155' }}>
                    {formatDate(order.requested_delivery_date || order.order_date)}
                  </div>
                  <div style={{ fontSize: '0.72rem', marginTop: 'auto' }}>
                    {(() => {
                      const badge = getDeliveryStatusBadge(order.requested_delivery_date);
                      return (
                        <span style={{ color: badge.color, fontWeight: 700, background: badge.bg, border: `1px solid ${badge.border}`, padding: '1px 6px', borderRadius: '4px' }}>
                          {badge.label}
                        </span>
                      );
                    })()}
                  </div>
                </div>
              </div>

              {/* 3. 4 Aşamalı İmalat Süreç Hattı (Visual Pipeline) */}
              <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '12px', padding: isMobile ? '0.75rem' : '1.25rem', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.4rem' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1E293B', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Activity size={16} color="var(--primary)" /> 4 Aşamalı Fabrika İmalat Hattı
                  </span>
                  <span style={{ fontSize: '0.72rem', color: '#64748B' }}>
                    Toplu butonlarla tüm kalemleri bir sonraki aşamaya aktarabilirsiniz
                  </span>
                </div>

                <div style={{
                  display: 'grid',
                  gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, 1fr)',
                  gap: isMobile ? '0.5rem' : '0.75rem'
                }}>
                  {/* İstasyon 1: Kesim-Delme */}
                  <div style={{
                    background: inProdCount > 0 ? '#EFF6FF' : '#F8FAFC',
                    border: inProdCount > 0 ? '1.5px solid #3B82F6' : '1px solid #E2E8F0',
                    borderRadius: '8px',
                    padding: '0.75rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#1E40AF' }}>1. MEKANİK İMALAT</span>
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#2563EB', background: '#DBEAFE', padding: '1px 6px', borderRadius: '10px' }}>{inProdCount} Kalem</span>
                    </div>
                    <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#0F172A' }}>Lazer / Punch & Büküm</div>
                    <p style={{ fontSize: '0.68rem', color: '#64748B', margin: '2px 0 6px 0', lineHeight: 1.3 }}>
                      Roll-forming, abkant pres büküm ve delik delme istasyonu
                    </p>
                    <button
                      onClick={() => handleUpdateItemProductionStatus(prodItems.map((_, idx) => prodItems[idx].id || idx + 1), 'IN_PRODUCTION')}
                      disabled={batchUpdating}
                      style={{
                        marginTop: 'auto',
                        background: '#3B82F6',
                        color: '#FFFFFF',
                        border: 'none',
                        borderRadius: '6px',
                        padding: '4px 8px',
                        fontSize: '0.72rem',
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                    >
                      ⚙️ Tümünü Üretime Al
                    </button>
                  </div>

                  {/* İstasyon 2: Kaplama / Yüzey İşlemi */}
                  <div style={{
                    background: coatingCount > 0 ? '#FAF5FF' : '#F8FAFC',
                    border: coatingCount > 0 ? '1.5px solid #8B5CF6' : '1px solid #E2E8F0',
                    borderRadius: '8px',
                    padding: '0.75rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#6B21A8' }}>2. YÜZEY KAPLAMA</span>
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#7E22CE', background: '#F3E8FF', padding: '1px 6px', borderRadius: '10px' }}>{coatingCount} Kalem</span>
                    </div>
                    <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#0F172A' }}>Galvaniz / Boya / Asit</div>
                    <p style={{ fontSize: '0.68rem', color: '#64748B', margin: '2px 0 6px 0', lineHeight: 1.3 }}>
                      {coatingName} yüzey işlem tesisi ve fırınlama banyosu
                    </p>
                    <button
                      onClick={() => handleUpdateItemProductionStatus(prodItems.map((_, idx) => prodItems[idx].id || idx + 1), 'COATING')}
                      disabled={batchUpdating}
                      style={{
                        marginTop: 'auto',
                        background: '#8B5CF6',
                        color: '#FFFFFF',
                        border: 'none',
                        borderRadius: '6px',
                        padding: '4px 8px',
                        fontSize: '0.72rem',
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                    >
                      🧪 Tümünü Kaplamaya Sevk
                    </button>
                  </div>

                  {/* İstasyon 3: Paketleme & Etiketleme */}
                  <div style={{
                    background: packagingCount > 0 ? '#F0FDF4' : '#F8FAFC',
                    border: packagingCount > 0 ? '1.5px solid #10B981' : '1px solid #E2E8F0',
                    borderRadius: '8px',
                    padding: '0.75rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#065F46' }}>3. KALİTE & PAKET</span>
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#047857', background: '#DCFCE7', padding: '1px 6px', borderRadius: '10px' }}>{packagingCount} Kalem</span>
                    </div>
                    <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#0F172A' }}>Test, Paletleme & Çember</div>
                    <p style={{ fontSize: '0.68rem', color: '#64748B', margin: '2px 0 6px 0', lineHeight: 1.3 }}>
                      Kalite kontrol ölçümü, 100x100mm etiket basımı ve paletleme
                    </p>
                    <button
                      onClick={() => handleUpdateItemProductionStatus(prodItems.map((_, idx) => prodItems[idx].id || idx + 1), 'PACKAGING')}
                      disabled={batchUpdating}
                      style={{
                        marginTop: 'auto',
                        background: '#059669',
                        color: '#FFFFFF',
                        border: 'none',
                        borderRadius: '6px',
                        padding: '4px 8px',
                        fontSize: '0.72rem',
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                    >
                      📦 Tümünü Paketlemeye Al
                    </button>
                  </div>

                  {/* İstasyon 4: Tamamlandı / Sevkiyata Hazır */}
                  <div style={{
                    background: completedCount > 0 ? '#ECFDF5' : '#F8FAFC',
                    border: completedCount > 0 ? '1.5px solid #059669' : '1px solid #E2E8F0',
                    borderRadius: '8px',
                    padding: '0.75rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#065F46' }}>4. İMALAT TAMAMLANDI</span>
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#059669', background: '#D1FAE5', padding: '1px 6px', borderRadius: '10px' }}>{completedCount} Kalem</span>
                    </div>
                    <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#0F172A' }}>Sevkiyata Hazır Ambar</div>
                    <p style={{ fontSize: '0.68rem', color: '#64748B', margin: '2px 0 6px 0', lineHeight: 1.3 }}>
                      İmalatı eksiksiz bitmiş, irsaliye kesimine hazır mamuller
                    </p>
                    <button
                      onClick={() => handleUpdateItemProductionStatus(prodItems.map((_, idx) => prodItems[idx].id || idx + 1), 'COMPLETED')}
                      disabled={batchUpdating}
                      style={{
                        marginTop: 'auto',
                        background: '#10B981',
                        color: '#FFFFFF',
                        border: 'none',
                        borderRadius: '6px',
                        padding: '4px 8px',
                        fontSize: '0.72rem',
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                    >
                      ✓ Tümünü Tamamlandı Yap
                    </button>
                  </div>
                </div>
              </div>

              {/* 4. Kalem Bazlı İmalat & Kaplama Tablosu */}
              <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '12px', padding: isMobile ? '0.75rem' : '1.25rem', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <div>
                    <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0F172A', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Layers size={16} color="var(--primary)" /> Sipariş İmalat ve Kaplama Kalemleri ({prodItems.length} Kalem)
                    </h4>
                    <span style={{ fontSize: '0.75rem', color: '#64748B' }}>
                      Her bir kalemin üretim istasyonunu bağımsız olarak güncelleyebilir veya toplu işlem yapabilirsiniz.
                    </span>
                  </div>

                  {selectedItemIds.length > 0 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#2563EB', marginRight: '4px' }}>
                        {selectedItemIds.length} Seçili:
                      </span>
                      <button onClick={() => handleUpdateItemProductionStatus(selectedItemIds, 'IN_PRODUCTION')} className="btn btn-secondary" style={{ padding: '0.3rem 0.6rem', fontSize: '0.72rem', background: '#EFF6FF', color: '#1D4ED8', border: '1px solid #BFDBFE' }}>
                        ⚙️ Üretime Al
                      </button>
                      <button onClick={() => handleUpdateItemProductionStatus(selectedItemIds, 'COATING')} className="btn btn-secondary" style={{ padding: '0.3rem 0.6rem', fontSize: '0.72rem', background: '#FAF5FF', color: '#7E22CE', border: '1px solid #E9D5FF' }}>
                        🧪 Kaplamaya Al
                      </button>
                      <button onClick={() => handleUpdateItemProductionStatus(selectedItemIds, 'PACKAGING')} className="btn btn-secondary" style={{ padding: '0.3rem 0.6rem', fontSize: '0.72rem', background: '#F0FDF4', color: '#047857', border: '1px solid #BBF7D0' }}>
                        📦 Paketlemeye Al
                      </button>
                      <button onClick={() => handleUpdateItemProductionStatus(selectedItemIds, 'COMPLETED')} className="btn btn-secondary" style={{ padding: '0.3rem 0.6rem', fontSize: '0.72rem', background: '#ECFDF5', color: '#059669', border: '1px solid #A7F3D0' }}>
                        ✓ Tamamlandı
                      </button>
                    </div>
                  )}
                </div>

                <div className="table-container">
                  <table className="custom-table" style={{ fontSize: '0.8rem' }}>
                    <thead>
                      <tr>
                        <th style={{ width: '32px' }}>
                          <input
                            type="checkbox"
                            checked={selectedItemIds.length === prodItems.length && prodItems.length > 0}
                            onChange={handleToggleSelectAll}
                            title="Tümünü Seç / Seçimi Kaldır"
                          />
                        </th>
                        <th style={{ width: '35px' }}>#</th>
                        <th style={{ width: '130px' }}>Ürün Kodu</th>
                        <th>Ürün Açıklaması & Teknik Detay</th>
                        <th style={{ width: '110px' }}>İmalat Miktarı</th>
                        <th style={{ width: '130px' }}>Kaplama / Malzeme</th>
                        <th style={{ width: '130px' }}>İmalat İstasyonu</th>
                        <th style={{ width: '170px', textAlign: 'center' }}>İstasyon Değiştir</th>
                      </tr>
                    </thead>
                    <tbody>
                      {prodItems.map((item, idx) => {
                        const itemId = item.id || idx + 1;
                        const isSelected = selectedItemIds.includes(itemId);
                        const qty = parseFloat(String(item.quantity)) || 0;
                        const unit = item.unit || 'Adet';
                        const code = item.customerProductCode || item.customer_product_code || '-';
                        const name = item.productName || item.product_name || 'Tanımsız Ürün';
                        const mat = item.material || (isStainless ? 'Paslanmaz Çelik' : isHotDip ? 'Galvanizli Çelik' : 'Çelik');
                        const coating = item.surfaceCoating || coatingName;

                        return (
                          <tr key={itemId} style={{ background: isSelected ? '#EFF6FF' : undefined }}>
                            <td>
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => handleToggleSelectItem(itemId)}
                              />
                            </td>
                            <td style={{ color: '#94A3B8', fontWeight: 600 }}>{item.lineNo || item.line_no || idx + 1}</td>
                            <td>
                              <strong style={{ color: '#0284C7', fontSize: '0.82rem' }}>{code}</strong>
                            </td>
                            <td>
                              <div style={{ fontWeight: 600, color: '#1E293B', fontSize: '0.82rem' }}>{name}</div>
                              <div style={{ display: 'flex', gap: '4px', marginTop: '3px', flexWrap: 'wrap' }}>
                                {coating && coating !== 'Belirtilmedi' && (
                                  <span style={{ background: '#EFF6FF', color: '#1D4ED8', padding: '1px 5px', borderRadius: '3px', fontSize: '0.68rem', fontWeight: 600 }}>
                                    {coating}
                                  </span>
                                )}
                                {mat && mat !== 'Çelik' && (
                                  <span style={{ background: '#F1F5F9', color: '#475569', padding: '1px 5px', borderRadius: '3px', fontSize: '0.68rem' }}>
                                    {mat}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td>
                              <strong style={{ color: '#0F172A', fontSize: '0.85rem' }}>{qty.toLocaleString('tr-TR')}</strong>
                              <span style={{ color: '#64748B', fontSize: '0.75rem', marginLeft: '3px' }}>{unit}</span>
                            </td>
                            <td>
                              <span style={{ fontSize: '0.78rem', color: '#334155', fontWeight: 600 }}>
                                {coating || mat}
                              </span>
                            </td>
                            <td>
                              {getItemStatusBadge(item.status)}
                            </td>
                            <td>
                              <div style={{ display: 'flex', gap: '3px', justifyContent: 'center' }}>
                                <button
                                  onClick={() => handleUpdateItemProductionStatus([itemId], 'IN_PRODUCTION')}
                                  title="Sac İşleme / Büküme Al"
                                  style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', color: '#1D4ED8', borderRadius: '4px', padding: '2px 5px', fontSize: '0.68rem', fontWeight: 600, cursor: 'pointer' }}
                                >
                                  ⚙️ Büküm
                                </button>
                                <button
                                  onClick={() => handleUpdateItemProductionStatus([itemId], 'COATING')}
                                  title="Kaplama / Boyaya Sevk Et"
                                  style={{ background: '#FAF5FF', border: '1px solid #E9D5FF', color: '#7E22CE', borderRadius: '4px', padding: '2px 5px', fontSize: '0.68rem', fontWeight: 600, cursor: 'pointer' }}
                                >
                                  🧪 Kaplama
                                </button>
                                <button
                                  onClick={() => handleUpdateItemProductionStatus([itemId], 'PACKAGING')}
                                  title="Paketleme & Etiketlemeye Al"
                                  style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', color: '#047857', borderRadius: '4px', padding: '2px 5px', fontSize: '0.68rem', fontWeight: 600, cursor: 'pointer' }}
                                >
                                  📦 Paket
                                </button>
                                <button
                                  onClick={() => handleUpdateItemProductionStatus([itemId], 'COMPLETED')}
                                  title="İmalatı Tamamla"
                                  style={{ background: '#ECFDF5', border: '1px solid #A7F3D0', color: '#059669', borderRadius: '4px', padding: '2px 5px', fontSize: '0.68rem', fontWeight: 600, cursor: 'pointer' }}
                                >
                                  ✓ Hazır
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 5. Kalite Güvence & Şartname Kartı */}
              <div style={{
                background: '#F8FAFC',
                border: '1px solid #CBD5E1',
                borderRadius: '10px',
                padding: '0.85rem 1.25rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '0.75rem',
                fontSize: '0.78rem',
                color: '#475569'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <ShieldCheck size={20} color="#059669" />
                  <div>
                    <span style={{ fontWeight: 700, color: '#0F172A' }}>SİES İmalat Kalite ve Standart Güvencesi:</span>
                    <span style={{ marginLeft: '6px' }}>Kablo Kanalı: TS EN 61537 • Sıcak Daldırma: TS EN ISO 1461 • Paslanmaz: AISI 304/316</span>
                  </div>
                </div>
                <div style={{ fontSize: '0.75rem', color: '#64748B' }}>
                  Onaylayan: <strong style={{ color: '#0F172A' }}>Faruk ORUÇ (Kalite Müdürü)</strong>
                </div>
              </div>
            </div>
          );
        })()}

        {/* TAB 5: SUBCONTRACT & COATING (KAPLAMA VE FASON TAKİBİ) */}
        {activeTab === 'subcontract' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{
              background: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: '12px',
              padding: isMobile ? '0.85rem' : '1.25rem',
              display: 'flex',
              flexDirection: isMobile ? 'column' : 'row',
              justifyContent: 'space-between',
              alignItems: isMobile ? 'stretch' : 'center',
              gap: '1rem',
              boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                <div style={{
                  width: '46px',
                  height: '46px',
                  borderRadius: '10px',
                  background: '#FAF5FF',
                  border: '1px solid #E9D5FF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <Paintbrush size={24} color="#7E22CE" />
                </div>
                <div>
                  <h3 style={{ fontSize: isMobile ? '1rem' : '1.15rem', fontWeight: 700, color: '#0F172A', margin: 0 }}>
                    Kaplama & Dış Fason Takip Paneli
                  </h3>
                  <p style={{ fontSize: '0.8rem', color: '#64748B', margin: '3px 0 0 0' }}>
                    Galvaniz, Elektrostatik Toz Boya ve Fason Tesislerine Gönderilen / Dönen Parti Yönetimi
                  </p>
                </div>
              </div>

              <button
                onClick={() => handleOpenCreateSub()}
                className="btn btn-primary"
                style={{ fontSize: '0.82rem', padding: '0.5rem 1rem', background: '#7E22CE', borderColor: '#6B21A8', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <Plus size={16} /> + Fasona Gönder (Yeni Parti)
              </button>
            </div>

            {/* Subcontract Orders Table */}
            <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '12px', padding: isMobile ? '0.75rem' : '1.25rem', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
              {(subcontractOrders || []).length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem', background: '#F8FAFC', borderRadius: '8px', border: '1px dashed #CBD5E1', color: '#64748B' }}>
                  <Paintbrush size={36} style={{ marginBottom: '0.5rem', opacity: 0.3 }} />
                  <p style={{ margin: 0, fontWeight: 600 }}>Bu sipariş için henüz fason veya kaplama sevkiyat kaydı açılmamıştır.</p>
                  <p style={{ fontSize: '0.8rem', marginTop: '0.35rem' }}>Kaplamaya veya fason atölyeye ürün göndermek için yukarıdaki "+ Fasona Gönder" butonuna tıklayınız.</p>
                </div>
              ) : (
                <div className="table-container" style={{ border: '1px solid #E2E8F0', borderRadius: '8px' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                    <thead>
                      <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0', textAlign: 'left', color: '#475569', fontSize: '0.72rem', textTransform: 'uppercase' }}>
                        <th style={{ padding: '0.6rem 0.75rem' }}>Parti No</th>
                        <th style={{ padding: '0.6rem 0.75rem' }}>Ürün</th>
                        <th style={{ padding: '0.6rem 0.75rem' }}>Firma & İşlem</th>
                        <th style={{ padding: '0.6rem 0.75rem' }}>İrsaliye</th>
                        <th style={{ padding: '0.6rem 0.75rem', textAlign: 'right' }}>Giden</th>
                        <th style={{ padding: '0.6rem 0.75rem', textAlign: 'right' }}>Dönen</th>
                        <th style={{ padding: '0.6rem 0.75rem', textAlign: 'right' }}>Fire</th>
                        <th style={{ padding: '0.6rem 0.75rem', textAlign: 'right' }}>Bekleyen</th>
                        <th style={{ padding: '0.6rem 0.75rem' }}>Tarihler</th>
                        <th style={{ padding: '0.6rem 0.75rem' }}>Durum</th>
                        <th style={{ padding: '0.6rem 0.75rem', textAlign: 'center' }}>İşlem</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(subcontractOrders || []).map((sub) => {
                        const sent = sub.sent_quantity || 0;
                        const ret = sub.returned_quantity || 0;
                        const def = sub.defect_quantity || 0;
                        const pending = Math.max(0, sent - ret - def);
                        return (
                          <tr key={sub.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                            <td style={{ padding: '0.6rem 0.75rem', fontWeight: 700, color: '#7E22CE' }}>
                              {sub.batch_no}
                            </td>
                            <td style={{ padding: '0.6rem 0.75rem' }}>
                              <div style={{ fontWeight: 600, color: '#0F172A' }}>{sub.customer_product_code || '-'}</div>
                              <div style={{ fontSize: '0.72rem', color: '#64748B' }}>{sub.product_name}</div>
                            </td>
                            <td style={{ padding: '0.6rem 0.75rem' }}>
                              <div style={{ fontWeight: 700, color: '#1E293B' }}>{sub.subcontractor_name}</div>
                              <span style={{ fontSize: '0.7rem', background: '#F3E8FF', color: '#6B21A8', padding: '1px 5px', borderRadius: '4px', fontWeight: 600 }}>
                                {sub.operation_type}
                              </span>
                            </td>
                            <td style={{ padding: '0.6rem 0.75rem', color: '#475569', fontWeight: 600 }}>
                              {sub.waybill_no || '-'}
                            </td>
                            <td style={{ padding: '0.6rem 0.75rem', textAlign: 'right', fontWeight: 700 }}>
                              {sent.toLocaleString('tr-TR')}
                            </td>
                            <td style={{ padding: '0.6rem 0.75rem', textAlign: 'right', fontWeight: 700, color: '#059669' }}>
                              {ret.toLocaleString('tr-TR')}
                            </td>
                            <td style={{ padding: '0.6rem 0.75rem', textAlign: 'right', color: def > 0 ? '#DC2626' : '#64748B' }}>
                              {def.toLocaleString('tr-TR')}
                            </td>
                            <td style={{ padding: '0.6rem 0.75rem', textAlign: 'right', fontWeight: 700, color: pending > 0 ? '#D97706' : '#64748B' }}>
                              {pending.toLocaleString('tr-TR')}
                            </td>
                            <td style={{ padding: '0.6rem 0.75rem', fontSize: '0.75rem', color: '#64748B' }}>
                              <div>Gidiş: {formatDate(sub.sent_date)}</div>
                              {sub.expected_return_date && <div>Beklenen: {formatDate(sub.expected_return_date)}</div>}
                            </td>
                            <td style={{ padding: '0.6rem 0.75rem' }}>
                              <span style={{
                                padding: '2px 8px',
                                borderRadius: '4px',
                                fontSize: '0.7rem',
                                fontWeight: 700,
                                background: sub.status === 'COMPLETED' ? '#ECFDF5' : sub.status === 'PARTIAL_RETURN' ? '#FFFBEB' : '#FAF5FF',
                                color: sub.status === 'COMPLETED' ? '#059669' : sub.status === 'PARTIAL_RETURN' ? '#D97706' : '#7E22CE',
                                border: `1px solid ${sub.status === 'COMPLETED' ? '#A7F3D0' : sub.status === 'PARTIAL_RETURN' ? '#FDE68A' : '#E9D5FF'}`
                              }}>
                                {sub.status === 'COMPLETED' ? 'TAMAMLANDI' : sub.status === 'PARTIAL_RETURN' ? 'KISMİ DÖNÜŞ' : 'KAPLAMADA'}
                              </span>
                            </td>
                            <td style={{ padding: '0.6rem 0.75rem', textAlign: 'center' }}>
                              {sub.status !== 'COMPLETED' ? (
                                <button
                                  onClick={() => handleOpenReturnSub(sub)}
                                  className="btn btn-secondary"
                                  style={{ padding: '3px 8px', fontSize: '0.72rem', background: '#F0FDF4', border: '1px solid #BBF7D0', color: '#166534', fontWeight: 600 }}
                                >
                                  📦 Mal Kabul
                                </button>
                              ) : (
                                <span style={{ fontSize: '0.72rem', color: '#059669', fontWeight: 600 }}>✓ Bitti</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 6: SHIPPING LOG & DISPATCH HISTORY (GROUPED BY WAYBILL) */}
        {activeTab === 'shipping' && (
          <div>
            <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', justifyContent: 'space-between', alignItems: isMobile ? 'stretch' : 'center', marginBottom: '1rem', gap: '0.5rem' }}>
              <div>
                <h3 style={{ fontSize: isMobile ? '0.9rem' : '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>Sevkiyat Geçmişi ve İrsaliye Kayıtları</h3>
                <span style={{ fontSize: isMobile ? '0.72rem' : '0.8rem', color: 'var(--text-muted)' }}>Toplam {waybillGroups.length} Adet Sevkiyat İrsaliyesi Düzenlendi</span>
              </div>
              <button
                onClick={handleOpenDispatchModal}
                disabled={selectedItemIds.length === 0}
                className="btn btn-primary"
                style={{ fontSize: isMobile ? '0.78rem' : '0.85rem', width: isMobile ? '100%' : 'auto', padding: isMobile ? '0.5rem' : '0.4rem 0.85rem' }}
              >
                <Truck size={16} /> Yeni Sevkiyat Oluştur (Seçili Kalemlerle)
              </button>
            </div>

            {waybillGroups.length === 0 ? (
              <div style={{ background: 'var(--bg-card)', padding: isMobile ? '1.25rem' : '2rem', borderRadius: '8px', textAlign: 'center', color: 'var(--text-muted)', border: '1px dashed var(--border-color)' }}>
                <Truck size={36} style={{ marginBottom: '0.5rem', opacity: 0.4 }} />
                <p>Bu sipariş için henüz parçalı sevkiyat irsaliyesi kesilmemiştir.</p>
                <p style={{ fontSize: '0.8rem', marginTop: '0.25rem' }}>Kalemler sekmesinden sevk edilecek kalemleri seçip "Seçilen Kalemleri Sevk Et" düğmesine tıklayın.</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gap: isMobile ? '0.75rem' : '1.25rem' }}>
                {waybillGroups.map((group, idx) => (
                  <div key={group.waybill_number || idx} style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderLeft: '5px solid #10B981', padding: isMobile ? '0.75rem 0.85rem' : '1.25rem', borderRadius: '10px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <span className="badge badge-completed" style={{ fontSize: '0.8rem', fontWeight: 700, padding: '0.25rem 0.55rem' }}>
                          <FileCheck size={14} /> İRSALİYE: #{group.waybill_number}
                        </span>
                        {group.vehicle_plate && (
                          <span style={{ fontSize: '0.78rem', color: '#0284C7', fontWeight: 600, background: '#E0F2FE', border: '1px solid #BAE6FD', padding: '0.2rem 0.5rem', borderRadius: '6px' }}>
                            {group.vehicle_plate}
                          </span>
                        )}
                        {group.driver_name && (
                          <span style={{ fontSize: '0.78rem', color: '#334155', fontWeight: 600 }}>
                            <User size={13} style={{ marginRight: '3px', display: 'inline', verticalAlign: 'middle' }} /> {group.driver_name}
                          </span>
                        )}
                        <span style={{ fontSize: '0.75rem', background: '#DCFCE7', color: '#15803D', border: '1px solid #BBF7D0', padding: '0.15rem 0.5rem', borderRadius: '6px', fontWeight: 600 }}>
                          {group.items.length} Kalem
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <button
                          onClick={() => handlePrintWaybillPdf(group.waybill_number)}
                          disabled={printingWaybill === group.waybill_number}
                          className="btn btn-secondary"
                          style={{
                            padding: '0.3rem 0.65rem',
                            fontSize: '0.75rem',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            background: '#EFF6FF',
                            color: '#1D4ED8',
                            border: '1px solid #93C5FD',
                            fontWeight: 600
                          }}
                          title="Bu irsaliye için resmi PDF çıktısı al"
                        >
                          <Printer size={14} color="#2563EB" />
                          <span>{printingWaybill === group.waybill_number ? 'Yazdırılıyor...' : 'İrsaliye Yazdır (PDF)'}</span>
                        </button>
                        <span style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 500 }}>
                          {new Date(group.created_at).toLocaleString('tr-TR')}
                        </span>
                      </div>
                    </div>

                    {/* Table of items in this waybill */}
                    <div className="table-container" style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '8px' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                        <thead>
                          <tr style={{ background: '#F1F5F9', borderBottom: '1px solid #E2E8F0', textAlign: 'left', color: '#475569', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                            <th style={{ padding: '0.6rem 0.75rem', width: '40px' }}>#</th>
                            <th style={{ padding: '0.6rem 0.75rem', width: '160px' }}>Ürün Kodu</th>
                            <th style={{ padding: '0.6rem 0.75rem' }}>Ürün Açıklaması</th>
                            <th style={{ padding: '0.6rem 0.75rem', textAlign: 'right', width: '150px' }}>Sevk Miktarı</th>
                            <th style={{ padding: '0.6rem 0.75rem', textAlign: 'center', width: '130px' }}>Durum / İşlem</th>
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
                              <td style={{ padding: '0.65rem 0.75rem', textAlign: 'center' }}>
                                {item.status === 'CANCELLED' ? (
                                  <span style={{ fontSize: '0.7rem', padding: '2px 6px', background: '#FEE2E2', color: '#DC2626', border: '1px solid #FECACA', borderRadius: '4px', fontWeight: 700 }} title={item.cancellation_reason || 'İptal Edildi'}>
                                    İPTAL EDİLDİ
                                  </span>
                                ) : (
                                  <button
                                    onClick={() => handleCancelDispatchItem(item.dispatch_id, group.waybill_number)}
                                    className="btn btn-secondary"
                                    style={{ padding: '2px 7px', fontSize: '0.7rem', color: '#DC2626', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '4px', fontWeight: 600 }}
                                    title="Bu kalemin sevkiyatını iptal et ve sevk miktarını geri al"
                                  >
                                    ↩️ İptal Et
                                  </button>
                                )}
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

        {/* TAB 6: HISTORY (1.6 Comprehensive Audit Trail Table) */}
        {activeTab === 'history' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div>
                <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#0F172A', margin: 0 }}>
                  Sipariş Değişiklik ve Denetim Geçmişi (Audit Trail)
                </h3>
                <span style={{ fontSize: '0.78rem', color: '#64748B' }}>
                  Toplam {history.length} işlem kaydı (Miktar güncellemeleri, üretim, sevkiyat ve durum değişiklikleri)
                </span>
              </div>
              <button onClick={onRefresh} className="btn btn-secondary" style={{ padding: '0.35rem 0.65rem', fontSize: '0.78rem' }}>
                <RefreshCw size={13} /> Geçmişi Yenile
              </button>
            </div>

            {history.length === 0 ? (
              <div style={{ padding: '2.5rem', textAlign: 'center', color: '#94A3B8', background: '#F8FAFC', borderRadius: '8px', border: '1px dashed #CBD5E1' }}>
                Bu siparişe ait henüz bir işlem kaydı bulunmuyor.
              </div>
            ) : (
              <div className="table-container" style={{ background: '#FFFFFF', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                  <thead>
                    <tr style={{ background: '#F1F5F9', borderBottom: '1px solid #CBD5E1', textAlign: 'left', color: '#475569', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                      <th style={{ padding: '0.65rem 0.85rem', width: '140px' }}>Tarih & Saat</th>
                      <th style={{ padding: '0.65rem 0.85rem', width: '130px' }}>Kullanıcı</th>
                      <th style={{ padding: '0.65rem 0.85rem', width: '140px' }}>İşlem</th>
                      <th style={{ padding: '0.65rem 0.85rem', width: '120px' }}>Önceki Değer</th>
                      <th style={{ padding: '0.65rem 0.85rem', width: '120px' }}>Yeni Değer</th>
                      <th style={{ padding: '0.65rem 0.85rem' }}>Açıklama / Detaylı Not</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((h, hIdx) => {
                      const actionLabel = (h as any).action || 'DURUM_DEGISIKLIGI';
                      const prevVal = (h as any).previousValue || h.fromStatus || '-';
                      const newVal = (h as any).newValue || h.toStatus || '-';
                      const formattedTime = new Date(h.createdAt).toLocaleString('tr-TR', {
                        day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
                      });

                      return (
                        <tr key={h.id || hIdx} style={{ borderBottom: '1px solid #F1F5F9', background: hIdx % 2 === 0 ? '#FFFFFF' : '#F8FAFC' }}>
                          <td style={{ padding: '0.6rem 0.85rem', color: '#64748B', fontWeight: 600, whiteSpace: 'nowrap' }}>
                            <Clock size={12} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }} />
                            {formattedTime}
                          </td>
                          <td style={{ padding: '0.6rem 0.85rem', fontWeight: 600, color: '#0F172A' }}>
                            <User size={12} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle', color: '#0284C7' }} />
                            {h.userName || 'Sistem'}
                          </td>
                          <td style={{ padding: '0.6rem 0.85rem' }}>
                            <span style={{
                              display: 'inline-block',
                              padding: '2px 8px',
                              borderRadius: '4px',
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              background: '#EFF6FF',
                              color: '#1D4ED8',
                              border: '1px solid #BFDBFE'
                            }}>
                              {actionLabel}
                            </span>
                          </td>
                          <td style={{ padding: '0.6rem 0.85rem', color: '#94A3B8', fontWeight: 600 }}>
                            {getStatusTurkishLabel(prevVal)}
                          </td>
                          <td style={{ padding: '0.6rem 0.85rem', fontWeight: 700, color: '#059669' }}>
                            {getStatusTurkishLabel(newVal)}
                          </td>
                          <td style={{ padding: '0.6rem 0.85rem', color: '#334155', lineHeight: 1.4 }}>
                            {fixTurkishEncoding(h.notes || '-')}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ============================================================== */}
      {/* DETAILED SEVKİYAT GİRİŞİ MODAL DIALOG (1.7) */}
      {/* ============================================================== */}
      {dispatchModalOpen && (
        <div className="modal-overlay" style={{ background: 'rgba(15,23,42,0.6)', zIndex: 1000 }}>
          <div className="modal-content" style={{ maxWidth: '680px', width: isMobile ? '96%' : '90%', maxHeight: '90vh', overflowY: 'auto', background: '#FFFFFF', color: '#0F172A', border: '1px solid #CBD5E1', padding: isMobile ? '0.85rem' : '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid #E2E8F0', paddingBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Truck size={22} color="var(--primary)" />
                <h3 style={{ fontSize: isMobile ? '1rem' : '1.1rem', fontWeight: 700, color: '#0F172A' }}>Parçalı Sevkiyat İrsaliyesi Oluştur</h3>
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

            {/* Vehicle & Driver Info Form with Sevk Tarihi (1.7) */}
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(180px, 1fr))', gap: isMobile ? '0.6rem' : '0.85rem', marginBottom: '1.25rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: '#0284C7', fontWeight: 700, marginBottom: '0.25rem' }}>
                  <Calendar size={13} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '3px' }} />
                  SEVK TARİHİ *
                </label>
                <input
                  type="date"
                  value={dispatchDate}
                  onChange={(e) => setDispatchDate(e.target.value)}
                  style={{ width: '100%', background: '#F8FAFC', border: '1.5px solid #0284C7', color: '#0F172A', padding: '0.45rem 0.65rem', borderRadius: '6px', fontSize: '0.88rem', fontWeight: 600 }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: '#64748B', fontWeight: 600, marginBottom: '0.25rem' }}>
                  İRSALİYE NUMARASI *
                </label>
                <input
                  type="text"
                  placeholder="Örn: IRS-2026-0045"
                  value={waybillNumber}
                  onChange={(e) => setWaybillNumber(e.target.value)}
                  style={{ width: '100%', background: '#F8FAFC', border: '1px solid #CBD5E1', color: '#0F172A', padding: '0.45rem 0.65rem', borderRadius: '6px', fontSize: '0.88rem' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: '#64748B', fontWeight: 600, marginBottom: '0.25rem' }}>
                  ŞOFÖR ADI SOYADI *
                </label>
                <input
                  type="text"
                  placeholder="Örn: Ahmet Yılmaz"
                  value={driverName}
                  onChange={(e) => setDriverName(e.target.value)}
                  style={{ width: '100%', background: '#F8FAFC', border: '1px solid #CBD5E1', color: '#0F172A', padding: '0.45rem 0.65rem', borderRadius: '6px', fontSize: '0.88rem' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: '#64748B', fontWeight: 600, marginBottom: '0.25rem' }}>
                  ARAÇ PLAKASI *
                </label>
                <input
                  type="text"
                  placeholder="Örn: 34 ABC 123"
                  value={vehiclePlate}
                  onChange={(e) => setVehiclePlate(e.target.value.toUpperCase())}
                  style={{ width: '100%', background: '#F8FAFC', border: '1px solid #CBD5E1', color: '#0F172A', padding: '0.45rem 0.65rem', borderRadius: '6px', fontSize: '0.88rem' }}
                />
              </div>

              <div style={{ gridColumn: isMobile ? '1' : '1 / -1' }}>
                <label style={{ display: 'block', fontSize: '0.75rem', color: '#64748B', fontWeight: 600, marginBottom: '0.25rem' }}>
                  SEVKİYAT NOTU (OPSİYONEL)
                </label>
                <input
                  type="text"
                  placeholder="Örn: 1. Parti Şantiye Teslimatı..."
                  value={dispatchNotes}
                  onChange={(e) => setDispatchNotes(e.target.value)}
                  style={{ width: '100%', background: '#F8FAFC', border: '1px solid #CBD5E1', color: '#0F172A', padding: '0.45rem 0.65rem', borderRadius: '6px', fontSize: '0.88rem' }}
                />
              </div>
            </div>

            {/* Selected Items Dispatch Quantities List */}
            <h4 style={{ fontSize: '0.85rem', color: '#0284C7', marginBottom: '0.65rem', fontWeight: 700 }}>
              Sevk Edilecek Kalem Miktarlarını Belirleyin ({selectedItemIds.length} Kalem Seçili)
            </h4>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', marginBottom: '1.25rem', maxHeight: '280px', overflowY: 'auto' }}>
              {selectedItemIds.map((id) => {
                const item = items.find((it, idx) => (it.id || idx + 1) === id);
                if (!item) return null;

                const qty = parseFloat(String(item.quantity)) || 0;
                const shipped = parseFloat(String(item.shippedQuantity || 0));
                const remaining = Math.max(0, qty - shipped);

                return (
                  <div key={id} style={{ background: '#F8FAFC', padding: isMobile ? '0.65rem 0.75rem' : '0.85rem 1rem', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                    <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', justifyContent: 'space-between', alignItems: isMobile ? 'flex-start' : 'center', marginBottom: '0.4rem', gap: '3px' }}>
                      <div>
                        <strong style={{ color: '#0284C7', fontSize: '0.82rem' }}>
                          {item.customerProductCode || item.customer_product_code || `Kalem #${id}`}
                        </strong>
                        <span style={{ fontSize: '0.82rem', color: '#1E293B', marginLeft: '0.4rem', fontWeight: 600 }}>
                          {item.productName || item.product_name}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#64748B' }}>
                        Sipariş: <strong>{qty} {item.unit}</strong> | Giden: <strong style={{ color: '#059669' }}>{shipped}</strong> | Kalan: <strong style={{ color: '#0284C7' }}>{remaining} {item.unit}</strong>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <label style={{ fontSize: '0.78rem', color: '#475569' }}>Bu Sevkiyatta Sevk Miktarı:</label>
                      <input
                        type="number"
                        step="0.1"
                        value={dispatchQuantities[id] ?? remaining}
                        onChange={(e) => setDispatchQuantities({
                          ...dispatchQuantities,
                          [id]: parseFloat(e.target.value) || 0
                        })}
                        style={{
                          width: '100px',
                          background: '#FFFFFF',
                          border: '1px solid #0284C7',
                          color: '#0284C7',
                          fontWeight: 700,
                          padding: '0.35rem 0.5rem',
                          borderRadius: '6px',
                          fontSize: '0.9rem'
                        }}
                      />
                      <span style={{ fontSize: '0.8rem', color: '#64748B' }}>{item.unit || 'Adet'}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Modal Actions */}
            <div style={{ display: 'flex', flexDirection: isMobile ? 'column-reverse' : 'row', justifyContent: 'flex-end', gap: '0.5rem' }}>
              <button onClick={() => setDispatchModalOpen(false)} className="btn btn-secondary" style={{ width: isMobile ? '100%' : 'auto' }}>
                İptal
              </button>
              <button
                onClick={() => handlePerformDispatch(false)}
                disabled={dispatchSubmitting}
                className="btn btn-primary"
                style={{ width: isMobile ? '100%' : 'auto', background: '#10B981', border: '1px solid #10B981', fontWeight: 700, padding: '0.5rem 1rem' }}
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
          <div className="modal-content" style={{ maxWidth: '640px', width: isMobile ? '96%' : '92%', height: 'auto', maxHeight: '92vh', background: '#FFFFFF', borderRadius: '16px', padding: isMobile ? '0.85rem' : '1.5rem', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', overflowY: 'auto' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', paddingBottom: '0.75rem', borderBottom: '1px solid #E2E8F0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <div style={{ background: '#DCFCE7', padding: '0.5rem', borderRadius: '10px', color: '#16A34A', display: 'flex' }}>
                  <MessageSquare size={20} />
                </div>
                <div>
                  <h3 style={{ fontSize: isMobile ? '1rem' : '1.15rem', fontWeight: 700, color: '#0F172A', margin: 0 }}>Siparişi WhatsApp ile Paylaş</h3>
                  <span style={{ fontSize: isMobile ? '0.75rem' : '0.82rem', color: '#64748B' }}>PC & Mobil Uyumlu Anlık WhatsApp Gönderimi</span>
                </div>
              </div>

              <button onClick={() => setWhatsappModalOpen(false)} style={{ background: '#F1F5F9', border: '1px solid #CBD5E1', color: '#64748B', borderRadius: '6px', padding: '0.45rem', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>

            {/* Phone Number Input */}
            <div style={{ marginBottom: '0.85rem' }}>
              <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '0.3rem' }}>
                ALICI WHATSAPP TELEFON NUMARASI (Opsiyonel):
              </label>
              <div style={{ position: 'relative' }}>
                <Phone size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
                <input
                  type="text"
                  placeholder="ör. 0532 123 45 67 (Boş bırakırsanız WhatsApp içinde kişi seçersiniz)"
                  value={whatsappPhone}
                  onChange={(e) => setWhatsappPhone(e.target.value)}
                  style={{ width: '100%', padding: '0.5rem 0.75rem 0.5rem 2.2rem', border: '1px solid #CBD5E1', borderRadius: '8px', fontSize: '0.85rem' }}
                />
              </div>
            </div>

            {/* Message Preview */}
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '0.3rem' }}>
                MESAJ İÇERİĞİ (İsteğe Göre Düzenlenebilir):
              </label>
              <textarea
                rows={isMobile ? 6 : 9}
                value={whatsappCustomText}
                onChange={(e) => setWhatsappCustomText(e.target.value)}
                style={{ width: '100%', padding: '0.65rem', border: '1px solid #CBD5E1', borderRadius: '8px', fontSize: '0.8rem', fontFamily: 'monospace', color: '#0F172A', background: '#F8FAFC', lineHeight: 1.4 }}
              />
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', flexDirection: isMobile ? 'column-reverse' : 'row', justifyContent: 'flex-end', gap: '0.5rem' }}>
              <button onClick={() => setWhatsappModalOpen(false)} className="btn btn-secondary" style={{ width: isMobile ? '100%' : 'auto' }}>
                İptal
              </button>

              <button onClick={handleSendWhatsApp} className="btn btn-whatsapp" style={{ width: isMobile ? '100%' : 'auto', padding: '0.55rem 1.25rem', fontSize: '0.85rem' }}>
                <MessageSquare size={16} /> WhatsApp'ta Aç ve Gönder
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(3px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '1rem'
        }}>
          <div style={{
            background: '#FFFFFF',
            borderRadius: '12px',
            width: '100%',
            maxWidth: '480px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 10px 10px -5px rgba(0, 0, 0, 0.1)',
            overflow: 'hidden',
            border: '1px solid #FCA5A5'
          }}>
            {/* Modal Header */}
            <div style={{
              padding: '1.25rem',
              background: '#FEF2F2',
              borderBottom: '1px solid #FEE2E2',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem'
            }}>
              <div style={{
                background: '#FEE2E2',
                border: '1px solid #FCA5A5',
                borderRadius: '10px',
                width: '42px',
                height: '42px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                <Trash2 size={22} color="#DC2626" />
              </div>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#991B1B', margin: 0 }}>
                  Siparişi Kalıcı Olarak Sil
                </h3>
                <span style={{ fontSize: '0.8rem', color: '#B91C1C' }}>
                  Bu işlem geri alınamaz
                </span>
              </div>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '1.25rem' }}>
              <p style={{ fontSize: '0.9rem', color: '#334155', lineHeight: 1.5, margin: '0 0 1rem 0' }}>
                <strong style={{ color: '#0F172A' }}>{order.customer_name}</strong> firmasına ait{' '}
                <strong style={{ color: '#DC2626' }}>{order.order_no}</strong> numaralı siparişi ve bağlı tüm kalemleri silmek istediğinize emin misiniz?
              </p>

              <div style={{
                background: '#FFFBEB',
                border: '1px solid #FDE68A',
                borderRadius: '8px',
                padding: '0.75rem',
                fontSize: '0.82rem',
                color: '#92400E',
                display: 'flex',
                gap: '0.5rem',
                alignItems: 'flex-start'
              }}>
                <AlertTriangle size={16} color="#D97706" style={{ flexShrink: 0, marginTop: '2px' }} />
                <span>
                  Sipariş silindiğinde bu siparişe ait tüm sipariş kalemleri, işlem geçmişi ve sevkiyat kayıtları veritabanından kalıcı olarak kaldırılacaktır.
                </span>
              </div>
            </div>

            {/* Modal Footer */}
            <div style={{
              padding: '1rem 1.25rem',
              background: '#F8FAFC',
              borderTop: '1px solid #E2E8F0',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '0.75rem'
            }}>
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                disabled={isDeleting}
                className="btn btn-secondary"
              >
                Vazgeç
              </button>

              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                style={{
                  background: '#DC2626',
                  color: '#FFFFFF',
                  border: 'none',
                  padding: '0.55rem 1.25rem',
                  borderRadius: '6px',
                  fontWeight: 600,
                  fontSize: '0.88rem',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  cursor: isDeleting ? 'not-allowed' : 'pointer',
                  boxShadow: '0 1px 3px rgba(220, 38, 38, 0.4)'
                }}
              >
                <Trash2 size={16} />
                <span>{isDeleting ? 'Siliniyor...' : 'Evet, Siparişi Sil'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* EXCEL IMPORT PREVIEW & CONFIRMATION MODAL (1.4) */}

      {/* ============================================================== */}
      {importModalOpen && (
        <div className="modal-overlay" style={{ background: 'rgba(15,23,42,0.6)', zIndex: 1100 }}>
          <div className="modal-content" style={{ maxWidth: '800px', width: isMobile ? '96%' : '90%', maxHeight: '90vh', overflowY: 'auto', background: '#FFFFFF', color: '#0F172A', border: '1px solid #CBD5E1', padding: isMobile ? '0.85rem' : '1.5rem', borderRadius: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid #E2E8F0', paddingBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <FileSpreadsheet size={22} color="#16A34A" />
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#0F172A', margin: 0 }}>
                  Excel'den Sipariş Kalemi İçe Aktarma Önizlemesi
                </h3>
              </div>
              <button onClick={() => setImportModalOpen(false)} style={{ background: 'transparent', border: 'none', color: '#64748B', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ marginBottom: '1rem', background: '#F0FDF4', border: '1px solid #BBF7D0', padding: '0.75rem 1rem', borderRadius: '8px', fontSize: '0.82rem', color: '#166534' }}>
              <strong>Dosya:</strong> {importFileName} | <strong>Okunan Kalem:</strong> {importPreviewItems.length} Adet
              <div style={{ marginTop: '0.25rem', fontSize: '0.75rem', color: '#15803D' }}>
                Veriler başarıyla çözümlendi. Kalemleri siparişe ekleyebilir veya mevcut kalemlerin yerine koyabilirsiniz.
              </div>
            </div>

            <div className="table-container" style={{ maxHeight: '300px', overflowY: 'auto', marginBottom: '1.25rem', border: '1px solid #E2E8F0', borderRadius: '8px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                <thead>
                  <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0', textAlign: 'left', color: '#475569', fontSize: '0.72rem', textTransform: 'uppercase' }}>
                    <th style={{ padding: '0.5rem 0.75rem', width: '35px' }}>#</th>
                    <th style={{ padding: '0.5rem 0.75rem', width: '130px' }}>Ürün Kodu</th>
                    <th style={{ padding: '0.5rem 0.75rem' }}>Ürün Açıklaması</th>
                    <th style={{ padding: '0.5rem 0.75rem', width: '80px', textAlign: 'right' }}>Miktar</th>
                    <th style={{ padding: '0.5rem 0.75rem', width: '70px' }}>Birim</th>
                    <th style={{ padding: '0.5rem 0.75rem', width: '90px', textAlign: 'right' }}>Birim Fiyat</th>
                  </tr>
                </thead>
                <tbody>
                  {importPreviewItems.map((it, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #F1F5F9', background: idx % 2 === 0 ? '#FFFFFF' : '#F8FAFC' }}>
                      <td style={{ padding: '0.45rem 0.75rem', color: '#94A3B8' }}>{idx + 1}</td>
                      <td style={{ padding: '0.45rem 0.75rem', fontWeight: 700, color: '#0284C7' }}>{it.customerProductCode}</td>
                      <td style={{ padding: '0.45rem 0.75rem', color: '#0F172A', fontWeight: 500 }}>{it.productName}</td>
                      <td style={{ padding: '0.45rem 0.75rem', textAlign: 'right', fontWeight: 700 }}>{it.quantity}</td>
                      <td style={{ padding: '0.45rem 0.75rem', color: '#64748B' }}>{it.unit}</td>
                      <td style={{ padding: '0.45rem 0.75rem', textAlign: 'right', color: '#059669', fontWeight: 600 }}>{it.unitPrice} TRY</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => setImportModalOpen(false)}
                className="btn btn-secondary"
              >
                Vazgeç
              </button>
              <button
                type="button"
                onClick={() => handleConfirmImport('append')}
                className="btn btn-secondary"
                style={{ background: '#EFF6FF', border: '1px solid #93C5FD', color: '#1D4ED8', fontWeight: 600 }}
              >
                ➕ Mevcut Kalemlerin Sonuna Ekle
              </button>
              <button
                type="button"
                onClick={() => handleConfirmImport('replace')}
                className="btn btn-primary"
                style={{ background: '#16A34A', borderColor: '#15803D', fontWeight: 700 }}
              >
                🔄 Tüm Kalemleri Bu Listeyle Değiştir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* DOCUMENT OCR RE-READ VERIFICATION MODAL (1.5) */}
      {/* ============================================================== */}
      {reReadModalOpen && reReadData && (
        <div className="modal-overlay" style={{ background: 'rgba(15,23,42,0.6)', zIndex: 1100 }}>
          <div className="modal-content" style={{ maxWidth: '850px', width: isMobile ? '96%' : '90%', maxHeight: '90vh', overflowY: 'auto', background: '#FFFFFF', color: '#0F172A', border: '1px solid #CBD5E1', padding: isMobile ? '0.85rem' : '1.5rem', borderRadius: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid #E2E8F0', paddingBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <RefreshCw size={22} color="#D97706" />
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#0F172A', margin: 0 }}>
                  Yapay Zeka & OCR Belge Tarama Sonuçları (Kullanıcı Onayı)
                </h3>
              </div>
              <button onClick={() => setReReadModalOpen(false)} style={{ background: 'transparent', border: 'none', color: '#64748B', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ marginBottom: '1rem', background: '#FFFBEB', border: '1.5px solid #F59E0B', padding: '0.85rem 1rem', borderRadius: '8px', fontSize: '0.82rem', color: '#78350F' }}>
              <strong style={{ color: '#B45309', display: 'block', marginBottom: '4px' }}>
                ⚠️ ÖNEMLİ KONTROL VE ONAY UYARISI
              </strong>
              Yapay zeka ve OCR motoru belgeden müşteri ve ürün kalemlerini tespit etmiştir. Lütfen özellikle ürün kodlarını ve miktarlarını dikkatle kontrol ediniz. Onayladığınızda mevcut sipariş güncellenecektir.
            </div>

            {/* Extracted Header Meta Info */}
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: '0.65rem', marginBottom: '1rem', background: '#F8FAFC', padding: '0.75rem', borderRadius: '8px', border: '1px solid #E2E8F0', fontSize: '0.8rem' }}>
              <div>
                <span style={{ color: '#64748B', display: 'block', fontSize: '0.72rem' }}>OKUNAN MÜŞTERİ ADI</span>
                <strong style={{ color: '#0F172A' }}>{reReadData.customerInfo?.customerName || reReadData.customerName || '-'}</strong>
              </div>
              <div>
                <span style={{ color: '#64748B', display: 'block', fontSize: '0.72rem' }}>MÜŞTERİ SİPARİŞ REF NO</span>
                <strong style={{ color: '#0F172A' }}>{reReadData.customerInfo?.customerOrderNo || reReadData.customerOrderNo || '-'}</strong>
              </div>
              <div>
                <span style={{ color: '#64748B', display: 'block', fontSize: '0.72rem' }}>İSTENEN TESLİM TARİHİ</span>
                <strong style={{ color: '#0F172A' }}>{formatDate(reReadData.customerInfo?.requestedDeliveryDate || reReadData.requestedDeliveryDate)}</strong>
              </div>
            </div>

            {/* Extracted Items Table */}
            <div className="table-container" style={{ maxHeight: '280px', overflowY: 'auto', marginBottom: '1.25rem', border: '1px solid #E2E8F0', borderRadius: '8px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                <thead>
                  <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0', textAlign: 'left', color: '#475569', fontSize: '0.72rem', textTransform: 'uppercase' }}>
                    <th style={{ padding: '0.5rem 0.75rem', width: '35px' }}>#</th>
                    <th style={{ padding: '0.5rem 0.75rem', width: '140px' }}>Ürün Kodu</th>
                    <th style={{ padding: '0.5rem 0.75rem' }}>Ürün Açıklaması</th>
                    <th style={{ padding: '0.5rem 0.75rem', width: '80px', textAlign: 'right' }}>Miktar</th>
                    <th style={{ padding: '0.5rem 0.75rem', width: '70px' }}>Birim</th>
                  </tr>
                </thead>
                <tbody>
                  {(reReadData.orderItems || reReadData.items || []).map((it: any, idx: number) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #F1F5F9', background: idx % 2 === 0 ? '#FFFFFF' : '#F8FAFC' }}>
                      <td style={{ padding: '0.45rem 0.75rem', color: '#94A3B8' }}>{idx + 1}</td>
                      <td style={{ padding: '0.45rem 0.75rem', fontWeight: 700, color: '#0284C7' }}>{it.customerProductCode || it.customer_product_code || '-'}</td>
                      <td style={{ padding: '0.45rem 0.75rem', color: '#0F172A', fontWeight: 500 }}>{it.productName || it.product_name}</td>
                      <td style={{ padding: '0.45rem 0.75rem', textAlign: 'right', fontWeight: 700, color: '#059669' }}>{it.quantity}</td>
                      <td style={{ padding: '0.45rem 0.75rem', color: '#64748B' }}>{it.unit || 'Adet'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                type="button"
                onClick={() => setReReadModalOpen(false)}
                className="btn btn-secondary"
              >
                Vazgeç / İptal
              </button>
              <button
                type="button"
                onClick={handleApplyReReadData}
                className="btn btn-primary"
                style={{ background: '#D97706', borderColor: '#B45309', fontWeight: 700 }}
              >
                <Check size={16} /> Kontrol Ettim, Onaylayıp Siparişe Aktar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 1. YENİ ÜRETİM EMRİ (WORK ORDER) OLUŞTURMA MODALI */}
      {/* ============================================================== */}
      {createWOModalOpen && (
        <div className="modal-overlay" style={{ background: 'rgba(15,23,42,0.6)', zIndex: 1100 }}>
          <div className="modal-content" style={{ maxWidth: '560px', width: isMobile ? '96%' : '90%', background: '#FFFFFF', color: '#0F172A', border: '1px solid #CBD5E1', padding: isMobile ? '1rem' : '1.5rem', borderRadius: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid #E2E8F0', paddingBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Factory size={22} color="#059669" />
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#0F172A', margin: 0 }}>
                  Yeni Üretim Emri Oluştur
                </h3>
              </div>
              <button onClick={() => setCreateWOModalOpen(false)} style={{ background: 'transparent', border: 'none', color: '#64748B', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '0.25rem' }}>
                  Sipariş Kalemi:
                </label>
                <select
                  value={woItemId}
                  onChange={(e) => setWoItemId(e.target.value ? Number(e.target.value) : '')}
                  style={{ width: '100%', padding: '0.5rem', border: '1px solid #CBD5E1', borderRadius: '6px', fontSize: '0.85rem' }}
                >
                  <option value="">-- Kalem Seçiniz --</option>
                  {(items || []).map((it, idx) => {
                    const id = it.id || idx + 1;
                    const code = it.customerProductCode || it.customer_product_code || `Kalem #${idx + 1}`;
                    const name = it.productName || it.product_name;
                    const qty = it.quantity || 0;
                    const unit = it.unit || 'Adet';
                    return (
                      <option key={id} value={id}>
                        {code} - {name} ({qty} {unit})
                      </option>
                    );
                  })}
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '0.25rem' }}>
                  Sorumlu Bölüm / Atölye:
                </label>
                <select
                  value={woDepartment}
                  onChange={(e) => setWoDepartment(e.target.value)}
                  style={{ width: '100%', padding: '0.5rem', border: '1px solid #CBD5E1', borderRadius: '6px', fontSize: '0.85rem' }}
                >
                  <option value="Talaşlı İmalat">Talaşlı İmalat</option>
                  <option value="Sac Büküm & Delme (Punch/Laser)">Sac Büküm & Delme (Punch/Laser)</option>
                  <option value="Kaynak & Montaj">Kaynak & Montaj</option>
                  <option value="Kablo Taşıma İmalatı">Kablo Taşıma İmalatı</option>
                  <option value="Boya / Kaplama Ön Hazırlık">Boya / Kaplama Ön Hazırlık</option>
                  <option value="Kalite & Paketleme">Kalite & Paketleme</option>
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '0.25rem' }}>
                    Planlanan Miktar:
                  </label>
                  <input
                    type="number"
                    min="1"
                    placeholder="Miktar"
                    value={woPlannedQty}
                    onChange={(e) => setWoPlannedQty(e.target.value ? parseFloat(e.target.value) : '')}
                    style={{ width: '100%', padding: '0.5rem', border: '1px solid #CBD5E1', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 700 }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '0.25rem' }}>
                    Başlangıç Tarihi:
                  </label>
                  <input
                    type="date"
                    value={woStartDate}
                    onChange={(e) => setWoStartDate(e.target.value)}
                    style={{ width: '100%', padding: '0.5rem', border: '1px solid #CBD5E1', borderRadius: '6px', fontSize: '0.85rem' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '0.25rem' }}>
                  Planlanan Bitiş Tarihi:
                </label>
                <input
                  type="date"
                  value={woPlannedEndDate}
                  onChange={(e) => setWoPlannedEndDate(e.target.value)}
                  style={{ width: '100%', padding: '0.5rem', border: '1px solid #CBD5E1', borderRadius: '6px', fontSize: '0.85rem' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '0.25rem' }}>
                  İş Emri Notları:
                </label>
                <textarea
                  rows={2}
                  placeholder="Üretim talimatı, özel tolerans, takım vb..."
                  value={woNotes}
                  onChange={(e) => setWoNotes(e.target.value)}
                  style={{ width: '100%', padding: '0.5rem', border: '1px solid #CBD5E1', borderRadius: '6px', fontSize: '0.85rem' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.25rem' }}>
              <button
                type="button"
                onClick={() => setCreateWOModalOpen(false)}
                className="btn btn-secondary"
              >
                Vazgeç
              </button>
              <button
                type="button"
                onClick={handleCreateWorkOrder}
                disabled={woSubmitting}
                className="btn btn-primary"
                style={{ background: '#059669', borderColor: '#047857', fontWeight: 700 }}
              >
                {woSubmitting ? 'Kaydediliyor...' : '✓ İş Emrini Başlat'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 2. İŞ EMRİ İLERLEME & MİKTAR GİRİŞ MODALI */}
      {/* ============================================================== */}
      {updateWOModalOpen && selectedWO && (
        <div className="modal-overlay" style={{ background: 'rgba(15,23,42,0.6)', zIndex: 1100 }}>
          <div className="modal-content" style={{ maxWidth: '520px', width: isMobile ? '96%' : '90%', background: '#FFFFFF', color: '#0F172A', border: '1px solid #CBD5E1', padding: isMobile ? '1rem' : '1.5rem', borderRadius: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid #E2E8F0', paddingBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <CheckCircle2 size={22} color="#0284C7" />
                <div>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#0F172A', margin: 0 }}>
                    İş Emri İlerleme Girişi
                  </h3>
                  <span style={{ fontSize: '0.75rem', color: '#0284C7', fontWeight: 700 }}>
                    {selectedWO.work_order_no}
                  </span>
                </div>
              </div>
              <button onClick={() => setUpdateWOModalOpen(false)} style={{ background: 'transparent', border: 'none', color: '#64748B', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ background: '#F8FAFC', padding: '0.75rem', borderRadius: '8px', border: '1px solid #E2E8F0', marginBottom: '1rem', fontSize: '0.82rem' }}>
              <div style={{ fontWeight: 700, color: '#0F172A' }}>{selectedWO.customer_product_code} - {selectedWO.product_name}</div>
              <div style={{ color: '#64748B', marginTop: '2px' }}>
                Bölüm: <strong>{selectedWO.department}</strong> | Planlanan: <strong>{selectedWO.planned_quantity} Adet</strong>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#059669', display: 'block', marginBottom: '0.25rem' }}>
                    Gerçekleşen Üretilen Miktar:
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="Miktar"
                    value={woProducedQty}
                    onChange={(e) => setWoProducedQty(e.target.value ? parseFloat(e.target.value) : '')}
                    style={{ width: '100%', padding: '0.5rem', border: '1.5px solid #10B981', borderRadius: '6px', fontSize: '0.9rem', fontWeight: 700, color: '#065F46' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#DC2626', display: 'block', marginBottom: '0.25rem' }}>
                    Fire / Hatalı Ürün:
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="Fire"
                    value={woDefectQty}
                    onChange={(e) => setWoDefectQty(e.target.value ? parseFloat(e.target.value) : '')}
                    style={{ width: '100%', padding: '0.5rem', border: '1px solid #FCA5A5', borderRadius: '6px', fontSize: '0.9rem', fontWeight: 700, color: '#B91C1C' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '0.25rem' }}>
                    İş Emri Durumu:
                  </label>
                  <select
                    value={woStatus}
                    onChange={(e) => setWoStatus(e.target.value)}
                    style={{ width: '100%', padding: '0.5rem', border: '1px solid #CBD5E1', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 600 }}
                  >
                    <option value="IN_PROGRESS">Üretimde (Sürüyor)</option>
                    <option value="COMPLETED">Tamamlandı</option>
                    <option value="CANCELLED">İptal Edildi</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '0.25rem' }}>
                    Bitiş Tarihi:
                  </label>
                  <input
                    type="date"
                    value={woActualEndDate}
                    onChange={(e) => setWoActualEndDate(e.target.value)}
                    style={{ width: '100%', padding: '0.5rem', border: '1px solid #CBD5E1', borderRadius: '6px', fontSize: '0.85rem' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '0.25rem' }}>
                  Açıklama / Not:
                </label>
                <textarea
                  rows={2}
                  placeholder="İlerleme açıklaması..."
                  value={woUpdateNotes}
                  onChange={(e) => setWoUpdateNotes(e.target.value)}
                  style={{ width: '100%', padding: '0.5rem', border: '1px solid #CBD5E1', borderRadius: '6px', fontSize: '0.85rem' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.25rem' }}>
              <button
                type="button"
                onClick={() => setUpdateWOModalOpen(false)}
                className="btn btn-secondary"
              >
                Vazgeç
              </button>
              <button
                type="button"
                onClick={handleUpdateWorkOrderProgress}
                disabled={woUpdating}
                className="btn btn-primary"
                style={{ background: '#0284C7', borderColor: '#0369A1', fontWeight: 700 }}
              >
                {woUpdating ? 'Güncelleniyor...' : '✓ Miktarı Kaydet'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 3. FASON / KAPLAMAYA GÖNDERME MODALI */}
      {/* ============================================================== */}
      {createSubModalOpen && (
        <div className="modal-overlay" style={{ background: 'rgba(15,23,42,0.6)', zIndex: 1100 }}>
          <div className="modal-content" style={{ maxWidth: '560px', width: isMobile ? '96%' : '90%', background: '#FFFFFF', color: '#0F172A', border: '1px solid #CBD5E1', padding: isMobile ? '1rem' : '1.5rem', borderRadius: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid #E2E8F0', paddingBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Paintbrush size={22} color="#7E22CE" />
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#0F172A', margin: 0 }}>
                  Fason / Kaplamaya Ürün Gönder
                </h3>
              </div>
              <button onClick={() => setCreateSubModalOpen(false)} style={{ background: 'transparent', border: 'none', color: '#64748B', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '0.25rem' }}>
                  Gönderilecek Sipariş Kalemi:
                </label>
                <select
                  value={subItemId}
                  onChange={(e) => setSubItemId(e.target.value ? Number(e.target.value) : '')}
                  style={{ width: '100%', padding: '0.5rem', border: '1px solid #CBD5E1', borderRadius: '6px', fontSize: '0.85rem' }}
                >
                  <option value="">-- Kalem Seçiniz --</option>
                  {(items || []).map((it, idx) => {
                    const id = it.id || idx + 1;
                    const code = it.customerProductCode || it.customer_product_code || `Kalem #${idx + 1}`;
                    const name = it.productName || it.product_name;
                    const qty = it.quantity || 0;
                    return (
                      <option key={id} value={id}>
                        {code} - {name} ({qty} {it.unit || 'Adet'})
                      </option>
                    );
                  })}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '0.25rem' }}>
                    Fason / Kaplama Firması:
                  </label>
                  <input
                    type="text"
                    placeholder="Örn: Marmara Galvaniz Ltd."
                    value={subContractorName}
                    onChange={(e) => setSubContractorName(e.target.value)}
                    style={{ width: '100%', padding: '0.5rem', border: '1px solid #CBD5E1', borderRadius: '6px', fontSize: '0.85rem' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '0.25rem' }}>
                    İşlem Türü:
                  </label>
                  <select
                    value={subOperationType}
                    onChange={(e) => setSubOperationType(e.target.value)}
                    style={{ width: '100%', padding: '0.5rem', border: '1px solid #CBD5E1', borderRadius: '6px', fontSize: '0.85rem' }}
                  >
                    <option value="SICAK DALDIRMA GALVANİZ">Sıcak Daldırma Galvaniz (TS EN ISO 1461)</option>
                    <option value="ELEKTROSTATİK TOZ BOYA">Elektrostatik Toz Boya</option>
                    <option value="ELOKSAL">Eloksal Kaplama</option>
                    <option value="ELEKTRO GALVANİZ">Elektro Galvaniz</option>
                    <option value="FASON TALAŞLI İMALAT">Fason Talaşlı İmalat</option>
                    <option value="KAPLAMA">Diğer Kaplama</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '0.25rem' }}>
                    Sevk İrsaliye Numarası:
                  </label>
                  <input
                    type="text"
                    placeholder="Örn: GİRS-2026-081"
                    value={subWaybillNo}
                    onChange={(e) => setSubWaybillNo(e.target.value)}
                    style={{ width: '100%', padding: '0.5rem', border: '1px solid #CBD5E1', borderRadius: '6px', fontSize: '0.85rem' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#7E22CE', display: 'block', marginBottom: '0.25rem' }}>
                    Gönderilen Miktar:
                  </label>
                  <input
                    type="number"
                    min="1"
                    placeholder="Gönderilen Adet"
                    value={subSentQty}
                    onChange={(e) => setSubSentQty(e.target.value ? parseFloat(e.target.value) : '')}
                    style={{ width: '100%', padding: '0.5rem', border: '1.5px solid #A855F7', borderRadius: '6px', fontSize: '0.9rem', fontWeight: 700, color: '#6B21A8' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '0.25rem' }}>
                    Gönderim Tarihi:
                  </label>
                  <input
                    type="date"
                    value={subSentDate}
                    onChange={(e) => setSubSentDate(e.target.value)}
                    style={{ width: '100%', padding: '0.5rem', border: '1px solid #CBD5E1', borderRadius: '6px', fontSize: '0.85rem' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '0.25rem' }}>
                    Beklenen Dönüş Tarihi:
                  </label>
                  <input
                    type="date"
                    value={subExpectedReturnDate}
                    onChange={(e) => setSubExpectedReturnDate(e.target.value)}
                    style={{ width: '100%', padding: '0.5rem', border: '1px solid #CBD5E1', borderRadius: '6px', fontSize: '0.85rem' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '0.25rem' }}>
                  Fason Açıklama / Şartname Notu:
                </label>
                <textarea
                  rows={2}
                  placeholder="Mikron kalınlığı, renk kodu, özel paketleme vb..."
                  value={subNotes}
                  onChange={(e) => setSubNotes(e.target.value)}
                  style={{ width: '100%', padding: '0.5rem', border: '1px solid #CBD5E1', borderRadius: '6px', fontSize: '0.85rem' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.25rem' }}>
              <button
                type="button"
                onClick={() => setCreateSubModalOpen(false)}
                className="btn btn-secondary"
              >
                Vazgeç
              </button>
              <button
                type="button"
                onClick={handleCreateSubcontract}
                disabled={subSubmitting}
                className="btn btn-primary"
                style={{ background: '#7E22CE', borderColor: '#6B21A8', fontWeight: 700 }}
              >
                {subSubmitting ? 'Kaydediliyor...' : '✓ Sevk Kaydını Aç'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 4. FASONDAN MAL KABUL MODALI */}
      {/* ============================================================== */}
      {returnSubModalOpen && selectedSub && (
        <div className="modal-overlay" style={{ background: 'rgba(15,23,42,0.6)', zIndex: 1100 }}>
          <div className="modal-content" style={{ maxWidth: '520px', width: isMobile ? '96%' : '90%', background: '#FFFFFF', color: '#0F172A', border: '1px solid #CBD5E1', padding: isMobile ? '1rem' : '1.5rem', borderRadius: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid #E2E8F0', paddingBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <CheckCircle2 size={22} color="#059669" />
                <div>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#0F172A', margin: 0 }}>
                    Fasondan / Kaplamadan Mal Kabul
                  </h3>
                  <span style={{ fontSize: '0.75rem', color: '#7E22CE', fontWeight: 700 }}>
                    Parti: {selectedSub.batch_no} ({selectedSub.subcontractor_name})
                  </span>
                </div>
              </div>
              <button onClick={() => setReturnSubModalOpen(false)} style={{ background: 'transparent', border: 'none', color: '#64748B', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ background: '#FAF5FF', padding: '0.75rem', borderRadius: '8px', border: '1px solid #E9D5FF', marginBottom: '1rem', fontSize: '0.82rem' }}>
              <div style={{ fontWeight: 700, color: '#1E293B' }}>{selectedSub.customer_product_code} - {selectedSub.product_name}</div>
              <div style={{ color: '#64748B', marginTop: '3px' }}>
                Toplam Giden: <strong>{selectedSub.sent_quantity}</strong> | Önceden Dönen: <strong>{selectedSub.returned_quantity}</strong> | Bekleyen: <strong style={{ color: '#D97706' }}>{Math.max(0, selectedSub.sent_quantity - selectedSub.returned_quantity - selectedSub.defect_quantity)}</strong>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#059669', display: 'block', marginBottom: '0.25rem' }}>
                    Kabul Edilen (Sağlam) Miktar:
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="Miktar"
                    value={subReturnedQty}
                    onChange={(e) => setSubReturnedQty(e.target.value ? parseFloat(e.target.value) : '')}
                    style={{ width: '100%', padding: '0.5rem', border: '1.5px solid #10B981', borderRadius: '6px', fontSize: '0.9rem', fontWeight: 700, color: '#065F46' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#DC2626', display: 'block', marginBottom: '0.25rem' }}>
                    Kaplama Hatası / Fire Miktar:
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="Hatalı"
                    value={subDefectQty}
                    onChange={(e) => setSubDefectQty(e.target.value ? parseFloat(e.target.value) : '')}
                    style={{ width: '100%', padding: '0.5rem', border: '1px solid #FCA5A5', borderRadius: '6px', fontSize: '0.9rem', fontWeight: 700, color: '#B91C1C' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '0.25rem' }}>
                  Fiili Mal Kabul Tarihi:
                </label>
                <input
                  type="date"
                  value={subActualReturnDate}
                  onChange={(e) => setSubActualReturnDate(e.target.value)}
                  style={{ width: '100%', padding: '0.5rem', border: '1px solid #CBD5E1', borderRadius: '6px', fontSize: '0.85rem' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '0.25rem' }}>
                  Mal Kabul Notu & Kontrol Açıklaması:
                </label>
                <textarea
                  rows={2}
                  placeholder="Gözle kontrol, kaplama kalınlığı ölçüm sonucu vb..."
                  value={subReturnNotes}
                  onChange={(e) => setSubReturnNotes(e.target.value)}
                  style={{ width: '100%', padding: '0.5rem', border: '1px solid #CBD5E1', borderRadius: '6px', fontSize: '0.85rem' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.25rem' }}>
              <button
                type="button"
                onClick={() => setReturnSubModalOpen(false)}
                className="btn btn-secondary"
              >
                Vazgeç
              </button>
              <button
                type="button"
                onClick={handleReceiveSubcontractReturn}
                disabled={subReturning}
                className="btn btn-primary"
                style={{ background: '#059669', borderColor: '#047857', fontWeight: 700 }}
              >
                {subReturning ? 'Kaydediliyor...' : '✓ Mal Kabulü Tamamla'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

