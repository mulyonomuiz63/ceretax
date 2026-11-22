import React, { useState } from 'react';
import {
  AlertCircle,
  Download,
  Eye,
  FileCode2,
  Plus,
  Send,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { PtkpStatus, SlipType, Taxpayer, WithholdingSlip, WorkspaceState } from '../types/tax.ts';
import {
  calculatePph21Ter,
  calculatePphPasal17,
  formatRp,
  MONTHS_ID,
  PPH23_OBJECT_CODES,
  PTKP_VALUES,
} from '../utils/taxCalc.ts';
import { SignModal } from '../components/SignModal.tsx';
import { PrintablePayload } from '../components/DocumentPrintModal.tsx';

interface EBupotModuleProps {
  subTab: string;
  onChangeSubTab: (tab: string) => void;
  workspace: WorkspaceState;
  activeTaxpayer: Taxpayer;
  accountMode: 'INDIVIDUAL' | 'CORPORATE';
  onSwitchAccountMode: (mode: 'INDIVIDUAL' | 'CORPORATE') => void;
  onCreateSlip: (slip: Omit<WithholdingSlip, 'id' | 'createdAt' | 'status'>) => Promise<void>;
  onIssueSlips: (ids: string[]) => Promise<void>;
  onDeleteSlip: (id: string) => Promise<void>;
  onImportXml: (xml: string) => Promise<number>;
  onPrintDocument: (doc: PrintablePayload) => void;
}

const SAMPLE_XML_TEMPLATE = `<?xml version="1.0" encoding="UTF-8"?>
<CoretaxEBupotImport>
  <Bupot>
    <SlipType>BPMP</SlipType>
    <RecipientNikNpwp>3174081203930007</RecipientNikNpwp>
    <RecipientName>DEWI LESTARI</RecipientName>
    <Month>1</Month>
    <Year>2025</Year>
    <ObjectCode>21-100-01</ObjectCode>
    <ObjectName>Pegawai Tetap (BPMP TER)</ObjectName>
    <Ptkp>TK/0</Ptkp>
    <GrossAmount>15000000</GrossAmount>
    <RatePercent>6</RatePercent>
    <TaxWithheld>900000</TaxWithheld>
  </Bupot>
  <Bupot>
    <SlipType>BPPU_23</SlipType>
    <RecipientNikNpwp>0911223344556000</RecipientNikNpwp>
    <RecipientName>PT KONSULTAN PAJAK MANDIRI</RecipientName>
    <Month>1</Month>
    <Year>2025</Year>
    <ObjectCode>24-104-29</ObjectCode>
    <ObjectName>Jasa Konsultan / Manajemen</ObjectName>
    <Ptkp>TK/0</Ptkp>
    <GrossAmount>25000000</GrossAmount>
    <RatePercent>2</RatePercent>
    <TaxWithheld>500000</TaxWithheld>
  </Bupot>
</CoretaxEBupotImport>`;

export const EBupotModule: React.FC<EBupotModuleProps> = ({
  subTab,
  onChangeSubTab,
  workspace,
  activeTaxpayer,
  accountMode,
  onSwitchAccountMode,
  onCreateSlip,
  onIssueSlips,
  onDeleteSlip,
  onImportXml,
  onPrintDocument,
}) => {
  const [statusView, setStatusView] = useState<'UNISSUED' | 'ISSUED'>('UNISSUED');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [signOpen, setSignOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);

  // XML Import state
  const [xmlContent, setXmlContent] = useState(SAMPLE_XML_TEMPLATE);
  const [xmlStatus, setXmlStatus] = useState<string | null>(null);

  // Create form state
  const [recipientNik, setRecipientNik] = useState('3174051908920005');
  const [recipientName, setRecipientName] = useState('ANDI WIJAYA');
  const [month, setMonth] = useState(1);
  const [year, setYear] = useState(2025);
  const [ptkp, setPtkp] = useState<PtkpStatus>('TK/0');
  const [grossAmount, setGrossAmount] = useState(20_000_000);
  const [pph23Code, setPph23Code] = useState('24-104-29');

  const slipTypeMap: Record<string, SlipType> = {
    bpmp: 'BPMP',
    bp21: 'BP21',
    bpa1: 'BPA1',
    bppu: 'BPPU_23',
  };
  const currentSlipType: SlipType = slipTypeMap[subTab] || 'BPMP';

  const visibleSlips = workspace.slips.filter(
    (s) => s.slipType === currentSlipType && s.status === statusView
  );

  // Live calculation preview for create modal
  const computeSlipValues = () => {
    if (currentSlipType === 'BPMP') {
      const res = calculatePph21Ter(grossAmount, ptkp);
      return {
        objectCode: '21-100-01',
        objectName: `Pegawai Tetap (TER Kategori ${res.category})`,
        netAmount: grossAmount,
        ratePercent: res.ratePercent,
        taxWithheld: res.tax,
      };
    }
    if (currentSlipType === 'BP21') {
      const dpp = Math.round(grossAmount * 0.5);
      const tax = calculatePphPasal17(dpp);
      const eff = grossAmount > 0 ? Number(((tax / grossAmount) * 100).toFixed(2)) : 0;
      return {
        objectCode: '21-100-07',
        objectName: 'Bukan Pegawai / Tenaga Ahli (50% x Bruto x Psl 17)',
        netAmount: dpp,
        ratePercent: eff,
        taxWithheld: tax,
      };
    }
    if (currentSlipType === 'BPA1') {
      const biayaJabatan = Math.min(6_000_000, Math.round(grossAmount * 0.05));
      const net = Math.max(0, grossAmount - biayaJabatan);
      const ptkpVal = PTKP_VALUES[ptkp];
      const pkp = Math.max(0, net - ptkpVal);
      const tax = calculatePphPasal17(pkp);
      return {
        objectCode: '21-100-01',
        objectName: 'Pegawai Tetap — Bukti Potong Tahunan BPA1',
        positionAllowance: biayaJabatan,
        netAmount: net,
        ptkpAmount: ptkpVal,
        pkpAmount: pkp,
        ratePercent: grossAmount > 0 ? Number(((tax / grossAmount) * 100).toFixed(2)) : 0,
        taxWithheld: tax,
      };
    }
    const found23 = PPH23_OBJECT_CODES.find((c) => c.code === pph23Code) || PPH23_OBJECT_CODES[0];
    return {
      objectCode: found23.code,
      objectName: found23.name,
      netAmount: grossAmount,
      ratePercent: found23.rate,
      taxWithheld: Math.round((grossAmount * found23.rate) / 100),
    };
  };

  const calc = computeSlipValues();

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    await onCreateSlip({
      issuerId: workspace.corporateTaxpayer.id,
      issuerNpwp: workspace.corporateTaxpayer.nikNpwp,
      issuerName: workspace.corporateTaxpayer.name,
      recipientNikNpwp: recipientNik,
      recipientName,
      slipType: currentSlipType,
      slipNumber: `DRAFT-${currentSlipType}-${workspace.slips.length + 1}`,
      taxPeriodMonth: currentSlipType === 'BPA1' ? 12 : month,
      taxPeriodYear: year,
      objectCode: calc.objectCode,
      objectName: calc.objectName,
      ptkpStatus: ptkp,
      grossAmount,
      positionAllowance: calc.positionAllowance,
      netAmount: calc.netAmount,
      ptkpAmount: calc.ptkpAmount,
      pkpAmount: calc.pkpAmount,
      ratePercent: calc.ratePercent,
      taxWithheld: calc.taxWithheld,
    });
    setStatusView('UNISSUED');
    setCreateOpen(false);
  };

  const handleDownloadXmlTemplate = () => {
    const blob = new Blob([SAMPLE_XML_TEMPLATE], { type: 'application/xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Template_Impor_eBupot_KelasBrevet.xml';
    a.click();
    URL.revokeObjectURL(url);
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const toggleAllVisible = () => {
    if (selectedIds.length === visibleSlips.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(visibleSlips.map((s) => s.id));
    }
  };

  return (
    <div className="space-y-4">
      {accountMode !== 'CORPORATE' && (
        <div className="bg-amber-50 border border-amber-300 text-amber-900 rounded-md px-4 py-3 text-xs flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              Pembuatan &amp; penerbitan <strong>e-Bupot PPh 21 &amp; PPh 23</strong> dilakukan oleh Pemotong Pajak (Akun Perusahaan).
            </span>
          </div>
          <button
            type="button"
            onClick={() => onSwitchAccountMode('CORPORATE')}
            className="bg-[#1D2B53] text-[#F4C430] font-bold px-3 py-1.5 rounded text-xs cursor-pointer"
          >
            Impersonate ke {workspace.corporateTaxpayer.name}
          </button>
        </div>
      )}

      <div className="bg-white border border-[#D9E0E8] rounded-md overflow-hidden">
        {/* Header & Sub-Tabs */}
        <div className="px-5 py-3.5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-display font-bold text-base text-[#1D2B53]">
              eBupot — Bukti Pemotongan PPh 21 &amp; Unifikasi PPh 23 (Modul 3)
            </h1>
            <p className="text-xs text-slate-500">
              Sesuai Panduan e-Bupot Coretax: BPMP TER PP 58/2023, BP21, BPA1, BPPU PPh 23 (24-104-29) &amp; Impor XML
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { id: 'bppu', label: 'BPPU' },
              { id: 'bp21', label: 'BP 21 - Bukti Pemotongan Selain Pegawai Tetap' },
              { id: 'bpa1', label: 'BP A1 - Bukti Pemotongan A1 Masa Pajak Terakhir' },
              { id: 'bpmp', label: 'Bukti Pemotongan Bulanan Pegawai Tetap' },
              { id: 'xml', label: 'Impor Data' },
            ].map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => {
                  onChangeSubTab(t.id);
                  setSelectedIds([]);
                }}
                className={`px-3 py-1.5 text-xs font-bold rounded transition cursor-pointer ${
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

        {/* XML IMPORT VIEW */}
        {subTab === 'xml' ? (
          <div className="p-5 space-y-4 text-xs">
            <div className="bg-[#D9F2FD] border border-[#9EE0FB] text-[#0C5460] rounded p-3.5 flex flex-wrap items-center justify-between gap-3">
              <div>
                <strong>Impor Massal XML e-Bupot:</strong> Unduh template XML atau unggah/tempel kode XML bukti potong PPh 21 (<code>BPMP</code>) dan PPh 23 (<code>BPPU_23</code>). Data yang diimpor masuk ke daftar <strong>Belum Terbit</strong> untuk ditandatangani secara massal.
              </div>
              <button
                type="button"
                onClick={handleDownloadXmlTemplate}
                className="inline-flex items-center gap-1.5 bg-[#1D2B53] text-[#F4C430] font-bold px-3 py-2 rounded cursor-pointer shrink-0"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Unduh Template XML</span>
              </button>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="font-bold text-[#1D2B53] flex items-center gap-1.5">
                  <FileCode2 className="w-4 h-4" />
                  <span>Isi Berkas XML e-Bupot</span>
                </label>
                <label className="inline-flex items-center gap-1 text-[#1D2B53] font-bold hover:underline cursor-pointer">
                  <Upload className="w-3.5 h-3.5" />
                  <span>Pilih File .xml</span>
                  <input
                    type="file"
                    accept=".xml,text/xml"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const reader = new FileReader();
                      reader.onload = () => setXmlContent(String(reader.result || ''));
                      reader.readAsText(file);
                    }}
                  />
                </label>
              </div>
              <textarea
                rows={12}
                value={xmlContent}
                onChange={(e) => setXmlContent(e.target.value)}
                className="w-full border border-[#CBD5E1] rounded p-3 font-mono-num text-[11px] bg-slate-50 focus:bg-white focus:outline-none focus:border-[#1D2B53]"
              />
            </div>

            {xmlStatus && (
              <div className="bg-emerald-50 border border-emerald-300 text-emerald-800 rounded px-3.5 py-2.5 font-semibold">
                {xmlStatus}
              </div>
            )}

            <div className="flex justify-end">
              <button
                type="button"
                onClick={async () => {
                  const count = await onImportXml(xmlContent);
                  setXmlStatus(
                    `Berhasil mengimpor ${count} draf Bukti Potong ke tab Belum Terbit! Silakan buka tab BPMP atau BPPU (PPh 23) untuk menerbitkan.`
                  );
                }}
                className="inline-flex items-center gap-2 bg-[#1D2B53] hover:bg-[#273A6E] text-white font-bold px-4 py-2 rounded cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5 text-[#F4C430]" />
                <span>Validasi &amp; Impor XML Sekarang</span>
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Status Sub-Switcher: Belum Terbit vs Telah Terbit */}
            <div className="px-5 py-3 bg-[#F8FAFC] border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <div className="inline-flex rounded border border-[#CBD5E1] overflow-hidden bg-white">
                  <button
                    type="button"
                    onClick={() => {
                      setStatusView('UNISSUED');
                      setSelectedIds([]);
                    }}
                    className={`px-3.5 py-1.5 text-xs font-bold cursor-pointer ${
                      statusView === 'UNISSUED'
                        ? 'bg-[#F4C430] text-[#1D2B53]'
                        : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    Belum Terbit (
                    {workspace.slips.filter((s) => s.slipType === currentSlipType && s.status === 'UNISSUED').length}
                    )
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setStatusView('ISSUED');
                      setSelectedIds([]);
                    }}
                    className={`px-3.5 py-1.5 text-xs font-bold cursor-pointer ${
                      statusView === 'ISSUED'
                        ? 'bg-[#F4C430] text-[#1D2B53]'
                        : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    Telah Terbit (
                    {workspace.slips.filter((s) => s.slipType === currentSlipType && s.status === 'ISSUED').length}
                    )
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setCreateOpen(true)}
                  className="inline-flex items-center gap-1.5 bg-[#1D2B53] hover:bg-[#273A6E] text-white font-bold text-xs px-3.5 py-1.5 rounded cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 text-[#F4C430]" />
                  <span>+ Create {currentSlipType}</span>
                </button>

                {statusView === 'UNISSUED' && (
                  <button
                    type="button"
                    disabled={selectedIds.length === 0}
                    onClick={() => setSignOpen(true)}
                    className="inline-flex items-center gap-1.5 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-45 text-white font-bold text-xs px-3.5 py-1.5 rounded cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Terbitkan ({selectedIds.length})</span>
                  </button>
                )}
              </div>

              <div className="text-xs font-mono-num text-slate-600">
                Total PPh Dipotong:{' '}
                <strong className="text-[#1D2B53]">
                  {formatRp(visibleSlips.reduce((sum, s) => sum + s.taxWithheld, 0))}
                </strong>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-[#F4C430] text-[#1D2B53] font-bold">
                    {statusView === 'UNISSUED' && (
                      <th className="px-3 py-2.5 w-10 text-center">
                        <input
                          type="checkbox"
                          checked={visibleSlips.length > 0 && selectedIds.length === visibleSlips.length}
                          onChange={toggleAllVisible}
                        />
                      </th>
                    )}
                    <th className="px-3 py-2.5 text-left">Aksi</th>
                    <th className="px-3 py-2.5 text-left">Nomor Bukti Potong</th>
                    <th className="px-3 py-2.5 text-left">Masa / Tahun</th>
                    <th className="px-3 py-2.5 text-left">NIK / NPWP Penerima</th>
                    <th className="px-3 py-2.5 text-left">Nama Penerima</th>
                    <th className="px-3 py-2.5 text-left">Kode Objek Pajak</th>
                    <th className="px-3 py-2.5 text-right">Penghasilan Bruto</th>
                    <th className="px-3 py-2.5 text-right">Tarif</th>
                    <th className="px-3 py-2.5 text-right">PPh Dipotong</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {visibleSlips.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="px-4 py-8 text-center text-slate-500">
                        Belum ada data bukti potong {currentSlipType} pada status{' '}
                        <strong>{statusView === 'UNISSUED' ? 'Belum Terbit' : 'Telah Terbit'}</strong>.
                      </td>
                    </tr>
                  ) : (
                    visibleSlips.map((slip) => (
                      <tr key={slip.id} className="hover:bg-[#F8FAFC]">
                        {statusView === 'UNISSUED' && (
                          <td className="px-3 py-2.5 text-center">
                            <input
                              type="checkbox"
                              checked={selectedIds.includes(slip.id)}
                              onChange={() => toggleSelect(slip.id)}
                            />
                          </td>
                        )}
                        <td className="px-3 py-2.5 whitespace-nowrap">
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => onPrintDocument({ type: 'BPA1', slip })}
                              className="p-1.5 rounded border border-slate-200 hover:bg-slate-100 text-[#1D2B53] cursor-pointer"
                              title="Pratinjau / Unduh Bukti Potong"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                            {slip.status === 'UNISSUED' && (
                              <button
                                type="button"
                                onClick={() => onDeleteSlip(slip.id)}
                                className="p-1.5 rounded border border-red-200 hover:bg-red-50 text-red-600 cursor-pointer"
                                title="Hapus Draft"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-2.5 font-mono-num font-bold text-[#1D2B53]">
                          {slip.slipNumber}
                        </td>
                        <td className="px-3 py-2.5">
                          {MONTHS_ID[Math.max(0, slip.taxPeriodMonth - 1)]} {slip.taxPeriodYear}
                        </td>
                        <td className="px-3 py-2.5 font-mono-num">{slip.recipientNikNpwp}</td>
                        <td className="px-3 py-2.5 font-semibold">{slip.recipientName}</td>
                        <td className="px-3 py-2.5">
                          <div className="font-mono-num font-semibold text-[#1D2B53]">{slip.objectCode}</div>
                          <div className="text-[10px] text-slate-500">{slip.objectName}</div>
                        </td>
                        <td className="px-3 py-2.5 text-right font-mono-num">{formatRp(slip.grossAmount)}</td>
                        <td className="px-3 py-2.5 text-right font-mono-num">{slip.ratePercent}%</td>
                        <td className="px-3 py-2.5 text-right font-mono-num font-bold text-[#1D2B53]">
                          {formatRp(slip.taxWithheld)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* Create e-Bupot Modal */}
      {createOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-md shadow-xl border border-slate-300 w-full max-w-lg overflow-hidden">
            <div className="bg-[#1D2B53] text-white px-5 py-3.5 flex items-center justify-between border-b-2 border-[#F4C430]">
              <h3 className="font-display font-bold text-sm">Buat Bukti Potong — {currentSlipType}</h3>
              <button type="button" onClick={() => setCreateOpen(false)} className="cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleCreate} className="p-5 space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#1D2B53] mb-1">Masa Pajak</label>
                  <select
                    value={month}
                    onChange={(e) => setMonth(Number(e.target.value))}
                    disabled={currentSlipType === 'BPA1'}
                    className="w-full border border-[#CBD5E1] rounded px-3 py-2 bg-white"
                  >
                    {MONTHS_ID.map((m, i) => (
                      <option key={m} value={i + 1}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-[#1D2B53] mb-1">Tahun Pajak</label>
                  <input
                    type="number"
                    value={year}
                    onChange={(e) => setYear(Number(e.target.value))}
                    className="w-full border border-[#CBD5E1] rounded px-3 py-2 font-mono-num"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#1D2B53] mb-1">NIK / NPWP Penerima</label>
                  <input
                    type="text"
                    value={recipientNik}
                    onChange={(e) => setRecipientNik(e.target.value)}
                    className="w-full border border-[#CBD5E1] rounded px-3 py-2 font-mono-num"
                    required
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#1D2B53] mb-1">Nama Penerima</label>
                  <input
                    type="text"
                    value={recipientName}
                    onChange={(e) => setRecipientName(e.target.value)}
                    className="w-full border border-[#CBD5E1] rounded px-3 py-2"
                    required
                  />
                </div>
              </div>

              {currentSlipType === 'BPPU_23' ? (
                <div>
                  <label className="block font-semibold text-[#1D2B53] mb-1">Kode Objek Pajak PPh 23</label>
                  <select
                    value={pph23Code}
                    onChange={(e) => setPph23Code(e.target.value)}
                    className="w-full border border-[#CBD5E1] rounded px-3 py-2 bg-white"
                  >
                    {PPH23_OBJECT_CODES.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.code} — {c.name} ({c.rate}%)
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div>
                  <label className="block font-semibold text-[#1D2B53] mb-1">Status PTKP Penerima</label>
                  <select
                    value={ptkp}
                    onChange={(e) => setPtkp(e.target.value as PtkpStatus)}
                    className="w-full border border-[#CBD5E1] rounded px-3 py-2 bg-white"
                  >
                    {(['TK/0', 'TK/1', 'TK/2', 'TK/3', 'K/0', 'K/1', 'K/2', 'K/3'] as PtkpStatus[]).map(
                      (p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      )
                    )}
                  </select>
                </div>
              )}

              <div>
                <label className="block font-semibold text-[#1D2B53] mb-1">Penghasilan Bruto (Rp)</label>
                <input
                  type="number"
                  min={0}
                  value={grossAmount}
                  onChange={(e) => setGrossAmount(Number(e.target.value))}
                  className="w-full border border-[#CBD5E1] rounded px-3 py-2 font-mono-num"
                  required
                />
              </div>

              {/* Automatic Tax Calculation Box */}
              <div className="bg-[#F8FAFC] border border-[#CBD5E1] rounded p-3 grid grid-cols-3 gap-2">
                <div>
                  <span className="text-[10px] text-slate-500 block">Objek Pajak</span>
                  <span className="font-mono-num font-bold text-[#1D2B53]">{calc.objectCode}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block">Tarif Efektif / Pasal</span>
                  <span className="font-mono-num font-bold text-[#1D2B53]">{calc.ratePercent}%</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block">PPh Terutang</span>
                  <span className="font-mono-num font-extrabold text-emerald-700">
                    {formatRp(calc.taxWithheld)}
                  </span>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setCreateOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded font-semibold cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#1D2B53] text-white font-bold rounded cursor-pointer"
                >
                  Simpan Konsep (Belum Terbit)
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Batch Electronic Signing Modal */}
      <SignModal
        open={signOpen}
        title="Terbitkan Bukti Potong e-Bupot"
        description={`Anda akan menandatangani dan menerbitkan ${selectedIds.length} Bukti Potong ke daftar Telah Terbit sehingga otomatis dapat di-Posting ke SPT Masa.`}
        signerName={activeTaxpayer.name}
        signerNik={activeTaxpayer.nikNpwp}
        confirmLabel="Konfirmasi Tanda Tangan & Terbitkan"
        onClose={() => setSignOpen(false)}
        onConfirm={async () => {
          await onIssueSlips(selectedIds);
          setSelectedIds([]);
          setStatusView('ISSUED');
        }}
      />
    </div>
  );
};
