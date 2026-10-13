import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from './context/AuthContext';
import { TopBar } from './components/TopBar';
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
import { Order, OrderItem, OrderDocument, OrderStatusHistory, DispatchRecord, ExtractedCustomerInfo, CustomerInsights } from './types';
import { toTurkishErrorMessage } from './utils/errorMessage';
import { 
  Layers, 
  UploadCloud, 
  Factory, 
  Truck, 
  Settings, 
  Menu, 
  X, 
  LogOut, 
  Users, 
  Package, 
  FileText, 
  BarChart3, 
  UserCheck, 
  LayoutDashboard,
  ShieldCheck,
  Paintbrush,
  Edit3
} from 'lucide-react';

export default function App() {
  const { isAuthenticated, token, user, logout } = useAuth();

  const [activeTab, setActiveTab] = useState<string>('orders');
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [orderDocuments, setOrderDocuments] = useState<OrderDocument[]>([]);
  const [orderHistory, setOrderHistory] = useState<OrderStatusHistory[]>([]);
  const [orderDispatches, setOrderDispatches] = useState<DispatchRecord[]>([]);
  const [customerInsights, setCustomerInsights] = useState<CustomerInsights | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Upload & Verification Modal State
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [newOrderModalOpen, setNewOrderModalOpen] = useState(false);
  const [verificationModalOpen, setVerificationModalOpen] = useState(false);
  const [verificationData, setVerificationData] = useState<{
    documentId: number;
    pdfUrl: string;
    customerInfo: ExtractedCustomerInfo;
    orderItems: OrderItem[];
  } | null>(null);

  // Mobile responsiveness state
  const [isMobile, setIsMobile] = useState<boolean>(() => window.innerWidth <= 768);
  const [mobileActiveView, setMobileActiveView] = useState<'list' | 'detail'>('list');
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState<boolean>(false);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth <= 768;
      setIsMobile(mobile);
      if (mobile && !isSidebarCollapsed) {
        setIsSidebarCollapsed(true);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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

      if (res.status === 401 || res.status === 403) {
        logout();
        return;
      }

      if (!res.ok) {
        console.warn('Sipariş listesi sunucu yanıtı geçici olarak başarısız:', res.status);
        return;
      }

      const data = await res.json();
      if (data && Array.isArray(data.orders)) {
        setOrders(data.orders);
        setTotalPages(data.totalPages || 1);
        setTotalCount(data.totalCount || 0);

        // Auto select first order if none selected
        if (data.orders.length > 0 && !selectedOrder) {
          fetchOrderDetail(data.orders[0].id);
        }
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

      if (res.status === 401 || res.status === 403) {
        logout();
        return;
      }

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
      setCustomerInsights(data.customerInsights || null);
    } catch (err) {
      console.error('Sipariş detayı alınamadı:', err);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchOrders();
    }
  }, [isAuthenticated, searchQuery, statusFilter, page]);

  // Handle New Order Trigger: Show choice modal (AI Belge Okuma vs Manuel Giriş)
  const handleUploadClick = () => {
    setNewOrderModalOpen(true);
  };

  const handleStartManualOrder = () => {
    setNewOrderModalOpen(false);
    setVerificationData({
      documentId: 0,
      pdfUrl: '',
      customerInfo: {
        name: '',
        orderNo: `SO-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`,
        projectNo: '',
        coatingType: 'Sıcak Daldırma Galvaniz (TS EN ISO 1461)',
        orderDate: new Date().toISOString().split('T')[0],
        deliveryDate: '',
        currency: 'TRY'
      },
      orderItems: [
        {
          lineNo: 1,
          customerProductCode: '',
          productName: '',
          productDescription: '',
          quantity: 1,
          unit: 'Adet',
          unitPrice: 0,
          currency: 'TRY',
          lineTotal: 0,
          confidenceScore: 1.0,
          status: 'OK'
        }
      ]
    });
    setVerificationModalOpen(true);
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

      const text = await res.text();
      let data: any = {};
      try {
        data = text ? JSON.parse(text) : {};
      } catch (parseErr) {
        throw new Error(`Sunucu yanıtı alınamadı veya sunucu kapalı (${res.status}). Lütfen arka plan sunucusunun çalıştığından emin olun.`);
      }

      if (!res.ok) throw new Error(data.error || `Dosya yükleme başarısız (${res.status})`);

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
      body: JSON.stringify({
        customerInfo,
        orderItems,
        documentId,
        exemptionDocId: customerInfo.exemptionDocId
      })
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

  // Sidebar Collapse State
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => {
    return localStorage.getItem('sies_sidebar_collapsed') === 'true';
  });

  const toggleSidebarCollapse = () => {
    setIsSidebarCollapsed(prev => {
      const next = !prev;
      localStorage.setItem('sies_sidebar_collapsed', String(next));
      return next;
    });
  };

  // Update Order with Optimistic Locking
  const handleUpdateOrder = async (
    updatedItems: OrderItem[],
    updatedFields?: { customerOrderNo?: string; projectNo?: string; coatingType?: string; requestedDeliveryDate?: string }
  ) => {
    if (!selectedOrder) return;

    const deliveryDateToSend = (updatedFields?.requestedDeliveryDate && updatedFields.requestedDeliveryDate.trim() !== '')
      ? updatedFields.requestedDeliveryDate.trim()
      : null;

    const res = await fetch(`/api/orders/${selectedOrder.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        version: selectedOrder.version,
        customerOrderNo: updatedFields?.customerOrderNo !== undefined ? (updatedFields.customerOrderNo.trim() || null) : selectedOrder.customer_order_no,
        projectNo: updatedFields?.projectNo !== undefined ? (updatedFields.projectNo.trim() || null) : selectedOrder.project_no,
        coatingType: updatedFields?.coatingType !== undefined ? (updatedFields.coatingType.trim() || null) : selectedOrder.coating_type,
        requestedDeliveryDate: deliveryDateToSend,
        items: updatedItems
      })
    });

    const data = await res.json();
    if (res.status === 409) {
      throw new Error(toTurkishErrorMessage(data.error));
    }
    if (!res.ok) throw new Error(toTurkishErrorMessage(data.error || 'Güncelleme başarısız'));

    await fetchOrderDetail(selectedOrder.id);
    await fetchOrders();
  };

  // Delete Order
  const handleDeleteOrder = async (orderId: number) => {
    if (!token) return;
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(toTurkishErrorMessage(data.error || 'Sipariş silinemedi!'));
      }

      // If deleted order was selected, clear selection
      if (selectedOrder?.id === orderId) {
        setSelectedOrder(null);
        setOrderItems([]);
        setOrderDocuments([]);
        setOrderHistory([]);
        setOrderDispatches([]);
        if (isMobile) {
          setMobileActiveView('list');
        }
      }
      // Refresh orders list
      await fetchOrders();
      return true;
    } catch (err: any) {
      console.error('Sipariş silme hatası:', err);
      throw new Error(toTurkishErrorMessage(err.message || 'Sipariş silinemedi!'));
    }
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

    if (!res.ok) throw new Error(toTurkishErrorMessage('Durum değiştirilemedi'));

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

      {/* SİES Corporate Top Header */}
      <TopBar 
        title="Akıllı Sipariş Takip Platformu"
        onRefresh={() => fetchOrders()}
        onNewOrder={handleUploadClick}
        onToggleMobileDrawer={() => setIsMobileDrawerOpen(true)}
      />

      {/* Main Workspace Body */}
      <div className="workspace-body">
        {/* Antigravity Style Clean Left Sidebar */}
        <Sidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          onUploadClick={handleUploadClick}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={toggleSidebarCollapse}
        />

        {/* Content Tabs */}
        {activeTab === 'orders' ? (
          isMobile ? (
            mobileActiveView === 'list' ? (
              <OrderListPanel
                orders={orders}
                selectedOrderId={selectedOrder?.id || null}
                onSelectOrder={(order) => {
                  setSelectedOrder(order);
                  fetchOrderDetail(order.id);
                  setMobileActiveView('detail');
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
            ) : (
              <OrderDetailPanel
                order={selectedOrder}
                items={orderItems}
                documents={orderDocuments}
                history={orderHistory}
                dispatches={orderDispatches}
                customerInsights={customerInsights}
                onRefresh={() => selectedOrder && fetchOrderDetail(selectedOrder.id)}
                onUpdateOrder={handleUpdateOrder}
                onDeleteOrder={handleDeleteOrder}
                onStatusChange={handleStatusChange}
                onBackToList={() => setMobileActiveView('list')}
              />
            )
          ) : (
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
                customerInsights={customerInsights}
                onRefresh={() => selectedOrder && fetchOrderDetail(selectedOrder.id)}
                onUpdateOrder={handleUpdateOrder}
                onDeleteOrder={handleDeleteOrder}
                onStatusChange={handleStatusChange}
              />
            </>
          )
        ) : (
          <div className="detail-panel" style={{ padding: '16px' }}>
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
          </div>
        )}
      </div>

      {/* Mobile Bottom Navigation Bar (< 768px) */}
      <nav className="mobile-bottom-nav">
        <button 
          className={`mobile-nav-item ${activeTab === 'orders' ? 'active' : ''}`}
          onClick={() => {
            setActiveTab('orders');
            setMobileActiveView('list');
          }}
        >
          <Layers size={20} />
          <span>Siparişler</span>
        </button>

        <button 
          className="mobile-nav-item primary"
          onClick={handleUploadClick}
        >
          <UploadCloud size={22} />
          <span>Yükle</span>
        </button>

        <button 
          className={`mobile-nav-item ${activeTab === 'production' ? 'active' : ''}`}
          onClick={() => setActiveTab('production')}
        >
          <Factory size={20} />
          <span>Üretim</span>
        </button>

        <button 
          className={`mobile-nav-item ${activeTab === 'shipping' ? 'active' : ''}`}
          onClick={() => setActiveTab('shipping')}
        >
          <Truck size={20} />
          <span>Sevkiyat</span>
        </button>

        <button 
          className="mobile-nav-item"
          onClick={() => setIsMobileDrawerOpen(true)}
        >
          <Menu size={20} />
          <span>Menü</span>
        </button>
      </nav>

      {/* Mobile Slide-out Drawer Menu */}
      {isMobileDrawerOpen && (
        <div className="mobile-drawer-overlay" onClick={() => setIsMobileDrawerOpen(false)}>
          <div className="mobile-drawer" onClick={(e) => e.stopPropagation()}>
            <div className="mobile-drawer-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <img src="/sies-logo.jpg" alt="Logo" style={{ height: '26px', borderRadius: '4px' }} />
                <span style={{ fontWeight: 700, fontSize: '13px', color: '#1E293B' }}>SİES MENÜ</span>
              </div>
              <button 
                onClick={() => setIsMobileDrawerOpen(false)}
                style={{ background: 'none', border: 'none', color: '#64748B', cursor: 'pointer', padding: '4px' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* User Info Card inside Mobile Drawer */}
            {user && (
              <div style={{ margin: '12px', padding: '12px', background: '#F8FAFC', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <ShieldCheck size={18} style={{ color: '#4361EE' }} />
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '13px', color: '#1E293B' }}>{user.name}</div>
                    <div style={{ fontSize: '11px', color: '#64748B' }}>{user.email} ({user.role})</div>
                  </div>
                </div>
              </div>
            )}

            <div className="mobile-drawer-links">
              <div className="drawer-section-title">ANA MENÜ</div>
              <button 
                className={`drawer-link ${activeTab === 'orders' ? 'active' : ''}`}
                onClick={() => { setActiveTab('orders'); setMobileActiveView('list'); setIsMobileDrawerOpen(false); }}
              >
                <Layers size={18} /> Sipariş Havuzu
              </button>
              <button 
                className={`drawer-link ${activeTab === 'dashboard' ? 'active' : ''}`}
                onClick={() => { setActiveTab('dashboard'); setIsMobileDrawerOpen(false); }}
              >
                <LayoutDashboard size={18} /> Gösterge Paneli
              </button>

              <div className="drawer-section-title">OPERASYONEL MODÜLLER</div>
              <button 
                className={`drawer-link ${activeTab === 'customers' ? 'active' : ''}`}
                onClick={() => { setActiveTab('customers'); setIsMobileDrawerOpen(false); }}
              >
                <Users size={18} /> Müşteriler & Cari
              </button>
              <button 
                className={`drawer-link ${activeTab === 'products' ? 'active' : ''}`}
                onClick={() => { setActiveTab('products'); setIsMobileDrawerOpen(false); }}
              >
                <Package size={18} /> Ürün ve Kalemler
              </button>
              <button 
                className={`drawer-link ${activeTab === 'production' ? 'active' : ''}`}
                onClick={() => { setActiveTab('production'); setIsMobileDrawerOpen(false); }}
              >
                <Factory size={18} /> Üretim Takibi
              </button>
              <button 
                className={`drawer-link ${activeTab === 'coating' ? 'active' : ''}`}
                onClick={() => { setActiveTab('coating'); setIsMobileDrawerOpen(false); }}
              >
                <Paintbrush size={18} /> Kaplama / Boya Takibi
              </button>
              <button 
                className={`drawer-link ${activeTab === 'shipping' ? 'active' : ''}`}
                onClick={() => { setActiveTab('shipping'); setIsMobileDrawerOpen(false); }}
              >
                <Truck size={18} /> Sevkiyat & İrsaliye
              </button>
              <button 
                className={`drawer-link ${activeTab === 'archive' ? 'active' : ''}`}
                onClick={() => { setActiveTab('archive'); setIsMobileDrawerOpen(false); }}
              >
                <FileText size={18} /> Belge Arşivi
              </button>
              <button 
                className={`drawer-link ${activeTab === 'reports' ? 'active' : ''}`}
                onClick={() => { setActiveTab('reports'); setIsMobileDrawerOpen(false); }}
              >
                <BarChart3 size={18} /> Raporlar & Analitik
              </button>

              <div className="drawer-section-title">YÖNETİM</div>
              <button 
                className={`drawer-link ${activeTab === 'users' ? 'active' : ''}`}
                onClick={() => { setActiveTab('users'); setIsMobileDrawerOpen(false); }}
              >
                <UserCheck size={18} /> Kullanıcı Yönetimi
              </button>
              <button 
                className={`drawer-link ${activeTab === 'settings' ? 'active' : ''}`}
                onClick={() => { setActiveTab('settings'); setIsMobileDrawerOpen(false); }}
              >
                <Settings size={18} /> Sistem Ayarları
              </button>
            </div>

            {/* Logout Footer Button */}
            <div style={{ padding: '16px', borderTop: '1px solid #E2E8F0', marginTop: 'auto' }}>
              <button 
                onClick={() => { logout(); setIsMobileDrawerOpen(false); }}
                style={{
                  width: '100%',
                  padding: '10px',
                  background: '#FEE2E2',
                  border: '1px solid #FCA5A5',
                  color: '#DC2626',
                  borderRadius: '10px',
                  fontWeight: 600,
                  fontSize: '13px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  cursor: 'pointer'
                }}
              >
                <LogOut size={18} /> Çıkış Yap
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Animated AI Scanning & Document Analysis Overlay */}
      {isUploading && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(15, 23, 42, 0.75)',
          backdropFilter: 'blur(6px)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column'
        }}>
          <div style={{
            background: '#FFFFFF',
            borderRadius: '16px',
            padding: '2rem 2.5rem',
            maxWidth: '460px',
            width: '90%',
            textAlign: 'center',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            border: '1px solid #E2E8F0',
            position: 'relative',
            overflow: 'hidden'
          }}>
            {/* Glowing Pulse Bar */}
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: '4px',
              background: 'linear-gradient(90deg, #3B82F6, #8B5CF6, #3B82F6)',
              backgroundSize: '200% 100%'
            }} />

            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: '#EFF6FF',
              color: '#3B82F6',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1.25rem',
              boxShadow: '0 0 0 8px rgba(59, 130, 246, 0.1)'
            }}>
              <UploadCloud size={32} />
            </div>

            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#0F172A', marginBottom: '0.5rem' }}>
              Belge Taranıyor ve Analiz Ediliyor...
            </h3>

            <p style={{ fontSize: '0.82rem', color: '#64748B', lineHeight: '1.5', marginBottom: '1.5rem' }}>
              Yapay zeka tablodaki çok satırlı ürün açıklamalarını, miktar, birim fiyat ve kaplama türlerini ayrıştırıyor. Lütfen bekleyin.
            </p>

            {/* Scanning Progress Bar */}
            <div style={{
              width: '100%',
              height: '6px',
              background: '#F1F5F9',
              borderRadius: '999px',
              overflow: 'hidden',
              position: 'relative'
            }}>
              <div style={{
                width: '75%',
                height: '100%',
                background: 'linear-gradient(90deg, #2563EB, #7C3AED)',
                borderRadius: '999px'
              }} />
            </div>

            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginTop: '0.75rem',
              fontSize: '0.75rem',
              color: '#94A3B8'
            }}>
              <span>Hücre & Tablo Ayrıştırma</span>
              <span style={{ color: '#2563EB', fontWeight: 600 }}>Aktif İşleniyor</span>
            </div>
          </div>
        </div>
      )}

      {/* New Order Method Selector Modal */}
      {newOrderModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(15, 23, 42, 0.7)',
          backdropFilter: 'blur(4px)',
          zIndex: 9998,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1rem'
        }}>
          <div style={{
            background: '#FFFFFF',
            borderRadius: '16px',
            maxWidth: '520px',
            width: '100%',
            padding: '1.75rem',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            border: '1px solid #E2E8F0',
            position: 'relative'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#0F172A', margin: 0 }}>
                  Yeni Sipariş Ekle
                </h3>
                <p style={{ fontSize: '0.8rem', color: '#64748B', margin: '4px 0 0 0' }}>
                  Siparişi nasıl eklemek istediğinizi seçin:
                </p>
              </div>
              <button
                onClick={() => setNewOrderModalOpen(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#94A3B8',
                  cursor: 'pointer',
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center'
                }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0.85rem' }}>
              {/* Option 1: AI Document Upload */}
              <button
                type="button"
                onClick={() => {
                  setNewOrderModalOpen(false);
                  fileInputRef.current?.click();
                }}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '1rem',
                  padding: '1.1rem 1.25rem',
                  background: '#F8FAFC',
                  border: '2px solid #E2E8F0',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#3B82F6';
                  e.currentTarget.style.background = '#EFF6FF';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#E2E8F0';
                  e.currentTarget.style.background = '#F8FAFC';
                }}
              >
                <div style={{
                  background: '#DBEAFE',
                  color: '#2563EB',
                  padding: '10px',
                  borderRadius: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <UploadCloud size={24} />
                </div>
                <div>
                  <div style={{ fontWeight: 700, color: '#0F172A', fontSize: '0.95rem', marginBottom: '3px' }}>
                    📄 Belgeden Akıllı Oku (PDF / Excel / Resim)
                  </div>
                  <div style={{ fontSize: '0.78rem', color: '#64748B', lineHeight: '1.4' }}>
                    Müşteri satınalma formunu yükleyin. Yapay zeka ürün kodlarını, açıklamalarını, miktarları ve birim fiyatları otomatik ayrıştırsın.
                  </div>
                </div>
              </button>

              {/* Option 2: Manual Order Entry */}
              <button
                type="button"
                onClick={handleStartManualOrder}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '1rem',
                  padding: '1.1rem 1.25rem',
                  background: '#F8FAFC',
                  border: '2px solid #E2E8F0',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#10B981';
                  e.currentTarget.style.background = '#ECFDF5';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#E2E8F0';
                  e.currentTarget.style.background = '#F8FAFC';
                }}
              >
                <div style={{
                  background: '#D1FAE5',
                  color: '#059669',
                  padding: '10px',
                  borderRadius: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <Edit3 size={24} />
                </div>
                <div>
                  <div style={{ fontWeight: 700, color: '#0F172A', fontSize: '0.95rem', marginBottom: '3px' }}>
                    ✍️ Manuel Sipariş Ekle (Form ile Elle Giriş)
                  </div>
                  <div style={{ fontSize: '0.78rem', color: '#64748B', lineHeight: '1.4' }}>
                    Belge yüklemeden müşteri adı, sipariş no ve ürün kalemlerini doğrudan tabloya elle girip anında havuza aktarın.
                  </div>
                </div>
              </button>
            </div>
          </div>
        </div>
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
