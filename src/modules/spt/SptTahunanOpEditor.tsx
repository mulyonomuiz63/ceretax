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

  // Quick Add L-1 record
  const [newRecType, setNewRecType] = useState<'ASSET' | 'LIABILITY' | 'FAMILY'>('ASSET');
  const [newCode, setNewCode] = useState('011');
  const [newDesc, setNewDesc] = useState('');
  const [newYear, setNewYear] = useState(taxReturn.taxYear);
  const [newAmount, setNewAmount] = useState(0);
  const [newRel, setNewRel] = useState('');

  // Quick Add L-2 record
  const [newFinalJenis, setNewFinalJenis] = useState('Bunga Deposito / Tabungan Bank (20%)');
  const [newFinalDpp, setNewFinalDpp] = useState(12_000_000);
  const [newFinalPph, setNewFinalPph] = useState(2_400_000);
  const [newNonObjJenis, setNewNonObjJenis] = useState('Hibah / Bantuan Keluarga Sedarah');
  const [newNonObjAmt, setNewNonObjAmt] = useState(25_000_000);

  const isReadOnly = taxReturn.status !== 'DRAFT';
  const toggleSection = (key: string) => setCollapsed((p) => ({ ...p, [key]: !p[key] }));

  const bpa1Slips = workspace.slips.filter(
    (s) => s.slipType === 'BPA1' && s.status === 'ISSUED' && s.taxPeriodYear === taxReturn.taxYear
  );

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
  }> = ({ value, onChange, hintYes }) => (
    <div className="flex flex-wrap items-center gap-3">
      <label className="inline-flex items-center gap-1.5 cursor-pointer text-[12px] font-medium text-slate-800">
        <input
          type="radio"
          disabled={isReadOnly}
          checked={value === true}
          onChange={() => onChange(true)}
          className="accent-[#1E2C5E]"
        />
        <span>Ya</span>
      </label>
      <label className="inline-flex items-center gap-1.5 cursor-pointer text-[12px] font-medium text-slate-800">
        <input
          type="radio"
          disabled={isReadOnly}
          checked={value === false}
          onChange={() => onChange(false)}
          className="accent-[#1E2C5E]"
        />
        <span>Tidak</span>
      </label>
      {value && hintYes && (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded bg-[#D8F1FD] text-[#0E4A6B] text-[11px] font-medium border border-[#A9E0FA]">
          <Info className="w-3 h-3 shrink-0" />
          <span>{hintYes}</span>
        </span>
      )}
    </div>
  );

  return (
    <div className="bg-white border border-[#D9E0E8] rounded-md overflow-hidden shadow-xs">
      {/* Top Coretax Document Title Bar */}
      <div className="px-5 pt-4 pb-3 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display font-extrabold text-[15px] text-[#1E2C5E] uppercase tracking-tight">
            SPT TAHUNAN PAJAK PENGHASILAN (PPh) WAJIB PAJAK ORANG PRIBADI
          </h2>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Tahun Pajak {taxReturn.taxYear} · {taxReturn.revisionNo === 0 ? 'Normal' : `Pembetulan ke-${taxReturn.revisionNo}`} · Status:{' '}
            <strong className="text-[#1E2C5E]">{taxReturn.status === 'DRAFT' ? 'Konsep SPT' : 'Dilaporkan'}</strong>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded border border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-600">
            <Settings className="w-3.5 h-3.5 text-[#1E2C5E]" />
            <span>XML Monitoring</span>
          </span>
        </div>
      </div>

      {/* Horizontal Coretax Tabs */}
      <div className="px-5 pt-3 bg-[#F8FAFC] border-b border-slate-200 flex items-center gap-1.5 overflow-x-auto">
        {[
          { id: 'induk' as OpTab, label: 'Induk' },
          { id: 'l1' as OpTab, label: 'L-1' },
          { id: 'l2' as OpTab, label: 'L-2' },
        ].map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`px-5 py-2 text-[12px] font-bold rounded-t border-t border-x whitespace-nowrap cursor-pointer transition-colors ${
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
            {/* HEADER */}
            <div className="border border-slate-200 rounded overflow-hidden">
              <SectionBar id="header" title="HEADER" />
              {!collapsed.header && (
                <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4 bg-white">
                  <div className="space-y-2.5">
                    <div className="grid grid-cols-12 items-center gap-2">
                      <label className="col-span-5 font-semibold text-slate-700">Tahun Pajak</label>
                      <input
                        type="text"
                        readOnly
                        value={String(taxReturn.taxYear)}
                        className="col-span-7 border border-slate-200 bg-slate-100 rounded px-3 py-1.5 font-mono-num text-slate-700"
                      />
                    </div>
                    <div className="grid grid-cols-12 items-center gap-2">
                      <label className="col-span-5 font-semibold text-slate-700">Status SPT</label>
                      <input
                        type="text"
                        readOnly
                        value={taxReturn.revisionNo === 0 ? 'Normal' : `Pembetulan ke-${taxReturn.revisionNo}`}
                        className="col-span-7 border border-slate-200 bg-slate-100 rounded px-3 py-1.5 text-slate-700"
                      />
                    </div>
                    <div className="grid grid-cols-12 items-center gap-2">
                      <label className="col-span-5 font-semibold text-slate-700">Sumber Penghasilan</label>
                      <input
                        type="text"
                        readOnly
                        value={
                          payload.sumberPenghasilanUsaha
                            ? 'Pekerjaan & Kegiatan Usaha'
                            : 'Pekerjaan (Pegawai Tetap)'
                        }
                        className="col-span-7 border border-slate-200 bg-slate-100 rounded px-3 py-1.5 text-slate-700"
                      />
                    </div>
                  </div>
                  <div className="space-y-2.5 flex flex-col justify-between">
                    <div className="grid grid-cols-12 items-center gap-2">
                      <label className="col-span-5 font-semibold text-slate-700">Metode Pembukuan</label>
                      <input
                        type="text"
                        readOnly
                        value="Pencatatan"
                        className="col-span-7 border border-slate-200 bg-slate-100 rounded px-3 py-1.5 text-slate-700"
                      />
                    </div>
                    {!isReadOnly && (
                      <div className="flex items-center justify-end gap-2 pt-2">
                        <button
                          type="button"
                          onClick={handlePostingSpt}
                          className="inline-flex items-center gap-1.5 bg-[#1E2C5E] hover:bg-[#152048] text-white font-bold text-[12px] px-4 py-2 rounded cursor-pointer shadow-xs"
                        >
                          <RefreshCw className="w-3.5 h-3.5 text-[#F7CA36]" />
                          <span>Posting SPT</span>
                        </button>
                      </div>
                    )}
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
                    <label className="col-span-5 font-semibold text-slate-700">NPWP / NIK</label>
                    <input
                      type="text"
                      readOnly
                      value={activeTaxpayer.nikNpwp}
                      className="col-span-7 border border-slate-200 bg-slate-100 rounded px-3 py-1.5 font-mono-num"
                    />
                  </div>
                  <div className="grid grid-cols-12 items-center gap-2">
                    <label className="col-span-5 font-semibold text-slate-700">Nama Wajib Pajak</label>
                    <input
                      type="text"
                      readOnly
                      value={activeTaxpayer.name}
                      className="col-span-7 border border-slate-200 bg-slate-100 rounded px-3 py-1.5 font-semibold"
                    />
                  </div>
                  <div className="grid grid-cols-12 items-center gap-2">
                    <label className="col-span-5 font-semibold text-slate-700">Jenis Identitas</label>
                    <input
                      type="text"
                      readOnly
                      value="NIK (Wajib Pajak Orang Pribadi)"
                      className="col-span-7 border border-slate-200 bg-slate-100 rounded px-3 py-1.5"
                    />
                  </div>
                  <div className="grid grid-cols-12 items-center gap-2">
                    <label className="col-span-5 font-semibold text-slate-700">Status Kewajiban Pajak</label>
                    <input
                      type="text"
                      readOnly
                      value="KK — Kepala Keluarga"
                      className="col-span-7 border border-slate-200 bg-slate-100 rounded px-3 py-1.5"
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
                    <label className="col-span-5 font-semibold text-slate-700">Nomor Telepon</label>
                    <input
                      type="text"
                      readOnly
                      value="0812-0000-1945"
                      className="col-span-7 border border-slate-200 bg-slate-100 rounded px-3 py-1.5 font-mono-num"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* B. IKHTISAR PENGHASILAN NETO */}
            <div className="border border-slate-200 rounded overflow-hidden">
              <SectionBar
                id="secB"
                title="B. IKHTISAR PENGHASILAN NETO"
                rightText={`Total Neto: ${formatRp(totalNeto)}`}
              />
              {!collapsed.secB && (
                <div className="p-4 space-y-3 bg-white">
                  {/* 1.a */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-2 items-center pb-2.5 border-b border-slate-100">
                    <div className="lg:col-span-6">
                      <div className="font-semibold text-slate-800">
                        1.a. Apakah Anda menerima penghasilan dalam negeri dari pekerjaan?
                      </div>
                      <div className="mt-1">
                        <RadioYesNo
                          value={payload.sumberPenghasilanPekerjaan}
                          onChange={(v) => setPayload({ ...payload, sumberPenghasilanPekerjaan: v })}
                          hintYes="Silakan periksa Lampiran L-1 Bagian D & E (BPA1)"
                        />
                      </div>
                    </div>
                    <div className="lg:col-span-6 grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[11px] text-slate-500 mb-0.5">Bruto Pekerjaan (Rp)</label>
                        <input
                          type="number"
                          disabled={isReadOnly}
                          value={payload.penghasilanBrutoPekerjaan}
                          onChange={(e) =>
                            setPayload({ ...payload, penghasilanBrutoPekerjaan: Number(e.target.value) || 0 })
                          }
                          className="w-full text-right border border-slate-300 rounded px-2.5 py-1.5 font-mono-num"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] text-slate-500 mb-0.5">Biaya Jabatan / Pensiun (Rp)</label>
                        <input
                          type="number"
                          disabled={isReadOnly}
                          value={payload.biayaJabatanPensiun}
                          onChange={(e) =>
                            setPayload({ ...payload, biayaJabatanPensiun: Number(e.target.value) || 0 })
                          }
                          className="w-full text-right border border-slate-300 rounded px-2.5 py-1.5 font-mono-num"
                        />
                      </div>
                    </div>
                  </div>

                  {/* 1.b */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-2 items-center pb-2.5 border-b border-slate-100">
                    <div className="lg:col-span-8">
                      <div className="font-semibold text-slate-800">
                        1.b. Apakah Anda menerima penghasilan dari usaha dan/atau pekerjaan bebas?
                      </div>
                      <div className="mt-1">
                        <RadioYesNo
                          value={payload.sumberPenghasilanUsaha}
                          onChange={(v) => setPayload({ ...payload, sumberPenghasilanUsaha: v })}
                          hintYes="Isikan penghasilan neto usaha pada kolom nominal"
                        />
                      </div>
                    </div>
                    <div className="lg:col-span-4">
                      <input
                        type="number"
                        disabled={isReadOnly || !payload.sumberPenghasilanUsaha}
                        value={payload.penghasilanNetoUsaha}
                        onChange={(e) =>
                          setPayload({ ...payload, penghasilanNetoUsaha: Number(e.target.value) || 0 })
                        }
                        className="w-full text-right border border-slate-300 disabled:bg-slate-100 rounded px-2.5 py-1.5 font-mono-num"
                      />
                    </div>
                  </div>

                  {/* 1.c */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-2 items-center pb-2.5 border-b border-slate-100">
                    <div className="lg:col-span-8 font-medium text-slate-700">
                      1.c. Penghasilan Neto Dalam Negeri Lainnya (Bunga, Royalti, Sewa Non-Final)
                    </div>
                    <div className="lg:col-span-4">
                      <input
                        type="number"
                        disabled={isReadOnly}
                        value={payload.penghasilanNetoDalamNegeriLain}
                        onChange={(e) =>
                          setPayload({ ...payload, penghasilanNetoDalamNegeriLain: Number(e.target.value) || 0 })
                        }
                        className="w-full text-right border border-slate-300 rounded px-2.5 py-1.5 font-mono-num"
                      />
                    </div>
                  </div>

                  {/* 1.d */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-2 items-center pb-2.5 border-b border-slate-200">
                    <div className="lg:col-span-8 font-medium text-slate-700">
                      1.d. Penghasilan Neto Luar Negeri (Lampiran L-2 Bagian C)
                    </div>
                    <div className="lg:col-span-4">
                      <input
                        type="number"
                        disabled={isReadOnly}
                        value={payload.penghasilanNetoLuarNegeri}
                        onChange={(e) =>
                          setPayload({ ...payload, penghasilanNetoLuarNegeri: Number(e.target.value) || 0 })
                        }
                        className="w-full text-right border border-slate-300 rounded px-2.5 py-1.5 font-mono-num"
                      />
                    </div>
                  </div>

                  <div className="flex justify-between items-center bg-[#F8FAFC] px-3 py-2 rounded font-bold text-[#1E2C5E]">
                    <span>Jumlah Penghasilan Neto (1.a Neto + 1.b + 1.c + 1.d)</span>
                    <span className="font-mono-num">{formatRp(totalNeto)}</span>
                  </div>
                </div>
              )}
            </div>

            {/* C. PERHITUNGAN PAJAK TERUTANG */}
            <div className="border border-slate-200 rounded overflow-hidden">
              <SectionBar
                id="secC"
                title="C. PERHITUNGAN PAJAK TERUTANG"
                rightText={`PPh Terutang: ${formatRp(pphTerutang)}`}
              />
              {!collapsed.secC && (
                <div className="p-4 space-y-2.5 bg-white">
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-2 items-center">
                    <label className="lg:col-span-8 text-slate-700">2. Zakat atau Sumbangan Keagamaan Wajib</label>
                    <input
                      type="number"
                      disabled={isReadOnly}
                      value={payload.zakatSumbangan}
                      onChange={(e) => setPayload({ ...payload, zakatSumbangan: Number(e.target.value) || 0 })}
                      className="lg:col-span-4 text-right border border-slate-300 rounded px-2.5 py-1.5 font-mono-num"
                    />
                  </div>
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-2 items-center">
                    <label className="lg:col-span-8 font-medium text-slate-700">
                      3. Penghasilan Neto Setelah Pengurangan Zakat/Sumbangan
                    </label>
                    <input
                      type="text"
                      readOnly
                      value={formatRp(netoSetelahZakat)}
                      className="lg:col-span-4 text-right border border-slate-200 bg-slate-100 rounded px-2.5 py-1.5 font-mono-num font-semibold"
                    />
                  </div>
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-2 items-center">
                    <label className="lg:col-span-5 font-semibold text-slate-700">
                      4. Penghasilan Tidak Kena Pajak (PTKP)
                    </label>
                    <select
                      disabled={isReadOnly}
                      value={payload.statusPtkp}
                      onChange={(e) => setPayload({ ...payload, statusPtkp: e.target.value as PtkpStatus })}
                      className="lg:col-span-3 border border-slate-300 rounded px-2.5 py-1.5 bg-white font-semibold"
                    >
                      {(Object.keys(PTKP_VALUES) as PtkpStatus[]).map((k) => (
                        <option key={k} value={k}>
                          {k} ({formatRp(PTKP_VALUES[k])})
                        </option>
                      ))}
                    </select>
                    <input
                      type="text"
                      readOnly
                      value={formatRp(ptkpAmount)}
                      className="lg:col-span-4 text-right border border-slate-200 bg-slate-100 rounded px-2.5 py-1.5 font-mono-num"
                    />
                  </div>
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-2 items-center">
                    <label className="lg:col-span-8 font-semibold text-[#1E2C5E]">
                      5. Penghasilan Kena Pajak (PKP)
                    </label>
                    <input
                      type="text"
                      readOnly
                      value={formatRp(pkpAmount)}
                      className="lg:col-span-4 text-right border border-slate-200 bg-slate-100 rounded px-2.5 py-1.5 font-mono-num font-bold text-[#1E2C5E]"
                    />
                  </div>
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-2 items-center pt-1 border-t border-slate-200">
                    <label className="lg:col-span-8 font-bold text-[#1E2C5E]">
                      6. PPh Terutang (Tarif Progresif Pasal 17 UU HPP)
                    </label>
                    <input
                      type="text"
                      readOnly
                      value={formatRp(pphTerutang)}
                      className="lg:col-span-4 text-right border border-[#1E2C5E]/30 bg-[#EEF3FA] rounded px-2.5 py-1.5 font-mono-num font-extrabold text-[#1E2C5E]"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* D. KREDIT PAJAK */}
            <div className="border border-slate-200 rounded overflow-hidden">
              <SectionBar
                id="secD"
                title="D. KREDIT PAJAK"
                rightText={`Total Kredit: ${formatRp(totalKredit)}`}
              />
              {!collapsed.secD && (
                <div className="p-4 space-y-2.5 bg-white">
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-2 items-center">
                    <label className="lg:col-span-8 text-slate-700">
                      10.a. PPh yang Dipotong/Dipungut oleh Pihak Lain (Bukti Potong BPA1 / L-1 Bagian E)
                    </label>
                    <input
                      type="number"
                      disabled={isReadOnly}
                      value={payload.kreditPajakBpa1}
                      onChange={(e) => setPayload({ ...payload, kreditPajakBpa1: Number(e.target.value) || 0 })}
                      className="lg:col-span-4 text-right border border-slate-300 rounded px-2.5 py-1.5 font-mono-num"
                    />
                  </div>
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-2 items-center">
                    <label className="lg:col-span-8 text-slate-700">
                      10.b. PPh yang Dibayar Sendiri (Angsuran PPh Pasal 25 / STP Pokok)
                    </label>
                    <input
                      type="number"
                      disabled={isReadOnly}
                      value={payload.angsuranPph25}
                      onChange={(e) => setPayload({ ...payload, angsuranPph25: Number(e.target.value) || 0 })}
                      className="lg:col-span-4 text-right border border-slate-300 rounded px-2.5 py-1.5 font-mono-num"
                    />
                  </div>
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-2 items-center pt-1 border-t border-slate-200">
                    <label className="lg:col-span-8 font-bold text-emerald-800">
                      10.d. Jumlah Kredit Pajak (10.a + 10.b)
                    </label>
                    <input
                      type="text"
                      readOnly
                      value={formatRp(totalKredit)}
                      className="lg:col-span-4 text-right border border-emerald-200 bg-emerald-50 rounded px-2.5 py-1.5 font-mono-num font-bold text-emerald-800"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* E. PPh KURANG / LEBIH BAYAR */}
            <div className="border border-slate-200 rounded overflow-hidden">
              <SectionBar
                id="secE"
                title="E. PPh KURANG / LEBIH BAYAR"
                rightText={`${statusSptLabel}: ${formatRp(kurangLebih)}`}
              />
              {!collapsed.secE && (
                <div className="p-4 space-y-3 bg-white">
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-2 items-center">
                    <label className="lg:col-span-8 font-bold text-[#1E2C5E]">
                      11.a. PPh yang Kurang / (Lebih) Dibayar (Angka 6 dikurangi Angka 10.d)
                    </label>
                    <input
                      type="text"
                      readOnly
                      value={formatRp(kurangLebih)}
                      className="lg:col-span-4 text-right border border-[#F7CA36] bg-[#FEF9E7] rounded px-2.5 py-1.5 font-mono-num font-extrabold text-[#1E2C5E]"
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

            {/* F - H COMPACT SECTIONS */}
            <div className="border border-slate-200 rounded overflow-hidden">
              <SectionBar id="secFGH" title="F. PEMBETULAN, G. PENGEMBALIAN & H. ANGSURAN PPh PASAL 25" />
              {!collapsed.secFGH && (
                <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-3 bg-white text-[12px]">
                  <div className="p-2.5 border border-slate-200 rounded bg-slate-50">
                    <div className="font-bold text-[#1E2C5E]">F. Pembetulan</div>
                    <div className="text-slate-600 mt-1">
                      {taxReturn.revisionNo === 0 ? 'SPT Normal (Tidak Berlaku)' : `Pembetulan ke-${taxReturn.revisionNo}`}
                    </div>
                  </div>
                  <div className="p-2.5 border border-slate-200 rounded bg-slate-50">
                    <div className="font-bold text-[#1E2C5E]">G. Permohonan Pengembalian</div>
                    <div className="text-slate-600 mt-1">
                      {kurangLebih < 0 ? 'Pengembalian Pendahuluan Pasal 17C/17D' : 'Tidak Ada Lebih Bayar'}
                    </div>
                  </div>
                  <div className="p-2.5 border border-slate-200 rounded bg-slate-50">
                    <div className="font-bold text-[#1E2C5E]">H. Angsuran PPh 25 Berikutnya</div>
                    <div className="font-mono-num font-bold text-[#1E2C5E] mt-1">
                      {formatRp(Math.max(0, Math.round(kurangLebih / 12)))} / bulan
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* I. PERNYATAAN TRANSAKSI LAINNYA */}
            <div className="border border-slate-200 rounded overflow-hidden">
              <SectionBar id="secI" title="I. PERNYATAAN TRANSAKSI LAINNYA & J. LAMPIRAN" />
              {!collapsed.secI && (
                <div className="p-4 space-y-3 bg-white">
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-100">
                    <span className="font-medium text-slate-800">
                      14.a. Apakah Anda memiliki harta dan/atau utang pada akhir tahun pajak?
                    </span>
                    <RadioYesNo
                      value={payload.punyaHartaUtang}
                      onChange={(v) => setPayload({ ...payload, punyaHartaUtang: v })}
                      hintYes="Silakan lengkapi Lampiran L-1 Bagian A & B"
                    />
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-100">
                    <span className="font-medium text-slate-800">
                      14.b. Apakah Anda menerima penghasilan yang dikenakan PPh bersifat final?
                    </span>
                    <RadioYesNo
                      value={payload.punyaPphFinal}
                      onChange={(v) => setPayload({ ...payload, punyaPphFinal: v })}
                      hintYes="Silakan lengkapi Lampiran L-2 Bagian A"
                    />
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-medium text-slate-800">
                      14.c. Apakah Anda menerima penghasilan yang tidak termasuk objek pajak?
                    </span>
                    <RadioYesNo
                      value={payload.punyaBukanObjek}
                      onChange={(v) => setPayload({ ...payload, punyaBukanObjek: v })}
                      hintYes="Silakan lengkapi Lampiran L-2 Bagian B"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* K. PERNYATAAN */}
            <div className="border border-slate-200 rounded overflow-hidden">
              <SectionBar id="secK" title="K. PERNYATAAN" />
              {!collapsed.secK && (
                <div className="p-4 space-y-3 bg-white">
                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      disabled={isReadOnly}
                      checked={declarationChecked}
                      onChange={(e) => setDeclarationChecked(e.target.checked)}
                      className="mt-0.5 accent-[#1E2C5E]"
                    />
                    <span className="text-slate-700 leading-relaxed">
                      Saya menyatakan bahwa seluruh data dan lampiran yang disampaikan dalam SPT Tahunan PPh Orang Pribadi ini telah diisi dengan benar, lengkap, dan jelas.
                    </span>
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">Penandatangan</label>
                      <input
                        type="text"
                        readOnly
                        value={`${activeTaxpayer.name} (${activeTaxpayer.nikNpwp})`}
                        className="w-full border border-slate-200 bg-slate-100 rounded px-3 py-1.5 font-semibold"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">Tanggal SPT</label>
                      <input
                        type="text"
                        readOnly
                        value={new Date().toLocaleDateString('id-ID')}
                        className="w-full border border-slate-200 bg-slate-100 rounded px-3 py-1.5 font-mono-num"
                      />
                    </div>
                  </div>
                  <div className="bg-[#D8F1FD] border border-[#9CDDFB] text-[#0E4A6B] px-4 py-2.5 rounded flex items-center justify-between font-bold">
                    <span>Status SPT : {statusSptLabel}</span>
                    <span className="font-mono-num">{formatRp(kurangLebih)}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ==================== TAB: LAMPIRAN L-1 ==================== */}
        {tab === 'l1' && (
          <div className="space-y-4">
            <div className="bg-[#F8FAFC] border border-slate-200 rounded p-3.5 text-slate-700">
              <div className="font-bold text-[#1E2C5E] mb-1">LAMPIRAN L-1 — INFORMASI HARTA, UTANG, KELUARGA &amp; BUKTI POTONG</div>
              <ul className="list-disc pl-5 space-y-0.5 text-[11px]">
                <li>Bagian A: Harta pada Akhir Tahun Pajak (Total: <strong>{formatRp(totalHarta)}</strong>)</li>
                <li>Bagian B: Utang pada Akhir Tahun Pajak (Total: <strong>{formatRp(totalUtang)}</strong>)</li>
                <li>Bagian C: Daftar Anggota Keluarga yang Menjadi Tanggungan ({familyList.length} orang)</li>
                <li>Bagian D &amp; E: Penghasilan Neto Pekerjaan &amp; Daftar Bukti Potong BPA1 ({bpa1Slips.length} bukti potong)</li>
              </ul>
            </div>

            {!isReadOnly && (
              <div className="p-3.5 bg-[#F8FAFC] border border-slate-200 rounded grid grid-cols-1 md:grid-cols-6 gap-2 items-end">
                <div>
                  <label className="block text-[11px] font-bold text-[#1E2C5E] mb-1">Bagian L-1</label>
                  <select
                    value={newRecType}
                    onChange={(e) => setNewRecType(e.target.value as 'ASSET' | 'LIABILITY' | 'FAMILY')}
                    className="w-full border border-slate-300 rounded px-2 py-1.5 bg-white"
                  >
                    <option value="ASSET">Bagian A — Harta</option>
                    <option value="LIABILITY">Bagian B — Utang</option>
                    <option value="FAMILY">Bagian C — Keluarga</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#1E2C5E] mb-1">Kode</label>
                  <input
                    type="text"
                    value={newCode}
                    onChange={(e) => setNewCode(e.target.value)}
                    className="w-full border border-slate-300 rounded px-2 py-1.5 font-mono-num"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-[11px] font-bold text-[#1E2C5E] mb-1">Deskripsi / Nama</label>
                  <input
                    type="text"
                    value={newDesc}
                    onChange={(e) => setNewDesc(e.target.value)}
                    placeholder="Contoh: Tabungan Bank / KPR / Istri"
                    className="w-full border border-slate-300 rounded px-2 py-1.5"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#1E2C5E] mb-1">Nilai (Rp)</label>
                  <input
                    type="number"
                    value={newAmount}
                    onChange={(e) => setNewAmount(Number(e.target.value) || 0)}
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
                    setNewRel('');
                  }}
                  className="inline-flex items-center justify-center gap-1 bg-[#1E2C5E] hover:bg-[#152048] text-white font-bold px-3 py-1.5 rounded cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 text-[#F7CA36]" />
                  <span>Tambah</span>
                </button>
              </div>
            )}

            {/* Bagian A: Harta */}
            <div className="border border-slate-200 rounded overflow-hidden">
              <SectionBar id="l1A" title="A. HARTA PADA AKHIR TAHUN PAJAK" rightText={formatRp(totalHarta)} />
              {!collapsed.l1A && (
                <div className="p-3 space-y-2">
                  <CoretaxIconToolbar
                    onExportCsv={() =>
                      downloadCsvFile(
                        `L1-Harta-${taxReturn.taxYear}.csv`,
                        ['Kode', 'Nama Harta', 'Tahun', 'Keterangan', 'Nilai'],
                        assetList.map((a) => [a.code, a.description, String(a.yearAcquired), a.relationOrLender, String(a.amount)])
                      )
                    }
                  />
                  <div className="overflow-x-auto">
                    <table className="w-full border border-slate-300 border-collapse text-[12px]">
                      <thead>
                        <tr className="bg-[#F7CA36] text-[#1E2C5E] font-bold">
                          <th className="px-3 py-2 text-left border-r border-[#E5B822]">Kode</th>
                          <th className="px-3 py-2 text-left border-r border-[#E5B822]">Deskripsi Harta</th>
                          <th className="px-3 py-2 text-center border-r border-[#E5B822]">Tahun Perolehan</th>
                          <th className="px-3 py-2 text-left border-r border-[#E5B822]">Keterangan</th>
                          <th className="px-3 py-2 text-right">Harga Perolehan / Nilai (Rp)</th>
                          {!isReadOnly && <th className="px-2 py-2 w-10" />}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {assetList.map((a) => (
                          <tr key={a.id} className="hover:bg-slate-50">
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
                        <tr className="bg-slate-100 font-bold text-[#1E2C5E]">
                          <td colSpan={4} className="px-3 py-2 text-right">IKHTISAR TOTAL HARTA</td>
                          <td className="px-3 py-2 text-right font-mono-num">{formatRp(totalHarta)}</td>
                          {!isReadOnly && <td />}
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* Bagian B: Utang */}
            <div className="border border-slate-200 rounded overflow-hidden">
              <SectionBar id="l1B" title="B. UTANG PADA AKHIR TAHUN PAJAK" rightText={formatRp(totalUtang)} />
              {!collapsed.l1B && (
                <div className="p-3 overflow-x-auto">
                  <table className="w-full border border-slate-300 border-collapse text-[12px]">
                    <thead>
                      <tr className="bg-[#F7CA36] text-[#1E2C5E] font-bold">
                        <th className="px-3 py-2 text-left border-r border-[#E5B822]">Kode</th>
                        <th className="px-3 py-2 text-left border-r border-[#E5B822]">Jenis Utang</th>
                        <th className="px-3 py-2 text-left border-r border-[#E5B822]">Nama Pemberi Pinjaman</th>
                        <th className="px-3 py-2 text-center border-r border-[#E5B822]">Tahun</th>
                        <th className="px-3 py-2 text-right">Saldo Utang (Rp)</th>
                        {!isReadOnly && <th className="px-2 py-2 w-10" />}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {liabList.map((a) => (
                        <tr key={a.id} className="hover:bg-slate-50">
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
                                className="text-red-600 hover:text-red-800 cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          )}
                        </tr>
                      ))}
                      <tr className="bg-slate-100 font-bold text-[#1E2C5E]">
                        <td colSpan={4} className="px-3 py-2 text-right">TOTAL UTANG</td>
                        <td className="px-3 py-2 text-right font-mono-num">{formatRp(totalUtang)}</td>
                        {!isReadOnly && <td />}
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Bagian C: Keluarga */}
            <div className="border border-slate-200 rounded overflow-hidden">
              <SectionBar id="l1C" title="C. DAFTAR ANGGOTA KELUARGA YANG MENJADI TANGGUNGAN" />
              {!collapsed.l1C && (
                <div className="p-3 overflow-x-auto">
                  <table className="w-full border border-slate-300 border-collapse text-[12px]">
                    <thead>
                      <tr className="bg-[#F7CA36] text-[#1E2C5E] font-bold">
                        <th className="px-3 py-2 text-left border-r border-[#E5B822]">Nama Anggota Keluarga</th>
                        <th className="px-3 py-2 text-left border-r border-[#E5B822]">NIK</th>
                        <th className="px-3 py-2 text-left">Hubungan Keluarga</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {familyList.length === 0 ? (
                        <tr>
                          <td colSpan={3} className="px-3 py-4 text-center text-slate-400">
                            Tidak ada anggota keluarga tanggungan tercatat.
                          </td>
                        </tr>
                      ) : (
                        familyList.map((f) => (
                          <tr key={f.id}>
                            <td className="px-3 py-2 font-semibold">{f.description}</td>
                            <td className="px-3 py-2 font-mono-num">{f.nikMember || '-'}</td>
                            <td className="px-3 py-2">{f.relationOrLender}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Bagian D & E: Penghasilan Neto Pekerjaan & Daftar Bukti Potong */}
            <div className="border border-slate-200 rounded overflow-hidden">
              <SectionBar
                id="l1DE"
                title="D. PENGHASILAN NETO PEKERJAAN & E. DAFTAR BUKTI PEMOTONGAN PPh (BPA1)"
                rightText={`${bpa1Slips.length} Bukti Potong`}
              />
              {!collapsed.l1DE && (
                <div className="p-3 overflow-x-auto">
                  <table className="w-full border border-slate-300 border-collapse text-[12px]">
                    <thead>
                      <tr className="bg-[#F7CA36] text-[#1E2C5E] font-bold">
                        <th className="px-3 py-2 text-left border-r border-[#E5B822]">Nomor Bukti Potong</th>
                        <th className="px-3 py-2 text-left border-r border-[#E5B822]">Nama Pemberi Kerja / Pemotong</th>
                        <th className="px-3 py-2 text-right border-r border-[#E5B822]">Penghasilan Bruto</th>
                        <th className="px-3 py-2 text-right border-r border-[#E5B822]">Pengurang</th>
                        <th className="px-3 py-2 text-right border-r border-[#E5B822]">Penghasilan Neto</th>
                        <th className="px-3 py-2 text-right">PPh Dipotong</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {bpa1Slips.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-3 py-4 text-center text-slate-400">
                            Belum ada bukti potong BPA1 yang terbit untuk tahun pajak {taxReturn.taxYear}.
                          </td>
                        </tr>
                      ) : (
                        bpa1Slips.map((s) => {
                          const pengurang = (s.positionAllowance || 0) + (s.pensionContribution || 0);
                          const neto = Math.max(0, s.grossAmount - pengurang);
                          return (
                            <tr key={s.id}>
                              <td className="px-3 py-2 font-mono-num font-semibold">{s.slipNumber}</td>
                              <td className="px-3 py-2">{s.issuerName}</td>
                              <td className="px-3 py-2 text-right font-mono-num">{formatRp(s.grossAmount)}</td>
                              <td className="px-3 py-2 text-right font-mono-num">{formatRp(pengurang)}</td>
                              <td className="px-3 py-2 text-right font-mono-num font-semibold">{formatRp(neto)}</td>
                              <td className="px-3 py-2 text-right font-mono-num font-bold text-[#1E2C5E]">
                                {formatRp(s.taxWithheld)}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ==================== TAB: LAMPIRAN L-2 ==================== */}
        {tab === 'l2' && (
          <div className="space-y-4">
            <div className="bg-[#D8F1FD] border border-[#9CDDFB] text-[#0E4A6B] px-4 py-2.5 rounded">
              <strong>LAMPIRAN L-2:</strong> Daftar penghasilan yang dikenakan PPh bersifat final, penghasilan yang tidak termasuk objek pajak, dan penghasilan neto luar negeri.
            </div>

            {/* Bagian A: PPh Final */}
            <div className="border border-slate-200 rounded overflow-hidden">
              <SectionBar id="l2A" title="A. PENGHASILAN YANG DIKENAKAN PPh BERSIFAT FINAL" />
              {!collapsed.l2A && (
                <div className="p-3 space-y-3">
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
                        className="md:col-span-2 inline-flex items-center justify-center gap-1 bg-[#1E2C5E] text-white font-bold px-3 py-1.5 rounded cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5 text-[#F7CA36]" />
                        <span>Tambah</span>
                      </button>
                    </div>
                  )}
                  <table className="w-full border border-slate-300 border-collapse text-[12px]">
                    <thead>
                      <tr className="bg-[#F7CA36] text-[#1E2C5E] font-bold">
                        <th className="px-3 py-2 text-left border-r border-[#E5B822]">Jenis Penghasilan</th>
                        <th className="px-3 py-2 text-right border-r border-[#E5B822]">Dasar Pengenaan Pajak (Rp)</th>
                        <th className="px-3 py-2 text-right">PPh Terutang (Rp)</th>
                        {!isReadOnly && <th className="px-2 py-2 w-10" />}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {payload.pphFinalItems.length === 0 ? (
                        <tr>
                          <td colSpan={isReadOnly ? 3 : 4} className="px-3 py-4 text-center text-slate-400">
                            Tidak ada data penghasilan PPh Final.
                          </td>
                        </tr>
                      ) : (
                        payload.pphFinalItems.map((it, idx) => (
                          <tr key={idx}>
                            <td className="px-3 py-2 font-medium">{it.jenis}</td>
                            <td className="px-3 py-2 text-right font-mono-num">{formatRp(it.dpp)}</td>
                            <td className="px-3 py-2 text-right font-mono-num font-bold">{formatRp(it.pph)}</td>
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
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Bagian B: Bukan Objek Pajak */}
            <div className="border border-slate-200 rounded overflow-hidden">
              <SectionBar id="l2B" title="B. PENGHASILAN YANG TIDAK TERMASUK OBJEK PAJAK" />
              {!collapsed.l2B && (
                <div className="p-3 space-y-3">
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
                        className="md:col-span-2 inline-flex items-center justify-center gap-1 bg-[#1E2C5E] text-white font-bold px-3 py-1.5 rounded cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5 text-[#F7CA36]" />
                        <span>Tambah</span>
                      </button>
                    </div>
                  )}
                  <table className="w-full border border-slate-300 border-collapse text-[12px]">
                    <thead>
                      <tr className="bg-[#F7CA36] text-[#1E2C5E] font-bold">
                        <th className="px-3 py-2 text-left border-r border-[#E5B822]">Jenis Penghasilan</th>
                        <th className="px-3 py-2 text-right">Penghasilan Bruto (Rp)</th>
                        {!isReadOnly && <th className="px-2 py-2 w-10" />}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {payload.bukanObjekItems.length === 0 ? (
                        <tr>
                          <td colSpan={isReadOnly ? 2 : 3} className="px-3 py-4 text-center text-slate-400">
                            Tidak ada data penghasilan bukan objek pajak.
                          </td>
                        </tr>
                      ) : (
                        payload.bukanObjekItems.map((it, idx) => (
                          <tr key={idx}>
                            <td className="px-3 py-2 font-medium">{it.jenis}</td>
                            <td className="px-3 py-2 text-right font-mono-num font-bold">{formatRp(it.jumlah)}</td>
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
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Bottom Coretax Action Bar */}
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
              onClick={handlePrepareSubmit}
              className="inline-flex items-center gap-1.5 px-5 py-2 rounded bg-[#F7CA36] hover:bg-[#E5B822] text-[#1E2C5E] font-extrabold text-[12px] cursor-pointer disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Bayar dan Lapor</span>
            </button>
          </div>
        )}
      </div>

      {/* Coretax Pemberitahuan Modal before Tanda Tangan Dokumen */}
      {noticeOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-[1px] flex items-center justify-center p-4">
          <div className="bg-white rounded-md shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between">
              <h3 className="font-display font-bold text-[15px] text-[#1E2C5E]">Pemberitahuan</h3>
              <button
                type="button"
                onClick={() => setNoticeOpen(false)}
                className="text-slate-400 hover:text-slate-700 font-bold cursor-pointer"
              >
                ×
              </button>
            </div>
            <div className="p-5 space-y-3 text-[13px] text-slate-700">
              <p>
                Status SPT Tahunan PPh Orang Pribadi Tahun Pajak <strong>{taxReturn.taxYear}</strong> adalah{' '}
                <strong className="text-[#1E2C5E]">{statusSptLabel}</strong> ({formatRp(kurangLebih)}).
              </p>
              <p className="text-[12px] text-slate-500">
                Pastikan seluruh data pada Induk, Lampiran L-1, dan Lampiran L-2 telah sesuai sebelum melakukan tanda tangan elektronik.
              </p>
            </div>
            <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setNoticeOpen(false)}
                className="px-4 py-1.5 rounded border border-slate-300 bg-white text-slate-700 font-semibold text-xs cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => {
                  setNoticeOpen(false);
                  setSignOpen(true);
                }}
                className="px-4 py-1.5 rounded bg-[#1E2C5E] hover:bg-[#152048] text-white font-bold text-xs cursor-pointer"
              >
                Lanjutkan Tanda Tangan
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
