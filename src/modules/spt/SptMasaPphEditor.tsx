import React, { useState } from 'react';
import { ArrowUpDown, Calendar, ChevronDown, ChevronRight, Filter, Settings, X } from 'lucide-react';
import { SptPphMasaPayload, TaxReturn, Taxpayer, WithholdingSlip, WorkspaceState } from '../../types/tax.ts';
import { formatRp, MONTHS_ID } from '../../utils/taxCalc.ts';
import { SignModal } from '../../components/SignModal.tsx';
import {
  CoretaxIconToolbar,
  CoretaxPagination,
  downloadCsvFile,
} from '../../components/CoretaxTableChrome.tsx';

interface SptMasaPphEditorProps {
  taxReturn: TaxReturn;
  workspace: WorkspaceState;
  activeTaxpayer: Taxpayer;
  onBack: () => void;
  onSave: (updated: TaxReturn) => Promise<void>;
  onSubmit: (id: string, paymentMethod: 'DEPOSIT' | 'BILLING' | 'NONE') => Promise<void>;
}

type Pph21Tab = 'induk' | 'l1a' | 'l1b' | 'l2' | 'l3';
type UnifikasiTab = 'induk' | 'daftar1' | 'daftar2' | 'lampiran1';

export const SptMasaPphEditor: React.FC<SptMasaPphEditorProps> = ({
  taxReturn,
  workspace,
  activeTaxpayer,
  onBack,
  onSave,
  onSubmit,
}) => {
  const isPph21 = taxReturn.returnType === 'SPT_MASA_PPH21';
  const [pph21Tab, setPph21Tab] = useState<Pph21Tab>('induk');
  const [uniTab, setUniTab] = useState<UnifikasiTab>('induk');
  const [payload, setPayload] = useState<SptPphMasaPayload>(taxReturn.payload as SptPphMasaPayload);
  const [paymentMethod, setPaymentMethod] = useState<'DEPOSIT' | 'BILLING'>('DEPOSIT');
  const [signOpen, setSignOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [postedNote, setPostedNote] = useState<string | null>(null);
  const [declarationOk, setDeclarationOk] = useState(true);
  const [signerType, setSignerType] = useState<'WP' | 'KUASA'>('WP');
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [showFilters, setShowFilters] = useState(true);
  const [filterNik, setFilterNik] = useState('');
  const [filterName, setFilterName] = useState('');
  const [filterSlipNo, setFilterSlipNo] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [filterObjCode, setFilterObjCode] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const toggleSec = (k: string) => setCollapsed((p) => ({ ...p, [k]: !p[k] }));
  const isReadOnly = taxReturn.status !== 'DRAFT';
  const monthLabel = MONTHS_ID[Math.max(0, taxReturn.taxPeriodMonth - 1)];
  const periodCode = `${String(taxReturn.taxPeriodMonth).padStart(2, '0')}-${taxReturn.taxYear}`;

  const exactPeriodSlips = workspace.slips.filter(
    (s) =>
      s.status === 'ISSUED' &&
      s.taxPeriodMonth === taxReturn.taxPeriodMonth &&
      s.taxPeriodYear === taxReturn.taxYear &&
      (isPph21
        ? s.slipType === 'BPMP' || s.slipType === 'BP21' || s.slipType === 'BPA1'
        : s.slipType === 'BPPU_23')
  );
  const matchingSlips =
    exactPeriodSlips.length > 0
      ? exactPeriodSlips
      : workspace.slips.filter(
          (s) =>
            s.status === 'ISSUED' &&
            (isPph21
              ? s.slipType === 'BPMP' || s.slipType === 'BP21' || s.slipType === 'BPA1'
              : s.slipType === 'BPPU_23')
        );

  const bpmpSlips = matchingSlips.filter((s) => s.slipType === 'BPMP');
  const bpa1Slips = matchingSlips.filter((s) => s.slipType === 'BPA1');
  const bp21Slips = matchingSlips.filter((s) => s.slipType === 'BP21');

  const handlePosting = () => {
    const totalGross = matchingSlips.reduce((sum, x) => sum + x.grossAmount, 0);
    const totalTaxWithheld = matchingSlips.reduce((sum, x) => sum + x.taxWithheld, 0);
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

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(buildUpdated());
      setPostedNote('Konsep SPT Masa berhasil disimpan.');
    } finally {
      setSaving(false);
    }
  };

  const renderNumBox = (n: number, bold = false) => (
    <div
      className={`w-full bg-[#EDF1F7] border border-[#DCE2EC] rounded-[3px] px-2.5 py-1 text-right font-mono-num text-[11px] ${
        bold ? 'font-bold text-[#1E2C5E]' : 'text-slate-700'
      }`}
    >
      {n.toLocaleString('id-ID')}
    </div>
  );

  const renderSlipTable = (
    rows: WithholdingSlip[],
    exportName: string,
    showPeriodCol = false,
    isPph21Lampiran = false
  ) => {
    const filtered = rows.filter((r) => {
      if (filterNik && !r.recipientNikNpwp.toLowerCase().includes(filterNik.toLowerCase())) return false;
      if (filterName && !r.recipientName.toLowerCase().includes(filterName.toLowerCase())) return false;
      if (filterSlipNo && !r.slipNumber.toLowerCase().includes(filterSlipNo.toLowerCase())) return false;
      if (filterObjCode && !r.objectCode.toLowerCase().includes(filterObjCode.toLowerCase())) return false;
      return true;
    });
    const paged = filtered.slice((page - 1) * pageSize, page * pageSize);
    const totalGross = filtered.reduce((s, r) => s + r.grossAmount, 0);
    const totalTax = filtered.reduce((s, r) => s + r.taxWithheld, 0);
    const nitkuStr = `${activeTaxpayer.nikNpwp}000000`;

    return (
      <div className="space-y-2">
        <CoretaxIconToolbar
          onRefresh={() => {
            setFilterNik('');
            setFilterName('');
            setFilterSlipNo('');
            setFilterDate('');
            setFilterObjCode('');
            setPage(1);
          }}
          onExportCsv={() =>
            downloadCsvFile(
              `${exportName}.csv`,
              [
                'No',
                'NIK/NPWP',
                'Nama',
                'Nomor Bukti Potong',
                'Tanggal',
                'Kode Objek Pajak',
                'Penghasilan Bruto',
                'Tarif %',
                'Pajak Penghasilan',
                'Fasilitas Perpajakan',
                'Negara',
                'ID Tempat Kegiatan Usaha',
              ],
              filtered.map((r, i) => [
                i + 1,
                r.recipientNikNpwp,
                r.recipientName,
                r.slipNumber,
                `31-${String(r.taxPeriodMonth).padStart(2, '0')}-${r.taxPeriodYear}`,
                r.objectCode,
                r.grossAmount,
                r.ratePercent,
                r.taxWithheld,
                'Tanpa Fasilitas',
                'Indonesia',
                nitkuStr,
              ])
            )
          }
          onExportExcel={() =>
            downloadCsvFile(
              `${exportName}.csv`,
              [
                'No',
                'NIK/NPWP',
                'Nama',
                'Nomor Bukti Potong',
                'Tanggal',
                'Kode Objek Pajak',
                'Penghasilan Bruto',
                'Tarif %',
                'Pajak Penghasilan',
                'Fasilitas Perpajakan',
                'Negara',
                'ID Tempat Kegiatan Usaha',
              ],
              filtered.map((r, i) => [
                i + 1,
                r.recipientNikNpwp,
                r.recipientName,
                r.slipNumber,
                `31-${String(r.taxPeriodMonth).padStart(2, '0')}-${r.taxPeriodYear}`,
                r.objectCode,
                r.grossAmount,
                r.ratePercent,
                r.taxWithheld,
                'Tanpa Fasilitas',
                'Indonesia',
                nitkuStr,
              ])
            )
          }
          onPrintPdf={() => window.print()}
          onToggleFilter={() => setShowFilters((p) => !p)}
          filterActive={showFilters}
        />
        <div className="border border-[#DCE2EC] rounded-[6px] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-[11px] border-collapse min-w-[1150px]">
              <thead>
                <tr className="bg-[#F6C324] text-[#1E293B] font-bold">
                  <th className="px-3 py-2.5 text-center w-10 border-r border-white/50">NO.</th>
                  <th className="px-3 py-2.5 text-left border-r border-white/50 whitespace-nowrap">
                    <span className="inline-flex items-center gap-1">
                      NIK/NPWP <ArrowUpDown className="w-3 h-3 opacity-60" />
                    </span>
                  </th>
                  <th className="px-3 py-2.5 text-left border-r border-white/50 whitespace-nowrap">
                    <span className="inline-flex items-center gap-1">
                      NAMA <ArrowUpDown className="w-3 h-3 opacity-60" />
                    </span>
                  </th>
                  <th className="px-3 py-2.5 text-left border-r border-white/50 whitespace-nowrap">
                    <span className="inline-flex items-center gap-1">
                      NOMOR BUKTI POTONG <ArrowUpDown className="w-3 h-3 opacity-60" />
                    </span>
                  </th>
                  <th className="px-3 py-2.5 text-center border-r border-white/50 whitespace-nowrap">
                    <span className="inline-flex items-center gap-1">
                      TANGGAL BUKTI PEMOTONGAN (dd-mm-yyyy) <ArrowUpDown className="w-3 h-3 opacity-60" />
                    </span>
                  </th>
                  <th className="px-3 py-2.5 text-left border-r border-white/50 whitespace-nowrap">
                    <span className="inline-flex items-center gap-1">
                      KODE OBJEK PAJAK <ArrowUpDown className="w-3 h-3 opacity-60" />
                    </span>
                  </th>
                  {!isPph21Lampiran && (
                    <th className="px-3 py-2.5 text-left border-r border-white/50 whitespace-nowrap">
                      OBJEK PAJAK
                    </th>
                  )}
                  {showPeriodCol && (
                    <th className="px-3 py-2.5 text-center border-r border-white/50 whitespace-nowrap">
                      MASA PEROLEHAN PENGHASILAN
                    </th>
                  )}
                  <th className="px-3 py-2.5 text-right border-r border-white/50 whitespace-nowrap">
                    <span className="inline-flex items-center gap-1">
                      PENGHASILAN BRUTO (Rp) <ArrowUpDown className="w-3 h-3 opacity-60" />
                    </span>
                  </th>
                  <th className="px-3 py-2.5 text-right border-r border-white/50 whitespace-nowrap">
                    <span className="inline-flex items-center gap-1">
                      TARIF PAJAK (%) <ArrowUpDown className="w-3 h-3 opacity-60" />
                    </span>
                  </th>
                  <th className="px-3 py-2.5 text-right border-r border-white/50 whitespace-nowrap">
                    <span className="inline-flex items-center gap-1">
                      PAJAK PENGHASILAN (Rp) <ArrowUpDown className="w-3 h-3 opacity-60" />
                    </span>
                  </th>
                  <th className="px-3 py-2.5 text-left border-r border-white/50 whitespace-nowrap">
                    <span className="inline-flex items-center gap-1">
                      FASILITAS PERPAJAKAN <ArrowUpDown className="w-3 h-3 opacity-60" />
                    </span>
                  </th>
                  <th className="px-3 py-2.5 text-left border-r border-white/50 whitespace-nowrap">
                    <span className="inline-flex items-center gap-1">
                      Negara <ArrowUpDown className="w-3 h-3 opacity-60" />
                    </span>
                  </th>
                  <th className="px-3 py-2.5 text-left whitespace-nowrap">
                    <span className="inline-flex items-center gap-1">
                      ID TEMPAT KEGIATAN USAHA <ArrowUpDown className="w-3 h-3 opacity-60" />
                    </span>
                  </th>
                </tr>

                {/* Official Coretax Inline Filter Row directly below yellow header (Exact Match to Screenshot) */}
                {showFilters && (
                  <tr className="bg-white border-b border-[#E2E8F0]">
                    <th className="px-2 py-2 border-r border-slate-100" />
                    <th className="px-2 py-2 border-r border-slate-100">
                      <div className="flex items-center gap-1">
                        <input
                          type="text"
                          value={filterNik}
                          onChange={(e) => setFilterNik(e.target.value)}
                          className="w-full min-w-[95px] border border-[#CBD5E1] rounded-[4px] px-2 py-1 text-[11px] font-normal"
                        />
                        <Filter className="w-3 h-3 text-slate-400 shrink-0" />
                      </div>
                    </th>
                    <th className="px-2 py-2 border-r border-slate-100">
                      <div className="flex items-center gap-1">
                        <input
                          type="text"
                          value={filterName}
                          onChange={(e) => setFilterName(e.target.value)}
                          className="w-full min-w-[100px] border border-[#CBD5E1] rounded-[4px] px-2 py-1 text-[11px] font-normal"
                        />
                        <Filter className="w-3 h-3 text-slate-400 shrink-0" />
                      </div>
                    </th>
                    <th className="px-2 py-2 border-r border-slate-100">
                      <div className="flex items-center gap-1">
                        <input
                          type="text"
                          value={filterSlipNo}
                          onChange={(e) => setFilterSlipNo(e.target.value)}
                          className="w-full min-w-[105px] border border-[#CBD5E1] rounded-[4px] px-2 py-1 text-[11px] font-normal"
                        />
                        <Filter className="w-3 h-3 text-slate-400 shrink-0" />
                      </div>
                    </th>
                    <th className="px-2 py-2 border-r border-slate-100">
                      <div className="flex items-center border border-[#CBD5E1] rounded-[4px] bg-white overflow-hidden">
                        <input
                          type="text"
                          value={filterDate}
                          onChange={(e) => setFilterDate(e.target.value)}
                          placeholder="dd-mm-yyyy"
                          className="w-full min-w-[95px] px-2 py-1 text-[11px] font-normal focus:outline-none"
                        />
                        <span className="px-1.5 text-slate-400 border-l border-slate-200">
                          <Calendar className="w-3 h-3" />
                        </span>
                        <button
                          type="button"
                          onClick={() => setFilterDate('')}
                          className="px-1.5 text-slate-400 hover:text-slate-600 border-l border-slate-200 cursor-pointer"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    </th>
                    <th className="px-2 py-2 border-r border-slate-100">
                      <div className="flex items-center gap-1">
                        <input
                          type="text"
                          value={filterObjCode}
                          onChange={(e) => setFilterObjCode(e.target.value)}
                          className="w-full min-w-[90px] border border-[#CBD5E1] rounded-[4px] px-2 py-1 text-[11px] font-normal"
                        />
                        <Filter className="w-3 h-3 text-slate-400 shrink-0" />
                      </div>
                    </th>
                    {!isPph21Lampiran && (
                      <th className="px-2 py-2 border-r border-slate-100 text-center">
                        <Filter className="w-3 h-3 text-slate-400 inline" />
                      </th>
                    )}
                    {showPeriodCol && (
                      <th className="px-2 py-2 border-r border-slate-100 text-center">
                        <Filter className="w-3 h-3 text-slate-400 inline" />
                      </th>
                    )}
                    <th className="px-2 py-2 border-r border-slate-100 text-center">
                      <Filter className="w-3 h-3 text-slate-400 inline" />
                    </th>
                    <th className="px-2 py-2 border-r border-slate-100 text-center">
                      <Filter className="w-3 h-3 text-slate-400 inline" />
                    </th>
                    <th className="px-2 py-2 border-r border-slate-100 text-center">
                      <Filter className="w-3 h-3 text-slate-400 inline" />
                    </th>
                    <th className="px-2 py-2 border-r border-slate-100">
                      <select className="w-full min-w-[130px] border border-[#CBD5E1] rounded-[4px] px-2 py-1 text-[11px] font-normal bg-white text-slate-600">
                        <option value="">Pilih FASILITAS PERPAJAKAN</option>
                        <option value="Tanpa Fasilitas">Tanpa Fasilitas</option>
                        <option value="DTP">DTP</option>
                      </select>
                    </th>
                    <th className="px-2 py-2 border-r border-slate-100">
                      <select className="w-full min-w-[110px] border border-[#CBD5E1] rounded-[4px] px-2 py-1 text-[11px] font-normal bg-white text-slate-600">
                        <option value="">Pilih Negara</option>
                        <option value="Indonesia">Indonesia</option>
                      </select>
                    </th>
                    <th className="px-2 py-2 text-center">
                      <Filter className="w-3 h-3 text-slate-400 inline" />
                    </th>
                  </tr>
                )}
              </thead>
              <tbody className="divide-y divide-[#EEF2F6] bg-white">
                {paged.length === 0 ? (
                  <tr>
                    <td
                      colSpan={11 + (!isPph21Lampiran ? 1 : 0) + (showPeriodCol ? 1 : 0)}
                      className="px-4 py-6 text-slate-500"
                    >
                      Tidak ada data yang ditemukan.
                    </td>
                  </tr>
                ) : (
                  paged.map((s, i) => {
                    const ddMmYyyy = `31-${String(s.taxPeriodMonth).padStart(2, '0')}-${s.taxPeriodYear}`;
                    return (
                      <tr key={s.id} className="hover:bg-[#F8FAFC]">
                        <td className="px-3 py-2 text-center font-mono-num text-slate-600">
                          {(page - 1) * pageSize + i + 1}
                        </td>
                        <td className="px-3 py-2 font-mono-num text-slate-700">{s.recipientNikNpwp}</td>
                        <td className="px-3 py-2 font-medium text-slate-800 uppercase">{s.recipientName}</td>
                        <td className="px-3 py-2 font-mono-num text-slate-800">{s.slipNumber}</td>
                        <td className="px-3 py-2 text-center font-mono-num text-slate-700">{ddMmYyyy}</td>
                        <td className="px-3 py-2 font-mono-num text-slate-700">{s.objectCode}</td>
                        {!isPph21Lampiran && (
                          <td className="px-3 py-2 text-slate-600 max-w-[200px] truncate">{s.objectName}</td>
                        )}
                        {showPeriodCol && (
                          <td className="px-3 py-2 text-center font-mono-num">{periodCode}</td>
                        )}
                        <td className="px-3 py-2 text-right font-mono-num text-slate-800">
                          {s.grossAmount.toLocaleString('id-ID')}
                        </td>
                        <td className="px-3 py-2 text-right font-mono-num text-slate-700">
                          {s.ratePercent.toFixed(2)}
                        </td>
                        <td className="px-3 py-2 text-right font-mono-num text-slate-800">
                          {s.taxWithheld.toLocaleString('id-ID')}
                        </td>
                        <td className="px-3 py-2 text-slate-700">Tanpa Fasilitas</td>
                        <td className="px-3 py-2 text-slate-700">Indonesia</td>
                        <td className="px-3 py-2 font-mono-num text-slate-600">{nitkuStr}</td>
                      </tr>
                    );
                  })
                )}

                {/* Exact 3 Coretax Footer Summary Rows inside the table (Matches User Image 100%) */}
                <tr className="bg-[#FAFBFD] border-t border-[#E2E8F0]">
                  <td
                    colSpan={8 + (!isPph21Lampiran ? 1 : 0) + (showPeriodCol ? 1 : 0)}
                    className="px-3 py-2 text-right text-slate-700"
                  >
                    JUMLAH PENGHASILAN BRUTO DAN PAJAK PENGHASILAN YANG DITANGGUNG OLEH PEMERINTAH
                  </td>
                  <td className="px-3 py-2 text-right font-mono-num text-slate-800">0</td>
                  <td colSpan={3} />
                </tr>
                <tr className="bg-[#FAFBFD] border-t border-[#E2E8F0]">
                  <td
                    colSpan={8 + (!isPph21Lampiran ? 1 : 0) + (showPeriodCol ? 1 : 0)}
                    className="px-3 py-2 text-right text-slate-700"
                  >
                    JUMLAH PENGHASILAN BRUTO DAN PAJAK PENGHASILAN YANG DIPOTONG
                  </td>
                  <td className="px-3 py-2 text-right font-mono-num text-slate-800">
                    {totalGross.toLocaleString('id-ID')}
                  </td>
                  <td className="px-3 py-2 text-right font-mono-num text-slate-800">
                    {totalTax.toLocaleString('id-ID')}
                  </td>
                  <td colSpan={2} />
                </tr>
                <tr className="bg-[#FAFBFD] border-t border-[#CBD5E1] font-semibold">
                  <td
                    colSpan={8 + (!isPph21Lampiran ? 1 : 0) + (showPeriodCol ? 1 : 0)}
                    className="px-3 py-2 text-right text-slate-800"
                  >
                    JUMLAH TOTAL PENGHASILAN BRUTO DAN PAJAK PENGHASILAN YANG DITANGGUNG OLEH PEMERINTAH SERTA PAJAK PENGHASILAN YANG DIPOTONG
                  </td>
                  <td className="px-3 py-2 text-right font-mono-num text-slate-800">
                    {totalGross.toLocaleString('id-ID')}
                  </td>
                  <td className="px-3 py-2 text-right font-mono-num text-slate-800">
                    {totalTax.toLocaleString('id-ID')}
                  </td>
                  <td colSpan={2} />
                </tr>
              </tbody>
            </table>
          </div>
          <CoretaxPagination
            totalItems={filtered.length}
            page={page}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
          />
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white border border-[#DCE2EC] rounded-[8px] shadow-[0_2px_10px_rgba(30,44,94,0.03)] overflow-hidden">
      {/* Official Form Header */}
      <div className="px-6 pt-5 pb-3 flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display font-medium text-[18px] sm:text-[19px] tracking-tight text-[#1E293B] uppercase">
          {isPph21 ? 'PEMOTONGAN PPh PASAL 21 DAN/ATAU PASAL 26' : 'SPT MASA PPh UNIFIKASI'}
        </h1>
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-[4px] bg-[#64748B] text-white text-[11px] font-semibold">
          <Settings className="w-3 h-3" />
          <span>XML Monitoring</span>
        </span>
      </div>

      {/* Horizontal Tab Bar */}
      <div className="px-6 border-b border-[#E2E8F0] flex items-center gap-1 overflow-x-auto">
        {isPph21
          ? (
              [
                { id: 'induk', label: 'Induk' },
                { id: 'l1a', label: 'L-IA' },
                { id: 'l1b', label: 'L-IB' },
                { id: 'l2', label: 'L-II' },
                { id: 'l3', label: 'L-III' },
              ] as Array<{ id: Pph21Tab; label: string }>
            ).map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => {
                  setPph21Tab(t.id);
                  setPage(1);
                }}
                className={`px-3.5 py-2 text-[11.5px] font-semibold transition whitespace-nowrap cursor-pointer border-b-2 ${
                  pph21Tab === t.id
                    ? 'border-[#3B82F6] text-[#1D4ED8] bg-[#EFF6FF]/60 rounded-t-[4px]'
                    : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                }`}
              >
                {t.label}
              </button>
            ))
          : (
              [
                { id: 'induk', label: 'INDUK' },
                { id: 'daftar1', label: 'DAFTAR-I' },
                { id: 'daftar2', label: 'DAFTAR-II' },
                { id: 'lampiran1', label: 'LAMPIRAN-I' },
              ] as Array<{ id: UnifikasiTab; label: string }>
            ).map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => {
                  setUniTab(t.id);
                  setPage(1);
                }}
                className={`px-3.5 py-2 text-[11.5px] font-semibold transition whitespace-nowrap cursor-pointer border-b-2 ${
                  uniTab === t.id
                    ? 'border-[#3B82F6] text-[#1D4ED8] bg-[#EFF6FF]/60 rounded-t-[4px]'
                    : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                }`}
              >
                {t.label}
              </button>
            ))}
      </div>

      <div className="p-6 space-y-4 text-[11.5px]">
        {postedNote && (
          <div className="bg-emerald-50 border border-emerald-300 text-emerald-800 px-3.5 py-2.5 rounded-[5px] font-medium flex items-center justify-between gap-2">
            <span>{postedNote}</span>
            <button
              type="button"
              onClick={() => setPostedNote(null)}
              className="text-emerald-700 font-bold cursor-pointer"
            >
              ×
            </button>
          </div>
        )}

        {/* ================================================================= */}
        {/* PART A: SPT MASA PPh 21/26 VIEWS                                  */}
        {/* ================================================================= */}
        {isPph21 && pph21Tab === 'induk' && (
          <div className="space-y-3.5">
            {/* v HEADER */}
            <div className="border border-[#DCE2EC] rounded-[5px] overflow-hidden">
              <button
                type="button"
                onClick={() => toggleSec('h21')}
                className="w-full px-4 py-2 bg-[#F8FAFC] border-b border-[#E2E8F0] flex items-center gap-2 font-semibold text-[#1E293B] cursor-pointer"
              >
                {collapsed.h21 ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                <span>HEADER</span>
              </button>
              {!collapsed.h21 && (
                <div className="p-4 space-y-2.5 max-w-xl">
                  <div className="grid grid-cols-12 items-center gap-2">
                    <span className="col-span-5 text-slate-600">Masa Pajak</span>
                    <input readOnly value={String(taxReturn.taxPeriodMonth).padStart(2, '0')} className="col-span-7 bg-[#EDF1F7] border border-[#DCE2EC] rounded-[3px] px-2.5 py-1 font-mono-num" />
                  </div>
                  <div className="grid grid-cols-12 items-center gap-2">
                    <span className="col-span-5 text-slate-600">Tahun Pajak</span>
                    <input readOnly value={taxReturn.taxYear} className="col-span-7 bg-[#EDF1F7] border border-[#DCE2EC] rounded-[3px] px-2.5 py-1 font-mono-num" />
                  </div>
                  <div className="grid grid-cols-12 items-center gap-2">
                    <span className="col-span-5 text-slate-600">Status SPT</span>
                    <input readOnly value={taxReturn.revisionNo === 0 ? 'Normal' : `Pembetulan ${taxReturn.revisionNo}`} className="col-span-7 bg-[#EDF1F7] border border-[#DCE2EC] rounded-[3px] px-2.5 py-1" />
                  </div>
                  <div className="grid grid-cols-12 items-center gap-2">
                    <span className="col-span-5 text-slate-600">Status Penyampaian</span>
                    <input readOnly value={taxReturn.status} className="col-span-7 bg-[#EDF1F7] border border-[#DCE2EC] rounded-[3px] px-2.5 py-1 font-mono-num" />
                  </div>
                  {!isReadOnly && (
                    <div className="pt-1 flex items-center gap-3">
                      <button
                        type="button"
                        onClick={handlePosting}
                        className="px-4 py-1.5 rounded-[4px] bg-[#1E2C5E] hover:bg-[#16224A] text-white font-semibold cursor-pointer"
                      >
                        Posting SPT
                      </button>
                      <span className="text-[11px] text-slate-500">
                        {payload.slipCount > 0
                          ? `${payload.slipCount} Bukti Potong tersinkronisasi`
                          : 'Tarik data Bukti Potong Telah Terbit dari e-Bupot'}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* v A. IDENTITAS PEMOTONG */}
            <div className="border border-[#DCE2EC] rounded-[5px] overflow-hidden">
              <button
                type="button"
                onClick={() => toggleSec('id21')}
                className="w-full px-4 py-2 bg-[#F8FAFC] border-b border-[#E2E8F0] flex items-center gap-2 font-semibold text-[#1E293B] cursor-pointer"
              >
                {collapsed.id21 ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                <span>A. IDENTITAS PEMOTONG</span>
              </button>
              {!collapsed.id21 && (
                <div className="p-4 space-y-2 max-w-2xl">
                  {[
                    ['1. NPWP', activeTaxpayer.nikNpwp],
                    ['2. Nama', activeTaxpayer.name],
                    ['3. Alamat', activeTaxpayer.address],
                    ['4. Nomor Telepon', activeTaxpayer.phone || '0215250208'],
                  ].map(([lbl, val]) => (
                    <div key={lbl} className="grid grid-cols-12 items-center gap-2">
                      <span className="col-span-4 text-slate-600">{lbl}</span>
                      <input readOnly value={val} className="col-span-8 bg-[#EDF1F7] border border-[#DCE2EC] rounded-[3px] px-2.5 py-1 text-slate-700" />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* v B. PAJAK PENGHASILAN PASAL 21 */}
            <div className="border border-[#DCE2EC] rounded-[5px] overflow-hidden">
              <button
                type="button"
                onClick={() => toggleSec('b21')}
                className="w-full px-4 py-2 bg-[#F8FAFC] border-b border-[#E2E8F0] flex items-center gap-2 font-semibold text-[#1E293B] cursor-pointer"
              >
                {collapsed.b21 ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                <span>B. PAJAK PENGHASILAN PASAL 21</span>
              </button>
              {!collapsed.b21 && (
                <div className="p-4 space-y-4">
                  <div>
                    <div className="font-semibold text-[#1E293B] mb-2">I. PAJAK PENGHASILAN PASAL 21 YANG DIPOTONG</div>
                    <div className="overflow-x-auto border border-[#DCE2EC] rounded-[4px]">
                      <table className="w-full text-[11px] border-collapse">
                        <thead>
                          <tr className="bg-[#F8FAFC] border-b border-[#DCE2EC] text-slate-700 font-bold">
                            <th className="px-3 py-2 w-12 text-center">NO.</th>
                            <th className="px-3 py-2 text-left">URAIAN</th>
                            <th className="px-3 py-2 w-32 text-center">KAP-KJS</th>
                            <th className="px-3 py-2 w-48 text-right">JUMLAH (Rp)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#EEF2F6]">
                          <tr>
                            <td className="px-3 py-1.5 text-center">1.</td>
                            <td className="px-3 py-1.5">PPh PASAL 21 YANG DIPOTONG</td>
                            <td className="px-3 py-1.5 text-center font-mono-num">411121-100</td>
                            <td className="px-2 py-1">{renderNumBox(payload.totalTaxWithheld, true)}</td>
                          </tr>
                          <tr>
                            <td className="px-3 py-1.5 text-center">2.</td>
                            <td className="px-3 py-1.5">KELEBIHAN PENYETORAN PPh PASAL 21 DARI MASA PAJAK SEBELUMNYA</td>
                            <td className="px-3 py-1.5 text-center">-</td>
                            <td className="px-2 py-1">
                              <input
                                type="number"
                                disabled={isReadOnly}
                                value={payload.lebihBayarKompensasi || 0}
                                onChange={(e) =>
                                  setPayload({ ...payload, lebihBayarKompensasi: Number(e.target.value) || 0 })
                                }
                                className="w-full bg-white border border-[#CBD5E1] rounded-[3px] px-2.5 py-1 text-right font-mono-num"
                              />
                            </td>
                          </tr>
                          <tr>
                            <td className="px-3 py-1.5 text-center">3.</td>
                            <td className="px-3 py-1.5">PEMBAYARAN PAJAK PENGHASILAN PASAL 21 DENGAN SP2D (INSTANSI PEMERINTAH)</td>
                            <td className="px-3 py-1.5 text-center">-</td>
                            <td className="px-2 py-1">{renderNumBox(0)}</td>
                          </tr>
                          <tr className="bg-[#FEF9E7]">
                            <td className="px-3 py-1.5 text-center font-bold">4.</td>
                            <td className="px-3 py-1.5 font-bold text-[#1E2C5E]">
                              PPh PASAL 21 YANG KURANG / (LEBIH) DISETOR (1 - 2 - 3)
                            </td>
                            <td className="px-3 py-1.5 text-center font-mono-num">411121-100</td>
                            <td className="px-2 py-1">{renderNumBox(kurangLebih, true)}</td>
                          </tr>
                          <tr>
                            <td className="px-3 py-1.5 text-center">5.</td>
                            <td className="px-3 py-1.5">PPh PASAL 21 YANG KURANG / (LEBIH) DISETOR PADA SPT YANG DIBETULKAN</td>
                            <td className="px-3 py-1.5 text-center">-</td>
                            <td className="px-2 py-1">{renderNumBox(0)}</td>
                          </tr>
                          <tr>
                            <td className="px-3 py-1.5 text-center">6.</td>
                            <td className="px-3 py-1.5">PPh PASAL 21 YANG KURANG / (LEBIH) DISETOR KARENA PEMBETULAN (4 - 5)</td>
                            <td className="px-3 py-1.5 text-center">-</td>
                            <td className="px-2 py-1">{renderNumBox(0)}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div>
                    <div className="font-semibold text-[#1E293B] mb-2">II. PAJAK PENGHASILAN PASAL 21 YANG DITANGGUNG OLEH PEMERINTAH</div>
                    <div className="overflow-x-auto border border-[#DCE2EC] rounded-[4px]">
                      <table className="w-full text-[11px] border-collapse">
                        <tbody>
                          <tr>
                            <td className="px-3 py-1.5 w-12 text-center">1.</td>
                            <td className="px-3 py-1.5">PAJAK PENGHASILAN PASAL 21 DITANGGUNG PEMERINTAH</td>
                            <td className="px-3 py-1.5 w-32 text-center font-mono-num">411121-100</td>
                            <td className="px-2 py-1 w-48">{renderNumBox(0)}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* v C. PAJAK PENGHASILAN PASAL 26 */}
            <div className="border border-[#DCE2EC] rounded-[5px] overflow-hidden">
              <button
                type="button"
                onClick={() => toggleSec('c26')}
                className="w-full px-4 py-2 bg-[#F8FAFC] border-b border-[#E2E8F0] flex items-center gap-2 font-semibold text-[#1E293B] cursor-pointer"
              >
                {collapsed.c26 ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                <span>C. PAJAK PENGHASILAN PASAL 26</span>
              </button>
              {!collapsed.c26 && (
                <div className="p-4 space-y-4">
                  <div>
                    <div className="font-semibold text-[#1E293B] mb-2">I. PAJAK PENGHASILAN PASAL 26 YANG DIPOTONG</div>
                    <div className="overflow-x-auto border border-[#DCE2EC] rounded-[4px]">
                      <table className="w-full text-[11px] border-collapse">
                        <thead>
                          <tr className="bg-[#F8FAFC] border-b border-[#DCE2EC] text-slate-700 font-bold">
                            <th className="px-3 py-2 w-12 text-center">NO.</th>
                            <th className="px-3 py-2 text-left">URAIAN</th>
                            <th className="px-3 py-2 w-32 text-center">KAP-KJS</th>
                            <th className="px-3 py-2 w-48 text-right">JUMLAH (Rp)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#EEF2F6]">
                          <tr>
                            <td className="px-3 py-1.5 text-center">1.</td>
                            <td className="px-3 py-1.5">PPh PASAL 26 YANG DIPOTONG</td>
                            <td className="px-3 py-1.5 text-center font-mono-num">411127-100</td>
                            <td className="px-2 py-1">{renderNumBox(0)}</td>
                          </tr>
                          <tr>
                            <td className="px-3 py-1.5 text-center">2.</td>
                            <td className="px-3 py-1.5">KELEBIHAN PENYETORAN PPh PASAL 26 DARI MASA PAJAK SEBELUMNYA</td>
                            <td className="px-3 py-1.5 text-center">-</td>
                            <td className="px-2 py-1">{renderNumBox(0)}</td>
                          </tr>
                          <tr>
                            <td className="px-3 py-1.5 text-center">3.</td>
                            <td className="px-3 py-1.5">PEMBAYARAN PPh PASAL 26 DENGAN SP2D (INSTANSI PEMERINTAH)</td>
                            <td className="px-3 py-1.5 text-center">-</td>
                            <td className="px-2 py-1">{renderNumBox(0)}</td>
                          </tr>
                          <tr className="bg-[#FEF9E7]">
                            <td className="px-3 py-1.5 text-center font-bold">4.</td>
                            <td className="px-3 py-1.5 font-bold text-[#1E2C5E]">
                              PPh PASAL 26 YANG KURANG / (LEBIH) DISETOR (1 - 2 - 3)
                            </td>
                            <td className="px-3 py-1.5 text-center font-mono-num">411127-100</td>
                            <td className="px-2 py-1">{renderNumBox(0, true)}</td>
                          </tr>
                          <tr>
                            <td className="px-3 py-1.5 text-center">5.</td>
                            <td className="px-3 py-1.5">PPh PASAL 26 YANG KURANG / (LEBIH) DISETOR PADA SPT YANG DIBETULKAN</td>
                            <td className="px-3 py-1.5 text-center">-</td>
                            <td className="px-2 py-1">{renderNumBox(0)}</td>
                          </tr>
                          <tr>
                            <td className="px-3 py-1.5 text-center">6.</td>
                            <td className="px-3 py-1.5">PPh PASAL 26 YANG KURANG / (LEBIH) DISETOR KARENA PEMBETULAN (4 - 5)</td>
                            <td className="px-3 py-1.5 text-center">-</td>
                            <td className="px-2 py-1">{renderNumBox(0)}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div>
                    <div className="font-semibold text-[#1E293B] mb-2">II. PAJAK PENGHASILAN PASAL 26 YANG DITANGGUNG OLEH PEMERINTAH</div>
                    <div className="overflow-x-auto border border-[#DCE2EC] rounded-[4px]">
                      <table className="w-full text-[11px] border-collapse">
                        <tbody>
                          <tr>
                            <td className="px-3 py-1.5 w-12 text-center">1.</td>
                            <td className="px-3 py-1.5">PAJAK PENGHASILAN PASAL 26 DITANGGUNG PEMERINTAH</td>
                            <td className="px-3 py-1.5 w-32 text-center font-mono-num">411127-100</td>
                            <td className="px-2 py-1 w-48">{renderNumBox(0)}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {isPph21 && pph21Tab === 'l1a' && (
          <div className="space-y-3">
            <h2 className="font-display font-medium text-[14px] text-[#1E293B] uppercase leading-snug">
              DAFTAR PEMOTONGAN BULANAN PAJAK PENGHASILAN PASAL 21 BAGI PEGAWAI TETAP DAN PENSIUNAN YANG MENERIMA UANG TERKAIT PENSIUN SECARA BERKALA SERTA BAGI PEGAWAI NEGERI SIPIL, ANGGOTA TENTARA NASIONAL INDONESIA, ANGGOTA KEPOLISIAN REPUBLIK INDONESIA, PEJABAT NEGARA, DAN PENSIUNANNYA
            </h2>
            <div className="border border-[#DCE2EC] rounded-[5px] overflow-hidden">
              <div className="px-4 py-2 bg-[#F8FAFC] border-b border-[#E2E8F0] font-semibold text-[#1E293B] flex items-center gap-2">
                <span>HEADER</span>
              </div>
              <div className="p-4 space-y-2 max-w-3xl">
                <div className="grid grid-cols-12 items-center gap-2">
                  <span className="col-span-3 text-slate-600">Nomor Identitas WP</span>
                  <input readOnly value={activeTaxpayer.nikNpwp} className="col-span-9 bg-[#EDF1F7] border border-[#DCE2EC] rounded-[3px] px-2.5 py-1 font-mono-num" />
                </div>
                <div className="grid grid-cols-12 items-center gap-2">
                  <span className="col-span-3 text-slate-600">MASA PAJAK (MM-YYYY)</span>
                  <input readOnly value={periodCode} className="col-span-9 bg-[#EDF1F7] border border-[#DCE2EC] rounded-[3px] px-2.5 py-1 font-mono-num" />
                </div>
              </div>
            </div>
            <div className="border border-[#DCE2EC] rounded-[5px] overflow-hidden">
              <div className="px-4 py-2 bg-[#F8FAFC] border-b border-[#E2E8F0] font-semibold text-[#1E293B] flex items-center gap-2">
                <span>LIST-IA</span>
              </div>
              <div className="p-4">
                {renderSlipTable(bpmpSlips, `SPT_PPh21_L1A_${periodCode}`, false, true)}
              </div>
            </div>
          </div>
        )}

        {isPph21 && pph21Tab === 'l1b' && (
          <div className="space-y-3">
            <h2 className="font-display font-medium text-[14px] text-[#1E293B] uppercase leading-snug">
              DAFTAR PEMOTONGAN PAJAK PENGHASILAN PASAL 21 BAGI PEGAWAI TETAP DAN PENSIUNAN YANG MENERIMA UANG TERKAIT PENSIUN SECARA BERKALA SERTA BAGI PEGAWAI NEGERI SIPIL, ANGGOTA TENTARA NASIONAL INDONESIA, ANGGOTA KEPOLISIAN REPUBLIK INDONESIA, PEJABAT NEGARA, DAN PENSIUNANNYA UNTUK MASA PAJAK TERAKHIR
            </h2>
            <div className="border border-[#DCE2EC] rounded-[5px] overflow-hidden">
              <div className="px-4 py-2 bg-[#F8FAFC] border-b border-[#E2E8F0] font-semibold text-[#1E293B] flex items-center gap-2">
                <span>HEADER</span>
              </div>
              <div className="p-4 space-y-2 max-w-3xl">
                <div className="grid grid-cols-12 items-center gap-2">
                  <span className="col-span-3 text-slate-600">Nomor Identitas WP</span>
                  <input readOnly value={activeTaxpayer.nikNpwp} className="col-span-9 bg-[#EDF1F7] border border-[#DCE2EC] rounded-[3px] px-2.5 py-1 font-mono-num" />
                </div>
                <div className="grid grid-cols-12 items-center gap-2">
                  <span className="col-span-3 text-slate-600">MASA PAJAK (MM-YYYY)</span>
                  <input readOnly value={periodCode} className="col-span-9 bg-[#EDF1F7] border border-[#DCE2EC] rounded-[3px] px-2.5 py-1 font-mono-num" />
                </div>
              </div>
            </div>
            <div className="border border-[#DCE2EC] rounded-[5px] overflow-hidden">
              <div className="px-4 py-2 bg-[#F8FAFC] border-b border-[#E2E8F0] font-semibold text-[#1E293B] flex items-center gap-2">
                <span>LIST-IB</span>
              </div>
              <div className="p-4 space-y-4">
                <div className="font-semibold text-[#1E293B]">BPA1</div>
                {renderSlipTable(bpa1Slips, `SPT_PPh21_L1B_BPA1_${periodCode}`, false, true)}
                <div className="font-semibold text-[#1E293B] pt-2">BPA2</div>
                {renderSlipTable([], `SPT_PPh21_L1B_BPA2_${periodCode}`, false, true)}
              </div>
            </div>
          </div>
        )}

        {isPph21 && pph21Tab === 'l2' && (
          <div className="space-y-3">
            <h2 className="font-display font-medium text-[14px] text-[#1E293B] uppercase leading-snug">
              DAFTAR PEMOTONGAN SATU TAHUN PAJAK ATAU BAGIAN TAHUN PAJAK PAJAK PENGHASILAN PASAL 21 BAGI PEGAWAI TETAP DAN PENSIUNAN YANG MENERIMA UANG TERKAIT PENSIUN SECARA BERKALA SERTA BAGI PEGAWAI NEGERI SIPIL, ANGGOTA TENTARA NASIONAL INDONESIA, ANGGOTA KEPOLISIAN REPUBLIK INDONESIA, PEJABAT NEGARA, DAN PENSIUNANNYA
            </h2>
            <div className="border border-[#DCE2EC] rounded-[5px] overflow-hidden">
              <div className="px-4 py-2 bg-[#F8FAFC] border-b border-[#E2E8F0] font-semibold text-[#1E293B] flex items-center gap-2">
                <span>HEADER</span>
              </div>
              <div className="p-4 space-y-2 max-w-3xl">
                <div className="grid grid-cols-12 items-center gap-2">
                  <span className="col-span-3 text-slate-600">Nomor Identitas WP</span>
                  <input readOnly value={activeTaxpayer.nikNpwp} className="col-span-9 bg-[#EDF1F7] border border-[#DCE2EC] rounded-[3px] px-2.5 py-1 font-mono-num" />
                </div>
                <div className="grid grid-cols-12 items-center gap-2">
                  <span className="col-span-3 text-slate-600">MASA PAJAK (MM-YYYY)</span>
                  <input readOnly value={periodCode} className="col-span-9 bg-[#EDF1F7] border border-[#DCE2EC] rounded-[3px] px-2.5 py-1 font-mono-num" />
                </div>
              </div>
            </div>
            <div className="border border-[#DCE2EC] rounded-[5px] overflow-hidden">
              <div className="px-4 py-2 bg-[#F8FAFC] border-b border-[#E2E8F0] font-semibold text-[#1E293B] flex items-center gap-2">
                <span>LIST-II</span>
              </div>
              <div className="p-4 space-y-4">
                <div className="font-semibold text-[#1E293B]">BPA1</div>
                {renderSlipTable(bpa1Slips, `SPT_PPh21_LII_BPA1_${periodCode}`, true, true)}
                <div className="font-semibold text-[#1E293B] pt-2">BPA2</div>
                {renderSlipTable([], `SPT_PPh21_LII_BPA2_${periodCode}`, true, true)}
              </div>
            </div>
          </div>
        )}

        {isPph21 && pph21Tab === 'l3' && (
          <div className="space-y-3">
            <h2 className="font-display font-medium text-[14px] text-[#1E293B] uppercase leading-snug">
              DAFTAR PEMOTONGAN PAJAK PENGHASILAN PASAL 21 DAN/ATAU PASAL 26 SELAIN PEGAWAI TETAP ATAU PENSIUNAN YANG MENERIMA UANG TERKAIT PENSIUN SECARA BERKALA
            </h2>
            <div className="border border-[#DCE2EC] rounded-[5px] overflow-hidden">
              <div className="px-4 py-2 bg-[#F8FAFC] border-b border-[#E2E8F0] font-semibold text-[#1E293B] flex items-center gap-2">
                <span>HEADER</span>
              </div>
              <div className="p-4 space-y-2 max-w-3xl">
                <div className="grid grid-cols-12 items-center gap-2">
                  <span className="col-span-3 text-slate-600">Nomor Identitas WP</span>
                  <input readOnly value={activeTaxpayer.nikNpwp} className="col-span-9 bg-[#EDF1F7] border border-[#DCE2EC] rounded-[3px] px-2.5 py-1 font-mono-num" />
                </div>
                <div className="grid grid-cols-12 items-center gap-2">
                  <span className="col-span-3 text-slate-600">MASA PAJAK (MM-YYYY)</span>
                  <input readOnly value={periodCode} className="col-span-9 bg-[#EDF1F7] border border-[#DCE2EC] rounded-[3px] px-2.5 py-1 font-mono-num" />
                </div>
              </div>
            </div>
            <div className="border border-[#DCE2EC] rounded-[5px] overflow-hidden">
              <div className="px-4 py-2 bg-[#F8FAFC] border-b border-[#E2E8F0] font-semibold text-[#1E293B] flex items-center gap-2">
                <span>LIST-III</span>
              </div>
              <div className="p-4 space-y-4">
                <div className="font-semibold text-[#1E293B]">BP21</div>
                {renderSlipTable(bp21Slips, `SPT_PPh21_LIII_BP21_${periodCode}`)}
                <div className="font-semibold text-[#1E293B] pt-2">BP26</div>
                {renderSlipTable([], `SPT_PPh21_LIII_BP26_${periodCode}`)}
              </div>
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* PART B: SPT MASA PPh UNIFIKASI VIEWS                              */}
        {/* ================================================================= */}
        {!isPph21 && uniTab === 'induk' && (
          <div className="space-y-3.5">
            {/* v A. IDENTITAS PEMOTONG */}
            <div className="border border-[#DCE2EC] rounded-[5px] overflow-hidden">
              <button
                type="button"
                onClick={() => toggleSec('uniId')}
                className="w-full px-4 py-2 bg-[#F8FAFC] border-b border-[#E2E8F0] flex items-center gap-2 font-semibold text-[#1E293B] cursor-pointer"
              >
                {collapsed.uniId ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                <span>A. IDENTITAS PEMOTONG</span>
              </button>
              {!collapsed.uniId && (
                <div className="p-4 space-y-2 max-w-2xl">
                  {[
                    ['Masa Pajak', `${monthLabel} ${taxReturn.taxYear}`],
                    ['Status Penyampaian', taxReturn.status],
                    ['NPWP', activeTaxpayer.nikNpwp],
                    ['Nama Lengkap', activeTaxpayer.name],
                    ['Alamat', activeTaxpayer.address],
                    ['Nomor Telepon', activeTaxpayer.phone || '0215250208'],
                  ].map(([lbl, val]) => (
                    <div key={lbl} className="grid grid-cols-12 items-center gap-2">
                      <span className="col-span-4 text-slate-600">{lbl}</span>
                      <input readOnly value={val} className="col-span-8 bg-[#EDF1F7] border border-[#DCE2EC] rounded-[3px] px-2.5 py-1 text-slate-700" />
                    </div>
                  ))}
                  {!isReadOnly && (
                    <div className="pt-2 flex items-center gap-3">
                      <button
                        type="button"
                        onClick={handlePosting}
                        className="px-4 py-1.5 rounded-[4px] bg-[#1E2C5E] hover:bg-[#16224A] text-white font-semibold cursor-pointer"
                      >
                        Posting SPT
                      </button>
                      <span className="text-[11px] text-slate-500">
                        {payload.slipCount > 0
                          ? `${payload.slipCount} Bukti Potong BPPU tersinkronisasi`
                          : 'Tarik data Bukti Potong BPPU dari e-Bupot'}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* v B. PAJAK PENGHASILAN (Exact Coretax Unifikasi Grouping Table) */}
            <div className="border border-[#DCE2EC] rounded-[5px] overflow-hidden">
              <button
                type="button"
                onClick={() => toggleSec('uniTax')}
                className="w-full px-4 py-2 bg-[#F8FAFC] border-b border-[#E2E8F0] flex items-center gap-2 font-semibold text-[#1E293B] cursor-pointer"
              >
                {collapsed.uniTax ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                <span>B. PAJAK PENGHASILAN</span>
              </button>
              {!collapsed.uniTax && (
                <div className="overflow-x-auto">
                  <table className="w-full text-[11px] border-collapse">
                    <thead>
                      <tr className="bg-[#F8FAFC] border-b border-[#DCE2EC] text-slate-700 font-bold">
                        <th className="px-3 py-2 text-center w-10">NO</th>
                        <th className="px-3 py-2 text-left min-w-[180px]">DETAIL</th>
                        <th className="px-3 py-2 text-right">SETOR SENDIRI</th>
                        <th className="px-3 py-2 text-right">PEMOTONGAN / PEMUNGUTAN</th>
                        <th className="px-3 py-2 text-right">PPh DITANGGUNG PEMERINTAH</th>
                        <th className="px-3 py-2 text-right">JUMLAH PPh DIBAYAR</th>
                        <th className="px-3 py-2 text-right">PPh SPT DIBETULKAN</th>
                        <th className="px-3 py-2 text-right">KURANG/(LEBIH) BAYAR PEMBETULAN</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#EEF2F6]">
                      {[
                        { no: '1', label: 'Pasal 4 Ayat 2', codes: ['KJS 411128-100', 'KJS 411128-402', 'KJS 411128-403'], amount: 0, activeCode: '' },
                        { no: '2', label: 'Pasal 15', codes: ['KJS 411128-600', 'KJS 411129-600'], amount: 0, activeCode: '' },
                        { no: '3', label: 'Pasal 22', codes: ['KJS 411122-100', 'KJS 411122-900', 'KJS 411122-910'], amount: 0, activeCode: '' },
                        { no: '4', label: 'Pasal 23', codes: ['KJS 411124-100'], amount: payload.totalTaxWithheld, activeCode: 'KJS 411124-100' },
                        { no: '5', label: 'Pasal 26', codes: ['KJS 411127-110'], amount: 0, activeCode: '' },
                      ].map((group) => (
                        <React.Fragment key={group.no}>
                          <tr className={group.amount > 0 ? 'bg-[#FEF9E7]/60 font-semibold' : 'bg-[#FAFBFD] font-semibold'}>
                            <td className="px-3 py-1.5 text-center">{group.no}</td>
                            <td className="px-3 py-1.5 text-[#1E2C5E] flex items-center gap-1.5">
                              <span className="text-[10px] text-slate-500">v</span>
                              <span>{group.label}</span>
                            </td>
                            <td className="px-3 py-1.5 text-right font-mono-num">0</td>
                            <td className="px-3 py-1.5 text-right font-mono-num font-bold text-[#1E2C5E]">
                              {group.amount.toLocaleString('id-ID')}
                            </td>
                            <td className="px-3 py-1.5 text-right font-mono-num">0</td>
                            <td className="px-3 py-1.5 text-right font-mono-num font-bold text-[#1E2C5E]">
                              {group.amount.toLocaleString('id-ID')}
                            </td>
                            <td className="px-3 py-1.5 text-right font-mono-num">0</td>
                            <td className="px-3 py-1.5 text-right font-mono-num">0</td>
                          </tr>
                          {group.codes.map((code) => {
                            const codeAmt = group.activeCode === code ? group.amount : 0;
                            return (
                              <tr key={code} className="text-slate-600">
                                <td />
                                <td className="px-8 py-1 font-mono-num text-[10.5px]">{code}</td>
                                <td className="px-3 py-1 text-right font-mono-num">0</td>
                                <td className="px-3 py-1 text-right font-mono-num">
                                  {codeAmt.toLocaleString('id-ID')}
                                </td>
                                <td className="px-3 py-1 text-right font-mono-num">0</td>
                                <td className="px-3 py-1 text-right font-mono-num">
                                  {codeAmt.toLocaleString('id-ID')}
                                </td>
                                <td className="px-3 py-1 text-right font-mono-num">0</td>
                                <td className="px-3 py-1 text-right font-mono-num">0</td>
                              </tr>
                            );
                          })}
                        </React.Fragment>
                      ))}
                      <tr className="bg-[#FEF9E7] font-extrabold border-t-2 border-[#F6C324]">
                        <td />
                        <td className="px-3 py-2 text-[#1E2C5E]">TOTAL OF INCOME TAX</td>
                        <td className="px-3 py-2 text-right font-mono-num">0</td>
                        <td className="px-3 py-2 text-right font-mono-num text-[#1E2C5E]">
                          {payload.totalTaxWithheld.toLocaleString('id-ID')}
                        </td>
                        <td className="px-3 py-2 text-right font-mono-num">0</td>
                        <td className="px-3 py-2 text-right font-mono-num text-[#1E2C5E]">
                          {kurangLebih.toLocaleString('id-ID')}
                        </td>
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

        {!isPph21 && uniTab === 'daftar1' && (
          <div className="space-y-4">
            <h2 className="font-display font-medium text-[14px] text-[#1E293B] uppercase">
              DAFTAR BUKTI PEMOTONGAN DAN/ATAU PEMUNGUTAN PPh UNIFIKASI BERFORMAT STANDAR
            </h2>
            <div className="border border-[#DCE2EC] rounded-[5px] overflow-hidden">
              <div className="px-4 py-2 bg-[#F8FAFC] border-b border-[#E2E8F0] font-semibold text-[#1E293B] flex items-center gap-2">
                <ChevronDown className="w-3.5 h-3.5" />
                <span>HEADER</span>
              </div>
              <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl">
                <div className="grid grid-cols-12 items-center gap-2">
                  <span className="col-span-5 text-slate-600">NPWP</span>
                  <input readOnly value={activeTaxpayer.nikNpwp} className="col-span-7 bg-[#EDF1F7] border border-[#DCE2EC] rounded-[3px] px-2.5 py-1 font-mono-num" />
                </div>
                <div className="grid grid-cols-12 items-center gap-2">
                  <span className="col-span-5 text-slate-600">Masa Pajak</span>
                  <input readOnly value={`${monthLabel} ${taxReturn.taxYear}`} className="col-span-7 bg-[#EDF1F7] border border-[#DCE2EC] rounded-[3px] px-2.5 py-1" />
                </div>
              </div>
            </div>
            <div className="border border-[#DCE2EC] rounded-[5px] overflow-hidden">
              <div className="px-4 py-2 bg-[#F8FAFC] border-b border-[#E2E8F0] font-semibold text-[#1E293B] flex items-center gap-2">
                <ChevronDown className="w-3.5 h-3.5" />
                <span>DAFTAR-I</span>
              </div>
              <div className="p-4 space-y-4">
                <div className="font-semibold text-slate-700">TABEL I. BPPU (PPh Pasal 23 / 4(2) / 15 / 22)</div>
                {renderSlipTable(matchingSlips, `SPT_Unifikasi_Daftar1_BPPU_${periodCode}`)}
                <div className="font-semibold text-slate-700 pt-2">TABEL II. BPNR (PPh Pasal 26 / 4(2))</div>
                {renderSlipTable([], `SPT_Unifikasi_Daftar1_BPNR_${periodCode}`)}

                {/* Keterangan Jumlah di Daftar 1 (Sesuai Gambar 2 Coretax) */}
                <div className="bg-[#FAFBFD] border border-[#E2E8F0] rounded-[4px] p-4 space-y-2 text-[11px] mt-4">
                  <div className="flex justify-between items-center text-slate-700">
                    <span className="font-semibold text-slate-600">
                      JUMLAH PAJAK PENGHASILAN DITANGGUNG PEMERINTAH DENGAN MENGGUNAKAN METODE PEMBAYARAN LANGSUNG
                    </span>
                    <span className="font-mono-num font-bold">0</span>
                  </div>
                  <div className="flex justify-between items-center text-slate-700">
                    <span className="font-semibold text-slate-600">
                      JUMLAH PAJAK PENGHASILAN DITANGGUNG PEMERINTAH
                    </span>
                    <span className="font-mono-num font-bold">0</span>
                  </div>
                  <div className="flex justify-between items-center text-slate-700">
                    <span className="font-semibold text-slate-600">
                      JUMLAH PAJAK PENGHASILAN DIBAYAR DENGAN MENGGUNAKAN METODE PEMBAYARAN LANGSUNG
                    </span>
                    <span className="font-mono-num font-bold">0</span>
                  </div>
                  <div className="flex justify-between items-center text-[#1E2C5E] border-b-2 border-[#F6C324] pb-1.5 pt-1">
                    <span className="font-bold">
                      JUMLAH PAJAK PENGHASILAN YANG HARUS DIBAYAR
                    </span>
                    <span className="font-mono-num font-bold text-[12px]">
                      {payload.totalTaxWithheld.toLocaleString('id-ID')}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {!isPph21 && uniTab === 'daftar2' && (
          <div className="space-y-4">
            <h2 className="font-display font-medium text-[14px] text-[#1E293B] uppercase">
              DAFTAR PPh YANG DIBAYAR SENDIRI DAN/ATAU DISETOR SECARA DIGUNGGUNG
            </h2>
            <div className="border border-[#DCE2EC] rounded-[5px] overflow-hidden">
              <div className="px-4 py-2 bg-[#F8FAFC] border-b border-[#E2E8F0] font-semibold text-[#1E293B] flex items-center gap-2">
                <ChevronDown className="w-3.5 h-3.5" />
                <span>HEADER</span>
              </div>
              <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl">
                <div className="grid grid-cols-12 items-center gap-2">
                  <span className="col-span-5 text-slate-600">NPWP</span>
                  <input readOnly value={activeTaxpayer.nikNpwp} className="col-span-7 bg-[#EDF1F7] border border-[#DCE2EC] rounded-[3px] px-2.5 py-1 font-mono-num" />
                </div>
                <div className="grid grid-cols-12 items-center gap-2">
                  <span className="col-span-5 text-slate-600">Masa Pajak</span>
                  <input readOnly value={`${monthLabel} ${taxReturn.taxYear}`} className="col-span-7 bg-[#EDF1F7] border border-[#DCE2EC] rounded-[3px] px-2.5 py-1" />
                </div>
              </div>
            </div>
            <div className="border border-[#DCE2EC] rounded-[5px] overflow-hidden">
              <div className="px-4 py-2 bg-[#F8FAFC] border-b border-[#E2E8F0] font-semibold text-[#1E293B] flex items-center gap-2">
                <ChevronDown className="w-3.5 h-3.5" />
                <span>DAFTAR-II</span>
              </div>
              <div className="p-4 space-y-4">
                <div className="font-semibold text-slate-700">TABEL I. DAFTAR PPh YANG DIBAYAR SENDIRI DAN/ATAU DISETOR SENDIRI</div>
                {renderSlipTable([], `SPT_Unifikasi_Daftar2_T1_${periodCode}`)}

                {/* Keterangan Jumlah di Daftar 2 - Tabel 1 (Sesuai Gambar 3 Coretax) */}
                <div className="bg-[#FAFBFD] border border-[#E2E8F0] rounded-[4px] p-4 space-y-2 text-[11px] mt-2">
                  <div className="flex justify-between items-center text-slate-700">
                    <span className="font-semibold text-slate-600">JUMLAH PPh YANG DITANGGUNG PEMERINTAH</span>
                    <span className="font-mono-num font-bold">0</span>
                  </div>
                  <div className="flex justify-between items-center text-[#1E2C5E] border-b border-[#E2E8F0] pb-1">
                    <span className="font-bold">JUMLAH PPh YANG HARUS DIBAYAR</span>
                    <span className="font-mono-num font-bold">0</span>
                  </div>
                </div>

                <div className="font-semibold text-slate-700 pt-4">TABEL II. DAFTAR PAJAK PENGHASILAN - PEMBAYARAN KUMULATIF</div>
                {renderSlipTable([], `SPT_Unifikasi_Daftar2_T2_${periodCode}`)}

                {/* Keterangan Jumlah di Daftar 2 - Tabel 2 (Sesuai Gambar 3 Coretax) */}
                <div className="bg-[#FAFBFD] border border-[#E2E8F0] rounded-[4px] p-4 space-y-2 text-[11px] mt-2">
                  <div className="flex justify-between items-center text-[#1E2C5E] border-b border-[#E2E8F0] pb-1">
                    <span className="font-bold">JUMLAH PPh YANG HARUS DIBAYAR</span>
                    <span className="font-mono-num font-bold">0</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {!isPph21 && uniTab === 'lampiran1' && (
          <div className="space-y-4">
            <h2 className="font-display font-medium text-[14px] text-[#1E293B] uppercase">
              DAFTAR DOKUMEN YANG DIPERSAMAKAN DENGAN BUKTI PEMOTONGAN DAN/ATAU PEMUNGUTAN PPh UNIFIKASI BERFORMAT STANDAR
            </h2>
            <div className="border border-[#DCE2EC] rounded-[5px] overflow-hidden">
              <div className="px-4 py-2 bg-[#F8FAFC] border-b border-[#E2E8F0] font-semibold text-[#1E293B] flex items-center gap-2">
                <ChevronDown className="w-3.5 h-3.5" />
                <span>HEADER</span>
              </div>
              <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl">
                <div className="grid grid-cols-12 items-center gap-2">
                  <span className="col-span-5 text-slate-600">NPWP</span>
                  <input readOnly value={activeTaxpayer.nikNpwp} className="col-span-7 bg-[#EDF1F7] border border-[#DCE2EC] rounded-[3px] px-2.5 py-1 font-mono-num" />
                </div>
                <div className="grid grid-cols-12 items-center gap-2">
                  <span className="col-span-5 text-slate-600">Masa Pajak</span>
                  <input readOnly value={`${monthLabel} ${taxReturn.taxYear}`} className="col-span-7 bg-[#EDF1F7] border border-[#DCE2EC] rounded-[3px] px-2.5 py-1" />
                </div>
              </div>
            </div>
            <div className="border border-[#DCE2EC] rounded-[5px] overflow-hidden">
              <div className="px-4 py-2 bg-[#F8FAFC] border-b border-[#E2E8F0] font-semibold text-[#1E293B] flex items-center gap-2">
                <ChevronDown className="w-3.5 h-3.5" />
                <span>LAMPIRAN-I</span>
              </div>
              <div className="p-4 space-y-4">
                <div className="font-semibold text-slate-700">
                  TABEL I. ATC
                </div>
                {renderSlipTable([], `SPT_Unifikasi_Lampiran1_${periodCode}`)}

                {/* Keterangan Total di Lampiran I (Sesuai Gambar 4 Coretax) */}
                <div className="bg-[#FAFBFD] border border-[#E2E8F0] rounded-[4px] p-4 space-y-2 text-[11px] mt-2">
                  <div className="flex justify-between items-center text-[#1E2C5E] border-b-2 border-[#F6C324] pb-1.5">
                    <span className="font-bold">TOTAL INCOME TAX TO BE PAID</span>
                    <span className="font-mono-num font-bold text-[12px]">0</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Payment Method & Declaration Section (shown on Induk) */}
        {((isPph21 && pph21Tab === 'induk') || (!isPph21 && uniTab === 'induk')) && (
          <>
            {kurangLebih > 0 && !isReadOnly && (
              <div className="p-3.5 bg-[#F8FAFC] border border-[#DCE2EC] rounded-[5px] flex flex-wrap items-center gap-4">
                <span className="font-bold text-[#1E2C5E]">
                  Metode Pelunasan ({formatRp(kurangLebih)}):
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
                  <span>Buat Kode Billing ({isPph21 ? '411121-100' : '411124-104'})</span>
                </label>
              </div>
            )}

            <div className="border border-[#DCE2EC] rounded-[5px] p-4 space-y-2.5 bg-white">
              <div className="font-semibold text-[#1E293B]">
                {isPph21 ? 'D. PERNYATAAN DAN TANDA TANGAN' : 'C. PERNYATAAN DAN TANDA TANGAN'}
              </div>
              <label className="flex items-start gap-2 cursor-pointer text-[11px] text-slate-700">
                <input
                  type="checkbox"
                  disabled={isReadOnly}
                  checked={declarationOk}
                  onChange={(e) => setDeclarationOk(e.target.checked)}
                  className="mt-0.5 accent-[#1E2C5E]"
                />
                <span>
                  Saya menyatakan bahwa data pemotongan dan pelaporan SPT Masa yang disampaikan adalah benar, lengkap, dan jelas.
                </span>
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1 max-w-2xl text-[11px]">
                <div className="grid grid-cols-12 items-center gap-2">
                  <span className="col-span-4 text-slate-600">Penandatangan</span>
                  <div className="col-span-8 flex items-center gap-4">
                    <label className="inline-flex items-center gap-1.5 cursor-pointer">
                      <input type="radio" checked={signerType === 'WP'} onChange={() => setSignerType('WP')} />
                      <span>Wajib Pajak</span>
                    </label>
                    <label className="inline-flex items-center gap-1.5 cursor-pointer">
                      <input type="radio" checked={signerType === 'KUASA'} onChange={() => setSignerType('KUASA')} />
                      <span>Kuasa Wajib Pajak</span>
                    </label>
                  </div>
                </div>
                <div className="grid grid-cols-12 items-center gap-2">
                  <span className="col-span-4 text-slate-600">NPWP</span>
                  <input readOnly value={activeTaxpayer.nikNpwp} className="col-span-8 bg-[#EDF1F7] border border-[#DCE2EC] rounded-[3px] px-2.5 py-1 font-mono-num" />
                </div>
                <div className="grid grid-cols-12 items-center gap-2">
                  <span className="col-span-4 text-slate-600">{isPph21 ? 'Nama' : 'Nama Tanda Tangan'}</span>
                  <input readOnly value={activeTaxpayer.name} className="col-span-8 bg-[#EDF1F7] border border-[#DCE2EC] rounded-[3px] px-2.5 py-1" />
                </div>
                <div className="grid grid-cols-12 items-center gap-2">
                  <span className="col-span-4 text-slate-600">{isPph21 ? 'KODE QR' : 'Tanda Tangan'}</span>
                  <input readOnly value={taxReturn.status === 'SUBMITTED' ? 'TERSERTIFIKASI ELEKTRONIK DJP' : '-'} className="col-span-8 bg-[#EDF1F7] border border-[#DCE2EC] rounded-[3px] px-2.5 py-1 font-mono-num" />
                </div>
              </div>
            </div>
          </>
        )}

        {/* Footer Buttons */}
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
                disabled={!declarationOk}
                onClick={async () => {
                  await onSave(buildUpdated());
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
        description={`Total PPh terutang sebesar ${formatRp(kurangLebih)} akan diproses melalui ${
          kurangLebih > 0
            ? paymentMethod === 'DEPOSIT'
              ? 'Pemindahbukuan Deposit Pajak'
              : 'Pembuatan Kode Billing'
            : 'Pelaporan Nihil'
        }.`}
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
