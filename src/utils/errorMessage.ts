// SİES Akıllı Sipariş Takip - Hata Mesajları Yerelleştirme ve Türkçe Çeviri Yardımcısı

export function toTurkishErrorMessage(error: any): string {
  if (!error) return 'Bilinmeyen bir hata oluştu.';
  const msg = typeof error === 'string' ? error : (error.message || String(error));

  const trimmed = msg.trim();

  // PostgreSQL & Veritabanı Tarih Hataları
  if (/invalid input syntax for type date/i.test(trimmed)) {
    return 'Geçersiz veya boş tarih formatı! Lütfen geçerli bir tarih seçiniz veya alanı temizleyiniz.';
  }

  // PostgreSQL & Veritabanı Sayısal Format Hataları
  if (/numeric field overflow|invalid input syntax for type numeric|invalid input syntax for integer/i.test(trimmed)) {
    return 'Girilen sayısal değer geçersiz formatta! Lütfen geçerli bir sayı giriniz.';
  }

  // Benzersizlik / Duplicate Key Hataları
  if (/duplicate key|unique constraint|already exists/i.test(trimmed)) {
    return 'Bu kayıt, sipariş numarası veya vergi numarası sistemde zaten mevcut!';
  }

  // İlişkisel Veritabanı / Foreign Key Hataları
  if (/violates foreign key constraint/i.test(trimmed)) {
    return 'Bu kayıt başka işlemlerle (sevkiyat, kalemler vb.) ilişkili olduğu için silinemez veya değiştirilemez.';
  }

  // Zorunlu Alan / Not-Null Hataları
  if (/violates not-null constraint|null value in column/i.test(trimmed)) {
    return 'Zorunlu bir alan boş bırakıldı! Lütfen gerekli tüm alanları doldurunuz.';
  }

  // Ağ & Bağlantı Hataları
  if (/failed to fetch|networkerror|network request failed|connection refused|econnrefused|etimedout/i.test(trimmed)) {
    return 'Sunucuya bağlanılamadı. Lütfen internet bağlantınızı veya sunucu durumunu kontrol ediniz.';
  }

  // Yetkilendirme & Token Hataları
  if (/token.*expired|jwt expired|jwt malformed|unauthorized|invalid token/i.test(trimmed)) {
    return 'Oturum süreniz doldu veya oturumunuz geçersiz. Lütfen tekrar giriş yapınız.';
  }

  // Çakışma / Optimistic Locking Hataları
  if (/conflict|409|çakışma/i.test(trimmed)) {
    return 'ÇAKIŞMA TESPİT EDİLDİ: Bu sipariş siz düzenlerken başka bir kullanıcı tarafından güncellendi. Lütfen sayfayı yenileyip tekrar deneyiniz.';
  }

  // Bulunamadı / 404 Hataları
  if (/not found|bulunamadı/i.test(trimmed)) {
    return 'İlgili sipariş veya kayıt bulunamadı!';
  }

  // Yetkisiz Erişim / 403 Hataları
  if (/forbidden|yetkiniz/i.test(trimmed)) {
    return 'Bu işlemi gerçekleştirmek için yetkiniz bulunmuyor.';
  }

  // Zaten Türkçe olan veya özel tanımlanmış mesajlar
  return trimmed;
}
