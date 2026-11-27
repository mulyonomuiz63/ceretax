import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
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
  Download,
  Edit3,
  Eye,
  FileText,
  Filter,
  Home,
  Info,
  Layers,
  Plus,
  RotateCcw,
  Search,
  Send,
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
import { GOODS_CODES, SERVICES_CODES } from '../data/efakturCodes.ts';
import { SignModal } from '../components/SignModal.tsx';
import { PrintablePayload } from '../components/DocumentPrintModal.tsx';
import { downloadFakturPajakPdf } from '../utils/fakturPajakPdfGenerator.ts';
import {
  CoretaxIconToolbar,
  CoretaxPagination,
  downloadCsvFile,
} from '../components/CoretaxTableChrome.tsx';
import { getAllKnownBuyers, KnownBuyerInfo } from '../lib/buyersStore.ts';

export const STANDARD_TAX_UNITS = [
  'Boks',
  'Drum',
  'Gram',
  'Joule',
  'Kilogram',
  'Kilowatt Jam',
  'Liter',
  'Meter',
  'Meter Kubik',
  'Meter Persegi',
  'Miligram',
  'Mililiter',
  'Milimeter',
  'Paket',
  'Pcs',
  'Set',
  'Ton',
  'Unit',
];

export const STANDARD_SERVICE_UNITS = [
  'Bahan',
  'Bulan',
  'Hari',
  'Jam',
  'Kegiatan',
  'Lainnya',
  'Laporan',
  'Menit',
  'Minggu',
  'Persen',
  'Tahun',
];

// Sample buyers master data loaded from shared store (including Admin additions)
const KNOWN_BUYERS: Record<string, KnownBuyerInfo> = getAllKnownBuyers();

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
  { key: 'APPROVED_REPORTED', label: 'APPROVED_REPORTED', color: '#607D8B' },
  { key: 'APPROVED_NOT_REPORTED', label: 'APPROVED_NOT_REPORTED', color: '#2B4C9B' },
  { key: 'CANCELED', label: 'CANCELED', color: '#0099F7' },
  { key: 'AMENDED', label: 'AMENDED', color: '#00B359' },
  { key: 'CREATED', label: 'CREATED', color: '#8CE000' },
  { key: 'SAVED_INVALID', label: 'SAVED_INVALID', color: '#A4B81E' },
  { key: 'DELETED', label: 'DELETED', color: '#FDE057' },
  { key: 'WAITING_FOR_CANCELLATION', label: 'WAITING_FOR_CANCELLATION', color: '#FF8C00' },
  { key: 'WAITING_FOR_AMENDMENT', label: 'WAITING_FOR_AMENDMENT', color: '#F43F1C' },
] as const;

export const EFakturModule: React.FC<EFakturModuleProps> = ({
  subTab,
  resetKey,
  onChangeSubTab,
  workspace,
  activeTaxpayer,
  accountMode,
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

  const isPersonalAccount = accountMode === 'INDIVIDUAL';
  const isImpersonateAccount = accountMode === 'CORPORATE';
  const navyBtnCls =
    'inline-flex items-center gap-1.5 bg-[#0D2357] hover:bg-[#091A42] text-white font-semibold text-[11.5px] px-3 py-2 rounded-[3px] transition cursor-pointer whitespace-nowrap';
  const redBtnCls =
    'inline-flex items-center gap-1.5 bg-[#DC5353] hover:bg-[#C64242] text-white font-semibold text-[11.5px] px-3 py-2 rounded-[3px] transition cursor-pointer whitespace-nowrap';
  const infoBadgeCls =
    'w-5 h-5 rounded-full bg-[#6B7280] hover:bg-[#4B5563] text-white inline-flex items-center justify-center cursor-pointer transition shrink-0';

  const [dashboardPeriod, setDashboardPeriod] = useState('2025-01');
  const [hoveredPieStatus, setHoveredPieStatus] = useState<string | null>(null);
  const [hiddenPieStatuses, setHiddenPieStatuses] = useState<string[]>([]);
  const dashboardMonthInputRef = React.useRef<HTMLInputElement | null>(null);
  const [npwpFilter, setNpwpFilter] = useState('');
  const [nameFilter, setNameFilter] = useState('');
  const [txCodeFilter, setTxCodeFilter] = useState('ALL');
  const [invoiceNumFilter, setInvoiceNumFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [monthFilter, setMonthFilter] = useState('ALL');
  const [yearFilter, setYearFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [refFilter, setRefFilter] = useState('');
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
  const [cancelModalTarget, setCancelModalTarget] = useState<TaxInvoice | null>(null);
  const [amendSignModalOpen, setAmendSignModalOpen] = useState(false);
  const [bulkSignTargets, setBulkSignTargets] = useState<TaxInvoice[]>([]);
  const [signTarget, setSignTarget] = useState<TaxInvoice | null>(null);
  const [returnTarget, setReturnTarget] = useState<TaxInvoice | null>(null);
  const [returnAmount, setReturnAmount] = useState(0);
  const [returnNoteNumber, setReturnNoteNumber] = useState('');
  const [amendTarget, setAmendTarget] = useState<TaxInvoice | null>(null);
  const [amendDpp, setAmendDpp] = useState(0);

  // Auto-dismiss success toast after 5 seconds
  useEffect(() => {
    if (fakturSuccessToast) {
      const timer = setTimeout(() => {
        setFakturSuccessToast(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [fakturSuccessToast]);

  // Reset detail modals / views when navigating or clicking menu
  useEffect(() => {
    setCreateModalOpen(false);
    setAddTxModalOpen(false);
    setSignTarget(null);
    setBulkSignTargets([]);
    setReturnTarget(null);
    setAmendTarget(null);
    setMonitoringOpen(false);
    setBulkOpen(false);
    setSelectedIds([]);
    setPage(1);
  }, [resetKey, subTab, activeTaxpayer.id]);

  // Inline Coretax Output Invoice Edit state
  const [editingInvoice, setEditingInvoice] = useState<TaxInvoice | null>(null);
  const [isViewingApproved, setIsViewingApproved] = useState(false);
  const [isAmendmentMode, setIsAmendmentMode] = useState(false);
  const [replacementFakturNumber, setReplacementFakturNumber] = useState('');
  const [editCollapsed, setEditCollapsed] = useState<Record<string, boolean>>({});
  const [isDownPayment, setIsDownPayment] = useState(false);
  const [isFinalPayment, setIsFinalPayment] = useState(false);
  const [txCode, setTxCode] = useState('04');
  const [invoiceDate, setInvoiceDate] = useState('2026-11-25');
  const [referenceCode, setReferenceCode] = useState('');
  const [buyerIdType, setBuyerIdType] = useState<'NPWP' | 'PASPOR' | 'NIK' | 'LAINNYA'>('NPWP');
  const [counterpartyNpwp, setCounterpartyNpwp] = useState('');
  const [counterpartyName, setCounterpartyName] = useState('');
  const [buyerAddress, setBuyerAddress] = useState('');
  const [buyerEmail, setBuyerEmail] = useState('');
  const [buyerCountry, setBuyerCountry] = useState('Indonesia');
  const [buyerIdtku, setBuyerIdtku] = useState('');
  const [buyerSuggestionsOpen, setBuyerSuggestionsOpen] = useState(false);
  const [knownBuyersMap, setKnownBuyersMap] = useState<Record<string, KnownBuyerInfo>>(() => getAllKnownBuyers());

  useEffect(() => {
    const handleUpdate = () => {
      setKnownBuyersMap(getAllKnownBuyers());
    };
    window.addEventListener('buyers-updated', handleUpdate);
    return () => window.removeEventListener('buyers-updated', handleUpdate);
  }, []);

  const matchingBuyers = useMemo(() => {
    const q = counterpartyNpwp.trim().toLowerCase();
    if (!q) return []; // Belum dimasukkan nomor ID -> dropdown TIDAK muncul
    const qClean = q.replace(/\D/g, '');
    return Object.values(knownBuyersMap).filter((b) => {
      const npwpClean = b.npwp.replace(/\D/g, '');
      return (qClean && npwpClean.includes(qClean)) || b.name.toLowerCase().includes(q);
    });
  }, [counterpartyNpwp, knownBuyersMap]);
  const [draftItems, setDraftItems] = useState<TaxInvoiceItem[]>([]);
  const [selectedDraftItemIds, setSelectedDraftItemIds] = useState<string[]>([]);

  // Add Transaction modal state
  const [txItemType, setTxItemType] = useState<'GOODS' | 'SERVICES'>('GOODS');
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [itemCode, setItemCode] = useState('');
  const [itemName, setItemName] = useState('');
  const [txUnit, setTxUnit] = useState('Kilogram');
  const [unitPrice, setUnitPrice] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [discount, setDiscount] = useState(0);
  const [isLuxury, setIsLuxury] = useState(false);
  const [txPpnbmRate, setTxPpnbmRate] = useState(0);
  const [customPpnbm, setCustomPpnbm] = useState<number | null>(null);
  const [ppnbmNominalFocused, setPpnbmNominalFocused] = useState(false);
  const [txCodeDropdownOpen, setTxCodeDropdownOpen] = useState(false);
  const [txCodeSearchQuery, setTxCodeSearchQuery] = useState('');
  const [unitDropdownOpen, setUnitDropdownOpen] = useState(false);
  const [unitSearchQuery, setUnitSearchQuery] = useState('');
  const [isOtherValue, setIsOtherValue] = useState(false);
  const [customDppOther, setCustomDppOther] = useState<number | null>(null);
  const [dppOtherFocused, setDppOtherFocused] = useState(false);
  const [ppnRatePercent, setPpnRatePercent] = useState(12);
  const [unitPriceFocused, setUnitPriceFocused] = useState(false);
  const [discountFocused, setDiscountFocused] = useState(false);
  const [ppnbmFocused, setPpnbmFocused] = useState(false);
  const [quantityFocused, setQuantityFocused] = useState(false);

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
        return 'Dasbor e-Faktur';
      case 'output':
        return 'e-Faktur — Pajak Keluaran';
      case 'input':
        return 'e-Faktur — Pajak Masukan';
      case 'retur_keluaran':
        return 'e-Faktur — Retur Pajak Keluaran';
      case 'retur_masukan':
        return 'e-Faktur — Retur Pajak Masukan';
      case 'dok_lain_keluaran':
        return 'Dokumen Lain Keluaran';
      case 'dok_lain_masukan':
        return 'Dokumen Lain Masukan';
      case 'retur_dok_lain_keluaran':
        return 'Retur Dokumen Lain Keluaran';
      case 'retur_dok_lain_masukan':
        return 'Retur Dokumen Lain Masukan';
      default:
        return 'e-Faktur';
    }
  }, [normalizedTab]);

  // Strictly isolate e-Faktur data to the currently active taxpayer (Akun Utama vs Akun Perwakilan)
  const accountInvoices = workspace.invoices.filter((inv) => inv.taxpayerId === activeTaxpayer.id);

  const filteredInvoices = accountInvoices.filter((inv) => {
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

    if (statusFilter !== 'ALL') {
      if (statusFilter === 'CREDITED') {
        if (inv.isCredited === false || inv.status === 'CANCELLED') return false;
      } else if (statusFilter === 'UNCREDITED') {
        if (inv.isCredited !== false || inv.status === 'CANCELLED') return false;
      } else if (inv.status !== statusFilter) {
        return false;
      }
    }
    if (txCodeFilter !== 'ALL' && inv.transactionCode !== txCodeFilter) return false;
    if (monthFilter !== 'ALL' && String(inv.taxPeriodMonth) !== monthFilter) return false;
    if (yearFilter.trim() && !String(inv.taxPeriodYear || '').includes(yearFilter.trim())) {
      return false;
    }
    if (dateFilter.trim() && !(inv.invoiceDate || '').includes(dateFilter.trim())) {
      return false;
    }
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
    if (
      refFilter.trim() &&
      !(inv.referenceCode || '').toLowerCase().includes(refFilter.trim().toLowerCase())
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
    setDateFilter('');
    setMonthFilter('ALL');
    setYearFilter('');
    setStatusFilter('ALL');
    setRefFilter('');
    setCreditFilter('ALL');
    setPage(1);
  };

  // Dashboard metrics for selected period (isolated to active taxpayer)
  const [dashYear, dashMonth] = dashboardPeriod.split('-').map(Number);
  const periodInvoices = accountInvoices.filter(
    (inv) => inv.taxPeriodYear === dashYear && inv.taxPeriodMonth === dashMonth
  );
  const periodPpnReturns = workspace.returns.filter(
    (r) =>
      r.taxpayerId === activeTaxpayer.id &&
      r.returnType === 'SPT_MASA_PPN' &&
      r.taxYear === dashYear &&
      r.taxPeriodMonth === dashMonth
  );
  const periodPpnBillings = workspace.billings.filter(
    (b) =>
      b.taxpayerId === activeTaxpayer.id &&
      b.kapCode === '411211' &&
      b.taxPeriodLabel.includes(String(dashYear))
  );

  const hasSubmittedPeriodPpn = periodPpnReturns.some((r) => r.status === 'SUBMITTED');

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const inv of periodInvoices) {
      let bucket: string = 'CREATED';
      if (inv.status === 'APPROVED') {
        bucket = hasSubmittedPeriodPpn ? 'APPROVED_REPORTED' : 'APPROVED_NOT_REPORTED';
      } else if (inv.status === 'CANCELLED') {
        bucket = 'CANCELED';
      } else if (inv.status === 'AMENDED') {
        bucket = 'AMENDED';
      } else if (inv.status === 'DRAFT') {
        bucket = 'CREATED';
      } else if (inv.status === 'WAITING_FOR_CANCELLATION') {
        bucket = 'WAITING_FOR_CANCELLATION';
      } else if (inv.status === 'WAITING_FOR_AMENDMENT') {
        bucket = 'WAITING_FOR_AMENDMENT';
      } else {
        bucket = String(inv.status);
      }
      counts[bucket] = (counts[bucket] || 0) + 1;
    }
    return counts;
  }, [periodInvoices, hasSubmittedPeriodPpn]);

  const pieSlices = useMemo(() => {
    const activeItems = DASHBOARD_STATUS_LEGEND.filter(
      (item) => (statusCounts[item.key] || 0) > 0 && !hiddenPieStatuses.includes(item.key)
    ).map((item) => ({
      ...item,
      count: statusCounts[item.key] || 0,
    }));
    const total = activeItems.reduce((sum, item) => sum + item.count, 0);
    if (total === 0) return [];

    const cx = 185;
    const cy = 138;
    const r = 84;
    let currentAngle = -Math.PI / 2;

    const rawSlices = activeItems.map((item) => {
      const fraction = item.count / total;
      const pct = Math.round(fraction * 100);
      const startAngle = currentAngle;
      const endAngle = currentAngle + fraction * Math.PI * 2;
      const midAngle = activeItems.length === 1 ? -Math.PI / 4 : (startAngle + endAngle) / 2;
      currentAngle = endAngle;

      const x1 = cx + r * Math.cos(startAngle);
      const y1 = cy + r * Math.sin(startAngle);
      const x2 = cx + r * Math.cos(endAngle);
      const y2 = cy + r * Math.sin(endAngle);
      const largeArc = fraction > 0.5 ? 1 : 0;
      const pathD = `M ${cx} ${cy} L ${x1.toFixed(2)} ${y1.toFixed(2)} A ${r} ${r} 0 ${largeArc} 1 ${x2.toFixed(2)} ${y2.toFixed(2)} Z`;

      const lx1 = cx + r * Math.cos(midAngle);
      const ly1 = cy + r * Math.sin(midAngle);
      const lx2 = cx + (r + 22) * Math.cos(midAngle);
      const ly2 = cy + (r + 22) * Math.sin(midAngle);
      const isRight = Math.cos(midAngle) >= 0;

      return {
        ...item,
        pct,
        isFullCircle: activeItems.length === 1,
        pathD,
        lx1,
        ly1,
        lx2,
        ly2,
        isRight,
      };
    });

    // Prevent label collisions on left and right sides
    const adjustSide = (sideSlices: typeof rawSlices) => {
      const sorted = [...sideSlices].sort((a, b) => a.ly2 - b.ly2);
      const minGap = 18;
      for (let i = 1; i < sorted.length; i++) {
        if (sorted[i].ly2 - sorted[i - 1].ly2 < minGap) {
          sorted[i].ly2 = sorted[i - 1].ly2 + minGap;
        }
      }
      for (const s of sorted) {
        s.ly2 = Math.max(16, Math.min(260, s.ly2));
      }
    };
    adjustSide(rawSlices.filter((s) => s.isRight));
    adjustSide(rawSlices.filter((s) => !s.isRight));

    return rawSlices.map((s) => ({
      ...s,
      lx3: s.isRight ? Math.min(314, Math.max(s.lx2 + 20, 290)) : Math.max(56, Math.min(s.lx2 - 20, 80)),
    }));
  }, [statusCounts, hiddenPieStatuses]);

  const selectKnownBuyer = (buyer: KnownBuyerInfo) => {
    setCounterpartyNpwp(buyer.npwp);
    setCounterpartyName(buyer.name);
    setBuyerAddress(buyer.address);
    setBuyerCountry(buyer.country || 'Indonesia');
    setBuyerEmail(buyer.email || '');
    setBuyerIdtku(buyer.idtku || '000000');
    setBuyerIdType('NPWP');
    setBuyerSuggestionsOpen(false);
  };

  const handleBuyerNpwpChange = (val: string) => {
    setCounterpartyNpwp(val);
    const clean = val.replace(/\D/g, '');
    const current = knownBuyersMap[clean] || knownBuyersMap[val];
    if (current) {
      setCounterpartyName(current.name);
      setBuyerAddress(current.address);
      setBuyerCountry(current.country || 'Indonesia');
      setBuyerEmail(current.email || '');
      setBuyerIdtku(current.idtku || '000000');
    } else if (clean.length >= 15) {
      setBuyerCountry('Indonesia');
      setBuyerIdtku('000000');
    }
  };

  const handleEditRowInvoice = (inv: TaxInvoice) => {
    setEditingInvoice(inv);
    setIsDownPayment(Boolean(inv.isDownPayment));
    setIsFinalPayment(Boolean(inv.isFinalPayment));

    let rawTx = (inv.transactionCode || '').trim();
    if (rawTx.length > 2) {
      rawTx = rawTx.slice(0, 2);
    } else if (rawTx.length === 1) {
      rawTx = `0${rawTx}`;
    }
    if (!rawTx && inv.invoiceNumber && !inv.invoiceNumber.startsWith('DRAFT') && inv.invoiceNumber.length >= 2) {
      rawTx = inv.invoiceNumber.slice(0, 2);
    }
    const matched = FAKTUR_TRANSACTION_CODES.find((c) => c.code === rawTx)?.code || rawTx || '01';
    setTxCode(matched);

    setInvoiceDate(inv.invoiceDate || new Date().toISOString().slice(0, 10));
    setReferenceCode(inv.referenceCode || '');
    setCounterpartyNpwp(inv.counterpartyNpwp || '');
    setCounterpartyName(inv.counterpartyName || '');
    setBuyerAddress(inv.counterpartyAddress || '');
    setBuyerEmail(inv.counterpartyEmail || '');
    setBuyerCountry('Indonesia');
    setBuyerIdtku('000000');
    setBuyerSuggestionsOpen(false);
    setDraftItems(
      inv.items && inv.items.length > 0
        ? inv.items
        : [
            {
              id: `item-existing-${inv.id}`,
              itemType: 'GOODS',
              itemCode: '000000',
              itemName: 'Barang',
              unit: 'Kilogram',
              unitPrice: inv.dppTotal,
              quantity: 1,
              discount: 0,
              isLuxury: inv.ppnbmTotal > 0,
              dpp: inv.dppTotal,
              dppOtherValue: inv.dppOtherValue,
              ppn: inv.ppnTotal,
              ppnbm: inv.ppnbmTotal,
            },
          ]
    );
    setSelectedDraftItemIds([]);

    if (inv.status === 'APPROVED') {
      setIsViewingApproved(true);
      const isAlreadyReplacement = Boolean(
        inv.isReplacement ||
        (inv.invoiceNumber && inv.invoiceNumber.length >= 4 && inv.invoiceNumber[3] === '1')
      );
      setIsAmendmentMode(isAlreadyReplacement);
      setReplacementFakturNumber(inv.invoiceNumber || '');
    } else {
      // DRAFT / Konsep Faktur: tetap Normal dan bisa diedit
      setIsViewingApproved(false);
      setIsAmendmentMode(false);
      setReplacementFakturNumber('');
    }

    setCreateModalOpen(true);
  };

  const handleOpenInvoiceEditor = () => {
    if (!isImpersonateAccount) {
      setFakturSuccessToast('Pembuatan Faktur Pajak hanya dapat dilakukan pada akun perusahaan (Impersonate).');
      return;
    }
    setEditingInvoice(null);
    setIsViewingApproved(false);
    setIsAmendmentMode(false);
    setReplacementFakturNumber('');
    setIsDownPayment(false);
    setIsFinalPayment(false);
    setTxCode('01');
    setInvoiceDate('2026-11-25');
    setReferenceCode('');
    setBuyerIdType('NPWP');
    setCounterpartyNpwp('');
    setCounterpartyName('');
    setBuyerAddress('');
    setBuyerEmail('');
    setBuyerCountry('Indonesia');
    setBuyerIdtku('');
    setBuyerSuggestionsOpen(false);
    setDraftItems([]);
    setSelectedDraftItemIds([]);
    setCreateModalOpen(true);
    setFakturSuccessToast('Berhasil membuat Faktur Pajak Keluaran baru!');
  };


  const formatCoretaxDate = (d?: string): string => {
    if (!d) return '25-11-2026';
    const clean = d.split('T')[0];
    const parts = clean.split('-');
    if (parts.length === 3) {
      return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
    return d;
  };

  const activeCatalogCodes = txItemType === 'GOODS' ? GOODS_CODES : SERVICES_CODES;
  const filteredCatalogCodes = useMemo(() => {
    const q = txCodeSearchQuery.trim().toLowerCase();
    if (!q) return activeCatalogCodes;
    return activeCatalogCodes.filter(
      (c) => c.code.toLowerCase().includes(q) || c.name.toLowerCase().includes(q)
    );
  }, [activeCatalogCodes, txCodeSearchQuery]);

  const filteredUnits = useMemo(() => {
    const list = txItemType === 'SERVICES' ? STANDARD_SERVICE_UNITS : STANDARD_TAX_UNITS;
    const q = unitSearchQuery.trim().toLowerCase();
    if (!q) return list;
    return list.filter((u) => u.toLowerCase().includes(q));
  }, [txItemType, unitSearchQuery]);

  const formatCoretaxDec = (val: number): string => {
    return Number(val || 0).toLocaleString('id-ID', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const modalTotalPrice = Math.max(0, unitPrice * quantity);
  const modalDpp = Math.max(0, modalTotalPrice - discount);
  const modalDppOtherCalculated = Math.round((11 / 12) * modalDpp);
  const effectiveDppOther = isOtherValue
    ? (customDppOther !== null ? customDppOther : modalDppOtherCalculated)
    : 0;
  const isExportDoc = normalizedTab === 'dok_lain_keluaran';
  const effectiveDppForPpn = isOtherValue ? effectiveDppOther : modalDpp;
  const modalPpn = isExportDoc
    ? 0
    : Math.round(effectiveDppForPpn * (ppnRatePercent / 100));
  const modalPpnbm = customPpnbm !== null ? customPpnbm : Math.round((modalDpp * txPpnbmRate) / 100);

  const handleOpenAddTxModal = () => {
    setEditingItemId(null);
    setItemCode('');
    setItemName('');
    setTxUnit(txItemType === 'SERVICES' ? 'Kegiatan' : 'Kilogram');
    setQuantity(1);
    setUnitPrice(0);
    setDiscount(0);
    setIsOtherValue(false);
    setCustomDppOther(null);
    setPpnRatePercent(12);
    setTxPpnbmRate(0);
    setCustomPpnbm(null);
    setTxCodeDropdownOpen(false);
    setTxCodeSearchQuery('');
    setUnitDropdownOpen(false);
    setUnitSearchQuery('');
    setUnitPriceFocused(false);
    setDiscountFocused(false);
    setPpnbmFocused(false);
    setQuantityFocused(false);
    setDppOtherFocused(false);
    setPpnbmNominalFocused(false);
    setAddTxModalOpen(true);
  };

  const handleEditItemLine = (it: TaxInvoiceItem) => {
    if (isViewingApproved) return;
    setEditingItemId(it.id);
    setTxItemType(it.itemType || 'GOODS');
    setItemCode(it.itemCode || '');
    setItemName(it.itemName || '');
    setTxUnit(it.unit || (it.itemType === 'SERVICES' ? 'Kegiatan' : 'Kilogram'));
    setUnitPrice(it.unitPrice || 0);
    setQuantity(it.quantity || 1);
    setDiscount(it.discount || 0);
    setIsOtherValue(Boolean(it.dppOtherValue && it.dppOtherValue > 0));
    setCustomDppOther(it.dppOtherValue || null);
    setPpnRatePercent(12);
    setTxPpnbmRate(it.isLuxury ? 20 : 0);
    setCustomPpnbm(it.ppnbm || null);
    setTxCodeDropdownOpen(false);
    setTxCodeSearchQuery('');
    setUnitDropdownOpen(false);
    setUnitSearchQuery('');
    setUnitPriceFocused(false);
    setDiscountFocused(false);
    setPpnbmFocused(false);
    setQuantityFocused(false);
    setDppOtherFocused(false);
    setPpnbmNominalFocused(false);
    setAddTxModalOpen(true);
  };

  const handleAddTransactionLine = (e: React.FormEvent) => {
    e.preventDefault();
    const nextItem: TaxInvoiceItem = {
      id: editingItemId || `item-${Date.now()}-${Math.floor(Math.random() * 999)}`,
      itemType: txItemType,
      itemCode: itemCode || (txItemType === 'GOODS' ? '000000' : '000000'),
      itemName: itemName || (txItemType === 'GOODS' ? 'Barang' : 'Jasa'),
      unit: txUnit || (txItemType === 'SERVICES' ? 'Kegiatan' : 'Kilogram'),
      unitPrice,
      quantity,
      discount,
      isLuxury: txPpnbmRate > 0 || modalPpnbm > 0,
      dpp: modalDpp,
      dppOtherValue: effectiveDppOther,
      ppn: modalPpn,
      ppnbm: modalPpnbm,
    };
    if (editingItemId) {
      setDraftItems((prev) =>
        prev.map((item) => (item.id === editingItemId ? nextItem : item))
      );
      setEditingItemId(null);
    } else {
      setDraftItems((prev) => [...prev, nextItem]);
    }
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

  const validateInvoiceCompleteness = (): boolean => {
    if (!txCode || !txCode.trim()) {
      setFakturSuccessToast('Faktur belum lengkap: Mohon pilih Kode Transaksi terlebih dahulu.');
      return false;
    }
    if (!counterpartyNpwp || counterpartyNpwp.replace(/\D/g, '').length < 15) {
      setFakturSuccessToast('Faktur belum lengkap: Mohon lengkapi Nomor Identitas WP (NPWP/NIK) pembeli.');
      return false;
    }
    if (!counterpartyName || !counterpartyName.trim()) {
      setFakturSuccessToast('Faktur belum lengkap: Mohon lengkapi Nama Pembeli.');
      return false;
    }
    if (draftItems.length === 0) {
      setFakturSuccessToast('Faktur belum lengkap: Mohon tambahkan minimal satu transaksi Barang/Jasa.');
      return false;
    }
    return true;
  };

  const saveNewInvoice = async (approveImmediately: boolean) => {
    if (approveImmediately && !validateInvoiceCompleteness()) return;
    if (draftItems.length === 0) {
      setFakturSuccessToast('Mohon tambahkan transaksi Barang/Jasa sebelum menyimpan.');
      return;
    }
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

    if (editingInvoice) {
      const cleanTx = (txCode || '01').padStart(2, '0').slice(0, 2);
      const yearDigits = (invoiceDate || '2026').slice(2, 4);
      let seqPart = '0000000001';
      if (editingInvoice.invoiceNumber && editingInvoice.invoiceNumber.length >= 16 && !editingInvoice.invoiceNumber.startsWith('DRAFT')) {
        seqPart = editingInvoice.invoiceNumber.slice(-10);
      } else {
        const existingSeq = workspace.invoices.length + 10;
        seqPart = String(existingSeq).padStart(10, '0');
      }

      // If in amendment mode (Pengganti), digit ke-4 is 1. If Normal, digit ke-4 is 0.
      const statusDigits = isAmendmentMode ? '01' : '00';
      const calculatedNum = `${cleanTx}${statusDigits}${yearDigits}${seqPart}`;
      const finalNum = approveImmediately
        ? calculatedNum
        : (editingInvoice.status === 'APPROVED' ? calculatedNum : '');

      await onInvoiceAction(editingInvoice.id, 'UPDATE', {
        transactionCode: txCode,
        isDownPayment,
        isFinalPayment,
        invoiceNumber: finalNum,
        referenceCode,
        counterpartyNpwp,
        counterpartyName,
        counterpartyAddress: buyerAddress,
        counterpartyEmail: buyerEmail,
        invoiceDate,
        taxPeriodMonth: parsedDate.getMonth() + 1 || 1,
        taxPeriodYear: parsedDate.getFullYear() || 2026,
        items: draftItems,
        dppTotal: draftTotals.dpp,
        dppOtherValue: draftTotals.dppOtherValue,
        ppnTotal: draftTotals.ppn,
        ppnbmTotal: draftTotals.ppnbm,
        status: finalStatus,
        isReplacement: isAmendmentMode,
        signedAt: finalStatus === 'APPROVED' ? new Date().toISOString() : undefined,
      });

      setFakturSuccessToast(
        finalStatus === 'APPROVED'
          ? (isAmendmentMode
              ? `Faktur Pajak Pengganti No. ${calculatedNum} berhasil di-upload dan disetujui!`
              : `Faktur Pajak No. ${calculatedNum} berhasil di-upload dan disetujui!`)
          : (isAmendmentMode
              ? 'Konsep Faktur Pajak Pengganti berhasil disimpan!'
              : 'Konsep Faktur Pajak berhasil disimpan!')
      );
    } else {
      const invNum = isExport
        ? `PEB-${invoiceDate.slice(0, 4)}-${String(Math.floor(100000 + Math.random() * 899999))}`
        : approveImmediately && direction === 'OUTPUT'
          ? generateFakturNumber(txCode, workspace.invoices.length + 11, isAmendmentMode)
          : '';
      await onCreateInvoice({
        taxpayerId: activeTaxpayer.id,
        direction,
        transactionCode: isExport ? '01' : txCode,
        isDownPayment,
        isFinalPayment,
        invoiceNumber: invNum,
        referenceCode,
        counterpartyNpwp,
        counterpartyName,
        counterpartyAddress: buyerAddress,
        counterpartyEmail: buyerEmail,
        invoiceDate,
        taxPeriodMonth: parsedDate.getMonth() + 1 || 1,
        taxPeriodYear: parsedDate.getFullYear() || 2026,
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
      setFakturSuccessToast(
        finalStatus === 'APPROVED'
          ? 'Berhasil membuat Faktur Pajak Keluaran baru!'
          : 'Berhasil memperbarui transaksi!'
      );
    }

    setCreateModalOpen(false);
    setUploadAfterCreateOpen(false);
    setEditingInvoice(null);
    setIsViewingApproved(false);
    setIsAmendmentMode(false);
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
        <div className="fixed top-14 left-1/2 -translate-x-1/2 z-50 bg-white border border-slate-200/90 shadow-[0_10px_35px_rgba(0,0,0,0.14)] rounded-[4px] border-l-[5px] border-l-[#22C55E] min-w-[340px] max-w-[440px] overflow-hidden transition-all duration-200 animate-in fade-in slide-in-from-top-2">
          <div className="px-5 py-3.5">
            <div className="flex items-center justify-between gap-4">
              <span className="font-bold text-[13.5px] text-[#1E293B] leading-none">Success</span>
              <button
                type="button"
                onClick={() => setFakturSuccessToast(null)}
                className="text-slate-400 hover:text-slate-700 transition cursor-pointer p-0.5"
                title="Tutup"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <p className="text-[12px] text-[#475569] mt-1.5 leading-snug">
              {fakturSuccessToast}
            </p>
          </div>
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
                          setCreateModalOpen(false);
                          setEditingInvoice(null);
                          setIsViewingApproved(false);
                          setIsAmendmentMode(false);
                          setAddTxModalOpen(false);
                          setSignTarget(null);
                          setCancelModalTarget(null);
                          setBulkSignTargets([]);
                          setBuyerSuggestionsOpen(false);
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
              {/* Top Bar: Dasbor e-Faktur + Month/Year Picker */}
              <div className="bg-white border border-[#E2E8F0] rounded-lg px-5 py-3.5 flex flex-wrap items-center justify-between gap-3">
                <h1 className="font-display font-bold text-[16px] text-[#1D2B53]">
                  Dasbor e-Faktur
                </h1>
                <div
                  onClick={() => {
                    const el = dashboardMonthInputRef.current;
                    if (!el) return;
                    if (typeof el.showPicker === 'function') {
                      try {
                        el.showPicker();
                      } catch {
                        el.focus();
                      }
                    } else {
                      el.focus();
                    }
                  }}
                  className="relative inline-flex items-center border border-slate-300 rounded-[4px] overflow-hidden bg-white cursor-pointer hover:border-[#1D2B53] transition"
                >
                  <span className="px-3 py-1.5 text-[12px] font-medium text-slate-600 min-w-[140px] select-none">
                    {MONTHS_ID[(dashMonth || 1) - 1]} {dashYear}
                  </span>
                  <span className="px-2.5 py-2 bg-[#1D2B53] text-white flex items-center justify-center">
                    <Calendar className="w-3.5 h-3.5" />
                  </span>
                  <input
                    ref={dashboardMonthInputRef}
                    type="month"
                    aria-label="Pilih Masa Pajak Dasbor"
                    value={dashboardPeriod}
                    onChange={(e) => {
                      if (e.target.value) setDashboardPeriod(e.target.value);
                    }}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                </div>
              </div>

              {/* 2-Column Dashboard Cards */}
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                {/* Card 1: Dasbor Faktur Pajak */}
                <div className="bg-white border border-[#E2E8F0] rounded-lg p-5 min-h-[340px] flex flex-col min-w-0">
                  <h2 className="font-display font-semibold text-[13px] text-[#1D2B53] mb-3">
                    Dasbor Faktur Pajak
                  </h2>

                  {periodInvoices.length === 0 ? (
                    <div className="flex-1 flex items-start justify-center pt-10 text-[12px] text-slate-600 gap-2">
                      <span className="w-4 h-4 rounded-full bg-[#F4C430] text-white inline-flex items-center justify-center text-[10px] font-extrabold shrink-0 mt-0.5">
                        !
                      </span>
                      <span>Tidak Ada Data Tersedia!</span>
                    </div>
                  ) : (
                    <div className="flex-1 flex flex-col sm:flex-row items-center justify-between gap-3 min-w-0">
                      {/* Interactive Coretax SVG Pie Chart with Leader Lines */}
                      <div className="relative flex-1 w-full flex items-center justify-center min-w-0">
                        {pieSlices.length === 0 ? (
                          <div className="py-12 text-[12px] text-slate-500">
                            Semua status disembunyikan. Klik legend untuk menampilkan kembali.
                          </div>
                        ) : (
                          <svg
                            viewBox="0 0 370 276"
                            className="w-full max-w-[370px] h-auto overflow-visible select-none"
                            role="img"
                            aria-label="Grafik Status Faktur Pajak"
                          >
                            {pieSlices.map((slice) => {
                              const isHovered = hoveredPieStatus === slice.key;
                              return (
                                <g
                                  key={slice.key}
                                  className="cursor-pointer transition-opacity"
                                  opacity={hoveredPieStatus && !isHovered ? 0.55 : 1}
                                  onMouseEnter={() => setHoveredPieStatus(slice.key)}
                                  onMouseLeave={() => setHoveredPieStatus(null)}
                                >
                                  {slice.isFullCircle ? (
                                    <circle
                                      cx={185}
                                      cy={138}
                                      r={isHovered ? 88 : 84}
                                      fill={slice.color}
                                    />
                                  ) : (
                                    <path
                                      d={slice.pathD}
                                      fill={slice.color}
                                      stroke="#FFFFFF"
                                      strokeWidth={0.6}
                                    />
                                  )}
                                  <polyline
                                    points={`${slice.lx1.toFixed(1)},${slice.ly1.toFixed(1)} ${slice.lx2.toFixed(1)},${slice.ly2.toFixed(1)} ${slice.lx3.toFixed(1)},${slice.ly2.toFixed(1)}`}
                                    fill="none"
                                    stroke={slice.color}
                                    strokeWidth="1.2"
                                    opacity="0.85"
                                  />
                                  <text
                                    x={slice.isRight ? slice.lx3 + 4 : slice.lx3 - 4}
                                    y={slice.ly2 + 3.5}
                                    textAnchor={slice.isRight ? 'start' : 'end'}
                                    className="fill-[#1E293B] text-[10px] font-semibold font-mono-num"
                                  >
                                    {slice.count} ({slice.pct}%)
                                  </text>
                                </g>
                              );
                            })}
                          </svg>
                        )}

                        {hoveredPieStatus && (() => {
                          const hoveredItem = pieSlices.find((s) => s.key === hoveredPieStatus);
                          if (!hoveredItem) return null;
                          return (
                            <div className="pointer-events-none absolute bottom-1 left-1/2 -translate-x-1/2 bg-[#1D2B53] text-white text-[11px] px-2.5 py-1 rounded shadow-md whitespace-nowrap flex items-center gap-1.5">
                              <span
                                className="w-2.5 h-2.5 rounded-[2px] shrink-0"
                                style={{ backgroundColor: hoveredItem.color }}
                              />
                              <span className="font-semibold">{hoveredItem.label}:</span>
                              <span className="font-mono-num">
                                {hoveredItem.count} ({hoveredItem.pct}%)
                              </span>
                            </div>
                          );
                        })()}
                      </div>

                      {/* Right Status Legend Box (Exact Official Coretax 9 Statuses) */}
                      <div className="w-full sm:w-[146px] shrink-0 self-start mt-2">
                        <div className="text-[11px] font-bold text-[#1D2B53] mb-1.5 pl-0.5">
                          Status
                        </div>
                        <div className="bg-[#F3F4F6] rounded-[4px] px-2.5 py-2">
                          <ul className="space-y-1.5 text-[9.5px]">
                            {DASHBOARD_STATUS_LEGEND.map((item) => {
                              const count = statusCounts[item.key] || 0;
                              const isHidden = hiddenPieStatuses.includes(item.key);
                              return (
                                <li key={item.key}>
                                  <button
                                    type="button"
                                    title={`${item.label} (${count})`}
                                    onClick={() => {
                                      setHiddenPieStatuses((prev) =>
                                        prev.includes(item.key)
                                          ? prev.filter((k) => k !== item.key)
                                          : [...prev, item.key]
                                      );
                                    }}
                                    onMouseEnter={() => {
                                      if (count > 0 && !isHidden) setHoveredPieStatus(item.key);
                                    }}
                                    onMouseLeave={() => setHoveredPieStatus(null)}
                                    className={`w-full flex items-center gap-1.5 text-left truncate cursor-pointer transition ${
                                      isHidden
                                        ? 'opacity-40 line-through text-slate-400'
                                        : count > 0
                                          ? 'text-slate-600 hover:text-[#1D2B53]'
                                          : 'text-slate-400'
                                    }`}
                                  >
                                    <span
                                      className="w-2.5 h-2.5 rounded-[2px] shrink-0"
                                      style={{ backgroundColor: item.color }}
                                    />
                                    <span className="truncate uppercase tracking-tight">
                                      {item.label}
                                    </span>
                                  </button>
                                </li>
                              );
                            })}
                          </ul>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Card 2: Dasbor Pembayaran dan Pelaporan SPT Masa PPN */}
                <div className="bg-white border border-[#E2E8F0] rounded-lg p-5 min-h-[340px] flex flex-col min-w-0">
                  <h2 className="font-display font-semibold text-[13px] text-[#1D2B53] mb-3">
                    Dasbor Pembayaran dan Pelaporan SPT Masa PPN
                  </h2>
                  {periodPpnReturns.length === 0 ? (
                    <div className="flex-1 flex items-start justify-center pt-10 text-[12px] text-slate-600 gap-2">
                      <span className="w-4 h-4 rounded-full bg-[#F4C430] text-white inline-flex items-center justify-center text-[10px] font-extrabold shrink-0 mt-0.5">
                        !
                      </span>
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

              {/* Bottom Full-Width Card: Dasbor Pembayaran sebelum Pelaporan SPT Masa PPN */}
              <div className="bg-white border border-[#E2E8F0] rounded-lg p-5 min-h-[155px] flex flex-col">
                <h2 className="font-display font-semibold text-[13px] text-[#1D2B53] mb-3">
                  Dasbor Pembayaran sebelum Pelaporan SPT Masa PPN
                </h2>
                {periodPpnBillings.length === 0 ? (
                  <div className="flex-1 flex items-center justify-center text-[12px] text-slate-600 gap-2 py-6">
                    <span className="w-4 h-4 rounded-full bg-[#F4C430] text-white inline-flex items-center justify-center text-[10px] font-extrabold shrink-0">
                      !
                    </span>
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
            /* INLINE CORETAX "OUTPUT INVOICE EDIT" SCREEN                   */
            /* ============================================================= */
            <div className="space-y-4">
              <div className="text-[12px] text-slate-500 flex items-center gap-1.5 pt-1">
                <Home className="w-3.5 h-3.5 text-slate-400" />
                <span
                  className="hover:underline cursor-pointer"
                  onClick={() => {
                    setCreateModalOpen(false);
                    setEditingInvoice(null);
                    setIsViewingApproved(false);
                    onChangeSubTab('dashboard');
                  }}
                >
                  Beranda
                </span>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                <span
                  className="hover:underline cursor-pointer"
                  onClick={() => {
                    setCreateModalOpen(false);
                    setEditingInvoice(null);
                    setIsViewingApproved(false);
                  }}
                >
                  e-Faktur
                </span>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-slate-800 font-medium">Edit Output Invoice</span>
              </div>

              <h1 className="font-display font-bold text-[18px] text-[#1D2B53]">
                Output Invoice Edit
              </h1>

              {/* Section 1: Dokumen Transaksi */}
              <div className="border border-[#E2E8F0] rounded-[4px] bg-white p-5 shadow-xs">
                <div
                  onClick={() => setEditCollapsed((p) => ({ ...p, doc: !p.doc }))}
                  className="flex items-center gap-2 cursor-pointer font-bold text-[13px] text-slate-800 pb-3"
                >
                  {editCollapsed.doc ? <ChevronRight className="w-4 h-4 text-slate-600" /> : <ChevronDown className="w-4 h-4 text-slate-600" />}
                  <span>Dokumen Transaksi</span>
                </div>
                {!editCollapsed.doc && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-x-6 gap-y-4 pt-1">
                    {/* 1. Uang Muka */}
                    <div>
                      <label className="block text-slate-700 font-normal text-[12px] mb-2">Uang Muka</label>
                      <div className="h-[34px] flex items-center">
                        <input
                          type="checkbox"
                          checked={isDownPayment}
                          disabled={isFinalPayment || isViewingApproved}
                          onChange={(e) => {
                            setIsDownPayment(e.target.checked);
                            if (e.target.checked) setIsFinalPayment(false);
                          }}
                          className="w-4 h-4 rounded border-slate-300 text-blue-600 accent-[#0088FF] cursor-pointer"
                        />
                      </div>
                    </div>

                    {/* 2. Pelunasan */}
                    <div>
                      <label className="block text-slate-700 font-normal text-[12px] mb-2">Pelunasan</label>
                      <div className="h-[34px] flex items-center">
                        <input
                          type="checkbox"
                          checked={isFinalPayment}
                          disabled={isDownPayment || isViewingApproved}
                          onChange={(e) => {
                            setIsFinalPayment(e.target.checked);
                            if (e.target.checked) setIsDownPayment(false);
                          }}
                          className="w-4 h-4 rounded border-slate-300 text-blue-600 accent-[#0088FF] cursor-pointer"
                        />
                      </div>
                    </div>

                    {/* 3. Nomor Faktur */}
                    <div>
                      <label className="block text-slate-700 font-normal text-[12px] mb-1">Nomor Faktur</label>
                      <input
                        type="text"
                        disabled
                        placeholder="Nomor Faktur"
                        value={(() => {
                          if (!editingInvoice) return '';
                          const cleanTx = (txCode || '01').padStart(2, '0').slice(0, 2);
                          const statusDigits = isAmendmentMode ? '01' : '00';
                          const yearDigits = (invoiceDate || '2026').slice(2, 4);
                          const origNum = editingInvoice.invoiceNumber || replacementFakturNumber || '';
                          let seqPart = '0000000001';
                          if (origNum && origNum.length >= 16 && !origNum.startsWith('DRAFT')) {
                            seqPart = origNum.slice(-10);
                          }
                          return `${cleanTx}${statusDigits}${yearDigits}${seqPart}`;
                        })()}
                        className="w-full border border-slate-200 bg-[#F8FAFC] rounded-[3px] px-3 py-1.5 h-[34px] text-[12px] text-slate-700 font-mono-num placeholder:text-slate-400 cursor-not-allowed"
                      />
                    </div>

                    {/* 4. Kode Transaksi * */}
                    <div>
                      <label className="block text-slate-700 font-normal text-[12px] mb-1">
                        Kode Transaksi <span className="text-rose-600">*</span>
                      </label>
                      <select
                        value={txCode}
                        disabled={isViewingApproved}
                        onChange={(e) => setTxCode(e.target.value)}
                        className="w-full border border-slate-300 rounded-[3px] px-3 py-1.5 h-[34px] text-[12px] bg-white text-slate-800 disabled:bg-[#F8FAFC]"
                      >
                        <option value="" disabled>Pilih Kode Transaksi</option>
                        {FAKTUR_TRANSACTION_CODES.map((c) => (
                          <option key={c.code} value={c.code}>
                            {c.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* 5. Tanggal Faktur */}
                    <div>
                      <label className="block text-slate-700 font-normal text-[12px] mb-1">
                        Tanggal Faktur
                      </label>
                      <input
                        type="date"
                        value={invoiceDate}
                        disabled={isViewingApproved}
                        onChange={(e) => setInvoiceDate(e.target.value)}
                        className="w-full border border-slate-300 rounded-[3px] px-3 py-1.5 h-[34px] text-[12px] font-mono-num bg-white text-slate-800 disabled:bg-[#F8FAFC]"
                      />
                    </div>

                    {/* 6. Jenis Faktur * */}
                    <div>
                      <label className="block text-slate-700 font-normal text-[12px] mb-1">
                        Jenis Faktur <span className="text-rose-600">*</span>
                      </label>
                      <select
                        disabled
                        value={isAmendmentMode ? 'Pengganti' : 'Normal'}
                        className="w-full border border-slate-300 rounded-[3px] px-3 py-1.5 h-[34px] text-[12px] bg-[#F8FAFC] text-slate-700 cursor-not-allowed"
                      >
                        <option value="Normal">Normal</option>
                        <option value="Pengganti">Pengganti</option>
                      </select>
                    </div>

                    {/* 7. Masa Pajak * */}
                    <div>
                      <label className="block text-slate-700 font-normal text-[12px] mb-1">
                        Masa Pajak <span className="text-rose-600">*</span>
                      </label>
                      <select
                        disabled
                        value={MONTHS_ID[Math.max(0, (new Date(invoiceDate).getMonth() || 0))]}
                        className="w-full border border-slate-200 bg-[#F8FAFC] rounded-[3px] px-3 py-1.5 h-[34px] text-[12px] text-slate-700 cursor-not-allowed"
                      >
                        {MONTHS_ID.map((m) => (
                          <option key={m} value={m}>{m}</option>
                        ))}
                      </select>
                    </div>

                    {/* 8. Tahun * */}
                    <div>
                      <label className="block text-slate-700 font-normal text-[12px] mb-1">
                        Tahun <span className="text-rose-600">*</span>
                      </label>
                      <input
                        type="text"
                        disabled
                        value={new Date(invoiceDate).getFullYear() || 2026}
                        className="w-full border border-slate-200 bg-[#F8FAFC] rounded-[3px] px-3 py-1.5 h-[34px] text-[12px] text-slate-700 font-mono-num cursor-not-allowed"
                      />
                    </div>

                    {/* 9. Referensi */}
                    <div>
                      <label className="block text-slate-700 font-normal text-[12px] mb-1">Referensi</label>
                      <input
                        type="text"
                        placeholder="Keterangan"
                        value={referenceCode}
                        disabled={isViewingApproved}
                        onChange={(e) => setReferenceCode(e.target.value)}
                        className="w-full border border-slate-300 rounded-[3px] px-3 py-1.5 h-[34px] text-[12px] font-mono-num bg-white text-slate-800 disabled:bg-[#F8FAFC]"
                      />
                    </div>

                    {/* 10. Alamat */}
                    <div>
                      <label className="block text-slate-700 font-normal text-[12px] mb-1">Alamat</label>
                      <select
                        disabled
                        value="main"
                        className="w-full border border-slate-200 bg-[#F8FAFC] rounded-[3px] px-3 py-1.5 h-[34px] text-[12px] text-slate-700 truncate cursor-not-allowed"
                      >
                        <option value="main">{workspace.corporateTaxpayer.address || 'JL RADEN INTEN II B NO.210...'}</option>
                      </select>
                    </div>

                    {/* 11. IDTKU */}
                    <div>
                      <label className="block text-slate-700 font-normal text-[12px] mb-1">IDTKU</label>
                      <select
                        disabled
                        value="000000"
                        className="w-full border border-slate-200 bg-[#F8FAFC] rounded-[3px] px-3 py-1.5 h-[34px] text-[12px] text-slate-700 font-mono-num cursor-not-allowed"
                      >
                        <option value="000000">000000</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>

              {/* Section 2: Informasi Pembeli */}
              <div className="border border-[#E2E8F0] rounded-[4px] bg-white p-5 shadow-xs">
                <div
                  onClick={() => setEditCollapsed((p) => ({ ...p, buyer: !p.buyer }))}
                  className="flex items-center gap-2 cursor-pointer font-bold text-[13px] text-slate-800 pb-3"
                >
                  {editCollapsed.buyer ? <ChevronRight className="w-4 h-4 text-slate-600" /> : <ChevronDown className="w-4 h-4 text-slate-600" />}
                  <span>Informasi Pembeli</span>
                </div>
                {!editCollapsed.buyer && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-x-6 gap-y-4 pt-1">
                    {/* Col 1: Nomor Identitas WP * */}
                    <div className="relative">
                      <label className="block text-slate-700 font-normal text-[12px] mb-1">
                        Nomor Identitas WP <span className="text-rose-600">*</span>
                      </label>
                      <input
                        type="text"
                        value={counterpartyNpwp}
                        disabled={isViewingApproved}
                        placeholder=""
                        onFocus={() => {
                          if (counterpartyNpwp.trim()) setBuyerSuggestionsOpen(true);
                        }}
                        onClick={() => {
                          if (counterpartyNpwp.trim()) setBuyerSuggestionsOpen(true);
                        }}
                        onChange={(e) => {
                          handleBuyerNpwpChange(e.target.value);
                          setBuyerSuggestionsOpen(e.target.value.trim().length > 0);
                        }}
                        className="w-full border border-slate-300 rounded-[3px] px-3 py-1.5 h-[34px] text-[12px] font-mono-num bg-white text-slate-800 disabled:bg-[#F8FAFC] focus:outline-none focus:border-[#0088FF]"
                      />

                      {/* Dropdown Suggestions: HANYA MUNCUL JIKA SUDAH DIMASUKKAN NOMOR ID & ADA DATA */}
                      {buyerSuggestionsOpen && !isViewingApproved && matchingBuyers.length > 0 && (
                        <>
                          <div
                            className="fixed inset-0 z-40"
                            onClick={() => setBuyerSuggestionsOpen(false)}
                          />
                          <div className="absolute left-0 top-[100%] mt-1 w-[380px] max-w-[90vw] bg-white border border-slate-300 rounded-[4px] shadow-xl z-50 max-h-[250px] overflow-y-auto">
                            <div className="px-3 py-1.5 bg-[#F8FAFC] border-b border-slate-200 text-[11px] font-bold text-slate-600 flex justify-between items-center sticky top-0">
                              <span>HASIL PENCARIAN PEMBELI ({matchingBuyers.length})</span>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setBuyerSuggestionsOpen(false);
                                }}
                                className="text-slate-400 hover:text-slate-700 text-sm font-bold"
                              >
                                ×
                              </button>
                            </div>
                            {matchingBuyers.map((b) => (
                              <div
                                key={b.npwp}
                                onClick={() => selectKnownBuyer(b)}
                                className="px-3 py-2 border-b border-slate-100 hover:bg-[#F0F7FF] cursor-pointer text-left transition"
                              >
                                <div className="text-[12px] font-semibold text-[#1E2C5E] flex items-center justify-between">
                                  <span>{b.name}</span>
                                  {b.isCustom && (
                                    <span className="text-[9px] bg-indigo-50 text-indigo-700 border border-indigo-200 px-1.5 py-0.2 rounded font-medium">
                                      Admin
                                    </span>
                                  )}
                                </div>
                                <div className="text-[11px] font-mono-num text-slate-600">
                                  NPWP: {b.npwp}
                                </div>
                                <div className="text-[10px] text-slate-400 truncate">
                                  {b.address}
                                </div>
                              </div>
                            ))}
                          </div>
                        </>
                      )}
                    </div>

                    {/* Col 2: ID */}
                    <div>
                      <label className="block text-slate-700 font-normal text-[12px] mb-1">ID</label>
                      <div className="grid grid-cols-2 gap-y-1.5 gap-x-2 text-[11px] pt-1">
                        <label className="inline-flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="radio"
                            name="buyerIdType"
                            disabled={isViewingApproved}
                            checked={buyerIdType === 'NPWP'}
                            onChange={() => setBuyerIdType('NPWP')}
                            className="accent-[#0088FF]"
                          />
                          <span>Nomor Identitas WP</span>
                        </label>
                        <label className="inline-flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="radio"
                            name="buyerIdType"
                            disabled={isViewingApproved}
                            checked={buyerIdType === 'PASPOR'}
                            onChange={() => setBuyerIdType('PASPOR')}
                            className="accent-[#0088FF]"
                          />
                          <span>Paspor</span>
                        </label>
                        <label className="inline-flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="radio"
                            name="buyerIdType"
                            disabled={isViewingApproved}
                            checked={buyerIdType === 'NIK'}
                            onChange={() => setBuyerIdType('NIK')}
                            className="accent-[#0088FF]"
                          />
                          <span>NIK</span>
                        </label>
                        <label className="inline-flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="radio"
                            name="buyerIdType"
                            disabled={isViewingApproved}
                            checked={buyerIdType === 'LAINNYA'}
                            onChange={() => setBuyerIdType('LAINNYA')}
                            className="accent-[#0088FF]"
                          />
                          <span>Identitas Lain</span>
                        </label>
                      </div>
                    </div>

                    {/* Col 3: Negara */}
                    <div>
                      <label className="block text-slate-700 font-normal text-[12px] mb-1">Negara</label>
                      <select
                        disabled={isViewingApproved}
                        value={buyerCountry || 'Indonesia'}
                        onChange={(e) => setBuyerCountry(e.target.value)}
                        className="w-full border border-slate-300 rounded-[3px] px-3 py-1.5 h-[34px] text-[12px] bg-white text-slate-800 disabled:bg-[#F8FAFC]"
                      >
                        <option value="Indonesia">Indonesia</option>
                        <option value="Luar Negeri">Luar Negeri</option>
                      </select>
                    </div>

                    {/* Col 4: Nomor Dokumen */}
                    <div>
                      <label className="block text-slate-700 font-normal text-[12px] mb-1">Nomor Dokumen</label>
                      <input
                        type="text"
                        disabled
                        value=""
                        className="w-full border border-slate-200 bg-[#F8FAFC] rounded-[3px] px-3 py-1.5 h-[34px] text-[12px] text-slate-700 cursor-not-allowed"
                      />
                    </div>

                    {/* Col 5: Nama * */}
                    <div>
                      <label className="block text-slate-700 font-normal text-[12px] mb-1">
                        Nama <span className="text-rose-600">*</span>
                      </label>
                      <input
                        type="text"
                        value={counterpartyName}
                        disabled={isViewingApproved}
                        onChange={(e) => setCounterpartyName(e.target.value)}
                        className="w-full border border-slate-300 rounded-[3px] px-3 py-1.5 h-[34px] text-[12px] font-semibold text-slate-800 bg-white disabled:bg-[#F8FAFC]"
                      />
                    </div>

                    {/* Row 2: Col 1: Alamat * */}
                    <div>
                      <label className="block text-slate-700 font-normal text-[12px] mb-1">
                        Alamat <span className="text-rose-600">*</span>
                      </label>
                      <select
                        disabled={isViewingApproved}
                        value={buyerAddress ? 'selected' : ''}
                        onChange={(e) => {
                          if (e.target.value === '') setBuyerAddress('');
                        }}
                        className="w-full border border-slate-300 rounded-[3px] px-3 py-1.5 h-[34px] text-[12px] bg-white text-slate-800 truncate disabled:bg-[#F8FAFC]"
                      >
                        <option value="">Pilih Alamat</option>
                        {buyerAddress && (
                          <option value="selected">{buyerAddress}</option>
                        )}
                      </select>
                    </div>

                    {/* Row 2: Col 2: IDTKU * */}
                    <div>
                      <label className="block text-slate-700 font-normal text-[12px] mb-1">
                        IDTKU <span className="text-rose-600">*</span>
                      </label>
                      <select
                        disabled={isViewingApproved}
                        value={buyerIdtku}
                        onChange={(e) => setBuyerIdtku(e.target.value)}
                        className="w-full border border-slate-300 rounded-[3px] px-3 py-1.5 h-[34px] text-[12px] bg-white text-slate-800 disabled:bg-[#F8FAFC]"
                      >
                        <option value="">Pilih kode usaha</option>
                        <option value="000000">000000</option>
                      </select>
                    </div>

                    {/* Row 2: Col 3: Email */}
                    <div>
                      <label className="block text-slate-700 font-normal text-[12px] mb-1">Email</label>
                      <input
                        type="email"
                        value={buyerEmail}
                        disabled={isViewingApproved}
                        onChange={(e) => setBuyerEmail(e.target.value)}
                        className="w-full border border-slate-300 rounded-[3px] px-3 py-1.5 h-[34px] text-[12px] bg-white text-slate-800 disabled:bg-[#F8FAFC]"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Section 3: Detail Transaksi */}
              <div className="border border-[#E2E8F0] rounded-[4px] bg-white p-5 shadow-xs">
                <div
                  onClick={() => setEditCollapsed((p) => ({ ...p, detail: !p.detail }))}
                  className="flex items-center gap-2 cursor-pointer font-bold text-[13px] text-slate-800 pb-3"
                >
                  {editCollapsed.detail ? <ChevronRight className="w-4 h-4 text-slate-600" /> : <ChevronDown className="w-4 h-4 text-slate-600" />}
                  <span>Detail Transaksi</span>
                </div>
                {!editCollapsed.detail && (
                  <div className="space-y-3 pt-1">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={isViewingApproved}
                        onClick={handleOpenAddTxModal}
                        className="bg-[#002D72] hover:bg-[#001D4A] disabled:opacity-50 text-white font-medium text-[11.5px] px-3.5 py-1.5 rounded-[3px] cursor-pointer shadow-xs transition"
                      >
                        Tambah Transaksi
                      </button>
                      <button
                        type="button"
                        disabled={isViewingApproved || selectedDraftItemIds.length === 0}
                        onClick={handleRemoveSelectedLines}
                        className="bg-[#BA1B1B] hover:bg-[#961515] disabled:opacity-45 text-white font-medium text-[11.5px] px-3.5 py-1.5 rounded-[3px] cursor-pointer shadow-xs transition"
                      >
                        Hapus Transaksi
                      </button>
                    </div>

                    <div className="overflow-x-auto border border-slate-200 rounded-[3px]">
                      <table className="w-full text-[11px] border-collapse whitespace-nowrap">
                        <thead>
                          <tr className="bg-[#F7CA36] text-[#1E2C5E] font-bold">
                            <th className="px-2.5 py-2 w-8 text-center border-r border-[#E5B822]">
                              <input
                                type="checkbox"
                                disabled={isViewingApproved}
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
                            <th className="px-2.5 py-2 text-left border-r border-[#E5B822]">Tipe ↑↓</th>
                            <th className="px-2.5 py-2 text-left border-r border-[#E5B822]">Nama ↑↓</th>
                            <th className="px-2.5 py-2 text-left border-r border-[#E5B822]">Kode ↑↓</th>
                            <th className="px-2.5 py-2 text-right border-r border-[#E5B822]">KUANTITAS ↑↓</th>
                            <th className="px-2.5 py-2 text-center border-r border-[#E5B822]">Satuan ↑↓</th>
                            <th className="px-2.5 py-2 text-right border-r border-[#E5B822]">Harga Satuan ↑↓</th>
                            <th className="px-2.5 py-2 text-right border-r border-[#E5B822]">Total Harga ↑↓</th>
                            <th className="px-2.5 py-2 text-right border-r border-[#E5B822]">Potongan harga ↑↓</th>
                            <th className="px-2.5 py-2 text-center border-r border-[#E5B822]">Tarif PPN ↑↓</th>
                            <th className="px-2.5 py-2 text-right border-r border-[#E5B822]">DPP ↑↓</th>
                            <th className="px-2.5 py-2 text-right border-r border-[#E5B822]">PPN ↑↓</th>
                            <th className="px-2.5 py-2 text-right border-r border-[#E5B822]">DPP Nilai Lain/DPP ↑↓</th>
                            <th className="px-2.5 py-2 text-right border-r border-[#E5B822]">PPnBM ↑↓</th>
                            <th className="px-2.5 py-2 text-right">Tarif PPnBM ↑↓</th>
                          </tr>
                          <tr className="bg-white border-b border-slate-200">
                            <th className="p-1 border-r border-slate-200"></th>
                            <th className="p-1 border-r border-slate-200"><input type="text" className="w-full border border-slate-200 rounded px-1.5 py-0.5 text-[10px]" /></th>
                            <th className="p-1 border-r border-slate-200"><input type="text" className="w-full border border-slate-200 rounded px-1.5 py-0.5 text-[10px]" /></th>
                            <th className="p-1 border-r border-slate-200"><input type="text" className="w-full border border-slate-200 rounded px-1.5 py-0.5 text-[10px]" /></th>
                            <th className="p-1 border-r border-slate-200"><input type="text" className="w-full border border-slate-200 rounded px-1.5 py-0.5 text-[10px]" /></th>
                            <th className="p-1 border-r border-slate-200"><input type="text" className="w-full border border-slate-200 rounded px-1.5 py-0.5 text-[10px]" /></th>
                            <th className="p-1 border-r border-slate-200"><input type="text" className="w-full border border-slate-200 rounded px-1.5 py-0.5 text-[10px]" /></th>
                            <th className="p-1 border-r border-slate-200"><input type="text" className="w-full border border-slate-200 rounded px-1.5 py-0.5 text-[10px]" /></th>
                            <th className="p-1 border-r border-slate-200"><input type="text" className="w-full border border-slate-200 rounded px-1.5 py-0.5 text-[10px]" /></th>
                            <th className="p-1 border-r border-slate-200"><input type="text" className="w-full border border-slate-200 rounded px-1.5 py-0.5 text-[10px]" /></th>
                            <th className="p-1 border-r border-slate-200"><input type="text" className="w-full border border-slate-200 rounded px-1.5 py-0.5 text-[10px]" /></th>
                            <th className="p-1 border-r border-slate-200"><input type="text" className="w-full border border-slate-200 rounded px-1.5 py-0.5 text-[10px]" /></th>
                            <th className="p-1 border-r border-slate-200"><input type="text" className="w-full border border-slate-200 rounded px-1.5 py-0.5 text-[10px]" /></th>
                            <th className="p-1 border-r border-slate-200"><input type="text" className="w-full border border-slate-200 rounded px-1.5 py-0.5 text-[10px]" /></th>
                            <th className="p-1"><input type="text" className="w-full border border-slate-200 rounded px-1.5 py-0.5 text-[10px]" /></th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                          {draftItems.length === 0 ? (
                            <tr>
                              <td colSpan={15} className="px-4 py-6 text-center text-slate-400">
                                Tidak ada data yang ditemukan.
                              </td>
                            </tr>
                          ) : (
                            draftItems.map((it) => (
                              <tr key={it.id} className="hover:bg-slate-50">
                                <td className="px-2.5 py-2 text-center">
                                  <div className="flex items-center justify-center gap-1.5">
                                    <input
                                      type="checkbox"
                                      disabled={isViewingApproved}
                                      checked={selectedDraftItemIds.includes(it.id)}
                                      onChange={() =>
                                        setSelectedDraftItemIds((prev) =>
                                          prev.includes(it.id)
                                            ? prev.filter((x) => x !== it.id)
                                            : [...prev, it.id]
                                        )
                                      }
                                      className="rounded border-slate-300 text-blue-600 accent-[#0088FF] cursor-pointer"
                                    />
                                    {!isViewingApproved && (
                                      <>
                                        <button
                                          type="button"
                                          onClick={() => handleEditItemLine(it)}
                                          className="w-5 h-5 rounded-[3px] bg-[#EBF5FB] hover:bg-[#D4EBF8] text-[#0088FF] flex items-center justify-center p-0.5 cursor-pointer shadow-xs transition"
                                          title="Ubah Transaksi Barang/Jasa"
                                        >
                                          <Edit3 className="w-3 h-3" />
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setDraftItems((prev) => prev.filter((x) => x.id !== it.id));
                                          }}
                                          className="w-5 h-5 rounded-[3px] bg-[#FDE8E8] hover:bg-[#FBD5D5] text-[#E02424] flex items-center justify-center p-0.5 cursor-pointer shadow-xs transition"
                                          title="Hapus Transaksi"
                                        >
                                          <Trash2 className="w-3 h-3" />
                                        </button>
                                      </>
                                    )}
                                  </div>
                                </td>
                                <td className="px-2.5 py-2">{it.itemType === 'GOODS' ? 'GOODS' : 'SERVICES'}</td>
                                <td className="px-2.5 py-2 font-semibold text-slate-800">{it.itemName}</td>
                                <td className="px-2.5 py-2 font-mono-num">{it.itemCode}</td>
                                <td className="px-2.5 py-2 text-right font-mono-num">{formatCoretaxDec(it.quantity)}</td>
                                <td className="px-2.5 py-2 text-center">{it.unit}</td>
                                <td className="px-2.5 py-2 text-right font-mono-num">{formatCoretaxDec(it.unitPrice)}</td>
                                <td className="px-2.5 py-2 text-right font-mono-num">{formatCoretaxDec(it.unitPrice * it.quantity)}</td>
                                <td className="px-2.5 py-2 text-right font-mono-num">{formatCoretaxDec(it.discount)}</td>
                                <td className="px-2.5 py-2 text-center">12%</td>
                                <td className="px-2.5 py-2 text-right font-mono-num">{formatCoretaxDec(it.dpp)}</td>
                                <td className="px-2.5 py-2 text-right font-mono-num font-bold text-[#1E2C5E]">
                                  {formatCoretaxDec(it.ppn)}
                                </td>
                                <td className="px-2.5 py-2 text-right font-mono-num">{formatCoretaxDec(it.dppOtherValue)}</td>
                                <td className="px-2.5 py-2 text-right font-mono-num">{formatCoretaxDec(it.ppnbm)}</td>
                                <td className="px-2.5 py-2 text-right font-mono-num">
                                  {it.isLuxury && it.dpp > 0 && it.ppnbm > 0
                                    ? formatCoretaxDec((it.ppnbm / it.dpp) * 100)
                                    : '0,00'}
                                </td>
                              </tr>
                            ))
                          )}
                          <tr className="bg-[#EEF3FA] font-extrabold text-[#1E2C5E]">
                            <td colSpan={10} className="px-3 py-2 text-right">
                              JUMLAH
                            </td>
                            <td className="px-2.5 py-2 text-right font-mono-num">{formatCoretaxDec(draftTotals.dpp)}</td>
                            <td className="px-2.5 py-2 text-right font-mono-num">{formatCoretaxDec(draftTotals.ppn)}</td>
                            <td className="px-2.5 py-2 text-right font-mono-num">
                              {formatCoretaxDec(draftTotals.dppOtherValue)}
                            </td>
                            <td className="px-2.5 py-2 text-right font-mono-num">{formatCoretaxDec(draftTotals.ppnbm)}</td>
                            <td className="px-2.5 py-2 text-right font-mono-num">0,00</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    {/* Pagination under table */}
                    <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                      <span>Menampilkan {draftItems.length > 0 ? 1 : 0} sampai {draftItems.length} dari {draftItems.length} entri</span>
                      <div className="flex items-center gap-1.5">
                        <button type="button" disabled className="px-1.5 py-0.5 rounded border border-slate-200 text-slate-400">&lt;&lt;</button>
                        <button type="button" disabled className="px-1.5 py-0.5 rounded border border-slate-200 text-slate-400">&lt;</button>
                        <span className="px-2 py-0.5 rounded bg-[#0088FF] text-white font-bold">1</span>
                        <button type="button" disabled className="px-1.5 py-0.5 rounded border border-slate-200 text-slate-400">&gt;</button>
                        <button type="button" disabled className="px-1.5 py-0.5 rounded border border-slate-200 text-slate-400">&gt;&gt;</button>
                        <select className="border border-slate-200 rounded px-1.5 py-0.5 bg-white ml-2 text-slate-700">
                          <option value="10">10</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Bottom Buttons matching Image 7 & Image 8 */}
              <div className="flex items-center gap-3 pt-2 pb-8">
                {isViewingApproved ? (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        if (editingInvoice) {
                          setCancelModalTarget(editingInvoice);
                        }
                      }}
                      className="px-6 py-2 rounded-[4px] bg-[#00A3FF] hover:bg-[#008CE0] text-white font-medium text-[12px] cursor-pointer shadow-sm transition"
                    >
                      Batal
                    </button>
                    <button
                      type="button"
                      onClick={() => setAmendSignModalOpen(true)}
                      className="px-6 py-2 rounded-[4px] bg-[#0088FF] hover:bg-[#0070D2] text-white font-medium text-[12px] cursor-pointer shadow-sm transition"
                    >
                      Ganti
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => saveNewInvoice(false)}
                      className="px-6 py-2 rounded-[4px] bg-[#0088FF] hover:bg-[#0070D2] text-white font-medium text-[12px] cursor-pointer shadow-sm transition"
                    >
                      Simpan Konsep
                    </button>
                    {normalizedTab === 'output' && (
                      <button
                        type="button"
                        onClick={() => {
                          if (validateInvoiceCompleteness()) {
                            setUploadAfterCreateOpen(true);
                          }
                        }}
                        className="px-6 py-2 rounded-[4px] bg-[#0088FF] hover:bg-[#0070D2] text-white font-medium text-[12px] cursor-pointer shadow-sm transition"
                      >
                        Upload Faktur
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          ) : (
            /* ============================================================= */
            /* DATA TABLE FOR ALL e-FAKTUR & DOKUMEN LAIN SUBMENUS           */
            /* (Authentic Coretax DJP Pajak Keluaran Yellow-Header Table)    */
            /* ============================================================= */
            <div className="space-y-3">
              {/* Breadcrumb matching Image 1 & Image 9 */}
              <div className="text-[12px] text-slate-500 flex items-center gap-1.5 pt-1">
                <Home className="w-3.5 h-3.5 text-slate-400" />
                <span>Beranda</span>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                <span>e-Faktur</span>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-slate-800 font-medium">
                  {normalizedTab === 'output' ? 'Output Tax' : activeTabTitle.replace(/^e-Faktur — |^Dokumen Lain — /, '')}
                </span>
              </div>

              <h1 className="font-display font-bold text-[18px] text-[#1D2B53]">
                {activeTabTitle.replace(/^e-Faktur — |^Dokumen Lain — /, '')}
              </h1>

              {/* Official Coretax Action Bar — Exact Per-Submenu & Per-Account (Impersonate vs Akun Pribadi) */}
              {(() => {
                const isRightAlignedOnlyBar =
                  normalizedTab === 'input' || normalizedTab === 'retur_keluaran';

                const monitoringButton = (
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => {
                        setMonitoringOpen((p) => !p);
                        setBulkOpen(false);
                      }}
                      className={navyBtnCls}
                    >
                      <Info className="w-3.5 h-3.5" />
                      <span>Monitoring</span>
                      <ChevronDown className="w-3.5 h-3.5 opacity-80" />
                    </button>
                    {monitoringOpen && (
                      <div
                        className={`absolute ${
                          isRightAlignedOnlyBar ? 'right-0' : 'left-0'
                        } top-full mt-1.5 w-64 bg-white border border-[#E2E8F0] rounded-lg shadow-xl p-3 z-30 text-xs space-y-1.5`}
                      >
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
                );

                const bulkProcessButton = (
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => {
                        setBulkOpen((p) => !p);
                        setMonitoringOpen(false);
                      }}
                      className={navyBtnCls}
                    >
                      <Layers className="w-3.5 h-3.5" />
                      <span>Bulk Process</span>
                      <ChevronDown className="w-3.5 h-3.5 opacity-80" />
                    </button>
                    {bulkOpen && (
                      <div
                        className={`absolute ${
                          isRightAlignedOnlyBar ? 'right-0' : 'left-0'
                        } top-full mt-1.5 w-60 bg-white border border-[#E2E8F0] rounded-lg shadow-xl py-1.5 z-30 text-xs`}
                      >
                        {isImpersonateAccount && (
                          <button
                            type="button"
                            onClick={() => {
                              const firstDraft =
                                filteredInvoices.find(
                                  (i) => selectedIds.includes(i.id) && i.status === 'DRAFT'
                                ) || filteredInvoices.find((i) => i.status === 'DRAFT');
                              setBulkOpen(false);
                              if (firstDraft) setSignTarget(firstDraft);
                            }}
                            className="w-full text-left px-3.5 py-2 hover:bg-slate-50 font-semibold text-[#1E2C5E] cursor-pointer"
                          >
                            Upload / Tandatangani Faktur DRAFT
                          </button>
                        )}
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
                );

                const handleUploadSelectedDrafts = () => {
                  if (selectedDraftInvoices.length === 0) {
                    setFakturSuccessToast('Pilih faktur berstatus DRAFT terlebih dahulu untuk di-upload.');
                    return;
                  }
                  const incomplete = selectedDraftInvoices.filter(
                    (inv) =>
                      !inv.transactionCode ||
                      !inv.counterpartyNpwp ||
                      inv.counterpartyNpwp.replace(/\D/g, '').length < 15 ||
                      !inv.counterpartyName ||
                      (!inv.items || inv.items.length === 0)
                  );
                  if (incomplete.length > 0) {
                    setFakturSuccessToast(
                      `Faktur belum lengkap: ${incomplete.length} faktur yang dipilih belum memiliki data lengkap (Kode Transaksi, Pembeli, atau Barang/Jasa) sehingga tidak dapat di-upload.`
                    );
                    return;
                  }
                  setBulkSignTargets(selectedDraftInvoices);
                };

                const handleDeleteSelectedDrafts = async () => {
                  if (selectedDraftInvoices.length === 0) {
                    setFakturSuccessToast('Pilih dokumen berstatus DRAFT terlebih dahulu untuk dihapus.');
                    return;
                  }
                  for (const inv of selectedDraftInvoices) {
                    await onInvoiceAction(inv.id, 'DELETE');
                  }
                  setFakturSuccessToast(`${selectedDraftInvoices.length} dokumen berhasil dihapus.`);
                  setSelectedIds([]);
                };

                const handleCreditSelected = async (isCredited: boolean, customMsg?: string) => {
                  if (selectedIds.length === 0) {
                    setFakturSuccessToast('Pilih faktur terlebih dahulu.');
                    return;
                  }
                  for (const id of selectedIds) {
                    await onInvoiceAction(id, 'TOGGLE_CREDIT', { isCredited });
                  }
                  setFakturSuccessToast(
                    customMsg ||
                      (isCredited
                        ? `${selectedIds.length} Faktur berhasil dikreditkan.`
                        : `${selectedIds.length} Faktur diubah menjadi Tidak Dikreditkan.`)
                  );
                  setSelectedIds([]);
                };

                const handleCreateReturAction = () => {
                  const candidate = filteredInvoices[0];
                  if (candidate) {
                    setReturnTarget(candidate);
                    setReturnAmount(candidate.returnAmount || Math.round(candidate.ppnTotal * 0.2));
                  } else {
                    setFakturSuccessToast(
                      'Belum ada faktur/dokumen pada akun ini untuk dibuatkan Nota Retur.'
                    );
                  }
                };

                // 6. Dokumen Lain Masukan on Impersonate uses exact 2-row left-aligned toolbar
                if (isImpersonateAccount && normalizedTab === 'dok_lain_masukan') {
                  return (
                    <div className="px-5 pt-3.5 pb-1 flex flex-col gap-1.5 relative">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <button
                          type="button"
                          onClick={handleOpenInvoiceEditor}
                          className={navyBtnCls}
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Buat Dokumen Lain Masukan</span>
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setFakturSuccessToast(
                              'Sinkronisasi Create From Interface (PIB / Bea Cukai) siap digunakan.'
                            )
                          }
                          className={navyBtnCls}
                        >
                          <span>Create From Interface</span>
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setFakturSuccessToast(
                              'Sinkronisasi Create From Payments (SSP/NTPN) siap digunakan.'
                            )
                          }
                          className={navyBtnCls}
                        >
                          <span>Create From Payments</span>
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setFakturSuccessToast('Fitur Impor Data XML Dokumen Lain Masukan siap digunakan.')
                          }
                          className={navyBtnCls}
                        >
                          <Upload className="w-3.5 h-3.5" />
                          <span>Impor Data</span>
                          <ChevronDown className="w-3.5 h-3.5 opacity-80" />
                        </button>
                        {monitoringButton}
                        {bulkProcessButton}
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() =>
                            setFakturSuccessToast(
                              'Pilih Dokumen Lain Masukan terlebih dahulu untuk pengkreditan, upload, atau penghapusan.'
                            )
                          }
                          className={infoBadgeCls}
                          title="Informasi Dokumen Lain Masukan"
                        >
                          <Info className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            handleCreditSelected(
                              true,
                              `${selectedIds.length} Dokumen dikembalikan ke status Approved.`
                            )
                          }
                          className={navyBtnCls}
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Kembali ke status Approved</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleCreditSelected(true)}
                          className={navyBtnCls}
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Kreditkan Faktur</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleCreditSelected(false)}
                          className={navyBtnCls}
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          <span>Tidak Kreditkan Faktur</span>
                        </button>
                        <button
                          type="button"
                          onClick={handleUploadSelectedDrafts}
                          className={navyBtnCls}
                        >
                          <Send className="w-3.5 h-3.5" />
                          <span>Upload Faktur</span>
                        </button>
                        <button
                          type="button"
                          onClick={handleDeleteSelectedDrafts}
                          className={redBtnCls}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Hapus Dokumen</span>
                        </button>
                      </div>
                    </div>
                  );
                }

                // Retur action bar applies to:
                // - retur_masukan & retur_dok_lain_masukan (both Impersonate & Akun Pribadi)
                // - retur_dok_lain_keluaran (Impersonate only; Akun Pribadi shows Monitoring + Bulk Process only)
                const showReturFullBar =
                  normalizedTab === 'retur_masukan' ||
                  normalizedTab === 'retur_dok_lain_masukan' ||
                  (isImpersonateAccount && normalizedTab === 'retur_dok_lain_keluaran');

                return (
                  <div
                    className={`px-5 pt-3.5 pb-1 flex flex-wrap items-center gap-2 relative ${
                      isRightAlignedOnlyBar ? 'justify-end' : 'justify-between'
                    }`}
                  >
                    {/* LEFT GROUP (or single RIGHT group when isRightAlignedOnlyBar) */}
                    <div className="flex flex-wrap items-center gap-1.5">
                      {showReturFullBar ? (
                        <>
                          <button
                            type="button"
                            onClick={handleCreateReturAction}
                            className={navyBtnCls}
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Buat Retur</span>
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setFakturSuccessToast('Fitur Impor Data Retur siap digunakan saat file XML tersedia.')
                            }
                            className={navyBtnCls}
                          >
                            <Upload className="w-3.5 h-3.5" />
                            <span>Impor Data</span>
                            <ChevronDown className="w-3.5 h-3.5 opacity-80" />
                          </button>
                        </>
                      ) : isImpersonateAccount && normalizedTab === 'input' ? (
                        <>
                          <button
                            type="button"
                            onClick={() =>
                              setFakturSuccessToast(
                                'Menu Pajak Masukan digunakan untuk mengelola dan mengkreditkan Faktur Pajak dari Penjual.'
                              )
                            }
                            className={infoBadgeCls}
                            title="Informasi Pajak Masukan"
                          >
                            <Info className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleCreditSelected(true)}
                            className={navyBtnCls}
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Kreditkan Faktur</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleCreditSelected(false)}
                            className={navyBtnCls}
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            <span>Tidak Kreditkan Faktur</span>
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              handleCreditSelected(
                                true,
                                `${selectedIds.length} Faktur dikembalikan ke status Approved.`
                              )
                            }
                            className={navyBtnCls}
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>Kembali ke status Approved</span>
                          </button>
                        </>
                      ) : isImpersonateAccount && normalizedTab === 'retur_keluaran' ? (
                        <>
                          <button
                            type="button"
                            onClick={() =>
                              setFakturSuccessToast(
                                'Pilih Retur Pajak Keluaran terlebih dahulu apabila ingin membatalkan retur.'
                              )
                            }
                            className={infoBadgeCls}
                            title="Informasi Retur Pajak Keluaran"
                          >
                            <Info className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (selectedIds.length === 0) {
                                setFakturSuccessToast('Pilih retur pajak keluaran terlebih dahulu untuk dibatalkan.');
                                return;
                              }
                              setFakturSuccessToast(`${selectedIds.length} Retur Pajak Keluaran dibatalkan.`);
                              setSelectedIds([]);
                            }}
                            className={redBtnCls}
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            <span>Batalkan Retur</span>
                          </button>
                        </>
                      ) : isImpersonateAccount && normalizedTab === 'output' ? (
                        <>
                          <button
                            type="button"
                            onClick={handleOpenInvoiceEditor}
                            className={navyBtnCls}
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Buat Faktur</span>
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setFakturSuccessToast('Fitur Impor Data XML Faktur Pajak siap digunakan.')
                            }
                            className={navyBtnCls}
                          >
                            <Upload className="w-3.5 h-3.5" />
                            <span>Impor Data</span>
                            <ChevronDown className="w-3.5 h-3.5 opacity-80" />
                          </button>
                        </>
                      ) : isImpersonateAccount && normalizedTab === 'dok_lain_keluaran' ? (
                        <>
                          <button
                            type="button"
                            onClick={handleOpenInvoiceEditor}
                            className={navyBtnCls}
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Buat Faktur</span>
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setFakturSuccessToast(
                                'Sinkronisasi Prepopulated Data (PEB / Bea Cukai) selesai dijalankan.'
                              )
                            }
                            className={navyBtnCls}
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Prepopulated Data</span>
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setFakturSuccessToast('Fitur Impor Data XML Dokumen Lain Keluaran siap digunakan.')
                            }
                            className={navyBtnCls}
                          >
                            <Upload className="w-3.5 h-3.5" />
                            <span>Impor Data</span>
                            <ChevronDown className="w-3.5 h-3.5 opacity-80" />
                          </button>
                        </>
                      ) : null}

                      {monitoringButton}
                      {bulkProcessButton}
                    </div>

                    {/* RIGHT GROUP: Retur Upload & Delete */}
                    {showReturFullBar && (
                      <div className="flex flex-wrap items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() =>
                            setFakturSuccessToast(
                              normalizedTab === 'retur_masukan'
                                ? 'Pilih baris Retur Pajak Masukan terlebih dahulu untuk Upload Retur atau Delete Retur.'
                                : 'Pilih baris Retur Dokumen Lain terlebih dahulu untuk Upload Retur atau Hapus Dokumen.'
                            )
                          }
                          className={infoBadgeCls}
                          title="Informasi Retur"
                        >
                          <Info className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (selectedIds.length === 0) {
                              setFakturSuccessToast('Pilih retur terlebih dahulu untuk di-upload.');
                              return;
                            }
                            setFakturSuccessToast(`${selectedIds.length} Retur berhasil di-upload.`);
                            setSelectedIds([]);
                          }}
                          className={navyBtnCls}
                        >
                          <Send className="w-3.5 h-3.5" />
                          <span>Upload Retur</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (selectedIds.length === 0) {
                              setFakturSuccessToast('Pilih dokumen retur terlebih dahulu untuk dihapus.');
                              return;
                            }
                            setFakturSuccessToast(`${selectedIds.length} draft retur berhasil dihapus.`);
                            setSelectedIds([]);
                          }}
                          className={redBtnCls}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>
                            {normalizedTab === 'retur_masukan' ? 'Delete Retur' : 'Hapus Dokumen'}
                          </span>
                        </button>
                      </div>
                    )}

                    {/* RIGHT GROUP: Pajak Keluaran (Impersonate only) */}
                    {isImpersonateAccount && normalizedTab === 'output' && (
                      <div className="flex flex-wrap items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() =>
                            setFakturSuccessToast(
                              'Pilih faktur Pajak Keluaran berstatus DRAFT untuk Upload Faktur atau Hapus Dokumen.'
                            )
                          }
                          className={infoBadgeCls}
                          title="Informasi Pajak Keluaran"
                        >
                          <Info className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={handleUploadSelectedDrafts}
                          className="inline-flex items-center gap-1.5 bg-[#0B254E] hover:bg-[#071A38] text-white font-semibold text-[11.5px] px-3.5 py-2 rounded-[3px] transition cursor-pointer shadow-xs whitespace-nowrap"
                        >
                          <Send className="w-3.5 h-3.5" />
                          <span>Upload Faktur</span>
                        </button>
                        <button
                          type="button"
                          onClick={handleDeleteSelectedDrafts}
                          className="inline-flex items-center gap-1.5 bg-[#C65D5D] hover:bg-[#B34C4C] text-white font-semibold text-[11.5px] px-3.5 py-2 rounded-[3px] transition cursor-pointer shadow-xs whitespace-nowrap"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Hapus Dokumen</span>
                        </button>
                      </div>
                    )}

                    {/* RIGHT GROUP: Dokumen Lain Keluaran (Impersonate only) */}
                    {isImpersonateAccount && normalizedTab === 'dok_lain_keluaran' && (
                      <div className="flex flex-wrap items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() =>
                            setFakturSuccessToast(
                              'Pilih Dokumen Lain Keluaran untuk Upload Faktur, Batalkan Faktur, atau Delete Invoices.'
                            )
                          }
                          className={infoBadgeCls}
                          title="Informasi Dokumen Lain Keluaran"
                        >
                          <Info className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={handleUploadSelectedDrafts}
                          className={navyBtnCls}
                        >
                          <Send className="w-3.5 h-3.5" />
                          <span>Upload Faktur</span>
                        </button>
                        <button
                          type="button"
                          onClick={async () => {
                            const approvedSelected = filteredInvoices.filter(
                              (i) => selectedIds.includes(i.id) && i.status === 'APPROVED'
                            );
                            if (approvedSelected.length === 0) {
                              setFakturSuccessToast(
                                'Pilih dokumen berstatus APPROVED terlebih dahulu untuk dibatalkan.'
                              );
                              return;
                            }
                            for (const inv of approvedSelected) {
                              await onInvoiceAction(inv.id, 'CANCEL');
                            }
                            setFakturSuccessToast(`${approvedSelected.length} Dokumen berhasil dibatalkan.`);
                            setSelectedIds([]);
                          }}
                          className={navyBtnCls}
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          <span>Batalkan Faktur</span>
                        </button>
                        <button
                          type="button"
                          onClick={handleDeleteSelectedDrafts}
                          className={redBtnCls}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Delete Invoices</span>
                        </button>
                      </div>
                    )}
                  </div>
                );
              })()}

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
                              <th className="px-3 py-2.5 text-center whitespace-nowrap border-r border-white/50 w-10" />
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
                              <th className="px-3 py-2.5 text-left whitespace-nowrap border-r border-white/50">
                                Tahun
                              </th>
                              <th className="px-3 py-2.5 text-left whitespace-nowrap border-r border-white/50">
                                Masa Pajak Pengkreditan
                              </th>
                              <th className="px-3 py-2.5 text-left whitespace-nowrap border-r border-white/50">
                                Tahun Pajak Pengkreditan
                              </th>
                              <th className="px-3 py-2.5 text-left whitespace-nowrap border-r border-white/50">
                                Status Faktur
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
                              <th className="px-3 py-2.5 text-left whitespace-nowrap border-r border-white/50">
                                Nomor SP2D
                              </th>
                              <th className="px-3 py-2.5 text-left whitespace-nowrap border-r border-white/50">
                                Valid
                              </th>
                              <th className="px-3 py-2.5 text-left whitespace-nowrap border-r border-white/50">
                                Dilaporkan
                              </th>
                              <th className="px-3 py-2.5 text-left whitespace-nowrap">
                                Dilaporkan oleh Penjual
                              </th>
                            </>
                          ) : normalizedTab === 'retur_keluaran' || normalizedTab === 'retur_masukan' ? (
                            <>
                              <th className="px-3 py-2.5 text-center whitespace-nowrap border-r border-white/50 w-10" />
                              <th className="px-3 py-2.5 text-left whitespace-nowrap border-r border-white/50">
                                <span className="inline-flex items-center gap-1">
                                  {normalizedTab === 'retur_masukan' ? 'NPWP Penjual' : 'NPWP Pembeli'}
                                  <ArrowUpDown className="w-3 h-3 opacity-60" />
                                </span>
                              </th>
                              <th className="px-3 py-2.5 text-left whitespace-nowrap border-r border-white/50">
                                {normalizedTab === 'retur_masukan' ? 'Nama Penjual' : 'Nama Pembeli'}
                              </th>
                              <th className="px-3 py-2.5 text-left whitespace-nowrap border-r border-white/50">
                                <span className="inline-flex items-center gap-1">
                                  Nomor Faktur <ArrowUpDown className="w-3 h-3 opacity-60" />
                                </span>
                              </th>
                              <th className="px-3 py-2.5 text-left whitespace-nowrap border-r border-white/50">
                                <span className="inline-flex items-center gap-1">
                                  Tanggal Faktur <ArrowUpDown className="w-3 h-3 opacity-60" />
                                </span>
                              </th>
                              <th className="px-3 py-2.5 text-left whitespace-nowrap border-r border-white/50">
                                <span className="inline-flex items-center gap-1">
                                  Nomor Retur <ArrowUpDown className="w-3 h-3 opacity-60" />
                                </span>
                              </th>
                              <th className="px-3 py-2.5 text-left whitespace-nowrap border-r border-white/50">
                                <span className="inline-flex items-center gap-1">
                                  Tanggal Retur <ArrowUpDown className="w-3 h-3 opacity-60" />
                                </span>
                              </th>
                              <th className="px-3 py-2.5 text-left whitespace-nowrap border-r border-white/50">
                                <span className="inline-flex items-center gap-1">
                                  Masa Pajak <ArrowUpDown className="w-3 h-3 opacity-60" />
                                </span>
                              </th>
                              <th className="px-3 py-2.5 text-left whitespace-nowrap border-r border-white/50">
                                Tahun
                              </th>
                              <th className="px-3 py-2.5 text-left whitespace-nowrap border-r border-white/50">
                                <span className="inline-flex items-center gap-1">
                                  Status <ArrowUpDown className="w-3 h-3 opacity-60" />
                                </span>
                              </th>
                              {normalizedTab === 'retur_masukan' && (
                                <>
                                  <th className="px-3 py-2.5 text-left whitespace-nowrap border-r border-white/50">
                                    ESignStatus
                                  </th>
                                  <th className="px-3 py-2.5 text-left whitespace-nowrap border-r border-white/50">
                                    <span className="inline-flex items-center gap-1">
                                      Dikreditkan (Y/N) <ArrowUpDown className="w-3 h-3 opacity-60" />
                                    </span>
                                  </th>
                                </>
                              )}
                              <th className="px-3 py-2.5 text-left whitespace-nowrap border-r border-white/50">
                                Harga Jual/Penggantian/DPP
                              </th>
                              <th className="px-3 py-2.5 text-left whitespace-nowrap border-r border-white/50">
                                DPP Nilai Lain/DPP
                              </th>
                              <th className="px-3 py-2.5 text-left whitespace-nowrap border-r border-white/50">
                                PPN
                              </th>
                              <th className="px-3 py-2.5 text-left whitespace-nowrap border-r border-white/50">
                                PPnBM
                              </th>
                              <th className="px-3 py-2.5 text-left whitespace-nowrap border-r border-white/50">
                                Perekam
                              </th>
                              <th className="px-3 py-2.5 text-left whitespace-nowrap">
                                Dilaporkan
                              </th>
                            </>
                          ) : normalizedTab === 'dok_lain_keluaran' ? (
                            <>
                              <th className="px-3 py-2.5 text-center whitespace-nowrap border-r border-white/50 w-10" />
                              <th className="px-3 py-2.5 text-left whitespace-nowrap border-r border-white/50">
                                NPWP Pembeli
                              </th>
                              <th className="px-3 py-2.5 text-left whitespace-nowrap border-r border-white/50">
                                Nama Pembeli
                              </th>
                              <th className="px-3 py-2.5 text-left whitespace-nowrap border-r border-white/50">
                                <span className="inline-flex items-center gap-1">
                                  Nomor Dokumen <ArrowUpDown className="w-3 h-3 opacity-60" />
                                </span>
                              </th>
                              <th className="px-3 py-2.5 text-left whitespace-nowrap border-r border-white/50">
                                <span className="inline-flex items-center gap-1">
                                  Tanggal Dokumen <ArrowUpDown className="w-3 h-3 opacity-60" />
                                </span>
                              </th>
                              <th className="px-3 py-2.5 text-left whitespace-nowrap border-r border-white/50">
                                <span className="inline-flex items-center gap-1">
                                  Jenis Transaksi <ArrowUpDown className="w-3 h-3 opacity-60" />
                                </span>
                              </th>
                              <th className="px-3 py-2.5 text-left whitespace-nowrap border-r border-white/50">
                                <span className="inline-flex items-center gap-1">
                                  Masa Pajak <ArrowUpDown className="w-3 h-3 opacity-60" />
                                </span>
                              </th>
                              <th className="px-3 py-2.5 text-left whitespace-nowrap border-r border-white/50">
                                Tahun
                              </th>
                              <th className="px-3 py-2.5 text-left whitespace-nowrap border-r border-white/50">
                                <span className="inline-flex items-center gap-1">
                                  Status Dokumen <ArrowUpDown className="w-3 h-3 opacity-60" />
                                </span>
                              </th>
                              <th className="px-3 py-2.5 text-left whitespace-nowrap border-r border-white/50">
                                DPP
                              </th>
                              <th className="px-3 py-2.5 text-left whitespace-nowrap border-r border-white/50">
                                PPN
                              </th>
                              <th className="px-3 py-2.5 text-left whitespace-nowrap border-r border-white/50">
                                PPnBM
                              </th>
                              <th className="px-3 py-2.5 text-left whitespace-nowrap border-r border-white/50">
                                Keterangan
                              </th>
                              <th className="px-3 py-2.5 text-left whitespace-nowrap border-r border-white/50">
                                Perekam
                              </th>
                              <th className="px-3 py-2.5 text-left whitespace-nowrap">
                                Dilaporkan
                              </th>
                            </>
                          ) : normalizedTab === 'dok_lain_masukan' ? (
                            <>
                              <th className="px-3 py-2.5 text-center whitespace-nowrap border-r border-white/50 w-10" />
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
                                  Nomor Dokumen <ArrowUpDown className="w-3 h-3 opacity-60" />
                                </span>
                              </th>
                              <th className="px-3 py-2.5 text-left whitespace-nowrap border-r border-white/50">
                                <span className="inline-flex items-center gap-1">
                                  Tanggal Dokumen <ArrowUpDown className="w-3 h-3 opacity-60" />
                                </span>
                              </th>
                              <th className="px-3 py-2.5 text-left whitespace-nowrap border-r border-white/50">
                                Jenis Transaksi
                              </th>
                              <th className="px-3 py-2.5 text-left whitespace-nowrap border-r border-white/50">
                                <span className="inline-flex items-center gap-1">
                                  Masa Pajak <ArrowUpDown className="w-3 h-3 opacity-60" />
                                </span>
                              </th>
                              <th className="px-3 py-2.5 text-left whitespace-nowrap border-r border-white/50">
                                Tahun
                              </th>
                              <th className="px-3 py-2.5 text-left whitespace-nowrap border-r border-white/50">
                                <span className="inline-flex items-center gap-1">
                                  Masa Pajak Pengkreditan <ArrowUpDown className="w-3 h-3 opacity-60" />
                                </span>
                              </th>
                              <th className="px-3 py-2.5 text-left whitespace-nowrap border-r border-white/50">
                                <span className="inline-flex items-center gap-1">
                                  Tahun Pajak Pengkreditan <ArrowUpDown className="w-3 h-3 opacity-60" />
                                </span>
                              </th>
                              <th className="px-3 py-2.5 text-left whitespace-nowrap border-r border-white/50">
                                DPP
                              </th>
                              <th className="px-3 py-2.5 text-left whitespace-nowrap border-r border-white/50">
                                PPN
                              </th>
                              <th className="px-3 py-2.5 text-left whitespace-nowrap border-r border-white/50">
                                PPnBM
                              </th>
                              <th className="px-3 py-2.5 text-left whitespace-nowrap border-r border-white/50">
                                Status
                              </th>
                              <th className="px-3 py-2.5 text-left whitespace-nowrap border-r border-white/50">
                                Valid
                              </th>
                              <th className="px-3 py-2.5 text-left whitespace-nowrap border-r border-white/50">
                                Dilaporkan
                              </th>
                              <th className="px-3 py-2.5 text-left whitespace-nowrap border-r border-white/50">
                                Keterangan
                              </th>
                              <th className="px-3 py-2.5 text-left whitespace-nowrap border-r border-white/50">
                                Perekam
                              </th>
                              <th className="px-3 py-2.5 text-left whitespace-nowrap">
                                <span className="inline-flex items-center gap-1">
                                  Dibuat Oleh <ArrowUpDown className="w-3 h-3 opacity-60" />
                                </span>
                              </th>
                            </>
                          ) : normalizedTab === 'retur_dok_lain_keluaran' ||
                            normalizedTab === 'retur_dok_lain_masukan' ? (
                            <>
                              <th className="px-3 py-2.5 text-center whitespace-nowrap border-r border-white/50 w-10" />
                              <th className="px-3 py-2.5 text-left whitespace-nowrap border-r border-white/50">
                                <span className="inline-flex items-center gap-1">
                                  {normalizedTab === 'retur_dok_lain_masukan' ? 'NPWP Penjual' : 'NPWP Pembeli'}
                                  <ArrowUpDown className="w-3 h-3 opacity-60" />
                                </span>
                              </th>
                              <th className="px-3 py-2.5 text-left whitespace-nowrap border-r border-white/50">
                                {normalizedTab === 'retur_dok_lain_masukan' ? 'Nama Penjual' : 'Nama Pembeli'}
                              </th>
                              <th className="px-3 py-2.5 text-left whitespace-nowrap border-r border-white/50">
                                <span className="inline-flex items-center gap-1">
                                  Nomor Dokumen <ArrowUpDown className="w-3 h-3 opacity-60" />
                                </span>
                              </th>
                              <th className="px-3 py-2.5 text-left whitespace-nowrap border-r border-white/50">
                                <span className="inline-flex items-center gap-1">
                                  Nomor Retur <ArrowUpDown className="w-3 h-3 opacity-60" />
                                </span>
                              </th>
                              <th className="px-3 py-2.5 text-left whitespace-nowrap border-r border-white/50">
                                <span className="inline-flex items-center gap-1">
                                  {normalizedTab === 'retur_dok_lain_masukan' ? 'Tanggal Retur' : 'Tanggal Dokumen'}
                                  <ArrowUpDown className="w-3 h-3 opacity-60" />
                                </span>
                              </th>
                              <th className="px-3 py-2.5 text-left whitespace-nowrap border-r border-white/50">
                                <span className="inline-flex items-center gap-1">
                                  Masa Pajak <ArrowUpDown className="w-3 h-3 opacity-60" />
                                </span>
                              </th>
                              <th className="px-3 py-2.5 text-left whitespace-nowrap border-r border-white/50">
                                Tahun
                              </th>
                              <th className="px-3 py-2.5 text-left whitespace-nowrap border-r border-white/50">
                                <span className="inline-flex items-center gap-1">
                                  Status <ArrowUpDown className="w-3 h-3 opacity-60" />
                                </span>
                              </th>
                              {normalizedTab === 'retur_dok_lain_masukan' && (
                                <th className="px-3 py-2.5 text-left whitespace-nowrap border-r border-white/50">
                                  Dikreditkan (Y/N)
                                </th>
                              )}
                              <th className="px-3 py-2.5 text-left whitespace-nowrap border-r border-white/50">
                                DPP
                              </th>
                              <th className="px-3 py-2.5 text-left whitespace-nowrap border-r border-white/50">
                                PPN
                              </th>
                              <th className="px-3 py-2.5 text-left whitespace-nowrap border-r border-white/50">
                                PPnBM
                              </th>
                              {normalizedTab === 'retur_dok_lain_masukan' && (
                                <th className="px-3 py-2.5 text-left whitespace-nowrap border-r border-white/50">
                                  Keterangan
                                </th>
                              )}
                              <th className="px-3 py-2.5 text-left whitespace-nowrap border-r border-white/50">
                                Perekam
                              </th>
                              <th className="px-3 py-2.5 text-left whitespace-nowrap">
                                Dilaporkan
                              </th>
                            </>
                          ) : normalizedTab === 'output' ? (
                            <>
                              <th className="px-2.5 py-2.5 text-center whitespace-nowrap border-r border-[#E5B822] w-16" />
                              <th className="px-3 py-2.5 text-left whitespace-nowrap border-r border-[#E5B822]">
                                <span className="inline-flex items-center gap-1">
                                  NPWP Pembeli / Identitas lainnya
                                  <ArrowUpDown className="w-3 h-3 opacity-60" />
                                </span>
                              </th>
                              <th className="px-3 py-2.5 text-left whitespace-nowrap border-r border-[#E5B822]">
                                Nama Pembeli
                              </th>
                              <th className="px-3 py-2.5 text-left whitespace-nowrap border-r border-[#E5B822]">
                                <span className="inline-flex items-center gap-1">
                                  Kode Transaksi
                                  <ArrowUpDown className="w-3 h-3 opacity-60" />
                                </span>
                              </th>
                              <th className="px-3 py-2.5 text-left whitespace-nowrap border-r border-[#E5B822]">
                                Nomor Faktur Pajak
                              </th>
                              <th className="px-3 py-2.5 text-left whitespace-nowrap border-r border-[#E5B822]">
                                <span className="inline-flex items-center gap-1">
                                  Tanggal Faktur Pajak
                                  <ArrowUpDown className="w-3 h-3 opacity-60" />
                                </span>
                              </th>
                              <th className="px-3 py-2.5 text-left whitespace-nowrap border-r border-[#E5B822]">
                                <span className="inline-flex items-center gap-1">
                                  Masa Pajak
                                  <ArrowUpDown className="w-3 h-3 opacity-60" />
                                </span>
                              </th>
                              <th className="px-3 py-2.5 text-left whitespace-nowrap border-r border-[#E5B822]">
                                Tahun
                              </th>
                              <th className="px-3 py-2.5 text-left whitespace-nowrap border-r border-[#E5B822]">
                                <span className="inline-flex items-center gap-1">
                                  Status Faktur
                                  <ArrowUpDown className="w-3 h-3 opacity-60" />
                                </span>
                              </th>
                              <th className="px-3 py-2.5 text-left whitespace-nowrap border-r border-[#E5B822]">
                                ESignStatus
                              </th>
                              <th className="px-3 py-2.5 text-right whitespace-nowrap border-r border-[#E5B822]">
                                Harga Jual/Penggantian/DPP
                              </th>
                              <th className="px-3 py-2.5 text-right whitespace-nowrap border-r border-[#E5B822]">
                                DPP Nilai Lain/DPP
                              </th>
                              <th className="px-3 py-2.5 text-right whitespace-nowrap border-r border-[#E5B822]">
                                PPN
                              </th>
                              <th className="px-3 py-2.5 text-right whitespace-nowrap border-r border-[#E5B822]">
                                PPnBM
                              </th>
                              <th className="px-3 py-2.5 text-left whitespace-nowrap border-r border-[#E5B822]">
                                Penandatangan
                              </th>
                              <th className="px-3 py-2.5 text-left whitespace-nowrap border-r border-[#E5B822]">
                                Referensi
                              </th>
                              <th className="px-3 py-2.5 text-center whitespace-nowrap border-r border-[#E5B822]">
                                Metode Input
                              </th>
                              <th className="px-3 py-2.5 text-center whitespace-nowrap border-r border-[#E5B822]">
                                Dilaporkan oleh Penjual
                              </th>
                              <th className="px-3 py-2.5 text-center whitespace-nowrap">
                                Dilaporkan oleh Pemungut PPN
                              </th>
                            </>
                          ) : (
                            <>
                              <th className="px-3 py-2.5 text-left whitespace-nowrap border-r border-white/50 w-10">
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
                              <th className="px-3 py-2.5 text-left whitespace-nowrap border-r border-white/50">
                                <span className="inline-flex items-center gap-1">
                                  Status Faktur
                                </span>
                              </th>
                              <th className="px-3 py-2.5 text-right whitespace-nowrap border-r border-white/50">
                                Harga Jual / DPP
                              </th>
                              <th className="px-3 py-2.5 text-right whitespace-nowrap border-r border-white/50">
                                DPP Nilai Lain
                              </th>
                              <th className="px-3 py-2.5 text-right whitespace-nowrap border-r border-white/50">
                                PPN
                              </th>
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

                        {/* Inline White Filter Row (Exact Official Coretax Column Alignment) */}
                        {showColumnFilters && (
                          <tr className="bg-white border-b border-[#E2E8F0]">
                            <th className="px-2 py-2 border-r border-slate-100 text-center">
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
                                <th className="px-2 py-2 border-r border-slate-100" />
                                <th className="px-2 py-2 border-r border-slate-100">
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
                                </th>
                                <th className="px-2 py-2 border-r border-slate-100">
                                  <div className="flex items-center gap-1 min-w-[155px]">
                                    <input
                                      type="text"
                                      value={dateFilter}
                                      onChange={(e) => {
                                        setDateFilter(e.target.value);
                                        setPage(1);
                                      }}
                                      placeholder=""
                                      className="w-full border border-[#CBD5E1] rounded-[5px] px-2 py-1 text-[11px] font-normal focus:outline-none focus:border-[#1E2C5E]"
                                    />
                                    <span className="p-1 rounded bg-[#E0F2FE] text-[#1E2C5E] shrink-0">
                                      <Calendar className="w-3 h-3" />
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setDateFilter('');
                                        setPage(1);
                                      }}
                                      className="p-1 rounded bg-[#F1F5F9] hover:bg-slate-200 text-slate-500 shrink-0 cursor-pointer"
                                      title="Hapus filter tanggal"
                                    >
                                      <X className="w-3 h-3" />
                                    </button>
                                  </div>
                                </th>
                                <th className="px-2 py-2 border-r border-slate-100">
                                  <div className="flex items-center gap-1">
                                    <select
                                      value={monthFilter}
                                      onChange={(e) => {
                                        setMonthFilter(e.target.value);
                                        setPage(1);
                                      }}
                                      className="w-full min-w-[115px] border border-[#CBD5E1] bg-white rounded-[5px] px-1.5 py-1 text-[11px] font-normal focus:outline-none focus:border-[#1E2C5E]"
                                    >
                                      <option value="ALL">Semua Masa</option>
                                      {MONTHS_ID.map((m, idx) => (
                                        <option key={m} value={String(idx + 1)}>
                                          {m}
                                        </option>
                                      ))}
                                    </select>
                                    <Filter className="w-3 h-3 text-slate-400 shrink-0" />
                                  </div>
                                </th>
                                <th className="px-2 py-2 border-r border-slate-100">
                                  <div className="flex items-center gap-1">
                                    <input
                                      type="text"
                                      value={yearFilter}
                                      onChange={(e) => {
                                        setYearFilter(e.target.value);
                                        setPage(1);
                                      }}
                                      placeholder="2026"
                                      className="w-full min-w-[72px] border border-[#CBD5E1] rounded-[5px] px-2 py-1 text-[11px] font-normal focus:outline-none focus:border-[#1E2C5E]"
                                    />
                                    <span className="p-1 rounded-full bg-[#E0F2FE] text-[#1E2C5E] shrink-0">
                                      <Filter className="w-3 h-3" />
                                    </span>
                                  </div>
                                </th>
                                <th className="px-2 py-2 border-r border-slate-100" />
                                <th className="px-2 py-2 border-r border-slate-100" />
                                <th className="px-2 py-2 border-r border-slate-100">
                                  <select
                                    value={statusFilter}
                                    onChange={(e) => {
                                      setStatusFilter(e.target.value);
                                      setPage(1);
                                    }}
                                    className="w-full min-w-[125px] border border-[#CBD5E1] bg-white rounded-[5px] px-1.5 py-1 text-[11px] font-normal focus:outline-none focus:border-[#1E2C5E]"
                                  >
                                    <option value="ALL">Pilih Status Faktur</option>
                                    <option value="APPROVED">APPROVED</option>
                                    <option value="CREDITED">CREDITED</option>
                                    <option value="UNCREDITED">UNCREDITED</option>
                                    <option value="CANCELLED">CANCELLED</option>
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
                                <th className="px-2 py-2" />
                              </>
                            ) : normalizedTab === 'output' ? (
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
                                      className="w-full min-w-[120px] border border-[#CBD5E1] rounded-[5px] px-2 py-1 text-[11px] font-normal focus:outline-none focus:border-[#1E2C5E]"
                                    />
                                    <Filter className="w-3 h-3 text-slate-400 shrink-0" />
                                  </div>
                                </th>
                                <th className="px-2 py-2 border-r border-slate-100" />
                                <th className="px-2 py-2 border-r border-slate-100">
                                  <select
                                    value={txCodeFilter}
                                    onChange={(e) => {
                                      setTxCodeFilter(e.target.value);
                                      setPage(1);
                                    }}
                                    className="w-full min-w-[130px] border border-[#CBD5E1] bg-white rounded-[5px] px-1.5 py-1 text-[11px] font-normal focus:outline-none focus:border-[#1E2C5E]"
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
                                    placeholder=""
                                    className="w-full min-w-[130px] border border-[#CBD5E1] rounded-[5px] px-2 py-1 text-[11px] font-normal focus:outline-none focus:border-[#1E2C5E]"
                                  />
                                </th>
                                <th className="px-2 py-2 border-r border-slate-100">
                                  <div className="flex items-center gap-1 min-w-[155px]">
                                    <input
                                      type="text"
                                      value={dateFilter}
                                      onChange={(e) => {
                                        setDateFilter(e.target.value);
                                        setPage(1);
                                      }}
                                      placeholder=""
                                      className="w-full border border-[#CBD5E1] rounded-[5px] px-2 py-1 text-[11px] font-normal focus:outline-none focus:border-[#1E2C5E]"
                                    />
                                    <span className="p-1 rounded bg-[#E0F2FE] text-[#1E2C5E] shrink-0">
                                      <Calendar className="w-3 h-3" />
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setDateFilter('');
                                        setPage(1);
                                      }}
                                      className="p-1 rounded bg-[#F1F5F9] hover:bg-slate-200 text-slate-500 shrink-0 cursor-pointer"
                                      title="Hapus filter tanggal"
                                    >
                                      <X className="w-3 h-3" />
                                    </button>
                                  </div>
                                </th>
                                <th className="px-2 py-2 border-r border-slate-100">
                                  <div className="flex items-center gap-1">
                                    <select
                                      value={monthFilter}
                                      onChange={(e) => {
                                        setMonthFilter(e.target.value);
                                        setPage(1);
                                      }}
                                      className="w-full min-w-[105px] border border-[#CBD5E1] bg-white rounded-[5px] px-1.5 py-1 text-[11px] font-normal focus:outline-none focus:border-[#1E2C5E]"
                                    >
                                      <option value="ALL">Semua Masa</option>
                                      {MONTHS_ID.map((m, idx) => (
                                        <option key={m} value={String(idx + 1)}>
                                          {m}
                                        </option>
                                      ))}
                                    </select>
                                    <Filter className="w-3 h-3 text-slate-400 shrink-0" />
                                  </div>
                                </th>
                                <th className="px-2 py-2 border-r border-slate-100">
                                  <div className="flex items-center gap-1">
                                    <input
                                      type="text"
                                      value={yearFilter}
                                      onChange={(e) => {
                                        setYearFilter(e.target.value);
                                        setPage(1);
                                      }}
                                      placeholder="2026"
                                      className="w-full min-w-[72px] border border-[#CBD5E1] rounded-[5px] px-2 py-1 text-[11px] font-normal focus:outline-none focus:border-[#1E2C5E]"
                                    />
                                    <span className="p-1 rounded-full bg-[#E0F2FE] text-[#1E2C5E] shrink-0">
                                      <Filter className="w-3 h-3" />
                                    </span>
                                  </div>
                                </th>
                                <th className="px-2 py-2 border-r border-slate-100">
                                  <div className="flex items-center gap-1">
                                    <select
                                      value={statusFilter}
                                      onChange={(e) => {
                                        setStatusFilter(e.target.value);
                                        setPage(1);
                                      }}
                                      className="w-full min-w-[155px] border border-[#CBD5E1] bg-white rounded-[5px] px-1.5 py-1 text-[11px] font-normal focus:outline-none focus:border-[#1E2C5E]"
                                    >
                                      <option value="ALL">CREATED, APPROVED, SAVED_INVALID</option>
                                      <option value="DRAFT">DRAFT</option>
                                      <option value="APPROVED">APPROVED</option>
                                      <option value="WAITING_FOR_AMENDMENT">WAITING_FOR_AMENDMENT</option>
                                      <option value="AMENDED">AMENDED</option>
                                      <option value="WAITING_FOR_CANCELLATION">WAITING_FOR_CANCELLATION</option>
                                      <option value="CANCELLED">CANCELLED</option>
                                    </select>
                                    <Filter className="w-3 h-3 text-slate-400 shrink-0" />
                                  </div>
                                </th>
                                <th className="px-2 py-2 border-r border-slate-100" />
                                <th className="px-2 py-2 border-r border-slate-100" />
                                <th className="px-2 py-2 border-r border-slate-100" />
                                <th className="px-2 py-2 border-r border-slate-100" />
                                <th className="px-2 py-2 border-r border-slate-100" />
                                <th className="px-2 py-2 border-r border-slate-100" />
                                <th className="px-2 py-2 border-r border-slate-100">
                                  <input
                                    type="text"
                                    value={refFilter}
                                    onChange={(e) => {
                                      setRefFilter(e.target.value);
                                      setPage(1);
                                    }}
                                    placeholder=""
                                    className="w-full min-w-[100px] border border-[#CBD5E1] rounded-[5px] px-2 py-1 text-[11px] font-normal focus:outline-none focus:border-[#1E2C5E]"
                                  />
                                </th>
                                <th className="px-2 py-2 border-r border-slate-100" />
                                <th className="px-2 py-2 border-r border-slate-100" />
                                <th className="px-2 py-2" />
                              </>
                            ) : normalizedTab === 'retur_keluaran' || normalizedTab === 'retur_masukan' ? (
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
                                <th className="px-2 py-2 border-r border-slate-100" />
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
                                      className="w-full min-w-[115px] border border-[#CBD5E1] rounded-[5px] px-2 py-1 text-[11px] font-normal focus:outline-none focus:border-[#1E2C5E]"
                                    />
                                    <Filter className="w-3 h-3 text-slate-400 shrink-0" />
                                  </div>
                                </th>
                                <th className="px-2 py-2 border-r border-slate-100">
                                  <div className="flex items-center gap-1 min-w-[145px]">
                                    <input
                                      type="text"
                                      value={dateFilter}
                                      onChange={(e) => {
                                        setDateFilter(e.target.value);
                                        setPage(1);
                                      }}
                                      placeholder=""
                                      className="w-full border border-[#CBD5E1] rounded-[5px] px-2 py-1 text-[11px] font-normal focus:outline-none focus:border-[#1E2C5E]"
                                    />
                                    <span className="p-1 rounded bg-[#E0F2FE] text-[#1E2C5E] shrink-0">
                                      <Calendar className="w-3 h-3" />
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setDateFilter('');
                                        setPage(1);
                                      }}
                                      className="p-1 rounded bg-[#F1F5F9] hover:bg-slate-200 text-slate-500 shrink-0 cursor-pointer"
                                    >
                                      <X className="w-3 h-3" />
                                    </button>
                                  </div>
                                </th>
                                <th className="px-2 py-2 border-r border-slate-100">
                                  <div className="flex items-center gap-1">
                                    <input
                                      type="text"
                                      value={refFilter}
                                      onChange={(e) => {
                                        setRefFilter(e.target.value);
                                        setPage(1);
                                      }}
                                      placeholder=""
                                      className="w-full min-w-[115px] border border-[#CBD5E1] rounded-[5px] px-2 py-1 text-[11px] font-normal focus:outline-none focus:border-[#1E2C5E]"
                                    />
                                    <Filter className="w-3 h-3 text-slate-400 shrink-0" />
                                  </div>
                                </th>
                                <th className="px-2 py-2 border-r border-slate-100">
                                  <div className="flex items-center gap-1 min-w-[145px]">
                                    <input
                                      type="text"
                                      placeholder=""
                                      readOnly
                                      className="w-full border border-[#CBD5E1] rounded-[5px] px-2 py-1 text-[11px] font-normal focus:outline-none"
                                    />
                                    <span className="p-1 rounded bg-[#E0F2FE] text-[#1E2C5E] shrink-0">
                                      <Calendar className="w-3 h-3" />
                                    </span>
                                    <span className="p-1 rounded bg-[#F1F5F9] text-slate-400 shrink-0">
                                      <X className="w-3 h-3" />
                                    </span>
                                  </div>
                                </th>
                                <th className="px-2 py-2 border-r border-slate-100">
                                  <div className="flex items-center gap-1">
                                    <select
                                      value={monthFilter}
                                      onChange={(e) => {
                                        setMonthFilter(e.target.value);
                                        setPage(1);
                                      }}
                                      className="w-full min-w-[115px] border border-[#CBD5E1] bg-white rounded-[5px] px-1.5 py-1 text-[11px] font-normal focus:outline-none focus:border-[#1E2C5E]"
                                    >
                                      <option value="ALL">Pilih Masa Pajak</option>
                                      {MONTHS_ID.map((m, idx) => (
                                        <option key={m} value={String(idx + 1)}>
                                          {m}
                                        </option>
                                      ))}
                                    </select>
                                    {normalizedTab === 'retur_masukan' && (
                                      <Filter className="w-3 h-3 text-slate-400 shrink-0" />
                                    )}
                                  </div>
                                </th>
                                <th className="px-2 py-2 border-r border-slate-100">
                                  <div className="flex items-center gap-1">
                                    <input
                                      type="text"
                                      value={yearFilter}
                                      onChange={(e) => {
                                        setYearFilter(e.target.value);
                                        setPage(1);
                                      }}
                                      placeholder="2026"
                                      className="w-full min-w-[72px] border border-[#CBD5E1] rounded-[5px] px-2 py-1 text-[11px] font-normal focus:outline-none focus:border-[#1E2C5E]"
                                    />
                                    <span className="p-1 rounded-full bg-[#E0F2FE] text-[#1E2C5E] shrink-0">
                                      <Filter className="w-3 h-3" />
                                    </span>
                                  </div>
                                </th>
                                <th className="px-2 py-2 border-r border-slate-100">
                                  <div className="flex items-center gap-1">
                                    <input
                                      type="text"
                                      value={statusFilter === 'ALL' ? '' : statusFilter}
                                      onChange={(e) => {
                                        setStatusFilter(e.target.value.trim() || 'ALL');
                                        setPage(1);
                                      }}
                                      placeholder=""
                                      className="w-full min-w-[95px] border border-[#CBD5E1] rounded-[5px] px-2 py-1 text-[11px] font-normal focus:outline-none focus:border-[#1E2C5E]"
                                    />
                                    <Filter className="w-3 h-3 text-slate-400 shrink-0" />
                                  </div>
                                </th>
                                {normalizedTab === 'retur_masukan' && (
                                  <>
                                    <th className="px-2 py-2 border-r border-slate-100" />
                                    <th className="px-2 py-2 border-r border-slate-100">
                                      <select
                                        value={creditFilter}
                                        onChange={(e) => {
                                          setCreditFilter(e.target.value);
                                          setPage(1);
                                        }}
                                        className="w-full min-w-[130px] border border-[#CBD5E1] bg-white rounded-[5px] px-1.5 py-1 text-[11px] font-normal focus:outline-none focus:border-[#1E2C5E]"
                                      >
                                        <option value="ALL">Pilih Dikreditkan (Y/N)</option>
                                        <option value="CREDITED">Ya</option>
                                        <option value="UNCREDITED">Tidak</option>
                                      </select>
                                    </th>
                                  </>
                                )}
                                <th className="px-2 py-2 border-r border-slate-100">
                                  {normalizedTab === 'retur_keluaran' && <Filter className="w-3 h-3 text-slate-400" />}
                                </th>
                                <th className="px-2 py-2 border-r border-slate-100">
                                  {normalizedTab === 'retur_keluaran' && <Filter className="w-3 h-3 text-slate-400" />}
                                </th>
                                <th className="px-2 py-2 border-r border-slate-100">
                                  {normalizedTab === 'retur_keluaran' && <Filter className="w-3 h-3 text-slate-400" />}
                                </th>
                                <th className="px-2 py-2 border-r border-slate-100">
                                  {normalizedTab === 'retur_keluaran' && <Filter className="w-3 h-3 text-slate-400" />}
                                </th>
                                <th className="px-2 py-2 border-r border-slate-100">
                                  <div className="flex items-center gap-1">
                                    <input
                                      type="text"
                                      placeholder=""
                                      readOnly
                                      className="w-full min-w-[90px] border border-[#CBD5E1] rounded-[5px] px-2 py-1 text-[11px] font-normal focus:outline-none"
                                    />
                                    <Filter className="w-3 h-3 text-slate-400 shrink-0" />
                                  </div>
                                </th>
                                <th className="px-2 py-2">
                                  <select
                                    defaultValue="ALL"
                                    className="w-full min-w-[115px] border border-[#CBD5E1] bg-white rounded-[5px] px-1.5 py-1 text-[11px] font-normal focus:outline-none focus:border-[#1E2C5E]"
                                  >
                                    <option value="ALL">Pilih Dilaporkan</option>
                                    <option value="YES">Ya</option>
                                    <option value="NO">Tidak</option>
                                  </select>
                                </th>
                              </>
                            ) : normalizedTab === 'dok_lain_keluaran' ? (
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
                                <th className="px-2 py-2 border-r border-slate-100" />
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
                                      className="w-full min-w-[115px] border border-[#CBD5E1] rounded-[5px] px-2 py-1 text-[11px] font-normal focus:outline-none focus:border-[#1E2C5E]"
                                    />
                                    <Filter className="w-3 h-3 text-slate-400 shrink-0" />
                                  </div>
                                </th>
                                <th className="px-2 py-2 border-r border-slate-100">
                                  <div className="flex items-center gap-1 min-w-[145px]">
                                    <input
                                      type="text"
                                      value={dateFilter}
                                      onChange={(e) => {
                                        setDateFilter(e.target.value);
                                        setPage(1);
                                      }}
                                      placeholder=""
                                      className="w-full border border-[#CBD5E1] rounded-[5px] px-2 py-1 text-[11px] font-normal focus:outline-none focus:border-[#1E2C5E]"
                                    />
                                    <span className="p-1 rounded bg-[#E0F2FE] text-[#1E2C5E] shrink-0">
                                      <Calendar className="w-3 h-3" />
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setDateFilter('');
                                        setPage(1);
                                      }}
                                      className="p-1 rounded bg-[#F1F5F9] hover:bg-slate-200 text-slate-500 shrink-0 cursor-pointer"
                                    >
                                      <X className="w-3 h-3" />
                                    </button>
                                  </div>
                                </th>
                                <th className="px-2 py-2 border-r border-slate-100">
                                  <select
                                    value={txCodeFilter}
                                    onChange={(e) => {
                                      setTxCodeFilter(e.target.value);
                                      setPage(1);
                                    }}
                                    className="w-full min-w-[125px] border border-[#CBD5E1] bg-white rounded-[5px] px-1.5 py-1 text-[11px] font-normal focus:outline-none focus:border-[#1E2C5E]"
                                  >
                                    <option value="ALL">Pilih Jenis Transaksi</option>
                                    {FAKTUR_TRANSACTION_CODES.map((c) => (
                                      <option key={c.code} value={c.code}>
                                        {c.code}
                                      </option>
                                    ))}
                                  </select>
                                </th>
                                <th className="px-2 py-2 border-r border-slate-100">
                                  <select
                                    value={monthFilter}
                                    onChange={(e) => {
                                      setMonthFilter(e.target.value);
                                      setPage(1);
                                    }}
                                    className="w-full min-w-[115px] border border-[#CBD5E1] bg-white rounded-[5px] px-1.5 py-1 text-[11px] font-normal focus:outline-none focus:border-[#1E2C5E]"
                                  >
                                    <option value="ALL">Pilih Masa Pajak</option>
                                    {MONTHS_ID.map((m, idx) => (
                                      <option key={m} value={String(idx + 1)}>
                                        {m}
                                      </option>
                                    ))}
                                  </select>
                                </th>
                                <th className="px-2 py-2 border-r border-slate-100">
                                  <div className="flex items-center gap-1">
                                    <input
                                      type="text"
                                      value={yearFilter}
                                      onChange={(e) => {
                                        setYearFilter(e.target.value);
                                        setPage(1);
                                      }}
                                      placeholder=""
                                      className="w-full min-w-[75px] border border-[#CBD5E1] rounded-[5px] px-2 py-1 text-[11px] font-normal focus:outline-none focus:border-[#1E2C5E]"
                                    />
                                    <Filter className="w-3 h-3 text-slate-400 shrink-0" />
                                  </div>
                                </th>
                                <th className="px-2 py-2 border-r border-slate-100">
                                  <div className="flex items-center gap-1">
                                    <input
                                      type="text"
                                      value={statusFilter === 'ALL' ? '' : statusFilter}
                                      onChange={(e) => {
                                        setStatusFilter(e.target.value.trim() || 'ALL');
                                        setPage(1);
                                      }}
                                      placeholder=""
                                      className="w-full min-w-[95px] border border-[#CBD5E1] rounded-[5px] px-2 py-1 text-[11px] font-normal focus:outline-none focus:border-[#1E2C5E]"
                                    />
                                    <Filter className="w-3 h-3 text-slate-400 shrink-0" />
                                  </div>
                                </th>
                                <th className="px-2 py-2 border-r border-slate-100">
                                  <Filter className="w-3 h-3 text-slate-400" />
                                </th>
                                <th className="px-2 py-2 border-r border-slate-100">
                                  <Filter className="w-3 h-3 text-slate-400" />
                                </th>
                                <th className="px-2 py-2 border-r border-slate-100">
                                  <Filter className="w-3 h-3 text-slate-400" />
                                </th>
                                <th className="px-2 py-2 border-r border-slate-100">
                                  <select
                                    defaultValue="ALL"
                                    className="w-full min-w-[115px] border border-[#CBD5E1] bg-white rounded-[5px] px-1.5 py-1 text-[11px] font-normal focus:outline-none focus:border-[#1E2C5E]"
                                  >
                                    <option value="ALL">Pilih Keterangan</option>
                                  </select>
                                </th>
                                <th className="px-2 py-2 border-r border-slate-100">
                                  <div className="flex items-center gap-1">
                                    <input
                                      type="text"
                                      placeholder=""
                                      readOnly
                                      className="w-full min-w-[90px] border border-[#CBD5E1] rounded-[5px] px-2 py-1 text-[11px] font-normal focus:outline-none"
                                    />
                                    <Filter className="w-3 h-3 text-slate-400 shrink-0" />
                                  </div>
                                </th>
                                <th className="px-2 py-2">
                                  <select
                                    defaultValue="ALL"
                                    className="w-full min-w-[115px] border border-[#CBD5E1] bg-white rounded-[5px] px-1.5 py-1 text-[11px] font-normal focus:outline-none focus:border-[#1E2C5E]"
                                  >
                                    <option value="ALL">Pilih Dilaporkan</option>
                                    <option value="YES">Ya</option>
                                    <option value="NO">Tidak</option>
                                  </select>
                                </th>
                              </>
                            ) : normalizedTab === 'dok_lain_masukan' ? (
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
                                <th className="px-2 py-2 border-r border-slate-100" />
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
                                      className="w-full min-w-[115px] border border-[#CBD5E1] rounded-[5px] px-2 py-1 text-[11px] font-normal focus:outline-none focus:border-[#1E2C5E]"
                                    />
                                    <Filter className="w-3 h-3 text-slate-400 shrink-0" />
                                  </div>
                                </th>
                                <th className="px-2 py-2 border-r border-slate-100">
                                  <div className="flex items-center gap-1 min-w-[145px]">
                                    <input
                                      type="text"
                                      value={dateFilter}
                                      onChange={(e) => {
                                        setDateFilter(e.target.value);
                                        setPage(1);
                                      }}
                                      placeholder=""
                                      className="w-full border border-[#CBD5E1] rounded-[5px] px-2 py-1 text-[11px] font-normal focus:outline-none focus:border-[#1E2C5E]"
                                    />
                                    <span className="p-1 rounded bg-[#E0F2FE] text-[#1E2C5E] shrink-0">
                                      <Calendar className="w-3 h-3" />
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setDateFilter('');
                                        setPage(1);
                                      }}
                                      className="p-1 rounded bg-[#F1F5F9] hover:bg-slate-200 text-slate-500 shrink-0 cursor-pointer"
                                    >
                                      <X className="w-3 h-3" />
                                    </button>
                                  </div>
                                </th>
                                <th className="px-2 py-2 border-r border-slate-100">
                                  <select
                                    value={txCodeFilter}
                                    onChange={(e) => {
                                      setTxCodeFilter(e.target.value);
                                      setPage(1);
                                    }}
                                    className="w-full min-w-[125px] border border-[#CBD5E1] bg-white rounded-[5px] px-1.5 py-1 text-[11px] font-normal focus:outline-none focus:border-[#1E2C5E]"
                                  >
                                    <option value="ALL">Pilih Jenis Transaksi</option>
                                    {FAKTUR_TRANSACTION_CODES.map((c) => (
                                      <option key={c.code} value={c.code}>
                                        {c.code}
                                      </option>
                                    ))}
                                  </select>
                                </th>
                                <th className="px-2 py-2 border-r border-slate-100">
                                  <select
                                    value={monthFilter}
                                    onChange={(e) => {
                                      setMonthFilter(e.target.value);
                                      setPage(1);
                                    }}
                                    className="w-full min-w-[115px] border border-[#CBD5E1] bg-white rounded-[5px] px-1.5 py-1 text-[11px] font-normal focus:outline-none focus:border-[#1E2C5E]"
                                  >
                                    <option value="ALL">Pilih Masa Pajak</option>
                                    {MONTHS_ID.map((m, idx) => (
                                      <option key={m} value={String(idx + 1)}>
                                        {m}
                                      </option>
                                    ))}
                                  </select>
                                </th>
                                <th className="px-2 py-2 border-r border-slate-100">
                                  <div className="flex items-center gap-1">
                                    <input
                                      type="text"
                                      value={yearFilter}
                                      onChange={(e) => {
                                        setYearFilter(e.target.value);
                                        setPage(1);
                                      }}
                                      placeholder=""
                                      className="w-full min-w-[75px] border border-[#CBD5E1] rounded-[5px] px-2 py-1 text-[11px] font-normal focus:outline-none focus:border-[#1E2C5E]"
                                    />
                                    <Filter className="w-3 h-3 text-slate-400 shrink-0" />
                                  </div>
                                </th>
                                <th className="px-2 py-2 border-r border-slate-100">
                                  <select
                                    defaultValue="ALL"
                                    className="w-full min-w-[155px] border border-[#CBD5E1] bg-white rounded-[5px] px-1.5 py-1 text-[11px] font-normal focus:outline-none focus:border-[#1E2C5E]"
                                  >
                                    <option value="ALL">Pilih Masa Pajak Pengkreditan</option>
                                    {MONTHS_ID.map((m, idx) => (
                                      <option key={m} value={String(idx + 1)}>
                                        {m}
                                      </option>
                                    ))}
                                  </select>
                                </th>
                                <th className="px-2 py-2 border-r border-slate-100">
                                  <div className="flex items-center gap-1">
                                    <input
                                      type="text"
                                      placeholder=""
                                      readOnly
                                      className="w-full min-w-[85px] border border-[#CBD5E1] rounded-[5px] px-2 py-1 text-[11px] font-normal focus:outline-none"
                                    />
                                    <Filter className="w-3 h-3 text-slate-400 shrink-0" />
                                  </div>
                                </th>
                                <th className="px-2 py-2 border-r border-slate-100">
                                  <Filter className="w-3 h-3 text-slate-400" />
                                </th>
                                <th className="px-2 py-2 border-r border-slate-100">
                                  <Filter className="w-3 h-3 text-slate-400" />
                                </th>
                                <th className="px-2 py-2 border-r border-slate-100">
                                  <Filter className="w-3 h-3 text-slate-400" />
                                </th>
                                <th className="px-2 py-2 border-r border-slate-100">
                                  <div className="flex items-center gap-1">
                                    <input
                                      type="text"
                                      value={statusFilter === 'ALL' ? '' : statusFilter}
                                      onChange={(e) => {
                                        setStatusFilter(e.target.value.trim() || 'ALL');
                                        setPage(1);
                                      }}
                                      placeholder=""
                                      className="w-full min-w-[90px] border border-[#CBD5E1] rounded-[5px] px-2 py-1 text-[11px] font-normal focus:outline-none focus:border-[#1E2C5E]"
                                    />
                                    <Filter className="w-3 h-3 text-slate-400 shrink-0" />
                                  </div>
                                </th>
                                <th className="px-2 py-2 border-r border-slate-100">
                                  <select
                                    defaultValue="ALL"
                                    className="w-full min-w-[105px] border border-[#CBD5E1] bg-white rounded-[5px] px-1.5 py-1 text-[11px] font-normal focus:outline-none focus:border-[#1E2C5E]"
                                  >
                                    <option value="ALL">Pilih Valid</option>
                                    <option value="VALID">Valid</option>
                                    <option value="INVALID">Tidak Valid</option>
                                  </select>
                                </th>
                                <th className="px-2 py-2 border-r border-slate-100">
                                  <select
                                    defaultValue="ALL"
                                    className="w-full min-w-[115px] border border-[#CBD5E1] bg-white rounded-[5px] px-1.5 py-1 text-[11px] font-normal focus:outline-none focus:border-[#1E2C5E]"
                                  >
                                    <option value="ALL">Pilih Dilaporkan</option>
                                    <option value="YES">Ya</option>
                                    <option value="NO">Tidak</option>
                                  </select>
                                </th>
                                <th className="px-2 py-2 border-r border-slate-100">
                                  <select
                                    defaultValue="ALL"
                                    className="w-full min-w-[115px] border border-[#CBD5E1] bg-white rounded-[5px] px-1.5 py-1 text-[11px] font-normal focus:outline-none focus:border-[#1E2C5E]"
                                  >
                                    <option value="ALL">Pilih Keterangan</option>
                                  </select>
                                </th>
                                <th className="px-2 py-2 border-r border-slate-100">
                                  <div className="flex items-center gap-1">
                                    <input
                                      type="text"
                                      placeholder=""
                                      readOnly
                                      className="w-full min-w-[90px] border border-[#CBD5E1] rounded-[5px] px-2 py-1 text-[11px] font-normal focus:outline-none"
                                    />
                                    <Filter className="w-3 h-3 text-slate-400 shrink-0" />
                                  </div>
                                </th>
                                <th className="px-2 py-2">
                                  <div className="flex items-center gap-1">
                                    <input
                                      type="text"
                                      placeholder=""
                                      readOnly
                                      className="w-full min-w-[90px] border border-[#CBD5E1] rounded-[5px] px-2 py-1 text-[11px] font-normal focus:outline-none"
                                    />
                                    <Filter className="w-3 h-3 text-slate-400 shrink-0" />
                                  </div>
                                </th>
                              </>
                            ) : normalizedTab === 'retur_dok_lain_keluaran' ||
                              normalizedTab === 'retur_dok_lain_masukan' ? (
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
                                <th className="px-2 py-2 border-r border-slate-100" />
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
                                      className="w-full min-w-[115px] border border-[#CBD5E1] rounded-[5px] px-2 py-1 text-[11px] font-normal focus:outline-none focus:border-[#1E2C5E]"
                                    />
                                    <Filter className="w-3 h-3 text-slate-400 shrink-0" />
                                  </div>
                                </th>
                                <th className="px-2 py-2 border-r border-slate-100">
                                  <div className="flex items-center gap-1">
                                    <input
                                      type="text"
                                      value={refFilter}
                                      onChange={(e) => {
                                        setRefFilter(e.target.value);
                                        setPage(1);
                                      }}
                                      placeholder=""
                                      className="w-full min-w-[115px] border border-[#CBD5E1] rounded-[5px] px-2 py-1 text-[11px] font-normal focus:outline-none focus:border-[#1E2C5E]"
                                    />
                                    <Filter className="w-3 h-3 text-slate-400 shrink-0" />
                                  </div>
                                </th>
                                <th className="px-2 py-2 border-r border-slate-100">
                                  <div className="flex items-center gap-1 min-w-[145px]">
                                    <input
                                      type="text"
                                      value={dateFilter}
                                      onChange={(e) => {
                                        setDateFilter(e.target.value);
                                        setPage(1);
                                      }}
                                      placeholder=""
                                      className="w-full border border-[#CBD5E1] rounded-[5px] px-2 py-1 text-[11px] font-normal focus:outline-none focus:border-[#1E2C5E]"
                                    />
                                    <span className="p-1 rounded bg-[#E0F2FE] text-[#1E2C5E] shrink-0">
                                      <Calendar className="w-3 h-3" />
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setDateFilter('');
                                        setPage(1);
                                      }}
                                      className="p-1 rounded bg-[#F1F5F9] hover:bg-slate-200 text-slate-500 shrink-0 cursor-pointer"
                                    >
                                      <X className="w-3 h-3" />
                                    </button>
                                  </div>
                                </th>
                                <th className="px-2 py-2 border-r border-slate-100">
                                  <select
                                    value={monthFilter}
                                    onChange={(e) => {
                                      setMonthFilter(e.target.value);
                                      setPage(1);
                                    }}
                                    className="w-full min-w-[115px] border border-[#CBD5E1] bg-white rounded-[5px] px-1.5 py-1 text-[11px] font-normal focus:outline-none focus:border-[#1E2C5E]"
                                  >
                                    <option value="ALL">Pilih Masa Pajak</option>
                                    {MONTHS_ID.map((m, idx) => (
                                      <option key={m} value={String(idx + 1)}>
                                        {m}
                                      </option>
                                    ))}
                                  </select>
                                </th>
                                <th className="px-2 py-2 border-r border-slate-100">
                                  <div className="flex items-center gap-1">
                                    <input
                                      type="text"
                                      value={yearFilter}
                                      onChange={(e) => {
                                        setYearFilter(e.target.value);
                                        setPage(1);
                                      }}
                                      placeholder=""
                                      className="w-full min-w-[75px] border border-[#CBD5E1] rounded-[5px] px-2 py-1 text-[11px] font-normal focus:outline-none focus:border-[#1E2C5E]"
                                    />
                                    <Filter className="w-3 h-3 text-slate-400 shrink-0" />
                                  </div>
                                </th>
                                <th className="px-2 py-2 border-r border-slate-100">
                                  <div className="flex items-center gap-1">
                                    <input
                                      type="text"
                                      value={statusFilter === 'ALL' ? '' : statusFilter}
                                      onChange={(e) => {
                                        setStatusFilter(e.target.value.trim() || 'ALL');
                                        setPage(1);
                                      }}
                                      placeholder=""
                                      className="w-full min-w-[95px] border border-[#CBD5E1] rounded-[5px] px-2 py-1 text-[11px] font-normal focus:outline-none focus:border-[#1E2C5E]"
                                    />
                                    <Filter className="w-3 h-3 text-slate-400 shrink-0" />
                                  </div>
                                </th>
                                {normalizedTab === 'retur_dok_lain_masukan' && (
                                  <th className="px-2 py-2 border-r border-slate-100">
                                    <select
                                      value={creditFilter}
                                      onChange={(e) => {
                                        setCreditFilter(e.target.value);
                                        setPage(1);
                                      }}
                                      className="w-full min-w-[130px] border border-[#CBD5E1] bg-white rounded-[5px] px-1.5 py-1 text-[11px] font-normal focus:outline-none focus:border-[#1E2C5E]"
                                    >
                                      <option value="ALL">Pilih Dikreditkan (Y/N)</option>
                                      <option value="CREDITED">Ya</option>
                                      <option value="UNCREDITED">Tidak</option>
                                    </select>
                                  </th>
                                )}
                                <th className="px-2 py-2 border-r border-slate-100">
                                  <Filter className="w-3 h-3 text-slate-400" />
                                </th>
                                <th className="px-2 py-2 border-r border-slate-100">
                                  <Filter className="w-3 h-3 text-slate-400" />
                                </th>
                                <th className="px-2 py-2 border-r border-slate-100">
                                  <Filter className="w-3 h-3 text-slate-400" />
                                </th>
                                {normalizedTab === 'retur_dok_lain_masukan' && (
                                  <th className="px-2 py-2 border-r border-slate-100">
                                    <div className="flex items-center gap-1">
                                      <input
                                        type="text"
                                        placeholder=""
                                        readOnly
                                        className="w-full min-w-[90px] border border-[#CBD5E1] rounded-[5px] px-2 py-1 text-[11px] font-normal focus:outline-none"
                                      />
                                      <Filter className="w-3 h-3 text-slate-400 shrink-0" />
                                    </div>
                                  </th>
                                )}
                                <th className="px-2 py-2 border-r border-slate-100">
                                  <div className="flex items-center gap-1">
                                    <input
                                      type="text"
                                      placeholder=""
                                      readOnly
                                      className="w-full min-w-[90px] border border-[#CBD5E1] rounded-[5px] px-2 py-1 text-[11px] font-normal focus:outline-none"
                                    />
                                    <Filter className="w-3 h-3 text-slate-400 shrink-0" />
                                  </div>
                                </th>
                                <th className="px-2 py-2">
                                  <select
                                    defaultValue="ALL"
                                    className="w-full min-w-[115px] border border-[#CBD5E1] bg-white rounded-[5px] px-1.5 py-1 text-[11px] font-normal focus:outline-none focus:border-[#1E2C5E]"
                                  >
                                    <option value="ALL">Pilih Dilaporkan</option>
                                    <option value="YES">Ya</option>
                                    <option value="NO">Tidak</option>
                                  </select>
                                </th>
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
                                    <option value="DRAFT">DRAFT</option>
                                    <option value="APPROVED">APPROVED</option>
                                    <option value="WAITING_FOR_AMENDMENT">WAITING_FOR_AMENDMENT</option>
                                    <option value="AMENDED">AMENDED</option>
                                    <option value="WAITING_FOR_CANCELLATION">WAITING_FOR_CANCELLATION</option>
                                    <option value="CANCELLED">CANCELLED</option>
                                  </select>
                                </th>
                                <th colSpan={isInputTab || isReturTab ? 4 : 3} className="px-2 py-2" />
                              </>
                            )}
                          </tr>
                        )}
                      </thead>

                      <tbody className="divide-y divide-[#EEF2F6] bg-white">
                        {paginatedInvoices.length === 0 ? (
                          <tr>
                            <td
                              colSpan={
                                normalizedTab === 'output'
                                  ? 20
                                  : normalizedTab === 'input'
                                    ? 21
                                    : normalizedTab === 'dok_lain_masukan'
                                      ? 20
                                      : normalizedTab === 'retur_masukan'
                                        ? 19
                                        : normalizedTab === 'retur_keluaran' ||
                                            normalizedTab === 'retur_dok_lain_masukan'
                                          ? 17
                                          : normalizedTab === 'dok_lain_keluaran'
                                            ? 16
                                            : normalizedTab === 'retur_dok_lain_keluaran'
                                              ? 15
                                              : 13
                              }
                              className="px-4 py-3 text-left text-[12px] text-[#334155] bg-[#F1F5F9]/75"
                            >
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
                              {normalizedTab === 'output' ? (
                                <>
                                  <td className="px-3 py-2.5 whitespace-nowrap">
                                    <div className="flex items-center gap-1.5">
                                      {inv.status === 'DRAFT' ? (
                                        <>
                                          {/* Tombol Edit (Pensil Biru) */}
                                          <button
                                            type="button"
                                            onClick={() => handleEditRowInvoice(inv)}
                                            className="w-6 h-6 rounded-[6px] bg-[#EBF5FB] hover:bg-[#D4EBF8] text-[#1E3A8A] inline-flex items-center justify-center cursor-pointer transition shadow-xs"
                                            title="Ubah Konsep Faktur"
                                          >
                                            <Edit3 className="w-3.5 h-3.5" />
                                          </button>
                                          {/* Tombol Hapus (Tong Sampah Merah) */}
                                          <button
                                            type="button"
                                            onClick={() => onInvoiceAction(inv.id, 'DELETE')}
                                            className="w-6 h-6 rounded-[6px] bg-[#C25E5E] hover:bg-[#A94A4A] text-white inline-flex items-center justify-center cursor-pointer transition shadow-xs"
                                            title="Hapus Dokumen"
                                          >
                                            <Trash2 className="w-3.5 h-3.5" />
                                          </button>
                                        </>
                                      ) : (
                                        <>
                                          {/* Tombol Edit / Ganti (Pensil Biru) */}
                                          <button
                                            type="button"
                                            onClick={() => handleEditRowInvoice(inv)}
                                            className="w-6 h-6 rounded-[6px] bg-[#EBF5FB] hover:bg-[#D4EBF8] text-[#1E3A8A] inline-flex items-center justify-center cursor-pointer transition shadow-xs"
                                            title="Ubah / Ganti Faktur"
                                          >
                                            <Edit3 className="w-3.5 h-3.5" />
                                          </button>
                                          {/* Tombol Batal Faktur (Target Kuning / Emas) */}
                                          <button
                                            type="button"
                                            onClick={() => setCancelModalTarget(inv)}
                                            className="w-6 h-6 rounded-[6px] bg-[#FEF6E7] hover:bg-[#FDECC8] text-[#B87A00] inline-flex items-center justify-center cursor-pointer transition shadow-xs"
                                            title="Batalkan Faktur Pajak"
                                          >
                                            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                              <circle cx="12" cy="12" r="9" />
                                              <rect x="9" y="9" width="6" height="6" fill="currentColor" />
                                            </svg>
                                          </button>
                                          {/* Tombol PDF (Dokumen Merah) */}
                                          <button
                                            type="button"
                                            onClick={() => downloadFakturPajakPdf(inv, workspace.corporateTaxpayer)}
                                            className="w-6 h-6 rounded-[6px] bg-[#C25E5E] hover:bg-[#A94A4A] text-white inline-flex items-center justify-center cursor-pointer transition shadow-xs"
                                            title="Download Faktur Pajak (PDF)"
                                          >
                                            <FileText className="w-3.5 h-3.5" />
                                          </button>
                                        </>
                                      )}
                                    </div>
                                  </td>
                                  <td className="px-3 py-2.5 font-mono-num text-[#334155] whitespace-nowrap">
                                    {inv.counterpartyNpwp}
                                  </td>
                                  <td className="px-3 py-2.5 font-normal text-[#1E293B] whitespace-nowrap">
                                    {inv.counterpartyName}
                                  </td>
                                  <td className="px-3 py-2.5 whitespace-nowrap text-[#334155]">
                                    {inv.status === 'DRAFT'
                                      ? ''
                                      : FAKTUR_TRANSACTION_CODES.find((c) => c.code === inv.transactionCode)?.label ||
                                        (inv.transactionCode ? `${inv.transactionCode} - Transaksi Pajak` : '')}
                                  </td>
                                  <td className="px-3 py-2.5 font-mono-num whitespace-nowrap text-[#334155]">
                                    {inv.status === 'DRAFT' ? '' : inv.invoiceNumber}
                                  </td>
                                  <td className="px-3 py-2.5 font-mono-num whitespace-nowrap text-[#334155]">
                                    {formatCoretaxDate(inv.invoiceDate)}
                                  </td>
                                  <td className="px-3 py-2.5 whitespace-nowrap text-[#334155]">
                                    {MONTHS_ID[Math.max(0, (inv.taxPeriodMonth || 11) - 1)] || 'November'}
                                  </td>
                                  <td className="px-3 py-2.5 text-center font-mono-num whitespace-nowrap text-[#334155]">
                                    {inv.taxPeriodYear || 2026}
                                  </td>
                                  <td className="px-3 py-2.5 text-center whitespace-nowrap">
                                    <span
                                      className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded border ${
                                        STATUS_BADGE[inv.status] || 'bg-slate-100 text-slate-700 border-slate-300'
                                      }`}
                                    >
                                      {inv.status}
                                    </span>
                                  </td>
                                  <td className="px-3 py-2.5 text-center whitespace-nowrap font-medium text-emerald-700">
                                    {inv.status === 'APPROVED' ? 'Done' : 'Pending'}
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
                                  <td className="px-3 py-2.5 whitespace-nowrap text-slate-700 uppercase font-medium">
                                    {(workspace.corporateTaxpayer as any)?.representativeName || workspace.individualTaxpayer?.name || 'ARIEF BASYARI'}
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
                                </>
                              ) : normalizedTab === 'input' ? (
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
                                        onClick={() => downloadFakturPajakPdf(inv, activeTaxpayer)}
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
                                  <td className="px-3 py-2.5 whitespace-nowrap text-slate-700 text-center">
                                    {inv.isCredited !== false
                                      ? MONTHS_ID[Math.max(0, inv.taxPeriodMonth - 1)] || 'November'
                                      : '-'}
                                  </td>
                                  <td className="px-3 py-2.5 text-center font-mono-num whitespace-nowrap">
                                    {inv.isCredited !== false ? inv.taxPeriodYear || 2026 : '-'}
                                  </td>
                                  <td className="px-3 py-2.5 text-center whitespace-nowrap">
                                    <span
                                      className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded border ${
                                        inv.status === 'CANCELLED'
                                          ? STATUS_BADGE.CANCELLED
                                          : inv.isCredited === false
                                            ? 'bg-slate-100 text-slate-600 border-slate-300'
                                            : 'bg-emerald-50 text-emerald-800 border-emerald-300'
                                      }`}
                                    >
                                      {inv.status === 'CANCELLED'
                                        ? 'CANCELLED'
                                        : inv.isCredited === false
                                          ? 'UNCREDITED'
                                          : 'CREDITED'}
                                    </span>
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
                                    {(inv as any).creatorName || (activeTaxpayer as any).representativeName || workspace.individualTaxpayer.name || 'BAYU TRI RAHARDJO'}
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
                              ) : normalizedTab === 'retur_keluaran' || normalizedTab === 'retur_masukan' ? (
                                <>
                                  <td className="px-3 py-2.5 whitespace-nowrap">
                                    <div className="flex items-center gap-1.5">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setReturnTarget(inv);
                                          setReturnAmount(inv.returnAmount || Math.round(inv.ppnTotal * 0.2));
                                        }}
                                        className="inline-flex items-center gap-1 px-2 py-1 rounded bg-[#1D2B53] text-[#F4C430] text-[10.5px] font-bold cursor-pointer"
                                      >
                                        <RotateCcw className="w-3 h-3" />
                                        <span>Retur</span>
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => downloadFakturPajakPdf(inv, activeTaxpayer)}
                                        className="w-5 h-5 rounded-[3px] bg-[#A83232] hover:bg-[#8B2626] text-white inline-flex items-center justify-center cursor-pointer transition shadow-xs"
                                        title="Download PDF"
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
                                  <td className="px-3 py-2.5 font-mono-num font-bold text-[#1E2C5E] whitespace-nowrap">
                                    {inv.invoiceNumber}
                                  </td>
                                  <td className="px-3 py-2.5 font-mono-num whitespace-nowrap">
                                    {inv.invoiceDate || '-'}
                                  </td>
                                  <td className="px-3 py-2.5 font-mono-num whitespace-nowrap text-slate-700">
                                    {inv.returnNoteNumber || '-'}
                                  </td>
                                  <td className="px-3 py-2.5 font-mono-num whitespace-nowrap text-slate-700">
                                    {inv.returnDate || '-'}
                                  </td>
                                  <td className="px-3 py-2.5 whitespace-nowrap text-slate-700">
                                    {MONTHS_ID[Math.max(0, inv.taxPeriodMonth - 1)] || 'November'}
                                  </td>
                                  <td className="px-3 py-2.5 font-mono-num whitespace-nowrap">
                                    {inv.taxPeriodYear || 2026}
                                  </td>
                                  <td className="px-3 py-2.5 whitespace-nowrap">
                                    <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded border ${STATUS_BADGE[inv.status]}`}>
                                      {inv.status}
                                    </span>
                                  </td>
                                  {normalizedTab === 'retur_masukan' && (
                                    <>
                                      <td className="px-3 py-2.5 whitespace-nowrap text-emerald-700 font-medium">
                                        {inv.status === 'APPROVED' ? 'Done' : 'Pending'}
                                      </td>
                                      <td className="px-3 py-2.5 whitespace-nowrap text-slate-700">
                                        {inv.isCredited !== false ? 'Ya' : 'Tidak'}
                                      </td>
                                    </>
                                  )}
                                  <td className="px-3 py-2.5 text-right font-mono-num whitespace-nowrap">
                                    {formatRp(inv.dppTotal)}
                                  </td>
                                  <td className="px-3 py-2.5 text-right font-mono-num whitespace-nowrap">
                                    {formatRp(inv.dppOtherValue || Math.round(inv.dppTotal * (11 / 12)))}
                                  </td>
                                  <td className="px-3 py-2.5 text-right font-mono-num font-bold text-[#1E2C5E] whitespace-nowrap">
                                    {formatRp(inv.returnAmount > 0 ? inv.returnAmount : inv.ppnTotal)}
                                  </td>
                                  <td className="px-3 py-2.5 text-right font-mono-num whitespace-nowrap">
                                    0
                                  </td>
                                  <td className="px-3 py-2.5 whitespace-nowrap text-slate-700 uppercase font-medium">
                                    {workspace.individualTaxpayer.name}
                                  </td>
                                  <td className="px-3 py-2.5 whitespace-nowrap text-slate-600">
                                    Tidak
                                  </td>
                                </>
                              ) : normalizedTab === 'dok_lain_keluaran' ? (
                                <>
                                  <td className="px-3 py-2.5 whitespace-nowrap">
                                    <button
                                      type="button"
                                      onClick={() => downloadFakturPajakPdf(inv, activeTaxpayer)}
                                      className="w-5 h-5 rounded-[3px] bg-[#A83232] hover:bg-[#8B2626] text-white inline-flex items-center justify-center cursor-pointer transition shadow-xs"
                                      title="Download PDF"
                                    >
                                      <FileText className="w-3 h-3" />
                                    </button>
                                  </td>
                                  <td className="px-3 py-2.5 font-mono-num text-slate-700 whitespace-nowrap">
                                    {inv.counterpartyNpwp}
                                  </td>
                                  <td className="px-3 py-2.5 font-semibold text-slate-800 whitespace-nowrap">
                                    {inv.counterpartyName}
                                  </td>
                                  <td className="px-3 py-2.5 font-mono-num font-bold text-[#1E2C5E] whitespace-nowrap">
                                    {inv.invoiceNumber}
                                  </td>
                                  <td className="px-3 py-2.5 font-mono-num whitespace-nowrap">
                                    {inv.invoiceDate || '-'}
                                  </td>
                                  <td className="px-3 py-2.5 font-mono-num whitespace-nowrap">
                                    {inv.transactionCode}
                                  </td>
                                  <td className="px-3 py-2.5 whitespace-nowrap text-slate-700">
                                    {MONTHS_ID[Math.max(0, inv.taxPeriodMonth - 1)] || 'November'}
                                  </td>
                                  <td className="px-3 py-2.5 font-mono-num whitespace-nowrap">
                                    {inv.taxPeriodYear || 2026}
                                  </td>
                                  <td className="px-3 py-2.5 whitespace-nowrap">
                                    <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded border ${STATUS_BADGE[inv.status]}`}>
                                      {inv.status}
                                    </span>
                                  </td>
                                  <td className="px-3 py-2.5 text-right font-mono-num whitespace-nowrap">
                                    {formatRp(inv.dppTotal)}
                                  </td>
                                  <td className="px-3 py-2.5 text-right font-mono-num font-bold text-[#1E2C5E] whitespace-nowrap">
                                    {formatRp(inv.ppnTotal)}
                                  </td>
                                  <td className="px-3 py-2.5 text-right font-mono-num whitespace-nowrap">
                                    0
                                  </td>
                                  <td className="px-3 py-2.5 whitespace-nowrap text-slate-600">
                                    {inv.referenceCode || '-'}
                                  </td>
                                  <td className="px-3 py-2.5 whitespace-nowrap text-slate-700 uppercase font-medium">
                                    {workspace.individualTaxpayer.name}
                                  </td>
                                  <td className="px-3 py-2.5 whitespace-nowrap text-slate-600">
                                    Tidak
                                  </td>
                                </>
                              ) : normalizedTab === 'dok_lain_masukan' ? (
                                <>
                                  <td className="px-3 py-2.5 whitespace-nowrap">
                                    <button
                                      type="button"
                                      onClick={() => downloadFakturPajakPdf(inv, activeTaxpayer)}
                                      className="w-5 h-5 rounded-[3px] bg-[#A83232] hover:bg-[#8B2626] text-white inline-flex items-center justify-center cursor-pointer transition shadow-xs"
                                      title="Download PDF"
                                    >
                                      <FileText className="w-3 h-3" />
                                    </button>
                                  </td>
                                  <td className="px-3 py-2.5 font-mono-num text-slate-700 whitespace-nowrap">
                                    {inv.counterpartyNpwp}
                                  </td>
                                  <td className="px-3 py-2.5 font-semibold text-slate-800 whitespace-nowrap">
                                    {inv.counterpartyName}
                                  </td>
                                  <td className="px-3 py-2.5 font-mono-num font-bold text-[#1E2C5E] whitespace-nowrap">
                                    {inv.invoiceNumber}
                                  </td>
                                  <td className="px-3 py-2.5 font-mono-num whitespace-nowrap">
                                    {inv.invoiceDate || '-'}
                                  </td>
                                  <td className="px-3 py-2.5 font-mono-num whitespace-nowrap">
                                    {inv.transactionCode}
                                  </td>
                                  <td className="px-3 py-2.5 whitespace-nowrap text-slate-700">
                                    {MONTHS_ID[Math.max(0, inv.taxPeriodMonth - 1)] || 'November'}
                                  </td>
                                  <td className="px-3 py-2.5 font-mono-num whitespace-nowrap">
                                    {inv.taxPeriodYear || 2026}
                                  </td>
                                  <td className="px-3 py-2.5 whitespace-nowrap text-slate-700">
                                    {inv.isCredited !== false
                                      ? MONTHS_ID[Math.max(0, inv.taxPeriodMonth - 1)] || 'November'
                                      : '-'}
                                  </td>
                                  <td className="px-3 py-2.5 font-mono-num whitespace-nowrap">
                                    {inv.isCredited !== false ? inv.taxPeriodYear || 2026 : '-'}
                                  </td>
                                  <td className="px-3 py-2.5 text-right font-mono-num whitespace-nowrap">
                                    {formatRp(inv.dppTotal)}
                                  </td>
                                  <td className="px-3 py-2.5 text-right font-mono-num font-bold text-[#1E2C5E] whitespace-nowrap">
                                    {formatRp(inv.ppnTotal)}
                                  </td>
                                  <td className="px-3 py-2.5 text-right font-mono-num whitespace-nowrap">
                                    0
                                  </td>
                                  <td className="px-3 py-2.5 whitespace-nowrap">
                                    <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded border ${STATUS_BADGE[inv.status]}`}>
                                      {inv.status}
                                    </span>
                                  </td>
                                  <td className="px-3 py-2.5 whitespace-nowrap">
                                    <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-300">
                                      VALID
                                    </span>
                                  </td>
                                  <td className="px-3 py-2.5 whitespace-nowrap text-slate-600">
                                    Tidak
                                  </td>
                                  <td className="px-3 py-2.5 whitespace-nowrap text-slate-600">
                                    {inv.referenceCode || '-'}
                                  </td>
                                  <td className="px-3 py-2.5 whitespace-nowrap text-slate-700 uppercase font-medium">
                                    {workspace.individualTaxpayer.name}
                                  </td>
                                  <td className="px-3 py-2.5 whitespace-nowrap text-slate-700 uppercase font-medium">
                                    {workspace.individualTaxpayer.name}
                                  </td>
                                </>
                              ) : normalizedTab === 'retur_dok_lain_keluaran' ||
                                normalizedTab === 'retur_dok_lain_masukan' ? (
                                <>
                                  <td className="px-3 py-2.5 whitespace-nowrap">
                                    <button
                                      type="button"
                                      onClick={() => downloadFakturPajakPdf(inv, activeTaxpayer)}
                                      className="w-5 h-5 rounded-[3px] bg-[#A83232] hover:bg-[#8B2626] text-white inline-flex items-center justify-center cursor-pointer transition shadow-xs"
                                      title="Download PDF"
                                    >
                                      <FileText className="w-3 h-3" />
                                    </button>
                                  </td>
                                  <td className="px-3 py-2.5 font-mono-num text-slate-700 whitespace-nowrap">
                                    {inv.counterpartyNpwp}
                                  </td>
                                  <td className="px-3 py-2.5 font-semibold text-slate-800 whitespace-nowrap">
                                    {inv.counterpartyName}
                                  </td>
                                  <td className="px-3 py-2.5 font-mono-num font-bold text-[#1E2C5E] whitespace-nowrap">
                                    {inv.invoiceNumber}
                                  </td>
                                  <td className="px-3 py-2.5 font-mono-num whitespace-nowrap text-slate-700">
                                    {inv.returnNoteNumber || '-'}
                                  </td>
                                  <td className="px-3 py-2.5 font-mono-num whitespace-nowrap">
                                    {normalizedTab === 'retur_dok_lain_masukan'
                                      ? inv.returnDate || inv.invoiceDate || '-'
                                      : inv.invoiceDate || '-'}
                                  </td>
                                  <td className="px-3 py-2.5 whitespace-nowrap text-slate-700">
                                    {MONTHS_ID[Math.max(0, inv.taxPeriodMonth - 1)] || 'November'}
                                  </td>
                                  <td className="px-3 py-2.5 font-mono-num whitespace-nowrap">
                                    {inv.taxPeriodYear || 2026}
                                  </td>
                                  <td className="px-3 py-2.5 whitespace-nowrap">
                                    <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded border ${STATUS_BADGE[inv.status]}`}>
                                      {inv.status}
                                    </span>
                                  </td>
                                  {normalizedTab === 'retur_dok_lain_masukan' && (
                                    <td className="px-3 py-2.5 whitespace-nowrap text-slate-700">
                                      {inv.isCredited !== false ? 'Ya' : 'Tidak'}
                                    </td>
                                  )}
                                  <td className="px-3 py-2.5 text-right font-mono-num whitespace-nowrap">
                                    {formatRp(inv.dppTotal)}
                                  </td>
                                  <td className="px-3 py-2.5 text-right font-mono-num font-bold text-[#1E2C5E] whitespace-nowrap">
                                    {formatRp(inv.returnAmount > 0 ? inv.returnAmount : inv.ppnTotal)}
                                  </td>
                                  <td className="px-3 py-2.5 text-right font-mono-num whitespace-nowrap">
                                    0
                                  </td>
                                  {normalizedTab === 'retur_dok_lain_masukan' && (
                                    <td className="px-3 py-2.5 whitespace-nowrap text-slate-600">
                                      {inv.referenceCode || '-'}
                                    </td>
                                  )}
                                  <td className="px-3 py-2.5 whitespace-nowrap text-slate-700 uppercase font-medium">
                                    {workspace.individualTaxpayer.name}
                                  </td>
                                  <td className="px-3 py-2.5 whitespace-nowrap text-slate-600">
                                    Tidak
                                  </td>
                                </>
                              ) : (
                                <>
                                  <td className="px-3 py-2.5 whitespace-nowrap">
                                    <div className="flex items-center gap-1.5">
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
      {addTxModalOpen &&
        typeof document !== 'undefined' &&
        createPortal(
          <div className="fixed inset-0 z-[100] bg-slate-900/50 backdrop-blur-[1px] flex items-start justify-center p-3 sm:p-5 md:p-6 overflow-y-auto">
            <div className="bg-white rounded-[4px] shadow-2xl border border-slate-200 w-full max-w-4xl my-auto p-6 sm:p-8 relative">
              <h3 className="font-sans font-medium text-[15px] text-[#1E293B] mb-5">Add Transaction</h3>

              <form onSubmit={handleAddTransactionLine} className="space-y-3.5 text-[12px]">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                  {/* Left Column: Barang / Jasa Details */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <label className="block text-slate-700 font-normal mb-1">Tipe</label>
                        <div className="flex items-center gap-6">
                          <label className="inline-flex items-center gap-2 cursor-pointer text-slate-800 text-[12px]">
                            <input
                              type="radio"
                              name="itemType"
                              checked={txItemType === 'GOODS'}
                              onChange={() => {
                                setTxItemType('GOODS');
                                setItemCode('');
                                setItemName('');
                                setTxCodeSearchQuery('');
                                setTxUnit('Kilogram');
                                setUnitSearchQuery('');
                              }}
                              className="accent-[#0088FF] w-4 h-4 cursor-pointer"
                            />
                            <span>Barang</span>
                          </label>
                          <label className="inline-flex items-center gap-2 cursor-pointer text-slate-800 text-[12px]">
                            <input
                              type="radio"
                              name="itemType"
                              checked={txItemType === 'SERVICES'}
                              onChange={() => {
                                setTxItemType('SERVICES');
                                setItemCode('');
                                setItemName('');
                                setTxCodeSearchQuery('');
                                setTxUnit('Kegiatan');
                                setUnitSearchQuery('');
                              }}
                              className="accent-[#0088FF] w-4 h-4 cursor-pointer"
                            />
                            <span>Jasa</span>
                          </label>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          const isGoods = txItemType === 'GOODS';
                          downloadCsvFile(
                            isGoods ? 'Daftar_Kode_Barang_Coretax.csv' : 'Daftar_Kode_Jasa_Coretax.csv',
                            ['Kode', 'Tipe', 'Nama Barang/Jasa'],
                            (isGoods ? GOODS_CODES : SERVICES_CODES).map((it) => [it.code, it.type, it.name])
                          );
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[3px] bg-[#1D2B53] hover:bg-[#152048] text-white text-[11px] font-semibold cursor-pointer shadow-sm"
                      >
                        <span>Unduh Kode</span>
                        <Download className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Kode Combobox with Real-Time Search */}
                    <div className="relative">
                      <label className="block text-slate-700 font-normal mb-1">Kode</label>
                      <div
                        onClick={() => setTxCodeDropdownOpen(!txCodeDropdownOpen)}
                        className={`w-full border ${
                          txCodeDropdownOpen ? 'border-sky-500 ring-1 ring-sky-400' : 'border-slate-300'
                        } rounded-[3px] bg-white px-3 py-1.5 h-[34px] text-[12px] flex items-center justify-between cursor-pointer`}
                      >
                        <span className={itemCode ? 'text-slate-800 font-medium' : 'text-slate-400'}>
                          {itemCode ? `${itemCode} - ${itemName}` : 'Pilih kode'}
                        </span>
                        <ChevronDown className="w-4 h-4 text-slate-500 shrink-0" />
                      </div>

                      {txCodeDropdownOpen && (
                        <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-300 rounded-[3px] shadow-2xl z-50 overflow-hidden">
                          <div className="p-2 border-b border-slate-200 relative">
                            <input
                              type="text"
                              autoFocus
                              placeholder=""
                              value={txCodeSearchQuery}
                              onChange={(e) => setTxCodeSearchQuery(e.target.value)}
                              className="w-full border border-sky-400 rounded-[3px] px-3 py-1.5 pr-8 text-[12px] text-slate-800 focus:outline-none focus:ring-1 focus:ring-sky-500"
                            />
                            <Search className="w-4 h-4 text-slate-400 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                          </div>
                          <div className="max-h-56 overflow-y-auto">
                            {filteredCatalogCodes.length > 0 ? (
                              filteredCatalogCodes.map((c) => (
                                <div
                                  key={c.code}
                                  onClick={() => {
                                    setItemCode(c.code);
                                    setItemName(c.name);
                                    setTxCodeDropdownOpen(false);
                                    setTxCodeSearchQuery('');
                                  }}
                                  className={`px-3 py-2 text-[11.5px] cursor-pointer hover:bg-sky-50 hover:text-sky-900 border-b border-slate-100 last:border-0 ${
                                    itemCode === c.code ? 'bg-sky-100 text-sky-900 font-semibold' : 'text-slate-700'
                                  }`}
                                >
                                  {c.code} - {c.name}
                                </div>
                              ))
                            ) : (
                              <div className="px-3 py-4 text-center text-xs text-slate-400">
                                Tidak ada kode yang sesuai
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block text-slate-700 font-normal mb-1">
                        Nama <span className="text-rose-600">*</span>
                      </label>
                      <input
                        type="text"
                        value={itemName}
                        onChange={(e) => setItemName(e.target.value)}
                        placeholder=""
                        className="w-full border border-slate-300 rounded-[3px] px-3 py-1.5 h-[34px] text-[12px] text-slate-800 bg-white"
                        required
                      />
                    </div>

                    {/* Satuan Combobox matching Coretax Images 4 & 5 */}
                    <div className="relative">
                      <label className="block text-slate-700 font-normal mb-1">
                        Satuan <span className="text-rose-600">*</span>
                      </label>
                      <div
                        onClick={() => {
                          setUnitDropdownOpen(!unitDropdownOpen);
                          setTxCodeDropdownOpen(false);
                        }}
                        className={`w-full border ${
                          unitDropdownOpen ? 'border-sky-500 ring-1 ring-sky-400' : 'border-slate-300'
                        } rounded-[3px] bg-white px-3 py-1.5 h-[34px] text-[12px] flex items-center justify-between cursor-pointer`}
                      >
                        <span className={txUnit ? 'text-slate-800' : 'text-slate-400'}>
                          {txUnit || 'Pilih satuan ukur'}
                        </span>
                        <ChevronDown className="w-4 h-4 text-slate-500 shrink-0" />
                      </div>

                      {unitDropdownOpen && (
                        <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-300 rounded-[3px] shadow-2xl z-50 overflow-hidden">
                          <div className="p-2 border-b border-slate-200 relative">
                            <input
                              type="text"
                              autoFocus
                              placeholder=""
                              value={unitSearchQuery}
                              onChange={(e) => setUnitSearchQuery(e.target.value)}
                              className="w-full border border-sky-400 rounded-[3px] px-3 py-1.5 pr-8 text-[12px] text-slate-800 focus:outline-none focus:ring-1 focus:ring-sky-500"
                            />
                            <Search className="w-4 h-4 text-slate-400 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                          </div>
                          <div className="max-h-52 overflow-y-auto">
                            {filteredUnits.length > 0 ? (
                              filteredUnits.map((u) => (
                                <div
                                  key={u}
                                  onClick={() => {
                                    setTxUnit(u);
                                    setUnitDropdownOpen(false);
                                    setUnitSearchQuery('');
                                  }}
                                  className={`px-3 py-2 text-[11.5px] cursor-pointer hover:bg-sky-50 hover:text-sky-900 border-b border-slate-100 last:border-0 ${
                                    txUnit === u ? 'bg-sky-100 text-sky-900 font-semibold' : 'text-slate-700'
                                  }`}
                                >
                                  {u}
                                </div>
                              ))
                            ) : (
                              <div className="px-3 py-4 text-center text-xs text-slate-400">
                                Tidak ada satuan yang sesuai
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block text-slate-700 font-normal mb-1">Harga Satuan</label>
                      <input
                        type={unitPriceFocused ? 'number' : 'text'}
                        min={0}
                        value={unitPriceFocused ? (unitPrice === 0 ? '' : unitPrice) : formatCoretaxDec(unitPrice)}
                        onFocus={() => setUnitPriceFocused(true)}
                        onBlur={() => setUnitPriceFocused(false)}
                        onChange={(e) => setUnitPrice(Math.max(0, Number(e.target.value) || 0))}
                        className="w-full text-right border border-slate-300 rounded-[3px] px-3 py-1.5 h-[34px] text-[12px] text-slate-800 font-mono-num bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-700 font-normal mb-1">KUANTITAS</label>
                      <input
                        type={quantityFocused ? 'number' : 'text'}
                        min={1}
                        value={quantityFocused ? (quantity === 0 ? '' : quantity) : formatCoretaxDec(quantity || 1)}
                        onFocus={() => setQuantityFocused(true)}
                        onBlur={() => setQuantityFocused(false)}
                        onChange={(e) => setQuantity(Math.max(1, Number(e.target.value.replace(/[^0-9]/g, '')) || 1))}
                        className="w-full text-right border border-slate-300 rounded-[3px] px-3 py-1.5 h-[34px] text-[12px] text-slate-800 font-mono-num bg-white"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-slate-700 font-normal mb-1">Total Harga</label>
                      <input
                        type="text"
                        readOnly
                        value={formatCoretaxDec(modalTotalPrice)}
                        className="w-full text-right border border-slate-200 bg-[#F8FAFC] rounded-[3px] px-3 py-1.5 h-[34px] text-[12px] text-slate-700 font-mono-num cursor-not-allowed"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-700 font-normal mb-1">Potongan harga</label>
                      <input
                        type={discountFocused ? 'number' : 'text'}
                        min={0}
                        value={discountFocused ? (discount === 0 ? '' : discount) : formatCoretaxDec(discount)}
                        onFocus={() => setDiscountFocused(true)}
                        onBlur={() => setDiscountFocused(false)}
                        onChange={(e) => setDiscount(Math.max(0, Number(e.target.value) || 0))}
                        className="w-full text-right border border-slate-300 rounded-[3px] px-3 py-1.5 h-[34px] text-[12px] text-slate-800 font-mono-num bg-white"
                      />
                    </div>
                  </div>

                  {/* Right Column: PPN dan PPnBM */}
                  <div className="space-y-3">
                    <div className="text-[12.5px] font-normal text-slate-700 pb-0.5">
                      PPN dan PPnBM
                    </div>

                    <div>
                      <label className="block text-slate-700 font-normal mb-1">DPP</label>
                      <input
                        type="text"
                        readOnly
                        value={formatCoretaxDec(modalDpp)}
                        className="w-full text-right border border-slate-200 bg-[#F8FAFC] rounded-[3px] px-3 py-1.5 h-[34px] text-[12px] text-slate-700 font-mono-num"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="inline-flex items-center gap-2 cursor-pointer text-slate-700 text-[12px]">
                        <input
                          type="checkbox"
                          checked={isOtherValue}
                          onChange={(e) => {
                            setIsOtherValue(e.target.checked);
                            if (!e.target.checked) setCustomDppOther(null);
                          }}
                          className="accent-[#0088FF] w-4 h-4 rounded cursor-pointer"
                        />
                        <span>DPP Nilai Lain/DPP</span>
                      </label>
                      <input
                        type={dppOtherFocused ? 'number' : 'text'}
                        disabled={!isOtherValue}
                        value={
                          !isOtherValue
                            ? '0,00'
                            : dppOtherFocused
                            ? (customDppOther !== null ? (customDppOther === 0 ? '' : customDppOther) : (modalDppOtherCalculated === 0 ? '' : modalDppOtherCalculated))
                            : formatCoretaxDec(effectiveDppOther)
                        }
                        onFocus={() => setDppOtherFocused(true)}
                        onBlur={() => setDppOtherFocused(false)}
                        onChange={(e) => setCustomDppOther(Math.max(0, Number(e.target.value) || 0))}
                        className={`w-full text-right border ${
                          isOtherValue ? 'border-slate-300 bg-white text-slate-800' : 'border-slate-200 bg-[#F8FAFC] text-slate-400'
                        } rounded-[3px] px-3 py-1.5 h-[34px] text-[12px] font-mono-num`}
                      />
                    </div>

                    <div>
                      <label className="block text-slate-700 font-normal mb-1">Tarif PPN</label>
                      <select
                        value={12}
                        disabled
                        className="w-full border border-slate-200 bg-[#F8FAFC] rounded-[3px] px-3 py-1.5 h-[34px] text-[12px] text-slate-700 cursor-not-allowed"
                      >
                        <option value={12}>12%</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-slate-700 font-normal mb-1">PPN</label>
                      <input
                        type="text"
                        readOnly
                        value={formatCoretaxDec(modalPpn)}
                        className="w-full text-right border border-slate-200 bg-[#F8FAFC] rounded-[3px] px-3 py-1.5 h-[34px] text-[12px] text-slate-700 font-mono-num"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-700 font-normal mb-1">Tarif PPnBM (%)</label>
                      <input
                        type={ppnbmFocused ? 'number' : 'text'}
                        min={0}
                        max={200}
                        value={ppnbmFocused ? (txPpnbmRate === 0 ? '' : txPpnbmRate) : formatCoretaxDec(txPpnbmRate)}
                        onFocus={() => setPpnbmFocused(true)}
                        onBlur={() => setPpnbmFocused(false)}
                        onChange={(e) => {
                          const rate = Math.max(0, Number(e.target.value) || 0);
                          setTxPpnbmRate(rate);
                          setCustomPpnbm(Math.round((modalDpp * rate) / 100));
                        }}
                        className="w-full text-right border border-slate-300 rounded-[3px] px-3 py-1.5 h-[34px] text-[12px] text-slate-800 font-mono-num bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-700 font-normal mb-1">PPnBM</label>
                      <input
                        type={ppnbmNominalFocused ? 'number' : 'text'}
                        min={0}
                        value={
                          ppnbmNominalFocused
                            ? (customPpnbm !== null ? (customPpnbm === 0 ? '' : customPpnbm) : (modalPpnbm === 0 ? '' : modalPpnbm))
                            : formatCoretaxDec(modalPpnbm)
                        }
                        onFocus={() => setPpnbmNominalFocused(true)}
                        onBlur={() => setPpnbmNominalFocused(false)}
                        onChange={(e) => setCustomPpnbm(Math.max(0, Number(e.target.value) || 0))}
                        className="w-full text-right border border-slate-300 rounded-[3px] px-3 py-1.5 h-[34px] text-[12px] text-slate-800 font-mono-num bg-white"
                      />
                    </div>
                  </div>
                </div>

                {/* Bottom buttons matching Coretax screenshot */}
                <div className="flex justify-end items-center gap-2 pt-6">
                  <button
                    type="button"
                    onClick={() => setAddTxModalOpen(false)}
                    className="px-5 py-1.5 bg-[#0EA5E9] hover:bg-[#0284C7] text-white text-[12px] font-medium rounded-[3px] shadow-sm transition cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-1.5 bg-[#0088FF] hover:bg-[#0070D2] text-white text-[12px] font-medium rounded-[3px] shadow-sm transition cursor-pointer"
                  >
                    Simpan
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
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

      {/* Replacement / Ganti Faktur Electronic Signing Modal */}
      <SignModal
        open={amendSignModalOpen}
        title="Tanda Tangan Dokumen"
        description={`Penandatanganan elektronik untuk melakukan Penggantian Faktur Pajak No. ${editingInvoice?.invoiceNumber || ''}.`}
        signerName={activeTaxpayer.name}
        signerNik={activeTaxpayer.nikNpwp}
        confirmLabel="Konfirmasi Tanda Tangan"
        onClose={() => setAmendSignModalOpen(false)}
        onConfirm={async () => {
          if (editingInvoice) {
            setIsViewingApproved(false);
            setIsAmendmentMode(true);
            const cleanTx = (txCode || '01').padStart(2, '0').slice(0, 2);
            const yearDigits = (invoiceDate || '2026').slice(2, 4);
            let seqPart = '0000000001';
            const origNum = editingInvoice.invoiceNumber || '';
            if (origNum && origNum.length >= 16 && !origNum.startsWith('DRAFT')) {
              seqPart = origNum.slice(-10);
            }
            const repNum = `${cleanTx}01${yearDigits}${seqPart}`;
            setReplacementFakturNumber(repNum);
            setFakturSuccessToast('Faktur berhasil dialihkan ke mode Faktur Pengganti. Data transaksi siap diperbarui.');
          }
          setAmendSignModalOpen(false);
        }}
      />

      {/* Cancellation Electronic Signing Modal */}
      <SignModal
        open={Boolean(cancelModalTarget)}
        title="Tanda Tangan Dokumen"
        signerName={activeTaxpayer.name}
        signerNik={activeTaxpayer.nikNpwp}
        confirmLabel="Konfirmasi Tanda Tangan"
        onClose={() => setCancelModalTarget(null)}
        onConfirm={async () => {
          if (cancelModalTarget) {
            await onInvoiceAction(cancelModalTarget.id, 'REQUEST_CANCEL');
            setFakturSuccessToast('Berhasil membatalkan Faktur Pajak!');
            setCancelModalTarget(null);
            setCreateModalOpen(false);
            setEditingInvoice(null);
            setIsViewingApproved(false);
          }
        }}
      />
    </div>
  );
};
