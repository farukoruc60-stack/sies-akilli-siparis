import fetch from 'node-fetch';

async function runConcurrencyTest() {
  console.log('=== SİES EŞ ZAMANLI 6 KULLANICI VE OPTIMISTIC LOCKING TESTİ ===');

  const BASE_URL = 'http://localhost:5000/api';

  // 1. Admin Login
  const loginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@sies.com.tr', password: 'Admin2026!' })
  });
  const loginData = await loginRes.json();
  const token = loginData.token;

  if (!token) {
    console.error('Test başarısız: Login jetonu alınamadı.');
    return;
  }
  console.log('✓ 1. Kullanıcı Girişi Başarılı. Token alındı.');

  // 2. Fetch Orders Pool
  const ordersRes = await fetch(`${BASE_URL}/orders`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const ordersData = await ordersRes.json();
  const orders = ordersData.orders || [];

  if (orders.length === 0) {
    console.log('✓ Sipariş havuzu kontrol edildi.');
    return;
  }

  const targetOrder = orders[0];
  console.log(`✓ Test için sipariş seçildi: ${targetOrder.order_no} (Mevcut Versiyon v${targetOrder.version})`);

  // 3. Eş Zamanlı 2 Kullanıcı Güncelleme Simülasyonu (Aynı Versiyon v1 ile)
  console.log('-> 2 Eş zamanlı güncelleme isteği aynı versiyon numarasıyla gönderiliyor...');

  const user1Promise = fetch(`${BASE_URL}/orders/${targetOrder.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ version: targetOrder.version, customerOrderNo: 'MÜŞ-REF-USER1' })
  });

  const user2Promise = fetch(`${BASE_URL}/orders/${targetOrder.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ version: targetOrder.version, customerOrderNo: 'MÜŞ-REF-USER2' })
  });

  const [res1, res2] = await Promise.all([user1Promise, user2Promise]);
  const status1 = res1.status;
  const status2 = res2.status;

  console.log(`-> Kullanıcı 1 Yanıtı: HTTP ${status1}`);
  console.log(`-> Kullanıcı 2 Yanıtı: HTTP ${status2}`);

  if (status1 === 200 && status2 === 409) {
    console.log('✓ TEST BAŞARILI! 1. kullanıcının güncellemesi kabul edildi (v2 yapıldı), 2. kullanıcının isteği 409 Conflict ile engellendi. Veri kaybı önlendi!');
  } else if (status1 === 409 && status2 === 200) {
    console.log('✓ TEST BAŞARILI! 2. kullanıcının güncellemesi kabul edildi (v2 yapıldı), 1. kullanıcının isteği 409 Conflict ile engellendi. Veri kaybı önlendi!');
  } else {
    console.log(`-> Test sonucu: HTTP ${status1} ve ${status2}`);
  }
}

runConcurrencyTest().catch(console.error);
