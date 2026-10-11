import React, { useState } from 'react';
import { X, CheckCircle, RefreshCw, FileText, Plus, Trash2, Copy, AlertTriangle, ShieldCheck, UploadCloud, Loader2, Paperclip } from 'lucide-react';
import { ExtractedCustomerInfo, OrderItem } from '../types';

interface VerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  documentId: number;
  pdfUrl: string;
  initialCustomerInfo: ExtractedCustomerInfo;
  initialOrderItems: OrderItem[];
  onConfirm: (customerInfo: ExtractedCustomerInfo, orderItems: OrderItem[], documentId: number) => Promise<void>;
}

export const VerificationModal: React.FC<VerificationModalProps> = ({
  isOpen,
  onClose,
  documentId,
  pdfUrl,
  initialCustomerInfo,
  initialOrderItems,
  onConfirm
}) => {
  const [customerInfo, setCustomerInfo] = useState<ExtractedCustomerInfo>(initialCustomerInfo);
  const [orderItems, setOrderItems] = useState<OrderItem[]>(initialOrderItems);
  const [saving, setSaving] = useState(false);
  const [uploadingExemption, setUploadingExemption] = useState(false);
  const [exemptionFile, setExemptionFile] = useState<{ id: number; name: string; size: number } | null>(null);
  const [exemptionError, setExemptionError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCustomerChange = (field: keyof ExtractedCustomerInfo, value: any) => {
    setCustomerInfo({ ...customerInfo, [field]: value });
  };

  const handleExemptionUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingExemption(true);
    setExemptionError(null);
    try {
      const token = localStorage.getItem('sies_auth_token') || '';
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/documents/upload-exemption', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Muafiyet belgesi yüklenemedi');

      setExemptionFile({
        id: data.documentId,
        name: data.originalName,
        size: data.fileSize
      });
      setCustomerInfo(prev => ({ ...prev, exemptionDocId: data.documentId }));
    } catch (err: any) {
      setExemptionError(err.message || 'Yükleme başarısız');
    } finally {
      setUploadingExemption(false);
      if (e.target) e.target.value = '';
    }
  };

  const handleRemoveExemption = () => {
    setExemptionFile(null);
    setCustomerInfo(prev => ({ ...prev, exemptionDocId: undefined }));
  };

  const handleItemChange = (index: number, field: keyof OrderItem, val: any) => {
    const copy = [...orderItems];
    copy[index] = { ...copy[index], [field]: val };

    if (field === 'quantity' || field === 'unitPrice') {
      const q = parseFloat(String(copy[index].quantity)) || 0;
      const p = parseFloat(String(copy[index].unitPrice)) || 0;
      copy[index].lineTotal = q * p;
    }
    setOrderItems(copy);
  };

  const handleAddRow = () => {
    setOrderItems([
      ...orderItems,
      {
        lineNo: orderItems.length + 1,
        productName: 'Yeni Taşıyıcı Kanal Kalemi',
        widthMm: 150,
        heightMm: 50,
        thicknessMm: 1.5,
        quantity: 10,
        unit: 'Boy',
        unitPrice: 200,
        currency: 'TRY',
        lineTotal: 2000,
        confidenceScore: 1.0
      }
    ]);
  };

  const handleDeleteRow = (index: number) => {
    setOrderItems(orderItems.filter((_, i) => i !== index));
  };

  const handleCopyRow = (index: number) => {
    const target = orderItems[index];
    setOrderItems([
      ...orderItems,
      {
        ...target,
        lineNo: orderItems.length + 1
      }
    ]);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onConfirm(customerInfo, orderItems, documentId);
      onClose();
    } catch (err: any) {
      alert(`Sipariş kaydedilirken hata oluştu: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const totalAmount = orderItems.reduce((acc, it) => acc + (it.lineTotal || 0), 0);

  const formatDateToISO = (dStr?: string) => {
    if (!dStr) return '';
    const trimmed = dStr.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
    const match = trimmed.match(/^(\d{1,2})[\.\/-](\d{1,2})[\.\/-](\d{4})$/);
    if (match) {
      const day = match[1].padStart(2, '0');
      const month = match[2].padStart(2, '0');
      const year = match[3];
      return `${year}-${month}-${day}`;
    }
    return trimmed;
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        {/* Modal Header */}
        <div style={{
          padding: '1rem 1.5rem',
          background: '#060910',
          borderBottom: '1px solid var(--border-color)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <ShieldCheck size={22} color="var(--primary)" />
              <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#fff' }}>
                Otomatik Belge Okuma Kontrol ve Onay Ekranı
              </h2>
            </div>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              Çıkarılan verileri sol tarafta inceleyip düzenleyin, sağ tarafta orijinal PDF'i kontrol edin.
            </span>
          </div>

          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
            <X size={24} />
          </button>
        </div>

        {/* Modal Split Body */}
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          {/* Left Side: Extracted Metadata & Item Editor */}
          <div style={{ width: '60%', borderRight: '1px solid var(--border-color)', overflowY: 'auto', padding: '1.25rem' }}>
            {/* Customer & Order Header Information Section */}
            <div style={{ background: 'var(--bg-card)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <h3 style={{ fontSize: '0.9rem', color: 'var(--primary)', margin: 0, fontWeight: 600 }}>
                  1. Müşteri ve Sipariş Başlık Bilgileri
                </h3>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>* Zorunlu alan</span>
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', fontSize: '0.8rem' }}>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{ display: 'block', color: 'var(--text-muted)', marginBottom: '0.2rem', fontWeight: 600 }}>Müşteri Adı / Ticari Unvanı *</label>
                  <input
                    type="text"
                    value={customerInfo.name || ''}
                    placeholder="Örn: ABC İnşaat San. ve Tic. Ltd. Şti."
                    onChange={(e) => handleCustomerChange('name', e.target.value)}
                    style={{ width: '100%', padding: '0.45rem', background: '#FFFFFF', border: '1px solid #CBD5E1', borderRadius: '4px', color: '#0F172A', fontWeight: 600 }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>Müşteri Kendi Sipariş No</label>
                  <input
                    type="text"
                    placeholder="Örn: MŞ-2026/044"
                    value={customerInfo.orderNo || ''}
                    onChange={(e) => handleCustomerChange('orderNo', e.target.value)}
                    style={{ width: '100%', padding: '0.45rem', background: '#FFFFFF', border: '1px solid #CBD5E1', borderRadius: '4px', color: '#0F172A' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>Müşteri Proje No / Adı</label>
                  <input
                    type="text"
                    placeholder="Örn: PRJ-İST-KÖPRÜ-24"
                    value={customerInfo.projectNo || ''}
                    onChange={(e) => handleCustomerChange('projectNo', e.target.value)}
                    style={{ width: '100%', padding: '0.45rem', background: '#FFFFFF', border: '1px solid #CBD5E1', borderRadius: '4px', color: '#0F172A' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>Kaplama Cinsi</label>
                  <input
                    type="text"
                    placeholder="Örn: Sıcak Daldırma Galvaniz, Eloksal, Boyalı..."
                    value={customerInfo.coatingType || ''}
                    onChange={(e) => handleCustomerChange('coatingType', e.target.value)}
                    style={{ width: '100%', padding: '0.45rem', background: '#FFFFFF', border: '1px solid #CBD5E1', borderRadius: '4px', color: '#0F172A' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>İstenen Teslim Tarihi</label>
                  <input
                    type="date"
                    value={formatDateToISO(customerInfo.deliveryDate || customerInfo.requestedDeliveryDate)}
                    onChange={(e) => {
                      handleCustomerChange('deliveryDate', e.target.value);
                      handleCustomerChange('requestedDeliveryDate', e.target.value);
                    }}
                    style={{ width: '100%', padding: '0.45rem', background: '#FFFFFF', border: '1px solid #CBD5E1', borderRadius: '4px', color: '#0F172A' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>Sipariş Tarihi</label>
                  <input
                    type="date"
                    value={formatDateToISO(customerInfo.orderDate)}
                    onChange={(e) => handleCustomerChange('orderDate', e.target.value)}
                    style={{ width: '100%', padding: '0.45rem', background: '#FFFFFF', border: '1px solid #CBD5E1', borderRadius: '4px', color: '#0F172A' }}
                  />
                </div>
              </div>

              {/* KDV Muafiyet Belgesi Yükleme Bölümü */}
              <div style={{ marginTop: '1rem', paddingTop: '0.85rem', borderTop: '1px dashed var(--border-color)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#F59E0B', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <Paperclip size={14} /> KDV Muafiyet Belgesi (Varsa)
                  </label>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Opsiyonel</span>
                </div>

                {exemptionFile ? (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.6rem 0.85rem',
                    background: 'rgba(16, 185, 129, 0.1)',
                    border: '1px solid #10B981',
                    borderRadius: '6px',
                    fontSize: '0.8rem'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', overflow: 'hidden' }}>
                      <CheckCircle size={16} color="#10B981" />
                      <span style={{ fontWeight: 600, color: '#ECFDF5', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {exemptionFile.name}
                      </span>
                      <span style={{ fontSize: '0.72rem', color: '#9CA3AF' }}>
                        ({(exemptionFile.size / 1024).toFixed(1)} KB)
                      </span>
                      <span style={{
                        fontSize: '0.68rem',
                        background: '#065F46',
                        color: '#A7F3D0',
                        padding: '0.1rem 0.4rem',
                        borderRadius: '4px',
                        fontWeight: 600
                      }}>
                        Sipariş Belgelerine Kaydedilecek
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={handleRemoveExemption}
                      title="Belgeyi Kaldır"
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#EF4444',
                        cursor: 'pointer',
                        padding: '0.2rem',
                        display: 'flex',
                        alignItems: 'center'
                      }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ) : (
                  <div>
                    <label style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.5rem',
                      padding: '0.65rem 1rem',
                      background: 'rgba(255, 255, 255, 0.03)',
                      border: '1px dashed #64748B',
                      borderRadius: '6px',
                      cursor: uploadingExemption ? 'not-allowed' : 'pointer',
                      transition: 'all 0.2s ease',
                      fontSize: '0.78rem',
                      color: 'var(--text-secondary)'
                    }}>
                      {uploadingExemption ? (
                        <>
                          <Loader2 size={16} className="spin" color="var(--primary)" />
                          <span>Muafiyet Belgesi Yükleniyor...</span>
                        </>
                      ) : (
                        <>
                          <UploadCloud size={16} color="#F59E0B" />
                          <span>KDV Muafiyet Belgesi Seç veya Yükle (PDF, Resim)</span>
                        </>
                      )}
                      <input
                        type="file"
                        accept=".pdf,.png,.jpg,.jpeg"
                        disabled={uploadingExemption}
                        onChange={handleExemptionUpload}
                        style={{ display: 'none' }}
                      />
                    </label>

                    {exemptionError && (
                      <div style={{ color: '#EF4444', fontSize: '0.75rem', marginTop: '0.35rem' }}>
                        {exemptionError}
                      </div>
                    )}

                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.3rem' }}>
                      ℹ️ Muafiyet belgesi var ise ekleyin. Sipariş onaylandığında <b>"Sipariş Belgeleri"</b> sekmesine eklenecektir.
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Extracted Order Items Section */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <h3 style={{ fontSize: '0.9rem', color: 'var(--primary)', fontWeight: 600 }}>
                  2. Çıkarılan Sipariş Kalemleri ({orderItems.length} Kalem - Toplam {totalAmount.toLocaleString('tr-TR')} TRY)
                </h3>
                <button onClick={handleAddRow} className="btn btn-secondary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}>
                  <Plus size={14} /> Satır Ekle
                </button>
              </div>

              <div className="table-container">
                <table className="custom-table" style={{ fontSize: '0.8rem' }}>
                  <thead>
                    <tr>
                      <th style={{ width: '30px' }}>#</th>
                      <th>Ürün Kodu</th>
                      <th>Ürün Açıklaması</th>
                      <th>Miktar</th>
                      <th>Birim</th>
                      <th>Birim Fiyat</th>
                      <th>Toplam Tutar</th>
                      <th>İşlem</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orderItems.map((item, idx) => {
                      const qty = parseFloat(String(item.quantity)) || 0;
                      const uPrice = parseFloat(String(item.unitPrice)) || 0;
                      const lTotal = parseFloat(String(item.lineTotal)) || (qty * uPrice);

                      return (
                        <tr key={idx} style={{ background: (item.confidenceScore || 1) < 0.9 ? '#FEF3C7' : undefined }}>
                          <td>{idx + 1}</td>
                          <td>
                            <input
                              type="text"
                              value={item.customerProductCode || ''}
                              onChange={(e) => handleItemChange(idx, 'customerProductCode', e.target.value)}
                              style={{ width: '90px', background: '#FFFFFF', border: '1px solid #CBD5E1', color: '#0F172A', padding: '0.2rem', borderRadius: '4px' }}
                            />
                          </td>
                          <td>
                            <input
                              type="text"
                              value={item.productName || ''}
                              onChange={(e) => handleItemChange(idx, 'productName', e.target.value)}
                              style={{ width: '220px', background: '#FFFFFF', border: '1px solid #CBD5E1', color: '#0F172A', padding: '0.2rem', borderRadius: '4px' }}
                            />
                          </td>
                          <td>
                            <input
                              type="number"
                              step="0.1"
                              value={qty}
                              onChange={(e) => handleItemChange(idx, 'quantity', parseFloat(e.target.value))}
                              style={{ width: '70px', background: '#FFFFFF', border: '1px solid #CBD5E1', color: '#0F172A', padding: '0.2rem', borderRadius: '4px' }}
                            />
                          </td>
                          <td>
                            <input
                              type="text"
                              value={item.unit || 'Adet'}
                              onChange={(e) => handleItemChange(idx, 'unit', e.target.value)}
                              style={{ width: '50px', background: '#FFFFFF', border: '1px solid #CBD5E1', color: '#0F172A', padding: '0.2rem', borderRadius: '4px' }}
                            />
                          </td>
                          <td>
                            <input
                              type="number"
                              step="0.01"
                              value={uPrice}
                              onChange={(e) => handleItemChange(idx, 'unitPrice', parseFloat(e.target.value))}
                              style={{ width: '75px', background: '#FFFFFF', border: '1px solid #CBD5E1', color: '#0F172A', padding: '0.2rem', borderRadius: '4px' }}
                            />
                          </td>
                          <td style={{ color: 'var(--primary)', fontWeight: 600, whiteSpace: 'nowrap' }}>
                            {lTotal.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} TRY
                          </td>
                          <td>
                            <div style={{ display: 'flex', gap: '0.3rem' }}>
                              <button onClick={() => handleCopyRow(idx)} title="Satırı Kopyala" style={{ background: 'none', border: 'none', color: '#60A5FA', cursor: 'pointer' }}>
                                <Copy size={14} />
                              </button>
                              <button onClick={() => handleDeleteRow(idx)} title="Satırı Sil" style={{ background: 'none', border: 'none', color: '#F87171', cursor: 'pointer' }}>
                                <Trash2 size={14} />
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
          </div>

          {/* Right Side: PDF Document Preview Viewer */}
          <div style={{ width: '40%', background: '#000', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '0.5rem 1rem', background: '#0E1524', borderBottom: '1px solid var(--border-color)', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Orijinal Belge PDF Canlı Önizleme
            </div>
            <iframe
              src={pdfUrl}
              title="PDF Preview"
              style={{ width: '100%', height: '100%', border: 'none' }}
            />
          </div>
        </div>

        {/* Modal Footer */}
        <div style={{
          padding: '1rem 1.5rem',
          background: '#060910',
          borderTop: '1px solid var(--border-color)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            ✓ Kontrol Edildi. Onaylandıktan sonra sipariş ortak havuza alınacak.
          </span>

          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button onClick={onClose} className="btn btn-secondary">
              İptal / Taslak Olarak Bırak
            </button>
            <button onClick={handleSave} disabled={saving} className="btn btn-primary">
              <CheckCircle size={16} /> {saving ? 'Kaydediliyor...' : 'Onayla ve Havuza Aktar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
