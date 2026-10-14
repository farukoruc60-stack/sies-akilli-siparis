import React, { useState, useMemo } from 'react';
import { 
  Search, 
  Filter, 
  Paperclip, 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  AlertCircle, 
  CheckCircle2, 
  Clock,
  Building2,
  ChevronDown,
  ChevronUp,
  LayoutList,
  FolderTree,
  PackageCheck,
  FileSpreadsheet
} from 'lucide-react';
import { Order, OrderItem, OrderStatus } from '../types';
import { useAuth } from '../context/AuthContext';
import { ReportsModal } from './ReportsModal';

interface OrderListPanelProps {
  orders: Order[];
  selectedOrderId: number | null;
  onSelectOrder: (order: Order) => void;
  selectedOrderItems?: OrderItem[];
  isOrderDetailLoading?: boolean;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  statusFilter: string;
  setStatusFilter: (s: string) => void;
  onUploadClick: () => void;
  page: number;
  totalPages: number;
  onPageChange: (p: number) => void;
  totalCount: number;
}

export const OrderListPanel: React.FC<OrderListPanelProps> = ({
  orders,
  selectedOrderId,
  onSelectOrder,
  selectedOrderItems = [],
  isOrderDetailLoading = false,
  searchQuery,
  setSearchQuery,
  statusFilter,
  setStatusFilter,
  onUploadClick,
  page,
  totalPages,
  onPageChange,
  totalCount
}) => {
  const { token } = useAuth();

  // Grouping Mode State: Default to Customer Grouping (true)
  const [groupByCustomer, setGroupByCustomer] = useState<boolean>(true);
  const [isReportsOpen, setIsReportsOpen] = useState<boolean>(false);

  // Single active order accordion state: ONLY the selected order can have its accordion open
  const [isSelectedExpanded, setIsSelectedExpanded] = useState<boolean>(true);

  // Automatically expand accordion whenever a new order is selected
  React.useEffect(() => {
    setIsSelectedExpanded(true);
  }, [selectedOrderId]);

  const [summaryMetrics, setSummaryMetrics] = useState({
    openOrders: 0,
    inProduction: 0,
    inCoating: 0,
    readyShipping: 0,
    overdue: 0,
    shippingToday: 0
  });

  const fetchMetrics = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/orders/summary-metrics', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setSummaryMetrics(data);
      }
    } catch (e) {}
  };

  React.useEffect(() => {
    fetchMetrics();
  }, [orders, token]);

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

  const getStatusBadge = (status: OrderStatus | string) => {
    switch (status) {
      case 'NEW':
      case 'REVIEW_PENDING':
        return <span className="badge badge-new" style={{ background: '#EFF6FF', color: '#1D4ED8', border: '1px solid #BFDBFE' }}><Clock size={11} /> Yeni</span>;
      case 'PRODUCTION_PENDING':
        return <span className="badge" style={{ background: '#FEF3C7', color: '#92400E', border: '1px solid #FCD34D' }}>Üretim Bekliyor</span>;
      case 'IN_PRODUCTION':
      case 'APPROVED':
        return <span className="badge" style={{ background: '#FEF3C7', color: '#B45309', border: '1px solid #FDE68A' }}>Üretimde</span>;
      case 'COATING_PENDING':
        return <span className="badge" style={{ background: '#F3E8FF', color: '#6B21A8', border: '1px solid #D8B4FE' }}>Kaplama Bekliyor</span>;
      case 'COATING':
        return <span className="badge" style={{ background: '#F3E8FF', color: '#7E22CE', border: '1px solid #E9D5FF' }}>Kaplamada</span>;
      case 'PAINTING':
        return <span className="badge" style={{ background: '#FCE7F3', color: '#BE185D', border: '1px solid #FBCFE8' }}>Boyada</span>;
      case 'PACKAGING':
        return <span className="badge" style={{ background: '#E0F2FE', color: '#0369A1', border: '1px solid #BAE6FD' }}>Paketlemede</span>;
      case 'READY_FOR_SHIPPING':
        return <span className="badge" style={{ background: '#DCFCE7', color: '#15803D', border: '1px solid #86EFAC' }}>Sevkiyata Hazır</span>;
      case 'PARTIAL_SHIPPING':
      case 'SHIPPING_PENDING':
        return <span className="badge" style={{ background: '#FFEDD5', color: '#C2410C', border: '1px solid #FED7AA' }}>Kısmi Sevk</span>;
      case 'COMPLETED':
        return <span className="badge" style={{ background: '#ECFDF5', color: '#047857', border: '1px solid #A7F3D0' }}><CheckCircle2 size={11} /> Tamamlandı</span>;
      case 'OVERDUE':
        return <span className="badge" style={{ background: '#FEF2F2', color: '#DC2626', border: '1px solid #FCA5A5', fontWeight: 700 }}><AlertCircle size={11} /> Gecikmiş</span>;
      case 'CANCELLED':
        return <span className="badge" style={{ background: '#FEF2F2', color: '#B91C1C', border: '1px solid #FECACA' }}>İptal</span>;
      default:
        return <span className="badge badge-new">{status}</span>;
    }
  };

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
        label: '-',
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
          label: `${diffDays}G Kaldı`,
          urgency: 'urgent'
        };
      }
      return {
        color: '#16A34A',
        bg: '#F0FDF4',
        border: '#BBF7D0',
        label: `${diffDays}G Var`,
        urgency: 'normal'
      };
    } catch {
      return {
        color: '#64748B',
        bg: '#F8FAFC',
        border: '#E2E8F0',
        label: dateStr,
        urgency: 'none'
      };
    }
  };

  const formatCardDate = (d?: string) => {
    if (!d) return '-';
    try {
      const parts = d.split('T')[0].split('-');
      if (parts.length === 3) {
        return `${parts[2]}.${parts[1]}.${parts[0]}`;
      }
      return new Date(d).toLocaleDateString('tr-TR');
    } catch {
      return d;
    }
  };

  // Group orders by Customer Name
  const customerGroups = useMemo(() => {
    const map = new Map<string, Order[]>();
    orders.forEach(order => {
      const name = fixTurkishEncoding(order.customer_name) || 'Bilinmeyen Müşteri';
      if (!map.has(name)) {
        map.set(name, []);
      }
      map.get(name)!.push(order);
    });
    return Array.from(map.entries()).map(([customerName, customerOrders]) => ({
      customerName,
      customerOrders,
      totalItems: customerOrders.reduce((acc, o) => acc + (parseInt(String(o.total_items || 0)) || 0), 0)
    }));
  }, [orders]);

  // Single active expanded customer group: ONLY the selected order's customer group is open!
  const selectedCustomerName = useMemo(() => {
    const selOrder = orders.find(o => o.id === selectedOrderId);
    return selOrder ? (fixTurkishEncoding(selOrder.customer_name) || 'Bilinmeyen Müşteri') : null;
  }, [orders, selectedOrderId]);

  // Keep track of the currently expanded customer group. By default, it's the customer of the selected order!
  const [expandedCustomerName, setExpandedCustomerName] = useState<string | null>(null);

  // Sync expandedCustomerName with selected order whenever selectedOrderId or orders change
  React.useEffect(() => {
    if (selectedCustomerName) {
      setExpandedCustomerName(selectedCustomerName);
    } else if (customerGroups.length > 0 && !expandedCustomerName) {
      setExpandedCustomerName(customerGroups[0].customerName);
    }
  }, [selectedCustomerName, customerGroups]);

  const handleToggleCustomerGroup = (custName: string, firstOrder?: Order) => {
    if (expandedCustomerName === custName) {
      setExpandedCustomerName(null);
    } else {
      setExpandedCustomerName(custName);
      if (firstOrder && firstOrder.id !== selectedOrderId) {
        onSelectOrder(firstOrder);
        setIsSelectedExpanded(true);
      }
    }
  };

  const renderOrderCard = (order: Order) => {
    const isSelected = selectedOrderId === order.id;
    const isExpanded = isSelected && isSelectedExpanded;
    const items = isSelected ? (selectedOrderItems || []) : [];
    const isLoadingItems = isSelected && !!isOrderDetailLoading;

    return (
      <div
        key={order.id}
        style={{
          borderRadius: '6px',
          marginBottom: '5px',
          background: isSelected ? '#EFF6FF' : '#FFFFFF',
          border: isSelected ? '1.5px solid #3B82F6' : '1px solid #E2E8F0',
          boxShadow: isSelected ? '0 1px 3px rgba(59, 130, 246, 0.15)' : 'none',
          overflow: 'hidden',
          transition: 'all 0.15s ease'
        }}
      >
        {/* Main Compact Card Summary */}
        <div
          onClick={() => {
            if (!isSelected) {
              onSelectOrder(order);
              setIsSelectedExpanded(true);
            }
          }}
          style={{
            padding: '7px 9px',
            cursor: 'pointer',
            userSelect: 'none'
          }}
        >
          {/* Satır 1: Başlık (Grupta Müş. Sip No, Düz Listede Firma Adı) + Durum Rozeti */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
            <span style={{ fontWeight: 700, fontSize: '12px', color: '#0F172A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '180px' }}>
              {groupByCustomer ? (
                order.customer_order_no ? (
                  <span>Müş. Sip: <strong style={{ color: '#2563EB' }}>{fixTurkishEncoding(order.customer_order_no)}</strong></span>
                ) : (
                  <span>Sip No: <strong style={{ color: '#2563EB' }}>{order.order_no}</strong></span>
                )
              ) : (
                fixTurkishEncoding(order.customer_name)
              )}
            </span>
            <div style={{ transform: 'scale(0.9)', transformOrigin: 'right center' }}>
              {getStatusBadge(order.status)}
            </div>
          </div>

          {/* Düz Listede ise Müşteri Sipariş Numarası Satırı */}
          {!groupByCustomer && (
            <div style={{ fontSize: '11px', color: '#475569', marginBottom: '3px' }}>
              {order.customer_order_no ? (
                <span>Müş. Sip: <strong style={{ color: '#0F172A' }}>{fixTurkishEncoding(order.customer_order_no)}</strong></span>
              ) : (
                <span>Sip: {order.order_no}</span>
              )}
            </div>
          )}

          {/* Satır 2: Kaplama Cinsi (Kompakt Rozet) */}
          {order.coating_type && (
            <div style={{ fontSize: '10px', color: '#475569', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '3px' }}>
              <span style={{ color: '#94A3B8' }}>Kaplama:</span>
              <span style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', padding: '1px 5px', borderRadius: '3px', fontWeight: 600, color: '#334155', maxWidth: '190px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {fixTurkishEncoding(order.coating_type)}
              </span>
            </div>
          )}

          {/* Satır 3: Teslim Tarihi (Renkli Durum Rozeti) + Kalem Sayısı Açılır Tırnak Butonu */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '10px', color: '#64748B' }}>
            {(() => {
              const urgency = getDeliveryUrgencyInfo(order.requested_delivery_date || order.order_date, order.status);
              return (
                <span
                  title={urgency.label}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '3px',
                    background: urgency.bg,
                    color: urgency.color,
                    border: `1px solid ${urgency.border}`,
                    padding: '1px 5px',
                    borderRadius: '4px',
                    fontWeight: 600,
                    fontSize: '9.5px'
                  }}
                >
                  <span>Teslim: {formatCardDate(order.requested_delivery_date || order.order_date)}</span>
                  <strong style={{ fontSize: '9px', fontWeight: 700 }}>({urgency.label})</strong>
                </span>
              );
            })()}
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              {(order.total_docs || 0) > 0 && (
                <span title="Belge Ekli" style={{ color: '#3B82F6', display: 'flex', alignItems: 'center' }}>
                  <Paperclip size={11} />
                </span>
              )}

              {/* Kompakt Kalem Butonu */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (isSelected) {
                    setIsSelectedExpanded(prev => !prev);
                  } else {
                    onSelectOrder(order);
                    setIsSelectedExpanded(true);
                  }
                }}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '3px',
                  background: isExpanded ? '#DBEAFE' : '#F1F5F9',
                  color: isExpanded ? '#1D4ED8' : '#475569',
                  border: 'none',
                  padding: '2px 6px',
                  borderRadius: '10px',
                  fontSize: '10px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                <span>{order.total_items || 0} Kalem</span>
                {isExpanded ? <ChevronUp size={12} color="#1D4ED8" /> : <ChevronDown size={12} color="#475569" />}
              </button>
            </div>
          </div>
        </div>

        {/* Kompakt Sipariş Kalemleri Akordiyon İçeriği */}
        {isExpanded && (
          <div style={{
            borderTop: '1px solid #E2E8F0',
            background: '#F8FAFC',
            padding: '6px'
          }}>
            <div style={{ fontSize: '10.5px', fontWeight: 700, color: '#475569', marginBottom: '4px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <PackageCheck size={12} color="#3B82F6" />
                Kalemler
              </span>
              <span style={{ fontSize: '10px', color: '#64748B' }}>
                {isLoadingItems ? 'Yükleniyor...' : items ? `${items.length} Kalem` : `${order.total_items || 0} Kalem`}
              </span>
            </div>

            {isLoadingItems && items.length === 0 ? (
              <div style={{ padding: '8px', textAlign: 'center', color: '#64748B', fontSize: '10.5px' }}>
                <Clock size={12} style={{ display: 'inline', marginRight: '4px', animation: 'spin 1s linear infinite' }} />
                Kalemler yükleniyor...
              </div>
            ) : !items || items.length === 0 ? (
              <div style={{ padding: '6px', textAlign: 'center', color: '#94A3B8', fontSize: '10.5px' }}>
                Kayıtlı kalem bulunamadı.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', maxHeight: '200px', overflowY: 'auto' }}>
                {items.map((item, index) => {
                  const lineNo = item.lineNo || item.line_no || index + 1;
                  const code = item.customerProductCode || item.customer_product_code || item.internalProductCode || item.internal_product_code;
                  const name = item.productName || item.product_name || 'Ürün Tanımsız';
                  const qty = item.quantity || 0;
                  const unit = item.unit || 'AD';

                  return (
                    <div
                      key={item.id || index}
                      style={{
                        background: '#FFFFFF',
                        border: '1px solid #E2E8F0',
                        borderRadius: '4px',
                        padding: '4px 6px',
                        fontSize: '10.5px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                        <span style={{ fontWeight: 700, color: '#2563EB', marginRight: '4px' }}>
                          #{lineNo} {code ? `[${code}]` : ''}
                        </span>
                        <span style={{ color: '#1E293B' }}>{name}</span>
                      </div>
                      <span style={{ fontWeight: 700, color: '#0F172A', flexShrink: 0, fontSize: '10.5px', background: '#F1F5F9', padding: '1px 5px', borderRadius: '3px' }}>
                        {qty.toLocaleString('tr-TR')} {unit}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="order-list-panel" style={{
      width: '320px',
      minWidth: '300px',
      maxWidth: '340px',
      flexShrink: 0,
      backgroundColor: '#FFFFFF',
      borderRight: '1px solid #E2E8F0',
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      zIndex: 20
    }}>
      {/* List Header & Action */}
      <div style={{ padding: '12px 14px', borderBottom: '1px solid #E2E8F0', background: '#FFFFFF' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <div>
            <h2 style={{ fontSize: '14px', fontWeight: 700, color: '#1A202C' }}>Sipariş Havuzu</h2>
            <span style={{ fontSize: '11px', color: '#718096' }}>Toplam {totalCount} sipariş ({customerGroups.length} Müşteri)</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <button 
              onClick={() => setIsReportsOpen(true)}
              style={{
                background: '#10B981',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '14px',
                padding: '4px 9px',
                fontSize: '11px',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                cursor: 'pointer',
                boxShadow: '0 1px 3px rgba(16, 185, 129, 0.3)'
              }}
              title="Üretim, sevkiyat ve gecikme raporları ve Excel çıktısı"
            >
              <FileSpreadsheet size={13} />
              <span>Raporlar & Excel</span>
            </button>
            <button 
              onClick={onUploadClick} 
              style={{
                background: '#4361EE',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '14px',
                padding: '4px 10px',
                fontSize: '11px',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                cursor: 'pointer',
                boxShadow: '0 1px 3px rgba(67, 97, 238, 0.3)'
              }}
            >
              <Plus size={13} />
              <span>Yeni Sipariş</span>
            </button>
          </div>
        </div>

        {/* 6 Core KPI Status Filter Boxes (1.3) */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '4px',
          marginBottom: '8px'
        }}>
          {[
            { id: 'OPEN', label: 'Açık Sipariş', count: summaryMetrics.openOrders, color: '#2563EB', bg: '#EFF6FF', border: '#BFDBFE' },
            { id: 'IN_PRODUCTION', label: 'Üretimde', count: summaryMetrics.inProduction, color: '#D97706', bg: '#FFFBEB', border: '#FDE68A' },
            { id: 'COATING', label: 'Kaplamada', count: summaryMetrics.inCoating, color: '#7E22CE', bg: '#FAF5FF', border: '#E9D5FF' },
            { id: 'READY_FOR_SHIPPING', label: 'Sevk Hazır', count: summaryMetrics.readyShipping, color: '#16A34A', bg: '#F0FDF4', border: '#BBF7D0' },
            { id: 'OVERDUE', label: 'Geciken', count: summaryMetrics.overdue, color: '#DC2626', bg: '#FEF2F2', border: '#FECACA' },
            { id: 'TODAY_SHIPPING', label: 'Bugün Sevk', count: summaryMetrics.shippingToday, color: '#EA580C', bg: '#FFF7ED', border: '#FFEDD5' }
          ].map(kpi => {
            const isActive = statusFilter === kpi.id;
            return (
              <button
                key={kpi.id}
                type="button"
                onClick={() => setStatusFilter(isActive ? 'ALL' : kpi.id)}
                title={`${kpi.label} siparişleri listele`}
                style={{
                  background: isActive ? kpi.color : kpi.bg,
                  color: isActive ? '#FFFFFF' : kpi.color,
                  border: `1.5px solid ${isActive ? kpi.color : kpi.border}`,
                  borderRadius: '6px',
                  padding: '4px 3px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                <span style={{ fontSize: '13px', fontWeight: 800, lineHeight: 1 }}>{kpi.count}</span>
                <span style={{ fontSize: '9px', fontWeight: 700, marginTop: '2px', whiteSpace: 'nowrap' }}>{kpi.label}</span>
              </button>
            );
          })}
        </div>

        {/* View Mode Toggle: Customer Grouped vs Flat List */}
        <div style={{ display: 'flex', background: '#F1F5F9', padding: '2px', borderRadius: '8px', marginBottom: '8px', border: '1px solid #E2E8F0' }}>
          <button
            onClick={() => setGroupByCustomer(true)}
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '5px',
              padding: '4px',
              fontSize: '11px',
              fontWeight: 600,
              borderRadius: '6px',
              border: 'none',
              cursor: 'pointer',
              background: groupByCustomer ? '#FFFFFF' : 'transparent',
              color: groupByCustomer ? '#4361EE' : '#64748B',
              boxShadow: groupByCustomer ? '0 1px 2px rgba(0,0,0,0.06)' : 'none'
            }}
          >
            <FolderTree size={13} />
            <span>Müşteriye Göre Grupla</span>
          </button>

          <button
            onClick={() => setGroupByCustomer(false)}
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '5px',
              padding: '4px',
              fontSize: '11px',
              fontWeight: 600,
              borderRadius: '6px',
              border: 'none',
              cursor: 'pointer',
              background: !groupByCustomer ? '#FFFFFF' : 'transparent',
              color: !groupByCustomer ? '#4361EE' : '#64748B',
              boxShadow: !groupByCustomer ? '0 1px 2px rgba(0,0,0,0.06)' : 'none'
            }}
          >
            <LayoutList size={13} />
            <span>Düz Liste</span>
          </button>
        </div>

        {/* Search Bar */}
        <div style={{ position: 'relative', marginBottom: '8px' }}>
          <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#A0AEC0' }} />
          <input
            type="text"
            placeholder="Müşteri, Sipariş No veya Kodu Ara..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '6px 8px 6px 30px',
              background: '#F8FAFC',
              border: '1px solid #E2E8F0',
              borderRadius: '8px',
              color: '#1A202C',
              fontSize: '12px',
              outline: 'none'
            }}
          />
        </div>

        {/* Status Filter Pills */}
        <div style={{ display: 'flex', gap: '4px', overflowX: 'auto', paddingBottom: '4px' }}>
          {[
            { id: 'ALL', label: 'Tümü' },
            { id: 'NEW', label: 'Yeni' },
            { id: 'IN_PRODUCTION', label: 'Üretimde' },
            { id: 'COATING', label: 'Kaplamada' },
            { id: 'READY_FOR_SHIPPING', label: 'Sevk Hazır' },
            { id: 'OVERDUE', label: 'Gecikenler' },
            { id: 'PARTIAL_SHIPPING', label: 'Kısmi Sevk' },
            { id: 'COMPLETED', label: 'Tamamlandı' }
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setStatusFilter(f.id)}
              style={{
                padding: '3px 8px',
                fontSize: '11px',
                borderRadius: '12px',
                border: statusFilter === f.id ? '1px solid #4361EE' : '1px solid #E2E8F0',
                background: statusFilter === f.id ? '#EFF6FF' : '#F8FAFC',
                color: statusFilter === f.id ? '#4361EE' : '#4A5568',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                fontWeight: statusFilter === f.id ? 600 : 400
              }}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Inbox Order Item Cards / Customer Groups */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px', background: '#FAFBFD' }}>
        {orders.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#A0AEC0', fontSize: '12px' }}>
            <Filter size={28} style={{ marginBottom: '6px', opacity: 0.5 }} />
            <p>Arama veya filtre kriterinize uygun sipariş kaydı bulunamadı.</p>
          </div>
        ) : groupByCustomer ? (
          /* CUSTOMER GROUPED ACCORDION VIEW */
          customerGroups.map((group) => {
            const isExpanded = expandedCustomerName === group.customerName;
            const isCollapsed = !isExpanded;
            const hasSelectedOrderInGroup = group.customerOrders.some(o => o.id === selectedOrderId);

            return (
              <div 
                key={group.customerName}
                style={{
                  marginBottom: '10px',
                  borderRadius: '10px',
                  border: hasSelectedOrderInGroup ? '1px solid #93C5FD' : '1px solid #E2E8F0',
                  background: '#FFFFFF',
                  overflow: 'hidden'
                }}
              >
                {/* Customer Accordion Header */}
                <div
                  onClick={() => handleToggleCustomerGroup(group.customerName, group.customerOrders[0])}
                  style={{
                    padding: '8px 12px',
                    background: hasSelectedOrderInGroup ? '#EFF6FF' : '#F8FAFC',
                    borderBottom: isExpanded ? '1px solid #E2E8F0' : 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    userSelect: 'none'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
                    <Building2 size={15} style={{ color: '#4361EE', flexShrink: 0 }} />
                    <span style={{ fontWeight: 700, fontSize: '12.5px', color: '#0F172A', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {group.customerName}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                    <span style={{ background: '#3B82F6', color: '#FFFFFF', padding: '1px 7px', borderRadius: '10px', fontSize: '10.5px', fontWeight: 700 }}>
                      {group.customerOrders.length} Sipariş
                    </span>
                    {isCollapsed ? <ChevronRight size={14} color="#64748B" /> : <ChevronDown size={14} color="#64748B" />}
                  </div>
                </div>

                {/* Customer Orders List (when expanded) */}
                {isExpanded && (
                  <div style={{ padding: '6px 8px', background: '#FAFAFA' }}>
                    {group.customerOrders.map(order => renderOrderCard(order))}
                  </div>
                )}
              </div>
            );
          })
        ) : (
          /* FLAT LIST VIEW */
          orders.map(order => renderOrderCard(order))
        )}
      </div>

      {/* Pagination Footer */}
      {totalPages > 1 && (
        <div style={{
          padding: '6px 12px',
          borderTop: '1px solid #E2E8F0',
          background: '#FFFFFF',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '11px',
          color: '#718096'
        }}>
          <span>Sayfa {page} / {totalPages}</span>
          <div style={{ display: 'flex', gap: '4px' }}>
            <button
              disabled={page <= 1}
              onClick={() => onPageChange(page - 1)}
              style={{ padding: '2px 6px', background: '#F1F5F9', border: '1px solid #E2E8F0', borderRadius: '4px', color: '#1A202C', cursor: 'pointer' }}
            >
              <ChevronLeft size={13} />
            </button>
            <button
              disabled={page >= totalPages}
              onClick={() => onPageChange(page + 1)}
              style={{ padding: '2px 6px', background: '#F1F5F9', border: '1px solid #E2E8F0', borderRadius: '4px', color: '#1A202C', cursor: 'pointer' }}
            >
              <ChevronRight size={13} />
            </button>
          </div>
        </div>
      )}

      {/* MES Production & Dispatch Reports Modal */}
      <ReportsModal isOpen={isReportsOpen} onClose={() => setIsReportsOpen(false)} />
    </div>
  );
};

