export interface KnownBuyerInfo {
  npwp: string;
  name: string;
  address: string;
  country: string;
  email: string;
  idtku?: string;
  isCustom?: boolean;
}

export const DEFAULT_KNOWN_BUYERS: KnownBuyerInfo[] = [
  {
    npwp: '0013084496091000',
    name: 'BANK CENTRAL ASIA',
    address: 'JL MH THAMRIN NO 1 JAKARTA PUSAT',
    country: 'Indonesia',
    email: 'tax.division@bca.co.id',
    idtku: '000000',
  },
  {
    npwp: '0010005411091000',
    name: 'VALE INDONESIA',
    address: 'GEDUNG THE ENERGY LT 20 SCBD LOT 11A JAKARTA',
    country: 'Indonesia',
    email: 'tax@vale.com',
    idtku: '000000',
  },
  {
    npwp: '0011397973091000',
    name: 'BANK SMBC INDONESIA TBK',
    address: 'MENARA BTPN LT 25 JL DR IDE ANAK AGUNG GDE AGUNG JAKARTA',
    country: 'Indonesia',
    email: 'finance.tax@smbc.co.id',
    idtku: '000000',
  },
  {
    npwp: '0010016087093000',
    name: 'BANK MANDIRI (PERSERO) TBK',
    address: 'PLAZA MANDIRI JL JEND GATOT SUBROTO KAV 36-38 JAKARTA',
    country: 'Indonesia',
    email: 'tax.operations@bankmandiri.co.id',
    idtku: '000000',
  },
  {
    npwp: '0279414544086000',
    name: 'GOCHIDA META SOLUSITAMA',
    address: 'JL KEMANG RAYA NO 45 JAKARTA SELATAN',
    country: 'Indonesia',
    email: 'tax@gochida.co.id',
    idtku: '000000',
  },
  {
    npwp: '0753620525008000',
    name: 'PT VERTICA LABORA SINERGI',
    address: 'JL RADEN INTEN II B NO.210 DUREN SAWIT JAKARTA TIMUR',
    country: 'Indonesia',
    email: 'tax@vertica.co.id',
    idtku: '000000',
  },
  {
    npwp: '0100001000120000',
    name: 'PT TELEKOMUNIKASI INDONESIA TBK',
    address: 'JL JAPATI NO 1 BANDUNG',
    country: 'Indonesia',
    email: 'tax@telkom.co.id',
    idtku: '000000',
  },
  {
    npwp: '0100002000150000',
    name: 'PT PERTAMINA (PERSERO)',
    address: 'JL MEDAN MERDEKA TIMUR NO 1A JAKARTA PUSAT',
    country: 'Indonesia',
    email: 'pajak@pertamina.com',
    idtku: '000000',
  },
  {
    npwp: '0100003000180000',
    name: 'PT INDOFOOD SUKSES MAKMUR TBK',
    address: 'SUDIRMAN PLAZA INDOFOOD TOWER JL JEND SUDIRMAN JAKARTA',
    country: 'Indonesia',
    email: 'tax@indofood.co.id',
    idtku: '000000',
  },
  {
    npwp: '0100004000210000',
    name: 'PT ASTRA INTERNATIONAL TBK',
    address: 'MENARA ASTRA JL JEND SUDIRMAN KAV 5-6 JAKARTA',
    country: 'Indonesia',
    email: 'tax@astra.co.id',
    idtku: '000000',
  },
  {
    npwp: '0100005000240000',
    name: 'PT UNITED TRACTORS TBK',
    address: 'JL RAYA BEKASI KM 22 CAKUNG JAKARTA TIMUR',
    country: 'Indonesia',
    email: 'tax@unitedtractors.com',
    idtku: '000000',
  },
  {
    npwp: '0100006000270000',
    name: 'PT UNILEVER INDONESIA TBK',
    address: 'BSD GREEN OFFICE PARK KAV 3 BSD CITY TANGERANG',
    country: 'Indonesia',
    email: 'tax@unilever.co.id',
    idtku: '000000',
  },
];

const BUYERS_STORAGE_KEY = 'kelasbrevet_custom_buyers_v1';

export function getCustomBuyers(): KnownBuyerInfo[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(BUYERS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveCustomBuyers(buyers: KnownBuyerInfo[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(BUYERS_STORAGE_KEY, JSON.stringify(buyers));
    window.dispatchEvent(new CustomEvent('buyers-updated', { detail: buyers }));
  } catch {}
}

export function getAllKnownBuyers(): Record<string, KnownBuyerInfo> {
  const result: Record<string, KnownBuyerInfo> = {};
  DEFAULT_KNOWN_BUYERS.forEach((b) => {
    result[b.npwp] = { ...b, isCustom: false };
  });
  const custom = getCustomBuyers();
  custom.forEach((b) => {
    result[b.npwp] = { ...b, isCustom: true };
  });
  return result;
}

export function addCustomBuyer(buyer: KnownBuyerInfo): void {
  const existing = getCustomBuyers();
  const filtered = existing.filter((b) => b.npwp !== buyer.npwp);
  filtered.push({ ...buyer, isCustom: true });
  saveCustomBuyers(filtered);
}

export function deleteCustomBuyer(npwp: string): void {
  const existing = getCustomBuyers();
  const filtered = existing.filter((b) => b.npwp !== npwp);
  saveCustomBuyers(filtered);
}
