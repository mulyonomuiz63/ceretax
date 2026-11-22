import React, { useState } from 'react';
import { ArrowLeft, Plus, Save, Send, Trash2 } from 'lucide-react';
import { SptTahunanBadanPayload, TaxReturn, Taxpayer } from '../../types/tax.ts';
import { calculatePphBadan, formatRp } from '../../utils/taxCalc.ts';
import { SignModal } from '../../components/SignModal.tsx';

interface SptTahunanBadanEditorProps {
  taxReturn: TaxReturn;
  activeTaxpayer: Taxpayer;
  onBack: () => void;
  onSave: (updated: TaxReturn) => Promise<void>;
  onSubmit: (id: string, paymentMethod: 'DEPOSIT' | 'BILLING' | 'NONE') => Promise<void>;
}

export const SptTahunanBadanEditor: React.FC<SptTahunanBadanEditorProps> = ({
  taxReturn,
  activeTaxpayer,
  onBack,
  onSave,
  onSubmit,
}) => {
  const [tab, setTab] = useState<'induk' | 'rekon' | 'kredit' | 'pengurus'>('induk');
  const [rawPayload, setRawPayload] = useState<SptTahunanBadanPayload>(
    calculatePphBadan(taxReturn.payload as SptTahunanBadanPayload)
  );
  const [paymentMethod, setPaymentMethod] = useState<'DEPOSIT' | 'BILLING'>('DEPOSIT');
  const [signOpen, setSignOpen] = useState(false);

  const [newPengurus, setNewPengurus] = useState({ nama: '', npwp: '', jabatan: 'Direktur', sahamPersen: 0 });
  const isReadOnly = taxReturn.status !== 'DRAFT';

  const calc = calculatePphBadan(rawPayload);

  const updateField = <K extends keyof SptTahunanBadanPayload>(key: K, value: SptTahunanBadanPayload[K]) => {
    setRawPayload((prev) => calculatePphBadan({ ...prev, [key]: value }));
  };

  const buildUpdated = (): TaxReturn => ({
    ...taxReturn,
    taxPayable: calc.totalPphTerutang,
    taxCredit: calc.totalKreditPajak,
    underOverPayment: calc.pphKurangLebihBayar,
    payload: calc,
  });

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
              SPT Tahunan PPh Badan — Tahun Pajak {taxReturn.taxYear} (Modul 5)
            </h2>
            <p className="text-[11px] text-slate-300">
              {activeTaxpayer.name} (NPWP: {activeTaxpayer.nikNpwp}) · Status: <strong>{taxReturn.status}</strong>
            </p>
          </div>
        </div>
        {!isReadOnly && (
          <div className="flex flex-wrap items-center gap-2">
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

      {/* Tabs */}
      <div className="px-5 pt-3 bg-[#F8FAFC] border-b border-slate-200 flex items-center gap-1 overflow-x-auto">
        {[
          { id: 'induk', label: 'Induk SPT Badan (Tarif 31E & Psl 17)' },
          { id: 'rekon', label: 'Lampiran I — Laporan Keuangan & Rekonsiliasi Fiskal' },
          { id: 'kredit', label: 'Lampiran III — Kredit Pajak & PPh 25' },
          { id: 'pengurus', label: 'Lampiran V — Pengurus & Pemegang Saham' },
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
        {/* TAB 1: INDUK BADAN & TARIF 31E */}
        {tab === 'induk' && (
          <div className="space-y-4">
            <div className="bg-[#D9F2FD] border border-[#9EE0FB] text-[#0C5460] p-3 rounded">
              <strong>Fasilitas Pengurangan Tarif Pasal 31E UU PPh:</strong> Otomatis dihitung jika Peredaran Bruto ≤ Rp50 Miliar (bagian PKP hingga proporsi Rp4,8 Miliar dikenakan <strong>11%</strong>, sisanya tarif umum Pasal 17 sebesar <strong>22%</strong>).
            </div>

            <div className="border border-slate-300 rounded overflow-hidden">
              <div className="bg-[#1D2B53] text-white px-4 py-2 font-bold">
                RINGKASAN PENGHITUNGAN PPh BADAN TERUTANG &amp; PPh PASAL 29
              </div>
              <div className="p-4 space-y-2">
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span>1. Peredaran Bruto Komersial</span>
                  <span className="font-mono-num font-bold">{formatRp(calc.peredaranBruto)}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span>2. Laba / Rugi Bersih Komersial</span>
                  <span className="font-mono-num">{formatRp(calc.labaKomersial)}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span>3. Penghasilan Neto Fiskal (Setelah Rekonsiliasi Fiskal)</span>
                  <span className="font-mono-num font-bold text-[#1D2B53]">{formatRp(calc.penghasilanNetoFiskal)}</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-slate-100">
                  <span>4. Kompensasi Kerugian Fiskal Tahun Sebelumnya</span>
                  <input
                    type="number"
                    disabled={isReadOnly}
                    value={calc.kompensasiKerugian}
                    onChange={(e) => updateField('kompensasiKerugian', Number(e.target.value) || 0)}
                    className="w-44 text-right border border-slate-300 rounded px-2.5 py-1 font-mono-num"
                  />
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-200 font-bold">
                  <span>5. Penghasilan Kena Pajak (PKP Dibulatkan Ribuan Penuh)</span>
                  <span className="font-mono-num text-[#1D2B53]">{formatRp(calc.pkpDibulatkan)}</span>
                </div>

                {/* Breakdown Pasal 31E & Pasal 17 */}
                <div className="bg-[#F8FAFC] border border-slate-200 rounded p-3 space-y-1.5 my-2">
                  <div className="font-bold text-[#1D2B53]">Rincian Penerapan Tarif Pasal 31E &amp; Pasal 17:</div>
                  <div className="flex justify-between">
                    <span>a. Bagian PKP Mendapat Fasilitas 31E ({formatRp(calc.pkpFasilitas31E)} × 11%)</span>
                    <span className="font-mono-num font-semibold">{formatRp(calc.pphFasilitas31E)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>b. Bagian PKP Tidak Mendapat Fasilitas ({formatRp(calc.pkpNonFasilitas)} × 22%)</span>
                    <span className="font-mono-num font-semibold">{formatRp(calc.pphNonFasilitas)}</span>
                  </div>
                  <div className="flex justify-between pt-1.5 border-t border-slate-200 font-bold text-[#1D2B53]">
                    <span>6. Total PPh Badan Terutang (a + b)</span>
                    <span className="font-mono-num">{formatRp(calc.totalPphTerutang)}</span>
                  </div>
                </div>

                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span>7. Jumlah Kredit Pajak (PPh 22 + PPh 23 + PPh 24 + Angsuran PPh 25)</span>
                  <span className="font-mono-num font-semibold text-emerald-700">
                    {formatRp(calc.totalKreditPajak)}
                  </span>
                </div>

                <div className="flex justify-between items-center p-3 mt-2 rounded bg-[#FEF9E7] border border-[#F4C430] font-extrabold text-sm">
                  <span className="text-[#1D2B53]">
                    8. {calc.pphKurangLebihBayar > 0 ? 'PPh KURANG BAYAR (PASAL 29)' : calc.pphKurangLebihBayar < 0 ? 'PPh LEBIH BAYAR (PASAL 28A)' : 'NIHIL'}
                  </span>
                  <span className="font-mono-num text-[#1D2B53]">{formatRp(calc.pphKurangLebihBayar)}</span>
                </div>

                {calc.pphKurangLebihBayar > 0 && !isReadOnly && (
                  <div className="mt-3 p-3 bg-slate-50 border border-slate-200 rounded flex flex-wrap gap-4">
                    <span className="font-bold text-[#1D2B53]">Pelunasan PPh Pasal 29:</span>
                    <label className="inline-flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="radio"
                        checked={paymentMethod === 'DEPOSIT'}
                        onChange={() => setPaymentMethod('DEPOSIT')}
                      />
                      <span>Pemindahbukuan Deposit ({formatRp(activeTaxpayer.depositBalance)})</span>
                    </label>
                    <label className="inline-flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="radio"
                        checked={paymentMethod === 'BILLING'}
                        onChange={() => setPaymentMethod('BILLING')}
                      />
                      <span>Buat Kode Billing (411126-200)</span>
                    </label>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: LAPORAN KEUANGAN & REKONSILIASI FISKAL */}
        {tab === 'rekon' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Laba Rugi Komersial & Neraca */}
            <div className="border border-slate-300 rounded overflow-hidden">
              <div className="bg-[#1D2B53] text-white px-4 py-2 font-bold">
                LAPORAN LABA RUGI KOMERSIAL &amp; NERACA RINGKAS
              </div>
              <div className="p-4 space-y-2.5">
                {[
                  { key: 'peredaranBruto' as const, label: 'Peredaran Usaha / Omzet Bruto' },
                  { key: 'hpp' as const, label: 'Harga Pokok Penjualan (HPP)' },
                  { key: 'biayaUsaha' as const, label: 'Biaya Usaha Lainnya (Operasional)' },
                  { key: 'penghasilanLainKomersial' as const, label: 'Penghasilan dari Luar Usaha' },
                  { key: 'biayaLainKomersial' as const, label: 'Biaya dari Luar Usaha' },
                ].map((f) => (
                  <div key={f.key} className="flex items-center justify-between gap-2">
                    <label className="text-slate-700 font-medium">{f.label}</label>
                    <input
                      type="number"
                      disabled={isReadOnly}
                      value={calc[f.key]}
                      onChange={(e) => updateField(f.key, Number(e.target.value) || 0)}
                      className="w-44 text-right border border-slate-300 rounded px-2.5 py-1.5 font-mono-num"
                    />
                  </div>
                ))}
                <div className="flex justify-between pt-2 border-t border-slate-200 font-bold text-[#1D2B53]">
                  <span>Laba Bersih Komersial</span>
                  <span className="font-mono-num">{formatRp(calc.labaKomersial)}</span>
                </div>

                <div className="pt-3 border-t border-slate-200 space-y-2">
                  <div className="font-bold text-[#1D2B53]">Ringkasan Neraca:</div>
                  {[
                    { key: 'totalAset' as const, label: 'Total Aset / Aktiva' },
                    { key: 'totalKewajiban' as const, label: 'Total Kewajiban / Liabilitas' },
                    { key: 'totalEkuitas' as const, label: 'Total Ekuitas / Modal' },
                  ].map((f) => (
                    <div key={f.key} className="flex items-center justify-between gap-2">
                      <label className="text-slate-700">{f.label}</label>
                      <input
                        type="number"
                        disabled={isReadOnly}
                        value={calc[f.key]}
                        onChange={(e) => updateField(f.key, Number(e.target.value) || 0)}
                        className="w-44 text-right border border-slate-300 rounded px-2.5 py-1 font-mono-num"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Koreksi Fiskal Positif & Negatif */}
            <div className="border border-slate-300 rounded overflow-hidden">
              <div className="bg-[#1D2B53] text-white px-4 py-2 font-bold">
                REKONSILIASI FISKAL (KOREKSI POSITIF &amp; NEGATIF)
              </div>
              <div className="p-4 space-y-2.5">
                <div className="font-bold text-amber-800 bg-amber-50 px-2.5 py-1 rounded">
                  A. Penyesuaian Fiskal Positif (Menambah Laba Fiskal)
                </div>
                {[
                  { key: 'koreksiPositifNatura' as const, label: 'Biaya Natura / Kenikmatan Non-Deductible' },
                  { key: 'koreksiPositifSanksiPajak' as const, label: 'Sanksi Administrasi & Denda Pajak' },
                  { key: 'koreksiPositifJamuanNonNominatif' as const, label: 'Biaya Jamuan Tanpa Daftar Nominatif' },
                  { key: 'koreksiPositifPenyisihanPiutang' as const, label: 'Pembentukan Cadangan / Penyisihan Piutang' },
                  { key: 'koreksiPositifLainnya' as const, label: 'Penyesuaian Fiskal Positif Lainnya' },
                ].map((f) => (
                  <div key={f.key} className="flex items-center justify-between gap-2">
                    <label className="text-slate-700">{f.label}</label>
                    <input
                      type="number"
                      disabled={isReadOnly}
                      value={calc[f.key]}
                      onChange={(e) => updateField(f.key, Number(e.target.value) || 0)}
                      className="w-40 text-right border border-slate-300 rounded px-2.5 py-1 font-mono-num"
                    />
                  </div>
                ))}

                <div className="font-bold text-blue-800 bg-blue-50 px-2.5 py-1 rounded mt-3">
                  B. Penyesuaian Fiskal Negatif (Mengurangi Laba Fiskal)
                </div>
                {[
                  { key: 'koreksiNegatifPenghasilanFinal' as const, label: 'Penghasilan Dikenakan PPh Final (Deposito/Sewa)' },
                  { key: 'koreksiNegatifPenyusutanFiskal' as const, label: 'Selisih Lebih Penyusutan Fiskal vs Komersial' },
                  { key: 'koreksiNegatifLainnya' as const, label: 'Penyesuaian Fiskal Negatif Lainnya' },
                ].map((f) => (
                  <div key={f.key} className="flex items-center justify-between gap-2">
                    <label className="text-slate-700">{f.label}</label>
                    <input
                      type="number"
                      disabled={isReadOnly}
                      value={calc[f.key]}
                      onChange={(e) => updateField(f.key, Number(e.target.value) || 0)}
                      className="w-40 text-right border border-slate-300 rounded px-2.5 py-1 font-mono-num"
                    />
                  </div>
                ))}

                <div className="flex justify-between pt-2.5 mt-2 border-t-2 border-[#1D2B53] font-extrabold text-[#1D2B53]">
                  <span>Penghasilan Neto Fiskal (Laba Komersial + Positif - Negatif)</span>
                  <span className="font-mono-num">{formatRp(calc.penghasilanNetoFiskal)}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: KREDIT PAJAK */}
        {tab === 'kredit' && (
          <div className="max-w-xl border border-slate-300 rounded overflow-hidden">
            <div className="bg-[#1D2B53] text-white px-4 py-2 font-bold">
              KREDIT PAJAK DALAM NEGERI, LUAR NEGERI &amp; ANGSURAN PPh PASAL 25
            </div>
            <div className="p-4 space-y-3">
              {[
                { key: 'kreditPph22' as const, label: 'Kredit Pajak PPh Pasal 22 (Impor / Bendaharawan)' },
                { key: 'kreditPph23' as const, label: 'Kredit Pajak PPh Pasal 23 (Bukti Potong Jasa/Sewa)' },
                { key: 'kreditPph24' as const, label: 'Kredit Pajak Luar Negeri PPh Pasal 24' },
                { key: 'angsuranPph25' as const, label: 'PPh Dibayar Sendiri — Angsuran PPh Pasal 25 Setahun' },
              ].map((f) => (
                <div key={f.key} className="flex items-center justify-between gap-3">
                  <label className="font-medium text-slate-700">{f.label}</label>
                  <input
                    type="number"
                    disabled={isReadOnly}
                    value={calc[f.key]}
                    onChange={(e) => updateField(f.key, Number(e.target.value) || 0)}
                    className="w-48 text-right border border-slate-300 rounded px-3 py-1.5 font-mono-num"
                  />
                </div>
              ))}
              <div className="flex justify-between pt-3 border-t border-slate-200 font-extrabold text-[#1D2B53]">
                <span>Total Kredit Pajak Badan</span>
                <span className="font-mono-num">{formatRp(calc.totalKreditPajak)}</span>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: PENGURUS & PEMEGANG SAHAM */}
        {tab === 'pengurus' && (
          <div className="space-y-4">
            {!isReadOnly && (
              <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 bg-[#F8FAFC] p-3 border border-slate-200 rounded items-end">
                <input
                  type="text"
                  placeholder="Nama Pengurus / Pemegang Saham"
                  value={newPengurus.nama}
                  onChange={(e) => setNewPengurus({ ...newPengurus, nama: e.target.value })}
                  className="border border-slate-300 rounded px-2.5 py-1.5 sm:col-span-2"
                />
                <input
                  type="text"
                  placeholder="NIK / NPWP 16 Digit"
                  value={newPengurus.npwp}
                  onChange={(e) => setNewPengurus({ ...newPengurus, npwp: e.target.value })}
                  className="border border-slate-300 rounded px-2.5 py-1.5 font-mono-num"
                />
                <input
                  type="text"
                  placeholder="Jabatan"
                  value={newPengurus.jabatan}
                  onChange={(e) => setNewPengurus({ ...newPengurus, jabatan: e.target.value })}
                  className="border border-slate-300 rounded px-2.5 py-1.5"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (!newPengurus.nama.trim()) return;
                    updateField('pengurus', [...calc.pengurus, newPengurus]);
                    setNewPengurus({ nama: '', npwp: '', jabatan: 'Direktur', sahamPersen: 0 });
                  }}
                  className="inline-flex items-center justify-center gap-1 bg-[#1D2B53] text-[#F4C430] font-bold px-3 py-1.5 rounded cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" /> Tambah
                </button>
              </div>
            )}

            <table className="w-full border border-slate-300 border-collapse">
              <thead>
                <tr className="bg-[#F4C430] text-[#1D2B53] font-bold">
                  <th className="px-3 py-2 text-left">Nama Pengurus / Pemegang Saham</th>
                  <th className="px-3 py-2 text-left">NIK / NPWP</th>
                  <th className="px-3 py-2 text-left">Jabatan</th>
                  <th className="px-3 py-2 text-right">Kepemilikan Saham (%)</th>
                  {!isReadOnly && <th className="px-2 py-2 w-10" />}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {calc.pengurus.map((p, idx) => (
                  <tr key={idx}>
                    <td className="px-3 py-2 font-semibold">{p.nama}</td>
                    <td className="px-3 py-2 font-mono-num">{p.npwp}</td>
                    <td className="px-3 py-2">{p.jabatan}</td>
                    <td className="px-3 py-2 text-right font-mono-num">{p.sahamPersen}%</td>
                    {!isReadOnly && (
                      <td className="px-2 py-2 text-center">
                        <button
                          type="button"
                          onClick={() =>
                            updateField(
                              'pengurus',
                              calc.pengurus.filter((_, i) => i !== idx)
                            )
                          }
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
        )}
      </div>

      <SignModal
        open={signOpen}
        title="Bayar & Lapor SPT Tahunan PPh Badan"
        description={`Total PPh Badan Terutang ${formatRp(calc.totalPphTerutang)} dengan ${
          calc.pphKurangLebihBayar > 0
            ? `PPh Pasal 29 Kurang Bayar ${formatRp(calc.pphKurangLebihBayar)} (${
                paymentMethod === 'DEPOSIT' ? 'Deposit Pajak' : 'Kode Billing'
              })`
            : 'Status Nihil / Lebih Bayar'
        }.`}
        signerName={activeTaxpayer.name}
        signerNik={activeTaxpayer.nikNpwp}
        confirmLabel="Konfirmasi & Laporkan SPT Badan"
        onClose={() => setSignOpen(false)}
        onConfirm={async () => {
          await onSubmit(taxReturn.id, calc.pphKurangLebihBayar > 0 ? paymentMethod : 'NONE');
          onBack();
        }}
      />
    </div>
  );
};
