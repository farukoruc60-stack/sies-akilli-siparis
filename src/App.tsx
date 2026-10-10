import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from './context/AuthContext';
import { Sidebar } from './components/Sidebar';
import { OrderListPanel } from './components/OrderListPanel';
import { OrderDetailPanel } from './components/OrderDetailPanel';
import { VerificationModal } from './components/VerificationModal';
import { LoginModal } from './components/LoginModal';
import { DashboardView } from './pages/DashboardView';
import { ArchiveView } from './pages/ArchiveView';
import { ReportsView } from './pages/ReportsView';
import { UsersView } from './pages/UsersView';
import { CustomersView } from './pages/CustomersView';
import { ProductsView } from './pages/ProductsView';
import { ProductionView } from './pages/ProductionView';
import { CoatingView } from './pages/CoatingView';
import { ShippingView } from './pages/ShippingView';
import { SettingsView } from './pages/SettingsView';
import { Order, OrderItem, OrderDocument, OrderStatusHistory, DispatchRecord, ExtractedCustomerInfo } from './types';

export default function App() {
  const { isAuthenticated, token } = useAuth();

  const [activeTab, setActiveTab] = useState<string>('orders');
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [orderDocuments, setOrderDocuments] = useState<OrderDocument[]>([]);
  const [orderHistory, setOrderHistory] = useState<OrderStatusHistory[]>([]);
  const [orderDispatches, setOrderDispatches] = useState<DispatchRecord[]>([]);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Upload & Verification Modal State
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [verificationModalOpen, setVerificationModalOpen] = useState(false);
  const [verificationData, setVerificationData] = useState<{
    documentId: number;
    pdfUrl: string;
    customerInfo: ExtractedCustomerInfo;
    orderItems: OrderItem[];
  } | null>(null);

  // Fetch Orders List
  const fetchOrders = async () => {
    if (!token) return;
    try {
      const queryParams = new URLSearchParams({
        search: searchQuery,
        status: statusFilter,
        page: page.toString(),
        limit: '25'
      });
      const res = await fetch(`/api/orders?${queryParams.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setOrders(data.orders || []);
      setTotalPages(data.totalPages || 1);
      setTotalCount(data.totalCount || 0);

      // Auto select first order if none selected
      if (data.orders?.length > 0 && !selectedOrder) {
        fetchOrderDetail(data.orders[0].id);
      }
    } catch (err) {
      console.error('Sipariş listesi yüklenemedi:', err);
    }
  };

  // Fetch Single Order Detail
  const fetchOrderDetail = async (orderId: number) => {
    if (!token) return;
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok || !data.order) {
        console.error('Sipariş detayı yüklenemedi:', data.error || 'Geçersiz veri');
        return;
      }
      setSelectedOrder(data.order);
      setOrderItems(data.items || []);
      setOrderDocuments(data.documents || []);
      setOrderHistory(data.history || []);
      setOrderDispatches(data.dispatches || []);
    } catch (err) {
      console.error('Sipariş detayı alınamadı:', err);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchOrders();
    }
  }, [isAuthenticated, searchQuery, statusFilter, page]);

  // Handle File Upload Trigger
  const handleUploadClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', files[0]);

    try {
      const res = await fetch('/api/documents/upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Dosya yükleme başarısız');

      // Open Verification Screen with extracted metadata
      setVerificationData({
        documentId: data.documentId,
        pdfUrl: `${data.pdfUrl}?token=${token}`,
        customerInfo: data.customerInfo,
        orderItems: data.orderItems
      });
      setVerificationModalOpen(true);
    } catch (err: any) {
      alert(`Dosya yükleme/okuma hatası: ${err.message}`);
    } finally {
      setIsUploading(false);
      if (e.target) e.target.value = '';
    }
  };

  // Confirm Verification & Create Shared Order
  const handleConfirmVerification = async (
    customerInfo: ExtractedCustomerInfo,
    orderItems: OrderItem[],
    documentId: number
  ) => {
    const res = await fetch('/api/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ customerInfo, orderItems, documentId })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Sipariş oluşturulamadı');

    alert(`Sipariş ${data.orderNo} başarıyla onaylandı ve havuza eklendi!`);
    await fetchOrders();
    if (data.orderId) {
      await fetchOrderDetail(data.orderId);
      setActiveTab('orders');
    }
  };

  // Update Order with Optimistic Locking
  const handleUpdateOrder = async (updatedItems: OrderItem[]) => {
    if (!selectedOrder) return;

    const res = await fetch(`/api/orders/${selectedOrder.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        version: selectedOrder.version,
        customerOrderNo: selectedOrder.customer_order_no,
        requestedDeliveryDate: selectedOrder.requested_delivery_date,
        items: updatedItems
      })
    });

    const data = await res.json();
    if (res.status === 409) {
      throw new Error(data.error);
    }
    if (!res.ok) throw new Error(data.error || 'Güncelleme başarısız');

    await fetchOrderDetail(selectedOrder.id);
    await fetchOrders();
  };

  // Status Step Change
  const handleStatusChange = async (newStatus: string, notes: string) => {
    if (!selectedOrder) return;

    const res = await fetch(`/api/orders/${selectedOrder.id}/status`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ newStatus, notes })
    });

    if (!res.ok) throw new Error('Durum değiştirilemedi');

    await fetchOrderDetail(selectedOrder.id);
    await fetchOrders();
  };

  if (!isAuthenticated) {
    return <LoginModal />;
  }

  return (
    <div className="app-layout">
      {/* Hidden File Input for Document Upload */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".pdf,.xlsx,.xls,.docx,.doc,.jpg,.jpeg,.png"
        style={{ display: 'none' }}
      />

      {/* Panel 1: Left Icon Navigation */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onUploadClick={handleUploadClick}
      />

      {/* Main Workspace Content based on active tab */}
      {activeTab === 'dashboard' && <DashboardView />}
      {activeTab === 'customers' && <CustomersView />}
      {activeTab === 'products' && <ProductsView />}
      {activeTab === 'production' && <ProductionView />}
      {activeTab === 'coating' && <CoatingView />}
      {activeTab === 'shipping' && <ShippingView />}
      {activeTab === 'archive' && <ArchiveView />}
      {activeTab === 'reports' && <ReportsView />}
      {activeTab === 'users' && <UsersView />}
      {activeTab === 'settings' && <SettingsView />}

      {activeTab === 'orders' && (
        <>
          {/* Panel 2: Inbox Order List */}
          <OrderListPanel
            orders={orders}
            selectedOrderId={selectedOrder?.id || null}
            onSelectOrder={(order) => {
              setSelectedOrder(order);
              fetchOrderDetail(order.id);
            }}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            statusFilter={statusFilter}
            setStatusFilter={setStatusFilter}
            onUploadClick={handleUploadClick}
            page={page}
            totalPages={totalPages}
            onPageChange={setPage}
            totalCount={totalCount}
          />

          {/* Panel 3: Order Detail Workspace */}
          <OrderDetailPanel
            order={selectedOrder}
            items={orderItems}
            documents={orderDocuments}
            history={orderHistory}
            dispatches={orderDispatches}
            onRefresh={() => selectedOrder && fetchOrderDetail(selectedOrder.id)}
            onUpdateOrder={handleUpdateOrder}
            onStatusChange={handleStatusChange}
          />
        </>
      )}

      {/* Verification Modal for Newly Uploaded Documents */}
      {verificationModalOpen && verificationData && (
        <VerificationModal
          isOpen={verificationModalOpen}
          onClose={() => setVerificationModalOpen(false)}
          documentId={verificationData.documentId}
          pdfUrl={verificationData.pdfUrl}
          initialCustomerInfo={verificationData.customerInfo}
          initialOrderItems={verificationData.orderItems}
          onConfirm={handleConfirmVerification}
        />
      )}
    </div>
  );
}
