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

function fixTurkishEncoding(str) {
  if (!str) return '';
  let s = String(str);
  s = s
    .replace(/Ä°/g, 'İ')
    .replace(/iÌ̇/g, 'i')
    .replace(/Ä±/g, 'ı')
    .replace(/Åž/g, 'Ş')
    .replace(/ÅŸ/g, 'ş')
    .replace(/Äž/g, 'Ğ')
    .replace(/ÄŸ/g, 'ğ')
    .replace(/Ãœ/g, 'Ü')
    .replace(/Ã¼/g, 'ü')
    .replace(/Ã–/g, 'Ö')
    .replace(/Ã¶/g, 'ö')
    .replace(/Ã‡/g, 'Ç')
    .replace(/Ã§/g, 'ç');
  return s;
}

function extractCustomerNameFromFilename(filename) {
  const clean = fixTurkishEncoding(filename.replace(/\.[^/.]+$/, '').replace(/[_|-]/g, ' '));
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

function cleanPdfText(text) {
  if (!text) return '';
  return text
    .replace(/SATÂ±NALMA/gi, 'SATINALMA')
    .replace(/SATINALMA SİPARİŞ FORMU/gi, '')
    .replace(/SİPARİŞ FORMU/gi, '')
    .replace(/SİPARİÂ□I/gi, 'SİPARİŞİ')
    .replace(/Â±/g, 'ı')
    .replace(/Â□/g, 'ş')
    .replace(/Â/g, '')
    .replace(/\uFFFD/g, '');
}

function normalizeText(str) {
  if (!str) return '';
  return cleanPdfText(str)
    .replace(/İ/g, 'I').replace(/i/g, 'i')
    .replace(/ü/g, 'u').replace(/Ü/g, 'U')
    .replace(/ı/g, 'i')
    .replace(/Ö/g, 'O').replace(/ö/g, 'o')
    .replace(/Ş/g, 'S').replace(/ş/g, 's')
    .replace(/Ç/g, 'C').replace(/ç/g, 'c')
    .replace(/Ğ/g, 'G').replace(/ğ/g, 'g');
}

function parseTextContent(rawText, originalName = '') {
  const text = cleanPdfText(rawText);
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

  // 1. CUSTOMER NAME & METADATA EXTRACTION
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Customer Name detection
    if (!customerInfo.name) {
      if (line.includes('BESIKTAS TERSANE') || line.includes('BEŞİKTAŞ TERSANE')) {
        customerInfo.name = 'BEŞİKTAŞ TERSANE A.Ş.';
      } else if (line.includes('ALIA YACHT')) {
        customerInfo.name = 'ALIA YACHT CO.';
      } else if (line.includes('Sirena Marine') || line.includes('Satış YapılanSirena Marine')) {
        customerInfo.name = 'Sirena Marine Denizcilik San Ve Tic AŞ';
      } else {
        const match = line.match(/(?:Satış Yapılan|Müşteri|Firma|Unvan|SEVK ADRESİ|FATURA ADRESİ)\s*:?\s*([A-ZÇĞİÖŞÜa-zçğıöşü0-9\s\.\,\&\-]+)/i);
        if (match) {
          let cName = match[1].trim();
          cName = cName.replace(/^(Tedarikçi|Sipariş|Tarih|Tel|Fax|E mail|VKN|Vergi).*/i, '').trim();
          if (cName.length > 3 && !cName.includes('SİES') && !cName.includes('SIES') && !cName.includes('FATURA')) {
            if (i + 1 < lines.length && /^(Ve\s+Tic|San|A\.Ş|LTD|ŞTİ)/i.test(lines[i + 1])) {
              cName += ' ' + lines[i + 1].trim();
            }
            customerInfo.name = cName;
          }
        }
      }
    }

    // Order No detection (supports P27448, PO-36522, SO-12345, glued Sipariş36522, Sipariş No: 36522)
    if (!customerInfo.orderNo && !line.includes('Sipariş Notu') && !line.includes('Sipariş Tarihi') && !line.includes('Sipariş Açıklama') && !line.includes('NoProje')) {
      const pNoMatch = line.match(/\b(P\d{4,10}|SO\-\d{4,10}|PO\-\d{4,10})\b/i);
      const gluedSipMatch = line.match(/Sipariş\s*([0-9]{4,10})\b/i);

      if (pNoMatch) {
        customerInfo.orderNo = pNoMatch[1];
      } else if (gluedSipMatch) {
        customerInfo.orderNo = gluedSipMatch[1];
      } else {
        const sipNoMatch = line.match(/(?:Sipariş No|Teklif No|Sipariş Ref|Siparis#)\s*:?\s*([A-Z0-9\-\/]{3,25})/i);
        if (sipNoMatch) {
          let no = sipNoMatch[1].trim();
          if (!/^(TARİH|FORMU|MİKTAR|MALZEME|PROJE|DÖVİZ|TUTAR)/i.test(no) && !no.includes('Sipariş')) {
            customerInfo.orderNo = no;
          }
        }
      }
    }

    // Order Date detection
    if (!customerInfo.orderDate || customerInfo.orderDate === new Date().toISOString().split('T')[0]) {
      const dateMatch = line.match(/(?:Sipariş Tarihi|Sip\. Tarihi|Tarih)\s*:?\s*(\d{1,2}[\.\/\-]\d{1,2}[\.\/\-]\d{4})/i);
      if (dateMatch) {
        customerInfo.orderDate = dateMatch[1];
      }
    }

    // Tax Number detection
    if (!customerInfo.taxNumber) {
      const vknMatch = line.match(/\d{10,11}/);
      if (vknMatch && (line.includes('Vergi') || line.includes('VKN') || line.includes('BOĞAZİÇİ'))) {
        customerInfo.taxNumber = vknMatch[0];
      }
    }
  }

  // Fallback Customer Name check if unparsed
  if (!customerInfo.name || customerInfo.name.includes('FATURA')) {
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.includes('SİES ELEKTRİK') || line.includes('SATINALMA SİPARİŞ FORMU')) continue;
      if (line.includes('BEŞİKTAŞ TERSANE') || line.includes('BESIKTAS TERSANE')) {
        customerInfo.name = 'BEŞİKTAŞ TERSANE A.Ş.';
        break;
      }
      const m = line.match(/([A-ZÇĞİÖŞÜ\s]{3,40}\s+(?:SAN|TİC|A\.Ş|LTD|ŞTİ|CO|YACHT|TERSANE)[A-ZÇĞİÖŞÜ\s\.]*)/i);
      if (m && !m[1].includes('SİES') && !m[1].includes('FATURA')) {
        customerInfo.name = m[1].trim();
        break;
      }
    }
  }

  // Fallback Order No if missing
  if (!customerInfo.orderNo) {
    customerInfo.orderNo = `SO-2026-${Math.floor(10000 + Math.random() * 90000)}`;
  }

  // 2. ORDER ITEMS TABLE PARSING STATE MACHINE
  const orderItems = [];
  let currentCode = '';
  let currentDescLines = [];
  let lineNo = 1;

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i].trim();
    if (!rawLine) continue;

    // Skip Header/Footer Boilerplate
    if (
      rawLine.includes('Satınalma Siparişi') ||
      rawLine.includes('SATINALMA SİPARİŞ FORMU') ||
      rawLine.includes('Döküman No') ||
      rawLine.includes('KalemKalem Açıklama') ||
      rawLine.includes('NoProjeMalzeme') ||
      rawLine.includes('Ödeme Koşulları') ||
      rawLine.includes('Genel Notlar') ||
      rawLine.includes('Kişisel Verilerin')
    ) {
      continue;
    }

    // Pattern 1: Single-line Composite PDF Row (e.g. Beşiktaş Tersane: "1-103810 - KABLO YOLU TAKOZU | M8*50 mm60,00adet5.10.2026-0,6000036,00USD")
    const compositeLineMatch = rawLine.match(/^(\d{1,3}[\-\s]+)?([0-9A-Z]{3,15})\s*[\-]\s*(.*?)\s*(\d+(?:[\.\,]\d+)?)\s*(ADET|AD|BOY|KG|METRE|M|MT|SET|PAKET|PCS)\s*(\d{1,2}[\.\/\-]\d{1,2}[\.\/\-]\d{4})?\s*[\-]?\s*(\d+(?:[\.\,]\d+)?)\s*(\d+(?:[\.\,]\d+)?)\s*(TRY|USD|EUR|TL)?$/i);

    // Pattern 2: Glued Multi-line Quantity Row (e.g. Sirena Marine: "26M24.23629.9817/08/2026")
    const gluedQtyMatch = rawLine.match(/^(\d+(?:[\.\,]\d+)?)\s*(M|ADET|AD|BOY|KG|METRE|MT|SET|PAKET|PCS)\s*(\d+[\.\,]\d{2})\s*(\d+[\.\,]\d{2})\s*(\d{1,2}[\.\/\-]\d{1,2}[\.\/\-]\d{4})?/i);

    // Pattern 3: Standard Spaced Quantity Line (e.g. "60,00 adet 5.10.2026 0,6000 36,00 USD")
    const standardQtyMatch = rawLine.match(/(\d+(?:[\.\,]\d+)?)\s*(ADET|AD|BOY|KG|METRE|M|MT|SET|PAKET|PCS)(?=[0-9\s\.\,\-\/\$€₺\b]|$)/i);

    // Pattern 4: Precise Product Code Line Match (Y03003203, 1-103810, SG-10-2A, P27448)
    const productCodeMatch = rawLine.match(/^(Y[0-9]{7,12}|\d{1,3}[\-\/]\d{3,10}|P\d{4,10}|SG[\s\-][0-9A-Z\-]+|KALEM[\-\s]\d+)\s*(.*)/i);

    if (compositeLineMatch) {
      const code = compositeLineMatch[2].trim();
      const desc = compositeLineMatch[3].trim();
      const qty = parseFloat(compositeLineMatch[4].replace(',', '.')) || 1;
      const unitRaw = compositeLineMatch[5].toUpperCase();
      const unit = (unitRaw === 'M' || unitRaw === 'MT') ? 'Metre' : ((unitRaw === 'AD' || unitRaw === 'ADET') ? 'Adet' : unitRaw);
      const unitPrice = parseFloat(compositeLineMatch[7]?.replace(',', '.')) || 0;
      const lineTotal = parseFloat(compositeLineMatch[8]?.replace(',', '.')) || (qty * unitPrice);
      const currency = compositeLineMatch[9] || 'TRY';

      orderItems.push({
        lineNo: lineNo++,
        customerProductCode: code,
        internalProductCode: `SIES-${code.replace(/\s+/g, '-')}`,
        productName: desc || code,
        productDescription: desc || code,
        quantity: qty,
        unit: unit,
        unitPrice: unitPrice,
        currency: currency,
        lineTotal: lineTotal,
        confidenceScore: 0.99,
        status: 'OK'
      });

      currentCode = '';
      currentDescLines = [];
    } else if (productCodeMatch && !gluedQtyMatch && !rawLine.startsWith('Sipariş') && !rawLine.startsWith('Satış') && !rawLine.startsWith('Tedarikçi')) {
      const code = productCodeMatch[1].trim();
      let rest = productCodeMatch[2].trim();

      const inlineQtyMatch = rest.match(/(.*?)\s*(\d+(?:[\.\,]\d+)?)\s*(M|ADET|AD|BOY|KG|METRE|MT|SET|PAKET|PCS)\s*(\d+[\.\,]\d{2})\s*(\d+[\.\,]\d{2})\s*(\d{1,2}[\.\/\-]\d{1,2}[\.\/\-]\d{4})?/i);

      if (inlineQtyMatch) {
        const descPart = inlineQtyMatch[1].trim();
        const qty = parseFloat(inlineQtyMatch[2].replace(',', '.')) || 1;
        const unitRaw = inlineQtyMatch[3].toUpperCase();
        const unit = (unitRaw === 'M' || unitRaw === 'MT') ? 'Metre' : ((unitRaw === 'AD' || unitRaw === 'ADET') ? 'Adet' : unitRaw);
        const unitPrice = parseFloat(inlineQtyMatch[4].replace(',', '.')) || 0;
        const lineTotal = parseFloat(inlineQtyMatch[5].replace(',', '.')) || (qty * unitPrice);

        const fullDesc = [...currentDescLines, descPart].join(' ').trim() || descPart || code;

        orderItems.push({
          lineNo: lineNo++,
          customerProductCode: code,
          internalProductCode: `SIES-${code.replace(/\s+/g, '-')}`,
          productName: fullDesc,
          productDescription: fullDesc,
          quantity: qty,
          unit: unit,
          unitPrice: unitPrice,
          currency: 'TRY',
          lineTotal: lineTotal,
          confidenceScore: 0.99,
          status: 'OK'
        });

        currentCode = '';
        currentDescLines = [];
      } else {
        currentCode = code;
        currentDescLines = rest ? [rest] : [];
      }
    } else if (gluedQtyMatch) {
      const qty = parseFloat(gluedQtyMatch[1].replace(',', '.')) || 1;
      const unitRaw = gluedQtyMatch[2].toUpperCase();
      const unit = (unitRaw === 'M' || unitRaw === 'MT') ? 'Metre' : ((unitRaw === 'AD' || unitRaw === 'ADET') ? 'Adet' : unitRaw);
      const unitPrice = parseFloat(gluedQtyMatch[3].replace(',', '.')) || 0;
      const lineTotal = parseFloat(gluedQtyMatch[4].replace(',', '.')) || (qty * unitPrice);

      const pName = currentDescLines.join(' ').trim() || currentCode || `Kalem-${lineNo}`;
      const pCode = currentCode || `KALEM-${lineNo}`;

      orderItems.push({
        lineNo: lineNo++,
        customerProductCode: pCode,
        internalProductCode: `SIES-${pCode.replace(/\s+/g, '-')}`,
        productName: pName,
        productDescription: pName,
        quantity: qty,
        unit: unit,
        unitPrice: unitPrice,
        currency: 'TRY',
        lineTotal: lineTotal,
        confidenceScore: 0.99,
        status: 'OK'
      });

      currentCode = '';
      currentDescLines = [];
    } else if (standardQtyMatch && !rawLine.includes('Ödeme') && !rawLine.includes('Döviz')) {
      const qty = parseFloat(standardQtyMatch[1].replace(',', '.')) || 1;
      const unitRaw = standardQtyMatch[2].toUpperCase();
      const unit = (unitRaw === 'M' || unitRaw === 'MT') ? 'Metre' : ((unitRaw === 'AD' || unitRaw === 'ADET') ? 'Adet' : unitRaw);

      const textBefore = rawLine.substring(0, standardQtyMatch.index).trim();
      let pCode = currentCode;
      let pName = currentDescLines.join(' ').trim();

      if (textBefore) {
        const codeInBefore = textBefore.match(/^([Y0-9A-Z]{1,4}[\-0-9A-Z\.\_]{3,20})/i);
        if (codeInBefore) {
          pCode = codeInBefore[1].trim();
          const restName = textBefore.substring(codeInBefore[0].length).replace(/^[\s\-\:]+/, '').trim();
          if (restName) pName = pName ? `${pName} ${restName}` : restName;
        } else {
          pName = pName ? `${pName} ${textBefore}` : textBefore;
        }
      }

      const textAfter = rawLine.substring(standardQtyMatch.index + standardQtyMatch[0].length).trim();
      const priceMatch = textAfter.match(/(\d+(?:[\.\,]\d+)?)/);
      let unitPrice = 0;
      if (priceMatch) {
        const pVal = parseFloat(priceMatch[1].replace(',', '.'));
        if (!isNaN(pVal) && pVal < 100000) unitPrice = pVal;
      }

      if (!pCode) pCode = `KALEM-${lineNo}`;
      if (!pName) pName = pCode;

      orderItems.push({
        lineNo: lineNo++,
        customerProductCode: pCode,
        internalProductCode: `SIES-${pCode.replace(/\s+/g, '-')}`,
        productName: pName,
        productDescription: pName,
        quantity: qty,
        unit: unit,
        unitPrice: unitPrice,
        currency: 'TRY',
        lineTotal: qty * unitPrice,
        confidenceScore: 0.99,
        status: 'OK'
      });

      currentCode = '';
      currentDescLines = [];
    } else {
      if (currentCode && !rawLine.startsWith('Toplam') && !rawLine.startsWith('Ara Toplam') && !rawLine.startsWith('Sayfa')) {
        currentDescLines.push(rawLine);
      } else if (orderItems.length > 0 && (rawLine.startsWith('KANALI') || rawLine.startsWith('DELİKLİ') || rawLine.includes('RAL9001'))) {
        const lastItem = orderItems[orderItems.length - 1];
        lastItem.productName += ' ' + rawLine;
        lastItem.productDescription += ' ' + rawLine;
      }
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
    orderNo: '',
    orderDate: new Date().toISOString().split('T')[0],
    deliveryDate: ''
  };

  let orderItems = [];
  let lineNo = 1;

  // 1. HEADER & METADATA SCANNING
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length === 0) continue;

    for (let c = 0; c < row.length; c++) {
      const val = fixTurkishEncoding(String(row[c] || '')).trim();
      const upper = val.toUpperCase();

      // Müşteri unvanı
      if (upper === 'MÜŞTERİ BİLGİLERİ' || upper === 'MUSTERI BILGILERI') {
        for (let rOffset = 1; rOffset <= 3; rOffset++) {
          const nextRow = rows[i + rOffset];
          if (nextRow) {
            for (let cOffset = c; cOffset < nextRow.length; cOffset++) {
              const targetVal = fixTurkishEncoding(String(nextRow[cOffset] || '')).trim();
              const tu = targetVal.toUpperCase();
              if (targetVal && tu !== 'UNVAN' && !tu.includes('SIES') && !tu.includes('ELEKTRİK') && !tu.includes('ELEKTRIK') && targetVal.length > 2) {
                customerInfo.name = targetVal;
                break;
              }
            }
            if (customerInfo.name) break;
          }
        }
      }

      if (!customerInfo.name && (upper === 'UNVAN' || upper === 'FİRMA' || upper === 'MÜŞTERİ' || upper === 'MÜŞTERİ FİRMA')) {
        const rightVal = fixTurkishEncoding(String(row[c+1] || row[c+2] || '')).trim();
        const ru = rightVal.toUpperCase();
        if (rightVal && !ru.includes('SIES') && !ru.includes('ELEKTRİK') && !ru.includes('ELEKTRIK') && rightVal.length > 2) {
          customerInfo.name = rightVal;
        }
      }

      // Order No
      if (!customerInfo.orderNo) {
        if (upper.includes('TEKLİF NO') || upper.includes('SİPARİŞ NO') || upper.includes('SİPARİŞ REF')) {
          const rightVal = String(row[c+1] || '').trim();
          const belowVal = rows[i+1] ? String(rows[i+1][c] || '').trim() : '';
          const candidate = (rightVal && rightVal.length >= 4 && !rightVal.toUpperCase().includes('TEKLİF')) ? rightVal : belowVal;
          if (candidate && candidate.length >= 4 && !candidate.toUpperCase().includes('TEKLİF')) {
            customerInfo.orderNo = candidate;
          }
        }
      }

      // Order Date
      if (!customerInfo.orderDate || customerInfo.orderDate === new Date().toISOString().split('T')[0]) {
        if (upper.includes('TEKLİF TARİHİ') || upper.includes('SİPARİŞ TARİHİ') || upper === 'TARİH') {
          const belowVal = rows[i+1] ? rows[i+1][c] : null;
          const rightVal = row[c+1];
          const rawDate = belowVal || rightVal;
          if (typeof rawDate === 'number' && rawDate > 30000 && rawDate < 60000) {
            const dateObj = new Date((rawDate - 25569) * 86400 * 1000);
            const dd = String(dateObj.getDate()).padStart(2, '0');
            const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
            const yyyy = dateObj.getFullYear();
            customerInfo.orderDate = `${dd}.${mm}.${yyyy}`;
          } else if (typeof rawDate === 'string' && /\d{2}\.\d{2}\.\d{4}/.test(rawDate)) {
            customerInfo.orderDate = rawDate;
          }
        }
      }

      // Vergi No
      if (!customerInfo.taxNumber && (upper.includes('VERGİ') || upper.includes('VKN'))) {
        const match = val.match(/\d{10,11}/);
        if (match) customerInfo.taxNumber = match[0];
      }
    }
  }

  // Fallback Customer Name
  if (!customerInfo.name) {
    customerInfo.name = extractCustomerNameFromFilename(originalName) || 'MÜŞTERİ BİLGİSİ (KONTROL BEKLİYOR)';
  }
  if (!customerInfo.orderNo) {
    customerInfo.orderNo = `SO-XLS-${Math.floor(1000 + Math.random() * 9000)}`;
  }

  // 2. FIND ITEM TABLE HEADER ROW
  let headerRowIndex = -1;
  let codeCol = -1;
  let nameCol = -1;
  let qtyCol = -1;
  let unitCol = -1;
  let priceCol = -1;
  let totalCol = -1;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length === 0) continue;

    const rowStrArr = row.map(c => fixTurkishEncoding(String(c || '')).toUpperCase());

    const hasCode = rowStrArr.some(s => s.includes('KOD') || s.includes('SİPARİŞ KODU'));
    const hasName = rowStrArr.some(s => s.includes('AÇIKLAMA') || s.includes('TANIM') || s.includes('ÜRÜN AÇIKLAMASI'));
    const hasQty = rowStrArr.some(s => s.includes('MİKTAR') || s.includes('QTY'));

    if ((hasCode || hasName) && hasQty) {
      headerRowIndex = i;
      rowStrArr.forEach((cellText, colIdx) => {
        if (cellText.includes('KOD')) codeCol = colIdx;
        else if (cellText.includes('AÇIKLAMA') || cellText.includes('TANIM')) nameCol = colIdx;
        else if (cellText.includes('MİKTAR')) qtyCol = colIdx;
        else if (cellText.includes('BİRİM FİYAT') || cellText.includes('FİYAT')) priceCol = colIdx;
        else if (cellText.includes('BİRİM') && !cellText.includes('FİYAT')) unitCol = colIdx;
        else if (cellText.includes('TOPLAM')) totalCol = colIdx;
      });
      break;
    }
  }

  // 3. EXTRACT ITEMS
  const startRow = headerRowIndex !== -1 ? headerRowIndex + 1 : 0;
  for (let i = startRow; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length === 0) continue;

    const rowStr = row.map(c => fixTurkishEncoding(String(c || ''))).join(' ').toUpperCase();

    // Stop at bottom summary rows
    if (rowStr.includes('TOPLAM') && (rowStr.includes('GENEL') || rowStr.includes('NET') || rowStr.includes('AVANS') || rowStr.includes('ÖDEME') || rowStr.includes('TESLİM'))) {
      if (headerRowIndex !== -1) break;
    }

    if (headerRowIndex !== -1) {
      const codeVal = codeCol !== -1 ? fixTurkishEncoding(String(row[codeCol] || '')).trim() : '';
      const nameVal = nameCol !== -1 ? fixTurkishEncoding(String(row[nameCol] || '')).trim() : '';
      const qtyRaw = qtyCol !== -1 ? row[qtyCol] : null;
      const qtyVal = parseFloat(String(qtyRaw || '').replace(',', '.'));
      const unitVal = unitCol !== -1 ? fixTurkishEncoding(String(row[unitCol] || 'Metre')).trim() : 'Adet';
      const priceVal = priceCol !== -1 ? parseFloat(String(row[priceCol] || '0').replace(',', '.')) : 0;

      if ((codeVal || nameVal) && !isNaN(qtyVal) && qtyVal > 0) {
        const pCode = codeVal || `KALEM-${lineNo}`;
        const pName = nameVal || pCode;
        const unit = (unitVal === 'M' || unitVal === 'MT') ? 'Metre' : ((unitVal === 'AD' || unitVal === 'ADET') ? 'Adet' : unitVal);

        orderItems.push({
          lineNo: lineNo++,
          customerProductCode: pCode,
          internalProductCode: `SIES-${pCode.replace(/\s+/g, '-')}`,
          productName: pName,
          productDescription: `${pName} (${pCode})`,
          quantity: qtyVal,
          unit: unit,
          unitPrice: isNaN(priceVal) ? 0 : priceVal,
          currency: 'TRY',
          lineTotal: qtyVal * (isNaN(priceVal) ? 0 : priceVal),
          confidenceScore: 0.99,
          status: 'OK'
        });
      }
    } else {
      // Fallback for simple rows
      if (row.length >= 3) {
        const pCode = fixTurkishEncoding(String(row[0] || '')).trim();
        const pName = fixTurkishEncoding(String(row[1] || '')).trim();
        const qtyVal = parseFloat(String(row[2] || '').replace(',', '.'));
        if (pCode && pName && !isNaN(qtyVal) && qtyVal > 0) {
          const price = parseFloat(String(row[3] || '0').replace(',', '.')) || 0;
          const unit = fixTurkishEncoding(String(row[4] || 'Adet')).trim();
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
  }

  return { customerInfo, orderItems };
}

function sanitizeForPdf(str) {
  if (!str) return '';
  const fixed = fixTurkishEncoding(str);
  return fixed
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/Ş/g, 'S').replace(/ş/g, 's')
    .replace(/İ/g, 'I').replace(/ı/g, 'i').replace(/i̇/g, 'i')
    .replace(/Ğ/g, 'G').replace(/ğ/g, 'g')
    .replace(/Ü/g, 'U').replace(/ü/g, 'u')
    .replace(/Ö/g, 'O').replace(/ö/g, 'o')
    .replace(/Ç/g, 'C').replace(/ç/g, 'c')
    .replace(/[^\x20-\x7E\s]/g, '')
    .replace(/\s+/g, ' ');
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
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const pageWidth = 841.89;
  const pageHeight = 595.28;
  const margin = 25;
  const tableWidth = pageWidth - margin * 2;
  
  let page = pdfDoc.addPage([pageWidth, pageHeight]);

  // Header Banner
  page.drawRectangle({
    x: margin,
    y: pageHeight - 48,
    width: tableWidth,
    height: 32,
    color: rgb(0.08, 0.45, 0.75)
  });

  page.drawText(sanitizeForPdf('SIES DIJITAL BELGE SISTEMI - EXCEL CANLI BELGE GORUNTULEME'), {
    x: margin + 12,
    y: pageHeight - 34,
    size: 10,
    font: boldFont,
    color: rgb(1, 1, 1)
  });

  const cleanTitle = sanitizeForPdf(title);
  page.drawText(cleanTitle.slice(0, 80), {
    x: margin + 12,
    y: pageHeight - 44,
    size: 7.5,
    font: font,
    color: rgb(0.9, 0.95, 1)
  });

  // Determine Effective Columns
  let maxCols = 0;
  jsonData.forEach(r => { if (r && r.length > maxCols) maxCols = r.length; });
  if (maxCols === 0) maxCols = 1;

  let effectiveCols = maxCols;
  for (let c = maxCols - 1; c >= 0; c--) {
    const hasData = jsonData.some(r => r && r[c] !== undefined && String(r[c]).trim() !== '');
    if (hasData) {
      effectiveCols = c + 1;
      break;
    }
  }

  // Calculate dynamic column widths based on maximum content length
  const colWeights = [];
  for (let c = 0; c < effectiveCols; c++) {
    let maxLen = 4;
    jsonData.forEach(r => {
      if (r && r[c] !== undefined && r[c] !== null) {
        const str = sanitizeForPdf(String(r[c])).trim();
        if (str.length > maxLen) maxLen = Math.min(str.length, 50);
      }
    });
    colWeights.push(maxLen);
  }

  const totalWeight = colWeights.reduce((a, b) => a + b, 0) || 1;
  const colWidths = colWeights.map(w => (w / totalWeight) * tableWidth);

  const rowHeight = 18;
  let y = pageHeight - 65;

  for (let rIdx = 0; rIdx < jsonData.length; rIdx++) {
    const row = jsonData[rIdx];
    
    // Page overflow check
    if (y < margin + 25) {
      page = pdfDoc.addPage([pageWidth, pageHeight]);
      y = pageHeight - margin - 20;
    }

    const isHeaderRow = row && row.some(cell => {
      const s = sanitizeForPdf(cell).toUpperCase();
      return s.includes('SIRA NO') || s.includes('SIPARIS KODU') || s.includes('ACIKLAMA') || s.includes('MIKTAR') || s.includes('UNVAN');
    });

    if (isHeaderRow) {
      page.drawRectangle({
        x: margin,
        y: y - rowHeight + 3,
        width: tableWidth,
        height: rowHeight,
        color: rgb(0.88, 0.93, 0.98)
      });
    } else if (rIdx % 2 === 1) {
      page.drawRectangle({
        x: margin,
        y: y - rowHeight + 3,
        width: tableWidth,
        height: rowHeight,
        color: rgb(0.98, 0.98, 0.99)
      });
    }

    let xPos = margin;
    for (let cIdx = 0; cIdx < effectiveCols; cIdx++) {
      const cWidth = colWidths[cIdx];
      const cellVal = (row && row[cIdx] !== undefined && row[cIdx] !== null) ? String(row[cIdx]) : '';
      const cleanVal = sanitizeForPdf(cellVal).trim();

      page.drawRectangle({
        x: xPos,
        y: y - rowHeight + 3,
        width: cWidth,
        height: rowHeight,
        borderColor: rgb(0.82, 0.85, 0.90),
        borderWidth: 0.5
      });

      if (cleanVal) {
        const currentFont = isHeaderRow ? boldFont : font;
        let fontSize = isHeaderRow ? 8 : 7.5;
        let txt = cleanVal;
        
        while (txt.length > 1 && currentFont.widthOfTextAtSize(txt, fontSize) > cWidth - 4) {
          txt = txt.slice(0, -1);
        }

        page.drawText(txt, {
          x: xPos + 3,
          y: y - rowHeight + 7,
          size: fontSize,
          font: currentFont,
          color: isHeaderRow ? rgb(0.08, 0.25, 0.5) : rgb(0.15, 0.15, 0.15)
        });
      }

      xPos += cWidth;
    }

    y -= rowHeight;
  }

  const pdfBytes = await pdfDoc.save();
  fs.writeFileSync(outputPath, pdfBytes);
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

export async function generateProductionFormPdf(order, items, outputPath, formNotes = '') {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595.28, 841.89]);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const pageWidth = 595.28;
  const pageHeight = 841.89;
  const margin = 35;
  const contentWidth = pageWidth - margin * 2;

  // 1. Header Banner
  page.drawRectangle({
    x: margin,
    y: pageHeight - 75,
    width: contentWidth,
    height: 45,
    color: rgb(0.08, 0.25, 0.5)
  });

  page.drawText(sanitizeForPdf('SIES ELEKTRIK & METAL A.S.'), {
    x: margin + 12,
    y: pageHeight - 48,
    size: 14,
    font: boldFont,
    color: rgb(1, 1, 1)
  });

  page.drawText(sanitizeForPdf('RESMI URETIM IS EMRI FORMU'), {
    x: margin + 12,
    y: pageHeight - 65,
    size: 10,
    font: font,
    color: rgb(0.8, 0.9, 1)
  });

  const formDate = new Date().toLocaleDateString('tr-TR');
  const formCode = `FORM-URETIM-${order.order_no || 'SO'}`;

  page.drawText(sanitizeForPdf(`Tarih: ${formDate}`), {
    x: pageWidth - margin - 140,
    y: pageHeight - 48,
    size: 9,
    font: boldFont,
    color: rgb(1, 1, 1)
  });

  page.drawText(sanitizeForPdf(`Form No: ${formCode}`), {
    x: pageWidth - margin - 140,
    y: pageHeight - 65,
    size: 8,
    font: font,
    color: rgb(0.8, 0.9, 1)
  });

  // 2. Order & Customer Info Card
  let y = pageHeight - 95;
  page.drawRectangle({
    x: margin,
    y: y - 65,
    width: contentWidth,
    height: 65,
    color: rgb(0.96, 0.97, 0.99),
    borderColor: rgb(0.85, 0.88, 0.92),
    borderWidth: 1
  });

  const custName = sanitizeForPdf(order.customer_name || 'MUSTERI BILGISI');
  const orderNo = sanitizeForPdf(order.order_no || '-');
  const custOrderNo = sanitizeForPdf(order.customer_order_no || '-');
  const reqDate = sanitizeForPdf(order.requested_delivery_date || 'Belirtilmedi');

  page.drawText(sanitizeForPdf('Musteri Unvani:'), { x: margin + 12, y: y - 20, size: 8.5, font: boldFont, color: rgb(0.3, 0.3, 0.3) });
  page.drawText(custName.slice(0, 45), { x: margin + 95, y: y - 20, size: 9, font: boldFont, color: rgb(0.08, 0.25, 0.5) });

  page.drawText(sanitizeForPdf('Siparis No:'), { x: margin + 12, y: y - 38, size: 8.5, font: boldFont, color: rgb(0.3, 0.3, 0.3) });
  page.drawText(orderNo, { x: margin + 95, y: y - 38, size: 8.5, font: font, color: rgb(0.1, 0.1, 0.1) });

  page.drawText(sanitizeForPdf('Musteri Ref No:'), { x: margin + 12, y: y - 54, size: 8.5, font: boldFont, color: rgb(0.3, 0.3, 0.3) });
  page.drawText(custOrderNo, { x: margin + 95, y: y - 54, size: 8.5, font: font, color: rgb(0.1, 0.1, 0.1) });

  page.drawText(sanitizeForPdf('Teslim Tarihi:'), { x: margin + 310, y: y - 20, size: 8.5, font: boldFont, color: rgb(0.3, 0.3, 0.3) });
  page.drawText(reqDate, { x: margin + 380, y: y - 20, size: 8.5, font: font, color: rgb(0.1, 0.1, 0.1) });

  page.drawText(sanitizeForPdf('Uretime Verilen:'), { x: margin + 310, y: y - 38, size: 8.5, font: boldFont, color: rgb(0.3, 0.3, 0.3) });
  page.drawText(sanitizeForPdf(`${items.length} Kalem Urun`), { x: margin + 380, y: y - 38, size: 8.5, font: boldFont, color: rgb(0.0, 0.5, 0.4) });

  y -= 80;

  // 3. Section Title
  page.drawText(sanitizeForPdf('URETIMDE IMAL EDILECEK KALEMLER LISTESI'), {
    x: margin,
    y: y,
    size: 10,
    font: boldFont,
    color: rgb(0.08, 0.25, 0.5)
  });

  y -= 15;

  // 4. Table Header
  const headers = ['#', 'URUN KODU', 'URUN ACIKLAMASI / OZELLIKLER', 'MIKTAR', 'BIRIM', 'DURUM'];
  const colWidths = [25, 110, 230, 55, 45, 60];
  const rowHeight = 20;

  page.drawRectangle({
    x: margin,
    y: y - rowHeight + 3,
    width: contentWidth,
    height: rowHeight,
    color: rgb(0.12, 0.3, 0.55)
  });

  let xPos = margin;
  headers.forEach((h, idx) => {
    page.drawText(sanitizeForPdf(h), {
      x: xPos + 4,
      y: y - rowHeight + 8,
      size: 7.5,
      font: boldFont,
      color: rgb(1, 1, 1)
    });
    xPos += colWidths[idx];
  });

  y -= rowHeight;

  // 5. Table Rows
  items.forEach((item, idx) => {
    const isEven = idx % 2 === 0;
    page.drawRectangle({
      x: margin,
      y: y - rowHeight + 3,
      width: contentWidth,
      height: rowHeight,
      color: isEven ? rgb(0.98, 0.99, 1.0) : rgb(0.93, 0.95, 0.98),
      borderColor: rgb(0.85, 0.88, 0.92),
      borderWidth: 0.5
    });

    const lineNoStr = String(item.lineNo || item.line_no || idx + 1);
    const codeStr = sanitizeForPdf(item.customerProductCode || item.customer_product_code || '-');
    const nameStr = sanitizeForPdf(item.productName || item.product_name || 'Urun');
    const qtyStr = String(item.quantity || 1);
    const unitStr = sanitizeForPdf(item.unit || 'Adet');
    const statusStr = 'URETIMDE';

    const rowData = [lineNoStr, codeStr, nameStr, qtyStr, unitStr, statusStr];

    let cellX = margin;
    rowData.forEach((val, cIdx) => {
      const cWidth = colWidths[cIdx];
      let txt = val;
      const currentFont = cIdx === 1 ? boldFont : font;
      let fontSize = 7.5;

      while (txt.length > 1 && currentFont.widthOfTextAtSize(txt, fontSize) > cWidth - 6) {
        txt = txt.slice(0, -1);
      }

      page.drawText(txt, {
        x: cellX + 4,
        y: y - rowHeight + 7,
        size: fontSize,
        font: currentFont,
        color: cIdx === 5 ? rgb(0.0, 0.5, 0.3) : rgb(0.15, 0.15, 0.15)
      });

      cellX += cWidth;
    });

    y -= rowHeight;
  });

  // 6. Notes & Work Instructions Box
  y -= 15;
  page.drawRectangle({
    x: margin,
    y: y - 55,
    width: contentWidth,
    height: 55,
    color: rgb(0.99, 0.98, 0.93),
    borderColor: rgb(0.95, 0.9, 0.7),
    borderWidth: 1
  });

  page.drawText(sanitizeForPdf('URETIM NOTLARI VE IMALAT TALIMATLARI:'), {
    x: margin + 8,
    y: y - 16,
    size: 8,
    font: boldFont,
    color: rgb(0.6, 0.4, 0.0)
  });

  const notesText = formNotes
    ? sanitizeForPdf(formNotes)
    : '1. Tum imalat SIES TS 822 kalite standartlarina uygun teknik resim ve tolerans araliklarinda yapilacaktir. 2. Uretim tamamlandiktan sonra Kalite Kontrol birimi tarafindan olculerek kaplama hattina sevk edilecektir.';

  page.drawText(notesText.slice(0, 140), {
    x: margin + 8,
    y: y - 32,
    size: 7.5,
    font: font,
    color: rgb(0.2, 0.2, 0.2)
  });

  if (notesText.length > 140) {
    page.drawText(notesText.slice(140, 280), {
      x: margin + 8,
      y: y - 44,
      size: 7.5,
      font: font,
      color: rgb(0.2, 0.2, 0.2)
    });
  }

  // 7. Signatures Box (Bottom of page)
  const sigY = 90;
  const boxWidth = (contentWidth - 20) / 3;

  const sigBoxes = [
    { title: 'HAZIRLAYAN (SIPARIS AMIRI)', name: sanitizeForPdf(order.creator_name || 'Sistem') },
    { title: 'URETIM AMIRI (IMALAT)', name: 'Imza / Tarih' },
    { title: 'KALITE KONTROL', name: 'Onay / Tarih' }
  ];

  sigBoxes.forEach((box, bIdx) => {
    const boxX = margin + bIdx * (boxWidth + 10);
    page.drawRectangle({
      x: boxX,
      y: sigY - 50,
      width: boxWidth,
      height: 50,
      color: rgb(0.97, 0.97, 0.98),
      borderColor: rgb(0.85, 0.88, 0.92),
      borderWidth: 1
    });

    page.drawText(sanitizeForPdf(box.title), {
      x: boxX + 6,
      y: sigY - 14,
      size: 7,
      font: boldFont,
      color: rgb(0.3, 0.3, 0.3)
    });

    page.drawText(sanitizeForPdf(box.name), {
      x: boxX + 6,
      y: sigY - 38,
      size: 7.5,
      font: font,
      color: rgb(0.5, 0.5, 0.5)
    });
  });

  const pdfBytes = await pdfDoc.save();
  fs.writeFileSync(outputPath, pdfBytes);
}

