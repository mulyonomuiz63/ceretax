import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Plus, Save, Send, Settings, Trash2 } from 'lucide-react';
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

type BadanTab = 'induk' | 'l1' | 'l2' | 'l3' | 'l11b';

export const SptTahunanBadanEditor: React.FC<SptTahunanBadanEditorProps> = ({
  taxReturn,
  activeTaxpayer,
  onBack,
  onSave,
  onSubmit,
}) => {
  const [tab, setTab] = useState<BadanTab>('induk');
  const [rawPayload, setRawPayload] = useState<SptTahunanBadanPayload>(
    calculatePphBadan(taxReturn.payload as SptTahunanBadanPayload)
  );
  const [paymentMethod, setPaymentMethod] = useState<'DEPOSIT' | 'BILLING'>('DEPOSIT');
  const [signOpen, setSignOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [sektorUsaha, setSektorUsaha] = useState('Perdagangan & Jasa Umum');
  const [diauditKap, setDiauditKap] = useState(false);
  const [declarationChecked, setDeclarationChecked] = useState(true);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  // L11-B interactive fields (EBITDA & DER simulation)
  const [biayaBungaPinjaman, setBiayaBungaPinjaman] = useState(120_000_000);
  const [bebanPenyusutanAmortisasi, setBebanPenyusutanAmortisasi] = useState(185_000_000);

  // L2 Pengurus & Pemegang Saham
  const [newPengurus, setNewPengurus] = useState({ nama: '', npwp: '', jabatan: 'Direktur', sahamPersen: 0 });
  const isReadOnly = taxReturn.status !== 'DRAFT';
  const toggleSection = (key: string) => setCollapsed((p) => ({ ...p, [key]: !p[key] }));

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

  const handleSaveDraft = async () => {
    setSaving(true);
    try {
      await onSave(buildUpdated());
    } finally {
      setSaving(false);
    }
  };

  const handleOpenSign = async () => {
    setSaving(true);
    try {
      await onSave(buildUpdated());
      setSignOpen(true);
    } finally {
      setSaving(false);
    }
  };

  const statusSptLabel =
    calc.pphKurangLebihBayar > 0
      ? 'Kurang Bayar (PPh Pasal 29)'
      : calc.pphKurangLebihBayar < 0
      ? 'Lebih Bayar (Pasal 28A)'
      : 'Nihil';

  // L11-B EBITDA & DER metrics
  const ebitdaFiskal = Math.max(0, calc.penghasilanNetoFiskal + biayaBungaPinjaman + bebanPenyusutanAmortisasi);
  const batasBiayaPinjaman25 = Math.round(ebitdaFiskal * 0.25);
  const derRatio = calc.totalEkuitas > 0 ? calc.totalKewajiban / calc.totalEkuitas : 0;

  const SectionBar: React.FC<{ id: string; title: string; rightText?: string }> = ({
    id,
    title,
    rightText,
  }) => {
    const isClosed = !!collapsed[id];
    return (
      <button
        type="button"
        onClick={() => toggleSection(id)}
        className="w-full flex items-center justify-between bg-[#1E2C5E] hover:bg-[#17234B] text-white px-4 py-2.5 text-left transition-colors cursor-pointer"
      >
        <div className="flex items-center gap-2 font-bold text-[12px] tracking-wide uppercase">
          {isClosed ? <ChevronRight className="w-4 h-4 shrink-0" /> : <ChevronDown className="w-4 h-4 shrink-0" />}
          <span>{title}</span>
        </div>
        {rightText && <span className="text-[11px] font-mono-num text-[#F7CA36]">{rightText}</span>}
      </button>
    );
  };

  return (
    <div className="bg-white border border-[#D9E0E8] rounded-md overflow-hidden shadow-xs">
      {/* Document Title Header */}
      <div className="px-5 pt-4 pb-3 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display font-extrabold text-[15px] text-[#1E2C5E] uppercase tracking-tight">
            SPT TAHUNAN PAJAK PENGHASILAN (PPh) WAJIB PAJAK BADAN
          </h2>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Tahun Pajak {taxReturn.taxYear} · {taxReturn.revisionNo === 0 ? 'Normal' : `Pembetulan ke-${taxReturn.revisionNo}`} · Status:{' '}
            <strong className="text-[#1E2C5E]">{taxReturn.status === 'DRAFT' ? 'Konsep SPT' : 'Dilaporkan'}</strong>
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded border border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-600">
          <Settings className="w-3.5 h-3.5 text-[#1E2C5E]" />
          <span>XML Monitoring</span>
        </span>
      </div>

      {/* Horizontal Coretax Tabs */}
      <div className="px-5 pt-3 bg-[#F8FAFC] border-b border-slate-200 flex items-center gap-1.5 overflow-x-auto">
        {[
          { id: 'induk' as BadanTab, label: 'Induk' },
          { id: 'l1' as BadanTab, label: 'L1 — Laporan Keuangan & Rekonsiliasi' },
          { id: 'l2' as BadanTab, label: 'L2 — Daftar Kepemilikan' },
          { id: 'l3' as BadanTab, label: 'L3 — Kredit Pajak' },
          { id: 'l11b' as BadanTab, label: 'L11-B — Biaya Pinjaman' },
        ].map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 text-[12px] font-bold rounded-t border-t border-x whitespace-nowrap cursor-pointer transition-colors ${
              tab === t.id
                ? 'bg-white text-[#1E2C5E] border-slate-300 -mb-px border-t-2 border-t-[#F7CA36]'
                : 'bg-[#EEF2F7] text-slate-600 border-transparent hover:bg-slate-200'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="p-5 space-y-4 text-[12px]">
        {/* ==================== TAB: INDUK ==================== */}
        {tab === 'induk' && (
          <div className="space-y-3">
            {/* HEADER */}
            <div className="border border-slate-200 rounded overflow-hidden">
              <SectionBar id="header" title="HEADER" />
              {!collapsed.header && (
                <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2.5 bg-white">
                  <div className="grid grid-cols-12 items-center gap-2">
                    <label className="col-span-5 font-semibold text-slate-700">Tahun Pajak</label>
                    <input
                      type="text"
                      readOnly
                      value={String(taxReturn.taxYear)}
                      className="col-span-7 border border-slate-200 bg-slate-100 rounded px-3 py-1.5 font-mono-num"
                    />
                  </div>
                  <div className="grid grid-cols-12 items-center gap-2">
                    <label className="col-span-5 font-semibold text-slate-700">Periode Pembukuan</label>
                    <input
                      type="text"
                      readOnly
                      value={`01 Jan ${taxReturn.taxYear} s.d. 31 Des ${taxReturn.taxYear}`}
                      className="col-span-7 border border-slate-200 bg-slate-100 rounded px-3 py-1.5"
                    />
                  </div>
                  <div className="grid grid-cols-12 items-center gap-2">
                    <label className="col-span-5 font-semibold text-slate-700">Status SPT</label>
                    <input
                      type="text"
                      readOnly
                      value={taxReturn.revisionNo === 0 ? 'Normal' : `Pembetulan ke-${taxReturn.revisionNo}`}
                      className="col-span-7 border border-slate-200 bg-slate-100 rounded px-3 py-1.5"
                    />
                  </div>
                  <div className="grid grid-cols-12 items-center gap-2">
                    <label className="col-span-5 font-semibold text-slate-700">Mata Uang Pembukuan</label>
                    <input
                      type="text"
                      readOnly
                      value="IDR — Rupiah Indonesia"
                      className="col-span-7 border border-slate-200 bg-slate-100 rounded px-3 py-1.5"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* A. IDENTITAS WAJIB PAJAK */}
            <div className="border border-slate-200 rounded overflow-hidden">
              <SectionBar id="secA" title="A. IDENTITAS WAJIB PAJAK" />
              {!collapsed.secA && (
                <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2.5 bg-white">
                  <div className="grid grid-cols-12 items-center gap-2">
                    <label className="col-span-5 font-semibold text-slate-700">NPWP (16 Digit)</label>
                    <input
                      type="text"
                      readOnly
                      value={activeTaxpayer.nikNpwp}
                      className="col-span-7 border border-slate-200 bg-slate-100 rounded px-3 py-1.5 font-mono-num"
                    />
                  </div>
                  <div className="grid grid-cols-12 items-center gap-2">
                    <label className="col-span-5 font-semibold text-slate-700">Nama Wajib Pajak Badan</label>
                    <input
                      type="text"
                      readOnly
                      value={activeTaxpayer.name}
                      className="col-span-7 border border-slate-200 bg-slate-100 rounded px-3 py-1.5 font-semibold"
                    />
                  </div>
                  <div className="grid grid-cols-12 items-center gap-2">
                    <label className="col-span-5 font-semibold text-slate-700">Alamat Email</label>
                    <input
                      type="text"
                      readOnly
                      value={activeTaxpayer.email}
                      className="col-span-7 border border-slate-200 bg-slate-100 rounded px-3 py-1.5"
                    />
                  </div>
                  <div className="grid grid-cols-12 items-center gap-2">
                    <label className="col-span-5 font-semibold text-slate-700">Status PKP</label>
                    <input
                      type="text"
                      readOnly
                      value={activeTaxpayer.isPkp ? 'Pengusaha Kena Pajak (PKP)' : 'Non-PKP'}
                      className="col-span-7 border border-slate-200 bg-slate-100 rounded px-3 py-1.5"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* B. INFORMASI LAPORAN KEUANGAN */}
            <div className="border border-slate-200 rounded overflow-hidden">
              <SectionBar id="secB" title="B. INFORMASI LAPORAN KEUANGAN & C. PENGHASILAN FINAL" />
              {!collapsed.secB && (
                <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4 bg-white">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Sektor Usaha (Lampiran L1)</label>
                    <select
                      disabled={isReadOnly}
                      value={sektorUsaha}
                      onChange={(e) => setSektorUsaha(e.target.value)}
                      className="w-full border border-slate-300 rounded px-3 py-1.5 bg-white"
                    >
                      <option value="Perdagangan & Jasa Umum">Perdagangan &amp; Jasa Umum</option>
                      <option value="Industri Manufaktur">Industri Manufaktur</option>
                      <option value="Konstruksi & Properti">Konstruksi &amp; Properti</option>
                      <option value="Teknologi Informasi & Konsultasi">Teknologi Informasi &amp; Konsultasi</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Laporan Keuangan Diaudit Akuntan Publik?
                    </label>
                    <div className="flex items-center gap-5 pt-1.5">
                      <label className="inline-flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="radio"
                          disabled={isReadOnly}
                          checked={diauditKap}
                          onChange={() => setDiauditKap(true)}
                          className="accent-[#1E2C5E]"
                        />
                        <span>Ya (Diaudit KAP)</span>
                      </label>
                      <label className="inline-flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="radio"
                          disabled={isReadOnly}
                          checked={!diauditKap}
                          onChange={() => setDiauditKap(false)}
                          className="accent-[#1E2C5E]"
                        />
                        <span>Tidak Diaudit</span>
                      </label>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* D. PENGHITUNGAN PPh BADAN */}
            <div className="border border-slate-200 rounded overflow-hidden">
              <SectionBar
                id="secD"
                title="D. PENGHITUNGAN PPh BADAN (FASILITAS PASAL 31E & TARIF PASAL 17)"
                rightText={`PPh Terutang: ${formatRp(calc.totalPphTerutang)}`}
              />
              {!collapsed.secD && (
                <div className="p-4 space-y-2.5 bg-white">
                  <div className="bg-[#D8F1FD] border border-[#9CDDFB] text-[#0E4A6B] px-3.5 py-2 rounded text-[11px]">
                    <strong>Fasilitas Pasal 31E:</strong> Otomatis diterapkan bila Peredaran Bruto ≤ Rp50 Miliar (proporsi Rp4,8 Miliar dikenakan tarif <strong>11%</strong>, selebihnya tarif Pasal 17 sebesar <strong>22%</strong>).
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-2 items-center">
                    <label className="lg:col-span-8 text-slate-700">1. Peredaran Bruto Komersial (dari Lampiran L1)</label>
                    <input
                      type="text"
                      readOnly
                      value={formatRp(calc.peredaranBruto)}
                      className="lg:col-span-4 text-right border border-slate-200 bg-slate-100 rounded px-2.5 py-1.5 font-mono-num font-bold"
                    />
                  </div>
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-2 items-center">
                    <label className="lg:col-span-8 text-slate-700">2. Laba / (Rugi) Bersih Komersial</label>
                    <input
                      type="text"
                      readOnly
                      value={formatRp(calc.labaKomersial)}
                      className="lg:col-span-4 text-right border border-slate-200 bg-slate-100 rounded px-2.5 py-1.5 font-mono-num"
                    />
                  </div>
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-2 items-center">
                    <label className="lg:col-span-8 font-semibold text-[#1E2C5E]">
                      3. Penghasilan Neto Fiskal (Setelah Rekonsiliasi L1)
                    </label>
                    <input
                      type="text"
                      readOnly
                      value={formatRp(calc.penghasilanNetoFiskal)}
                      className="lg:col-span-4 text-right border border-slate-200 bg-slate-100 rounded px-2.5 py-1.5 font-mono-num font-bold text-[#1E2C5E]"
                    />
                  </div>
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-2 items-center">
                    <label className="lg:col-span-8 text-slate-700">4. Kompensasi Kerugian Fiskal Tahun Sebelumnya</label>
                    <input
                      type="number"
                      disabled={isReadOnly}
                      value={calc.kompensasiKerugian}
                      onChange={(e) => updateField('kompensasiKerugian', Number(e.target.value) || 0)}
                      className="lg:col-span-4 text-right border border-slate-300 rounded px-2.5 py-1.5 font-mono-num"
                    />
                  </div>
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-2 items-center">
                    <label className="lg:col-span-8 font-bold text-[#1E2C5E]">
                      5. Penghasilan Kena Pajak (PKP Dibulatkan Ribuan Penuh)
                    </label>
                    <input
                      type="text"
                      readOnly
                      value={formatRp(calc.pkpDibulatkan)}
                      className="lg:col-span-4 text-right border border-slate-200 bg-slate-100 rounded px-2.5 py-1.5 font-mono-num font-bold text-[#1E2C5E]"
                    />
                  </div>

                  {/* Pasal 31E & Pasal 17 Table */}
                  <div className="overflow-x-auto pt-1">
                    <table className="w-full border border-slate-300 border-collapse text-[12px]">
                      <thead>
                        <tr className="bg-[#F7CA36] text-[#1E2C5E] font-bold">
                          <th className="px-3 py-2 text-left border-r border-[#E5B822]">Komponen Tarif PPh Badan</th>
                          <th className="px-3 py-2 text-right border-r border-[#E5B822]">Dasar PKP (Rp)</th>
                          <th className="px-3 py-2 text-center border-r border-[#E5B822]">Tarif</th>
                          <th className="px-3 py-2 text-right">PPh Terutang (Rp)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        <tr>
                          <td className="px-3 py-2">6.a. Bagian PKP Mendapat Fasilitas Pasal 31E</td>
                          <td className="px-3 py-2 text-right font-mono-num">{formatRp(calc.pkpFasilitas31E)}</td>
                          <td className="px-3 py-2 text-center font-mono-num font-semibold">11%</td>
                          <td className="px-3 py-2 text-right font-mono-num font-semibold">{formatRp(calc.pphFasilitas31E)}</td>
                        </tr>
                        <tr>
                          <td className="px-3 py-2">6.b. Bagian PKP Tidak Mendapat Fasilitas (Pasal 17)</td>
                          <td className="px-3 py-2 text-right font-mono-num">{formatRp(calc.pkpNonFasilitas)}</td>
                          <td className="px-3 py-2 text-center font-mono-num font-semibold">22%</td>
                          <td className="px-3 py-2 text-right font-mono-num font-semibold">{formatRp(calc.pphNonFasilitas)}</td>
                        </tr>
                        <tr className="bg-[#EEF3FA] font-extrabold text-[#1E2C5E]">
                          <td colSpan={3} className="px-3 py-2 text-right">
                            7. JUMLAH PPh BADAN TERUTANG (6.a + 6.b)
                          </td>
                          <td className="px-3 py-2 text-right font-mono-num">{formatRp(calc.totalPphTerutang)}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* E. KREDIT PAJAK & F. KURANG/LEBIH BAYAR */}
            <div className="border border-slate-200 rounded overflow-hidden">
              <SectionBar
                id="secEF"
                title="E. PENGURANG PPh TERUTANG & F. PPh KURANG / (LEBIH) BAYAR"
                rightText={`${statusSptLabel}: ${formatRp(calc.pphKurangLebihBayar)}`}
              />
              {!collapsed.secEF && (
                <div className="p-4 space-y-2.5 bg-white">
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-2 items-center">
                    <label className="lg:col-span-8 text-slate-700">
                      8. Jumlah Kredit Pajak (PPh 22 + PPh 23 + PPh 24 + Angsuran PPh 25 — Lampiran L3)
                    </label>
                    <input
                      type="text"
                      readOnly
                      value={formatRp(calc.totalKreditPajak)}
                      className="lg:col-span-4 text-right border border-emerald-200 bg-emerald-50 rounded px-2.5 py-1.5 font-mono-num font-bold text-emerald-800"
                    />
                  </div>
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-2 items-center">
                    <label className="lg:col-span-8 font-extrabold text-[#1E2C5E]">
                      9. {statusSptLabel} (Angka 7 dikurangi Angka 8)
                    </label>
                    <input
                      type="text"
                      readOnly
                      value={formatRp(calc.pphKurangLebihBayar)}
                      className="lg:col-span-4 text-right border border-[#F7CA36] bg-[#FEF9E7] rounded px-2.5 py-1.5 font-mono-num font-extrabold text-[#1E2C5E]"
                    />
                  </div>
                  {calc.pphKurangLebihBayar > 0 && !isReadOnly && (
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded flex flex-wrap items-center gap-4">
                      <span className="font-bold text-[#1E2C5E]">Pelunasan PPh Pasal 29:</span>
                      <label className="inline-flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="radio"
                          checked={paymentMethod === 'DEPOSIT'}
                          onChange={() => setPaymentMethod('DEPOSIT')}
                          className="accent-[#1E2C5E]"
                        />
                        <span>Pemindahbukuan Deposit ({formatRp(activeTaxpayer.depositBalance)})</span>
                      </label>
                      <label className="inline-flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="radio"
                          checked={paymentMethod === 'BILLING'}
                          onChange={() => setPaymentMethod('BILLING')}
                          className="accent-[#1E2C5E]"
                        />
                        <span>Buat Kode Billing (KAP 411126-200)</span>
                      </label>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* G. ANGSURAN PPh 25 & J. PERNYATAAN */}
            <div className="border border-slate-200 rounded overflow-hidden">
              <SectionBar id="secGJ" title="G. ANGSURAN PPh PASAL 25 & J. PERNYATAAN" />
              {!collapsed.secGJ && (
                <div className="p-4 space-y-3 bg-white">
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-2 items-center">
                    <label className="lg:col-span-8 text-slate-700">
                      Estimasi Angsuran PPh Pasal 25 Tahun Pajak Berikutnya (1/12 × Dasar Penghitungan)
                    </label>
                    <input
                      type="text"
                      readOnly
                      value={formatRp(Math.max(0, Math.round((calc.totalPphTerutang - calc.kreditPph22 - calc.kreditPph23 - calc.kreditPph24) / 12)))}
                      className="lg:col-span-4 text-right border border-slate-200 bg-slate-100 rounded px-2.5 py-1.5 font-mono-num font-semibold"
                    />
                  </div>
                  <label className="flex items-start gap-2.5 cursor-pointer pt-1">
                    <input
                      type="checkbox"
                      disabled={isReadOnly}
                      checked={declarationChecked}
                      onChange={(e) => setDeclarationChecked(e.target.checked)}
                      className="mt-0.5 accent-[#1E2C5E]"
                    />
                    <span className="text-slate-700 leading-relaxed">
                      Dengan menyadari segala akibat hukum, pengurus menyatakan bahwa data dalam SPT Tahunan PPh Badan beserta seluruh lampirannya telah diisi secara benar, lengkap, dan jelas.
                    </span>
                  </label>
                  <div className="bg-[#D8F1FD] border border-[#9CDDFB] text-[#0E4A6B] px-4 py-2.5 rounded flex items-center justify-between font-bold">
                    <span>Status SPT Badan : {statusSptLabel}</span>
                    <span className="font-mono-num">{formatRp(calc.pphKurangLebihBayar)}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ==================== TAB: L1 LAPORAN KEUANGAN & REKONSILIASI ==================== */}
        {tab === 'l1' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="border border-slate-200 rounded overflow-hidden">
              <SectionBar id="l1Lk" title="L1-A. LAPORAN LABA RUGI & NERACA KOMERSIAL" />
              {!collapsed.l1Lk && (
                <div className="p-4 space-y-2.5 bg-white">
                  {[
                    { key: 'peredaranBruto' as const, label: 'Peredaran Usaha / Omzet Bruto' },
                    { key: 'hpp' as const, label: 'Harga Pokok Penjualan (HPP)' },
                    { key: 'biayaUsaha' as const, label: 'Biaya Usaha / Operasional' },
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
                  <div className="flex justify-between pt-2 border-t border-slate-200 font-bold text-[#1E2C5E]">
                    <span>Laba / (Rugi) Bersih Komersial</span>
                    <span className="font-mono-num">{formatRp(calc.labaKomersial)}</span>
                  </div>

                  <div className="pt-3 border-t border-slate-200 space-y-2">
                    <div className="font-bold text-[#1E2C5E] uppercase text-[11px]">Ringkasan Neraca (Posisi Keuangan)</div>
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
              )}
            </div>

            <div className="border border-slate-200 rounded overflow-hidden">
              <SectionBar id="l1Rekon" title="L1-B. REKONSILIASI FISKAL (KOREKSI POSITIF & NEGATIF)" />
              {!collapsed.l1Rekon && (
                <div className="p-4 space-y-2.5 bg-white">
                  <div className="font-bold text-amber-900 bg-[#FEF5D4] border border-[#F7CA36] px-2.5 py-1 rounded">
                    Penyesuaian Fiskal Positif (Menambah Laba Fiskal)
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

                  <div className="font-bold text-[#0E4A6B] bg-[#D8F1FD] border border-[#9CDDFB] px-2.5 py-1 rounded mt-3">
                    Penyesuaian Fiskal Negatif (Mengurangi Laba Fiskal)
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

                  <div className="flex justify-between pt-2.5 mt-2 border-t-2 border-[#1E2C5E] font-extrabold text-[#1E2C5E]">
                    <span>Penghasilan Neto Fiskal</span>
                    <span className="font-mono-num">{formatRp(calc.penghasilanNetoFiskal)}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ==================== TAB: L2 DAFTAR KEPEMILIKAN ==================== */}
        {tab === 'l2' && (
          <div className="space-y-4">
            <div className="border border-slate-200 rounded overflow-hidden">
              <SectionBar id="l2A" title="L2-A. DAFTAR PEMEGANG SAHAM / PEMILIK MODAL & PENGURUS" />
              {!collapsed.l2A && (
                <div className="p-4 space-y-3 bg-white">
                  {!isReadOnly && (
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 bg-slate-50 p-3 border border-slate-200 rounded items-end">
                      <div className="sm:col-span-4">
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">Nama Pengurus / Pemegang Saham</label>
                        <input
                          type="text"
                          placeholder="Nama Lengkap"
                          value={newPengurus.nama}
                          onChange={(e) => setNewPengurus({ ...newPengurus, nama: e.target.value })}
                          className="w-full border border-slate-300 rounded px-2.5 py-1.5"
                        />
                      </div>
                      <div className="sm:col-span-3">
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">NIK / NPWP 16 Digit</label>
                        <input
                          type="text"
                          placeholder="16 Digit"
                          value={newPengurus.npwp}
                          onChange={(e) => setNewPengurus({ ...newPengurus, npwp: e.target.value })}
                          className="w-full border border-slate-300 rounded px-2.5 py-1.5 font-mono-num"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">Jabatan</label>
                        <input
                          type="text"
                          value={newPengurus.jabatan}
                          onChange={(e) => setNewPengurus({ ...newPengurus, jabatan: e.target.value })}
                          className="w-full border border-slate-300 rounded px-2.5 py-1.5"
                        />
                      </div>
                      <div className="sm:col-span-1">
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">Saham %</label>
                        <input
                          type="number"
                          value={newPengurus.sahamPersen}
                          onChange={(e) => setNewPengurus({ ...newPengurus, sahamPersen: Number(e.target.value) || 0 })}
                          className="w-full text-right border border-slate-300 rounded px-2 py-1.5 font-mono-num"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          if (!newPengurus.nama.trim()) return;
                          updateField('pengurus', [...calc.pengurus, newPengurus]);
                          setNewPengurus({ nama: '', npwp: '', jabatan: 'Direktur', sahamPersen: 0 });
                        }}
                        className="sm:col-span-2 inline-flex items-center justify-center gap-1 bg-[#1E2C5E] text-white font-bold px-3 py-1.5 rounded cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5 text-[#F7CA36]" /> Tambah
                      </button>
                    </div>
                  )}

                  <div className="overflow-x-auto">
                    <table className="w-full border border-slate-300 border-collapse text-[12px]">
                      <thead>
                        <tr className="bg-[#F7CA36] text-[#1E2C5E] font-bold">
                          <th className="px-3 py-2 text-left border-r border-[#E5B822]">Nama Pemegang Saham / Pengurus</th>
                          <th className="px-3 py-2 text-left border-r border-[#E5B822]">NIK / NPWP</th>
                          <th className="px-3 py-2 text-left border-r border-[#E5B822]">Jabatan</th>
                          <th className="px-3 py-2 text-right">Penyertaan Saham (%)</th>
                          {!isReadOnly && <th className="px-2 py-2 w-10" />}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {calc.pengurus.map((p, idx) => (
                          <tr key={idx}>
                            <td className="px-3 py-2 font-semibold">{p.nama}</td>
                            <td className="px-3 py-2 font-mono-num">{p.npwp}</td>
                            <td className="px-3 py-2">{p.jabatan}</td>
                            <td className="px-3 py-2 text-right font-mono-num font-bold">{p.sahamPersen}%</td>
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
                </div>
              )}
            </div>

            <div className="border border-slate-200 rounded overflow-hidden">
              <SectionBar id="l2B" title="L2-B. DAFTAR PENYERTAAN MODAL PADA PERUSAHAAN AFILIASI" />
              {!collapsed.l2B && (
                <div className="p-4 bg-white">
                  <table className="w-full border border-slate-300 border-collapse text-[12px]">
                    <thead>
                      <tr className="bg-[#F7CA36] text-[#1E2C5E] font-bold">
                        <th className="px-3 py-2 text-left border-r border-[#E5B822]">NPWP Perusahaan Afiliasi</th>
                        <th className="px-3 py-2 text-left border-r border-[#E5B822]">Nama Perusahaan</th>
                        <th className="px-3 py-2 text-right">Nilai Penyertaan Modal (Rp)</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td colSpan={3} className="px-3 py-4 text-center text-slate-400">
                          Tidak ada penyertaan modal pada perusahaan afiliasi.
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ==================== TAB: L3 KREDIT PAJAK ==================== */}
        {tab === 'l3' && (
          <div className="border border-slate-200 rounded overflow-hidden max-w-2xl">
            <SectionBar id="l3" title="L3. KREDIT PAJAK DALAM NEGERI, LUAR NEGERI & PPh PASAL 25" />
            {!collapsed.l3 && (
              <div className="p-4 space-y-3 bg-white">
                {[
                  { key: 'kreditPph22' as const, label: 'Kredit Pajak PPh Pasal 22 (Impor / Bendaharawan)' },
                  { key: 'kreditPph23' as const, label: 'Kredit Pajak PPh Pasal 23 (Bukti Potong Jasa / Sewa)' },
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
                      className="w-52 text-right border border-slate-300 rounded px-3 py-1.5 font-mono-num"
                    />
                  </div>
                ))}
                <div className="flex justify-between pt-3 border-t-2 border-[#1E2C5E] font-extrabold text-[#1E2C5E]">
                  <span>TOTAL KREDIT PAJAK BADAN</span>
                  <span className="font-mono-num">{formatRp(calc.totalKreditPajak)}</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ==================== TAB: L11-B BIAYA PINJAMAN (EBITDA & DER) ==================== */}
        {tab === 'l11b' && (
          <div className="space-y-4">
            <div className="bg-[#D8F1FD] border border-[#9CDDFB] text-[#0E4A6B] px-4 py-2.5 rounded">
              <strong>LAMPIRAN L11-B — PENGHITUNGAN BIAYA PINJAMAN:</strong> Analisis batas pembebanan biaya pinjaman berdasarkan perbandingan Utang terhadap Modal (DER maksimal 4:1) serta simulasi rasio EBITDA fiskal.
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="border border-slate-200 rounded overflow-hidden">
                <SectionBar id="l11Ebitda" title="I. PERHITUNGAN EBITDA FISKAL" />
                {!collapsed.l11Ebitda && (
                  <div className="p-4 space-y-2.5 bg-white">
                    <div className="flex justify-between">
                      <span>Penghasilan Neto Fiskal (L1)</span>
                      <span className="font-mono-num font-semibold">{formatRp(calc.penghasilanNetoFiskal)}</span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <label>Biaya Bunga Pinjaman Komersial</label>
                      <input
                        type="number"
                        disabled={isReadOnly}
                        value={biayaBungaPinjaman}
                        onChange={(e) => setBiayaBungaPinjaman(Number(e.target.value) || 0)}
                        className="w-44 text-right border border-slate-300 rounded px-2.5 py-1 font-mono-num"
                      />
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <label>Beban Penyusutan &amp; Amortisasi</label>
                      <input
                        type="number"
                        disabled={isReadOnly}
                        value={bebanPenyusutanAmortisasi}
                        onChange={(e) => setBebanPenyusutanAmortisasi(Number(e.target.value) || 0)}
                        className="w-44 text-right border border-slate-300 rounded px-2.5 py-1 font-mono-num"
                      />
                    </div>
                    <div className="flex justify-between pt-2 border-t border-slate-200 font-bold text-[#1E2C5E]">
                      <span>EBITDA Fiskal</span>
                      <span className="font-mono-num">{formatRp(ebitdaFiskal)}</span>
                    </div>
                    <div className="flex justify-between text-emerald-700 font-semibold">
                      <span>Batas Biaya Pinjaman (25% × EBITDA)</span>
                      <span className="font-mono-num">{formatRp(batasBiayaPinjaman25)}</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="border border-slate-200 rounded overflow-hidden">
                <SectionBar id="l11Der" title="II. PERBANDINGAN UTANG DAN MODAL (DER)" />
                {!collapsed.l11Der && (
                  <div className="p-4 space-y-2.5 bg-white">
                    <div className="flex justify-between">
                      <span>Saldo Rata-Rata Utang (Neraca L1)</span>
                      <span className="font-mono-num font-semibold">{formatRp(calc.totalKewajiban)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Saldo Rata-Rata Modal / Ekuitas (Neraca L1)</span>
                      <span className="font-mono-num font-semibold">{formatRp(calc.totalEkuitas)}</span>
                    </div>
                    <div className="flex justify-between pt-2 border-t border-slate-200 font-extrabold text-[#1E2C5E]">
                      <span>Rasio DER (Utang : Modal)</span>
                      <span className="font-mono-num">{derRatio.toFixed(2)} : 1</span>
                    </div>
                    <div
                      className={`px-3 py-2 rounded font-semibold text-[11px] ${
                        derRatio <= 4
                          ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                          : 'bg-amber-50 border border-amber-200 text-amber-800'
                      }`}
                    >
                      {derRatio <= 4
                        ? 'Memenuhi rasio DER maksimal 4:1 — seluruh biaya pinjaman dapat dibebankan secara fiskal.'
                        : 'Melebihi rasio DER 4:1 — sebagian biaya pinjaman harus dikoreksi fiskal positif.'}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Action Bar */}
      <div className="px-5 py-3.5 bg-[#F8FAFC] border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={onBack}
          className="px-4 py-2 rounded border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 font-semibold text-[12px] cursor-pointer"
        >
          Pergi ke pencarian
        </button>
        {!isReadOnly && (
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              disabled={saving}
              onClick={handleSaveDraft}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded bg-[#1E2C5E] hover:bg-[#152048] text-white font-bold text-[12px] cursor-pointer disabled:opacity-60"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{saving ? 'Menyimpan...' : 'Simpan Konsep'}</span>
            </button>
            <button
              type="button"
              disabled={saving || !declarationChecked}
              onClick={handleOpenSign}
              className="inline-flex items-center gap-1.5 px-5 py-2 rounded bg-[#F7CA36] hover:bg-[#E5B822] text-[#1E2C5E] font-extrabold text-[12px] cursor-pointer disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Bayar dan Lapor</span>
            </button>
          </div>
        )}
      </div>

      <SignModal
        open={signOpen}
        title="Tanda Tangan Dokumen"
        description={`Penyampaian SPT Tahunan PPh Badan Tahun ${taxReturn.taxYear} · PPh Terutang ${formatRp(
          calc.totalPphTerutang
        )} · ${statusSptLabel}: ${formatRp(calc.pphKurangLebihBayar)}.`}
        signerName={activeTaxpayer.name}
        signerNik={activeTaxpayer.nikNpwp}
        confirmLabel="Konfirmasi Tanda Tangan"
        onClose={() => setSignOpen(false)}
        onConfirm={async () => {
          await onSubmit(taxReturn.id, calc.pphKurangLebihBayar > 0 ? paymentMethod : 'NONE');
          onBack();
        }}
      />
    </div>
  );
};
