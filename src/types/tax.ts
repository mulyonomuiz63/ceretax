export type TaxpayerType = 'INDIVIDUAL' | 'CORPORATE';
export type PtkpStatus = 'TK/0' | 'TK/1' | 'TK/2' | 'TK/3' | 'K/0' | 'K/1' | 'K/2' | 'K/3';

export interface Taxpayer {
  id: string;
  nikNpwp: string;
  name: string;
  taxpayerType: TaxpayerType;
  isPkp: boolean;
  ptkpStatus: PtkpStatus;
  address: string;
  kluCode: string;
  kluName: string;
  email: string;
  phone: string;
  kppName: string;
  passphraseHint: string;
  depositBalance: number;
  isDemo?: boolean;
  linkedCorporateId?: string;
}

export type InvoiceDirection = 'OUTPUT' | 'INPUT' | 'EXPORT';
export type InvoiceStatus =
  | 'DRAFT'
  | 'APPROVED'
  | 'WAITING_FOR_AMENDMENT'
  | 'AMENDED'
  | 'WAITING_FOR_CANCELLATION'
  | 'CANCELLED';

export interface TaxInvoiceItem {
  id: string;
  itemType: 'GOODS' | 'SERVICES';
  itemCode: string;
  itemName: string;
  unit: string;
  unitPrice: number;
  quantity: number;
  discount: number;
  isLuxury: boolean;
  dpp: number;
  dppOtherValue: number;
  ppn: number;
  ppnbm: number;
}

export interface TaxInvoice {
  id: string;
  taxpayerId: string;
  direction: InvoiceDirection;
  transactionCode: string; // 01, 02, 03, 04, 05, 06, 07, 08, 09
  invoiceNumber: string;
  amendmentSeq: number; // 0 = Normal, 1 = Pengganti
  referenceCode: string;
  counterpartyNpwp: string;
  counterpartyName: string;
  invoiceDate: string; // YYYY-MM-DD
  taxPeriodMonth: number;
  taxPeriodYear: number;
  items: TaxInvoiceItem[];
  dppTotal: number;
  dppOtherValue: number;
  ppnTotal: number;
  ppnbmTotal: number;
  status: InvoiceStatus;
  isCredited: boolean;
  sp2dNumber?: string;
  returnAmount: number;
  returnNoteNumber?: string;
  returnDate?: string;
  signedAt?: string;
  createdAt: string;
}

export type SlipType = 'BPMP' | 'BP21' | 'BPA1' | 'BPPU_23';
export type SlipStatus = 'UNISSUED' | 'ISSUED' | 'CANCELLED';

export interface WithholdingSlip {
  id: string;
  issuerId: string;
  issuerNpwp: string;
  issuerName: string;
  recipientNikNpwp: string;
  recipientName: string;
  recipientAddress?: string;
  slipType: SlipType;
  slipNumber: string;
  taxPeriodMonth: number;
  taxPeriodYear: number;
  objectCode: string;
  objectName: string;
  ptkpStatus: PtkpStatus;
  grossAmount: number;
  positionAllowance?: number;
  pensionContribution?: number;
  netAmount: number;
  ptkpAmount?: number;
  pkpAmount?: number;
  ratePercent: number;
  taxWithheld: number;
  status: SlipStatus;
  signedAt?: string;
  createdAt: string;
}

export interface OpAssetLiabilityFamily {
  id: string;
  taxpayerId: string;
  recordType: 'ASSET' | 'LIABILITY' | 'FAMILY';
  code: string;
  description: string;
  yearAcquired: number;
  amount: number;
  relationOrLender: string;
  nikMember?: string;
}

export type ReturnType =
  | 'SPT_MASA_PPN'
  | 'SPT_MASA_PPH21'
  | 'SPT_MASA_UNIFIKASI'
  | 'SPT_TAHUNAN_OP'
  | 'SPT_TAHUNAN_BADAN';

export type ReturnStatus = 'DRAFT' | 'WAITING_PAYMENT' | 'SUBMITTED' | 'REJECTED';

export interface SptPpnPayload {
  eksporDpp: number;
  penyerahanPpnDipungutSendiriDpp: number;
  penyerahanPpnDipungutSendiriPpn: number;
  penyerahanDipungutPemungutDpp: number;
  penyerahanDipungutPemungutPpn: number;
  penyerahanDibebaskanDpp: number;
  returKeluaranPpn: number;
  pajakMasukanDikreditkan: number;
  pajakMasukanTidakDikreditkan: number;
  returMasukanPpn: number;
  kompensasiMasaSebelumnya: number;
  pilihanLebihBayar: 'KOMPENSASI' | 'RESTITUSI';
  postedInvoiceIds: string[];
}

export interface SptPphMasaPayload {
  kapCode: string;
  kjsCode: string;
  totalGross: number;
  totalTaxWithheld: number;
  slipCount: number;
  postedSlipIds: string[];
  lebihBayarKompensasi: number;
}

export interface SptTahunanOpPayload {
  sumberPenghasilanPekerjaan: boolean;
  sumberPenghasilanUsaha: boolean;
  punyaPphFinal: boolean;
  punyaBukanObjek: boolean;
  punyaHartaUtang: boolean;
  statusPtkp: PtkpStatus;
  penghasilanBrutoPekerjaan: number;
  biayaJabatanPensiun: number;
  penghasilanNetoPekerjaan: number;
  penghasilanNetoUsaha: number;
  penghasilanNetoDalamNegeriLain: number;
  penghasilanNetoLuarNegeri: number;
  zakatSumbangan: number;
  ptkpAmount: number;
  pkpAmount: number;
  pphTerutang: number;
  kreditPajakBpa1: number;
  angsuranPph25: number;
  pphFinalItems: { jenis: string; dpp: number; pph: number }[];
  bukanObjekItems: { jenis: string; jumlah: number }[];
  postedSlipIds: string[];
}

export interface SptTahunanBadanPayload {
  pembukuanDiaudit: boolean;
  namaKap: string;
  peredaranBruto: number;
  hpp: number;
  biayaUsaha: number;
  penghasilanLainKomersial: number;
  biayaLainKomersial: number;
  labaKomersial: number;
  // Rekonsiliasi Fiskal
  koreksiPositifNatura: number;
  koreksiPositifSanksiPajak: number;
  koreksiPositifJamuanNonNominatif: number;
  koreksiPositifPenyisihanPiutang: number;
  koreksiPositifLainnya: number;
  koreksiNegatifPenghasilanFinal: number;
  koreksiNegatifPenyusutanFiskal: number;
  koreksiNegatifLainnya: number;
  penghasilanNetoFiskal: number;
  kompensasiKerugian: number;
  pkpDibulatkan: number;
  // Tarif Pasal 31E & 17
  pkpFasilitas31E: number;
  pkpNonFasilitas: number;
  pphFasilitas31E: number;
  pphNonFasilitas: number;
  totalPphTerutang: number;
  // Kredit Pajak
  kreditPph22: number;
  kreditPph23: number;
  kreditPph24: number;
  angsuranPph25: number;
  totalKreditPajak: number;
  pphKurangLebihBayar: number;
  // Neraca Ringkas
  totalAset: number;
  totalKewajiban: number;
  totalEkuitas: number;
  pengurus: { nama: string; npwp: string; jabatan: string; sahamPersen: number }[];
}

export interface TaxReturn {
  id: string;
  taxpayerId: string;
  returnType: ReturnType;
  taxYear: number;
  taxPeriodMonth: number; // 0 for annual
  revisionNo: number;
  status: ReturnStatus;
  bpeNumber?: string;
  taxPayable: number;
  taxCredit: number;
  underOverPayment: number; // >0 Kurang Bayar, <0 Lebih Bayar, 0 Nihil
  paymentMethod?: 'DEPOSIT' | 'BILLING' | 'NONE';
  billingCodeId?: string;
  payload:
    | SptPpnPayload
    | SptPphMasaPayload
    | SptTahunanOpPayload
    | SptTahunanBadanPayload;
  submittedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface BillingCode {
  id: string;
  taxpayerId: string;
  returnId?: string;
  kapCode: string;
  kjsCode: string;
  description: string;
  taxPeriodLabel: string;
  billingCode: string;
  amount: number;
  status: 'UNPAID' | 'PAID';
  ntpn?: string;
  paidAt?: string;
  createdAt: string;
}

export interface NotificationItem {
  id: string;
  taxpayerId: string;
  title: string;
  message: string;
  category: 'FAKTUR' | 'BUPOT' | 'SPT' | 'BILLING' | 'EXAM';
  relatedEntityId?: string;
  isRead: boolean;
  createdAt: string;
}

export type ExamCaseCode =
  | 'CASE_PPN'
  | 'CASE_PPH21_KARYAWAN'
  | 'CASE_EBUPOT_21_23'
  | 'CASE_SPT_OP'
  | 'CASE_SPT_BADAN';

export interface ExamCheckItem {
  id: string;
  label: string;
  passed: boolean;
  expectedHint: string;
  actualValue: string;
}

export interface ExamEvaluation {
  caseCode: ExamCaseCode;
  score: number;
  passedCount: number;
  totalChecks: number;
  checks: ExamCheckItem[];
  evaluatedAt: string;
}

export interface WorkspaceState {
  nikKey: string;
  individualTaxpayer: Taxpayer;
  corporateTaxpayer: Taxpayer;
  invoices: TaxInvoice[];
  slips: WithholdingSlip[];
  returns: TaxReturn[];
  assets: OpAssetLiabilityFamily[];
  billings: BillingCode[];
  notifications: NotificationItem[];
  examEvaluations: Record<string, ExamEvaluation>;
}
