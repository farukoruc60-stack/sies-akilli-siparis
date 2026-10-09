import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import * as xlsx from 'xlsx';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const fixturesDir = path.join(__dirname, 'test_fixtures');
if (!fs.existsSync(fixturesDir)) {
  fs.mkdirSync(fixturesDir, { recursive: true });
}

async function generateTestFiles() {
  console.log('=== TEST BELGELERİ OLUŞTURULUYOR ===');

  // 1. PDF Order Form
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595.28, 841.89]);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

  page.drawText('MUSTERI SIPARIS FORMU - SIES ELEKTRIK A.S.', { x: 40, y: 800, size: 14, color: rgb(0, 0.4, 0.8) });
  page.drawText('MUSTERI: KOLUMAN LOJISTIK VE SANAYI A.S.', { x: 40, y: 775, size: 10, font });
  page.drawText('Vergi No: 5840192837 | Siparis No: KLS-2026-99', { x: 40, y: 760, size: 10, font });
  page.drawText('Siparis Tarihi: 10.10.2026', { x: 40, y: 745, size: 10, font });

  const itemsText = [
    '1. SIES Agir Hizmet Kablo Kanali 100x50x1.5mm 150 Boy 210.00 TRY',
    '2. SIES Agir Hizmet Kablo Kanali 200x50x2.0mm 80 Boy 380.00 TRY',
    '3. SIES Gecis Elemani 150x60x1.5mm 45 Adet 190.00 TRY',
    '4. SIES Merdiven Tipi Tasiyici 300x100x2.5mm 60 Boy 520.00 TRY'
  ];

  let y = 700;
  for (const line of itemsText) {
    page.drawText(line, { x: 40, y, size: 10, font });
    y -= 20;
  }

  const pdfBytes = await pdfDoc.save();
  const pdfPath = path.join(fixturesDir, 'sample_order.pdf');
  fs.writeFileSync(pdfPath, pdfBytes);
  console.log(`✓ Test PDF Oluşturuldu: ${pdfPath}`);

  // 2. Excel Order Form
  const wb = xlsx.utils.book_new();
  const excelData = [
    ['Müşteri Firma', 'TEKFEN İNŞAAT A.Ş.'],
    ['Vergi No', '9988776655'],
    ['Sipariş Ref', 'TKF-SO-8821'],
    [],
    ['Ürün Kodu', 'Ürün Açıklaması', 'Miktar', 'Birim Fiyat', 'Birim'],
    ['SIES-KK-100', 'Kablo Taşıyıcı Kanal 100x50x1.5mm', 200, 180, 'Boy'],
    ['SIES-KK-300', 'Kablo Taşıyıcı Kanal 300x60x2.0mm', 120, 420, 'Boy'],
    ['SIES-CAP-100', 'Kanal Kapağı 100x1.5mm', 200, 95, 'Boy']
  ];
  const ws = xlsx.utils.aoa_to_sheet(excelData);
  xlsx.utils.book_append_sheet(wb, ws, 'Sipariş Formu');
  const xlsxPath = path.join(fixturesDir, 'sample_order.xlsx');
  xlsx.writeFile(wb, xlsxPath);
  console.log(`✓ Test Excel (XLSX) Oluşturuldu: ${xlsxPath}`);

  // 3. Word Order Form (Text placeholder)
  const docxContent = `MÜŞTERİ SİPARİŞ FORMU
Firma: ZORLU ENERJİ ELEKTRİK ÜRETİM A.Ş.
Vergi No: 1122334455
Sipariş No: ZRL-2026-05

SİPARİŞ KALEMLERİ:
1. Kablo Taşıma Kanalı 150x50x1.5mm - 90 Boy - 240 TRY
2. Dikey Köşe Dönüş Elemanı 150x50x1.5mm - 30 Adet - 180 TRY
`;
  const docxPath = path.join(fixturesDir, 'sample_order.txt');
  fs.writeFileSync(docxPath, docxContent);
  console.log(`✓ Test Metin Belgesi Oluşturuldu: ${docxPath}`);

  console.log('Tüm test belgeleri başarıyla oluşturuldu!');
}

generateTestFiles().catch(console.error);
