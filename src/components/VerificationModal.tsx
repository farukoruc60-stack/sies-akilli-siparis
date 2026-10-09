import React, { useState } from 'react';
import { X, CheckCircle, RefreshCw, FileText, Plus, Trash2, Copy, AlertTriangle, ShieldCheck } from 'lucide-react';
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

  if (!isOpen) return null;

  const handleCustomerChange = (field: keyof ExtractedCustomerInfo, value: string) => {
    setCustomerInfo({ ...customerInfo, [field]: value });
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
            {/* Customer Information Section */}
            <div style={{ background: 'var(--bg-card)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)', marginBottom: '1.25rem' }}>
              <h3 style={{ fontSize: '0.9rem', color: 'var(--primary)', marginBottom: '0.75rem', fontWeight: 600 }}>
                1. Müşteri ve Sipariş Başlık Bilgileri
              </h3>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', fontSize: '0.8rem' }}>
                <div>
                  <label style={{ display: 'block', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>Müşteri Ticari Unvanı *</label>
                  <input
                    type="text"
                    value={customerInfo.name}
                    onChange={(e) => handleCustomerChange('name', e.target.value)}
                    style={{ width: '100%', padding: '0.4rem', background: 'rgba(0,0,0,0.4)', border: '1px solid var(--border-color)', borderRadius: '4px', color: '#fff' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>Müşteri Sipariş No</label>
                  <input
                    type="text"
                    value={customerInfo.orderNo || ''}
                    onChange={(e) => handleCustomerChange('orderNo', e.target.value)}
                    style={{ width: '100%', padding: '0.4rem', background: 'rgba(0,0,0,0.4)', border: '1px solid var(--border-color)', borderRadius: '4px', color: '#fff' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>Vergi Dairesi & Numarası</label>
                  <input
                    type="text"
                    value={customerInfo.taxNumber || ''}
                    onChange={(e) => handleCustomerChange('taxNumber', e.target.value)}
                    style={{ width: '100%', padding: '0.4rem', background: 'rgba(0,0,0,0.4)', border: '1px solid var(--border-color)', borderRadius: '4px', color: '#fff' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>Sipariş Tarihi</label>
                  <input
                    type="date"
                    value={customerInfo.orderDate || ''}
                    onChange={(e) => handleCustomerChange('orderDate', e.target.value)}
                    style={{ width: '100%', padding: '0.4rem', background: 'rgba(0,0,0,0.4)', border: '1px solid var(--border-color)', borderRadius: '4px', color: '#fff' }}
                  />
                </div>
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
                        <tr key={idx} style={{ background: (item.confidenceScore || 1) < 0.9 ? 'rgba(245, 158, 11, 0.1)' : undefined }}>
                          <td>{idx + 1}</td>
                          <td>
                            <input
                              type="text"
                              value={item.customerProductCode || ''}
                              onChange={(e) => handleItemChange(idx, 'customerProductCode', e.target.value)}
                              style={{ width: '90px', background: 'rgba(0,0,0,0.4)', border: '1px solid var(--border-color)', color: '#fff', padding: '0.2rem', borderRadius: '4px' }}
                            />
                          </td>
                          <td>
                            <input
                              type="text"
                              value={item.productName || ''}
                              onChange={(e) => handleItemChange(idx, 'productName', e.target.value)}
                              style={{ width: '220px', background: 'rgba(0,0,0,0.4)', border: '1px solid var(--border-color)', color: '#fff', padding: '0.2rem', borderRadius: '4px' }}
                            />
                          </td>
                          <td>
                            <input
                              type="number"
                              step="0.1"
                              value={qty}
                              onChange={(e) => handleItemChange(idx, 'quantity', parseFloat(e.target.value))}
                              style={{ width: '70px', background: 'rgba(0,0,0,0.4)', border: '1px solid var(--border-color)', color: '#fff', padding: '0.2rem', borderRadius: '4px' }}
                            />
                          </td>
                          <td>
                            <input
                              type="text"
                              value={item.unit || 'Adet'}
                              onChange={(e) => handleItemChange(idx, 'unit', e.target.value)}
                              style={{ width: '50px', background: 'rgba(0,0,0,0.4)', border: '1px solid var(--border-color)', color: '#fff', padding: '0.2rem', borderRadius: '4px' }}
                            />
                          </td>
                          <td>
                            <input
                              type="number"
                              step="0.01"
                              value={uPrice}
                              onChange={(e) => handleItemChange(idx, 'unitPrice', parseFloat(e.target.value))}
                              style={{ width: '75px', background: 'rgba(0,0,0,0.4)', border: '1px solid var(--border-color)', color: '#fff', padding: '0.2rem', borderRadius: '4px' }}
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
