import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowUpDown,
  CheckCircle2,
  CreditCard,
  Eye,
  Filter,
  Plus,
  Trash2,
  Wallet,
  X,
} from 'lucide-react';
import { Taxpayer, WorkspaceState } from '../types/tax.ts';
import { formatRp } from '../utils/taxCalc.ts';
import { PrintablePayload } from '../components/DocumentPrintModal.tsx';
import {
  CoretaxIconToolbar,
  CoretaxPagination,
  downloadCsvFile,
} from '../components/CoretaxTableChrome.tsx';

interface PembayaranModuleProps {
  subTab: string;
  resetKey?: number;
  onChangeSubTab: (tab: string) => void;
  workspace: WorkspaceState;
  activeTaxpayer: Taxpayer;
  onCreateBilling: (payload: {
    taxpayerId: string;
    kapCode: string;
    kjsCode: string;
    description: string;
    taxPeriodLabel: string;
    amount: number;
  }) => Promise<void>;
  onPayBilling: (id: string) => Promise<void>;
  onPrintDocument: (doc: PrintablePayload) => void;
}

interface PbkDraftItem {
  id: string;
  source: string;
  requestNumber: string;
  kap: string;
  kjs: string;
  period: string;
  currency: string;
  amount: number;
  status: 'DRAFT' | 'SUBMITTED' | 'PROCESSING' | 'DONE';
}

const KAP_OPTIONS = [
  { kap: '411211', kjs: '100', label: '411211-100 — Masa PPN Dalam Negeri' },
  { kap: '411121', kjs: '100', label: '411121-100 — Masa PPh Pasal 21' },
  { kap: '411124', kjs: '104', label: '411124-104 — Masa PPh Pasal 23 / Unifikasi' },
  { kap: '411125', kjs: '200', label: '411125-200 — Tahunan PPh Orang Pribadi (Psl 29)' },
  { kap: '411126', kjs: '200', label: '411126-200 — Tahunan PPh Badan (Psl 29)' },
  { kap: '411618', kjs: '100', label: '411618-100 — Pengisian Saldo Deposit Pajak' },
];

export const PembayaranModule: React.FC<PembayaranModuleProps> = ({
  subTab,
  resetKey,
  onChangeSubTab,
  workspace,
  activeTaxpayer,
  onCreateBilling,
  onPayBilling,
  onPrintDocument,
}) => {
  const [kapIdx, setKapIdx] = useState(0);
  const [periodLabel, setPeriodLabel] = useState('Masa Januari 2025');
  const [amount, setAmount] = useState(10_000_000);
  const [depositTopUp, setDepositTopUp] = useState(50_000_000);
  const [payingId, setPayingId] = useState<string | null>(null);

  // Pemindahbukuan (Pbk) state — matches image_34293372.png
  const [pbkStage, setPbkStage] = useState<'DRAFT' | 'SUBMITTED' | 'PROCESSING' | 'DONE'>('DRAFT');
  const [pbkItems, setPbkItems] = useState<PbkDraftItem[]>([]);
  const [selectedPbkIds, setSelectedPbkIds] = useState<string[]>([]);
  const [pbkModalOpen, setPbkModalOpen] = useState(false);

  useEffect(() => {
    setPbkModalOpen(false);
  }, [resetKey, subTab]);
  const [pbkSource, setPbkSource] = useState('Deposit Pajak (KAP 411618)');
  const [pbkKap, setPbkKap] = useState('411211');
  const [pbkKjs, setPbkKjs] = useState('100');
  const [pbkPeriod, setPbkPeriod] = useState('Januari 2025');
  const [pbkAmount, setPbkAmount] = useState(5_000_000);
  const [pbkFilter, setPbkFilter] = useState('');

  // Billing list filters & pagination
  const [billingCodeFilter, setBillingCodeFilter] = useState('');
  const [kapFilter, setKapFilter] = useState('');
  const [showFilters, setShowFilters] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [serviceToast, setServiceToast] = useState<string | null>(null);

  const visibleBillings = useMemo(() => {
    return workspace.billings.filter((b) => {
      if (b.taxpayerId !== activeTaxpayer.id) return false;
      if (
        billingCodeFilter.trim() &&
        !b.billingCode.toLowerCase().includes(billingCodeFilter.trim().toLowerCase())
      )
        return false;
      if (
        kapFilter.trim() &&
        !`${b.kapCode}-${b.kjsCode}`.includes(kapFilter.trim()) &&
        !b.description.toLowerCase().includes(kapFilter.trim().toLowerCase())
      )
        return false;
      return true;
    });
  }, [workspace.billings, activeTaxpayer.id, billingCodeFilter, kapFilter]);

  const paginatedBillings = visibleBillings.slice((page - 1) * pageSize, page * pageSize);

  const filteredPbk = pbkItems.filter(
    (item) =>
      item.status === pbkStage &&
      (!pbkFilter.trim() ||
        item.requestNumber.toLowerCase().includes(pbkFilter.trim().toLowerCase()) ||
        item.source.toLowerCase().includes(pbkFilter.trim().toLowerCase()) ||
        item.kap.includes(pbkFilter.trim()))
  );

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const sel = KAP_OPTIONS[kapIdx];
    await onCreateBilling({
      taxpayerId: activeTaxpayer.id,
      kapCode: sel.kap,
      kjsCode: sel.kjs,
      description: sel.label,
      taxPeriodLabel: periodLabel,
      amount,
    });
    onChangeSubTab('daftar');
  };

  const handleCreatePbk = (e: React.FormEvent) => {
    e.preventDefault();
    const newItem: PbkDraftItem = {
      id: `pbk-${Date.now()}`,
      source: pbkSource,
      requestNumber: `PBK-${new Date().getFullYear()}-${String(pbkItems.length + 1).padStart(4, '0')}`,
      kap: pbkKap,
      kjs: pbkKjs,
      period: pbkPeriod,
      currency: 'IDR',
      amount: pbkAmount,
      status: 'DRAFT',
    };
    setPbkItems((prev) => [newItem, ...prev]);
    setPbkStage('DRAFT');
    setPbkModalOpen(false);
  };

  const pbkStageTitle =
    pbkStage === 'DRAFT'
      ? 'Permohonan Pemindahbukuan Belum Diajukan'
      : pbkStage === 'SUBMITTED'
        ? 'Permohonan Pemindahbukuan Telah Diajukan'
        : pbkStage === 'PROCESSING'
          ? 'Permohonan Pemindahbukuan Diproses'
          : 'Permohonan Pemindahbukuan Selesai Proses';

  const normalizedSubTab = subTab || 'pemindahbukuan';

  return (
    <div className="space-y-4">
      {serviceToast && (
        <div className="bg-emerald-50 border border-emerald-300 text-emerald-900 rounded-lg px-4 py-2.5 text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{serviceToast}</span>
        </div>
      )}

      {/* =================================================================== */}
      {/* 1. PERMOHONAN PEMINDAHBUKUAN (EXACT MATCH TO image_34293372.png)    */}
      {/* =================================================================== */}
      {normalizedSubTab === 'pemindahbukuan' && (
        <div className="flex flex-col lg:flex-row gap-4 items-start">
          {/* Left 2-Column Status Panel */}
          <aside className="w-full lg:w-[225px] shrink-0 bg-white border border-[#E2E8F0] rounded-[8px] overflow-hidden shadow-xs">
            <div className="bg-[#1E2C5E] text-white px-4 py-4">
              <div className="font-mono-num font-bold text-[14px] tracking-wide break-all leading-tight">
                {activeTaxpayer.nikNpwp}
              </div>
              <div className="text-xs font-medium text-slate-200 uppercase mt-1 truncate">
                {activeTaxpayer.name}
              </div>
            </div>
            <div className="py-1.5">
              {(
                [
                  { id: 'DRAFT', label: 'Belum Diajukan' },
                  { id: 'SUBMITTED', label: 'Telah Diajukan' },
                  { id: 'PROCESSING', label: 'Diproses' },
                  { id: 'DONE', label: 'Selesai Proses' },
                ] as const
              ).map((st) => (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => {
                    setPbkStage(st.id);
                    setSelectedPbkIds([]);
                  }}
                  className={`w-full text-left px-4 py-2.5 text-[12px] transition cursor-pointer flex items-center justify-between ${
                    pbkStage === st.id
                      ? 'bg-[#E6EEF6] text-[#1E2C5E] font-bold'
                      : 'text-slate-600 hover:bg-slate-50 font-medium'
                  }`}
                >
                  <span>{st.label}</span>
                  <span className="font-mono-num text-[11px] text-slate-500">
                    {pbkItems.filter((p) => p.status === st.id).length || ''}
                  </span>
                </button>
              ))}
            </div>
          </aside>

          {/* Right Pemindahbukuan Card */}
          <div className="flex-1 min-w-0 w-full bg-white border border-[#E2E8F0] rounded-[8px] overflow-hidden">
            <div className="px-5 py-4 border-b border-[#E5EAF2] flex flex-wrap items-center justify-between gap-3">
              <h1 className="font-display font-bold text-[16px] text-[#1E2C5E]">
                {pbkStageTitle}
              </h1>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPbkModalOpen(true)}
                  className="inline-flex items-center gap-1.5 bg-[#1E2C5E] hover:bg-[#16224A] text-white font-semibold text-xs px-3.5 py-2 rounded-[6px] transition cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Buat Permohonan Pemindahbukuan Baru</span>
                </button>
                <button
                  type="button"
                  disabled={selectedPbkIds.length === 0}
                  onClick={() => {
                    setPbkItems((prev) => prev.filter((x) => !selectedPbkIds.includes(x.id)));
                    setSelectedPbkIds([]);
                  }}
                  className="inline-flex items-center gap-1.5 bg-[#94A3B8] enabled:bg-rose-600 disabled:opacity-55 text-white font-semibold text-xs px-3 py-2 rounded-[6px] transition cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Hapus</span>
                </button>
              </div>
            </div>

            <div className="px-5">
              <CoretaxIconToolbar
                onRefresh={() => setPbkFilter('')}
                onExportCsv={() =>
                  downloadCsvFile(
                    `Pemindahbukuan_${activeTaxpayer.nikNpwp}.csv`,
                    ['Sumber Pemindahbukuan', 'Nomor Permohonan', 'KAP', 'KJS', 'Masa Pajak', 'Mata Uang', 'Nilai'],
                    filteredPbk.map((p) => [
                      p.source,
                      p.requestNumber,
                      p.kap,
                      p.kjs,
                      p.period,
                      p.currency,
                      p.amount,
                    ])
                  )
                }
                onExportExcel={() =>
                  downloadCsvFile(
                    `Pemindahbukuan_${activeTaxpayer.nikNpwp}.csv`,
                    ['Sumber Pemindahbukuan', 'Nomor Permohonan', 'KAP', 'KJS', 'Masa Pajak', 'Mata Uang', 'Nilai'],
                    filteredPbk.map((p) => [
                      p.source,
                      p.requestNumber,
                      p.kap,
                      p.kjs,
                      p.period,
                      p.currency,
                      p.amount,
                    ])
                  )
                }
                onPrintPdf={() => window.print()}
                onToggleFilter={() => setShowFilters((p) => !p)}
                filterActive={showFilters}
              />
            </div>

            <div className="px-5 pb-4">
              <div className="border border-[#E2E8F0] rounded-[8px] overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-[11.5px] border-collapse">
                    <thead>
                      <tr className="bg-[#FCD34D] text-[#1E293B] font-bold border-b border-[#EAB308]/40">
                        <th className="px-2.5 py-2.5 w-9 text-center border-r border-white/50" />
                        <th className="px-3 py-2.5 text-left whitespace-nowrap border-r border-white/50">Aksi</th>
                        <th className="px-3 py-2.5 text-left whitespace-nowrap border-r border-white/50">
                          <span className="inline-flex items-center gap-1">
                            Sumber Pemindahbukuan <ArrowUpDown className="w-3 h-3 opacity-60" />
                          </span>
                        </th>
                        <th className="px-3 py-2.5 text-left whitespace-nowrap border-r border-white/50">
                          <span className="inline-flex items-center gap-1">
                            Nomor Permohonan <ArrowUpDown className="w-3 h-3 opacity-60" />
                          </span>
                        </th>
                        <th className="px-3 py-2.5 text-left whitespace-nowrap border-r border-white/50">
                          <span className="inline-flex items-center gap-1">
                            KAP <ArrowUpDown className="w-3 h-3 opacity-60" />
                          </span>
                        </th>
                        <th className="px-3 py-2.5 text-left whitespace-nowrap border-r border-white/50">
                          <span className="inline-flex items-center gap-1">
                            Kode Jenis Setoran <ArrowUpDown className="w-3 h-3 opacity-60" />
                          </span>
                        </th>
                        <th className="px-3 py-2.5 text-left whitespace-nowrap border-r border-white/50">
                          <span className="inline-flex items-center gap-1">
                            Masa Pajak <ArrowUpDown className="w-3 h-3 opacity-60" />
                          </span>
                        </th>
                        <th className="px-3 py-2.5 text-left whitespace-nowrap border-r border-white/50">
                          Mata Uang
                        </th>
                        <th className="px-3 py-2.5 text-right whitespace-nowrap">
                          Nilai yang Dipindahbukukan
                        </th>
                      </tr>
                      {showFilters && (
                        <tr className="bg-white border-b border-[#E2E8F0]">
                          <th className="px-2 py-2 border-r border-slate-100" />
                          <th className="px-2 py-2 border-r border-slate-100" />
                          <th colSpan={2} className="px-2 py-2 border-r border-slate-100">
                            <div className="flex items-center gap-1">
                              <input
                                type="text"
                                value={pbkFilter}
                                onChange={(e) => setPbkFilter(e.target.value)}
                                placeholder="Cari nomor / sumber / KAP..."
                                className="w-full border border-[#CBD5E1] rounded-[5px] px-2 py-1 text-[11px] font-normal"
                              />
                              <Filter className="w-3 h-3 text-slate-400 shrink-0" />
                            </div>
                          </th>
                          <th colSpan={5} className="px-2 py-2" />
                        </tr>
                      )}
                    </thead>
                    <tbody className="divide-y divide-[#EEF2F6]">
                      {filteredPbk.length === 0 ? (
                        <tr>
                          <td colSpan={9} className="px-4 py-8 text-left text-slate-500">
                            Tidak ada data yang ditemukan.
                          </td>
                        </tr>
                      ) : (
                        filteredPbk.map((item) => (
                          <tr key={item.id} className="hover:bg-[#F8FAFC]">
                            <td className="px-2.5 py-2.5 text-center">
                              <input
                                type="checkbox"
                                checked={selectedPbkIds.includes(item.id)}
                                onChange={() =>
                                  setSelectedPbkIds((prev) =>
                                    prev.includes(item.id)
                                      ? prev.filter((x) => x !== item.id)
                                      : [...prev, item.id]
                                  )
                                }
                              />
                            </td>
                            <td className="px-3 py-2.5 whitespace-nowrap">
                              {item.status === 'DRAFT' ? (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setPbkItems((prev) =>
                                      prev.map((x) =>
                                        x.id === item.id ? { ...x, status: 'SUBMITTED' } : x
                                      )
                                    );
                                    setPbkStage('SUBMITTED');
                                  }}
                                  className="px-2.5 py-1 rounded bg-[#1E2C5E] text-white text-[11px] font-semibold cursor-pointer"
                                >
                                  Ajukan
                                </button>
                              ) : (
                                <span className="text-[11px] font-bold text-emerald-700">Tercatat</span>
                              )}
                            </td>
                            <td className="px-3 py-2.5 font-medium">{item.source}</td>
                            <td className="px-3 py-2.5 font-mono-num font-bold text-[#1E2C5E]">
                              {item.requestNumber}
                            </td>
                            <td className="px-3 py-2.5 font-mono-num">{item.kap}</td>
                            <td className="px-3 py-2.5 font-mono-num">{item.kjs}</td>
                            <td className="px-3 py-2.5">{item.period}</td>
                            <td className="px-3 py-2.5 font-mono-num">{item.currency}</td>
                            <td className="px-3 py-2.5 text-right font-mono-num font-bold text-[#1E2C5E]">
                              {formatRp(item.amount)}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                <CoretaxPagination
                  totalItems={filteredPbk.length}
                  page={1}
                  pageSize={10}
                  onPageChange={() => {}}
                  onPageSizeChange={() => {}}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* 2. DAFTAR KODE BILLING BELUM DIBAYAR (GOLDEN-YELLOW CORETAX TABLE)  */}
      {/* =================================================================== */}
      {(normalizedSubTab === 'daftar' || normalizedSubTab === 'tagihan') && (
        <div className="bg-white border border-[#E2E8F0] rounded-[8px] overflow-hidden">
          <div className="px-5 py-4 border-b border-[#E5EAF2] flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="font-display font-bold text-[17px] text-[#1E2C5E]">
                {normalizedSubTab === 'tagihan'
                  ? 'Pembuatan Kode Billing atas Tagihan Pajak'
                  : 'Daftar Kode Billing Belum Dibayar & Riwayat NTPN'}
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Pelunasan Kode Billing otomatis menerbitkan NTPN dan memperbarui SPT Menunggu Pembayaran menjadi Dilaporkan (BPE).
              </p>
            </div>
            <button
              type="button"
              onClick={() => onChangeSubTab('buat')}
              className="inline-flex items-center gap-1.5 bg-[#1E2C5E] hover:bg-[#16224A] text-white font-semibold text-xs px-3.5 py-2 rounded-[6px] cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 text-[#F4C430]" />
              <span>Buat Kode Billing Baru</span>
            </button>
          </div>

          <div className="px-5">
            <CoretaxIconToolbar
              onRefresh={() => {
                setBillingCodeFilter('');
                setKapFilter('');
                setPage(1);
              }}
              onExportCsv={() =>
                downloadCsvFile(
                  `Kode_Billing_${activeTaxpayer.nikNpwp}.csv`,
                  ['ID Billing', 'KAP-KJS', 'Uraian', 'Masa', 'Nominal', 'Status', 'NTPN'],
                  visibleBillings.map((b) => [
                    b.billingCode,
                    `${b.kapCode}-${b.kjsCode}`,
                    b.description,
                    b.taxPeriodLabel,
                    b.amount,
                    b.status,
                    b.ntpn || '-',
                  ])
                )
              }
              onExportExcel={() =>
                downloadCsvFile(
                  `Kode_Billing_${activeTaxpayer.nikNpwp}.csv`,
                  ['ID Billing', 'KAP-KJS', 'Uraian', 'Masa', 'Nominal', 'Status', 'NTPN'],
                  visibleBillings.map((b) => [
                    b.billingCode,
                    `${b.kapCode}-${b.kjsCode}`,
                    b.description,
                    b.taxPeriodLabel,
                    b.amount,
                    b.status,
                    b.ntpn || '-',
                  ])
                )
              }
              onPrintPdf={() => window.print()}
              onToggleFilter={() => setShowFilters((p) => !p)}
              filterActive={showFilters}
            />
          </div>

          <div className="px-5 pb-4">
            <div className="border border-[#E2E8F0] rounded-[8px] overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-[11.5px] border-collapse">
                  <thead>
                    <tr className="bg-[#FCD34D] text-[#1E293B] font-bold border-b border-[#EAB308]/40">
                      <th className="px-3 py-2.5 text-left border-r border-white/50">Aksi</th>
                      <th className="px-3 py-2.5 text-left border-r border-white/50">ID Billing (15 Digit)</th>
                      <th className="px-3 py-2.5 text-left border-r border-white/50">KAP / KJS</th>
                      <th className="px-3 py-2.5 text-left border-r border-white/50">Uraian Setoran</th>
                      <th className="px-3 py-2.5 text-left border-r border-white/50">Masa / Tahun</th>
                      <th className="px-3 py-2.5 text-right border-r border-white/50">Nominal Setor</th>
                      <th className="px-3 py-2.5 text-center">Status / NTPN</th>
                    </tr>
                    {showFilters && (
                      <tr className="bg-white border-b border-[#E2E8F0]">
                        <th className="px-2 py-2 border-r border-slate-100" />
                        <th className="px-2 py-2 border-r border-slate-100">
                          <input
                            type="text"
                            value={billingCodeFilter}
                            onChange={(e) => {
                              setBillingCodeFilter(e.target.value);
                              setPage(1);
                            }}
                            placeholder="Filter ID Billing..."
                            className="w-full border border-[#CBD5E1] rounded-[5px] px-2 py-1 text-[11px] font-normal"
                          />
                        </th>
                        <th colSpan={2} className="px-2 py-2 border-r border-slate-100">
                          <input
                            type="text"
                            value={kapFilter}
                            onChange={(e) => {
                              setKapFilter(e.target.value);
                              setPage(1);
                            }}
                            placeholder="Filter KAP / Uraian..."
                            className="w-full border border-[#CBD5E1] rounded-[5px] px-2 py-1 text-[11px] font-normal"
                          />
                        </th>
                        <th colSpan={3} className="px-2 py-2" />
                      </tr>
                    )}
                  </thead>
                  <tbody className="divide-y divide-[#EEF2F6] bg-white">
                    {paginatedBillings.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-4 py-8 text-left text-slate-500">
                          Belum ada Kode Billing pada akun <strong>{activeTaxpayer.name}</strong>.
                        </td>
                      </tr>
                    ) : (
                      paginatedBillings.map((b) => (
                        <tr key={b.id} className="hover:bg-[#F8FAFC]">
                          <td className="px-3 py-2.5 whitespace-nowrap">
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() =>
                                  onPrintDocument({
                                    type: 'BILLING',
                                    billing: b,
                                    taxpayer: activeTaxpayer,
                                  })
                                }
                                className="p-1.5 rounded border border-slate-200 hover:bg-slate-100 text-[#1E2C5E] cursor-pointer"
                                title="Cetak Kode Billing"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                              {b.status === 'UNPAID' && (
                                <button
                                  type="button"
                                  disabled={payingId === b.id}
                                  onClick={async () => {
                                    setPayingId(b.id);
                                    try {
                                      await onPayBilling(b.id);
                                    } finally {
                                      setPayingId(null);
                                    }
                                  }}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-700 hover:bg-emerald-800 text-white text-[11px] font-bold cursor-pointer"
                                >
                                  <CreditCard className="w-3 h-3" />
                                  <span>{payingId === b.id ? 'Memproses...' : 'Simulasi Bayar (NTPN)'}</span>
                                </button>
                              )}
                            </div>
                          </td>
                          <td className="px-3 py-2.5 font-mono-num font-bold text-[#1E2C5E]">
                            {b.billingCode}
                          </td>
                          <td className="px-3 py-2.5 font-mono-num">
                            {b.kapCode}-{b.kjsCode}
                          </td>
                          <td className="px-3 py-2.5 font-medium">{b.description}</td>
                          <td className="px-3 py-2.5">{b.taxPeriodLabel}</td>
                          <td className="px-3 py-2.5 text-right font-mono-num font-bold text-[#1E2C5E]">
                            {formatRp(b.amount)}
                          </td>
                          <td className="px-3 py-2.5 text-center">
                            {b.status === 'PAID' ? (
                              <div>
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-300 px-2 py-0.5 rounded">
                                  <CheckCircle2 className="w-3 h-3" /> LUNAS
                                </span>
                                <div className="text-[10px] font-mono-num text-slate-500 mt-0.5">
                                  NTPN: {b.ntpn}
                                </div>
                              </div>
                            ) : (
                              <span className="inline-block text-[10px] font-bold text-amber-800 bg-amber-50 border border-amber-300 px-2 py-0.5 rounded">
                                BELUM DIBAYAR
                              </span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <CoretaxPagination
                totalItems={visibleBillings.length}
                page={page}
                pageSize={pageSize}
                onPageChange={setPage}
                onPageSizeChange={setPageSize}
              />
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* 3. LAYANAN MANDIRI KODE BILLING                                     */}
      {/* =================================================================== */}
      {normalizedSubTab === 'buat' && (
        <div className="bg-white border border-[#E2E8F0] rounded-[8px] overflow-hidden">
          <div className="px-5 py-4 border-b border-[#E5EAF2]">
            <h1 className="font-display font-bold text-[17px] text-[#1E2C5E]">
              Layanan Mandiri Pembuatan Kode Billing
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Buat Kode Billing secara mandiri untuk setoran PPN, PPh 21, PPh 23/Unifikasi, PPh Pasal 29, atau Deposit Pajak.
            </p>
          </div>
          <form onSubmit={handleCreate} className="p-5 max-w-xl space-y-4 text-xs">
            <div>
              <label className="block font-semibold text-[#1E2C5E] mb-1">
                Kode Akun Pajak (KAP) &amp; Jenis Setoran (KJS)
              </label>
              <select
                value={kapIdx}
                onChange={(e) => setKapIdx(Number(e.target.value))}
                className="w-full border border-[#CBD5E1] rounded-[6px] px-3 py-2 bg-white"
              >
                {KAP_OPTIONS.map((o, idx) => (
                  <option key={o.kap + o.kjs} value={idx}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-semibold text-[#1E2C5E] mb-1">Masa / Tahun Pajak</label>
              <input
                type="text"
                value={periodLabel}
                onChange={(e) => setPeriodLabel(e.target.value)}
                className="w-full border border-[#CBD5E1] rounded-[6px] px-3 py-2"
                required
              />
            </div>
            <div>
              <label className="block font-semibold text-[#1E2C5E] mb-1">Jumlah Setor (Rp)</label>
              <input
                type="number"
                min={1000}
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
                className="w-full border border-[#CBD5E1] rounded-[6px] px-3 py-2 font-mono-num"
                required
              />
            </div>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 bg-[#1E2C5E] hover:bg-[#16224A] text-white font-semibold px-4 py-2 rounded-[6px] cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 text-[#F4C430]" />
              <span>Terbitkan Kode Billing</span>
            </button>
          </form>
        </div>
      )}

      {/* =================================================================== */}
      {/* 4. DEPOSIT PAJAK                                                    */}
      {/* =================================================================== */}
      {normalizedSubTab === 'deposit' && (
        <div className="bg-white border border-[#E2E8F0] rounded-[8px] p-5 space-y-4 text-xs">
          <div className="bg-[#1E2C5E] text-white rounded-lg p-5 flex flex-wrap items-center justify-between gap-4 border-l-4 border-[#F4C430]">
            <div>
              <div className="text-[11px] uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <Wallet className="w-4 h-4 text-[#F4C430]" />
                <span>Saldo Deposit Pajak Aktif ({activeTaxpayer.name})</span>
              </div>
              <div className="text-2xl font-mono-num font-extrabold text-[#F4C430] mt-1">
                {formatRp(activeTaxpayer.depositBalance)}
              </div>
              <p className="text-[11px] text-slate-300 mt-1">
                Dapat langsung digunakan untuk Pemindahbukuan otomatis saat pelaporan SPT Masa PPN, PPh 21/23, maupun SPT Tahunan.
              </p>
            </div>
            <div className="bg-white/10 border border-white/15 rounded p-3.5 flex items-end gap-2">
              <div>
                <label className="block text-[10px] text-slate-200 mb-1">Nominal Top-Up Deposit (Rp)</label>
                <input
                  type="number"
                  min={100000}
                  value={depositTopUp}
                  onChange={(e) => setDepositTopUp(Number(e.target.value))}
                  className="bg-white text-[#1E2C5E] font-mono-num font-bold rounded px-3 py-1.5 w-44"
                />
              </div>
              <button
                type="button"
                onClick={async () => {
                  await onCreateBilling({
                    taxpayerId: activeTaxpayer.id,
                    kapCode: '411618',
                    kjsCode: '100',
                    description: 'Pengisian Saldo Deposit Pajak (KAP 411618)',
                    taxPeriodLabel: 'Deposit 2025',
                    amount: depositTopUp,
                  });
                  onChangeSubTab('daftar');
                }}
                className="bg-[#F4C430] hover:bg-[#E0AF1A] text-[#1E2C5E] font-bold px-3.5 py-1.5 rounded cursor-pointer"
              >
                Buat Billing Deposit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* 5. OTHER CORETAX PEMBAYARAN SERVICES (RESTITUSI / IMBALAN / DTP)    */}
      {/* =================================================================== */}
      {(normalizedSubTab === 'restitusi' ||
        normalizedSubTab === 'imbalan_bunga' ||
        normalizedSubTab === 'pph_dtp') && (
        <div className="bg-white border border-[#E2E8F0] rounded-[8px] overflow-hidden">
          <div className="px-5 py-4 border-b border-[#E5EAF2] flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="font-display font-bold text-[17px] text-[#1E2C5E]">
                {normalizedSubTab === 'restitusi'
                  ? 'Formulir Restitusi Pajak'
                  : normalizedSubTab === 'imbalan_bunga'
                    ? 'Permohonan Pemberian Imbalan Bunga'
                    : 'Permohonan PPh DTP atas Penghasilan'}
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Layanan pengajuan pembayaran &amp; pengembalian kelebihan pajak melalui Coretax DJP.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setServiceToast('Draf permohonan berhasil dibuat pada akun simulasi.');
                window.setTimeout(() => setServiceToast(null), 3000);
              }}
              className="inline-flex items-center gap-1.5 bg-[#1E2C5E] hover:bg-[#16224A] text-white font-semibold text-xs px-3.5 py-2 rounded-[6px] cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Buat Permohonan Baru</span>
            </button>
          </div>
          <div className="p-5">
            <div className="border border-[#E2E8F0] rounded-[8px] overflow-hidden">
              <table className="w-full text-[11.5px] border-collapse">
                <thead>
                  <tr className="bg-[#FCD34D] text-[#1E293B] font-bold">
                    <th className="px-3 py-2.5 text-left">Nomor Permohonan</th>
                    <th className="px-3 py-2.5 text-left">Jenis Layanan</th>
                    <th className="px-3 py-2.5 text-left">Tahun / Masa</th>
                    <th className="px-3 py-2.5 text-right">Nominal (Rp)</th>
                    <th className="px-3 py-2.5 text-center">Status</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-left text-slate-500">
                      Tidak ada data yang ditemukan.
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Modal Create Pemindahbukuan */}
      {pbkModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl border border-slate-300 w-full max-w-md overflow-hidden">
            <div className="bg-[#1E2C5E] text-white px-5 py-3.5 flex items-center justify-between border-b-2 border-[#F4C430]">
              <h3 className="font-display font-bold text-sm">Buat Permohonan Pemindahbukuan (Pbk)</h3>
              <button type="button" onClick={() => setPbkModalOpen(false)} className="cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleCreatePbk} className="p-5 space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-[#1E2C5E] mb-1">Sumber Pemindahbukuan</label>
                <input
                  type="text"
                  value={pbkSource}
                  onChange={(e) => setPbkSource(e.target.value)}
                  className="w-full border border-[#CBD5E1] rounded px-3 py-2"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#1E2C5E] mb-1">KAP Tujuan</label>
                  <input
                    type="text"
                    value={pbkKap}
                    onChange={(e) => setPbkKap(e.target.value)}
                    className="w-full border border-[#CBD5E1] rounded px-3 py-2 font-mono-num"
                    required
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#1E2C5E] mb-1">Kode Jenis Setoran</label>
                  <input
                    type="text"
                    value={pbkKjs}
                    onChange={(e) => setPbkKjs(e.target.value)}
                    className="w-full border border-[#CBD5E1] rounded px-3 py-2 font-mono-num"
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#1E2C5E] mb-1">Masa Pajak</label>
                  <input
                    type="text"
                    value={pbkPeriod}
                    onChange={(e) => setPbkPeriod(e.target.value)}
                    className="w-full border border-[#CBD5E1] rounded px-3 py-2"
                    required
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#1E2C5E] mb-1">Nilai (Rp)</label>
                  <input
                    type="number"
                    min={1000}
                    value={pbkAmount}
                    onChange={(e) => setPbkAmount(Number(e.target.value))}
                    className="w-full border border-[#CBD5E1] rounded px-3 py-2 font-mono-num"
                    required
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setPbkModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded font-semibold cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#1E2C5E] text-white font-bold rounded cursor-pointer"
                >
                  Simpan Draf Pbk
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
