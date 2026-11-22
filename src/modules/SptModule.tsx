import React, { useMemo, useState } from 'react';
import {
  ArrowLeft,
  ArrowUpDown,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Edit3,
  Eye,
  FilePlus2,
  FileSpreadsheet,
  FileText,
  Filter,
  Info,
  Printer,
  RefreshCw,
  Trash2,
} from 'lucide-react';
import {
  OpAssetLiabilityFamily,
  ReturnType,
  SptPphMasaPayload,
  SptPpnPayload,
  SptTahunanOpPayload,
  TaxReturn,
  Taxpayer,
  WorkspaceState,
} from '../types/tax.ts';
import { createDefaultBadanPayload } from '../data/seedData.ts';
import { formatRp, MONTHS_ID, PTKP_VALUES } from '../utils/taxCalc.ts';
import { PrintablePayload } from '../components/DocumentPrintModal.tsx';
import { SptMasaPpnEditor } from './spt/SptMasaPpnEditor.tsx';
import { SptMasaPphEditor } from './spt/SptMasaPphEditor.tsx';
import { SptTahunanOpEditor } from './spt/SptTahunanOpEditor.tsx';
import { SptTahunanBadanEditor } from './spt/SptTahunanBadanEditor.tsx';

interface SptModuleProps {
  subTab: string;
  onChangeSubTab: (tab: string) => void;
  workspace: WorkspaceState;
  activeTaxpayer: Taxpayer;
  accountMode: 'INDIVIDUAL' | 'CORPORATE';
  onCreateReturn: (ret: Omit<TaxReturn, 'id' | 'status' | 'createdAt' | 'updatedAt'>) => Promise<TaxReturn>;
  onUpdateReturn: (ret: TaxReturn) => Promise<void>;
  onDeleteReturn: (id: string) => Promise<void>;
  onSubmitReturn: (id: string, paymentMethod: 'DEPOSIT' | 'BILLING' | 'NONE') => Promise<void>;
  onAddAsset: (item: Omit<OpAssetLiabilityFamily, 'id' | 'taxpayerId'>) => Promise<void>;
  onDeleteAsset: (id: string) => Promise<void>;
  onPrintDocument: (doc: PrintablePayload) => void;
}

const TAX_TYPE_LABELS: Record<ReturnType, string> = {
  SPT_MASA_PPN: 'PPN',
  SPT_MASA_PPH21: 'PPh Pasal 21/26',
  SPT_MASA_UNIFIKASI: 'PPh Unifikasi',
  SPT_TAHUNAN_OP: 'PPh Orang Pribadi',
  SPT_TAHUNAN_BADAN: 'PPh Badan',
};

const RETURN_KIND_LABELS: Record<ReturnType, 'SPT Masa' | 'SPT Tahunan'> = {
  SPT_MASA_PPN: 'SPT Masa',
  SPT_MASA_PPH21: 'SPT Masa',
  SPT_MASA_UNIFIKASI: 'SPT Masa',
  SPT_TAHUNAN_OP: 'SPT Tahunan',
  SPT_TAHUNAN_BADAN: 'SPT Tahunan',
};

const RETURN_DESCRIPTIONS: Record<ReturnType, string> = {
  SPT_MASA_PPN: 'Surat Pemberitahuan Masa Pajak Pertambahan Nilai',
  SPT_MASA_PPH21: 'Surat Pemberitahuan Masa Pajak Penghasilan Pasal 21/26',
  SPT_MASA_UNIFIKASI: 'Surat Pemberitahuan Masa Pajak Penghasilan Unifikasi',
  SPT_TAHUNAN_OP: 'Surat Pemberitahuan Tahunan Pajak Penghasilan Orang Pribadi',
  SPT_TAHUNAN_BADAN: 'Surat Pemberitahuan Tahunan Pajak Penghasilan Wajib Pajak Badan',
};

const INNER_SPT_MENUS: Array<{
  id: 'konsep' | 'menunggu' | 'dilaporkan' | 'ditolak' | 'dibatalkan';
  label: string;
  bannerTitle: string;
  statusFilter: TaxReturn['status'] | 'CANCELLED';
}> = [
  {
    id: 'konsep',
    label: 'Konsep SPT',
    bannerTitle: 'SPT Belum Disampaikan',
    statusFilter: 'DRAFT',
  },
  {
    id: 'menunggu',
    label: 'SPT Menunggu Pembayaran',
    bannerTitle: 'SPT Menunggu Pembayaran',
    statusFilter: 'WAITING_PAYMENT',
  },
  {
    id: 'dilaporkan',
    label: 'SPT Dilaporkan',
    bannerTitle: 'SPT Dilaporkan',
    statusFilter: 'SUBMITTED',
  },
  {
    id: 'ditolak',
    label: 'SPT Ditolak',
    bannerTitle: 'SPT Ditolak',
    statusFilter: 'REJECTED',
  },
  {
    id: 'dibatalkan',
    label: 'SPT Dibatalkan',
    bannerTitle: 'SPT Dibatalkan',
    statusFilter: 'CANCELLED',
  },
];

function formatPeriodDisplay(ret: Pick<TaxReturn, 'taxPeriodMonth' | 'taxYear'>): string {
  if (ret.taxPeriodMonth > 0) {
    return `${MONTHS_ID[ret.taxPeriodMonth - 1]} ${ret.taxYear}`;
  }
  return `Januari ${ret.taxYear} - Desember ${ret.taxYear}`;
}

function formatStatusBadge(status: TaxReturn['status']): string {
  switch (status) {
    case 'DRAFT':
      return 'Konsep SPT';
    case 'WAITING_PAYMENT':
      return 'Menunggu Pembayaran';
    case 'SUBMITTED':
      return 'Dilaporkan';
    case 'REJECTED':
      return 'Ditolak';
    default:
      return status;
  }
}

/** Minimalist official-style desk worker illustration matching the deep navy Coretax SPT hero banner */
const SptBannerIllustration: React.FC = () => (
  <svg
    width="124"
    height="84"
    viewBox="0 0 140 96"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className="shrink-0 hidden sm:block"
    aria-hidden="true"
  >
    {/* Subtle backdrop window card */}
    <rect x="64" y="14" width="60" height="44" rx="5" fill="#2A3B73" stroke="#475A96" strokeWidth="1.2" />
    <rect x="72" y="24" width="24" height="4" rx="2" fill="#8FA3D9" fillOpacity="0.6" />
    <rect x="72" y="33" width="38" height="3.5" rx="1.75" fill="#687BB5" fillOpacity="0.5" />
    <rect x="72" y="41" width="30" height="3.5" rx="1.75" fill="#687BB5" fillOpacity="0.5" />
    <circle cx="110" cy="26" r="5" fill="#F4C430" fillOpacity="0.85" />

    {/* Desk surface */}
    <rect x="14" y="64" width="112" height="4" rx="2" fill="#6D7FA8" />
    <rect x="24" y="68" width="4" height="22" rx="1.5" fill="#475888" />
    <rect x="112" y="68" width="4" height="22" rx="1.5" fill="#475888" />

    {/* Monitor on desk */}
    <rect x="44" y="34" width="34" height="23" rx="3" fill="#DDE5F7" stroke="#8FA3D9" strokeWidth="1.5" />
    <rect x="48" y="38" width="26" height="15" rx="1.5" fill="#1E2C5E" />
    <rect x="52" y="42" width="12" height="2.5" rx="1" fill="#F4C430" />
    <rect x="52" y="47" width="18" height="2" rx="1" fill="#9BB0E3" />
    <rect x="58" y="57" width="6" height="7" fill="#9BB0E3" />
    <rect x="52" y="62" width="18" height="2" rx="1" fill="#9BB0E3" />

    {/* Person silhouette working at desk */}
    <circle cx="29" cy="30" r="7" fill="#C7D4F4" />
    <path
      d="M17 62C17 50.5 22 43 29.5 43C36 43 40 48.5 42 56H26V64H17V62Z"
      fill="#8FA3D9"
    />
    <path d="M35 49L49 56" stroke="#C7D4F4" strokeWidth="3.5" strokeLinecap="round" />

    {/* Stacked tax documents on right */}
    <rect x="92" y="55" width="18" height="9" rx="1.5" fill="#E8EEF9" />
    <rect x="95" y="58" width="12" height="1.8" rx="0.9" fill="#1E2C5E" fillOpacity="0.5" />
    <rect x="95" y="61" width="9" height="1.8" rx="0.9" fill="#1E2C5E" fillOpacity="0.35" />
  </svg>
);

export const SptModule: React.FC<SptModuleProps> = ({
  subTab,
  onChangeSubTab,
  workspace,
  activeTaxpayer,
  accountMode,
  onCreateReturn,
  onUpdateReturn,
  onDeleteReturn,
  onSubmitReturn,
  onAddAsset,
  onDeleteAsset,
  onPrintDocument,
}) => {
  const [editingReturnId, setEditingReturnId] = useState<string | null>(null);

  // Authentic inline 3-step "Buat Konsep SPT" creation state
  const [creatingConcept, setCreatingConcept] = useState(false);
  const [wizardStep, setWizardStep] = useState<1 | 2 | 3>(1);
  const [selectedType, setSelectedType] = useState<ReturnType>(
    accountMode === 'CORPORATE' ? 'SPT_MASA_PPN' : 'SPT_TAHUNAN_OP'
  );
  const [taxYear, setTaxYear] = useState(accountMode === 'CORPORATE' ? 2025 : 2024);
  const [taxMonth, setTaxMonth] = useState(1);
  const [revisionNo, setRevisionNo] = useState(0);
  const [submittingConcept, setSubmittingConcept] = useState(false);
  const [justCreatedId, setJustCreatedId] = useState<string | null>(null);

  // Table toolbar, inline filters, sort & pagination state
  const [showFilters, setShowFilters] = useState(true);
  const [filterTaxType, setFilterTaxType] = useState('');
  const [filterReturnKind, setFilterReturnKind] = useState('');
  const [filterPeriod, setFilterPeriod] = useState('');
  const [filterModelSearch, setFilterModelSearch] = useState('');
  const [sortField, setSortField] = useState<'taxType' | 'kind' | 'period' | 'model' | 'amount'>('period');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);

  const editingReturn = editingReturnId
    ? workspace.returns.find((r) => r.id === editingReturnId) || null
    : null;

  const activeMenuMeta =
    INNER_SPT_MENUS.find((m) => m.id === subTab) || INNER_SPT_MENUS[0];

  const taxpayerReturns = useMemo(
    () => workspace.returns.filter((r) => r.taxpayerId === activeTaxpayer.id),
    [workspace.returns, activeTaxpayer.id]
  );

  const countByMenuId = useMemo(() => {
    const counts: Record<string, number> = {
      konsep: 0,
      menunggu: 0,
      dilaporkan: 0,
      ditolak: 0,
      dibatalkan: 0,
    };
    taxpayerReturns.forEach((r) => {
      if (r.status === 'DRAFT') counts.konsep += 1;
      else if (r.status === 'WAITING_PAYMENT') counts.menunggu += 1;
      else if (r.status === 'SUBMITTED') counts.dilaporkan += 1;
      else if (r.status === 'REJECTED') counts.ditolak += 1;
    });
    return counts;
  }, [taxpayerReturns]);

  const statusReturns = useMemo(() => {
    if (activeMenuMeta.statusFilter === 'CANCELLED') return [];
    return taxpayerReturns.filter((r) => r.status === activeMenuMeta.statusFilter);
  }, [taxpayerReturns, activeMenuMeta.statusFilter]);

  const uniquePeriods = useMemo(() => {
    const set = new Set<string>();
    statusReturns.forEach((r) => set.add(formatPeriodDisplay(r)));
    return Array.from(set);
  }, [statusReturns]);

  const filteredAndSortedReturns = useMemo(() => {
    const list = statusReturns.filter((ret) => {
      const taxLabel = TAX_TYPE_LABELS[ret.returnType];
      const kindLabel = RETURN_KIND_LABELS[ret.returnType];
      const periodLabel = formatPeriodDisplay(ret);
      const modelLabel = ret.revisionNo === 0 ? 'Normal' : `Pembetulan ${ret.revisionNo}`;

      if (filterTaxType && taxLabel !== filterTaxType) return false;
      if (filterReturnKind && kindLabel !== filterReturnKind) return false;
      if (filterPeriod && periodLabel !== filterPeriod) return false;
      if (filterModelSearch.trim()) {
        const q = filterModelSearch.toLowerCase();
        const hay = `${modelLabel} ${ret.bpeNumber || ''} ${formatStatusBadge(ret.status)}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    list.sort((a, b) => {
      let cmp = 0;
      if (sortField === 'taxType') {
        cmp = TAX_TYPE_LABELS[a.returnType].localeCompare(TAX_TYPE_LABELS[b.returnType]);
      } else if (sortField === 'kind') {
        cmp = RETURN_KIND_LABELS[a.returnType].localeCompare(RETURN_KIND_LABELS[b.returnType]);
      } else if (sortField === 'period') {
        cmp = a.taxYear * 100 + a.taxPeriodMonth - (b.taxYear * 100 + b.taxPeriodMonth);
      } else if (sortField === 'model') {
        cmp = a.revisionNo - b.revisionNo;
      } else if (sortField === 'amount') {
        cmp = a.underOverPayment - b.underOverPayment;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });

    return list;
  }, [
    statusReturns,
    filterTaxType,
    filterReturnKind,
    filterPeriod,
    filterModelSearch,
    sortField,
    sortDir,
  ]);

  const totalPages = Math.max(1, Math.ceil(filteredAndSortedReturns.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const paginatedReturns = filteredAndSortedReturns.slice(
    (safePage - 1) * pageSize,
    safePage * pageSize
  );

  // If editing an existing SPT return, render the specialized SPT Form Editor
  if (editingReturn) {
    if (editingReturn.returnType === 'SPT_MASA_PPN') {
      return (
        <SptMasaPpnEditor
          taxReturn={editingReturn}
          workspace={workspace}
          activeTaxpayer={activeTaxpayer}
          onBack={() => setEditingReturnId(null)}
          onSave={onUpdateReturn}
          onSubmit={onSubmitReturn}
        />
      );
    }
    if (
      editingReturn.returnType === 'SPT_MASA_PPH21' ||
      editingReturn.returnType === 'SPT_MASA_UNIFIKASI'
    ) {
      return (
        <SptMasaPphEditor
          taxReturn={editingReturn}
          workspace={workspace}
          activeTaxpayer={activeTaxpayer}
          onBack={() => setEditingReturnId(null)}
          onSave={onUpdateReturn}
          onSubmit={onSubmitReturn}
        />
      );
    }
    if (editingReturn.returnType === 'SPT_TAHUNAN_OP') {
      return (
        <SptTahunanOpEditor
          taxReturn={editingReturn}
          workspace={workspace}
          activeTaxpayer={activeTaxpayer}
          onBack={() => setEditingReturnId(null)}
          onSave={onUpdateReturn}
          onSubmit={onSubmitReturn}
          onAddAsset={onAddAsset}
          onDeleteAsset={onDeleteAsset}
        />
      );
    }
    return (
      <SptTahunanBadanEditor
        taxReturn={editingReturn}
        activeTaxpayer={activeTaxpayer}
        onBack={() => setEditingReturnId(null)}
        onSave={onUpdateReturn}
        onSubmit={onSubmitReturn}
      />
    );
  }

  const availableTypes: ReturnType[] =
    accountMode === 'CORPORATE'
      ? ['SPT_MASA_PPN', 'SPT_MASA_PPH21', 'SPT_MASA_UNIFIKASI', 'SPT_TAHUNAN_BADAN']
      : ['SPT_TAHUNAN_OP'];

  const isSelectedAnnual =
    selectedType === 'SPT_TAHUNAN_OP' || selectedType === 'SPT_TAHUNAN_BADAN';

  const handleStartCreateConcept = () => {
    const defaultType: ReturnType =
      accountMode === 'CORPORATE' ? 'SPT_MASA_PPN' : 'SPT_TAHUNAN_OP';
    setSelectedType(defaultType);
    setTaxYear(accountMode === 'CORPORATE' ? 2025 : 2024);
    setTaxMonth(1);
    setRevisionNo(0);
    setWizardStep(1);
    setCreatingConcept(true);
  };

  const handleFinishCreateConcept = async () => {
    setSubmittingConcept(true);
    try {
      const isAnnual =
        selectedType === 'SPT_TAHUNAN_OP' || selectedType === 'SPT_TAHUNAN_BADAN';
      let payload: TaxReturn['payload'];

      if (selectedType === 'SPT_MASA_PPN') {
        payload = {
          eksporDpp: 0,
          penyerahanPpnDipungutSendiriDpp: 0,
          penyerahanPpnDipungutSendiriPpn: 0,
          penyerahanDipungutPemungutDpp: 0,
          penyerahanDipungutPemungutPpn: 0,
          penyerahanDibebaskanDpp: 0,
          returKeluaranPpn: 0,
          pajakMasukanDikreditkan: 0,
          pajakMasukanTidakDikreditkan: 0,
          returMasukanPpn: 0,
          kompensasiMasaSebelumnya: 0,
          pilihanLebihBayar: 'KOMPENSASI',
          postedInvoiceIds: [],
        } as SptPpnPayload;
      } else if (selectedType === 'SPT_MASA_PPH21' || selectedType === 'SPT_MASA_UNIFIKASI') {
        payload = {
          kapCode: selectedType === 'SPT_MASA_PPH21' ? '411121' : '411124',
          kjsCode: selectedType === 'SPT_MASA_PPH21' ? '100' : '104',
          totalGross: 0,
          totalTaxWithheld: 0,
          slipCount: 0,
          postedSlipIds: [],
          lebihBayarKompensasi: 0,
        } as SptPphMasaPayload;
      } else if (selectedType === 'SPT_TAHUNAN_OP') {
        payload = {
          sumberPenghasilanPekerjaan: true,
          sumberPenghasilanUsaha: false,
          punyaPphFinal: false,
          punyaBukanObjek: false,
          punyaHartaUtang: true,
          statusPtkp: activeTaxpayer.ptkpStatus,
          penghasilanBrutoPekerjaan: 0,
          biayaJabatanPensiun: 0,
          penghasilanNetoPekerjaan: 0,
          penghasilanNetoUsaha: 0,
          penghasilanNetoDalamNegeriLain: 0,
          penghasilanNetoLuarNegeri: 0,
          zakatSumbangan: 0,
          ptkpAmount: PTKP_VALUES[activeTaxpayer.ptkpStatus],
          pkpAmount: 0,
          pphTerutang: 0,
          kreditPajakBpa1: 0,
          angsuranPph25: 0,
          pphFinalItems: [],
          bukanObjekItems: [],
          postedSlipIds: [],
        } as SptTahunanOpPayload;
      } else {
        payload = createDefaultBadanPayload();
      }

      const created = await onCreateReturn({
        taxpayerId: activeTaxpayer.id,
        returnType: selectedType,
        taxYear,
        taxPeriodMonth: isAnnual ? 0 : taxMonth,
        revisionNo,
        taxPayable: 0,
        taxCredit: 0,
        underOverPayment: 0,
        payload,
      });
      setCreatingConcept(false);
      onChangeSubTab('konsep');
      setJustCreatedId(created.id);
    } finally {
      setSubmittingConcept(false);
    }
  };

  const handleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  const handleResetFilters = () => {
    setFilterTaxType('');
    setFilterReturnKind('');
    setFilterPeriod('');
    setFilterModelSearch('');
    setPage(1);
  };

  const handleExportTable = (extension: 'csv' | 'xls') => {
    const delimiter = extension === 'csv' ? ',' : '\t';
    const headers = [
      'Jenis Pajak',
      'Jenis Surat Pemberitahuan Pajak',
      'Masa Pajak',
      'Model SPT',
      'Kurang/Lebih Bayar',
      'Status/Nomor BPE',
    ];
    const rows = filteredAndSortedReturns.map((ret) => [
      TAX_TYPE_LABELS[ret.returnType],
      RETURN_KIND_LABELS[ret.returnType],
      formatPeriodDisplay(ret),
      ret.revisionNo === 0 ? 'Normal' : `Pembetulan ${ret.revisionNo}`,
      String(ret.underOverPayment),
      ret.bpeNumber || formatStatusBadge(ret.status),
    ]);
    const content = [headers, ...rows]
      .map((line) => line.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(delimiter))
      .join('\n');
    const blob = new Blob([content], {
      type: extension === 'csv' ? 'text/csv;charset=utf-8;' : 'application/vnd.ms-excel;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `spt-${activeMenuMeta.id}-${activeTaxpayer.nikNpwp}.${extension}`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const justCreatedReturn = justCreatedId
    ? taxpayerReturns.find((r) => r.id === justCreatedId) || null
    : null;

  return (
    <div className="flex flex-col md:flex-row gap-4 items-start">
      {/* ===================================================================== */}
      {/* INNER LEFT SPT SUB-NAVIGATION CARD (EXACT MATCH TO CORETAX SCREENSHOT)*/}
      {/* ===================================================================== */}
      <div className="w-full md:w-[205px] xl:w-[225px] shrink-0 bg-white border border-[#E5EAF2] rounded-[10px] overflow-hidden shadow-[0_2px_10px_rgba(30,44,94,0.04)]">
        {/* Deep Navy Identity Header: NPWP/NIK + Uppercase Name */}
        <div className="bg-[#1E2C5E] text-white px-4 py-4">
          <div className="font-mono-num font-bold text-[15px] leading-[1.3] tracking-wide break-all">
            {activeTaxpayer.nikNpwp}
          </div>
          <div className="text-[12px] font-medium uppercase tracking-wide text-slate-200 mt-1.5 leading-snug">
            {activeTaxpayer.name}
          </div>
        </div>

        {/* Section Heading */}
        <div className="px-4 py-3 font-display font-bold text-[13.5px] leading-snug text-[#1B2958] border-b border-[#EEF2F6]">
          Surat Pemberitahuan (SPT)
        </div>

        {/* 5 Official SPT Status Links */}
        <div className="divide-y divide-[#F1F5F9]">
          {INNER_SPT_MENUS.map((menu) => {
            const isCurrent = !creatingConcept && activeMenuMeta.id === menu.id;
            const count = countByMenuId[menu.id] || 0;
            return (
              <button
                key={menu.id}
                type="button"
                onClick={() => {
                  setCreatingConcept(false);
                  setPage(1);
                  onChangeSubTab(menu.id);
                }}
                className={`w-full text-left px-4 py-2.5 text-[13px] transition cursor-pointer flex items-center justify-between gap-2 ${
                  isCurrent
                    ? 'bg-[#E8F1F8] text-[#1E2C5E] font-bold'
                    : 'text-[#475569] hover:bg-[#F8FAFC] hover:text-[#1E2C5E] font-medium'
                }`}
              >
                <span className="leading-snug">{menu.label}</span>
                {count > 0 && (
                  <span
                    className={`text-[11px] font-mono-num px-1.5 py-0.5 rounded-full shrink-0 ${
                      isCurrent
                        ? 'bg-[#1E2C5E] text-white font-bold'
                        : 'bg-slate-100 text-slate-600 font-semibold'
                    }`}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ===================================================================== */}
      {/* INNER RIGHT WORKSPACE COLUMN                                          */}
      {/* ===================================================================== */}
      <div className="flex-1 min-w-0 w-full space-y-4">
        {creatingConcept ? (
          /* ================================================================= */
          /* AUTHENTIC 3-STEP INLINE "BUAT KONSEP SPT" CORETAX WORKFLOW        */
          /* ================================================================= */
          <>
            {/* Deep Navy Hero Banner */}
            <div className="bg-[#1E2C5E] text-white rounded-[10px] px-5 sm:px-6 py-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <SptBannerIllustration />
                <div>
                  <h1 className="font-display font-bold text-[20px] sm:text-[22px] tracking-tight leading-tight">
                    Buat Konsep SPT
                  </h1>
                  <p className="text-[12px] text-slate-300 mt-1">
                    Ikuti 3 langkah pembuatan Konsep Surat Pemberitahuan sesuai alur Coretax DJP.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCreatingConcept(false)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition cursor-pointer shrink-0"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Kembali</span>
              </button>
            </div>

            {/* White 3-Step Horizontal Stepper Card */}
            <div className="bg-white border border-[#E5EAF2] rounded-[10px] overflow-hidden shadow-[0_2px_10px_rgba(30,44,94,0.03)]">
              {/* Horizontal Numbered Circle Stepper */}
              <div className="px-5 sm:px-8 py-5 bg-[#FAFBFD] border-b border-[#E5EAF2]">
                <div className="flex items-center justify-between max-w-2xl mx-auto">
                  {[
                    { num: 1 as const, title: 'Pilih Jenis SPT' },
                    { num: 2 as const, title: 'Pilih Periode Pelaporan SPT' },
                    { num: 3 as const, title: 'Pilih Model SPT' },
                  ].map((st, idx) => {
                    const isCompleted = wizardStep > st.num;
                    const isActive = wizardStep === st.num;
                    return (
                      <React.Fragment key={st.num}>
                        <div className="flex flex-col sm:flex-row items-center gap-2 text-center sm:text-left">
                          <span
                            className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition ${
                              isCompleted
                                ? 'bg-emerald-600 text-white'
                                : isActive
                                  ? 'bg-[#1E2C5E] text-white ring-4 ring-[#F4C430]/35'
                                  : 'bg-slate-200 text-slate-500'
                            }`}
                          >
                            {isCompleted ? <Check className="w-4 h-4" /> : st.num}
                          </span>
                          <span
                            className={`text-[12px] sm:text-[13px] leading-tight ${
                              isActive
                                ? 'font-bold text-[#1E2C5E]'
                                : isCompleted
                                  ? 'font-semibold text-emerald-700'
                                  : 'font-medium text-slate-400'
                            }`}
                          >
                            {st.title}
                          </span>
                        </div>
                        {idx < 2 && (
                          <div
                            className={`flex-1 h-[2px] mx-2 sm:mx-4 rounded ${
                              wizardStep > st.num ? 'bg-emerald-500' : 'bg-slate-200'
                            }`}
                          />
                        )}
                      </React.Fragment>
                    );
                  })}
                </div>
              </div>

              {/* Step Body Content */}
              <div className="p-5 sm:p-7 space-y-5">
                {wizardStep === 1 && (
                  <div className="space-y-4">
                    <div>
                      <h2 className="font-display font-bold text-[15px] text-[#1B2958]">
                        Pilih Jenis SPT
                      </h2>
                      <p className="text-[12.5px] text-slate-500 mt-0.5">
                        Wajib Pajak aktif:{' '}
                        <strong className="text-[#1B2958]">{activeTaxpayer.name}</strong> (
                        <span className="font-mono-num">{activeTaxpayer.nikNpwp}</span>)
                      </p>
                    </div>

                    <div className="space-y-2.5">
                      {availableTypes.map((typeKey) => {
                        const checked = selectedType === typeKey;
                        return (
                          <label
                            key={typeKey}
                            className={`flex items-start gap-3 p-3.5 rounded-[10px] border transition cursor-pointer ${
                              checked
                                ? 'border-[#1E2C5E] bg-[#F2F6FC] ring-1 ring-[#1E2C5E]/20'
                                : 'border-[#DCE2EC] bg-white hover:border-slate-300 hover:bg-[#FAFBFD]'
                            }`}
                          >
                            <input
                              type="radio"
                              name="jenisSpt"
                              checked={checked}
                              onChange={() => {
                                setSelectedType(typeKey);
                                const annual =
                                  typeKey === 'SPT_TAHUNAN_OP' || typeKey === 'SPT_TAHUNAN_BADAN';
                                setTaxYear(annual ? 2024 : 2025);
                              }}
                              className="mt-1 accent-[#1E2C5E]"
                            />
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="text-[13.5px] font-bold text-[#1B2958]">
                                  {TAX_TYPE_LABELS[typeKey]}
                                </span>
                                <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-[#EEF2FA] text-[#1E2C5E]">
                                  {RETURN_KIND_LABELS[typeKey]}
                                </span>
                              </div>
                              <p className="text-[12px] text-slate-500 mt-0.5">
                                {RETURN_DESCRIPTIONS[typeKey]}
                              </p>
                            </div>
                          </label>
                        );
                      })}
                    </div>

                    {accountMode === 'INDIVIDUAL' && (
                      <div className="flex items-start gap-2.5 p-3 rounded-[8px] bg-[#F8FAFC] border border-[#E5EAF2] text-[12px] text-slate-600">
                        <Info className="w-4 h-4 text-[#1E2C5E] shrink-0 mt-0.5" />
                        <span>
                          Untuk membuat Konsep SPT <strong>PPN</strong>, <strong>PPh Pasal 21/26</strong>,{' '}
                          <strong>PPh Unifikasi</strong>, atau <strong>PPh Badan</strong>, beralihlah ke
                          akun Badan / PKP melalui menu <strong>Impersonate</strong> di pojok kanan atas.
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {wizardStep === 2 && (
                  <div className="space-y-5">
                    <div>
                      <h2 className="font-display font-bold text-[15px] text-[#1B2958]">
                        Pilih Periode Pelaporan SPT
                      </h2>
                      <p className="text-[12.5px] text-slate-500 mt-0.5">
                        Jenis Pajak dipilih:{' '}
                        <strong className="text-[#1B2958]">{TAX_TYPE_LABELS[selectedType]}</strong>
                      </p>
                    </div>

                    {/* Jenis Periode SPT (Radio) */}
                    <div className="space-y-2">
                      <label className="block text-[12.5px] font-bold text-[#1B2958]">
                        Jenis Periode SPT <span className="text-rose-600">*</span>
                      </label>
                      <div className="flex flex-wrap gap-3">
                        <label
                          className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-[8px] border text-[13px] ${
                            !isSelectedAnnual
                              ? 'border-[#1E2C5E] bg-[#F2F6FC] font-bold text-[#1B2958]'
                              : 'border-slate-200 bg-slate-50 text-slate-400 cursor-not-allowed'
                          }`}
                        >
                          <input
                            type="radio"
                            name="jenisPeriode"
                            checked={!isSelectedAnnual}
                            disabled={isSelectedAnnual}
                            readOnly
                            className="accent-[#1E2C5E]"
                          />
                          <span>SPT Masa</span>
                        </label>
                        <label
                          className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-[8px] border text-[13px] ${
                            isSelectedAnnual
                              ? 'border-[#1E2C5E] bg-[#F2F6FC] font-bold text-[#1B2958]'
                              : 'border-slate-200 bg-slate-50 text-slate-400 cursor-not-allowed'
                          }`}
                        >
                          <input
                            type="radio"
                            name="jenisPeriode"
                            checked={isSelectedAnnual}
                            disabled={!isSelectedAnnual}
                            readOnly
                            className="accent-[#1E2C5E]"
                          />
                          <span>SPT Tahunan</span>
                        </label>
                      </div>
                    </div>

                    {/* Periode dan Tahun Pajak */}
                    {isSelectedAnnual ? (
                      <div className="max-w-md space-y-1.5">
                        <label className="block text-[12.5px] font-bold text-[#1B2958]">
                          Periode dan Tahun Pajak <span className="text-rose-600">*</span>
                        </label>
                        <select
                          value={taxYear}
                          onChange={(e) => setTaxYear(Number(e.target.value))}
                          className="w-full border border-[#CBD5E1] rounded-[8px] px-3.5 py-2.5 text-[13px] bg-white text-[#1E293B] focus:outline-none focus:border-[#1E2C5E]"
                        >
                          <option value={2024}>Januari 2024 - Desember 2024</option>
                          <option value={2025}>Januari 2025 - Desember 2025</option>
                          <option value={2026}>Januari 2026 - Desember 2026</option>
                        </select>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-xl">
                        <div className="space-y-1.5">
                          <label className="block text-[12.5px] font-bold text-[#1B2958]">
                            Masa Pajak <span className="text-rose-600">*</span>
                          </label>
                          <select
                            value={taxMonth}
                            onChange={(e) => setTaxMonth(Number(e.target.value))}
                            className="w-full border border-[#CBD5E1] rounded-[8px] px-3.5 py-2.5 text-[13px] bg-white text-[#1E293B] focus:outline-none focus:border-[#1E2C5E]"
                          >
                            {MONTHS_ID.map((m, idx) => (
                              <option key={m} value={idx + 1}>
                                {m}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="space-y-1.5">
                          <label className="block text-[12.5px] font-bold text-[#1B2958]">
                            Tahun Pajak <span className="text-rose-600">*</span>
                          </label>
                          <select
                            value={taxYear}
                            onChange={(e) => setTaxYear(Number(e.target.value))}
                            className="w-full border border-[#CBD5E1] rounded-[8px] px-3.5 py-2.5 text-[13px] bg-white text-[#1E293B] font-mono-num focus:outline-none focus:border-[#1E2C5E]"
                          >
                            <option value={2024}>2024</option>
                            <option value={2025}>2025</option>
                            <option value={2026}>2026</option>
                          </select>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {wizardStep === 3 && (
                  <div className="space-y-5">
                    <div>
                      <h2 className="font-display font-bold text-[15px] text-[#1B2958]">
                        Pilih Model SPT
                      </h2>
                      <p className="text-[12.5px] text-slate-500 mt-0.5">
                        Tentukan apakah SPT yang dibuat merupakan pelaporan Normal atau Pembetulan.
                      </p>
                    </div>

                    <div className="space-y-2.5">
                      <label className="block text-[12.5px] font-bold text-[#1B2958]">
                        Model SPT <span className="text-rose-600">*</span>
                      </label>
                      <div className="flex flex-wrap items-center gap-3">
                        <label
                          className={`inline-flex items-center gap-2.5 px-4 py-2.5 rounded-[8px] border text-[13px] cursor-pointer transition ${
                            revisionNo === 0
                              ? 'border-[#1E2C5E] bg-[#F2F6FC] font-bold text-[#1B2958]'
                              : 'border-[#DCE2EC] bg-white text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          <input
                            type="radio"
                            name="modelSpt"
                            checked={revisionNo === 0}
                            onChange={() => setRevisionNo(0)}
                            className="accent-[#1E2C5E]"
                          />
                          <span>Normal</span>
                        </label>
                        <label
                          className={`inline-flex items-center gap-2.5 px-4 py-2.5 rounded-[8px] border text-[13px] cursor-pointer transition ${
                            revisionNo > 0
                              ? 'border-[#1E2C5E] bg-[#F2F6FC] font-bold text-[#1B2958]'
                              : 'border-[#DCE2EC] bg-white text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          <input
                            type="radio"
                            name="modelSpt"
                            checked={revisionNo > 0}
                            onChange={() => setRevisionNo(1)}
                            className="accent-[#1E2C5E]"
                          />
                          <span>Pembetulan</span>
                        </label>
                      </div>

                      {revisionNo > 0 && (
                        <div className="max-w-[200px] pt-2">
                          <label className="block text-[12px] font-semibold text-slate-600 mb-1">
                            Pembetulan ke-
                          </label>
                          <input
                            type="number"
                            min={1}
                            max={10}
                            value={revisionNo}
                            onChange={(e) => setRevisionNo(Math.max(1, Number(e.target.value) || 1))}
                            className="w-full border border-[#CBD5E1] rounded-[8px] px-3 py-2 text-[13px] font-mono-num focus:outline-none focus:border-[#1E2C5E]"
                          />
                        </div>
                      )}
                    </div>

                    {/* Ringkasan Konsep SPT */}
                    <div className="rounded-[10px] border border-[#E5EAF2] bg-[#F8FAFC] p-4 space-y-2">
                      <div className="text-[12px] font-bold uppercase tracking-wider text-slate-500">
                        Ringkasan Konsep SPT
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-[12.5px]">
                        <div>
                          <span className="text-slate-500">Jenis Pajak:</span>{' '}
                          <strong className="text-[#1B2958]">{TAX_TYPE_LABELS[selectedType]}</strong>
                        </div>
                        <div>
                          <span className="text-slate-500">Jenis Surat Pemberitahuan Pajak:</span>{' '}
                          <strong className="text-[#1B2958]">{RETURN_KIND_LABELS[selectedType]}</strong>
                        </div>
                        <div>
                          <span className="text-slate-500">Masa Pajak:</span>{' '}
                          <strong className="text-[#1B2958]">
                            {isSelectedAnnual
                              ? `Januari ${taxYear} - Desember ${taxYear}`
                              : `${MONTHS_ID[taxMonth - 1]} ${taxYear}`}
                          </strong>
                        </div>
                        <div>
                          <span className="text-slate-500">Model SPT:</span>{' '}
                          <strong className="text-[#1B2958]">
                            {revisionNo === 0 ? 'Normal' : `Pembetulan ke-${revisionNo}`}
                          </strong>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Step Footer Buttons */}
                <div className="pt-4 border-t border-[#EEF2F6] flex items-center justify-between gap-3">
                  {wizardStep === 1 ? (
                    <button
                      type="button"
                      onClick={() => setCreatingConcept(false)}
                      className="px-4 py-2 rounded-[7px] border border-[#CBD5E1] text-[12.5px] font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                    >
                      Batal
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setWizardStep((s) => ((s - 1) as 1 | 2 | 3))}
                      className="px-4 py-2 rounded-[7px] border border-[#CBD5E1] text-[12.5px] font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                    >
                      Kembali
                    </button>
                  )}

                  {wizardStep < 3 ? (
                    <button
                      type="button"
                      onClick={() => setWizardStep((s) => ((s + 1) as 1 | 2 | 3))}
                      className="px-5 py-2 rounded-[7px] bg-[#1E2C5E] hover:bg-[#2A3B7A] text-white text-[12.5px] font-bold shadow-sm cursor-pointer"
                    >
                      Lanjut
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={submittingConcept}
                      onClick={handleFinishCreateConcept}
                      className="px-5 py-2 rounded-[7px] bg-[#1E2C5E] hover:bg-[#2A3B7A] disabled:opacity-60 text-white text-[12.5px] font-bold shadow-sm inline-flex items-center gap-2 cursor-pointer"
                    >
                      <FilePlus2 className="w-4 h-4 text-[#F4C430]" />
                      <span>{submittingConcept ? 'Membuat Konsep...' : 'Buat Konsep SPT'}</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </>
        ) : (
          /* ================================================================= */
          /* DEFAULT CORETAX SPT LIST VIEW (EXACT MATCH TO SCREENSHOT)         */
          /* ================================================================= */
          <>
            {/* Deep Navy Illustrated Hero Banner */}
            <div className="bg-[#1E2C5E] text-white rounded-[10px] px-5 sm:px-6 py-4 sm:py-5 flex items-center gap-5 overflow-hidden">
              <SptBannerIllustration />
              <div className="min-w-0">
                <h1 className="font-display font-bold text-[20px] sm:text-[23px] tracking-tight leading-tight">
                  {activeMenuMeta.bannerTitle}
                </h1>
              </div>
            </div>

            {/* Success Confirmation Banner immediately after creating a Konsep SPT */}
            {justCreatedReturn && activeMenuMeta.id === 'konsep' && (
              <div className="rounded-[10px] border border-emerald-200 bg-emerald-50 px-4 py-3 flex flex-wrap items-center justify-between gap-3 text-[12.5px]">
                <div className="flex items-center gap-2 text-emerald-900">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>
                    Konsep SPT <strong>{TAX_TYPE_LABELS[justCreatedReturn.returnType]}</strong> (
                    {formatPeriodDisplay(justCreatedReturn)}) berhasil dibuat. Klik ikon pensil untuk
                    mengisi formulir SPT.
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingReturnId(justCreatedReturn.id);
                      setJustCreatedId(null);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[7px] bg-[#1E2C5E] hover:bg-[#2A3B7A] text-white font-bold text-xs cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-[#F4C430]" />
                    <span>Isi Formulir SPT</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setJustCreatedId(null)}
                    className="text-xs font-semibold text-emerald-700 hover:underline cursor-pointer"
                  >
                    Tutup
                  </button>
                </div>
              </div>
            )}

            {/* White Table Card */}
            <div className="bg-white border border-[#E5EAF2] rounded-[10px] overflow-hidden shadow-[0_2px_10px_rgba(30,44,94,0.03)]">
              {/* Top Shaded Action Strip with Buat Konsep SPT Button */}
              <div className="px-4 py-3.5 bg-[#F8FAFC] border-b border-[#E5EAF2] flex flex-wrap items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={handleStartCreateConcept}
                  className="inline-flex items-center gap-2 bg-[#1E2C5E] hover:bg-[#2A3B7A] text-white font-bold text-[12.5px] px-4 py-2 rounded-[7px] shadow-sm transition cursor-pointer"
                >
                  <FilePlus2 className="w-4 h-4" />
                  <span>Buat Konsep SPT</span>
                </button>

                <span className="text-[11.5px] text-slate-500">
                  Menampilkan <strong className="font-mono-num text-[#1B2958]">{filteredAndSortedReturns.length}</strong> data SPT
                </span>
              </div>

              {/* 5 Official Compact Square Toolbar Icon Buttons */}
              <div className="px-4 pt-3.5 pb-2.5 flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleResetFilters}
                  title="Muat ulang & reset filter"
                  className="w-8 h-8 rounded-[6px] bg-[#EEF4FF] hover:bg-[#DCE8FF] border border-[#D4E2FA] text-[#1E2C5E] inline-flex items-center justify-center transition cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => handleExportTable('csv')}
                  title="Ekspor ke CSV"
                  className="w-8 h-8 rounded-[6px] bg-[#5B636E] hover:bg-[#49505A] text-white inline-flex items-center justify-center transition cursor-pointer"
                >
                  <FileText className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => handleExportTable('xls')}
                  title="Ekspor ke Excel"
                  className="w-8 h-8 rounded-[6px] bg-[#2E7D32] hover:bg-[#256628] text-white inline-flex items-center justify-center transition cursor-pointer"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  title="Cetak Daftar SPT (PDF)"
                  className="w-8 h-8 rounded-[6px] bg-[#C62828] hover:bg-[#A62020] text-white inline-flex items-center justify-center transition cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setShowFilters((prev) => !prev)}
                  title={showFilters ? 'Sembunyikan filter kolom' : 'Tampilkan filter kolom'}
                  className={`w-8 h-8 rounded-[6px] border inline-flex items-center justify-center transition cursor-pointer ${
                    showFilters
                      ? 'bg-[#DCE8FF] border-[#9BB9F5] text-[#1E2C5E]'
                      : 'bg-[#EEF4FF] hover:bg-[#DCE8FF] border-[#D4E2FA] text-[#1E2C5E]'
                  }`}
                >
                  <Filter className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Official Yellow-Header Table with Inline Dropdown Filter Row */}
              <div className="px-4 pb-3">
                <div className="overflow-x-auto border border-[#E5EAF2] rounded-[6px]">
                  <table className="w-full text-[12.5px] border-collapse min-w-[740px]">
                    <thead>
                      <tr className="bg-[#F7C62F] text-[#1B2958] font-bold">
                        <th className="px-3 py-2.5 text-left border-r border-[#E5B21F]/60 w-[108px]">
                          Aksi
                        </th>
                        <th className="px-3 py-2.5 text-left border-r border-[#E5B21F]/60">
                          <button
                            type="button"
                            onClick={() => handleSort('taxType')}
                            className="inline-flex items-center gap-1.5 cursor-pointer hover:opacity-80"
                          >
                            <span>Jenis Pajak</span>
                            <ArrowUpDown className="w-3.5 h-3.5 opacity-75" />
                          </button>
                        </th>
                        <th className="px-3 py-2.5 text-left border-r border-[#E5B21F]/60">
                          <button
                            type="button"
                            onClick={() => handleSort('kind')}
                            className="inline-flex items-center gap-1.5 cursor-pointer hover:opacity-80"
                          >
                            <span>Jenis Surat Pemberitahuan Pajak</span>
                            <ArrowUpDown className="w-3.5 h-3.5 opacity-75" />
                          </button>
                        </th>
                        <th className="px-3 py-2.5 text-left border-r border-[#E5B21F]/60">
                          <button
                            type="button"
                            onClick={() => handleSort('period')}
                            className="inline-flex items-center gap-1.5 cursor-pointer hover:opacity-80"
                          >
                            <span>Masa Pajak</span>
                            <ArrowUpDown className="w-3.5 h-3.5 opacity-75" />
                          </button>
                        </th>
                        <th className="px-3 py-2.5 text-left border-r border-[#E5B21F]/60">
                          <button
                            type="button"
                            onClick={() => handleSort('model')}
                            className="inline-flex items-center gap-1.5 cursor-pointer hover:opacity-80"
                          >
                            <span>Model SPT</span>
                            <ArrowUpDown className="w-3.5 h-3.5 opacity-75" />
                          </button>
                        </th>
                        <th className="px-3 py-2.5 text-right border-r border-[#E5B21F]/60">
                          <button
                            type="button"
                            onClick={() => handleSort('amount')}
                            className="inline-flex items-center gap-1.5 cursor-pointer hover:opacity-80"
                          >
                            <span>Kurang / Lebih Bayar</span>
                            <ArrowUpDown className="w-3.5 h-3.5 opacity-75" />
                          </button>
                        </th>
                        <th className="px-3 py-2.5 text-left">Status / Nomor BPE</th>
                      </tr>

                      {/* Official Inline Column Filter Row directly under Yellow Header */}
                      {showFilters && (
                        <tr className="bg-[#FAFBFD] border-b border-[#E5EAF2]">
                          <td className="px-2 py-2 border-r border-[#EEF2F6]" />
                          <td className="px-2 py-2 border-r border-[#EEF2F6]">
                            <select
                              value={filterTaxType}
                              onChange={(e) => {
                                setFilterTaxType(e.target.value);
                                setPage(1);
                              }}
                              className="w-full rounded-[6px] border border-[#CBD5E1] bg-white px-2.5 py-1.5 text-[12px] text-slate-600 focus:outline-none focus:border-[#1E2C5E]"
                            >
                              <option value="">Pilih Jenis Pajak</option>
                              <option value="PPh Orang Pribadi">PPh Orang Pribadi</option>
                              <option value="PPN">PPN</option>
                              <option value="PPh Pasal 21/26">PPh Pasal 21/26</option>
                              <option value="PPh Unifikasi">PPh Unifikasi</option>
                              <option value="PPh Badan">PPh Badan</option>
                            </select>
                          </td>
                          <td className="px-2 py-2 border-r border-[#EEF2F6]">
                            <select
                              value={filterReturnKind}
                              onChange={(e) => {
                                setFilterReturnKind(e.target.value);
                                setPage(1);
                              }}
                              className="w-full rounded-[6px] border border-[#CBD5E1] bg-white px-2.5 py-1.5 text-[12px] text-slate-600 focus:outline-none focus:border-[#1E2C5E]"
                            >
                              <option value="">Pilih Jenis Surat Pemberitahuan Pajak</option>
                              <option value="SPT Masa">SPT Masa</option>
                              <option value="SPT Tahunan">SPT Tahunan</option>
                            </select>
                          </td>
                          <td className="px-2 py-2 border-r border-[#EEF2F6]">
                            <select
                              value={filterPeriod}
                              onChange={(e) => {
                                setFilterPeriod(e.target.value);
                                setPage(1);
                              }}
                              className="w-full rounded-[6px] border border-[#CBD5E1] bg-white px-2.5 py-1.5 text-[12px] text-slate-600 focus:outline-none focus:border-[#1E2C5E]"
                            >
                              <option value="">Pilih Masa Pajak</option>
                              {uniquePeriods.map((p) => (
                                <option key={p} value={p}>
                                  {p}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="px-2 py-2 border-r border-[#EEF2F6]">
                            <input
                              type="text"
                              value={filterModelSearch}
                              onChange={(e) => {
                                setFilterModelSearch(e.target.value);
                                setPage(1);
                              }}
                              placeholder="Cari..."
                              className="w-full rounded-[6px] border border-[#CBD5E1] bg-white px-2.5 py-1.5 text-[12px] text-slate-600 focus:outline-none focus:border-[#1E2C5E]"
                            />
                          </td>
                          <td className="px-2 py-2 border-r border-[#EEF2F6]" />
                          <td className="px-2 py-2" />
                        </tr>
                      )}
                    </thead>

                    <tbody className="divide-y divide-[#EEF2F6] bg-white">
                      {paginatedReturns.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="px-4 py-6 text-left text-[12.5px] text-slate-600">
                            Tidak ada data yang ditemukan.
                          </td>
                        </tr>
                      ) : (
                        paginatedReturns.map((ret) => {
                          const isHighlightedNew = justCreatedId === ret.id;
                          return (
                            <tr
                              key={ret.id}
                              className={`transition ${
                                isHighlightedNew ? 'bg-[#FEF9E7]/70' : 'hover:bg-[#F8FAFC]'
                              }`}
                            >
                              <td className="px-3 py-2.5 whitespace-nowrap">
                                <div className="flex items-center gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => setEditingReturnId(ret.id)}
                                    title={ret.status === 'DRAFT' ? 'Isi / Edit Konsep SPT' : 'Lihat Detail SPT'}
                                    className="p-1.5 rounded-[6px] bg-[#1E2C5E] hover:bg-[#2A3B7A] text-white cursor-pointer transition"
                                  >
                                    {ret.status === 'DRAFT' ? (
                                      <Edit3 className="w-3.5 h-3.5 text-[#F4C430]" />
                                    ) : (
                                      <Eye className="w-3.5 h-3.5 text-[#F4C430]" />
                                    )}
                                  </button>

                                  {ret.status === 'SUBMITTED' && ret.bpeNumber && (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        onPrintDocument({
                                          type: 'BPE',
                                          taxReturn: ret,
                                          taxpayer: activeTaxpayer,
                                        })
                                      }
                                      title="Cetak Bukti Penerimaan Elektronik (BPE)"
                                      className="p-1.5 rounded-[6px] bg-emerald-700 hover:bg-emerald-800 text-white cursor-pointer transition"
                                    >
                                      <CheckCircle2 className="w-3.5 h-3.5" />
                                    </button>
                                  )}

                                  {ret.status === 'DRAFT' && (
                                    <button
                                      type="button"
                                      onClick={() => onDeleteReturn(ret.id)}
                                      title="Hapus Konsep SPT"
                                      className="p-1.5 rounded-[6px] border border-rose-200 hover:bg-rose-50 text-rose-600 cursor-pointer transition"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </div>
                              </td>
                              <td className="px-3 py-2.5 font-bold text-[#1B2958]">
                                {TAX_TYPE_LABELS[ret.returnType]}
                              </td>
                              <td className="px-3 py-2.5 text-slate-700">
                                {RETURN_KIND_LABELS[ret.returnType]}
                              </td>
                              <td className="px-3 py-2.5 text-slate-700 whitespace-nowrap">
                                {formatPeriodDisplay(ret)}
                              </td>
                              <td className="px-3 py-2.5 text-slate-700 whitespace-nowrap">
                                {ret.revisionNo === 0 ? 'Normal' : `Pembetulan ${ret.revisionNo}`}
                              </td>
                              <td className="px-3 py-2.5 text-right font-mono-num font-bold text-[#1B2958] whitespace-nowrap">
                                {formatRp(ret.underOverPayment)}
                              </td>
                              <td className="px-3 py-2.5 whitespace-nowrap">
                                {ret.bpeNumber ? (
                                  <span className="font-mono-num text-[11.5px] font-bold text-emerald-700">
                                    {ret.bpeNumber}
                                  </span>
                                ) : (
                                  <span className="text-[11.5px] font-semibold text-amber-700">
                                    {formatStatusBadge(ret.status)}
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Pagination Bar matching Official Coretax Footer (< > [ 10 v ]) */}
                <div className="mt-3 pt-3 border-t border-[#EEF2F6] flex items-center justify-center gap-3 text-[12.5px] text-slate-600">
                  <button
                    type="button"
                    disabled={safePage <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="p-1.5 rounded hover:bg-slate-100 disabled:opacity-35 cursor-pointer"
                    aria-label="Halaman sebelumnya"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="font-mono-num text-xs text-slate-500">
                    {safePage} / {totalPages}
                  </span>
                  <button
                    type="button"
                    disabled={safePage >= totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    className="p-1.5 rounded hover:bg-slate-100 disabled:opacity-35 cursor-pointer"
                    aria-label="Halaman berikutnya"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                  <select
                    value={pageSize}
                    onChange={(e) => {
                      setPageSize(Number(e.target.value));
                      setPage(1);
                    }}
                    className="border border-[#CBD5E1] rounded-[6px] px-2.5 py-1 text-[12px] bg-white text-slate-700 font-mono-num focus:outline-none focus:border-[#1E2C5E]"
                    aria-label="Jumlah baris per halaman"
                  >
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                  </select>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
