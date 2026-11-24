import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  ArrowUpDown,
  ChevronDown,
  ChevronRight,
  Download,
  Edit3,
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
import { downloadBuktiPotongPdf } from '../utils/buktiPotongPdfGenerator.ts';
import {
  CoretaxIconToolbar,
  CoretaxPagination,
  downloadCsvFile,
} from '../components/CoretaxTableChrome.tsx';

interface EBupotModuleProps {
  subTab: string;
  resetKey?: number;
  onChangeSubTab: (tab: string) => void;
  workspace: WorkspaceState;
  activeTaxpayer: Taxpayer;
  accountMode: 'INDIVIDUAL' | 'CORPORATE';
  onSwitchAccountMode: (mode: 'INDIVIDUAL' | 'CORPORATE') => void;
  onCreateSlip: (slip: Omit<WithholdingSlip, 'id' | 'createdAt' | 'status'>) => Promise<void>;
  onIssueSlips: (ids: string[]) => Promise<void>;
  onDeleteSlip: (id: string) => Promise<void>;
  onUpdateSlip?: (id: string, updates: Partial<WithholdingSlip>) => Promise<void>;
  onCancelSlips?: (ids: string[]) => Promise<void>;
  onImportXml: (xml: string) => Promise<number>;
  onPrintDocument: (doc: PrintablePayload) => void;
}

const BPMP_OBJECT_OPTIONS = [
  {
    code: '21-100-01',
    name: 'Penghasilan yang Diterima atau Diperoleh Pegawai Tetap',
  },
  {
    code: '21-100-02',
    name: 'Penghasilan yang Diterima atau Diperoleh Pensiunan Secara Teratur',
  },
  {
    code: '21-100-03',
    name: 'Penghasilan yang Diterima atau Diperoleh Pegawai Tetap yang Menerima fasilitas di Daerah Tertentu',
  },
];

const BP21_OBJECT_OPTIONS = [
  {
    code: '21-100-07',
    name: 'Imbalan kepada Bukan Pegawai yang Bersifat Berkesinambungan / Tidak Berkesinambungan',
  },
  {
    code: '21-100-09',
    name: 'Imbalan kepada Tenaga Ahli (Pengacara, Akuntan, Arsitek, Dokter, Konsultan, Notaris, Penilai, Aktuaris)',
  },
  {
    code: '21-100-13',
    name: 'Imbalan kepada Peserta Kegiatan / Dewan Komisaris / Mantan Pegawai',
  },
];

const BP26_OBJECT_OPTIONS = [
  {
    code: '27-100-01',
    name: 'Imbalan Sehubungan dengan Jasa, Pekerjaan, dan Kegiatan Wajib Pajak Luar Negeri',
  },
  {
    code: '27-100-02',
    name: 'Penghasilan dari Hadiah dan Penghargaan Wajib Pajak Luar Negeri',
  },
  {
    code: '27-100-03',
    name: 'Penghasilan dari Pensiun dan Pembayaran Berkala Lainnya Wajib Pajak Luar Negeri',
  },
];

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

import {
  UNIFIKASI_BPPU_OBJECT_CODES,
  UNIFIKASI_FASILITAS_OPTIONS,
  UNIFIKASI_PEMBAYARAN_IP_OPTIONS,
  UNIFIKASI_DOKUMEN_OPTIONS,
} from '../data/unifikasiTaxObjects.ts';

export {
  UNIFIKASI_BPPU_OBJECT_CODES,
  UNIFIKASI_FASILITAS_OPTIONS,
  UNIFIKASI_PEMBAYARAN_IP_OPTIONS,
  UNIFIKASI_DOKUMEN_OPTIONS,
};

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
    headingPrefix: 'EBUPOT BP21',
    createBtnLabel: 'Create eBupot BP21',
    slipType: 'BP21',
  },
  bp26: {
    shortTitle: 'BP 26',
    headingPrefix: 'EBUPOT BP26',
    createBtnLabel: 'Create eBupot BP26',
    slipType: 'BP21',
  },
  bpa1: {
    shortTitle: 'BP A1',
    headingPrefix: 'EBUPOT BPA1',
    createBtnLabel: 'Create eBupot BPA1',
    slipType: 'BPA1',
  },
  bpa2: {
    shortTitle: 'BP A2',
    headingPrefix: 'EBUPOT BPA2',
    createBtnLabel: 'Create eBupot BPA2',
    slipType: 'BPA1',
  },
  bpmp: {
    shortTitle: 'Bukti Pemotongan Bulanan Pegawai Tetap',
    headingPrefix: 'EBUPOT MP',
    createBtnLabel: 'Create eBupot MP',
    slipType: 'BPMP',
  },
};

export const EBupotModule: React.FC<EBupotModuleProps> = ({
  subTab,
  resetKey,
  onChangeSubTab,
  workspace,
  activeTaxpayer,
  accountMode,
  onSwitchAccountMode,
  onCreateSlip,
  onIssueSlips,
  onDeleteSlip,
  onUpdateSlip,
  onCancelSlips,
  onImportXml,
  onPrintDocument,
}) => {
  const [statusView, setStatusView] = useState<'UNISSUED' | 'ISSUED' | 'INVALID'>('UNISSUED');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [signOpen, setSignOpen] = useState(false);
  const [cancelSignOpen, setCancelSignOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [editingSlip, setEditingSlip] = useState<WithholdingSlip | null>(null);
  const [detailSlip, setDetailSlip] = useState<WithholdingSlip | null>(null);
  const [monitoringOpen, setMonitoringOpen] = useState(false);
  const [importMenuOpen, setImportMenuOpen] = useState(false);
  const [bulkMenuOpen, setBulkMenuOpen] = useState(false);
  const isBpa = subTab === 'bpa1' || subTab === 'bpa2';
  const isBpa2 = subTab === 'bpa2';

  // Reset detail views / modals when navigating or clicking menu
  useEffect(() => {
    setDetailSlip(null);
    setCreateOpen(false);
    setEditingSlip(null);
    setMonitoringOpen(false);
  }, [resetKey, subTab]);

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

  // Create inline form state (Coretax e-Bupot PDF fields)
  const [formCollapsed, setFormCollapsed] = useState<Record<string, boolean>>({});
  const [recipientNik, setRecipientNik] = useState('3174051908920005');
  const [recipientName, setRecipientName] = useState('ANDI WIJAYA');
  const [recipientPosition, setRecipientPosition] = useState('Staff Operasional');
  const [month, setMonth] = useState(1);
  const [year, setYear] = useState(2025);
  const [ptkp, setPtkp] = useState<PtkpStatus>('TK/0');
  const [grossAmount, setGrossAmount] = useState(20_000_000);
  const [pph23Code, setPph23Code] = useState('24-104-29');
  const [bpmpObjectCode, setBpmpObjectCode] = useState('21-100-01');
  const [bp21ObjectCode, setBp21ObjectCode] = useState('21-100-07');
  const [bp26ObjectCode, setBp26ObjectCode] = useState('27-100-01');
  const [taxFacility, setTaxFacility] = useState<string>('N/A');
  const [paymentIp, setPaymentIp] = useState<string>('N/A');
  const [refDocType, setRefDocType] = useState('CommercialInvoice');
  const [refDocNumber, setRefDocNumber] = useState('DOC/2025/01/001');
  const [refDocDate, setRefDocDate] = useState('2025-01-25');
  const [submitBanner, setSubmitBanner] = useState<string | null>(null);

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
    const targetStatus = statusView === 'INVALID' ? 'CANCELLED' : statusView;
    return workspace.slips.filter((s) => {
      if (s.slipType !== currentSlipType || s.status !== targetStatus) return false;
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
  const invalidCount = workspace.slips.filter(
    (s) => s.slipType === currentSlipType && s.status === 'CANCELLED'
  ).length;

  // Live calculation preview for create modal (100% preserves Modul 3 TER / Psl 17 / PPh 23)
  const computeSlipValues = () => {
    if (currentSlipType === 'BPMP') {
      const res = calculatePph21Ter(grossAmount, ptkp);
      const selectedObj =
        BPMP_OBJECT_OPTIONS.find((o) => o.code === bpmpObjectCode) || BPMP_OBJECT_OPTIONS[0];
      return {
        objectCode: selectedObj.code,
        objectName: selectedObj.name,
        netAmount: grossAmount,
        ratePercent: res.ratePercent,
        taxWithheld: res.tax,
      };
    }
    if (currentSlipType === 'BP21') {
      if (subTab === 'bp26') {
        const selected26 =
          BP26_OBJECT_OPTIONS.find((o) => o.code === bp26ObjectCode) || BP26_OBJECT_OPTIONS[0];
        const tax26 = Math.round(grossAmount * 0.2);
        return {
          objectCode: selected26.code,
          objectName: selected26.name,
          netAmount: grossAmount,
          ratePercent: 20,
          taxWithheld: tax26,
        };
      }
      const selected21 =
        BP21_OBJECT_OPTIONS.find((o) => o.code === bp21ObjectCode) || BP21_OBJECT_OPTIONS[0];
      const dpp = Math.round(grossAmount * 0.5);
      const tax = calculatePphPasal17(dpp);
      const eff = grossAmount > 0 ? Number(((tax / grossAmount) * 100).toFixed(2)) : 0;
      return {
        objectCode: selected21.code,
        objectName: selected21.name,
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
        objectCode: subTab === 'bpa2' ? '21-100-02' : '21-100-01',
        objectName:
          subTab === 'bpa2'
            ? 'Pegawai Negeri Sipil / Anggota TNI / Polri / Pejabat Negara / Pensiunannya (BPA2)'
            : 'Penghasilan yang Diterima atau Diperoleh Pegawai Tetap',
        positionAllowance: biayaJabatan,
        netAmount: net,
        ptkpAmount: ptkpVal,
        pkpAmount: pkp,
        ratePercent: grossAmount > 0 ? Number(((tax / grossAmount) * 100).toFixed(2)) : 0,
        taxWithheld: tax,
      };
    }
    if (currentSlipType === 'BPPU_23') {
      const foundUni =
        UNIFIKASI_BPPU_OBJECT_CODES.find((c) => c.code === pph23Code) ||
        UNIFIKASI_BPPU_OBJECT_CODES[0];
      const isExempt = taxFacility === 'DTP' || taxFacility.startsWith('TaxEx');
      const effRate = isExempt ? 0 : foundUni.rate;
      const tax = Math.round((grossAmount * effRate) / 100);
      return {
        objectCode: foundUni.code,
        objectName: foundUni.name,
        taxType: foundUni.taxType,
        nature: foundUni.nature,
        kap: foundUni.kap,
        netAmount: grossAmount,
        ratePercent: effRate,
        taxWithheld: tax,
      };
    }
    const found23 = PPH23_OBJECT_CODES.find((c) => c.code === pph23Code) || PPH23_OBJECT_CODES[0];
    return {
      objectCode: found23.code,
      objectName: found23.name,
      taxType: 'Pasal 23',
      nature: 'Tidak Final',
      kap: '411124-100',
      netAmount: grossAmount,
      ratePercent: found23.rate,
      taxWithheld: Math.round((grossAmount * found23.rate) / 100),
    };
  };

  const calc = computeSlipValues();

  const openEditForm = (slip: WithholdingSlip) => {
    setEditingSlip(slip);
    setDetailSlip(null);
    setRecipientNik(slip.recipientNikNpwp);
    setRecipientName(slip.recipientName);
    setMonth(slip.taxPeriodMonth);
    setYear(slip.taxPeriodYear);
    setPtkp(slip.ptkpStatus);
    setGrossAmount(slip.grossAmount);
    if (slip.slipType === 'BPMP') {
      setBpmpObjectCode(
        BPMP_OBJECT_OPTIONS.some((o) => o.code === slip.objectCode) ? slip.objectCode : '21-100-01'
      );
    } else if (slip.slipType === 'BP21') {
      if (subTab === 'bp26') {
        setBp26ObjectCode(
          BP26_OBJECT_OPTIONS.some((o) => o.code === slip.objectCode) ? slip.objectCode : '27-100-01'
        );
      } else {
        setBp21ObjectCode(
          BP21_OBJECT_OPTIONS.some((o) => o.code === slip.objectCode) ? slip.objectCode : '21-100-07'
        );
      }
    } else if (slip.slipType === 'BPPU_23') {
      setPph23Code(
        UNIFIKASI_BPPU_OBJECT_CODES.some((o) => o.code === slip.objectCode)
          ? slip.objectCode
          : PPH23_OBJECT_CODES.some((o) => o.code === slip.objectCode)
            ? slip.objectCode
            : '24-101-01'
      );
    }
    setCreateOpen(true);
  };

  const saveSlipRecord = async (asSubmit: boolean) => {
    if (editingSlip && onUpdateSlip) {
      await onUpdateSlip(editingSlip.id, {
        recipientNikNpwp: recipientNik,
        recipientName,
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
      setEditingSlip(null);
      setCreateOpen(false);
      setSubmitBanner(
        `Perubahan / Pembetulan (Amend) Bukti Potong ${editingSlip.slipNumber} untuk ${recipientName} (${formatRp(
          calc.taxWithheld
        )}) berhasil disimpan.`
      );
      return;
    }

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
    setSubmitBanner(
      asSubmit
        ? `Bukti Potong ${activeConfig.shortTitle} untuk ${recipientName} (${formatRp(
            calc.taxWithheld
          )}) berhasil disimpan ke daftar Belum Terbit. Centang baris lalu klik "Terbitkan" untuk Tanda Tangan Elektronik.`
        : `Konsep ${activeConfig.shortTitle} untuk ${recipientName} berhasil disimpan ke daftar Belum Terbit.`
    );
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    await saveSlipRecord(true);
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
    if (selectedIds.length === 0) {
      alert('Pilih bukti potong terlebih dahulu untuk dihapus.');
      return;
    }
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
      {/* VIEW 0: EMPTY SUBMENU LANDING (Exact Match to PDF 2 Page 1 Top)     */}
      {/* =================================================================== */}
      {subTab === 'empty' ? (
        <div className="min-h-[420px] flex flex-col items-center justify-center text-center p-8">
          <svg width="160" height="130" viewBox="0 0 160 130" fill="none" aria-hidden="true">
            <circle cx="80" cy="65" r="52" fill="#F1F5F9" />
            <rect x="44" y="34" width="72" height="54" rx="6" fill="#FFFFFF" stroke="#CBD5E1" strokeWidth="2" />
            <rect x="52" y="44" width="28" height="5" rx="2" fill="#1E2C5E" />
            <rect x="52" y="55" width="52" height="4" rx="2" fill="#CBD5E1" />
            <rect x="52" y="64" width="44" height="4" rx="2" fill="#CBD5E1" />
            <circle cx="106" cy="78" r="14" fill="#FEF9C3" stroke="#EAB308" strokeWidth="2" />
            <path d="M101 78L105 82L112 74" stroke="#A16207" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <h2 className="font-display font-bold text-[15px] text-[#1E293B] mt-3">
            Pilih sub menu untuk melanjutkan
          </h2>
          <p className="text-[12px] text-slate-500 mt-1 max-w-xs leading-relaxed">
            <strong>11 sub menu</strong> tersedia di <strong>eBupot</strong>.<br />
            Klik salah satu di sebelah kiri untuk membukanya.
          </p>
        </div>
      ) : subTab === 'bukti_potong_saya' ? (
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
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => onPrintDocument({ type: 'BPA1', slip })}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-[4px] border border-[#CBD5E1] bg-white hover:bg-[#1E2C5E] hover:text-white text-[#1E2C5E] font-semibold text-[11px] transition cursor-pointer"
                              title="Lihat Bukti Potong"
                            >
                              <Eye className="w-3 h-3" />
                              <span>Lihat</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => downloadBuktiPotongPdf(slip, workspace.corporateTaxpayer)}
                              className="w-5 h-5 rounded-[3px] bg-[#A83232] hover:bg-[#8B2626] text-white inline-flex items-center justify-center cursor-pointer transition shadow-xs"
                              title="Download Bukti Potong (PDF Resmi)"
                            >
                              <FileText className="w-3 h-3" />
                            </button>
                          </div>
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
                    { key: 'INVALID', label: 'Tidak Valid', count: invalidCount },
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
                        setDetailSlip(null);
                        setCreateOpen(false);
                        setEditingSlip(null);
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
          {detailSlip ? (
            /* =============================================================== */
            /* DETAIL VIEW / AMEND SCREEN (Exact 100% Match to Image 1)        */
            /* =============================================================== */
            <div className="flex-1 min-w-0 w-full bg-white border border-[#E2E8F0] rounded-[8px] overflow-hidden shadow-xs">
              <div className="px-5 pt-4 pb-2 flex items-center justify-between gap-3">
                <h1 className="font-display font-bold text-[15px] text-[#1E293B] uppercase">
                  {activeConfig.headingPrefix}
                </h1>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onPrintDocument({ type: 'BPA1', slip: detailSlip })}
                    className="px-3 py-1.5 rounded-[4px] border border-[#CBD5E1] bg-white hover:bg-slate-50 text-[#1E2C5E] font-semibold text-xs cursor-pointer"
                  >
                    Cetak / Unduh PDF
                  </button>
                  <button
                    type="button"
                    onClick={() => setDetailSlip(null)}
                    className="px-3 py-1.5 rounded-[4px] bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs cursor-pointer"
                  >
                    Kembali
                  </button>
                </div>
              </div>

              <div className="p-5 space-y-4 text-[11.5px]">
                {/* Section 1: Informasi Umum */}
                <div className="border border-[#DCE2EC] rounded-[5px] overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setFormCollapsed((p) => ({ ...p, detailUmum: !p.detailUmum }))}
                    className="w-full flex items-center justify-between bg-[#F8FAFC] border-b border-[#E2E8F0] text-[#1E293B] px-4 py-2.5 font-semibold text-[12px] cursor-pointer"
                  >
                    <span>Informasi Umum</span>
                    {formCollapsed.detailUmum ? (
                      <ChevronRight className="w-4 h-4 text-slate-400" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-slate-400" />
                    )}
                  </button>
                  {!formCollapsed.detailUmum && (
                    <div className="p-4 space-y-2.5 bg-white">
                      <div className="grid grid-cols-12 items-center gap-2">
                        <span className="col-span-5 text-slate-700">Masa Pajak*</span>
                        <span className="col-span-7 text-slate-800">
                          {MONTHS_ID[Math.max(0, detailSlip.taxPeriodMonth - 1)]} {detailSlip.taxPeriodYear}
                        </span>
                      </div>
                      <div className="grid grid-cols-12 items-center gap-2">
                        <span className="col-span-5 text-slate-700">Status*</span>
                        <span className="col-span-7 text-slate-800">
                          {detailSlip.status === 'CANCELLED' ? 'DIBATALKAN' : 'NORMAL'}
                        </span>
                      </div>
                      <div className="grid grid-cols-12 items-center gap-2">
                        <span className="col-span-5 text-slate-700">Pegawai Asing*</span>
                        <span className="col-span-7 text-slate-800">Tidak</span>
                      </div>
                      <div className="grid grid-cols-12 items-center gap-2">
                        <span className="col-span-5 text-slate-700">Nomor Identitas WP*</span>
                        <span className="col-span-7 font-mono-num text-slate-800">
                          {detailSlip.recipientNikNpwp}
                        </span>
                      </div>
                      <div className="grid grid-cols-12 items-center gap-2">
                        <span className="col-span-5 text-slate-700">Nama*</span>
                        <span className="col-span-7 text-slate-800 uppercase">
                          {detailSlip.recipientName}
                        </span>
                      </div>
                      <div className="grid grid-cols-12 items-center gap-2">
                        <span className="col-span-5 text-slate-700">Status PTKP*</span>
                        <span className="col-span-7 text-slate-800">{detailSlip.ptkpStatus}</span>
                      </div>
                      <div className="grid grid-cols-12 items-center gap-2">
                        <span className="col-span-5 text-slate-700">Jabatan*</span>
                        <span className="col-span-7 text-slate-800 uppercase">
                          {recipientPosition || 'STAFF / PEGAWAI TETAP'}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Section 2: Fasilitas Perpajakan */}
                <div className="border border-[#DCE2EC] rounded-[5px] overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setFormCollapsed((p) => ({ ...p, detailTax: !p.detailTax }))}
                    className="w-full flex items-center justify-between bg-[#F8FAFC] border-b border-[#E2E8F0] text-[#1E293B] px-4 py-2.5 font-semibold text-[12px] cursor-pointer"
                  >
                    <span>Fasilitas Perpajakan</span>
                    {formCollapsed.detailTax ? (
                      <ChevronRight className="w-4 h-4 text-slate-400" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-slate-400" />
                    )}
                  </button>
                  {!formCollapsed.detailTax && (
                    <div className="p-4 space-y-2.5 bg-white">
                      <div className="grid grid-cols-12 items-center gap-2">
                        <span className="col-span-5 text-slate-700">
                          Fasilitas Pajak yang Dimiliki oleh Penerima Penghasilan*
                        </span>
                        <span className="col-span-7 text-slate-800">Tanpa Fasilitas</span>
                      </div>
                      <div className="grid grid-cols-12 items-center gap-2">
                        <span className="col-span-5 text-slate-700">Nama Objek Pajak*</span>
                        <span className="col-span-7 text-slate-800">
                          {detailSlip.objectCode === '21-100-01'
                            ? 'Penghasilan yang Diterima atau Diperoleh Pegawai Tetap'
                            : detailSlip.objectName}
                        </span>
                      </div>
                      <div className="grid grid-cols-12 items-center gap-2">
                        <span className="col-span-5 text-slate-700">Jenis Pajak*</span>
                        <span className="col-span-7 text-slate-800">
                          {detailSlip.slipType === 'BPPU_23' ? 'Pasal 23' : 'Pasal 21'}
                        </span>
                      </div>
                      <div className="grid grid-cols-12 items-center gap-2">
                        <span className="col-span-5 text-slate-700">Kode Objek Pajak*</span>
                        <span className="col-span-7 font-mono-num text-slate-800">
                          {detailSlip.objectCode}
                        </span>
                      </div>
                      <div className="grid grid-cols-12 items-center gap-2">
                        <span className="col-span-5 text-slate-700">Penghasilan Bruto (Rp)*</span>
                        <span className="col-span-2 text-right font-mono-num text-slate-800">
                          {detailSlip.grossAmount.toLocaleString('id-ID')}
                        </span>
                      </div>
                      <div className="grid grid-cols-12 items-center gap-2">
                        <span className="col-span-5 text-slate-700">Tarif (%)*</span>
                        <span className="col-span-2 text-right font-mono-num text-slate-800">
                          {detailSlip.ratePercent.toFixed(2)}
                        </span>
                      </div>
                      <div className="grid grid-cols-12 items-center gap-2">
                        <span className="col-span-5 text-slate-700">
                          Pajak Penghasilan yang Dipotong (Rp)*
                        </span>
                        <span className="col-span-2 text-right font-mono-num text-slate-800">
                          {detailSlip.taxWithheld.toLocaleString('id-ID')}
                        </span>
                      </div>
                      <div className="grid grid-cols-12 items-center gap-2">
                        <span className="col-span-5 text-slate-700">KAP-KJS*</span>
                        <span className="col-span-7 font-mono-num text-slate-800">
                          {detailSlip.slipType === 'BPPU_23' ? '411124-100' : '411121-100'}
                        </span>
                      </div>
                      <div className="grid grid-cols-12 items-center gap-2">
                        <span className="col-span-5 text-slate-700">
                          NITKU/Nomor Identitas Sub Unit Organisasi*
                        </span>
                        <span className="col-span-7 font-mono-num text-slate-800">
                          {detailSlip.issuerNpwp}000000 - {detailSlip.issuerName}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Bottom-Left Amend Button (Exact Match to Image 1) */}
              <div className="px-5 py-4 bg-white border-t border-slate-100 flex items-center gap-3">
                {detailSlip.status !== 'CANCELLED' && (
                  <button
                    type="button"
                    onClick={() => openEditForm(detailSlip)}
                    className="px-6 py-2.5 rounded-[5px] bg-[#1E2C5E] hover:bg-[#152048] text-white font-semibold text-xs cursor-pointer"
                  >
                    Amend
                  </button>
                )}
                {detailSlip.status === 'ISSUED' && onCancelSlips && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedIds([detailSlip.id]);
                      setDetailSlip(null);
                      setCancelSignOpen(true);
                    }}
                    className="px-5 py-2.5 rounded-[5px] bg-[#C85A5A] hover:bg-[#B24949] text-white font-semibold text-xs cursor-pointer"
                  >
                    × Batal
                  </button>
                )}
              </div>
            </div>
          ) : createOpen ? (
            /* =============================================================== */
            /* INLINE FULL-PAGE CORETAX e-BUPOT FORM (100% Match to PDF 2)     */
            /* =============================================================== */
            <form
              onSubmit={handleCreate}
              className="flex-1 min-w-0 w-full bg-white border border-[#E2E8F0] rounded-[8px] overflow-hidden shadow-xs"
            >
              <div className="px-5 pt-4 pb-2 flex items-center justify-between gap-3">
                <h1 className="font-display font-bold text-[15px] text-[#1E293B] uppercase">
                  {activeConfig.headingPrefix}
                </h1>
              </div>

              <div className="p-5 space-y-4 text-[11.5px]">
                {/* Section 1: Informasi Umum */}
                <div className="border border-[#DCE2EC] rounded-[5px] overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setFormCollapsed((p) => ({ ...p, umum: !p.umum }))}
                    className="w-full flex items-center justify-between bg-[#F8FAFC] border-b border-[#E2E8F0] text-[#1E293B] px-4 py-2.5 font-semibold text-[12px] cursor-pointer"
                  >
                    <span>Informasi Umum</span>
                    {formCollapsed.umum ? <ChevronRight className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                  </button>
                  {!formCollapsed.umum && (
                    <div className="p-4 space-y-2.5 bg-white">
                      {currentSlipType === 'BPA1' ? (
                        <>
                          <div className="grid grid-cols-12 items-center gap-2">
                            <label className="col-span-5 text-slate-700">Bekerja di Lebih dari Satu Pemberi Kerja*</label>
                            <select className="col-span-7 border border-[#CBD5E1] rounded-[3px] px-2.5 py-1.5 bg-white">
                              <option value="NO">Tidak</option>
                              <option value="YES">Ya</option>
                            </select>
                          </div>
                          <div className="grid grid-cols-12 items-center gap-2">
                            <label className="col-span-5 text-slate-700">Masa Pajak Awal*</label>
                            <select className="col-span-7 border border-[#CBD5E1] rounded-[3px] px-2.5 py-1.5 bg-white">
                              {MONTHS_ID.map((m, i) => (
                                <option key={m} value={i + 1}>{m} {year}</option>
                              ))}
                            </select>
                          </div>
                          <div className="grid grid-cols-12 items-center gap-2">
                            <label className="col-span-5 text-slate-700">Masa Pajak Akhir*</label>
                            <select defaultValue={12} className="col-span-7 border border-[#CBD5E1] rounded-[3px] px-2.5 py-1.5 bg-white">
                              {MONTHS_ID.map((m, i) => (
                                <option key={m} value={i + 1}>{m} {year}</option>
                              ))}
                            </select>
                          </div>
                        </>
                      ) : (
                        <div className="grid grid-cols-12 items-center gap-2">
                          <label className="col-span-5 text-slate-700">Masa Pajak*</label>
                          <select
                            value={month}
                            onChange={(e) => setMonth(Number(e.target.value))}
                            className="col-span-7 border border-[#CBD5E1] rounded-[3px] px-2.5 py-1.5 bg-white"
                          >
                            {MONTHS_ID.map((m, i) => (
                              <option key={m} value={i + 1}>
                                {m} {year}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}

                      <div className="grid grid-cols-12 items-center gap-2">
                        <label className="col-span-5 text-slate-700">Status*</label>
                        <input
                          type="text"
                          readOnly
                          value="NORMAL"
                          className="col-span-7 border border-[#DCE2EC] bg-[#EDF1F7] rounded-[3px] px-2.5 py-1.5 text-slate-700"
                        />
                      </div>

                      {(subTab === 'bpmp' || subTab === 'bpa1') && (
                        <div className="grid grid-cols-12 items-center gap-2">
                          <label className="col-span-5 text-slate-700">Pegawai Asing*</label>
                          <select className="col-span-7 border border-[#CBD5E1] rounded-[3px] px-2.5 py-1.5 bg-white">
                            <option value="NO">Tidak</option>
                            <option value="YES">Ya</option>
                          </select>
                        </div>
                      )}

                      {subTab !== 'bp26' && (
                        <>
                          <div className="grid grid-cols-12 items-center gap-2">
                            <label className="col-span-5 text-slate-700">Nomor Identitas WP*</label>
                            <input
                              type="text"
                              value={recipientNik}
                              onChange={(e) => setRecipientNik(e.target.value)}
                              className="col-span-7 border border-[#CBD5E1] rounded-[3px] px-2.5 py-1.5 font-mono-num"
                              required
                            />
                          </div>
                          <div className="grid grid-cols-12 items-center gap-2">
                            <label className="col-span-5 text-slate-700">Nama*</label>
                            <input
                              type="text"
                              value={recipientName}
                              onChange={(e) => setRecipientName(e.target.value)}
                              className="col-span-7 border border-[#DCE2EC] bg-[#EDF1F7] focus:bg-white rounded-[3px] px-2.5 py-1.5 font-semibold"
                              required
                            />
                          </div>
                        </>
                      )}

                      {subTab === 'bpa2' && (
                        <>
                          <div className="grid grid-cols-12 items-center gap-2">
                            <label className="col-span-5 text-slate-700">NIP/NRP*</label>
                            <input
                              type="text"
                              defaultValue="198804122015031002"
                              className="col-span-7 border border-[#CBD5E1] rounded-[3px] px-2.5 py-1.5 font-mono-num"
                            />
                          </div>
                          <div className="grid grid-cols-12 items-center gap-2">
                            <label className="col-span-5 text-slate-700">Pangkat/Golongan*</label>
                            <input
                              type="text"
                              defaultValue="Penata Muda / III-a"
                              className="col-span-7 border border-[#CBD5E1] rounded-[3px] px-2.5 py-1.5"
                            />
                          </div>
                        </>
                      )}

                      {(subTab === 'bpmp' || subTab === 'bpa1' || subTab === 'bpa2') && (
                        <>
                          <div className="grid grid-cols-12 items-center gap-2">
                            <label className="col-span-5 text-slate-700">Status PTKP*</label>
                            <select
                              value={ptkp}
                              onChange={(e) => setPtkp(e.target.value as PtkpStatus)}
                              className="col-span-7 border border-[#CBD5E1] rounded-[3px] px-2.5 py-1.5 bg-white"
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
                          <div className="grid grid-cols-12 items-center gap-2">
                            <label className="col-span-5 text-slate-700">
                              {subTab === 'bpa2' ? 'Posisi*' : 'Jabatan*'}
                            </label>
                            <input
                              type="text"
                              value={recipientPosition}
                              onChange={(e) => setRecipientPosition(e.target.value)}
                              className="col-span-7 border border-[#CBD5E1] rounded-[3px] px-2.5 py-1.5"
                            />
                          </div>
                        </>
                      )}

                      {(subTab === 'bpa1' || subTab === 'bpa2') && (
                        <>
                          <div className="grid grid-cols-12 items-center gap-2">
                            <label className="col-span-5 text-slate-700">Nama Objek Pajak*</label>
                            <select
                              value={bpmpObjectCode}
                              onChange={(e) => setBpmpObjectCode(e.target.value)}
                              className="col-span-7 border border-[#CBD5E1] rounded-[3px] px-2.5 py-1.5 bg-white"
                            >
                              {BPMP_OBJECT_OPTIONS.map((opt) => (
                                <option key={opt.code} value={opt.code}>
                                  {opt.name}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="grid grid-cols-12 items-center gap-2">
                            <label className="col-span-5 text-slate-700">Jenis Pajak*</label>
                            <input
                              type="text"
                              readOnly
                              value="Pasal 21"
                              className="col-span-7 border border-[#DCE2EC] bg-[#EDF1F7] rounded-[3px] px-2.5 py-1.5"
                            />
                          </div>
                          <div className="grid grid-cols-12 items-center gap-2">
                            <label className="col-span-5 text-slate-700">Kode Objek Pajak*</label>
                            <input
                              type="text"
                              readOnly
                              value={bpmpObjectCode}
                              className="col-span-7 border border-[#DCE2EC] bg-[#EDF1F7] rounded-[3px] px-2.5 py-1.5 font-mono-num"
                            />
                          </div>
                          <div className="grid grid-cols-12 items-center gap-2">
                            <label className="col-span-5 text-slate-700">Jenis Pemotongan*</label>
                            <select className="col-span-7 border border-[#CBD5E1] rounded-[3px] px-2.5 py-1.5 bg-white">
                              <option value="SETAHUN">Setahun Penuh</option>
                              <option value="DISETAHUNKAN">Disetahunkan</option>
                              <option value="BAGIAN">Kurang dari Setahun</option>
                            </select>
                          </div>
                        </>
                      )}

                      {(subTab === 'bp21' || currentSlipType === 'BPPU_23') && (
                        <div className="grid grid-cols-12 items-center gap-2">
                          <label className="col-span-5 text-slate-700">
                            NITKU /Nomor Identitas Subunit Organisasi Penerima Penghasilan*
                          </label>
                          <select className="col-span-7 border border-[#CBD5E1] rounded-[3px] px-2.5 py-1.5 bg-white">
                            <option value="000000">{recipientNik}000000 — Pusat</option>
                          </select>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Section 2 for BPA1 / BPA2: Penghasilan Bruto + Pengurang + Penghitungan PPh Pasal 21 (PDF 2 Pages 5-7) */}
                {currentSlipType === 'BPA1' ? (
                  <>
                    <div className="border border-[#DCE2EC] rounded-[5px] overflow-hidden">
                      <button
                        type="button"
                        onClick={() => setFormCollapsed((p) => ({ ...p, bruto: !p.bruto }))}
                        className="w-full flex items-center justify-between bg-[#F8FAFC] border-b border-[#E2E8F0] text-[#1E293B] px-4 py-2.5 font-semibold text-[12px] cursor-pointer"
                      >
                        <span>Penghasilan Bruto</span>
                        {formCollapsed.bruto ? <ChevronRight className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                      </button>
                      {!formCollapsed.bruto && (
                        <div className="p-4 space-y-2 bg-white">
                          <div className="grid grid-cols-12 items-center gap-2">
                            <label className="col-span-5 text-slate-700">
                              {subTab === 'bpa2' ? 'Gaji Pokok/Pensiun*' : 'Gaji/Pensiun atau THT/JHT*'}
                            </label>
                            <input
                              type="number"
                              value={grossAmount}
                              onChange={(e) => setGrossAmount(Number(e.target.value) || 0)}
                              className="col-span-7 text-right border border-[#CBD5E1] rounded-[3px] px-2.5 py-1.5 font-mono-num"
                            />
                          </div>
                          {subTab === 'bpa1' && (
                            <div className="grid grid-cols-12 items-center gap-2">
                              <label className="col-span-5 text-slate-700">Penghitungan Gross Up</label>
                              <div className="col-span-7">
                                <input type="checkbox" className="accent-[#1E2C5E]" />
                              </div>
                            </div>
                          )}
                          {(subTab === 'bpa2'
                            ? [
                                'Tunjangan Istri',
                                'Tunjangan Anak',
                                'Tunjangan Perbaikan Penghasilan',
                                'Tunjangan Struktural/Fungsional',
                                'Tunjangan Beras',
                                'Tunjangan Lain-lain',
                                'Penghasilan Tetap dan Teratur Lainnya yang Pembayarannya Terpisah dari Pembayaran Gaji',
                              ]
                            : [
                                'Tunjangan PPh*',
                                'Tunjangan Lainnya, Uang Lembur dan Sebagainya',
                                'Honorarium dan Imbalan Lain Sejenisnya',
                                'Premi Asuransi yang Dibayar Pemberi Kerja',
                                'Penerimaan Dalam Bentuk Natura dan Kenikmatan Lainnya yang Dikenakan Pemotongan PPh Pasal 21',
                                'Tantiem, Bonus, Gratifikasi, Jasa Produksi dan THR',
                              ]
                          ).map((lbl) => (
                            <div key={lbl} className="grid grid-cols-12 items-center gap-2">
                              <label className="col-span-5 text-slate-700">{lbl}</label>
                              <input
                                type="number"
                                defaultValue={0}
                                className="col-span-7 text-right border border-[#CBD5E1] rounded-[3px] px-2.5 py-1.5 font-mono-num"
                              />
                            </div>
                          ))}
                          <div className="grid grid-cols-12 items-center gap-2">
                            <label className="col-span-5 font-semibold text-slate-800">Jumlah Penghasilan Bruto</label>
                            <input
                              type="text"
                              readOnly
                              value={grossAmount.toLocaleString('id-ID')}
                              className="col-span-7 text-right border border-[#DCE2EC] bg-[#EDF1F7] rounded-[3px] px-2.5 py-1.5 font-mono-num font-bold"
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="border border-[#DCE2EC] rounded-[5px] overflow-hidden">
                      <button
                        type="button"
                        onClick={() => setFormCollapsed((p) => ({ ...p, pengurang: !p.pengurang }))}
                        className="w-full flex items-center justify-between bg-[#F8FAFC] border-b border-[#E2E8F0] text-[#1E293B] px-4 py-2.5 font-semibold text-[12px] cursor-pointer"
                      >
                        <span>Pengurang</span>
                        {formCollapsed.pengurang ? <ChevronRight className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                      </button>
                      {!formCollapsed.pengurang && (
                        <div className="p-4 space-y-2 bg-white">
                          <div className="grid grid-cols-12 items-center gap-2">
                            <label className="col-span-5 text-slate-700">Biaya Jabatan / Biaya Pensiun*</label>
                            <input
                              type="text"
                              readOnly
                              value={(calc.positionAllowance || 0).toLocaleString('id-ID')}
                              className="col-span-7 text-right border border-[#DCE2EC] bg-[#EDF1F7] rounded-[3px] px-2.5 py-1.5 font-mono-num"
                            />
                          </div>
                          <div className="grid grid-cols-12 items-center gap-2">
                            <label className="col-span-5 text-slate-700">Iuran terkait Pensiun atau Hari Tua*</label>
                            <input
                              type="number"
                              defaultValue={0}
                              className="col-span-7 text-right border border-[#CBD5E1] rounded-[3px] px-2.5 py-1.5 font-mono-num"
                            />
                          </div>
                          <div className="grid grid-cols-12 items-center gap-2">
                            <label className="col-span-5 text-slate-700">
                              Zakat atau Sumbangan Keagamaan yang Bersifat Wajib yang Dibayarkan melalui Pemberi Kerja*
                            </label>
                            <input
                              type="number"
                              defaultValue={0}
                              className="col-span-7 text-right border border-[#CBD5E1] rounded-[3px] px-2.5 py-1.5 font-mono-num"
                            />
                          </div>
                          <div className="grid grid-cols-12 items-center gap-2">
                            <label className="col-span-5 font-semibold text-slate-800">Jumlah Pengurangan</label>
                            <input
                              type="text"
                              readOnly
                              value={(calc.positionAllowance || 0).toLocaleString('id-ID')}
                              className="col-span-7 text-right border border-[#DCE2EC] bg-[#EDF1F7] rounded-[3px] px-2.5 py-1.5 font-mono-num font-bold"
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="border border-[#DCE2EC] rounded-[5px] overflow-hidden">
                      <button
                        type="button"
                        onClick={() => setFormCollapsed((p) => ({ ...p, tax: !p.tax }))}
                        className="w-full flex items-center justify-between bg-[#F8FAFC] border-b border-[#E2E8F0] text-[#1E293B] px-4 py-2.5 font-semibold text-[12px] cursor-pointer"
                      >
                        <span>Penghitungan PPh Pasal 21</span>
                        {formCollapsed.tax ? <ChevronRight className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                      </button>
                      {!formCollapsed.tax && (
                        <div className="p-4 space-y-2 bg-white">
                          <div className="grid grid-cols-12 items-center gap-2">
                            <label className="col-span-5 text-slate-700">Jumlah Penghasilan Neto*</label>
                            <input
                              type="text"
                              readOnly
                              value={calc.netAmount.toLocaleString('id-ID')}
                              className="col-span-7 text-right border border-[#DCE2EC] bg-[#EDF1F7] rounded-[3px] px-2.5 py-1.5 font-mono-num"
                            />
                          </div>
                          <div className="grid grid-cols-12 items-center gap-2">
                            <label className="col-span-5 text-slate-700">
                              Nomor Bukti Pemotongan {subTab === 'bpa2' ? 'BPA2' : 'BPA1'} dari Pemberi Kerja Sebelumnya (Apabila ada)
                            </label>
                            <div className="col-span-7 flex gap-2">
                              <input
                                type="text"
                                placeholder="-"
                                className="flex-1 border border-[#CBD5E1] rounded-[3px] px-2.5 py-1.5 font-mono-num"
                              />
                              <button
                                type="button"
                                className="px-3 py-1.5 rounded-[4px] bg-[#1E2C5E] text-white font-semibold text-xs"
                              >
                                Get Data
                              </button>
                            </div>
                          </div>
                          {[
                            ['Penghasilan Neto dari Pemotongan Sebelumnya', 0],
                            ['Jumlah Penghasilan Neto untuk Perhitungan PPh Pasal 21 (Setahun/Disetahunkan)*', calc.netAmount],
                            ['Penghasilan Tidak Kena Pajak*', calc.ptkpAmount || 0],
                            ['Penghasilan Kena Pajak Setahun / Disetahunkan', calc.pkpAmount || 0],
                            ['PPh Pasal 21 atas Penghasilan Kena Pajak Setahun/Disetahunkan*', calc.taxWithheld],
                            ['PPh Pasal 21 Terutang', calc.taxWithheld],
                            ['PPh Pasal 21 Dipotong dari Bukti Pemotongan Sebelumnya*', 0],
                            ['PPh Pasal 21 Terutang pada Bukti Pemotongan Ini (Dapat Dikreditkan Pada SPT Tahunan)*', calc.taxWithheld],
                            ['PPh Pasal 21 yang Dipotong/Ditanggung Pemerintah*', 0],
                            ['PPh Pasal 21 Kurang (Lebih) Dipotong pada Masa Pajak Desember / Masa Pajak Terakhir*', calc.taxWithheld],
                          ].map(([lbl, val]) => (
                            <div key={String(lbl)} className="grid grid-cols-12 items-center gap-2">
                              <label className="col-span-5 text-slate-700">{lbl}</label>
                              <input
                                type="text"
                                readOnly
                                value={Number(val).toLocaleString('id-ID')}
                                className="col-span-7 text-right border border-[#DCE2EC] bg-[#EDF1F7] rounded-[3px] px-2.5 py-1.5 font-mono-num"
                              />
                            </div>
                          ))}
                          <div className="grid grid-cols-12 items-center gap-2">
                            <label className="col-span-5 text-slate-700">
                              Jenis Fasilitas pada Masa Pajak Desember/Masa Pajak Terakhir*
                            </label>
                            <select
                              value={taxFacility}
                              onChange={(e) => setTaxFacility(e.target.value as 'NONE' | 'SKB' | 'DTP')}
                              className="col-span-7 border border-[#CBD5E1] rounded-[3px] px-2.5 py-1.5 bg-white"
                            >
                              <option value="NONE">Tanpa Fasilitas</option>
                              <option value="DTP">PPh Ditanggung Pemerintah</option>
                            </select>
                          </div>
                          <div className="grid grid-cols-12 items-center gap-2">
                            <label className="col-span-5 text-slate-700">KAP-KJS*</label>
                            <input
                              type="text"
                              readOnly
                              value="411121-100"
                              className="col-span-7 border border-[#DCE2EC] bg-[#EDF1F7] rounded-[3px] px-2.5 py-1.5 font-mono-num"
                            />
                          </div>
                          <div className="grid grid-cols-12 items-center gap-2">
                            <label className="col-span-5 text-slate-700">
                              NITKU/Nomor Identitas Sub Unit Organisasi*
                            </label>
                            <select className="col-span-7 border border-[#CBD5E1] rounded-[3px] px-2.5 py-1.5 bg-white">
                              <option value="000000">{workspace.corporateTaxpayer.nikNpwp}000000 — Pusat</option>
                            </select>
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  /* Section 2 for BPMP / BP21 / BP26 / BPU (PDF 2 Pages 2, 3, 4, 16) */
                  <div className="border border-[#DCE2EC] rounded-[5px] overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setFormCollapsed((p) => ({ ...p, tax: !p.tax }))}
                      className="w-full flex items-center justify-between bg-[#F8FAFC] border-b border-[#E2E8F0] text-[#1E293B] px-4 py-2.5 font-semibold text-[12px] cursor-pointer"
                    >
                      <span>
                        {subTab === 'bpmp'
                          ? 'Fasilitas Perpajakan'
                          : subTab === 'bp26'
                            ? 'Penghitungan Pajak Penghasilan'
                            : 'Pajak Penghasilan (Rp)'}
                      </span>
                      {formCollapsed.tax ? <ChevronRight className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                    </button>
                    {!formCollapsed.tax && (
                      <div className="p-4 space-y-2.5 bg-white">
                        {subTab === 'bp21' && (
                          <div className="grid grid-cols-12 items-center gap-2">
                            <label className="col-span-5 text-slate-700">Status PTKP*</label>
                            <select
                              value={ptkp}
                              onChange={(e) => setPtkp(e.target.value as PtkpStatus)}
                              className="col-span-7 border border-[#CBD5E1] rounded-[3px] px-2.5 py-1.5 bg-white"
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

                        <div className="grid grid-cols-12 items-center gap-2">
                          <label className="col-span-5 text-slate-700">
                            {subTab === 'bp26'
                              ? 'Nama Fasilitas*'
                              : 'Fasilitas Pajak yang Dimiliki oleh Penerima Penghasilan*'}
                          </label>
                          <select
                            value={taxFacility}
                            onChange={(e) => setTaxFacility(e.target.value)}
                            className="col-span-7 border border-[#CBD5E1] rounded-[3px] px-2.5 py-1.5 bg-white text-xs"
                          >
                            {UNIFIKASI_FASILITAS_OPTIONS.map((f) => (
                              <option key={f.code} value={f.code}>
                                {f.name}
                              </option>
                            ))}
                          </select>
                        </div>

                        {subTab === 'bp26' && (
                          <>
                            <div className="grid grid-cols-12 items-center gap-2">
                              <label className="col-span-5 text-slate-700">Nomor Identitas WP*</label>
                              <input
                                type="text"
                                value={recipientNik}
                                onChange={(e) => setRecipientNik(e.target.value)}
                                className="col-span-7 border border-[#CBD5E1] rounded-[3px] px-2.5 py-1.5 font-mono-num"
                              />
                            </div>
                            <div className="grid grid-cols-12 items-center gap-2">
                              <label className="col-span-5 text-slate-700">Nama*</label>
                              <input
                                type="text"
                                value={recipientName}
                                onChange={(e) => setRecipientName(e.target.value)}
                                className="col-span-7 border border-[#CBD5E1] rounded-[3px] px-2.5 py-1.5"
                              />
                            </div>
                          </>
                        )}

                        <div className="grid grid-cols-12 items-center gap-2">
                          <label className="col-span-5 text-slate-700">Nama Objek Pajak*</label>
                          {currentSlipType === 'BPPU_23' ? (
                            <select
                              value={pph23Code}
                              onChange={(e) => setPph23Code(e.target.value)}
                              className="col-span-7 border border-[#CBD5E1] rounded-[3px] px-2.5 py-1.5 bg-white text-xs"
                            >
                              {UNIFIKASI_BPPU_OBJECT_CODES.map((c) => (
                                <option key={c.code} value={c.code}>
                                  {c.code} - {c.name} ({c.rate}%)
                                </option>
                              ))}
                            </select>
                          ) : subTab === 'bpmp' ? (
                            <select
                              value={bpmpObjectCode}
                              onChange={(e) => setBpmpObjectCode(e.target.value)}
                              className="col-span-7 border border-[#CBD5E1] rounded-[3px] px-2.5 py-1.5 bg-white"
                            >
                              {BPMP_OBJECT_OPTIONS.map((opt) => (
                                <option key={opt.code} value={opt.code}>
                                  {opt.name}
                                </option>
                              ))}
                            </select>
                          ) : subTab === 'bp26' ? (
                            <select
                              value={bp26ObjectCode}
                              onChange={(e) => setBp26ObjectCode(e.target.value)}
                              className="col-span-7 border border-[#CBD5E1] rounded-[3px] px-2.5 py-1.5 bg-white"
                            >
                              {BP26_OBJECT_OPTIONS.map((opt) => (
                                <option key={opt.code} value={opt.code}>
                                  {opt.name}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <select
                              value={bp21ObjectCode}
                              onChange={(e) => setBp21ObjectCode(e.target.value)}
                              className="col-span-7 border border-[#CBD5E1] rounded-[3px] px-2.5 py-1.5 bg-white"
                            >
                              {BP21_OBJECT_OPTIONS.map((opt) => (
                                <option key={opt.code} value={opt.code}>
                                  {opt.name}
                                </option>
                              ))}
                            </select>
                          )}
                        </div>

                        <div className="grid grid-cols-12 items-center gap-2">
                          <label className="col-span-5 text-slate-700">Jenis Pajak*</label>
                          <input
                            type="text"
                            readOnly
                            value={(calc as any).taxType || (currentSlipType === 'BPPU_23' ? 'Pasal 23' : subTab === 'bp26' ? 'Pasal 26' : 'Pasal 21')}
                            className="col-span-7 border border-[#DCE2EC] bg-[#EDF1F7] rounded-[3px] px-2.5 py-1.5"
                          />
                        </div>

                        <div className="grid grid-cols-12 items-center gap-2">
                          <label className="col-span-5 text-slate-700">Kode Objek Pajak*</label>
                          <input
                            type="text"
                            readOnly
                            value={calc.objectCode}
                            className="col-span-7 border border-[#DCE2EC] bg-[#EDF1F7] rounded-[3px] px-2.5 py-1.5 font-mono-num"
                          />
                        </div>

                        {subTab !== 'bpmp' && (
                          <div className="grid grid-cols-12 items-center gap-2">
                            <label className="col-span-5 text-slate-700">Sifat Pajak Penghasilan*</label>
                            <input
                              type="text"
                              readOnly
                              value={(calc as any).nature || 'Tidak Final'}
                              className="col-span-7 border border-[#DCE2EC] bg-[#EDF1F7] rounded-[3px] px-2.5 py-1.5"
                            />
                          </div>
                        )}

                        {currentSlipType === 'BPPU_23' && (
                          <div className="grid grid-cols-12 items-center gap-2">
                            <label className="col-span-5 text-slate-700">Kode Pembayaran IP*</label>
                            <select
                              value={paymentIp}
                              onChange={(e) => setPaymentIp(e.target.value)}
                              className="col-span-7 border border-[#CBD5E1] rounded-[3px] px-2.5 py-1.5 bg-white text-xs"
                            >
                              {UNIFIKASI_PEMBAYARAN_IP_OPTIONS.map((ip) => (
                                <option key={ip.code} value={ip.code}>
                                  {ip.name}
                                </option>
                              ))}
                            </select>
                          </div>
                        )}

                        {subTab === 'bp21' && (
                          <div className="space-y-1.5">
                            <div className="text-[11px] text-slate-600">
                              Pendapatan Bruto yang Telah Dibayar Sebelumnya (Khusus untuk Kode Objek Pajak 21-401-01 dan 21-401-02) jika terdapat pembayaran lebih dari sekali dalam periode 2 tahun
                            </div>
                            <div className="grid grid-cols-12 items-center gap-2">
                              <label className="col-span-5 text-slate-700">Jumlah</label>
                              <input
                                type="text"
                                readOnly
                                value="0"
                                className="col-span-7 text-right border border-[#DCE2EC] bg-[#EDF1F7] rounded-[3px] px-2.5 py-1.5 font-mono-num"
                              />
                            </div>
                          </div>
                        )}

                        <div className="grid grid-cols-12 items-center gap-2">
                          <label className="col-span-5 text-slate-700">
                            {currentSlipType === 'BPPU_23' ? 'Dasar Pengenaan Pajak (Rp)*' : 'Penghasilan Bruto (Rp)*'}
                          </label>
                          <input
                            type="number"
                            min={0}
                            value={grossAmount}
                            onChange={(e) => setGrossAmount(Number(e.target.value) || 0)}
                            className="col-span-7 text-right border border-[#CBD5E1] rounded-[3px] px-2.5 py-1.5 font-mono-num"
                            required
                          />
                        </div>

                        {(subTab === 'bp21' || subTab === 'bp26') && (
                          <div className="grid grid-cols-12 items-center gap-2">
                            <label className="col-span-5 text-slate-700">DPP (%)*</label>
                            <input
                              type="text"
                              readOnly
                              value={subTab === 'bp21' ? '50,00' : '100,00'}
                              className="col-span-7 text-right border border-[#DCE2EC] bg-[#EDF1F7] rounded-[3px] px-2.5 py-1.5 font-mono-num"
                            />
                          </div>
                        )}

                        <div className="grid grid-cols-12 items-center gap-2">
                          <label className="col-span-5 text-slate-700">Tarif (%)*</label>
                          <input
                            type="text"
                            readOnly
                            value={calc.ratePercent.toFixed(2).replace('.', ',')}
                            className="col-span-7 text-right border border-[#DCE2EC] bg-[#EDF1F7] rounded-[3px] px-2.5 py-1.5 font-mono-num"
                          />
                        </div>

                        <div className="grid grid-cols-12 items-center gap-2">
                          <label className="col-span-5 text-slate-700">
                            {subTab === 'bpmp' ? 'Pajak Penghasilan yang Dipotong (Rp)*' : 'Pajak Penghasilan (Rp)*'}
                          </label>
                          <input
                            type="text"
                            readOnly
                            value={calc.taxWithheld.toLocaleString('id-ID')}
                            className="col-span-7 text-right border border-[#DCE2EC] bg-[#EDF1F7] rounded-[3px] px-2.5 py-1.5 font-mono-num font-bold text-[#1E2C5E]"
                          />
                        </div>

                        <div className="grid grid-cols-12 items-center gap-2">
                          <label className="col-span-5 text-slate-700">
                            {currentSlipType === 'BPPU_23' || subTab === 'bp26' ? 'KAP*' : 'KAP-KJS*'}
                          </label>
                          <input
                            type="text"
                            readOnly
                            value={(calc as any).kap || (currentSlipType === 'BPPU_23' ? '411124-100' : '411121-100')}
                            className="col-span-7 border border-[#DCE2EC] bg-[#EDF1F7] rounded-[3px] px-2.5 py-1.5 font-mono-num"
                          />
                        </div>

                        {subTab === 'bpmp' && (
                          <div className="grid grid-cols-12 items-center gap-2">
                            <label className="col-span-5 text-slate-700">
                              NITKU/Nomor Identitas Sub Unit Organisasi*
                            </label>
                            <select className="col-span-7 border border-[#CBD5E1] rounded-[3px] px-2.5 py-1.5 bg-white">
                              <option value="000000">{workspace.corporateTaxpayer.nikNpwp}000000 — Pusat</option>
                            </select>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Section 3: Dokumen Referensi (for BP21, BP26, BPPU — PDF 2 Pages 3, 4, 16) */}
                {subTab !== 'bpmp' && currentSlipType !== 'BPA1' && (
                  <div className="border border-[#DCE2EC] rounded-[5px] overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setFormCollapsed((p) => ({ ...p, ref: !p.ref }))}
                      className="w-full flex items-center justify-between bg-[#F8FAFC] border-b border-[#E2E8F0] text-[#1E293B] px-4 py-2.5 font-semibold text-[12px] cursor-pointer"
                    >
                      <span>Dokumen Referensi</span>
                      {formCollapsed.ref ? <ChevronRight className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                    </button>
                    {!formCollapsed.ref && (
                      <div className="p-4 space-y-2.5 bg-white">
                        <div className="grid grid-cols-12 items-center gap-2">
                          <label className="col-span-5 text-slate-700">Jenis Dokumen*</label>
                          <select
                            value={refDocType}
                            onChange={(e) => setRefDocType(e.target.value)}
                            className="col-span-7 border border-[#CBD5E1] rounded-[3px] px-2.5 py-1.5 bg-white text-xs"
                          >
                            {UNIFIKASI_DOKUMEN_OPTIONS.map((d) => (
                              <option key={d.code} value={d.code}>
                                {d.name} ({d.code})
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="grid grid-cols-12 items-center gap-2">
                          <label className="col-span-5 text-slate-700">Nomor Dokumen*</label>
                          <input
                            type="text"
                            value={refDocNumber}
                            onChange={(e) => setRefDocNumber(e.target.value)}
                            className="col-span-7 border border-[#CBD5E1] rounded-[3px] px-2.5 py-1.5 font-mono-num"
                          />
                        </div>
                        <div className="grid grid-cols-12 items-center gap-2">
                          <label className="col-span-5 text-slate-700">Tanggal Dokumen*</label>
                          <input
                            type="date"
                            value={refDocDate}
                            onChange={(e) => setRefDocDate(e.target.value)}
                            className="col-span-7 border border-[#CBD5E1] rounded-[3px] px-2.5 py-1.5 font-mono-num"
                          />
                        </div>
                        <div className="grid grid-cols-12 items-center gap-2">
                          <label className="col-span-5 text-slate-700">
                            NITKU/Nomor Identitas Sub Unit Organisasi*
                          </label>
                          <select className="col-span-7 border border-[#CBD5E1] rounded-[3px] px-2.5 py-1.5 bg-white">
                            <option value="000000">{workspace.corporateTaxpayer.nikNpwp}000000 — Pusat</option>
                          </select>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Bottom-Left Action Bar matching Coretax Asli (Submit · Simpan Konsep · Go to search) */}
              <div className="px-5 py-4 bg-white border-t border-slate-100 flex items-center gap-2.5">
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-[5px] bg-[#1E2C5E] hover:bg-[#152048] text-white font-semibold text-xs cursor-pointer shadow-xs transition"
                >
                  Submit
                </button>
                <button
                  type="button"
                  onClick={() => saveSlipRecord(false)}
                  className="px-4 py-2.5 rounded-[5px] bg-[#1E2C5E] hover:bg-[#152048] text-white font-semibold text-xs leading-tight cursor-pointer text-center shadow-xs transition"
                >
                  Simpan Konsep
                </button>
                <button
                  type="button"
                  onClick={() => setCreateOpen(false)}
                  className="px-3 py-2 text-slate-600 hover:text-[#1E2C5E] font-medium text-xs leading-tight cursor-pointer text-left transition"
                >
                  Go to search
                </button>
              </div>
            </form>
          ) : (
          <div className="flex-1 min-w-0 w-full bg-white border border-[#E2E8F0] rounded-[8px] overflow-hidden">
            {submitBanner && (
              <div className="mx-5 mt-4 bg-[#D8F1FD] border border-[#9CDDFB] text-[#0E4A6B] px-4 py-2.5 rounded text-xs flex items-center justify-between gap-2">
                <span className="font-medium">{submitBanner}</span>
                <button
                  type="button"
                  onClick={() => setSubmitBanner(null)}
                  className="font-bold underline cursor-pointer shrink-0"
                >
                  Tutup
                </button>
              </div>
            )}
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
                {statusView === 'UNISSUED' && (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingSlip(null);
                        setCreateOpen(true);
                      }}
                      className="inline-flex items-center gap-1.5 bg-[#1E2C5E] hover:bg-[#16224A] text-white font-semibold text-xs px-3 py-2 rounded-[6px] transition cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>+ {activeConfig.createBtnLabel}</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleBulkDelete}
                      className={`inline-flex items-center gap-1.5 font-semibold text-xs px-3.5 py-2 rounded-[6px] transition cursor-pointer shadow-xs ${
                        selectedIds.length > 0
                          ? 'bg-[#D9534F] hover:bg-[#C9302C] text-white'
                          : 'bg-[#E2E8F0] hover:bg-[#CBD5E1] text-slate-600'
                      }`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Hapus{selectedIds.length > 0 ? ` (${selectedIds.length})` : ''}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        if (selectedIds.length === 0) {
                          alert('Pilih bukti potong terlebih dahulu untuk diterbitkan.');
                          return;
                        }
                        setSignOpen(true);
                      }}
                      className={`inline-flex items-center gap-1.5 font-semibold text-xs px-3.5 py-2 rounded-[6px] transition cursor-pointer shadow-xs ${
                        selectedIds.length > 0
                          ? 'bg-[#2F7D4A] hover:bg-[#25633A] text-white'
                          : 'bg-[#E2E8F0] hover:bg-[#CBD5E1] text-slate-600'
                      }`}
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Terbitkan{selectedIds.length > 0 ? ` (${selectedIds.length})` : ''}</span>
                    </button>
                  </>
                )}

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
                      <div className="flex justify-between">
                        <span className="text-slate-600">Tidak Valid / Batal</span>
                        <strong className="font-mono-num text-rose-700">{invalidCount}</strong>
                      </div>
                    </div>
                  )}
                </div>

                {statusView === 'ISSUED' && (
                  <button
                    type="button"
                    disabled={selectedIds.length === 0}
                    onClick={() => setCancelSignOpen(true)}
                    className="inline-flex items-center gap-1.5 bg-[#C85A5A] hover:bg-[#B24949] disabled:opacity-50 text-white font-semibold text-xs px-3.5 py-2 rounded-[6px] transition cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>Batal{selectedIds.length > 0 ? ` (${selectedIds.length})` : ''}</span>
                  </button>
                )}

                {/* Impor Data Dropdown (only on UNISSUED) */}
                {statusView === 'UNISSUED' && (
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
                )}

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
                      {statusView === 'ISSUED' && paginatedSlips.length > 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            const ids =
                              selectedIds.length > 0
                                ? selectedIds
                                : paginatedSlips.map((s) => s.id);
                            setSelectedIds(ids);
                            setBulkMenuOpen(false);
                            setCancelSignOpen(true);
                          }}
                          className="w-full text-left px-3.5 py-2 hover:bg-slate-50 font-semibold text-rose-700 cursor-pointer"
                        >
                          Batalkan Bukti Potong Terpilih
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
                  <table className="w-full text-[11px] border-collapse">
                    <thead>
                      <tr className="bg-[#FCD34D] text-[#1E293B] font-bold border-b border-[#EAB308]/40">
                        <th className="px-2.5 py-2.5 w-9 text-center border-r border-white/50 sticky left-0 bg-[#FCD34D] z-10">
                          {(statusView === 'UNISSUED' || statusView === 'ISSUED') && (
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
                        {!isBpa && (
                          <th className="px-3 py-2.5 text-center whitespace-nowrap border-r border-white/50 sticky left-9 bg-[#FCD34D] z-10 w-20" />
                        )}
                        {isBpa ? (
                          <>
                            <th className="px-3 py-2.5 text-left whitespace-nowrap border-r border-white/50">
                              <span className="inline-flex items-center gap-1">
                                {isBpa2 ? 'Masa Pajak Awal' : 'Masa Awal Periode Penghasilan'}{' '}
                                <ArrowUpDown className="w-3 h-3 opacity-60" />
                              </span>
                            </th>
                            <th className="px-3 py-2.5 text-left whitespace-nowrap border-r border-white/50">
                              <span className="inline-flex items-center gap-1">
                                {isBpa2 ? 'Masa Pajak Akhir' : 'Masa Akhir Periode Penghasilan'}{' '}
                                <ArrowUpDown className="w-3 h-3 opacity-60" />
                              </span>
                            </th>
                          </>
                        ) : (
                          <th className="px-3 py-2.5 text-left whitespace-nowrap border-r border-white/50">
                            <span className="inline-flex items-center gap-1">
                              Masa Pajak <ArrowUpDown className="w-3 h-3 opacity-60" />
                            </span>
                          </th>
                        )}
                        <th className="px-3 py-2.5 text-left whitespace-nowrap border-r border-white/50">
                          <span className="inline-flex items-center gap-1">
                            Nomor Pemotongan <ArrowUpDown className="w-3 h-3 opacity-60" />
                          </span>
                        </th>
                        <th className="px-3 py-2.5 text-left whitespace-nowrap border-r border-white/50">
                          Status
                        </th>
                        {subTab !== 'bpmp' && (
                          <th className="px-3 py-2.5 text-left whitespace-nowrap border-r border-white/50">
                            <span className="inline-flex items-center gap-1">
                              Status Tanda Tangan Elektronik <ArrowUpDown className="w-3 h-3 opacity-60" />
                            </span>
                          </th>
                        )}
                        <th className="px-3 py-2.5 text-left whitespace-nowrap border-r border-white/50">
                          <span className="inline-flex items-center gap-1">
                            NITKU/Nomor Identitas Sub Unit Organisasi <ArrowUpDown className="w-3 h-3 opacity-60" />
                          </span>
                        </th>
                        <th className="px-3 py-2.5 text-left whitespace-nowrap border-r border-white/50">
                          <span className="inline-flex items-center gap-1">
                            Jenis Pajak <ArrowUpDown className="w-3 h-3 opacity-60" />
                          </span>
                        </th>
                        <th className="px-3 py-2.5 text-left whitespace-nowrap border-r border-white/50">
                          <span className="inline-flex items-center gap-1">
                            Kode Objek Pajak {!isBpa && <ArrowUpDown className="w-3 h-3 opacity-60" />}
                          </span>
                        </th>
                        <th className="px-3 py-2.5 text-left whitespace-nowrap border-r border-white/50">
                          <span className="inline-flex items-center gap-1">
                            Nomor Identitas WP <ArrowUpDown className="w-3 h-3 opacity-60" />
                          </span>
                        </th>
                        <th className="px-3 py-2.5 text-left whitespace-nowrap border-r border-white/50">
                          <span className="inline-flex items-center gap-1">
                            Nama {!isBpa && <ArrowUpDown className="w-3 h-3 opacity-60" />}
                          </span>
                        </th>
                        <th className="px-3 py-2.5 text-right whitespace-nowrap border-r border-white/50">
                          Dasar Pengenaan Pajak (Rp)
                        </th>
                        <th className="px-3 py-2.5 text-right whitespace-nowrap border-r border-white/50">
                          Pajak Penghasilan (Rp)
                        </th>
                        {isBpa && (
                          <th className="px-3 py-2.5 text-right whitespace-nowrap border-r border-white/50">
                            Income Tax (Rp) For December/Last Period
                          </th>
                        )}
                        {subTab !== 'bpa2' && (
                          <th className="px-3 py-2.5 text-left whitespace-nowrap border-r border-white/50">
                            Fasilitas Pajak
                          </th>
                        )}
                        {statusView === 'ISSUED' && (
                          <>
                            <th className="px-3 py-2.5 text-center whitespace-nowrap border-r border-white/50">
                              Dilaporkan Dalam SPT
                            </th>
                            {subTab !== 'bpmp' && (
                              <>
                                <th className="px-3 py-2.5 text-center whitespace-nowrap border-r border-white/50">
                                  Dalam Proses Keberatan
                                </th>
                                <th className="px-3 py-2.5 text-center whitespace-nowrap border-r border-white/50">
                                  Selesai Proses Keberatan
                                </th>
                                <th className="px-3 py-2.5 text-center whitespace-nowrap border-r border-white/50">
                                  Keberatan tidak memenuhi persyaratan (Tolak Formal)
                                </th>
                                <th className="px-3 py-2.5 text-center whitespace-nowrap border-r border-white/50">
                                  Dalam Proses Reviu Pencabutan Permohonan Keberatan
                                </th>
                                <th className="px-3 py-2.5 text-center whitespace-nowrap border-r border-white/50">
                                  Pencabutan Keberatan Diterima
                                </th>
                              </>
                            )}
                            <th className="px-3 py-2.5 text-center whitespace-nowrap border-r border-white/50">
                              SPT Telah/Sedang Diperiksa
                            </th>
                            <th className="px-3 py-2.5 text-center whitespace-nowrap border-r border-white/50">
                              SPT Dalam Penanganan Hukum
                            </th>
                            {subTab === 'bppu' && (
                              <th className="px-3 py-2.5 text-center whitespace-nowrap">
                                Sedang Dalam Proses Pengembalian
                              </th>
                            )}
                          </>
                        )}
                      </tr>

                      {showFilters && (
                        <tr className="bg-white border-b border-[#E2E8F0]">
                          <th className="px-2 py-1.5 border-r border-slate-100 sticky left-0 bg-white z-10" />
                          {!isBpa && (
                            <th className="px-2 py-1.5 border-r border-slate-100 sticky left-9 bg-white z-10" />
                          )}
                          {isBpa ? (
                            <>
                              <th className="px-2 py-1.5 border-r border-slate-100">
                                <select className="w-full min-w-[155px] border border-[#CBD5E1] bg-white rounded-[4px] px-1.5 py-1 text-[10.5px] font-normal text-slate-500">
                                  <option>Pilih {isBpa2 ? 'Masa Pajak Awal' : 'Masa Awal Periode Penghasilan'}</option>
                                  {MONTHS_ID.map((m) => (
                                    <option key={m} value={m}>
                                      {m}
                                    </option>
                                  ))}
                                </select>
                              </th>
                              <th className="px-2 py-1.5 border-r border-slate-100">
                                <div className="flex items-center gap-1">
                                  <select
                                    value={periodMonthFilter}
                                    onChange={(e) => {
                                      setPeriodMonthFilter(e.target.value);
                                      setPage(1);
                                    }}
                                    className="w-full min-w-[125px] border border-[#CBD5E1] bg-white rounded-[4px] px-1.5 py-1 text-[10.5px] font-normal"
                                  >
                                    <option value="ALL">November 2026</option>
                                    {MONTHS_ID.map((m, idx) => (
                                      <option key={m} value={String(idx + 1)}>
                                        {m} 2026
                                      </option>
                                    ))}
                                  </select>
                                  <Filter className="w-3 h-3 text-slate-400 shrink-0" />
                                </div>
                              </th>
                            </>
                          ) : (
                            <th className="px-2 py-1.5 border-r border-slate-100">
                              <div className="flex items-center gap-1">
                                <select
                                  value={periodMonthFilter}
                                  onChange={(e) => {
                                    setPeriodMonthFilter(e.target.value);
                                    setPage(1);
                                  }}
                                  className="w-full min-w-[110px] border border-[#CBD5E1] bg-white rounded-[4px] px-1.5 py-1 text-[10.5px] font-normal"
                                >
                                  <option value="ALL">Semua Masa</option>
                                  {MONTHS_ID.map((m, idx) => (
                                    <option key={m} value={String(idx + 1)}>
                                      {m}
                                    </option>
                                  ))}
                                </select>
                                <Filter className="w-3 h-3 text-slate-400 shrink-0" />
                              </div>
                            </th>
                          )}
                          <th className="px-2 py-1.5 border-r border-slate-100">
                            <div className="flex items-center gap-1">
                              <input
                                type="text"
                                value={numFilter}
                                onChange={(e) => {
                                  setNumFilter(e.target.value);
                                  setPage(1);
                                }}
                                placeholder=""
                                className="w-full min-w-[100px] border border-[#CBD5E1] rounded-[4px] px-1.5 py-0.5 text-[10.5px] font-normal"
                              />
                              <Filter className="w-3 h-3 text-slate-400 shrink-0" />
                            </div>
                          </th>
                          <th className="px-2 py-1.5 border-r border-slate-100">
                            <div className="flex items-center gap-1">
                              <select className="w-full min-w-[95px] border border-[#CBD5E1] bg-white rounded-[4px] px-1 py-0.5 text-[10.5px] font-normal text-slate-500">
                                <option>Pilih Status</option>
                                <option>Disimpan Tidak Valid</option>
                                <option>Normal</option>
                              </select>
                              <Filter className="w-3 h-3 text-slate-400 shrink-0" />
                            </div>
                          </th>
                          {subTab !== 'bpmp' && (
                            <th className="px-2 py-1.5 border-r border-slate-100">
                              <div className="flex items-center gap-1">
                                <input
                                  type="text"
                                  placeholder=""
                                  className="w-full min-w-[80px] border border-[#CBD5E1] rounded-[4px] px-1.5 py-0.5 text-[10.5px] font-normal"
                                />
                                <Filter className="w-3 h-3 text-slate-400 shrink-0" />
                              </div>
                            </th>
                          )}
                          <th className="px-2 py-1.5 border-r border-slate-100">
                            <div className="flex items-center gap-1">
                              <input
                                type="text"
                                placeholder=""
                                className="w-full min-w-[120px] border border-[#CBD5E1] rounded-[4px] px-1.5 py-0.5 text-[10.5px] font-normal"
                              />
                              <Filter className="w-3 h-3 text-slate-400 shrink-0" />
                            </div>
                          </th>
                          <th className="px-2 py-1.5 border-r border-slate-100">
                            <div className="flex items-center gap-1">
                              <input
                                type="text"
                                placeholder=""
                                className="w-full min-w-[80px] border border-[#CBD5E1] rounded-[4px] px-1.5 py-0.5 text-[10.5px] font-normal"
                              />
                              <Filter className="w-3 h-3 text-slate-400 shrink-0" />
                            </div>
                          </th>
                          <th className="px-2 py-1.5 border-r border-slate-100">
                            <div className="flex items-center gap-1">
                              <input
                                type="text"
                                value={objCodeFilter}
                                onChange={(e) => {
                                  setObjCodeFilter(e.target.value);
                                  setPage(1);
                                }}
                                placeholder=""
                                className="w-full min-w-[90px] border border-[#CBD5E1] rounded-[4px] px-1.5 py-0.5 text-[10.5px] font-normal"
                              />
                              <Filter className="w-3 h-3 text-slate-400 shrink-0" />
                            </div>
                          </th>
                          <th className="px-2 py-1.5 border-r border-slate-100">
                            <div className="flex items-center gap-1">
                              <input
                                type="text"
                                value={recipientFilter}
                                onChange={(e) => {
                                  setRecipientFilter(e.target.value);
                                  setPage(1);
                                }}
                                placeholder=""
                                className="w-full min-w-[110px] border border-[#CBD5E1] rounded-[4px] px-1.5 py-0.5 text-[10.5px] font-normal"
                              />
                              <Filter className="w-3 h-3 text-slate-400 shrink-0" />
                            </div>
                          </th>
                          <th className="px-2 py-1.5 border-r border-slate-100">
                            <div className="flex items-center gap-1">
                              <input
                                type="text"
                                placeholder=""
                                className="w-full min-w-[120px] border border-[#CBD5E1] rounded-[4px] px-1.5 py-0.5 text-[10.5px] font-normal"
                              />
                              <Filter className="w-3 h-3 text-slate-400 shrink-0" />
                            </div>
                          </th>
                          <th className="px-2 py-1.5 border-r border-slate-100">
                            <div className="flex items-center gap-1">
                              <input
                                type="text"
                                placeholder=""
                                className="w-full min-w-[90px] border border-[#CBD5E1] rounded-[4px] px-1.5 py-0.5 text-[10.5px] font-normal"
                              />
                              <Filter className="w-3 h-3 text-slate-400 shrink-0" />
                            </div>
                          </th>
                          <th className="px-2 py-1.5 border-r border-slate-100">
                            <div className="flex items-center gap-1">
                              <input
                                type="text"
                                placeholder=""
                                className="w-full min-w-[90px] border border-[#CBD5E1] rounded-[4px] px-1.5 py-0.5 text-[10.5px] font-normal"
                              />
                              <Filter className="w-3 h-3 text-slate-400 shrink-0" />
                            </div>
                          </th>
                          {isBpa && (
                            <th className="px-2 py-1.5 border-r border-slate-100">
                              <div className="flex items-center gap-1">
                                <input
                                  type="text"
                                  placeholder=""
                                  className="w-full min-w-[90px] border border-[#CBD5E1] rounded-[4px] px-1.5 py-0.5 text-[10.5px] font-normal"
                                />
                                <Filter className="w-3 h-3 text-slate-400 shrink-0" />
                              </div>
                            </th>
                          )}
                          {subTab !== 'bpa2' && (
                            <th className="px-2 py-1.5 border-r border-slate-100">
                              <div className="flex items-center gap-1">
                                <select className="w-full min-w-[110px] border border-[#CBD5E1] bg-white rounded-[4px] px-1 py-0.5 text-[10.5px] font-normal text-slate-500">
                                  <option>Pilih Fasilitas Pajak</option>
                                  <option>Tanpa Fasilitas</option>
                                </select>
                                <Filter className="w-3 h-3 text-slate-400 shrink-0" />
                              </div>
                            </th>
                          )}
                          {statusView === 'ISSUED' && (
                            isBpa ? (
                              <>
                                <th className="px-2 py-1.5 border-r border-slate-100">
                                  <select className="w-full min-w-[120px] border border-[#CBD5E1] bg-white rounded-[4px] px-1 py-0.5 text-[10.5px] font-normal text-slate-500">
                                    <option>Pilih Dilaporkan Dalam SPT</option>
                                    <option>True</option>
                                    <option>False</option>
                                  </select>
                                </th>
                                <th className="px-2 py-1.5 border-r border-slate-100">
                                  <select className="w-full min-w-[120px] border border-[#CBD5E1] bg-white rounded-[4px] px-1 py-0.5 text-[10.5px] font-normal text-slate-500">
                                    <option>Pilih Dalam Proses Keberatan</option>
                                    <option>True</option>
                                    <option>False</option>
                                  </select>
                                </th>
                                <th className="px-2 py-1.5 border-r border-slate-100">
                                  <select className="w-full min-w-[120px] border border-[#CBD5E1] bg-white rounded-[4px] px-1 py-0.5 text-[10.5px] font-normal text-slate-500">
                                    <option>Pilih Selesai Proses Keberatan</option>
                                    <option>True</option>
                                    <option>False</option>
                                  </select>
                                </th>
                                <th className="px-2 py-1.5 border-r border-slate-100">
                                  <select className="w-full min-w-[150px] border border-[#CBD5E1] bg-white rounded-[4px] px-1 py-0.5 text-[10.5px] font-normal text-slate-500">
                                    <option>Pilih Keberatan tidak memenuhi persyaratan (Tolak Formal)</option>
                                    <option>True</option>
                                    <option>False</option>
                                  </select>
                                </th>
                                <th className="px-2 py-1.5 border-r border-slate-100">
                                  <select className="w-full min-w-[160px] border border-[#CBD5E1] bg-white rounded-[4px] px-1 py-0.5 text-[10.5px] font-normal text-slate-500">
                                    <option>Pilih Dalam Proses Reviu Pencabutan Permohonan Keberatan</option>
                                    <option>True</option>
                                    <option>False</option>
                                  </select>
                                </th>
                                <th className="px-2 py-1.5 border-r border-slate-100">
                                  <select className="w-full min-w-[140px] border border-[#CBD5E1] bg-white rounded-[4px] px-1 py-0.5 text-[10.5px] font-normal text-slate-500">
                                    <option>Pilih Pencabutan Keberatan Diterima</option>
                                    <option>True</option>
                                    <option>False</option>
                                  </select>
                                </th>
                                <th className="px-2 py-1.5 border-r border-slate-100">
                                  <div className="flex items-center gap-1">
                                    <input
                                      type="text"
                                      placeholder=""
                                      className="w-full min-w-[80px] border border-[#CBD5E1] rounded-[4px] px-1.5 py-0.5 text-[10.5px] font-normal"
                                    />
                                    <Filter className="w-3 h-3 text-slate-400 shrink-0" />
                                  </div>
                                </th>
                                <th className="px-2 py-1.5 border-r border-slate-100">
                                  <div className="flex items-center gap-1">
                                    <input
                                      type="text"
                                      placeholder=""
                                      className="w-full min-w-[80px] border border-[#CBD5E1] rounded-[4px] px-1.5 py-0.5 text-[10.5px] font-normal"
                                    />
                                    <Filter className="w-3 h-3 text-slate-400 shrink-0" />
                                  </div>
                                </th>
                              </>
                            ) : (
                              <th colSpan={subTab === 'bpmp' ? 3 : subTab === 'bppu' ? 9 : 8} className="px-2 py-1.5" />
                            )
                          )}
                        </tr>
                      )}
                    </thead>
                    <tbody className="divide-y divide-[#EEF2F6] bg-white">
                      {paginatedSlips.length === 0 ? (
                        <tr>
                          <td colSpan={24} className="px-4 py-8 text-left text-slate-500">
                            Tidak ada data yang ditemukan.
                          </td>
                        </tr>
                      ) : (
                        paginatedSlips.map((slip) => {
                          const isIssued = slip.status === 'ISSUED';
                          const statusText =
                            slip.status === 'UNISSUED'
                              ? 'Disimpan Tidak Valid'
                              : slip.status === 'CANCELLED'
                                ? 'Dibatalkan'
                                : 'Normal';
                          const tteStatus = isIssued ? 'Done' : '';
                          const nitkuVal =
                            slip.nitku ||
                            (subTab === 'bpmp'
                              ? '0753620525008000000000'
                              : '0905774188403000000000');
                          const jenisPajakVal =
                            slip.taxType ||
                            (subTab === 'bppu'
                              ? 'Pasal 23'
                              : subTab === 'bp21' || subTab === 'bpmp'
                                ? 'Pasal 21'
                                : 'Pasal 23');
                          const fasilitasVal = slip.taxFacility || 'Tanpa Fasilitas';

                          return (
                            <tr
                              key={slip.id}
                              onDoubleClick={() => setDetailSlip(slip)}
                              className="hover:bg-[#F8FAFC] cursor-pointer"
                              title="Klik ganda untuk melihat detail Bukti Potong"
                            >
                              <td className="px-2.5 py-2.5 text-center sticky left-0 bg-white">
                                {(statusView === 'UNISSUED' || statusView === 'ISSUED') && (
                                  <input
                                    type="checkbox"
                                    checked={selectedIds.includes(slip.id)}
                                    onChange={() => toggleSelect(slip.id)}
                                  />
                                )}
                              </td>
                              {!isBpa && (
                                <td className="px-3 py-2.5 whitespace-nowrap sticky left-9 bg-white">
                                  <div className="flex items-center justify-center gap-1.5">
                                    <button
                                      type="button"
                                      onClick={() => setDetailSlip(slip)}
                                      className="p-1 rounded text-sky-600 hover:text-sky-800 hover:bg-sky-50 cursor-pointer transition"
                                      title="Lihat Detail Bukti Potong"
                                    >
                                      <Eye className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        slip.status === 'UNISSUED'
                                          ? openEditForm(slip)
                                          : setDetailSlip(slip)
                                      }
                                      className="p-1 rounded text-sky-600 hover:text-sky-800 hover:bg-sky-50 cursor-pointer transition"
                                      title={
                                        slip.status === 'UNISSUED'
                                          ? 'Edit Konsep Bukti Potong'
                                          : 'Edit / Pembetulan'
                                      }
                                    >
                                      <Edit3 className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => downloadBuktiPotongPdf(slip, workspace.corporateTaxpayer)}
                                      className="w-5 h-5 rounded-[3px] bg-[#A83232] hover:bg-[#8B2626] text-white inline-flex items-center justify-center cursor-pointer transition shadow-xs"
                                      title="Download Bukti Potong (PDF Resmi DJP)"
                                    >
                                      <FileText className="w-3 h-3" />
                                    </button>
                                  </div>
                                </td>
                              )}
                              {isBpa ? (
                                <>
                                  <td className="px-3 py-2.5 whitespace-nowrap">Januari</td>
                                  <td className="px-3 py-2.5 whitespace-nowrap">
                                    {MONTHS_ID[Math.max(0, slip.taxPeriodMonth - 1)]} {slip.taxPeriodYear}
                                  </td>
                                </>
                              ) : (
                                <td className="px-3 py-2.5 whitespace-nowrap">
                                  {MONTHS_ID[Math.max(0, slip.taxPeriodMonth - 1)]} {slip.taxPeriodYear}
                                </td>
                              )}
                              <td className="px-3 py-2.5 font-mono-num font-bold text-[#1E2C5E] whitespace-nowrap">
                                {slip.status === 'UNISSUED' ? '' : slip.slipNumber}
                              </td>
                              <td className="px-3 py-2.5 whitespace-nowrap">
                                <span
                                  className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                                    isIssued
                                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                      : slip.status === 'CANCELLED'
                                        ? 'bg-rose-50 text-rose-800 border-rose-200'
                                        : 'bg-amber-50 text-amber-800 border-amber-200'
                                  }`}
                                >
                                  {statusText}
                                </span>
                              </td>
                              {subTab !== 'bpmp' && (
                                <td className="px-3 py-2.5 text-slate-700 whitespace-nowrap">
                                  {tteStatus}
                                </td>
                              )}
                              <td className="px-3 py-2.5 font-mono-num text-slate-700 whitespace-nowrap">
                                {nitkuVal}
                              </td>
                              <td className="px-3 py-2.5 text-slate-700 whitespace-nowrap">
                                {jenisPajakVal}
                              </td>
                              <td className="px-3 py-2.5 font-mono-num text-[#1E2C5E] whitespace-nowrap font-semibold">
                                {slip.objectCode}
                              </td>
                              <td className="px-3 py-2.5 font-mono-num text-slate-700 whitespace-nowrap">
                                {slip.recipientNikNpwp}
                              </td>
                              <td className="px-3 py-2.5 font-semibold text-slate-800 whitespace-nowrap">
                                {slip.recipientName}
                              </td>
                              <td className="px-3 py-2.5 text-right font-mono-num text-slate-800 whitespace-nowrap">
                                {formatRp(slip.grossAmount)}
                              </td>
                              <td className="px-3 py-2.5 text-right font-mono-num font-bold text-[#1E2C5E] whitespace-nowrap">
                                {formatRp(slip.taxWithheld)}
                              </td>
                              {isBpa && (
                                <td className="px-3 py-2.5 text-right font-mono-num text-[#1E2C5E] whitespace-nowrap">
                                  {formatRp(slip.decemberTaxWithheld ?? Math.round(slip.taxWithheld / 12))}
                                </td>
                              )}
                              {subTab !== 'bpa2' && (
                                <td className="px-3 py-2.5 text-slate-700 whitespace-nowrap">
                                  {fasilitasVal}
                                </td>
                              )}
                              {statusView === 'ISSUED' && (
                                <>
                                  <td className="px-3 py-2.5 text-center whitespace-nowrap font-mono-num">
                                    {slip.reportedInSpt ? 'True' : 'False'}
                                  </td>
                                  {subTab !== 'bpmp' && (
                                    <>
                                      <td className="px-3 py-2.5 text-center whitespace-nowrap font-mono-num">
                                        {slip.inObjectionProcess ? 'True' : 'False'}
                                      </td>
                                      <td className="px-3 py-2.5 text-center whitespace-nowrap font-mono-num">
                                        {slip.objectionCompleted ? 'True' : 'False'}
                                      </td>
                                      <td className="px-3 py-2.5 text-center whitespace-nowrap font-mono-num">
                                        {slip.objectionRejectedFormal ? 'True' : 'False'}
                                      </td>
                                      <td className="px-3 py-2.5 text-center whitespace-nowrap font-mono-num">
                                        {slip.inObjectionRevocationReview ? 'True' : 'False'}
                                      </td>
                                      <td className="px-3 py-2.5 text-center whitespace-nowrap font-mono-num">
                                        {slip.objectionRevocationAccepted ? 'True' : 'False'}
                                      </td>
                                    </>
                                  )}
                                  <td className="px-3 py-2.5 text-center whitespace-nowrap font-mono-num">
                                    {slip.sptExamined ? 'True' : 'False'}
                                  </td>
                                  <td className="px-3 py-2.5 text-center whitespace-nowrap font-mono-num">
                                    {slip.sptLegalHandling ? 'True' : 'False'}
                                  </td>
                                  {subTab === 'bppu' && (
                                    <td className="px-3 py-2.5 text-center whitespace-nowrap font-mono-num">
                                      {slip.inRefundProcess ? 'True' : 'False'}
                                    </td>
                                  )}
                                </>
                              )}
                            </tr>
                          );
                        })
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
          )}
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

      {/* Batch Cancel Electronic Signing Modal */}
      <SignModal
        open={cancelSignOpen}
        title="Batalkan Bukti Potong e-Bupot"
        description={`Anda akan membatalkan ${selectedIds.length} Bukti Potong yang telah terbit. Dokumen yang dibatalkan akan berpindah ke daftar Tidak Valid.`}
        signerName={activeTaxpayer.name}
        signerNik={activeTaxpayer.nikNpwp}
        confirmLabel="Konfirmasi Pembatalan"
        onClose={() => setCancelSignOpen(false)}
        onConfirm={async () => {
          if (onCancelSlips) {
            await onCancelSlips(selectedIds);
          }
          setSelectedIds([]);
          setCancelSignOpen(false);
          setSubmitBanner('Bukti Potong terpilih berhasil dibatalkan.');
        }}
      />
    </div>
  );
};
