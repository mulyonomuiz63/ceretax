import React, { useState } from 'react';
import { ArrowLeft, Plus, RefreshCw, Save, Send, Trash2 } from 'lucide-react';
import {
  OpAssetLiabilityFamily,
  PtkpStatus,
  SptTahunanOpPayload,
  TaxReturn,
  Taxpayer,
  WorkspaceState,
} from '../../types/tax.ts';
import { calculatePphPasal17, formatRp, PTKP_VALUES } from '../../utils/taxCalc.ts';
import { SignModal } from '../../components/SignModal.tsx';

interface SptTahunanOpEditorProps {
  taxReturn: TaxReturn;
  workspace: WorkspaceState;
  activeTaxpayer: Taxpayer;
  onBack: () => void;
  onSave: (updated: TaxReturn) => Promise<void>;
  onSubmit: (id: string, paymentMethod: 'DEPOSIT' | 'BILLING' | 'NONE') => Promise<void>;
  onAddAsset: (item: Omit<OpAssetLiabilityFamily, 'id' | 'taxpayerId'>) => Promise<void>;
  onDeleteAsset: (id: string) => Promise<void>;
}

export const SptTahunanOpEditor: React.FC<SptTahunanOpEditorProps> = ({
  taxReturn,
  workspace,
  activeTaxpayer,
  onBack,
  onSave,
  onSubmit,
  onAddAsset,
  onDeleteAsset,
}) => {
  const [tab, setTab] = useState<'induk' | 'l1' | 'l2'>('induk');
  const [payload, setPayload] = useState<SptTahunanOpPayload>(taxReturn.payload as SptTahunanOpPayload);
  const [paymentMethod, setPaymentMethod] = useState<'DEPOSIT' | 'BILLING'>('DEPOSIT');
  const [signOpen, setSignOpen] = useState(false);
  const [postBanner, setPostBanner] = useState<string | null>(null);

  // Quick Add Asset / Liability state
  const [newRecType, setNewRecType] = useState<'ASSET' | 'LIABILITY' | 'FAMILY'>('ASSET');
  const [newCode, setNewCode] = useState('011');
  const [newDesc, setNewDesc] = useState('');
  const [newYear, setNewYear] = useState(2024);
  const [newAmount, setNewAmount] = useState(0);
  const [newRel, setNewRel] = useState('');

  const isReadOnly = taxReturn.status !== 'DRAFT';

  const bpa1Slips = workspace.slips.filter(
    (s) => s.slipType === 'BPA1' && s.status === 'ISSUED' && s.taxPeriodYear === taxReturn.taxYear
  );

  // Recalculate live OP numbers
  const netoPekerjaan = Math.max(0, payload.penghasilanBrutoPekerjaan - payload.biayaJabatanPensiun);
  const totalNeto =
    netoPekerjaan +
    payload.penghasilanNetoUsaha +
    payload.penghasilanNetoDalamNegeriLain +
    payload.penghasilanNetoLuarNegeri;
  const netoSetelahZakat = Math.max(0, totalNeto - payload.zakatSumbangan);
  const ptkpAmount = PTKP_VALUES[payload.statusPtkp];
  const pkpAmount = Math.max(0, netoSetelahZakat - ptkpAmount);
  const pphTerutang = calculatePphPasal17(pkpAmount);
  const totalKredit = payload.kreditPajakBpa1 + payload.angsuranPph25;
  const kurangLebih = pphTerutang - totalKredit;

  const handlePostingSpt = () => {
    const bruto = bpa1Slips.reduce((s, x) => s + x.grossAmount, 0);
    const biayaJab = bpa1Slips.reduce((s, x) => s + (x.positionAllowance || 0) + (x.pensionContribution || 0), 0);
    const kredit = bpa1Slips.reduce((s, x) => s + x.taxWithheld, 0);
    const firstPtkp = bpa1Slips[0]?.ptkpStatus || activeTaxpayer.ptkpStatus;

    setPayload({
      ...payload,
      sumberPenghasilanPekerjaan: true,
      punyaHartaUtang: true,
      statusPtkp: firstPtkp,
      penghasilanBrutoPekerjaan: bruto,
      biayaJabatanPensiun: biayaJab,
      penghasilanNetoPekerjaan: Math.max(0, bruto - biayaJab),
      kreditPajakBpa1: kredit,
      postedSlipIds: bpa1Slips.map((s) => s.id),
    });
    setPostBanner(
      `Posting SPT berhasil menyinkronkan ${bpa1Slips.length} Bukti Potong BPA1 (Bruto ${formatRp(bruto)}, Kredit PPh ${formatRp(kredit)}) serta data Harta, Utang & Keluarga pada Lampiran L-1.`
    );
  };

  const buildUpdated = (): TaxReturn => {
    const syncedPayload: SptTahunanOpPayload = {
      ...payload,
      penghasilanNetoPekerjaan: netoPekerjaan,
      ptkpAmount,
      pkpAmount,
      pphTerutang,
    };
    return {
      ...taxReturn,
      taxPayable: pphTerutang,
      taxCredit: totalKredit,
      underOverPayment: kurangLebih,
      payload: syncedPayload,
    };
  };

  const assetList = workspace.assets.filter((a) => a.recordType === 'ASSET');
  const liabList = workspace.assets.filter((a) => a.recordType === 'LIABILITY');
  const familyList = workspace.assets.filter((a) => a.recordType === 'FAMILY');

  return (
    <div className="bg-white border border-[#D9E0E8] rounded-md overflow-hidden">
      {/* Header */}
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
              SPT Tahunan PPh Orang Pribadi — Tahun Pajak {taxReturn.taxYear} (Pembetulan ke-{taxReturn.revisionNo})
            </h2>
            <p className="text-[11px] text-slate-300">
              {activeTaxpayer.name} (NIK: {activeTaxpayer.nikNpwp}) · Status: <strong>{taxReturn.status}</strong>
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
              <span>Posting SPT (Sync BPA1 &amp; Harta)</span>
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

      {/* Tabs: Induk, Lampiran L-1, Lampiran L-2 */}
      <div className="px-5 pt-3 bg-[#F8FAFC] border-b border-slate-200 flex items-center gap-1 overflow-x-auto">
        {[
          { id: 'induk', label: 'Induk SPT (Bagian A–K)' },
          { id: 'l1', label: `Lampiran L-1 (Harta, Utang, Keluarga, BPA1)` },
          { id: 'l2', label: 'Lampiran L-2 (PPh Final & Bukan Objek)' },
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
        {postBanner && (
          <div className="bg-emerald-50 border border-emerald-300 text-emerald-800 px-3.5 py-2.5 rounded font-medium">
            {postBanner}
          </div>
        )}

        {/* INDUK BAGIAN A - K */}
        {tab === 'induk' && (
          <div className="space-y-4">
            {/* Bagian B: Pertanyaan Panduan Ya/Tidak khas Coretax */}
            <div className="border border-slate-300 rounded overflow-hidden">
              <div className="bg-[#1D2B53] text-white px-4 py-2 font-bold">
                BAGIAN A &amp; B — IDENTITAS &amp; IKHTISAR PENGHASILAN (PERTANYAAN PANDUAN)
              </div>
              <div className="p-4 space-y-3">
                {[
                  {
                    key: 'sumberPenghasilanPekerjaan' as const,
                    label: '1. Apakah Anda menerima penghasilan dari pekerjaan (Pegawai Tetap / BPA1)?',
                  },
                  {
                    key: 'sumberPenghasilanUsaha' as const,
                    label: '2. Apakah Anda menerima penghasilan dari kegiatan usaha atau pekerjaan bebas?',
                  },
                  {
                    key: 'punyaHartaUtang' as const,
                    label: '3. Apakah Anda memiliki Harta / Utang pada akhir tahun pajak (Lampiran L-1)?',
                  },
                  {
                    key: 'punyaPphFinal' as const,
                    label: '4. Apakah Anda menerima penghasilan dikenakan PPh Final / Bukan Objek (Lampiran L-2)?',
                  },
                ].map((q) => (
                  <div key={q.key} className="flex flex-wrap items-center justify-between gap-2 py-1 border-b border-slate-100">
                    <span className="font-medium text-slate-700">{q.label}</span>
                    <div className="flex items-center gap-4">
                      <label className="inline-flex items-center gap-1.5 cursor-pointer font-semibold">
                        <input
                          type="radio"
                          disabled={isReadOnly}
                          checked={payload[q.key] === true}
                          onChange={() => setPayload({ ...payload, [q.key]: true })}
                        />
                        <span>Ya</span>
                      </label>
                      <label className="inline-flex items-center gap-1.5 cursor-pointer font-semibold">
                        <input
                          type="radio"
                          disabled={isReadOnly}
                          checked={payload[q.key] === false}
                          onChange={() => setPayload({ ...payload, [q.key]: false })}
                        />
                        <span>Tidak</span>
                      </label>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Bagian C - G: Perhitungan PPh Terutang Pasal 17 & PTKP */}
            <div className="border border-slate-300 rounded overflow-hidden">
              <div className="bg-[#1D2B53] text-white px-4 py-2 font-bold">
                BAGIAN C–K — PENGHITUNGAN PENGHASILAN NETO, PTKP, PKP &amp; PPh TERUTANG (UU HPP)
              </div>
              <div className="p-4 space-y-2.5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pb-3 border-b border-slate-200">
                  <div>
                    <label className="block font-semibold text-[#1D2B53] mb-1">
                      Penghasilan Bruto dari Pekerjaan (BPA1)
                    </label>
                    <input
                      type="number"
                      disabled={isReadOnly}
                      value={payload.penghasilanBrutoPekerjaan}
                      onChange={(e) =>
                        setPayload({ ...payload, penghasilanBrutoPekerjaan: Number(e.target.value) || 0 })
                      }
                      className="w-full border border-slate-300 rounded px-3 py-1.5 font-mono-num"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-[#1D2B53] mb-1">
                      Biaya Jabatan / Iuran Pensiun
                    </label>
                    <input
                      type="number"
                      disabled={isReadOnly}
                      value={payload.biayaJabatanPensiun}
                      onChange={(e) =>
                        setPayload({ ...payload, biayaJabatanPensiun: Number(e.target.value) || 0 })
                      }
                      className="w-full border border-slate-300 rounded px-3 py-1.5 font-mono-num"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-[#1D2B53] mb-1">
                      Penghasilan Neto Usaha / Lainnya
                    </label>
                    <input
                      type="number"
                      disabled={isReadOnly}
                      value={payload.penghasilanNetoUsaha}
                      onChange={(e) =>
                        setPayload({ ...payload, penghasilanNetoUsaha: Number(e.target.value) || 0 })
                      }
                      className="w-full border border-slate-300 rounded px-3 py-1.5 font-mono-num"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-[#1D2B53] mb-1">Status PTKP</label>
                    <select
                      disabled={isReadOnly}
                      value={payload.statusPtkp}
                      onChange={(e) => setPayload({ ...payload, statusPtkp: e.target.value as PtkpStatus })}
                      className="w-full border border-slate-300 rounded px-3 py-1.5 bg-white font-semibold"
                    >
                      {(Object.keys(PTKP_VALUES) as PtkpStatus[]).map((k) => (
                        <option key={k} value={k}>
                          {k} — {formatRp(PTKP_VALUES[k])}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block font-semibold text-[#1D2B53] mb-1">
                      Kredit Pajak Bukti Potong (BPA1 / PPh 21)
                    </label>
                    <input
                      type="number"
                      disabled={isReadOnly}
                      value={payload.kreditPajakBpa1}
                      onChange={(e) =>
                        setPayload({ ...payload, kreditPajakBpa1: Number(e.target.value) || 0 })
                      }
                      className="w-full border border-slate-300 rounded px-3 py-1.5 font-mono-num"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-[#1D2B53] mb-1">
                      Angsuran PPh Pasal 25 Dibayar Sendiri
                    </label>
                    <input
                      type="number"
                      disabled={isReadOnly}
                      value={payload.angsuranPph25}
                      onChange={(e) =>
                        setPayload({ ...payload, angsuranPph25: Number(e.target.value) || 0 })
                      }
                      className="w-full border border-slate-300 rounded px-3 py-1.5 font-mono-num"
                    />
                  </div>
                </div>

                {/* Live Summary Table */}
                <div className="space-y-1.5 pt-1">
                  <div className="flex justify-between">
                    <span>Jumlah Penghasilan Neto</span>
                    <span className="font-mono-num font-bold">{formatRp(netoSetelahZakat)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Penghasilan Tidak Kena Pajak (PTKP — {payload.statusPtkp})</span>
                    <span className="font-mono-num">{formatRp(ptkpAmount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Penghasilan Kena Pajak (PKP)</span>
                    <span className="font-mono-num font-bold text-[#1D2B53]">{formatRp(pkpAmount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>PPh Terutang (Tarif Progresif Pasal 17 UU HPP)</span>
                    <span className="font-mono-num font-bold text-[#1D2B53]">{formatRp(pphTerutang)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Jumlah Kredit Pajak (BPA1 + PPh 25)</span>
                    <span className="font-mono-num font-semibold text-emerald-700">{formatRp(totalKredit)}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 mt-2 rounded bg-[#FEF9E7] border border-[#F4C430] font-extrabold text-sm">
                    <span className="text-[#1D2B53]">
                      STATUS SPT:{' '}
                      {kurangLebih > 0
                        ? 'PPh KURANG BAYAR (PASAL 29)'
                        : kurangLebih < 0
                        ? 'PPh LEBIH BAYAR'
                        : 'NIHIL (Rp 0)'}
                    </span>
                    <span className="font-mono-num text-[#1D2B53]">{formatRp(kurangLebih)}</span>
                  </div>
                </div>

                {kurangLebih > 0 && !isReadOnly && (
                  <div className="mt-3 p-3 bg-slate-50 border border-slate-200 rounded flex flex-wrap gap-4">
                    <span className="font-bold text-[#1D2B53]">Metode Pelunasan PPh 29:</span>
                    <label className="inline-flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="radio"
                        checked={paymentMethod === 'DEPOSIT'}
                        onChange={() => setPaymentMethod('DEPOSIT')}
                      />
                      <span>Deposit Pajak ({formatRp(activeTaxpayer.depositBalance)})</span>
                    </label>
                    <label className="inline-flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="radio"
                        checked={paymentMethod === 'BILLING'}
                        onChange={() => setPaymentMethod('BILLING')}
                      />
                      <span>Buat Kode Billing (411125-200)</span>
                    </label>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* LAMPIRAN L-1: HARTA, UTANG, KELUARGA, BUKTI POTONG */}
        {tab === 'l1' && (
          <div className="space-y-5">
            {/* Add Record Bar */}
            {!isReadOnly && (
              <div className="p-3.5 bg-[#F8FAFC] border border-slate-200 rounded grid grid-cols-1 md:grid-cols-6 gap-2 items-end">
                <div>
                  <label className="block text-[11px] font-bold text-[#1D2B53] mb-1">Bagian L-1</label>
                  <select
                    value={newRecType}
                    onChange={(e) => setNewRecType(e.target.value as any)}
                    className="w-full border border-slate-300 rounded px-2 py-1.5 bg-white"
                  >
                    <option value="ASSET">Bag. A — Harta</option>
                    <option value="LIABILITY">Bag. B — Utang</option>
                    <option value="FAMILY">Bag. C — Keluarga</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#1D2B53] mb-1">Kode</label>
                  <input
                    type="text"
                    value={newCode}
                    onChange={(e) => setNewCode(e.target.value)}
                    className="w-full border border-slate-300 rounded px-2 py-1.5 font-mono-num"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-[11px] font-bold text-[#1D2B53] mb-1">Uraian / Nama</label>
                  <input
                    type="text"
                    value={newDesc}
                    onChange={(e) => setNewDesc(e.target.value)}
                    placeholder="Contoh: Emas Batangan / KPR Bank"
                    className="w-full border border-slate-300 rounded px-2 py-1.5"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#1D2B53] mb-1">Nilai (Rp)</label>
                  <input
                    type="number"
                    value={newAmount}
                    onChange={(e) => setNewAmount(Number(e.target.value))}
                    className="w-full border border-slate-300 rounded px-2 py-1.5 font-mono-num"
                  />
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    if (!newDesc.trim()) return;
                    await onAddAsset({
                      recordType: newRecType,
                      code: newCode,
                      description: newDesc,
                      yearAcquired: newYear,
                      amount: newAmount,
                      relationOrLender: newRel || 'Milik Wajib Pajak',
                    });
                    setNewDesc('');
                    setNewAmount(0);
                  }}
                  className="inline-flex items-center justify-center gap-1 bg-[#1D2B53] text-[#F4C430] font-bold px-3 py-1.5 rounded cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Tambah</span>
                </button>
              </div>
            )}

            {/* Bagian A: Harta */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <h4 className="font-bold text-[#1D2B53]">Bagian A — Harta pada Akhir Tahun Pajak</h4>
                <span className="font-mono-num font-bold text-[#1D2B53]">
                  Total Harta: {formatRp(assetList.reduce((s, a) => s + a.amount, 0))}
                </span>
              </div>
              <table className="w-full border border-slate-300 border-collapse">
                <thead>
                  <tr className="bg-[#F4C430] text-[#1D2B53] font-bold">
                    <th className="px-3 py-2 text-left">Kode</th>
                    <th className="px-3 py-2 text-left">Nama Harta</th>
                    <th className="px-3 py-2 text-center">Tahun</th>
                    <th className="px-3 py-2 text-left">Keterangan</th>
                    <th className="px-3 py-2 text-right">Harga Perolehan / Nilai</th>
                    {!isReadOnly && <th className="px-2 py-2 w-10" />}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {assetList.map((a) => (
                    <tr key={a.id}>
                      <td className="px-3 py-2 font-mono-num">{a.code}</td>
                      <td className="px-3 py-2 font-semibold">{a.description}</td>
                      <td className="px-3 py-2 text-center font-mono-num">{a.yearAcquired}</td>
                      <td className="px-3 py-2 text-slate-600">{a.relationOrLender}</td>
                      <td className="px-3 py-2 text-right font-mono-num font-bold">{formatRp(a.amount)}</td>
                      {!isReadOnly && (
                        <td className="px-2 py-2 text-center">
                          <button
                            type="button"
                            onClick={() => onDeleteAsset(a.id)}
                            className="text-red-600 hover:text-red-800 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Bagian B: Utang */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <h4 className="font-bold text-[#1D2B53]">Bagian B — Utang pada Akhir Tahun Pajak</h4>
                <span className="font-mono-num font-bold text-[#1D2B53]">
                  Total Utang: {formatRp(liabList.reduce((s, a) => s + a.amount, 0))}
                </span>
              </div>
              <table className="w-full border border-slate-300 border-collapse">
                <thead>
                  <tr className="bg-[#F4C430] text-[#1D2B53] font-bold">
                    <th className="px-3 py-2 text-left">Kode</th>
                    <th className="px-3 py-2 text-left">Jenis Utang</th>
                    <th className="px-3 py-2 text-left">Pemberi Pinjaman</th>
                    <th className="px-3 py-2 text-center">Tahun</th>
                    <th className="px-3 py-2 text-right">Saldo Utang</th>
                    {!isReadOnly && <th className="px-2 py-2 w-10" />}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {liabList.map((a) => (
                    <tr key={a.id}>
                      <td className="px-3 py-2 font-mono-num">{a.code}</td>
                      <td className="px-3 py-2 font-semibold">{a.description}</td>
                      <td className="px-3 py-2">{a.relationOrLender}</td>
                      <td className="px-3 py-2 text-center font-mono-num">{a.yearAcquired}</td>
                      <td className="px-3 py-2 text-right font-mono-num font-bold">{formatRp(a.amount)}</td>
                      {!isReadOnly && (
                        <td className="px-2 py-2 text-center">
                          <button
                            type="button"
                            onClick={() => onDeleteAsset(a.id)}
                            className="text-red-600 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Bagian C & E: Keluarga & Bukti Potong BPA1 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div>
                <h4 className="font-bold text-[#1D2B53] mb-1.5">Bagian C — Daftar Anggota Keluarga</h4>
                <table className="w-full border border-slate-300 border-collapse">
                  <thead>
                    <tr className="bg-[#F4C430] text-[#1D2B53] font-bold">
                      <th className="px-3 py-2 text-left">Nama</th>
                      <th className="px-3 py-2 text-left">Hubungan</th>
                      <th className="px-3 py-2 text-left">NIK</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {familyList.map((f) => (
                      <tr key={f.id}>
                        <td className="px-3 py-2 font-semibold">{f.description}</td>
                        <td className="px-3 py-2">{f.relationOrLender}</td>
                        <td className="px-3 py-2 font-mono-num">{f.nikMember || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div>
                <h4 className="font-bold text-[#1D2B53] mb-1.5">Bagian E — Daftar Bukti Potong BPA1</h4>
                <table className="w-full border border-slate-300 border-collapse">
                  <thead>
                    <tr className="bg-[#F4C430] text-[#1D2B53] font-bold">
                      <th className="px-3 py-2 text-left">No. BPA1</th>
                      <th className="px-3 py-2 text-left">Pemotong</th>
                      <th className="px-3 py-2 text-right">PPh Dipotong</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {bpa1Slips.map((s) => (
                      <tr key={s.id}>
                        <td className="px-3 py-2 font-mono-num font-semibold">{s.slipNumber}</td>
                        <td className="px-3 py-2">{s.issuerName}</td>
                        <td className="px-3 py-2 text-right font-mono-num font-bold text-[#1D2B53]">
                          {formatRp(s.taxWithheld)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* LAMPIRAN L-2: PPH FINAL & BUKAN OBJEK */}
        {tab === 'l2' && (
          <div className="space-y-4">
            <div className="bg-[#D9F2FD] border border-[#9EE0FB] text-[#0C5460] p-3 rounded">
              Lampiran L-2 mencatat penghasilan yang dikenakan PPh Final (bunga deposito, penjualan saham, sewa tanah/bangunan) dan penghasilan tidak termasuk objek pajak (warisan, hibah, dividen diinvestasikan).
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="border border-slate-300 rounded p-3.5 space-y-2">
                <div className="font-bold text-[#1D2B53]">Bagian A — Penghasilan Dikenakan PPh Final</div>
                {payload.pphFinalItems.length === 0 ? (
                  <p className="text-slate-500">Tidak ada penghasilan PPh Final dicatat.</p>
                ) : (
                  payload.pphFinalItems.map((it, idx) => (
                    <div key={idx} className="flex justify-between border-b border-slate-100 py-1">
                      <span>{it.jenis}</span>
                      <span className="font-mono-num">
                        DPP {formatRp(it.dpp)} | PPh {formatRp(it.pph)}
                      </span>
                    </div>
                  ))
                )}
                {!isReadOnly && (
                  <button
                    type="button"
                    onClick={() =>
                      setPayload({
                        ...payload,
                        punyaPphFinal: true,
                        pphFinalItems: [
                          ...payload.pphFinalItems,
                          { jenis: 'Bunga Deposito / Tabungan Bank (20%)', dpp: 12_000_000, pph: 2_400_000 },
                        ],
                      })
                    }
                    className="text-[11px] font-bold text-[#1D2B53] bg-slate-100 hover:bg-slate-200 px-2.5 py-1 rounded cursor-pointer"
                  >
                    + Tambah Contoh Bunga Deposito
                  </button>
                )}
              </div>

              <div className="border border-slate-300 rounded p-3.5 space-y-2">
                <div className="font-bold text-[#1D2B53]">Bagian B — Penghasilan Bukan Objek Pajak</div>
                {payload.bukanObjekItems.length === 0 ? (
                  <p className="text-slate-500">Tidak ada penghasilan bukan objek pajak dicatat.</p>
                ) : (
                  payload.bukanObjekItems.map((it, idx) => (
                    <div key={idx} className="flex justify-between border-b border-slate-100 py-1">
                      <span>{it.jenis}</span>
                      <span className="font-mono-num font-bold">{formatRp(it.jumlah)}</span>
                    </div>
                  ))
                )}
                {!isReadOnly && (
                  <button
                    type="button"
                    onClick={() =>
                      setPayload({
                        ...payload,
                        punyaBukanObjek: true,
                        bukanObjekItems: [
                          ...payload.bukanObjekItems,
                          { jenis: 'Hibah / Bantuan Keluarga Sedarah', jumlah: 25_000_000 },
                        ],
                      })
                    }
                    className="text-[11px] font-bold text-[#1D2B53] bg-slate-100 hover:bg-slate-200 px-2.5 py-1 rounded cursor-pointer"
                  >
                    + Tambah Contoh Bukan Objek Pajak
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      <SignModal
        open={signOpen}
        title="Tanda Tangan & Penyampaian SPT Tahunan OP"
        description={`Anda akan melaporkan SPT Tahunan Orang Pribadi Tahun ${taxReturn.taxYear} dengan status ${
          kurangLebih === 0 ? 'NIHIL (Rp 0)' : kurangLebih > 0 ? `KURANG BAYAR ${formatRp(kurangLebih)}` : 'LEBIH BAYAR'
        }.`}
        signerName={activeTaxpayer.name}
        signerNik={activeTaxpayer.nikNpwp}
        confirmLabel="Konfirmasi Kode Otorisasi & Lapor SPT"
        onClose={() => setSignOpen(false)}
        onConfirm={async () => {
          await onSubmit(taxReturn.id, kurangLebih > 0 ? paymentMethod : 'NONE');
          onBack();
        }}
      />
    </div>
  );
};
