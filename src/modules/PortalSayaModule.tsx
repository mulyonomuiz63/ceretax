import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  Bell,
  Building2,
  CheckCircle2,
  CreditCard,
  FileCheck2,
  FileSpreadsheet,
  FileText,
  Filter,
  KeyRound,
  Receipt,
  Save,
  Settings2,
  ShieldAlert,
  ShieldCheck,
  SlidersHorizontal,
  Upload,
  User,
  Wallet,
} from 'lucide-react';
import { PtkpStatus, Taxpayer, WithholdingSlip, TaxReturn, WorkspaceState } from '../types/tax.ts';
import { formatRp, MONTHS_ID } from '../utils/taxCalc.ts';
import { MainNavKey } from '../components/CoretaxShell.tsx';
import { PrintablePayload } from '../components/DocumentPrintModal.tsx';
import {
  CoretaxIconToolbar,
  CoretaxPagination,
  downloadCsvFile,
} from '../components/CoretaxTableChrome.tsx';

interface PortalSayaModuleProps {
  subTab: string;
  onChangeSubTab: (tab: string) => void;
  workspace: WorkspaceState;
  activeTaxpayer: Taxpayer;
  accountMode: 'INDIVIDUAL' | 'CORPORATE';
  onSwitchAccountMode: (mode: 'INDIVIDUAL' | 'CORPORATE') => void;
  onNavigate: (module: MainNavKey, subTab?: string) => void;
  onUpdateProfile: (taxpayerId: string, updates: Partial<Taxpayer>) => Promise<void>;
  onPrintDocument: (doc: PrintablePayload) => void;
}

interface UnifiedPortalDoc {
  id: string;
  docNumber: string;
  docDate: string;
  title: string;
  docType: string;
  caseNumber: string;
  summaryText: string;
  createdAt: string;
  createdBy: string;
  slip?: WithholdingSlip;
  taxReturn?: TaxReturn;
}

const PORTAL_SERVICE_META: Record<
  string,
  { title: string; subtitle: string; code: string; statusLabel: string }
> = {
  kasus: {
    title: 'Kasus Saya',
    subtitle: 'Daftar seluruh kasus administrasi perpajakan dan riwayat layanan Wajib Pajak.',
    code: 'CASE-ALL',
    statusLabel: 'Selesai',
  },
  kasus_berjalan: {
    title: 'Kasus Berjalan Saya',
    subtitle: 'Daftar permohonan atau kasus perpajakan yang sedang dalam proses penelitian DJP.',
    code: 'CASE-OPEN',
    statusLabel: 'Dalam Proses',
  },
  aktivasi_spln: {
    title: 'Aktivasi Wajib Pajak SPLN',
    subtitle: 'Permohonan aktivasi Subjek Pajak Luar Negeri (SPLN) sesuai ketentuan Coretax DJP.',
    code: 'SPLN-ACT',
    statusLabel: 'Wajib Pajak Dalam Negeri (Aktif)',
  },
  kode_otorisasi: {
    title: 'Permintaan Kode Otorisasi / Sertifikat Elektronik',
    subtitle: 'Pengelolaan Kode Otorisasi DJP (Passphrase) untuk penandatanganan e-Faktur, e-Bupot, dan SPT.',
    code: 'KO-DJP',
    statusLabel: 'Aktif & Terverifikasi',
  },
  pengukuhan_pkp: {
    title: 'Pengukuhan Pengusaha Kena Pajak (PKP)',
    subtitle: 'Status pengukuhan PKP dan akses layanan administrasi Faktur Pajak (e-Faktur).',
    code: 'PKP-REG',
    statusLabel: 'Terdaftar',
  },
  pbb_p5l: {
    title: 'Pendaftaran Objek Pajak PBB P5L',
    subtitle: 'Pendaftaran objek Pajak Bumi dan Bangunan sektor Perkebunan, Perhutanan, Pertambangan, dan Lainnya.',
    code: 'PBB-P5L',
    statusLabel: 'Tidak Ada Objek P5L',
  },
  penghapusan: {
    title: 'Penghapusan NPWP & Pencabutan PKP',
    subtitle: 'Pengajuan penghapusan NPWP atau pencabutan pengukuhan PKP secara elektronik.',
    code: 'DEL-REG',
    statusLabel: 'NPWP Aktif',
  },
  status_nonaktif: {
    title: 'Penetapan Wajib Pajak Nonaktif',
    subtitle: 'Permohonan penetapan status Wajib Pajak Nonaktif (NE) sesuai kriteria PMK terbaru.',
    code: 'ST-NE',
    statusLabel: 'Aktif',
  },
  status_aktif_kembali: {
    title: 'Pengaktifan Kembali Wajib Pajak Nonaktif',
    subtitle: 'Pengajuan aktivasi kembali NPWP dari status Nonaktif menjadi Wajib Pajak Aktif.',
    code: 'ST-ACT',
    statusLabel: 'Sudah Aktif',
  },
  status_kuasa: {
    title: 'Penunjukan Wakil / Kuasa Wajib Pajak',
    subtitle: 'Pengaturan hak akses impersonating bagi pengurus atau kuasa pajak perusahaan.',
    code: 'REP-ADD',
    statusLabel: 'Impersonate Aktif',
  },
  status_cabut_kuasa: {
    title: 'Pencabutan Wakil / Kuasa Wajib Pajak',
    subtitle: 'Pencabutan mandat wakil/kuasa yang terdaftar pada akun Coretax.',
    code: 'REP-REV',
    statusLabel: 'Aktif',
  },
};

export const PortalSayaModule: React.FC<PortalSayaModuleProps> = ({
  subTab,
  onChangeSubTab,
  workspace,
  activeTaxpayer,
  accountMode,
  onSwitchAccountMode,
  onNavigate,
  onUpdateProfile,
  onPrintDocument,
}) => {
  const [form, setForm] = useState({
    name: activeTaxpayer.name,
    address: activeTaxpayer.address,
    email: activeTaxpayer.email,
    phone: activeTaxpayer.phone,
    ptkpStatus: activeTaxpayer.ptkpStatus,
    kluCode: activeTaxpayer.kluCode,
    kluName: activeTaxpayer.kluName,
  });
  const [saving, setSaving] = useState(false);
  const [savedNotice, setSavedNotice] = useState(false);
  const [actionToast, setActionToast] = useState<string | null>(null);

  // Dokumen Saya filters & pagination (exact Coretax inline column filters)
  const [showDocFilters, setShowDocFilters] = useState(true);
  const [docNumFilter, setDocNumFilter] = useState('');
  const [docDateFilter, setDocDateFilter] = useState('');
  const [docTitleFilter, setDocTitleFilter] = useState('');
  const [docTypeFilter, setDocTypeFilter] = useState('');
  const [docCaseFilter, setDocCaseFilter] = useState('');
  const [docPage, setDocPage] = useState(1);
  const [docPageSize, setDocPageSize] = useState(10);

  useEffect(() => {
    setForm({
      name: activeTaxpayer.name,
      address: activeTaxpayer.address,
      email: activeTaxpayer.email,
      phone: activeTaxpayer.phone,
      ptkpStatus: activeTaxpayer.ptkpStatus,
      kluCode: activeTaxpayer.kluCode,
      kluName: activeTaxpayer.kluName,
    });
  }, [activeTaxpayer]);

  const triggerToast = (msg: string) => {
    setActionToast(msg);
    window.setTimeout(() => setActionToast(null), 3200);
  };

  const bpa1Docs = workspace.slips.filter(
    (s) =>
      s.status === 'ISSUED' &&
      (accountMode === 'INDIVIDUAL'
        ? s.recipientNikNpwp === workspace.individualTaxpayer.nikNpwp || s.slipType === 'BPA1'
        : s.issuerId === workspace.corporateTaxpayer.id)
  );

  const submittedReturns = workspace.returns.filter(
    (r) => r.status === 'SUBMITTED' && r.taxpayerId === activeTaxpayer.id
  );

  // Unified Coretax Dokumen Saya rows (BPA1 + BPE + Official Admin Docs matching image_848358aa.png)
  const unifiedDocuments = useMemo<UnifiedPortalDoc[]>(() => {
    const rows: UnifiedPortalDoc[] = [];

    for (const slip of bpa1Docs) {
      const periodLabel = `${MONTHS_ID[Math.max(0, slip.taxPeriodMonth - 1)]} ${slip.taxPeriodYear}`;
      rows.push({
        id: `slip-${slip.id}`,
        docNumber: slip.slipNumber,
        docDate: `31/12/${slip.taxPeriodYear}`,
        title:
          slip.slipType === 'BPA1'
            ? `Bukti Potong Tahunan BPA1 — ${slip.recipientName} (${slip.issuerName})`
            : `Bukti Potong ${slip.slipType} — ${slip.recipientName}`,
        docType: slip.slipType === 'BPA1' ? 'Bukti Potong Tahunan (BPA1)' : `eBupot ${slip.slipType}`,
        caseNumber: `BUP-${slip.taxPeriodYear}-${slip.slipType}`,
        summaryText: `Bruto ${formatRp(slip.grossAmount)} · PPh ${formatRp(slip.taxWithheld)} (${periodLabel})`,
        createdAt: slip.createdAt ? new Date(slip.createdAt).toLocaleDateString('id-ID') : `31/12/${slip.taxPeriodYear}`,
        createdBy: slip.issuerNpwp || '-',
        slip,
      });
    }

    for (const ret of submittedReturns) {
      const period =
        ret.taxPeriodMonth > 0
          ? `${MONTHS_ID[ret.taxPeriodMonth - 1]} ${ret.taxYear}`
          : `Tahun ${ret.taxYear}`;
      rows.push({
        id: `bpe-${ret.id}`,
        docNumber: ret.bpeNumber || `BPE-${ret.id.slice(0, 8).toUpperCase()}`,
        docDate: ret.submittedAt ? new Date(ret.submittedAt).toLocaleDateString('id-ID') : '-',
        title: `Bukti Penerimaan Elektronik (BPE) ${ret.returnType.replace(/_/g, ' ')} — ${period}`,
        docType: 'Bukti Penerimaan Elektronik (BPE)',
        caseNumber: `SPT-${ret.taxYear}`,
        summaryText:
          ret.underOverPayment === 0
            ? 'Status: NIHIL'
            : `Kurang/(Lebih) Bayar: ${formatRp(ret.underOverPayment)}`,
        createdAt: ret.submittedAt ? new Date(ret.submittedAt).toLocaleDateString('id-ID') : '-',
        createdBy: activeTaxpayer.nikNpwp,
        taxReturn: ret,
      });
    }

    // Authentic Coretax standard taxpayer administration docs
    rows.push(
      {
        id: `npwp-${activeTaxpayer.id}`,
        docNumber: `S-${activeTaxpayer.nikNpwp.slice(-6)}/CT/KPP/2025`,
        docDate: '02/01/2025',
        title: `Kartu NPWP (${activeTaxpayer.name})`,
        docType: 'Kartu NPWP',
        caseNumber: 'P0028458457',
        summaryText: activeTaxpayer.kppName,
        createdAt: '02/01/2025',
        createdBy: '-',
      },
      {
        id: `ko-${activeTaxpayer.id}`,
        docNumber: 'S-43949/DGT-DC-CT/KPP/2025',
        docDate: '02/01/2025',
        title: 'Surat Penerbitan Kode Otorisasi DJP',
        docType: 'Surat Penerbitan Kode Otorisasi DJP',
        caseNumber: 'KO-2025-001',
        summaryText: 'Status Aktif (Passphrase default: 123456)',
        createdAt: '02/01/2025',
        createdBy: activeTaxpayer.nikNpwp,
      }
    );

    return rows;
  }, [bpa1Docs, submittedReturns, activeTaxpayer]);

  const filteredDocuments = useMemo(() => {
    return unifiedDocuments.filter((d) => {
      if (docNumFilter && !d.docNumber.toLowerCase().includes(docNumFilter.toLowerCase())) return false;
      if (docDateFilter && !d.docDate.toLowerCase().includes(docDateFilter.toLowerCase())) return false;
      if (docTitleFilter && !d.title.toLowerCase().includes(docTitleFilter.toLowerCase())) return false;
      if (docTypeFilter && !d.docType.toLowerCase().includes(docTypeFilter.toLowerCase())) return false;
      if (docCaseFilter && !d.caseNumber.toLowerCase().includes(docCaseFilter.toLowerCase())) return false;
      return true;
    });
  }, [unifiedDocuments, docNumFilter, docDateFilter, docTitleFilter, docTypeFilter, docCaseFilter]);

  const paginatedDocuments = useMemo(() => {
    const start = (docPage - 1) * docPageSize;
    return filteredDocuments.slice(start, start + docPageSize);
  }, [filteredDocuments, docPage, docPageSize]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onUpdateProfile(activeTaxpayer.id, form);
      setSavedNotice(true);
      setTimeout(() => setSavedNotice(false), 2500);
    } finally {
      setSaving(false);
    }
  };

  const isProfileSubTab =
    subTab === 'profil' ||
    subTab === 'perubahan_identitas' ||
    subTab === 'perubahan_alamat' ||
    subTab === 'perubahan_pbb' ||
    subTab === 'perubahan_pmse';

  const serviceMeta = PORTAL_SERVICE_META[subTab];

  return (
    <div className="space-y-5">
      {actionToast && (
        <div className="bg-emerald-50 border border-emerald-300 text-emerald-900 rounded-lg px-4 py-2.5 text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{actionToast}</span>
        </div>
      )}

      {/* ================================================================= */}
      {/* SUB-TAB 1: HOME / IKHTISAR (EXACT CORETAX HOME-PORTAL + 5 MODUL)  */}
      {/* ================================================================= */}
      {subTab === 'ikhtisar' && (
        <div className="space-y-6">
          {/* Official Coretax Home-Portal Security Awareness Banner (Exact match to PDF 1 Page 1) */}
          <div className="rounded-[14px] overflow-hidden border border-[#DCE2EC] bg-[linear-gradient(180deg,#F5F7FB_0%,#E6EBF5_100%)] shadow-[0_8px_28px_rgba(27,41,88,0.08)] relative">
            {/* Top Indonesian Red-White Ribbon Accent */}
            <div className="h-3 bg-[linear-gradient(90deg,#D91C24_0%,#B91C1C_65%,#FFFFFF_100%)]" />

            <div className="p-6 sm:p-8 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
              {/* Left Column: Bold Outline Title + Hacker/Laptop Shield Illustration */}
              <div className="lg:col-span-5 flex flex-col items-center text-center space-y-4">
                <div className="space-y-1">
                  <div className="inline-block bg-[#1B2958] text-white font-display font-black text-xl sm:text-2xl px-3.5 py-1 rounded-[6px] tracking-tight uppercase shadow-sm">
                    JAGA DATA PRIBADI,
                  </div>
                  <div className="inline-block bg-[#1B2958] text-white font-display font-black text-xl sm:text-2xl px-3.5 py-1 rounded-[6px] tracking-tight uppercase shadow-sm">
                    PERKUAT KEAMANAN
                  </div>
                  <div className="inline-block bg-[#1B2958] text-[#F4C430] font-display font-black text-xl sm:text-2xl px-4 py-1 rounded-[6px] tracking-tight uppercase shadow-sm">
                    AKUN ANDA
                  </div>
                </div>

                {/* Laptop + Lock Security SVG Illustration matching PDF 1 Page 1 */}
                <svg
                  width="230"
                  height="165"
                  viewBox="0 0 230 165"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  className="mx-auto"
                  aria-hidden="true"
                >
                  {/* Thief silhouette behind laptop */}
                  <circle cx="88" cy="48" r="14" fill="#1E293B" />
                  <path d="M64 98C64 78 74 66 88 66C102 66 112 78 112 98H64Z" fill="#334155" />
                  <rect x="74" y="43" width="28" height="7" rx="3.5" fill="#0F172A" />
                  <circle cx="82" cy="46.5" r="2" fill="#FFFFFF" />
                  <circle cx="94" cy="46.5" r="2" fill="#FFFFFF" />
                  {/* Laptop screen */}
                  <rect x="64" y="72" width="104" height="68" rx="6" fill="#CBD5E1" stroke="#64748B" strokeWidth="3" />
                  <rect x="71" y="79" width="90" height="54" rx="3" fill="#94A3B8" />
                  {/* Padlock on screen */}
                  <rect x="101" y="96" width="30" height="24" rx="4" fill="#FFFFFF" />
                  <path d="M108 96V89C108 84.5 111.5 81 116 81C120.5 81 124 84.5 124 89V96" stroke="#FFFFFF" strokeWidth="4" strokeLinecap="round" />
                  <circle cx="116" cy="106" r="2.5" fill="#1E2C5E" />
                  <path d="M116 108V114" stroke="#1E2C5E" strokeWidth="2.5" strokeLinecap="round" />
                  {/* Password stars box */}
                  <rect x="86" y="123" width="60" height="10" rx="2" fill="#DC2626" />
                  <text x="116" y="131" textAnchor="middle" fill="#FFFFFF" fontSize="9" fontWeight="bold">
                    * * * * * * * *
                  </text>
                  {/* Laptop base */}
                  <path d="M48 140H184L174 150H58L48 140Z" fill="#64748B" />
                </svg>
              </div>

              {/* Right Column: 4 Numbered Blue Cards matching PDF 1 Page 1 */}
              <div className="lg:col-span-7 space-y-3">
                <div className="bg-[#1E40AF] text-white font-semibold text-xs sm:text-[13px] px-4 py-2 rounded-[8px] shadow-xs inline-block">
                  Lindungi diri Anda dari penyalahgunaan data dengan langkah sederhana berikut:
                </div>

                <div className="space-y-2.5">
                  {[
                    {
                      num: '1',
                      badge: 'OTP ****',
                      text: (
                        <>
                          Lindungi informasi pribadi seperti <strong>kata sandi dan kode OTP</strong>. Jangan pernah membagikannya kepada pihak tidak berhak.
                        </>
                      ),
                    },
                    {
                      num: '2',
                      badge: '**** 🔑',
                      text: (
                        <>
                          Gunakan <strong>kata sandi yang kuat</strong> dan hindari menyimpannya di peramban atau browser atau perangkat publik.
                        </>
                      ),
                    },
                    {
                      num: '3',
                      badge: '⚠️ !',
                      text: (
                        <>
                          <strong>Waspadai upaya phishing</strong>, abaikan tautan atau pesan mencurigakan untuk menjaga keamanan informasi Anda.
                        </>
                      ),
                    },
                    {
                      num: '4',
                      badge: '✓ 2FA',
                      text: (
                        <>
                          <strong>Aktifkan verifikasi dua langkah</strong> untuk lapisan keamanan tambahan di laman Coretax DJP dengan cara klik menu{' '}
                          <span className="text-[#F4C430] font-bold">"Portal Saya"</span> lalu klik{' '}
                          <span className="text-[#F4C430] font-bold">"Profil Saya"</span>, selanjutnya pilih{' '}
                          <span className="text-[#F4C430] font-bold">"Verifikasi Dua Langkah"</span>.
                        </>
                      ),
                    },
                  ].map((step) => (
                    <div
                      key={step.num}
                      className="flex items-stretch gap-3 bg-white/80 border border-[#CBD5E1] rounded-[12px] p-2.5 shadow-xs"
                    >
                      <div className="w-16 sm:w-20 shrink-0 rounded-[8px] bg-[#EFF6FF] border border-[#BFDBFE] flex flex-col items-center justify-center p-2 text-center">
                        <span className="w-5 h-5 rounded-full bg-[#F59E0B] text-white font-bold text-[11px] inline-flex items-center justify-center mb-1">
                          {step.num}
                        </span>
                        <span className="text-[10px] font-extrabold text-[#1E3A8A] font-mono-num">
                          {step.badge}
                        </span>
                      </div>
                      <div className="flex-1 bg-[#2563EB] text-white rounded-[8px] px-4 py-2.5 text-xs leading-relaxed flex items-center">
                        <div>{step.text}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* ACTIVE ACCOUNT & DEPOSIT STRIP */}
          <div className="rounded-[14px] border border-[#E5EAF2] bg-[#F8FAFC] px-5 py-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5 min-w-0">
              <div
                className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
                  accountMode === 'CORPORATE'
                    ? 'bg-[#1D4ED8] text-white'
                    : 'bg-[#1E2C5E] text-[#F4C430]'
                }`}
              >
                {accountMode === 'CORPORATE' ? (
                  <Building2 className="w-5 h-5" />
                ) : (
                  <User className="w-5 h-5" />
                )}
              </div>
              <div className="min-w-0">
                <div className="text-[11px] font-semibold text-slate-500">
                  {accountMode === 'CORPORATE'
                    ? 'Wajib Pajak Badan · Impersonating PKP'
                    : 'Wajib Pajak Orang Pribadi · Akun Utama'}
                </div>
                <div className="font-display font-extrabold text-base text-[#1B2958] truncate">
                  {activeTaxpayer.name}
                </div>
                <div className="text-xs text-slate-600 flex flex-wrap items-center gap-x-2">
                  <span className="font-mono-num font-semibold">{activeTaxpayer.nikNpwp}</span>
                  <span>·</span>
                  <span>{activeTaxpayer.kppName}</span>
                  <span>·</span>
                  <span>
                    {activeTaxpayer.isPkp ? 'PKP Aktif' : `PTKP ${activeTaxpayer.ptkpStatus}`}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4 shrink-0">
              <div className="text-left lg:text-right">
                <div className="text-[11px] text-slate-500 inline-flex items-center gap-1">
                  <Wallet className="w-3.5 h-3.5 text-[#1E2C5E]" />
                  <span>Saldo Deposit Pajak</span>
                </div>
                <div className="font-mono-num font-extrabold text-base text-[#1B2958]">
                  {formatRp(activeTaxpayer.depositBalance)}
                </div>
              </div>

              <button
                type="button"
                onClick={() =>
                  onSwitchAccountMode(accountMode === 'CORPORATE' ? 'INDIVIDUAL' : 'CORPORATE')
                }
                className="px-4 py-2 rounded-[10px] bg-[#1E2C5E] hover:bg-[#16224A] text-white text-xs font-semibold transition cursor-pointer whitespace-nowrap"
              >
                {accountMode === 'CORPORATE'
                  ? 'Beralih ke Orang Pribadi'
                  : 'Impersonate ke Perusahaan PKP'}
              </button>
            </div>
          </div>

          {/* 5 MANDATORY SIMULATION LAUNCHER CARDS */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-display font-bold text-sm text-[#1B2958]">
                Akses Cepat 5 Modul Simulasi Wajib
              </h2>
              <span className="text-xs text-slate-500">
                Faktur: <strong className="font-mono-num text-[#1B2958]">{workspace.invoices.length}</strong> · eBupot:{' '}
                <strong className="font-mono-num text-[#1B2958]">{workspace.slips.length}</strong> · BPE:{' '}
                <strong className="font-mono-num text-emerald-700">
                  {workspace.returns.filter((r) => r.status === 'SUBMITTED').length}
                </strong>
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3.5">
              {[
                {
                  index: '01',
                  title: 'SPT Masa PPN & e-Faktur',
                  desc: 'Keluaran, Masukan, Pengganti, Retur, Ekspor & Induk PPN A1–C.',
                  mode: 'CORPORATE' as const,
                  nav: ['efaktur', 'output'] as [MainNavKey, string],
                  icon: Receipt,
                },
                {
                  index: '02',
                  title: 'PPh 21 Tahunan Karyawan',
                  desc: 'Unduh Bukti Potong BPA1 di Dokumen Saya & lapor SPT Tahunan.',
                  mode: 'INDIVIDUAL' as const,
                  nav: ['portal', 'dokumen'] as [MainNavKey, string],
                  icon: FileCheck2,
                },
                {
                  index: '03',
                  title: 'e-Bupot & SPT Masa 21/23',
                  desc: 'BPMP TER, BP21, BPA1, BPPU PPh 23, Impor XML & SPT Masa.',
                  mode: 'CORPORATE' as const,
                  nav: ['ebupot', 'bpmp'] as [MainNavKey, string],
                  icon: FileSpreadsheet,
                },
                {
                  index: '04',
                  title: 'SPT Tahunan Orang Pribadi',
                  desc: 'Posting SPT, Induk A–K, Lampiran L-1 Harta/Utang & L-2.',
                  mode: 'INDIVIDUAL' as const,
                  nav: ['spt', 'konsep'] as [MainNavKey, string],
                  icon: FileText,
                },
                {
                  index: '05',
                  title: 'SPT Tahunan PPh Badan',
                  desc: 'Laporan Keuangan, Rekonsiliasi Fiskal, Fasilitas 31E & PPh 29.',
                  mode: 'CORPORATE' as const,
                  nav: ['spt', 'konsep'] as [MainNavKey, string],
                  icon: CreditCard,
                },
              ].map((m) => {
                const Icon = m.icon;
                return (
                  <button
                    key={m.index}
                    type="button"
                    onClick={() => {
                      onSwitchAccountMode(m.mode);
                      onNavigate(m.nav[0], m.nav[1]);
                    }}
                    className="text-left bg-white rounded-[14px] border border-[#E5EAF2] hover:border-[#F4C430] hover:bg-[#FEFCE8]/40 p-4 transition flex flex-col justify-between group cursor-pointer"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2.5">
                        <span className="w-8 h-8 rounded-lg bg-[#F4F6FA] group-hover:bg-[#FEF08A] text-[#1E2C5E] flex items-center justify-center transition">
                          <Icon className="w-4 h-4" />
                        </span>
                        <span className="font-mono-num text-[11px] font-bold text-slate-400">
                          {m.index}
                        </span>
                      </div>
                      <div className="font-display font-bold text-[13px] text-[#1B2958] leading-snug">
                        {m.title}
                      </div>
                      <p className="text-[11.5px] text-slate-500 mt-1 leading-relaxed">{m.desc}</p>
                    </div>
                    <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] font-semibold text-[#1E2C5E]">
                      <span>{m.mode === 'CORPORATE' ? 'Mode PKP/Badan' : 'Mode OP'}</span>
                      <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* SUB-TAB 2: DOKUMEN SAYA (EXACT CORETAX NAVY TABLE + MODUL 2 BPA1) */}
      {/* ================================================================= */}
      {subTab === 'dokumen' && (
        <div className="space-y-4">
          {/* Official Coretax Header Row: [Icon] Dokumen | Hasilkan Dokumen · Unggah Dokumen */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#E5EAF2]">
            <div className="flex items-center gap-2 text-[#1E2C5E]">
              <FileText className="w-5 h-5" />
              <h1 className="font-display font-bold text-[18px]">Dokumen</h1>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={() => {
                  const bpa1 = bpa1Docs.find((s) => s.slipType === 'BPA1') || bpa1Docs[0];
                  if (bpa1) {
                    onPrintDocument({ type: 'BPA1', slip: bpa1 });
                  } else {
                    triggerToast('Daftar dokumen telah diperbarui dari basis data Coretax.');
                  }
                }}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-[#1E2C5E] hover:bg-slate-100 rounded-lg transition cursor-pointer"
              >
                <Settings2 className="w-3.5 h-3.5" />
                <span>Hasilkan Dokumen</span>
              </button>
              <button
                type="button"
                onClick={() =>
                  triggerToast('Fitur unggah dokumen pendukung aktif untuk simulasi arsip Wajib Pajak.')
                }
                className="inline-flex items-center gap-1.5 bg-[#1E2C5E] hover:bg-[#16224A] text-white text-xs font-semibold px-4 py-2 rounded-[8px] shadow-xs transition cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Unggah Dokumen</span>
              </button>
            </div>
          </div>

          {/* Modul 2 Compact Guidance Strip */}
          <div className="bg-[#EFF6FF] border border-[#BFDBFE] text-[#1E3A8A] text-xs px-4 py-3 rounded-[10px] flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-[#1D4ED8]" />
              <span className="leading-relaxed">
                <strong>Modul 2 — Pelaporan PPh 21 Tahunan (Karyawan):</strong> Klik <strong>Unduh</strong> pada baris <strong>Bukti Potong Tahunan (BPA1)</strong> di bawah ini, lalu lanjutkan ke <strong>SPT › Konsep SPT</strong> untuk <em>Posting SPT</em> otomatis.
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                onSwitchAccountMode('INDIVIDUAL');
                onNavigate('spt', 'konsep');
              }}
              className="bg-[#1E2C5E] hover:bg-[#16224A] text-white font-semibold text-xs px-3.5 py-1.5 rounded-[8px] shrink-0 cursor-pointer"
            >
              Lanjut Lapor SPT Tahunan OP →
            </button>
          </div>

          {/* Coretax Utility Row: Icons on left + Filter & Atur Kolom on right */}
          <CoretaxIconToolbar
            onRefresh={() => {
              setDocNumFilter('');
              setDocDateFilter('');
              setDocTitleFilter('');
              setDocTypeFilter('');
              setDocCaseFilter('');
              setDocPage(1);
            }}
            onExportCsv={() =>
              downloadCsvFile(
                `Dokumen_Saya_${activeTaxpayer.nikNpwp}.csv`,
                ['Nomor Dokumen', 'Tanggal', 'Judul Dokumen', 'Jenis Dokumen', 'Nomor Kasus', 'Ringkasan'],
                filteredDocuments.map((d) => [
                  d.docNumber,
                  d.docDate,
                  d.title,
                  d.docType,
                  d.caseNumber,
                  d.summaryText,
                ])
              )
            }
            onExportExcel={() =>
              downloadCsvFile(
                `Dokumen_Saya_${activeTaxpayer.nikNpwp}.csv`,
                ['Nomor Dokumen', 'Tanggal', 'Judul Dokumen', 'Jenis Dokumen', 'Nomor Kasus', 'Ringkasan'],
                filteredDocuments.map((d) => [
                  d.docNumber,
                  d.docDate,
                  d.title,
                  d.docType,
                  d.caseNumber,
                  d.summaryText,
                ])
              )
            }
            onPrintPdf={() => window.print()}
            rightContent={
              <>
                <button
                  type="button"
                  onClick={() => setShowDocFilters((prev) => !prev)}
                  className="inline-flex items-center gap-1.5 bg-[#1E2C5E] hover:bg-[#16224A] text-white text-xs font-semibold px-3.5 py-1.5 rounded-[7px] transition cursor-pointer"
                >
                  <Filter className="w-3.5 h-3.5" />
                  <span>Filter</span>
                </button>
                <button
                  type="button"
                  onClick={() => triggerToast('Semua kolom standar Coretax telah ditampilkan.')}
                  className="inline-flex items-center gap-1.5 bg-white border border-[#CBD5E1] hover:bg-slate-50 text-[#1E2C5E] text-xs font-semibold px-3.5 py-1.5 rounded-[7px] transition cursor-pointer"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  <span>Atur Kolom</span>
                </button>
              </>
            }
          />

          {/* Official Coretax Deep-Navy Uppercase Table */}
          <div className="border border-[#E2E8F0] rounded-[10px] overflow-hidden bg-white">
            <div className="overflow-x-auto">
              <table className="w-full text-[11.5px] border-collapse">
                <thead>
                  <tr className="bg-[#1E2C5E] text-white uppercase tracking-wide font-bold text-[10.5px]">
                    <th className="px-3.5 py-3 text-left whitespace-nowrap">Nomor Dokumen</th>
                    <th className="px-3.5 py-3 text-left whitespace-nowrap">Tanggal Dokumen</th>
                    <th className="px-3.5 py-3 text-left whitespace-nowrap">Judul Dokumen</th>
                    <th className="px-3.5 py-3 text-left whitespace-nowrap">Jenis Dokumen</th>
                    <th className="px-3.5 py-3 text-left whitespace-nowrap">Nomor Kasus</th>
                    <th className="px-3.5 py-3 text-left whitespace-nowrap">Ringkasan / Nilai</th>
                    <th className="px-3.5 py-3 text-left whitespace-nowrap">Pengguna Pembuatan</th>
                    <th className="px-3.5 py-3 text-center whitespace-nowrap">Aksi</th>
                  </tr>
                  {showDocFilters && (
                    <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0]">
                      <th className="px-2.5 py-2">
                        <input
                          type="text"
                          value={docNumFilter}
                          onChange={(e) => {
                            setDocNumFilter(e.target.value);
                            setDocPage(1);
                          }}
                          placeholder="ketik nilai lengkap..."
                          className="w-full min-w-[130px] border border-[#CBD5E1] bg-white rounded-[6px] px-2.5 py-1 text-[11px] font-normal text-slate-700 focus:outline-none focus:border-[#1E2C5E]"
                        />
                      </th>
                      <th className="px-2.5 py-2">
                        <input
                          type="text"
                          value={docDateFilter}
                          onChange={(e) => {
                            setDocDateFilter(e.target.value);
                            setDocPage(1);
                          }}
                          placeholder="dd/mm/yyyy"
                          className="w-full min-w-[95px] border border-[#CBD5E1] bg-white rounded-[6px] px-2.5 py-1 text-[11px] font-normal text-slate-700 focus:outline-none focus:border-[#1E2C5E]"
                        />
                      </th>
                      <th className="px-2.5 py-2">
                        <input
                          type="text"
                          value={docTitleFilter}
                          onChange={(e) => {
                            setDocTitleFilter(e.target.value);
                            setDocPage(1);
                          }}
                          placeholder="ketik nilai lengkap..."
                          className="w-full min-w-[160px] border border-[#CBD5E1] bg-white rounded-[6px] px-2.5 py-1 text-[11px] font-normal text-slate-700 focus:outline-none focus:border-[#1E2C5E]"
                        />
                      </th>
                      <th className="px-2.5 py-2">
                        <input
                          type="text"
                          value={docTypeFilter}
                          onChange={(e) => {
                            setDocTypeFilter(e.target.value);
                            setDocPage(1);
                          }}
                          placeholder="ketik nilai lengkap..."
                          className="w-full min-w-[140px] border border-[#CBD5E1] bg-white rounded-[6px] px-2.5 py-1 text-[11px] font-normal text-slate-700 focus:outline-none focus:border-[#1E2C5E]"
                        />
                      </th>
                      <th className="px-2.5 py-2">
                        <input
                          type="text"
                          value={docCaseFilter}
                          onChange={(e) => {
                            setDocCaseFilter(e.target.value);
                            setDocPage(1);
                          }}
                          placeholder="ketik nilai lengkap..."
                          className="w-full min-w-[100px] border border-[#CBD5E1] bg-white rounded-[6px] px-2.5 py-1 text-[11px] font-normal text-slate-700 focus:outline-none focus:border-[#1E2C5E]"
                        />
                      </th>
                      <th className="px-2.5 py-2" colSpan={3} />
                    </tr>
                  )}
                </thead>
                <tbody className="divide-y divide-[#EEF2F6]">
                  {paginatedDocuments.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-10 text-center text-slate-500">
                        Tidak ada dokumen yang sesuai dengan filter pencarian.
                      </td>
                    </tr>
                  ) : (
                    paginatedDocuments.map((doc) => (
                      <tr key={doc.id} className="hover:bg-[#F8FAFC] transition-colors">
                        <td className="px-3.5 py-3 font-mono-num font-bold text-[#1E2C5E] whitespace-nowrap">
                          {doc.docNumber}
                        </td>
                        <td className="px-3.5 py-3 font-mono-num text-slate-600 whitespace-nowrap">
                          {doc.docDate}
                        </td>
                        <td className="px-3.5 py-3 font-bold text-[#1E293B] min-w-[210px]">
                          {doc.title}
                        </td>
                        <td className="px-3.5 py-3 font-medium text-slate-700 whitespace-nowrap">
                          {doc.docType}
                        </td>
                        <td className="px-3.5 py-3 font-mono-num text-slate-600 whitespace-nowrap">
                          {doc.caseNumber}
                        </td>
                        <td className="px-3.5 py-3 text-slate-600 font-mono-num text-[11px] min-w-[180px]">
                          {doc.summaryText}
                        </td>
                        <td className="px-3.5 py-3 font-mono-num text-slate-500 whitespace-nowrap">
                          {doc.createdBy}
                        </td>
                        <td className="px-3.5 py-3 text-center whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => {
                              if (doc.slip) {
                                onPrintDocument({ type: 'BPA1', slip: doc.slip });
                              } else if (doc.taxReturn) {
                                onPrintDocument({
                                  type: 'BPE',
                                  taxReturn: doc.taxReturn,
                                  taxpayer: activeTaxpayer,
                                });
                              } else {
                                triggerToast(`Dokumen "${doc.title}" (${doc.docNumber}) siap diunduh.`);
                              }
                            }}
                            className="px-3 py-1 rounded-[6px] border border-[#CBD5E1] bg-white hover:bg-[#1E2C5E] hover:text-white hover:border-[#1E2C5E] text-[#1E2C5E] font-semibold text-[11px] transition cursor-pointer"
                          >
                            Unduh
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <CoretaxPagination
              totalItems={filteredDocuments.length}
              page={docPage}
              pageSize={docPageSize}
              onPageChange={setDocPage}
              onPageSizeChange={setDocPageSize}
            />
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* SUB-TAB 3: NOTIFIKASI SAYA                                        */}
      {/* ================================================================= */}
      {subTab === 'notifikasi' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-display font-bold text-base text-[#1B2958]">Notifikasi Saya</h1>
              <p className="text-xs text-slate-500">
                Pemberitahuan real-time penerbitan faktur, bukti potong e-Bupot, kode billing, dan BPE SPT.
              </p>
            </div>
            <span className="text-xs font-mono-num text-slate-500">
              Total: {workspace.notifications.length} pesan
            </span>
          </div>

          <div className="border border-[#E5EAF2] rounded-[12px] divide-y divide-slate-100 overflow-hidden">
            {workspace.notifications.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500">
                Belum ada notifikasi pada akun Anda.
              </div>
            ) : (
              workspace.notifications.map((n) => (
                <div
                  key={n.id}
                  className={`p-4 flex items-start gap-3 text-xs ${
                    n.isRead ? 'bg-white' : 'bg-[#F0F7FF]'
                  }`}
                >
                  <div className="w-8 h-8 rounded-lg bg-[#EEF2FA] text-[#1E2C5E] flex items-center justify-center shrink-0 mt-0.5">
                    <Bell className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-[#1B2958]">{n.title}</span>
                      <span className="text-[11px] text-slate-400 font-mono-num">
                        {new Date(n.createdAt).toLocaleString('id-ID')}
                      </span>
                    </div>
                    <p className="text-slate-600 mt-1 leading-relaxed">{n.message}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* SUB-TAB 4: PROFIL SAYA & PERUBAHAN DATA                           */}
      {/* ================================================================= */}
      {isProfileSubTab && (
        <form onSubmit={handleSaveProfile} className="space-y-5">
          <div>
            <h1 className="font-display font-bold text-base text-[#1B2958]">
              {subTab === 'profil'
                ? 'Profil Saya'
                : subTab === 'perubahan_identitas'
                  ? 'Perubahan Data — Identitas Wajib Pajak'
                  : subTab === 'perubahan_alamat'
                    ? 'Perubahan Data — Perubahan Alamat Utama'
                    : 'Perubahan Data Wajib Pajak'}
            </h1>
            <p className="text-xs text-slate-500">
              Pembaruan profil Wajib Pajak otomatis tersinkronisasi ke formulir SPT, e-Faktur, dan e-Bupot.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-[13px]">
            <div>
              <label className="block text-xs font-bold text-[#1B2958] mb-1.5">
                NIK / NPWP (16 Digit)
              </label>
              <input
                type="text"
                value={activeTaxpayer.nikNpwp}
                disabled
                className="w-full border border-[#E2E8F0] bg-[#F8FAFC] rounded-[10px] px-3.5 py-2.5 font-mono-num text-slate-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#1B2958] mb-1.5">
                Nama Wajib Pajak
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full border border-[#DCE1EB] rounded-[10px] px-3.5 py-2.5 focus:outline-none focus:border-[#1E2C5E]"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#1B2958] mb-1.5">
                Email Terdaftar
              </label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full border border-[#DCE1EB] rounded-[10px] px-3.5 py-2.5 focus:outline-none focus:border-[#1E2C5E]"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#1B2958] mb-1.5">
                Nomor Telepon
              </label>
              <input
                type="text"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="w-full border border-[#DCE1EB] rounded-[10px] px-3.5 py-2.5 focus:outline-none focus:border-[#1E2C5E]"
              />
            </div>
            {accountMode === 'INDIVIDUAL' && (
              <div>
                <label className="block text-xs font-bold text-[#1B2958] mb-1.5">Status PTKP</label>
                <select
                  value={form.ptkpStatus}
                  onChange={(e) => setForm({ ...form, ptkpStatus: e.target.value as PtkpStatus })}
                  className="w-full border border-[#DCE1EB] rounded-[10px] px-3.5 py-2.5 bg-white focus:outline-none focus:border-[#1E2C5E]"
                >
                  {(['TK/0', 'TK/1', 'TK/2', 'TK/3', 'K/0', 'K/1', 'K/2', 'K/3'] as PtkpStatus[]).map(
                    (p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    )
                  )}
                </select>
              </div>
            )}
            <div>
              <label className="block text-xs font-bold text-[#1B2958] mb-1.5">
                Kode &amp; Nama KLU
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={form.kluCode}
                  onChange={(e) => setForm({ ...form, kluCode: e.target.value })}
                  className="w-24 border border-[#DCE1EB] rounded-[10px] px-3 py-2.5 font-mono-num"
                />
                <input
                  type="text"
                  value={form.kluName}
                  onChange={(e) => setForm({ ...form, kluName: e.target.value })}
                  className="flex-1 border border-[#DCE1EB] rounded-[10px] px-3.5 py-2.5"
                />
              </div>
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-[#1B2958] mb-1.5">
                Alamat Domisili / Usaha
              </label>
              <textarea
                rows={2}
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                className="w-full border border-[#DCE1EB] rounded-[10px] px-3.5 py-2.5 focus:outline-none focus:border-[#1E2C5E]"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-slate-100">
            {savedNotice ? (
              <span className="text-xs font-semibold text-emerald-700">
                Perubahan profil berhasil disimpan.
              </span>
            ) : (
              <span />
            )}
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 bg-[#1E2C5E] hover:bg-[#16224A] text-white font-semibold text-xs px-5 py-2.5 rounded-[10px] transition cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{saving ? 'Menyimpan...' : 'Simpan Perubahan Profil'}</span>
            </button>
          </div>
        </form>
      )}

      {/* ================================================================= */}
      {/* SUB-TAB 5+: OFFICIAL CORETAX PORTAL SERVICES (ZERO DEAD CLICKS)   */}
      {/* ================================================================= */}
      {serviceMeta && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#E5EAF2]">
            <div>
              <h1 className="font-display font-bold text-[17px] text-[#1E2C5E]">
                {serviceMeta.title}
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">{serviceMeta.subtitle}</p>
            </div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-[#EEF2FA] text-[#1E2C5E] text-xs font-bold">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              {serviceMeta.statusLabel}
            </span>
          </div>

          {subTab === 'kode_otorisasi' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="border border-[#E2E8F0] rounded-[10px] p-5 space-y-3 bg-[#F8FAFC]">
                <div className="flex items-center gap-2 font-bold text-[#1E2C5E] text-sm">
                  <KeyRound className="w-4 h-4 text-[#D97706]" />
                  <span>Kode Otorisasi DJP Aktif</span>
                </div>
                <dl className="space-y-2 text-xs">
                  <div className="flex justify-between gap-2">
                    <dt className="text-slate-500">Pemegang Sertifikat</dt>
                    <dd className="font-bold text-[#1E2C5E]">{activeTaxpayer.name}</dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-slate-500">NIK / NPWP</dt>
                    <dd className="font-mono-num font-semibold">{activeTaxpayer.nikNpwp}</dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-slate-500">Passphrase Simulasi</dt>
                    <dd className="font-mono-num font-bold text-emerald-700">123456</dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-slate-500">Masa Berlaku</dt>
                    <dd className="font-mono-num">02/01/2025 — 02/01/2027</dd>
                  </div>
                </dl>
                <button
                  type="button"
                  onClick={() =>
                    triggerToast('Permintaan pembaruan Kode Otorisasi DJP berhasil tercatat (Passphrase aktif: 123456).')
                  }
                  className="w-full mt-2 bg-[#1E2C5E] hover:bg-[#16224A] text-white font-semibold py-2 rounded-[8px] cursor-pointer"
                >
                  Ajukan Penerbitan Ulang Kode Otorisasi
                </button>
              </div>

              <div className="border border-[#E2E8F0] rounded-[10px] p-5 space-y-2.5 bg-white">
                <div className="font-bold text-[#1E2C5E] text-sm">Penggunaan Kode Otorisasi</div>
                <p className="text-slate-600 leading-relaxed">
                  Kode Otorisasi DJP digunakan sebagai tanda tangan elektronik sah saat:
                </p>
                <ul className="space-y-1.5 text-slate-600 list-disc pl-4">
                  <li>Menyetujui &amp; menerbitkan Faktur Pajak Keluaran di modul <strong>e-Faktur</strong>.</li>
                  <li>Menerbitkan Bukti Potong massal (Belum Terbit → Telah Terbit) di modul <strong>eBUPOT</strong>.</li>
                  <li>Menyampaikan SPT Masa PPN, SPT Masa PPh 21/23, serta SPT Tahunan OP &amp; Badan di modul <strong>SPT</strong>.</li>
                </ul>
              </div>
            </div>
          ) : subTab === 'pengukuhan_pkp' || subTab === 'status_kuasa' ? (
            <div className="border border-[#E2E8F0] rounded-[10px] p-5 bg-[#F8FAFC] flex flex-wrap items-center justify-between gap-4 text-xs">
              <div className="space-y-1">
                <div className="font-bold text-sm text-[#1E2C5E]">
                  {workspace.corporateTaxpayer.name}
                </div>
                <div className="font-mono-num text-slate-600">
                  NPWP Badan/PKP: {workspace.corporateTaxpayer.nikNpwp} · {workspace.corporateTaxpayer.kppName}
                </div>
                <div className="text-slate-600">
                  Wakil / Pengurus terdaftar: <strong>{workspace.individualTaxpayer.name}</strong> ({workspace.individualTaxpayer.nikNpwp})
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  onSwitchAccountMode('CORPORATE');
                  onNavigate('efaktur', 'dashboard');
                }}
                className="bg-[#1E2C5E] hover:bg-[#16224A] text-white font-semibold px-4 py-2 rounded-[8px] cursor-pointer"
              >
                Impersonate &amp; Buka e-Faktur PKP →
              </button>
            </div>
          ) : (
            <div className="border border-[#E2E8F0] rounded-[10px] overflow-hidden bg-white">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-[#1E2C5E] text-white uppercase text-[10.5px] font-bold">
                    <th className="px-4 py-3 text-left">Nomor Kasus</th>
                    <th className="px-4 py-3 text-left">Jenis Layanan</th>
                    <th className="px-4 py-3 text-left">NPWP / NIK</th>
                    <th className="px-4 py-3 text-left">Status</th>
                    <th className="px-4 py-3 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <tr>
                    <td className="px-4 py-3 font-mono-num font-bold text-[#1E2C5E]">
                      {serviceMeta.code}-2025-001
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-800">{serviceMeta.title}</td>
                    <td className="px-4 py-3 font-mono-num text-slate-600">{activeTaxpayer.nikNpwp}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded bg-emerald-50 border border-emerald-200 text-emerald-800 font-bold text-[10.5px]">
                        {serviceMeta.statusLabel}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() =>
                          triggerToast(
                            `Permohonan ${serviceMeta.title} untuk ${activeTaxpayer.name} berhasil dicatat dalam simulasi.`
                          )
                        }
                        className="px-3 py-1 rounded-[6px] bg-[#1E2C5E] hover:bg-[#16224A] text-white font-semibold text-[11px] cursor-pointer"
                      >
                        Ajukan Layanan
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
