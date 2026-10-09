import fs from 'fs';
import path from 'path';

const YANDEX_TOKEN = process.env.YANDEX_DISK_TOKEN;
const YANDEX_ROOT = process.env.YANDEX_ROOT_DIR || '/AkilliSiparisTakip';

export async function getYandexStatus() {
  if (!YANDEX_TOKEN) {
    return {
      connected: false,
      statusMessage: 'Yandex Disk OAuth2 Token henüz yapılandırılmadı (.env bekleniyor)',
      rootDir: YANDEX_ROOT
    };
  }

  try {
    const response = await fetch('https://cloud-api.yandex.net/v1/disk/', {
      headers: {
        'Authorization': `OAuth ${YANDEX_TOKEN}`
      }
    });

    if (response.ok) {
      const data = await response.json();
      return {
        connected: true,
        user: data.user?.display_name || 'Yandex Kullanıcısı',
        totalSpaceMb: Math.round(data.total_space / (1024 * 1024)),
        usedSpaceMb: Math.round(data.used_space / (1024 * 1024)),
        rootDir: YANDEX_ROOT
      };
    } else {
      return {
        connected: false,
        statusMessage: `Yandex API Yetkilendirme Hatası (${response.status})`,
        rootDir: YANDEX_ROOT
      };
    }
  } catch (err) {
    return {
      connected: false,
      statusMessage: `Bağlantı Hatası: ${err.message}`,
      rootDir: YANDEX_ROOT
    };
  }
}

export async function uploadToYandexDisk(localFilePath, destinationSubDir, fileName) {
  if (!YANDEX_TOKEN) {
    console.log(`[Yandex Arşivleme Beklemede] Token eksik. Dosya yerelde saklandı: ${fileName}`);
    return { success: false, reason: 'TOKEN_MISSING' };
  }

  try {
    const targetFolder = `${YANDEX_ROOT}/${destinationSubDir}`.replace(/\/+/g, '/');
    await ensureYandexFolder(targetFolder);

    const remotePath = `${targetFolder}/${fileName}`;
    const getUploadUrlRes = await fetch(
      `https://cloud-api.yandex.net/v1/disk/resources/upload?path=${encodeURIComponent(remotePath)}&overwrite=true`,
      {
        headers: { 'Authorization': `OAuth ${YANDEX_TOKEN}` }
      }
    );

    if (!getUploadUrlRes.ok) {
      throw new Error(`Upload URL alınamadı: HTTP ${getUploadUrlRes.status}`);
    }

    const { href } = await getUploadUrlRes.json();
    const fileBuffer = fs.readFileSync(localFilePath);

    const uploadRes = await fetch(href, {
      method: 'PUT',
      body: fileBuffer
    });

    if (uploadRes.ok || uploadRes.status === 201) {
      console.log(`[Yandex Arşivleme Başarılı] ${remotePath}`);
      return { success: true, yandexPath: remotePath };
    } else {
      throw new Error(`Dosya yükleme hatası: HTTP ${uploadRes.status}`);
    }
  } catch (err) {
    console.error(`[Yandex Arşivleme Hatası] ${fileName}:`, err.message);
    return { success: false, reason: err.message };
  }
}

async function ensureYandexFolder(folderPath) {
  try {
    await fetch(
      `https://cloud-api.yandex.net/v1/disk/resources?path=${encodeURIComponent(folderPath)}`,
      {
        method: 'PUT',
        headers: { 'Authorization': `OAuth ${YANDEX_TOKEN}` }
      }
    );
  } catch (e) {
    // Ignore if folder already exists
  }
}
