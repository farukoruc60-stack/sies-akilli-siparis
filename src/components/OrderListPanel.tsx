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
  PackageCheck
} from 'lucide-react';
import { Order, OrderItem, OrderStatus } from '../types';
import { useAuth } from '../context/AuthContext';

interface OrderListPanelProps {
  orders: Order[];
  selectedOrderId: number | null;
  onSelectOrder: (order: Order) => void;
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

  // Expanded/Collapsed Customer Groups State (empty map = all expanded by default)
  const [collapsedCustomers, setCollapsedCustomers] = useState<{ [custName: string]: boolean }>({});

  // Expanded Order Accordion State & Loaded Items Cache
  const [expandedOrders, setExpandedOrders] = useState<{ [orderId: number]: boolean }>({});
  const [itemsByOrder, setItemsByOrder] = useState<{ [orderId: number]: OrderItem[] }>({});
  const [loadingItems, setLoadingItems] = useState<{ [orderId: number]: boolean }>({});

  const toggleCustomerGroup = (custName: string) => {
    setCollapsedCustomers(prev => ({
      ...prev,
      [custName]: !prev[custName]
    }));
  };

  const toggleOrderExpand = async (orderId: number) => {
    const isCurrentlyExpanded = !!expandedOrders[orderId];
    const nextState = !isCurrentlyExpanded;

    setExpandedOrders(prev => ({
      ...prev,
      [orderId]: nextState
    }));

    // Fetch order items if expanding and not already cached
    if (nextState && !itemsByOrder[orderId] && !loadingItems[orderId]) {
      setLoadingItems(prev => ({ ...prev, [orderId]: true }));
      try {
        const res = await fetch(`/api/orders/${orderId}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        });
        const data = await res.json();
        if (data && data.items) {
          setItemsByOrder(prev => ({ ...prev, [orderId]: data.items }));
        }
      } catch (err) {
        console.error('Order items fetch error:', err);
      } finally {
        setLoadingItems(prev => ({ ...prev, [orderId]: false }));
      }
    }
  };

  const getStatusBadge = (status: OrderStatus) => {
    switch (status) {
      case 'NEW':
      case 'REVIEW_PENDING':
        return <span className="badge badge-new" style={{ background: '#EFF6FF', color: '#1D4ED8', border: '1px solid #BFDBFE' }}><Clock size={11} /> Yeni</span>;
      case 'IN_PRODUCTION':
      case 'APPROVED':
        return <span className="badge" style={{ background: '#FEF3C7', color: '#B45309', border: '1px solid #FDE68A' }}>Üretimde</span>;
      case 'COATING':
      case 'COATING_PENDING':
        return <span className="badge" style={{ background: '#F3E8FF', color: '#7E22CE', border: '1px solid #E9D5FF' }}>Kaplamada</span>;
      case 'PAINTING':
        return <span className="badge" style={{ background: '#FCE7F3', color: '#BE185D', border: '1px solid #FBCFE8' }}>Boyada</span>;
      case 'PACKAGING':
        return <span className="badge" style={{ background: '#E0F2FE', color: '#0369A1', border: '1px solid #BAE6FD' }}>Paketlemede</span>;
      case 'PARTIAL_SHIPPING':
      case 'SHIPPING_PENDING':
        return <span className="badge" style={{ background: '#FFEDD5', color: '#C2410C', border: '1px solid #FED7AA' }}>Kısmi Sevk</span>;
      case 'COMPLETED':
        return <span className="badge" style={{ background: '#ECFDF5', color: '#047857', border: '1px solid #A7F3D0' }}><CheckCircle2 size={11} /> Tamamlandı</span>;
      case 'CANCELLED':
        return <span className="badge" style={{ background: '#FEF2F2', color: '#B91C1C', border: '1px solid #FECACA' }}>İptal</span>;
      default:
        return <span className="badge badge-new">{status}</span>;
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
      const name = order.customer_name || 'Bilinmeyen Müşteri';
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

  const renderOrderCard = (order: Order) => {
    const isSelected = selectedOrderId === order.id;
    const isExpanded = !!expandedOrders[order.id];
    const items = itemsByOrder[order.id];
    const isLoadingItems = !!loadingItems[order.id];

    return (
      <div
        key={order.id}
        style={{
          borderRadius: '10px',
          marginBottom: '8px',
          background: isSelected ? '#EFF6FF' : '#FFFFFF',
          border: isSelected ? '1.5px solid #3B82F6' : '1px solid #E2E8F0',
          boxShadow: isSelected ? '0 2px 6px rgba(59, 130, 246, 0.12)' : '0 1px 2px rgba(0,0,0,0.03)',
          overflow: 'hidden',
          transition: 'all 0.15s ease'
        }}
      >
        {/* Main Card Summary (Clickable) */}
        <div
          onClick={() => {
            onSelectOrder(order);
            toggleOrderExpand(order.id);
          }}
          style={{
            padding: '10px 12px',
            cursor: 'pointer',
            userSelect: 'none'
          }}
        >
          {/* Satır 1: Müşteri Adı + Durum Rozeti */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
            <span style={{ fontWeight: 700, fontSize: '13px', color: '#0F172A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '190px' }}>
              {order.customer_name}
            </span>
            {getStatusBadge(order.status)}
          </div>

          {/* Satır 2: Müşteri Sipariş No (varsa) & Sistem Sipariş No */}
          <div style={{ fontSize: '11.5px', color: '#334155', marginBottom: '5px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '4px' }}>
            <span>
              {order.customer_order_no ? (
                <span>Müş. Sip No: <strong style={{ color: '#0F172A' }}>{order.customer_order_no}</strong></span>
              ) : (
                <span>Sip No: <strong style={{ color: '#3B82F6' }}>{order.order_no}</strong></span>
              )}
            </span>
            {order.project_no && (
              <span style={{ fontSize: '10.5px', color: '#64748B', background: '#F1F5F9', padding: '1px 5px', borderRadius: '4px' }}>
                Prj: {order.project_no}
              </span>
            )}
          </div>

          {/* Satır 3: Kaplama Cinsi (varsa) */}
          {order.coating_type && (
            <div style={{ fontSize: '11px', color: '#475569', marginBottom: '5px', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ color: '#94A3B8', fontSize: '10px' }}>Kaplama:</span>
              <span style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', padding: '1px 6px', borderRadius: '4px', fontWeight: 600, color: '#334155' }}>
                {order.coating_type}
              </span>
            </div>
          )}

          {/* Satır 4: Teslim Tarihi & Kaç Kalem Siparişi Var (Aşağı Tırnak Butonu) */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', color: '#64748B', marginTop: '2px' }}>
            <span>
              Teslim: <strong style={{ color: '#1E293B' }}>{formatCardDate(order.requested_delivery_date || order.order_date)}</strong>
            </span>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              {(order.total_docs || 0) > 0 && (
                <span title="Orijinal Belge Ekli" style={{ color: '#3B82F6', display: 'flex', alignItems: 'center' }}>
                  <Paperclip size={12} />
                </span>
              )}

              {/* Accordion Chevron Button (Aşağı / Yukarı Tırnak ile Kalem Sayısı) */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectOrder(order);
                  toggleOrderExpand(order.id);
                }}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  background: isExpanded ? '#DBEAFE' : '#F1F5F9',
                  color: isExpanded ? '#1D4ED8' : '#475569',
                  border: 'none',
                  padding: '3px 8px',
                  borderRadius: '12px',
                  fontSize: '11px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                }}
              >
                <span>{order.total_items || 0} Kalem</span>
                {isExpanded ? <ChevronUp size={14} color="#1D4ED8" /> : <ChevronDown size={14} color="#475569" />}
              </button>
            </div>
          </div>
        </div>

        {/* Expanded Order Items Accordion Content (Aşağı Tırnakla Açılan Kalemler) */}
        {isExpanded && (
          <div style={{
            borderTop: '1px solid #DBEAFE',
            background: '#F8FAFC',
            padding: '10px'
          }}>
            <div style={{ fontSize: '11.5px', fontWeight: 700, color: '#1E293B', marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <PackageCheck size={14} color="#3B82F6" />
                Sipariş Kalemleri
              </span>
              <span style={{ fontSize: '10.5px', color: '#64748B', fontWeight: 600, background: '#E2E8F0', padding: '1px 6px', borderRadius: '10px' }}>
                {items ? `${items.length} Kalem` : '...'}
              </span>
            </div>

            {isLoadingItems ? (
              <div style={{ padding: '12px', textAlign: 'center', color: '#64748B', fontSize: '11.5px' }}>
                <Clock size={14} style={{ display: 'inline', marginRight: '5px', animation: 'spin 1s linear infinite' }} />
                Sipariş kalemleri yükleniyor...
              </div>
            ) : !items || items.length === 0 ? (
              <div style={{ padding: '8px', textAlign: 'center', color: '#94A3B8', fontSize: '11.5px' }}>
                Bu siparişe ait kayıtlı kalem bulunamadı.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {items.map((item, index) => {
                  const lineNo = item.lineNo || item.line_no || index + 1;
                  const code = item.customerProductCode || item.customer_product_code || item.internalProductCode || item.internal_product_code;
                  const name = item.productName || item.product_name || 'Ürün Tanımsız';
                  const qty = item.quantity || 0;
                  const unit = item.unit || 'AD';
                  const price = item.unitPrice || item.unit_price || 0;
                  const total = item.lineTotal || item.line_total || (qty * price);
                  const currency = item.currency || '₺';

                  return (
                    <div
                      key={item.id || index}
                      style={{
                        background: '#FFFFFF',
                        border: '1px solid #E2E8F0',
                        borderRadius: '8px',
                        padding: '8px 10px',
                        fontSize: '11.5px',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
                      }}
                    >
                      {/* Item Header */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden' }}>
                          <span style={{ background: '#3B82F6', color: '#FFFFFF', borderRadius: '4px', padding: '1px 5px', fontSize: '10px', fontWeight: 700, flexShrink: 0 }}>
                            #{lineNo}
                          </span>
                          {code && (
                            <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#2563EB', fontSize: '11.5px' }}>
                              {code}
                            </span>
                          )}
                        </div>
                        <span style={{ fontWeight: 700, color: '#0F172A', fontSize: '12px', flexShrink: 0, background: '#F1F5F9', padding: '2px 6px', borderRadius: '6px' }}>
                          {qty.toLocaleString('tr-TR')} {unit}
                        </span>
                      </div>

                      {/* Product Name */}
                      <div style={{ fontWeight: 600, color: '#1E293B', marginBottom: '4px', wordBreak: 'break-word', lineHeight: '1.3' }}>
                        {name}
                      </div>

                      {/* Technical Spec details if available */}
                      {(item.widthMm || item.heightMm || item.lengthMm || item.thicknessMm || item.surfaceCoating || item.material) && (
                        <div style={{ fontSize: '10.5px', color: '#64748B', marginBottom: '4px', display: 'flex', flexWrap: 'wrap', gap: '6px', background: '#F8FAFC', padding: '3px 6px', borderRadius: '4px' }}>
                          {(item.widthMm || item.heightMm || item.lengthMm || item.thicknessMm) && (
                            <span>
                              Ölçü: {[
                                item.thicknessMm ? `t:${item.thicknessMm}` : null,
                                item.widthMm ? `w:${item.widthMm}` : null,
                                item.heightMm ? `h:${item.heightMm}` : null,
                                item.lengthMm ? `L:${item.lengthMm}` : null
                              ].filter(Boolean).join('x')} mm
                            </span>
                          )}
                          {item.material && <span>Malzeme: {item.material}</span>}
                          {item.surfaceCoating && <span>Kaplama: {item.surfaceCoating}</span>}
                        </div>
                      )}

                      {/* Price summary row */}
                      {price > 0 && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '10.5px', color: '#475569', paddingTop: '4px', borderTop: '1px dashed #E2E8F0', marginTop: '4px' }}>
                          <span>Birim Fiyat: {price.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} {currency}</span>
                          <span style={{ fontWeight: 700, color: '#059669' }}>
                            Toplam: {total.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} {currency}
                          </span>
                        </div>
                      )}
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
            { id: 'ALL', label: 'Tümü (Aktifler)' },
            { id: 'NEW', label: 'Yeni' },
            { id: 'IN_PRODUCTION', label: 'Üretimde' },
            { id: 'COATING', label: 'Kaplamada' },
            { id: 'PAINTING', label: 'Boyada' },
            { id: 'PACKAGING', label: 'Paketlemede' },
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
            const isCollapsed = collapsedCustomers[group.customerName];
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
                  onClick={() => toggleCustomerGroup(group.customerName)}
                  style={{
                    padding: '8px 12px',
                    background: hasSelectedOrderInGroup ? '#EFF6FF' : '#F8FAFC',
                    borderBottom: !isCollapsed ? '1px solid #E2E8F0' : 'none',
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
                {!isCollapsed && (
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
    </div>
  );
};

