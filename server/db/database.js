import sqlite3 from 'sqlite3';
import pg from 'pg';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const USE_POSTGRES = process.env.USE_POSTGRES === 'true';
const DATABASE_URL = process.env.DATABASE_URL;

let pgPool = null;
let sqliteDb = null;

export async function initDatabase() {
  if (USE_POSTGRES && DATABASE_URL) {
    console.log('PostgreSQL veritabanı bağlantısı kuruluyor...');
    pgPool = new pg.Pool({
      connectionString: DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });
    
    const client = await pgPool.connect();
    console.log('PostgreSQL veritabanı bağlantısı başarılı!');

    // Ensure shipped_quantity column and dispatches table exist in PostgreSQL
    await client.query(`
      ALTER TABLE order_items ADD COLUMN IF NOT EXISTS shipped_quantity NUMERIC(12, 2) DEFAULT 0;
      CREATE TABLE IF NOT EXISTS dispatches (
          id SERIAL PRIMARY KEY,
          order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
          order_item_id INTEGER REFERENCES order_items(id) ON DELETE CASCADE,
          quantity_shipped NUMERIC(12, 2) NOT NULL,
          driver_name VARCHAR(255),
          vehicle_plate VARCHAR(50),
          waybill_number VARCHAR(100),
          notes TEXT,
          created_by INTEGER REFERENCES users(id),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✓ PostgreSQL sevkiyat & parçalı sevk tabloları güncellendi.');

    client.release();
    return 'PG';
  } else {
    console.log('Yerel SQLite veritabanı sürücüsü başlatılıyor...');
    const dbDir = path.join(__dirname, '../../data');
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }
    const dbPath = path.join(dbDir, 'sies_order_db.sqlite');

    return new Promise((resolve, reject) => {
      sqliteDb = new sqlite3.Database(dbPath, async (err) => {
        if (err) {
          console.error('SQLite Veritabanı Hatası:', err);
          return reject(err);
        }
        console.log(`SQLite veritabanı bağlandı: ${dbPath}`);
        await runSqliteMigrations();
        resolve('SQLITE');
      });
    });
  }
}

async function runSqliteMigrations() {
  const tables = [
    `CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      full_name TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'STANDARD',
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS customers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      tax_office TEXT,
      tax_number TEXT UNIQUE,
      address TEXT,
      phone TEXT,
      email TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_no TEXT UNIQUE NOT NULL,
      customer_id INTEGER,
      customer_order_no TEXT,
      order_date TEXT,
      requested_delivery_date TEXT,
      status TEXT NOT NULL DEFAULT 'NEW',
      created_by INTEGER,
      updated_by INTEGER,
      version INTEGER NOT NULL DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(customer_id) REFERENCES customers(id),
      FOREIGN KEY(created_by) REFERENCES users(id),
      FOREIGN KEY(updated_by) REFERENCES users(id)
    )`,
    `CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL,
      line_no INTEGER NOT NULL,
      customer_product_code TEXT,
      internal_product_code TEXT,
      product_name TEXT NOT NULL,
      product_description TEXT,
      width_mm REAL,
      height_mm REAL,
      length_mm REAL,
      thickness_mm REAL,
      material TEXT,
      surface_coating TEXT,
      color TEXT,
      quantity REAL NOT NULL,
      unit TEXT DEFAULT 'Adet',
      unit_price REAL,
      currency TEXT DEFAULT 'TRY',
      line_total REAL,
      status TEXT DEFAULT 'PENDING',
      version INTEGER NOT NULL DEFAULT 1,
      source_page INTEGER,
      confidence_score REAL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(order_id) REFERENCES orders(id) ON DELETE CASCADE
    )`,
    `CREATE TABLE IF NOT EXISTS documents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER,
      original_name TEXT NOT NULL,
      file_type TEXT NOT NULL,
      mime_type TEXT NOT NULL,
      file_size INTEGER NOT NULL,
      sha256_hash TEXT NOT NULL,
      original_path TEXT NOT NULL,
      pdf_path TEXT,
      uploaded_by INTEGER,
      archive_status TEXT DEFAULT 'PENDING',
      yandex_path TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(order_id) REFERENCES orders(id) ON DELETE SET NULL,
      FOREIGN KEY(uploaded_by) REFERENCES users(id)
    )`,
    `CREATE TABLE IF NOT EXISTS document_versions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      document_id INTEGER NOT NULL,
      version_number INTEGER NOT NULL,
      file_path TEXT NOT NULL,
      sha256_hash TEXT NOT NULL,
      uploaded_by INTEGER,
      change_notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(document_id) REFERENCES documents(id) ON DELETE CASCADE,
      FOREIGN KEY(uploaded_by) REFERENCES users(id)
    )`,
    `CREATE TABLE IF NOT EXISTS document_processing_jobs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      document_id INTEGER NOT NULL,
      job_type TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'PENDING',
      retry_count INTEGER DEFAULT 0,
      error_log TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(document_id) REFERENCES documents(id) ON DELETE CASCADE
    )`,
    `CREATE TABLE IF NOT EXISTS order_status_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL,
      previous_status TEXT,
      new_status TEXT NOT NULL,
      changed_by INTEGER,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(order_id) REFERENCES orders(id) ON DELETE CASCADE,
      FOREIGN KEY(changed_by) REFERENCES users(id)
    )`,
    `CREATE TABLE IF NOT EXISTS order_item_status_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_item_id INTEGER NOT NULL,
      previous_status TEXT,
      new_status TEXT NOT NULL,
      changed_by INTEGER,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(order_item_id) REFERENCES order_items(id) ON DELETE CASCADE,
      FOREIGN KEY(changed_by) REFERENCES users(id)
    )`,
    `CREATE TABLE IF NOT EXISTS dispatches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL,
      order_item_id INTEGER NOT NULL,
      quantity_shipped REAL NOT NULL,
      driver_name TEXT,
      vehicle_plate TEXT,
      waybill_number TEXT,
      notes TEXT,
      created_by INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(order_id) REFERENCES orders(id) ON DELETE CASCADE,
      FOREIGN KEY(order_item_id) REFERENCES order_items(id) ON DELETE CASCADE,
      FOREIGN KEY(created_by) REFERENCES users(id)
    )`,
    `CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      action TEXT NOT NULL,
      entity_name TEXT,
      entity_id INTEGER,
      details TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id)
    )`,
    `CREATE TABLE IF NOT EXISTS system_settings (
      key_name TEXT PRIMARY KEY,
      value_text TEXT,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`
  ];

  for (const sql of tables) {
    await new Promise((res, rej) => {
      sqliteDb.run(sql, (err) => (err ? rej(err) : res(true)));
    });
  }

  // Ensure shipped_quantity column exists on order_items table in SQLite
  try {
    await new Promise((res) => {
      sqliteDb.run("ALTER TABLE order_items ADD COLUMN shipped_quantity REAL DEFAULT 0", () => res(true));
    });
  } catch (e) {
    // Column already exists
  }
}

export async function query(sql, params = []) {
  if (pgPool) {
    let paramIndex = 1;
    let pgSql = sql.replace(/\?/g, () => `$${paramIndex++}`);
    
    // Auto-convert SQLite-style integer booleans for Postgres compatibility
    pgSql = pgSql.replace(/is_active\s*=\s*1/gi, 'is_active IS NOT FALSE');
    pgSql = pgSql.replace(/is_active\s*=\s*0/gi, 'is_active IS FALSE');
    
    // Auto-append RETURNING id for PG INSERT if not already present
    const trimmed = pgSql.trim().toUpperCase();
    if (trimmed.startsWith('INSERT INTO') && !trimmed.includes('RETURNING')) {
      pgSql += ' RETURNING id';
    }

    const res = await pgPool.query(pgSql, params);
    const lastID = res.rows?.[0]?.id;
    return { rows: res.rows, rowCount: res.rowCount, lastID };
  } else {
    return new Promise((resolve, reject) => {
      const isSelect = sql.trim().toUpperCase().startsWith('SELECT');
      if (isSelect) {
        sqliteDb.all(sql, params, (err, rows) => {
          if (err) return reject(err);
          resolve({ rows, rowCount: rows.length });
        });
      } else {
        sqliteDb.run(sql, params, function (err) {
          if (err) return reject(err);
          resolve({ rows: [], lastID: this.lastID, changes: this.changes, rowCount: this.changes });
        });
      }
    });
  }
}
