import React from 'react';
import { Search, Filter, Paperclip, ChevronLeft, ChevronRight, Plus, AlertCircle, CheckCircle2, Clock } from 'lucide-react';
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
            <span style={{ fontSize: '11px', color: '#718096' }}>Toplam {totalCount} sipariş kaydı</span>
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

      {/* Inbox Order Item Cards */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px', background: '#FAFBFD' }}>
        {orders.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#A0AEC0', fontSize: '12px' }}>
            <Filter size={28} style={{ marginBottom: '6px', opacity: 0.5 }} />
            <p>Arama veya filtre kriterinize uygun sipariş kaydı bulunamadı.</p>
          </div>
        ) : (
          orders.map((order) => {
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
          })
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
