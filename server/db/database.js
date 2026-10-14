import 'dotenv/config';
import sqlite3 from 'sqlite3';
import pg from 'pg';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const isPostgres = process.env.USE_POSTGRES === 'true';
const USE_POSTGRES = isPostgres;
const DATABASE_URL = process.env.DATABASE_URL;

let pgPool = null;
let sqliteDb = null;

export async function initDatabase() {
  if (USE_POSTGRES && DATABASE_URL) {
    console.log('PostgreSQL veritabanı bağlantısı kuruluyor...');
    try {
      pgPool = new pg.Pool({
        connectionString: DATABASE_URL,
        ssl: { rejectUnauthorized: false },
        connectionTimeoutMillis: 7000,
        idleTimeoutMillis: 30000,
        max: 10
      });
      
      const client = await pgPool.connect();
      console.log('PostgreSQL veritabanı bağlantısı başarılı!');

      // Ensure stage tracking columns and tables exist in PostgreSQL
      await client.query(`
        ALTER TABLE order_items ADD COLUMN IF NOT EXISTS shipped_quantity NUMERIC(12, 2) DEFAULT 0;
        ALTER TABLE order_items ADD COLUMN IF NOT EXISTS production_quantity NUMERIC(12, 2) DEFAULT 0;
        ALTER TABLE order_items ADD COLUMN IF NOT EXISTS coating_quantity NUMERIC(12, 2) DEFAULT 0;
        ALTER TABLE order_items ADD COLUMN IF NOT EXISTS in_production_quantity NUMERIC(12, 2) DEFAULT 0;
        ALTER TABLE order_items ADD COLUMN IF NOT EXISTS produced_quantity NUMERIC(12, 2) DEFAULT 0;
        ALTER TABLE order_items ADD COLUMN IF NOT EXISTS sent_to_coating_quantity NUMERIC(12, 2) DEFAULT 0;
        ALTER TABLE order_items ADD COLUMN IF NOT EXISTS returned_from_coating_quantity NUMERIC(12, 2) DEFAULT 0;
        ALTER TABLE order_items ADD COLUMN IF NOT EXISTS approved_quantity NUMERIC(12, 2) DEFAULT 0;
        ALTER TABLE order_items ADD COLUMN IF NOT EXISTS defect_quantity NUMERIC(12, 2) DEFAULT 0;
        ALTER TABLE order_items ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1;

        ALTER TABLE orders ADD COLUMN IF NOT EXISTS coating_type VARCHAR(100);
        ALTER TABLE orders ADD COLUMN IF NOT EXISTS project_no VARCHAR(100);
        ALTER TABLE orders ADD COLUMN IF NOT EXISTS notes TEXT;
        ALTER TABLE orders ADD COLUMN IF NOT EXISTS total_amount NUMERIC(15, 2) DEFAULT 0;
        ALTER TABLE orders ADD COLUMN IF NOT EXISTS currency VARCHAR(10) DEFAULT 'TRY';
        ALTER TABLE orders ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1;

        CREATE TABLE IF NOT EXISTS dispatches (
            id SERIAL PRIMARY KEY,
            order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
            order_item_id INTEGER REFERENCES order_items(id) ON DELETE CASCADE,
            quantity_shipped NUMERIC(12, 2) NOT NULL,
            driver_name VARCHAR(255),
            vehicle_plate VARCHAR(50),
            waybill_number VARCHAR(100),
            notes TEXT,
            dispatch_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            created_by INTEGER REFERENCES users(id),
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
        ALTER TABLE dispatches ADD COLUMN IF NOT EXISTS dispatch_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
        ALTER TABLE dispatches ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'ACTIVE';
        ALTER TABLE dispatches ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMP WITH TIME ZONE;
        ALTER TABLE dispatches ADD COLUMN IF NOT EXISTS cancelled_by INTEGER REFERENCES users(id);
        ALTER TABLE dispatches ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;

        ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS order_id INTEGER;
        ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS previous_value TEXT;
        ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS new_value TEXT;
        ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS notes TEXT;

        CREATE TABLE IF NOT EXISTS production_orders (
          id SERIAL PRIMARY KEY,
          order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
          order_item_id INTEGER REFERENCES order_items(id) ON DELETE CASCADE,
          work_order_no VARCHAR(100) NOT NULL,
          department VARCHAR(100),
          planned_quantity NUMERIC(12, 2) NOT NULL DEFAULT 0,
          produced_quantity NUMERIC(12, 2) NOT NULL DEFAULT 0,
          defect_quantity NUMERIC(12, 2) NOT NULL DEFAULT 0,
          start_date VARCHAR(50),
          planned_end_date VARCHAR(50),
          actual_end_date VARCHAR(50),
          status VARCHAR(50) NOT NULL DEFAULT 'PLANNED',
          notes TEXT,
          created_by INTEGER REFERENCES users(id),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS subcontract_orders (
          id SERIAL PRIMARY KEY,
          order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
          order_item_id INTEGER REFERENCES order_items(id) ON DELETE CASCADE,
          batch_no VARCHAR(100),
          subcontractor_name VARCHAR(255) NOT NULL,
          operation_type VARCHAR(100) NOT NULL DEFAULT 'KAPLAMA',
          waybill_no VARCHAR(100),
          sent_quantity NUMERIC(12, 2) NOT NULL DEFAULT 0,
          returned_quantity NUMERIC(12, 2) NOT NULL DEFAULT 0,
          defect_quantity NUMERIC(12, 2) NOT NULL DEFAULT 0,
          sent_date VARCHAR(50),
          expected_return_date VARCHAR(50),
          actual_return_date VARCHAR(50),
          status VARCHAR(50) NOT NULL DEFAULT 'SENT',
          notes TEXT,
          created_by INTEGER REFERENCES users(id),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
        ALTER TABLE subcontract_orders ADD COLUMN IF NOT EXISTS batch_no VARCHAR(100);

        CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
        CREATE INDEX IF NOT EXISTS idx_documents_order_id ON documents(order_id);
        CREATE INDEX IF NOT EXISTS idx_order_status_history_order_id ON order_status_history(order_id);
        CREATE INDEX IF NOT EXISTS idx_dispatches_order_id ON dispatches(order_id);
        CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON orders(customer_id);
        CREATE INDEX IF NOT EXISTS idx_prod_orders_order_id ON production_orders(order_id);
        CREATE INDEX IF NOT EXISTS idx_prod_orders_item_id ON production_orders(order_item_id);
        CREATE INDEX IF NOT EXISTS idx_subcontract_order_id ON subcontract_orders(order_id);
        CREATE INDEX IF NOT EXISTS idx_subcontract_item_id ON subcontract_orders(order_item_id);
      `);
      console.log('✓ PostgreSQL üretim, kaplama, fason, sevkiyat ve denetim tabloları güncellendi.');

      client.release();
      return 'PG';
    } catch (pgErr) {
      console.error('PostgreSQL bağlantı hatası, SQLite yedek sürücüsüne geçiliyor:', pgErr.message);
      pgPool = null;
    }
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
      notes TEXT,
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
      order_id INTEGER,
      details TEXT,
      previous_value TEXT,
      new_value TEXT,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id)
    )`,
    `CREATE TABLE IF NOT EXISTS system_settings (
      key_name TEXT PRIMARY KEY,
      value_text TEXT,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS production_orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL,
      order_item_id INTEGER NOT NULL,
      work_order_no TEXT NOT NULL,
      department TEXT,
      planned_quantity REAL NOT NULL DEFAULT 0,
      produced_quantity REAL NOT NULL DEFAULT 0,
      defect_quantity REAL NOT NULL DEFAULT 0,
      start_date TEXT,
      planned_end_date TEXT,
      actual_end_date TEXT,
      status TEXT NOT NULL DEFAULT 'PLANNED',
      notes TEXT,
      created_by INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(order_id) REFERENCES orders(id) ON DELETE CASCADE,
      FOREIGN KEY(order_item_id) REFERENCES order_items(id) ON DELETE CASCADE,
      FOREIGN KEY(created_by) REFERENCES users(id)
    )`,
    `CREATE TABLE IF NOT EXISTS subcontract_orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL,
      order_item_id INTEGER NOT NULL,
      batch_no TEXT,
      subcontractor_name TEXT NOT NULL,
      operation_type TEXT NOT NULL DEFAULT 'KAPLAMA',
      waybill_no TEXT,
      sent_quantity REAL NOT NULL DEFAULT 0,
      returned_quantity REAL NOT NULL DEFAULT 0,
      defect_quantity REAL NOT NULL DEFAULT 0,
      sent_date TEXT,
      expected_return_date TEXT,
      actual_return_date TEXT,
      status TEXT NOT NULL DEFAULT 'SENT',
      notes TEXT,
      created_by INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(order_id) REFERENCES orders(id) ON DELETE CASCADE,
      FOREIGN KEY(order_item_id) REFERENCES order_items(id) ON DELETE CASCADE,
      FOREIGN KEY(created_by) REFERENCES users(id)
    )`
  ];

  for (const sql of tables) {
    await new Promise((res, rej) => {
      sqliteDb.run(sql, (err) => (err ? rej(err) : res(true)));
    });
  }

  // Ensure stage tracking columns exist on order_items table in SQLite
  try {
    await new Promise((res) => sqliteDb.run("ALTER TABLE order_items ADD COLUMN shipped_quantity REAL DEFAULT 0", () => res(true)));
  } catch (e) {}
  try {
    await new Promise((res) => sqliteDb.run("ALTER TABLE order_items ADD COLUMN production_quantity REAL DEFAULT 0", () => res(true)));
  } catch (e) {}
  try {
    await new Promise((res) => sqliteDb.run("ALTER TABLE order_items ADD COLUMN coating_quantity REAL DEFAULT 0", () => res(true)));
  } catch (e) {}
  try {
    await new Promise((res) => sqliteDb.run("ALTER TABLE order_items ADD COLUMN in_production_quantity REAL DEFAULT 0", () => res(true)));
  } catch (e) {}
  try {
    await new Promise((res) => sqliteDb.run("ALTER TABLE order_items ADD COLUMN produced_quantity REAL DEFAULT 0", () => res(true)));
  } catch (e) {}
  try {
    await new Promise((res) => sqliteDb.run("ALTER TABLE order_items ADD COLUMN sent_to_coating_quantity REAL DEFAULT 0", () => res(true)));
  } catch (e) {}
  try {
    await new Promise((res) => sqliteDb.run("ALTER TABLE order_items ADD COLUMN returned_from_coating_quantity REAL DEFAULT 0", () => res(true)));
  } catch (e) {}
  try {
    await new Promise((res) => sqliteDb.run("ALTER TABLE order_items ADD COLUMN approved_quantity REAL DEFAULT 0", () => res(true)));
  } catch (e) {}
  try {
    await new Promise((res) => sqliteDb.run("ALTER TABLE order_items ADD COLUMN defect_quantity REAL DEFAULT 0", () => res(true)));
  } catch (e) {}

  // Ensure dispatches columns exist in SQLite
  try {
    await new Promise((res) => sqliteDb.run("ALTER TABLE dispatches ADD COLUMN dispatch_date DATETIME DEFAULT CURRENT_TIMESTAMP", () => res(true)));
  } catch (e) {}
  try {
    await new Promise((res) => sqliteDb.run("ALTER TABLE dispatches ADD COLUMN status TEXT DEFAULT 'ACTIVE'", () => res(true)));
  } catch (e) {}
  try {
    await new Promise((res) => sqliteDb.run("ALTER TABLE dispatches ADD COLUMN cancelled_at DATETIME", () => res(true)));
  } catch (e) {}
  try {
    await new Promise((res) => sqliteDb.run("ALTER TABLE dispatches ADD COLUMN cancelled_by INTEGER", () => res(true)));
  } catch (e) {}
  try {
    await new Promise((res) => sqliteDb.run("ALTER TABLE dispatches ADD COLUMN cancellation_reason TEXT", () => res(true)));
  } catch (e) {}

  // Ensure audit_logs columns exist in SQLite
  try {
    await new Promise((res) => sqliteDb.run("ALTER TABLE audit_logs ADD COLUMN order_id INTEGER", () => res(true)));
  } catch (e) {}
  try {
    await new Promise((res) => sqliteDb.run("ALTER TABLE audit_logs ADD COLUMN previous_value TEXT", () => res(true)));
  } catch (e) {}
  try {
    await new Promise((res) => sqliteDb.run("ALTER TABLE audit_logs ADD COLUMN new_value TEXT", () => res(true)));
  } catch (e) {}
  try {
    await new Promise((res) => sqliteDb.run("ALTER TABLE audit_logs ADD COLUMN notes TEXT", () => res(true)));
  } catch (e) {}

  // Ensure coating_type & project_no columns exist on orders table in SQLite
  try {
    await new Promise((res) => sqliteDb.run("ALTER TABLE orders ADD COLUMN coating_type TEXT", () => res(true)));
  } catch (e) {}
  try {
    await new Promise((res) => sqliteDb.run("ALTER TABLE orders ADD COLUMN project_no TEXT", () => res(true)));
  } catch (e) {}
  try {
    await new Promise((res) => sqliteDb.run("ALTER TABLE orders ADD COLUMN notes TEXT", () => res(true)));
  } catch (e) {}
  try {
    await new Promise((res) => sqliteDb.run("ALTER TABLE subcontract_orders ADD COLUMN batch_no TEXT", () => res(true)));
  } catch (e) {}

  // Create SQLite indexes on relational foreign keys
  try {
    await new Promise((res) => sqliteDb.run("CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id)", () => res(true)));
    await new Promise((res) => sqliteDb.run("CREATE INDEX IF NOT EXISTS idx_documents_order_id ON documents(order_id)", () => res(true)));
    await new Promise((res) => sqliteDb.run("CREATE INDEX IF NOT EXISTS idx_order_status_history_order_id ON order_status_history(order_id)", () => res(true)));
    await new Promise((res) => sqliteDb.run("CREATE INDEX IF NOT EXISTS idx_dispatches_order_id ON dispatches(order_id)", () => res(true)));
    await new Promise((res) => sqliteDb.run("CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON orders(customer_id)", () => res(true)));
    await new Promise((res) => sqliteDb.run("CREATE INDEX IF NOT EXISTS idx_prod_orders_order_id ON production_orders(order_id)", () => res(true)));
    await new Promise((res) => sqliteDb.run("CREATE INDEX IF NOT EXISTS idx_prod_orders_item_id ON production_orders(order_item_id)", () => res(true)));
    await new Promise((res) => sqliteDb.run("CREATE INDEX IF NOT EXISTS idx_subcontract_order_id ON subcontract_orders(order_id)", () => res(true)));
    await new Promise((res) => sqliteDb.run("CREATE INDEX IF NOT EXISTS idx_subcontract_item_id ON subcontract_orders(order_item_id)", () => res(true)));
  } catch (e) {}
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

export { initDatabase as initDb };
