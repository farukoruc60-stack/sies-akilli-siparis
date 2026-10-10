import fs from 'fs';
import path from 'path';

function getYandexToken() {
  return (process.env.YANDEX_DISK_TOKEN || '').trim();
}

function getYandexRootDir() {
  return process.env.YANDEX_ROOT_DIR || '/AkilliSiparisTakip';
}

export function saveYandexToken(newToken) {
  const cleanToken = newToken.trim();
  process.env.YANDEX_DISK_TOKEN = cleanToken;

  const envPath = path.join(process.cwd(), '.env');
  let envContent = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';

  if (envContent.includes('YANDEX_DISK_TOKEN=')) {
    envContent = envContent.replace(/YANDEX_DISK_TOKEN=.*/g, `YANDEX_DISK_TOKEN=${cleanToken}`);
  } else {
    envContent += `\nYANDEX_DISK_TOKEN=${cleanToken}\n`;
  }
  fs.writeFileSync(envPath, envContent);
}

export async function getYandexStatus() {
  const token = getYandexToken();
  const rootDir = getYandexRootDir();

  if (!token) {
    return {
      connected: false,
      statusMessage: 'Yandex Disk OAuth2 Token henüz tanımlanmadı (Aşağıdaki alandan giriniz)',
      rootDir: rootDir
    };
  }

  try {
    const response = await fetch('https://cloud-api.yandex.net/v1/disk/', {
      headers: {
        'Authorization': `OAuth ${token}`
      }
    });

    if (response.ok) {
      const data = await response.json();
      return {
        connected: true,
        user: data.user?.display_name || 'Yandex Kullanıcısı',
        totalSpaceMb: Math.round(data.total_space / (1024 * 1024)),
        usedSpaceMb: Math.round(data.used_space / (1024 * 1024)),
        rootDir: rootDir
      };
    } else {
      return {
        connected: false,
        statusMessage: `Yandex API Yetkilendirme Hatası (${response.status}) - Geçersiz Token`,
        rootDir: rootDir
      };
    }
  } catch (err) {
    return {
      connected: false,
      statusMessage: `Bağlantı Hatası: ${err.message}`,
      rootDir: rootDir
    };
  }
}

export async function uploadToYandexDisk(localFilePath, destinationSubDir, fileName) {
  const token = getYandexToken();
  const rootDir = getYandexRootDir();

  if (!token) {
    console.log(`[Yandex Arşivleme Beklemede] Token eksik. Dosya yerelde saklandı: ${fileName}`);
    return { success: false, reason: 'TOKEN_MISSING' };
  }

  try {
    const targetFolder = `${rootDir}/${destinationSubDir}`.replace(/\/+/g, '/');
    await ensureYandexFolder(targetFolder, token);

    const remotePath = `${targetFolder}/${fileName}`;
    const getUploadUrlRes = await fetch(
      `https://cloud-api.yandex.net/v1/disk/resources/upload?path=${encodeURIComponent(remotePath)}&overwrite=true`,
      {
        headers: { 'Authorization': `OAuth ${token}` }
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

async function ensureYandexFolder(folderPath, token) {
  try {
    await fetch(
      `https://cloud-api.yandex.net/v1/disk/resources?path=${encodeURIComponent(folderPath)}`,
      {
        method: 'PUT',
        headers: { 'Authorization': `OAuth ${token}` }
      }
    );
  } catch (e) {
    // Ignore if folder already exists
  }
}

