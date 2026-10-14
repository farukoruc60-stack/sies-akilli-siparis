import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbDir = path.join(__dirname, '../../data');
const backupsDir = path.join(dbDir, 'backups');

async function runRestore() {
  console.log('--- SİES Veritabanı Geri Yükleme (Restore) Başlatıldı ---');
  
  if (!fs.existsSync(backupsDir)) {
    console.error('Hata: Yedekleme dizini bulunamadı!');
    process.exit(1);
  }

  const requestedBackup = process.argv[2];
  let targetBackupFile = null;

  if (requestedBackup) {
    targetBackupFile = path.isAbsolute(requestedBackup) 
      ? requestedBackup 
      : path.join(backupsDir, requestedBackup);
  } else {
    // Find latest backup
    const files = fs.readdirSync(backupsDir)
      .filter(f => f.startsWith('sies_order_db_backup_') && f.endsWith('.sqlite'))
      .map(f => ({ name: f, time: fs.statSync(path.join(backupsDir, f)).mtime.getTime() }))
      .sort((a, b) => b.time - a.time);

    if (files.length === 0) {
      console.error('Hata: Geri yüklenecek geçerli bir SQLite yedeği bulunamadı!');
      process.exit(1);
    }
    targetBackupFile = path.join(backupsDir, files[0].name);
  }

  if (!fs.existsSync(targetBackupFile)) {
    console.error(`Hata: Belirtilen yedek dosyası mevcut değil: ${targetBackupFile}`);
    process.exit(1);
  }

  const targetDbPath = path.join(dbDir, 'sies_order_db.sqlite');
  console.log(`Geri yükleniyor: ${targetBackupFile} -> ${targetDbPath}`);

  // Create temporary safety backup of current db before overwriting
  if (fs.existsSync(targetDbPath)) {
    const safetyFile = path.join(backupsDir, `pre_restore_safety_${Date.now()}.sqlite`);
    fs.copyFileSync(targetDbPath, safetyFile);
    console.log(`  Mevcut veritabanı güvenlik amacıyla kopyalandı: ${safetyFile}`);
  }

  fs.copyFileSync(targetBackupFile, targetDbPath);
  console.log('✓ Veritabanı başarıyla geri yüklendi!');
}

runRestore()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Geri yükleme hatası:', err);
    process.exit(1);
  });
