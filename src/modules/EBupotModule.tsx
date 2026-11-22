import React, { useMemo, useState } from 'react';
import {
  AlertCircle,
  ArrowUpDown,
  ChevronDown,
  Download,
  Eye,
  FileCode2,
  Filter,
  Info,
  Layers,
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
import {
  CoretaxIconToolbar,
  CoretaxPagination,
  downloadCsvFile,
} from '../components/CoretaxTableChrome.tsx';

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

const SUBTAB_CONFIG: Record<
  string,
  {
    shortTitle: string;
    headingPrefix: string;
    createBtnLabel: string;
    slipType: SlipType;
  }
> = {
  bppu: {
    shortTitle: 'BPPU',
    headingPrefix: 'EBUPOT BPU',
    createBtnLabel: 'Create eBupot BPU',
    slipType: 'BPPU_23',
  },
  bpnr: {
    shortTitle: 'BPNR',
    headingPrefix: 'EBUPOT BPNR',
    createBtnLabel: 'Create eBupot BPNR',
    slipType: 'BPPU_23',
  },
  penyetoran_sendiri: {
    shortTitle: 'Penyetoran Sendiri',
    headingPrefix: 'EBUPOT PENYETORAN SENDIRI',
    createBtnLabel: 'Create Penyetoran Sendiri',
    slipType: 'BPPU_23',
  },
  digunggung: {
    shortTitle: 'Pemotongan Secara Digunggung',
    headingPrefix: 'EBUPOT DIGUNGGUNG',
    createBtnLabel: 'Create eBupot Digunggung',
    slipType: 'BPPU_23',
  },
  dokumen_dipersamakan: {
    shortTitle: 'Dokumen Dipersamakan',
    headingPrefix: 'DOKUMEN DIPERSAMAKAN',
    createBtnLabel: 'Create Dokumen Dipersamakan',
    slipType: 'BPPU_23',
  },
  bp21: {
    shortTitle: 'BP 21',
    headingPrefix: 'EBUPOT BP 21',
    createBtnLabel: 'Create eBupot BP 21',
    slipType: 'BP21',
  },
  bp26: {
    shortTitle: 'BP 26',
    headingPrefix: 'EBUPOT BP 26',
    createBtnLabel: 'Create eBupot BP 26',
    slipType: 'BP21',
  },
  bpa1: {
    shortTitle: 'BP A1',
    headingPrefix: 'EBUPOT BP A1',
    createBtnLabel: 'Create eBupot BP A1',
    slipType: 'BPA1',
  },
  bpa2: {
    shortTitle: 'BP A2',
    headingPrefix: 'EBUPOT BP A2',
    createBtnLabel: 'Create eBupot BP A2',
    slipType: 'BPA1',
  },
  bpmp: {
    shortTitle: 'BPMP',
    headingPrefix: 'EBUPOT BPMP',
    createBtnLabel: 'Create eBupot BPMP',
    slipType: 'BPMP',
  },
};

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
  const [statusView, setStatusView] = useState<'UNISSUED' | 'ISSUED' | 'INVALID'>('UNISSUED');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [signOpen, setSignOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [monitoringOpen, setMonitoringOpen] = useState(false);
  const [importMenuOpen, setImportMenuOpen] = useState(false);
  const [bulkMenuOpen, setBulkMenuOpen] = useState(false);

  // Bukti Potong Saya filters (matches image_1c836f06.png)
  const [mySlipTypeFilter, setMySlipTypeFilter] = useState<string>('ALL');
  const [myMonthFilter, setMyMonthFilter] = useState<string>('ALL');
  const [myYearFilter, setMyYearFilter] = useState<string>('2025');
  const [myNumFilter, setMyNumFilter] = useState('');
  const [myNpwpFilter, setMyNpwpFilter] = useState('');

  // Column inline filters for issuance tables (matches image_19fd99c0.png)
  const [showFilters, setShowFilters] = useState(true);
  const [numFilter, setNumFilter] = useState('');
  const [recipientFilter, setRecipientFilter] = useState('');
  const [objCodeFilter, setObjCodeFilter] = useState('');
  const [periodMonthFilter, setPeriodMonthFilter] = useState('ALL');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

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

  const activeConfig = SUBTAB_CONFIG[subTab] || SUBTAB_CONFIG.bppu;
  const currentSlipType: SlipType = activeConfig.slipType;

  // Slips for "Bukti Potong Saya" (issued slips relevant to active taxpayer)
  const mySlips = useMemo(() => {
    return workspace.slips.filter((s) => {
      if (s.status !== 'ISSUED') return false;
      const belongsToAccount =
        accountMode === 'INDIVIDUAL'
          ? s.recipientNikNpwp === workspace.individualTaxpayer.nikNpwp || s.slipType === 'BPA1'
          : s.issuerId === workspace.corporateTaxpayer.id ||
            s.recipientNikNpwp === workspace.corporateTaxpayer.nikNpwp;
      if (!belongsToAccount) return false;
      if (mySlipTypeFilter !== 'ALL' && s.slipType !== mySlipTypeFilter) return false;
      if (myMonthFilter !== 'ALL' && String(s.taxPeriodMonth) !== myMonthFilter) return false;
      if (myYearFilter.trim() && String(s.taxPeriodYear) !== myYearFilter.trim()) return false;
      if (myNumFilter.trim() && !s.slipNumber.toLowerCase().includes(myNumFilter.trim().toLowerCase()))
        return false;
      if (
        myNpwpFilter.trim() &&
        !s.issuerNpwp.toLowerCase().includes(myNpwpFilter.trim().toLowerCase()) &&
        !s.issuerName.toLowerCase().includes(myNpwpFilter.trim().toLowerCase())
      )
        return false;
      return true;
    });
  }, [
    workspace.slips,
    workspace.individualTaxpayer.nikNpwp,
    workspace.corporateTaxpayer.id,
    workspace.corporateTaxpayer.nikNpwp,
    accountMode,
    mySlipTypeFilter,
    myMonthFilter,
    myYearFilter,
    myNumFilter,
    myNpwpFilter,
  ]);

  // Slips for issuance tabs (Belum Terbit / Telah Terbit / Tidak Valid)
  const visibleSlips = useMemo(() => {
    if (statusView === 'INVALID') return [];
    return workspace.slips.filter((s) => {
      if (s.slipType !== currentSlipType || s.status !== statusView) return false;
      if (periodMonthFilter !== 'ALL' && String(s.taxPeriodMonth) !== periodMonthFilter) return false;
      if (numFilter.trim() && !s.slipNumber.toLowerCase().includes(numFilter.trim().toLowerCase()))
        return false;
      if (
        recipientFilter.trim() &&
        !s.recipientNikNpwp.toLowerCase().includes(recipientFilter.trim().toLowerCase()) &&
        !s.recipientName.toLowerCase().includes(recipientFilter.trim().toLowerCase())
      )
        return false;
      if (
        objCodeFilter.trim() &&
        !s.objectCode.toLowerCase().includes(objCodeFilter.trim().toLowerCase()) &&
        !s.objectName.toLowerCase().includes(objCodeFilter.trim().toLowerCase())
      )
        return false;
      return true;
    });
  }, [
    workspace.slips,
    currentSlipType,
    statusView,
    periodMonthFilter,
    numFilter,
    recipientFilter,
    objCodeFilter,
  ]);

  const paginatedSlips = visibleSlips.slice((page - 1) * pageSize, page * pageSize);
  const paginatedMySlips = mySlips.slice((page - 1) * pageSize, page * pageSize);

  const unissuedCount = workspace.slips.filter(
    (s) => s.slipType === currentSlipType && s.status === 'UNISSUED'
  ).length;
  const issuedCount = workspace.slips.filter(
    (s) => s.slipType === currentSlipType && s.status === 'ISSUED'
  ).length;

  // Live calculation preview for create modal (100% preserves Modul 3 TER / Psl 17 / PPh 23)
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

  const handleBulkDelete = async () => {
    for (const id of selectedIds) {
      await onDeleteSlip(id);
    }
    setSelectedIds([]);
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const toggleAllVisible = () => {
    if (selectedIds.length === paginatedSlips.length && paginatedSlips.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(paginatedSlips.map((s) => s.id));
    }
  };

  const statusHeadingSuffix =
    statusView === 'UNISSUED'
      ? 'NOT ISSUED'
      : statusView === 'ISSUED'
        ? 'ISSUED'
        : 'INVALID';

  return (
    <div className="space-y-4">
      {accountMode !== 'CORPORATE' && subTab !== 'bukti_potong_saya' && (
        <div className="bg-amber-50 border border-amber-300 text-amber-900 rounded-lg px-4 py-3 text-xs flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              Pembuatan &amp; penerbitan <strong>e-Bupot PPh 21 &amp; PPh 23</strong> dilakukan oleh Pemotong Pajak (Akun Perusahaan).
            </span>
          </div>
          <button
            type="button"
            onClick={() => onSwitchAccountMode('CORPORATE')}
            className="bg-[#1E2C5E] text-[#F4C430] font-bold px-3 py-1.5 rounded text-xs cursor-pointer"
          >
            Impersonate ke {workspace.corporateTaxpayer.name}
          </button>
        </div>
      )}

      {/* =================================================================== */}
      {/* VIEW A: BUKTI POTONG SAYA (EXACT MATCH TO image_1c836f06.png)       */}
      {/* =================================================================== */}
      {subTab === 'bukti_potong_saya' ? (
        <div className="space-y-4">
          <h1 className="font-display font-bold text-[20px] text-[#1E2C5E] text-center">
            Bukti Potong Saya
          </h1>

          {/* Official Coretax Filter Form Card */}
          <div className="bg-white border border-[#E2E8F0] rounded-[10px] p-5 space-y-3 text-xs">
            <div className="grid grid-cols-1 md:grid-cols-12 items-center gap-3">
              <label className="md:col-span-3 font-medium text-slate-700">
                Jenis Bukti Potong <span className="text-red-500">*</span>
              </label>
              <div className="md:col-span-6">
                <select
                  value={mySlipTypeFilter}
                  onChange={(e) => {
                    setMySlipTypeFilter(e.target.value);
                    setPage(1);
                  }}
                  className="w-full border border-[#CBD5E1] rounded-[6px] px-3 py-2 bg-white text-slate-800 focus:outline-none focus:border-[#1E2C5E]"
                >
                  <option value="ALL">Semua Jenis Bukti Potong (BPPU, BPMP, BP21, BPA1)</option>
                  <option value="BPPU_23">BPPU (PPh 23 Unifikasi)</option>
                  <option value="BPMP">BPMP (Bulanan Pegawai Tetap)</option>
                  <option value="BP21">BP 21 (Selain Pegawai Tetap)</option>
                  <option value="BPA1">BP A1 (Masa Pajak Terakhir / Tahunan)</option>
                </select>
              </div>
              <div className="md:col-span-3">
                <button
                  type="button"
                  onClick={() => setPage(1)}
                  className="bg-[#1E2C5E] hover:bg-[#16224A] text-white font-semibold px-5 py-2 rounded-[6px] transition cursor-pointer"
                >
                  Cari
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 items-center gap-3">
              <label className="md:col-span-3 font-medium text-slate-700">
                Masa Pajak <span className="text-red-500">*</span>
              </label>
              <div className="md:col-span-3">
                <select
                  value={myMonthFilter}
                  onChange={(e) => {
                    setMyMonthFilter(e.target.value);
                    setPage(1);
                  }}
                  className="w-full border border-[#CBD5E1] rounded-[6px] px-3 py-2 bg-white text-slate-800 focus:outline-none focus:border-[#1E2C5E]"
                >
                  <option value="ALL">Semua Masa</option>
                  {MONTHS_ID.map((m, idx) => (
                    <option key={m} value={String(idx + 1)}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 items-center gap-3">
              <label className="md:col-span-3 font-medium text-slate-700">
                Tahun Pajak <span className="text-red-500">*</span>
              </label>
              <div className="md:col-span-3">
                <input
                  type="text"
                  value={myYearFilter}
                  onChange={(e) => {
                    setMyYearFilter(e.target.value);
                    setPage(1);
                  }}
                  placeholder="2025"
                  className="w-full border border-[#CBD5E1] rounded-[6px] px-3 py-2 font-mono-num text-slate-800 focus:outline-none focus:border-[#1E2C5E]"
                />
              </div>
            </div>
          </div>

          {/* Icon Toolbar */}
          <CoretaxIconToolbar
            onRefresh={() => {
              setMySlipTypeFilter('ALL');
              setMyMonthFilter('ALL');
              setMyYearFilter('2025');
              setMyNumFilter('');
              setMyNpwpFilter('');
              setPage(1);
            }}
            onExportCsv={() =>
              downloadCsvFile(
                `Bukti_Potong_Saya_${activeTaxpayer.nikNpwp}.csv`,
                ['Masa Pajak', 'Nomor Pemotongan', 'Status', 'NPWP Pemotong', 'Nama Pemotong', 'Kode Objek', 'DPP', 'PPh Dipotong'],
                mySlips.map((s) => [
                  `${MONTHS_ID[Math.max(0, s.taxPeriodMonth - 1)]} ${s.taxPeriodYear}`,
                  s.slipNumber,
                  s.status,
                  s.issuerNpwp,
                  s.issuerName,
                  s.objectCode,
                  s.grossAmount,
                  s.taxWithheld,
                ])
              )
            }
            onExportExcel={() =>
              downloadCsvFile(
                `Bukti_Potong_Saya_${activeTaxpayer.nikNpwp}.csv`,
                ['Masa Pajak', 'Nomor Pemotongan', 'Status', 'NPWP Pemotong', 'Nama Pemotong', 'Kode Objek', 'DPP', 'PPh Dipotong'],
                mySlips.map((s) => [
                  `${MONTHS_ID[Math.max(0, s.taxPeriodMonth - 1)]} ${s.taxPeriodYear}`,
                  s.slipNumber,
                  s.status,
                  s.issuerNpwp,
                  s.issuerName,
                  s.objectCode,
                  s.grossAmount,
                  s.taxWithheld,
                ])
              )
            }
            onPrintPdf={() => window.print()}
            onToggleFilter={() => setShowFilters((p) => !p)}
            filterActive={showFilters}
          />

          {/* Official Golden-Yellow Coretax Table */}
          <div className="border border-[#E2E8F0] rounded-[8px] overflow-hidden bg-white">
            <div className="overflow-x-auto">
              <table className="w-full text-[11.5px] border-collapse">
                <thead>
                  <tr className="bg-[#FCD34D] text-[#1E293B] font-bold border-b border-[#EAB308]/40">
                    <th className="px-3 py-2.5 text-left whitespace-nowrap border-r border-white/50">Aksi</th>
                    <th className="px-3 py-2.5 text-left whitespace-nowrap border-r border-white/50">
                      <span className="inline-flex items-center gap-1">
                        Masa Pajak <ArrowUpDown className="w-3 h-3 opacity-60" />
                      </span>
                    </th>
                    <th className="px-3 py-2.5 text-left whitespace-nowrap border-r border-white/50">
                      <span className="inline-flex items-center gap-1">
                        Nomor Pemotongan <ArrowUpDown className="w-3 h-3 opacity-60" />
                      </span>
                    </th>
                    <th className="px-3 py-2.5 text-left whitespace-nowrap border-r border-white/50">Status</th>
                    <th className="px-3 py-2.5 text-left whitespace-nowrap border-r border-white/50">
                      <span className="inline-flex items-center gap-1">
                        NPWP Pemotong <ArrowUpDown className="w-3 h-3 opacity-60" />
                      </span>
                    </th>
                    <th className="px-3 py-2.5 text-left whitespace-nowrap border-r border-white/50">
                      Nama Pemotong
                    </th>
                    <th className="px-3 py-2.5 text-left whitespace-nowrap border-r border-white/50">
                      Kode Objek Pajak
                    </th>
                    <th className="px-3 py-2.5 text-left whitespace-nowrap border-r border-white/50">
                      Jenis Pajak
                    </th>
                    <th className="px-3 py-2.5 text-right whitespace-nowrap border-r border-white/50">
                      Dasar Pengenaan Pajak (Rp)
                    </th>
                    <th className="px-3 py-2.5 text-right whitespace-nowrap">
                      PPh Dipotong (Rp)
                    </th>
                  </tr>
                  {showFilters && (
                    <tr className="bg-white border-b border-[#E2E8F0]">
                      <th className="px-2 py-2 border-r border-slate-100" />
                      <th className="px-2 py-2 border-r border-slate-100" />
                      <th className="px-2 py-2 border-r border-slate-100">
                        <div className="flex items-center gap-1">
                          <input
                            type="text"
                            value={myNumFilter}
                            onChange={(e) => {
                              setMyNumFilter(e.target.value);
                              setPage(1);
                            }}
                            placeholder="Nomor..."
                            className="w-full min-w-[110px] border border-[#CBD5E1] rounded-[5px] px-2 py-1 text-[11px] font-normal"
                          />
                          <Filter className="w-3 h-3 text-slate-400 shrink-0" />
                        </div>
                      </th>
                      <th className="px-2 py-2 border-r border-slate-100" />
                      <th className="px-2 py-2 border-r border-slate-100">
                        <div className="flex items-center gap-1">
                          <input
                            type="text"
                            value={myNpwpFilter}
                            onChange={(e) => {
                              setMyNpwpFilter(e.target.value);
                              setPage(1);
                            }}
                            placeholder="NPWP/Nama..."
                            className="w-full min-w-[110px] border border-[#CBD5E1] rounded-[5px] px-2 py-1 text-[11px] font-normal"
                          />
                          <Filter className="w-3 h-3 text-slate-400 shrink-0" />
                        </div>
                      </th>
                      <th colSpan={5} className="px-2 py-2" />
                    </tr>
                  )}
                </thead>
                <tbody className="divide-y divide-[#EEF2F6]">
                  {paginatedMySlips.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="px-4 py-8 text-left text-slate-500">
                        Tidak ada data yang ditemukan.
                      </td>
                    </tr>
                  ) : (
                    paginatedMySlips.map((slip) => (
                      <tr key={slip.id} className="hover:bg-[#F8FAFC]">
                        <td className="px-3 py-2.5 whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => onPrintDocument({ type: 'BPA1', slip })}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-[6px] border border-[#CBD5E1] bg-white hover:bg-[#1E2C5E] hover:text-white text-[#1E2C5E] font-semibold text-[11px] transition cursor-pointer"
                          >
                            <Eye className="w-3 h-3" />
                            <span>Lihat</span>
                          </button>
                        </td>
                        <td className="px-3 py-2.5 whitespace-nowrap">
                          {MONTHS_ID[Math.max(0, slip.taxPeriodMonth - 1)]} {slip.taxPeriodYear}
                        </td>
                        <td className="px-3 py-2.5 font-mono-num font-bold text-[#1E2C5E] whitespace-nowrap">
                          {slip.slipNumber}
                        </td>
                        <td className="px-3 py-2.5 whitespace-nowrap">
                          <span className="px-2 py-0.5 rounded bg-emerald-50 border border-emerald-200 text-emerald-800 font-bold text-[10px]">
                            TERBIT
                          </span>
                        </td>
                        <td className="px-3 py-2.5 font-mono-num whitespace-nowrap">{slip.issuerNpwp}</td>
                        <td className="px-3 py-2.5 font-semibold whitespace-nowrap">{slip.issuerName}</td>
                        <td className="px-3 py-2.5 font-mono-num whitespace-nowrap">{slip.objectCode}</td>
                        <td className="px-3 py-2.5 whitespace-nowrap">{slip.slipType}</td>
                        <td className="px-3 py-2.5 text-right font-mono-num whitespace-nowrap">
                          {formatRp(slip.grossAmount)}
                        </td>
                        <td className="px-3 py-2.5 text-right font-mono-num font-bold text-[#1E2C5E] whitespace-nowrap">
                          {formatRp(slip.taxWithheld)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <CoretaxPagination
              totalItems={mySlips.length}
              page={page}
              pageSize={pageSize}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
            />
          </div>
        </div>
      ) : subTab === 'xml' ? (
        /* =================================================================== */
        /* VIEW B: IMPOR DATA XML MASSAL (MODUL 3)                             */
        /* =================================================================== */
        <div className="bg-white border border-[#E2E8F0] rounded-lg overflow-hidden">
          <div className="px-5 py-3.5 border-b border-[#E5EAF2] flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="font-display font-bold text-[17px] text-[#1E2C5E]">
                Impor Data Massal XML — eBupot
              </h1>
              <p className="text-xs text-slate-500">
                Impor berkas XML untuk bukti potong BPMP (PPh 21) &amp; BPPU (PPh 23) ke daftar Belum Terbit.
              </p>
            </div>
            <button
              type="button"
              onClick={handleDownloadXmlTemplate}
              className="inline-flex items-center gap-1.5 bg-[#1E2C5E] hover:bg-[#16224A] text-white font-semibold text-xs px-3.5 py-2 rounded-[7px] cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-[#F4C430]" />
              <span>Unduh Template XML</span>
            </button>
          </div>

          <div className="p-5 space-y-4 text-xs">
            <div className="bg-[#EFF6FF] border border-[#BFDBFE] text-[#1E3A8A] rounded-lg p-3.5 leading-relaxed">
              <strong>Impor Massal XML e-Bupot:</strong> Unduh template XML atau unggah/tempel kode XML bukti potong PPh 21 (<code>BPMP</code>) dan PPh 23 (<code>BPPU_23</code>). Data yang diimpor otomatis masuk ke tab <strong>Belum Terbit</strong> untuk ditandatangani secara massal.
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="font-bold text-[#1E2C5E] flex items-center gap-1.5">
                  <FileCode2 className="w-4 h-4" />
                  <span>Isi Berkas XML e-Bupot</span>
                </label>
                <label className="inline-flex items-center gap-1 text-[#1E2C5E] font-bold hover:underline cursor-pointer">
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
                className="w-full border border-[#CBD5E1] rounded-lg p-3 font-mono-num text-[11px] bg-slate-50 focus:bg-white focus:outline-none focus:border-[#1E2C5E]"
              />
            </div>

            {xmlStatus && (
              <div className="bg-emerald-50 border border-emerald-300 text-emerald-800 rounded-lg px-3.5 py-2.5 font-semibold">
                {xmlStatus}
              </div>
            )}

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => onChangeSubTab('bpmp')}
                className="px-4 py-2 border border-slate-300 rounded-[7px] text-slate-700 font-semibold cursor-pointer"
              >
                Lihat Daftar BPMP
              </button>
              <button
                type="button"
                onClick={async () => {
                  const count = await onImportXml(xmlContent);
                  setXmlStatus(
                    `Berhasil mengimpor ${count} draf Bukti Potong ke tab Belum Terbit! Silakan buka menu BPMP atau BPPU untuk menerbitkan.`
                  );
                }}
                className="inline-flex items-center gap-2 bg-[#1E2C5E] hover:bg-[#16224A] text-white font-semibold px-4 py-2 rounded-[7px] cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5 text-[#F4C430]" />
                <span>Validasi &amp; Impor XML Sekarang</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* =================================================================== */
        /* VIEW C: 2-COLUMN CORETAX eBUPOT WORKSPACE (MATCHES image_19fd99c0)  */
        /* =================================================================== */
        <div className="flex flex-col lg:flex-row gap-4 items-start">
          {/* LEFT INTERNAL PANEL: Dark-Navy WP Header + Belum Terbit / Telah Terbit / Tidak Valid */}
          <aside className="w-full lg:w-[225px] shrink-0 bg-white border border-[#E2E8F0] rounded-[8px] overflow-hidden shadow-xs">
            <div className="bg-[#1E2C5E] text-white px-4 py-4">
              <div className="font-mono-num font-bold text-[15px] tracking-wide break-all leading-tight">
                {activeTaxpayer.nikNpwp}
              </div>
              <div className="text-xs font-medium text-slate-200 uppercase mt-1 truncate">
                {activeTaxpayer.name}
              </div>
            </div>

            <div className="py-2">
              <div className="px-4 py-2 text-[12px] font-bold text-[#1E2C5E] border-b border-slate-100">
                {activeConfig.shortTitle}
              </div>
              <div className="py-1">
                {(
                  [
                    { key: 'UNISSUED', label: 'Belum Terbit', count: unissuedCount },
                    { key: 'ISSUED', label: 'Telah Terbit', count: issuedCount },
                    { key: 'INVALID', label: 'Tidak Valid', count: 0 },
                  ] as const
                ).map((item) => {
                  const isActive = statusView === item.key;
                  return (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => {
                        setStatusView(item.key);
                        setSelectedIds([]);
                        setPage(1);
                      }}
                      className={`w-full text-left px-4 py-2.5 text-[12px] transition cursor-pointer flex items-center justify-between ${
                        isActive
                          ? 'bg-[#E6EEF6] text-[#1E2C5E] font-bold'
                          : 'text-slate-600 hover:bg-slate-50 font-medium'
                      }`}
                    >
                      <span>{item.label}</span>
                      {item.count > 0 && (
                        <span className="font-mono-num text-[11px] font-bold text-[#1E2C5E]">
                          {item.count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </aside>

          {/* RIGHT MAIN WORKSPACE CARD */}
          <div className="flex-1 min-w-0 w-full bg-white border border-[#E2E8F0] rounded-[8px] overflow-hidden">
            {/* Top Header Row: Uppercase Coretax Title + 6 Action Buttons */}
            <div className="px-5 py-4 border-b border-[#E5EAF2] flex flex-wrap items-center justify-between gap-3">
              <div>
                <h1 className="font-display font-bold text-[15px] text-[#1E2C5E] uppercase tracking-tight">
                  {activeConfig.headingPrefix} {statusHeadingSuffix}
                </h1>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Total PPh Dipotong pada daftar ini:{' '}
                  <strong className="font-mono-num text-[#1E2C5E]">
                    {formatRp(visibleSlips.reduce((sum, s) => sum + s.taxWithheld, 0))}
                  </strong>
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setCreateOpen(true)}
                  className="inline-flex items-center gap-1.5 bg-[#1E2C5E] hover:bg-[#16224A] text-white font-semibold text-xs px-3 py-2 rounded-[6px] transition cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{activeConfig.createBtnLabel}</span>
                </button>

                <button
                  type="button"
                  disabled={statusView !== 'UNISSUED' || selectedIds.length === 0}
                  onClick={handleBulkDelete}
                  className="inline-flex items-center gap-1.5 bg-[#94A3B8] enabled:bg-rose-600 enabled:hover:bg-rose-700 disabled:opacity-55 text-white font-semibold text-xs px-3 py-2 rounded-[6px] transition cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Hapus</span>
                </button>

                <button
                  type="button"
                  disabled={statusView !== 'UNISSUED' || selectedIds.length === 0}
                  onClick={() => setSignOpen(true)}
                  className="inline-flex items-center gap-1.5 bg-[#94A3B8] enabled:bg-emerald-700 enabled:hover:bg-emerald-800 disabled:opacity-55 text-white font-semibold text-xs px-3 py-2 rounded-[6px] transition cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Terbitkan{selectedIds.length > 0 ? ` (${selectedIds.length})` : ''}</span>
                </button>

                {/* Monitoring */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => {
                      setMonitoringOpen((p) => !p);
                      setImportMenuOpen(false);
                      setBulkMenuOpen(false);
                    }}
                    className="inline-flex items-center gap-1 bg-[#1E2C5E] hover:bg-[#16224A] text-white font-semibold text-xs px-3 py-2 rounded-[6px] transition cursor-pointer"
                  >
                    <Info className="w-3.5 h-3.5" />
                    <span>Monitoring</span>
                    <ChevronDown className="w-3 h-3" />
                  </button>
                  {monitoringOpen && (
                    <div className="absolute right-0 top-full mt-1.5 w-60 bg-white border border-[#E2E8F0] rounded-lg shadow-xl p-3 z-30 text-xs space-y-1.5">
                      <div className="font-bold text-[#1E2C5E] border-b border-slate-100 pb-1">
                        Ringkasan {activeConfig.shortTitle}
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600">Belum Terbit</span>
                        <strong className="font-mono-num text-amber-700">{unissuedCount}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600">Telah Terbit</span>
                        <strong className="font-mono-num text-emerald-700">{issuedCount}</strong>
                      </div>
                    </div>
                  )}
                </div>

                {/* Impor Data Dropdown */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => {
                      setImportMenuOpen((p) => !p);
                      setMonitoringOpen(false);
                      setBulkMenuOpen(false);
                    }}
                    className="inline-flex items-center gap-1 bg-[#1E2C5E] hover:bg-[#16224A] text-white font-semibold text-xs px-3 py-2 rounded-[6px] transition cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Impor data</span>
                    <ChevronDown className="w-3 h-3" />
                  </button>
                  {importMenuOpen && (
                    <div className="absolute right-0 top-full mt-1.5 w-52 bg-white border border-[#E2E8F0] rounded-lg shadow-xl py-1 z-30 text-xs">
                      <button
                        type="button"
                        onClick={() => {
                          setImportMenuOpen(false);
                          onChangeSubTab('xml');
                        }}
                        className="w-full text-left px-3.5 py-2 hover:bg-slate-50 font-semibold text-[#1E2C5E] cursor-pointer"
                      >
                        Impor Berkas XML Massal
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setImportMenuOpen(false);
                          handleDownloadXmlTemplate();
                        }}
                        className="w-full text-left px-3.5 py-2 hover:bg-slate-50 text-slate-600 cursor-pointer"
                      >
                        Unduh Template XML
                      </button>
                    </div>
                  )}
                </div>

                {/* Bulk Process Dropdown */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => {
                      setBulkMenuOpen((p) => !p);
                      setMonitoringOpen(false);
                      setImportMenuOpen(false);
                    }}
                    className="inline-flex items-center gap-1 bg-[#1E2C5E] hover:bg-[#16224A] text-white font-semibold text-xs px-3 py-2 rounded-[6px] transition cursor-pointer"
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span>Bulk Process</span>
                    <ChevronDown className="w-3 h-3" />
                  </button>
                  {bulkMenuOpen && (
                    <div className="absolute right-0 top-full mt-1.5 w-56 bg-white border border-[#E2E8F0] rounded-lg shadow-xl py-1 z-30 text-xs">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedIds(paginatedSlips.map((s) => s.id));
                          setBulkMenuOpen(false);
                        }}
                        className="w-full text-left px-3.5 py-2 hover:bg-slate-50 font-semibold text-[#1E2C5E] cursor-pointer"
                      >
                        Pilih Semua Baris di Halaman
                      </button>
                      {statusView === 'UNISSUED' && paginatedSlips.length > 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            const ids =
                              selectedIds.length > 0
                                ? selectedIds
                                : paginatedSlips.map((s) => s.id);
                            setSelectedIds(ids);
                            setBulkMenuOpen(false);
                            setSignOpen(true);
                          }}
                          className="w-full text-left px-3.5 py-2 hover:bg-slate-50 font-semibold text-emerald-700 cursor-pointer"
                        >
                          Terbitkan Semua Draf (TTE)
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Icon Toolbar */}
            <div className="px-5">
              <CoretaxIconToolbar
                onRefresh={() => {
                  setNumFilter('');
                  setRecipientFilter('');
                  setObjCodeFilter('');
                  setPeriodMonthFilter('ALL');
                  setPage(1);
                }}
                onExportCsv={() =>
                  downloadCsvFile(
                    `eBupot_${currentSlipType}_${statusView}.csv`,
                    ['Masa Pajak', 'Nomor Pemotongan', 'Status', 'NIK/NPWP Penerima', 'Nama Penerima', 'Kode Objek', 'Bruto', 'Tarif', 'PPh Dipotong'],
                    visibleSlips.map((s) => [
                      `${MONTHS_ID[Math.max(0, s.taxPeriodMonth - 1)]} ${s.taxPeriodYear}`,
                      s.slipNumber,
                      s.status,
                      s.recipientNikNpwp,
                      s.recipientName,
                      s.objectCode,
                      s.grossAmount,
                      `${s.ratePercent}%`,
                      s.taxWithheld,
                    ])
                  )
                }
                onExportExcel={() =>
                  downloadCsvFile(
                    `eBupot_${currentSlipType}_${statusView}.csv`,
                    ['Masa Pajak', 'Nomor Pemotongan', 'Status', 'NIK/NPWP Penerima', 'Nama Penerima', 'Kode Objek', 'Bruto', 'Tarif', 'PPh Dipotong'],
                    visibleSlips.map((s) => [
                      `${MONTHS_ID[Math.max(0, s.taxPeriodMonth - 1)]} ${s.taxPeriodYear}`,
                      s.slipNumber,
                      s.status,
                      s.recipientNikNpwp,
                      s.recipientName,
                      s.objectCode,
                      s.grossAmount,
                      `${s.ratePercent}%`,
                      s.taxWithheld,
                    ])
                  )
                }
                onPrintPdf={() => window.print()}
                onToggleFilter={() => setShowFilters((p) => !p)}
                filterActive={showFilters}
              />
            </div>

            {/* Golden-Yellow Coretax eBupot Table */}
            <div className="px-5 pb-4">
              <div className="border border-[#E2E8F0] rounded-[8px] overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-[11.5px] border-collapse">
                    <thead>
                      <tr className="bg-[#FCD34D] text-[#1E293B] font-bold border-b border-[#EAB308]/40">
                        <th className="px-2.5 py-2.5 w-9 text-center border-r border-white/50">
                          {statusView === 'UNISSUED' && (
                            <input
                              type="checkbox"
                              checked={
                                paginatedSlips.length > 0 &&
                                selectedIds.length === paginatedSlips.length
                              }
                              onChange={toggleAllVisible}
                            />
                          )}
                        </th>
                        <th className="px-3 py-2.5 text-left whitespace-nowrap border-r border-white/50">
                          Aksi
                        </th>
                        <th className="px-3 py-2.5 text-left whitespace-nowrap border-r border-white/50">
                          <span className="inline-flex items-center gap-1">
                            Masa Pajak <ArrowUpDown className="w-3 h-3 opacity-60" />
                          </span>
                        </th>
                        <th className="px-3 py-2.5 text-left whitespace-nowrap border-r border-white/50">
                          <span className="inline-flex items-center gap-1">
                            Nomor Pemotongan <ArrowUpDown className="w-3 h-3 opacity-60" />
                          </span>
                        </th>
                        <th className="px-3 py-2.5 text-left whitespace-nowrap border-r border-white/50">
                          Status
                        </th>
                        <th className="px-3 py-2.5 text-left whitespace-nowrap border-r border-white/50">
                          <span className="inline-flex items-center gap-1">
                            NIK / NPWP &amp; Penerima <ArrowUpDown className="w-3 h-3 opacity-60" />
                          </span>
                        </th>
                        <th className="px-3 py-2.5 text-left whitespace-nowrap border-r border-white/50">
                          <span className="inline-flex items-center gap-1">
                            Kode Objek Pajak <ArrowUpDown className="w-3 h-3 opacity-60" />
                          </span>
                        </th>
                        <th className="px-3 py-2.5 text-right whitespace-nowrap border-r border-white/50">
                          Penghasilan Bruto
                        </th>
                        <th className="px-3 py-2.5 text-right whitespace-nowrap border-r border-white/50">
                          Tarif
                        </th>
                        <th className="px-3 py-2.5 text-right whitespace-nowrap">
                          PPh Dipotong
                        </th>
                      </tr>

                      {showFilters && (
                        <tr className="bg-white border-b border-[#E2E8F0]">
                          <th className="px-2 py-2 border-r border-slate-100" />
                          <th className="px-2 py-2 border-r border-slate-100" />
                          <th className="px-2 py-2 border-r border-slate-100">
                            <select
                              value={periodMonthFilter}
                              onChange={(e) => {
                                setPeriodMonthFilter(e.target.value);
                                setPage(1);
                              }}
                              className="w-full min-w-[95px] border border-[#CBD5E1] bg-white rounded-[5px] px-1.5 py-1 text-[11px] font-normal"
                            >
                              <option value="ALL">Semua Masa</option>
                              {MONTHS_ID.map((m, idx) => (
                                <option key={m} value={String(idx + 1)}>
                                  {m}
                                </option>
                              ))}
                            </select>
                          </th>
                          <th className="px-2 py-2 border-r border-slate-100">
                            <div className="flex items-center gap-1">
                              <input
                                type="text"
                                value={numFilter}
                                onChange={(e) => {
                                  setNumFilter(e.target.value);
                                  setPage(1);
                                }}
                                placeholder="Nomor..."
                                className="w-full min-w-[110px] border border-[#CBD5E1] rounded-[5px] px-2 py-1 text-[11px] font-normal"
                              />
                              <Filter className="w-3 h-3 text-slate-400 shrink-0" />
                            </div>
                          </th>
                          <th className="px-2 py-2 border-r border-slate-100" />
                          <th className="px-2 py-2 border-r border-slate-100">
                            <input
                              type="text"
                              value={recipientFilter}
                              onChange={(e) => {
                                setRecipientFilter(e.target.value);
                                setPage(1);
                              }}
                              placeholder="NIK / Nama..."
                              className="w-full min-w-[125px] border border-[#CBD5E1] rounded-[5px] px-2 py-1 text-[11px] font-normal"
                            />
                          </th>
                          <th className="px-2 py-2 border-r border-slate-100">
                            <input
                              type="text"
                              value={objCodeFilter}
                              onChange={(e) => {
                                setObjCodeFilter(e.target.value);
                                setPage(1);
                              }}
                              placeholder="Kode Objek..."
                              className="w-full min-w-[110px] border border-[#CBD5E1] rounded-[5px] px-2 py-1 text-[11px] font-normal"
                            />
                          </th>
                          <th colSpan={3} className="px-2 py-2" />
                        </tr>
                      )}
                    </thead>
                    <tbody className="divide-y divide-[#EEF2F6] bg-white">
                      {paginatedSlips.length === 0 ? (
                        <tr>
                          <td colSpan={10} className="px-4 py-8 text-left text-slate-500">
                            Tidak ada data yang ditemukan.
                          </td>
                        </tr>
                      ) : (
                        paginatedSlips.map((slip) => (
                          <tr key={slip.id} className="hover:bg-[#F8FAFC]">
                            <td className="px-2.5 py-2.5 text-center">
                              {statusView === 'UNISSUED' && (
                                <input
                                  type="checkbox"
                                  checked={selectedIds.includes(slip.id)}
                                  onChange={() => toggleSelect(slip.id)}
                                />
                              )}
                            </td>
                            <td className="px-3 py-2.5 whitespace-nowrap">
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => onPrintDocument({ type: 'BPA1', slip })}
                                  className="p-1.5 rounded border border-slate-200 hover:bg-slate-100 text-[#1E2C5E] cursor-pointer"
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
                            <td className="px-3 py-2.5 whitespace-nowrap">
                              {MONTHS_ID[Math.max(0, slip.taxPeriodMonth - 1)]} {slip.taxPeriodYear}
                            </td>
                            <td className="px-3 py-2.5 font-mono-num font-bold text-[#1E2C5E] whitespace-nowrap">
                              {slip.slipNumber}
                            </td>
                            <td className="px-3 py-2.5 whitespace-nowrap">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                                  slip.status === 'ISSUED'
                                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                    : 'bg-amber-50 text-amber-800 border-amber-200'
                                }`}
                              >
                                {slip.status === 'ISSUED' ? 'TELAH TERBIT' : 'BELUM TERBIT'}
                              </span>
                            </td>
                            <td className="px-3 py-2.5">
                              <div className="font-semibold text-slate-800 whitespace-nowrap">
                                {slip.recipientName}
                              </div>
                              <div className="text-[10px] font-mono-num text-slate-500">
                                {slip.recipientNikNpwp}
                              </div>
                            </td>
                            <td className="px-3 py-2.5">
                              <div className="font-mono-num font-semibold text-[#1E2C5E]">
                                {slip.objectCode}
                              </div>
                              <div className="text-[10px] text-slate-500 max-w-[180px] truncate">
                                {slip.objectName}
                              </div>
                            </td>
                            <td className="px-3 py-2.5 text-right font-mono-num whitespace-nowrap">
                              {formatRp(slip.grossAmount)}
                            </td>
                            <td className="px-3 py-2.5 text-right font-mono-num whitespace-nowrap">
                              {slip.ratePercent}%
                            </td>
                            <td className="px-3 py-2.5 text-right font-mono-num font-bold text-[#1E2C5E] whitespace-nowrap">
                              {formatRp(slip.taxWithheld)}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                <CoretaxPagination
                  totalItems={visibleSlips.length}
                  page={page}
                  pageSize={pageSize}
                  onPageChange={setPage}
                  onPageSizeChange={setPageSize}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create e-Bupot Modal */}
      {createOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl border border-slate-300 w-full max-w-lg overflow-hidden">
            <div className="bg-[#1E2C5E] text-white px-5 py-3.5 flex items-center justify-between border-b-2 border-[#F4C430]">
              <h3 className="font-display font-bold text-sm">
                Buat Bukti Potong — {activeConfig.shortTitle} ({currentSlipType})
              </h3>
              <button type="button" onClick={() => setCreateOpen(false)} className="cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleCreate} className="p-5 space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#1E2C5E] mb-1">Masa Pajak</label>
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
                  <label className="block font-semibold text-[#1E2C5E] mb-1">Tahun Pajak</label>
                  <input
                    type="number"
                    value={year}
                    onChange={(e) => setYear(Number(e.target.value))}
                    className="w-full border border-[#CBD5E1] rounded px-3 py-2 font-mono-num"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#1E2C5E] mb-1">NIK / NPWP Penerima</label>
                  <input
                    type="text"
                    value={recipientNik}
                    onChange={(e) => setRecipientNik(e.target.value)}
                    className="w-full border border-[#CBD5E1] rounded px-3 py-2 font-mono-num"
                    required
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#1E2C5E] mb-1">Nama Penerima</label>
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
                  <label className="block font-semibold text-[#1E2C5E] mb-1">Kode Objek Pajak PPh 23</label>
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
                  <label className="block font-semibold text-[#1E2C5E] mb-1">Status PTKP Penerima</label>
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
                <label className="block font-semibold text-[#1E2C5E] mb-1">Penghasilan Bruto (Rp)</label>
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
                  <span className="font-mono-num font-bold text-[#1E2C5E]">{calc.objectCode}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block">Tarif Efektif / Pasal</span>
                  <span className="font-mono-num font-bold text-[#1E2C5E]">{calc.ratePercent}%</span>
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
                  className="px-4 py-2 bg-[#1E2C5E] text-white font-bold rounded cursor-pointer"
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
