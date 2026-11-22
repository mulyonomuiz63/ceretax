import {
  ExamCaseCode,
  ExamCheckItem,
  ExamEvaluation,
  SptTahunanBadanPayload,
  SptTahunanOpPayload,
  TaxInvoice,
  Taxpayer,
  WorkspaceState,
} from '../types/tax.ts';
import { calculatePphBadan, calculatePphPasal17, calculatePpnLine, formatRp } from '../utils/taxCalc.ts';

export const DEMO_ACCOUNTS = [
  {
    nik: '3174011508880001',
    name: 'TUAN A (Mahasiswa / Karyawan)',
    companyName: 'PT BREVET NUSANTARA (PKP)',
    companyNpwp: '0123456789012000',
    description: 'Akun studi kasus resmi PDF (BPA1 Rp533,5 jt, SPT OP Nihil, e-Faktur PPN, e-Bupot 21/23 & PPh Badan)',
  },
  {
    nik: '3273022405950002',
    name: 'SITI RAHMAWATI',
    companyName: 'PT AKUNTANMU MANDIRI SEJAHTERA (PKP)',
    companyNpwp: '0298765432012000',
    description: 'Akun latihan alternatif dengan saldo deposit Rp200.000.000 untuk ujian mandiri',
  },
];

export interface CaseStudyMeta {
  code: ExamCaseCode;
  moduleTag: string;
  title: string;
  accountMode: 'INDIVIDUAL' | 'CORPORATE';
  summary: string;
  instructions: string[];
  targetMenu: { module: string; subTab?: string };
}

export const EXAM_CASE_STUDIES: CaseStudyMeta[] = [
  {
    code: 'CASE_PPN',
    moduleTag: 'Modul 1 — SPT Masa PPN',
    title: 'Simulasi e-Faktur & Pelaporan SPT Masa PPN',
    accountMode: 'CORPORATE',
    summary:
      'Sebagai PKP PT Brevet Nusantara (Impersonate), kelola Faktur Pajak Keluaran, kreditkan Pajak Masukan, lalu Posting dan Laporkan SPT Masa PPN Masa Januari 2025.',
    instructions: [
      'Beralih ke akun Perusahaan (Impersonate PT Brevet Nusantara) melalui menu Ganti Akun di kanan atas.',
      'Buka e-Faktur > Pajak Keluaran, tanda tangani (Approve) faktur DRAFT atau buat minimal 1 Faktur Keluaran baru (Kode 01/04) lalu Approve.',
      'Buka e-Faktur > Pajak Masukan, pastikan minimal 1 Faktur Masukan telah dikreditkan (status Dikreditkan).',
      'Buka Surat Pemberitahuan (SPT) > Buat Konsep SPT > pilih SPT Masa PPN Masa Januari 2025, klik Posting SPT.',
      'Klik Bayar dan Lapor (gunakan Saldo Deposit atau Kode Billing + Bayar NTPN) hingga status SPT Dilaporkan & BPE terbit.',
    ],
    targetMenu: { module: 'efaktur', subTab: 'output' },
  },
  {
    code: 'CASE_PPH21_KARYAWAN',
    moduleTag: 'Modul 2 — PPh 21 Tahunan Karyawan',
    title: 'Unduh BPA1 & Pelaporan PPh 21 Karyawan (Kasus Tuan A)',
    accountMode: 'INDIVIDUAL',
    summary:
      'Sesuai panduan PDF Pelaporan PPh 21 Tahunan Karyawan: periksa bukti potong BPA1 Tuan A (Bruto Rp533.500.000, Neto Rp527.500.000, PTKP TK/0, PPh Rp87.375.000 Nihil) di Dokumen Saya lalu laporkan.',
    instructions: [
      'Pastikan berada pada Akun Utama (Orang Pribadi — Tuan A).',
      'Buka Portal Saya > Dokumen Saya untuk melihat & mengunduh Bukti Potong Tahunan BPA1 dari PT Brevet Nusantara.',
      'Buka Surat Pemberitahuan (SPT) > Buat Konsep SPT > PPh Orang Pribadi Tahun Pajak 2024 (Normal).',
      'Klik tombol Posting SPT agar data BPA1 (Bruto Rp533,5 jt, Kredit PPh Rp87.375.000) terisi otomatis.',
      'Verifikasi hasil perhitungan PPh Terutang = Rp87.375.000 dan Kurang/Lebih Bayar = Rp0 (Nihil), lalu Tanda Tangani & Lapor.',
    ],
    targetMenu: { module: 'portal', subTab: 'dokumen' },
  },
  {
    code: 'CASE_EBUPOT_21_23',
    moduleTag: 'Modul 3 — e-Bupot & SPT Masa 21/23',
    title: 'Penerbitan e-Bupot PPh 21 TER, BPPU PPh 23 & SPT Masa',
    accountMode: 'CORPORATE',
    summary:
      'Sesuai panduan PDF e-Bupot: terbitkan bukti potong PPh 21 Pegawai Tetap (TER) dan PPh 23 Jasa (Kode 24-104-29, tarif 2%), lalu laporkan SPT Masa PPh 21/26 & Unifikasi.',
    instructions: [
      'Beralih ke akun Perusahaan (Impersonate PT Brevet Nusantara).',
      'Buka eBupot > BPMP Bulanan Pegawai Tetap, centang bukti potong Belum Terbit lalu klik Terbitkan (Tanda Tangan Elektronik).',
      'Buka eBupot > BPPU Unifikasi PPh 23, buat atau terbitkan bukti potong jasa (Kode 24-104-29 tarif 2%) hingga status Telah Terbit.',
      'Buka Surat Pemberitahuan (SPT) > Buat Konsep SPT untuk SPT Masa PPh 21/26 dan/atau SPT Masa PPh Unifikasi Masa Januari 2025.',
      'Klik Posting SPT lalu Bayar dan Lapor menggunakan Deposit atau Kode Billing hingga BPE diterbitkan.',
    ],
    targetMenu: { module: 'ebupot', subTab: 'bpmp' },
  },
  {
    code: 'CASE_SPT_OP',
    moduleTag: 'Modul 4 — SPT Tahunan Orang Pribadi',
    title: 'Pelaporan Lengkap SPT Tahunan OP (Induk, L-1 Harta/Utang & L-2)',
    accountMode: 'INDIVIDUAL',
    summary:
      'Lengkapi SPT Tahunan Orang Pribadi Tahun 2024 termasuk Lampiran L-1 (Kas Rp300jt, Mobil Rp200jt, Utang Rp200jt, Bukti Potong) dan kirim menggunakan Kode Otorisasi DJP.',
    instructions: [
      'Gunakan Akun Utama (Orang Pribadi) dan buka Surat Pemberitahuan (SPT) > Konsep SPT.',
      'Buat atau buka Konsep SPT Tahunan Orang Pribadi 2024 dan jalankan Posting SPT.',
      'Buka tab Lampiran L-1: pastikan daftar Harta (total ≥ Rp500.000.000) dan Utang (Rp200.000.000) tercatat lengkap.',
      'Lengkapi Induk Bagian A–K (cek pertanyaan Ya/Tidak dan PTKP TK/0) serta Lampiran L-2 bila ada PPh Final.',
      'Klik Bayar dan Lapor, masukkan Kode Otorisasi DJP, dan cetak Bukti Penerimaan Elektronik (BPE).',
    ],
    targetMenu: { module: 'spt', subTab: 'konsep' },
  },
  {
    code: 'CASE_SPT_BADAN',
    moduleTag: 'Modul 5 — SPT Tahunan PPh Badan',
    title: 'Rekonsiliasi Fiskal, Fasilitas Pasal 31E & Pelaporan SPT Badan',
    accountMode: 'CORPORATE',
    summary:
      'Susun SPT Tahunan PPh Badan Tahun 2024 untuk PT Brevet Nusantara: lakukan Rekonsiliasi Fiskal Positif/Negatif, hitung Fasilitas Pasal 31E, kredit pajak, dan lunasi PPh Pasal 29.',
    instructions: [
      'Beralih ke akun Perusahaan (Impersonate PT Brevet Nusantara).',
      'Buka Surat Pemberitahuan (SPT) > Buat Konsep SPT > pilih SPT Tahunan PPh Badan Tahun Pajak 2024.',
      'Pada tab Laporan Keuangan & Rekonsiliasi Fiskal, periksa Laba Komersial dan input Koreksi Fiskal Positif (Natura/Sanksi Pajak) & Negatif.',
      'Verifikasi perhitungan otomatis Fasilitas Tarif Pasal 31E (11%) & Tarif Pasal 17 (22%) serta Kredit Pajak PPh 22/23/25.',
      'Klik Bayar dan Lapor (lunasi PPh Pasal 29 via Deposit/Billing) hingga status SPT Dilaporkan & BPE Badan terbit.',
    ],
    targetMenu: { module: 'spt', subTab: 'konsep' },
  },
];

export function createSeedWorkspace(nikRaw: string): WorkspaceState {
  const cleanNik = nikRaw.replace(/\D/g, '').padEnd(16, '0').slice(0, 16);
  const demoMatch = DEMO_ACCOUNTS.find((d) => d.nik === cleanNik);
  const nowIso = new Date().toISOString();

  const indId = `tp-ind-${cleanNik}`;
  const corpId = `tp-corp-${cleanNik}`;
  const isDefaultDemo = cleanNik === '3174011508880001';
  const indName = demoMatch ? (isDefaultDemo ? 'TUAN A' : demoMatch.name) : `PESERTA BREVET (${cleanNik.slice(-4)})`;
  const corpName = demoMatch ? demoMatch.companyName : `PT SIMULASI BREVET ${cleanNik.slice(-4)} (PKP)`;
  const corpNpwp = demoMatch ? demoMatch.companyNpwp : `01${cleanNik.slice(2, 13)}000`;

  const individualTaxpayer: Taxpayer = {
    id: indId,
    nikNpwp: cleanNik,
    name: indName,
    taxpayerType: 'INDIVIDUAL',
    isPkp: false,
    ptkpStatus: 'TK/0',
    address: 'Jl. Jenderal Sudirman Kav. 45, Karet Semanggi, Setiabudi, Jakarta Selatan 12930',
    kluCode: '96301',
    kluName: 'Pegawai Swasta — Manajemen Keuangan & Pajak',
    email: `${indName.toLowerCase().replace(/[^a-z0-9]/g, '.')}@kelasbrevet.id`,
    phone: '0812-8800-2025',
    kppName: 'KPP Pratama Jakarta Setiabudi Dua',
    passphraseHint: '123456',
    depositBalance: 25_000_000,
    isDemo: Boolean(demoMatch),
    linkedCorporateId: corpId,
  };

  const corporateTaxpayer: Taxpayer = {
    id: corpId,
    nikNpwp: corpNpwp,
    name: corpName,
    taxpayerType: 'CORPORATE',
    isPkp: true,
    ptkpStatus: 'TK/0',
    address: 'Menara KelasBrevet Lt. 12, Jl. HR Rasuna Said Blok X-5, Kuningan, Jakarta Selatan 12950',
    kluCode: '69200',
    kluName: 'Aktivitas Akuntansi, Pembukuan, Pemeriksaan & Konsultasi Pajak',
    email: 'tax@brevetnusantara.co.id',
    phone: '021-5550-2025',
    kppName: 'KPP Madya Jakarta Selatan I',
    passphraseHint: '123456',
    depositBalance: cleanNik === '3273022405950002' ? 200_000_000 : 150_000_000,
    isDemo: Boolean(demoMatch),
  };

  // Pre-seeded e-Faktur items (PPN 12% with DPP Nilai Lain 11/12)
  const line1 = calculatePpnLine(15_000_000, 10, 0, false); // 150jt -> PPN 16.5jt
  const line2 = calculatePpnLine(45_000_000, 2, 0, false); // 90jt -> PPN 9.9jt
  const line3 = calculatePpnLine(80_000_000, 1, 0, false); // 80jt Input -> PPN 8.8jt
  const line4 = calculatePpnLine(35_000_000, 1, 0, false); // 35jt Input -> PPN 3.85jt
  const lineExport = { dpp: 120_000_000, dppOtherValue: 120_000_000, ppn: 0 };

  const invoices: TaxInvoice[] = [
    {
      id: `inv-out-1-${cleanNik.slice(-4)}`,
      taxpayerId: corpId,
      direction: 'OUTPUT',
      transactionCode: '04',
      invoiceNumber: '04002500000000001',
      amendmentSeq: 0,
      referenceCode: 'INV/BN/2025/01/001',
      counterpartyNpwp: '0311223344556000',
      counterpartyName: 'PT SINERGI DIGITAL INDONESIA',
      invoiceDate: '2025-01-10',
      taxPeriodMonth: 1,
      taxPeriodYear: 2025,
      items: [
        {
          id: 'item-1',
          itemType: 'GOODS',
          itemCode: '847130',
          itemName: 'Workstation Akuntansi Pro 16"',
          unit: 'Unit',
          unitPrice: 15_000_000,
          quantity: 10,
          discount: 0,
          isLuxury: false,
          dpp: line1.dpp,
          dppOtherValue: line1.dppOtherValue,
          ppn: line1.ppn,
          ppnbm: 0,
        },
      ],
      dppTotal: line1.dpp,
      dppOtherValue: line1.dppOtherValue,
      ppnTotal: line1.ppn,
      ppnbmTotal: 0,
      status: 'APPROVED',
      isCredited: false,
      returnAmount: 0,
      signedAt: '2025-01-10T09:15:00.000Z',
      createdAt: '2025-01-10T09:00:00.000Z',
    },
    {
      id: `inv-out-2-${cleanNik.slice(-4)}`,
      taxpayerId: corpId,
      direction: 'OUTPUT',
      transactionCode: '04',
      invoiceNumber: 'DRAFT-OUT-002',
      amendmentSeq: 0,
      referenceCode: 'INV/BN/2025/01/002',
      counterpartyNpwp: '0455667788990000',
      counterpartyName: 'PT GRAHA KARYA SENTOSA',
      invoiceDate: '2025-01-18',
      taxPeriodMonth: 1,
      taxPeriodYear: 2025,
      items: [
        {
          id: 'item-2',
          itemType: 'SERVICES',
          itemCode: '160100',
          itemName: 'Jasa Implementasi Sistem Akuntansi & Pajak',
          unit: 'Paket',
          unitPrice: 45_000_000,
          quantity: 2,
          discount: 0,
          isLuxury: false,
          dpp: line2.dpp,
          dppOtherValue: line2.dppOtherValue,
          ppn: line2.ppn,
          ppnbm: 0,
        },
      ],
      dppTotal: line2.dpp,
      dppOtherValue: line2.dppOtherValue,
      ppnTotal: line2.ppn,
      ppnbmTotal: 0,
      status: 'DRAFT',
      isCredited: false,
      returnAmount: 0,
      createdAt: '2025-01-18T10:30:00.000Z',
    },
    {
      id: `inv-in-1-${cleanNik.slice(-4)}`,
      taxpayerId: corpId,
      direction: 'INPUT',
      transactionCode: '04',
      invoiceNumber: '04002500000088101',
      amendmentSeq: 0,
      referenceCode: 'PO/SUP/2025/014',
      counterpartyNpwp: '0599887766554000',
      counterpartyName: 'PT DISTRIBUTOR PERANGKAT NUSANTARA',
      invoiceDate: '2025-01-08',
      taxPeriodMonth: 1,
      taxPeriodYear: 2025,
      items: [
        {
          id: 'item-in-1',
          itemType: 'GOODS',
          itemCode: '851762',
          itemName: 'Server Rack & Perangkat Jaringan',
          unit: 'Unit',
          unitPrice: 80_000_000,
          quantity: 1,
          discount: 0,
          isLuxury: false,
          dpp: line3.dpp,
          dppOtherValue: line3.dppOtherValue,
          ppn: line3.ppn,
          ppnbm: 0,
        },
      ],
      dppTotal: line3.dpp,
      dppOtherValue: line3.dppOtherValue,
      ppnTotal: line3.ppn,
      ppnbmTotal: 0,
      status: 'APPROVED',
      isCredited: false,
      returnAmount: 0,
      signedAt: '2025-01-08T14:00:00.000Z',
      createdAt: '2025-01-08T13:45:00.000Z',
    },
    {
      id: `inv-in-2-${cleanNik.slice(-4)}`,
      taxpayerId: corpId,
      direction: 'INPUT',
      transactionCode: '04',
      invoiceNumber: '04002500000088102',
      amendmentSeq: 0,
      referenceCode: 'PO/SUP/2025/019',
      counterpartyNpwp: '0677889900112000',
      counterpartyName: 'PT SOLUSI CLOUD INDONESIA',
      invoiceDate: '2025-01-15',
      taxPeriodMonth: 1,
      taxPeriodYear: 2025,
      items: [
        {
          id: 'item-in-2',
          itemType: 'SERVICES',
          itemCode: '160200',
          itemName: 'Lisensi Infrastruktur Cloud Enterprise',
          unit: 'Paket',
          unitPrice: 35_000_000,
          quantity: 1,
          discount: 0,
          isLuxury: false,
          dpp: line4.dpp,
          dppOtherValue: line4.dppOtherValue,
          ppn: line4.ppn,
          ppnbm: 0,
        },
      ],
      dppTotal: line4.dpp,
      dppOtherValue: line4.dppOtherValue,
      ppnTotal: line4.ppn,
      ppnbmTotal: 0,
      status: 'APPROVED',
      isCredited: true,
      returnAmount: 0,
      signedAt: '2025-01-15T11:20:00.000Z',
      createdAt: '2025-01-15T11:00:00.000Z',
    },
    {
      id: `inv-exp-1-${cleanNik.slice(-4)}`,
      taxpayerId: corpId,
      direction: 'EXPORT',
      transactionCode: '01',
      invoiceNumber: 'PEB-2025-000451',
      amendmentSeq: 0,
      referenceCode: 'PEB/SG/2025/01',
      counterpartyNpwp: '0000000000000000',
      counterpartyName: 'PACIFIC VENTURES PTE LTD (SINGAPORE)',
      invoiceDate: '2025-01-20',
      taxPeriodMonth: 1,
      taxPeriodYear: 2025,
      items: [
        {
          id: 'item-exp-1',
          itemType: 'SERVICES',
          itemCode: '160200',
          itemName: 'Ekspor Jasa Pengembangan Aplikasi Keuangan',
          unit: 'Kontrak',
          unitPrice: 120_000_000,
          quantity: 1,
          discount: 0,
          isLuxury: false,
          dpp: lineExport.dpp,
          dppOtherValue: lineExport.dppOtherValue,
          ppn: 0,
          ppnbm: 0,
        },
      ],
      dppTotal: lineExport.dpp,
      dppOtherValue: lineExport.dppOtherValue,
      ppnTotal: 0,
      ppnbmTotal: 0,
      status: 'APPROVED',
      isCredited: false,
      returnAmount: 0,
      signedAt: '2025-01-20T16:00:00.000Z',
      createdAt: '2025-01-20T15:30:00.000Z',
    },
  ];

  // Exact PDF Case Study BPA1 for Tuan A + Unissued e-Bupot PPh 21 & PPh 23 for Corporate training
  const bpa1Tax = calculatePphPasal17(473_500_000); // 87,375,000 exact!
  const slips = [
    {
      id: `slip-bpa1-${cleanNik.slice(-4)}`,
      issuerId: corpId,
      issuerNpwp: corpNpwp,
      issuerName: corpName,
      recipientNikNpwp: cleanNik,
      recipientName: indName,
      recipientAddress: individualTaxpayer.address,
      slipType: 'BPA1' as const,
      slipNumber: '1.1-12.24-0000001',
      taxPeriodMonth: 12,
      taxPeriodYear: 2024,
      objectCode: '21-100-01',
      objectName: 'Pegawai Tetap — Bukti Potong Tahunan BPA1',
      ptkpStatus: 'TK/0' as const,
      grossAmount: 533_500_000,
      positionAllowance: 6_000_000,
      pensionContribution: 0,
      netAmount: 527_500_000,
      ptkpAmount: 54_000_000,
      pkpAmount: 473_500_000,
      ratePercent: 18.45,
      taxWithheld: bpa1Tax, // Rp 87.375.000
      status: 'ISSUED' as const,
      signedAt: '2025-01-15T08:00:00.000Z',
      createdAt: '2025-01-15T08:00:00.000Z',
    },
    {
      id: `slip-bpmp-1-${cleanNik.slice(-4)}`,
      issuerId: corpId,
      issuerNpwp: corpNpwp,
      issuerName: corpName,
      recipientNikNpwp: cleanNik,
      recipientName: indName,
      slipType: 'BPMP' as const,
      slipNumber: 'DRAFT-BPMP-001',
      taxPeriodMonth: 1,
      taxPeriodYear: 2025,
      objectCode: '21-100-01',
      objectName: 'Pegawai Tetap (BPMP Bulanan TER Kategori A)',
      ptkpStatus: 'TK/0' as const,
      grossAmount: 25_000_000,
      netAmount: 25_000_000,
      ratePercent: 10,
      taxWithheld: 2_500_000,
      status: 'UNISSUED' as const,
      createdAt: '2025-01-25T09:00:00.000Z',
    },
    {
      id: `slip-bpmp-2-${cleanNik.slice(-4)}`,
      issuerId: corpId,
      issuerNpwp: corpNpwp,
      issuerName: corpName,
      recipientNikNpwp: '3174051109910004',
      recipientName: 'BUDI SANTOSO',
      slipType: 'BPMP' as const,
      slipNumber: 'DRAFT-BPMP-002',
      taxPeriodMonth: 1,
      taxPeriodYear: 2025,
      objectCode: '21-100-01',
      objectName: 'Pegawai Tetap (BPMP Bulanan TER Kategori B)',
      ptkpStatus: 'K/1' as const,
      grossAmount: 14_500_000,
      netAmount: 14_500_000,
      ratePercent: 5,
      taxWithheld: 725_000,
      status: 'UNISSUED' as const,
      createdAt: '2025-01-25T09:05:00.000Z',
    },
    {
      id: `slip-bppu-1-${cleanNik.slice(-4)}`,
      issuerId: corpId,
      issuerNpwp: corpNpwp,
      issuerName: corpName,
      recipientNikNpwp: '0788991122334000',
      recipientName: 'CV MITRA KONSULTAN PRIMA',
      slipType: 'BPPU_23' as const,
      slipNumber: 'DRAFT-BPPU-001',
      taxPeriodMonth: 1,
      taxPeriodYear: 2025,
      objectCode: '24-104-29',
      objectName: 'Jasa Konsultan / Manajemen',
      ptkpStatus: 'TK/0' as const,
      grossAmount: 50_000_000,
      netAmount: 50_000_000,
      ratePercent: 2,
      taxWithheld: 1_000_000,
      status: 'UNISSUED' as const,
      createdAt: '2025-01-22T11:00:00.000Z',
    },
  ];

  // Exact PDF Case Study Assets & Liabilities for Tuan A (Kas Rp300jt, Mobil Rp200jt, Utang Rp200jt)
  const assets = [
    {
      id: `ast-1-${cleanNik.slice(-4)}`,
      taxpayerId: indId,
      recordType: 'ASSET' as const,
      code: '011',
      description: 'Kas dan Tabungan Bank Mandiri',
      yearAcquired: 2024,
      amount: 300_000_000,
      relationOrLender: 'Bank Mandiri Cab. Sudirman',
    },
    {
      id: `ast-2-${cleanNik.slice(-4)}`,
      taxpayerId: indId,
      recordType: 'ASSET' as const,
      code: '043',
      description: 'Mobil Penumpang Toyota Innova Zenix',
      yearAcquired: 2023,
      amount: 200_000_000,
      relationOrLender: 'Kepemilikan Pribadi',
    },
    {
      id: `lia-1-${cleanNik.slice(-4)}`,
      taxpayerId: indId,
      recordType: 'LIABILITY' as const,
      code: '101',
      description: 'Kredit Pemilikan Kendaraan / Bank',
      yearAcquired: 2023,
      amount: 200_000_000,
      relationOrLender: 'PT Bank Central Asia Tbk',
    },
    {
      id: `fam-1-${cleanNik.slice(-4)}`,
      taxpayerId: indId,
      recordType: 'FAMILY' as const,
      code: 'KK-01',
      description: indName,
      yearAcquired: 1988,
      amount: 0,
      relationOrLender: 'Kepala Keluarga (Wajib Pajak)',
      nikMember: cleanNik,
    },
  ];

  const notifications = [
    {
      id: `notif-1-${cleanNik.slice(-4)}`,
      taxpayerId: indId,
      title: 'Bukti Potong BPA1 Tahun 2024 Tersedia',
      message: `${corpName} telah menerbitkan Bukti Potong Tahunan BPA1 No. 1.1-12.24-0000001 atas nama ${indName} (Bruto Rp533.500.000, PPh Dipotong Rp87.375.000). Unduh di Portal Saya > Dokumen Saya.`,
      category: 'BUPOT' as const,
      isRead: false,
      createdAt: nowIso,
    },
    {
      id: `notif-2-${cleanNik.slice(-4)}`,
      taxpayerId: corpId,
      title: 'Faktur Pajak Masukan Baru Diterima',
      message: `PT DISTRIBUTOR PERANGKAT NUSANTARA telah menerbitkan e-Faktur No. 04002500000088101 (PPN Rp8.800.000). Silakan periksa dan kreditkan di menu e-Faktur > Pajak Masukan.`,
      category: 'FAKTUR' as const,
      isRead: false,
      createdAt: nowIso,
    },
  ];

  return {
    nikKey: cleanNik,
    individualTaxpayer,
    corporateTaxpayer,
    invoices,
    slips,
    returns: [],
    assets,
    billings: [],
    notifications,
    examEvaluations: {},
  };
}

export function createDefaultBadanPayload(): SptTahunanBadanPayload {
  return calculatePphBadan({
    pembukuanDiaudit: true,
    namaKap: 'KAP Nusantara & Rekan',
    peredaranBruto: 12_000_000_000,
    hpp: 7_200_000_000,
    biayaUsaha: 3_100_000_000,
    penghasilanLainKomersial: 150_000_000,
    biayaLainKomersial: 50_000_000,
    // Laba komersial = 1.800.000.000
    koreksiPositifNatura: 45_000_000,
    koreksiPositifSanksiPajak: 15_000_000,
    koreksiPositifJamuanNonNominatif: 40_000_000,
    koreksiPositifPenyisihanPiutang: 20_000_000,
    koreksiPositifLainnya: 0,
    koreksiNegatifPenghasilanFinal: 70_000_000,
    koreksiNegatifPenyusutanFiskal: 50_000_000,
    koreksiNegatifLainnya: 0,
    // Neto fiskal = 1.800.000.000 + 120jt - 120jt = 1.800.000.000
    kompensasiKerugian: 0,
    kreditPph22: 25_000_000,
    kreditPph23: 45_000_000,
    kreditPph24: 0,
    angsuranPph25: 180_000_000,
    totalAset: 8_500_000_000,
    totalKewajiban: 3_200_000_000,
    totalEkuitas: 5_300_000_000,
    pengurus: [
      { nama: 'TUAN A', npwp: '3174011508880001', jabatan: 'Direktur Utama', sahamPersen: 60 },
      { nama: 'RINA KUSUMA', npwp: '3174022004890003', jabatan: 'Komisaris', sahamPersen: 40 },
    ],
  });
}

export function evaluateExamCase(workspace: WorkspaceState, caseCode: ExamCaseCode): ExamEvaluation {
  const checks: ExamCheckItem[] = [];

  if (caseCode === 'CASE_PPN') {
    const approvedOut = workspace.invoices.filter((i) => i.direction === 'OUTPUT' && (i.status === 'APPROVED' || i.status === 'AMENDED'));
    const creditedIn = workspace.invoices.filter((i) => i.direction === 'INPUT' && i.isCredited);
    const ppnReturn = workspace.returns.find((r) => r.returnType === 'SPT_MASA_PPN');
    const ppnSubmitted = workspace.returns.find((r) => r.returnType === 'SPT_MASA_PPN' && r.status === 'SUBMITTED');

    checks.push({
      id: 'ppn-out',
      label: 'Minimal 2 Faktur Pajak Keluaran berstatus APPROVED / AMENDED',
      passed: approvedOut.length >= 2,
      expectedHint: 'Approve faktur DRAFT atau buat Faktur Keluaran baru lalu tanda tangani.',
      actualValue: `${approvedOut.length} Faktur Keluaran disetujui`,
    });
    checks.push({
      id: 'ppn-in',
      label: 'Pajak Masukan telah dikreditkan (minimal 2 faktur)',
      passed: creditedIn.length >= 2,
      expectedHint: 'Buka e-Faktur > Pajak Masukan dan klik Kreditkan Faktur.',
      actualValue: `${creditedIn.length} Faktur Masukan dikreditkan`,
    });
    checks.push({
      id: 'ppn-draft',
      label: 'Konsep SPT Masa PPN telah dibuat & dilakukan Posting SPT',
      passed: Boolean(ppnReturn),
      expectedHint: 'Buat Konsep SPT Masa PPN di menu Surat Pemberitahuan (SPT).',
      actualValue: ppnReturn ? `SPT Masa ${ppnReturn.taxPeriodMonth}/${ppnReturn.taxYear} (${ppnReturn.status})` : 'Belum dibuat',
    });
    checks.push({
      id: 'ppn-submit',
      label: 'SPT Masa PPN telah dibayar & dilaporkan (BPE terbit)',
      passed: Boolean(ppnSubmitted && ppnSubmitted.bpeNumber),
      expectedHint: 'Klik Bayar dan Lapor (Deposit/Billing) dan tanda tangani dokumen.',
      actualValue: ppnSubmitted?.bpeNumber ? `BPE: ${ppnSubmitted.bpeNumber}` : 'Belum dilaporkan',
    });
  } else if (caseCode === 'CASE_PPH21_KARYAWAN') {
    const bpa1 = workspace.slips.find((s) => s.slipType === 'BPA1' && s.status === 'ISSUED');
    const opReturn = workspace.returns.find((r) => r.returnType === 'SPT_TAHUNAN_OP');
    const opPayload = opReturn?.payload as SptTahunanOpPayload | undefined;
    const isNihilAccurate = Boolean(
      opPayload &&
        opPayload.penghasilanBrutoPekerjaan === 533_500_000 &&
        opPayload.pphTerutang === 87_375_000 &&
        opReturn?.underOverPayment === 0
    );

    checks.push({
      id: 'pph21-bpa1',
      label: 'Bukti Potong BPA1 tersedia di Portal Saya > Dokumen Saya',
      passed: Boolean(bpa1),
      expectedHint: 'Periksa BPA1 atas nama Tuan A (Rp533.500.000).',
      actualValue: bpa1 ? `No. ${bpa1.slipNumber} (${formatRp(bpa1.grossAmount)})` : 'Tidak ditemukan',
    });
    checks.push({
      id: 'pph21-posting',
      label: 'Konsep SPT Tahunan OP 2024 telah di-Posting dari BPA1',
      passed: Boolean(opPayload && opPayload.penghasilanBrutoPekerjaan > 0 && opPayload.kreditPajakBpa1 > 0),
      expectedHint: 'Klik Posting SPT di formulir SPT Tahunan OP.',
      actualValue: opPayload ? `Bruto ${formatRp(opPayload.penghasilanBrutoPekerjaan)}` : 'Belum dibuat',
    });
    checks.push({
      id: 'pph21-calc',
      label: 'Perhitungan PPh Pasal 17 = Rp87.375.000 & Status Nihil (Rp0)',
      passed: isNihilAccurate,
      expectedHint: 'Neto Rp527.500.000 - PTKP TK/0 Rp54.000.000 = PKP Rp473.500.000 -> PPh Rp87.375.000.',
      actualValue: opPayload
        ? `PPh ${formatRp(opPayload.pphTerutang)} | Kurang/Lebih: ${formatRp(opReturn?.underOverPayment || 0)}`
        : 'Belum dihitung',
    });
    checks.push({
      id: 'pph21-submit',
      label: 'SPT Tahunan Karyawan telah Dilaporkan (BPE Terbit)',
      passed: Boolean(opReturn && opReturn.status === 'SUBMITTED' && opReturn.bpeNumber),
      expectedHint: 'Tanda tangani menggunakan Kode Otorisasi DJP hingga BPE terbit.',
      actualValue: opReturn?.bpeNumber ? `BPE: ${opReturn.bpeNumber}` : 'Belum dilaporkan',
    });
  } else if (caseCode === 'CASE_EBUPOT_21_23') {
    const issued21 = workspace.slips.filter((s) => (s.slipType === 'BPMP' || s.slipType === 'BP21') && s.status === 'ISSUED');
    const issued23 = workspace.slips.filter((s) => s.slipType === 'BPPU_23' && s.status === 'ISSUED');
    const spt21 = workspace.returns.find((r) => r.returnType === 'SPT_MASA_PPH21' && r.status === 'SUBMITTED');
    const spt23 = workspace.returns.find((r) => r.returnType === 'SPT_MASA_UNIFIKASI' && r.status === 'SUBMITTED');

    checks.push({
      id: 'bupot-21',
      label: 'Minimal 1 Bukti Potong PPh 21 (BPMP/BP21) berstatus Telah Terbit',
      passed: issued21.length >= 1,
      expectedHint: 'Buka eBupot > BPMP, centang data lalu klik Terbitkan.',
      actualValue: `${issued21.length} Bupot PPh 21 terbit`,
    });
    checks.push({
      id: 'bupot-23',
      label: 'Minimal 1 Bukti Potong Unifikasi PPh 23 (BPPU) berstatus Telah Terbit',
      passed: issued23.length >= 1,
      expectedHint: 'Buka eBupot > BPPU PPh 23, terbitkan bukti potong Kode 24-104-29.',
      actualValue: `${issued23.length} Bupot PPh 23 terbit`,
    });
    checks.push({
      id: 'spt-21',
      label: 'SPT Masa PPh 21/26 telah Dilaporkan (BPE terbit)',
      passed: Boolean(spt21),
      expectedHint: 'Buat Konsep SPT Masa PPh 21/26, Posting, Bayar & Lapor.',
      actualValue: spt21?.bpeNumber ? `BPE: ${spt21.bpeNumber}` : 'Belum dilaporkan',
    });
    checks.push({
      id: 'spt-23',
      label: 'SPT Masa PPh Unifikasi (PPh 23) telah Dilaporkan (BPE terbit)',
      passed: Boolean(spt23),
      expectedHint: 'Buat Konsep SPT Masa PPh Unifikasi, Posting, Bayar & Lapor.',
      actualValue: spt23?.bpeNumber ? `BPE: ${spt23.bpeNumber}` : 'Belum dilaporkan',
    });
  } else if (caseCode === 'CASE_SPT_OP') {
    const totalAssets = workspace.assets.filter((a) => a.recordType === 'ASSET').reduce((s, a) => s + a.amount, 0);
    const totalLiabilities = workspace.assets.filter((a) => a.recordType === 'LIABILITY').reduce((s, a) => s + a.amount, 0);
    const opReturn = workspace.returns.find((r) => r.returnType === 'SPT_TAHUNAN_OP');
    const opSubmitted = workspace.returns.find((r) => r.returnType === 'SPT_TAHUNAN_OP' && r.status === 'SUBMITTED');

    checks.push({
      id: 'op-assets',
      label: 'Lampiran L-1 Bagian A: Daftar Harta tercatat (≥ Rp500.000.000)',
      passed: totalAssets >= 500_000_000,
      expectedHint: 'Pastikan Kas Rp300jt & Mobil Rp200jt tercatat di Lampiran L-1.',
      actualValue: formatRp(totalAssets),
    });
    checks.push({
      id: 'op-liab',
      label: 'Lampiran L-1 Bagian B: Daftar Utang tercatat (≥ Rp200.000.000)',
      passed: totalLiabilities >= 200_000_000,
      expectedHint: 'Pastikan Utang Bank Rp200jt tercatat di Lampiran L-1.',
      actualValue: formatRp(totalLiabilities),
    });
    checks.push({
      id: 'op-form',
      label: 'Formulir Induk SPT Tahunan OP 2024 telah dilengkapi',
      passed: Boolean(opReturn),
      expectedHint: 'Buat Konsep SPT Tahunan OP 2024 & klik Posting SPT.',
      actualValue: opReturn ? `Status: ${opReturn.status}` : 'Belum dibuat',
    });
    checks.push({
      id: 'op-submit',
      label: 'SPT Tahunan Orang Pribadi telah ditandatangani & Dilaporkan',
      passed: Boolean(opSubmitted && opSubmitted.bpeNumber),
      expectedHint: 'Kirim SPT menggunakan Kode Otorisasi DJP.',
      actualValue: opSubmitted?.bpeNumber ? `BPE: ${opSubmitted.bpeNumber}` : 'Belum dilaporkan',
    });
  } else if (caseCode === 'CASE_SPT_BADAN') {
    const badanReturn = workspace.returns.find((r) => r.returnType === 'SPT_TAHUNAN_BADAN');
    const payload = badanReturn?.payload as SptTahunanBadanPayload | undefined;
    const hasReconciliation = Boolean(
      payload &&
        (payload.koreksiPositifNatura +
          payload.koreksiPositifSanksiPajak +
          payload.koreksiPositifJamuanNonNominatif +
          payload.koreksiPositifPenyisihanPiutang +
          payload.koreksiPositifLainnya >
          0 ||
          payload.koreksiNegatifPenghasilanFinal + payload.koreksiNegatifPenyusutanFiskal > 0)
    );
    const has31E = Boolean(payload && payload.pkpFasilitas31E > 0 && payload.totalPphTerutang > 0);
    const badanSubmitted = workspace.returns.find((r) => r.returnType === 'SPT_TAHUNAN_BADAN' && r.status === 'SUBMITTED');

    checks.push({
      id: 'badan-draft',
      label: 'Konsep SPT Tahunan PPh Badan 2024 telah dibuat',
      passed: Boolean(badanReturn),
      expectedHint: 'Masuk akun Impersonate Perusahaan > Buat Konsep SPT Tahunan PPh Badan.',
      actualValue: badanReturn ? `Tahun ${badanReturn.taxYear} (${badanReturn.status})` : 'Belum dibuat',
    });
    checks.push({
      id: 'badan-rekon',
      label: 'Rekonsiliasi Fiskal Positif & Negatif telah diisi',
      passed: hasReconciliation,
      expectedHint: 'Lengkapi koreksi fiskal positif/negatif pada tab Laporan Keuangan & Rekonsiliasi.',
      actualValue: payload ? `Neto Fiskal: ${formatRp(payload.penghasilanNetoFiskal)}` : 'Belum diisi',
    });
    checks.push({
      id: 'badan-31e',
      label: 'Perhitungan Fasilitas Pasal 31E & Tarif Pasal 17 (22%) valid',
      passed: has31E,
      expectedHint: 'Verifikasi PKP Fasilitas 31E (11%) & Non-Fasilitas (22%).',
      actualValue: payload ? `PPh Terutang: ${formatRp(payload.totalPphTerutang)}` : 'Belum dihitung',
    });
    checks.push({
      id: 'badan-submit',
      label: 'PPh Pasal 29 dilunasi & SPT Tahunan PPh Badan Dilaporkan (BPE Terbit)',
      passed: Boolean(badanSubmitted && badanSubmitted.bpeNumber),
      expectedHint: 'Klik Bayar dan Lapor (Deposit/Kode Billing) hingga BPE Badan terbit.',
      actualValue: badanSubmitted?.bpeNumber ? `BPE: ${badanSubmitted.bpeNumber}` : 'Belum dilaporkan',
    });
  }

  const passedCount = checks.filter((c) => c.passed).length;
  const totalChecks = checks.length || 1;
  const score = Math.round((passedCount / totalChecks) * 100);

  return {
    caseCode,
    score,
    passedCount,
    totalChecks,
    checks,
    evaluatedAt: new Date().toISOString(),
  };
}
