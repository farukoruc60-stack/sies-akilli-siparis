import React from 'react';
import { Search, Filter, Paperclip, ChevronLeft, ChevronRight, PlusCircle, AlertCircle, CheckCircle2, Clock } from 'lucide-react';
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
        return <span className="badge badge-new"><Clock size={12} /> YENİ</span>;
      case 'REVIEW_PENDING':
        return <span className="badge badge-pending"><AlertCircle size={12} /> KONTROL BEKLİYOR</span>;
      case 'APPROVED':
        return <span className="badge badge-approved"><CheckCircle2 size={12} /> ONAYLANDI</span>;
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
    <div className="list-panel">
      {/* List Header & Action */}
      <div style={{ padding: '1rem', borderBottom: '1px solid var(--border-color)', background: '#FFFFFF' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
          <div>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>Sipariş Havuzu</h2>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Toplam {totalCount} sipariş kaydı</span>
          </div>
          <button onClick={onUploadClick} className="btn btn-primary" style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem' }}>
            <PlusCircle size={16} /> Yeni Sipariş
          </button>
        </div>

        {/* Search Bar */}
        <div style={{ position: 'relative', marginBottom: '0.75rem' }}>
          <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            placeholder="Müşteri, Sipariş No veya Kodu Ara..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '0.5rem 0.5rem 0.5rem 2.2rem',
              background: '#F8FAFC',
              border: '1px solid #CBD5E1',
              borderRadius: '6px',
              color: 'var(--text-primary)',
              fontSize: '0.85rem',
              outline: 'none'
            }}
          />
        </div>

        {/* Status Filters */}
        <div style={{ display: 'flex', gap: '0.35rem', overflowX: 'auto', paddingBottom: '0.25rem' }}>
          {[
            { id: 'ALL', label: 'Tümü' },
            { id: 'REVIEW_PENDING', label: 'Kontrol' },
            { id: 'APPROVED', label: 'Onaylı' },
            { id: 'IN_PRODUCTION', label: 'Üretim' },
            { id: 'COATING_PENDING', label: 'Kaplama' },
            { id: 'SHIPPING_PENDING', label: 'Sevkiyat' },
            { id: 'COMPLETED', label: 'Tamamlanan' }
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setStatusFilter(f.id)}
              style={{
                padding: '0.25rem 0.6rem',
                fontSize: '0.72rem',
                borderRadius: '4px',
                border: statusFilter === f.id ? '1px solid #0284C7' : '1px solid #E2E8F0',
                background: statusFilter === f.id ? '#E0F2FE' : '#F8FAFC',
                color: statusFilter === f.id ? '#0369A1' : 'var(--text-secondary)',
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
      <div style={{ flex: 1, overflowY: 'auto', padding: '0.5rem', background: '#F8FAFC' }}>
        {orders.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            <Filter size={32} style={{ marginBottom: '0.5rem', opacity: 0.5 }} />
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
                  padding: '0.85rem',
                  borderRadius: '8px',
                  marginBottom: '0.5rem',
                  background: isSelected ? '#E0F2FE' : '#FFFFFF',
                  border: isSelected ? '2px solid #0284C7' : '1px solid #E2E8F0',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  position: 'relative'
                }}
              >
                {/* Header row */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.35rem' }}>
                  <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '200px' }}>
                    {order.customer_name}
                  </span>
                  {getStatusBadge(order.status)}
                </div>

                {/* Sub details */}
                <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '0.5rem', display: 'flex', justifyContent: 'space-between' }}>
                  <span>Sipariş: <strong style={{ color: 'var(--primary)' }}>{order.order_no}</strong></span>
                  {order.customer_order_no && <span>Müş. No: {order.customer_order_no}</span>}
                </div>

                {/* Card footer */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  <span>Tarih: {order.order_date ? new Date(order.order_date).toLocaleDateString('tr-TR') : '-'}</span>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ background: '#F1F5F9', color: '#475569', padding: '0.15rem 0.4rem', borderRadius: '4px', fontWeight: 600 }}>
                      {order.total_items || 0} Kalem
                    </span>
                    {(order.total_docs || 0) > 0 && (
                      <span title="Orijinal Belge Ekli" style={{ color: 'var(--primary)', display: 'flex', alignItems: 'center' }}>
                        <Paperclip size={14} />
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
          padding: '0.5rem 1rem',
          borderTop: '1px solid var(--border-color)',
          background: '#FFFFFF',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '0.75rem',
          color: 'var(--text-muted)'
        }}>
          <span>Sayfa {page} / {totalPages}</span>
          <div style={{ display: 'flex', gap: '0.25rem' }}>
            <button
              disabled={page <= 1}
              onClick={() => onPageChange(page - 1)}
              style={{ padding: '0.25rem 0.5rem', background: '#F1F5F9', border: '1px solid #E2E8F0', borderRadius: '4px', color: '#0F172A', cursor: 'pointer' }}
            >
              <ChevronLeft size={14} />
            </button>
            <button
              disabled={page >= totalPages}
              onClick={() => onPageChange(page + 1)}
              style={{ padding: '0.25rem 0.5rem', background: '#F1F5F9', border: '1px solid #E2E8F0', borderRadius: '4px', color: '#0F172A', cursor: 'pointer' }}
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
