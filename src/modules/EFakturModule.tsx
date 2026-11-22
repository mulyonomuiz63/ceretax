import React, { useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Edit3,
  Eye,
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
  const [referenceCode, setReferenceCode] = useState(`INV/BN/2025/01/00${workspace.invoices.length + 1}`);
  const [itemCode, setItemCode] = useState('847130');
  const [itemName, setItemName] = useState('Komputer Jinjing / Laptop & Perangkat IT');
  const [unitPrice, setUnitPrice] = useState(12_000_000);
  const [quantity, setQuantity] = useState(5);
  const [discount, setDiscount] = useState(0);
  const [isLuxury, setIsLuxury] = useState(false);

  const directionMap: Record<string, InvoiceDirection> = {
    output: 'OUTPUT',
    input: 'INPUT',
    export: 'EXPORT',
  };

  const filteredInvoices = workspace.invoices.filter((inv) => {
    if (subTab === 'retur') {
      return inv.status === 'APPROVED' || inv.status === 'AMENDED' || inv.returnAmount > 0;
    }
    const dir = directionMap[subTab] || 'OUTPUT';
    if (inv.direction !== dir) return false;
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

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const direction: InvoiceDirection = subTab === 'export' ? 'EXPORT' : subTab === 'input' ? 'INPUT' : 'OUTPUT';
    const isExport = direction === 'EXPORT';
    const calc = isExport
      ? { dpp: Math.max(0, unitPrice * quantity - discount), dppOtherValue: Math.max(0, unitPrice * quantity - discount), ppn: 0 }
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
    subTab === 'export'
      ? { dpp: Math.max(0, unitPrice * quantity - discount), dppOtherValue: Math.max(0, unitPrice * quantity - discount), ppn: 0 }
      : calculatePpnLine(unitPrice, quantity, discount, isLuxury);

  return (
    <div className="space-y-4">
      {accountMode !== 'CORPORATE' && (
        <div className="bg-amber-50 border border-amber-300 text-amber-900 rounded-md px-4 py-3 text-xs flex flex-wrap items-center justify-between gap-2">
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

      <div className="bg-white border border-[#D9E0E8] rounded-md overflow-hidden">
        {/* Module Header */}
        <div className="px-5 py-3.5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-display font-bold text-base text-[#1D2B53]">
              e-Faktur — Administrasi Faktur Pajak (Modul 1)
            </h1>
            <p className="text-xs text-slate-500">
              Pajak Keluaran, Pajak Masukan, Dokumen Tertentu Ekspor, Pengganti, Pembatalan &amp; Nota Retur (PMK 131/2024)
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { id: 'output', label: 'Pajak Keluaran' },
              { id: 'input', label: 'Pajak Masukan' },
              { id: 'export', label: 'Dokumen Lain' },
              { id: 'retur', label: 'Retur Pajak Keluaran' },
            ].map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => onChangeSubTab(t.id)}
                className={`px-3.5 py-1.5 text-xs font-bold rounded transition cursor-pointer ${
                  subTab === t.id
                    ? 'bg-[#1D2B53] text-[#F4C430]'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Action Toolbar matching Coretax UI */}
        <div className="px-5 py-3 bg-[#F8FAFC] border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            {subTab !== 'retur' && (
              <button
                type="button"
                onClick={() => setCreateModalOpen(true)}
                className="inline-flex items-center gap-1.5 bg-[#1D2B53] hover:bg-[#273A6E] text-white font-bold text-xs px-3.5 py-2 rounded shadow-sm cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 text-[#F4C430]" />
                <span>
                  {subTab === 'output'
                    ? 'Buat Faktur Keluaran'
                    : subTab === 'input'
                    ? 'Tambah Simulasi Faktur Masukan'
                    : 'Catat Dokumen Ekspor (PEB)'}
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
              {formatRp(filteredInvoices.reduce((s, i) => s + (i.status === 'CANCELLED' ? 0 : i.ppnTotal), 0))}
            </strong>
          </div>
        </div>

        {/* Standard Coretax Yellow-Header Data Table */}
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
                {subTab === 'input' && (
                  <th className="px-3 py-2.5 text-center whitespace-nowrap">Pengkreditan</th>
                )}
                {subTab === 'retur' && (
                  <th className="px-3 py-2.5 text-right whitespace-nowrap">PPN Diretur</th>
                )}
                <th className="px-3 py-2.5 text-center whitespace-nowrap">Status Faktur</th>
              </tr>
              {/* Second Row: Inline Column Filter Bar (Coretax signature) */}
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
                <th colSpan={subTab === 'input' || subTab === 'retur' ? 5 : 4} className="px-2 py-1.5" />
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
                    Tidak ada data faktur pada tab ini. Klik tombol buat faktur di atas untuk menambahkan.
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

                        {subTab === 'output' && inv.status === 'DRAFT' && (
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

                        {subTab === 'output' && (inv.status === 'APPROVED' || inv.status === 'AMENDED') && (
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

                        {subTab === 'input' && inv.status !== 'CANCELLED' && (
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

                        {subTab === 'retur' && inv.status !== 'CANCELLED' && (
                          <button
                            type="button"
                            onClick={() => {
                              setReturnTarget(inv);
                              setReturnAmount(inv.returnAmount || Math.round(inv.ppnTotal * 0.2));
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
                      <div className="font-semibold text-slate-800">{inv.counterpartyName}</div>
                      <div className="text-[10px] font-mono-num text-slate-500">{inv.counterpartyNpwp}</div>
                    </td>
                    <td className="px-3 py-2.5 font-mono-num">
                      <div>{inv.invoiceDate}</div>
                      <div className="text-[10px] text-slate-500">
                        {MONTHS_ID[inv.taxPeriodMonth - 1]} {inv.taxPeriodYear}
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono-num">{formatRp(inv.dppTotal)}</td>
                    <td className="px-3 py-2.5 text-right font-mono-num">{formatRp(inv.dppOtherValue)}</td>
                    <td className="px-3 py-2.5 text-right font-mono-num font-bold text-[#1D2B53]">
                      {formatRp(inv.ppnTotal)}
                    </td>
                    {subTab === 'input' && (
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
                    {subTab === 'retur' && (
                      <td className="px-3 py-2.5 text-right font-mono-num font-bold text-red-700">
                        {inv.returnAmount > 0 ? formatRp(inv.returnAmount) : '-'}
                        {inv.returnNoteNumber && (
                          <div className="text-[10px] text-slate-500">{inv.returnNoteNumber}</div>
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

      {/* Create Invoice Modal */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-md shadow-xl border border-slate-300 w-full max-w-2xl overflow-hidden my-6">
            <div className="bg-[#1D2B53] text-white px-5 py-3.5 flex items-center justify-between border-b-2 border-[#F4C430]">
              <h3 className="font-display font-bold text-sm">
                {subTab === 'export'
                  ? 'Rekam Dokumen Tertentu Ekspor (PEB)'
                  : subTab === 'input'
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
                {subTab !== 'export' && (
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
                    {subTab === 'input' ? 'NPWP Penjual' : 'NPWP / NIK Pembeli'}
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
                    {subTab === 'input' ? 'Nama PKP Penjual' : 'Nama Pembeli / Penerima Jasa'}
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

                {subTab !== 'export' && (
                  <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isLuxury}
                      onChange={(e) => setIsLuxury(e.target.checked)}
                    />
                    <span>BKP Tergolong Mewah (PPN 12% Penuh tanpa DPP Nilai Lain 11/12)</span>
                  </label>
                )}

                {/* Auto Calculation Preview */}
                <div className="grid grid-cols-3 gap-3 bg-[#F8FAFC] border border-[#CBD5E1] rounded p-3">
                  <div>
                    <span className="text-[11px] text-slate-500 block">Harga Jual / DPP</span>
                    <span className="font-mono-num font-bold text-[#1D2B53]">{formatRp(previewCalc.dpp)}</span>
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-500 block">DPP Nilai Lain (11/12)</span>
                    <span className="font-mono-num font-bold text-[#1D2B53]">
                      {formatRp(previewCalc.dppOtherValue)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-500 block">
                      {subTab === 'export' ? 'PPN Ekspor (0%)' : 'PPN 12%'}
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
                Ubah nilai DPP untuk Faktur <strong>{amendTarget.invoiceNumber}</strong>. Setelah diajukan, status berubah menjadi <code>WAITING_FOR_AMENDMENT</code> dan memicu notifikasi real-time.
              </p>
              <div>
                <label className="block font-semibold text-[#1D2B53] mb-1">Nilai Harga Jual / DPP Baru (Rp)</label>
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
