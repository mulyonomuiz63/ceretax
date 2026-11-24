import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  ArrowUpDown,
  Ban,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Copy,
  Edit3,
  Eye,
  FileText,
  Filter,
  Info,
  Layers,
  Plus,
  RotateCcw,
  ShieldCheck,
  Trash2,
  Upload,
  X,
  XCircle,
} from 'lucide-react';
import { InvoiceDirection, TaxInvoice, TaxInvoiceItem, Taxpayer, WorkspaceState } from '../types/tax.ts';
import {
  calculatePpnLine,
  FAKTUR_TRANSACTION_CODES,
  formatRp,
  generateFakturNumber,
  ITEM_CODES_CATALOG,
  MONTHS_ID,
} from '../utils/taxCalc.ts';
import { SignModal } from '../components/SignModal.tsx';
import { PrintablePayload } from '../components/DocumentPrintModal.tsx';
import { downloadFakturPajakPdf } from '../utils/fakturPajakPdfGenerator.ts';
import {
  CoretaxIconToolbar,
  CoretaxPagination,
  downloadCsvFile,
} from '../components/CoretaxTableChrome.tsx';

interface EFakturModuleProps {
  subTab: string;
  resetKey?: number;
  onChangeSubTab: (tab: string) => void;
  workspace: WorkspaceState;
  activeTaxpayer: Taxpayer;
  accountMode: 'INDIVIDUAL' | 'CORPORATE';
  onSwitchAccountMode: (mode: 'INDIVIDUAL' | 'CORPORATE') => void;
  onCreateInvoice: (inv: Omit<TaxInvoice, 'id' | 'createdAt' | 'amendmentSeq'>) => Promise<void>;
  onInvoiceAction: (id: string, action: string, payload?: Record<string, any>) => Promise<void>;
  onPrintDocument: (doc: PrintablePayload) => void;
}

const STATUS_BADGE: Record<TaxInvoice['status'], string> = {
  DRAFT: 'bg-slate-100 text-slate-700 border-slate-300',
  APPROVED: 'bg-emerald-50 text-emerald-800 border-emerald-300',
  WAITING_FOR_AMENDMENT: 'bg-amber-50 text-amber-800 border-amber-300',
  AMENDED: 'bg-blue-50 text-blue-800 border-blue-300',
  WAITING_FOR_CANCELLATION: 'bg-orange-50 text-orange-800 border-orange-300',
  CANCELLED: 'bg-red-50 text-red-700 border-red-300',
};

const EFAKTUR_SIDEBAR_GROUPS = [
  {
    header: 'Dashboard e-Faktur',
    items: [{ id: 'dashboard', label: 'Dashboard' }],
  },
  {
    header: 'e-Faktur',
    items: [
      { id: 'output', label: 'Pajak Keluaran' },
      { id: 'input', label: 'Pajak Masukan' },
      { id: 'retur_keluaran', label: 'Retur Pajak Keluaran' },
      { id: 'retur_masukan', label: 'Retur Pajak Masukan' },
    ],
  },
  {
    header: 'Dokumen Lain',
    items: [
      { id: 'dok_lain_keluaran', label: 'Pajak Keluaran' },
      { id: 'dok_lain_masukan', label: 'Pajak Masukan' },
      { id: 'retur_dok_lain_keluaran', label: 'Retur Dokumen Lain Keluaran' },
      { id: 'retur_dok_lain_masukan', label: 'Retur Dokumen Lain Masukan' },
    ],
  },
];

const DASHBOARD_STATUS_LEGEND = [
  { key: 'APPROVED', label: 'APPROVED', color: 'bg-[#64748B]' },
  { key: 'APPROVED_SIGN', label: 'APPROVED (SIGNED)', color: 'bg-[#3B5998]' },
  { key: 'CANCELLED', label: 'CANCELLED', color: 'bg-[#0EA5E9]' },
  { key: 'AMENDED', label: 'AMENDED', color: 'bg-[#10B981]' },
  { key: 'DRAFT', label: 'CREATED', color: 'bg-[#84CC16]' },
  { key: 'SAVED', label: 'SAVED', color: 'bg-[#A3E635]' },
  { key: 'DELETED', label: 'DELETED', color: 'bg-[#FACC15]' },
  { key: 'WAITING_FOR_AMENDMENT', label: 'WAITING_FOR_AMENDMENT', color: 'bg-[#F97316]' },
  { key: 'WAITING_FOR_CANCELLATION', label: 'WAITING_FOR_CANCELLATION', color: 'bg-[#EF4444]' },
];

export const EFakturModule: React.FC<EFakturModuleProps> = ({
  subTab,
  resetKey,
  onChangeSubTab,
  workspace,
  activeTaxpayer,
  accountMode,
  onSwitchAccountMode,
  onCreateInvoice,
  onInvoiceAction,
  onPrintDocument,
}) => {
  // Normalize legacy subTab ids seamlessly
  const normalizedTab =
    subTab === 'retur'
      ? 'retur_keluaran'
      : subTab === 'export'
        ? 'dok_lain_keluaran'
        : subTab || 'dashboard';

  const [dashboardPeriod, setDashboardPeriod] = useState('2025-01');
  const [npwpFilter, setNpwpFilter] = useState('');
  const [nameFilter, setNameFilter] = useState('');
  const [txCodeFilter, setTxCodeFilter] = useState('ALL');
  const [invoiceNumFilter, setInvoiceNumFilter] = useState('');
  const [monthFilter, setMonthFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [creditFilter, setCreditFilter] = useState('ALL');
  const [showColumnFilters, setShowColumnFilters] = useState(true);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [monitoringOpen, setMonitoringOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [fakturSuccessToast, setFakturSuccessToast] = useState<string | null>(null);
  const [addTxModalOpen, setAddTxModalOpen] = useState(false);
  const [uploadAfterCreateOpen, setUploadAfterCreateOpen] = useState(false);
  const [bulkSignTargets, setBulkSignTargets] = useState<TaxInvoice[]>([]);
  const [signTarget, setSignTarget] = useState<TaxInvoice | null>(null);
  const [returnTarget, setReturnTarget] = useState<TaxInvoice | null>(null);
  const [returnAmount, setReturnAmount] = useState(0);
  const [returnNoteNumber, setReturnNoteNumber] = useState('NR-2025-001');
  const [amendTarget, setAmendTarget] = useState<TaxInvoice | null>(null);
  const [amendDpp, setAmendDpp] = useState(0);

  // Reset detail modals / views when navigating or clicking menu
  useEffect(() => {
    setCreateModalOpen(false);
    setAddTxModalOpen(false);
    setSignTarget(null);
    setBulkSignTargets([]);
    setReturnTarget(null);
    setAmendTarget(null);
    setMonitoringOpen(false);
  }, [resetKey, subTab]);

  // Inline Coretax Output Invoice Edit state
  const [editCollapsed, setEditCollapsed] = useState<Record<string, boolean>>({});
  const [isDownPayment, setIsDownPayment] = useState(false);
  const [isFinalPayment, setIsFinalPayment] = useState(false);
  const [txCode, setTxCode] = useState('04');
  const [invoiceDate, setInvoiceDate] = useState('2025-01-22');
  const [referenceCode, setReferenceCode] = useState(
    `INV/BN/2025/01/00${workspace.invoices.length + 1}`
  );
  const [buyerIdType, setBuyerIdType] = useState<'NPWP' | 'PASPOR' | 'NIK' | 'LAINNYA'>('NPWP');
  const [counterpartyNpwp, setCounterpartyNpwp] = useState('0811223344556000');
  const [counterpartyName, setCounterpartyName] = useState('PT MITRA NIAGA SEJAHTERA');
  const [buyerAddress, setBuyerAddress] = useState('Jl. Jend. Sudirman Kav. 45, Jakarta Selatan');
  const [buyerEmail, setBuyerEmail] = useState('tax@mitraniaga.co.id');
  const [buyerCountry, setBuyerCountry] = useState('Indonesia (IDN)');
  const [draftItems, setDraftItems] = useState<TaxInvoiceItem[]>([]);
  const [selectedDraftItemIds, setSelectedDraftItemIds] = useState<string[]>([]);

  // Add Transaction modal state
  const [txItemType, setTxItemType] = useState<'GOODS' | 'SERVICES'>('GOODS');
  const [itemCode, setItemCode] = useState('847130');
  const [itemName, setItemName] = useState('Komputer Jinjing / Laptop & Perangkat IT');
  const [txUnit, setTxUnit] = useState('Unit');
  const [unitPrice, setUnitPrice] = useState(12_000_000);
  const [quantity, setQuantity] = useState(5);
  const [discount, setDiscount] = useState(0);
  const [isLuxury, setIsLuxury] = useState(false);
  const [txPpnbmRate, setTxPpnbmRate] = useState(0);

  const isReturTab =
    normalizedTab === 'retur_keluaran' ||
    normalizedTab === 'retur_masukan' ||
    normalizedTab === 'retur_dok_lain_keluaran' ||
    normalizedTab === 'retur_dok_lain_masukan';

  const isInputTab =
    normalizedTab === 'input' ||
    normalizedTab === 'dok_lain_masukan' ||
    normalizedTab === 'retur_masukan' ||
    normalizedTab === 'retur_dok_lain_masukan';

  const isDokLainTab =
    normalizedTab === 'dok_lain_keluaran' ||
    normalizedTab === 'dok_lain_masukan' ||
    normalizedTab === 'retur_dok_lain_keluaran' ||
    normalizedTab === 'retur_dok_lain_masukan';

  const activeTabTitle = useMemo(() => {
    switch (normalizedTab) {
      case 'dashboard':
        return 'Dashboard e-Faktur';
      case 'output':
        return 'e-Faktur — Pajak Keluaran';
      case 'input':
        return 'e-Faktur — Pajak Masukan';
      case 'retur_keluaran':
        return 'e-Faktur — Retur Pajak Keluaran';
      case 'retur_masukan':
        return 'e-Faktur — Retur Pajak Masukan';
      case 'dok_lain_keluaran':
        return 'Dokumen Lain — Pajak Keluaran';
      case 'dok_lain_masukan':
        return 'Dokumen Lain — Pajak Masukan';
      case 'retur_dok_lain_keluaran':
        return 'Dokumen Lain — Retur Dokumen Lain Keluaran';
      case 'retur_dok_lain_masukan':
        return 'Dokumen Lain — Retur Dokumen Lain Masukan';
      default:
        return 'e-Faktur';
    }
  }, [normalizedTab]);

  const filteredInvoices = workspace.invoices.filter((inv) => {
    if (normalizedTab === 'retur_keluaran') {
      if (
        !(
          inv.direction === 'OUTPUT' &&
          (inv.status === 'APPROVED' || inv.status === 'AMENDED' || inv.returnAmount > 0)
        )
      ) {
        return false;
      }
    } else if (normalizedTab === 'retur_masukan') {
      if (
        !(
          inv.direction === 'INPUT' &&
          (inv.status === 'APPROVED' || inv.status === 'AMENDED' || inv.returnAmount > 0)
        )
      ) {
        return false;
      }
    } else if (normalizedTab === 'retur_dok_lain_keluaran') {
      if (!(inv.direction === 'EXPORT' && inv.returnAmount > 0)) return false;
    } else if (normalizedTab === 'retur_dok_lain_masukan') {
      if (!(inv.direction === 'INPUT' && inv.returnAmount > 0 && inv.transactionCode === '01'))
        return false;
    } else {
      const expectedDir: InvoiceDirection =
        normalizedTab === 'output'
          ? 'OUTPUT'
          : normalizedTab === 'input' || normalizedTab === 'dok_lain_masukan'
            ? 'INPUT'
            : 'EXPORT';
      if (inv.direction !== expectedDir) return false;
    }

    if (statusFilter !== 'ALL' && inv.status !== statusFilter) return false;
    if (txCodeFilter !== 'ALL' && inv.transactionCode !== txCodeFilter) return false;
    if (monthFilter !== 'ALL' && String(inv.taxPeriodMonth) !== monthFilter) return false;
    if (npwpFilter.trim() && !inv.counterpartyNpwp.toLowerCase().includes(npwpFilter.trim().toLowerCase())) {
      return false;
    }
    if (nameFilter.trim() && !inv.counterpartyName.toLowerCase().includes(nameFilter.trim().toLowerCase())) {
      return false;
    }
    if (
      invoiceNumFilter.trim() &&
      !inv.invoiceNumber.toLowerCase().includes(invoiceNumFilter.trim().toLowerCase()) &&
      !inv.referenceCode.toLowerCase().includes(invoiceNumFilter.trim().toLowerCase())
    ) {
      return false;
    }
    if (creditFilter === 'CREDITED' && inv.isCredited === false) return false;
    if (creditFilter === 'UNCREDITED' && inv.isCredited !== false) return false;
    return true;
  });

  const paginatedInvoices = filteredInvoices.slice((page - 1) * pageSize, page * pageSize);

  const resetTableFilters = () => {
    setNpwpFilter('');
    setNameFilter('');
    setTxCodeFilter('ALL');
    setInvoiceNumFilter('');
    setMonthFilter('ALL');
    setStatusFilter('ALL');
    setCreditFilter('ALL');
    setPage(1);
  };

  // Dashboard metrics for selected period
  const [dashYear, dashMonth] = dashboardPeriod.split('-').map(Number);
  const periodInvoices = workspace.invoices.filter(
    (inv) => inv.taxPeriodYear === dashYear && inv.taxPeriodMonth === dashMonth
  );
  const periodPpnReturns = workspace.returns.filter(
    (r) =>
      r.returnType === 'SPT_MASA_PPN' &&
      r.taxYear === dashYear &&
      r.taxPeriodMonth === dashMonth
  );
  const periodPpnBillings = workspace.billings.filter(
    (b) => b.kapCode === '411211' && b.taxPeriodLabel.includes(String(dashYear))
  );

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const inv of periodInvoices) {
      counts[inv.status] = (counts[inv.status] || 0) + 1;
    }
    return counts;
  }, [periodInvoices]);

  const handleOpenInvoiceEditor = () => {
    setReferenceCode(`INV/BN/2025/01/00${workspace.invoices.length + 1}`);
    const isExport = normalizedTab === 'dok_lain_keluaran';
    const defaultCalc = isExport
      ? { dpp: 60_000_000, dppOtherValue: 60_000_000, ppn: 0 }
      : calculatePpnLine(12_000_000, 5, 0, false);
    setDraftItems([
      {
        id: `item-${Date.now()}`,
        itemType: 'GOODS',
        itemCode: '847130',
        itemName: 'Komputer Jinjing / Laptop & Perangkat IT',
        unit: 'Unit',
        unitPrice: 12_000_000,
        quantity: 5,
        discount: 0,
        isLuxury: false,
        dpp: defaultCalc.dpp,
        dppOtherValue: defaultCalc.dppOtherValue,
        ppn: defaultCalc.ppn,
        ppnbm: 0,
      },
    ]);
    setSelectedDraftItemIds([]);
    setCreateModalOpen(true);
    setFakturSuccessToast('Berhasil membuat Faktur Pajak Keluaran baru!');
  };

  const handleAddTransactionLine = (e: React.FormEvent) => {
    e.preventDefault();
    const isExport = normalizedTab === 'dok_lain_keluaran';
    const calc = isExport
      ? {
          dpp: Math.max(0, unitPrice * quantity - discount),
          dppOtherValue: Math.max(0, unitPrice * quantity - discount),
          ppn: 0,
        }
      : calculatePpnLine(unitPrice, quantity, discount, isLuxury);
    const ppnbm = Math.round((calc.dpp * txPpnbmRate) / 100);
    const nextItem: TaxInvoiceItem = {
      id: `item-${Date.now()}-${Math.floor(Math.random() * 999)}`,
      itemType: txItemType,
      itemCode,
      itemName,
      unit: txUnit || 'Unit',
      unitPrice,
      quantity,
      discount,
      isLuxury,
      dpp: calc.dpp,
      dppOtherValue: calc.dppOtherValue,
      ppn: calc.ppn,
      ppnbm,
    };
    setDraftItems((prev) => [...prev, nextItem]);
    setAddTxModalOpen(false);
  };

  const handleRemoveSelectedLines = () => {
    if (selectedDraftItemIds.length === 0) return;
    setDraftItems((prev) => prev.filter((item) => !selectedDraftItemIds.includes(item.id)));
    setSelectedDraftItemIds([]);
  };

  const draftTotals = useMemo(() => {
    return draftItems.reduce(
      (acc, it) => ({
        dpp: acc.dpp + it.dpp,
        dppOtherValue: acc.dppOtherValue + it.dppOtherValue,
        ppn: acc.ppn + it.ppn,
        ppnbm: acc.ppnbm + it.ppnbm,
      }),
      { dpp: 0, dppOtherValue: 0, ppn: 0, ppnbm: 0 }
    );
  }, [draftItems]);

  const saveNewInvoice = async (approveImmediately: boolean) => {
    if (draftItems.length === 0) return;
    const direction: InvoiceDirection =
      normalizedTab === 'dok_lain_keluaran'
        ? 'EXPORT'
        : normalizedTab === 'input' || normalizedTab === 'dok_lain_masukan'
          ? 'INPUT'
          : 'OUTPUT';
    const isExport = direction === 'EXPORT';
    const parsedDate = new Date(invoiceDate);
    const finalStatus: TaxInvoice['status'] =
      approveImmediately || isExport || direction === 'INPUT' ? 'APPROVED' : 'DRAFT';
    const invNum = isExport
      ? `PEB-${invoiceDate.slice(0, 4)}-${String(Math.floor(100000 + Math.random() * 899999))}`
      : approveImmediately && direction === 'OUTPUT'
        ? generateFakturNumber(txCode, workspace.invoices.length + 11, false)
        : `DRAFT-${direction === 'OUTPUT' ? 'OUT' : 'IN'}-${String(workspace.invoices.length + 1).padStart(3, '0')}`;

    await onCreateInvoice({
      taxpayerId: workspace.corporateTaxpayer.id,
      direction,
      transactionCode: isExport ? '01' : txCode,
      invoiceNumber: invNum,
      referenceCode,
      counterpartyNpwp,
      counterpartyName,
      invoiceDate,
      taxPeriodMonth: parsedDate.getMonth() + 1 || 1,
      taxPeriodYear: parsedDate.getFullYear() || 2025,
      items: draftItems,
      dppTotal: draftTotals.dpp,
      dppOtherValue: draftTotals.dppOtherValue,
      ppnTotal: draftTotals.ppn,
      ppnbmTotal: draftTotals.ppnbm,
      status: finalStatus,
      signedAt: finalStatus === 'APPROVED' ? new Date().toISOString() : undefined,
      isCredited: direction === 'INPUT',
      returnAmount: 0,
    });
    setCreateModalOpen(false);
    setUploadAfterCreateOpen(false);
  };

  const selectedDraftInvoices = filteredInvoices.filter(
    (i) => selectedIds.includes(i.id) && i.status === 'DRAFT'
  );

  const previewCalc =
    normalizedTab === 'dok_lain_keluaran'
      ? {
          dpp: Math.max(0, unitPrice * quantity - discount),
          dppOtherValue: Math.max(0, unitPrice * quantity - discount),
          ppn: 0,
        }
      : calculatePpnLine(unitPrice, quantity, discount, isLuxury);

  return (
    <div className="space-y-4">
      {fakturSuccessToast && (
        <div className="fixed top-14 left-1/2 -translate-x-1/2 z-50 bg-[#DCFCE7] border border-[#22C55E] text-[#15803D] rounded-[5px] px-4 py-2.5 shadow-lg flex items-center gap-3 min-w-[340px]">
          <CheckCircle2 className="w-4 h-4 text-[#16A34A] shrink-0" />
          <div className="flex-1 text-[12px]">
            <div className="font-bold">Success</div>
            <div>{fakturSuccessToast}</div>
          </div>
          <button
            type="button"
            onClick={() => setFakturSuccessToast(null)}
            className="text-[#15803D] hover:text-[#14532D] font-bold cursor-pointer"
          >
            ×
          </button>
        </div>
      )}

      {accountMode !== 'CORPORATE' && (
        <div className="bg-amber-50 border border-amber-300 text-amber-900 rounded-lg px-4 py-3 text-xs flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              Menu <strong>e-Faktur</strong> umumnya dikelola oleh Pengusaha Kena Pajak (PKP). Anda sedang berada di akun Orang Pribadi.
            </span>
          </div>
          <button
            type="button"
            onClick={() => onSwitchAccountMode('CORPORATE')}
            className="bg-[#1D2B53] text-[#F4C430] font-bold px-3 py-1.5 rounded text-xs cursor-pointer"
          >
            Impersonate ke {workspace.corporateTaxpayer.name}
          </button>
        </div>
      )}

      {/* AUTHENTIC 2-COLUMN CORETAX e-FAKTUR LAYOUT */}
      <div className="flex flex-col lg:flex-row gap-4 items-start">
        {/* LEFT NAVIGATION PANEL (Navy Taxpayer Box + 3 Exact Menu Groups) */}
        <aside className="w-full lg:w-[235px] shrink-0 bg-white border border-[#E2E8F0] rounded-lg overflow-hidden shadow-xs">
          <div className="bg-[#1D2B53] text-white px-4 py-4">
            <div className="font-mono-num font-bold text-[15px] tracking-wide break-all leading-tight">
              {activeTaxpayer.nikNpwp}
            </div>
            <div className="text-xs font-medium text-slate-200 uppercase mt-1 truncate">
              {activeTaxpayer.name}
            </div>
          </div>

          <div className="divide-y divide-slate-100">
            {EFAKTUR_SIDEBAR_GROUPS.map((group) => (
              <div key={group.header} className="py-1">
                <div className="px-4 py-2 text-[12px] font-bold text-[#1D2B53]">
                  {group.header}
                </div>
                <div>
                  {group.items.map((item) => {
                    const isActive = normalizedTab === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          onChangeSubTab(item.id);
                          setStatusFilter('ALL');
                        }}
                        className={`w-full text-left px-4 py-2 text-[12px] transition cursor-pointer ${
                          isActive
                            ? 'bg-[#E6EEF6] text-[#1D2B53] font-bold'
                            : 'text-slate-600 hover:bg-slate-50 font-medium'
                        }`}
                      >
                        {item.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </aside>

        {/* RIGHT MAIN CONTENT AREA */}
        <div className="flex-1 min-w-0 w-full space-y-4">
          {normalizedTab === 'dashboard' ? (
            /* ============================================================= */
            /* DASBOR e-FAKTUR (Exact Match to Official Coretax Screenshot)  */
            /* ============================================================= */
            <div className="space-y-4">
              {/* Top Bar: Dashboard e-Faktur + Month/Year Picker */}
              <div className="bg-white border border-[#E2E8F0] rounded-lg px-5 py-3.5 flex flex-wrap items-center justify-between gap-3">
                <h1 className="font-display font-bold text-[18px] text-[#1D2B53]">
                  Dashboard e-Faktur
                </h1>
                <div className="inline-flex items-center border border-slate-300 rounded-md overflow-hidden bg-white">
                  <input
                    type="month"
                    value={dashboardPeriod}
                    onChange={(e) => setDashboardPeriod(e.target.value)}
                    className="px-3 py-1.5 text-xs font-medium text-slate-700 focus:outline-none font-mono-num"
                  />
                  <span className="px-2.5 py-2 bg-[#1D2B53] text-white">
                    <Calendar className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>

              {/* 2-Column Dashboard Cards */}
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                {/* Card 1: Dashboard Faktur Pajak */}
                <div className="bg-white border border-[#E2E8F0] rounded-lg p-5 min-h-[300px] flex flex-col min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-4">
                    <h2 className="font-display font-bold text-sm text-[#1D2B53]">
                      Dashboard Faktur Pajak
                    </h2>
                    <span className="text-[11px] text-slate-500 font-mono-num">
                      {MONTHS_ID[(dashMonth || 1) - 1]} {dashYear}
                    </span>
                  </div>

                  {periodInvoices.length === 0 ? (
                    <div className="text-center py-12 text-xs text-slate-500 flex items-center justify-center gap-1.5">
                      <Info className="w-4 h-4 text-[#F4C430]" />
                      <span>Tidak Ada Data Tersedia!</span>
                    </div>
                  ) : (
                    <div className="flex-1 flex flex-col justify-between space-y-4">
                      {/* Top Metric Boxes - Full width across Card 1 with ample room */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="bg-[#F8FAFC] border border-slate-200 rounded-lg p-3 min-w-0">
                          <div className="text-[11px] text-slate-500 font-medium truncate">Total Faktur Masa</div>
                          <div className="text-xl font-extrabold text-[#1D2B53] font-mono-num mt-0.5 truncate">
                            {periodInvoices.length}
                          </div>
                        </div>
                        <div className="bg-[#F8FAFC] border border-slate-200 rounded-lg p-3 min-w-0">
                          <div className="text-[11px] text-slate-500 font-medium truncate">Total PPN Keluaran</div>
                          <div
                            className="text-[13px] sm:text-sm font-extrabold text-[#1D2B53] font-mono-num mt-1 whitespace-nowrap truncate"
                            title={formatRp(
                              periodInvoices
                                .filter(
                                  (i) => i.direction === 'OUTPUT' && i.status !== 'CANCELLED'
                                )
                                .reduce((s, i) => s + i.ppnTotal, 0)
                            )}
                          >
                            {formatRp(
                              periodInvoices
                                .filter(
                                  (i) => i.direction === 'OUTPUT' && i.status !== 'CANCELLED'
                                )
                                .reduce((s, i) => s + i.ppnTotal, 0)
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Bottom Split: Status Progress Bars on Left + Status Legend on Right */}
                      <div className="flex flex-col sm:flex-row gap-4 items-stretch justify-between">
                        <div className="flex-1 space-y-2 pt-1 min-w-0">
                          {(['APPROVED', 'DRAFT', 'AMENDED', 'CANCELLED'] as const).map((st) => {
                            const count = statusCounts[st] || 0;
                            const pct =
                              periodInvoices.length > 0
                                ? Math.round((count / periodInvoices.length) * 100)
                                : 0;
                            return (
                              <div key={st} className="space-y-1">
                                <div className="flex items-center justify-between text-[11px]">
                                  <span className="font-semibold text-slate-700">{st}</span>
                                  <span className="font-mono-num text-slate-500">
                                    {count} ({pct}%)
                                  </span>
                                </div>
                                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                  <div
                                    className={`h-full rounded-full ${
                                      st === 'APPROVED'
                                        ? 'bg-[#3B5998]'
                                        : st === 'DRAFT'
                                          ? 'bg-[#84CC16]'
                                          : st === 'AMENDED'
                                            ? 'bg-[#10B981]'
                                            : 'bg-[#0EA5E9]'
                                    }`}
                                    style={{ width: `${pct}%` }}
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {/* Right Status Legend Box (Matching Screenshot) */}
                        <div className="w-full sm:w-[145px] shrink-0 bg-[#F8FAFC] border border-slate-200 rounded-md p-2.5">
                          <div className="text-[11px] font-bold text-[#1D2B53] mb-2">Status</div>
                          <ul className="space-y-1.5 text-[10px] text-slate-600">
                            {DASHBOARD_STATUS_LEGEND.map((item) => (
                              <li key={item.key} className="flex items-center gap-1.5 truncate">
                                <span className={`w-2.5 h-2.5 rounded-[2px] shrink-0 ${item.color}`} />
                                <span className="truncate" title={item.label}>
                                  {item.label}
                                </span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Card 2: Dashboard Pembayaran dan Pelaporan SPT Masa PPN */}
                <div className="bg-white border border-[#E2E8F0] rounded-lg p-5 min-h-[300px] flex flex-col min-w-0">
                  <h2 className="font-display font-bold text-sm text-[#1D2B53] mb-4">
                    Dashboard Pembayaran dan Pelaporan SPT Masa PPN
                  </h2>
                  {periodPpnReturns.length === 0 ? (
                    <div className="flex-1 flex items-center justify-center text-xs text-slate-500 gap-1.5">
                      <Info className="w-4 h-4 text-[#F4C430]" />
                      <span>Tidak Ada Data Tersedia!</span>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {periodPpnReturns.map((ret) => (
                        <div
                          key={ret.id}
                          className="border border-slate-200 rounded-lg p-3.5 text-xs space-y-1 bg-[#F8FAFC]"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-bold text-[#1D2B53]">
                              SPT Masa PPN — {MONTHS_ID[(ret.taxPeriodMonth || 1) - 1]} {ret.taxYear}
                            </span>
                            <span className="font-bold text-[11px] text-emerald-700">
                              {ret.status}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-slate-600 font-mono-num">
                            <span>Kurang / (Lebih) Bayar:</span>
                            <strong className="text-[#1D2B53]">
                              {formatRp(ret.underOverPayment)}
                            </strong>
                          </div>
                          {ret.bpeNumber && (
                            <div className="text-[11px] text-slate-500 font-mono-num">
                              BPE: {ret.bpeNumber}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Bottom Full-Width Card: Dashboard Pembayaran sebelum Pelaporan SPT Masa PPN */}
              <div className="bg-white border border-[#E2E8F0] rounded-lg p-5 min-h-[150px] flex flex-col">
                <h2 className="font-display font-bold text-sm text-[#1D2B53] mb-3">
                  Dashboard Pembayaran sebelum Pelaporan SPT Masa PPN
                </h2>
                {periodPpnBillings.length === 0 ? (
                  <div className="flex-1 flex items-center justify-center text-xs text-slate-500 gap-1.5 py-6">
                    <Info className="w-4 h-4 text-[#F4C430]" />
                    <span>Tidak Ada Data Tersedia!</span>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-slate-200 text-slate-500 text-left">
                          <th className="py-2 pr-3">Kode Billing</th>
                          <th className="py-2 pr-3">KAP / KJS</th>
                          <th className="py-2 pr-3">Masa</th>
                          <th className="py-2 pr-3 text-right">Nominal</th>
                          <th className="py-2 text-right">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {periodPpnBillings.map((b) => (
                          <tr key={b.id}>
                            <td className="py-2 pr-3 font-mono-num font-bold text-[#1D2B53]">
                              {b.billingCode}
                            </td>
                            <td className="py-2 pr-3 font-mono-num">
                              {b.kapCode}-{b.kjsCode}
                            </td>
                            <td className="py-2 pr-3">{b.taxPeriodLabel}</td>
                            <td className="py-2 pr-3 text-right font-mono-num font-semibold">
                              {formatRp(b.amount)}
                            </td>
                            <td className="py-2 text-right font-bold">
                              {b.status === 'PAID' ? 'LUNAS' : 'BELUM DIBAYAR'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          ) : createModalOpen ? (
            /* ============================================================= */
            /* INLINE CORETAX "OUTPUT INVOICE EDIT" SCREEN (PPN.pdf 100%)    */
            /* ============================================================= */
            <div className="bg-white border border-[#E2E8F0] rounded-lg overflow-hidden shadow-xs">
              <div className="px-5 py-3.5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setCreateModalOpen(false)}
                    className="p-1.5 rounded border border-slate-200 hover:bg-slate-100 text-[#1E2C5E] cursor-pointer"
                    title="Kembali ke daftar faktur"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                  <div>
                    <h1 className="font-display font-bold text-[17px] text-[#1E2C5E]">
                      {normalizedTab === 'dok_lain_keluaran'
                        ? 'Dokumen Lain Keluaran Edit (PEB)'
                        : isInputTab
                          ? 'Input Invoice Edit'
                          : 'Output Invoice Edit'}
                    </h1>
                    <p className="text-[11px] text-slate-500">
                      e-Faktur Coretax DJP — PMK 131/2024 (DPP Nilai Lain 11/12 &amp; PPN 12%)
                    </p>
                  </div>
                </div>
                <span className="text-[11px] font-semibold px-2.5 py-1 rounded bg-slate-100 text-slate-600 border border-slate-200">
                  Status: DRAFT
                </span>
              </div>

              <div className="p-5 space-y-4 text-[12px]">
                {/* Section 1: Dokumen Transaksi */}
                <div className="border border-slate-200 rounded overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setEditCollapsed((p) => ({ ...p, doc: !p.doc }))}
                    className="w-full flex items-center gap-2 bg-[#1E2C5E] text-white px-4 py-2.5 font-bold text-[12px] cursor-pointer"
                  >
                    {editCollapsed.doc ? <ChevronRight className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    <span>Dokumen Transaksi</span>
                  </button>
                  {!editCollapsed.doc && (
                    <div className="p-4 space-y-3 bg-white">
                      <div className="flex flex-wrap items-center gap-6 pb-2 border-b border-slate-100">
                        <label className="inline-flex items-center gap-2 cursor-pointer font-semibold text-slate-700">
                          <input
                            type="checkbox"
                            checked={isDownPayment}
                            onChange={(e) => setIsDownPayment(e.target.checked)}
                            className="accent-[#1E2C5E]"
                          />
                          <span>Uang Muka</span>
                        </label>
                        <label className="inline-flex items-center gap-2 cursor-pointer font-semibold text-slate-700">
                          <input
                            type="checkbox"
                            checked={isFinalPayment}
                            onChange={(e) => setIsFinalPayment(e.target.checked)}
                            className="accent-[#1E2C5E]"
                          />
                          <span>Pelunasan</span>
                        </label>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2.5">
                        <div className="grid grid-cols-12 items-center gap-2">
                          <label className="col-span-4 font-semibold text-slate-700">Nomor Faktur</label>
                          <input
                            type="text"
                            readOnly
                            value="Otomatis saat Upload Faktur"
                            className="col-span-8 border border-slate-200 bg-slate-100 rounded px-3 py-1.5 text-slate-500 italic"
                          />
                        </div>
                        {!isDokLainTab && (
                          <div className="grid grid-cols-12 items-center gap-2">
                            <label className="col-span-4 font-semibold text-slate-700">
                              Kode Transaksi <span className="text-rose-600">*</span>
                            </label>
                            <select
                              value={txCode}
                              onChange={(e) => setTxCode(e.target.value)}
                              className="col-span-8 border border-slate-300 rounded px-2.5 py-1.5 bg-white"
                            >
                              {FAKTUR_TRANSACTION_CODES.map((c) => (
                                <option key={c.code} value={c.code}>
                                  {c.label}
                                </option>
                              ))}
                            </select>
                          </div>
                        )}
                        <div className="grid grid-cols-12 items-center gap-2">
                          <label className="col-span-4 font-semibold text-slate-700">
                            Tanggal Faktur <span className="text-rose-600">*</span>
                          </label>
                          <input
                            type="date"
                            value={invoiceDate}
                            onChange={(e) => setInvoiceDate(e.target.value)}
                            className="col-span-8 border border-slate-300 rounded px-3 py-1.5 font-mono-num"
                          />
                        </div>
                        <div className="grid grid-cols-12 items-center gap-2">
                          <label className="col-span-4 font-semibold text-slate-700">
                            Jenis Faktur <span className="text-rose-600">*</span>
                          </label>
                          <input
                            type="text"
                            readOnly
                            value="Normal"
                            className="col-span-8 border border-slate-200 bg-slate-100 rounded px-3 py-1.5"
                          />
                        </div>
                        <div className="grid grid-cols-12 items-center gap-2">
                          <label className="col-span-4 font-semibold text-slate-700">
                            Masa / Tahun <span className="text-rose-600">*</span>
                          </label>
                          <input
                            type="text"
                            readOnly
                            value={`${MONTHS_ID[Math.max(0, (new Date(invoiceDate).getMonth() || 0))]} ${new Date(invoiceDate).getFullYear() || 2025}`}
                            className="col-span-8 border border-slate-200 bg-slate-100 rounded px-3 py-1.5 font-mono-num"
                          />
                        </div>
                        <div className="grid grid-cols-12 items-center gap-2">
                          <label className="col-span-4 font-semibold text-slate-700">Referensi</label>
                          <input
                            type="text"
                            value={referenceCode}
                            onChange={(e) => setReferenceCode(e.target.value)}
                            className="col-span-8 border border-slate-300 rounded px-3 py-1.5 font-mono-num"
                          />
                        </div>
                        <div className="grid grid-cols-12 items-center gap-2">
                          <label className="col-span-4 font-semibold text-slate-700">Alamat Penjual</label>
                          <input
                            type="text"
                            readOnly
                            value={workspace.corporateTaxpayer.address}
                            className="col-span-8 border border-slate-200 bg-slate-100 rounded px-3 py-1.5 truncate"
                          />
                        </div>
                        <div className="grid grid-cols-12 items-center gap-2">
                          <label className="col-span-4 font-semibold text-slate-700">IDTKU Penjual</label>
                          <input
                            type="text"
                            readOnly
                            value={`${workspace.corporateTaxpayer.nikNpwp}000000`}
                            className="col-span-8 border border-slate-200 bg-slate-100 rounded px-3 py-1.5 font-mono-num"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Section 2: Informasi Pembeli */}
                <div className="border border-slate-200 rounded overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setEditCollapsed((p) => ({ ...p, buyer: !p.buyer }))}
                    className="w-full flex items-center gap-2 bg-[#1E2C5E] text-white px-4 py-2.5 font-bold text-[12px] cursor-pointer"
                  >
                    {editCollapsed.buyer ? <ChevronRight className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    <span>{isInputTab ? 'Informasi Penjual' : 'Informasi Pembeli'}</span>
                  </button>
                  {!editCollapsed.buyer && (
                    <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2.5 bg-white">
                      <div className="grid grid-cols-12 items-center gap-2">
                        <label className="col-span-4 font-semibold text-slate-700">
                          Nomor Identitas WP <span className="text-rose-600">*</span>
                        </label>
                        <input
                          type="text"
                          value={counterpartyNpwp}
                          onChange={(e) => setCounterpartyNpwp(e.target.value)}
                          className="col-span-8 border border-slate-300 rounded px-3 py-1.5 font-mono-num"
                        />
                      </div>
                      <div className="grid grid-cols-12 items-center gap-2">
                        <label className="col-span-4 font-semibold text-slate-700">ID</label>
                        <div className="col-span-8 flex flex-wrap items-center gap-3 text-[11px]">
                          {(
                            [
                              { id: 'NPWP', label: 'Nomor Identitas WP' },
                              { id: 'NIK', label: 'NIK' },
                              { id: 'PASPOR', label: 'Paspor' },
                              { id: 'LAINNYA', label: 'Identitas Lain' },
                            ] as const
                          ).map((opt) => (
                            <label key={opt.id} className="inline-flex items-center gap-1 cursor-pointer">
                              <input
                                type="radio"
                                name="buyerIdType"
                                checked={buyerIdType === opt.id}
                                onChange={() => setBuyerIdType(opt.id)}
                                className="accent-[#1E2C5E]"
                              />
                              <span>{opt.label}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                      <div className="grid grid-cols-12 items-center gap-2">
                        <label className="col-span-4 font-semibold text-slate-700">
                          Nama <span className="text-rose-600">*</span>
                        </label>
                        <input
                          type="text"
                          value={counterpartyName}
                          onChange={(e) => setCounterpartyName(e.target.value)}
                          className="col-span-8 border border-slate-300 rounded px-3 py-1.5 font-semibold"
                        />
                      </div>
                      <div className="grid grid-cols-12 items-center gap-2">
                        <label className="col-span-4 font-semibold text-slate-700">Negara</label>
                        <input
                          type="text"
                          value={buyerCountry}
                          onChange={(e) => setBuyerCountry(e.target.value)}
                          className="col-span-8 border border-slate-300 rounded px-3 py-1.5"
                        />
                      </div>
                      <div className="grid grid-cols-12 items-center gap-2">
                        <label className="col-span-4 font-semibold text-slate-700">
                          Alamat <span className="text-rose-600">*</span>
                        </label>
                        <input
                          type="text"
                          value={buyerAddress}
                          onChange={(e) => setBuyerAddress(e.target.value)}
                          className="col-span-8 border border-slate-300 rounded px-3 py-1.5"
                        />
                      </div>
                      <div className="grid grid-cols-12 items-center gap-2">
                        <label className="col-span-4 font-semibold text-slate-700">
                          IDTKU <span className="text-rose-600">*</span>
                        </label>
                        <input
                          type="text"
                          readOnly
                          value={`${counterpartyNpwp.replace(/\D/g, '').slice(0, 16) || '0000000000000000'}000000`}
                          className="col-span-8 border border-slate-200 bg-slate-100 rounded px-3 py-1.5 font-mono-num"
                        />
                      </div>
                      <div className="grid grid-cols-12 items-center gap-2">
                        <label className="col-span-4 font-semibold text-slate-700">Email</label>
                        <input
                          type="email"
                          value={buyerEmail}
                          onChange={(e) => setBuyerEmail(e.target.value)}
                          className="col-span-8 border border-slate-300 rounded px-3 py-1.5"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Section 3: Detail Transaksi */}
                <div className="border border-slate-200 rounded overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setEditCollapsed((p) => ({ ...p, detail: !p.detail }))}
                    className="w-full flex items-center gap-2 bg-[#1E2C5E] text-white px-4 py-2.5 font-bold text-[12px] cursor-pointer"
                  >
                    {editCollapsed.detail ? <ChevronRight className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    <span>Detail Transaksi</span>
                  </button>
                  {!editCollapsed.detail && (
                    <div className="p-4 space-y-3 bg-white">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setAddTxModalOpen(true)}
                            className="inline-flex items-center gap-1.5 bg-[#1E2C5E] hover:bg-[#152048] text-white font-bold text-xs px-3.5 py-2 rounded-[6px] cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5 text-[#F7CA36]" />
                            <span>Tambah Transaksi</span>
                          </button>
                          <button
                            type="button"
                            disabled={selectedDraftItemIds.length === 0}
                            onClick={handleRemoveSelectedLines}
                            className="inline-flex items-center gap-1.5 bg-[#DC2626] hover:bg-[#B91C1C] disabled:opacity-45 text-white font-bold text-xs px-3.5 py-2 rounded-[6px] cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Hapus Transaksi</span>
                          </button>
                        </div>
                        <span className="text-[11px] text-slate-500">
                          Total {draftItems.length} baris transaksi
                        </span>
                      </div>

                      <div className="overflow-x-auto border border-slate-200 rounded">
                        <table className="w-full text-[11.5px] border-collapse">
                          <thead>
                            <tr className="bg-[#F7CA36] text-[#1E2C5E] font-bold">
                              <th className="px-2.5 py-2 w-8 text-center border-r border-[#E5B822]">
                                <input
                                  type="checkbox"
                                  checked={
                                    draftItems.length > 0 &&
                                    draftItems.every((it) => selectedDraftItemIds.includes(it.id))
                                  }
                                  onChange={() => {
                                    if (draftItems.every((it) => selectedDraftItemIds.includes(it.id))) {
                                      setSelectedDraftItemIds([]);
                                    } else {
                                      setSelectedDraftItemIds(draftItems.map((it) => it.id));
                                    }
                                  }}
                                />
                              </th>
                              <th className="px-2.5 py-2 text-left border-r border-[#E5B822]">Tipe</th>
                              <th className="px-2.5 py-2 text-left border-r border-[#E5B822]">Kode</th>
                              <th className="px-2.5 py-2 text-left border-r border-[#E5B822]">Nama Barang / Jasa</th>
                              <th className="px-2.5 py-2 text-center border-r border-[#E5B822]">Satuan</th>
                              <th className="px-2.5 py-2 text-right border-r border-[#E5B822]">Harga Satuan</th>
                              <th className="px-2.5 py-2 text-right border-r border-[#E5B822]">Qty</th>
                              <th className="px-2.5 py-2 text-right border-r border-[#E5B822]">Potongan</th>
                              <th className="px-2.5 py-2 text-right border-r border-[#E5B822]">DPP</th>
                              <th className="px-2.5 py-2 text-right border-r border-[#E5B822]">DPP Nilai Lain</th>
                              <th className="px-2.5 py-2 text-right border-r border-[#E5B822]">PPN (12%)</th>
                              <th className="px-2.5 py-2 text-right">PPnBM</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200">
                            {draftItems.length === 0 ? (
                              <tr>
                                <td colSpan={12} className="px-4 py-6 text-center text-slate-400">
                                  Belum ada detail transaksi. Klik tombol <strong>Tambah Transaksi</strong>.
                                </td>
                              </tr>
                            ) : (
                              draftItems.map((it) => (
                                <tr key={it.id} className="hover:bg-slate-50">
                                  <td className="px-2.5 py-2 text-center">
                                    <input
                                      type="checkbox"
                                      checked={selectedDraftItemIds.includes(it.id)}
                                      onChange={() =>
                                        setSelectedDraftItemIds((prev) =>
                                          prev.includes(it.id)
                                            ? prev.filter((x) => x !== it.id)
                                            : [...prev, it.id]
                                        )
                                      }
                                    />
                                  </td>
                                  <td className="px-2.5 py-2">{it.itemType === 'GOODS' ? 'Barang' : 'Jasa'}</td>
                                  <td className="px-2.5 py-2 font-mono-num">{it.itemCode}</td>
                                  <td className="px-2.5 py-2 font-semibold text-slate-800">{it.itemName}</td>
                                  <td className="px-2.5 py-2 text-center">{it.unit}</td>
                                  <td className="px-2.5 py-2 text-right font-mono-num">{formatRp(it.unitPrice)}</td>
                                  <td className="px-2.5 py-2 text-right font-mono-num">{it.quantity}</td>
                                  <td className="px-2.5 py-2 text-right font-mono-num">{formatRp(it.discount)}</td>
                                  <td className="px-2.5 py-2 text-right font-mono-num">{formatRp(it.dpp)}</td>
                                  <td className="px-2.5 py-2 text-right font-mono-num">{formatRp(it.dppOtherValue)}</td>
                                  <td className="px-2.5 py-2 text-right font-mono-num font-bold text-[#1E2C5E]">
                                    {formatRp(it.ppn)}
                                  </td>
                                  <td className="px-2.5 py-2 text-right font-mono-num">{formatRp(it.ppnbm)}</td>
                                </tr>
                              ))
                            )}
                            <tr className="bg-[#EEF3FA] font-extrabold text-[#1E2C5E]">
                              <td colSpan={8} className="px-3 py-2 text-right">
                                JUMLAH
                              </td>
                              <td className="px-2.5 py-2 text-right font-mono-num">{formatRp(draftTotals.dpp)}</td>
                              <td className="px-2.5 py-2 text-right font-mono-num">
                                {formatRp(draftTotals.dppOtherValue)}
                              </td>
                              <td className="px-2.5 py-2 text-right font-mono-num">{formatRp(draftTotals.ppn)}</td>
                              <td className="px-2.5 py-2 text-right font-mono-num">{formatRp(draftTotals.ppnbm)}</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Bottom Coretax Output Invoice Edit Footer */}
              <div className="px-5 py-3.5 bg-[#F8FAFC] border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="px-4 py-2 rounded-[6px] border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 font-semibold text-xs cursor-pointer"
                >
                  Kembali
                </button>
                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    disabled={draftItems.length === 0}
                    onClick={() => saveNewInvoice(false)}
                    className="px-4 py-2 rounded-[6px] bg-[#1E2C5E] hover:bg-[#152048] disabled:opacity-50 text-white font-bold text-xs cursor-pointer"
                  >
                    Simpan Konsep
                  </button>
                  {normalizedTab === 'output' && (
                    <button
                      type="button"
                      disabled={draftItems.length === 0}
                      onClick={() => setUploadAfterCreateOpen(true)}
                      className="inline-flex items-center gap-1.5 px-5 py-2 rounded-[6px] bg-[#F7CA36] hover:bg-[#E5B822] disabled:opacity-50 text-[#1E2C5E] font-extrabold text-xs cursor-pointer"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>Upload Faktur</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          ) : (
            /* ============================================================= */
            /* DATA TABLE FOR ALL e-FAKTUR & DOKUMEN LAIN SUBMENUS           */
            /* (Authentic Coretax DJP Pajak Keluaran Yellow-Header Table)    */
            /* ============================================================= */
            <div className="bg-white border border-[#E2E8F0] rounded-lg overflow-hidden">
              {/* Module Header */}
              <div className="px-5 py-3.5 border-b border-[#E5EAF2] flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h1 className="font-display font-bold text-[17px] text-[#1E2C5E]">
                    {activeTabTitle.replace(/^e-Faktur — |^Dokumen Lain — /, '')}
                  </h1>
                  {normalizedTab !== 'input' && (
                    <p className="text-[11.5px] text-slate-500">
                      PMK 131/2024 — Perhitungan Otomatis DPP Nilai Lain 11/12 &amp; PPN 12%
                    </p>
                  )}
                </div>
                {normalizedTab !== 'input' && (
                  <div className="text-xs text-slate-600 font-mono-num">
                    Total PPN:{' '}
                    <strong className="text-[#1E2C5E]">
                      {formatRp(
                        filteredInvoices.reduce(
                          (s, i) => s + (i.status === 'CANCELLED' ? 0 : i.ppnTotal),
                          0
                        )
                      )}
                    </strong>
                  </div>
                )}
              </div>

              {/* Official Coretax Navy Action Bar + Right-aligned Upload Faktur & Hapus Dokumen */}
              <div className="px-5 pt-3.5 pb-1 flex flex-wrap items-center justify-between gap-2 relative">
                <div className="flex flex-wrap items-center gap-2">
                {normalizedTab === 'input' ? (
                  <>
                    <button
                      type="button"
                      onClick={() =>
                        setFakturSuccessToast(
                          'Menu Pajak Masukan digunakan untuk mengelola dan mengkreditkan Faktur Pajak dari Penjual.'
                        )
                      }
                      className="w-8 h-8 rounded-full border border-[#1E2C5E] text-[#1E2C5E] hover:bg-[#1E2C5E]/10 flex items-center justify-center cursor-pointer transition shrink-0"
                      title="Informasi Pajak Masukan"
                    >
                      <Info className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        if (selectedIds.length === 0) {
                          setFakturSuccessToast('Pilih faktur terlebih dahulu');
                          return;
                        }
                        for (const id of selectedIds) {
                          await onInvoiceAction(id, 'TOGGLE_CREDIT', { isCredited: true });
                        }
                        setFakturSuccessToast(`${selectedIds.length} Faktur berhasil dikreditkan`);
                        setSelectedIds([]);
                      }}
                      className="inline-flex items-center gap-1.5 bg-[#1E2C5E] hover:bg-[#16224A] text-white font-semibold text-xs px-3.5 py-2 rounded-[7px] transition cursor-pointer"
                    >
                      <span>Kreditkan Faktur</span>
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        if (selectedIds.length === 0) {
                          setFakturSuccessToast('Pilih faktur terlebih dahulu');
                          return;
                        }
                        for (const id of selectedIds) {
                          await onInvoiceAction(id, 'TOGGLE_CREDIT', { isCredited: false });
                        }
                        setFakturSuccessToast(`${selectedIds.length} Faktur diubah menjadi Tidak Dapat Dikreditkan`);
                        setSelectedIds([]);
                      }}
                      className="inline-flex items-center gap-1.5 bg-[#1E2C5E] hover:bg-[#16224A] text-white font-semibold text-xs px-3.5 py-2 rounded-[7px] transition cursor-pointer"
                    >
                      <span>Tidak Kreditkan Faktur</span>
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        if (selectedIds.length === 0) {
                          setFakturSuccessToast('Pilih faktur terlebih dahulu');
                          return;
                        }
                        for (const id of selectedIds) {
                          await onInvoiceAction(id, 'TOGGLE_CREDIT', { isCredited: true });
                        }
                        setFakturSuccessToast(`${selectedIds.length} Faktur dikembalikan ke status Approved`);
                        setSelectedIds([]);
                      }}
                      className="inline-flex items-center gap-1.5 bg-[#1E2C5E] hover:bg-[#16224A] text-white font-semibold text-xs px-3.5 py-2 rounded-[7px] transition cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Kembali ke status Approved</span>
                    </button>
                  </>
                ) : !isReturTab ? (
                  <>
                    <button
                      type="button"
                      onClick={handleOpenInvoiceEditor}
                      className="inline-flex items-center gap-1.5 bg-[#1E2C5E] hover:bg-[#16224A] text-white font-semibold text-xs px-3.5 py-2 rounded-[7px] transition cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5 text-[#F4C430]" />
                      <span>
                        {normalizedTab === 'output'
                          ? 'Buat Faktur'
                          : normalizedTab === 'dok_lain_keluaran'
                            ? 'Catat Dokumen Lain Keluaran (PEB)'
                            : 'Catat Dokumen Lain Masukan'}
                      </span>
                    </button>
                    <button
                      type="button"
                      className="inline-flex items-center gap-1.5 bg-[#1E2C5E] hover:bg-[#16224A] text-white font-semibold text-xs px-3.5 py-2 rounded-[7px] transition cursor-pointer"
                    >
                      <span>Impor Data</span>
                      <ChevronDown className="w-3.5 h-3.5 opacity-80" />
                    </button>
                  </>
                ) : null}

                {/* Monitoring Dropdown */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => {
                      setMonitoringOpen((p) => !p);
                      setBulkOpen(false);
                    }}
                    className="inline-flex items-center gap-1.5 bg-[#1E2C5E] hover:bg-[#16224A] text-white font-semibold text-xs px-3.5 py-2 rounded-[7px] transition cursor-pointer"
                  >
                    <Info className="w-3.5 h-3.5" />
                    <span>Monitoring</span>
                    <ChevronDown className="w-3.5 h-3.5 opacity-80" />
                  </button>
                  {monitoringOpen && (
                    <div className="absolute left-0 top-full mt-1.5 w-64 bg-white border border-[#E2E8F0] rounded-lg shadow-xl p-3 z-30 text-xs space-y-1.5">
                      <div className="font-bold text-[#1E2C5E] pb-1 border-b border-slate-100">
                        Ringkasan Status Faktur
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600">Total Faktur Tampil</span>
                        <strong className="font-mono-num">{filteredInvoices.length}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600">APPROVED</span>
                        <strong className="font-mono-num text-emerald-700">
                          {filteredInvoices.filter((i) => i.status === 'APPROVED').length}
                        </strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600">DRAFT (Belum Upload)</span>
                        <strong className="font-mono-num text-amber-700">
                          {filteredInvoices.filter((i) => i.status === 'DRAFT').length}
                        </strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600">AMENDED / CANCELLED</span>
                        <strong className="font-mono-num text-blue-700">
                          {
                            filteredInvoices.filter(
                              (i) => i.status === 'AMENDED' || i.status === 'CANCELLED'
                            ).length
                          }
                        </strong>
                      </div>
                    </div>
                  )}
                </div>

                {/* Bulk Process Dropdown */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => {
                      setBulkOpen((p) => !p);
                      setMonitoringOpen(false);
                    }}
                    className="inline-flex items-center gap-1.5 bg-[#1E2C5E] hover:bg-[#16224A] text-white font-semibold text-xs px-3.5 py-2 rounded-[7px] transition cursor-pointer"
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span>Bulk Process</span>
                    <ChevronDown className="w-3.5 h-3.5 opacity-80" />
                  </button>
                  {bulkOpen && (
                    <div className="absolute left-0 top-full mt-1.5 w-60 bg-white border border-[#E2E8F0] rounded-lg shadow-xl py-1.5 z-30 text-xs">
                      <button
                        type="button"
                        onClick={() => {
                          const firstDraft = filteredInvoices.find(
                            (i) => selectedIds.includes(i.id) && i.status === 'DRAFT'
                          ) || filteredInvoices.find((i) => i.status === 'DRAFT');
                          setBulkOpen(false);
                          if (firstDraft) setSignTarget(firstDraft);
                        }}
                        className="w-full text-left px-3.5 py-2 hover:bg-slate-50 font-semibold text-[#1E2C5E] cursor-pointer"
                      >
                        Upload / Tandatangani Faktur DRAFT
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          resetTableFilters();
                          setSelectedIds([]);
                          setBulkOpen(false);
                        }}
                        className="w-full text-left px-3.5 py-2 hover:bg-slate-50 text-slate-600 cursor-pointer"
                      >
                        Reset Semua Filter &amp; Pilihan
                      </button>
                    </div>
                  )}
                </div>
                </div>

                {/* Right-aligned Coretax Upload Faktur & Hapus Dokumen Buttons */}
                {normalizedTab === 'output' && (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={selectedDraftInvoices.length === 0}
                      onClick={() => setBulkSignTargets(selectedDraftInvoices)}
                      className="inline-flex items-center gap-1.5 bg-[#1E2C5E] hover:bg-[#16224A] disabled:opacity-45 text-white font-semibold text-xs px-3.5 py-2 rounded-[7px] transition cursor-pointer"
                    >
                      <Upload className="w-3.5 h-3.5 text-[#F7CA36]" />
                      <span>Upload Faktur{selectedDraftInvoices.length > 0 ? ` (${selectedDraftInvoices.length})` : ''}</span>
                    </button>
                    <button
                      type="button"
                      disabled={selectedDraftInvoices.length === 0}
                      onClick={async () => {
                        for (const inv of selectedDraftInvoices) {
                          await onInvoiceAction(inv.id, 'DELETE');
                        }
                        setSelectedIds([]);
                      }}
                      className="inline-flex items-center gap-1.5 bg-[#DC2626] hover:bg-[#B91C1C] disabled:opacity-45 text-white font-semibold text-xs px-3.5 py-2 rounded-[7px] transition cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Hapus Dokumen</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Official Coretax Icon Toolbar */}
              <div className="px-5">
                <CoretaxIconToolbar
                  onRefresh={resetTableFilters}
                  onExportCsv={() =>
                    downloadCsvFile(
                      `eFaktur_${normalizedTab}.csv`,
                      [
                        'NPWP Lawan Transaksi',
                        'Nama Lawan Transaksi',
                        'Kode Transaksi',
                        'Nomor Faktur',
                        'Tanggal',
                        'DPP',
                        'DPP Nilai Lain',
                        'PPN',
                        'Status',
                      ],
                      filteredInvoices.map((i) => [
                        i.counterpartyNpwp,
                        i.counterpartyName,
                        i.transactionCode,
                        i.invoiceNumber,
                        i.invoiceDate,
                        i.dppTotal,
                        i.dppOtherValue,
                        i.ppnTotal,
                        i.status,
                      ])
                    )
                  }
                  onExportExcel={() =>
                    downloadCsvFile(
                      `eFaktur_${normalizedTab}.csv`,
                      [
                        'NPWP Lawan Transaksi',
                        'Nama Lawan Transaksi',
                        'Kode Transaksi',
                        'Nomor Faktur',
                        'Tanggal',
                        'DPP',
                        'DPP Nilai Lain',
                        'PPN',
                        'Status',
                      ],
                      filteredInvoices.map((i) => [
                        i.counterpartyNpwp,
                        i.counterpartyName,
                        i.transactionCode,
                        i.invoiceNumber,
                        i.invoiceDate,
                        i.dppTotal,
                        i.dppOtherValue,
                        i.ppnTotal,
                        i.status,
                      ])
                    )
                  }
                  onPrintPdf={() => window.print()}
                  onToggleFilter={() => setShowColumnFilters((prev) => !prev)}
                  filterActive={showColumnFilters}
                />
              </div>

              {/* Official Coretax Golden-Yellow Data Table */}
              <div className="px-5 pb-4">
                <div className="border border-[#E2E8F0] rounded-[8px] overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-[11.5px] border-collapse">
                      <thead>
                        <tr className="bg-[#FCD34D] text-[#1E293B] font-bold border-b border-[#EAB308]/40">
                          <th className="px-2.5 py-2.5 w-9 text-center border-r border-white/50">
                            <input
                              type="checkbox"
                              checked={
                                paginatedInvoices.length > 0 &&
                                paginatedInvoices.every((i) => selectedIds.includes(i.id))
                              }
                              onChange={() => {
                                if (paginatedInvoices.every((i) => selectedIds.includes(i.id))) {
                                  setSelectedIds([]);
                                } else {
                                  setSelectedIds(paginatedInvoices.map((i) => i.id));
                                }
                              }}
                            />
                          </th>
                          {normalizedTab === 'input' ? (
                            <>
                              <th className="px-3 py-2.5 text-center whitespace-nowrap border-r border-white/50 w-16" />
                              <th className="px-3 py-2.5 text-left whitespace-nowrap border-r border-white/50">
                                <span className="inline-flex items-center gap-1">
                                  NPWP Penjual <ArrowUpDown className="w-3 h-3 opacity-60" />
                                </span>
                              </th>
                              <th className="px-3 py-2.5 text-left whitespace-nowrap border-r border-white/50">
                                Nama Penjual
                              </th>
                              <th className="px-3 py-2.5 text-left whitespace-nowrap border-r border-white/50">
                                <span className="inline-flex items-center gap-1">
                                  Nomor Faktur Pajak <ArrowUpDown className="w-3 h-3 opacity-60" />
                                </span>
                              </th>
                              <th className="px-3 py-2.5 text-left whitespace-nowrap border-r border-white/50">
                                <span className="inline-flex items-center gap-1">
                                  Tanggal Faktur Pajak <ArrowUpDown className="w-3 h-3 opacity-60" />
                                </span>
                              </th>
                              <th className="px-3 py-2.5 text-left whitespace-nowrap border-r border-white/50">
                                <span className="inline-flex items-center gap-1">
                                  Masa Pajak <ArrowUpDown className="w-3 h-3 opacity-60" />
                                </span>
                              </th>
                              <th className="px-3 py-2.5 text-center whitespace-nowrap border-r border-white/50">
                                <span className="inline-flex items-center gap-1">
                                  Tahun Pajak <ArrowUpDown className="w-3 h-3 opacity-60" />
                                </span>
                              </th>
                              <th className="px-3 py-2.5 text-center whitespace-nowrap border-r border-white/50">
                                Status Faktur
                              </th>
                              <th className="px-3 py-2.5 text-center whitespace-nowrap border-r border-white/50">
                                Status Pengkreditan
                              </th>
                              <th className="px-3 py-2.5 text-center whitespace-nowrap border-r border-white/50">
                                Masa Pengkreditan
                              </th>
                              <th className="px-3 py-2.5 text-center whitespace-nowrap border-r border-white/50">
                                Tahun Pengkreditan
                              </th>
                              <th className="px-3 py-2.5 text-right whitespace-nowrap border-r border-white/50">
                                Harga Jual/Penggantian/DPP
                              </th>
                              <th className="px-3 py-2.5 text-right whitespace-nowrap border-r border-white/50">
                                DPP Nilai Lain/DPP
                              </th>
                              <th className="px-3 py-2.5 text-right whitespace-nowrap border-r border-white/50">
                                PPN
                              </th>
                              <th className="px-3 py-2.5 text-right whitespace-nowrap border-r border-white/50">
                                PPnBM
                              </th>
                              <th className="px-3 py-2.5 text-left whitespace-nowrap border-r border-white/50">
                                Perekam
                              </th>
                              <th className="px-3 py-2.5 text-left whitespace-nowrap border-r border-white/50">
                                Referensi
                              </th>
                              <th className="px-3 py-2.5 text-center whitespace-nowrap border-r border-white/50">
                                Nomor SP2D
                              </th>
                              <th className="px-3 py-2.5 text-center whitespace-nowrap border-r border-white/50">
                                Valid
                              </th>
                              <th className="px-3 py-2.5 text-center whitespace-nowrap border-r border-white/50">
                                Dilaporkan
                              </th>
                              <th className="px-3 py-2.5 text-center whitespace-nowrap">
                                Dilaporkan oleh Penjual
                              </th>
                            </>
                          ) : (
                            <>
                              <th className="px-3 py-2.5 text-left whitespace-nowrap border-r border-white/50">
                                Aksi
                              </th>
                              <th className="px-3 py-2.5 text-left whitespace-nowrap border-r border-white/50">
                                <span className="inline-flex items-center gap-1">
                                  {isInputTab ? 'NPWP Penjual' : 'NPWP Pembeli / Identitas lainnya'}
                                  <ArrowUpDown className="w-3 h-3 opacity-60" />
                                </span>
                              </th>
                              <th className="px-3 py-2.5 text-left whitespace-nowrap border-r border-white/50">
                                {isInputTab ? 'Nama Penjual' : 'Nama Pembeli'}
                              </th>
                              <th className="px-3 py-2.5 text-left whitespace-nowrap border-r border-white/50">
                                <span className="inline-flex items-center gap-1">
                                  Kode Transaksi
                                  <ArrowUpDown className="w-3 h-3 opacity-60" />
                                </span>
                              </th>
                              <th className="px-3 py-2.5 text-left whitespace-nowrap border-r border-white/50">
                                Nomor Faktur Pajak
                              </th>
                              <th className="px-3 py-2.5 text-left whitespace-nowrap border-r border-white/50">
                                <span className="inline-flex items-center gap-1">
                                  Tanggal Faktur Pajak
                                  <ArrowUpDown className="w-3 h-3 opacity-60" />
                                </span>
                              </th>
                              <th className="px-3 py-2.5 text-left whitespace-nowrap border-r border-white/50">
                                <span className="inline-flex items-center gap-1">
                                  Masa Pajak
                                  <ArrowUpDown className="w-3 h-3 opacity-60" />
                                </span>
                              </th>
                              {normalizedTab === 'output' && (
                                <th className="px-3 py-2.5 text-center whitespace-nowrap border-r border-white/50">
                                  Tahun
                                </th>
                              )}
                              <th className="px-3 py-2.5 text-center whitespace-nowrap border-r border-white/50">
                                Status Faktur
                              </th>
                              {normalizedTab === 'output' && (
                                <th className="px-3 py-2.5 text-center whitespace-nowrap border-r border-white/50">
                                  ESignStatus
                                </th>
                              )}
                              <th className="px-3 py-2.5 text-right whitespace-nowrap border-r border-white/50">
                                {normalizedTab === 'output' ? 'Harga Jual/Penggantian/DPP' : 'Harga Jual / DPP'}
                              </th>
                              <th className="px-3 py-2.5 text-right whitespace-nowrap border-r border-white/50">
                                {normalizedTab === 'output' ? 'DPP Nilai Lain/DPP' : 'DPP Nilai Lain'}
                              </th>
                              <th className="px-3 py-2.5 text-right whitespace-nowrap border-r border-white/50">
                                PPN
                              </th>
                              {normalizedTab === 'output' && (
                                <>
                                  <th className="px-3 py-2.5 text-right whitespace-nowrap border-r border-white/50">
                                    PPnBM
                                  </th>
                                  <th className="px-3 py-2.5 text-left whitespace-nowrap border-r border-white/50">
                                    Penandatangan
                                  </th>
                                  <th className="px-3 py-2.5 text-left whitespace-nowrap border-r border-white/50">
                                    Referensi
                                  </th>
                                  <th className="px-3 py-2.5 text-center whitespace-nowrap border-r border-white/50">
                                    Metode Input
                                  </th>
                                  <th className="px-3 py-2.5 text-center whitespace-nowrap border-r border-white/50">
                                    Dilaporkan oleh Penjual
                                  </th>
                                  <th className="px-3 py-2.5 text-center whitespace-nowrap border-r border-white/50">
                                    Dilaporkan oleh Pemungut PPN
                                  </th>
                                  <th className="px-3 py-2.5 text-center whitespace-nowrap">
                                    IsShowClearName
                                  </th>
                                </>
                              )}
                              {isInputTab && !isReturTab && (
                                <th className="px-3 py-2.5 text-center whitespace-nowrap border-r border-white/50">
                                  Pengkreditan
                                </th>
                              )}
                              {isReturTab && (
                                <th className="px-3 py-2.5 text-right whitespace-nowrap border-r border-white/50">
                                  PPN Diretur
                                </th>
                              )}
                            </>
                          )}
                        </tr>

                        {/* Inline White Filter Row (Exact Coretax Pajak Keluaran Screenshot) */}
                        {showColumnFilters && (
                          <tr className="bg-white border-b border-[#E2E8F0]">
                            <th className="px-2 py-2 border-r border-slate-100" />
                            {normalizedTab === 'input' ? (
                              <>
                                <th className="px-2 py-2 border-r border-slate-100" />
                                <th className="px-2 py-2 border-r border-slate-100">
                                  <div className="flex items-center gap-1">
                                    <input
                                      type="text"
                                      value={npwpFilter}
                                      onChange={(e) => {
                                        setNpwpFilter(e.target.value);
                                        setPage(1);
                                      }}
                                      placeholder=""
                                      className="w-full min-w-[115px] border border-[#CBD5E1] rounded-[5px] px-2 py-1 text-[11px] font-normal focus:outline-none focus:border-[#1E2C5E]"
                                    />
                                    <Filter className="w-3 h-3 text-slate-400 shrink-0" />
                                  </div>
                                </th>
                                <th className="px-2 py-2 border-r border-slate-100">
                                  <input
                                    type="text"
                                    value={nameFilter}
                                    onChange={(e) => {
                                      setNameFilter(e.target.value);
                                      setPage(1);
                                    }}
                                    placeholder=""
                                    className="w-full min-w-[120px] border border-[#CBD5E1] rounded-[5px] px-2 py-1 text-[11px] font-normal focus:outline-none focus:border-[#1E2C5E]"
                                  />
                                </th>
                                <th className="px-2 py-2 border-r border-slate-100">
                                  <div className="flex items-center gap-1">
                                    <input
                                      type="text"
                                      value={invoiceNumFilter}
                                      onChange={(e) => {
                                        setInvoiceNumFilter(e.target.value);
                                        setPage(1);
                                      }}
                                      placeholder=""
                                      className="w-full min-w-[130px] border border-[#CBD5E1] rounded-[5px] px-2 py-1 text-[11px] font-normal focus:outline-none focus:border-[#1E2C5E]"
                                    />
                                    <Filter className="w-3 h-3 text-slate-400 shrink-0" />
                                  </div>
                                </th>
                                <th className="px-2 py-2 border-r border-slate-100" />
                                <th className="px-2 py-2 border-r border-slate-100">
                                  <select
                                    value={monthFilter}
                                    onChange={(e) => {
                                      setMonthFilter(e.target.value);
                                      setPage(1);
                                    }}
                                    className="w-full min-w-[95px] border border-[#CBD5E1] bg-white rounded-[5px] px-1.5 py-1 text-[11px] font-normal focus:outline-none focus:border-[#1E2C5E]"
                                  >
                                    <option value="ALL">Semua Masa</option>
                                    {MONTHS_ID.map((m, idx) => (
                                      <option key={m} value={String(idx + 1)}>
                                        {m}
                                      </option>
                                    ))}
                                  </select>
                                </th>
                                <th className="px-2 py-2 border-r border-slate-100" />
                                <th className="px-2 py-2 border-r border-slate-100">
                                  <select
                                    value={statusFilter}
                                    onChange={(e) => {
                                      setStatusFilter(e.target.value);
                                      setPage(1);
                                    }}
                                    className="w-full min-w-[105px] border border-[#CBD5E1] bg-white rounded-[5px] px-1.5 py-1 text-[11px] font-normal focus:outline-none focus:border-[#1E2C5E]"
                                  >
                                    <option value="ALL">Semua Status</option>
                                    <option value="APPROVED">APPROVED</option>
                                    <option value="CANCELLED">CANCELLED</option>
                                  </select>
                                </th>
                                <th className="px-2 py-2 border-r border-slate-100">
                                  <select
                                    value={creditFilter}
                                    onChange={(e) => {
                                      setCreditFilter(e.target.value);
                                      setPage(1);
                                    }}
                                    className="w-full min-w-[130px] border border-[#CBD5E1] bg-white rounded-[5px] px-1.5 py-1 text-[11px] font-normal focus:outline-none focus:border-[#1E2C5E]"
                                  >
                                    <option value="ALL">Semua Pengkreditan</option>
                                    <option value="CREDITED">Dapat Dikreditkan</option>
                                    <option value="UNCREDITED">Tidak Dapat Dikreditkan</option>
                                  </select>
                                </th>
                                <th className="px-2 py-2 border-r border-slate-100" />
                                <th className="px-2 py-2 border-r border-slate-100" />
                                <th className="px-2 py-2 border-r border-slate-100" />
                                <th className="px-2 py-2 border-r border-slate-100" />
                                <th className="px-2 py-2 border-r border-slate-100" />
                                <th className="px-2 py-2 border-r border-slate-100" />
                                <th className="px-2 py-2 border-r border-slate-100" />
                                <th className="px-2 py-2 border-r border-slate-100" />
                                <th className="px-2 py-2 border-r border-slate-100" />
                                <th className="px-2 py-2 border-r border-slate-100" />
                                <th className="px-2 py-2 border-r border-slate-100" />
                                <th className="px-2 py-2" />
                              </>
                            ) : (
                              <>
                                <th className="px-2 py-2 border-r border-slate-100" />
                                <th className="px-2 py-2 border-r border-slate-100">
                                  <div className="flex items-center gap-1">
                                    <input
                                      type="text"
                                      value={npwpFilter}
                                      onChange={(e) => {
                                        setNpwpFilter(e.target.value);
                                        setPage(1);
                                      }}
                                      placeholder="NPWP..."
                                      className="w-full min-w-[115px] border border-[#CBD5E1] rounded-[5px] px-2 py-1 text-[11px] font-normal focus:outline-none focus:border-[#1E2C5E]"
                                    />
                                    <Filter className="w-3 h-3 text-slate-400 shrink-0" />
                                  </div>
                                </th>
                                <th className="px-2 py-2 border-r border-slate-100">
                                  <input
                                    type="text"
                                    value={nameFilter}
                                    onChange={(e) => {
                                      setNameFilter(e.target.value);
                                      setPage(1);
                                    }}
                                    placeholder="Nama..."
                                    className="w-full min-w-[120px] border border-[#CBD5E1] rounded-[5px] px-2 py-1 text-[11px] font-normal focus:outline-none focus:border-[#1E2C5E]"
                                  />
                                </th>
                                <th className="px-2 py-2 border-r border-slate-100">
                                  <select
                                    value={txCodeFilter}
                                    onChange={(e) => {
                                      setTxCodeFilter(e.target.value);
                                      setPage(1);
                                    }}
                                    className="w-full min-w-[115px] border border-[#CBD5E1] bg-white rounded-[5px] px-1.5 py-1 text-[11px] font-normal focus:outline-none focus:border-[#1E2C5E]"
                                  >
                                    <option value="ALL">Pilih Kode Transaksi</option>
                                    {FAKTUR_TRANSACTION_CODES.map((c) => (
                                      <option key={c.code} value={c.code}>
                                        {c.code}
                                      </option>
                                    ))}
                                  </select>
                                </th>
                                <th className="px-2 py-2 border-r border-slate-100">
                                  <input
                                    type="text"
                                    value={invoiceNumFilter}
                                    onChange={(e) => {
                                      setInvoiceNumFilter(e.target.value);
                                      setPage(1);
                                    }}
                                    placeholder="Nomor Faktur..."
                                    className="w-full min-w-[130px] border border-[#CBD5E1] rounded-[5px] px-2 py-1 text-[11px] font-normal focus:outline-none focus:border-[#1E2C5E]"
                                  />
                                </th>
                                <th className="px-2 py-2 border-r border-slate-100" />
                                <th className="px-2 py-2 border-r border-slate-100">
                                  <select
                                    value={monthFilter}
                                    onChange={(e) => {
                                      setMonthFilter(e.target.value);
                                      setPage(1);
                                    }}
                                    className="w-full min-w-[95px] border border-[#CBD5E1] bg-white rounded-[5px] px-1.5 py-1 text-[11px] font-normal focus:outline-none focus:border-[#1E2C5E]"
                                  >
                                    <option value="ALL">Semua Masa</option>
                                    {MONTHS_ID.map((m, idx) => (
                                      <option key={m} value={String(idx + 1)}>
                                        {m}
                                      </option>
                                    ))}
                                  </select>
                                </th>
                                <th colSpan={isInputTab || isReturTab ? 4 : 3} className="px-2 py-2 border-r border-slate-100" />
                                <th className="px-2 py-2">
                                  <select
                                    value={statusFilter}
                                    onChange={(e) => {
                                      setStatusFilter(e.target.value);
                                      setPage(1);
                                    }}
                                    className="w-full min-w-[105px] border border-[#CBD5E1] bg-white rounded-[5px] px-1.5 py-1 text-[11px] font-normal focus:outline-none focus:border-[#1E2C5E]"
                                  >
                                    <option value="ALL">Semua Status</option>
                                    <option value="DRAFT">DRAFT</option>
                                    <option value="APPROVED">APPROVED</option>
                                    <option value="WAITING_FOR_AMENDMENT">WAITING_FOR_AMENDMENT</option>
                                    <option value="AMENDED">AMENDED</option>
                                    <option value="WAITING_FOR_CANCELLATION">WAITING_FOR_CANCELLATION</option>
                                    <option value="CANCELLED">CANCELLED</option>
                                  </select>
                                </th>
                              </>
                            )}
                          </tr>
                        )}
                      </thead>

                      <tbody className="divide-y divide-[#EEF2F6] bg-white">
                        {paginatedInvoices.length === 0 ? (
                          <tr>
                            <td colSpan={normalizedTab === 'input' ? 22 : 13} className="px-4 py-8 text-left text-slate-500">
                              Tidak ada data yang ditemukan.
                            </td>
                          </tr>
                        ) : (
                          paginatedInvoices.map((inv) => (
                            <tr key={inv.id} className="hover:bg-[#F8FAFC]">
                              <td className="px-2.5 py-2.5 text-center">
                                <input
                                  type="checkbox"
                                  checked={selectedIds.includes(inv.id)}
                                  onChange={() =>
                                    setSelectedIds((prev) =>
                                      prev.includes(inv.id)
                                        ? prev.filter((x) => x !== inv.id)
                                        : [...prev, inv.id]
                                    )
                                  }
                                />
                              </td>
                              {normalizedTab === 'input' ? (
                                <>
                                  <td className="px-3 py-2.5 whitespace-nowrap">
                                    <div className="flex items-center gap-1.5">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          navigator.clipboard.writeText(inv.invoiceNumber);
                                          setFakturSuccessToast(`Nomor Faktur ${inv.invoiceNumber} disalin ke clipboard`);
                                        }}
                                        className="p-1 rounded text-slate-500 hover:text-[#1E2C5E] cursor-pointer transition"
                                        title="Salin Nomor Faktur"
                                      >
                                        <Copy className="w-3.5 h-3.5" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => downloadFakturPajakPdf(inv, workspace.corporateTaxpayer)}
                                        className="w-5 h-5 rounded-[3px] bg-[#A83232] hover:bg-[#8B2626] text-white inline-flex items-center justify-center cursor-pointer transition shadow-xs"
                                        title="Download Faktur Pajak (PDF)"
                                      >
                                        <FileText className="w-3 h-3" />
                                      </button>
                                    </div>
                                  </td>
                                  <td className="px-3 py-2.5 font-mono-num text-slate-700 whitespace-nowrap">
                                    {inv.counterpartyNpwp}
                                  </td>
                                  <td className="px-3 py-2.5 font-semibold text-slate-800 whitespace-nowrap">
                                    {inv.counterpartyName}
                                  </td>
                                  <td className="px-3 py-2.5 font-mono-num whitespace-nowrap">
                                    <div className="font-bold text-[#1E2C5E]">{inv.invoiceNumber}</div>
                                  </td>
                                  <td className="px-3 py-2.5 font-mono-num whitespace-nowrap">
                                    {inv.invoiceDate ? `${inv.invoiceDate}T00:00:00` : '2026-11-18T00:00:00'}
                                  </td>
                                  <td className="px-3 py-2.5 whitespace-nowrap text-slate-700">
                                    {MONTHS_ID[Math.max(0, inv.taxPeriodMonth - 1)] || 'November'}
                                  </td>
                                  <td className="px-3 py-2.5 text-center font-mono-num whitespace-nowrap">
                                    {inv.taxPeriodYear || 2026}
                                  </td>
                                  <td className="px-3 py-2.5 text-center whitespace-nowrap">
                                    <span
                                      className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded border ${STATUS_BADGE[inv.status] || 'bg-slate-100 text-slate-700 border-slate-300'}`}
                                    >
                                      {inv.status}
                                    </span>
                                  </td>
                                  <td className="px-3 py-2.5 text-center whitespace-nowrap">
                                    <span
                                      className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded border ${
                                        inv.isCredited !== false
                                          ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                                          : 'bg-slate-100 text-slate-600 border-slate-300'
                                      }`}
                                    >
                                      {inv.isCredited !== false ? 'Dapat Dikreditkan' : 'Tidak Dapat Dikreditkan'}
                                    </span>
                                  </td>
                                  <td className="px-3 py-2.5 whitespace-nowrap text-slate-700 text-center">
                                    {MONTHS_ID[Math.max(0, inv.taxPeriodMonth - 1)] || 'November'}
                                  </td>
                                  <td className="px-3 py-2.5 text-center font-mono-num whitespace-nowrap">
                                    {inv.taxPeriodYear || 2026}
                                  </td>
                                  <td className="px-3 py-2.5 text-right font-mono-num whitespace-nowrap">
                                    {formatRp(inv.dppTotal)}
                                  </td>
                                  <td className="px-3 py-2.5 text-right font-mono-num whitespace-nowrap">
                                    {formatRp(inv.dppOtherValue || Math.round(inv.dppTotal * (11 / 12)))}
                                  </td>
                                  <td className="px-3 py-2.5 text-right font-mono-num font-bold text-[#1E2C5E] whitespace-nowrap">
                                    {formatRp(inv.ppnTotal)}
                                  </td>
                                  <td className="px-3 py-2.5 text-right font-mono-num whitespace-nowrap">
                                    0
                                  </td>
                                  <td className="px-3 py-2.5 text-left text-slate-800 whitespace-nowrap font-medium">
                                    {(inv as any).creatorName || (workspace.corporateTaxpayer as any).representativeName || workspace.individualTaxpayer.name || 'BAYU TRI RAHARDJO'}
                                  </td>
                                  <td className="px-3 py-2.5 text-left text-slate-700 whitespace-nowrap font-mono-num">
                                    {inv.referenceCode || 'Invoice No. 244/INV/MTI/XI/2026'}
                                  </td>
                                  <td className="px-3 py-2.5 text-center text-slate-500 whitespace-nowrap">
                                    -
                                  </td>
                                  <td className="px-3 py-2.5 text-center whitespace-nowrap">
                                    <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-300">
                                      VALID
                                    </span>
                                  </td>
                                  <td className="px-3 py-2.5 text-center text-slate-700 font-semibold whitespace-nowrap">
                                    NO
                                  </td>
                                  <td className="px-3 py-2.5 text-center text-slate-700 font-semibold whitespace-nowrap">
                                    NO
                                  </td>
                                </>
                              ) : (
                                <>
                                  <td className="px-3 py-2.5 whitespace-nowrap">
                                    <div className="flex items-center gap-1.5">
                                      {normalizedTab === 'output' ? (
                                    <>
                                      {/* 1. Tombol Edit (Icon Pensil - Coretax Asli) */}
                                      <button
                                        type="button"
                                        onClick={() => {
                                          if (inv.status === 'DRAFT') {
                                            setSignTarget(inv);
                                          } else {
                                            setAmendTarget(inv);
                                            setAmendDpp(inv.dppTotal);
                                          }
                                        }}
                                        className="w-6 h-6 rounded-full border border-sky-400 bg-sky-50 hover:bg-sky-100 text-sky-600 inline-flex items-center justify-center cursor-pointer transition shadow-xs"
                                        title={inv.status === 'DRAFT' ? 'Edit & Upload Faktur' : 'Ubah / Buat Faktur Pengganti'}
                                      >
                                        <Edit3 className="w-3.5 h-3.5" />
                                      </button>

                                      {/* 2. Tombol Batalin (Icon Kuning untuk Batalin - Coretax Asli) */}
                                      <button
                                        type="button"
                                        onClick={() => {
                                          if (inv.status === 'DRAFT') {
                                            onInvoiceAction(inv.id, 'DELETE');
                                          } else {
                                            onInvoiceAction(inv.id, 'REQUEST_CANCEL');
                                          }
                                        }}
                                        className="w-6 h-6 rounded-full border border-amber-400 bg-amber-50 hover:bg-amber-100 text-amber-600 inline-flex items-center justify-center cursor-pointer transition shadow-xs"
                                        title={inv.status === 'DRAFT' ? 'Hapus Draft Faktur' : 'Batalkan Faktur Pajak'}
                                      >
                                        <Ban className="w-3.5 h-3.5" />
                                      </button>

                                      {/* 3. Tombol PDF Langsung Download PDF Format Coretax 100% */}
                                      <button
                                        type="button"
                                        onClick={() => downloadFakturPajakPdf(inv, workspace.corporateTaxpayer)}
                                        className="w-6 h-6 rounded-[4px] bg-[#A83232] hover:bg-[#8B2626] text-white inline-flex items-center justify-center cursor-pointer transition shadow-xs"
                                        title="Download Faktur Pajak (PDF Resmi DJP)"
                                      >
                                        <FileText className="w-3.5 h-3.5" />
                                      </button>
                                    </>
                                  ) : (
                                    <>
                                      <button
                                        type="button"
                                        onClick={() =>
                                          onPrintDocument({
                                            type: 'FAKTUR',
                                            invoice: inv,
                                            seller: workspace.corporateTaxpayer,
                                          })
                                        }
                                        className="p-1.5 rounded border border-slate-200 hover:bg-slate-100 text-[#1D2B53] cursor-pointer"
                                        title="Pratinjau / Cetak Faktur"
                                      >
                                        <Eye className="w-3.5 h-3.5" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => downloadFakturPajakPdf(inv, workspace.corporateTaxpayer)}
                                        className="w-6 h-6 rounded-[4px] bg-[#A83232] hover:bg-[#8B2626] text-white inline-flex items-center justify-center cursor-pointer transition"
                                        title="Download Faktur Pajak (PDF)"
                                      >
                                        <FileText className="w-3.5 h-3.5" />
                                      </button>
                                    </>
                                  )}

                                  {inv.status === 'WAITING_FOR_AMENDMENT' && (
                                    <button
                                      type="button"
                                      onClick={() => onInvoiceAction(inv.id, 'APPROVE_AMEND')}
                                      className="inline-flex items-center gap-1 px-2 py-1 rounded bg-amber-500 hover:bg-amber-600 text-white text-[11px] font-bold cursor-pointer"
                                    >
                                      <CheckCircle2 className="w-3 h-3" />
                                      <span>Setujui Pengganti</span>
                                    </button>
                                  )}

                                  {inv.status === 'WAITING_FOR_CANCELLATION' && (
                                    <button
                                      type="button"
                                      onClick={() => onInvoiceAction(inv.id, 'APPROVE_CANCEL')}
                                      className="inline-flex items-center gap-1 px-2 py-1 rounded bg-red-600 hover:bg-red-700 text-white text-[11px] font-bold cursor-pointer"
                                    >
                                      <CheckCircle2 className="w-3 h-3" />
                                      <span>Konfirmasi Batal</span>
                                    </button>
                                  )}

                                  {isInputTab && !isReturTab && inv.status !== 'CANCELLED' && (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        onInvoiceAction(inv.id, 'TOGGLE_CREDIT', {
                                          isCredited: !inv.isCredited,
                                        })
                                      }
                                      className={`px-2.5 py-1 rounded text-[11px] font-bold border cursor-pointer ${
                                        inv.isCredited
                                          ? 'bg-slate-100 border-slate-300 text-slate-700 hover:bg-slate-200'
                                          : 'bg-[#1D2B53] border-[#1D2B53] text-[#F4C430] hover:bg-[#273A6E]'
                                      }`}
                                    >
                                      {inv.isCredited ? 'Batal Kreditkan' : 'Kreditkan Faktur'}
                                    </button>
                                  )}

                                  {isReturTab && inv.status !== 'CANCELLED' && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setReturnTarget(inv);
                                        setReturnAmount(
                                          inv.returnAmount || Math.round(inv.ppnTotal * 0.2)
                                        );
                                      }}
                                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-[#1D2B53] text-[#F4C430] text-[11px] font-bold cursor-pointer"
                                    >
                                      <RotateCcw className="w-3 h-3" />
                                      <span>Input Retur</span>
                                    </button>
                                  )}
                                </div>
                              </td>
                              <td className="px-3 py-2.5 font-mono-num text-slate-700 whitespace-nowrap">
                                {inv.counterpartyNpwp}
                              </td>
                              <td className="px-3 py-2.5 font-semibold text-slate-800 whitespace-nowrap">
                                {inv.counterpartyName}
                              </td>
                              <td className="px-3 py-2.5 font-mono-num text-center font-semibold text-[#1E2C5E]">
                                {inv.transactionCode}
                              </td>
                              <td className="px-3 py-2.5 font-mono-num whitespace-nowrap">
                                <div className="font-bold text-[#1E2C5E]">{inv.invoiceNumber}</div>
                                <div className="text-[10px] text-slate-500">Ref: {inv.referenceCode}</div>
                              </td>
                              <td className="px-3 py-2.5 font-mono-num whitespace-nowrap">
                                {inv.invoiceDate ? `${inv.invoiceDate}T00:00:00` : '2026-11-18T00:00:00'}
                              </td>
                              <td className="px-3 py-2.5 whitespace-nowrap text-slate-700">
                                {MONTHS_ID[Math.max(0, inv.taxPeriodMonth - 1)] || 'November'}
                              </td>
                              {normalizedTab === 'output' && (
                                <td className="px-3 py-2.5 text-center font-mono-num whitespace-nowrap">
                                  {inv.taxPeriodYear || 2026}
                                </td>
                              )}
                              <td className="px-3 py-2.5 text-center whitespace-nowrap border-r border-slate-100">
                                <span
                                  className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded border ${STATUS_BADGE[inv.status]}`}
                                >
                                  {inv.status}
                                </span>
                              </td>
                              {normalizedTab === 'output' && (
                                <td className="px-3 py-2.5 text-center whitespace-nowrap font-medium text-emerald-700">
                                  {inv.status === 'APPROVED' ? 'Done' : 'Pending'}
                                </td>
                              )}
                              <td className="px-3 py-2.5 text-right font-mono-num whitespace-nowrap">
                                {formatRp(inv.dppTotal)}
                              </td>
                              <td className="px-3 py-2.5 text-right font-mono-num whitespace-nowrap">
                                {formatRp(inv.dppOtherValue || Math.round(inv.dppTotal * (11 / 12)))}
                              </td>
                              <td className="px-3 py-2.5 text-right font-mono-num font-bold text-[#1E2C5E] whitespace-nowrap">
                                {formatRp(inv.ppnTotal)}
                              </td>
                              {normalizedTab === 'output' && (
                                <>
                                  <td className="px-3 py-2.5 text-right font-mono-num whitespace-nowrap">
                                    0
                                  </td>
                                  <td className="px-3 py-2.5 whitespace-nowrap text-slate-700 uppercase font-medium">
                                    {(workspace.corporateTaxpayer as any).representativeName || workspace.individualTaxpayer.name || 'ARIEF BASYARI'}
                                  </td>
                                  <td className="px-3 py-2.5 font-mono-num whitespace-nowrap text-slate-600">
                                    {inv.referenceCode || '-'}
                                  </td>
                                  <td className="px-3 py-2.5 text-center whitespace-nowrap text-slate-700">
                                    MANUAL
                                  </td>
                                  <td className="px-3 py-2.5 text-center whitespace-nowrap text-slate-600">
                                    False
                                  </td>
                                  <td className="px-3 py-2.5 text-center whitespace-nowrap text-slate-400">
                                    -
                                  </td>
                                  <td className="px-3 py-2.5 text-center whitespace-nowrap text-slate-400">
                                    -
                                  </td>
                                </>
                              )}
                              {isInputTab && !isReturTab && (
                                <td className="px-3 py-2.5 text-center whitespace-nowrap">
                                  <span
                                    className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded border ${
                                      inv.isCredited
                                        ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                                        : 'bg-slate-100 text-slate-600 border-slate-300'
                                    }`}
                                  >
                                    {inv.isCredited ? 'DIKREDITKAN (B2)' : 'TIDAK DIKREDITKAN (B3)'}
                                  </span>
                                </td>
                              )}
                              {isReturTab && (
                                <td className="px-3 py-2.5 text-right font-mono-num font-bold text-red-700 whitespace-nowrap">
                                  {inv.returnAmount > 0 ? formatRp(inv.returnAmount) : '-'}
                                  {inv.returnNoteNumber && (
                                    <div className="text-[10px] text-slate-500">
                                      {inv.returnNoteNumber}
                                    </div>
                                  )}
                                </td>
                              )}
                            </>
                          )}
                        </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>

                  <CoretaxPagination
                    totalItems={filteredInvoices.length}
                    page={page}
                    pageSize={pageSize}
                    onPageChange={setPage}
                    onPageSizeChange={setPageSize}
                    pageSizeOptions={[10, 25, 50]}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Authentic Coretax Add Transaction Modal (2-Column: Detail Barang/Jasa & PPN dan PPnBM) */}
      {addTxModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-[1px] flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-md shadow-2xl border border-slate-300 w-full max-w-3xl overflow-hidden my-6">
            <div className="bg-white px-5 py-3.5 flex items-center justify-between border-b border-slate-200">
              <h3 className="font-display font-bold text-[15px] text-[#1E2C5E]">Add Transaction</h3>
              <button
                type="button"
                onClick={() => setAddTxModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddTransactionLine} className="p-5 space-y-4 text-[12px]">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Left Column: Barang / Jasa Details */}
                <div className="space-y-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Tipe</label>
                    <div className="flex items-center gap-5">
                      <label className="inline-flex items-center gap-1.5 cursor-pointer font-medium">
                        <input
                          type="radio"
                          checked={txItemType === 'GOODS'}
                          onChange={() => setTxItemType('GOODS')}
                          className="accent-[#1E2C5E]"
                        />
                        <span>Barang</span>
                      </label>
                      <label className="inline-flex items-center gap-1.5 cursor-pointer font-medium">
                        <input
                          type="radio"
                          checked={txItemType === 'SERVICES'}
                          onChange={() => setTxItemType('SERVICES')}
                          className="accent-[#1E2C5E]"
                        />
                        <span>Jasa</span>
                      </label>
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block font-semibold text-slate-700">Kode</label>
                      <button
                        type="button"
                        onClick={() =>
                          downloadCsvFile(
                            'Daftar_Kode_Barang_Jasa_Coretax.csv',
                            ['Kode', 'Tipe', 'Nama Barang/Jasa'],
                            ITEM_CODES_CATALOG.map((it) => [it.code, it.type, it.name])
                          )
                        }
                        className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded bg-[#1E2C5E] text-white text-[10.5px] font-semibold cursor-pointer"
                      >
                        <span>Unduh Kode</span>
                      </button>
                    </div>
                    <select
                      value={itemCode}
                      onChange={(e) => {
                        setItemCode(e.target.value);
                        const found = ITEM_CODES_CATALOG.find((c) => c.code === e.target.value);
                        if (found) {
                          setItemName(found.name);
                          setTxItemType(found.type);
                        }
                      }}
                      className="w-full border border-slate-300 rounded px-3 py-1.5 bg-white"
                    >
                      {ITEM_CODES_CATALOG.map((it) => (
                        <option key={it.code} value={it.code}>
                          {it.code} — {it.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Nama <span className="text-rose-600">*</span>
                    </label>
                    <input
                      type="text"
                      value={itemName}
                      onChange={(e) => setItemName(e.target.value)}
                      className="w-full border border-slate-300 rounded px-3 py-1.5"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Satuan <span className="text-rose-600">*</span>
                      </label>
                      <input
                        type="text"
                        value={txUnit}
                        onChange={(e) => setTxUnit(e.target.value)}
                        className="w-full border border-slate-300 rounded px-3 py-1.5"
                        required
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">KUANTITAS</label>
                      <input
                        type="number"
                        min={1}
                        value={quantity}
                        onChange={(e) => setQuantity(Math.max(1, Number(e.target.value) || 1))}
                        className="w-full text-right border border-slate-300 rounded px-3 py-1.5 font-mono-num"
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Harga Satuan (Rp)</label>
                    <input
                      type="number"
                      min={0}
                      value={unitPrice}
                      onChange={(e) => setUnitPrice(Number(e.target.value) || 0)}
                      className="w-full text-right border border-slate-300 rounded px-3 py-1.5 font-mono-num"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Total Harga</label>
                      <input
                        type="text"
                        readOnly
                        value={formatRp(unitPrice * quantity)}
                        className="w-full text-right border border-slate-200 bg-slate-100 rounded px-3 py-1.5 font-mono-num"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Potongan Harga</label>
                      <input
                        type="number"
                        min={0}
                        value={discount}
                        onChange={(e) => setDiscount(Number(e.target.value) || 0)}
                        className="w-full text-right border border-slate-300 rounded px-3 py-1.5 font-mono-num"
                      />
                    </div>
                  </div>
                </div>

                {/* Right Column: PPN dan PPnBM */}
                <div className="space-y-3 bg-[#F8FAFC] border border-slate-200 rounded p-4">
                  <div className="font-bold text-[#1E2C5E] pb-1.5 border-b border-slate-200">
                    PPN dan PPnBM
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">DPP (Rp)</label>
                    <input
                      type="text"
                      readOnly
                      value={formatRp(previewCalc.dpp)}
                      className="w-full text-right border border-slate-200 bg-white rounded px-3 py-1.5 font-mono-num font-semibold"
                    />
                  </div>
                  {normalizedTab !== 'dok_lain_keluaran' && (
                    <div className="space-y-1.5">
                      <label className="inline-flex items-center gap-2 cursor-pointer font-semibold text-[#1E2C5E]">
                        <input
                          type="checkbox"
                          checked={!isLuxury}
                          onChange={(e) => setIsLuxury(!e.target.checked)}
                          className="accent-[#1E2C5E]"
                        />
                        <span>DPP Nilai Lain / DPP (11/12 — PMK 131/2024)</span>
                      </label>
                      <input
                        type="text"
                        readOnly
                        value={formatRp(previewCalc.dppOtherValue)}
                        className="w-full text-right border border-slate-200 bg-white rounded px-3 py-1.5 font-mono-num font-bold text-[#1E2C5E]"
                      />
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Tarif PPN (%)</label>
                      <input
                        type="text"
                        readOnly
                        value={normalizedTab === 'dok_lain_keluaran' ? '0%' : '12%'}
                        className="w-full text-right border border-slate-200 bg-slate-100 rounded px-3 py-1.5 font-mono-num font-bold"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">PPN (Rp)</label>
                      <input
                        type="text"
                        readOnly
                        value={formatRp(previewCalc.ppn)}
                        className="w-full text-right border border-emerald-200 bg-emerald-50 rounded px-3 py-1.5 font-mono-num font-extrabold text-emerald-800"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2.5 pt-1 border-t border-slate-200">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Tarif PPnBM (%)</label>
                      <input
                        type="number"
                        min={0}
                        max={200}
                        value={txPpnbmRate}
                        onChange={(e) => setTxPpnbmRate(Number(e.target.value) || 0)}
                        className="w-full text-right border border-slate-300 bg-white rounded px-3 py-1.5 font-mono-num"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">PPnBM (Rp)</label>
                      <input
                        type="text"
                        readOnly
                        value={formatRp(Math.round((previewCalc.dpp * txPpnbmRate) / 100))}
                        className="w-full text-right border border-slate-200 bg-slate-100 rounded px-3 py-1.5 font-mono-num"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setAddTxModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-[6px] font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#1E2C5E] hover:bg-[#152048] text-white font-bold rounded-[6px] cursor-pointer"
                >
                  Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Direct Upload SignModal from Inline Output Invoice Edit */}
      <SignModal
        open={uploadAfterCreateOpen}
        title="Tanda Tangan Dokumen"
        description={`Penandatanganan & Upload Faktur Pajak untuk ${counterpartyName} (Total PPN ${formatRp(draftTotals.ppn)}).`}
        signerName={activeTaxpayer.name}
        signerNik={activeTaxpayer.nikNpwp}
        confirmLabel="Konfirmasi Tanda Tangan"
        onClose={() => setUploadAfterCreateOpen(false)}
        onConfirm={async () => {
          await saveNewInvoice(true);
        }}
      />

      {/* Bulk Upload SignModal from Pajak Keluaran Table */}
      <SignModal
        open={bulkSignTargets.length > 0}
        title="Tanda Tangan Dokumen"
        description={`Upload dan tanda tangan elektronik untuk ${bulkSignTargets.length} Faktur Pajak DRAFT terpilih.`}
        signerName={activeTaxpayer.name}
        signerNik={activeTaxpayer.nikNpwp}
        confirmLabel="Konfirmasi Tanda Tangan"
        onClose={() => setBulkSignTargets([])}
        onConfirm={async () => {
          for (const inv of bulkSignTargets) {
            await onInvoiceAction(inv.id, 'APPROVE');
          }
          setBulkSignTargets([]);
          setSelectedIds([]);
        }}
      />

      {/* Amendment Modal */}
      {amendTarget && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-md shadow-xl border border-slate-300 w-full max-w-md overflow-hidden">
            <div className="bg-[#1D2B53] text-white px-5 py-3 flex items-center justify-between border-b-2 border-[#F4C430]">
              <h3 className="font-display font-bold text-sm">Faktur Pajak Pengganti (Amend)</h3>
              <button type="button" onClick={() => setAmendTarget(null)} className="cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-3 text-xs">
              <p className="text-slate-600">
                Ubah nilai DPP untuk Faktur <strong>{amendTarget.invoiceNumber}</strong>. Setelah diajukan, status berubah menjadi <code>WAITING_FOR_AMENDMENT</code>.
              </p>
              <div>
                <label className="block font-semibold text-[#1D2B53] mb-1">
                  Nilai Harga Jual / DPP Baru (Rp)
                </label>
                <input
                  type="number"
                  value={amendDpp}
                  onChange={(e) => setAmendDpp(Number(e.target.value))}
                  className="w-full border border-slate-300 rounded px-3 py-2 font-mono-num"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setAmendTarget(null)}
                  className="px-3.5 py-2 border border-slate-300 rounded cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    const c = calculatePpnLine(amendDpp, 1, 0, false);
                    await onInvoiceAction(amendTarget.id, 'REQUEST_AMEND', {
                      dppTotal: c.dpp,
                      dppOtherValue: c.dppOtherValue,
                      ppnTotal: c.ppn,
                    });
                    setAmendTarget(null);
                  }}
                  className="px-4 py-2 bg-[#1D2B53] text-white font-bold rounded cursor-pointer"
                >
                  Ajukan Faktur Pengganti
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Return Modal */}
      {returnTarget && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-md shadow-xl border border-slate-300 w-full max-w-md overflow-hidden">
            <div className="bg-[#1D2B53] text-white px-5 py-3 flex items-center justify-between border-b-2 border-[#F4C430]">
              <h3 className="font-display font-bold text-sm">Input Nota Retur Faktur Pajak</h3>
              <button type="button" onClick={() => setReturnTarget(null)} className="cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-[#1D2B53] mb-1">Nomor Nota Retur</label>
                <input
                  type="text"
                  value={returnNoteNumber}
                  onChange={(e) => setReturnNoteNumber(e.target.value)}
                  className="w-full border border-slate-300 rounded px-3 py-2 font-mono-num"
                />
              </div>
              <div>
                <label className="block font-semibold text-[#1D2B53] mb-1">
                  Nilai PPN Diretur (Maks {formatRp(returnTarget.ppnTotal)})
                </label>
                <input
                  type="number"
                  max={returnTarget.ppnTotal}
                  min={0}
                  value={returnAmount}
                  onChange={(e) => setReturnAmount(Number(e.target.value))}
                  className="w-full border border-slate-300 rounded px-3 py-2 font-mono-num"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setReturnTarget(null)}
                  className="px-3.5 py-2 border border-slate-300 rounded cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    await onInvoiceAction(returnTarget.id, 'INPUT_RETURN', {
                      returnAmount,
                      returnNoteNumber,
                    });
                    setReturnTarget(null);
                  }}
                  className="px-4 py-2 bg-[#1D2B53] text-white font-bold rounded cursor-pointer"
                >
                  Simpan Nota Retur
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Electronic Signing Modal */}
      <SignModal
        open={Boolean(signTarget)}
        title="Tanda Tangan Elektronik e-Faktur"
        description={`Anda akan menandatangani dan menerbitkan Nomor Seri Faktur Pajak untuk ${signTarget?.counterpartyName || ''} sebesar PPN ${formatRp(signTarget?.ppnTotal || 0)}.`}
        signerName={activeTaxpayer.name}
        signerNik={activeTaxpayer.nikNpwp}
        confirmLabel="Setujui & Terbitkan Faktur"
        onClose={() => setSignTarget(null)}
        onConfirm={async () => {
          if (signTarget) {
            await onInvoiceAction(signTarget.id, 'APPROVE');
          }
        }}
      />
    </div>
  );
};
