import pg from 'pg';
import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATABASE_URL = process.env.DATABASE_URL;

async function setupPostgres() {
  console.log('=======================================================');
  console.log(' CANLI POSTGRESQL VERİTABANI KURULUM VE MIGRATION MOTORU');
  console.log('=======================================================');

  if (!DATABASE_URL || DATABASE_URL.includes('localhost') || DATABASE_URL.includes('sies_password')) {
    console.log('\n[BİLGİ] Lütfen .env dosyasındaki DATABASE_URL alanına canlı PostgreSQL bağlantı adresinizi yapıştırın.');
    console.log('Örnek (Neon/Supabase/Railway):');
    console.log('DATABASE_URL=postgresql://user:password@ep-cool-name-12345.us-east-2.aws.neon.tech/neondb?sslmode=require');
    console.log('USE_POSTGRES=true');
    return;
  }

  console.log(`\nBağlanılıyor: ${DATABASE_URL.replace(/:[^:@]+@/, ':****@')}`);

  const pool = new pg.Pool({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    const client = await pool.connect();
    console.log('✓ Canlı PostgreSQL Veritabanı Bağlantısı BAŞARILI!');
    client.release();

    // 1. Run Migration Script
    const sqlPath = path.join(__dirname, 'migrations/001_init.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    console.log('✓ 001_init.sql migration taboları PostgreSQL veritabanına uygulanıyor...');
    await pool.query(sql);
    console.log('✓ Tablolar (users, customers, orders, order_items, documents, audit_logs) başarıyla oluşturuldu!');

    // 2. Seed Initial 6 Users in Postgres
    const usersCountRes = await pool.query('SELECT COUNT(*) FROM users');
    const userCount = parseInt(usersCountRes.rows[0].count, 10);

    if (userCount === 0) {
      console.log('✓ Varsayılan 6 Kullanıcı Hesabı Oluşturuluyor...');
      const defaultUsers = [
        { email: 'admin@sies.com.tr', name: 'SİES Sistem Yöneticisi', role: 'ADMIN', pass: 'Admin2026!' },
        { email: 'sales@sies.com.tr', name: 'Ahmet Yılmaz (Satış Uzmanı)', role: 'STANDARD', pass: 'Sies1234!' },
        { email: 'planning@sies.com.tr', name: 'Zeynep Kaya (Planlama Sorumlusu)', role: 'STANDARD', pass: 'Sies1234!' },
        { email: 'quality@sies.com.tr', name: 'Hakan Şen (Kalite Müdürü)', role: 'STANDARD', pass: 'Sies1234!' },
        { email: 'production@sies.com.tr', name: 'Mehmet Demir (Üretim Şefi)', role: 'STANDARD', pass: 'Sies1234!' },
        { email: 'logistics@sies.com.tr', name: 'Serkan Can (Sevkiyat Sorumlusu)', role: 'STANDARD', pass: 'Sies1234!' }
      ];

      for (const u of defaultUsers) {
        const hash = await bcrypt.hash(u.pass, 10);
        await pool.query(
          'INSERT INTO users (email, password_hash, full_name, role, is_active) VALUES ($1, $2, $3, $4, TRUE)',
          [u.email, hash, u.name, u.role]
        );
      }
      console.log('✓ 6 Adet Kullanıcı Hesabı Canlı PostgreSQL Veritabanına Oluşturuldu!');
    } else {
      console.log(`✓ Veritabanında zaten ${userCount} adet kayıtlı kullanıcı mevcut.`);
    }

    console.log('\n=======================================================');
    console.log(' POSTGRESQL KURULUMU VE İLK VERİLER BAŞARIYLA TAMAMLANDI!');
    console.log('=======================================================');
  } catch (err) {
    console.error('✗ PostgreSQL Kurulum Hatası:', err.message);
  } finally {
    await pool.end();
  }
}

setupPostgres();
