import React, { useState } from 'react';
import { CheckCircle2, CreditCard, Eye, Plus, Wallet } from 'lucide-react';
import { Taxpayer, WorkspaceState } from '../types/tax.ts';
import { formatRp } from '../utils/taxCalc.ts';
import { PrintablePayload } from '../components/DocumentPrintModal.tsx';

interface PembayaranModuleProps {
  subTab: string;
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

  const visibleBillings = workspace.billings.filter((b) => b.taxpayerId === activeTaxpayer.id);

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

  return (
    <div className="space-y-4">
      <div className="bg-white border border-[#D9E0E8] rounded-md overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h1 className="font-display font-bold text-base text-[#1D2B53]">
              Pembayaran — Kode Billing, NTPN &amp; Deposit Pajak
            </h1>
            <p className="text-xs text-slate-500">
              Pelunasan Kode Billing akan otomatis menerbitkan NTPN dan memperbarui SPT Menunggu Pembayaran menjadi Dilaporkan (BPE)
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            {[
              { id: 'buat', label: 'Layanan Mandiri Kode Billing' },
              { id: 'daftar', label: 'Daftar Kode Billing Belum Dibayar' },
              { id: 'deposit', label: 'Deposit Pajak' },
            ].map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => onChangeSubTab(t.id)}
                className={`px-3.5 py-1.5 text-xs font-bold rounded cursor-pointer ${
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

        {/* LIST BILLING */}
        {subTab === 'daftar' && (
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-[#F4C430] text-[#1D2B53] font-bold">
                  <th className="px-3 py-2.5 text-left">Aksi</th>
                  <th className="px-3 py-2.5 text-left">ID Billing (15 Digit)</th>
                  <th className="px-3 py-2.5 text-left">KAP / KJS</th>
                  <th className="px-3 py-2.5 text-left">Uraian Setoran</th>
                  <th className="px-3 py-2.5 text-left">Masa / Tahun</th>
                  <th className="px-3 py-2.5 text-right">Nominal Setor</th>
                  <th className="px-3 py-2.5 text-center">Status / NTPN</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {visibleBillings.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                      Belum ada Kode Billing pada akun <strong>{activeTaxpayer.name}</strong>.
                    </td>
                  </tr>
                ) : (
                  visibleBillings.map((b) => (
                    <tr key={b.id} className="hover:bg-[#F8FAFC]">
                      <td className="px-3 py-2.5 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() =>
                              onPrintDocument({ type: 'BILLING', billing: b, taxpayer: activeTaxpayer })
                            }
                            className="p-1.5 rounded border border-slate-200 hover:bg-slate-100 text-[#1D2B53] cursor-pointer"
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
                      <td className="px-3 py-2.5 font-mono-num font-bold text-[#1D2B53]">{b.billingCode}</td>
                      <td className="px-3 py-2.5 font-mono-num">
                        {b.kapCode}-{b.kjsCode}
                      </td>
                      <td className="px-3 py-2.5 font-medium">{b.description}</td>
                      <td className="px-3 py-2.5">{b.taxPeriodLabel}</td>
                      <td className="px-3 py-2.5 text-right font-mono-num font-bold text-[#1D2B53]">
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
        )}

        {/* CREATE BILLING */}
        {subTab === 'buat' && (
          <form onSubmit={handleCreate} className="p-5 max-w-xl space-y-4 text-xs">
            <div>
              <label className="block font-semibold text-[#1D2B53] mb-1">
                Kode Akun Pajak (KAP) &amp; Jenis Setoran (KJS)
              </label>
              <select
                value={kapIdx}
                onChange={(e) => setKapIdx(Number(e.target.value))}
                className="w-full border border-[#CBD5E1] rounded px-3 py-2 bg-white"
              >
                {KAP_OPTIONS.map((o, idx) => (
                  <option key={o.kap + o.kjs} value={idx}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-semibold text-[#1D2B53] mb-1">Masa / Tahun Pajak</label>
              <input
                type="text"
                value={periodLabel}
                onChange={(e) => setPeriodLabel(e.target.value)}
                className="w-full border border-[#CBD5E1] rounded px-3 py-2"
                required
              />
            </div>
            <div>
              <label className="block font-semibold text-[#1D2B53] mb-1">Jumlah Setor (Rp)</label>
              <input
                type="number"
                min={1000}
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
                className="w-full border border-[#CBD5E1] rounded px-3 py-2 font-mono-num"
                required
              />
            </div>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 bg-[#1D2B53] hover:bg-[#273A6E] text-white font-bold px-4 py-2 rounded cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 text-[#F4C430]" />
              <span>Terbitkan Kode Billing</span>
            </button>
          </form>
        )}

        {/* DEPOSIT BALANCE */}
        {subTab === 'deposit' && (
          <div className="p-5 space-y-4 text-xs">
            <div className="bg-[#1D2B53] text-white rounded-md p-5 flex flex-wrap items-center justify-between gap-4 border-l-4 border-[#F4C430]">
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
                    className="bg-white text-[#1D2B53] font-mono-num font-bold rounded px-3 py-1.5 w-44"
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
                  className="bg-[#F4C430] hover:bg-[#E0AF1A] text-[#1D2B53] font-bold px-3.5 py-1.5 rounded cursor-pointer"
                >
                  Buat Billing Deposit
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
