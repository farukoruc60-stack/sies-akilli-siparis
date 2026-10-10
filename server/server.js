import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import bcrypt from 'bcryptjs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

import { initDatabase, query } from './db/database.js';
import { seedInitialUsers, generateToken, authenticateToken, requireAdmin } from './auth.js';
import { processUploadedDocument, generateProductionFormPdf, generateShippingLabelsPdf, calculateSHA256 } from './documentProcessor.js';
import { getYandexStatus, uploadToYandexDisk, saveYandexToken } from './yandexClient.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json({ limit: '50mb' }));

// File Upload Config
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `${uniqueSuffix}${ext}`);
  }
});
const upload = multer({ storage });

// Initialize Database & Seed
await initDatabase();
await seedInitialUsers();

// -------------------------------------------------------------
// AUTH ROUTES
// -------------------------------------------------------------
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'E-posta ve şifre zorunludur!' });
    }

    const resDb = await query('SELECT * FROM users WHERE email = ? AND is_active = 1', [email.toLowerCase().trim()]);
    const user = resDb.rows[0];

    if (!user) {
      return res.status(401).json({ error: 'Geçersiz e-posta veya şifre!' });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Geçersiz e-posta veya şifre!' });
    }

    const token = generateToken(user);
    
    // Audit Log
    await query(
      'INSERT INTO audit_logs (user_id, action, entity_name, details) VALUES (?, ?, ?, ?)',
      [user.id, 'USER_LOGIN', 'users', `${user.full_name} sisteme giriş yaptı.`]
    );

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.full_name,
        role: user.role
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/auth/me', authenticateToken, async (req, res) => {
  res.json({ user: req.user });
});

app.get('/api/users', authenticateToken, async (req, res) => {
  const usersRes = await query('SELECT id, email, full_name, role, is_active, created_at FROM users ORDER BY id ASC');
  res.json(usersRes.rows);
});

app.post('/api/users', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { email, password, fullName, role } = req.body;
    const hash = await bcrypt.hash(password, 10);
    const result = await query(
      'INSERT INTO users (email, password_hash, full_name, role) VALUES (?, ?, ?, ?)',
      [email, hash, fullName, role || 'STANDARD']
    );
    res.json({ success: true, id: result.lastID });
  } catch (err) {
    res.status(400).json({ error: 'Kullanıcı eklenemedi veya e-posta zaten mevcut.' });
  }
});

app.put('/api/users/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const userId = req.params.id;
    const { email, fullName, role, password } = req.body;

    if (password && password.trim()) {
      const hash = await bcrypt.hash(password, 10);
      await query(
        'UPDATE users SET email = ?, full_name = ?, role = ?, password_hash = ? WHERE id = ?',
        [email, fullName, role, hash, userId]
      );
    } else {
      await query(
        'UPDATE users SET email = ?, full_name = ?, role = ? WHERE id = ?',
        [email, fullName, role, userId]
      );
    }

    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: 'Kullanıcı güncellenemedi: ' + err.message });
  }
});

app.delete('/api/users/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const userId = req.params.id;
    if (parseInt(userId, 10) === req.user.id) {
      return res.status(400).json({ error: 'Kendi aktif kullanıcı hesabınızı silemezsiniz!' });
    }
    await query('DELETE FROM users WHERE id = ?', [userId]);
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: 'Kullanıcı silinemedi: ' + err.message });
  }
});

// -------------------------------------------------------------
// ORDER MANAGEMENT ROUTES
// -------------------------------------------------------------
app.get('/api/orders', authenticateToken, async (req, res) => {
  try {
    const { search, status, page = 1, limit = 50 } = req.query;
    let sql = `
      SELECT o.*, c.name as customer_name, c.tax_number as customer_tax_number,
             (SELECT COUNT(*) FROM order_items oi WHERE oi.order_id = o.id) as total_items,
             (SELECT COUNT(*) FROM documents d WHERE d.order_id = o.id) as total_docs,
             u.full_name as creator_name
      FROM orders o
      LEFT JOIN customers c ON o.customer_id = c.id
      LEFT JOIN users u ON o.created_by = u.id
      WHERE 1=1
    `;
    const params = [];

    if (status && status !== 'ALL') {
      sql += ' AND o.status = ?';
      params.push(status);
    }

    if (search) {
      sql += ' AND (o.order_no LIKE ? OR c.name LIKE ? OR o.customer_order_no LIKE ?)';
      const term = `%${search}%`;
      params.push(term, term, term);
    }

    sql += ' ORDER BY o.updated_at DESC, o.id DESC';

    const countRes = await query(`SELECT COUNT(*) as cnt FROM (${sql}) as sub`, params);
    const totalCount = parseInt(countRes.rows[0]?.cnt || countRes.rows[0]?.['COUNT(*)'] || 0, 10);

    const offset = (parseInt(page) - 1) * parseInt(limit);
    sql += ` LIMIT ${parseInt(limit)} OFFSET ${offset}`;

    const ordersRes = await query(sql, params);
    res.json({
      orders: ordersRes.rows,
      totalCount,
      page: parseInt(page),
      totalPages: Math.ceil(totalCount / parseInt(limit))
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/orders/:id', authenticateToken, async (req, res) => {
  try {
    const orderId = req.params.id;
    const orderRes = await query(`
      SELECT o.*, c.name as customer_name, c.tax_office, c.tax_number, c.address, c.phone, c.email as customer_email,
             u1.full_name as creator_name, u2.full_name as updater_name
      FROM orders o
      LEFT JOIN customers c ON o.customer_id = c.id
      LEFT JOIN users u1 ON o.created_by = u1.id
      LEFT JOIN users u2 ON o.updated_by = u2.id
      WHERE o.id = ?
    `, [orderId]);

    if (orderRes.rows.length === 0) {
      return res.status(404).json({ error: 'Sipariş bulunamadı!' });
    }

    const itemsRes = await query('SELECT * FROM order_items WHERE order_id = ? ORDER BY line_no ASC, id ASC', [orderId]);
    const itemsRaw = itemsRes.rows;
    const items = itemsRaw.map(it => ({
      ...it,
      lineNo: it.line_no,
      customerProductCode: it.customer_product_code,
      internalProductCode: it.internal_product_code,
      productName: it.product_name,
      productDescription: it.product_description,
      widthMm: it.width_mm,
      heightMm: it.height_mm,
      thicknessMm: it.thickness_mm,
      shippedQuantity: parseFloat(it.shipped_quantity) || 0,
      unitPrice: parseFloat(it.unit_price) || 0,
      lineTotal: parseFloat(it.line_total) || 0,
      confidenceScore: parseFloat(it.confidence_score) || 1.0,
      status: it.status || 'PENDING'
    }));

    const docsRes = await query('SELECT * FROM documents WHERE order_id = ? ORDER BY id DESC', [orderId]);
    const historyRes = await query(`
      SELECT h.*, u.full_name as user_name
      FROM order_status_history h
      LEFT JOIN users u ON h.changed_by = u.id
      WHERE h.order_id = ?
      ORDER BY h.created_at DESC
    `, [orderId]);

    const dispatchesRes = await query(`
      SELECT d.*, oi.customer_product_code, oi.product_name, u.full_name as creator_name
      FROM dispatches d
      LEFT JOIN order_items oi ON d.order_item_id = oi.id
      LEFT JOIN users u ON d.created_by = u.id
      WHERE d.order_id = ?
      ORDER BY d.created_at DESC
    `, [orderId]);

    res.json({
      order: orderRes.rows[0],
      items: items,
      documents: docsRes.rows,
      history: historyRes.rows,
      dispatches: dispatchesRes.rows
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// CREATE ORDER FROM VERIFICATION SCREEN
app.post('/api/orders', authenticateToken, async (req, res) => {
  try {
    const { customerInfo, orderItems, documentId } = req.body;

    // 1. Customer Check or Create
    let customerId;
    let custRes;
    if (customerInfo.taxNumber) {
      custRes = await query('SELECT id FROM customers WHERE tax_number = ?', [customerInfo.taxNumber]);
    }

    if (!custRes || custRes.rows.length === 0) {
      custRes = await query('SELECT id FROM customers WHERE LOWER(name) = ?', [customerInfo.name.toLowerCase().trim()]);
    }

    if (custRes && custRes.rows.length > 0) {
      customerId = custRes.rows[0].id;
    } else {
      const newCust = await query(
        'INSERT INTO customers (name, tax_office, tax_number, address, phone, email) VALUES (?, ?, ?, ?, ?, ?)',
        [customerInfo.name, customerInfo.taxOffice || '', customerInfo.taxNumber || '', customerInfo.address || '', customerInfo.phone || '', customerInfo.email || '']
      );
      customerId = newCust.lastID || newCust.rows?.[0]?.id;
    }

    // 2. Order Create
    const orderNo = customerInfo.orderNo 
      ? `${customerInfo.orderNo}-${Math.floor(100 + Math.random() * 900)}` 
      : `SO-2026-${Math.floor(10000 + Math.random() * 90000)}`;
    const orderDate = customerInfo.orderDate || new Date().toISOString().split('T')[0];

    const newOrderRes = await query(
      `INSERT INTO orders (order_no, customer_id, customer_order_no, order_date, requested_delivery_date, status, created_by, updated_by, version)
       VALUES (?, ?, ?, ?, ?, 'APPROVED', ?, ?, 1)`,
      [orderNo, customerId, customerInfo.orderNo || orderNo, orderDate, customerInfo.deliveryDate || null, req.user.id, req.user.id]
    );

    const orderId = newOrderRes.lastID || newOrderRes.rows?.[0]?.id;

    // 3. Order Items Insert
    if (orderItems && orderItems.length > 0) {
      for (const item of orderItems) {
        const pCode = item.customerProductCode || item.customer_product_code || '';
        const pIntCode = item.internalProductCode || item.internal_product_code || '';
        const pName = item.productName || item.product_name || 'Ürün';
        const pDesc = item.productDescription || item.product_description || '';
        const qty = parseFloat(item.quantity) || 1;
        const unitPrice = parseFloat(item.unitPrice ?? item.unit_price) || 0;
        const lineTotal = parseFloat(item.lineTotal ?? item.line_total) || (qty * unitPrice);

        await query(
          `INSERT INTO order_items (
            order_id, line_no, customer_product_code, internal_product_code, product_name, product_description,
            width_mm, height_mm, length_mm, thickness_mm, material, surface_coating, color,
            quantity, unit, unit_price, currency, line_total, status, confidence_score
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            orderId, item.lineNo || item.line_no || 1, pCode, pIntCode, pName, pDesc,
            item.widthMm || item.width_mm || null, item.heightMm || item.height_mm || null, item.lengthMm || item.length_mm || null, item.thicknessMm || item.thickness_mm || null,
            item.material || '', item.surfaceCoating || item.surface_coating || '', item.color || '',
            qty, item.unit || 'Adet', unitPrice, item.currency || 'TRY', lineTotal, 'APPROVED', item.confidenceScore || 1.0
          ]
        );
      }
    }

    // 4. Link Document if uploaded
    if (documentId) {
      await query('UPDATE documents SET order_id = ? WHERE id = ?', [orderId, documentId]);
    }

    // 5. History Log
    await query(
      'INSERT INTO order_status_history (order_id, previous_status, new_status, changed_by, notes) VALUES (?, ?, ?, ?, ?)',
      [orderId, 'NEW', 'APPROVED', req.user.id, 'Sipariş kontrol ekranından onaylandı ve havuza eklendi.']
    );

    // 6. Audit Log
    await query(
      'INSERT INTO audit_logs (user_id, action, entity_name, entity_id, details) VALUES (?, ?, ?, ?, ?)',
      [req.user.id, 'CREATE_ORDER', 'orders', orderId, `Sipariş ${orderNo} oluşturuldu.`]
    );

    res.json({ success: true, orderId, orderNo });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PARTIAL SHIPPING & ITEM STATUS UPDATE ROUTE
app.post('/api/orders/:id/items/status', authenticateToken, async (req, res) => {
  try {
    const orderId = req.params.id;
    const { itemIds, newStatus, notes } = req.body;

    if (!itemIds || !Array.isArray(itemIds) || itemIds.length === 0) {
      return res.status(400).json({ error: 'Lütfen işlem yapılacak kalemleri seçin!' });
    }

    for (const itemId of itemIds) {
      const prevItemRes = await query('SELECT status FROM order_items WHERE id = ?', [itemId]);
      const prevStatus = prevItemRes.rows[0]?.status || 'PENDING';

      await query(
        'UPDATE order_items SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND order_id = ?',
        [newStatus, itemId, orderId]
      );

      await query(
        'INSERT INTO order_item_status_history (order_item_id, previous_status, new_status, changed_by, notes) VALUES (?, ?, ?, ?, ?)',
        [itemId, prevStatus, newStatus, req.user.id, notes || `Kalem durumu ${newStatus} yapıldı.`]
      );
    }

    // Auto calculate overall order status based on line item statuses
    const allItemsRes = await query('SELECT status FROM order_items WHERE order_id = ?', [orderId]);
    const statuses = allItemsRes.rows.map(r => r.status);
    
    let overallStatus = 'APPROVED';
    if (statuses.every(s => s === 'COMPLETED' || s === 'SHIPPED')) {
      overallStatus = 'COMPLETED';
    } else if (statuses.some(s => s === 'SHIPPING' || s === 'SHIPPED')) {
      overallStatus = 'SHIPPING_PENDING';
    } else if (statuses.some(s => s === 'COATING')) {
      overallStatus = 'COATING_PENDING';
    } else if (statuses.some(s => s === 'IN_PRODUCTION')) {
      overallStatus = 'IN_PRODUCTION';
    }

    await query(
      'UPDATE orders SET status = ?, updated_by = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [overallStatus, req.user.id, orderId]
    );

    res.json({ success: true, updatedCount: itemIds.length, overallStatus });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GENERATE OFFICIAL PRODUCTION WORK ORDER FORM PDF AND SEND ITEMS TO PRODUCTION
app.post('/api/orders/:id/production-form', authenticateToken, async (req, res) => {
  try {
    const orderId = req.params.id;
    const { itemIds, notes } = req.body;

    if (!itemIds || !Array.isArray(itemIds) || itemIds.length === 0) {
      return res.status(400).json({ error: 'Lütfen üretime gönderilecek kalemleri seçin!' });
    }

    // 1. Fetch order details
    const orderRes = await query(`
      SELECT o.*, c.name as customer_name, u1.full_name as creator_name
      FROM orders o
      LEFT JOIN customers c ON o.customer_id = c.id
      LEFT JOIN users u1 ON o.created_by = u1.id
      WHERE o.id = ?
    `, [orderId]);

    if (orderRes.rows.length === 0) {
      return res.status(404).json({ error: 'Sipariş bulunamadı!' });
    }

    const order = orderRes.rows[0];

    // 2. Fetch selected items
    const placeholders = itemIds.map(() => '?').join(',');
    const itemsRes = await query(
      `SELECT * FROM order_items WHERE id IN (${placeholders}) AND order_id = ? ORDER BY line_no ASC, id ASC`,
      [...itemIds, orderId]
    );

    const selectedItems = itemsRes.rows;
    if (selectedItems.length === 0) {
      return res.status(400).json({ error: 'Seçili kalemler bulunamadı!' });
    }

    // 3. Generate Production Form PDF file
    const timestamp = Date.now();
    const pdfFileName = `Uretim_Formu_${order.order_no || orderId}_${timestamp}.pdf`;
    const pdfFilePath = path.join(uploadDir, pdfFileName);
    const originalDocName = `Üretim Formu - Sipariş ${order.order_no || orderId} (${selectedItems.length} Kalem).pdf`;

    await generateProductionFormPdf(order, selectedItems, pdfFilePath, notes || '');

    const fileSize = fs.statSync(pdfFilePath).size;
    const sha256 = calculateSHA256(pdfFilePath);

    // 4. Save document record to DB under 'documents' table linked to order_id
    const docRes = await query(
      `INSERT INTO documents (
        order_id, original_name, file_type, mime_type, file_size, sha256_hash, original_path, pdf_path, uploaded_by, archive_status
      ) VALUES (?, ?, '.pdf', 'application/pdf', ?, ?, ?, ?, ?, 'PENDING')`,
      [orderId, originalDocName, fileSize, sha256, pdfFilePath, pdfFilePath, req.user.id]
    );

    const docId = docRes.lastID || docRes.rows?.[0]?.id;

    // 5. Update selected items status to 'IN_PRODUCTION'
    for (const item of selectedItems) {
      const prevStatus = item.status || 'PENDING';
      await query(
        'UPDATE order_items SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        ['IN_PRODUCTION', item.id]
      );

      await query(
        'INSERT INTO order_item_status_history (order_item_id, previous_status, new_status, changed_by, notes) VALUES (?, ?, ?, ?, ?)',
        [item.id, prevStatus, 'IN_PRODUCTION', req.user.id, `Üretim Formu (Doc #${docId}) oluşturularak üretime gönderildi.`]
      );
    }

    // 6. Update overall order status if needed
    await query(
      "UPDATE orders SET status = 'IN_PRODUCTION', updated_by = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
      [req.user.id, orderId]
    );

    // 7. Order Status History Log
    await query(
      'INSERT INTO order_status_history (order_id, previous_status, new_status, changed_by, notes) VALUES (?, ?, ?, ?, ?)',
      [orderId, order.status, 'IN_PRODUCTION', req.user.id, `${selectedItems.length} kalem için Resmi Üretim İş Emri Formu oluşturuldu ve üretime gönderildi.`]
    );

    // Background Yandex Disk Upload
    uploadToYandexDisk(pdfFilePath, 'UretimFormlari', `${docId}_${pdfFileName}`).then(async (yRes) => {
      if (yRes.success) {
        await query('UPDATE documents SET archive_status = ?, yandex_path = ? WHERE id = ?', ['ARCHIVED', yRes.yandexPath, docId]);
      }
    });

    res.json({
      success: true,
      documentId: docId,
      originalName: originalDocName,
      pdfUrl: `/api/documents/${docId}/pdf`,
      downloadUrl: `/api/documents/${docId}/download`,
      itemCount: selectedItems.length
    });
  } catch (err) {
    console.error('Üretim Formu Oluşturma Hatası:', err);
    res.status(500).json({ error: err.message });
  }
});

// GENERATE SHIPPING LABELS PDF (100x100mm OR 100x50mm) FOR SELECTED ITEMS
app.post('/api/orders/:id/shipping-labels', authenticateToken, async (req, res) => {
  try {
    const orderId = req.params.id;
    const { itemIds, size = '100x100' } = req.body;

    if (!itemIds || !Array.isArray(itemIds) || itemIds.length === 0) {
      return res.status(400).json({ error: 'Lütfen etiketi basılacak kalemleri seçin!' });
    }

    // 1. Fetch order details
    const orderRes = await query(`
      SELECT o.*, c.name as customer_name, u1.full_name as creator_name
      FROM orders o
      LEFT JOIN customers c ON o.customer_id = c.id
      LEFT JOIN users u1 ON o.created_by = u1.id
      WHERE o.id = ?
    `, [orderId]);

    if (orderRes.rows.length === 0) {
      return res.status(404).json({ error: 'Sipariş bulunamadı!' });
    }

    const order = orderRes.rows[0];

    // 2. Fetch selected items
    const placeholders = itemIds.map(() => '?').join(',');
    const itemsRes = await query(
      `SELECT * FROM order_items WHERE id IN (${placeholders}) AND order_id = ? ORDER BY line_no ASC, id ASC`,
      [...itemIds, orderId]
    );

    const selectedItems = itemsRes.rows;
    if (selectedItems.length === 0) {
      return res.status(400).json({ error: 'Seçili kalemler bulunamadı!' });
    }

    // 3. Generate Shipping Labels PDF
    const timestamp = Date.now();
    const labelSizeStr = size === '100x50' ? '100x50mm' : '100x100mm';
    const pdfFileName = `Sevkiyat_Etiketi_${order.order_no || orderId}_${size}_${timestamp}.pdf`;
    const pdfFilePath = path.join(uploadDir, pdfFileName);
    const originalDocName = `Sevkiyat Etiketleri (${labelSizeStr}) - Sipariş ${order.order_no || orderId} (${selectedItems.length} Kalem).pdf`;

    await generateShippingLabelsPdf(order, selectedItems, pdfFilePath, size);

    const fileSize = fs.statSync(pdfFilePath).size;
    const sha256 = calculateSHA256(pdfFilePath);

    // 4. Save document record to DB under 'documents' table linked to order_id
    const docRes = await query(
      `INSERT INTO documents (
        order_id, original_name, file_type, mime_type, file_size, sha256_hash, original_path, pdf_path, uploaded_by, archive_status
      ) VALUES (?, ?, '.pdf', 'application/pdf', ?, ?, ?, ?, ?, 'PENDING')`,
      [orderId, originalDocName, fileSize, sha256, pdfFilePath, pdfFilePath, req.user.id]
    );

    const docId = docRes.lastID || docRes.rows?.[0]?.id;

    // 5. Order Status History Log
    await query(
      'INSERT INTO order_status_history (order_id, previous_status, new_status, changed_by, notes) VALUES (?, ?, ?, ?, ?)',
      [orderId, order.status, order.status, req.user.id, `${selectedItems.length} kalem için ${labelSizeStr} boyutunda Sevkiyat Etiketi basıldı.`]
    );

    // Background Yandex Disk Upload
    uploadToYandexDisk(pdfFilePath, 'SevkiyatEtiketleri', `${docId}_${pdfFileName}`).then(async (yRes) => {
      if (yRes.success) {
        await query('UPDATE documents SET archive_status = ?, yandex_path = ? WHERE id = ?', ['ARCHIVED', yRes.yandexPath, docId]);
      }
    });

    res.json({
      success: true,
      documentId: docId,
      originalName: originalDocName,
      pdfUrl: `/api/documents/${docId}/pdf`,
      downloadUrl: `/api/documents/${docId}/download`,
      itemCount: selectedItems.length,
      size: labelSizeStr
    });
  } catch (err) {
    console.error('Sevkiyat Etiketi Oluşturma Hatası:', err);
    res.status(500).json({ error: err.message });
  }
});

// ADVANCED DISPATCH & PARTIAL SHIPPING ROUTE WITH DRIVER, PLATE, WAYBILL & QUANTITIES
app.post('/api/orders/:id/dispatch', authenticateToken, async (req, res) => {
  try {
    const orderId = req.params.id;
    const { driverName, vehiclePlate, waybillNumber, notes, dispatches } = req.body;

    if (!dispatches || !Array.isArray(dispatches) || dispatches.length === 0) {
      return res.status(400).json({ error: 'Lütfen sevk edilecek en az bir kalem ve miktar belirtin!' });
    }

    if (!driverName || !vehiclePlate || !waybillNumber) {
      return res.status(400).json({ error: 'Şoför Adı, Araç Plakası ve İrsaliye Numarası girilmesi zorunludur!' });
    }

    for (const itemDispatch of dispatches) {
      const { itemId, dispatchQuantity } = itemDispatch;
      const dispatchQty = parseFloat(dispatchQuantity);
      if (isNaN(dispatchQty) || dispatchQty <= 0) continue;

      const itemRes = await query('SELECT * FROM order_items WHERE id = ? AND order_id = ?', [itemId, orderId]);
      if (itemRes.rows.length === 0) continue;

      const item = itemRes.rows[0];
      const currentShipped = parseFloat(item.shipped_quantity) || 0;
      const totalQty = parseFloat(item.quantity) || 0;
      const newShipped = currentShipped + dispatchQty;

      // Determine new item status
      let newStatus = item.status;
      if (newShipped >= totalQty) {
        newStatus = 'COMPLETED';
      } else if (newShipped > 0) {
        newStatus = 'PARTIALLY_SHIPPED';
      }

      // 1. Update order item shipped_quantity & status
      await query(
        'UPDATE order_items SET shipped_quantity = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND order_id = ?',
        [newShipped, newStatus, itemId, orderId]
      );

      // 2. Record dispatch entry
      await query(
        `INSERT INTO dispatches (
          order_id, order_item_id, quantity_shipped, driver_name, vehicle_plate, waybill_number, notes, created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [orderId, itemId, dispatchQty, driverName.trim(), vehiclePlate.trim().toUpperCase(), waybillNumber.trim(), notes || '', req.user.id]
      );

      // 3. Record item status history
      const historyNote = `Sevkiyat Yapıldı: ${dispatchQty} ${item.unit || 'Adet'} sevk edildi (Top. Sevk: ${newShipped}/${totalQty}). Şoför: ${driverName}, Plaka: ${vehiclePlate}, İrsaliye: ${waybillNumber}`;
      await query(
        'INSERT INTO order_item_status_history (order_item_id, previous_status, new_status, changed_by, notes) VALUES (?, ?, ?, ?, ?)',
        [itemId, item.status, newStatus, req.user.id, historyNote]
      );
    }

    // 4. Auto-update overall order status
    const allItemsRes = await query('SELECT quantity, shipped_quantity, status FROM order_items WHERE order_id = ?', [orderId]);
    const itemsList = allItemsRes.rows;
    let overallStatus = 'APPROVED';

    const allCompleted = itemsList.every(i => (parseFloat(i.shipped_quantity) || 0) >= (parseFloat(i.quantity) || 0));
    const anyShipped = itemsList.some(i => (parseFloat(i.shipped_quantity) || 0) > 0);

    if (allCompleted) {
      overallStatus = 'COMPLETED';
    } else if (anyShipped) {
      overallStatus = 'SHIPPING_PENDING';
    }

    await query(
      'UPDATE orders SET status = ?, updated_by = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [overallStatus, req.user.id, orderId]
    );

    // 5. Audit & Order status history log
    await query(
      'INSERT INTO order_status_history (order_id, previous_status, new_status, changed_by, notes) VALUES (?, ?, ?, ?, ?)',
      [orderId, overallStatus, overallStatus, req.user.id, `İrsaliye No #${waybillNumber} ile parçalı sevkiyat yapıldı. (Şoför: ${driverName}, Plaka: ${vehiclePlate})`]
    );

    res.json({ success: true, updatedCount: dispatches.length, overallStatus });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// UPDATE ORDER WITH OPTIMISTIC LOCKING VERSION CHECK
app.put('/api/orders/:id', authenticateToken, async (req, res) => {
  try {
    const orderId = req.params.id;
    const { version, customerOrderNo, requestedDeliveryDate, items } = req.body;

    if (version === undefined || version === null) {
      return res.status(400).json({ error: 'Versiyon bilgisi (version) zorunludur!' });
    }

    // Optimistic locking query: WHERE id = ? AND version = ?
    const updateRes = await query(
      `UPDATE orders 
       SET customer_order_no = ?, requested_delivery_date = ?, version = version + 1, updated_by = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ? AND version = ?`,
      [customerOrderNo, requestedDeliveryDate, req.user.id, orderId, version]
    );

    if (updateRes.rowCount === 0) {
      return res.status(409).json({
        error: 'ÇAKIŞMA TESPİT EDİLDİ (409 Conflict): Bu sipariş siz düzenlerken başka bir kullanıcı tarafından güncellendi. Lütfen sayfayı yenileyip tekrar deneyin.'
      });
    }

    // Replace items if provided
    if (items && Array.isArray(items)) {
      await query('DELETE FROM order_items WHERE order_id = ?', [orderId]);
      for (const item of items) {
        await query(
          `INSERT INTO order_items (
            order_id, line_no, customer_product_code, internal_product_code, product_name, product_description,
            width_mm, height_mm, length_mm, thickness_mm, material, surface_coating, color,
            quantity, unit, unit_price, currency, line_total, status
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            orderId, item.line_no || item.lineNo, item.customer_product_code || '', item.internal_product_code || '', item.product_name || 'Ürün', item.product_description || '',
            item.width_mm || null, item.height_mm || null, item.length_mm || null, item.thickness_mm || null, item.material || '', item.surface_coating || '', item.color || '',
            item.quantity || 1, item.unit || 'Adet', item.unit_price || 0, item.currency || 'TRY', item.line_total || 0, item.status || 'APPROVED'
          ]
        );
      }
    }

    // Audit log
    await query(
      'INSERT INTO audit_logs (user_id, action, entity_name, entity_id, details) VALUES (?, ?, ?, ?, ?)',
      [req.user.id, 'UPDATE_ORDER', 'orders', orderId, `Sipariş v${version} -> v${version + 1} olarak güncellendi.`]
    );

    res.json({ success: true, newVersion: version + 1 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// STATUS UPDATE ROUTE
app.post('/api/orders/:id/status', authenticateToken, async (req, res) => {
  try {
    const orderId = req.params.id;
    const { newStatus, notes } = req.body;

    const currentOrderRes = await query('SELECT status FROM orders WHERE id = ?', [orderId]);
    if (currentOrderRes.rows.length === 0) {
      return res.status(404).json({ error: 'Sipariş bulunamadı!' });
    }
    const prevStatus = currentOrderRes.rows[0].status;

    await query(
      'UPDATE orders SET status = ?, updated_by = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [newStatus, req.user.id, orderId]
    );

    await query(
      'INSERT INTO order_status_history (order_id, previous_status, new_status, changed_by, notes) VALUES (?, ?, ?, ?, ?)',
      [orderId, prevStatus, newStatus, req.user.id, notes || `Durum ${prevStatus} -> ${newStatus} olarak değiştirildi.`]
    );

    res.json({ success: true, newStatus });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// DOCUMENT UPLOAD & EXTRACTION ROUTES
// -------------------------------------------------------------
app.post('/api/documents/upload', authenticateToken, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Lütfen bir dosya seçin!' });
    }

    const filePath = req.file.path;
    const originalName = req.file.originalname;
    const mimeType = req.file.mimetype;
    const fileSize = req.file.size;
    const ext = path.extname(originalName).toLowerCase();

    // Run Document Processor
    const processed = await processUploadedDocument(filePath, originalName, mimeType);

    // Save document record to DB
    const docRes = await query(
      `INSERT INTO documents (
        original_name, file_type, mime_type, file_size, sha256_hash, original_path, pdf_path, uploaded_by, archive_status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'PENDING')`,
      [originalName, ext, mimeType, fileSize, processed.sha256, filePath, processed.pdfPath, req.user.id]
    );

    const docId = docRes.lastID || docRes.rows?.[0]?.id;

    // Trigger Yandex Disk background upload attempt
    uploadToYandexDisk(filePath, 'OrijinalBelgeler', `${docId}_${originalName}`).then(async (yRes) => {
      if (yRes.success) {
        await query('UPDATE documents SET archive_status = ?, yandex_path = ? WHERE id = ?', ['ARCHIVED', yRes.yandexPath, docId]);
      }
    });

    res.json({
      documentId: docId,
      sha256: processed.sha256,
      originalName,
      pdfUrl: `/api/documents/${docId}/pdf`,
      customerInfo: processed.customerInfo,
      orderItems: processed.orderItems
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/documents/:id/pdf', authenticateToken, async (req, res) => {
  try {
    const docRes = await query('SELECT pdf_path, original_path FROM documents WHERE id = ?', [req.params.id]);
    if (docRes.rows.length === 0) return res.status(404).send('Belge bulunamadı');

    const targetPath = docRes.rows[0].pdf_path || docRes.rows[0].original_path;
    if (fs.existsSync(targetPath)) {
      res.contentType('application/pdf');
      res.sendFile(targetPath);
    } else {
      res.status(404).send('Fiziksel PDF dosyası bulunamadı');
    }
  } catch (err) {
    res.status(500).send(err.message);
  }
});

app.get('/api/documents/:id/download', authenticateToken, async (req, res) => {
  try {
    const docRes = await query('SELECT original_path, original_name FROM documents WHERE id = ?', [req.params.id]);
    if (docRes.rows.length === 0) return res.status(404).send('Belge bulunamadı');

    const file = docRes.rows[0];
    if (fs.existsSync(file.original_path)) {
      res.download(file.original_path, file.original_name);
    } else {
      res.status(404).send('Orijinal dosya sunucuda bulunamadı');
    }
  } catch (err) {
    res.status(500).send(err.message);
  }
});

// -------------------------------------------------------------
// DASHBOARD & YANDEX ROUTES
// -------------------------------------------------------------
app.get('/api/dashboard', authenticateToken, async (req, res) => {
  try {
    const totalOrdersRes = await query('SELECT COUNT(*) as count FROM orders');
    const todayOrdersRes = await query("SELECT COUNT(*) as count FROM orders WHERE DATE(created_at) = CURRENT_DATE");
    const reviewPendingRes = await query("SELECT COUNT(*) as count FROM orders WHERE status = 'REVIEW_PENDING'");
    const inProductionRes = await query("SELECT COUNT(*) as count FROM orders WHERE status = 'IN_PRODUCTION'");
    const coatingPendingRes = await query("SELECT COUNT(*) as count FROM orders WHERE status = 'COATING_PENDING'");
    const shippingPendingRes = await query("SELECT COUNT(*) as count FROM orders WHERE status = 'SHIPPING_PENDING'");
    const completedRes = await query("SELECT COUNT(*) as count FROM orders WHERE status = 'COMPLETED'");
    const pendingArchiveRes = await query("SELECT COUNT(*) as count FROM documents WHERE archive_status = 'PENDING'");

    const extractCount = (r) => parseInt(r.rows[0]?.count || r.rows[0]?.['COUNT(*)'] || 0, 10);

    res.json({
      totalOrders: extractCount(totalOrdersRes),
      todayOrders: extractCount(todayOrdersRes),
      reviewPending: extractCount(reviewPendingRes),
      inProduction: extractCount(inProductionRes),
      coatingPending: extractCount(coatingPendingRes),
      shippingPending: extractCount(shippingPendingRes),
      completed: extractCount(completedRes),
      pendingArchive: extractCount(pendingArchiveRes)
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/yandex/status', authenticateToken, async (req, res) => {
  const status = await getYandexStatus();
  res.json(status);
});

app.post('/api/yandex/token', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { token } = req.body;
    if (!token || !token.trim()) {
      return res.status(400).json({ error: 'Lütfen geçerli bir Yandex Disk OAuth2 Token girin!' });
    }

    saveYandexToken(token);
    const status = await getYandexStatus();
    res.json({ success: true, status });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// CUSTOMERS API ROUTES
// -------------------------------------------------------------
app.get('/api/customers', authenticateToken, async (req, res) => {
  try {
    const custsRes = await query(`
      SELECT c.*, 
             COUNT(o.id) as total_orders,
             MAX(o.created_at) as last_order_date
      FROM customers c
      LEFT JOIN orders o ON o.customer_id = c.id
      GROUP BY c.id
      ORDER BY c.name ASC
    `);
    res.json(custsRes.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/customers', authenticateToken, async (req, res) => {
  try {
    const { name, taxOffice, taxNumber, address, phone, email } = req.body;
    if (!name) return res.status(400).json({ error: 'Müşteri unvanı zorunludur!' });

    const newCust = await query(
      'INSERT INTO customers (name, tax_office, tax_number, address, phone, email) VALUES (?, ?, ?, ?, ?, ?)',
      [name.trim(), taxOffice || '', taxNumber || '', address || '', phone || '', email || '']
    );

    res.json({ success: true, id: newCust.lastID || newCust.rows?.[0]?.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// PRODUCTS & ORDER ITEMS API ROUTES
// -------------------------------------------------------------
app.get('/api/products', authenticateToken, async (req, res) => {
  try {
    const itemsRes = await query(`
      SELECT oi.*, o.order_no, o.status as order_status, c.name as customer_name
      FROM order_items oi
      JOIN orders o ON oi.order_id = o.id
      LEFT JOIN customers c ON o.customer_id = c.id
      ORDER BY oi.id DESC
      LIMIT 200
    `);
    res.json(itemsRes.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// PRODUCTION API ROUTES
// -------------------------------------------------------------
app.get('/api/production', authenticateToken, async (req, res) => {
  try {
    const itemsRes = await query(`
      SELECT oi.*, o.order_no, o.status as order_status, c.name as customer_name
      FROM order_items oi
      JOIN orders o ON oi.order_id = o.id
      LEFT JOIN customers c ON o.customer_id = c.id
      ORDER BY oi.id DESC
    `);
    res.json(itemsRes.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// ALL DISPATCHES API ROUTE
// -------------------------------------------------------------
app.get('/api/dispatches/all', authenticateToken, async (req, res) => {
  try {
    const dispatchesRes = await query(`
      SELECT d.*, oi.customer_product_code, oi.product_name, o.order_no, c.name as customer_name, u.full_name as creator_name
      FROM dispatches d
      JOIN orders o ON d.order_id = o.id
      LEFT JOIN customers c ON o.customer_id = c.id
      LEFT JOIN order_items oi ON d.order_item_id = oi.id
      LEFT JOIN users u ON d.created_by = u.id
      ORDER BY d.created_at DESC
    `);
    res.json(dispatchesRes.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// AUDIT LOGS & SETTINGS ROUTES
// -------------------------------------------------------------
app.get('/api/audit-logs', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const logsRes = await query(`
      SELECT a.*, u.full_name as user_name
      FROM audit_logs a
      LEFT JOIN users u ON a.user_id = u.id
      ORDER BY a.created_at DESC
      LIMIT 100
    `);
    res.json(logsRes.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Serve Frontend Production Build (Support process.cwd() and __dirname)
const distPath = fs.existsSync(path.join(process.cwd(), 'dist'))
  ? path.join(process.cwd(), 'dist')
  : path.join(__dirname, '../dist');

console.log(`=======================================================`);
console.log(`[Frontend Static] Derleme klasörü: ${distPath}`);
console.log(`[Frontend Static] Klasör mevcut mu: ${fs.existsSync(distPath)}`);
console.log(`=======================================================`);

if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(distPath, 'index.html'));
  });
} else {
  console.error(`[Frontend Static HATA] Derlenmiş dist klasörü bulunamadı: ${distPath}`);
}

// Start Server
app.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(` SİES AKILLI SİPARİŞ TAKİP SUNUCUSU AKTİF: PORT ${PORT}`);
  console.log(` API Endpoint: http://localhost:${PORT}/api/orders`);
  console.log(`=======================================================`);
});

