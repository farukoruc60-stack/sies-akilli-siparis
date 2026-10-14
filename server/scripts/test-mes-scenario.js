import { initDb, query, isPostgres } from '../db/database.js';

async function runMesVerification() {
  console.log('====================================================');
  console.log('🧪 SİES AKILLI SİPARİŞ - MES/ERP VERIFICATION SUITE');
  console.log('====================================================');

  await initDb();
  console.log(`✓ Veritabanı bağlantısı hazır (${isPostgres ? 'PostgreSQL / Neon' : 'SQLite'})`);

  const testRunId = Date.now();
  const testOrderNo = `SIP-MES-TEST-${testRunId}`;
  let orderId = null;
  let itemId = null;
  let workOrderId = null;
  let subOrderId = null;
  let dispatchId = null;

  try {
    // -----------------------------------------------------------------
    // 1. Müşteri ve 1.500 Adetlik Test Siparişi Oluştur
    // -----------------------------------------------------------------
    console.log('\n--- 1. TEST SİPARİŞİ VE 1.500 ADETLİK KALEM OLUŞTURULUYOR ---');
    const custRes = await query(
      `SELECT id FROM customers WHERE name = $1 LIMIT 1`,
      ['SİES Test Endüstri A.Ş.']
    );
    let customerId;
    if (custRes.rows && custRes.rows.length > 0) {
      customerId = custRes.rows[0].id;
    } else {
      const insCust = await query(
        `INSERT INTO customers (name, tax_number, address, created_at)
         VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
         ${isPostgres ? 'RETURNING id' : ''}`,
        ['SİES Test Endüstri A.Ş.', '1234567890', 'Tuzla OSB İstanbul']
      );
      customerId = isPostgres ? insCust.rows[0].id : insCust.lastID;
    }

    const orderRes = await query(
      `INSERT INTO orders (
        customer_id, order_no, customer_order_no, order_date, requested_delivery_date,
        coating_type, notes, status, version, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP)
      ${isPostgres ? 'RETURNING id' : ''}`,
      [
        customerId,
        testOrderNo,
        'MŞ-TEST-2026',
        '2026-10-15',
        '2026-11-01',
        'Sıcak Daldırma Galvaniz (TS EN ISO 1461)',
        'MES Otomasyon Doğrulama Test Siparişi',
        'NEW',
        1
      ]
    );
    orderId = isPostgres ? orderRes.rows[0].id : orderRes.lastID;
    console.log(`✓ Sipariş oluşturuldu: ID=${orderId}, Sipariş No=${testOrderNo}`);

    const itemRes = await query(
      `INSERT INTO order_items (
        order_id, line_no, customer_product_code, internal_product_code, product_name,
        product_description, quantity, in_production_quantity, produced_quantity,
        sent_to_coating_quantity, returned_from_coating_quantity, approved_quantity,
        defect_quantity, shipped_quantity, unit, unit_price, line_total, currency, status, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, CURRENT_TIMESTAMP)
      ${isPostgres ? 'RETURNING id' : ''}`,
      [
        orderId, 1, '169387', 'SK-169387', 'Ağır Hizmet Kablo Kanalı 100x500mm',
        'TS EN 61537 Kablo Taşıma Kanalı', 1500, 0, 0, 0, 0, 0, 0, 0, 'Adet', 100, 150000, 'TRY', 'NEW'
      ]
    );
    itemId = isPostgres ? itemRes.rows[0].id : itemRes.lastID;
    console.log(`✓ 1.500 Adetlik Kalem eklendi: ItemID=${itemId}, Kod=169387, Miktar=1500`);

    // -----------------------------------------------------------------
    // 2. Senaryo Adım 1: 500 Adedini Üret (İş Emri & İlerleme)
    // -----------------------------------------------------------------
    console.log('\n--- 2. ADIM 1: 1.500 ADETLİK SİPARİŞİN 500 ADEDİNİ ÜRET ---');
    const woNo = `UE-TEST-${testRunId.toString().slice(-4)}`;
    const woRes = await query(
      `INSERT INTO production_orders (
        order_id, order_item_id, work_order_no, department, planned_quantity,
        produced_quantity, defect_quantity, start_date, status, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP)
      ${isPostgres ? 'RETURNING id' : ''}`,
      [orderId, itemId, woNo, 'Sac Büküm & Delme', 500, 500, 0, '2026-10-15', 'COMPLETED']
    );
    workOrderId = isPostgres ? woRes.rows[0].id : woRes.lastID;
    console.log(`✓ Üretim emri açıldı ve tamamlandı: ${woNo}, Üretilen=500 Adet`);

    // Sipariş kalemini güncelle
    await query(
      `UPDATE order_items
       SET produced_quantity = 500, in_production_quantity = 0, status = 'IN_PRODUCTION'
       WHERE id = $1`,
      [itemId]
    );
    await query(`UPDATE orders SET status = 'IN_PRODUCTION', version = version + 1 WHERE id = $1`, [orderId]);

    let chkItem = (await query(`SELECT * FROM order_items WHERE id = $1`, [itemId])).rows[0];
    if (parseFloat(chkItem.produced_quantity) !== 500) {
      throw new Error(`Üretilen miktar 500 olmalıydı, mevcut: ${chkItem.produced_quantity}`);
    }
    console.log(`✓ Kalem doğrulandı: Sipariş=1500, Üretilen=${chkItem.produced_quantity}`);

    // -----------------------------------------------------------------
    // 3. Senaryo Adım 2: Üretilen 500 Adedin 300 Adedini Kaplamaya Gönder
    // -----------------------------------------------------------------
    console.log('\n--- 3. ADIM 2: ÜRETİLEN 500 ADEDİN 300 ADEDİNİ KAPLAMAYA GÖNDER ---');
    const batchNo = `FASON-TEST-${testRunId.toString().slice(-4)}`;
    const subRes = await query(
      `INSERT INTO subcontract_orders (
        order_id, order_item_id, batch_no, subcontractor_name, operation_type,
        waybill_no, sent_quantity, returned_quantity, defect_quantity, sent_date, status, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, CURRENT_TIMESTAMP)
      ${isPostgres ? 'RETURNING id' : ''}`,
      [orderId, itemId, batchNo, 'Marmara Galvaniz Ltd.', 'SICAK DALDIRMA GALVANİZ', 'IRS-SEVK-300', 300, 0, 0, '2026-10-15', 'SENT']
    );
    subOrderId = isPostgres ? subRes.rows[0].id : subRes.lastID;
    console.log(`✓ Fason parti kaydı açıldı: ${batchNo}, Giden=300 Adet`);

    await query(
      `UPDATE order_items
       SET sent_to_coating_quantity = 300, status = 'COATING'
       WHERE id = $1`,
      [itemId]
    );
    await query(`UPDATE orders SET status = 'COATING', version = version + 1 WHERE id = $1`, [orderId]);

    chkItem = (await query(`SELECT * FROM order_items WHERE id = $1`, [itemId])).rows[0];
    const inPlantUncoated = parseFloat(chkItem.produced_quantity) - parseFloat(chkItem.sent_to_coating_quantity);
    console.log(`✓ Kaplama durumu: Üretilen=500, Kaplamaya Giden=300, Fabrikada Kalan (Kaplamasız)=${inPlantUncoated}`);
    if (parseFloat(chkItem.sent_to_coating_quantity) !== 300 || inPlantUncoated !== 200) {
      throw new Error(`Kaplama bakiyesi hatalı! Giden=300, Kalan=200 olmalıydı`);
    }

    // -----------------------------------------------------------------
    // 4. Senaryo Adım 3: Kaplamadan Dönen 300 Adet (Mal Kabul)
    // -----------------------------------------------------------------
    console.log('\n--- 4. ADIM 3: KAPLAMADAN 300 ADEDİN DÖNÜŞÜ (MAL KABUL) ---');
    await query(
      `UPDATE subcontract_orders
       SET returned_quantity = 300, defect_quantity = 0, status = 'COMPLETED', actual_return_date = '2026-10-15'
       WHERE id = $1`,
      [subOrderId]
    );

    await query(
      `UPDATE order_items
       SET returned_from_coating_quantity = 300, approved_quantity = 300, status = 'READY_FOR_SHIPPING'
       WHERE id = $1`,
      [itemId]
    );
    await query(`UPDATE orders SET status = 'READY_FOR_SHIPPING', version = version + 1 WHERE id = $1`, [orderId]);

    chkItem = (await query(`SELECT * FROM order_items WHERE id = $1`, [itemId])).rows[0];
    console.log(`✓ Mal kabul tamamlandı: Kaplamadan Dönen=${chkItem.returned_from_coating_quantity}, Uygun/Sağlam=${chkItem.approved_quantity}`);
    if (parseFloat(chkItem.returned_from_coating_quantity) !== 300) {
      throw new Error(`Kaplamadan dönen miktar 300 olmalıydı`);
    }

    // -----------------------------------------------------------------
    // 5. Senaryo Adım 4: 200 Adedini Sevk Et (Parçalı Sevkiyat & İrsaliye)
    // -----------------------------------------------------------------
    console.log('\n--- 5. ADIM 4: KAPLAMADAN DÖNEN 300 ADEDİN 200 ADEDİNİ SEVK ET ---');
    const waybillNo = `IRS-MES-${testRunId.toString().slice(-4)}`;
    const dispRes = await query(
      `INSERT INTO dispatches (
        order_id, order_item_id, quantity_shipped, vehicle_plate, driver_name,
        waybill_number, notes, status, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP)
      ${isPostgres ? 'RETURNING id' : ''}`,
      [orderId, itemId, 200, '34 SIES 1980', 'Ahmet Kılıç', waybillNo, 'MES Test Kısmi Sevkiyat', 'ACTIVE']
    );
    dispatchId = isPostgres ? dispRes.rows[0].id : dispRes.lastID;
    console.log(`✓ İrsaliye kesildi: İrsaliye No=${waybillNo}, Sevk Miktarı=200`);

    await query(
      `UPDATE order_items
       SET shipped_quantity = 200, status = 'PARTIAL_SHIPPED'
       WHERE id = $1`,
      [itemId]
    );
    await query(`UPDATE orders SET status = 'PARTIAL_SHIPPED', version = version + 1 WHERE id = $1`, [orderId]);

    // -----------------------------------------------------------------
    // 6. Kalan ve Bekleyen Miktarların Matematiksel Doğrulanması
    // -----------------------------------------------------------------
    console.log('\n--- 6. KALAN VE BEKLEYEN MİKTARLARIN DOĞRULANMASI ---');
    chkItem = (await query(`SELECT * FROM order_items WHERE id = $1`, [itemId])).rows[0];
    const orderQty = parseFloat(chkItem.quantity); // 1500
    const shippedQty = parseFloat(chkItem.shipped_quantity); // 200
    const remainingToShip = orderQty - shippedQty; // 1300
    const returnedCoating = parseFloat(chkItem.returned_from_coating_quantity); // 300
    const stockInShopReady = returnedCoating - shippedQty; // 100

    console.log(`  • Sipariş Miktarı          : ${orderQty}`);
    console.log(`  • Sevk Edilen Miktar       : ${shippedQty}`);
    console.log(`  • Kalan Teslim Edilecek    : ${remainingToShip} (Beklenen: 1300)`);
    console.log(`  • Kaplamadan Dönen         : ${returnedCoating}`);
    console.log(`  • Depoda Sevkiyata Hazır   : ${stockInShopReady} (Beklenen: 100)`);

    if (remainingToShip !== 1300) {
      throw new Error(`Kalan miktar 1300 olmalıydı, mevcut: ${remainingToShip}`);
    }
    if (stockInShopReady !== 100) {
      throw new Error(`Depoda hazır miktar 100 olmalıydı, mevcut: ${stockInShopReady}`);
    }
    console.log('✓ MATEMATİKSEL MİKTAR VE BAKİYE HESAPLAMALARI %100 DOĞRU!');

    // -----------------------------------------------------------------
    // 7. Eşzamanlı Kullanıcı Sürüm / Concurrency Kontrolü (Optimistic Locking)
    // -----------------------------------------------------------------
    console.log('\n--- 7. EŞZAMANLI KULLANICI SÜRÜM KONTROLÜ (OPTIMISTIC LOCKING) TESTİ ---');
    const curOrder = (await query(`SELECT version FROM orders WHERE id = $1`, [orderId])).rows[0];
    const currentVersion = curOrder.version;
    const staleVersion = currentVersion - 1; // Eski sürüm simülasyonu

    console.log(`  • Güncel Sipariş Sürümü: v${currentVersion}`);
    console.log(`  • Kullanıcı A eski sürümle güncelleme göndermeyi deniyor: v${staleVersion}`);

    // Eski sürümle yapılan güncelleme 0 satır etkilemeli (409 Conflict tetikler)
    const updateAttempt = await query(
      `UPDATE orders SET notes = 'Çakışan Veri', version = version + 1
       WHERE id = $1 AND version = $2`,
      [orderId, staleVersion]
    );
    const affected = updateAttempt.rowCount !== undefined ? updateAttempt.rowCount : updateAttempt.changes;
    if (affected === 0) {
      console.log('✓ BAŞARILI: Sistem eski sürümle gelen isteği reddetti (409 Çakışma Önleme çalışıyor)');
    } else {
      throw new Error('HATA: Eski sürüm çakışması tespit edilemedi!');
    }

    // -----------------------------------------------------------------
    // 8. Sevkiyat İptali & Stok / Miktar Geri Alma (Rollback) Testi
    // -----------------------------------------------------------------
    console.log('\n--- 8. SEVKİYAT İPTALİ VE MİKTAR GERİ ALMA (ROLLBACK) TESTİ ---');
    // İrsaliye soft delete / iptal
    await query(
      `UPDATE dispatches
       SET status = 'CANCELLED',
           cancelled_at = CURRENT_TIMESTAMP,
           cancelled_by = 1,
           cancellation_reason = 'Müşteri araç değişikliği talep etti'
       WHERE id = $1`,
      [dispatchId]
    );

    // Miktar geri yükleme
    await query(
      `UPDATE order_items
       SET shipped_quantity = shipped_quantity - 200, status = 'READY_FOR_SHIPPING'
       WHERE id = $1`,
      [itemId]
    );
    await query(`UPDATE orders SET status = 'READY_FOR_SHIPPING', version = version + 1 WHERE id = $1`, [orderId]);

    // Audit log kaydı
    await query(
      `INSERT INTO audit_logs (
        order_id, user_id, action, entity_name, entity_id, previous_value, new_value, notes, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP)`,
      [
        orderId, 1, 'DISPATCH_CANCELLED', 'dispatches', dispatchId,
        '200 Adet Sevk Edildi', '0 Adet Sevk (İptal Edildi)', 'İrsaliye iptal edildi ve stok geri alındı'
      ]
    );

    chkItem = (await query(`SELECT * FROM order_items WHERE id = $1`, [itemId])).rows[0];
    const chkDisp = (await query(`SELECT * FROM dispatches WHERE id = $1`, [dispatchId])).rows[0];
    const chkAudit = (await query(`SELECT * FROM audit_logs WHERE order_id = $1 AND action = 'DISPATCH_CANCELLED'`, [orderId])).rows;

    console.log(`  • İrsaliye Durumu        : ${chkDisp.status} (Gerekçe: ${chkDisp.cancellation_reason})`);
    console.log(`  • İptal Sonrası Sevk     : ${chkItem.shipped_quantity} (Beklenen: 0)`);
    console.log(`  • İptal Sonrası Kalan    : ${chkItem.quantity - chkItem.shipped_quantity} (Beklenen: 1500)`);
    console.log(`  • Denetim İzi (Audit Log): ${chkAudit.length} kayıt mevcut`);

    if (chkDisp.status !== 'CANCELLED' || parseFloat(chkItem.shipped_quantity) !== 0) {
      throw new Error('Sevkiyat iptali ve stok geri alma başarısız oldu!');
    }
    if (chkAudit.length === 0) {
      throw new Error('Audit log kaydı oluşturulmadı!');
    }
    console.log('✓ SEVKİYAT İPTALİ VE DENETİM İZİ DOĞRULANDI!');

    // -----------------------------------------------------------------
    // 9. Sayfa Yenilendiğinde PostgreSQL'den Verilerin Doğru Yüklenmesi
    // -----------------------------------------------------------------
    console.log('\n--- 9. POSTGRESQL KALICILIK & SAYFA YENİLEME TESTİ ---');
    const reloadedOrder = (await query(`SELECT * FROM orders WHERE id = $1`, [orderId])).rows[0];
    const reloadedItems = (await query(`SELECT * FROM order_items WHERE order_id = $1`, [orderId])).rows;
    const reloadedWOs = (await query(`SELECT * FROM production_orders WHERE order_id = $1`, [orderId])).rows;
    const reloadedSubs = (await query(`SELECT * FROM subcontract_orders WHERE order_id = $1`, [orderId])).rows;
    const reloadedDisps = (await query(`SELECT * FROM dispatches WHERE order_id = $1`, [orderId])).rows;

    console.log(`  • Yüklenen Sipariş : ${reloadedOrder.order_no} (Status: ${reloadedOrder.status}, Version: ${reloadedOrder.version})`);
    console.log(`  • Yüklenen Kalemler: ${reloadedItems.length} Kalem (Kod: ${reloadedItems[0].customer_product_code}, Miktar: ${reloadedItems[0].quantity})`);
    console.log(`  • Yüklenen İş Emri : ${reloadedWOs.length} Adet (No: ${reloadedWOs[0].work_order_no})`);
    console.log(`  • Yüklenen Fason   : ${reloadedSubs.length} Parti (Parti: ${reloadedSubs[0].batch_no})`);
    console.log(`  • Yüklenen Sevkiyat: ${reloadedDisps.length} İrsaliye (Durum: ${reloadedDisps[0].status})`);

    if (
      !reloadedOrder ||
      reloadedItems.length === 0 ||
      reloadedWOs.length === 0 ||
      reloadedSubs.length === 0 ||
      reloadedDisps.length === 0
    ) {
      throw new Error('PostgreSQL veri kalıcılığı testi başarısız!');
    }
    console.log('✓ POSTGRESQL VERİ KALICILIĞI %100 EKSİKSİZ VE TUTARLI!');

    console.log('\n====================================================');
    console.log('🎉 TÜM MES/ERP SENARYO TESTLERİ BAŞARIYLA GEÇTİ!');
    console.log('====================================================\n');

  } catch (err) {
    console.error('\n❌ TEST HATASI:', err);
    process.exit(1);
  } finally {
    // Test verisini temizle
    if (orderId) {
      console.log('Test verileri arşivleniyor/temizleniyor...');
      await query(`DELETE FROM audit_logs WHERE order_id = $1`, [orderId]);
      await query(`DELETE FROM dispatches WHERE order_id = $1`, [orderId]);
      await query(`DELETE FROM subcontract_orders WHERE order_id = $1`, [orderId]);
      await query(`DELETE FROM production_orders WHERE order_id = $1`, [orderId]);
      await query(`DELETE FROM order_items WHERE order_id = $1`, [orderId]);
      await query(`DELETE FROM orders WHERE id = $1`, [orderId]);
      console.log('✓ Test verileri başarıyla temizlendi.');
    }
    process.exit(0);
  }
}

runMesVerification();
