import React, { useMemo, useState } from 'react';
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  Edit3,
  Eye,
  Info,
  Plus,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
  Trash2,
  X,
  XCircle,
} from 'lucide-react';
import { InvoiceDirection, TaxInvoice, TaxInvoiceItem, Taxpayer, WorkspaceState } from '../types/tax.ts';
import {
  calculatePpnLine,
  FAKTUR_TRANSACTION_CODES,
  formatRp,
  ITEM_CODES_CATALOG,
  MONTHS_ID,
} from '../utils/taxCalc.ts';
import { SignModal } from '../components/SignModal.tsx';
import { PrintablePayload } from '../components/DocumentPrintModal.tsx';

interface EFakturModuleProps {
  subTab: string;
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
    header: 'Dasbor e-Faktur',
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
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [signTarget, setSignTarget] = useState<TaxInvoice | null>(null);
  const [returnTarget, setReturnTarget] = useState<TaxInvoice | null>(null);
  const [returnAmount, setReturnAmount] = useState(0);
  const [returnNoteNumber, setReturnNoteNumber] = useState('NR-2025-001');
  const [amendTarget, setAmendTarget] = useState<TaxInvoice | null>(null);
  const [amendDpp, setAmendDpp] = useState(0);

  // Create invoice form state
  const [txCode, setTxCode] = useState('04');
  const [counterpartyNpwp, setCounterpartyNpwp] = useState('0811223344556000');
  const [counterpartyName, setCounterpartyName] = useState('PT MITRA NIAGA SEJAHTERA');
  const [invoiceDate, setInvoiceDate] = useState('2025-01-22');
  const [referenceCode, setReferenceCode] = useState(
    `INV/BN/2025/01/00${workspace.invoices.length + 1}`
  );
  const [itemCode, setItemCode] = useState('847130');
  const [itemName, setItemName] = useState('Komputer Jinjing / Laptop & Perangkat IT');
  const [unitPrice, setUnitPrice] = useState(12_000_000);
  const [quantity, setQuantity] = useState(5);
  const [discount, setDiscount] = useState(0);
  const [isLuxury, setIsLuxury] = useState(false);

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
      return (
        inv.direction === 'OUTPUT' &&
        (inv.status === 'APPROVED' || inv.status === 'AMENDED' || inv.returnAmount > 0)
      );
    }
    if (normalizedTab === 'retur_masukan') {
      return (
        inv.direction === 'INPUT' &&
        (inv.status === 'APPROVED' || inv.status === 'AMENDED' || inv.returnAmount > 0)
      );
    }
    if (normalizedTab === 'retur_dok_lain_keluaran') {
      return inv.direction === 'EXPORT' && inv.returnAmount > 0;
    }
    if (normalizedTab === 'retur_dok_lain_masukan') {
      return inv.direction === 'INPUT' && inv.returnAmount > 0 && inv.transactionCode === '01';
    }

    const expectedDir: InvoiceDirection =
      normalizedTab === 'output'
        ? 'OUTPUT'
        : normalizedTab === 'input' || normalizedTab === 'dok_lain_masukan'
          ? 'INPUT'
          : 'EXPORT';

    if (inv.direction !== expectedDir) return false;
    if (statusFilter !== 'ALL' && inv.status !== statusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        inv.invoiceNumber.toLowerCase().includes(q) ||
        inv.counterpartyName.toLowerCase().includes(q) ||
        inv.counterpartyNpwp.includes(q)
      );
    }
    return true;
  });

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

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const direction: InvoiceDirection =
      normalizedTab === 'dok_lain_keluaran'
        ? 'EXPORT'
        : normalizedTab === 'input' || normalizedTab === 'dok_lain_masukan'
          ? 'INPUT'
          : 'OUTPUT';
    const isExport = direction === 'EXPORT';
    const calc = isExport
      ? {
          dpp: Math.max(0, unitPrice * quantity - discount),
          dppOtherValue: Math.max(0, unitPrice * quantity - discount),
          ppn: 0,
        }
      : calculatePpnLine(unitPrice, quantity, discount, isLuxury);

    const catalogItem = ITEM_CODES_CATALOG.find((c) => c.code === itemCode);
    const lineItem: TaxInvoiceItem = {
      id: `item-${Date.now()}`,
      itemType: catalogItem?.type || 'GOODS',
      itemCode,
      itemName,
      unit: 'Unit',
      unitPrice,
      quantity,
      discount,
      isLuxury,
      dpp: calc.dpp,
      dppOtherValue: calc.dppOtherValue,
      ppn: calc.ppn,
      ppnbm: 0,
    };

    const parsedDate = new Date(invoiceDate);
    await onCreateInvoice({
      taxpayerId: workspace.corporateTaxpayer.id,
      direction,
      transactionCode: isExport ? '01' : txCode,
      invoiceNumber: isExport
        ? `PEB-${invoiceDate.slice(0, 4)}-${String(Math.floor(100000 + Math.random() * 899999))}`
        : `DRAFT-${direction === 'OUTPUT' ? 'OUT' : 'IN'}-${String(workspace.invoices.length + 1).padStart(3, '0')}`,
      referenceCode,
      counterpartyNpwp,
      counterpartyName,
      invoiceDate,
      taxPeriodMonth: parsedDate.getMonth() + 1 || 1,
      taxPeriodYear: parsedDate.getFullYear() || 2025,
      items: [lineItem],
      dppTotal: calc.dpp,
      dppOtherValue: calc.dppOtherValue,
      ppnTotal: calc.ppn,
      ppnbmTotal: 0,
      status: isExport || direction === 'INPUT' ? 'APPROVED' : 'DRAFT',
      isCredited: direction === 'INPUT',
      returnAmount: 0,
    });
    setCreateModalOpen(false);
  };

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
              {/* Top Bar: Dasbor e-Faktur + Month/Year Picker */}
              <div className="bg-white border border-[#E2E8F0] rounded-lg px-5 py-3.5 flex flex-wrap items-center justify-between gap-3">
                <h1 className="font-display font-bold text-[18px] text-[#1D2B53]">
                  Dasbor e-Faktur
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
                {/* Card 1: Dasbor Faktur Pajak */}
                <div className="bg-white border border-[#E2E8F0] rounded-lg p-5 min-h-[300px] flex flex-col">
                  <div className="flex items-center justify-between gap-2 mb-4">
                    <h2 className="font-display font-bold text-sm text-[#1D2B53]">
                      Dasbor Faktur Pajak
                    </h2>
                    <span className="text-[11px] text-slate-500 font-mono-num">
                      {MONTHS_ID[(dashMonth || 1) - 1]} {dashYear}
                    </span>
                  </div>

                  <div className="flex-1 flex flex-col sm:flex-row gap-4 items-stretch justify-between">
                    <div className="flex-1 flex flex-col justify-center">
                      {periodInvoices.length === 0 ? (
                        <div className="text-center py-10 text-xs text-slate-500 flex items-center justify-center gap-1.5">
                          <Info className="w-4 h-4 text-[#F4C430]" />
                          <span>Tidak Ada Data Tersedia!</span>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <div className="grid grid-cols-2 gap-3">
                            <div className="bg-[#F8FAFC] border border-slate-200 rounded-lg p-3">
                              <div className="text-[11px] text-slate-500">Total Faktur Masa</div>
                              <div className="text-xl font-extrabold text-[#1D2B53] font-mono-num mt-0.5">
                                {periodInvoices.length}
                              </div>
                            </div>
                            <div className="bg-[#F8FAFC] border border-slate-200 rounded-lg p-3">
                              <div className="text-[11px] text-slate-500">Total PPN Keluaran</div>
                              <div className="text-sm font-extrabold text-[#1D2B53] font-mono-num mt-1">
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

                          <div className="space-y-2 pt-1">
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
                        </div>
                      )}
                    </div>

                    {/* Right Status Legend Box (Matching Screenshot) */}
                    <div className="w-full sm:w-[140px] shrink-0 bg-[#F8FAFC] border border-slate-200 rounded-md p-2.5">
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

                {/* Card 2: Dasbor Pembayaran dan Pelaporan SPT Masa PPN */}
                <div className="bg-white border border-[#E2E8F0] rounded-lg p-5 min-h-[300px] flex flex-col">
                  <h2 className="font-display font-bold text-sm text-[#1D2B53] mb-4">
                    Dasbor Pembayaran dan Pelaporan SPT Masa PPN
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

              {/* Bottom Full-Width Card: Dasbor Pembayaran sebelum Pelaporan SPT Masa PPN */}
              <div className="bg-white border border-[#E2E8F0] rounded-lg p-5 min-h-[150px] flex flex-col">
                <h2 className="font-display font-bold text-sm text-[#1D2B53] mb-3">
                  Dasbor Pembayaran sebelum Pelaporan SPT Masa PPN
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
          ) : (
            /* ============================================================= */
            /* DATA TABLE FOR ALL e-FAKTUR & DOKUMEN LAIN SUBMENUS           */
            /* ============================================================= */
            <div className="bg-white border border-[#D9E0E8] rounded-lg overflow-hidden">
              {/* Module Header */}
              <div className="px-5 py-3.5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h1 className="font-display font-bold text-base text-[#1D2B53]">
                    {activeTabTitle}
                  </h1>
                  <p className="text-xs text-slate-500">
                    Administrasi Faktur Pajak &amp; Dokumen Lain (PMK 131/2024 — PPN 12% &amp; DPP Nilai Lain 11/12)
                  </p>
                </div>
              </div>

              {/* Action Toolbar */}
              <div className="px-5 py-3 bg-[#F8FAFC] border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  {!isReturTab && (
                    <button
                      type="button"
                      onClick={() => setCreateModalOpen(true)}
                      className="inline-flex items-center gap-1.5 bg-[#1D2B53] hover:bg-[#273A6E] text-white font-bold text-xs px-3.5 py-2 rounded shadow-sm cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5 text-[#F4C430]" />
                      <span>
                        {normalizedTab === 'output'
                          ? 'Rekam Faktur'
                          : normalizedTab === 'input'
                            ? 'Tambah Simulasi Faktur Masukan'
                            : normalizedTab === 'dok_lain_keluaran'
                              ? 'Catat Dokumen Lain Keluaran (PEB)'
                              : 'Catat Dokumen Lain Masukan'}
                      </span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      setStatusFilter('ALL');
                    }}
                    className="inline-flex items-center gap-1 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold text-xs px-3 py-2 rounded cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Reset Filter</span>
                  </button>
                </div>

                <div className="text-xs text-slate-600 font-mono-num">
                  Total PPN pada Tampilan:{' '}
                  <strong className="text-[#1D2B53]">
                    {formatRp(
                      filteredInvoices.reduce(
                        (s, i) => s + (i.status === 'CANCELLED' ? 0 : i.ppnTotal),
                        0
                      )
                    )}
                  </strong>
                </div>
              </div>

              {/* Coretax Yellow-Header Data Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="bg-[#F4C430] text-[#1D2B53] font-bold">
                      <th className="px-3 py-2.5 text-left whitespace-nowrap">Aksi</th>
                      <th className="px-3 py-2.5 text-left whitespace-nowrap">Kode &amp; No. Faktur</th>
                      <th className="px-3 py-2.5 text-left whitespace-nowrap">Lawan Transaksi (NPWP / Nama)</th>
                      <th className="px-3 py-2.5 text-left whitespace-nowrap">Tanggal / Masa</th>
                      <th className="px-3 py-2.5 text-right whitespace-nowrap">Harga Jual / DPP</th>
                      <th className="px-3 py-2.5 text-right whitespace-nowrap">DPP Nilai Lain</th>
                      <th className="px-3 py-2.5 text-right whitespace-nowrap">PPN</th>
                      {isInputTab && !isReturTab && (
                        <th className="px-3 py-2.5 text-center whitespace-nowrap">Pengkreditan</th>
                      )}
                      {isReturTab && (
                        <th className="px-3 py-2.5 text-right whitespace-nowrap">PPN Diretur</th>
                      )}
                      <th className="px-3 py-2.5 text-center whitespace-nowrap">Status Faktur</th>
                    </tr>
                    <tr className="bg-[#FFFBEB] border-b border-slate-200">
                      <th className="px-2 py-1.5" />
                      <th colSpan={2} className="px-2 py-1.5">
                        <input
                          type="text"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          placeholder="Filter nomor faktur / nama lawan transaksi..."
                          className="w-full border border-slate-300 bg-white rounded px-2.5 py-1 text-[11px] font-normal"
                        />
                      </th>
                      <th colSpan={isInputTab || isReturTab ? 5 : 4} className="px-2 py-1.5" />
                      <th className="px-2 py-1.5">
                        <select
                          value={statusFilter}
                          onChange={(e) => setStatusFilter(e.target.value)}
                          className="w-full border border-slate-300 bg-white rounded px-2 py-1 text-[11px] font-normal"
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
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white">
                    {filteredInvoices.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="px-4 py-8 text-center text-slate-500">
                          Tidak ada data yang ditemukan.
                        </td>
                      </tr>
                    ) : (
                      filteredInvoices.map((inv) => (
                        <tr key={inv.id} className="hover:bg-[#F8FAFC]">
                          <td className="px-3 py-2.5 whitespace-nowrap">
                            <div className="flex items-center gap-1">
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

                              {normalizedTab === 'output' && inv.status === 'DRAFT' && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => setSignTarget(inv)}
                                    className="inline-flex items-center gap-1 px-2 py-1 rounded bg-emerald-700 hover:bg-emerald-800 text-white text-[11px] font-bold cursor-pointer"
                                    title="Tanda Tangani & Setujui Faktur"
                                  >
                                    <ShieldCheck className="w-3 h-3" />
                                    <span>Upload / Sign</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => onInvoiceAction(inv.id, 'DELETE')}
                                    className="p-1.5 rounded border border-red-200 hover:bg-red-50 text-red-600 cursor-pointer"
                                    title="Hapus Draft"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </>
                              )}

                              {normalizedTab === 'output' &&
                                (inv.status === 'APPROVED' || inv.status === 'AMENDED') && (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setAmendTarget(inv);
                                        setAmendDpp(inv.dppTotal);
                                      }}
                                      className="inline-flex items-center gap-1 px-2 py-1 rounded bg-blue-50 border border-blue-300 text-blue-800 hover:bg-blue-100 text-[11px] font-bold cursor-pointer"
                                      title="Buat Faktur Pengganti (Amend)"
                                    >
                                      <Edit3 className="w-3 h-3" />
                                      <span>Pengganti</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => onInvoiceAction(inv.id, 'REQUEST_CANCEL')}
                                      className="inline-flex items-center gap-1 px-2 py-1 rounded bg-red-50 border border-red-200 text-red-700 hover:bg-red-100 text-[11px] font-bold cursor-pointer"
                                      title="Batalkan Faktur"
                                    >
                                      <XCircle className="w-3 h-3" />
                                      <span>Batal</span>
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
                          <td className="px-3 py-2.5 font-mono-num">
                            <div className="font-bold text-[#1D2B53]">{inv.invoiceNumber}</div>
                            <div className="text-[10px] text-slate-500">
                              Kode {inv.transactionCode} · Ref: {inv.referenceCode}
                            </div>
                          </td>
                          <td className="px-3 py-2.5">
                            <div className="font-semibold text-slate-800">
                              {inv.counterpartyName}
                            </div>
                            <div className="text-[10px] font-mono-num text-slate-500">
                              {inv.counterpartyNpwp}
                            </div>
                          </td>
                          <td className="px-3 py-2.5 font-mono-num">
                            <div>{inv.invoiceDate}</div>
                            <div className="text-[10px] text-slate-500">
                              {MONTHS_ID[inv.taxPeriodMonth - 1]} {inv.taxPeriodYear}
                            </div>
                          </td>
                          <td className="px-3 py-2.5 text-right font-mono-num">
                            {formatRp(inv.dppTotal)}
                          </td>
                          <td className="px-3 py-2.5 text-right font-mono-num">
                            {formatRp(inv.dppOtherValue)}
                          </td>
                          <td className="px-3 py-2.5 text-right font-mono-num font-bold text-[#1D2B53]">
                            {formatRp(inv.ppnTotal)}
                          </td>
                          {isInputTab && !isReturTab && (
                            <td className="px-3 py-2.5 text-center">
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
                            <td className="px-3 py-2.5 text-right font-mono-num font-bold text-red-700">
                              {inv.returnAmount > 0 ? formatRp(inv.returnAmount) : '-'}
                              {inv.returnNoteNumber && (
                                <div className="text-[10px] text-slate-500">
                                  {inv.returnNoteNumber}
                                </div>
                              )}
                            </td>
                          )}
                          <td className="px-3 py-2.5 text-center">
                            <span
                              className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded border ${STATUS_BADGE[inv.status]}`}
                            >
                              {inv.status}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Create Invoice Modal */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-md shadow-xl border border-slate-300 w-full max-w-2xl overflow-hidden my-6">
            <div className="bg-[#1D2B53] text-white px-5 py-3.5 flex items-center justify-between border-b-2 border-[#F4C430]">
              <h3 className="font-display font-bold text-sm">
                {normalizedTab === 'dok_lain_keluaran'
                  ? 'Rekam Dokumen Lain Pajak Keluaran (PEB)'
                  : isInputTab
                    ? 'Rekam Simulasi Faktur Pajak Masukan'
                    : 'Buat Faktur Pajak Keluaran (e-Faktur)'}
              </h3>
              <button
                type="button"
                onClick={() => setCreateModalOpen(false)}
                className="text-slate-300 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="p-5 space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {!isDokLainTab && (
                  <div>
                    <label className="block font-semibold text-[#1D2B53] mb-1">Kode Transaksi</label>
                    <select
                      value={txCode}
                      onChange={(e) => setTxCode(e.target.value)}
                      className="w-full border border-[#CBD5E1] rounded px-3 py-2 bg-white"
                    >
                      {FAKTUR_TRANSACTION_CODES.map((c) => (
                        <option key={c.code} value={c.code}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                <div>
                  <label className="block font-semibold text-[#1D2B53] mb-1">Tanggal Faktur</label>
                  <input
                    type="date"
                    value={invoiceDate}
                    onChange={(e) => setInvoiceDate(e.target.value)}
                    className="w-full border border-[#CBD5E1] rounded px-3 py-2 font-mono-num"
                    required
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#1D2B53] mb-1">
                    {isInputTab ? 'NPWP Penjual' : 'NPWP / NIK Pembeli'}
                  </label>
                  <input
                    type="text"
                    value={counterpartyNpwp}
                    onChange={(e) => setCounterpartyNpwp(e.target.value)}
                    className="w-full border border-[#CBD5E1] rounded px-3 py-2 font-mono-num"
                    required
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#1D2B53] mb-1">
                    {isInputTab ? 'Nama PKP Penjual' : 'Nama Pembeli / Penerima Jasa'}
                  </label>
                  <input
                    type="text"
                    value={counterpartyName}
                    onChange={(e) => setCounterpartyName(e.target.value)}
                    className="w-full border border-[#CBD5E1] rounded px-3 py-2"
                    required
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block font-semibold text-[#1D2B53] mb-1">Referensi Invoice</label>
                  <input
                    type="text"
                    value={referenceCode}
                    onChange={(e) => setReferenceCode(e.target.value)}
                    className="w-full border border-[#CBD5E1] rounded px-3 py-2 font-mono-num"
                  />
                </div>
              </div>

              <div className="border-t border-slate-200 pt-3.5 space-y-3">
                <div className="font-bold text-[#1D2B53]">Detail Transaksi Barang / Jasa</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-[#1D2B53] mb-1">
                      Kode Barang / Jasa (Buku Manual Coretax)
                    </label>
                    <select
                      value={itemCode}
                      onChange={(e) => {
                        setItemCode(e.target.value);
                        const found = ITEM_CODES_CATALOG.find((c) => c.code === e.target.value);
                        if (found) setItemName(found.name);
                      }}
                      className="w-full border border-[#CBD5E1] rounded px-3 py-2 bg-white"
                    >
                      {ITEM_CODES_CATALOG.map((it) => (
                        <option key={it.code} value={it.code}>
                          {it.code} — {it.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block font-semibold text-[#1D2B53] mb-1">Nama Barang / Jasa</label>
                    <input
                      type="text"
                      value={itemName}
                      onChange={(e) => setItemName(e.target.value)}
                      className="w-full border border-[#CBD5E1] rounded px-3 py-2"
                      required
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-[#1D2B53] mb-1">Harga Satuan (Rp)</label>
                    <input
                      type="number"
                      min={0}
                      value={unitPrice}
                      onChange={(e) => setUnitPrice(Number(e.target.value))}
                      className="w-full border border-[#CBD5E1] rounded px-3 py-2 font-mono-num"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block font-semibold text-[#1D2B53] mb-1">Kuantitas</label>
                      <input
                        type="number"
                        min={1}
                        value={quantity}
                        onChange={(e) => setQuantity(Number(e.target.value))}
                        className="w-full border border-[#CBD5E1] rounded px-3 py-2 font-mono-num"
                        required
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-[#1D2B53] mb-1">Potongan (Rp)</label>
                      <input
                        type="number"
                        min={0}
                        value={discount}
                        onChange={(e) => setDiscount(Number(e.target.value))}
                        className="w-full border border-[#CBD5E1] rounded px-3 py-2 font-mono-num"
                      />
                    </div>
                  </div>
                </div>

                {normalizedTab !== 'dok_lain_keluaran' && (
                  <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isLuxury}
                      onChange={(e) => setIsLuxury(e.target.checked)}
                    />
                    <span>BKP Tergolong Mewah (PPN 12% Penuh tanpa DPP Nilai Lain 11/12)</span>
                  </label>
                )}

                <div className="grid grid-cols-3 gap-3 bg-[#F8FAFC] border border-[#CBD5E1] rounded p-3">
                  <div>
                    <span className="text-[11px] text-slate-500 block">Harga Jual / DPP</span>
                    <span className="font-mono-num font-bold text-[#1D2B53]">
                      {formatRp(previewCalc.dpp)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-500 block">DPP Nilai Lain (11/12)</span>
                    <span className="font-mono-num font-bold text-[#1D2B53]">
                      {formatRp(previewCalc.dppOtherValue)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-500 block">
                      {normalizedTab === 'dok_lain_keluaran' ? 'PPN Ekspor (0%)' : 'PPN 12%'}
                    </span>
                    <span className="font-mono-num font-extrabold text-emerald-700">
                      {formatRp(previewCalc.ppn)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded font-semibold text-slate-700 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#1D2B53] hover:bg-[#273A6E] text-white font-bold rounded cursor-pointer"
                >
                  Simpan Konsep Faktur
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
