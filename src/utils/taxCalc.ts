import { PtkpStatus, SptTahunanBadanPayload } from '../types/tax.ts';

export const PTKP_VALUES: Record<PtkpStatus, number> = {
  'TK/0': 54_000_000,
  'TK/1': 58_500_000,
  'TK/2': 63_000_000,
  'TK/3': 67_500_000,
  'K/0': 58_500_000,
  'K/1': 63_000_000,
  'K/2': 67_500_000,
  'K/3': 72_000_000,
};

export function getTerCategory(ptkp: PtkpStatus): 'A' | 'B' | 'C' {
  if (ptkp === 'TK/0' || ptkp === 'TK/1' || ptkp === 'K/0') return 'A';
  if (ptkp === 'K/3') return 'C';
  return 'B';
}

// Official PP 58/2023 TER Monthly Brackets (selected comprehensive tiers)
const TER_TABLE: Record<'A' | 'B' | 'C', Array<[number, number]>> = {
  A: [
    [5_400_000, 0],
    [5_650_000, 0.25],
    [5_950_000, 0.5],
    [6_300_000, 0.75],
    [6_750_000, 1.0],
    [7_500_000, 1.25],
    [8_550_000, 1.5],
    [9_650_000, 1.75],
    [10_050_000, 2.0],
    [10_350_000, 2.25],
    [10_700_000, 2.5],
    [11_050_000, 3.0],
    [11_600_000, 3.5],
    [12_500_000, 4.0],
    [13_750_000, 5.0],
    [15_100_000, 6.0],
    [16_950_000, 7.0],
    [19_750_000, 8.0],
    [24_150_000, 9.0],
    [26_450_000, 10.0],
    [28_000_000, 11.0],
    [30_050_000, 12.0],
    [32_400_000, 13.0],
    [35_400_000, 14.0],
    [39_100_000, 15.0],
    [43_850_000, 16.0],
    [47_800_000, 17.0],
    [51_400_000, 18.0],
    [56_300_000, 19.0],
    [62_200_000, 20.0],
    [68_600_000, 21.0],
    [77_500_000, 22.0],
    [89_000_000, 23.0],
    [103_000_000, 24.0],
    [125_000_000, 25.0],
    [157_000_000, 26.0],
    [206_000_000, 27.0],
    [337_000_000, 28.0],
    [454_000_000, 29.0],
    [550_000_000, 30.0],
    [695_000_000, 31.0],
    [910_000_000, 32.0],
    [1_400_000_000, 33.0],
    [Infinity, 34.0],
  ],
  B: [
    [6_200_000, 0],
    [6_500_000, 0.25],
    [6_850_000, 0.5],
    [7_300_000, 0.75],
    [9_200_000, 1.0],
    [10_750_000, 1.5],
    [11_250_000, 2.0],
    [11_600_000, 2.5],
    [12_600_000, 3.0],
    [13_600_000, 4.0],
    [14_950_000, 5.0],
    [16_400_000, 6.0],
    [18_450_000, 7.0],
    [21_850_000, 8.0],
    [26_000_000, 9.0],
    [27_700_000, 10.0],
    [29_350_000, 11.0],
    [31_450_000, 12.0],
    [33_950_000, 13.0],
    [37_100_000, 14.0],
    [41_100_000, 15.0],
    [45_800_000, 16.0],
    [49_500_000, 17.0],
    [53_800_000, 18.0],
    [58_500_000, 19.0],
    [64_000_000, 20.0],
    [71_000_000, 21.0],
    [80_000_000, 22.0],
    [93_000_000, 23.0],
    [109_000_000, 24.0],
    [129_000_000, 25.0],
    [163_000_000, 26.0],
    [211_000_000, 27.0],
    [374_000_000, 28.0],
    [459_000_000, 29.0],
    [555_000_000, 30.0],
    [704_000_000, 31.0],
    [957_000_000, 32.0],
    [1_405_000_000, 33.0],
    [Infinity, 34.0],
  ],
  C: [
    [6_600_000, 0],
    [6_950_000, 0.25],
    [7_350_000, 0.5],
    [7_800_000, 0.75],
    [8_850_000, 1.0],
    [9_800_000, 1.25],
    [10_950_000, 1.5],
    [11_200_000, 1.75],
    [12_050_000, 2.0],
    [12_950_000, 3.0],
    [14_150_000, 4.0],
    [15_550_000, 5.0],
    [17_050_000, 6.0],
    [19_500_000, 7.0],
    [22_700_000, 8.0],
    [26_600_000, 9.0],
    [28_100_000, 10.0],
    [30_100_000, 11.0],
    [32_600_000, 12.0],
    [35_400_000, 13.0],
    [38_900_000, 14.0],
    [43_000_000, 15.0],
    [47_400_000, 16.0],
    [51_200_000, 17.0],
    [55_800_000, 18.0],
    [60_400_000, 19.0],
    [66_700_000, 20.0],
    [74_500_000, 21.0],
    [83_200_000, 22.0],
    [95_600_000, 23.0],
    [110_500_000, 24.0],
    [134_000_000, 25.0],
    [169_000_000, 26.0],
    [221_000_000, 27.0],
    [390_000_000, 28.0],
    [463_000_000, 29.0],
    [561_000_000, 30.0],
    [709_000_000, 31.0],
    [965_000_000, 32.0],
    [1_419_000_000, 33.0],
    [Infinity, 34.0],
  ],
};

export function calculatePph21Ter(grossMonthly: number, ptkp: PtkpStatus): { category: 'A' | 'B' | 'C'; ratePercent: number; tax: number } {
  const category = getTerCategory(ptkp);
  const brackets = TER_TABLE[category];
  let ratePercent = 0;
  for (const [limit, rate] of brackets) {
    if (grossMonthly <= limit) {
      ratePercent = rate;
      break;
    }
  }
  const tax = Math.floor((grossMonthly * ratePercent) / 100);
  return { category, ratePercent, tax };
}

export function calculatePphPasal17(pkpRaw: number): number {
  if (pkpRaw <= 0) return 0;
  // Pembulatan ke bawah ribuan penuh sesuai UU PPh
  const pkp = Math.floor(pkpRaw / 1000) * 1000;
  let remaining = pkp;
  let tax = 0;

  const layers: Array<[number, number]> = [
    [60_000_000, 0.05],
    [190_000_000, 0.15], // 60jt -> 250jt
    [250_000_000, 0.25], // 250jt -> 500jt
    [4_500_000_000, 0.30], // 500jt -> 5M
    [Infinity, 0.35], // > 5M
  ];

  for (const [band, rate] of layers) {
    if (remaining <= 0) break;
    const taxable = Math.min(remaining, band);
    tax += taxable * rate;
    remaining -= taxable;
  }

  return Math.round(tax);
}

export function calculatePpnLine(unitPrice: number, quantity: number, discount: number, isLuxury: boolean) {
  const dpp = Math.max(0, Math.round(unitPrice * quantity - discount));
  // PMK 131/2024: Non-mewah DPP Nilai Lain = 11/12 * DPP, tarif 12% (efektif 11%); Mewah = 12% penuh
  const dppOtherValue = isLuxury ? dpp : Math.round((dpp * 11) / 12);
  const ppn = Math.round(dppOtherValue * 0.12);
  return { dpp, dppOtherValue, ppn };
}

export function calculatePphBadan(input: Partial<SptTahunanBadanPayload>): SptTahunanBadanPayload {
  const peredaranBruto = Number(input.peredaranBruto || 0);
  const hpp = Number(input.hpp || 0);
  const biayaUsaha = Number(input.biayaUsaha || 0);
  const penghasilanLainKomersial = Number(input.penghasilanLainKomersial || 0);
  const biayaLainKomersial = Number(input.biayaLainKomersial || 0);

  const labaKomersial = peredaranBruto - hpp - biayaUsaha + penghasilanLainKomersial - biayaLainKomersial;

  const koreksiPositifNatura = Number(input.koreksiPositifNatura || 0);
  const koreksiPositifSanksiPajak = Number(input.koreksiPositifSanksiPajak || 0);
  const koreksiPositifJamuanNonNominatif = Number(input.koreksiPositifJamuanNonNominatif || 0);
  const koreksiPositifPenyisihanPiutang = Number(input.koreksiPositifPenyisihanPiutang || 0);
  const koreksiPositifLainnya = Number(input.koreksiPositifLainnya || 0);
  const totalKoreksiPositif =
    koreksiPositifNatura +
    koreksiPositifSanksiPajak +
    koreksiPositifJamuanNonNominatif +
    koreksiPositifPenyisihanPiutang +
    koreksiPositifLainnya;

  const koreksiNegatifPenghasilanFinal = Number(input.koreksiNegatifPenghasilanFinal || 0);
  const koreksiNegatifPenyusutanFiskal = Number(input.koreksiNegatifPenyusutanFiskal || 0);
  const koreksiNegatifLainnya = Number(input.koreksiNegatifLainnya || 0);
  const totalKoreksiNegatif =
    koreksiNegatifPenghasilanFinal + koreksiNegatifPenyusutanFiskal + koreksiNegatifLainnya;

  const penghasilanNetoFiskal = labaKomersial + totalKoreksiPositif - totalKoreksiNegatif;
  const kompensasiKerugian = Number(input.kompensasiKerugian || 0);
  const pkpRaw = Math.max(0, penghasilanNetoFiskal - kompensasiKerugian);
  const pkpDibulatkan = Math.floor(pkpRaw / 1000) * 1000;

  let pkpFasilitas31E = 0;
  let pkpNonFasilitas = 0;
  if (pkpDibulatkan > 0) {
    if (peredaranBruto <= 4_800_000_000) {
      pkpFasilitas31E = pkpDibulatkan;
      pkpNonFasilitas = 0;
    } else if (peredaranBruto <= 50_000_000_000) {
      pkpFasilitas31E = Math.round((4_800_000_000 / peredaranBruto) * pkpDibulatkan);
      pkpNonFasilitas = Math.max(0, pkpDibulatkan - pkpFasilitas31E);
    } else {
      pkpFasilitas31E = 0;
      pkpNonFasilitas = pkpDibulatkan;
    }
  }

  const pphFasilitas31E = Math.round(pkpFasilitas31E * 0.11); // 50% x 22%
  const pphNonFasilitas = Math.round(pkpNonFasilitas * 0.22); // 22%
  const totalPphTerutang = pphFasilitas31E + pphNonFasilitas;

  const kreditPph22 = Number(input.kreditPph22 || 0);
  const kreditPph23 = Number(input.kreditPph23 || 0);
  const kreditPph24 = Number(input.kreditPph24 || 0);
  const angsuranPph25 = Number(input.angsuranPph25 || 0);
  const totalKreditPajak = kreditPph22 + kreditPph23 + kreditPph24 + angsuranPph25;
  const pphKurangLebihBayar = totalPphTerutang - totalKreditPajak;

  return {
    pembukuanDiaudit: Boolean(input.pembukuanDiaudit),
    namaKap: input.namaKap || '',
    peredaranBruto,
    hpp,
    biayaUsaha,
    penghasilanLainKomersial,
    biayaLainKomersial,
    labaKomersial,
    koreksiPositifNatura,
    koreksiPositifSanksiPajak,
    koreksiPositifJamuanNonNominatif,
    koreksiPositifPenyisihanPiutang,
    koreksiPositifLainnya,
    koreksiNegatifPenghasilanFinal,
    koreksiNegatifPenyusutanFiskal,
    koreksiNegatifLainnya,
    penghasilanNetoFiskal,
    kompensasiKerugian,
    pkpDibulatkan,
    pkpFasilitas31E,
    pkpNonFasilitas,
    pphFasilitas31E,
    pphNonFasilitas,
    totalPphTerutang,
    kreditPph22,
    kreditPph23,
    kreditPph24,
    angsuranPph25,
    totalKreditPajak,
    pphKurangLebihBayar,
    totalAset: Number(input.totalAset || 0),
    totalKewajiban: Number(input.totalKewajiban || 0),
    totalEkuitas: Number(input.totalEkuitas || 0),
    pengurus: input.pengurus || [],
  };
}

export function formatRp(value: number): string {
  const abs = Math.abs(Math.round(value || 0));
  const formatted = new Intl.NumberFormat('id-ID').format(abs);
  return value < 0 ? `(Rp ${formatted})` : `Rp ${formatted}`;
}

export function formatNum(value: number): string {
  return new Intl.NumberFormat('id-ID').format(Math.round(value || 0));
}

export const MONTHS_ID = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
];

export const FAKTUR_TRANSACTION_CODES = [
  { code: '01', label: '01 - kepada pihak yang bukan pemungut PPN' },
  { code: '02', label: '02 - kepada pemungut PPN instansi pemerintah' },
  { code: '03', label: '03 - kepada pemungut PPN selain instansi pemerintah' },
  { code: '04', label: '04 - DPP Nilai Lain' },
  { code: '05', label: '05 - besaran tertentu' },
  { code: '06', label: '06 - kepada orang pribadi pemegang paspor luar negeri (16E UU PPN)' },
  { code: '07', label: '07 - penyerahan dengan fasilitas PPN atau PPN dan PPnBM tidak dipungut/ditanggung pemerintah' },
  { code: '08', label: '08 - penyerahan dengan fasilitas dibebaskan PPN atau PPN dan PPnBM' },
  { code: '09', label: '09 - penyerahan aktiva yang menurut tujuan semula tidak diperjualbelikan (16D UU PPN)' },
  { code: '10', label: '10 - penyerahan lainnya' },
];

import { ALL_ITEM_CODES, GOODS_CODES, SERVICES_CODES } from '../data/efakturCodes.ts';
export { ALL_ITEM_CODES, GOODS_CODES, SERVICES_CODES };
export const ITEM_CODES_CATALOG = ALL_ITEM_CODES;

export const PPH23_OBJECT_CODES = [
  { code: '24-104-29', name: 'Jasa Konsultan / Manajemen', rate: 2 },
  { code: '24-104-04', name: 'Jasa Teknik & Rekayasa', rate: 2 },
  { code: '24-104-22', name: 'Jasa Pemeliharaan & Perawatan Peralatan/IT', rate: 2 },
  { code: '24-104-37', name: 'Jasa Penyelenggara Kegiatan (Event Organizer)', rate: 2 },
  { code: '24-100-01', name: 'Sewa dan Penghasilan Lain Sehubungan Penggunaan Harta', rate: 2 },
  { code: '24-101-01', name: 'Dividen / Bunga / Royalti', rate: 15 },
];

export const PPH21_OBJECT_CODES = [
  { code: '21-100-01', name: 'Pegawai Tetap (BPMP Bulanan TER)', slipType: 'BPMP' as const },
  { code: '21-100-07', name: 'Tenaga Ahli / Bukan Pegawai (BP21)', slipType: 'BP21' as const },
  { code: '21-100-13', name: 'Peserta Kegiatan / Honorarium (BP21)', slipType: 'BP21' as const },
  { code: '21-100-01-A1', name: 'Pegawai Tetap Tahunan (BPA1)', slipType: 'BPA1' as const },
];

export function generateFakturNumber(txCode: string, seq: number, isAmendment = false, year = 2026): string {
  const cleanCode = (txCode || '01').padStart(2, '0').slice(0, 2);
  const statusDigits = isAmendment ? '01' : '00';
  const yearDigits = String(year).slice(-2);
  const serialDigits = String(seq).padStart(10, '0');
  return `${cleanCode}${statusDigits}${yearDigits}${serialDigits}`;
}

export function generateBillingCode(): string {
  const prefix = '026';
  let rest = '';
  for (let i = 0; i < 12; i++) {
    rest += Math.floor(Math.random() * 10).toString();
  }
  return prefix + rest;
}

export function generateBpeNumber(typeCode: string): string {
  const rand = Math.floor(10000000 + Math.random() * 89999999);
  return `BPE-${typeCode}-${new Date().getFullYear()}-${rand}`;
}

export function generateNtpn(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ0123456789';
  let out = '';
  for (let i = 0; i < 16; i++) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}

export function terbilang(n: number): string {
  const bilangan = [
    '',
    'Satu',
    'Dua',
    'Tiga',
    'Empat',
    'Lima',
    'Enam',
    'Tujuh',
    'Delapan',
    'Sembilan',
    'Sepuluh',
    'Sebelas',
  ];
  const num = Math.floor(Math.abs(n || 0));
  if (num === 0) return 'Nol Rupiah';

  function helper(val: number): string {
    if (val < 12) return bilangan[val];
    if (val < 20) return helper(val - 10) + ' Belas';
    if (val < 100) return helper(Math.floor(val / 10)) + ' Puluh ' + (val % 10 !== 0 ? helper(val % 10) : '');
    if (val < 200) return 'Seratus ' + (val - 100 !== 0 ? helper(val - 100) : '');
    if (val < 1000) return helper(Math.floor(val / 100)) + ' Ratus ' + (val % 100 !== 0 ? helper(val % 100) : '');
    if (val < 2000) return 'Seribu ' + (val - 1000 !== 0 ? helper(val - 1000) : '');
    if (val < 1000000) return helper(Math.floor(val / 1000)) + ' Ribu ' + (val % 1000 !== 0 ? helper(val % 1000) : '');
    if (val < 1000000000) return helper(Math.floor(val / 1000000)) + ' Juta ' + (val % 1000000 !== 0 ? helper(val % 1000000) : '');
    if (val < 1000000000000) return helper(Math.floor(val / 1000000000)) + ' Miliar ' + (val % 1000000000 !== 0 ? helper(val % 1000000000) : '');
    return helper(Math.floor(val / 1000000000000)) + ' Triliun ' + (val % 1000000000000 !== 0 ? helper(val % 1000000000000) : '');
  }

  const result = helper(num).replace(/\s+/g, ' ').trim();
  return `${result} Rupiah`;
}

export function formatNominalDjp(val: number): string {
  const num = Math.round(val || 0);
  return `${new Intl.NumberFormat('id-ID').format(num)},00`;
}

export function formatMasaPajakDjp(month?: number, year?: number): string {
  const yr = year || new Date().getFullYear();
  if (month && month > 0) {
    const mm = String(month).padStart(2, '0');
    return `${mm}${mm}${yr}`;
  }
  return `0112${yr}`;
}

export function formatExpiryDjp(isoDate?: string): string {
  const d = isoDate ? new Date(isoDate) : new Date();
  if (!isoDate) {
    d.setDate(d.getDate() + 7);
  }
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  const ss = String(d.getSeconds()).padStart(2, '0');
  return `${dd}/${mm}/${yyyy} ${hh}:${min}:${ss}`;
}
