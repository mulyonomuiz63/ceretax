import React, { useMemo, useState } from 'react';
import {
  ArrowUpDown,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Edit3,
  Eye,
  FilePlus2,
  FileSpreadsheet,
  FileText,
  Filter,
  Mail,
  Printer,
  RefreshCw,
  Save,
  Trash2,
  X,
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
import { MONTHS_ID, PTKP_VALUES } from '../utils/taxCalc.ts';
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

/** Exact Coretax "Jenis Surat Pemberitahuan Pajak" strings from PDF 1, 2, 3, 4 */
const RETURN_SHEET_NAME_LABELS: Record<ReturnType, string> = {
  SPT_MASA_PPN: 'SPT Masa PPN',
  SPT_MASA_PPH21: 'SPT Masa PPh Pasal 21/26',
  SPT_MASA_UNIFIKASI: 'SPT Masa PPh Unifikasi',
  SPT_TAHUNAN_OP: 'SPT Tahunan PPh Wajib Pajak Orang Pribadi',
  SPT_TAHUNAN_BADAN: 'SPT PPh Badan Rupiah',
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
    bannerTitle: 'SPT yang Disampaikan',
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
  return `Januari - Desember ${ret.taxYear}`;
}

/** Official Coretax SPT Banner Illustration (matches PDF 1 p.1,3,10 & PDF 2/4) */
const SptBannerIllustration: React.FC<{ isSubmitted?: boolean }> = ({ isSubmitted }) => (
  <svg
    width="124"
    height="80"
    viewBox="0 0 140 90"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className="shrink-0 hidden sm:block"
    aria-hidden="true"
  >
    {/* Background SPT Document Board */}
    <rect x="58" y="8" width="68" height="54" rx="4" fill="#FFFFFF" stroke="#1E2C5E" strokeWidth="2" />
    <rect x="65" y="15" width="22" height="5" rx="1.5" fill="#1E2C5E" />
    <rect x="65" y="25" width="52" height="3.5" rx="1.5" fill="#94A3B8" />
    <rect x="65" y="33" width="44" height="3.5" rx="1.5" fill="#94A3B8" />
    <rect x="65" y="41" width="48" height="3.5" rx="1.5" fill="#94A3B8" />
    <rect x="65" y="49" width="32" height="3.5" rx="1.5" fill="#94A3B8" />

    {isSubmitted && (
      <g>
        <circle cx="52" cy="18" r="10" fill="#16A34A" stroke="#FFFFFF" strokeWidth="2" />
        <path d="M47.5 18L50.5 21L56.5 15" stroke="#FFFFFF" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      </g>
    )}

    {/* Desk */}
    <rect x="10" y="64" width="120" height="4" rx="2" fill="#1E2C5E" />
    {/* Laptop & Person */}
    <circle cx="34" cy="30" r="8" fill="#1E2C5E" />
    <path d="M18 64C18 50 25 43 34 43C43 43 48 50 50 64H18Z" fill="#3B82F6" />
    <rect x="44" y="46" width="26" height="18" rx="2" fill="#E2E8F0" stroke="#1E2C5E" strokeWidth="1.8" />
  </svg>
);

/** Authentic Step 1, 2, 3 Left-Side Illustrations matching PDF 1 p.2-3, PDF 2 p.8-9, PDF 3 p.1, PDF 4 p.4-5 */
const WizardStepIllustration: React.FC<{ step: 1 | 2 | 3 }> = ({ step }) => {
  if (step === 1) {
    return (
      <svg width="210" height="175" viewBox="0 0 210 175" fill="none" aria-hidden="true">
        <text x="95" y="46" fill="#94A3B8" fontSize="16" fontWeight="800">
          SPT
        </text>
        {/* PBB Circle */}
        <circle cx="132" cy="32" r="14" fill="#FEF9C3" stroke="#EAB308" strokeWidth="1.8" />
        <text x="132" y="36" textAnchor="middle" fill="#A16207" fontSize="9.5" fontWeight="800">
          PBB
        </text>
        {/* PPh Circle */}
        <circle cx="48" cy="64" r="17" fill="#FEF9C3" stroke="#EAB308" strokeWidth="1.8" />
        <text x="48" y="68" textAnchor="middle" fill="#A16207" fontSize="11" fontWeight="800">
          PPh
        </text>
        {/* PPN Circle */}
        <circle cx="164" cy="96" r="16" fill="#FEF9C3" stroke="#EAB308" strokeWidth="1.8" />
        <text x="164" y="100" textAnchor="middle" fill="#A16207" fontSize="10" fontWeight="800">
          PPN
        </text>
        {/* Person in Navy Suit */}
        <circle cx="104" cy="70" r="14" fill="#1E2C5E" />
        <path d="M72 152C72 118 85 98 104 98C123 98 136 118 136 152H72Z" fill="#1E2C5E" />
        <path d="M98 98L104 126L110 98H98Z" fill="#FFFFFF" />
      </svg>
    );
  }
  if (step === 2) {
    return (
      <svg width="210" height="175" viewBox="0 0 210 175" fill="none" aria-hidden="true">
        {/* Calendar Card */}
        <rect x="44" y="24" width="114" height="78" rx="6" fill="#FFFFFF" stroke="#1E2C5E" strokeWidth="2" />
        <rect x="44" y="24" width="114" height="18" rx="6" fill="#1E2C5E" />
        <text x="101" y="36" textAnchor="middle" fill="#FFFFFF" fontSize="8" fontWeight="700">
          TAHUN
        </text>
        {/* Calendar Grid Dots */}
        {[0, 1, 2, 3, 4, 5].map((col) =>
          [0, 1, 2].map((row) => (
            <rect
              key={`${col}-${row}`}
              x={56 + col * 16}
              y={50 + row * 14}
              width="10"
              height="8"
              rx="1.5"
              fill={col === 3 && row === 1 ? '#F6C324' : '#CBD5E1'}
            />
          ))
        )}
        <text x="44" y="132" fill="#D4A017" fontSize="18" fontWeight="800">
          PERIODE
        </text>
        <text x="44" y="152" fill="#D4A017" fontSize="18" fontWeight="800">
          SPT
        </text>
      </svg>
    );
  }
  return (
    <svg width="210" height="175" viewBox="0 0 210 175" fill="none" aria-hidden="true">
      <circle cx="105" cy="88" r="64" fill="#E2E8F0" fillOpacity="0.65" />
      <text x="34" y="64" fill="#1E2C5E" fontSize="10.5" fontWeight="800">
        NORMAL
      </text>
      <text x="126" y="64" fill="#1E2C5E" fontSize="10.5" fontWeight="800">
        PEMBETULAN
      </text>
      <circle cx="105" cy="66" r="13" fill="#1E2C5E" />
      <path d="M78 148C78 115 89 94 105 94C121 94 132 115 132 148H78Z" fill="#1E2C5E" />
    </svg>
  );
};

interface Step1TileOption {
  id: string;
  label: string;
  returnType: ReturnType;
}

const STEP1_CORPORATE_OPTIONS: Step1TileOption[] = [
  { id: 'ppn', label: 'PPN', returnType: 'SPT_MASA_PPN' },
  {
    id: 'ppn_pedoman',
    label: 'PPN Bagi PKP yang Menggunakan Pedoman Penghitungan Pengkreditan Pajak Masukan',
    returnType: 'SPT_MASA_PPN',
  },
  { id: 'pph_badan', label: 'PPh Badan', returnType: 'SPT_TAHUNAN_BADAN' },
  { id: 'pph_badan_usd', label: 'PPh Badan Dolar Amerika Serikat', returnType: 'SPT_TAHUNAN_BADAN' },
  { id: 'pph_pps', label: 'PPh Final Pengungkapan Harta Bersih', returnType: 'SPT_MASA_UNIFIKASI' },
  { id: 'pph_21', label: 'PPh Pasal 21/26', returnType: 'SPT_MASA_PPH21' },
  { id: 'pph_25_bumn', label: 'PPh Pasal 25 bagi BUMN/BUMD', returnType: 'SPT_TAHUNAN_BADAN' },
  { id: 'pph_25_bank', label: 'PPh Pasal 25 bagi Bank', returnType: 'SPT_TAHUNAN_BADAN' },
  {
    id: 'pph_25_bursa',
    label: 'PPh Pasal 25 bagi Wajib Pajak Masuk Bursa atau Wajib Pajak Lainnya',
    returnType: 'SPT_TAHUNAN_BADAN',
  },
  { id: 'pph_unifikasi', label: 'PPh Unifikasi', returnType: 'SPT_MASA_UNIFIKASI' },
];

const STEP1_INDIVIDUAL_OPTIONS: Step1TileOption[] = [
  { id: 'pph_pps', label: 'PPh Final Pengungkapan Harta Bersih', returnType: 'SPT_TAHUNAN_OP' },
  { id: 'pph_op', label: 'PPh Orang Pribadi', returnType: 'SPT_TAHUNAN_OP' },
  { id: 'pph_21', label: 'PPh Pasal 21/26', returnType: 'SPT_MASA_PPH21' },
  { id: 'pph_unifikasi', label: 'PPh Unifikasi', returnType: 'SPT_MASA_UNIFIKASI' },
];

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
  const [selectedTileId, setSelectedTileId] = useState<string>(
    accountMode === 'CORPORATE' ? 'ppn' : 'pph_op'
  );
  const [selectedType, setSelectedType] = useState<ReturnType>(
    accountMode === 'CORPORATE' ? 'SPT_MASA_PPN' : 'SPT_TAHUNAN_OP'
  );
  const [jenisPeriodeAnnual, setJenisPeriodeAnnual] = useState<'BAGIAN' | 'TAHUNAN'>('TAHUNAN');
  const [taxYear, setTaxYear] = useState(2025);
  const [taxMonth, setTaxMonth] = useState(11);
  const [revisionNo, setRevisionNo] = useState(0);
  const [submittingConcept, setSubmittingConcept] = useState(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Table toolbar, inline filters, sort & pagination state
  const [showFilters, setShowFilters] = useState(true);
  const [filterTaxType, setFilterTaxType] = useState('');
  const [filterReturnKind, setFilterReturnKind] = useState('');
  const [filterPeriod, setFilterPeriod] = useState('');
  const [filterNop, setFilterNop] = useState('');
  const [filterObjName, setFilterObjName] = useState('');
  const [filterModel, setFilterModel] = useState('');
  const [sortField, setSortField] = useState<'taxType' | 'kind' | 'period' | 'model'>('period');
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
      const kindLabel = RETURN_SHEET_NAME_LABELS[ret.returnType];
      const periodLabel = formatPeriodDisplay(ret);
      const modelLabel = ret.revisionNo === 0 ? 'Normal' : `Pembetulan ${ret.revisionNo}`;

      if (filterTaxType && taxLabel !== filterTaxType) return false;
      if (filterReturnKind && kindLabel !== filterReturnKind) return false;
      if (filterPeriod && periodLabel !== filterPeriod) return false;
      if (filterModel && !modelLabel.toLowerCase().includes(filterModel.toLowerCase())) return false;
      return true;
    });

    list.sort((a, b) => {
      let cmp = 0;
      if (sortField === 'taxType') {
        cmp = TAX_TYPE_LABELS[a.returnType].localeCompare(TAX_TYPE_LABELS[b.returnType]);
      } else if (sortField === 'kind') {
        cmp = RETURN_SHEET_NAME_LABELS[a.returnType].localeCompare(
          RETURN_SHEET_NAME_LABELS[b.returnType]
        );
      } else if (sortField === 'period') {
        cmp = a.taxYear * 100 + a.taxPeriodMonth - (b.taxYear * 100 + b.taxPeriodMonth);
      } else if (sortField === 'model') {
        cmp = a.revisionNo - b.revisionNo;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });

    return list;
  }, [
    statusReturns,
    filterTaxType,
    filterReturnKind,
    filterPeriod,
    filterModel,
    sortField,
    sortDir,
  ]);

  const totalPages = Math.max(1, Math.ceil(filteredAndSortedReturns.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const paginatedReturns = filteredAndSortedReturns.slice(
    (safePage - 1) * pageSize,
    safePage * pageSize
  );

  // Monthly period options (e.g., November 2025, Oktober 2025, ...) — must be declared before early return
  const monthlyPeriodOptions = useMemo(() => {
    const opts: Array<{ value: string; label: string; month: number; year: number }> = [];
    for (const yr of [2026, 2025, 2024]) {
      for (let m = 12; m >= 1; m--) {
        opts.push({
          value: `${yr}-${m}`,
          label: `${MONTHS_ID[m - 1]} ${yr}`,
          month: m,
          year: yr,
        });
      }
    }
    return opts;
  }, []);

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

  const tileOptions =
    accountMode === 'CORPORATE' ? STEP1_CORPORATE_OPTIONS : STEP1_INDIVIDUAL_OPTIONS;

  const isSelectedAnnual =
    selectedType === 'SPT_TAHUNAN_OP' || selectedType === 'SPT_TAHUNAN_BADAN';

  const handleStartCreateConcept = () => {
    if (accountMode === 'CORPORATE') {
      setSelectedTileId('ppn');
      setSelectedType('SPT_MASA_PPN');
      const latestInv = workspace.invoices.find((i) => i.status !== 'CANCELLED');
      setTaxYear(latestInv?.taxPeriodYear || 2025);
      setTaxMonth(latestInv?.taxPeriodMonth || 1);
    } else {
      setSelectedTileId('pph_op');
      setSelectedType('SPT_TAHUNAN_OP');
      const latestBpa1 = workspace.slips.find((s) => s.slipType === 'BPA1' && s.status === 'ISSUED');
      setTaxYear(latestBpa1?.taxPeriodYear || 2025);
      setTaxMonth(12);
    }
    setJenisPeriodeAnnual('TAHUNAN');
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

      await onCreateReturn({
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
      setSuccessToast('Successfully created new returnsheets!');
      window.setTimeout(() => setSuccessToast(null), 4000);
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
    setFilterNop('');
    setFilterObjName('');
    setFilterModel('');
    setPage(1);
  };

  const handleExportTable = (extension: 'csv' | 'xls') => {
    const delimiter = extension === 'csv' ? ',' : '\t';
    const headers = [
      'Jenis Pajak',
      'Jenis Surat Pemberitahuan Pajak',
      'Masa Pajak',
      'NOP',
      'Nama Objek Pajak',
      'Model SPT',
    ];
    const rows = filteredAndSortedReturns.map((ret) => [
      TAX_TYPE_LABELS[ret.returnType],
      RETURN_SHEET_NAME_LABELS[ret.returnType],
      formatPeriodDisplay(ret),
      '-',
      '-',
      ret.revisionNo === 0 ? 'Normal' : `Pembetulan ${ret.revisionNo}`,
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

  return (
    <div className="relative flex flex-col md:flex-row gap-4 items-start">
      {/* Top-Center Floating Coretax Success Toast (Exact match to PDF 4 Page 6) */}
      {successToast && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 bg-white border border-slate-200 border-l-4 border-l-emerald-500 rounded-[6px] shadow-xl px-4 py-3 min-w-[300px] flex items-start justify-between gap-3">
          <div>
            <div className="font-bold text-xs text-slate-800">Success</div>
            <div className="text-[11.5px] text-slate-600 mt-0.5">{successToast}</div>
          </div>
          <button
            type="button"
            onClick={() => setSuccessToast(null)}
            className="text-slate-400 hover:text-slate-600 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* ===================================================================== */}
      {/* INNER LEFT SPT SUB-NAVIGATION CARD (EXACT MATCH TO CORETAX PDF 1-4)   */}
      {/* ===================================================================== */}
      <div className="w-full md:w-[205px] xl:w-[225px] shrink-0 bg-white border border-[#E5EAF2] rounded-[10px] overflow-hidden shadow-[0_2px_10px_rgba(30,44,94,0.04)]">
        {/* Deep Navy Identity Header: NPWP/NIK + Uppercase Name */}
        <div className="bg-[#1E2C5E] text-white px-4 py-4">
          <div className="font-mono-num font-bold text-[14.5px] leading-[1.3] tracking-wide break-all">
            {activeTaxpayer.nikNpwp}
          </div>
          <div className="text-[11.5px] font-medium uppercase tracking-wide text-slate-200 mt-1 leading-snug">
            {activeTaxpayer.name}
          </div>
        </div>

        {/* Section Heading */}
        <div className="px-4 py-3 font-display font-bold text-[13px] leading-snug text-[#1B2958] border-b border-[#EEF2F6]">
          Surat Pemberitahuan (SPT)
        </div>

        {/* 5 Official SPT Status Links */}
        <div className="divide-y divide-[#F1F5F9]">
          {INNER_SPT_MENUS.map((menu) => {
            const isCurrent =
              (creatingConcept && menu.id === 'konsep') ||
              (!creatingConcept && activeMenuMeta.id === menu.id);
            return (
              <button
                key={menu.id}
                type="button"
                onClick={() => {
                  setCreatingConcept(false);
                  setPage(1);
                  onChangeSubTab(menu.id);
                }}
                className={`w-full text-left px-4 py-2.5 text-[12.5px] transition cursor-pointer flex items-center justify-between gap-2 ${
                  isCurrent
                    ? 'bg-[#F1F5F9] text-[#1E2C5E] font-bold'
                    : 'text-[#64748B] hover:bg-[#F8FAFC] hover:text-[#1E2C5E] font-medium'
                }`}
              >
                <span className="leading-snug">{menu.label}</span>
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
          /* (100% Match to PDF 1 p.2-3, PDF 2 p.8-10, PDF 3 p.1, PDF 4 p.4-5) */
          /* ================================================================= */
          <div className="bg-white border border-[#E5EAF2] rounded-[10px] overflow-hidden shadow-[0_2px_10px_rgba(30,44,94,0.03)] p-5 sm:p-7 space-y-6">
            {/* Top-left Title */}
            <h1 className="font-display font-bold text-[15px] text-[#1E293B]">
              Buat Konsep SPT
            </h1>

            {/* Horizontal Numbered Circle Stepper (Golden Yellow Active) */}
            <div className="max-w-2xl mx-auto pt-1 pb-2">
              <div className="flex items-center justify-between">
                {[
                  { num: 1 as const, title: 'Pilih Jenis Pajak' },
                  { num: 2 as const, title: 'Pilih periode pelaporan SPT' },
                  { num: 3 as const, title: 'Pilih Jenis SPT' },
                ].map((st, idx) => {
                  const isCompleted = wizardStep > st.num;
                  const isActive = wizardStep === st.num;
                  return (
                    <React.Fragment key={st.num}>
                      <div className="flex flex-col items-center gap-1.5 text-center">
                        <span
                          className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition ${
                            isCompleted || isActive
                              ? 'bg-[#F6C324] text-[#1E2C5E]'
                              : 'bg-white border border-slate-300 text-slate-400'
                          }`}
                        >
                          {st.num}
                        </span>
                        <span
                          className={`text-[11px] sm:text-[11.5px] leading-tight ${
                            isActive || isCompleted
                              ? 'font-semibold text-slate-700'
                              : 'font-normal text-slate-400'
                          }`}
                        >
                          {st.title}
                        </span>
                      </div>
                      {idx < 2 && (
                        <div
                          className={`flex-1 h-[2px] mx-2 sm:mx-4 -mt-5 ${
                            wizardStep > st.num ? 'bg-[#F6C324]' : 'bg-slate-200'
                          }`}
                        />
                      )}
                    </React.Fragment>
                  );
                })}
              </div>
            </div>

            {/* Two-Column Step Body: Left Step Illustration + Right Panel */}
            <div className="flex flex-col lg:flex-row gap-6 items-start pt-2">
              {/* Left Coretax Vector Step Illustration */}
              <div className="hidden lg:flex w-[220px] shrink-0 items-center justify-center pt-2">
                <WizardStepIllustration step={wizardStep} />
              </div>

              {/* Right Panel Content */}
              <div className="flex-1 min-w-0 w-full space-y-6">
                {wizardStep === 1 && (
                  <div className="space-y-4">
                    <div className="text-[12px] text-slate-700">
                      <strong className="text-[#1E293B]">Langkah 1.</strong> Pilih jenis SPT yang akan dilaporkan
                    </div>

                    {/* Authentic 4-Column Coretax Clickable Button Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-2.5">
                      {tileOptions.map((tile) => {
                        const checked = selectedTileId === tile.id;
                        return (
                          <button
                            key={tile.id}
                            type="button"
                            onClick={() => {
                              setSelectedTileId(tile.id);
                              setSelectedType(tile.returnType);
                              if (tile.returnType === 'SPT_MASA_PPN') {
                                const inv = workspace.invoices.find((i) => i.status !== 'CANCELLED');
                                if (inv) {
                                  setTaxYear(inv.taxPeriodYear);
                                  setTaxMonth(inv.taxPeriodMonth);
                                }
                              } else if (tile.returnType === 'SPT_MASA_PPH21') {
                                const sl = workspace.slips.find(
                                  (s) =>
                                    (s.slipType === 'BPMP' || s.slipType === 'BP21' || s.slipType === 'BPA1') &&
                                    s.status !== 'CANCELLED'
                                );
                                if (sl) {
                                  setTaxYear(sl.taxPeriodYear);
                                  setTaxMonth(sl.taxPeriodMonth);
                                }
                              } else if (tile.returnType === 'SPT_MASA_UNIFIKASI') {
                                const sl = workspace.slips.find(
                                  (s) => s.slipType === 'BPPU_23' && s.status !== 'CANCELLED'
                                );
                                if (sl) {
                                  setTaxYear(sl.taxPeriodYear);
                                  setTaxMonth(sl.taxPeriodMonth);
                                }
                              } else if (tile.returnType === 'SPT_TAHUNAN_OP') {
                                const bpa1 = workspace.slips.find(
                                  (s) => s.slipType === 'BPA1' && s.status !== 'CANCELLED'
                                );
                                if (bpa1) setTaxYear(bpa1.taxPeriodYear);
                              }
                            }}
                            className={`text-left px-3.5 py-3 rounded-[4px] border text-[11.5px] leading-snug transition cursor-pointer min-h-[58px] flex items-start ${
                              checked
                                ? 'bg-[#FDF2C6] border-[#EAB308] font-bold text-[#1E2C5E]'
                                : 'bg-[#FAFBFD] border-[#E2E8F0] hover:border-[#CBD5E1] text-[#1E293B] font-semibold'
                            }`}
                          >
                            <span>{tile.label}</span>
                          </button>
                        );
                      })}
                    </div>

                    <div className="pt-4 flex justify-end">
                      <button
                        type="button"
                        onClick={() => setWizardStep(2)}
                        className="px-7 py-2 rounded-[5px] bg-[#1E2C5E] hover:bg-[#16224A] text-white text-[12px] font-bold cursor-pointer transition"
                      >
                        Lanjut
                      </button>
                    </div>
                  </div>
                )}

                {wizardStep === 2 && (
                  <div className="space-y-5">
                    <div className="text-[12px] text-slate-700">
                      <strong className="text-[#1E293B]">Langkah 2.</strong> Pilih periode pelaporan SPT
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center text-[12px]">
                      <span className="sm:col-span-4 text-slate-600">
                        Jenis Surat Pemberitahuan Pajak
                      </span>
                      <span className="sm:col-span-8 font-bold text-[#1E293B]">
                        : {RETURN_SHEET_NAME_LABELS[selectedType]}
                      </span>
                    </div>

                    {isSelectedAnnual ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-1">
                        <div className="space-y-2">
                          <label className="block text-[12px] font-bold text-[#1E293B]">
                            Jenis Periode SPT <span className="text-rose-600">*</span>
                          </label>
                          <div className="space-y-2 text-[12px] text-slate-700">
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="radio"
                                name="jenisPeriodeAnnual"
                                checked={jenisPeriodeAnnual === 'BAGIAN'}
                                onChange={() => setJenisPeriodeAnnual('BAGIAN')}
                                className="accent-[#1E2C5E]"
                              />
                              <span>SPT Bagian Tahun Pajak</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="radio"
                                name="jenisPeriodeAnnual"
                                checked={jenisPeriodeAnnual === 'TAHUNAN'}
                                onChange={() => setJenisPeriodeAnnual('TAHUNAN')}
                                className="accent-[#1E2C5E]"
                              />
                              <span>SPT Tahunan</span>
                            </label>
                          </div>
                        </div>

                        <div>
                          <label className="block text-[12px] font-bold text-[#1E293B] mb-1.5">
                            Periode dan Tahun Pajak <span className="text-rose-600">*</span>
                          </label>
                          <div className="relative">
                            <select
                              value={taxYear}
                              onChange={(e) => setTaxYear(Number(e.target.value))}
                              className="w-full border border-[#1E2C5E] rounded-[4px] px-3 py-2 text-[12px] bg-white text-[#1E293B] focus:outline-none"
                            >
                              <option value={2025}>Januari - Desember 2025</option>
                              <option value={2024}>Januari - Desember 2024</option>
                              <option value={2026}>Januari - Desember 2026</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="max-w-md pt-1">
                        <label className="block text-[12px] font-bold text-[#1E293B] mb-1.5">
                          Periode dan Tahun Pajak <span className="text-rose-600">*</span>
                        </label>
                        <select
                          value={`${taxYear}-${taxMonth}`}
                          onChange={(e) => {
                            const [yr, mo] = e.target.value.split('-').map(Number);
                            setTaxYear(yr);
                            setTaxMonth(mo);
                          }}
                          className="w-full border border-[#1E2C5E] rounded-[4px] px-3 py-2 text-[12px] bg-white text-[#1E293B] focus:outline-none"
                        >
                          {monthlyPeriodOptions.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    <div className="pt-4 flex items-center justify-between gap-3">
                      <button
                        type="button"
                        onClick={() => setWizardStep(1)}
                        className="px-6 py-2 rounded-[5px] bg-[#E2E8F0] hover:bg-[#CBD5E1] text-[#1E293B] text-[12px] font-bold cursor-pointer transition"
                      >
                        Kembali
                      </button>
                      <button
                        type="button"
                        onClick={() => setWizardStep(3)}
                        className="px-7 py-2 rounded-[5px] bg-[#1E2C5E] hover:bg-[#16224A] text-white text-[12px] font-bold cursor-pointer transition"
                      >
                        Lanjut
                      </button>
                    </div>
                  </div>
                )}

                {wizardStep === 3 && (
                  <div className="space-y-5">
                    <div className="text-[12px] text-slate-700">
                      <strong className="text-[#1E293B]">Langkah 3.</strong> Pilih Jenis SPT
                    </div>

                    <div className="space-y-1.5 text-[12px]">
                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                        <span className="sm:col-span-4 text-slate-600">
                          Jenis Surat Pemberitahuan Pajak
                        </span>
                        <span className="sm:col-span-8 font-bold text-[#1E293B]">
                          : {RETURN_SHEET_NAME_LABELS[selectedType]}
                        </span>
                      </div>
                      {isSelectedAnnual && (
                        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                          <span className="sm:col-span-4 text-slate-600">Jenis Periode SPT</span>
                          <span className="sm:col-span-8 font-bold text-[#1E293B]">
                            : {jenisPeriodeAnnual === 'TAHUNAN' ? 'SPT Tahunan' : 'SPT Bagian Tahun Pajak'}
                          </span>
                        </div>
                      )}
                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                        <span className="sm:col-span-4 text-slate-600">Periode dan Tahun Pajak</span>
                        <span className="sm:col-span-8 font-bold text-[#1E293B]">
                          :{' '}
                          {isSelectedAnnual
                            ? `Januari - Desember ${taxYear}`
                            : `${MONTHS_ID[taxMonth - 1]} ${taxYear}`}
                        </span>
                      </div>
                    </div>

                    <div className="max-w-md pt-1">
                      <label className="block text-[12px] font-bold text-[#1E293B] mb-1.5">
                        Model SPT <span className="text-rose-600">*</span>
                      </label>
                      <select
                        value={revisionNo === 0 ? 'NORMAL' : 'PEMBETULAN'}
                        onChange={(e) => setRevisionNo(e.target.value === 'NORMAL' ? 0 : 1)}
                        className="w-full border border-[#1E2C5E] rounded-[4px] px-3 py-2 text-[12px] bg-white text-[#1E293B] focus:outline-none"
                      >
                        <option value="NORMAL">Normal</option>
                        <option value="PEMBETULAN">Pembetulan</option>
                      </select>
                    </div>

                    <div className="pt-4 flex items-center justify-between gap-3">
                      <button
                        type="button"
                        onClick={() => setWizardStep(2)}
                        className="px-6 py-2 rounded-[5px] bg-[#E2E8F0] hover:bg-[#CBD5E1] text-[#1E293B] text-[12px] font-bold cursor-pointer transition"
                      >
                        Kembali
                      </button>
                      <button
                        type="button"
                        disabled={submittingConcept}
                        onClick={handleFinishCreateConcept}
                        className="px-5 py-2 rounded-[5px] bg-[#1E2C5E] hover:bg-[#16224A] disabled:opacity-60 text-white text-[12px] font-bold inline-flex items-center gap-2 cursor-pointer transition"
                      >
                        <Save className="w-3.5 h-3.5" />
                        <span>{submittingConcept ? 'Membuat Konsep...' : 'Buat Konsep SPT'}</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          /* ================================================================= */
          /* DEFAULT CORETAX SPT LIST VIEW (EXACT MATCH TO PDF 1, 2, 3, 4)     */
          /* ================================================================= */
          <>
            {/* Official Hero Banner: Yellow in OP mode (PDF 1), Deep Navy in Badan mode (PDF 2/4) */}
            <div
              className={`rounded-[10px] px-5 sm:px-6 py-4 flex items-center gap-5 overflow-hidden ${
                accountMode === 'INDIVIDUAL'
                  ? 'bg-[#F5C527] text-[#1E293B]'
                  : 'bg-[#1E2C5E] text-white'
              }`}
            >
              <SptBannerIllustration isSubmitted={activeMenuMeta.id === 'dilaporkan'} />
              <div className="min-w-0">
                <h1 className="font-display font-bold text-[19px] sm:text-[21px] tracking-tight leading-tight">
                  {activeMenuMeta.bannerTitle}
                </h1>
              </div>
            </div>

            {/* White Table Card */}
            <div className="bg-white border border-[#E5EAF2] rounded-[10px] overflow-hidden shadow-[0_2px_10px_rgba(30,44,94,0.03)]">
              {/* Top Action Strip with Buat Konsep SPT Button */}
              <div className="px-4 pt-3.5 pb-1 flex flex-wrap items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={handleStartCreateConcept}
                  className="inline-flex items-center gap-2 bg-[#1E2C5E] hover:bg-[#16224A] text-white font-bold text-[12px] px-4 py-2 rounded-[5px] shadow-xs transition cursor-pointer"
                >
                  <FilePlus2 className="w-3.5 h-3.5" />
                  <span>Buat Konsep SPT</span>
                </button>
              </div>

              {/* 5 Official Compact Square Toolbar Icon Buttons */}
              <div className="px-4 pt-2.5 pb-2.5 flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleResetFilters}
                  title="Muat ulang & reset filter"
                  className="w-7 h-7 rounded-[5px] bg-white hover:bg-slate-50 border border-[#CBD5E1] text-[#1E2C5E] inline-flex items-center justify-center transition cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => handleExportTable('csv')}
                  title="Ekspor ke CSV"
                  className="w-7 h-7 rounded-[5px] bg-[#5B636E] hover:bg-[#49505A] text-white inline-flex items-center justify-center transition cursor-pointer"
                >
                  <FileText className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => handleExportTable('xls')}
                  title="Ekspor ke Excel"
                  className="w-7 h-7 rounded-[5px] bg-[#2E7D32] hover:bg-[#256628] text-white inline-flex items-center justify-center transition cursor-pointer"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  title="Cetak Daftar SPT (PDF)"
                  className="w-7 h-7 rounded-[5px] bg-[#C62828] hover:bg-[#A62020] text-white inline-flex items-center justify-center transition cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setShowFilters((prev) => !prev)}
                  title={showFilters ? 'Sembunyikan filter kolom' : 'Tampilkan filter kolom'}
                  className="w-7 h-7 rounded-[5px] border bg-[#E6F2FA] border-[#BBD9EE] text-[#1E2C5E] inline-flex items-center justify-center transition cursor-pointer"
                >
                  <Filter className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Official Yellow-Header Table with Exact Columns from PDF 1, 2, 3, 4 */}
              <div className="px-4 pb-3">
                <div className="overflow-x-auto border border-[#E5EAF2] rounded-[6px]">
                  <table className="w-full text-[12px] border-collapse min-w-[780px]">
                    <thead>
                      <tr className="bg-[#F6C324] text-[#1E293B] font-bold">
                        <th className="px-3 py-2.5 text-left border-r border-white/50 w-[104px]" />
                        <th className="px-3 py-2.5 text-left border-r border-white/50">
                          <button
                            type="button"
                            onClick={() => handleSort('taxType')}
                            className="inline-flex items-center gap-1.5 cursor-pointer hover:opacity-80"
                          >
                            <span>Jenis Pajak</span>
                            <ArrowUpDown className="w-3.5 h-3.5 opacity-75" />
                          </button>
                        </th>
                        <th className="px-3 py-2.5 text-left border-r border-white/50">
                          <button
                            type="button"
                            onClick={() => handleSort('kind')}
                            className="inline-flex items-center gap-1.5 cursor-pointer hover:opacity-80"
                          >
                            <span>Jenis Surat Pemberitahuan Pajak</span>
                            <ArrowUpDown className="w-3.5 h-3.5 opacity-75" />
                          </button>
                        </th>
                        <th className="px-3 py-2.5 text-left border-r border-white/50">
                          <button
                            type="button"
                            onClick={() => handleSort('period')}
                            className="inline-flex items-center gap-1.5 cursor-pointer hover:opacity-80"
                          >
                            <span>Masa Pajak</span>
                            <ArrowUpDown className="w-3.5 h-3.5 opacity-75" />
                          </button>
                        </th>
                        <th className="px-3 py-2.5 text-left border-r border-white/50">NOP</th>
                        <th className="px-3 py-2.5 text-left border-r border-white/50">
                          Nama Objek Pajak
                        </th>
                        <th className="px-3 py-2.5 text-left">Model SPT</th>
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
                              className="w-full rounded-[4px] border border-[#CBD5E1] bg-white px-2.5 py-1.5 text-[11.5px] text-slate-600 focus:outline-none focus:border-[#1E2C5E]"
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
                              className="w-full rounded-[4px] border border-[#CBD5E1] bg-white px-2.5 py-1.5 text-[11.5px] text-slate-600 focus:outline-none focus:border-[#1E2C5E]"
                            >
                              <option value="">Pilih Jenis Surat Pemberitahuan Pajak</option>
                              <option value="SPT Tahunan PPh Wajib Pajak Orang Pribadi">
                                SPT Tahunan PPh Wajib Pajak Orang Pribadi
                              </option>
                              <option value="SPT Masa PPN">SPT Masa PPN</option>
                              <option value="SPT Masa PPh Pasal 21/26">
                                SPT Masa PPh Pasal 21/26
                              </option>
                              <option value="SPT Masa PPh Unifikasi">SPT Masa PPh Unifikasi</option>
                              <option value="SPT PPh Badan Rupiah">SPT PPh Badan Rupiah</option>
                            </select>
                          </td>
                          <td className="px-2 py-2 border-r border-[#EEF2F6]">
                            <select
                              value={filterPeriod}
                              onChange={(e) => {
                                setFilterPeriod(e.target.value);
                                setPage(1);
                              }}
                              className="w-full rounded-[4px] border border-[#CBD5E1] bg-white px-2.5 py-1.5 text-[11.5px] text-slate-600 focus:outline-none focus:border-[#1E2C5E]"
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
                            <div className="flex items-center gap-1">
                              <input
                                type="text"
                                value={filterNop}
                                onChange={(e) => setFilterNop(e.target.value)}
                                className="w-full rounded-[4px] border border-[#CBD5E1] bg-white px-2 py-1 text-[11.5px] text-slate-600 focus:outline-none"
                              />
                              <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            </div>
                          </td>
                          <td className="px-2 py-2 border-r border-[#EEF2F6]">
                            <div className="flex items-center gap-1">
                              <input
                                type="text"
                                value={filterObjName}
                                onChange={(e) => setFilterObjName(e.target.value)}
                                className="w-full rounded-[4px] border border-[#CBD5E1] bg-white px-2 py-1 text-[11.5px] text-slate-600 focus:outline-none"
                              />
                              <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            </div>
                          </td>
                          <td className="px-2 py-2">
                            <select
                              value={filterModel}
                              onChange={(e) => {
                                setFilterModel(e.target.value);
                                setPage(1);
                              }}
                              className="w-full rounded-[4px] border border-[#CBD5E1] bg-white px-2.5 py-1.5 text-[11.5px] text-slate-600 focus:outline-none"
                            >
                              <option value="">Pilih Model SPT</option>
                              <option value="Normal">Normal</option>
                              <option value="Pembetulan">Pembetulan</option>
                            </select>
                          </td>
                        </tr>
                      )}
                    </thead>

                    <tbody className="divide-y divide-[#EEF2F6] bg-white">
                      {paginatedReturns.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="px-4 py-5 text-left text-[12px] text-slate-600">
                            Tidak ada data yang ditemukan.
                          </td>
                        </tr>
                      ) : (
                        paginatedReturns.map((ret) => (
                          <tr key={ret.id} className="hover:bg-[#F8FAFC] transition">
                            <td className="px-3 py-2.5 whitespace-nowrap">
                              <div className="flex items-center gap-1.5">
                                {ret.status === 'DRAFT' ? (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => setEditingReturnId(ret.id)}
                                      title="Lihat"
                                      className="w-6 h-6 rounded-[4px] border border-[#CBD5E1] bg-white hover:bg-[#1E2C5E] text-[#1E2C5E] hover:text-white inline-flex items-center justify-center cursor-pointer transition"
                                    >
                                      <Edit3 className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => onDeleteReturn(ret.id)}
                                      title="Hapus Konsep SPT"
                                      className="w-6 h-6 rounded-[4px] bg-[#9B2C2C] hover:bg-[#7F1D1D] text-white inline-flex items-center justify-center cursor-pointer transition"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </>
                                ) : (
                                  /* Exact 3 icons from PDF 1 Page 10 Step 13 (Eye, Green BPE/Mail, Red Download PDF) */
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => setEditingReturnId(ret.id)}
                                      title="Lihat isi SPT"
                                      className="w-6 h-6 rounded-[4px] border border-[#CBD5E1] bg-white hover:bg-slate-100 text-[#1E2C5E] inline-flex items-center justify-center cursor-pointer transition"
                                    >
                                      <Eye className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        onPrintDocument({
                                          type: 'BPE',
                                          taxReturn: ret,
                                          taxpayer: activeTaxpayer,
                                        })
                                      }
                                      title="Bukti Penerimaan Elektronik (BPE)"
                                      className="w-6 h-6 rounded-[4px] bg-[#2F7D4A] hover:bg-[#236339] text-white inline-flex items-center justify-center cursor-pointer transition"
                                    >
                                      <Mail className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        onPrintDocument({
                                          type: 'BPE',
                                          taxReturn: ret,
                                          taxpayer: activeTaxpayer,
                                        })
                                      }
                                      title="Download SPT / BPE (PDF)"
                                      className="w-6 h-6 rounded-[4px] bg-[#A83232] hover:bg-[#8B2626] text-white inline-flex items-center justify-center cursor-pointer transition"
                                    >
                                      <FileText className="w-3.5 h-3.5" />
                                    </button>
                                  </>
                                )}
                              </div>
                            </td>
                            <td className="px-3 py-2.5 text-slate-800">
                              {TAX_TYPE_LABELS[ret.returnType]}
                            </td>
                            <td className="px-3 py-2.5 text-slate-800">
                              {RETURN_SHEET_NAME_LABELS[ret.returnType]}
                            </td>
                            <td className="px-3 py-2.5 text-slate-800 whitespace-nowrap">
                              {formatPeriodDisplay(ret)}
                            </td>
                            <td className="px-3 py-2.5 text-slate-400">-</td>
                            <td className="px-3 py-2.5 text-slate-400">-</td>
                            <td className="px-3 py-2.5 text-slate-800 whitespace-nowrap">
                              {ret.revisionNo === 0 ? 'Normal' : `Pembetulan ${ret.revisionNo}`}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Pagination Bar matching Official Coretax Footer (< 1 > [ 10 v ]) */}
                <div className="mt-3 pt-2 flex items-center justify-center gap-2 text-[12px] text-slate-600">
                  <button
                    type="button"
                    disabled={safePage <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="p-1.5 rounded hover:bg-slate-100 disabled:opacity-35 cursor-pointer"
                    aria-label="Halaman sebelumnya"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                  {paginatedReturns.length > 0 && (
                    <span className="w-6 h-6 rounded-[4px] border border-[#CBD5E1] bg-white text-[#1E2C5E] font-bold font-mono-num text-xs inline-flex items-center justify-center">
                      {safePage}
                    </span>
                  )}
                  <button
                    type="button"
                    disabled={safePage >= totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    className="p-1.5 rounded hover:bg-slate-100 disabled:opacity-35 cursor-pointer"
                    aria-label="Halaman berikutnya"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                  <select
                    value={pageSize}
                    onChange={(e) => {
                      setPageSize(Number(e.target.value));
                      setPage(1);
                    }}
                    className="border border-[#CBD5E1] rounded-[4px] px-2 py-1 text-[11.5px] bg-white text-slate-700 font-mono-num focus:outline-none focus:border-[#1E2C5E]"
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
