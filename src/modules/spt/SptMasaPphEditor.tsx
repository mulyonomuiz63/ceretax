import React, { useState } from 'react';
import { ArrowLeft, RefreshCw, Save, Send } from 'lucide-react';
import { SptPphMasaPayload, TaxReturn, Taxpayer, WorkspaceState } from '../../types/tax.ts';
import { formatRp, MONTHS_ID } from '../../utils/taxCalc.ts';
import { SignModal } from '../../components/SignModal.tsx';

interface SptMasaPphEditorProps {
  taxReturn: TaxReturn;
  workspace: WorkspaceState;
  activeTaxpayer: Taxpayer;
  onBack: () => void;
  onSave: (updated: TaxReturn) => Promise<void>;
  onSubmit: (id: string, paymentMethod: 'DEPOSIT' | 'BILLING' | 'NONE') => Promise<void>;
}

export const SptMasaPphEditor: React.FC<SptMasaPphEditorProps> = ({
  taxReturn,
  workspace,
  activeTaxpayer,
  onBack,
  onSave,
  onSubmit,
}) => {
  const isPph21 = taxReturn.returnType === 'SPT_MASA_PPH21';
  const [payload, setPayload] = useState<SptPphMasaPayload>(taxReturn.payload as SptPphMasaPayload);
  const [paymentMethod, setPaymentMethod] = useState<'DEPOSIT' | 'BILLING'>('DEPOSIT');
  const [signOpen, setSignOpen] = useState(false);
  const [postedNote, setPostedNote] = useState<string | null>(null);
  const isReadOnly = taxReturn.status !== 'DRAFT';

  const matchingSlips = workspace.slips.filter(
    (s) =>
      s.status === 'ISSUED' &&
      s.taxPeriodMonth === taxReturn.taxPeriodMonth &&
      s.taxPeriodYear === taxReturn.taxYear &&
      (isPph21 ? s.slipType === 'BPMP' || s.slipType === 'BP21' || s.slipType === 'BPA1' : s.slipType === 'BPPU_23')
  );

  const handlePosting = () => {
    const totalGross = matchingSlips.reduce((s, x) => s + x.grossAmount, 0);
    const totalTaxWithheld = matchingSlips.reduce((s, x) => s + x.taxWithheld, 0);
    setPayload({
      ...payload,
      kapCode: isPph21 ? '411121' : '411124',
      kjsCode: isPph21 ? '100' : '104',
      totalGross,
      totalTaxWithheld,
      slipCount: matchingSlips.length,
      postedSlipIds: matchingSlips.map((s) => s.id),
    });
    setPostedNote(
      `Posting SPT berhasil menarik ${matchingSlips.length} Bukti Potong Telah Terbit (Total PPh: ${formatRp(totalTaxWithheld)}).`
    );
  };

  const kurangLebih = payload.totalTaxWithheld - (payload.lebihBayarKompensasi || 0);

  const buildUpdated = (): TaxReturn => ({
    ...taxReturn,
    taxPayable: payload.totalTaxWithheld,
    taxCredit: payload.lebihBayarKompensasi || 0,
    underOverPayment: kurangLebih,
    payload,
  });

  return (
    <div className="bg-white border border-[#D9E0E8] rounded-md overflow-hidden">
      <div className="bg-[#1D2B53] text-white px-5 py-3.5 flex flex-wrap items-center justify-between gap-3 border-b-2 border-[#F4C430]">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="p-1.5 rounded bg-white/10 hover:bg-white/20 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h2 className="font-display font-bold text-sm">
              {isPph21 ? 'SPT Masa PPh Pasal 21 / 26 (411121-100)' : 'SPT Masa PPh Unifikasi — PPh 23 (411124-104)'} —{' '}
              {MONTHS_ID[taxReturn.taxPeriodMonth - 1]} {taxReturn.taxYear}
            </h2>
            <p className="text-[11px] text-slate-300">
              {activeTaxpayer.name} ({activeTaxpayer.nikNpwp}) · Status: <strong>{taxReturn.status}</strong>
            </p>
          </div>
        </div>
        {!isReadOnly && (
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handlePosting}
              className="inline-flex items-center gap-1.5 bg-[#F4C430] hover:bg-[#E0AF1A] text-[#1D2B53] font-bold text-xs px-3 py-1.5 rounded cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Posting dari e-Bupot</span>
            </button>
            <button
              type="button"
              onClick={() => onSave(buildUpdated())}
              className="inline-flex items-center gap-1.5 bg-white/15 hover:bg-white/25 text-white font-bold text-xs px-3 py-1.5 rounded cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Simpan Konsep</span>
            </button>
            <button
              type="button"
              onClick={async () => {
                await onSave(buildUpdated());
                setSignOpen(true);
              }}
              className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-3.5 py-1.5 rounded cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Bayar dan Lapor</span>
            </button>
          </div>
        )}
      </div>

      <div className="p-5 space-y-5 text-xs">
        {postedNote && (
          <div className="bg-emerald-50 border border-emerald-300 text-emerald-800 px-3.5 py-2.5 rounded font-medium">
            {postedNote}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="border border-slate-200 rounded p-4 bg-[#F8FAFC]">
            <div className="text-[11px] text-slate-500">Jumlah Bukti Potong Terbit</div>
            <div className="text-xl font-mono-num font-bold text-[#1D2B53] mt-1">
              {payload.slipCount} Dokumen
            </div>
          </div>
          <div className="border border-slate-200 rounded p-4 bg-[#F8FAFC]">
            <div className="text-[11px] text-slate-500">Total Penghasilan Bruto / DPP</div>
            <div className="text-xl font-mono-num font-bold text-[#1D2B53] mt-1">
              {formatRp(payload.totalGross)}
            </div>
          </div>
          <div className="border border-[#F4C430] rounded p-4 bg-[#FEF9E7]">
            <div className="text-[11px] text-slate-700 font-semibold">Total PPh Harus Disetor</div>
            <div className="text-xl font-mono-num font-extrabold text-[#1D2B53] mt-1">
              {formatRp(kurangLebih)}
            </div>
          </div>
        </div>

        {/* Linked Issued Slips Table */}
        <div>
          <h3 className="font-display font-bold text-xs uppercase tracking-wider text-[#1D2B53] mb-2">
            Daftar Bukti Potong Telah Terbit pada Masa {MONTHS_ID[taxReturn.taxPeriodMonth - 1]}{' '}
            {taxReturn.taxYear}
          </h3>
          <div className="overflow-x-auto border border-slate-300 rounded">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-[#F4C430] text-[#1D2B53] font-bold">
                  <th className="px-3 py-2 text-left">Nomor Bupot</th>
                  <th className="px-3 py-2 text-left">Jenis</th>
                  <th className="px-3 py-2 text-left">Penerima</th>
                  <th className="px-3 py-2 text-left">Kode Objek</th>
                  <th className="px-3 py-2 text-right">Bruto</th>
                  <th className="px-3 py-2 text-right">PPh Dipotong</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {matchingSlips.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-6 text-center text-slate-500">
                      Belum ada bukti potong berstatus <strong>Telah Terbit</strong> untuk masa ini. Terbitkan dulu di menu <strong>eBupot</strong> lalu klik <strong>Posting dari e-Bupot</strong>.
                    </td>
                  </tr>
                ) : (
                  matchingSlips.map((s) => (
                    <tr key={s.id}>
                      <td className="px-3 py-2 font-mono-num font-bold text-[#1D2B53]">{s.slipNumber}</td>
                      <td className="px-3 py-2 font-semibold">{s.slipType}</td>
                      <td className="px-3 py-2">
                        {s.recipientName} <span className="font-mono-num text-slate-500">({s.recipientNikNpwp})</span>
                      </td>
                      <td className="px-3 py-2 font-mono-num">{s.objectCode}</td>
                      <td className="px-3 py-2 text-right font-mono-num">{formatRp(s.grossAmount)}</td>
                      <td className="px-3 py-2 text-right font-mono-num font-bold">{formatRp(s.taxWithheld)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {kurangLebih > 0 && !isReadOnly && (
          <div className="p-4 bg-[#F8FAFC] border border-slate-200 rounded space-y-2">
            <div className="font-bold text-[#1D2B53]">Metode Pelunasan Setoran SPT Masa:</div>
            <div className="flex flex-wrap gap-4">
              <label className="inline-flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  checked={paymentMethod === 'DEPOSIT'}
                  onChange={() => setPaymentMethod('DEPOSIT')}
                />
                <span>
                  Pemindahbukuan Saldo Deposit (Saldo: <strong>{formatRp(activeTaxpayer.depositBalance)}</strong>)
                </span>
              </label>
              <label className="inline-flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  checked={paymentMethod === 'BILLING'}
                  onChange={() => setPaymentMethod('BILLING')}
                />
                <span>Buat Kode Billing ({isPph21 ? '411121-100' : '411124-104'})</span>
              </label>
            </div>
          </div>
        )}
      </div>

      <SignModal
        open={signOpen}
        title={isPph21 ? 'Bayar & Lapor SPT Masa PPh 21/26' : 'Bayar & Lapor SPT Masa PPh Unifikasi'}
        description={`Total PPh terutang sebesar ${formatRp(kurangLebih)} akan diproses melalui ${
          kurangLebih > 0
            ? paymentMethod === 'DEPOSIT'
              ? 'Pemindahbukuan Deposit Pajak'
              : 'Kode Billing'
            : 'Pelaporan Nihil'
        }.`}
        signerName={activeTaxpayer.name}
        signerNik={activeTaxpayer.nikNpwp}
        confirmLabel="Konfirmasi Tanda Tangan & Lapor"
        onClose={() => setSignOpen(false)}
        onConfirm={async () => {
          await onSubmit(taxReturn.id, kurangLebih > 0 ? paymentMethod : 'NONE');
          onBack();
        }}
      />
    </div>
  );
};
