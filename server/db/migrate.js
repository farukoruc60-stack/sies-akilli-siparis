import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { initDatabase, query } from './database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigrations() {
  console.log('=== VERİTABANI MIGRATION RUNNER BAŞLATILDI ===');
  await initDatabase();

  const migrationPath = path.join(__dirname, 'migrations/001_init.sql');
  if (fs.existsSync(migrationPath)) {
    const sql = fs.readFileSync(migrationPath, 'utf8');
    console.log('001_init.sql migration scripti çalıştırılıyor...');
    
    // Split by statement if needed or run directly
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    for (const stmt of statements) {
      try {
        await query(stmt);
      } catch (err) {
        console.warn('Migration uyarısı (zaten mevcut olabilir):', err.message);
      }
    }
    console.log('✓ Migration işlemleri başarıyla uygulandı!');
  } else {
    console.error('Migration dosyası bulunamadı:', migrationPath);
  }
}

runMigrations().catch(console.error);
