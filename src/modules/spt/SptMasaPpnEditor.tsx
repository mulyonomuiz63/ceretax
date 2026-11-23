import React, { useState } from 'react';
import { ArrowUpDown, ChevronDown, ChevronRight, Filter, Settings, Upload } from 'lucide-react';
import { SptPpnPayload, TaxReturn, Taxpayer, WorkspaceState } from '../../types/tax.ts';
import { formatRp, MONTHS_ID } from '../../utils/taxCalc.ts';
import { SignModal } from '../../components/SignModal.tsx';
import {
  CoretaxIconToolbar,
  CoretaxPagination,
  downloadCsvFile,
} from '../../components/CoretaxTableChrome.tsx';

interface SptMasaPpnEditorProps {
  taxReturn: TaxReturn;
  workspace: WorkspaceState;
  activeTaxpayer: Taxpayer;
  onBack: () => void;
  onSave: (updated: TaxReturn) => Promise<void>;
  onSubmit: (id: string, paymentMethod: 'DEPOSIT' | 'BILLING' | 'NONE') => Promise<void>;
}

type PpnTab = 'induk' | 'a1' | 'a2' | 'b1' | 'b2' | 'b3' | 'c';

export const SptMasaPpnEditor: React.FC<SptMasaPpnEditorProps> = ({
  taxReturn,
  workspace,
  activeTaxpayer,
  onBack,
  onSave,
  onSubmit,
}) => {
  const [tab, setTab] = useState<PpnTab>('induk');
  const [payload, setPayload] = useState<SptPpnPayload>(taxReturn.payload as SptPpnPayload);
  const [paymentMethod, setPaymentMethod] = useState<'DEPOSIT' | 'BILLING'>('DEPOSIT');
  const [signOpen, setSignOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [postedAt, setPostedAt] = useState<string | null>(
    (taxReturn.payload as SptPpnPayload)?.postedInvoiceIds?.length ? 'Sinkronisasi e-Faktur aktif' : null
  );
  const [postedMsg, setPostedMsg] = useState<string | null>(null);
  const [declarationChecked, setDeclarationChecked] = useState(true);
  const [signerType, setSignerType] = useState<'PKP' | 'KUASA'>('PKP');
  const [signerCity, setSignerCity] = useState('KOTA ADM. JAKARTA SELATAN');
  const [signerJob, setSignerJob] = useState('DIREKTUR UTAMA');
  const [lampiranSearch, setLampiranSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Accordion collapse states (all expanded by default like real Coretax)
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const toggleSection = (key: string) =>
    setCollapsed((prev) => ({ ...prev, [key]: !prev[key] }));

  const isReadOnly = taxReturn.status !== 'DRAFT';
  const periodCode = `${String(taxReturn.taxPeriodMonth).padStart(2, '0')}${taxReturn.taxYear}`;
  const periodLabel = `${MONTHS_ID[Math.max(0, taxReturn.taxPeriodMonth - 1)]} ${taxReturn.taxYear}`;

  // Period invoices for display & posting (with fallback to all active invoices if period was selected differently)
  const exactPeriodInvoices = workspace.invoices.filter(
    (i) =>
      i.taxPeriodMonth === taxReturn.taxPeriodMonth &&
      i.taxPeriodYear === taxReturn.taxYear &&
      i.status !== 'CANCELLED'
  );
  const periodInvoices =
    exactPeriodInvoices.length > 0
      ? exactPeriodInvoices
      : workspace.invoices.filter((i) => i.status !== 'CANCELLED');
  const exportInvoices = periodInvoices.filter((i) => i.direction === 'EXPORT' && i.status === 'APPROVED');
  const outputInvoices = periodInvoices.filter(
    (i) => i.direction === 'OUTPUT' && (i.status === 'APPROVED' || i.status === 'AMENDED')
  );
  const importInputs = periodInvoices.filter(
    (i) => i.direction === 'INPUT' && i.isCredited && i.transactionCode === '01' && i.referenceCode.toUpperCase().includes('PIB')
  );
  const creditedInputs = periodInvoices.filter(
    (i) => i.direction === 'INPUT' && i.isCredited && i.status === 'APPROVED'
  );
  const uncreditedInputs = periodInvoices.filter(
    (i) => i.direction === 'INPUT' && !i.isCredited && i.status === 'APPROVED'
  );
  const returnInvoices = periodInvoices.filter((i) => i.returnAmount > 0);

  // Breakdown output invoices by Coretax Bagian I rows
  const out0405 = outputInvoices.filter((i) => ['04', '05'].includes(i.transactionCode));
  const out06 = outputInvoices.filter((i) => i.transactionCode === '06');
  const out0109 = outputInvoices.filter((i) => ['01', '09'].includes(i.transactionCode));
  const out0203 = outputInvoices.filter((i) => ['02', '03'].includes(i.transactionCode));
  const out07 = outputInvoices.filter((i) => i.transactionCode === '07');
  const out08 = outputInvoices.filter((i) => i.transactionCode === '08');

  const out0405Dpp = out0405.reduce((s, i) => s + i.dppTotal, 0);
  const out0405DppLain = out0405.reduce((s, i) => s + i.dppOtherValue, 0);
  const out0405Ppn = out0405.reduce((s, i) => s + i.ppnTotal, 0);

  const out0109Dpp = out0109.reduce((s, i) => s + i.dppTotal, 0);
  const out0109DppLain = out0109.reduce((s, i) => s + i.dppOtherValue, 0);
  const out0109Ppn = out0109.reduce((s, i) => s + i.ppnTotal, 0);

  const in0405 = creditedInputs.filter((i) => ['04', '05'].includes(i.transactionCode));
  const inOther = creditedInputs.filter((i) => !['04', '05'].includes(i.transactionCode));

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
    const nowStr = new Date().toLocaleTimeString('id-ID');
    setPostedAt(`Posting SPT terakhir pada ${nowStr}`);
    setPostedMsg(
      `Posting SPT berhasil menarik ${outputInvoices.length} Faktur Keluaran (A-2), ${creditedInputs.length} Pajak Masukan Dikreditkan (B-2), ${uncreditedInputs.length} Pajak Masukan Tidak Dikreditkan (B-3), dan ${exportInvoices.length} Dokumen Ekspor (A-1).`
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
      setPostedMsg('Konsep SPT Masa PPN berhasil disimpan.');
    } finally {
      setSaving(false);
    }
  };

  const renderAmountCell = (val: number, bold = false) => (
    <div
      className={`w-full bg-[#EDF1F7] border border-[#DCE2EC] rounded-[3px] px-2.5 py-1 text-right font-mono-num text-[11px] ${
        bold ? 'font-bold text-[#1E2C5E]' : 'text-slate-700'
      }`}
    >
      {val.toLocaleString('id-ID')}
    </div>
  );

  const LAMPIRAN_TITLES: Record<Exclude<PpnTab, 'induk'>, string> = {
    a1: 'DAFTAR EKSPOR BKP BERWUJUD, BKP TIDAK BERWUJUD, DAN/ATAU JKP',
    a2: 'DAFTAR PAJAK KELUARAN ATAS PENYERAHAN DALAM NEGERI DENGAN FAKTUR PAJAK',
    b1: 'DAFTAR PAJAK MASUKAN YANG DAPAT DIKREDITKAN ATAS IMPOR BKP DAN PEMANFAATAN BKP TIDAK BERWUJUD/JKP DARI LUAR DAERAH PABEAN',
    b2: 'DAFTAR PAJAK MASUKAN YANG DAPAT DIKREDITKAN ATAS PEROLEHAN BKP/JKP DALAM NEGERI',
    b3: 'DAFTAR PAJAK MASUKAN YANG TIDAK DIKREDITKAN ATAU YANG MENDAPAT FASILITAS',
    c: 'DAFTAR PPN DAN PPnBM YANG DIPUNGUT OLEH PIHAK LAIN / NOTA RETUR',
  };

  const activeLampiranList = (
    tab === 'a1'
      ? exportInvoices
      : tab === 'a2'
        ? outputInvoices
        : tab === 'b1'
          ? importInputs
          : tab === 'b2'
            ? creditedInputs
            : tab === 'b3'
              ? uncreditedInputs
              : returnInvoices
  ).filter((inv) => {
    if (!lampiranSearch.trim()) return true;
    const q = lampiranSearch.toLowerCase();
    return (
      inv.counterpartyName.toLowerCase().includes(q) ||
      inv.counterpartyNpwp.toLowerCase().includes(q) ||
      inv.invoiceNumber.toLowerCase().includes(q)
    );
  });

  const paginatedLampiran = activeLampiranList.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div className="bg-white border border-[#DCE2EC] rounded-[8px] shadow-[0_2px_10px_rgba(30,44,94,0.03)] overflow-hidden">
      {/* Top Coretax Form Title Bar */}
      <div className="px-6 pt-5 pb-3 flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display font-medium text-[18px] sm:text-[19px] tracking-tight text-[#1E293B] uppercase">
          SURAT PEMBERITAHUAN MASA PAJAK PERTAMBAHAN NILAI (SPT MASA PPN)
        </h1>
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-[4px] bg-[#64748B] text-white text-[11px] font-semibold select-none">
          <Settings className="w-3 h-3" />
          <span>XML Monitoring</span>
        </span>
      </div>

      {/* Exact Coretax Horizontal Tabs: INDUK | A-1 | A-2 | B-1 | B-2 | B-3 | C */}
      <div className="px-6 border-b border-[#E2E8F0] flex items-center gap-1 overflow-x-auto">
        {(
          [
            { id: 'induk', label: 'INDUK' },
            { id: 'a1', label: 'A-1' },
            { id: 'a2', label: 'A-2' },
            { id: 'b1', label: 'B-1' },
            { id: 'b2', label: 'B-2' },
            { id: 'b3', label: 'B-3' },
            { id: 'c', label: 'C' },
          ] as Array<{ id: PpnTab; label: string }>
        ).map((t) => {
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => {
                setTab(t.id);
                setPage(1);
                setLampiranSearch('');
              }}
              className={`px-3.5 py-2 text-[11.5px] font-semibold transition whitespace-nowrap cursor-pointer border-b-2 ${
                active
                  ? 'border-[#3B82F6] text-[#1D4ED8] bg-[#EFF6FF]/60 rounded-t-[4px]'
                  : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'
              }`}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      <div className="p-6 space-y-4 text-[11.5px]">
        {postedMsg && (
          <div className="bg-emerald-50 border border-emerald-300 text-emerald-800 px-3.5 py-2.5 rounded-[5px] font-medium flex items-center justify-between gap-2">
            <span>{postedMsg}</span>
            <button
              type="button"
              onClick={() => setPostedMsg(null)}
              className="text-emerald-700 hover:text-emerald-900 text-xs font-bold cursor-pointer"
            >
              ×
            </button>
          </div>
        )}

        {/* ================================================================= */}
        {/* TAB INDUK (EXACT CORETAX SECTIONS HEADER + I s.d. X)              */}
        {/* ================================================================= */}
        {tab === 'induk' && (
          <div className="space-y-3.5">
            {/* v HEADER */}
            <div className="border border-[#DCE2EC] rounded-[5px] overflow-hidden">
              <button
                type="button"
                onClick={() => toggleSection('header')}
                className="w-full px-4 py-2 bg-[#F8FAFC] border-b border-[#E2E8F0] flex items-center gap-2 text-left font-semibold text-[#1E293B] cursor-pointer"
              >
                {collapsed.header ? (
                  <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
                )}
                <span>HEADER</span>
              </button>

              {!collapsed.header && (
                <div className="p-4 space-y-3 bg-white">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-2.5">
                    <div className="grid grid-cols-12 items-center gap-2">
                      <label className="col-span-5 text-slate-600">Nama Pengusaha Kena Pajak *</label>
                      <input
                        readOnly
                        value={activeTaxpayer.name}
                        className="col-span-7 bg-[#EDF1F7] border border-[#DCE2EC] rounded-[3px] px-2.5 py-1.5 text-slate-700"
                      />
                    </div>
                    <div className="grid grid-cols-12 items-center gap-2">
                      <label className="col-span-5 text-slate-600">NPWP *</label>
                      <input
                        readOnly
                        value={activeTaxpayer.nikNpwp}
                        className="col-span-7 bg-[#EDF1F7] border border-[#DCE2EC] rounded-[3px] px-2.5 py-1.5 font-mono-num text-slate-700"
                      />
                    </div>
                    <div className="grid grid-cols-12 items-center gap-2">
                      <label className="col-span-5 text-slate-600">Alamat *</label>
                      <input
                        readOnly
                        value={activeTaxpayer.address}
                        className="col-span-7 bg-[#EDF1F7] border border-[#DCE2EC] rounded-[3px] px-2.5 py-1.5 text-slate-700"
                      />
                    </div>
                    <div className="grid grid-cols-12 items-center gap-2">
                      <label className="col-span-5 text-slate-600">Klasifikasi Lapangan Usaha *</label>
                      <input
                        readOnly
                        value={
                          activeTaxpayer.kluName
                            ? `${activeTaxpayer.kluCode} - ${activeTaxpayer.kluName}`
                            : 'PERDAGANGAN BESAR & JASA'
                        }
                        className="col-span-7 bg-[#EDF1F7] border border-[#DCE2EC] rounded-[3px] px-2.5 py-1.5 text-slate-700"
                      />
                    </div>
                    <div className="grid grid-cols-12 items-center gap-2">
                      <label className="col-span-5 text-slate-600">Nomor Telepon</label>
                      <input
                        readOnly
                        value={activeTaxpayer.phone || '0215250208'}
                        className="col-span-7 bg-[#EDF1F7] border border-[#DCE2EC] rounded-[3px] px-2.5 py-1.5 font-mono-num text-slate-700"
                      />
                    </div>
                    <div className="grid grid-cols-12 items-center gap-2">
                      <label className="col-span-5 text-slate-600">Periode *</label>
                      <div className="col-span-7 grid grid-cols-12 gap-2 items-center">
                        <input
                          readOnly
                          value={periodCode}
                          className="col-span-5 bg-[#EDF1F7] border border-[#DCE2EC] rounded-[3px] px-2.5 py-1.5 font-mono-num text-slate-700"
                        />
                        <span className="col-span-4 text-[10.5px] text-slate-500 text-right">
                          Periode Pembukuan
                        </span>
                        <input
                          readOnly
                          value="01-12"
                          className="col-span-3 bg-[#EDF1F7] border border-[#DCE2EC] rounded-[3px] px-2 py-1.5 font-mono-num text-center text-slate-700"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-12 items-center gap-2">
                      <label className="col-span-5 text-slate-600">Telepon Seluler *</label>
                      <input
                        readOnly
                        value={activeTaxpayer.phone || '081234567890'}
                        className="col-span-7 bg-[#EDF1F7] border border-[#DCE2EC] rounded-[3px] px-2.5 py-1.5 font-mono-num text-slate-700"
                      />
                    </div>
                    <div className="grid grid-cols-12 items-center gap-2">
                      <label className="col-span-5 text-slate-600">Normal/Pembetulan</label>
                      <input
                        readOnly
                        value={taxReturn.revisionNo === 0 ? 'Normal' : `Pembetulan ke-${taxReturn.revisionNo}`}
                        className="col-span-7 bg-[#EDF1F7] border border-[#DCE2EC] rounded-[3px] px-2.5 py-1.5 text-slate-700"
                      />
                    </div>
                  </div>

                  {/* Posting SPT Action Row inside HEADER (Exact Coretax PDF Page 6) */}
                  {!isReadOnly && (
                    <div className="pt-2 flex flex-wrap items-center gap-3">
                      <button
                        type="button"
                        onClick={handlePostingSpt}
                        className="px-4 py-1.5 rounded-[4px] bg-[#1E2C5E] hover:bg-[#16224A] text-white font-semibold text-[11.5px] cursor-pointer transition"
                      >
                        Posting SPT
                      </button>
                      <span className="text-[11px] text-slate-500">
                        {postedAt || 'Posting belum pernah dilakukan'}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* v I. PENYERAHAN BARANG DAN JASA */}
            <div className="border border-[#DCE2EC] rounded-[5px] overflow-hidden">
              <button
                type="button"
                onClick={() => toggleSection('sec1')}
                className="w-full px-4 py-2 bg-[#F8FAFC] border-b border-[#E2E8F0] flex items-center gap-2 text-left font-semibold text-[#1E293B] cursor-pointer"
              >
                {collapsed.sec1 ? (
                  <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
                )}
                <span>I. PENYERAHAN BARANG DAN JASA</span>
              </button>

              {!collapsed.sec1 && (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-[11px]">
                    <thead>
                      <tr className="bg-[#F6C324] text-[#1E293B] font-bold">
                        <th className="px-3 py-2 text-left min-w-[340px]"></th>
                        <th className="px-2.5 py-2 text-center w-40 border-l border-white/50">
                          Harga Jual/Penggantian/Nilai Impor/DPP (Rupiah)
                        </th>
                        <th className="px-2.5 py-2 text-center w-36 border-l border-white/50">
                          DPP Nilai Lain/DPP (Rupiah)
                        </th>
                        <th className="px-2.5 py-2 text-center w-36 border-l border-white/50">
                          PPN (Rupiah)
                        </th>
                        <th className="px-2.5 py-2 text-center w-32 border-l border-white/50">
                          PPnBM (Rupiah)
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#EEF2F6] bg-white">
                      <tr className="bg-[#FAFBFD] font-semibold text-[#1E293B]">
                        <td colSpan={5} className="px-3 py-1.5">
                          A. Penyerahan BKP/JKP yang terutang PPN
                        </td>
                      </tr>
                      <tr>
                        <td className="px-4 py-1.5 text-slate-700">
                          1. Ekspor BKP/JKP Tidak Berwujud/JKP
                        </td>
                        <td className="px-2 py-1">{renderAmountCell(payload.eksporDpp)}</td>
                        <td className="px-2 py-1" />
                        <td className="px-2 py-1" />
                        <td className="px-2 py-1" />
                      </tr>
                      <tr>
                        <td className="px-4 py-1.5 text-slate-700">
                          2. Penyerahan yang PPN atau PPN dan PPnBM-nya harus dipungut sendiri dengan DPP Nilai Lain atau Besaran Tertentu (dengan Faktur Pajak Kode 04 dan 05)
                        </td>
                        <td className="px-2 py-1">{renderAmountCell(out0405Dpp || payload.penyerahanPpnDipungutSendiriDpp)}</td>
                        <td className="px-2 py-1">{renderAmountCell(out0405DppLain || Math.round((payload.penyerahanPpnDipungutSendiriDpp * 11) / 12))}</td>
                        <td className="px-2 py-1">{renderAmountCell(out0405Ppn || payload.penyerahanPpnDipungutSendiriPpn, true)}</td>
                        <td className="px-2 py-1">{renderAmountCell(0)}</td>
                      </tr>
                      <tr>
                        <td className="px-4 py-1.5 text-slate-700">
                          3. Penyerahan yang PPN atau PPN dan PPnBM-nya harus dipungut sendiri kepada turis sesuai dengan Pasal 16E UU PPN (dengan Faktur Pajak Kode 06)
                        </td>
                        <td className="px-2 py-1">{renderAmountCell(out06.reduce((s, i) => s + i.dppTotal, 0))}</td>
                        <td className="px-2 py-1">{renderAmountCell(out06.reduce((s, i) => s + i.dppOtherValue, 0))}</td>
                        <td className="px-2 py-1">{renderAmountCell(out06.reduce((s, i) => s + i.ppnTotal, 0))}</td>
                        <td className="px-2 py-1">{renderAmountCell(0)}</td>
                      </tr>
                      <tr>
                        <td className="px-4 py-1.5 text-slate-700">
                          4. Penyerahan yang PPN atau PPN dan PPnBM-nya harus dipungut sendiri lainnya (dengan Faktur Pajak Kode 01, 09 dan 10)
                        </td>
                        <td className="px-2 py-1">{renderAmountCell(out0109Dpp)}</td>
                        <td className="px-2 py-1">{renderAmountCell(out0109DppLain)}</td>
                        <td className="px-2 py-1">{renderAmountCell(out0109Ppn)}</td>
                        <td className="px-2 py-1">{renderAmountCell(0)}</td>
                      </tr>
                      <tr>
                        <td className="px-4 py-1.5 text-slate-700">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span>5. Penyerahan yang PPN atau PPN dan PPnBM-nya harus dipungut sendiri dengan Faktur Pajak yang dilaporkan secara digunggung</span>
                            <button
                              type="button"
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-[#1E2C5E] text-white text-[10.5px] font-semibold cursor-pointer"
                            >
                              <Upload className="w-3 h-3" />
                              <span>Unggah XML</span>
                              <ChevronDown className="w-3 h-3 opacity-80" />
                            </button>
                          </div>
                        </td>
                        <td className="px-2 py-1">{renderAmountCell(0)}</td>
                        <td className="px-2 py-1">{renderAmountCell(0)}</td>
                        <td className="px-2 py-1">{renderAmountCell(0)}</td>
                        <td className="px-2 py-1">{renderAmountCell(0)}</td>
                      </tr>
                      <tr>
                        <td className="px-4 py-1.5 text-slate-700">
                          6. Penyerahan yang PPN atau PPN dan PPnBM-nya dipungut oleh Pemungut PPN (dengan Faktur Pajak Kode 02 dan 03)
                        </td>
                        <td className="px-2 py-1">{renderAmountCell(out0203.reduce((s, i) => s + i.dppTotal, 0) || payload.penyerahanDipungutPemungutDpp)}</td>
                        <td className="px-2 py-1">{renderAmountCell(out0203.reduce((s, i) => s + i.dppOtherValue, 0))}</td>
                        <td className="px-2 py-1">{renderAmountCell(out0203.reduce((s, i) => s + i.ppnTotal, 0) || payload.penyerahanDipungutPemungutPpn)}</td>
                        <td className="px-2 py-1">{renderAmountCell(0)}</td>
                      </tr>
                      <tr>
                        <td className="px-4 py-1.5 text-slate-700">
                          7. Penyerahan yang mendapat fasilitas PPN atau PPN dan PPnBM Tidak Dipungut (dengan Faktur Pajak Kode 07)
                        </td>
                        <td className="px-2 py-1">{renderAmountCell(out07.reduce((s, i) => s + i.dppTotal, 0))}</td>
                        <td className="px-2 py-1">{renderAmountCell(out07.reduce((s, i) => s + i.dppOtherValue, 0))}</td>
                        <td className="px-2 py-1">{renderAmountCell(out07.reduce((s, i) => s + i.ppnTotal, 0))}</td>
                        <td className="px-2 py-1">{renderAmountCell(0)}</td>
                      </tr>
                      <tr>
                        <td className="px-4 py-1.5 text-slate-700">
                          8. Penyerahan yang mendapat fasilitas PPN atau PPN dan PPnBM Dibebaskan (dengan Faktur Pajak Kode 08)
                        </td>
                        <td className="px-2 py-1">{renderAmountCell(out08.reduce((s, i) => s + i.dppTotal, 0) || payload.penyerahanDibebaskanDpp)}</td>
                        <td className="px-2 py-1">{renderAmountCell(0)}</td>
                        <td className="px-2 py-1">{renderAmountCell(0)}</td>
                        <td className="px-2 py-1">{renderAmountCell(0)}</td>
                      </tr>
                      <tr>
                        <td className="px-4 py-1.5 text-slate-700">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span>9. Penyerahan yang mendapat fasilitas PPN atau PPN dan PPnBM dengan Faktur Pajak yang dilaporkan secara digunggung (Nota Retur: {formatRp(payload.returKeluaranPpn)})</span>
                            <button
                              type="button"
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-[#1E2C5E] text-white text-[10.5px] font-semibold cursor-pointer"
                            >
                              <Upload className="w-3 h-3" />
                              <span>Unggah XML</span>
                              <ChevronDown className="w-3 h-3 opacity-80" />
                            </button>
                          </div>
                        </td>
                        <td className="px-2 py-1">{renderAmountCell(0)}</td>
                        <td className="px-2 py-1">{renderAmountCell(0)}</td>
                        <td className="px-2 py-1">{renderAmountCell(payload.returKeluaranPpn)}</td>
                        <td className="px-2 py-1">{renderAmountCell(0)}</td>
                      </tr>
                      <tr className="bg-[#FAFBFD] font-bold">
                        <td className="px-4 py-1.5 text-[#1E2C5E]">
                          B. Penyerahan BKP/JKP yang tidak terutang PPN
                        </td>
                        <td className="px-2 py-1">{renderAmountCell(0)}</td>
                        <td className="px-2 py-1" />
                        <td className="px-2 py-1" />
                        <td className="px-2 py-1" />
                      </tr>
                      <tr className="bg-[#FEF9E7] font-bold">
                        <td className="px-4 py-1.5 text-[#1E2C5E]">
                          C. Jumlah Seluruh Penyerahan (I.A + I.B)
                        </td>
                        <td className="px-2 py-1">{renderAmountCell(payload.eksporDpp + payload.penyerahanPpnDipungutSendiriDpp + payload.penyerahanDipungutPemungutDpp + payload.penyerahanDibebaskanDpp, true)}</td>
                        <td className="px-2 py-1" />
                        <td className="px-2 py-1">{renderAmountCell(ppnKeluaranNeto, true)}</td>
                        <td className="px-2 py-1">{renderAmountCell(0)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* v II. PEROLEHAN BKP/JKP & PAJAK MASUKAN */}
            <div className="border border-[#DCE2EC] rounded-[5px] overflow-hidden">
              <button
                type="button"
                onClick={() => toggleSection('sec2')}
                className="w-full px-4 py-2 bg-[#F8FAFC] border-b border-[#E2E8F0] flex items-center gap-2 text-left font-semibold text-[#1E293B] cursor-pointer"
              >
                {collapsed.sec2 ? (
                  <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
                )}
                <span>II. PENGHITUNGAN PAJAK MASUKAN YANG DAPAT DIPERHITUNGKAN</span>
              </button>

              {!collapsed.sec2 && (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-[11px]">
                    <thead>
                      <tr className="bg-[#F6C324] text-[#1E293B] font-bold">
                        <th className="px-3 py-2 text-left min-w-[340px]"></th>
                        <th className="px-2.5 py-2 text-center w-40 border-l border-white/50">
                          Harga Jual/Penggantian/Nilai Impor/DPP (Rupiah)
                        </th>
                        <th className="px-2.5 py-2 text-center w-36 border-l border-white/50">
                          DPP Nilai Lain/DPP (Rupiah)
                        </th>
                        <th className="px-2.5 py-2 text-center w-36 border-l border-white/50">
                          PPN (Rupiah)
                        </th>
                        <th className="px-2.5 py-2 text-center w-32 border-l border-white/50">
                          PPnBM (Rupiah)
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#EEF2F6] bg-white">
                      <tr>
                        <td className="px-4 py-1.5 text-slate-700">
                          A. Impor BKP, Pemanfaatan BKP Tidak Berwujud dan/atau JKP dari Luar Daerah Pabean yang Pajak Masukannya dapat dikreditkan
                        </td>
                        <td className="px-2 py-1">{renderAmountCell(importInputs.reduce((s, i) => s + i.dppTotal, 0))}</td>
                        <td className="px-2 py-1" />
                        <td className="px-2 py-1">{renderAmountCell(importInputs.reduce((s, i) => s + i.ppnTotal, 0))}</td>
                        <td className="px-2 py-1">{renderAmountCell(0)}</td>
                      </tr>
                      <tr>
                        <td className="px-4 py-1.5 text-slate-700">
                          B. Perolehan BKP/JKP dari dalam negeri dengan DPP Nilai Lain atau Besaran Tertentu yang Pajak Masukannya dapat dikreditkan (dengan Faktur Pajak Kode 04 dan 05)
                        </td>
                        <td className="px-2 py-1">{renderAmountCell(in0405.reduce((s, i) => s + i.dppTotal, 0))}</td>
                        <td className="px-2 py-1">{renderAmountCell(in0405.reduce((s, i) => s + i.dppOtherValue, 0))}</td>
                        <td className="px-2 py-1">{renderAmountCell(in0405.reduce((s, i) => s + i.ppnTotal, 0))}</td>
                        <td className="px-2 py-1">{renderAmountCell(0)}</td>
                      </tr>
                      <tr>
                        <td className="px-4 py-1.5 text-slate-700">
                          C. Perolehan BKP/JKP dari dalam negeri selain dengan DPP Nilai Lain yang Pajak Masukannya dapat dikreditkan (dengan Faktur Pajak Kode 01, 09 dan 10)
                        </td>
                        <td className="px-2 py-1">{renderAmountCell(inOther.reduce((s, i) => s + i.dppTotal, 0))}</td>
                        <td className="px-2 py-1">{renderAmountCell(inOther.reduce((s, i) => s + i.dppOtherValue, 0))}</td>
                        <td className="px-2 py-1">{renderAmountCell(inOther.reduce((s, i) => s + i.ppnTotal, 0) || (in0405.length === 0 ? payload.pajakMasukanDikreditkan : 0))}</td>
                        <td className="px-2 py-1">{renderAmountCell(0)}</td>
                      </tr>
                      <tr>
                        <td className="px-4 py-1.5 text-slate-700">
                          D. Perolehan BKP/JKP dari dalam negeri sebagai Pemungut PPN yang Pajak Masukannya dapat dikreditkan (dengan Faktur Pajak Kode 02 dan 03)
                        </td>
                        <td className="px-2 py-1">{renderAmountCell(0)}</td>
                        <td className="px-2 py-1">{renderAmountCell(0)}</td>
                        <td className="px-2 py-1">{renderAmountCell(0)}</td>
                        <td className="px-2 py-1">{renderAmountCell(0)}</td>
                      </tr>
                      <tr>
                        <td className="px-4 py-1.5 text-slate-700">
                          E. Kompensasi kelebihan Pajak Masukan Masa Pajak sebelumnya
                        </td>
                        <td className="px-2 py-1" />
                        <td className="px-2 py-1" />
                        <td className="px-2 py-1">
                          <input
                            type="number"
                            disabled={isReadOnly}
                            value={payload.kompensasiMasaSebelumnya}
                            onChange={(e) =>
                              setPayload({
                                ...payload,
                                kompensasiMasaSebelumnya: Number(e.target.value) || 0,
                              })
                            }
                            className="w-full bg-white border border-[#CBD5E1] rounded-[3px] px-2.5 py-1 text-right font-mono-num text-[11px] focus:outline-none focus:border-[#1E2C5E]"
                          />
                        </td>
                        <td className="px-2 py-1" />
                      </tr>
                      <tr>
                        <td className="px-4 py-1.5 text-slate-700">
                          F. Hasil penghitungan kembali Pajak Masukan yang telah dikreditkan (Nota Retur: {formatRp(payload.returMasukanPpn)})
                        </td>
                        <td className="px-2 py-1" />
                        <td className="px-2 py-1" />
                        <td className="px-2 py-1">{renderAmountCell(payload.returMasukanPpn)}</td>
                        <td className="px-2 py-1" />
                      </tr>
                      <tr className="bg-[#FAFBFD] font-bold">
                        <td className="px-4 py-1.5 text-[#1E2C5E]">
                          G. Jumlah Pajak Masukan yang dapat diperhitungkan (II.A + II.B + II.C + II.D + II.E - II.F)
                        </td>
                        <td className="px-2 py-1" />
                        <td className="px-2 py-1" />
                        <td className="px-2 py-1">{renderAmountCell(ppnMasukanNeto, true)}</td>
                        <td className="px-2 py-1" />
                      </tr>
                      <tr>
                        <td className="px-4 py-1.5 text-slate-700">
                          H. Impor atau perolehan BKP/JKP yang Pajak Masukannya tidak dikreditkan dan/atau Impor atau perolehan BKP/JKP yang mendapat fasilitas
                        </td>
                        <td className="px-2 py-1">{renderAmountCell(uncreditedInputs.reduce((s, i) => s + i.dppTotal, 0))}</td>
                        <td className="px-2 py-1">{renderAmountCell(uncreditedInputs.reduce((s, i) => s + i.dppOtherValue, 0))}</td>
                        <td className="px-2 py-1">{renderAmountCell(payload.pajakMasukanTidakDikreditkan)}</td>
                        <td className="px-2 py-1">{renderAmountCell(0)}</td>
                      </tr>
                      <tr>
                        <td className="px-4 py-1.5 text-slate-700">
                          I. Impor dan/atau perolehan BKP/JKP yang tidak terutang PPN dan/atau yang dibebaskan dari pengenaan PPN
                        </td>
                        <td className="px-2 py-1">{renderAmountCell(0)}</td>
                        <td className="px-2 py-1" />
                        <td className="px-2 py-1" />
                        <td className="px-2 py-1" />
                      </tr>
                      <tr className="bg-[#FEF9E7] font-bold">
                        <td className="px-4 py-1.5 text-[#1E2C5E]">
                          J. Jumlah Seluruh Perolehan (II.A + II.B + II.C + II.H + II.I)
                        </td>
                        <td className="px-2 py-1">{renderAmountCell(creditedInputs.reduce((s, i) => s + i.dppTotal, 0) + uncreditedInputs.reduce((s, i) => s + i.dppTotal, 0), true)}</td>
                        <td className="px-2 py-1" />
                        <td className="px-2 py-1">{renderAmountCell(payload.pajakMasukanDikreditkan + payload.pajakMasukanTidakDikreditkan, true)}</td>
                        <td className="px-2 py-1">{renderAmountCell(0)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* v III. PENGHITUNGAN PPN KURANG BAYAR / LEBIH BAYAR */}
            <div className="border border-[#DCE2EC] rounded-[5px] overflow-hidden">
              <button
                type="button"
                onClick={() => toggleSection('sec3')}
                className="w-full px-4 py-2 bg-[#F8FAFC] border-b border-[#E2E8F0] flex items-center gap-2 text-left font-semibold text-[#1E293B] cursor-pointer"
              >
                {collapsed.sec3 ? (
                  <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
                )}
                <span>III. PENGHITUNGAN PPN KURANG BAYAR / LEBIH BAYAR</span>
              </button>

              {!collapsed.sec3 && (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-[11px]">
                    <thead>
                      <tr className="bg-[#F6C324] text-[#1E293B] font-bold">
                        <th className="px-3 py-2 text-left"></th>
                        <th className="px-2.5 py-2 text-center w-52 border-l border-white/50">
                          PPN (Rupiah)
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#EEF2F6] bg-white">
                      <tr>
                        <td className="px-4 py-1.5 text-slate-700">
                          A. Pajak Keluaran yang harus dipungut sendiri (I.A.2 + I.A.3 + I.A.4 + I.A.5 - Retur)
                        </td>
                        <td className="px-2 py-1">{renderAmountCell(ppnKeluaranNeto, true)}</td>
                      </tr>
                      <tr>
                        <td className="px-4 py-1.5 text-slate-700">
                          B. PPN disetor di muka dalam masa pajak yang sama
                        </td>
                        <td className="px-2 py-1">{renderAmountCell(0)}</td>
                      </tr>
                      <tr>
                        <td className="px-4 py-1.5 text-slate-700">
                          C. Pajak Masukan yang dapat diperhitungkan (II.G)
                        </td>
                        <td className="px-2 py-1">{renderAmountCell(ppnMasukanNeto, true)}</td>
                      </tr>
                      <tr>
                        <td className="px-4 py-1.5 text-slate-700">
                          D. Kelebihan pemungutan PPN oleh Pemungut PPN
                        </td>
                        <td className="px-2 py-1">{renderAmountCell(0)}</td>
                      </tr>
                      <tr className="bg-[#FEF9E7] font-bold">
                        <td className="px-4 py-2 text-[#1E2C5E]">
                          E. PPN kurang atau (lebih) bayar (III.A - III.B - III.C - III.D) —{' '}
                          <span className="uppercase">
                            {kurangLebihBayar > 0
                              ? 'KURANG BAYAR'
                              : kurangLebihBayar < 0
                                ? 'LEBIH BAYAR'
                                : 'NIHIL'}
                          </span>
                        </td>
                        <td className="px-2 py-1.5">{renderAmountCell(kurangLebihBayar, true)}</td>
                      </tr>
                      <tr>
                        <td className="px-4 py-1.5 text-slate-700">
                          F. PPN kurang atau (lebih) bayar pada SPT yang dibetulkan sebelumnya
                        </td>
                        <td className="px-2 py-1">{renderAmountCell(0)}</td>
                      </tr>
                      <tr>
                        <td className="px-4 py-1.5 text-slate-700">
                          G. PPN kurang atau (lebih) bayar karena pembetulan SPT (III.E - III.F)
                        </td>
                        <td className="px-2 py-1">{renderAmountCell(0)}</td>
                      </tr>
                      <tr>
                        <td className="px-4 py-2 text-slate-700 align-top">
                          H. Diminta Untuk (apabila Lebih Bayar)
                        </td>
                        <td className="px-3 py-2 space-y-1.5">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="radio"
                              name="lebihBayarPpn"
                              disabled={isReadOnly || kurangLebihBayar >= 0}
                              checked={payload.pilihanLebihBayar === 'KOMPENSASI'}
                              onChange={() => setPayload({ ...payload, pilihanLebihBayar: 'KOMPENSASI' })}
                            />
                            <span>1. dikompensasikan</span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="radio"
                              name="lebihBayarPpn"
                              disabled={isReadOnly || kurangLebihBayar >= 0}
                              checked={payload.pilihanLebihBayar === 'RESTITUSI'}
                              onChange={() => setPayload({ ...payload, pilihanLebihBayar: 'RESTITUSI' })}
                            />
                            <span>2. dikembalikan melalui pengembalian pendahuluan</span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="radio"
                              name="lebihBayarPpn"
                              disabled={isReadOnly || kurangLebihBayar >= 0}
                              readOnly
                              checked={false}
                            />
                            <span>3. dikembalikan melalui pemeriksaan</span>
                          </label>
                          <div className="pt-2 space-y-1.5 border-t border-[#E2E8F0]">
                            <div className="grid grid-cols-12 items-center gap-2">
                              <span className="col-span-5 text-slate-600 text-[10.5px]">Pilih Rekening Bank</span>
                              <input readOnly value="-" className="col-span-7 bg-[#EDF1F7] border border-[#DCE2EC] rounded-[3px] px-2 py-1 text-[10.5px]" />
                            </div>
                            <div className="grid grid-cols-12 items-center gap-2">
                              <span className="col-span-5 text-slate-600 text-[10.5px]">Nomor Rekening</span>
                              <input readOnly value="-" className="col-span-7 bg-[#EDF1F7] border border-[#DCE2EC] rounded-[3px] px-2 py-1 text-[10.5px]" />
                            </div>
                          </div>
                        </td>
                      </tr>
                    </tbody>
                  </table>

                  {kurangLebihBayar > 0 && !isReadOnly && (
                    <div className="p-3.5 bg-[#F8FAFC] border-t border-[#E2E8F0] flex flex-wrap items-center gap-4">
                      <span className="font-bold text-[#1E2C5E]">
                        Metode Pembayaran PPN Kurang Bayar ({formatRp(kurangLebihBayar)}):
                      </span>
                      <label className="inline-flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          checked={paymentMethod === 'DEPOSIT'}
                          onChange={() => setPaymentMethod('DEPOSIT')}
                        />
                        <span>
                          Pemindahbukuan Deposit Pajak (Saldo: <strong>{formatRp(activeTaxpayer.depositBalance)}</strong>)
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
                  )}
                </div>
              )}
            </div>

            {/* Sections IV - VIII compact authentic Coretax collapsible blocks */}
            {[
              { id: 'sec4', title: 'IV. PPN TERUTANG ATAS KEGIATAN MEMBANGUN SENDIRI', label: 'PPN terutang' },
              { id: 'sec5', title: 'V. PEMBAYARAN KEMBALI PAJAK MASUKAN YANG TIDAK DAPAT DIKREDITKAN', label: 'PPN yang wajib dibayar kembali' },
              { id: 'sec6', title: 'VI. PAJAK PENJUALAN ATAS BARANG MEWAH', label: 'PPnBM yang harus dipungut sendiri' },
              { id: 'sec7', title: 'VII. PEMUNGUTAN PPN ATAU PPN DAN PPnBM OLEH PEMUNGUT PPN', label: 'Jumlah PPN dan PPnBM yang dipungut' },
              { id: 'sec8', title: 'VIII. PEMUNGUTAN PPN ATAU PPN DAN PPnBM OLEH PIHAK LAIN', label: 'Jumlah PPN dan PPnBM yang dipungut pihak lain' },
            ].map((sec) => (
              <div key={sec.id} className="border border-[#DCE2EC] rounded-[5px] overflow-hidden">
                <button
                  type="button"
                  onClick={() => toggleSection(sec.id)}
                  className="w-full px-4 py-2 bg-[#F8FAFC] flex items-center gap-2 text-left font-semibold text-[#1E293B] cursor-pointer"
                >
                  {collapsed[sec.id] ? (
                    <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
                  )}
                  <span>{sec.title}</span>
                </button>
                {!collapsed[sec.id] && (
                  <div className="px-4 py-2 bg-white border-t border-[#E2E8F0] flex items-center justify-between gap-4">
                    <span className="text-slate-600">{sec.label}</span>
                    <div className="w-44">{renderAmountCell(0)}</div>
                  </div>
                )}
              </div>
            ))}

            {/* v IX. KELENGKAPAN */}
            <div className="border border-[#DCE2EC] rounded-[5px] overflow-hidden">
              <button
                type="button"
                onClick={() => toggleSection('sec9')}
                className="w-full px-4 py-2 bg-[#F8FAFC] border-b border-[#E2E8F0] flex items-center gap-2 text-left font-semibold text-[#1E293B] cursor-pointer"
              >
                {collapsed.sec9 ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                <span>IX. KELENGKAPAN</span>
              </button>
              {!collapsed.sec9 && (
                <div className="p-4 space-y-2.5 bg-white">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-slate-600">A. Daftar Rincian Kendaraan Bermotor</span>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded bg-[#1E2C5E] text-white text-[10.5px] font-semibold opacity-80">
                      <Upload className="w-3 h-3" /> Unggah XML
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-slate-600">
                      B. Hasil penghitungan kembali Pajak Masukan yang telah dikreditkan sebagai penambah (pengurang) Pajak Masukan
                    </span>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded bg-[#1E2C5E] text-white text-[10.5px] font-semibold opacity-80">
                      <Upload className="w-3 h-3" /> Upload PDF
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* v X. PERNYATAAN */}
            <div className="border border-[#DCE2EC] rounded-[5px] overflow-hidden">
              <button
                type="button"
                onClick={() => toggleSection('sec10')}
                className="w-full px-4 py-2 bg-[#F8FAFC] border-b border-[#E2E8F0] flex items-center gap-2 text-left font-semibold text-[#1E293B] cursor-pointer"
              >
                {collapsed.sec10 ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                <span>X. PERNYATAAN</span>
              </button>
              {!collapsed.sec10 && (
                <div className="p-4 space-y-3 bg-white">
                  <label className="flex items-start gap-2.5 cursor-pointer text-[11px] font-semibold text-[#1E293B]">
                    <input
                      type="checkbox"
                      disabled={isReadOnly}
                      checked={declarationChecked}
                      onChange={(e) => setDeclarationChecked(e.target.checked)}
                      className="mt-0.5 accent-[#1E2C5E]"
                    />
                    <span>
                      PERNYATAAN: DENGAN MENYADARI SEPENUHNYA AKAN SEGALA AKIBATNYA, SAYA MENYATAKAN BAHWA APA YANG TELAH SAYA BERITAHUKAN DI ATAS BESERTA LAMPIRAN-LAMPIRANNYA ADALAH BENAR, LENGKAP, JELAS, DAN TIDAK BERSYARAT.
                    </span>
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5 items-center max-w-2xl">
                    <span className="md:col-span-4 text-slate-600">DITANDATANGANI OLEH</span>
                    <div className="md:col-span-8 flex items-center gap-5">
                      <label className="inline-flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="radio"
                          checked={signerType === 'PKP'}
                          onChange={() => setSignerType('PKP')}
                        />
                        <span>PKP</span>
                      </label>
                      <label className="inline-flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="radio"
                          checked={signerType === 'KUASA'}
                          onChange={() => setSignerType('KUASA')}
                        />
                        <span>Kuasa Wajib Pajak</span>
                      </label>
                    </div>
                    <span className="md:col-span-4 text-slate-600">Kota Penandatanganan SPT</span>
                    <input
                      type="text"
                      disabled={isReadOnly}
                      value={signerCity}
                      onChange={(e) => setSignerCity(e.target.value)}
                      className="md:col-span-8 bg-[#EDF1F7] border border-[#DCE2EC] rounded-[3px] px-2.5 py-1.5 text-slate-700"
                    />
                    <span className="md:col-span-4 text-slate-600">Nama</span>
                    <input
                      readOnly
                      value={activeTaxpayer.name}
                      className="md:col-span-8 bg-[#EDF1F7] border border-[#DCE2EC] rounded-[3px] px-2.5 py-1.5 text-slate-700"
                    />
                    <span className="md:col-span-4 text-slate-600">Jabatan</span>
                    <input
                      type="text"
                      disabled={isReadOnly}
                      value={signerJob}
                      onChange={(e) => setSignerJob(e.target.value)}
                      className="md:col-span-8 bg-white border border-[#CBD5E1] rounded-[3px] px-2.5 py-1.5 text-slate-700"
                    />
                    <span className="md:col-span-4 text-slate-600">Batas Waktu Penyampaian SPT</span>
                    <input
                      readOnly
                      value={`Akhir Bulan Berikutnya (${taxReturn.taxYear}-${String(Math.min(12, taxReturn.taxPeriodMonth + 1)).padStart(2, '0')}-30)`}
                      className="md:col-span-8 bg-[#EDF1F7] border border-[#DCE2EC] rounded-[3px] px-2.5 py-1.5 font-mono-num text-slate-700"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* LAMPIRAN TABS (A-1, A-2, B-1, B-2, B-3, C) — EXACT CORETAX PDF    */}
        {/* ================================================================= */}
        {tab !== 'induk' && (
          <div className="space-y-4">
            <h2 className="font-display font-medium text-[15px] text-[#1E293B] uppercase">
              {LAMPIRAN_TITLES[tab]}
            </h2>

            {/* Lampiran HEADER Box */}
            <div className="border border-[#DCE2EC] rounded-[5px] p-4 bg-white">
              <div className="text-[11px] font-semibold text-slate-500 mb-3">HEADER</div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2">
                <div className="grid grid-cols-12 items-center gap-2">
                  <span className="col-span-4 text-slate-600">NAMA PKP</span>
                  <input
                    readOnly
                    value={activeTaxpayer.name}
                    className="col-span-8 bg-[#EDF1F7] border border-[#DCE2EC] rounded-[3px] px-2.5 py-1 text-slate-700"
                  />
                </div>
                <div className="grid grid-cols-12 items-center gap-2">
                  <span className="col-span-4 text-slate-600">MASA</span>
                  <input
                    readOnly
                    value={periodCode}
                    className="col-span-8 bg-[#EDF1F7] border border-[#DCE2EC] rounded-[3px] px-2.5 py-1 font-mono-num text-slate-700"
                  />
                </div>
                <div className="grid grid-cols-12 items-center gap-2">
                  <span className="col-span-4 text-slate-600">Nomor Identitas WP</span>
                  <input
                    readOnly
                    value={activeTaxpayer.nikNpwp}
                    className="col-span-8 bg-[#EDF1F7] border border-[#DCE2EC] rounded-[3px] px-2.5 py-1 font-mono-num text-slate-700"
                  />
                </div>
                <div className="grid grid-cols-12 items-center gap-2">
                  <span className="col-span-4 text-slate-600">NORMAL/PEMBETULAN</span>
                  <input
                    readOnly
                    value={taxReturn.revisionNo === 0 ? 'NORMAL' : `PEMBETULAN ${taxReturn.revisionNo}`}
                    className="col-span-8 bg-[#EDF1F7] border border-[#DCE2EC] rounded-[3px] px-2.5 py-1 text-slate-700"
                  />
                </div>
              </div>
            </div>

            {tab === 'c' && !isReadOnly && (
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  className="px-3.5 py-1.5 rounded bg-[#1E2C5E] text-white text-[11px] font-semibold cursor-pointer"
                >
                  + Tambah
                </button>
                <button
                  type="button"
                  className="px-3.5 py-1.5 rounded bg-[#DC2626] text-white text-[11px] font-semibold cursor-pointer"
                >
                  Hapus
                </button>
                <button
                  type="button"
                  className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded bg-[#1E2C5E] text-white text-[11px] font-semibold cursor-pointer"
                >
                  <span>Impor data</span>
                  <ChevronDown className="w-3.5 h-3.5 opacity-80" />
                </button>
              </div>
            )}

            {/* Toolbar + Golden-Yellow Coretax Lampiran Table */}
            <CoretaxIconToolbar
              onRefresh={() => {
                setLampiranSearch('');
                setPage(1);
              }}
              onExportCsv={() =>
                downloadCsvFile(
                  `SPT_PPN_Lampiran_${tab.toUpperCase()}_${periodCode}.csv`,
                  ['No', 'Lawan Transaksi', 'NPWP', 'Nomor Faktur/Dokumen', 'Tanggal', 'DPP', 'DPP Nilai Lain', 'PPN', 'Status'],
                  activeLampiranList.map((inv, idx) => [
                    idx + 1,
                    inv.counterpartyName,
                    inv.counterpartyNpwp,
                    inv.invoiceNumber,
                    inv.invoiceDate,
                    inv.dppTotal,
                    inv.dppOtherValue,
                    inv.ppnTotal,
                    inv.status,
                  ])
                )
              }
              onExportExcel={() =>
                downloadCsvFile(
                  `SPT_PPN_Lampiran_${tab.toUpperCase()}_${periodCode}.csv`,
                  ['No', 'Lawan Transaksi', 'NPWP', 'Nomor Faktur/Dokumen', 'Tanggal', 'DPP', 'DPP Nilai Lain', 'PPN', 'Status'],
                  activeLampiranList.map((inv, idx) => [
                    idx + 1,
                    inv.counterpartyName,
                    inv.counterpartyNpwp,
                    inv.invoiceNumber,
                    inv.invoiceDate,
                    inv.dppTotal,
                    inv.dppOtherValue,
                    inv.ppnTotal,
                    inv.status,
                  ])
                )
              }
              onPrintPdf={() => window.print()}
            />

            <div className="border border-[#DCE2EC] rounded-[6px] overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-[11px] border-collapse">
                  <thead>
                    <tr className="bg-[#F6C324] text-[#1E293B] font-bold">
                      <th className="px-3 py-2.5 text-center w-12 border-r border-white/50">No.</th>
                      <th className="px-3 py-2.5 text-left border-r border-white/50">
                        <span className="inline-flex items-center gap-1">
                          {tab === 'b1' || tab === 'b2' || tab === 'b3'
                            ? 'Nama Penjual BKP / Pemberi JKP'
                            : 'Nama Pembeli BKP / Penerima JKP'}{' '}
                          <ArrowUpDown className="w-3 h-3 opacity-60" />
                        </span>
                      </th>
                      <th className="px-3 py-2.5 text-left border-r border-white/50">
                        Nomor Identitas WP / NPWP
                      </th>
                      <th className="px-3 py-2.5 text-left border-r border-white/50">
                        Faktur Pajak / Dokumen Tertentu - Nomor
                      </th>
                      <th className="px-3 py-2.5 text-center border-r border-white/50">
                        Tanggal
                      </th>
                      <th className="px-3 py-2.5 text-right border-r border-white/50">
                        Harga Jual/Penggantian/DPP (Rupiah)
                      </th>
                      <th className="px-3 py-2.5 text-right border-r border-white/50">
                        DPP Nilai Lain/DPP (Rupiah)
                      </th>
                      <th className="px-3 py-2.5 text-right border-r border-white/50">
                        PPN (Rupiah)
                      </th>
                      {tab === 'c' && (
                        <th className="px-3 py-2.5 text-right border-r border-white/50">
                          PPN Diretur (Rupiah)
                        </th>
                      )}
                      <th className="px-3 py-2.5 text-center">Keterangan / Status</th>
                    </tr>
                    <tr className="bg-white border-b border-[#E2E8F0]">
                      <th className="px-2 py-1.5 border-r border-slate-100" />
                      <th colSpan={3} className="px-2 py-1.5 border-r border-slate-100">
                        <div className="flex items-center gap-1.5">
                          <input
                            type="text"
                            value={lampiranSearch}
                            onChange={(e) => {
                              setLampiranSearch(e.target.value);
                              setPage(1);
                            }}
                            placeholder="Cari nama, NPWP, atau nomor faktur..."
                            className="w-full border border-[#CBD5E1] rounded-[4px] px-2 py-1 text-[11px] font-normal"
                          />
                          <Filter className="w-3 h-3 text-slate-400 shrink-0" />
                        </div>
                      </th>
                      <th colSpan={tab === 'c' ? 6 : 5} className="px-2 py-1.5" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#EEF2F6] bg-white">
                    {paginatedLampiran.length === 0 ? (
                      <tr>
                        <td colSpan={tab === 'c' ? 10 : 9} className="px-4 py-6 text-left text-slate-500">
                          Tidak ada data yang ditemukan untuk Masa {periodLabel}.
                        </td>
                      </tr>
                    ) : (
                      paginatedLampiran.map((inv, idx) => (
                        <tr key={inv.id} className="hover:bg-[#F8FAFC]">
                          <td className="px-3 py-2 text-center font-mono-num text-slate-500">
                            {(page - 1) * pageSize + idx + 1}
                          </td>
                          <td className="px-3 py-2 font-medium text-slate-800">{inv.counterpartyName}</td>
                          <td className="px-3 py-2 font-mono-num text-slate-600">{inv.counterpartyNpwp}</td>
                          <td className="px-3 py-2 font-mono-num font-semibold text-[#1E2C5E]">
                            {inv.invoiceNumber}
                          </td>
                          <td className="px-3 py-2 text-center font-mono-num">{inv.invoiceDate}</td>
                          <td className="px-3 py-2 text-right font-mono-num">
                            {inv.dppTotal.toLocaleString('id-ID')}
                          </td>
                          <td className="px-3 py-2 text-right font-mono-num">
                            {inv.dppOtherValue.toLocaleString('id-ID')}
                          </td>
                          <td className="px-3 py-2 text-right font-mono-num font-bold text-[#1E2C5E]">
                            {inv.ppnTotal.toLocaleString('id-ID')}
                          </td>
                          {tab === 'c' && (
                            <td className="px-3 py-2 text-right font-mono-num font-bold text-red-700">
                              {inv.returnAmount.toLocaleString('id-ID')}
                            </td>
                          )}
                          <td className="px-3 py-2 text-center font-semibold text-slate-700">
                            {inv.status}
                          </td>
                        </tr>
                      ))
                    )}
                    {/* TOTAL row matching Coretax PDF */}
                    <tr className="bg-[#FAFBFD] font-bold border-t border-[#CBD5E1]">
                      <td colSpan={5} className="px-3 py-2 text-right text-slate-600 uppercase">
                        TOTAL
                      </td>
                      <td className="px-3 py-2 text-right font-mono-num">
                        {activeLampiranList.reduce((s, i) => s + i.dppTotal, 0).toLocaleString('id-ID')}
                      </td>
                      <td className="px-3 py-2 text-right font-mono-num">
                        {activeLampiranList.reduce((s, i) => s + i.dppOtherValue, 0).toLocaleString('id-ID')}
                      </td>
                      <td className="px-3 py-2 text-right font-mono-num text-[#1E2C5E]">
                        {activeLampiranList.reduce((s, i) => s + i.ppnTotal, 0).toLocaleString('id-ID')}
                      </td>
                      {tab === 'c' && (
                        <td className="px-3 py-2 text-right font-mono-num text-red-700">
                          {activeLampiranList.reduce((s, i) => s + i.returnAmount, 0).toLocaleString('id-ID')}
                        </td>
                      )}
                      <td />
                    </tr>
                  </tbody>
                </table>
              </div>
              <CoretaxPagination
                totalItems={activeLampiranList.length}
                page={page}
                pageSize={pageSize}
                onPageChange={setPage}
                onPageSizeChange={setPageSize}
              />
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* AUTHENTIC CORETAX BOTTOM ACTIONS (Simpan Konsep / Bayar dan Lapor)*/}
        {/* ================================================================= */}
        <div className="pt-4 border-t border-[#E2E8F0] space-y-2.5">
          {!isReadOnly && (
            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 rounded-[4px] bg-[#1E2C5E] hover:bg-[#16224A] text-white font-semibold text-[12px] cursor-pointer disabled:opacity-60"
              >
                {saving ? 'Menyimpan...' : 'Simpan Konsep'}
              </button>
              <button
                type="button"
                disabled={!declarationChecked}
                onClick={async () => {
                  await onSave(buildUpdatedReturn());
                  setSignOpen(true);
                }}
                className="px-4 py-2 rounded-[4px] bg-[#1E2C5E] hover:bg-[#16224A] disabled:opacity-50 text-white font-semibold text-[12px] cursor-pointer"
              >
                Bayar dan Lapor
              </button>
            </div>
          )}
          <div>
            <button
              type="button"
              onClick={onBack}
              className="text-[11.5px] text-slate-600 hover:text-[#1E2C5E] hover:underline cursor-pointer"
            >
              Pergi ke pencarian
            </button>
          </div>
        </div>
      </div>

      <SignModal
        open={signOpen}
        title="Tanda Tangan Dokumen"
        description={
          kurangLebihBayar > 0
            ? `SPT Masa PPN (${periodLabel}) Kurang Bayar sebesar ${formatRp(kurangLebihBayar)} akan diselesaikan melalui ${
                paymentMethod === 'DEPOSIT' ? 'Pemindahbukuan Deposit Pajak' : 'Pembuatan Kode Billing (411211-100)'
              }.`
            : `SPT Masa PPN (${periodLabel}) berstatus ${kurangLebihBayar < 0 ? 'Lebih Bayar' : 'Nihil'} dan akan langsung diterbitkan BPE.`
        }
        signerName={activeTaxpayer.name}
        signerNik={activeTaxpayer.nikNpwp}
        confirmLabel="Konfirmasi Tanda Tangan"
        onClose={() => setSignOpen(false)}
        onConfirm={async () => {
          await onSubmit(taxReturn.id, kurangLebihBayar > 0 ? paymentMethod : 'NONE');
          onBack();
        }}
      />
    </div>
  );
};
