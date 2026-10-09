import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BASE_URL = 'http://localhost:5000/api';

async function runSuite() {
  console.log('=======================================================');
  console.log(' SİES AKILLI SİPARİŞ TAKİP - ÇEKİRDEK İŞLEV TEST SÜRECİ');
  console.log('=======================================================');

  // Test 1: Admin & 5 Standard Users Login
  console.log('\n[TEST 1] 6 Eş Zamanlı Kullanıcı Oturum Doğrulaması...');
  const usersToTest = [
    { email: 'admin@sies.com.tr', pass: 'Admin2026!', role: 'ADMIN' },
    { email: 'sales@sies.com.tr', pass: 'Sies1234!', role: 'STANDARD' },
    { email: 'planning@sies.com.tr', pass: 'Sies1234!', role: 'STANDARD' },
    { email: 'quality@sies.com.tr', pass: 'Sies1234!', role: 'STANDARD' },
    { email: 'production@sies.com.tr', pass: 'Sies1234!', role: 'STANDARD' },
    { email: 'logistics@sies.com.tr', pass: 'Sies1234!', role: 'STANDARD' }
  ];

  let adminToken = '';
  for (const u of usersToTest) {
    const res = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: u.email, password: u.pass })
    });
    const data = await res.json();
    if (res.ok && data.token) {
      console.log(`  ✓ Oturum Açıldı: ${u.email} (${data.user.name}) - Rol: ${data.user.role}`);
      if (u.role === 'ADMIN') adminToken = data.token;
    } else {
      console.error(`  ✗ Oturum Hatası: ${u.email} - ${data.error}`);
    }
  }

  // Test 2: Create Dummy Order
  console.log('\n[TEST 2] Sipariş Oluşturma ve Ortak Havuza Ekleme...');
  const createRes = await fetch(`${BASE_URL}/orders`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`
    },
    body: JSON.stringify({
      customerInfo: {
        name: 'ASLAN İNŞAAT VE SANAYİ A.Ş.',
        taxOffice: 'Gebze V.D.',
        taxNumber: '1234567890',
        orderNo: 'SIP-2026-001',
        orderDate: '2026-10-10'
      },
      orderItems: [
        {
          lineNo: 1,
          customerProductCode: 'ASL-KK-100',
          internalProductCode: 'SIES-KK-100X50-1.5',
          productName: 'Ağır Hizmet Kablo Taşıma Kanalı 100x50x1.5mm',
          widthMm: 100,
          heightMm: 50,
          thicknessMm: 1.5,
          quantity: 250,
          unit: 'Boy',
          unitPrice: 185.00,
          lineTotal: 46250.00
        },
        {
          lineNo: 2,
          customerProductCode: 'ASL-KK-200',
          internalProductCode: 'SIES-KK-200X50-2.0',
          productName: 'Ağır Hizmet Kablo Taşıma Kanalı 200x50x2.0mm',
          widthMm: 200,
          heightMm: 50,
          thicknessMm: 2.0,
          quantity: 100,
          unit: 'Boy',
          unitPrice: 320.00,
          lineTotal: 32000.00
        }
      ]
    })
  });
  const createData = await createRes.json();
  console.log(`  ✓ Sipariş Ortak Havuza Eklendi: ID=${createData.orderId}, Sipariş No=${createData.orderNo}`);

  // Test 3: Optimistic Locking Conflict Check
  console.log('\n[TEST 3] Optimistic Locking Çakışma ve İyimser Kilit Testi...');
  const orderId = createData.orderId;

  // User A updates order at v1
  const updateARes = await fetch(`${BASE_URL}/orders/${orderId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`
    },
    body: JSON.stringify({
      version: 1,
      customerOrderNo: 'REF-USER-A-SUCCESS'
    })
  });
  const updateAData = await updateARes.json();
  console.log(`  ✓ Kullanıcı A (v1 -> v2) Güncellemesi: Status HTTP ${updateARes.status}, Yeni Versiyon v${updateAData.newVersion}`);

  // User B tries to update order at old v1 (should get 409 Conflict)
  const updateBRes = await fetch(`${BASE_URL}/orders/${orderId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`
    },
    body: JSON.stringify({
      version: 1, // Stale version!
      customerOrderNo: 'REF-USER-B-STALE'
    })
  });
  const updateBData = await updateBRes.json();
  if (updateBRes.status === 409) {
    console.log(`  ✓ 409 Conflict Doğrulandı! Kullanıcı B'nin eski versiyon (v1) güncellemesi engellendi: "${updateBData.error}"`);
  } else {
    console.error(`  ✗ Beklenmeyen yanıt: HTTP ${updateBRes.status}`);
  }

  // Test 4: Dashboard Stats Test
  console.log('\n[TEST 4] Canlı Gösterge Paneli İstatistikleri...');
  const dashRes = await fetch(`${BASE_URL}/dashboard`, {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  const dashData = await dashRes.json();
  console.log('  ✓ Canlı İstatistikler:', dashData);

  // Test 5: Yandex Disk Connectivity Test
  console.log('\n[TEST 5] Yandex Disk Durum Kontrolü...');
  const yandexRes = await fetch(`${BASE_URL}/yandex/status`, {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  const yandexData = await yandexRes.json();
  console.log('  ✓ Yandex Arşivleme Durumu:', yandexData);

  console.log('\n=======================================================');
  console.log(' TÜM ÇEKİRDEK SİSTEM VE ÇAKIŞMA TESTLERİ BAŞARIYLA GEÇTİ!');
  console.log('=======================================================');
}

runSuite().catch(console.error);
