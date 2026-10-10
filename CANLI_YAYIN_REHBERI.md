# SİES AKILLI SİPARİŞ TAKİP - CANLI YAYIN VE DEPLOYMENT REHBERİ

Bu rehber, **SİES Akıllı Sipariş Takip** yazılımının canlı internet ortamına (AWS / Railway / Render / Neon / Vercel / VPS) sıfır hata ile konuşlandırılması için hazırlanmıştır.

---

## 🚀 1. Canlı Veritabanı ve Otomatik Migration (Neon / Supabase / Railway)
Sistem canlı PostgreSQL veritabanınızla tam entegre çalışmaktadır.

- **Canlı PostgreSQL Adresiniz (.env):**
  ```env
  USE_POSTGRES=true
  DATABASE_URL=postgresql://neondb_owner:npg_Fq6L2taoiWsh@ep-cold-grass-b5rktob8-pooler.c-7.us-east-2.aws.neon.tech/neondb?sslmode=require
  ```

- **Otomatik Veritabanı Kurulumunu Çalıştırmak İçin:**
  ```bash
  node server/db/setupPostgres.js
  ```
  *Bu komut veritabanınızda `001_init.sql` altındaki 7 tabloyu (`users`, `customers`, `orders`, `order_items`, `dispatches`, `documents`, `audit_logs`) otomatik sıfırdan kurar ve varsayılan 6 kullanıcı hesabını oluşturur.*

---

## 🔒 2. Varsayılan Canlı Kullanıcı Giriş Bilgileri

| Kullanıcı Unvanı | E-posta | Varsayılan Şifre | Yetki Rolü |
|---|---|---|---|
| **SİES Sistem Yöneticisi** | `admin@sies.com.tr` | `Admin2026!` | **ADMIN** |
| **Satış Uzmanı** | `sales@sies.com.tr` | `Sies1234!` | STANDARD |
| **Planlama Sorumlusu** | `planning@sies.com.tr` | `Sies1234!` | STANDARD |
| **Kalite Müdürü** | `quality@sies.com.tr` | `Sies1234!` | STANDARD |
| **Üretim Şefi** | `production@sies.com.tr` | `Sies1234!` | STANDARD |
| **Sevkiyat Sorumlusu** | `logistics@sies.com.tr` | `Sies1234!` | STANDARD |

---

## ☁️ 3. Yandex Disk Bulut Entegrasyonu (1 Dakikada Kurulum)

1. **https://oauth.yandex.com** adresine gidin.
2. `cloud_api:disk.read` ve `cloud_api:disk.write` izinlerini işaretleyip **OAuth Jetonu (Token)** alın.
3. Sunucudaki `.env` dosyanıza jetonunuzu yapıştırın:
   ```env
   YANDEX_DISK_TOKEN=y0_AgAAAA...
   YANDEX_ROOT_DIR=/AkilliSiparisTakip
   ```
4. Artık sisteme yüklenen tüm PDF ve sipariş belgeleri otomatik olarak Yandex Disk hesabınızdaki `/AkilliSiparisTakip` klasörüne yedeklenir.

---

## 📦 4. GitHub ve Canlı Sunucu Deployment Komutları

Yazılımınızın tüm kaynak kodları yerel ve uzak Git deposuna commitleşmiş durumdadır:

- **GitHub Repository:** `https://github.com/farukoruc60-stack/sies-akilli-siparis.git`

- **Sunucuda Çalıştırma Komutları:**
  ```bash
  # 1. Bağımlılıkları Kurun
  npm install

  # 2. Production Derlemesini Yapın
  npm run build

  # 3. Sunucuyu Başlatın
  node server/server.js
  ```
