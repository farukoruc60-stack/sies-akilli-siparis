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
  FolderTree
} from 'lucide-react';
import { Order, OrderStatus } from '../types';

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
  // Grouping Mode State: Default to Customer Grouping (true)
  const [groupByCustomer, setGroupByCustomer] = useState<boolean>(true);

  // Expanded/Collapsed Customer Groups State (empty map = all expanded by default)
  const [collapsedCustomers, setCollapsedCustomers] = useState<{ [custName: string]: boolean }>({});

  const toggleCustomerGroup = (custName: string) => {
    setCollapsedCustomers(prev => ({
      ...prev,
      [custName]: !prev[custName]
    }));
  };

  const getStatusBadge = (status: OrderStatus) => {
    switch (status) {
      case 'NEW':
        return <span className="badge badge-new"><Clock size={11} /> YENİ</span>;
      case 'REVIEW_PENDING':
        return <span className="badge badge-pending"><AlertCircle size={11} /> KONTROL BEKLİYOR</span>;
      case 'APPROVED':
        return <span className="badge badge-approved"><CheckCircle2 size={11} /> ONAYLANDI</span>;
      case 'IN_PRODUCTION':
        return <span className="badge badge-production">ÜRETİMDE</span>;
      case 'COATING_PENDING':
        return <span className="badge badge-pending">KAPLAMADA</span>;
      case 'SHIPPING_PENDING':
        return <span className="badge badge-pending">SEVKİYATTA</span>;
      case 'COMPLETED':
        return <span className="badge badge-completed">TAMAMLANDI</span>;
      default:
        return <span className="badge badge-new">{status}</span>;
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
    return (
      <div
        key={order.id}
        onClick={() => onSelectOrder(order)}
        style={{
          padding: '10px 12px',
          borderRadius: '10px',
          marginBottom: '6px',
          background: isSelected ? '#EFF6FF' : '#FFFFFF',
          border: isSelected ? '1px solid #3B82F6' : '1px solid #E2E8F0',
          boxShadow: isSelected ? '0 2px 6px rgba(59, 130, 246, 0.12)' : '0 1px 2px rgba(0,0,0,0.03)',
          cursor: 'pointer',
          transition: 'all 0.15s ease',
          position: 'relative'
        }}
      >
        {/* Header row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
          <span style={{ fontWeight: 600, fontSize: '13px', color: '#1A202C', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '180px' }}>
            {order.customer_name}
          </span>
          {getStatusBadge(order.status)}
        </div>

        {/* Sub details */}
        <div style={{ fontSize: '11.5px', color: '#4A5568', marginBottom: '6px', display: 'flex', justifyContent: 'space-between' }}>
          <span>Sip: <strong style={{ color: '#3B82F6' }}>{order.order_no}</strong></span>
          {order.customer_order_no && <span>Müş: {order.customer_order_no}</span>}
        </div>

        {/* Card footer */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '10.5px', color: '#718096' }}>
          <span>Tarih: {order.order_date ? new Date(order.order_date).toLocaleDateString('tr-TR') : '-'}</span>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ background: '#F1F5F9', color: '#4A5568', padding: '1px 6px', borderRadius: '8px', fontWeight: 600 }}>
              {order.total_items || 0} Kalem
            </span>
            {(order.total_docs || 0) > 0 && (
              <span title="Orijinal Belge Ekli" style={{ color: '#3B82F6', display: 'flex', alignItems: 'center' }}>
                <Paperclip size={12} />
              </span>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div style={{
      width: '360px',
      minWidth: '320px',
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
        <div style={{ display: 'flex', gap: '4px', overflowX: 'auto', paddingBottom: '2px' }}>
          {[
            { id: 'ALL', label: 'Tümü' },
            { id: 'REVIEW_PENDING', label: 'Kontrol' },
            { id: 'APPROVED', label: 'Onaylı' },
            { id: 'IN_PRODUCTION', label: 'Üretim' },
            { id: 'COATING_PENDING', label: 'Kaplama' },
            { id: 'SHIPPING_PENDING', label: 'Sevkiyat' },
            { id: 'COMPLETED', label: 'Tamam' }
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

