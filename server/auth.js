import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query } from './db/database.js';

const JWT_SECRET = process.env.JWT_SECRET || 'sies_akilli_siparis_super_secret_jwt_key_2026';

export async function seedInitialUsers() {
  const existingUsers = await query('SELECT COUNT(*) as count FROM users');
  const count = parseInt(existingUsers.rows[0]?.count || existingUsers.rows[0]?.['COUNT(*)'] || 0, 10);

  if (count === 0) {
    console.log('Varsayılan 6 kullanıcı hesabı veritabanına ekleniyor...');

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
      await query(
        'INSERT INTO users (email, password_hash, full_name, role, is_active) VALUES (?, ?, ?, ?, 1)',
        [u.email, hash, u.name, u.role]
      );
    }
    console.log('6 adet kullanıcı hesabı (1 Yönetici + 5 Personel) başarıyla oluşturuldu.');
  }
}

export function generateToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, name: user.full_name, role: user.role },
    JWT_SECRET,
    { expiresIn: '24h' }
  );
}

export function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Oturum geçersiz veya erişim jetonu eksik!' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Oturum süresi dolmuş veya geçersiz jeton!' });
    }
    req.user = user;
    next();
  });
}

export function requireAdmin(req, res, next) {
  if (req.user?.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Bu işlem için YÖNETİCİ yetkisi gereklidir!' });
  }
  next();
}
