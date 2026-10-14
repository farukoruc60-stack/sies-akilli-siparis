import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbDir = path.join(__dirname, '../../data');
const backupsDir = path.join(dbDir, 'backups');

if (!fs.existsSync(backupsDir)) {
  fs.mkdirSync(backupsDir, { recursive: true });
}

async function runBackup() {
  console.log('--- SİES Veritabanı Otomatik Yedekleme Başlatıldı ---');
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const USE_POSTGRES = process.env.USE_POSTGRES === 'true';

  if (USE_POSTGRES && process.env.DATABASE_URL) {
    console.log('PostgreSQL bağlantısı tespit edildi. JSON snapshot yedeği alınıyor...');
    try {
      const { initDatabase, query } = await import('../db/database.js');
      await initDatabase();
      const tables = ['users', 'customers', 'orders', 'order_items', 'dispatches', 'production_orders', 'subcontract_orders', 'audit_logs', 'documents', 'system_settings'];
      const snapshot = {};

      for (const t of tables) {
        try {
          const res = await query(`SELECT * FROM ${t}`);
          snapshot[t] = res.rows;
        } catch (e) {
          console.warn(`Tablo ${t} okunamadı: ${e.message}`);
        }
      }

      const backupFile = path.join(backupsDir, `postgres_snapshot_${timestamp}.json`);
      fs.writeFileSync(backupFile, JSON.stringify(snapshot, null, 2), 'utf-8');
      console.log(`✓ PostgreSQL snapshot yedeği başarıyla kaydedildi: ${backupFile}`);
      return backupFile;
    } catch (err) {
      console.error('PostgreSQL yedekleme hatası:', err.message);
      process.exit(1);
    }
  } else {
    const sqlitePath = path.join(dbDir, 'sies_order_db.sqlite');
    if (!fs.existsSync(sqlitePath)) {
      console.error(`Hata: SQLite veritabanı bulunamadı (${sqlitePath})`);
      process.exit(1);
    }

    const backupFile = path.join(backupsDir, `sies_order_db_backup_${timestamp}.sqlite`);
    fs.copyFileSync(sqlitePath, backupFile);
    console.log(`✓ SQLite veritabanı yedeği başarıyla alındı: ${backupFile}`);
    console.log(`  Dosya Boyutu: ${(fs.statSync(backupFile).size / 1024).toFixed(2)} KB`);

    // Keep only the 10 most recent backups
    const files = fs.readdirSync(backupsDir)
      .filter(f => f.startsWith('sies_order_db_backup_') || f.startsWith('postgres_snapshot_'))
      .map(f => ({ name: f, time: fs.statSync(path.join(backupsDir, f)).mtime.getTime() }))
      .sort((a, b) => b.time - a.time);

    if (files.length > 10) {
      for (const oldFile of files.slice(10)) {
        fs.unlinkSync(path.join(backupsDir, oldFile.name));
        console.log(`  Eski yedek temizlendi: ${oldFile.name}`);
      }
    }
    return backupFile;
  }
}

runBackup()
  .then(() => {
    console.log('Yedekleme işlemi tamamlandı.');
    process.exit(0);
  })
  .catch(err => {
    console.error('Beklenmeyen yedekleme hatası:', err);
    process.exit(1);
  });
