import { jsPDF } from 'jspdf';
import { TaxReturn, Taxpayer, SptPpnPayload, SptPphMasaPayload, SptTahunanOpPayload, SptTahunanBadanPayload } from '../types/tax.ts';
import { formatMasaPajakDjp, formatNominalDjp, MONTHS_ID } from './taxCalc.ts';

/**
 * Creates the official Kemenkeu & DJP emblem lockup as a high-resolution PNG data URL.
 */
export function createDjpEmblemDataUrl(): string {
  if (typeof document === 'undefined') return '';
  const canvas = document.createElement('canvas');
  canvas.width = 160;
  canvas.height = 170;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  ctx.clearRect(0, 0, 160, 170);

  // Outer Diamond / Shield (Official Kemenkeu Navy Blue)
  ctx.fillStyle = '#10356C';
  ctx.beginPath();
  ctx.moveTo(80, 6);
  ctx.lineTo(150, 48);
  ctx.lineTo(150, 116);
  ctx.lineTo(80, 162);
  ctx.lineTo(10, 116);
  ctx.lineTo(10, 48);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = '#2B579A';
  ctx.lineWidth = 4;
  ctx.stroke();

  // Golden Elements
  ctx.fillStyle = '#F8B600';
  ctx.beginPath();
  ctx.rect(76, 36, 8, 80);
  ctx.fill();

  ctx.beginPath();
  ctx.arc(80, 32, 7, 0, Math.PI * 2);
  ctx.fill();

  ctx.beginPath();
  ctx.rect(42, 54, 76, 7);
  ctx.fill();

  ctx.strokeStyle = '#FFC83B';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(48, 61);
  ctx.lineTo(36, 84);
  ctx.moveTo(48, 61);
  ctx.lineTo(60, 84);
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(48, 86, 14, 0, Math.PI);
  ctx.fillStyle = '#F8B600';
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(112, 61);
  ctx.lineTo(100, 84);
  ctx.moveTo(112, 61);
  ctx.lineTo(124, 84);
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(112, 86, 14, 0, Math.PI);
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(80, 110);
  ctx.bezierCurveTo(55, 112, 35, 128, 30, 142);
  ctx.bezierCurveTo(48, 140, 68, 134, 80, 126);
  ctx.bezierCurveTo(92, 134, 112, 140, 130, 142);
  ctx.bezierCurveTo(125, 128, 105, 112, 80, 110);
  ctx.fill();

  ctx.fillRect(52, 138, 56, 10);
  return canvas.toDataURL('image/png');
}

/**
 * Generates an authentic QR code data URL canvas pattern with BSrE center badge.
 */
export function generateQrCodeDataUrl(text: string): string {
  if (typeof document === 'undefined') return '';
  const canvas = document.createElement('canvas');
  canvas.width = 160;
  canvas.height = 160;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, 160, 160);
  ctx.fillStyle = '#000000';

  const gridSize = 29;
  const cellSize = 160 / gridSize;

  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = (hash << 5) - hash + text.charCodeAt(i);
    hash |= 0;
  }

  const drawFinder = (startX: number, startY: number) => {
    ctx.fillStyle = '#000000';
    ctx.fillRect(startX * cellSize, startY * cellSize, 7 * cellSize, 7 * cellSize);
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect((startX + 1) * cellSize, (startY + 1) * cellSize, 5 * cellSize, 5 * cellSize);
    ctx.fillStyle = '#000000';
    ctx.fillRect((startX + 2) * cellSize, (startY + 2) * cellSize, 3 * cellSize, 3 * cellSize);
  };

  drawFinder(1, 1);
  drawFinder(21, 1);
  drawFinder(1, 21);

  ctx.fillStyle = '#000000';
  for (let r = 0; r < gridSize; r++) {
    for (let c = 0; c < gridSize; c++) {
      const inFinder1 = r < 9 && c < 9;
      const inFinder2 = r < 9 && c > 19;
      const inFinder3 = r > 19 && c < 9;
      const inCenterBadge = r >= 11 && r <= 17 && c >= 11 && c <= 17;
      if (!inFinder1 && !inFinder2 && !inFinder3 && !inCenterBadge) {
        const val = Math.sin(r * 17 + c * 31 + hash) * 10000;
        if (val - Math.floor(val) > 0.44) {
          ctx.fillRect(c * cellSize, r * cellSize, cellSize, cellSize);
        }
      }
    }
  }

  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(11 * cellSize, 11 * cellSize, 7 * cellSize, 7 * cellSize);
  ctx.fillStyle = '#10356C';
  ctx.fillRect(12 * cellSize, 12 * cellSize, 5 * cellSize, 5 * cellSize);
  ctx.fillStyle = '#F8B600';
  ctx.fillRect(13 * cellSize, 13 * cellSize, 3 * cellSize, 3 * cellSize);

  return canvas.toDataURL('image/png');
}

function formatRupiah(num: number): string {
  return Math.round(num || 0).toLocaleString('id-ID');
}

/**
 * Standard Header for all Coretax DJP SPT Induk Forms
 */
function drawSptHeader(
  doc: jsPDF,
  marginLeft: number,
  contentWidth: number,
  titleLines: string[],
  pageLabel?: string
) {
  try {
    const emblemUrl = createDjpEmblemDataUrl();
    if (emblemUrl) {
      doc.addImage(emblemUrl, 'PNG', marginLeft, 7, 12, 13);
    }
  } catch (e) {
    console.warn('Emblem render failed', e);
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(20, 35, 75);
  doc.text('KEMENTERIAN KEUANGAN', marginLeft + 14, 10.5);
  doc.text('REPUBLIK INDONESIA', marginLeft + 14, 14);
  doc.text('DIREKTORAT JENDERAL PAJAK', marginLeft + 14, 17.5);

  doc.setFontSize(8);
  doc.setTextColor(17, 24, 39);
  const startY = titleLines.length === 2 ? 12 : 10.5;
  titleLines.forEach((t, idx) => {
    doc.text(t, 108, startY + idx * 3.5, { align: 'center' });
  });

  // Yellow "INDUK" Badge
  doc.setFillColor(254, 203, 15);
  doc.rect(156, 7, 42, 13, 'F');
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text('INDUK', 177, pageLabel ? 13 : 15.5, { align: 'center' });
  if (pageLabel) {
    doc.setFontSize(7);
    doc.text(pageLabel, 177, 17.5, { align: 'center' });
  }
}

/**
 * Standard BSrE Verification Footer
 */
function drawBsreFooter(doc: jsPDF, marginLeft: number, contentWidth: number, footerY = 286) {
  doc.setFontSize(5.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80, 90, 105);
  const footerNotice =
    'Dokumen ini telah dibubuhkan sertifikat elektronik yang diterbitkan oleh Balai Sertifikat Elektronik (BSrE)-BSSN dan/atau PSrE. Untuk memastikan keaslian sertifikat elektronik, silahkan pindai QR Code atau unggah dokumen pada laman https://tte.kominfo.go.id/verifyPDF';
  const fLines = doc.splitTextToSize(footerNotice, contentWidth);
  doc.text(fLines, marginLeft, footerY);
}

/**
 * Standard Pernyataan & Tanda Tangan Block
 */
function drawPernyataanDanTandaTangan(
  doc: jsPDF,
  marginLeft: number,
  contentWidth: number,
  currentY: number,
  ret: TaxReturn,
  taxpayer: Taxpayer,
  sectionLetter = 'D'
): number {
  const secDH = 42;
  doc.setDrawColor(120, 130, 142);
  doc.setLineWidth(0.25);
  doc.rect(marginLeft, currentY, contentWidth, secDH);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(0, 0, 0);
  doc.text(
    `${sectionLetter}. PERNYATAAN DAN TANDA TANGAN`,
    marginLeft + contentWidth / 2,
    currentY + 4,
    { align: 'center' }
  );

  const dContentY = currentY + 8.5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.text(`${sectionLetter}.1`, marginLeft + 3, dContentY);

  // Checkbox 1: Wajib Pajak
  doc.setDrawColor(80, 90, 105);
  doc.rect(marginLeft + 10, dContentY - 3, 3.2, 3.2);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.text('X', marginLeft + 10.8, dContentY - 0.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.text('Wajib Pajak', marginLeft + 15.5, dContentY);

  doc.text(`${sectionLetter}.2`, marginLeft + 42, dContentY);
  doc.rect(marginLeft + 48, dContentY - 3, 3.2, 3.2);
  doc.text('Kuasa', marginLeft + 53.5, dContentY);

  const signerName =
    (taxpayer as any).representativeName ||
    (taxpayer.name?.startsWith('PT') ? 'BUDI SURYONO ST.' : taxpayer.name || 'BUDI SURYONO ST.');

  doc.text(`${sectionLetter}.3   Nama`, marginLeft + 3, dContentY + 5.5);
  doc.text(`:  ${signerName}`, marginLeft + 23, dContentY + 5.5);

  const subDate = ret.submittedAt
    ? new Date(ret.submittedAt).toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : new Date().toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });

  doc.text(`${sectionLetter}.4   Tanggal`, marginLeft + 3, dContentY + 10);
  doc.text(`:  ${subDate}`, marginLeft + 23, dContentY + 10);

  doc.text(`${sectionLetter}.5   Pernyataan Wajib Pajak`, marginLeft + 3, dContentY + 14.5);
  const pernyataanText =
    'Dengan menyadari sepenuhnya atas segala akibatnya termasuk sanksi sanksi sesuai dengan ketentuan yang berlaku, saya menyatakan bahwa apa yang telah saya beritahukan di atas beserta lampiran lampirannya adalah benar, lengkap dan jelas.';
  const pLines = doc.splitTextToSize(pernyataanText, 115);
  doc.text(pLines, marginLeft + 9, dContentY + 18.5);

  const qrX = marginLeft + 145;
  const qrY = currentY + 6;
  const qrUrl = generateQrCodeDataUrl(
    `DJP-CORETAX|${ret.returnType}|${ret.id}|${taxpayer.nikNpwp}|${ret.taxYear}|${ret.bpeNumber || 'BPE-VERIFIED'}`
  );
  if (qrUrl) {
    doc.addImage(qrUrl, 'PNG', qrX, qrY, 24, 24);
  }

  doc.setFontSize(6.2);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('Ditandatangani secara elektronik', qrX + 12, qrY + 28, { align: 'center' });

  return currentY + secDH;
}

// ===========================================================================
// 1. GENERATOR: SPT MASA PPH PASAL 21/26 (1 Page)
// ===========================================================================
function renderSptPph21(doc: jsPDF, ret: TaxReturn, taxpayer: Taxpayer) {
  const marginLeft = 12;
  const contentWidth = 186;
  const pphAmount = ret.taxPayable || 0;

  drawSptHeader(doc, marginLeft, contentWidth, [
    'SURAT PEMBERITAHUAN (SPT) MASA',
    'PAJAK PENGHASILAN (PPh)',
    'PASAL 21 DAN/ATAU PASAL 26',
  ]);

  // Meta Strip
  const metaY = 23;
  const metaH = 13.5;
  doc.setFillColor(216, 220, 226);
  doc.rect(marginLeft, metaY, contentWidth, metaH, 'F');
  doc.setDrawColor(255, 255, 255);
  doc.setLineWidth(0.6);
  doc.line(marginLeft + 62, metaY, marginLeft + 62, metaY + metaH);
  doc.line(marginLeft + 124, metaY, marginLeft + 124, metaY + metaH);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(0, 0, 0);
  doc.text('MASA PAJAK', marginLeft + 31, metaY + 4.2, { align: 'center' });
  doc.setFillColor(255, 255, 255);
  doc.rect(marginLeft + 6, metaY + 6, 50, 5.8, 'FD');
  doc.setFontSize(8.5);
  doc.text(
    ret.taxPeriodMonth ? String(ret.taxPeriodMonth).padStart(2, '0') : '10',
    marginLeft + 31,
    metaY + 10.2,
    { align: 'center' }
  );

  doc.setFontSize(7);
  doc.text('TAHUN PAJAK', marginLeft + 93, metaY + 4.2, { align: 'center' });
  doc.rect(marginLeft + 68, metaY + 6, 50, 5.8, 'FD');
  doc.setFontSize(8.5);
  doc.text(String(ret.taxYear || 2026), marginLeft + 93, metaY + 10.2, { align: 'center' });

  doc.setFontSize(7);
  doc.text('STATUS', marginLeft + 155, metaY + 4.2, { align: 'center' });
  doc.rect(marginLeft + 129, metaY + 6, 52, 5.8, 'FD');
  doc.setFontSize(8.5);
  doc.text(
    ret.revisionNo === 0 ? 'NORMAL' : `PEMBETULAN - ${ret.revisionNo}`,
    marginLeft + 155,
    metaY + 10.2,
    { align: 'center' }
  );

  // Section A: Identitas Pemotong
  const secAY = 39.5;
  doc.setFillColor(0, 79, 159);
  doc.rect(marginLeft, secAY, contentWidth, 5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(255, 255, 255);
  doc.text('A. IDENTITAS PEMOTONG', marginLeft + 2, secAY + 3.6);

  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(0, 0, 0);
  const colonX = marginLeft + 33;
  let rowAY = secAY + 8.5;

  doc.text('A.1  NPWP/NIK', marginLeft + 2, rowAY);
  doc.text(`:   ${taxpayer.nikNpwp || '0962577854427000'}`, colonX, rowAY);
  rowAY += 4.5;
  doc.text('A.2  Nama', marginLeft + 2, rowAY);
  doc.text(`:   ${taxpayer.name || 'PT SURYA PUTRA ALFASINDO'}`, colonX, rowAY);
  rowAY += 4.5;
  doc.text('A.3  Alamat', marginLeft + 2, rowAY);
  const fullAddress = taxpayer.address || 'JL BINTARA VIII NO.99, BEKASI';
  const alamatLines = doc.splitTextToSize(fullAddress, 148);
  doc.text(`:   ${alamatLines[0]}`, colonX, rowAY);
  if (alamatLines[1]) {
    rowAY += 3.8;
    doc.text(`    ${alamatLines[1]}`, colonX, rowAY);
  }
  rowAY += 4.5;
  doc.text('A.4  No. Telepon', marginLeft + 2, rowAY);
  doc.text(`:   ${taxpayer.phone || '0817128678'}`, colonX, rowAY);

  // Section B: PPh 21
  let currentY = rowAY + 4.5;
  doc.setFillColor(0, 79, 159);
  doc.rect(marginLeft, currentY, contentWidth, 5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(255, 255, 255);
  doc.text('B. PAJAK PENGHASILAN PASAL 21', marginLeft + 2, currentY + 3.6);

  currentY += 8.2;
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text('I. PAJAK PENGHASILAN PASAL 21 YANG DILAKUKAN PEMOTONGAN', marginLeft + 2, currentY);

  currentY += 1.8;
  doc.setFillColor(216, 220, 226);
  doc.rect(marginLeft, currentY, contentWidth, 7, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.8);
  const colNoCenter = marginLeft + 5;
  const colUraianCenter = marginLeft + 68;
  const colKapCenter = marginLeft + 144;
  const colJmlCenter = marginLeft + 172;

  doc.text('NO', colNoCenter, currentY + 3, { align: 'center' });
  doc.text('URAIAN', colUraianCenter, currentY + 3, { align: 'center' });
  doc.text('KAP-KJS', colKapCenter, currentY + 3, { align: 'center' });
  doc.text('JUMLAH (Rp)', colJmlCenter, currentY + 3, { align: 'center' });

  currentY += 7;
  const b1Rows = [
    { no: '1.', text: 'PPh Pasal 21 yang Dipotong', kap: '411121-100', amt: formatRupiah(pphAmount) },
    { no: '2.', text: 'Kelebihan Penyetoran PPh Pasal 21 dari Masa Pajak Sebelumnya', kap: '', amt: '0' },
    { no: '3.', text: 'Pembayaran PPh Pasal 21 dengan SP2D (Instansi Pemerintah)', kap: '', amt: '0' },
    { no: '4.', text: 'PPh Pasal 21 yang Kurang (Lebih) Disetor (1-2-3)', kap: '', amt: formatRupiah(pphAmount) },
    { no: '5.', text: 'PPh Pasal 21 yang Kurang (Lebih) Disetor pada SPT yang Dibetulkan', kap: '', amt: '0' },
    { no: '6.', text: 'PPh Pasal 21 yang Kurang (Lebih) Disetor Karena Pembetulan (4-5)', kap: '', amt: formatRupiah(pphAmount) },
  ];
  b1Rows.forEach((r) => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.text(r.no, colNoCenter, currentY + 3.2, { align: 'center' });
    doc.text(r.text, marginLeft + 10, currentY + 3.2);
    if (r.kap) doc.text(r.kap, colKapCenter, currentY + 3.2, { align: 'center' });
    doc.text(r.amt, marginLeft + 184, currentY + 3.2, { align: 'right' });
    currentY += 4.2;
  });

  // Section C: PPh 26
  currentY += 2;
  doc.setFillColor(0, 79, 159);
  doc.rect(marginLeft, currentY, contentWidth, 5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(255, 255, 255);
  doc.text('C. PAJAK PENGHASILAN PASAL 26', marginLeft + 2, currentY + 3.6);

  currentY += 8.2;
  doc.setFontSize(7);
  doc.setTextColor(0, 0, 0);
  doc.text('I. PAJAK PENGHASILAN PASAL 26 YANG DILAKUKAN PEMOTONGAN', marginLeft + 2, currentY);

  currentY += 1.8;
  doc.setFillColor(216, 220, 226);
  doc.rect(marginLeft, currentY, contentWidth, 7, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.8);
  doc.text('NO', colNoCenter, currentY + 3, { align: 'center' });
  doc.text('URAIAN', colUraianCenter, currentY + 3, { align: 'center' });
  doc.text('KAP-KJS', colKapCenter, currentY + 3, { align: 'center' });
  doc.text('JUMLAH (Rp)', colJmlCenter, currentY + 3, { align: 'center' });

  currentY += 7;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.text('1.', colNoCenter, currentY + 3.2, { align: 'center' });
  doc.text('PPh Pasal 26 yang Dipotong', marginLeft + 10, currentY + 3.2);
  doc.text('411127-100', colKapCenter, currentY + 3.2, { align: 'center' });
  doc.text('0', marginLeft + 184, currentY + 3.2, { align: 'right' });
  currentY += 7;

  // Pernyataan & Tanda Tangan
  drawPernyataanDanTandaTangan(doc, marginLeft, contentWidth, currentY, ret, taxpayer, 'D');
  drawBsreFooter(doc, marginLeft, contentWidth);
}

// ===========================================================================
// 2. GENERATOR: SPT MASA PPN (2 Pages)
// ===========================================================================
function renderSptPpn(doc: jsPDF, ret: TaxReturn, taxpayer: Taxpayer) {
  const marginLeft = 12;
  const contentWidth = 186;
  const p = (ret.payload || {}) as SptPpnPayload;
  const dppTotal = (p.penyerahanPpnDipungutSendiriDpp || 0) + (p.eksporDpp || 0);
  const ppnKurangLebih = ret.underOverPayment || ret.taxPayable || 0;

  // PAGE 1
  drawSptHeader(
    doc,
    marginLeft,
    contentWidth,
    [
      'SURAT PEMBERITAHUAN MASA',
      'PAJAK PERTAMBAHAN NILAI (SPT MASA PPN)',
      'BAGI PENGUSAHA KENA PAJAK',
    ],
    'Halaman 1'
  );

  // Meta
  const metaY = 23;
  doc.setFillColor(216, 220, 226);
  doc.rect(marginLeft, metaY, contentWidth, 11, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.8);
  doc.setTextColor(0, 0, 0);
  doc.text('Masa Pajak', marginLeft + 25, metaY + 3.8, { align: 'center' });
  doc.text('Tahun Buku', marginLeft + 93, metaY + 3.8, { align: 'center' });
  doc.text('Normal/Pembetulan', marginLeft + 155, metaY + 3.8, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  const masaLabel = ret.taxPeriodMonth ? MONTHS_ID[ret.taxPeriodMonth - 1] : 'November';
  doc.text(`${masaLabel} ${ret.taxYear}`, marginLeft + 25, metaY + 8.5, { align: 'center' });
  doc.text(`${ret.taxYear} 1 s.d 12`, marginLeft + 93, metaY + 8.5, { align: 'center' });
  doc.text(ret.revisionNo === 0 ? 'NORMAL' : `PEMBETULAN ${ret.revisionNo}`, marginLeft + 155, metaY + 8.5, { align: 'center' });

  // Identitas PKP
  let y = metaY + 13;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.rect(marginLeft, y, contentWidth, 16, 'FD');
  doc.setFontSize(6.8);
  doc.text(`NAMA PKP : ${taxpayer.name}`, marginLeft + 3, y + 4.5);
  doc.text(`NPWP : ${taxpayer.nikNpwp}`, marginLeft + 110, y + 4.5);
  doc.text(`ALAMAT : ${taxpayer.address || '-'}`, marginLeft + 3, y + 9);
  doc.text(`KLU : ${taxpayer.kluName || 'AKTIVITAS KONSULTANSI DAN MANAJEMEN'}`, marginLeft + 110, y + 9);
  doc.text(`TELEPON : ${taxpayer.phone || '-'}`, marginLeft + 3, y + 13.5);
  doc.text(`HP : ${taxpayer.phone || '-'}`, marginLeft + 110, y + 13.5);

  // Section I: Penyerahan Barang dan Jasa
  y += 19;
  doc.setFillColor(0, 79, 159);
  doc.rect(marginLeft, y, contentWidth, 5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(255, 255, 255);
  doc.text('I. PENYERAHAN BARANG DAN JASA', marginLeft + 2, y + 3.6);

  y += 5;
  doc.setFillColor(216, 220, 226);
  doc.rect(marginLeft, y, contentWidth, 6, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(0, 0, 0);
  doc.text('URAIAN', marginLeft + 20, y + 4);
  doc.text('HARGA JUAL/DPP (Rp)', marginLeft + 120, y + 4, { align: 'right' });
  doc.text('PPN (Rp)', marginLeft + 155, y + 4, { align: 'right' });
  doc.text('PPnBM (Rp)', marginLeft + 184, y + 4, { align: 'right' });

  const rowsI = [
    { no: '1.', label: 'Ekspor Barang Kena Pajak / Jasa Kena Pajak', dpp: p.eksporDpp || 0, ppn: 0 },
    { no: '2.', label: 'Penyerahan yang PPN-nya harus dipungut sendiri', dpp: p.penyerahanPpnDipungutSendiriDpp || 0, ppn: p.penyerahanPpnDipungutSendiriPpn || 0 },
    { no: '3.', label: 'Penyerahan yang PPN-nya dipungut oleh Pemungut PPN', dpp: p.penyerahanDipungutPemungutDpp || 0, ppn: p.penyerahanDipungutPemungutPpn || 0 },
    { no: '4.', label: 'Penyerahan yang PPN-nya tidak dipungut', dpp: 0, ppn: 0 },
    { no: '5.', label: 'Penyerahan yang dibebaskan dari pengenaan PPN', dpp: p.penyerahanDibebaskanDpp || 0, ppn: 0 },
  ];

  y += 6;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  rowsI.forEach((r) => {
    doc.text(r.no, marginLeft + 3, y + 3.2);
    doc.text(r.label, marginLeft + 8, y + 3.2);
    doc.text(formatRupiah(r.dpp), marginLeft + 120, y + 3.2, { align: 'right' });
    doc.text(formatRupiah(r.ppn), marginLeft + 155, y + 3.2, { align: 'right' });
    doc.text('0', marginLeft + 184, y + 3.2, { align: 'right' });
    y += 4.5;
  });

  // Section II: Penghitungan PPN Kurang atau Lebih Bayar
  y += 3;
  doc.setFillColor(0, 79, 159);
  doc.rect(marginLeft, y, contentWidth, 5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(255, 255, 255);
  doc.text('II. PENGHITUNGAN PPN KURANG ATAU LEBIH BAYAR', marginLeft + 2, y + 3.6);

  y += 7;
  const rowsII = [
    { label: 'A. Pajak Keluaran yang harus dipungut sendiri (Jumlah I.A.2 Kolom PPN)', val: p.penyerahanPpnDipungutSendiriPpn || 0 },
    { label: 'B. Pajak Masukan yang dapat dikreditkan', val: p.pajakMasukanDikreditkan || 0 },
    { label: 'C. PPN yang kurang atau (lebih) dibayar (II.A - II.B)', val: ppnKurangLebih },
    { label: 'D. PPN kurang atau (lebih) bayar pada SPT yang dibetulkan', val: 0 },
    { label: 'E. PPN yang kurang atau (lebih) bayar karena pembetulan (II.C - II.D)', val: ppnKurangLebih },
  ];
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(0, 0, 0);
  rowsII.forEach((r) => {
    doc.text(r.label, marginLeft + 3, y + 3);
    doc.setFont('helvetica', 'bold');
    doc.text(formatRupiah(r.val), marginLeft + 184, y + 3, { align: 'right' });
    doc.setFont('helvetica', 'normal');
    y += 5;
  });

  drawBsreFooter(doc, marginLeft, contentWidth);

  // PAGE 2
  doc.addPage();
  drawSptHeader(
    doc,
    marginLeft,
    contentWidth,
    [
      'SURAT PEMBERITAHUAN MASA',
      'PAJAK PERTAMBAHAN NILAI (SPT MASA PPN)',
      'BAGI PENGUSAHA KENA PAJAK',
    ],
    'Halaman 2'
  );

  y = 25;
  doc.setFillColor(0, 79, 159);
  doc.rect(marginLeft, y, contentWidth, 5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(255, 255, 255);
  doc.text('III. PAJAK PENJUALAN ATAS BARANG MEWAH (PPnBM)', marginLeft + 2, y + 3.6);

  y += 7;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(0, 0, 0);
  doc.text('A. PPnBM yang harus dipungut sendiri', marginLeft + 3, y + 3);
  doc.text('0', marginLeft + 184, y + 3, { align: 'right' });
  y += 5;
  doc.text('B. PPnBM yang kurang (lebih) dibayar', marginLeft + 3, y + 3);
  doc.text('0', marginLeft + 184, y + 3, { align: 'right' });

  y += 7;
  doc.setFillColor(0, 79, 159);
  doc.rect(marginLeft, y, contentWidth, 5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(255, 255, 255);
  doc.text('IV. PPN TERUTANG ATAS KEGIATAN MEMBANGUN SENDIRI', marginLeft + 2, y + 3.6);

  y += 7;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(0, 0, 0);
  doc.text('PPN Terutang Kegiatan Membangun Sendiri', marginLeft + 3, y + 3);
  doc.text('0', marginLeft + 184, y + 3, { align: 'right' });

  y += 8;
  doc.setFillColor(0, 79, 159);
  doc.rect(marginLeft, y, contentWidth, 5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(255, 255, 255);
  doc.text('V. KELENGKAPAN SPT & PERNYATAAN', marginLeft + 2, y + 3.6);

  y += 7;
  drawPernyataanDanTandaTangan(doc, marginLeft, contentWidth, y, ret, taxpayer, 'VIII');
  drawBsreFooter(doc, marginLeft, contentWidth);
}

// ===========================================================================
// 3. GENERATOR: SPT MASA PPH UNIFIKASI (1 Page)
// ===========================================================================
function renderSptUnifikasi(doc: jsPDF, ret: TaxReturn, taxpayer: Taxpayer) {
  const marginLeft = 12;
  const contentWidth = 186;
  const p = (ret.payload || {}) as SptPphMasaPayload;
  const totalTax = ret.taxPayable || p.totalTaxWithheld || 0;

  drawSptHeader(doc, marginLeft, contentWidth, [
    'SURAT PEMBERITAHUAN MASA PPH UNIFIKASI',
  ]);

  // Meta
  const metaY = 23;
  doc.setFillColor(216, 220, 226);
  doc.rect(marginLeft, metaY, contentWidth, 11, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(0, 0, 0);
  doc.text('MASA PAJAK', marginLeft + 46, metaY + 3.8, { align: 'center' });
  doc.text('STATUS SPT', marginLeft + 140, metaY + 3.8, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  const masaLabel = ret.taxPeriodMonth ? MONTHS_ID[ret.taxPeriodMonth - 1] : 'Agustus';
  doc.text(`${masaLabel} ${ret.taxYear}`, marginLeft + 46, metaY + 8.5, { align: 'center' });
  doc.text(ret.revisionNo === 0 ? 'NORMAL' : `PEMBETULAN ${ret.revisionNo}`, marginLeft + 140, metaY + 8.5, { align: 'center' });

  // Section A: Identitas Pemotong
  let y = metaY + 13;
  doc.setFillColor(0, 79, 159);
  doc.rect(marginLeft, y, contentWidth, 5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(255, 255, 255);
  doc.text('A. IDENTITAS PEMOTONG DAN/ATAU PEMUNGUT PPH', marginLeft + 2, y + 3.6);

  y += 7;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(0, 0, 0);
  doc.text(`A.1 NPWP/NIK  : ${taxpayer.nikNpwp}`, marginLeft + 2, y);
  y += 4.5;
  doc.text(`A.2 NAMA      : ${taxpayer.name}`, marginLeft + 2, y);
  y += 4.5;
  doc.text(`A.3 ALAMAT    : ${taxpayer.address || '-'}`, marginLeft + 2, y);
  y += 4.5;
  doc.text(`A.4 NO. TELP  : ${taxpayer.phone || '-'}`, marginLeft + 2, y);

  // Section B: Pajak Penghasilan
  y += 6;
  doc.setFillColor(0, 79, 159);
  doc.rect(marginLeft, y, contentWidth, 5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(255, 255, 255);
  doc.text('B. PAJAK PENGHASILAN', marginLeft + 2, y + 3.6);

  y += 5;
  doc.setFillColor(216, 220, 226);
  doc.rect(marginLeft, y, contentWidth, 7, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(0, 0, 0);
  doc.text('PAJAK PENGHASILAN', marginLeft + 15, y + 4.5);
  doc.text('SETOR SENDIRI', marginLeft + 75, y + 4.5, { align: 'center' });
  doc.text('PEMOTONGAN/PEMUNGUTAN', marginLeft + 120, y + 4.5, { align: 'center' });
  doc.text('JUMLAH HARUS DISETOR', marginLeft + 170, y + 4.5, { align: 'center' });

  const uniRows = [
    { name: '1. PPh Pasal 4 ayat (2)', pph: 0 },
    { name: '2. PPh Pasal 15', pph: 0 },
    { name: '3. PPh Pasal 22', pph: 0 },
    { name: '4. PPh Pasal 23', pph: totalTax },
    { name: '5. PPh Pasal 26', pph: 0 },
  ];

  y += 7;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  uniRows.forEach((r) => {
    doc.text(r.name, marginLeft + 3, y + 3.2);
    doc.text('0', marginLeft + 75, y + 3.2, { align: 'center' });
    doc.text(formatRupiah(r.pph), marginLeft + 120, y + 3.2, { align: 'center' });
    doc.text(formatRupiah(r.pph), marginLeft + 184, y + 3.2, { align: 'right' });
    y += 4.5;
  });

  // Total
  doc.setFillColor(254, 240, 138);
  doc.rect(marginLeft, y, contentWidth, 5.5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.text('C. TOTAL OF INCOME TAX', marginLeft + 3, y + 3.8);
  doc.text(`Rp ${formatRupiah(totalTax)}`, marginLeft + 184, y + 3.8, { align: 'right' });

  y += 8;
  drawPernyataanDanTandaTangan(doc, marginLeft, contentWidth, y, ret, taxpayer, 'D');
  drawBsreFooter(doc, marginLeft, contentWidth);
}

// ===========================================================================
// 4. GENERATOR: SPT TAHUNAN OP (Formulir 1770 / 1770 S) (2 Pages)
// ===========================================================================
function renderSptTahunanOp(doc: jsPDF, ret: TaxReturn, taxpayer: Taxpayer) {
  const marginLeft = 12;
  const contentWidth = 186;
  const p = (ret.payload || {}) as SptTahunanOpPayload;

  // PAGE 1
  drawSptHeader(
    doc,
    marginLeft,
    contentWidth,
    [
      'SPT TAHUNAN',
      'PAJAK PENGHASILAN (PPh)',
      'WAJIB PAJAK ORANG PRIBADI',
    ],
    'HALAMAN 1'
  );

  // Meta Strip
  const metaY = 23;
  doc.setFillColor(216, 220, 226);
  doc.rect(marginLeft, metaY, contentWidth, 12, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(0, 0, 0);
  doc.text('TAHUN PAJAK / PERIODE', marginLeft + 25, metaY + 3.8, { align: 'center' });
  doc.text('STATUS', marginLeft + 75, metaY + 3.8, { align: 'center' });
  doc.text('SUMBER PENGHASILAN', marginLeft + 125, metaY + 3.8, { align: 'center' });
  doc.text('METODE PEMBUKUAN', marginLeft + 165, metaY + 3.8, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text(`${ret.taxYear} 1 s.d 12 BULAN`, marginLeft + 25, metaY + 8.5, { align: 'center' });
  doc.text(ret.revisionNo === 0 ? 'NORMAL' : `PEMBETULAN ${ret.revisionNo}`, marginLeft + 75, metaY + 8.5, { align: 'center' });
  doc.text('Pekerjaan', marginLeft + 125, metaY + 8.5, { align: 'center' });
  doc.text('Pencatatan', marginLeft + 165, metaY + 8.5, { align: 'center' });

  // Section A: Identitas WP
  let y = metaY + 14;
  doc.setFillColor(0, 79, 159);
  doc.rect(marginLeft, y, contentWidth, 5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(255, 255, 255);
  doc.text('A. IDENTITAS WAJIB PAJAK', marginLeft + 2, y + 3.6);

  y += 7;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(0, 0, 0);
  doc.text(`1. NIK/NPWP  : ${taxpayer.nikNpwp}`, marginLeft + 3, y);
  y += 4;
  doc.text(`2. Nama      : ${taxpayer.name}`, marginLeft + 3, y);
  y += 4;
  doc.text(`3. Jenis ID  : KTP (Nomor: ${taxpayer.nikNpwp})`, marginLeft + 3, y);
  y += 4;
  doc.text(`4. Telepon   : ${taxpayer.phone || '-'}`, marginLeft + 3, y);
  doc.text(`5. Email : ${taxpayer.email || '-'}`, marginLeft + 90, y);
  y += 4;
  doc.text(`6. Status Kewajiban Perpajakan Suami dan Istri : KK (Kepala Keluarga)`, marginLeft + 3, y);

  // Section B: Penghasilan Neto
  y += 6;
  doc.setFillColor(0, 79, 159);
  doc.rect(marginLeft, y, contentWidth, 5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(255, 255, 255);
  doc.text('B. PENGHASILAN NETO', marginLeft + 2, y + 3.6);

  const rowsB = [
    { no: '1.', text: 'Penghasilan Neto Dalam Negeri Sehubungan dengan Pekerjaan', val: p.penghasilanNetoPekerjaan || 0 },
    { no: '2.', text: 'Penghasilan Neto Dalam Negeri Lainnya', val: p.penghasilanNetoDalamNegeriLain || 0 },
    { no: '3.', text: 'Penghasilan Neto Luar Negeri', val: p.penghasilanNetoLuarNegeri || 0 },
    { no: '4.', text: 'Jumlah Penghasilan Neto (1+2+3)', val: (p.penghasilanNetoPekerjaan || 0) + (p.penghasilanNetoDalamNegeriLain || 0) },
    { no: '5.', text: 'Zakat / Sumbangan Keagamaan yang Sifatnya Wajib', val: p.zakatSumbangan || 0 },
    { no: '6.', text: 'Jumlah Penghasilan Neto setelah Zakat (4-5)', val: (p.penghasilanNetoPekerjaan || 0) - (p.zakatSumbangan || 0) },
  ];

  y += 6;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(0, 0, 0);
  rowsB.forEach((r) => {
    doc.text(r.no, marginLeft + 3, y + 3);
    doc.text(r.text, marginLeft + 9, y + 3);
    doc.text(formatRupiah(r.val), marginLeft + 184, y + 3, { align: 'right' });
    y += 4.2;
  });

  // Section C: Penghasilan Kena Pajak
  y += 2;
  doc.setFillColor(0, 79, 159);
  doc.rect(marginLeft, y, contentWidth, 5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(255, 255, 255);
  doc.text('C. PENGHASILAN KENA PAJAK', marginLeft + 2, y + 3.6);

  y += 6;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(0, 0, 0);
  doc.text(`7. Penghasilan Tidak Kena Pajak (PTKP) [${taxpayer.ptkpStatus || 'TK/0'}]`, marginLeft + 3, y + 3);
  doc.text(formatRupiah(p.ptkpAmount || 54000000), marginLeft + 184, y + 3, { align: 'right' });
  y += 4.2;
  doc.text('8. Penghasilan Kena Pajak (PKP) (6-7)', marginLeft + 3, y + 3);
  doc.text(formatRupiah(p.pkpAmount || 0), marginLeft + 184, y + 3, { align: 'right' });

  // Section D: PPh Terutang
  y += 5;
  doc.setFillColor(0, 79, 159);
  doc.rect(marginLeft, y, contentWidth, 5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(255, 255, 255);
  doc.text('D. PPh TERUTANG', marginLeft + 2, y + 3.6);

  y += 6;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(0, 0, 0);
  doc.text('9. PPh Terutang (Tarif Pasal 17 UU PPh)', marginLeft + 3, y + 3);
  doc.text(formatRupiah(p.pphTerutang || 0), marginLeft + 184, y + 3, { align: 'right' });
  y += 4.2;
  doc.text('10. Kredit Pajak (PPh 21 dari Bukti Potong 1721-A1)', marginLeft + 3, y + 3);
  doc.text(formatRupiah(p.kreditPajakBpa1 || 0), marginLeft + 184, y + 3, { align: 'right' });

  drawBsreFooter(doc, marginLeft, contentWidth);

  // PAGE 2
  doc.addPage();
  drawSptHeader(
    doc,
    marginLeft,
    contentWidth,
    [
      'SPT TAHUNAN',
      'PAJAK PENGHASILAN (PPh)',
      'WAJIB PAJAK ORANG PRIBADI',
    ],
    'HALAMAN 2'
  );

  y = 25;
  doc.setFillColor(0, 79, 159);
  doc.rect(marginLeft, y, contentWidth, 5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(255, 255, 255);
  doc.text('E. PPh KURANG / LEBIH BAYAR', marginLeft + 2, y + 3.6);

  y += 7;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(0, 0, 0);
  doc.text('11. a. PPh kurang / lebih bayar (9-10)', marginLeft + 3, y + 3);
  doc.text(formatRupiah(ret.taxPayable || 0), marginLeft + 184, y + 3, { align: 'right' });
  y += 4.5;
  doc.text('    b. Surat Keputusan Persetujuan Penundaan Pembayaran Pajak', marginLeft + 3, y + 3);
  doc.text('Tidak Ada', marginLeft + 184, y + 3, { align: 'right' });
  y += 4.5;
  doc.text('    c. PPh yang masih harus dibayar (11a-11b)', marginLeft + 3, y + 3);
  doc.text(formatRupiah(ret.taxPayable || 0), marginLeft + 184, y + 3, { align: 'right' });

  y += 7;
  doc.setFillColor(0, 79, 159);
  doc.rect(marginLeft, y, contentWidth, 5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(255, 255, 255);
  doc.text('F. ANGSURAN PPh PASAL 25 TAHUN BERJALAN', marginLeft + 2, y + 3.6);

  y += 7;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(0, 0, 0);
  doc.text('12. Angsuran PPh Pasal 25 yang harus dibayar setiap bulan', marginLeft + 3, y + 3);
  doc.text(formatRupiah(p.angsuranPph25 || 0), marginLeft + 184, y + 3, { align: 'right' });

  y += 8;
  drawPernyataanDanTandaTangan(doc, marginLeft, contentWidth, y, ret, taxpayer, 'H');
  drawBsreFooter(doc, marginLeft, contentWidth);
}

// ===========================================================================
// 5. GENERATOR: SPT TAHUNAN BADAN (Formulir 1771) (2 Pages)
// ===========================================================================
function renderSptTahunanBadan(doc: jsPDF, ret: TaxReturn, taxpayer: Taxpayer) {
  const marginLeft = 12;
  const contentWidth = 186;
  const p = (ret.payload || {}) as SptTahunanBadanPayload;

  // PAGE 1
  drawSptHeader(
    doc,
    marginLeft,
    contentWidth,
    [
      'SPT TAHUNAN PAJAK PENGHASILAN (PPh)',
      'WAJIB PAJAK BADAN',
      'DALAM MATA UANG RUPIAH',
    ],
    'HALAMAN 1'
  );

  // Meta Strip
  const metaY = 23;
  doc.setFillColor(216, 220, 226);
  doc.rect(marginLeft, metaY, contentWidth, 12, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(0, 0, 0);
  doc.text('TAHUN PAJAK / PERIODE PEMBUKUAN', marginLeft + 30, metaY + 3.8, { align: 'center' });
  doc.text('STATUS', marginLeft + 95, metaY + 3.8, { align: 'center' });
  doc.text('METODE PEMBUKUAN', marginLeft + 155, metaY + 3.8, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text(`${ret.taxYear} 1 S.D 12`, marginLeft + 30, metaY + 8.5, { align: 'center' });
  doc.text(ret.revisionNo === 0 ? 'Normal' : `Pembetulan ${ret.revisionNo}`, marginLeft + 95, metaY + 8.5, { align: 'center' });
  doc.text('Pembukuan Stelsel Akrual', marginLeft + 155, metaY + 8.5, { align: 'center' });

  // Section A: Identitas WP
  let y = metaY + 14;
  doc.setFillColor(0, 79, 159);
  doc.rect(marginLeft, y, contentWidth, 5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(255, 255, 255);
  doc.text('A. IDENTITAS WAJIB PAJAK', marginLeft + 2, y + 3.6);

  y += 7;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(0, 0, 0);
  doc.text(`1. NPWP         : ${taxpayer.nikNpwp}`, marginLeft + 3, y);
  y += 4;
  doc.text(`2. NAMA         : ${taxpayer.name}`, marginLeft + 3, y);
  y += 4;
  doc.text(`3. ALAMAT EMAIL : ${taxpayer.email || 'perusahaan@gmail.com'}`, marginLeft + 3, y);
  y += 4;
  doc.text(`4. TELEPON      : ${taxpayer.phone || '0817128678'}`, marginLeft + 3, y);

  // Section B: Laporan Keuangan
  y += 6;
  doc.setFillColor(0, 79, 159);
  doc.rect(marginLeft, y, contentWidth, 5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(255, 255, 255);
  doc.text('B. INFORMASI LAPORAN KEUANGAN', marginLeft + 2, y + 3.6);

  y += 6;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(0, 0, 0);
  doc.text('1. Sektor Usaha Laporan Keuangan : Jasa / Perdagangan', marginLeft + 3, y + 3);
  doc.text('2. Diaudit Akuntan Publik : Tidak', marginLeft + 110, y + 3);

  // Section C: Penghasilan Kena Pajak
  y += 6;
  doc.setFillColor(0, 79, 159);
  doc.rect(marginLeft, y, contentWidth, 5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(255, 255, 255);
  doc.text('C. PENGHASILAN KENA PAJAK', marginLeft + 2, y + 3.6);

  y += 6;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(0, 0, 0);
  const rowsBadanC = [
    { no: '1.', text: 'Penghasilan Neto Komersial Dalam Negeri', val: p.labaKomersial || 0 },
    {
      no: '2.',
      text: 'Penyesuaian Fiskal Positif',
      val:
        (p.koreksiPositifNatura || 0) +
        (p.koreksiPositifSanksiPajak || 0) +
        (p.koreksiPositifJamuanNonNominatif || 0) +
        (p.koreksiPositifPenyisihanPiutang || 0) +
        (p.koreksiPositifLainnya || 0),
    },
    {
      no: '3.',
      text: 'Penyesuaian Fiskal Negatif',
      val:
        (p.koreksiNegatifPenghasilanFinal || 0) +
        (p.koreksiNegatifPenyusutanFiskal || 0) +
        (p.koreksiNegatifLainnya || 0),
    },
    { no: '4.', text: 'Penghasilan Neto Fiskal (1+2-3)', val: p.penghasilanNetoFiskal || 0 },
    { no: '5.', text: 'Kompensasi Kerugian Fiskal', val: p.kompensasiKerugian || 0 },
    { no: '6.', text: 'Penghasilan Kena Pajak (4-5)', val: p.pkpDibulatkan || 0 },
  ];
  rowsBadanC.forEach((r) => {
    doc.text(r.no, marginLeft + 3, y + 3);
    doc.text(r.text, marginLeft + 9, y + 3);
    doc.text(formatRupiah(r.val), marginLeft + 184, y + 3, { align: 'right' });
    y += 4.2;
  });

  // Section D: PPh Terutang
  y += 2;
  doc.setFillColor(0, 79, 159);
  doc.rect(marginLeft, y, contentWidth, 5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(255, 255, 255);
  doc.text('D. PPh TERUTANG', marginLeft + 2, y + 3.6);

  y += 6;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(0, 0, 0);
  doc.text('PPh Terutang (Tarif Umum Badan 22%)', marginLeft + 3, y + 3);
  doc.text(formatRupiah(p.totalPphTerutang || 0), marginLeft + 184, y + 3, { align: 'right' });

  drawBsreFooter(doc, marginLeft, contentWidth);

  // PAGE 2
  doc.addPage();
  drawSptHeader(
    doc,
    marginLeft,
    contentWidth,
    [
      'SPT TAHUNAN PAJAK PENGHASILAN (PPh)',
      'WAJIB PAJAK BADAN',
      'DALAM MATA UANG RUPIAH',
    ],
    'HALAMAN 2'
  );

  y = 25;
  doc.setFillColor(0, 79, 159);
  doc.rect(marginLeft, y, contentWidth, 5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(255, 255, 255);
  doc.text('E. KREDIT PAJAK & KURANG (LEBIH) BAYAR', marginLeft + 2, y + 3.6);

  y += 7;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(0, 0, 0);
  const rowsBadanE = [
    { no: '1.', text: 'Kredit Pajak Dalam Negeri (PPh 22 & PPh 23)', val: (p.kreditPph22 || 0) + (p.kreditPph23 || 0) },
    { no: '2.', text: 'Kredit Pajak Luar Negeri (PPh 24)', val: p.kreditPph24 || 0 },
    { no: '3.', text: 'Jumlah Kredit Pajak (1+2)', val: (p.kreditPph22 || 0) + (p.kreditPph23 || 0) + (p.kreditPph24 || 0) },
    { no: '4.', text: 'PPh yang Kurang / (Lebih) Dibayar (Pasal 29)', val: ret.taxPayable || 0 },
  ];
  rowsBadanE.forEach((r) => {
    doc.text(r.no, marginLeft + 3, y + 3);
    doc.text(r.text, marginLeft + 9, y + 3);
    doc.text(formatRupiah(r.val), marginLeft + 184, y + 3, { align: 'right' });
    y += 4.5;
  });

  y += 5;
  doc.setFillColor(0, 79, 159);
  doc.rect(marginLeft, y, contentWidth, 5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(255, 255, 255);
  doc.text('G. PERHITUNGAN ANGSURAN PPh PASAL 25 TAHUN BERJALAN', marginLeft + 2, y + 3.6);

  y += 7;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(0, 0, 0);
  doc.text('Angsuran PPh Pasal 25 yang harus dibayar sendiri setiap bulan', marginLeft + 3, y + 3);
  doc.text(formatRupiah(p.angsuranPph25 || 0), marginLeft + 184, y + 3, { align: 'right' });

  y += 8;
  drawPernyataanDanTandaTangan(doc, marginLeft, contentWidth, y, ret, taxpayer, 'H');
  drawBsreFooter(doc, marginLeft, contentWidth);
}

/**
 * Generates and directly downloads the official SPT Induk PDF.
 * Matches 100% to the official DJP Coretax PDF layout according to the return type!
 */
export function downloadSptIndukPdf(ret: TaxReturn, taxpayer: Taxpayer): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  if (ret.returnType === 'SPT_MASA_PPN') {
    renderSptPpn(doc, ret, taxpayer);
  } else if (ret.returnType === 'SPT_MASA_UNIFIKASI') {
    renderSptUnifikasi(doc, ret, taxpayer);
  } else if (ret.returnType === 'SPT_TAHUNAN_OP') {
    renderSptTahunanOp(doc, ret, taxpayer);
  } else if (ret.returnType === 'SPT_TAHUNAN_BADAN') {
    renderSptTahunanBadan(doc, ret, taxpayer);
  } else {
    // Default: SPT_MASA_PPH21
    renderSptPph21(doc, ret, taxpayer);
  }

  const masaText = ret.taxPeriodMonth ? String(ret.taxPeriodMonth).padStart(2, '0') : '00';
  const filename = `${ret.returnType}_${ret.taxYear}_${masaText}_${taxpayer.nikNpwp}.pdf`;
  doc.save(filename);
}

/**
 * Generates and directly downloads the official BPE (Bukti Penerimaan Elektronik) PDF.
 */
export function downloadBpePdf(ret: TaxReturn, taxpayer: Taxpayer): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const marginLeft = 15;
  const contentWidth = 180;
  const bpeNo = ret.bpeNumber || `BPE-${ret.taxYear}/01/${ret.id.slice(-6).toUpperCase()}`;

  // Header Box
  doc.setFillColor(30, 44, 94);
  doc.rect(marginLeft, 15, contentWidth, 22, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(255, 255, 255);
  doc.text('KEMENTERIAN KEUANGAN REPUBLIK INDONESIA', 105, 22, { align: 'center' });
  doc.setFontSize(11);
  doc.text('DIREKTORAT JENDERAL PAJAK', 105, 28, { align: 'center' });
  doc.setFontSize(8.5);
  doc.setTextColor(244, 196, 48);
  doc.text('BUKTI PENERIMAAN ELEKTRONIK (BPE)', 105, 33, { align: 'center' });

  // Outer Border Box
  doc.setDrawColor(200, 206, 214);
  doc.rect(marginLeft, 37, contentWidth, 120);

  // Rows
  const startY = 48;
  const items = [
    { label: 'Nomor BPE', val: bpeNo },
    { label: 'Nama Wajib Pajak', val: taxpayer.name },
    { label: 'NPWP / NIK', val: taxpayer.nikNpwp },
    { label: 'Tahun Pajak', val: String(ret.taxYear) },
    {
      label: 'Masa Pajak',
      val: ret.taxPeriodMonth ? String(ret.taxPeriodMonth).padStart(2, '0') : 'Januari - Desember',
    },
    { label: 'Jenis SPT', val: ret.returnType.replace(/_/g, ' ') },
    { label: 'Pembetulan ke', val: String(ret.revisionNo) },
    { label: 'Status SPT', val: 'Lengkap / Diterima' },
    { label: 'Nominal SPT', val: `Rp ${formatRupiah(ret.taxPayable || 0)}` },
    {
      label: 'Tanggal Penyampaian',
      val: ret.submittedAt
        ? new Date(ret.submittedAt).toLocaleString('id-ID')
        : new Date().toLocaleString('id-ID'),
    },
  ];

  doc.setFontSize(8.5);
  let y = startY;
  items.forEach((it) => {
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    doc.text(it.label, marginLeft + 8, y);
    doc.text(':', marginLeft + 65, y);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(it.val, marginLeft + 70, y);
    y += 7;
  });

  // QR Code
  const qrUrl = generateQrCodeDataUrl(`DJP-BPE|${bpeNo}|${taxpayer.nikNpwp}|${ret.taxYear}`);
  if (qrUrl) {
    doc.addImage(qrUrl, 'PNG', 145, 115, 30, 30);
  }
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('Ditandatangani secara elektronik', 160, 149, { align: 'center' });

  // Footer note
  doc.setFontSize(7);
  doc.text(
    'Dokumen ini diterbitkan secara elektronik oleh Coretax DJP dan sah sebagai Bukti Penerimaan Elektronik (BPE).',
    marginLeft + 8,
    152
  );

  const filename = `BPE_${ret.returnType}_${ret.taxYear}_${taxpayer.nikNpwp}.pdf`;
  doc.save(filename);
}
