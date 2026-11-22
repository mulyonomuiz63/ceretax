import React, { useMemo, useState } from 'react';
import {
  Banknote,
  ChevronLeft,
  ChevronRight,
  Coins,
  HandCoins,
  Layers,
  Printer,
  Wallet,
} from 'lucide-react';
import { Taxpayer, WorkspaceState } from '../types/tax.ts';
import { MONTHS_ID } from '../utils/taxCalc.ts';

interface BukuBesarModuleProps {
  workspace: WorkspaceState;
  activeTaxpayer: Taxpayer;
}

interface LedgerEntry {
  id: string;
  postingDate: string; // YYYY-MM-DD
  taxType: string;
  periodLabel: string;
  referenceNumber: string;
  description: string;
  debit: number;
  credit: number;
  remainingDebit: number;
  remainingCredit: number;
  status: 'POSTED' | 'OPEN' | 'CANCELLED';
}

function formatDecimalId(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

const RETURN_SHORT_LABELS: Record<string, string> = {
  SPT_MASA_PPN: 'PPN',
  SPT_MASA_PPH21: 'PPh Pasal 21/26',
  SPT_MASA_UNIFIKASI: 'PPh Unifikasi',
  SPT_TAHUNAN_OP: 'PPh Orang Pribadi',
  SPT_TAHUNAN_BADAN: 'PPh Badan',
};

export const BukuBesarModule: React.FC<BukuBesarModuleProps> = ({
  workspace,
  activeTaxpayer,
}) => {
  // Pending checkbox & date filters (applied when clicking "Terapkan Filter", just like Coretax)
  const [draftShowZero, setDraftShowZero] = useState(false);
  const [draftShowCredit, setDraftShowCredit] = useState(false);
  const [draftShowDebit, setDraftShowDebit] = useState(false);
  const [draftShowCancelled, setDraftShowCancelled] = useState(false);
  const [draftDateFrom, setDraftDateFrom] = useState('');
  const [draftDateTo, setDraftDateTo] = useState('');

  // Applied filter state
  const [appliedFilter, setAppliedFilter] = useState({
    showZero: false,
    showCredit: false,
    showDebit: false,
    showCancelled: false,
    dateFrom: '',
    dateTo: '',
  });

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Build authentic taxpayer ledger entries from SPT returns, Billing codes, and Deposit balance
  const allEntries = useMemo<LedgerEntry[]>(() => {
    const entries: LedgerEntry[] = [];

    // 1. Tax Returns (SPT) belonging to activeTaxpayer
    const tpReturns = workspace.returns.filter((r) => r.taxpayerId === activeTaxpayer.id);
    for (const ret of tpReturns) {
      if (ret.status === 'DRAFT') continue;
      const periodLabel =
        ret.taxPeriodMonth > 0
          ? `${MONTHS_ID[ret.taxPeriodMonth - 1]} ${ret.taxYear}`
          : `Tahun Pajak ${ret.taxYear}`;
      const postingDate = (ret.submittedAt || ret.updatedAt || ret.createdAt).slice(0, 10);
      const taxType = RETURN_SHORT_LABELS[ret.returnType] || ret.returnType;

      if (ret.status === 'REJECTED') {
        entries.push({
          id: `led-ret-${ret.id}`,
          postingDate,
          taxType,
          periodLabel,
          referenceNumber: ret.bpeNumber || ret.id,
          description: `SPT ${taxType} (${periodLabel}) — Ditolak / Dibatalkan`,
          debit: Math.max(0, ret.underOverPayment),
          credit: Math.max(0, -ret.underOverPayment),
          remainingDebit: 0,
          remainingCredit: 0,
          status: 'CANCELLED',
        });
        continue;
      }

      if (ret.underOverPayment > 0) {
        const isUnpaid = ret.status === 'WAITING_PAYMENT';
        entries.push({
          id: `led-ret-${ret.id}`,
          postingDate,
          taxType,
          periodLabel,
          referenceNumber: ret.bpeNumber || ret.billingCodeId || ret.id,
          description: `Kewajiban SPT ${taxType} (${periodLabel}) — ${
            ret.paymentMethod === 'DEPOSIT' ? 'Pemindahbukuan Deposit' : isUnpaid ? 'Menunggu Pembayaran' : 'Lunas'
          }`,
          debit: ret.underOverPayment,
          credit: 0,
          remainingDebit: isUnpaid ? ret.underOverPayment : 0,
          remainingCredit: 0,
          status: isUnpaid ? 'OPEN' : 'POSTED',
        });

        // If paid via Deposit directly at submission, also record the offsetting Deposit Credit usage
        if (ret.paymentMethod === 'DEPOSIT' && ret.status === 'SUBMITTED') {
          entries.push({
            id: `led-dep-use-${ret.id}`,
            postingDate,
            taxType: 'Deposit Pajak',
            periodLabel,
            referenceNumber: ret.bpeNumber || ret.id,
            description: `Pelunasan SPT ${taxType} via Pemindahbukuan Deposit Pajak`,
            debit: 0,
            credit: ret.underOverPayment,
            remainingDebit: 0,
            remainingCredit: 0,
            status: 'POSTED',
          });
        }
      } else if (ret.underOverPayment < 0) {
        const overpay = Math.abs(ret.underOverPayment);
        entries.push({
          id: `led-ret-${ret.id}`,
          postingDate,
          taxType,
          periodLabel,
          referenceNumber: ret.bpeNumber || ret.id,
          description: `Lebih Bayar SPT ${taxType} (${periodLabel})`,
          debit: 0,
          credit: overpay,
          remainingDebit: 0,
          remainingCredit: overpay,
          status: 'POSTED',
        });
      } else {
        // NIHIL (nilai 0)
        entries.push({
          id: `led-ret-${ret.id}`,
          postingDate,
          taxType,
          periodLabel,
          referenceNumber: ret.bpeNumber || ret.id,
          description: `Pelaporan SPT ${taxType} Nihil (${periodLabel})`,
          debit: 0,
          credit: 0,
          remainingDebit: 0,
          remainingCredit: 0,
          status: 'POSTED',
        });
      }
    }

    // 2. Billing Codes & NTPN Payments belonging to activeTaxpayer
    const tpBillings = workspace.billings.filter((b) => b.taxpayerId === activeTaxpayer.id);
    for (const bill of tpBillings) {
      const postingDate = (bill.paidAt || bill.createdAt).slice(0, 10);
      if (bill.status === 'PAID') {
        const isDepositTopUp = bill.kapCode === '411618';
        entries.push({
          id: `led-bill-${bill.id}`,
          postingDate,
          taxType: isDepositTopUp ? 'Deposit Pajak' : `KAP ${bill.kapCode}-${bill.kjsCode}`,
          periodLabel: bill.taxPeriodLabel,
          referenceNumber: bill.ntpn || bill.billingCode,
          description: `${bill.description} (NTPN: ${bill.ntpn || '-'})`,
          debit: 0,
          credit: bill.amount,
          remainingDebit: 0,
          remainingCredit: isDepositTopUp ? bill.amount : 0,
          status: 'POSTED',
        });
      } else if (!bill.returnId) {
        // Standalone unpaid billing code
        entries.push({
          id: `led-bill-${bill.id}`,
          postingDate,
          taxType: `KAP ${bill.kapCode}-${bill.kjsCode}`,
          periodLabel: bill.taxPeriodLabel,
          referenceNumber: bill.billingCode,
          description: `${bill.description} — Kode Billing Belum Dibayar`,
          debit: bill.amount,
          credit: 0,
          remainingDebit: bill.amount,
          remainingCredit: 0,
          status: 'OPEN',
        });
      }
    }

    // Sort newest posting date first
    entries.sort((a, b) => b.postingDate.localeCompare(a.postingDate));
    return entries;
  }, [workspace.returns, workspace.billings, activeTaxpayer.id]);

  // Compute Total Summary (across all non-cancelled active ledger entries + active deposit balance)
  const totalSummary = useMemo(() => {
    const activeRows = allEntries.filter((e) => e.status !== 'CANCELLED');
    const debit = activeRows.reduce((acc, e) => acc + e.debit, 0);
    const credit = activeRows.reduce((acc, e) => acc + e.credit, 0);
    const remainingDebit = activeRows.reduce((acc, e) => acc + e.remainingDebit, 0);
    const remainingCredit =
      activeRows.reduce((acc, e) => acc + e.remainingCredit, 0) +
      Math.max(0, activeTaxpayer.depositBalance || 0);
    const saldo = remainingCredit - remainingDebit;
    return { debit, credit, remainingDebit, remainingCredit, saldo };
  }, [allEntries, activeTaxpayer.depositBalance]);

  // Compute Filtered Entries
  const filteredEntries = useMemo(() => {
    return allEntries.filter((entry) => {
      if (entry.status === 'CANCELLED' && !appliedFilter.showCancelled) {
        return false;
      }
      const isZero = entry.debit === 0 && entry.credit === 0;
      if (isZero && !appliedFilter.showZero) {
        return false;
      }

      // If either Credit or Debit checkbox is selected (but not both), filter accordingly
      if (appliedFilter.showCredit && !appliedFilter.showDebit) {
        if (entry.credit <= 0 && !isZero) return false;
      } else if (appliedFilter.showDebit && !appliedFilter.showCredit) {
        if (entry.debit <= 0 && !isZero) return false;
      }

      if (appliedFilter.dateFrom && entry.postingDate < appliedFilter.dateFrom) {
        return false;
      }
      if (appliedFilter.dateTo && entry.postingDate > appliedFilter.dateTo) {
        return false;
      }
      return true;
    });
  }, [allEntries, appliedFilter]);

  const filteredSummary = useMemo(() => {
    const activeRows = filteredEntries.filter((e) => e.status !== 'CANCELLED');
    const debit = activeRows.reduce((acc, e) => acc + e.debit, 0);
    const credit = activeRows.reduce((acc, e) => acc + e.credit, 0);
    const remainingDebit = activeRows.reduce((acc, e) => acc + e.remainingDebit, 0);
    const remainingCredit = activeRows.reduce((acc, e) => acc + e.remainingCredit, 0);
    const saldo = remainingCredit - remainingDebit;
    return { debit, credit, remainingDebit, remainingCredit, saldo };
  }, [filteredEntries]);

  const totalPages = Math.max(1, Math.ceil(filteredEntries.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const paginatedEntries = filteredEntries.slice(
    (safePage - 1) * pageSize,
    safePage * pageSize
  );

  const handleApplyFilter = () => {
    setAppliedFilter({
      showZero: draftShowZero,
      showCredit: draftShowCredit,
      showDebit: draftShowDebit,
      showCancelled: draftShowCancelled,
      dateFrom: draftDateFrom,
      dateTo: draftDateTo,
    });
    setPage(1);
  };

  const renderSummaryStrip = (summary: {
    debit: number;
    credit: number;
    remainingDebit: number;
    remainingCredit: number;
    saldo: number;
  }) => {
    const cards = [
      { label: 'Debit', value: summary.debit, icon: HandCoins },
      { label: 'Kredit', value: summary.credit, icon: Coins },
      { label: 'Debit Tersisa', value: summary.remainingDebit, icon: Banknote },
      { label: 'Kredit Tersisa', value: summary.remainingCredit, icon: Layers },
      { label: 'Saldo', value: summary.saldo, icon: Wallet },
    ];
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 border border-[#E5EAF2] rounded-[8px] overflow-hidden bg-white divide-y sm:divide-y-0 sm:divide-x divide-[#E5EAF2]">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="px-4 py-3.5 flex flex-col gap-2 min-w-0">
              <div className="flex items-center gap-2 text-[12.5px] text-[#475569] font-medium">
                <span className="w-6 h-6 rounded-full bg-[#EEF2FA] text-[#1E2C5E] inline-flex items-center justify-center shrink-0">
                  <Icon className="w-3.5 h-3.5" />
                </span>
                <span className="truncate">{card.label}</span>
              </div>
              <div className="font-mono-num font-bold text-[13.5px] text-[#1B2958] truncate">
                {formatDecimalId(card.value)}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Main Framed Card matching Official Coretax Buku Besar Saya Screenshot */}
      <div className="bg-white border border-[#DCE2EC] rounded-[8px] overflow-hidden shadow-[0_2px_10px_rgba(30,44,94,0.03)]">
        {/* Centered Header Strip: Buku Besar Saya */}
        <div className="bg-[#F4F6FA] border-b border-[#DCE2EC] px-5 py-3.5 text-center">
          <h1 className="font-display font-bold text-[17px] text-[#1B2958] tracking-tight">
            Buku Besar Saya
          </h1>
        </div>

        <div className="p-4 sm:p-5 space-y-5">
          {/* Top-Right Cetak Buku Besar Button */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-[12px] text-slate-500">
              Wajib Pajak:{' '}
              <strong className="text-[#1B2958] uppercase">{activeTaxpayer.name}</strong> (
              <span className="font-mono-num">{activeTaxpayer.nikNpwp}</span>)
            </div>
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-2 bg-[#1E2C5E] hover:bg-[#2A3B7A] text-white font-bold text-[12.5px] px-4 py-2 rounded-[6px] shadow-sm transition cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Cetak Buku Besar</span>
            </button>
          </div>

          {/* TOTAL SUMMARY STRIP */}
          <div className="space-y-2.5">
            <h2 className="text-center text-[15px] font-medium text-[#475569]">Total</h2>
            {renderSummaryStrip(totalSummary)}
          </div>

          {/* FILTERED SUMMARY STRIP */}
          <div className="space-y-2.5">
            <h2 className="text-center text-[15px] font-medium text-[#475569]">Filtered</h2>
            {renderSummaryStrip(filteredSummary)}
          </div>

          {/* FILTER CONTROLS ROW (Exact 4 Official Checkboxes + Optional Date Range + Terapkan Filter Button) */}
          <div className="pt-1 flex flex-col xl:flex-row items-start xl:items-center justify-between gap-4 border-t border-[#F1F5F9]">
            <div className="flex flex-col gap-3 flex-1 w-full">
              {/* 4 Checkboxes verbatim from official Coretax screenshot */}
              <div className="flex flex-wrap items-center justify-start xl:justify-center gap-x-5 gap-y-2 text-[12.5px] text-[#475569] pt-2">
                <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={draftShowZero}
                    onChange={(e) => setDraftShowZero(e.target.checked)}
                    className="rounded border-slate-300 accent-[#1E2C5E]"
                  />
                  <span>Menampilkan transaksi dengan nilai 0</span>
                </label>

                <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={draftShowCredit}
                    onChange={(e) => setDraftShowCredit(e.target.checked)}
                    className="rounded border-slate-300 accent-[#1E2C5E]"
                  />
                  <span>Menampilkan Kredit</span>
                </label>

                <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={draftShowDebit}
                    onChange={(e) => setDraftShowDebit(e.target.checked)}
                    className="rounded border-slate-300 accent-[#1E2C5E]"
                  />
                  <span>Menampilkan Debit</span>
                </label>

                <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={draftShowCancelled}
                    onChange={(e) => setDraftShowCancelled(e.target.checked)}
                    className="rounded border-slate-300 accent-[#1E2C5E]"
                  />
                  <span>Tampilkan Transaksi yang Dibatalkan</span>
                </label>
              </div>

              {/* Optional Posting Date Filter */}
              <div className="flex flex-wrap items-center xl:justify-center gap-3 text-[12px] text-slate-600">
                <div className="inline-flex items-center gap-2">
                  <span className="font-medium">Tanggal Posting:</span>
                  <input
                    type="date"
                    value={draftDateFrom}
                    onChange={(e) => setDraftDateFrom(e.target.value)}
                    className="border border-[#CBD5E1] rounded-[6px] px-2.5 py-1 text-[12px] bg-white focus:outline-none focus:border-[#1E2C5E]"
                  />
                  <span>s.d.</span>
                  <input
                    type="date"
                    value={draftDateTo}
                    onChange={(e) => setDraftDateTo(e.target.value)}
                    className="border border-[#CBD5E1] rounded-[6px] px-2.5 py-1 text-[12px] bg-white focus:outline-none focus:border-[#1E2C5E]"
                  />
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={handleApplyFilter}
              className="bg-[#1E2C5E] hover:bg-[#2A3B7A] text-white font-bold text-[12.5px] px-5 py-2.5 rounded-[6px] shadow-sm transition cursor-pointer shrink-0 self-end xl:self-center"
            >
              Terapkan Filter
            </button>
          </div>

          {/* Official Bold Navy Footnote (verbatim from screenshot) */}
          <p className="text-[13.5px] font-bold text-[#1B2958] leading-snug">
            *Menampilkan data dengan tanggal posting sampai dengan 1 bulan ke belakang dari hari ini
            jika pencarian dilakukan tanpa Tanggal Posting spesifik
          </p>

          {/* Ledger Entries Table */}
          <div className="overflow-x-auto border border-[#E5EAF2] rounded-[6px]">
            <table className="w-full text-[12.5px] border-collapse min-w-[760px]">
              <thead>
                <tr className="bg-[#F7C62F] text-[#1B2958] font-bold">
                  <th className="px-3 py-2.5 text-left border-r border-[#E5B21F]/60">
                    Tanggal Posting
                  </th>
                  <th className="px-3 py-2.5 text-left border-r border-[#E5B21F]/60">
                    Jenis Pajak
                  </th>
                  <th className="px-3 py-2.5 text-left border-r border-[#E5B21F]/60">
                    Masa / Tahun Pajak
                  </th>
                  <th className="px-3 py-2.5 text-left border-r border-[#E5B21F]/60">
                    Nomor Referensi
                  </th>
                  <th className="px-3 py-2.5 text-left border-r border-[#E5B21F]/60">
                    Keterangan
                  </th>
                  <th className="px-3 py-2.5 text-right border-r border-[#E5B21F]/60">
                    Debit
                  </th>
                  <th className="px-3 py-2.5 text-right border-r border-[#E5B21F]/60">
                    Kredit
                  </th>
                  <th className="px-3 py-2.5 text-right">Saldo Tersisa</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EEF2F6] bg-white">
                {paginatedEntries.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-6 text-left text-slate-600">
                      Tidak ada data yang ditemukan.
                    </td>
                  </tr>
                ) : (
                  paginatedEntries.map((row) => (
                    <tr key={row.id} className="hover:bg-[#F8FAFC]">
                      <td className="px-3 py-2.5 font-mono-num text-slate-700 whitespace-nowrap">
                        {row.postingDate}
                      </td>
                      <td className="px-3 py-2.5 font-bold text-[#1B2958] whitespace-nowrap">
                        {row.taxType}
                      </td>
                      <td className="px-3 py-2.5 text-slate-700 whitespace-nowrap">
                        {row.periodLabel}
                      </td>
                      <td className="px-3 py-2.5 font-mono-num text-[11.5px] text-slate-700 whitespace-nowrap">
                        {row.referenceNumber}
                      </td>
                      <td className="px-3 py-2.5 text-slate-700">{row.description}</td>
                      <td className="px-3 py-2.5 text-right font-mono-num text-rose-700 font-semibold whitespace-nowrap">
                        {formatDecimalId(row.debit)}
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono-num text-emerald-700 font-semibold whitespace-nowrap">
                        {formatDecimalId(row.credit)}
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono-num font-bold text-[#1B2958] whitespace-nowrap">
                        {formatDecimalId(row.remainingCredit - row.remainingDebit)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          <div className="pt-1 flex items-center justify-center gap-3 text-[12.5px] text-slate-600">
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
    </div>
  );
};
