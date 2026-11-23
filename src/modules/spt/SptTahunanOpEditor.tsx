import React, { useState } from 'react';
import {
  ChevronDown,
  ChevronRight,
  Info,
  Plus,
  RefreshCw,
  Save,
  Send,
  Settings,
  Trash2,
} from 'lucide-react';
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
import { CoretaxIconToolbar, downloadCsvFile } from '../../components/CoretaxTableChrome.tsx';

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

type OpTab = 'induk' | 'l1' | 'l2';

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
  const [tab, setTab] = useState<OpTab>('induk');
  const [payload, setPayload] = useState<SptTahunanOpPayload>(taxReturn.payload as SptTahunanOpPayload);
  const [paymentMethod, setPaymentMethod] = useState<'DEPOSIT' | 'BILLING'>('DEPOSIT');
  const [noticeOpen, setNoticeOpen] = useState(false);
  const [signOpen, setSignOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [postBanner, setPostBanner] = useState<string | null>(null);
  const [declarationChecked, setDeclarationChecked] = useState(true);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  // L-1 Modal & Add Record State (matches PDF 1 Page 6-8)
  const [assetModalTitle, setAssetModalTitle] = useState<string | null>(null);
  const [newRecType, setNewRecType] = useState<'ASSET' | 'LIABILITY' | 'FAMILY'>('ASSET');
  const [newCode, setNewCode] = useState('0102');
  const [newDesc, setNewDesc] = useState('Tabungan (Bank/Lembaga Keuangan)');
  const [newAccountNo, setNewAccountNo] = useState('1234567890');
  const [newBankName, setNewBankName] = useState('PT BANK CENTRAL ASIA TBK');
  const [newLocation, setNewLocation] = useState('Indonesia');
  const [newYear, setNewYear] = useState(taxReturn.taxYear);
  const [newAmount, setNewAmount] = useState(50_000_000);
  const [newRel, setNewRel] = useState('Harta Pribadi');

  // Quick Add L-2 record
  const [newFinalJenis, setNewFinalJenis] = useState('Bunga Deposito / Tabungan Bank (20%)');
  const [newFinalDpp, setNewFinalDpp] = useState(12_000_000);
  const [newFinalPph, setNewFinalPph] = useState(2_400_000);
  const [newNonObjJenis, setNewNonObjJenis] = useState('Hibah / Bantuan Keluarga Sedarah');
  const [newNonObjAmt, setNewNonObjAmt] = useState(25_000_000);

  const isReadOnly = taxReturn.status !== 'DRAFT';
  const toggleSection = (key: string) => setCollapsed((p) => ({ ...p, [key]: !p[key] }));

  const exactYearBpa1Slips = workspace.slips.filter(
    (s) => s.slipType === 'BPA1' && s.status === 'ISSUED' && s.taxPeriodYear === taxReturn.taxYear
  );
  const bpa1Slips =
    exactYearBpa1Slips.length > 0
      ? exactYearBpa1Slips
      : workspace.slips.filter((s) => s.slipType === 'BPA1' && s.status === 'ISSUED');

  // Live OP calculation (UU HPP)
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

  const statusSptLabel =
    kurangLebih > 0 ? 'Kurang Bayar' : kurangLebih < 0 ? 'Lebih Bayar' : 'Nihil';

  const handlePostingSpt = () => {
    const bruto = bpa1Slips.reduce((s, x) => s + x.grossAmount, 0);
    const biayaJab = bpa1Slips.reduce(
      (s, x) => s + (x.positionAllowance || 0) + (x.pensionContribution || 0),
      0
    );
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
      `Posting SPT berhasil menarik ${bpa1Slips.length} Bukti Potong BPA1 (Bruto ${formatRp(
        bruto
      )}, Neto ${formatRp(Math.max(0, bruto - biayaJab))}, Kredit PPh ${formatRp(
        kredit
      )}) ke Induk dan Lampiran L-1.`
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

  const handleSaveDraft = async () => {
    setSaving(true);
    try {
      await onSave(buildUpdated());
    } finally {
      setSaving(false);
    }
  };

  const handlePrepareSubmit = async () => {
    setSaving(true);
    try {
      await onSave(buildUpdated());
      setNoticeOpen(true);
    } finally {
      setSaving(false);
    }
  };

  const assetList = workspace.assets.filter((a) => a.recordType === 'ASSET');
  const liabList = workspace.assets.filter((a) => a.recordType === 'LIABILITY');
  const familyList = workspace.assets.filter((a) => a.recordType === 'FAMILY');
  const totalHarta = assetList.reduce((s, a) => s + a.amount, 0);
  const totalUtang = liabList.reduce((s, a) => s + a.amount, 0);

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

  const RadioYesNo: React.FC<{
    value: boolean;
    onChange: (val: boolean) => void;
    hintYes?: string;
    hintNo?: string;
    numLabel?: string;
  }> = ({ value, onChange, hintYes, hintNo, numLabel }) => (
    <div className="flex flex-wrap items-center gap-2.5">
      <label className="inline-flex items-center gap-1.5 cursor-pointer text-[11.5px] font-medium text-slate-800">
        <input
          type="radio"
          disabled={isReadOnly}
          checked={value === true}
          onChange={() => onChange(true)}
          className="accent-[#1E2C5E]"
        />
        <span>{numLabel ? '1.Ya' : 'Ya'}</span>
      </label>
      <label className="inline-flex items-center gap-1.5 cursor-pointer text-[11.5px] font-medium text-slate-800">
        <input
          type="radio"
          disabled={isReadOnly}
          checked={value === false}
          onChange={() => onChange(false)}
          className="accent-[#1E2C5E]"
        />
        <span>{numLabel ? '2.No' : 'Tidak'}</span>
      </label>
      {value && hintYes && (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-[4px] bg-[#BCE3FA] text-[#0E4A6B] text-[11px] font-medium">
          <Info className="w-3.5 h-3.5 shrink-0" />
          <span>{hintYes}</span>
        </span>
      )}
      {!value && hintNo && (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-[4px] bg-[#BCE3FA] text-[#0E4A6B] text-[11px] font-medium">
          <Info className="w-3.5 h-3.5 shrink-0" />
          <span>{hintNo}</span>
        </span>
      )}
    </div>
  );

  return (
    <div className="bg-white border border-[#D9E0E8] rounded-md overflow-hidden shadow-xs">
      {/* Top Coretax Document Title Bar */}
      <div className="px-5 pt-4 pb-3 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display font-medium text-[17px] text-[#1E2C5E] uppercase tracking-tight">
            SPT TAHUNAN PAJAK PENGHASILAN (PPh) WAJIB PAJAK ORANG PRIBADI
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-[4px] bg-[#64748B] text-white text-[11px] font-semibold">
            <Settings className="w-3.5 h-3.5" />
            <span>XML Monitoring</span>
          </span>
        </div>
      </div>

      {/* Horizontal Coretax Tabs */}
      <div className="px-5 pt-2.5 bg-white border-b border-slate-200 flex items-center gap-1.5 overflow-x-auto">
        {[
          { id: 'induk' as OpTab, label: 'Induk' },
          { id: 'l1' as OpTab, label: 'L-1' },
          { id: 'l2' as OpTab, label: 'L-2' },
        ].map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`px-4 py-1.5 text-[11.5px] font-semibold rounded-t border-b-2 whitespace-nowrap cursor-pointer transition-colors ${
              tab === t.id
                ? 'bg-[#E8F1FA] text-[#1D4ED8] border-b-[#2563EB]'
                : 'bg-transparent text-slate-600 border-b-transparent hover:bg-slate-100'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="p-5 space-y-4 text-[11.5px]">
        {postBanner && (
          <div className="bg-[#D8F1FD] border border-[#9CDDFB] text-[#0E4A6B] px-4 py-2.5 rounded flex items-center justify-between gap-2">
            <span className="font-medium">{postBanner}</span>
            <button
              type="button"
              onClick={() => setPostBanner(null)}
              className="text-xs font-bold underline cursor-pointer"
            >
              Tutup
            </button>
          </div>
        )}

        {/* ==================== TAB: INDUK ==================== */}
        {tab === 'induk' && (
          <div className="space-y-3">
            {/* HEADER (Exact Match to PDF 1 Page 4) */}
            <div className="border border-slate-200 rounded overflow-hidden">
              <SectionBar id="header" title="HEADER" />
              {!collapsed.header && (
                <div className="p-4 space-y-3 bg-white">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="grid grid-cols-12 items-center gap-2">
                      <label className="col-span-5 text-slate-600">Tahun Pajak/Bagian Tahun Pajak</label>
                      <input
                        type="text"
                        readOnly
                        value={String(taxReturn.taxYear)}
                        className="col-span-7 border border-[#DCE2EC] bg-[#EDF1F7] rounded-[3px] px-2.5 py-1.5 font-mono-num text-slate-700"
                      />
                    </div>
                    <div className="grid grid-cols-12 items-center gap-2">
                      <label className="col-span-4 text-slate-600">Status</label>
                      <select
                        disabled
                        value={taxReturn.revisionNo === 0 ? 'Normal' : 'Pembetulan'}
                        className="col-span-8 border border-[#DCE2EC] bg-[#EDF1F7] rounded-[3px] px-2.5 py-1.5 text-slate-700"
                      >
                        <option value="Normal">Normal</option>
                        <option value="Pembetulan">Pembetulan</option>
                      </select>
                    </div>
                    <div className="grid grid-cols-12 items-center gap-2">
                      <label className="col-span-5 text-slate-600">Metode Pembukuan/Pencatatan</label>
                      <select
                        disabled={isReadOnly}
                        defaultValue="Pencatatan"
                        className="col-span-7 border border-[#22C55E] bg-white rounded-[3px] px-2.5 py-1.5 text-slate-700"
                      >
                        <option value="Pencatatan">Pencatatan</option>
                        <option value="Pembukuan">Pembukuan</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                    <div className="grid grid-cols-12 items-center gap-2">
                      <label className="col-span-5 text-slate-600">Periode Pembukuan</label>
                      <div className="col-span-7 grid grid-cols-2 gap-2">
                        <input
                          type="text"
                          readOnly
                          value="1"
                          className="border border-[#DCE2EC] bg-[#EDF1F7] rounded-[3px] px-2.5 py-1.5 font-mono-num text-slate-700"
                        />
                        <input
                          type="text"
                          readOnly
                          value="12"
                          className="border border-[#DCE2EC] bg-[#EDF1F7] rounded-[3px] px-2.5 py-1.5 font-mono-num text-slate-700"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-12 items-center gap-2">
                      <label className="col-span-4 text-slate-600">
                        Sumber Penghasilan <span className="text-rose-600">*</span>
                      </label>
                      <select
                        disabled={isReadOnly}
                        value={payload.sumberPenghasilanUsaha ? 'Usaha' : 'Pekerjaan'}
                        onChange={(e) =>
                          setPayload({
                            ...payload,
                            sumberPenghasilanUsaha: e.target.value === 'Usaha',
                          })
                        }
                        className="col-span-8 border border-[#22C55E] bg-white rounded-[3px] px-2.5 py-1.5 text-slate-700"
                      >
                        <option value="Pekerjaan">Pekerjaan</option>
                        <option value="Usaha">Kegiatan Usaha / Pekerjaan Bebas</option>
                      </select>
                    </div>
                  </div>

                  {!isReadOnly && (
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-2 pt-1">
                      <div className="md:col-span-2" />
                      <div className="md:col-span-10 space-y-1">
                        <button
                          type="button"
                          onClick={handlePostingSpt}
                          className="inline-flex items-center gap-1.5 bg-[#388E3C] hover:bg-[#2E7D32] text-white font-bold text-[11.5px] px-4 py-1.5 rounded-[4px] cursor-pointer shadow-xs"
                        >
                          <span>Posting SPT</span>
                        </button>
                        <p className="text-[10.5px] text-slate-500 leading-relaxed max-w-xl">
                          Klik tombol &quot;Posting SPT&quot; untuk menyinkronkan data perpajakan Anda (Harta, Utang, Daftar Anggota Keluarga, Bukti Potong PPh, Pembayaran, dan lainnya).{' '}
                          {payload.postedSlipIds?.length
                            ? `Tersinkronisasi (${payload.postedSlipIds.length} Bukti Potong)`
                            : 'Posting belum pernah dilakukan'}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* A. IDENTITAS WAJIB PAJAK (Exact 8 Numbered Rows from PDF 1 Page 4) */}
            <div className="border border-slate-200 rounded overflow-hidden">
              <SectionBar id="secA" title="A. IDENTITAS WAJIB PAJAK" />
              {!collapsed.secA && (
                <div className="p-4 space-y-2 bg-white max-w-4xl">
                  {[
                    { label: '1. NIK/NPWP *', val: activeTaxpayer.nikNpwp, mono: true },
                    { label: '2. NAMA *', val: activeTaxpayer.name, mono: false },
                    { label: '3. JENIS ID *', val: 'KTP / NIK', mono: false },
                    { label: '4. NO. ID *', val: activeTaxpayer.nikNpwp, mono: true },
                    { label: '5. NO. TELEPON *', val: activeTaxpayer.phone || '081200001945', mono: true },
                    { label: '6. EMAIL *', val: activeTaxpayer.email, mono: false },
                  ].map((row) => (
                    <div key={row.label} className="grid grid-cols-12 items-center gap-2">
                      <label className="col-span-4 text-slate-600 text-[11px]">{row.label}</label>
                      <input
                        type="text"
                        readOnly
                        value={row.val}
                        className={`col-span-8 border border-[#DCE2EC] bg-[#EDF1F7] rounded-[3px] px-2.5 py-1.5 text-slate-700 ${
                          row.mono ? 'font-mono-num' : ''
                        }`}
                      />
                    </div>
                  ))}
                  <div className="grid grid-cols-12 items-center gap-2">
                    <label className="col-span-4 text-slate-600 text-[11px]">
                      7. STATUS KEWAJIBAN PERPAJAKAN SUAMI DAN ISTRI (Isi jika status adalah PH/MT)
                    </label>
                    <select
                      disabled={isReadOnly}
                      defaultValue=""
                      className="col-span-8 border border-[#CBD5E1] bg-white rounded-[3px] px-2.5 py-1.5 text-slate-600"
                    >
                      <option value="">Silakan Pilih</option>
                      <option value="KK">KK — Kepala Keluarga</option>
                      <option value="HB">HB — Hidup Berpisah</option>
                      <option value="PH">PH — Pisah Harta</option>
                      <option value="MT">MT — Memilih Terpisah</option>
                    </select>
                  </div>
                  <div className="grid grid-cols-12 items-center gap-2">
                    <label className="col-span-4 text-slate-600 text-[11px]">
                      8. NIK/NPWP SUAMI/ISTRI
                    </label>
                    <input
                      type="text"
                      readOnly
                      value=""
                      placeholder="-"
                      className="col-span-8 border border-[#DCE2EC] bg-[#EDF1F7] rounded-[3px] px-2.5 py-1.5 font-mono-num text-slate-500"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* B. IKHTISAR PENGHASILAN NETO */}
            <div className="border border-slate-200 rounded overflow-hidden">
              <SectionBar id="secB" title="B. IKHTISAR PENGHASILAN NETO" />
              {!collapsed.secB && (
                <div className="p-4 space-y-2.5 bg-white">
                  {[
                    {
                      no: '1a',
                      q: 'Apakah Anda menerima penghasilan dalam negeri dari pekerjaan? *',
                      val: payload.sumberPenghasilanPekerjaan,
                      setVal: (v: boolean) => setPayload({ ...payload, sumberPenghasilanPekerjaan: v }),
                      yesText: 'Ya, silahkan mengisi lampiran I Bagian D',
                      noText: 'Tidak, lanjutkan ke pertanyaan 1.b.1',
                      amt: netoPekerjaan,
                      onAmt: (n: number) =>
                        setPayload({
                          ...payload,
                          penghasilanBrutoPekerjaan: n + payload.biayaJabatanPensiun,
                        }),
                    },
                    {
                      no: '1.b.1.',
                      q: 'Apakah Anda menerima penghasilan dalam negeri dari usaha dan/atau pekerjaan bebas? *',
                      val: payload.sumberPenghasilanUsaha,
                      setVal: (v: boolean) => setPayload({ ...payload, sumberPenghasilanUsaha: v }),
                      yesText: 'Ya, isikan nilai penghasilan neto usaha',
                      noText: 'Tidak, lanjutkan ke pertanyaan 1c',
                      amt: payload.penghasilanNetoUsaha,
                      onAmt: (n: number) => setPayload({ ...payload, penghasilanNetoUsaha: n }),
                    },
                    {
                      no: '1c',
                      q: 'Apakah Anda menerima penghasilan dalam negeri lainnya? *',
                      val: payload.penghasilanNetoDalamNegeriLain > 0,
                      setVal: (v: boolean) =>
                        setPayload({ ...payload, penghasilanNetoDalamNegeriLain: v ? 10_000_000 : 0 }),
                      yesText: 'Ya, isikan penghasilan dalam negeri lainnya',
                      noText: 'Tidak, lanjutkan ke pertanyaan 1d',
                      amt: payload.penghasilanNetoDalamNegeriLain,
                      onAmt: (n: number) => setPayload({ ...payload, penghasilanNetoDalamNegeriLain: n }),
                    },
                    {
                      no: '1d',
                      q: 'Apakah Anda menerima penghasilan luar negeri? *',
                      val: payload.penghasilanNetoLuarNegeri > 0,
                      setVal: (v: boolean) =>
                        setPayload({ ...payload, penghasilanNetoLuarNegeri: v ? 10_000_000 : 0 }),
                      yesText: 'Ya, silahkan mengisi lampiran 2 Bagian C',
                      noText: 'Tidak, silahkan lanjut pertanyaan berikutnya',
                      amt: payload.penghasilanNetoLuarNegeri,
                      onAmt: (n: number) => setPayload({ ...payload, penghasilanNetoLuarNegeri: n }),
                    },
                  ].map((r) => (
                    <div
                      key={r.no}
                      className="grid grid-cols-1 lg:grid-cols-12 gap-2 items-center pb-2 border-b border-slate-100"
                    >
                      <div className="lg:col-span-5 flex items-center gap-2">
                        <span className="px-2 py-1 rounded bg-[#EDF1F7] border border-[#DCE2EC] font-mono-num text-[11px] text-slate-700 shrink-0 min-w-[38px] text-center">
                          {r.no}
                        </span>
                        <span className="text-slate-700">{r.q}</span>
                      </div>
                      <div className="lg:col-span-5">
                        <RadioYesNo
                          value={r.val}
                          onChange={r.setVal}
                          hintYes={r.yesText}
                          hintNo={r.noText}
                        />
                      </div>
                      <div className="lg:col-span-2">
                        <input
                          type="number"
                          disabled={isReadOnly || !r.val}
                          value={r.amt}
                          onChange={(e) => r.onAmt(Number(e.target.value) || 0)}
                          className="w-full text-right border border-[#DCE2EC] bg-[#EDF1F7] enabled:bg-white rounded-[3px] px-2.5 py-1.5 font-mono-num text-slate-700"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* C. PERHITUNGAN PAJAK TERUTANG */}
            <div className="border border-slate-200 rounded overflow-hidden">
              <SectionBar id="secC" title="C. PERHITUNGAN PAJAK TERUTANG" />
              {!collapsed.secC && (
                <div className="p-4 space-y-2 bg-white">
                  {/* Row 2 */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-2 items-center pb-1.5 border-b border-slate-100">
                    <div className="lg:col-span-10 flex items-center gap-2">
                      <span className="px-2 py-1 rounded bg-[#EDF1F7] border border-[#DCE2EC] font-mono-num text-[11px] text-slate-700 min-w-[38px] text-center">
                        2
                      </span>
                      <span className="text-slate-700">Penghasilan neto setahun (1a+1b+1c+1d)</span>
                    </div>
                    <input
                      type="text"
                      readOnly
                      value={totalNeto.toLocaleString('id-ID')}
                      className="lg:col-span-2 text-right border border-[#DCE2EC] bg-[#EDF1F7] rounded-[3px] px-2.5 py-1.5 font-mono-num text-slate-700"
                    />
                  </div>

                  {/* Row 3 */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-2 items-center pb-1.5 border-b border-slate-100">
                    <div className="lg:col-span-5 flex items-center gap-2">
                      <span className="px-2 py-1 rounded bg-[#EDF1F7] border border-[#DCE2EC] font-mono-num text-[11px] text-slate-700 min-w-[38px] text-center">
                        3
                      </span>
                      <span className="text-slate-700">
                        Apakah terdapat pengurang penghasilan neto (kompensasi kerugian / zakat keagamaan wajib)? *
                      </span>
                    </div>
                    <div className="lg:col-span-5">
                      <RadioYesNo
                        value={payload.zakatSumbangan > 0}
                        onChange={(v) => setPayload({ ...payload, zakatSumbangan: v ? 2_500_000 : 0 })}
                        hintYes="Ya, isikan nominal zakat/pengurang"
                        hintNo="Tidak, silahkan lanjut pertanyaan berikutnya"
                      />
                    </div>
                    <input
                      type="number"
                      disabled={isReadOnly}
                      value={payload.zakatSumbangan}
                      onChange={(e) => setPayload({ ...payload, zakatSumbangan: Number(e.target.value) || 0 })}
                      className="lg:col-span-2 text-right border border-[#DCE2EC] bg-[#EDF1F7] enabled:bg-white rounded-[3px] px-2.5 py-1.5 font-mono-num"
                    />
                  </div>

                  {/* Row 4 */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-2 items-center pb-1.5 border-b border-slate-100">
                    <div className="lg:col-span-10 flex items-center gap-2">
                      <span className="px-2 py-1 rounded bg-[#EDF1F7] border border-[#DCE2EC] font-mono-num text-[11px] text-slate-700 min-w-[38px] text-center">
                        4
                      </span>
                      <span className="text-slate-700">Penghasilan neto setelah pengurang penghasilan neto (2-3)</span>
                    </div>
                    <input
                      type="text"
                      readOnly
                      value={netoSetelahZakat.toLocaleString('id-ID')}
                      className="lg:col-span-2 text-right border border-[#DCE2EC] bg-[#EDF1F7] rounded-[3px] px-2.5 py-1.5 font-mono-num text-slate-700"
                    />
                  </div>

                  {/* Row 5 */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-2 items-center pb-1.5 border-b border-slate-100">
                    <div className="lg:col-span-6 flex items-center gap-2">
                      <span className="px-2 py-1 rounded bg-[#EDF1F7] border border-[#DCE2EC] font-mono-num text-[11px] text-slate-700 min-w-[38px] text-center">
                        5
                      </span>
                      <span className="text-slate-700">Penghasilan Tidak Kena Pajak</span>
                    </div>
                    <div className="lg:col-span-4">
                      <select
                        disabled={isReadOnly}
                        value={payload.statusPtkp}
                        onChange={(e) => setPayload({ ...payload, statusPtkp: e.target.value as PtkpStatus })}
                        className="w-full border border-[#CBD5E1] rounded-[3px] px-2.5 py-1.5 bg-white font-semibold text-slate-700"
                      >
                        {(Object.keys(PTKP_VALUES) as PtkpStatus[]).map((k) => (
                          <option key={k} value={k}>
                            {k}
                          </option>
                        ))}
                      </select>
                    </div>
                    <input
                      type="text"
                      readOnly
                      value={ptkpAmount.toLocaleString('id-ID')}
                      className="lg:col-span-2 text-right border border-[#DCE2EC] bg-[#EDF1F7] rounded-[3px] px-2.5 py-1.5 font-mono-num text-slate-700"
                    />
                  </div>

                  {/* Row 6 & 7 */}
                  {[
                    { no: '6', lbl: 'Penghasilan Kena Pajak (4-5)', val: pkpAmount },
                    { no: '7', lbl: 'PPh Terutang', val: pphTerutang },
                  ].map((r) => (
                    <div
                      key={r.no}
                      className="grid grid-cols-1 lg:grid-cols-12 gap-2 items-center pb-1.5 border-b border-slate-100"
                    >
                      <div className="lg:col-span-10 flex items-center gap-2">
                        <span className="px-2 py-1 rounded bg-[#EDF1F7] border border-[#DCE2EC] font-mono-num text-[11px] text-slate-700 min-w-[38px] text-center">
                          {r.no}
                        </span>
                        <span className="text-slate-700">{r.lbl}</span>
                      </div>
                      <input
                        type="text"
                        readOnly
                        value={r.val.toLocaleString('id-ID')}
                        className="lg:col-span-2 text-right border border-[#DCE2EC] bg-[#EDF1F7] rounded-[3px] px-2.5 py-1.5 font-mono-num text-slate-700"
                      />
                    </div>
                  ))}

                  {/* Row 8 */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-2 items-center pb-1.5 border-b border-slate-100">
                    <div className="lg:col-span-5 flex items-center gap-2">
                      <span className="px-2 py-1 rounded bg-[#EDF1F7] border border-[#DCE2EC] font-mono-num text-[11px] text-slate-700 min-w-[38px] text-center">
                        8
                      </span>
                      <span className="text-slate-700">Apakah terdapat pengurang PPh Terutang? *</span>
                    </div>
                    <div className="lg:col-span-5">
                      <RadioYesNo
                        value={false}
                        onChange={() => {}}
                        hintNo="Tidak, silahkan lanjut pertanyaan berikutnya"
                      />
                    </div>
                    <div className="lg:col-span-2" />
                  </div>

                  {/* Row 9 */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-2 items-center">
                    <div className="lg:col-span-10 flex items-center gap-2">
                      <span className="px-2 py-1 rounded bg-[#EDF1F7] border border-[#DCE2EC] font-mono-num text-[11px] text-slate-700 min-w-[38px] text-center">
                        9
                      </span>
                      <span className="text-slate-700">PPh Terutang setelah pengurang PPh Terutang (7-8)</span>
                    </div>
                    <input
                      type="text"
                      readOnly
                      value={pphTerutang.toLocaleString('id-ID')}
                      className="lg:col-span-2 text-right border border-[#DCE2EC] bg-[#EDF1F7] rounded-[3px] px-2.5 py-1.5 font-mono-num text-slate-700"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* D. KREDIT PAJAK */}
            <div className="border border-slate-200 rounded overflow-hidden">
              <SectionBar id="secD" title="D. KREDIT PAJAK" />
              {!collapsed.secD && (
                <div className="p-4 space-y-2 bg-white">
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-2 items-center pb-1.5 border-b border-slate-100">
                    <div className="lg:col-span-5 flex items-center gap-2">
                      <span className="px-2 py-1 rounded bg-[#EDF1F7] border border-[#DCE2EC] font-mono-num text-[11px] text-slate-700 min-w-[38px] text-center">
                        10a
                      </span>
                      <span className="text-slate-700">
                        Apakah terdapat PPh yang telah dipotong/dipungut oleh pihak lain? *
                      </span>
                    </div>
                    <div className="lg:col-span-5">
                      <RadioYesNo
                        value={payload.kreditPajakBpa1 > 0 || payload.sumberPenghasilanPekerjaan}
                        onChange={(v) => setPayload({ ...payload, kreditPajakBpa1: v ? payload.kreditPajakBpa1 : 0 })}
                        hintYes="Ya, silahkan mengisi lampiran 1 Bagian E"
                        hintNo="Tidak, lanjutkan ke pertanyaan berikutnya"
                      />
                    </div>
                    <input
                      type="number"
                      disabled={isReadOnly}
                      value={payload.kreditPajakBpa1}
                      onChange={(e) => setPayload({ ...payload, kreditPajakBpa1: Number(e.target.value) || 0 })}
                      className="lg:col-span-2 text-right border border-[#DCE2EC] bg-[#EDF1F7] enabled:bg-white rounded-[3px] px-2.5 py-1.5 font-mono-num"
                    />
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-2 items-center pb-1.5 border-b border-slate-100">
                    <div className="lg:col-span-10 flex items-center gap-2">
                      <span className="px-2 py-1 rounded bg-[#EDF1F7] border border-[#DCE2EC] font-mono-num text-[11px] text-slate-700 min-w-[38px] text-center">
                        10b
                      </span>
                      <span className="text-slate-700">Angsuran PPh Pasal 25</span>
                    </div>
                    <input
                      type="number"
                      disabled={isReadOnly}
                      value={payload.angsuranPph25}
                      onChange={(e) => setPayload({ ...payload, angsuranPph25: Number(e.target.value) || 0 })}
                      className="lg:col-span-2 text-right border border-[#DCE2EC] bg-[#EDF1F7] enabled:bg-white rounded-[3px] px-2.5 py-1.5 font-mono-num"
                    />
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-2 items-center pb-1.5 border-b border-slate-100">
                    <div className="lg:col-span-10 flex items-center gap-2">
                      <span className="px-2 py-1 rounded bg-[#EDF1F7] border border-[#DCE2EC] font-mono-num text-[11px] text-slate-700 min-w-[38px] text-center">
                        10c
                      </span>
                      <span className="text-slate-700">STP PPh Pasal 25 (Hanya pokok pajak)</span>
                    </div>
                    <input
                      type="text"
                      readOnly
                      value="0"
                      className="lg:col-span-2 text-right border border-[#DCE2EC] bg-[#EDF1F7] rounded-[3px] px-2.5 py-1.5 font-mono-num text-slate-700"
                    />
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-2 items-center">
                    <div className="lg:col-span-5 flex items-center gap-2">
                      <span className="px-2 py-1 rounded bg-[#EDF1F7] border border-[#DCE2EC] font-mono-num text-[11px] text-slate-700 min-w-[38px] text-center">
                        10d
                      </span>
                      <span className="text-slate-700">
                        Apakah Anda menerima pengembalian/pengurangan kredit PPh luar negeri yang telah dikreditkan? *
                      </span>
                    </div>
                    <div className="lg:col-span-5">
                      <RadioYesNo
                        value={false}
                        onChange={() => {}}
                        hintNo="Tidak, lanjutkan ke pertanyaan berikutnya"
                      />
                    </div>
                    <div className="lg:col-span-2" />
                  </div>
                </div>
              )}
            </div>

            {/* E. PPh KURANG/LEBIH BAYAR */}
            <div className="border border-slate-200 rounded overflow-hidden">
              <SectionBar id="secE" title="E. PPh KURANG/LEBIH BAYAR" />
              {!collapsed.secE && (
                <div className="p-4 space-y-2 bg-white">
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-2 items-center pb-1.5 border-b border-slate-100">
                    <div className="lg:col-span-10 flex items-center gap-2">
                      <span className="px-2 py-1 rounded bg-[#EDF1F7] border border-[#DCE2EC] font-mono-num text-[11px] text-slate-700 min-w-[38px] text-center">
                        11a
                      </span>
                      <span className="text-slate-700">PPh Kurang/Lebih Bayar (9-10a-10b-10c+10d)</span>
                    </div>
                    <input
                      type="text"
                      readOnly
                      value={kurangLebih.toLocaleString('id-ID')}
                      className="lg:col-span-2 text-right border border-[#DCE2EC] bg-[#EDF1F7] rounded-[3px] px-2.5 py-1.5 font-mono-num font-bold text-[#1E2C5E]"
                    />
                  </div>
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-2 items-center pb-1.5 border-b border-slate-100">
                    <div className="lg:col-span-5 flex items-center gap-2">
                      <span className="px-2 py-1 rounded bg-[#EDF1F7] border border-[#DCE2EC] font-mono-num text-[11px] text-slate-700 min-w-[38px] text-center">
                        11b
                      </span>
                      <span className="text-slate-700">
                        Apakah terdapat Surat Keputusan Persetujuan Pengangsuran atau Penundaan Pembayaran Pajak?
                      </span>
                    </div>
                    <div className="lg:col-span-5">
                      <RadioYesNo value={false} onChange={() => {}} hintNo="Tidak, Saya tidak memilikinya" />
                    </div>
                    <div className="lg:col-span-2" />
                  </div>
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-2 items-center">
                    <div className="lg:col-span-10 flex items-center gap-2">
                      <span className="px-2 py-1 rounded bg-[#EDF1F7] border border-[#DCE2EC] font-mono-num text-[11px] text-slate-700 min-w-[38px] text-center">
                        11c
                      </span>
                      <span className="text-slate-700">PPh yang masih harus dibayar (11a-11b)</span>
                    </div>
                    <input
                      type="text"
                      readOnly
                      value={kurangLebih.toLocaleString('id-ID')}
                      className="lg:col-span-2 text-right border border-[#DCE2EC] bg-[#EDF1F7] rounded-[3px] px-2.5 py-1.5 font-mono-num font-bold text-[#1E2C5E]"
                    />
                  </div>
                  {kurangLebih > 0 && !isReadOnly && (
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded flex flex-wrap items-center gap-4">
                      <span className="font-bold text-[#1E2C5E]">Pilihan Pelunasan PPh Pasal 29:</span>
                      <label className="inline-flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="radio"
                          checked={paymentMethod === 'DEPOSIT'}
                          onChange={() => setPaymentMethod('DEPOSIT')}
                          className="accent-[#1E2C5E]"
                        />
                        <span>Gunakan Saldo Deposit ({formatRp(activeTaxpayer.depositBalance)})</span>
                      </label>
                      <label className="inline-flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="radio"
                          checked={paymentMethod === 'BILLING'}
                          onChange={() => setPaymentMethod('BILLING')}
                          className="accent-[#1E2C5E]"
                        />
                        <span>Buat Kode Billing (KAP 411125-200)</span>
                      </label>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* F. PEMBETULAN */}
            <div className="border border-slate-200 rounded overflow-hidden">
              <SectionBar id="secF" title="F. PEMBETULAN (DIISI JIKA STATUS SPT ADALAH PEMBETULAN)" />
              {!collapsed.secF && (
                <div className="p-4 space-y-2 bg-white">
                  {[
                    { no: '12a', lbl: 'PPh Kurang/Lebih Bayar pada SPT yang dibetulkan' },
                    { no: '12b', lbl: 'PPh Kurang/Lebih Bayar karena pembetulan (11a-12a)' },
                  ].map((r) => (
                    <div key={r.no} className="grid grid-cols-1 lg:grid-cols-12 gap-2 items-center">
                      <div className="lg:col-span-10 flex items-center gap-2">
                        <span className="px-2 py-1 rounded bg-[#EDF1F7] border border-[#DCE2EC] font-mono-num text-[11px] text-slate-700 min-w-[38px] text-center">
                          {r.no}
                        </span>
                        <span className="text-slate-700">{r.lbl}</span>
                      </div>
                      <input
                        type="text"
                        readOnly
                        value="0"
                        className="lg:col-span-2 text-right border border-[#DCE2EC] bg-[#EDF1F7] rounded-[3px] px-2.5 py-1.5 font-mono-num text-slate-700"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* G. PERMOHONAN PENGEMBALIAN PPh LEBIH BAYAR */}
            <div className="border border-slate-200 rounded overflow-hidden">
              <SectionBar
                id="secG"
                title="G. PERMOHONAN PENGEMBALIAN PPh LEBIH BAYAR (DIISI JIKA STATUS SPT ADALAH LEBIH BAYAR)"
              />
              {!collapsed.secG && (
                <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-6 bg-white">
                  <div>
                    <label className="block text-slate-600 mb-1.5">
                      PPh lebih bayar pada 11a atau 12b mohon:
                    </label>
                    <select
                      disabled={isReadOnly || kurangLebih >= 0}
                      className="w-full border border-[#CBD5E1] rounded-[3px] px-2.5 py-1.5 bg-[#EDF1F7] enabled:bg-white text-slate-600"
                    >
                      <option value="">Silakan Pilih</option>
                      <option value="17C">Dikembalikan melalui Pengembalian Pendahuluan (Pasal 17C/17D)</option>
                      <option value="PEMERIKSAAN">Dikembalikan melalui Pemeriksaan (Pasal 17B)</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    {['Pilih Rekening Bank', 'Nomor Rekening', 'Nama Bank', 'Nama Pemilik Rekening'].map(
                      (lbl) => (
                        <div key={lbl} className="grid grid-cols-12 items-center gap-2">
                          <span className="col-span-5 text-slate-600 text-right">{lbl}</span>
                          <input
                            type="text"
                            readOnly
                            value=""
                            className="col-span-7 border border-[#DCE2EC] bg-[#EDF1F7] rounded-[3px] px-2.5 py-1 text-slate-600"
                          />
                        </div>
                      )
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* H. ANGSURAN PPh PASAL 25 TAHUN PAJAK BERIKUTNYA */}
            <div className="border border-slate-200 rounded overflow-hidden">
              <SectionBar id="secH" title="H. ANGSURAN PPh PASAL 25 TAHUN PAJAK BERIKUTNYA" />
              {!collapsed.secH && (
                <div className="p-4 space-y-2 bg-white">
                  {[
                    {
                      no: '13a',
                      q: 'Apakah Anda hanya menerima penghasilan teratur dan berkewajiban membayar angsuran PPh Pasal 25 Tahun Pajak berikutnya? *',
                      hint: 'Tidak, silahkan lanjut pertanyaan berikutnya',
                    },
                    {
                      no: '13b',
                      q: 'Apakah Anda menyusun perhitungan tersendiri angsuran PPh Pasal 25 Tahun Pajak berikutnya? *',
                      hint: 'Tidak, silahkan lanjut pertanyaan berikutnya',
                    },
                    {
                      no: '13c',
                      q: 'Apakah Anda membayar angsuran PPh Pasal 25 OPPT Tahun Pajak berikutnya? *',
                      hint: 'Tidak, tidak ada kewajiban untuk membayar angsuran pajak penghasilan Pasal 25',
                    },
                  ].map((r) => (
                    <div
                      key={r.no}
                      className="grid grid-cols-1 lg:grid-cols-12 gap-2 items-center pb-1.5 border-b border-slate-100 last:border-b-0"
                    >
                      <div className="lg:col-span-5 flex items-center gap-2">
                        <span className="px-2 py-1 rounded bg-[#EDF1F7] border border-[#DCE2EC] font-mono-num text-[11px] text-slate-700 min-w-[38px] text-center">
                          {r.no}
                        </span>
                        <span className="text-slate-700">{r.q}</span>
                      </div>
                      <div className="lg:col-span-7">
                        <RadioYesNo value={false} onChange={() => {}} hintNo={r.hint} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* I. PERNYATAAN TRANSAKSI LAINNYA */}
            <div className="border border-slate-200 rounded overflow-hidden">
              <SectionBar id="secI" title="I. PERNYATAAN TRANSAKSI LAINNYA" />
              {!collapsed.secI && (
                <div className="p-4 space-y-2 bg-white">
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-2 items-center pb-1.5 border-b border-slate-100">
                    <div className="lg:col-span-10 flex items-center gap-2">
                      <span className="px-2 py-1 rounded bg-[#EDF1F7] border border-[#DCE2EC] font-mono-num text-[11px] text-slate-700 min-w-[38px] text-center">
                        14a
                      </span>
                      <span className="text-slate-700">
                        Harta pada akhir Tahun Pajak * (Isi Lampiran 1 Bagian A, lalu ke pertanyaan selanjutnya)
                      </span>
                    </div>
                    <input
                      type="text"
                      readOnly
                      value={totalHarta.toLocaleString('id-ID')}
                      className="lg:col-span-2 text-right border border-[#DCE2EC] bg-[#EDF1F7] rounded-[3px] px-2.5 py-1.5 font-mono-num text-slate-700"
                    />
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-2 items-center pb-1.5 border-b border-slate-100">
                    <div className="lg:col-span-5 flex items-center gap-2">
                      <span className="px-2 py-1 rounded bg-[#EDF1F7] border border-[#DCE2EC] font-mono-num text-[11px] text-slate-700 min-w-[38px] text-center">
                        14b
                      </span>
                      <span className="text-slate-700">Apakah Anda memiliki utang pada akhir tahun pajak? *</span>
                    </div>
                    <div className="lg:col-span-5">
                      <RadioYesNo
                        value={totalUtang > 0}
                        onChange={() => {}}
                        hintYes="Ya, silakan mengisi lampiran 1 Bagian B"
                        hintNo="Tidak, lanjutkan ke pertanyaan berikutnya"
                      />
                    </div>
                    <input
                      type="text"
                      readOnly
                      value={totalUtang > 0 ? totalUtang.toLocaleString('id-ID') : ''}
                      className="lg:col-span-2 text-right border border-[#DCE2EC] bg-[#EDF1F7] rounded-[3px] px-2.5 py-1.5 font-mono-num text-slate-700"
                    />
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-2 items-center pb-1.5 border-b border-slate-100">
                    <div className="lg:col-span-5 flex items-center gap-2">
                      <span className="px-2 py-1 rounded bg-[#EDF1F7] border border-[#DCE2EC] font-mono-num text-[11px] text-slate-700 min-w-[38px] text-center">
                        14c
                      </span>
                      <span className="text-slate-700">
                        Apakah Anda menerima penghasilan yang dikenakan pajak penghasilan bersifat final? *
                      </span>
                    </div>
                    <div className="lg:col-span-5">
                      <RadioYesNo
                        value={payload.punyaPphFinal}
                        onChange={(v) => setPayload({ ...payload, punyaPphFinal: v })}
                        hintYes="Ya, silakan mengisi lampiran 2 Bagian A"
                        hintNo="Tidak, lanjutkan ke pertanyaan berikutnya"
                      />
                    </div>
                    <input
                      type="text"
                      readOnly
                      value={payload.pphFinalItems.reduce((s, i) => s + i.dpp, 0).toLocaleString('id-ID')}
                      className="lg:col-span-2 text-right border border-[#DCE2EC] bg-[#EDF1F7] rounded-[3px] px-2.5 py-1.5 font-mono-num text-slate-700"
                    />
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-2 items-center pb-1.5 border-b border-slate-100">
                    <div className="lg:col-span-5 flex items-center gap-2">
                      <span className="px-2 py-1 rounded bg-[#EDF1F7] border border-[#DCE2EC] font-mono-num text-[11px] text-slate-700 min-w-[38px] text-center">
                        14d
                      </span>
                      <span className="text-slate-700">
                        Apakah Anda menerima penghasilan yang tidak termasuk objek pajak? *
                      </span>
                    </div>
                    <div className="lg:col-span-5">
                      <RadioYesNo
                        value={payload.punyaBukanObjek}
                        onChange={(v) => setPayload({ ...payload, punyaBukanObjek: v })}
                        hintYes="Ya, silakan mengisi lampiran 2 Bagian B"
                        hintNo="Tidak, lanjutkan ke pertanyaan berikutnya"
                      />
                    </div>
                    <div className="lg:col-span-2" />
                  </div>

                  {[
                    { no: '14e', q: 'Apakah Anda melaporkan biaya penyusutan dan/atau amortisasi fiskal? *' },
                    { no: '14f', q: 'Apakah Anda melaporkan biaya entertainment, promosi, natura, dan piutang tak tertagih? *' },
                    { no: '14g', q: 'Apakah Anda menerima dividen dari luar negeri sebagai penghasilan bukan objek pajak? *' },
                  ].map((r) => (
                    <div
                      key={r.no}
                      className="grid grid-cols-1 lg:grid-cols-12 gap-2 items-center pb-1.5 border-b border-slate-100"
                    >
                      <div className="lg:col-span-5 flex items-center gap-2">
                        <span className="px-2 py-1 rounded bg-[#EDF1F7] border border-[#DCE2EC] font-mono-num text-[11px] text-slate-700 min-w-[38px] text-center">
                          {r.no}
                        </span>
                        <span className="text-slate-700">{r.q}</span>
                      </div>
                      <div className="lg:col-span-7">
                        <RadioYesNo value={false} onChange={() => {}} />
                      </div>
                    </div>
                  ))}

                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-2 items-center">
                    <div className="lg:col-span-10 flex items-center gap-2">
                      <span className="px-2 py-1 rounded bg-[#EDF1F7] border border-[#DCE2EC] font-mono-num text-[11px] text-slate-700 min-w-[38px] text-center">
                        14h
                      </span>
                      <span className="text-slate-700">
                        Kelebihan PPh Final atas penghasilan usaha dengan peredaran bruto tertentu yang dapat dimintakan pengembalian
                      </span>
                    </div>
                    <input
                      type="text"
                      readOnly
                      value="0"
                      className="lg:col-span-2 text-right border border-[#DCE2EC] bg-[#EDF1F7] rounded-[3px] px-2.5 py-1.5 font-mono-num text-slate-700"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* J. LAMPIRAN TAMBAHAN */}
            <div className="border border-slate-200 rounded overflow-hidden">
              <SectionBar id="secJ" title="J. LAMPIRAN TAMBAHAN" />
              {!collapsed.secJ && (
                <div className="p-4 space-y-2 bg-white">
                  {[
                    { lbl: 'a. Laporan Keuangan/Laporan Keuangan yang telah diaudit', hint: 'Tidak, jenis pembukuan adalah Pembukuan Sederhana.' },
                    { lbl: 'b. Bukti pembayaran zakat/sumbangan keagamaan', hint: 'Tidak ada berkas yang perlu dilampirkan' },
                    { lbl: 'c. Bukti pemotongan/pemungutan sehubungan dengan kredit pajak luar negeri', hint: 'Tidak ada berkas yang perlu dilampirkan' },
                    { lbl: 'd. Surat Kuasa Khusus', hint: '' },
                    { lbl: 'e. Dokumen lainnya', hint: '' },
                  ].map((item) => (
                    <div key={item.lbl} className="grid grid-cols-1 lg:grid-cols-12 gap-2 items-center pb-1.5 border-b border-slate-100 last:border-b-0">
                      <span className="lg:col-span-4 text-slate-700">{item.lbl}</span>
                      <div className="lg:col-span-8">
                        <RadioYesNo value={false} onChange={() => {}} numLabel="1" hintNo={item.hint || undefined} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* K. PERNYATAAN */}
            <div className="border border-slate-200 rounded overflow-hidden">
              <SectionBar id="secK" title="K. PERNYATAAN" />
              {!collapsed.secK && (
                <div className="p-4 space-y-3 bg-white">
                  <div className="bg-[#BCE3FA] text-[#0E4A6B] px-3.5 py-2 rounded-[4px] inline-flex items-center gap-2 font-bold">
                    <Info className="w-4 h-4 shrink-0" />
                    <span>Status SPT : {statusSptLabel}</span>
                  </div>
                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      disabled={isReadOnly}
                      checked={declarationChecked}
                      onChange={(e) => setDeclarationChecked(e.target.checked)}
                      className="mt-0.5 accent-[#1E2C5E]"
                    />
                    <span className="text-slate-800 font-semibold leading-relaxed">
                      Dengan menyadari sepenuhnya akan segala akibatnya, saya menyatakan bahwa data yang saya beritahukan beserta lampirannya adalah benar, lengkap, dan jelas.
                    </span>
                  </label>
                  <div className="max-w-xl space-y-2 pt-1">
                    <div className="grid grid-cols-12 items-center gap-2">
                      <span className="col-span-4 text-slate-600">Penandatangan</span>
                      <div className="col-span-8 flex items-center gap-4">
                        <label className="inline-flex items-center gap-1.5">
                          <input type="radio" checked readOnly className="accent-[#1E2C5E]" />
                          <span>Wajib Pajak</span>
                        </label>
                        <label className="inline-flex items-center gap-1.5 text-slate-400">
                          <input type="radio" disabled />
                          <span>Kuasa Wajib Pajak</span>
                        </label>
                      </div>
                    </div>
                    {[
                      { lbl: 'NPWP', val: activeTaxpayer.nikNpwp },
                      { lbl: 'Nama Lengkap', val: activeTaxpayer.name },
                      { lbl: 'Tanda Tangan', val: 'Kode Otorisasi DJP' },
                    ].map((f) => (
                      <div key={f.lbl} className="grid grid-cols-12 items-center gap-2">
                        <span className="col-span-4 text-slate-600">{f.lbl}</span>
                        <input
                          type="text"
                          readOnly
                          value={f.val}
                          className="col-span-8 border border-[#DCE2EC] bg-[#EDF1F7] rounded-[3px] px-2.5 py-1.5 text-slate-700"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ==================== TAB: LAMPIRAN L-1 ==================== */}
        {tab === 'l1' && (
          <div className="space-y-4">
            {/* Top Bullet Summary (PDF 1 Page 6) */}
            <ul className="list-disc pl-5 space-y-0.5 text-[11px] font-semibold text-slate-600 uppercase">
              <li>A. HARTA PADA AKHIR TAHUN PAJAK</li>
              <li>B. UTANG PADA AKHIR TAHUN PAJAK</li>
              <li>C. DAFTAR ANGGOTA KELUARGA YANG MENJADI TANGGUNGAN</li>
              <li>D. PENGHASILAN NETO DALAM NEGERI DARI PEKERJAAN</li>
              <li>E. DAFTAR BUKTI PEMOTONGAN/PEMUNGUTAN PPh</li>
            </ul>

            {/* HEADER Bar */}
            <div className="border border-slate-200 rounded overflow-hidden">
              <div className="bg-[#1E2C5E] text-white px-4 py-2 font-bold text-[11.5px] uppercase">
                HEADER
              </div>
              <div className="p-4 space-y-2 bg-white max-w-xl">
                <div className="grid grid-cols-12 items-center gap-2">
                  <span className="col-span-4 text-slate-600">Tahun Pajak</span>
                  <input
                    type="text"
                    readOnly
                    value={String(taxReturn.taxYear)}
                    className="col-span-8 border border-[#DCE2EC] bg-[#EDF1F7] rounded-[3px] px-2.5 py-1 font-mono-num text-slate-700"
                  />
                </div>
                <div className="grid grid-cols-12 items-center gap-2">
                  <span className="col-span-4 text-slate-600">NPWP</span>
                  <input
                    type="text"
                    readOnly
                    value={activeTaxpayer.nikNpwp}
                    className="col-span-8 border border-[#DCE2EC] bg-[#EDF1F7] rounded-[3px] px-2.5 py-1 font-mono-num text-slate-700"
                  />
                </div>
              </div>
            </div>

            {/* Bagian A: HARTA PADA AKHIR TAHUN PAJAK (7 Official Coretax Sub-Tables) */}
            <div className="border border-slate-200 rounded overflow-hidden">
              <SectionBar id="l1A" title="A. HARTA PADA AKHIR TAHUN PAJAK" />
              {!collapsed.l1A && (
                <div className="p-3 space-y-4 bg-white">
                  {[
                    {
                      num: 1,
                      title: '1. KAS DAN SETARA KAS',
                      codePrefix: '01',
                      defaultCode: '0102',
                      defaultDesc: 'Tabungan (Bank/Lembaga Keuangan)',
                      cols: ['KODE', 'DESKRIPSI', 'NOMOR AKUN', 'ATAS NAMA', 'NAMA BANK/INSTITUSI', 'LOKASI HARTA', 'TAHUN PEROLEHAN', 'SALDO'],
                    },
                    {
                      num: 2,
                      title: '2. PIUTANG',
                      codePrefix: '02',
                      defaultCode: '0201',
                      defaultDesc: 'Piutang Usaha / Pinjaman',
                      cols: ['KODE', 'DESKRIPSI', 'LOKASI PENERIMA PINJAMAN', 'NIK/NPWP PENERIMA PINJAMAN', 'NAMA PENERIMA PINJAMAN', 'TAHUN DIMULAI', 'NILAI PIUTANG'],
                    },
                    {
                      num: 3,
                      title: '3. INVESTASI/SEKURITAS',
                      codePrefix: '03',
                      defaultCode: '0301',
                      defaultDesc: 'Saham / Obligasi / Reksadana',
                      cols: ['KODE', 'DESKRIPSI', 'LOKASI HARTA', 'NPWP BANK/INSTITUSI', 'NAMA BANK/INSTITUSI', 'NOMOR AKUN', 'TAHUN PEROLEHAN', 'HARGA PEROLEHAN'],
                    },
                    {
                      num: 4,
                      title: '4. HARTA BERGERAK',
                      codePrefix: '04',
                      defaultCode: '0403',
                      defaultDesc: 'Mobil Penumpang',
                      cols: ['KODE', 'TIPE', 'MERK/MODEL', 'NOMOR POLISI/REGISTRASI', 'KEPEMILIKAN', 'TAHUN PEROLEHAN', 'HARGA PEROLEHAN'],
                    },
                    {
                      num: 5,
                      title: '5. HARTA TIDAK BERGERAK (TERMASUK TANAH BANGUNAN)',
                      codePrefix: '05',
                      defaultCode: '0501',
                      defaultDesc: 'Tanah dan/atau Bangunan Tempat Tinggal',
                      cols: ['KODE', 'DESKRIPSI', 'LOKASI HARTA', 'UKURAN TANAH', 'UKURAN BANGUNAN', 'SUMBER KEPEMILIKAN', 'NOMOR SERTIFIKAT', 'TAHUN PEROLEHAN', 'HARGA PEROLEHAN'],
                    },
                    {
                      num: 6,
                      title: '6. HARTA LAINNYA',
                      codePrefix: '06',
                      defaultCode: '0601',
                      defaultDesc: 'Logam Mulia / Emas Batangan',
                      cols: ['KODE', 'DESKRIPSI', 'TAHUN PEROLEHAN', 'BUKTI KEPEMILIKAN', 'INFORMASI TAMBAHAN', 'HARGA PEROLEHAN', 'NILAI SAAT INI', 'KETERANGAN'],
                    },
                  ].map((sub) => {
                    const rows = assetList.filter((a) =>
                      sub.num === 1
                        ? a.code.startsWith('01')
                        : sub.num === 2
                          ? a.code.startsWith('02')
                          : sub.num === 3
                            ? a.code.startsWith('03')
                            : sub.num === 4
                              ? a.code.startsWith('04')
                              : sub.num === 5
                                ? a.code.startsWith('05')
                                : !['01', '02', '03', '04', '05'].some((p) => a.code.startsWith(p))
                    );
                    const subTotal = rows.reduce((s, r) => s + r.amount, 0);

                    return (
                      <div key={sub.num} className="border border-slate-200 rounded overflow-hidden">
                        <div className="bg-[#1E2C5E] text-white px-3.5 py-2 font-bold text-[11px] uppercase">
                          {sub.title}
                        </div>
                        <div className="p-3 space-y-2">
                          {!isReadOnly && (
                            <div className="flex flex-wrap items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => {
                                  setNewRecType('ASSET');
                                  setNewCode(sub.defaultCode);
                                  setNewDesc(sub.defaultDesc);
                                  setAssetModalTitle(sub.title.replace(/^\d+\.\s*/, ''));
                                }}
                                className="inline-flex items-center gap-1 bg-[#1E2C5E] hover:bg-[#152048] text-white font-bold text-[11px] px-3 py-1.5 rounded-[4px] cursor-pointer"
                              >
                                <Plus className="w-3.5 h-3.5" />
                                <span>Tambah</span>
                              </button>
                              <button
                                type="button"
                                disabled={rows.length === 0}
                                onClick={() => rows[0] && onDeleteAsset(rows[0].id)}
                                className="inline-flex items-center gap-1 bg-[#DC2626] hover:bg-[#B91C1C] disabled:opacity-45 text-white font-bold text-[11px] px-3 py-1.5 rounded-[4px] cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>Hapus</span>
                              </button>
                              <button
                                type="button"
                                disabled={rows.length === 0}
                                onClick={async () => {
                                  for (const r of rows) await onDeleteAsset(r.id);
                                }}
                                className="inline-flex items-center gap-1 bg-[#DC2626] hover:bg-[#B91C1C] disabled:opacity-45 text-white font-bold text-[11px] px-3 py-1.5 rounded-[4px] cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>Delete All</span>
                              </button>
                              <button
                                type="button"
                                className="inline-flex items-center gap-1 bg-[#1E2C5E] text-white font-bold text-[11px] px-3 py-1.5 rounded-[4px] cursor-pointer"
                              >
                                <span>Impor data ▾</span>
                              </button>
                            </div>
                          )}

                          <CoretaxIconToolbar
                            onExportCsv={() =>
                              downloadCsvFile(
                                `L1-Tabel-${sub.num}-${taxReturn.taxYear}.csv`,
                                ['Kode', 'Deskripsi', 'Tahun', 'Keterangan', 'Nilai'],
                                rows.map((a) => [a.code, a.description, String(a.yearAcquired), a.relationOrLender, String(a.amount)])
                              )
                            }
                          />

                          <div className="overflow-x-auto border border-slate-200 rounded">
                            <table className="w-full border-collapse text-[11px]">
                              <thead>
                                <tr className="bg-[#F6C324] text-[#1E293B] font-bold">
                                  <th className="px-2 py-2 w-8 text-center border-r border-white/50">
                                    <input type="checkbox" readOnly />
                                  </th>
                                  <th className="px-2.5 py-2 text-center border-r border-white/50">TINDAKAN</th>
                                  <th className="px-2.5 py-2 text-center border-r border-white/50">NO.</th>
                                  <th className="px-3 py-2 text-left border-r border-white/50">KODE ⇅</th>
                                  <th className="px-3 py-2 text-left border-r border-white/50">DESKRIPSI ⇅</th>
                                  <th className="px-3 py-2 text-left border-r border-white/50">KETERANGAN / INSTITUSI ⇅</th>
                                  <th className="px-3 py-2 text-center border-r border-white/50">TAHUN PEROLEHAN ⇅</th>
                                  <th className="px-3 py-2 text-right">HARGA PEROLEHAN / SALDO ⇅</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-200 bg-white">
                                {rows.length === 0 ? (
                                  <tr>
                                    <td colSpan={8} className="px-3 py-3 text-slate-500">
                                      Tidak ada data yang ditemukan.
                                    </td>
                                  </tr>
                                ) : (
                                  rows.map((a, idx) => (
                                    <tr key={a.id} className="hover:bg-slate-50">
                                      <td className="px-2 py-2 text-center">
                                        <input type="checkbox" readOnly />
                                      </td>
                                      <td className="px-2.5 py-2 text-center">
                                        {!isReadOnly && (
                                          <button
                                            type="button"
                                            onClick={() => onDeleteAsset(a.id)}
                                            className="w-6 h-6 rounded bg-[#9B2C2C] text-white inline-flex items-center justify-center cursor-pointer"
                                          >
                                            <Trash2 className="w-3 h-3" />
                                          </button>
                                        )}
                                      </td>
                                      <td className="px-2.5 py-2 text-center font-mono-num">{idx + 1}.</td>
                                      <td className="px-3 py-2 font-mono-num">{a.code}</td>
                                      <td className="px-3 py-2 font-semibold">{a.description}</td>
                                      <td className="px-3 py-2 text-slate-600">{a.relationOrLender}</td>
                                      <td className="px-3 py-2 text-center font-mono-num">{a.yearAcquired}</td>
                                      <td className="px-3 py-2 text-right font-mono-num font-bold">
                                        {a.amount.toLocaleString('id-ID')}
                                      </td>
                                    </tr>
                                  ))
                                )}
                                <tr className="bg-[#FAFBFD] font-bold text-[#1E2C5E]">
                                  <td colSpan={7} className="px-3 py-2 text-right">
                                    JUMLAH TABEL {sub.num}
                                  </td>
                                  <td className="px-3 py-2 text-right font-mono-num">
                                    {subTotal.toLocaleString('id-ID')}
                                  </td>
                                </tr>
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {/* 7. IKHTISAR HARTA (PDF 1 Page 7 bottom) */}
                  <div className="border border-slate-200 rounded overflow-hidden">
                    <div className="bg-[#1E2C5E] text-white px-3.5 py-2 font-bold text-[11px] uppercase">
                      7. IKHTISAR HARTA
                    </div>
                    <table className="w-full border-collapse text-[11px]">
                      <thead>
                        <tr className="bg-[#F6C324] text-[#1E293B] font-bold">
                          <th className="px-3 py-2 text-center border-r border-white/50">DESKRIPSI</th>
                          <th className="px-3 py-2 text-right border-r border-white/50">HARGA PEROLEHAN</th>
                          <th className="px-3 py-2 text-right">NILAI SAAT INI</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="bg-white font-bold text-[#1E2C5E]">
                          <td className="px-3 py-2.5 text-right">JUMLAH HARTA PADA AKHIR TAHUN PAJAK</td>
                          <td className="px-3 py-2.5 text-right font-mono-num">
                            {totalHarta.toLocaleString('id-ID')}
                          </td>
                          <td className="px-3 py-2.5 text-right font-mono-num">
                            {totalHarta.toLocaleString('id-ID')}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* Bagian B: Utang */}
            <div className="border border-slate-200 rounded overflow-hidden">
              <SectionBar id="l1B" title="B. UTANG PADA AKHIR TAHUN PAJAK" />
              {!collapsed.l1B && (
                <div className="p-3 space-y-2 bg-white">
                  {!isReadOnly && (
                    <button
                      type="button"
                      onClick={() => {
                        setNewRecType('LIABILITY');
                        setNewCode('101');
                        setNewDesc('Pinjaman Bank / Lembaga Keuangan');
                        setAssetModalTitle('UTANG PADA AKHIR TAHUN PAJAK');
                      }}
                      className="inline-flex items-center gap-1 bg-[#1E2C5E] text-white font-bold text-[11px] px-3 py-1.5 rounded-[4px] cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Tambah</span>
                    </button>
                  )}
                  <div className="overflow-x-auto border border-slate-200 rounded">
                    <table className="w-full border-collapse text-[11px]">
                      <thead>
                        <tr className="bg-[#F6C324] text-[#1E293B] font-bold">
                          <th className="px-3 py-2 text-center border-r border-white/50">NO.</th>
                          <th className="px-3 py-2 text-left border-r border-white/50">KODE ⇅</th>
                          <th className="px-3 py-2 text-left border-r border-white/50">DESKRIPSI ⇅</th>
                          <th className="px-3 py-2 text-left border-r border-white/50">KREDITUR (NAMA) ⇅</th>
                          <th className="px-3 py-2 text-center border-r border-white/50">NEGARA KREDITUR ⇅</th>
                          <th className="px-3 py-2 text-center border-r border-white/50">TAHUN PEMINJAMAN ⇅</th>
                          <th className="px-3 py-2 text-right border-r border-white/50">SALDO ⇅</th>
                          <th className="px-3 py-2 text-center">TINDAKAN</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {liabList.map((a, idx) => (
                          <tr key={a.id} className="hover:bg-slate-50">
                            <td className="px-3 py-2 text-center font-mono-num">{idx + 1}</td>
                            <td className="px-3 py-2 font-mono-num">{a.code}</td>
                            <td className="px-3 py-2 font-semibold">{a.description}</td>
                            <td className="px-3 py-2">{a.relationOrLender}</td>
                            <td className="px-3 py-2 text-center">Indonesia</td>
                            <td className="px-3 py-2 text-center font-mono-num">{a.yearAcquired}</td>
                            <td className="px-3 py-2 text-right font-mono-num font-bold">
                              {a.amount.toLocaleString('id-ID')}
                            </td>
                            <td className="px-2 py-2 text-center">
                              {!isReadOnly && (
                                <button
                                  type="button"
                                  onClick={() => onDeleteAsset(a.id)}
                                  className="text-red-600 hover:text-red-800 cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                        <tr className="bg-[#FAFBFD] font-bold text-[#1E2C5E]">
                          <td colSpan={6} className="px-3 py-2 text-right">
                            JUMLAH BAGIAN B
                          </td>
                          <td className="px-3 py-2 text-right font-mono-num">
                            {totalUtang.toLocaleString('id-ID')}
                          </td>
                          <td />
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* Bagian C: Keluarga */}
            <div className="border border-slate-200 rounded overflow-hidden">
              <SectionBar id="l1C" title="C. DAFTAR ANGGOTA KELUARGA YANG MENJADI TANGGUNGAN" />
              {!collapsed.l1C && (
                <div className="p-3 overflow-x-auto bg-white">
                  <table className="w-full border border-slate-200 border-collapse text-[11px]">
                    <thead>
                      <tr className="bg-[#F6C324] text-[#1E293B] font-bold">
                        <th className="px-3 py-2 text-center border-r border-white/50">NO.</th>
                        <th className="px-3 py-2 text-left border-r border-white/50">NAMA ⇅</th>
                        <th className="px-3 py-2 text-left border-r border-white/50">NIK ⇅</th>
                        <th className="px-3 py-2 text-center border-r border-white/50">TANGGAL LAHIR ⇅</th>
                        <th className="px-3 py-2 text-left border-r border-white/50">HUBUNGAN DENGAN WAJIB PAJAK ⇅</th>
                        <th className="px-3 py-2 text-left">PEKERJAAN ⇅</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {familyList.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-3 py-3 text-slate-500">
                            Tidak ada data untuk ditampilkan.
                          </td>
                        </tr>
                      ) : (
                        familyList.map((f, idx) => (
                          <tr key={f.id}>
                            <td className="px-3 py-2 text-center font-mono-num">{idx + 1}</td>
                            <td className="px-3 py-2 font-semibold">{f.description}</td>
                            <td className="px-3 py-2 font-mono-num">{f.nikMember || '3174015506950002'}</td>
                            <td className="px-3 py-2 text-center font-mono-num">15-06-1995</td>
                            <td className="px-3 py-2">{f.relationOrLender}</td>
                            <td className="px-3 py-2">Mengurus Rumah Tangga / Pelajar</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Bagian D: PENGHASILAN NETO DALAM NEGERI DARI PEKERJAAN (PDF 1 Page 8) */}
            <div className="border border-slate-200 rounded overflow-hidden">
              <SectionBar id="l1D" title="D. PENGHASILAN NETO DALAM NEGERI DARI PEKERJAAN" />
              {!collapsed.l1D && (
                <div className="p-3 space-y-2 bg-white">
                  <CoretaxIconToolbar />
                  <div className="overflow-x-auto border border-slate-200 rounded">
                    <table className="w-full border-collapse text-[11px]">
                      <thead>
                        <tr className="bg-[#F6C324] text-[#1E293B] font-bold">
                          <th className="px-3 py-2 text-center border-r border-white/50">TINDAKAN</th>
                          <th className="px-3 py-2 text-center border-r border-white/50">NO.</th>
                          <th className="px-3 py-2 text-left border-r border-white/50">NAMA PEMBERI KERJA ⇅</th>
                          <th className="px-3 py-2 text-left border-r border-white/50">NOMOR IDENTITAS PEMBERI KERJA ⇅</th>
                          <th className="px-3 py-2 text-right border-r border-white/50">PENGHASILAN BRUTO ⇅</th>
                          <th className="px-3 py-2 text-right border-r border-white/50">PENGURANG PENGHASILAN BRUTO/BIAYA ⇅</th>
                          <th className="px-3 py-2 text-right">PENGHASILAN NETO ⇅</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {bpa1Slips.map((s, idx) => {
                          const pengurang = (s.positionAllowance || 0) + (s.pensionContribution || 0);
                          const neto = Math.max(0, s.grossAmount - pengurang);
                          return (
                            <tr key={s.id}>
                              <td className="px-3 py-2 text-center">
                                <span className="w-6 h-6 rounded bg-[#9B2C2C] text-white inline-flex items-center justify-center">
                                  <Trash2 className="w-3 h-3" />
                                </span>
                              </td>
                              <td className="px-3 py-2 text-center font-mono-num">{idx + 1}</td>
                              <td className="px-3 py-2 font-semibold">{s.issuerName}</td>
                              <td className="px-3 py-2 font-mono-num">{s.issuerNpwp}</td>
                              <td className="px-3 py-2 text-right font-mono-num">
                                {s.grossAmount.toLocaleString('id-ID')}
                              </td>
                              <td className="px-3 py-2 text-right font-mono-num">
                                {pengurang.toLocaleString('id-ID')}
                              </td>
                              <td className="px-3 py-2 text-right font-mono-num font-bold">
                                {neto.toLocaleString('id-ID')}
                              </td>
                            </tr>
                          );
                        })}
                        <tr className="bg-[#FAFBFD] font-bold text-[#1E2C5E]">
                          <td colSpan={6} className="px-3 py-2 text-right">
                            JUMLAH BAGIAN D
                          </td>
                          <td className="px-3 py-2 text-right font-mono-num">
                            {netoPekerjaan.toLocaleString('id-ID')}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* Bagian E: DAFTAR BUKTI PEMOTONGAN/PEMUNGUTAN PPh (PDF 1 Page 8) */}
            <div className="border border-slate-200 rounded overflow-hidden">
              <SectionBar id="l1E" title="E. DAFTAR BUKTI PEMOTONGAN/PEMUNGUTAN PPh" />
              {!collapsed.l1E && (
                <div className="p-3 space-y-2 bg-white">
                  <CoretaxIconToolbar />
                  <div className="overflow-x-auto border border-slate-200 rounded">
                    <table className="w-full border-collapse text-[11px]">
                      <thead>
                        <tr className="bg-[#F6C324] text-[#1E293B] font-bold">
                          <th className="px-3 py-2 text-center border-r border-white/50">TINDAKAN</th>
                          <th className="px-3 py-2 text-center border-r border-white/50">NO.</th>
                          <th className="px-3 py-2 text-left border-r border-white/50">NAMA PEMOTONG/PEMUNGUT PPh ⇅</th>
                          <th className="px-3 py-2 text-left border-r border-white/50">NPWP PEMOTONG/PEMUNGUT PPh ⇅</th>
                          <th className="px-3 py-2 text-left border-r border-white/50">NOMOR BUKTI PEMOTONGAN/PEMUNGUTAN ⇅</th>
                          <th className="px-3 py-2 text-center border-r border-white/50">TANGGAL BUKTI PEMOTONGAN ⇅</th>
                          <th className="px-3 py-2 text-left border-r border-white/50">JENIS PAJAK ⇅</th>
                          <th className="px-3 py-2 text-right">KREDIT PAJAK ⇅</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {bpa1Slips.map((s, idx) => (
                          <tr key={s.id}>
                            <td className="px-3 py-2 text-center">
                              <span className="w-6 h-6 rounded bg-[#9B2C2C] text-white inline-flex items-center justify-center">
                                <Trash2 className="w-3 h-3" />
                              </span>
                            </td>
                            <td className="px-3 py-2 text-center font-mono-num">{idx + 1}</td>
                            <td className="px-3 py-2 font-semibold">{s.issuerName}</td>
                            <td className="px-3 py-2 font-mono-num">{s.issuerNpwp}</td>
                            <td className="px-3 py-2 font-mono-num font-bold text-[#1E2C5E]">{s.slipNumber}</td>
                            <td className="px-3 py-2 text-center font-mono-num">31-12-{s.taxPeriodYear}</td>
                            <td className="px-3 py-2">PPh Pasal 21</td>
                            <td className="px-3 py-2 text-right font-mono-num font-bold text-[#1E2C5E]">
                              {s.taxWithheld.toLocaleString('id-ID')}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ==================== TAB: LAMPIRAN L-2 ==================== */}
        {tab === 'l2' && (
          <div className="space-y-4">
            {/* Top Bullet Summary (PDF 1 Page 8) */}
            <ul className="list-disc pl-5 space-y-0.5 text-[11px] font-semibold text-slate-600 uppercase">
              <li>A. PENGHASILAN YANG DIKENAKAN PAJAK PENGHASILAN BERSIFAT FINAL</li>
              <li>B. PENGHASILAN YANG TIDAK TERMASUK OBJEK PAJAK</li>
              <li>C. PENGHASILAN NETO LUAR NEGERI</li>
            </ul>

            {/* HEADER Bar */}
            <div className="border border-slate-200 rounded overflow-hidden">
              <div className="bg-[#1E2C5E] text-white px-4 py-2 font-bold text-[11.5px] uppercase">
                HEADER
              </div>
              <div className="p-4 space-y-2 bg-white max-w-xl">
                <div className="grid grid-cols-12 items-center gap-2">
                  <span className="col-span-4 text-slate-600">Tahun Pajak</span>
                  <input
                    type="text"
                    readOnly
                    value={String(taxReturn.taxYear)}
                    className="col-span-8 border border-[#DCE2EC] bg-[#EDF1F7] rounded-[3px] px-2.5 py-1 font-mono-num text-slate-700"
                  />
                </div>
                <div className="grid grid-cols-12 items-center gap-2">
                  <span className="col-span-4 text-slate-600">NPWP</span>
                  <input
                    type="text"
                    readOnly
                    value={activeTaxpayer.nikNpwp}
                    className="col-span-8 border border-[#DCE2EC] bg-[#EDF1F7] rounded-[3px] px-2.5 py-1 font-mono-num text-slate-700"
                  />
                </div>
              </div>
            </div>

            {/* Bagian A: PPh Final (PDF 1 Page 9) */}
            <div className="border border-slate-200 rounded overflow-hidden">
              <SectionBar id="l2A" title="A. PENGHASILAN YANG DIKENAKAN PAJAK PENGHASILAN BERSIFAT FINAL" />
              {!collapsed.l2A && (
                <div className="p-3 space-y-2.5 bg-white">
                  {!isReadOnly && (
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-end bg-slate-50 p-2.5 rounded border border-slate-200">
                      <div className="md:col-span-5">
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">Jenis Penghasilan Final</label>
                        <input
                          type="text"
                          value={newFinalJenis}
                          onChange={(e) => setNewFinalJenis(e.target.value)}
                          className="w-full border border-slate-300 rounded px-2.5 py-1.5"
                        />
                      </div>
                      <div className="md:col-span-3">
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">DPP / Bruto (Rp)</label>
                        <input
                          type="number"
                          value={newFinalDpp}
                          onChange={(e) => setNewFinalDpp(Number(e.target.value) || 0)}
                          className="w-full text-right border border-slate-300 rounded px-2.5 py-1.5 font-mono-num"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">PPh Final (Rp)</label>
                        <input
                          type="number"
                          value={newFinalPph}
                          onChange={(e) => setNewFinalPph(Number(e.target.value) || 0)}
                          className="w-full text-right border border-slate-300 rounded px-2.5 py-1.5 font-mono-num"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          if (!newFinalJenis.trim()) return;
                          setPayload({
                            ...payload,
                            punyaPphFinal: true,
                            pphFinalItems: [
                              ...payload.pphFinalItems,
                              { jenis: newFinalJenis, dpp: newFinalDpp, pph: newFinalPph },
                            ],
                          });
                        }}
                        className="md:col-span-2 inline-flex items-center justify-center gap-1 bg-[#1E2C5E] text-white font-bold px-3 py-1.5 rounded-[4px] cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Tambah</span>
                      </button>
                    </div>
                  )}
                  <CoretaxIconToolbar />
                  <div className="overflow-x-auto border border-slate-200 rounded">
                    <table className="w-full border-collapse text-[11px]">
                      <thead>
                        <tr className="bg-[#F6C324] text-[#1E293B] font-bold">
                          <th className="px-3 py-2 text-center border-r border-white/50">NO.</th>
                          <th className="px-3 py-2 text-left border-r border-white/50">NAMA PEMOTONG/PEMUNGUT ⇅</th>
                          <th className="px-3 py-2 text-left border-r border-white/50">KODE OBJEK PAJAK ⇅</th>
                          <th className="px-3 py-2 text-left border-r border-white/50">JENIS PENGHASILAN</th>
                          <th className="px-3 py-2 text-right border-r border-white/50">DASAR PENGENAAN PAJAK ⇅</th>
                          <th className="px-3 py-2 text-right">PPh FINAL TERUTANG ⇅</th>
                          {!isReadOnly && <th className="px-2 py-2 w-10" />}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {payload.pphFinalItems.length === 0 ? (
                          <tr>
                            <td colSpan={isReadOnly ? 6 : 7} className="px-3 py-3 text-slate-500">
                              Tidak ada data untuk ditampilkan.
                            </td>
                          </tr>
                        ) : (
                          payload.pphFinalItems.map((it, idx) => (
                            <tr key={idx}>
                              <td className="px-3 py-2 text-center font-mono-num">{idx + 1}</td>
                              <td className="px-3 py-2">{workspace.corporateTaxpayer.name}</td>
                              <td className="px-3 py-2 font-mono-num">21-402-02</td>
                              <td className="px-3 py-2 font-medium">{it.jenis}</td>
                              <td className="px-3 py-2 text-right font-mono-num">
                                {it.dpp.toLocaleString('id-ID')}
                              </td>
                              <td className="px-3 py-2 text-right font-mono-num font-bold">
                                {it.pph.toLocaleString('id-ID')}
                              </td>
                              {!isReadOnly && (
                                <td className="px-2 py-2 text-center">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setPayload({
                                        ...payload,
                                        pphFinalItems: payload.pphFinalItems.filter((_, i) => i !== idx),
                                      })
                                    }
                                    className="text-red-600 cursor-pointer"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </td>
                              )}
                            </tr>
                          ))
                        )}
                        <tr className="bg-[#FAFBFD] font-bold text-[#1E2C5E]">
                          <td colSpan={4} className="px-3 py-2 text-right">
                            JUMLAH TABEL A
                          </td>
                          <td className="px-3 py-2 text-right font-mono-num">
                            {payload.pphFinalItems.reduce((s, i) => s + i.dpp, 0).toLocaleString('id-ID')}
                          </td>
                          <td className="px-3 py-2 text-right font-mono-num">
                            {payload.pphFinalItems.reduce((s, i) => s + i.pph, 0).toLocaleString('id-ID')}
                          </td>
                          {!isReadOnly && <td />}
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* Bagian B: Bukan Objek Pajak */}
            <div className="border border-slate-200 rounded overflow-hidden">
              <SectionBar id="l2B" title="B. PENGHASILAN YANG TIDAK TERMASUK OBJEK PAJAK" />
              {!collapsed.l2B && (
                <div className="p-3 space-y-2.5 bg-white">
                  {!isReadOnly && (
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-end bg-slate-50 p-2.5 rounded border border-slate-200">
                      <div className="md:col-span-7">
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">Jenis Penghasilan Bukan Objek</label>
                        <input
                          type="text"
                          value={newNonObjJenis}
                          onChange={(e) => setNewNonObjJenis(e.target.value)}
                          className="w-full border border-slate-300 rounded px-2.5 py-1.5"
                        />
                      </div>
                      <div className="md:col-span-3">
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">Jumlah Bruto (Rp)</label>
                        <input
                          type="number"
                          value={newNonObjAmt}
                          onChange={(e) => setNewNonObjAmt(Number(e.target.value) || 0)}
                          className="w-full text-right border border-slate-300 rounded px-2.5 py-1.5 font-mono-num"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          if (!newNonObjJenis.trim()) return;
                          setPayload({
                            ...payload,
                            punyaBukanObjek: true,
                            bukanObjekItems: [
                              ...payload.bukanObjekItems,
                              { jenis: newNonObjJenis, jumlah: newNonObjAmt },
                            ],
                          });
                        }}
                        className="md:col-span-2 inline-flex items-center justify-center gap-1 bg-[#1E2C5E] text-white font-bold px-3 py-1.5 rounded-[4px] cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Tambah</span>
                      </button>
                    </div>
                  )}
                  <div className="overflow-x-auto border border-slate-200 rounded">
                    <table className="w-full border-collapse text-[11px]">
                      <thead>
                        <tr className="bg-[#F6C324] text-[#1E293B] font-bold">
                          <th className="px-3 py-2 text-center border-r border-white/50">NO.</th>
                          <th className="px-3 py-2 text-left border-r border-white/50">KODE ⇅</th>
                          <th className="px-3 py-2 text-left border-r border-white/50">JENIS PENGHASILAN ⇅</th>
                          <th className="px-3 py-2 text-left border-r border-white/50">SUMBER PENGHASILAN (NAMA) ⇅</th>
                          <th className="px-3 py-2 text-right">PENGHASILAN BRUTO ⇅</th>
                          {!isReadOnly && <th className="px-2 py-2 w-10" />}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {payload.bukanObjekItems.length === 0 ? (
                          <tr>
                            <td colSpan={isReadOnly ? 5 : 6} className="px-3 py-3 text-slate-500">
                              Tidak ada data untuk ditampilkan.
                            </td>
                          </tr>
                        ) : (
                          payload.bukanObjekItems.map((it, idx) => (
                            <tr key={idx}>
                              <td className="px-3 py-2 text-center font-mono-num">{idx + 1}</td>
                              <td className="px-3 py-2 font-mono-num">01</td>
                              <td className="px-3 py-2 font-medium">{it.jenis}</td>
                              <td className="px-3 py-2">Keluarga Sedarah</td>
                              <td className="px-3 py-2 text-right font-mono-num font-bold">
                                {it.jumlah.toLocaleString('id-ID')}
                              </td>
                              {!isReadOnly && (
                                <td className="px-2 py-2 text-center">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setPayload({
                                        ...payload,
                                        bukanObjekItems: payload.bukanObjekItems.filter((_, i) => i !== idx),
                                      })
                                    }
                                    className="text-red-600 cursor-pointer"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </td>
                              )}
                            </tr>
                          ))
                        )}
                        <tr className="bg-[#FAFBFD] font-bold text-[#1E2C5E]">
                          <td colSpan={4} className="px-3 py-2 text-right">
                            JUMLAH TABEL B
                          </td>
                          <td className="px-3 py-2 text-right font-mono-num">
                            {payload.bukanObjekItems.reduce((s, i) => s + i.jumlah, 0).toLocaleString('id-ID')}
                          </td>
                          {!isReadOnly && <td />}
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* Bagian C: Penghasilan Neto Luar Negeri (PDF 1 Page 9) */}
            <div className="border border-slate-200 rounded overflow-hidden">
              <SectionBar id="l2C" title="C. PENGHASILAN NETO LUAR NEGERI" />
              {!collapsed.l2C && (
                <div className="p-3 overflow-x-auto bg-white">
                  <table className="w-full border border-slate-200 border-collapse text-[11px]">
                    <thead>
                      <tr className="bg-[#F6C324] text-[#1E293B] font-bold">
                        <th className="px-3 py-2 text-center border-r border-white/50">NO.</th>
                        <th className="px-3 py-2 text-left border-r border-white/50">SUMBER PENGHASILAN (NAMA &amp; NEGARA) ⇅</th>
                        <th className="px-3 py-2 text-center border-r border-white/50">TANGGAL TRANSAKSI ⇅</th>
                        <th className="px-3 py-2 text-left border-r border-white/50">JENIS PENGHASILAN ⇅</th>
                        <th className="px-3 py-2 text-right border-r border-white/50">PENGHASILAN NETO (RUPIAH) ⇅</th>
                        <th className="px-3 py-2 text-right border-r border-white/50">PPh DIBAYAR DI LUAR NEGERI (RUPIAH) ⇅</th>
                        <th className="px-3 py-2 text-right">KREDIT PAJAK YANG DAPAT DIPERHITUNGKAN ⇅</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td colSpan={7} className="px-3 py-3 text-slate-500">
                          Tidak ada data untuk ditampilkan.
                        </td>
                      </tr>
                      <tr className="bg-[#FAFBFD] font-bold text-[#1E2C5E] border-t border-slate-200">
                        <td colSpan={4} className="px-3 py-2 text-right">
                          JUMLAH PENGHASILAN NETO (Rupiah)
                        </td>
                        <td className="px-3 py-2 text-right font-mono-num">0</td>
                        <td className="px-3 py-2 text-right font-mono-num">0</td>
                        <td className="px-3 py-2 text-right font-mono-num">0</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Bottom Coretax Action Bar (Exact match to PDF 1 Page 5, 8, 9) */}
      <div className="px-5 py-3.5 bg-white border-t border-slate-200 space-y-2">
        {!isReadOnly && (
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={saving}
              onClick={handleSaveDraft}
              className="px-4 py-1.5 rounded-[4px] bg-[#1E2C5E] hover:bg-[#152048] text-white font-bold text-[11.5px] cursor-pointer disabled:opacity-60"
            >
              {saving ? 'Menyimpan...' : 'Simpan Konsep'}
            </button>
            <button
              type="button"
              disabled={saving || !declarationChecked}
              onClick={handlePrepareSubmit}
              className="px-4 py-1.5 rounded-[4px] bg-[#1E2C5E] hover:bg-[#152048] text-white font-bold text-[11.5px] cursor-pointer disabled:opacity-50"
            >
              Bayar dan Lapor
            </button>
          </div>
        )}
        <div>
          <button
            type="button"
            onClick={onBack}
            className="text-[11px] text-slate-600 hover:text-[#1E2C5E] hover:underline cursor-pointer"
          >
            Pergi ke pencarian
          </button>
        </div>
      </div>

      {/* Authentic L-1 Harta / Utang Modal (Exact match to PDF 1 Page 6 bottom "KAS DAN SETARA KAS") */}
      {assetModalTitle && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[6px] shadow-2xl border border-[#CBD5E1] max-w-lg w-full overflow-hidden">
            <div className="bg-[#1E2C5E] text-white px-5 py-3 font-bold text-[12.5px] uppercase">
              {assetModalTitle}
            </div>
            <div className="p-5 space-y-2.5 text-[11.5px]">
              <div className="grid grid-cols-12 items-center gap-2">
                <label className="col-span-4 text-slate-600">Kode *</label>
                <input
                  type="text"
                  value={newCode}
                  onChange={(e) => setNewCode(e.target.value)}
                  className="col-span-8 border border-[#CBD5E1] bg-[#EDF1F7] rounded-[3px] px-2.5 py-1.5 font-mono-num"
                />
              </div>
              <div className="grid grid-cols-12 items-center gap-2">
                <label className="col-span-4 text-slate-600">Deskripsi *</label>
                <input
                  type="text"
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  className="col-span-8 border border-[#CBD5E1] rounded-[3px] px-2.5 py-1.5"
                />
              </div>
              <div className="grid grid-cols-12 items-center gap-2">
                <label className="col-span-4 text-slate-600">Nomor Akun *</label>
                <input
                  type="text"
                  value={newAccountNo}
                  onChange={(e) => setNewAccountNo(e.target.value)}
                  className="col-span-8 border border-[#CBD5E1] bg-[#EDF1F7] rounded-[3px] px-2.5 py-1.5 font-mono-num"
                />
              </div>
              <div className="grid grid-cols-12 items-center gap-2">
                <label className="col-span-4 text-slate-600">Atas Nama *</label>
                <input
                  type="text"
                  readOnly
                  value={activeTaxpayer.name}
                  className="col-span-8 border border-[#CBD5E1] bg-[#EDF1F7] rounded-[3px] px-2.5 py-1.5"
                />
              </div>
              <div className="grid grid-cols-12 items-center gap-2">
                <label className="col-span-4 text-slate-600">Nama Bank/Institusi *</label>
                <input
                  type="text"
                  value={newBankName}
                  onChange={(e) => setNewBankName(e.target.value)}
                  className="col-span-8 border border-[#CBD5E1] bg-[#EDF1F7] rounded-[3px] px-2.5 py-1.5"
                />
              </div>
              <div className="grid grid-cols-12 items-center gap-2">
                <label className="col-span-4 text-slate-600">Lokasi Harta *</label>
                <select
                  value={newLocation}
                  onChange={(e) => setNewLocation(e.target.value)}
                  className="col-span-8 border border-[#CBD5E1] rounded-[3px] px-2.5 py-1.5 bg-white"
                >
                  <option value="Indonesia">Indonesia</option>
                  <option value="Luar Negeri">Luar Negeri</option>
                </select>
              </div>
              <div className="grid grid-cols-12 items-center gap-2">
                <label className="col-span-4 text-slate-600">Tahun Perolehan *</label>
                <input
                  type="number"
                  value={newYear}
                  onChange={(e) => setNewYear(Number(e.target.value) || taxReturn.taxYear)}
                  className="col-span-8 border border-[#CBD5E1] bg-[#EDF1F7] rounded-[3px] px-2.5 py-1.5 font-mono-num"
                />
              </div>
              <div className="grid grid-cols-12 items-center gap-2">
                <label className="col-span-4 text-slate-600">Saldo *</label>
                <input
                  type="number"
                  value={newAmount}
                  onChange={(e) => setNewAmount(Number(e.target.value) || 0)}
                  className="col-span-8 border border-[#CBD5E1] bg-white rounded-[3px] px-2.5 py-1.5 font-mono-num"
                />
              </div>
              <div className="grid grid-cols-12 items-center gap-2">
                <label className="col-span-4 text-slate-600">Keterangan</label>
                <input
                  type="text"
                  value={newRel}
                  onChange={(e) => setNewRel(e.target.value)}
                  className="col-span-8 border border-[#CBD5E1] rounded-[3px] px-2.5 py-1.5"
                />
              </div>
            </div>
            <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setAssetModalTitle(null)}
                className="px-3.5 py-1.5 rounded-[4px] border border-slate-300 bg-white text-slate-700 font-semibold text-xs cursor-pointer"
              >
                × Tutup
              </button>
              <button
                type="button"
                onClick={async () => {
                  await onAddAsset({
                    recordType: newRecType,
                    code: newCode,
                    description: newDesc,
                    yearAcquired: newYear,
                    amount: newAmount,
                    relationOrLender: `${newBankName} (${newAccountNo})`,
                  });
                  setAssetModalTitle(null);
                }}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-[4px] bg-[#1E2C5E] hover:bg-[#152048] text-white font-bold text-xs cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Simpan</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Coretax Pemberitahuan Modal before Tanda Tangan Dokumen (Exact match to PDF 1 Page 9 bottom) */}
      {noticeOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[6px] shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between">
              <h3 className="font-display font-bold text-[14px] text-[#1E293B]">Pemberitahuan</h3>
              <button
                type="button"
                onClick={() => setNoticeOpen(false)}
                className="text-slate-400 hover:text-slate-700 font-bold cursor-pointer"
              >
                ×
              </button>
            </div>
            <div className="p-5 space-y-2.5 text-[11px] text-slate-600 leading-relaxed">
              <div className="font-semibold text-slate-700">Apabila Anda:</div>
              <p>- memenuhi syarat dan ingin menggunakan Norma Penghitungan Penghasilan Neto untuk tahun Pajak berikutnya, harap sampaikan Pemberitahuan di Menu Layanan.</p>
              <p>- memenuhi syarat dan ingin menggunakan pembukuan dengan stelsel kas untuk Tahun Pajak berikutnya, harap sampaikan Pemberitahuan di Menu Layanan.</p>
              <p>- menerima penghasilan dividen yang dikecualikan dari objek pajak, harap sampaikan Laporan Realisasi Investasi secara terpisah di Menu Layanan.</p>
              <p>- belum menerima Surat Ketetapan Pajak (SKP) tahun sebelumnya, mohon sesuaikan angsuran PPh Pasal 25 mulai masa setelah SKP diterbitkan.</p>
              <p>- ingin mengubah atau memperbarui data profil/keluarga/rekening bank, silakan masuk ke Menu Registrasi.</p>
            </div>
            <div className="px-5 py-3 bg-white border-t border-slate-200 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  setNoticeOpen(false);
                  setSignOpen(true);
                }}
                className="px-4 py-1.5 rounded-[4px] bg-[#388E3C] hover:bg-[#2E7D32] text-white font-bold text-xs cursor-pointer"
              >
                × Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      <SignModal
        open={signOpen}
        title="Tanda Tangan Dokumen"
        description={`Penyampaian SPT Tahunan PPh Orang Pribadi Tahun ${taxReturn.taxYear} (${statusSptLabel}: ${formatRp(kurangLebih)}).`}
        signerName={activeTaxpayer.name}
        signerNik={activeTaxpayer.nikNpwp}
        confirmLabel="Konfirmasi Tanda Tangan"
        onClose={() => setSignOpen(false)}
        onConfirm={async () => {
          await onSubmit(taxReturn.id, kurangLebih > 0 ? paymentMethod : 'NONE');
          onBack();
        }}
      />
    </div>
  );
};
