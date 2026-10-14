import React, { useState, useEffect } from 'react';
import { 
  X, 
  FileSpreadsheet, 
  Download, 
  Clock, 
  Factory, 
  Truck, 
  AlertTriangle, 
  Layers, 
  RefreshCw, 
  CheckCircle2,
  Calendar,
  Building2
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface ReportsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ReportsModal: React.FC<ReportsModalProps> = ({ isOpen, onClose }) => {
  const { token } = useAuth();
  const [activeTab, setActiveTab] = useState<'open' | 'overdue' | 'work_orders' | 'subcontract' | 'ready_shipping'>('open');
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState<any>(null);

  const fetchReports = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch('/api/reports/production-dispatch', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setReportData(data);
      }
    } catch (err) {
      console.error('Rapor yükleme hatası:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchReports();
    }
  }, [isOpen, token]);

  if (!isOpen) return null;

  const handleDownloadExcel = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/reports/export-excel', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Excel indirilemedi');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `SIES_MES_Uretim_ve_Sevkiyat_Raporu_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (e: any) {
      alert('Excel dışa aktarma hatası: ' + e.message);
    }
  };

  const summary = reportData?.summary || {
    openOrdersCount: 0,
    overdueOrdersCount: 0,
    inProductionCount: 0,
    activeWorkOrdersCount: 0,
    activeSubcontractCount: 0,
    readyToShipItemsCount: 0
  };

  return (
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
      zIndex: 99999,
      padding: '20px'
    }}>
      <div style={{
        background: '#FFFFFF',
        borderRadius: '12px',
        width: '95vw',
        maxWidth: '1100px',
        maxHeight: '90vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        overflow: 'hidden'
      }}>
        {/* Modal Header */}
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid #E2E8F0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'linear-gradient(135deg, #1E293B 0%, #0F172A 100%)',
          color: '#FFFFFF'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ background: '#3B82F6', borderRadius: '8px', padding: '6px', display: 'flex' }}>
              <FileSpreadsheet size={20} color="#FFFFFF" />
            </div>
            <div>
              <h2 style={{ fontSize: '16px', fontWeight: 700, margin: 0, letterSpacing: '-0.3px' }}>
                Üretim, Kaplama ve Sevkiyat Yönetim Raporu
              </h2>
              <span style={{ fontSize: '12px', color: '#94A3B8' }}>
                Canlı MES / ERP Veritabanı Analitik Özeti ve Excel Çıktısı
              </span>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={handleDownloadExcel}
              style={{
                background: '#10B981',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '8px',
                padding: '7px 14px',
                fontSize: '12px',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                cursor: 'pointer',
                boxShadow: '0 2px 4px rgba(16, 185, 129, 0.3)'
              }}
              title="Tüm tabloları içeren Excel dosyasını indir"
            >
              <Download size={15} />
              <span>Excel'e Aktar (.xlsx)</span>
            </button>
            <button
              onClick={fetchReports}
              style={{
                background: 'rgba(255, 255, 255, 0.15)',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '8px',
                padding: '7px',
                cursor: 'pointer'
              }}
              title="Yenile"
            >
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            </button>
            <button
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                color: '#94A3B8',
                cursor: 'pointer',
                padding: '4px'
              }}
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Top KPI Cards Row */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(5, 1fr)',
          gap: '12px',
          padding: '16px 20px',
          background: '#F8FAFC',
          borderBottom: '1px solid #E2E8F0'
        }}>
          <div style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: '8px', padding: '10px 14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#1D4ED8', fontSize: '11px', fontWeight: 700 }}>
              <span>AÇIK SİPARİŞLER</span>
              <Layers size={14} />
            </div>
            <div style={{ fontSize: '20px', fontWeight: 800, color: '#1E40AF', marginTop: '4px' }}>
              {summary.openOrdersCount}
            </div>
          </div>

          <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '8px', padding: '10px 14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#B91C1C', fontSize: '11px', fontWeight: 700 }}>
              <span>GECİKEN SİPARİŞLER</span>
              <AlertTriangle size={14} />
            </div>
            <div style={{ fontSize: '20px', fontWeight: 800, color: '#DC2626', marginTop: '4px' }}>
              {summary.overdueOrdersCount}
            </div>
          </div>

          <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: '8px', padding: '10px 14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#B45309', fontSize: '11px', fontWeight: 700 }}>
              <span>AKTİF İŞ EMİRLERİ</span>
              <Factory size={14} />
            </div>
            <div style={{ fontSize: '20px', fontWeight: 800, color: '#D97706', marginTop: '4px' }}>
              {summary.activeWorkOrdersCount}
            </div>
          </div>

          <div style={{ background: '#FAF5FF', border: '1px solid #E9D5FF', borderRadius: '8px', padding: '10px 14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#7E22CE', fontSize: '11px', fontWeight: 700 }}>
              <span>KAPLAMA & FASON</span>
              <Layers size={14} />
            </div>
            <div style={{ fontSize: '20px', fontWeight: 800, color: '#9333EA', marginTop: '4px' }}>
              {summary.activeSubcontractCount} Parti
            </div>
          </div>

          <div style={{ background: '#ECFDF5', border: '1px solid #A7F3D0', borderRadius: '8px', padding: '10px 14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#047857', fontSize: '11px', fontWeight: 700 }}>
              <span>SEVKİYATA HAZIR</span>
              <Truck size={14} />
            </div>
            <div style={{ fontSize: '20px', fontWeight: 800, color: '#059669', marginTop: '4px' }}>
              {summary.readyToShipItemsCount} Kalem
            </div>
          </div>
        </div>

        {/* Tab Selection */}
        <div style={{
          display: 'flex',
          borderBottom: '1px solid #E2E8F0',
          background: '#FFFFFF',
          padding: '0 20px'
        }}>
          {[
            { id: 'open', label: 'Açık Siparişler', count: reportData?.openOrders?.length || 0, icon: Layers },
            { id: 'overdue', label: 'Geciken Siparişler', count: reportData?.overdueOrders?.length || 0, icon: AlertTriangle, color: '#DC2626' },
            { id: 'work_orders', label: 'Aktif Üretim Emirleri', count: reportData?.activeWorkOrders?.length || 0, icon: Factory },
            { id: 'subcontract', label: 'Kaplama & Fason Partileri', count: reportData?.activeSubcontracts?.length || 0, icon: Layers },
            { id: 'ready_shipping', label: 'Sevkiyata Hazır Kalemler', count: reportData?.readyToShipItems?.length || 0, icon: Truck }
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                style={{
                  padding: '12px 16px',
                  fontSize: '12px',
                  fontWeight: isActive ? 700 : 500,
                  color: isActive ? (tab.color || '#2563EB') : '#64748B',
                  borderBottom: isActive ? `2px solid ${tab.color || '#2563EB'}` : '2px solid transparent',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <Icon size={14} />
                <span>{tab.label}</span>
                <span style={{
                  background: isActive ? '#EFF6FF' : '#F1F5F9',
                  color: isActive ? '#2563EB' : '#64748B',
                  borderRadius: '10px',
                  padding: '1px 6px',
                  fontSize: '10px',
                  fontWeight: 700
                }}>
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Tab Content Tables */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', background: '#FFFFFF' }}>
          {loading ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#64748B' }}>
              <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 10px' }} />
              <div>Rapor verileri hazırlanıyor...</div>
            </div>
          ) : (
            <>
              {/* Tab 1: Açık Siparişler */}
              {activeTab === 'open' && (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                  <thead>
                    <tr style={{ background: '#F8FAFC', borderBottom: '1.5px solid #E2E8F0', color: '#475569', textAlign: 'left' }}>
                      <th style={{ padding: '8px 10px' }}>Sipariş No</th>
                      <th style={{ padding: '8px 10px' }}>Müşteri</th>
                      <th style={{ padding: '8px 10px' }}>Müş. Sip No</th>
                      <th style={{ padding: '8px 10px' }}>Teslim Tarihi</th>
                      <th style={{ padding: '8px 10px' }}>Kalem</th>
                      <th style={{ padding: '8px 10px' }}>Toplam Adet</th>
                      <th style={{ padding: '8px 10px' }}>Sevk Edilen</th>
                      <th style={{ padding: '8px 10px' }}>Kalan</th>
                      <th style={{ padding: '8px 10px' }}>Durum</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(reportData?.openOrders || []).map((o: any) => {
                      const totalQty = parseFloat(o.total_qty) || 0;
                      const shippedQty = parseFloat(o.shipped_qty) || 0;
                      const remaining = Math.max(0, totalQty - shippedQty);
                      return (
                        <tr key={o.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                          <td style={{ padding: '8px 10px', fontWeight: 700, color: '#1E293B' }}>{o.order_no}</td>
                          <td style={{ padding: '8px 10px' }}>{o.customer_name || '-'}</td>
                          <td style={{ padding: '8px 10px', color: '#64748B' }}>{o.customer_order_no || '-'}</td>
                          <td style={{ padding: '8px 10px' }}>{o.requested_delivery_date || '-'}</td>
                          <td style={{ padding: '8px 10px' }}>{o.item_count}</td>
                          <td style={{ padding: '8px 10px', fontWeight: 600 }}>{totalQty.toLocaleString('tr-TR')}</td>
                          <td style={{ padding: '8px 10px', color: '#10B981', fontWeight: 600 }}>{shippedQty.toLocaleString('tr-TR')}</td>
                          <td style={{ padding: '8px 10px', color: '#EF4444', fontWeight: 700 }}>{remaining.toLocaleString('tr-TR')}</td>
                          <td style={{ padding: '8px 10px' }}>
                            <span style={{ background: '#EFF6FF', color: '#1D4ED8', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 600 }}>
                              {o.status}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}

              {/* Tab 2: Geciken Siparişler */}
              {activeTab === 'overdue' && (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                  <thead>
                    <tr style={{ background: '#FEF2F2', borderBottom: '1.5px solid #FECACA', color: '#991B1B', textAlign: 'left' }}>
                      <th style={{ padding: '8px 10px' }}>Sipariş No</th>
                      <th style={{ padding: '8px 10px' }}>Müşteri Adı</th>
                      <th style={{ padding: '8px 10px' }}>Planlanan Teslim Tarihi</th>
                      <th style={{ padding: '8px 10px' }}>Gecikme Süresi</th>
                      <th style={{ padding: '8px 10px' }}>Durum</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(reportData?.overdueOrders || []).map((o: any) => {
                      const today = new Date();
                      today.setHours(0, 0, 0, 0);
                      const target = new Date(o.requested_delivery_date);
                      target.setHours(0, 0, 0, 0);
                      const diffDays = Math.max(1, Math.ceil((today.getTime() - target.getTime()) / (1000 * 60 * 60 * 24)));

                      return (
                        <tr key={o.id} style={{ borderBottom: '1px solid #FEE2E2', background: '#FFF5F5' }}>
                          <td style={{ padding: '8px 10px', fontWeight: 700, color: '#DC2626' }}>{o.order_no}</td>
                          <td style={{ padding: '8px 10px', fontWeight: 600 }}>{o.customer_name}</td>
                          <td style={{ padding: '8px 10px', color: '#991B1B' }}>{o.requested_delivery_date}</td>
                          <td style={{ padding: '8px 10px', color: '#DC2626', fontWeight: 700 }}>{diffDays} Gün Gecikti!</td>
                          <td style={{ padding: '8px 10px' }}>
                            <span style={{ background: '#DC2626', color: '#FFFFFF', padding: '2px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: 700 }}>
                              GECİKMİŞ
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}

              {/* Tab 3: Aktif Üretim Emirleri */}
              {activeTab === 'work_orders' && (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                  <thead>
                    <tr style={{ background: '#F8FAFC', borderBottom: '1.5px solid #E2E8F0', color: '#475569', textAlign: 'left' }}>
                      <th style={{ padding: '8px 10px' }}>İş Emri No</th>
                      <th style={{ padding: '8px 10px' }}>Sipariş No</th>
                      <th style={{ padding: '8px 10px' }}>Müşteri</th>
                      <th style={{ padding: '8px 10px' }}>Ürün Kodu & Tanım</th>
                      <th style={{ padding: '8px 10px' }}>Bölüm</th>
                      <th style={{ padding: '8px 10px' }}>Planlanan</th>
                      <th style={{ padding: '8px 10px' }}>Üretilen</th>
                      <th style={{ padding: '8px 10px' }}>Fire / Hurda</th>
                      <th style={{ padding: '8px 10px' }}>İlerleme</th>
                      <th style={{ padding: '8px 10px' }}>Durum</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(reportData?.activeWorkOrders || []).map((wo: any) => {
                      const planned = parseFloat(wo.planned_quantity) || 1;
                      const produced = parseFloat(wo.produced_quantity) || 0;
                      const pct = Math.min(100, Math.round((produced / planned) * 100));

                      return (
                        <tr key={wo.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                          <td style={{ padding: '8px 10px', fontWeight: 700, color: '#2563EB' }}>{wo.work_order_no}</td>
                          <td style={{ padding: '8px 10px' }}>{wo.order_no}</td>
                          <td style={{ padding: '8px 10px' }}>{wo.customer_name}</td>
                          <td style={{ padding: '8px 10px' }}>
                            <div style={{ fontWeight: 600 }}>{wo.customer_product_code}</div>
                            <div style={{ fontSize: '10px', color: '#64748B' }}>{wo.product_name}</div>
                          </td>
                          <td style={{ padding: '8px 10px' }}>{wo.department || 'Üretim'}</td>
                          <td style={{ padding: '8px 10px', fontWeight: 600 }}>{planned.toLocaleString('tr-TR')}</td>
                          <td style={{ padding: '8px 10px', color: '#10B981', fontWeight: 700 }}>{produced.toLocaleString('tr-TR')}</td>
                          <td style={{ padding: '8px 10px', color: '#EF4444' }}>{parseFloat(wo.defect_quantity || 0).toLocaleString('tr-TR')}</td>
                          <td style={{ padding: '8px 10px', width: '90px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                              <div style={{ flex: 1, background: '#E2E8F0', height: '6px', borderRadius: '3px', overflow: 'hidden' }}>
                                <div style={{ width: `${pct}%`, background: '#3B82F6', height: '100%' }} />
                              </div>
                              <span style={{ fontSize: '10px', fontWeight: 700 }}>%{pct}</span>
                            </div>
                          </td>
                          <td style={{ padding: '8px 10px' }}>
                            <span style={{ background: '#FFFBEB', color: '#B45309', padding: '2px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: 600 }}>
                              {wo.status}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}

              {/* Tab 4: Kaplama & Fason Partileri */}
              {activeTab === 'subcontract' && (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                  <thead>
                    <tr style={{ background: '#F8FAFC', borderBottom: '1.5px solid #E2E8F0', color: '#475569', textAlign: 'left' }}>
                      <th style={{ padding: '8px 10px' }}>Fason Firması</th>
                      <th style={{ padding: '8px 10px' }}>İşlem</th>
                      <th style={{ padding: '8px 10px' }}>İrsaliye No</th>
                      <th style={{ padding: '8px 10px' }}>Sipariş & Müşteri</th>
                      <th style={{ padding: '8px 10px' }}>Ürün Kodu</th>
                      <th style={{ padding: '8px 10px' }}>Giden Miktar</th>
                      <th style={{ padding: '8px 10px' }}>Dönen Miktar</th>
                      <th style={{ padding: '8px 10px' }}>Hatalı / Fire</th>
                      <th style={{ padding: '8px 10px' }}>Kalan Dönecek</th>
                      <th style={{ padding: '8px 10px' }}>Durum</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(reportData?.activeSubcontracts || []).map((so: any) => {
                      const sent = parseFloat(so.sent_quantity) || 0;
                      const returned = parseFloat(so.returned_quantity) || 0;
                      const defect = parseFloat(so.defect_quantity) || 0;
                      const pending = Math.max(0, sent - returned - defect);

                      return (
                        <tr key={so.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                          <td style={{ padding: '8px 10px', fontWeight: 700, color: '#7E22CE' }}>{so.subcontractor_name}</td>
                          <td style={{ padding: '8px 10px' }}>{so.operation_type}</td>
                          <td style={{ padding: '8px 10px', color: '#64748B' }}>{so.waybill_no || '-'}</td>
                          <td style={{ padding: '8px 10px' }}>
                            <div style={{ fontWeight: 600 }}>{so.order_no}</div>
                            <div style={{ fontSize: '10px', color: '#64748B' }}>{so.customer_name}</div>
                          </td>
                          <td style={{ padding: '8px 10px' }}>{so.customer_product_code}</td>
                          <td style={{ padding: '8px 10px', fontWeight: 600 }}>{sent.toLocaleString('tr-TR')}</td>
                          <td style={{ padding: '8px 10px', color: '#10B981', fontWeight: 700 }}>{returned.toLocaleString('tr-TR')}</td>
                          <td style={{ padding: '8px 10px', color: '#EF4444' }}>{defect.toLocaleString('tr-TR')}</td>
                          <td style={{ padding: '8px 10px', color: '#D97706', fontWeight: 700 }}>{pending.toLocaleString('tr-TR')}</td>
                          <td style={{ padding: '8px 10px' }}>
                            <span style={{ background: '#FAF5FF', color: '#7E22CE', padding: '2px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: 600 }}>
                              {so.status}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}

              {/* Tab 5: Sevkiyata Hazır Kalemler */}
              {activeTab === 'ready_shipping' && (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                  <thead>
                    <tr style={{ background: '#F8FAFC', borderBottom: '1.5px solid #E2E8F0', color: '#475569', textAlign: 'left' }}>
                      <th style={{ padding: '8px 10px' }}>Sipariş No</th>
                      <th style={{ padding: '8px 10px' }}>Müşteri</th>
                      <th style={{ padding: '8px 10px' }}>Ürün Kodu</th>
                      <th style={{ padding: '8px 10px' }}>Ürün Adı</th>
                      <th style={{ padding: '8px 10px' }}>Sipariş Miktarı</th>
                      <th style={{ padding: '8px 10px' }}>Üretilen</th>
                      <th style={{ padding: '8px 10px' }}>Sevk Edilen</th>
                      <th style={{ padding: '8px 10px' }}>Sevke Hazır Miktar</th>
                      <th style={{ padding: '8px 10px' }}>Birim</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(reportData?.readyToShipItems || []).map((it: any) => {
                      const totalQty = parseFloat(it.quantity) || 0;
                      const produced = parseFloat(it.produced_quantity || it.production_quantity) || 0;
                      const shipped = parseFloat(it.shipped_quantity) || 0;
                      const readyToShip = Math.max(0, produced - shipped);

                      return (
                        <tr key={it.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                          <td style={{ padding: '8px 10px', fontWeight: 700, color: '#1E293B' }}>{it.order_no}</td>
                          <td style={{ padding: '8px 10px' }}>{it.customer_name}</td>
                          <td style={{ padding: '8px 10px', fontWeight: 600, color: '#2563EB' }}>{it.customer_product_code}</td>
                          <td style={{ padding: '8px 10px' }}>{it.product_name}</td>
                          <td style={{ padding: '8px 10px' }}>{totalQty.toLocaleString('tr-TR')}</td>
                          <td style={{ padding: '8px 10px', color: '#3B82F6', fontWeight: 600 }}>{produced.toLocaleString('tr-TR')}</td>
                          <td style={{ padding: '8px 10px', color: '#64748B' }}>{shipped.toLocaleString('tr-TR')}</td>
                          <td style={{ padding: '8px 10px', color: '#059669', fontWeight: 800, fontSize: '13px' }}>
                            {readyToShip.toLocaleString('tr-TR')}
                          </td>
                          <td style={{ padding: '8px 10px', color: '#64748B' }}>{it.unit || 'Adet'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div style={{
          padding: '12px 20px',
          borderTop: '1px solid #E2E8F0',
          background: '#F8FAFC',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <span style={{ fontSize: '11px', color: '#64748B' }}>
            SIES MES/ERP Üretim & Sevkiyat İzleme Modülü v2.0
          </span>
          <button
            onClick={onClose}
            style={{
              background: '#E2E8F0',
              color: '#334155',
              border: 'none',
              borderRadius: '6px',
              padding: '6px 16px',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Kapat
          </button>
        </div>
      </div>
    </div>
  );
};
