import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query } from './db/database.js';

const JWT_SECRET = process.env.JWT_SECRET || 'sies_akilli_siparis_super_secret_jwt_key_2026';

export async function seedInitialUsers() {
  const defaultUsers = [
    { email: 'admin@sies.com.tr', name: 'SİES Sistem Yöneticisi', role: 'ADMIN', pass: 'Admin2026!' },
    { email: 'hsert@sies.com.tr', name: 'Hasan SERT (Satış Uzmanı)', role: 'STANDARD', pass: 'Sies1234!' },
    { email: 'isert@sies.com.tr', name: 'İbrahim SERT (Planlama Sorumlusu)', role: 'STANDARD', pass: 'Sies1234!' },
    { email: 'faruk@sies.com.tr', name: 'Faruk ORUÇ (Kalite Müdürü)', role: 'ADMIN', pass: 'Admin2026!' },
    { email: 'ibrahim@sies.com.tr', name: 'İbrahim Aydın (Sevkiyat Sorumlusu)', role: 'STANDARD', pass: 'Sies1234!' },
    { email: 'muhasebe@sies.com.tr', name: 'Günay BAY (Muhasebe)', role: 'STANDARD', pass: 'Sies1234!' }
  ];

  for (const u of defaultUsers) {
    const existing = await query('SELECT id FROM users WHERE email = ?', [u.email]);
    if (!existing.rows || existing.rows.length === 0) {
      const hash = await bcrypt.hash(u.pass, 10);
      await query(
        'INSERT INTO users (email, password_hash, full_name, role, is_active) VALUES (?, ?, ?, ?, true)',
        [u.email, hash, u.name, u.role]
      );
      console.log(`✓ Sistem kullanıcısı eklendi: ${u.name} (${u.email})`);
    } else {
      await query(
        'UPDATE users SET full_name = ?, role = ? WHERE email = ?',
        [u.name, u.role, u.email]
      );
    }
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
  const token = (authHeader && authHeader.split(' ')[1]) || req.query.token;

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
