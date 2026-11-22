import React, { useState } from 'react';
import { ArrowLeft, RefreshCw, Save, Send } from 'lucide-react';
import { SptPpnPayload, TaxReturn, Taxpayer, WorkspaceState } from '../../types/tax.ts';
import { formatRp, MONTHS_ID } from '../../utils/taxCalc.ts';
import { SignModal } from '../../components/SignModal.tsx';

interface SptMasaPpnEditorProps {
  taxReturn: TaxReturn;
  workspace: WorkspaceState;
  activeTaxpayer: Taxpayer;
  onBack: () => void;
  onSave: (updated: TaxReturn) => Promise<void>;
  onSubmit: (id: string, paymentMethod: 'DEPOSIT' | 'BILLING' | 'NONE') => Promise<void>;
}

export const SptMasaPpnEditor: React.FC<SptMasaPpnEditorProps> = ({
  taxReturn,
  workspace,
  activeTaxpayer,
  onBack,
  onSave,
  onSubmit,
}) => {
  const [tab, setTab] = useState<'induk' | 'a1' | 'a2' | 'b2' | 'b3' | 'c'>('induk');
  const [payload, setPayload] = useState<SptPpnPayload>(taxReturn.payload as SptPpnPayload);
  const [paymentMethod, setPaymentMethod] = useState<'DEPOSIT' | 'BILLING'>('DEPOSIT');
  const [signOpen, setSignOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [postedMsg, setPostedMsg] = useState<string | null>(null);

  const isReadOnly = taxReturn.status !== 'DRAFT';

  // Period invoices for display & posting
  const periodInvoices = workspace.invoices.filter(
    (i) =>
      i.taxPeriodMonth === taxReturn.taxPeriodMonth &&
      i.taxPeriodYear === taxReturn.taxYear &&
      i.status !== 'CANCELLED'
  );
  const exportInvoices = periodInvoices.filter((i) => i.direction === 'EXPORT' && i.status === 'APPROVED');
  const outputInvoices = periodInvoices.filter(
    (i) => i.direction === 'OUTPUT' && (i.status === 'APPROVED' || i.status === 'AMENDED')
  );
  const creditedInputs = periodInvoices.filter(
    (i) => i.direction === 'INPUT' && i.isCredited && i.status === 'APPROVED'
  );
  const uncreditedInputs = periodInvoices.filter(
    (i) => i.direction === 'INPUT' && !i.isCredited && i.status === 'APPROVED'
  );
  const returnInvoices = periodInvoices.filter((i) => i.returnAmount > 0);

  const handlePostingSpt = () => {
    const eksporDpp = exportInvoices.reduce((s, i) => s + i.dppTotal, 0);
    const outSelf = outputInvoices.filter((i) => !['02', '03', '07', '08'].includes(i.transactionCode));
    const outCollector = outputInvoices.filter((i) => ['02', '03'].includes(i.transactionCode));
    const outExempt = outputInvoices.filter((i) => ['07', '08'].includes(i.transactionCode));

    const returOut = outputInvoices.reduce((s, i) => s + i.returnAmount, 0);
    const returIn = creditedInputs.reduce((s, i) => s + i.returnAmount, 0);

    const next: SptPpnPayload = {
      ...payload,
      eksporDpp,
      penyerahanPpnDipungutSendiriDpp: outSelf.reduce((s, i) => s + i.dppTotal, 0),
      penyerahanPpnDipungutSendiriPpn: outSelf.reduce((s, i) => s + i.ppnTotal, 0),
      penyerahanDipungutPemungutDpp: outCollector.reduce((s, i) => s + i.dppTotal, 0),
      penyerahanDipungutPemungutPpn: outCollector.reduce((s, i) => s + i.ppnTotal, 0),
      penyerahanDibebaskanDpp: outExempt.reduce((s, i) => s + i.dppTotal, 0),
      returKeluaranPpn: returOut,
      pajakMasukanDikreditkan: creditedInputs.reduce((s, i) => s + i.ppnTotal, 0),
      pajakMasukanTidakDikreditkan: uncreditedInputs.reduce((s, i) => s + i.ppnTotal, 0),
      returMasukanPpn: returIn,
      postedInvoiceIds: [...exportInvoices, ...outputInvoices, ...creditedInputs].map((i) => i.id),
    };
    setPayload(next);
    setPostedMsg(
      `Posting SPT berhasil menarik ${outputInvoices.length} Faktur Keluaran, ${creditedInputs.length} Pajak Masukan Dikreditkan, dan ${exportInvoices.length} Dokumen Ekspor.`
    );
  };

  const ppnKeluaranNeto = Math.max(0, payload.penyerahanPpnDipungutSendiriPpn - payload.returKeluaranPpn);
  const ppnMasukanNeto = Math.max(
    0,
    payload.pajakMasukanDikreditkan - payload.returMasukanPpn + payload.kompensasiMasaSebelumnya
  );
  const kurangLebihBayar = ppnKeluaranNeto - ppnMasukanNeto;

  const buildUpdatedReturn = (): TaxReturn => ({
    ...taxReturn,
    taxPayable: ppnKeluaranNeto,
    taxCredit: ppnMasukanNeto,
    underOverPayment: kurangLebihBayar,
    payload,
  });

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(buildUpdatedReturn());
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white border border-[#D9E0E8] rounded-md overflow-hidden">
      {/* Banner */}
      <div className="bg-[#1D2B53] text-white px-5 py-3.5 flex flex-wrap items-center justify-between gap-3 border-b-2 border-[#F4C430]">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="p-1.5 rounded bg-white/10 hover:bg-white/20 text-white cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h2 className="font-display font-bold text-sm">
              SPT Masa PPN — {MONTHS_ID[taxReturn.taxPeriodMonth - 1]} {taxReturn.taxYear} (Pembetulan ke-
              {taxReturn.revisionNo})
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
              onClick={handlePostingSpt}
              className="inline-flex items-center gap-1.5 bg-[#F4C430] hover:bg-[#E0AF1A] text-[#1D2B53] font-bold text-xs px-3 py-1.5 rounded cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Posting SPT (Tarik e-Faktur)</span>
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-1.5 bg-white/15 hover:bg-white/25 text-white font-bold text-xs px-3 py-1.5 rounded cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{saving ? 'Menyimpan...' : 'Simpan Konsep'}</span>
            </button>
            <button
              type="button"
              onClick={async () => {
                await onSave(buildUpdatedReturn());
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

      {/* Coretax Form Tabs (Induk + Lampiran A1, A2, B2, B3, C) */}
      <div className="px-5 pt-3 bg-[#F8FAFC] border-b border-slate-200 flex items-center gap-1 overflow-x-auto">
        {[
          { id: 'induk', label: 'Induk SPT Masa PPN' },
          { id: 'a1', label: `Lampiran A-1 Ekspor (${exportInvoices.length})` },
          { id: 'a2', label: `Lampiran A-2 Keluaran (${outputInvoices.length})` },
          { id: 'b2', label: `Lampiran B-2 Masukan Dikreditkan (${creditedInputs.length})` },
          { id: 'b3', label: `Lampiran B-3 Tidak Dikreditkan (${uncreditedInputs.length})` },
          { id: 'c', label: `Lampiran C Retur (${returnInvoices.length})` },
        ].map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id as any)}
            className={`px-3.5 py-2 text-xs font-bold rounded-t border-t border-x whitespace-nowrap cursor-pointer ${
              tab === t.id
                ? 'bg-white text-[#1D2B53] border-slate-300 -mb-px border-t-2 border-t-[#F4C430]'
                : 'bg-slate-100 text-slate-600 border-transparent hover:bg-slate-200'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="p-5 space-y-4 text-xs">
        {postedMsg && (
          <div className="bg-emerald-50 border border-emerald-300 text-emerald-800 px-3.5 py-2.5 rounded font-medium">
            {postedMsg}
          </div>
        )}

        {tab === 'induk' && (
          <div className="space-y-4">
            {/* Bagian I: Penyerahan Barang & Jasa */}
            <div className="border border-slate-300 rounded overflow-hidden">
              <div className="bg-[#1D2B53] text-white px-4 py-2 font-bold">
                BAGIAN I — PENYERAHAN BARANG DAN JASA (A-1 &amp; A-2)
              </div>
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-[#F4C430] text-[#1D2B53] font-bold">
                    <th className="px-3 py-2 text-left">Uraian Penyerahan</th>
                    <th className="px-3 py-2 text-right w-48">DPP (Rp)</th>
                    <th className="px-3 py-2 text-right w-48">PPN (Rp)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  <tr>
                    <td className="px-3 py-2">1. Ekspor BKP Berwujud / Tidak Berwujud / JKP (Lampiran A-1)</td>
                    <td className="px-3 py-2 text-right font-mono-num">{formatRp(payload.eksporDpp)}</td>
                    <td className="px-3 py-2 text-right font-mono-num">{formatRp(0)}</td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2">2. Penyerahan yang PPN-nya Harus Dipungut Sendiri (Kode 01/04/09)</td>
                    <td className="px-3 py-2 text-right font-mono-num">
                      {formatRp(payload.penyerahanPpnDipungutSendiriDpp)}
                    </td>
                    <td className="px-3 py-2 text-right font-mono-num font-bold text-[#1D2B53]">
                      {formatRp(payload.penyerahanPpnDipungutSendiriPpn)}
                    </td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2">3. Penyerahan yang PPN-nya Dipungut oleh Pemungut PPN (Kode 02/03)</td>
                    <td className="px-3 py-2 text-right font-mono-num">
                      {formatRp(payload.penyerahanDipungutPemungutDpp)}
                    </td>
                    <td className="px-3 py-2 text-right font-mono-num">
                      {formatRp(payload.penyerahanDipungutPemungutPpn)}
                    </td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2">4. Penyerahan yang PPN-nya Tidak Dipungut / Dibebaskan (Kode 07/08)</td>
                    <td className="px-3 py-2 text-right font-mono-num">
                      {formatRp(payload.penyerahanDibebaskanDpp)}
                    </td>
                    <td className="px-3 py-2 text-right font-mono-num">{formatRp(0)}</td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2 text-red-700">5. Dikurangi: Retur Pajak Keluaran (Lampiran C)</td>
                    <td className="px-3 py-2 text-right font-mono-num">-</td>
                    <td className="px-3 py-2 text-right font-mono-num text-red-700">
                      ({formatRp(payload.returKeluaranPpn)})
                    </td>
                  </tr>
                  <tr className="bg-slate-50 font-bold">
                    <td className="px-3 py-2">A. Jumlah Pajak Keluaran yang Harus Dipungut Sendiri (Neto)</td>
                    <td className="px-3 py-2" />
                    <td className="px-3 py-2 text-right font-mono-num text-[#1D2B53]">
                      {formatRp(ppnKeluaranNeto)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Bagian II: Penghitungan PPN Kurang / Lebih Bayar */}
            <div className="border border-slate-300 rounded overflow-hidden">
              <div className="bg-[#1D2B53] text-white px-4 py-2 font-bold">
                BAGIAN II — PENGHITUNGAN PPN KURANG BAYAR / LEBIH BAYAR
              </div>
              <div className="p-4 space-y-2.5">
                <div className="flex justify-between items-center py-1 border-b border-slate-100">
                  <span>B. Pajak Masukan yang Dapat Dikreditkan (Lampiran B-2)</span>
                  <span className="font-mono-num font-semibold">{formatRp(payload.pajakMasukanDikreditkan)}</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-slate-100">
                  <span>C. Dikurangi: Retur Pajak Masukan (Lampiran C)</span>
                  <span className="font-mono-num text-red-700">({formatRp(payload.returMasukanPpn)})</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-slate-100">
                  <span>D. Kompensasi Kelebihan PPN Masa Pajak Sebelumnya</span>
                  <input
                    type="number"
                    disabled={isReadOnly}
                    value={payload.kompensasiMasaSebelumnya}
                    onChange={(e) =>
                      setPayload({ ...payload, kompensasiMasaSebelumnya: Number(e.target.value) || 0 })
                    }
                    className="w-44 text-right border border-slate-300 rounded px-2.5 py-1 font-mono-num"
                  />
                </div>
                <div className="flex justify-between items-center py-1.5 border-b border-slate-200 font-bold">
                  <span>E. Jumlah Pajak Masukan yang Dapat Diperhitungkan (B - C + D)</span>
                  <span className="font-mono-num text-[#1D2B53]">{formatRp(ppnMasukanNeto)}</span>
                </div>
                <div className="flex justify-between items-center p-3 rounded bg-[#FEF9E7] border border-[#F4C430] font-extrabold text-sm">
                  <span className="text-[#1D2B53]">
                    F. PPN {kurangLebihBayar > 0 ? 'KURANG BAYAR' : kurangLebihBayar < 0 ? 'LEBIH BAYAR' : 'NIHIL'} (A - E)
                  </span>
                  <span className="font-mono-num text-[#1D2B53]">{formatRp(kurangLebihBayar)}</span>
                </div>

                {kurangLebihBayar > 0 && !isReadOnly && (
                  <div className="mt-3 p-3.5 bg-[#F8FAFC] border border-slate-200 rounded space-y-2">
                    <div className="font-bold text-[#1D2B53]">Pilih Metode Pembayaran PPN Kurang Bayar:</div>
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
                        <span>Buat Kode Billing (KAP 411211-100)</span>
                      </label>
                    </div>
                  </div>
                )}

                {kurangLebihBayar < 0 && (
                  <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded flex items-center gap-4">
                    <span className="font-bold text-[#1D2B53]">Perlakuan PPN Lebih Bayar:</span>
                    <label className="inline-flex items-center gap-1.5">
                      <input
                        type="radio"
                        disabled={isReadOnly}
                        checked={payload.pilihanLebihBayar === 'KOMPENSASI'}
                        onChange={() => setPayload({ ...payload, pilihanLebihBayar: 'KOMPENSASI' })}
                      />
                      <span>Dikompensasikan ke Masa Pajak Berikutnya</span>
                    </label>
                    <label className="inline-flex items-center gap-1.5">
                      <input
                        type="radio"
                        disabled={isReadOnly}
                        checked={payload.pilihanLebihBayar === 'RESTITUSI'}
                        onChange={() => setPayload({ ...payload, pilihanLebihBayar: 'RESTITUSI' })}
                      />
                      <span>Diminta Kembali (Restitusi)</span>
                    </label>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {tab !== 'induk' && (
          <div className="overflow-x-auto border border-slate-300 rounded">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-[#F4C430] text-[#1D2B53] font-bold">
                  <th className="px-3 py-2 text-left">Nomor Faktur / Dokumen</th>
                  <th className="px-3 py-2 text-left">Lawan Transaksi</th>
                  <th className="px-3 py-2 text-left">Tanggal</th>
                  <th className="px-3 py-2 text-right">DPP</th>
                  <th className="px-3 py-2 text-right">PPN</th>
                  {tab === 'c' && <th className="px-3 py-2 text-right">PPN Diretur</th>}
                  <th className="px-3 py-2 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {(tab === 'a1'
                  ? exportInvoices
                  : tab === 'a2'
                  ? outputInvoices
                  : tab === 'b2'
                  ? creditedInputs
                  : tab === 'b3'
                  ? uncreditedInputs
                  : returnInvoices
                ).map((inv) => (
                  <tr key={inv.id}>
                    <td className="px-3 py-2 font-mono-num font-semibold text-[#1D2B53]">{inv.invoiceNumber}</td>
                    <td className="px-3 py-2">{inv.counterpartyName}</td>
                    <td className="px-3 py-2 font-mono-num">{inv.invoiceDate}</td>
                    <td className="px-3 py-2 text-right font-mono-num">{formatRp(inv.dppTotal)}</td>
                    <td className="px-3 py-2 text-right font-mono-num font-bold">{formatRp(inv.ppnTotal)}</td>
                    {tab === 'c' && (
                      <td className="px-3 py-2 text-right font-mono-num text-red-700 font-bold">
                        {formatRp(inv.returnAmount)}
                      </td>
                    )}
                    <td className="px-3 py-2 text-center font-semibold">{inv.status}</td>
                  </tr>
                ))}
                {(tab === 'a1'
                  ? exportInvoices
                  : tab === 'a2'
                  ? outputInvoices
                  : tab === 'b2'
                  ? creditedInputs
                  : tab === 'b3'
                  ? uncreditedInputs
                  : returnInvoices
                ).length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-6 text-center text-slate-500">
                      Tidak ada faktur pada lampiran ini untuk Masa {MONTHS_ID[taxReturn.taxPeriodMonth - 1]}{' '}
                      {taxReturn.taxYear}.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <SignModal
        open={signOpen}
        title="Bayar dan Lapor SPT Masa PPN"
        description={
          kurangLebihBayar > 0
            ? `SPT Masa PPN Kurang Bayar sebesar ${formatRp(kurangLebihBayar)} akan diselesaikan melalui ${
                paymentMethod === 'DEPOSIT' ? 'Pemindahbukuan Deposit Pajak' : 'Pembuatan Kode Billing'
              }.`
            : 'SPT Masa PPN berstatus Nihil / Lebih Bayar dan akan langsung diterbitkan BPE.'
        }
        signerName={activeTaxpayer.name}
        signerNik={activeTaxpayer.nikNpwp}
        confirmLabel="Konfirmasi & Laporkan SPT"
        onClose={() => setSignOpen(false)}
        onConfirm={async () => {
          await onSubmit(taxReturn.id, kurangLebihBayar > 0 ? paymentMethod : 'NONE');
          onBack();
        }}
      />
    </div>
  );
};
