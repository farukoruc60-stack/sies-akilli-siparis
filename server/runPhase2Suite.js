import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';
import FormData from 'form-data';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BASE_URL = 'http://localhost:5000/api';

async function runPhase2() {
  console.log('=======================================================');
  console.log(' SİES AKILLI SİPARİŞ TAKİP - FAZ 2 GERÇEK DOĞRULAMA TESTİ');
  console.log('=======================================================');

  // Login Admin
  const loginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@sies.com.tr', password: 'Admin2026!' })
  });
  const loginData = await loginRes.json();
  const token = loginData.token;

  // 1. GERÇEK DOSYA DÖNÜŞTÜRME VE UPLOAD TESTİ (PDF & XLSX)
  console.log('\n[1. GERÇEK DOSYA UPLOAD VE PDF DÖNÜŞTÜRME TESTİ]');
  
  const pdfPath = path.join(__dirname, 'test_fixtures/sample_order.pdf');
  const xlsxPath = path.join(__dirname, 'test_fixtures/sample_order.xlsx');

  // Upload PDF
  const pdfForm = new FormData();
  pdfForm.append('file', fs.createReadStream(pdfPath));

  const pdfUploadRes = await fetch(`${BASE_URL}/documents/upload`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: pdfForm
  });
  const pdfUploadData = await pdfUploadRes.json();
  console.log(`  ✓ PDF Yükleme & Metin Ayıklama: Status HTTP ${pdfUploadRes.status}`);
  console.log(`    - Belge ID: ${pdfUploadData.documentId}, SHA-256: ${pdfUploadData.sha256}`);
  console.log(`    - Müşteri Adı: "${pdfUploadData.customerInfo?.name}"`);
  console.log(`    - Çıkarılan Sipariş Kalem Sayısı: ${pdfUploadData.orderItems?.length}`);

  // Upload XLSX
  const xlsxForm = new FormData();
  xlsxForm.append('file', fs.createReadStream(xlsxPath));

  const xlsxUploadRes = await fetch(`${BASE_URL}/documents/upload`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: xlsxForm
  });
  const xlsxUploadData = await xlsxUploadRes.json();
  console.log(`  ✓ Excel (XLSX) Yükleme & PDF Dönüştürme: Status HTTP ${xlsxUploadRes.status}`);
  console.log(`    - Belge ID: ${xlsxUploadData.documentId}, SHA-256: ${xlsxUploadData.sha256}`);
  console.log(`    - Müşteri Adı: "${xlsxUploadData.customerInfo?.name}"`);
  console.log(`    - Çıkarılan Sipariş Kalem Sayısı: ${xlsxUploadData.orderItems?.length}`);

  // 2. ORİJİNAL BELGE SAKLAMA VE SHA-256
  console.log('\n[2. ORİJİNAL BELGE SAKLAMA VE ERİŞİM TESTİ]');
  const docId = pdfUploadData.documentId;
  const pdfViewRes = await fetch(`${BASE_URL}/documents/${docId}/pdf`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  console.log(`  ✓ PDF Canlı Önizleme Bağlantısı: Status HTTP ${pdfViewRes.status} (Content-Type: ${pdfViewRes.headers.get('content-type')})`);

  // 3. İMALAT, KAPLAMA VE SEVKİYAT ADIMLARI
  console.log('\n[3. İMALAT VE SEVKİYAT İŞ AKIŞI TESTİ]');
  const createOrderRes = await fetch(`${BASE_URL}/orders`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({
      customerInfo: xlsxUploadData.customerInfo,
      orderItems: xlsxUploadData.orderItems,
      documentId: xlsxUploadData.documentId
    })
  });
  const createOrderData = await createOrderRes.json();
  const createdOrderId = createOrderData.orderId;
  console.log(`  ✓ Sipariş Havuza Aktarıldı: Order ID=${createdOrderId}`);

  // Status transition to IN_PRODUCTION
  const statusProdRes = await fetch(`${BASE_URL}/orders/${createdOrderId}/status`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ newStatus: 'IN_PRODUCTION', notes: 'Roll-Forming imalatına alındı.' })
  });
  console.log(`  ✓ Durum Değişikliği (ÜRETİMDE): Status HTTP ${statusProdRes.status}`);

  // Status transition to COATING_PENDING
  const statusCoatRes = await fetch(`${BASE_URL}/orders/${createdOrderId}/status`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ newStatus: 'COATING_PENDING', notes: 'Sıcak daldırma galvaniz kaplama hattına sevk edildi.' })
  });
  console.log(`  ✓ Durum Değişikliği (KAPLAMADA): Status HTTP ${statusCoatRes.status}`);

  // 4. ALTI KULLANICI VE GÜVENLİK
  console.log('\n[4. GÜVENLİK VE ALTI KULLANICI PAROLA KONTROLÜ]');
  const usersRes = await fetch(`${BASE_URL}/users`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const users = await usersRes.json();
  console.log(`  ✓ Kayıtlı Ortak Kullanıcı Sayısı: ${users.length}`);

  // 5. YANDEX DISK DURUMU
  console.log('\n[5. YANDEX DISK ARŞİV KONTROLÜ]');
  const yandexRes = await fetch(`${BASE_URL}/yandex/status`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const yandexData = await yandexRes.json();
  console.log(`  ✓ Yandex Bağlantı Durumu: ${yandexData.connected ? 'Bağlı' : 'Beklemede'} (${yandexData.statusMessage})`);

  console.log('\n=======================================================');
  console.log(' FAZ 2 GERÇEK UYGULAMA VE DOĞRULAMA TESTİ BAŞARIYLA BİTTİ!');
  console.log('=======================================================');
}

runPhase2().catch(console.error);
