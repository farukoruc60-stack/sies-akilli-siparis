import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import pdfParse from 'pdf-parse';
import xlsxModule from 'xlsx';
const xlsx = xlsxModule.default || xlsxModule;
import mammoth from 'mammoth';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');
import createTesseractWorker from 'tesseract.js';

export function calculateSHA256(filePath) {
  const fileBuffer = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(fileBuffer).digest('hex');
}

export async function processUploadedDocument(filePath, originalName, mimeType) {
  const sha256 = calculateSHA256(filePath);
  const ext = path.extname(originalName).toLowerCase();
  
  const uploadDir = path.dirname(filePath);
  const baseName = path.basename(filePath, path.extname(filePath));
  const pdfPath = path.join(uploadDir, `${baseName}_converted.pdf`);

  let customerInfo = {
    name: '',
    taxOffice: '',
    taxNumber: '',
    address: '',
    phone: '',
    email: '',
    orderNo: '',
    orderDate: new Date().toISOString().split('T')[0],
    deliveryDate: ''
  };

  let orderItems = [];

  try {
    if (ext === '.pdf') {
      const dataBuffer = fs.readFileSync(filePath);
      const pdfData = await pdfParse(dataBuffer);
      const text = pdfData.text || '';

      if (text.trim().length > 30) {
        fs.copyFileSync(filePath, pdfPath);
        const parsed = parseTextContent(text, originalName);
        customerInfo = parsed.customerInfo;
        orderItems = parsed.orderItems;
      } else {
        console.log('Taranmış PDF algılandı, OCR uygulanıyor...');
        fs.copyFileSync(filePath, pdfPath);
        const ocrResult = await runTesseractOCR(filePath);
        const parsed = parseTextContent(ocrResult, originalName);
        customerInfo = parsed.customerInfo;
        orderItems = parsed.orderItems;
      }
    } else if (ext === '.xlsx' || ext === '.xls') {
      const workbook = xlsx.readFile(filePath);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = xlsx.utils.sheet_to_json(worksheet, { header: 1 });

      const parsed = parseExcelRows(jsonData, originalName);
      customerInfo = parsed.customerInfo;
      orderItems = parsed.orderItems;

      await generatePdfFromExcel(jsonData, pdfPath, originalName);
    } else if (ext === '.docx' || ext === '.doc') {
      const result = await mammoth.extractRawText({ path: filePath });
      const text = result.value || '';

      const parsed = parseTextContent(text, originalName);
      customerInfo = parsed.customerInfo;
      orderItems = parsed.orderItems;

      await generatePdfFromText(text, pdfPath, originalName);
    } else if (['.jpg', '.jpeg', '.png'].includes(ext)) {
      console.log('Görüntü dosyası algılandı, OCR ve PDF oluşturuluyor...');
      const ocrResult = await runTesseractOCR(filePath);
      const parsed = parseTextContent(ocrResult, originalName);
      customerInfo = parsed.customerInfo;
      orderItems = parsed.orderItems;

      await generatePdfFromImage(filePath, pdfPath);
    } else {
      throw new Error(`Desteklenmeyen dosya türü: ${ext}`);
    }
  } catch (err) {
    console.error('Dosya işleme hatası:', err);
    if (!fs.existsSync(pdfPath)) {
      await generatePdfFromText(`SİES Belge Dönüştürme Raporu: ${err.message}`, pdfPath, originalName);
    }
  }

  // Fallback Customer Name from filename if unparsed
  if (!customerInfo.name) {
    customerInfo.name = extractCustomerNameFromFilename(originalName) || 'MÜŞTERİ BİLGİSİ (KONTROL BEKLİYOR)';
  }

  if (!customerInfo.orderNo) {
    customerInfo.orderNo = `SO-2026-${Math.floor(10000 + Math.random() * 90000)}`;
  }

  return {
    sha256,
    pdfPath,
    customerInfo,
    orderItems
  };
}

function extractCustomerNameFromFilename(filename) {
  const clean = filename.replace(/\.[^/.]+$/, '').replace(/[_|-]/g, ' ');
  return clean.toUpperCase();
}

async function runTesseractOCR(filePath) {
  try {
    const worker = await createTesseractWorker.createWorker('tur');
    const ret = await worker.recognize(filePath);
    await worker.terminate();
    return ret.data.text || '';
  } catch (err) {
    console.warn('Tesseract OCR çalıştırılamadı:', err.message);
    return '';
  }
}

function normalizeText(str) {
  if (!str) return '';
  return str
    .replace(/İ/g, 'I').replace(/i/g, 'i')
    .replace(/ü/g, 'u').replace(/Ü/g, 'U')
    .replace(/ı/g, 'i')
    .replace(/Ö/g, 'O').replace(/ö/g, 'o')
    .replace(/Ş/g, 'S').replace(/ş/g, 's')
    .replace(/Ç/g, 'C').replace(/ç/g, 'c')
    .replace(/Ğ/g, 'G').replace(/ğ/g, 'g');
}

function parseTextContent(text, originalName = '') {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  
  let customerInfo = {
    name: '',
    taxOffice: '',
    taxNumber: '',
    address: '',
    phone: '',
    email: '',
    orderNo: '',
    orderDate: new Date().toISOString().split('T')[0],
    deliveryDate: ''
  };

  let orderItems = [];
  let lineNo = 1;

  // 1. HEADER & METADATA EXTRACTION
  for (let idx = 0; idx < lines.length; idx++) {
    const rawLine = lines[idx];
    const normLine = normalizeText(rawLine);

    // Müşteri Adı / Unvan Tespiti
    if (!customerInfo.name) {
      const custMatch = normLine.match(/Musteri\s*Adi\s*([A-Z0-9\s\.\,\&\-]+?)(?:Sip|Tes|Tarih|Kaplama|VKN|Vergi|Formu|\d{2}\.\d{2}\.\d{4}|$)/i);
      if (custMatch && custMatch[1].trim().length > 2) {
        customerInfo.name = custMatch[1].trim();
      } else {
        const firmMatch = normLine.match(/(?:MUSTERI|FIRMA|UNVAN|MUSTERI\s+TICARI\s+UNVANI)\s*[\:\-]\s*([A-Z0-9\s\.\,\&\-]+)/i);
        if (firmMatch && firmMatch[1].trim().length > 2 && !firmMatch[1].includes('SIES') && !firmMatch[1].includes('FORMU')) {
          customerInfo.name = firmMatch[1].trim();
        }
      }
    }

    // Sipariş Tarihi
    if (normLine.includes('Sip. Tarihi') || normLine.includes('Siparis Tarihi') || normLine.includes('Teklif Tarihi')) {
      const dateMatch = rawLine.match(/(\d{2}[\.\/\-]\d{2}[\.\/\-]\d{4})/);
      if (dateMatch) customerInfo.orderDate = dateMatch[1];
    }

    // Teslim Tarihi
    if (normLine.includes('Tes. Tarihi') || normLine.includes('Teslim Tarihi')) {
      const dateMatch = rawLine.match(/(\d{2}[\.\/\-]\d{2}[\.\/\-]\d{4})/);
      if (dateMatch) customerInfo.deliveryDate = dateMatch[1];
    }

    // Sipariş / Teklif No
    if (normLine.includes('Teklif No') || normLine.includes('Siparis No') || normLine.includes('Dok. No') || normLine.includes('Teklif/Siparis')) {
      const noMatch = rawLine.match(/([A-Z0-9\-\/]{4,25})/);
      if (noMatch && !customerInfo.orderNo && !noMatch[0].includes('TARİH')) {
        customerInfo.orderNo = noMatch[0];
      }
    }

    // Vergi Numarası
    if (normLine.includes('Vergi No') || normLine.includes('VKN')) {
      const vknMatch = rawLine.match(/\d{10,11}/);
      if (vknMatch) customerInfo.taxNumber = vknMatch[0];
    }
  }

  // Fallback Müşteri Unvanı Tespiti (San. Tic. A.Ş. vb)
  if (!customerInfo.name) {
    for (const rawLine of lines) {
      const normLine = normalizeText(rawLine);
      if (normLine.includes('SIES ELEKTRIK') || normLine.includes('URETIM FORMU') || normLine.includes('TEKLIF / SIPARIS')) continue;
      if (normLine.includes('SAN.') || normLine.includes('TIC.') || normLine.includes('A.S.') || normLine.includes('LTD') || normLine.includes('YACHT')) {
        const clean = rawLine.replace(/MÜŞTERİ:|FİRMA:|ÜNVAN:|MÜŞTERİ ADI/i, '').trim();
        if (clean.length > 3) {
          customerInfo.name = clean;
          break;
        }
      }
    }
  }

  // 2. LINE ITEM EXTRACTION ALGORITHM (Single & Multi-line Support)
  let currentCode = '';
  let descriptionBuffer = [];

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i].trim();
    if (!rawLine) continue;

    const normLine = normalizeText(rawLine);

    // Skip Header/Footer Boilerplate
    if (
      normLine.includes('URETIM FORMU') ||
      normLine.includes('TEKLIF / SIPARIS FORMU') ||
      normLine.includes('Sayfa No:') ||
      normLine.includes('Rev. No:') ||
      normLine.includes('Y. Tarihi:') ||
      normLine.includes('Dok. No:') ||
      normLine.includes('SIPARIS KODU') ||
      normLine.includes('Musteri Adi') ||
      normLine.includes('Kaplama Cinsi') ||
      normLine.includes('Hazirlayan') ||
      normLine.includes('Onaylayan') ||
      normLine.includes('SIES Elektrik') ||
      normLine.startsWith('©')
    ) {
      continue;
    }

    // Single-Line Match Option (Code + Name + Qty + Unit + Price)
    const singleMatch = rawLine.match(/^(\d{1,3}[\s\.\t]+)?([A-Z0-9\-\/\*\.\_]+)\s+(.+?)\s+(\d+(?:[\.\,]\d+)?)\s*(M|MT|ADET|AD|BOY|KG|METRE|SET|PAKET)\b/i);
    if (singleMatch && singleMatch[3].trim().length > 2) {
      const pCode = singleMatch[2].trim();
      const pName = singleMatch[3].trim();
      const qty = parseFloat(singleMatch[4].replace(',', '.')) || 1;
      const unitRaw = singleMatch[5].trim().toUpperCase();
      const unit = (unitRaw === 'M' || unitRaw === 'MT') ? 'Metre' : ((unitRaw === 'AD' || unitRaw === 'ADET') ? 'Adet' : unitRaw);

      const rest = rawLine.substring(singleMatch[0].length).trim();
      const priceMatch = rest.match(/₺?\s*(\d+(?:[\.\,]\d+)?)\s+₺?\s*(\d+(?:[\.\,]\d+)?|\d+[\.\,]\d+[\.\,]\d+)/);
      let unitPrice = 0;
      let lineTotal = 0;
      if (priceMatch) {
        unitPrice = parseFloat(priceMatch[1].replace(',', '.')) || 0;
        lineTotal = parseFloat(priceMatch[2].replace(/\./g, '').replace(',', '.')) || (qty * unitPrice);
      }

      orderItems.push({
        lineNo: lineNo++,
        customerProductCode: pCode,
        internalProductCode: `SIES-${pCode.replace(/\s+/g, '-')}`,
        productName: pName,
        productDescription: `${pName} (${pCode})`,
        quantity: qty,
        unit: unit,
        unitPrice: unitPrice,
        currency: 'TRY',
        lineTotal: lineTotal,
        confidenceScore: 0.99,
        status: 'OK'
      });
      currentCode = '';
      descriptionBuffer = [];
      continue;
    }

    // Multi-Line Match Option (Quantity + Unit line completes block)
    const qtyUnitMatch = rawLine.match(/^(\d+(?:[\.\,]\d+)?)\s*(M|MT|ADET|AD|BOY|KG|METRE|SET|PAKET)\b/i);
    if (qtyUnitMatch && (currentCode || descriptionBuffer.length > 0)) {
      const qty = parseFloat(qtyUnitMatch[1].replace(',', '.')) || 1;
      const unitRaw = qtyUnitMatch[2].trim().toUpperCase();
      const unit = (unitRaw === 'M' || unitRaw === 'MT') ? 'Metre' : ((unitRaw === 'AD' || unitRaw === 'ADET') ? 'Adet' : unitRaw);

      let pCode = currentCode;
      let pName = descriptionBuffer.join(' ').trim();

      if (!pCode && descriptionBuffer.length > 0) {
        pCode = descriptionBuffer[0];
        pName = descriptionBuffer.slice(1).join(' ');
      }
      if (!pName) pName = pCode;

      orderItems.push({
        lineNo: lineNo++,
        customerProductCode: pCode,
        internalProductCode: `SIES-${pCode.replace(/\s+/g, '-')}`,
        productName: pName,
        productDescription: `${pName} (${pCode})`,
        quantity: qty,
        unit: unit,
        unitPrice: 0,
        currency: 'TRY',
        lineTotal: 0,
        confidenceScore: 0.99,
        status: 'OK'
      });

      currentCode = '';
      descriptionBuffer = [];
      continue;
    }

    // Code line start
    const codeMatch = rawLine.match(/^([A-Z0-9]{1,10}[\-\/\*\.\_][A-Z0-9\-\/\*\.\_]{1,15})$/i);
    if (codeMatch && !currentCode) {
      currentCode = codeMatch[1].trim();
      descriptionBuffer = [];
      continue;
    }

    // Description line accumulator
    if (currentCode || descriptionBuffer.length > 0) {
      descriptionBuffer.push(rawLine);
    }
  }

  return { customerInfo, orderItems };
}

function parseExcelRows(rows, originalName = '') {
  let customerInfo = {
    name: '',
    taxOffice: '',
    taxNumber: '',
    address: '',
    phone: '',
    email: '',
    orderNo: `SO-XLS-${Math.floor(1000 + Math.random() * 9000)}`,
    orderDate: new Date().toISOString().split('T')[0],
    deliveryDate: ''
  };

  let orderItems = [];
  let lineNo = 1;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length === 0) continue;

    const rowStr = row.join(' ');

    if (!customerInfo.name && (rowStr.includes('Müşteri') || rowStr.includes('Firma') || rowStr.includes('MUSTERI'))) {
      customerInfo.name = String(row[1] || row[2] || '').trim();
    }
    if (rowStr.includes('Vergi') || rowStr.includes('VKN')) {
      const match = rowStr.match(/\d{10,11}/);
      if (match) customerInfo.taxNumber = match[0];
    }
    if (rowStr.includes('Sipariş') || rowStr.includes('Ref')) {
      const match = rowStr.match(/[A-Z0-9\-\/]{4,20}/i);
      if (match) customerInfo.orderNo = match[0];
    }

    // Item row check
    if (row.length >= 3 && row[0] && row[1]) {
      const pCode = String(row[0]).trim();
      const pName = String(row[1]).trim();
      const qtyVal = parseFloat(row[2]);

      if (pCode && pName && !isNaN(qtyVal) && qtyVal > 0) {
        const price = parseFloat(row[3]) || 0;
        const unit = String(row[4] || 'Adet').trim();

        orderItems.push({
          lineNo: lineNo++,
          customerProductCode: pCode,
          internalProductCode: `SIES-${pCode}`,
          productName: pName,
          productDescription: `${pName} (${pCode})`,
          quantity: qtyVal,
          unit: unit,
          unitPrice: price,
          currency: 'TRY',
          lineTotal: qtyVal * price,
          confidenceScore: 0.98,
          status: 'OK'
        });
      }
    }
  }

  if (!customerInfo.name) {
    customerInfo.name = extractCustomerNameFromFilename(originalName) || 'MÜŞTERİ BİLGİSİ (KONTROL BEKLİYOR)';
  }

  return { customerInfo, orderItems };
}

function sanitizeForPdf(str) {
  if (!str) return '';
  return String(str)
    .replace(/Ş/g, 'S').replace(/ş/g, 's')
    .replace(/İ/g, 'I').replace(/i̇/g, 'i').replace(/ı/g, 'i')
    .replace(/Ğ/g, 'G').replace(/ğ/g, 'g')
    .replace(/Ü/g, 'U').replace(/ü/g, 'u')
    .replace(/Ö/g, 'O').replace(/ö/g, 'o')
    .replace(/Ç/g, 'C').replace(/ç/g, 'c')
    .replace(/[^\x00-\x7F]/g, '');
}

async function generatePdfFromText(text, outputPath, title) {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595.28, 841.89]);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

  const cleanTitle = sanitizeForPdf(title);
  page.drawText(`SIES DIJITAL SIPARIS BELGESI: ${cleanTitle}`, {
    x: 40,
    y: 800,
    size: 14,
    color: rgb(0.08, 0.45, 0.75)
  });

  page.drawText(`Olusturulma Tarihi: ${new Date().toISOString()}`, {
    x: 40,
    y: 775,
    size: 9,
    color: rgb(0.4, 0.4, 0.4)
  });

  const lines = text.split('\n').slice(0, 35);
  let y = 730;
  for (const line of lines) {
    const cleanLine = sanitizeForPdf(line);
    page.drawText(cleanLine.slice(0, 80), {
      x: 40,
      y: y,
      size: 9,
      font: font,
      color: rgb(0.2, 0.2, 0.2)
    });
    y -= 18;
    if (y < 50) break;
  }

  const pdfBytes = await pdfDoc.save();
  fs.writeFileSync(outputPath, pdfBytes);
}

async function generatePdfFromExcel(jsonData, outputPath, title) {
  const text = jsonData.map(r => r.join(' | ')).join('\n');
  await generatePdfFromText(text, outputPath, `Excel Sipariş Formu - ${title}`);
}

async function generatePdfFromImage(imagePath, outputPath) {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595.28, 841.89]);
  
  const imgBytes = fs.readFileSync(imagePath);
  const ext = path.extname(imagePath).toLowerCase();
  let image;
  if (ext === '.png') {
    image = await pdfDoc.embedPng(imgBytes);
  } else {
    image = await pdfDoc.embedJpg(imgBytes);
  }

  const { width, height } = image.scaleToFit(500, 750);
  page.drawImage(image, {
    x: 47,
    y: 800 - height - 20,
    width,
    height
  });

  const pdfBytes = await pdfDoc.save();
  fs.writeFileSync(outputPath, pdfBytes);
}
