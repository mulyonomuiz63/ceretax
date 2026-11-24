import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Award,
  Bell,
  BookOpen,
  Building2,
  Check,
  CheckCheck,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronsLeft,
  CreditCard,
  FileSpreadsheet,
  FileText,
  HelpCircle,
  Home,
  LogOut,
  Moon,
  PanelTop,
  Receipt,
  Search,
  ShieldUser,
  Sun,
  User,
  UserCircle2,
  X,
} from 'lucide-react';
import { KelasBrevetLogo } from './KelasBrevetLogo.tsx';
import { NotificationItem, Taxpayer } from '../types/tax.ts';

export type MainNavKey = 'portal' | 'efaktur' | 'ebupot' | 'spt' | 'pembayaran' | 'bukubesar';

interface CoretaxShellProps {
  activeModule: MainNavKey;
  activeSubTab: string;
  onNavigate: (module: MainNavKey, subTab?: string) => void;
  individualTaxpayer: Taxpayer;
  corporateTaxpayer: Taxpayer;
  accountMode: 'INDIVIDUAL' | 'CORPORATE';
  onSwitchAccountMode: (mode: 'INDIVIDUAL' | 'CORPORATE') => void;
  notifications: NotificationItem[];
  onMarkAllNotificationsRead: () => void;
  onOpenExamDrawer: () => void;
  language: 'id-ID' | 'en-US';
  onLanguageChange: (lang: 'id-ID' | 'en-US') => void;
  onLogout: () => void;
  children: React.ReactNode;
}

interface NavItemDef {
  id: string;
  label: string;
  breadcrumbLabel?: string;
}

interface NavGroupDef {
  groupLabel: string;
  items: NavItemDef[];
}

const NAV_CONFIG: Array<{
  key: MainNavKey;
  label: string;
  sidebarLabel: string;
  popoverTitle: string;
  hasChevron: boolean;
  icon: React.FC<{ className?: string }>;
  items: NavItemDef[];
  groups?: NavGroupDef[];
}> = [
  {
    key: 'portal',
    label: 'Portal Saya',
    sidebarLabel: 'Portal Saya',
    popoverTitle: 'PORTAL SAYA',
    hasChevron: true,
    icon: ShieldUser,
    items: [
      { id: 'dokumen', label: 'Dokumen Saya' },
      { id: 'notifikasi', label: 'Notifikasi Saya' },
      { id: 'kasus', label: 'Kasus Saya' },
      { id: 'kasus_berjalan', label: 'Kasus Berjalan Saya' },
      { id: 'profil', label: 'Profil Saya' },
      { id: 'aktivasi_spln', label: 'Aktivasi WP SPLN' },
      { id: 'kode_otorisasi', label: 'Permintaan Kode Otorisasi/Sertifikat' },
      { id: 'pengukuhan_pkp', label: 'Pengukuhan PKP' },
      { id: 'pbb_p5l', label: 'Pendaftaran Objek Pajak PBB P5L' },
      { id: 'penghapusan', label: 'Penghapusan & Pencabutan' },
    ],
    groups: [
      {
        groupLabel: 'Perubahan Data',
        items: [
          { id: 'perubahan_identitas', label: 'Identitas Wajib Pajak' },
          { id: 'perubahan_alamat', label: 'Perubahan Alamat Utama' },
          { id: 'perubahan_pbb', label: 'Perubahan Data Objek Pajak PBB P5L' },
          { id: 'perubahan_pmse', label: 'Perubahan Data Pemungut PPN PMSE' },
        ],
      },
      {
        groupLabel: 'Perubahan Status',
        items: [
          { id: 'status_nonaktif', label: 'Penetapan Wajib Pajak Nonaktif' },
          { id: 'status_aktif_kembali', label: 'Pengaktifan Kembali Wajib Pajak Nonaktif' },
          { id: 'status_kuasa', label: 'Penunjukan Wakil/Kuasa' },
          { id: 'status_cabut_kuasa', label: 'Pencabutan Wakil/Kuasa' },
        ],
      },
    ],
  },
  {
    key: 'efaktur',
    label: 'e-Faktur',
    sidebarLabel: 'e-Faktur',
    popoverTitle: 'E-FAKTUR',
    hasChevron: false,
    icon: Receipt,
    items: [],
  },
  {
    key: 'ebupot',
    label: 'eBUPOT',
    sidebarLabel: 'eBupot',
    popoverTitle: 'EBUPOT',
    hasChevron: true,
    icon: FileSpreadsheet,
    items: [
      { id: 'bukti_potong_saya', label: 'Bukti Potong Saya' },
      { id: 'bppu', label: 'BPPU' },
      { id: 'bpnr', label: 'BPNR' },
      { id: 'penyetoran_sendiri', label: 'Penyetoran Sendiri' },
      { id: 'digunggung', label: 'Pemotongan Secara Digunggung' },
      { id: 'dokumen_dipersamakan', label: 'Dokumen yang Dipersamakan dengan Bukti Pemotongan' },
      { id: 'bp21', label: 'BP 21 - Bukti Pemotongan Selain Pegawai Tetap' },
      { id: 'bp26', label: 'BP 26 - Bukti Pemotongan Wajib Pajak Luar Negeri' },
      { id: 'bpa1', label: 'BP A1 - Bukti Pemotongan A1 Masa Pajak Terakhir' },
      { id: 'bpa2', label: 'BP A2 - Bukti Pemotongan A2 Masa Pajak Terakhir' },
      { id: 'bpmp', label: 'Bukti Pemotongan Bulanan Pegawai Tetap' },
    ],
  },
  {
    key: 'spt',
    label: 'SPT',
    sidebarLabel: 'Surat Pemberitahuan (SPT)',
    popoverTitle: 'SURAT PEMBERITAHUAN (SPT)',
    hasChevron: true,
    icon: FileText,
    items: [
      { id: 'konsep', label: 'Surat Pemberitahuan (SPT)', breadcrumbLabel: 'Surat Pemberitahuan (SPT)' },
      { id: 'pencatatan', label: 'Pencatatan', breadcrumbLabel: 'Pencatatan' },
      { id: 'dasbor_kompensasi', label: 'Dasbor Kompensasi', breadcrumbLabel: 'Dasbor Kompensasi' },
      { id: 'pengungkapan', label: 'Pengungkapan Ketidakbenaran SPT', breadcrumbLabel: 'Pengungkapan Ketidakbenaran SPT' },
    ],
  },
  {
    key: 'pembayaran',
    label: 'Pembayaran',
    sidebarLabel: 'Pembayaran',
    popoverTitle: 'PEMBAYARAN',
    hasChevron: true,
    icon: CreditCard,
    items: [
      { id: 'pemindahbukuan', label: 'Permohonan Pemindahbukuan' },
      { id: 'buat', label: 'Layanan Mandiri Kode Billing' },
      { id: 'tagihan', label: 'Pembuatan Kode Billing atas Tagihan Pajak' },
      { id: 'daftar', label: 'Daftar Kode Billing Belum Dibayar' },
      { id: 'restitusi', label: 'Formulir Restitusi Pajak' },
      { id: 'imbalan_bunga', label: 'Permohonan Pemberian Imbalan Bunga' },
      { id: 'pph_dtp', label: 'Permohonan PPh DTP atas Penghasilan' },
      { id: 'deposit', label: 'Deposit Pajak' },
    ],
  },
  {
    key: 'bukubesar',
    label: 'Buku Besar',
    sidebarLabel: 'Buku Besar',
    popoverTitle: 'BUKU BESAR',
    hasChevron: false,
    icon: BookOpen,
    items: [],
  },
];

const EXTRA_TOP_MENUS: Array<{
  key: 'layanan_wp' | 'manajemen_akses';
  label: string;
  popoverTitle: string;
  items: Array<{ label: string; targetModule: MainNavKey; targetSubTab: string }>;
}> = [
  {
    key: 'layanan_wp',
    label: 'Layanan WP',
    popoverTitle: 'LAYANAN WAJIB PAJAK',
    items: [
      { label: 'Layanan Administrasi Perpajakan', targetModule: 'portal', targetSubTab: 'kasus' },
      { label: 'Pemberitahuan Penggunaan NPPN / Stelsel Kas', targetModule: 'portal', targetSubTab: 'kasus_berjalan' },
      { label: 'Permohonan Surat Keterangan Fiskal (SKF)', targetModule: 'portal', targetSubTab: 'dokumen' },
      { label: 'Layanan Edukasi & Bantuan Coretax', targetModule: 'portal', targetSubTab: 'ikhtisar' },
    ],
  },
  {
    key: 'manajemen_akses',
    label: 'Manajemen Akses',
    popoverTitle: 'MANAJEMEN AKSES',
    items: [
      { label: 'Wakil / Kuasa Saya (Impersonating)', targetModule: 'portal', targetSubTab: 'status_kuasa' },
      { label: 'Pencabutan Wakil / Kuasa', targetModule: 'portal', targetSubTab: 'status_cabut_kuasa' },
      { label: 'Permintaan Kode Otorisasi / Sertifikat', targetModule: 'portal', targetSubTab: 'kode_otorisasi' },
    ],
  },
];

const EFAKTUR_BREADCRUMB_MAP: Record<string, string> = {
  dashboard: 'Dasbor e-Faktur',
  output: 'Pajak Keluaran',
  input: 'Pajak Masukan',
  retur_keluaran: 'Retur Pajak Keluaran',
  retur_masukan: 'Retur Pajak Masukan',
  dok_lain_keluaran: 'Dokumen Lain Keluaran',
  dok_lain_masukan: 'Dokumen Lain Masukan',
  retur_dok_lain_keluaran: 'Retur Dokumen Lain Keluaran',
  retur_dok_lain_masukan: 'Retur Dokumen Lain Masukan',
};

const QUICK_SERVICES = [
  { label: 'Portal Saya — Beranda / Ikhtisar', module: 'portal' as MainNavKey, subTab: 'ikhtisar' },
  { label: 'Portal Saya — Dokumen Saya (BPA1 & BPE)', module: 'portal' as MainNavKey, subTab: 'dokumen' },
  { label: 'Portal Saya — Profil Saya', module: 'portal' as MainNavKey, subTab: 'profil' },
  { label: 'Portal Saya — Permintaan Kode Otorisasi/Sertifikat', module: 'portal' as MainNavKey, subTab: 'kode_otorisasi' },
  { label: 'e-Faktur — Dashboard', module: 'efaktur' as MainNavKey, subTab: 'dashboard' },
  { label: 'e-Faktur — Pajak Keluaran', module: 'efaktur' as MainNavKey, subTab: 'output' },
  { label: 'e-Faktur — Pajak Masukan', module: 'efaktur' as MainNavKey, subTab: 'input' },
  { label: 'e-Faktur — Retur Pajak Keluaran', module: 'efaktur' as MainNavKey, subTab: 'retur_keluaran' },
  { label: 'e-Faktur — Retur Pajak Masukan', module: 'efaktur' as MainNavKey, subTab: 'retur_masukan' },
  { label: 'e-Faktur — Dokumen Lain Pajak Keluaran', module: 'efaktur' as MainNavKey, subTab: 'dok_lain_keluaran' },
  { label: 'eBupot — Bukti Potong Saya', module: 'ebupot' as MainNavKey, subTab: 'bukti_potong_saya' },
  { label: 'eBupot — BPPU (PPh 23 Unifikasi)', module: 'ebupot' as MainNavKey, subTab: 'bppu' },
  { label: 'eBupot — BP 21 – Bukti Pemotongan Selain Pegawai Tetap', module: 'ebupot' as MainNavKey, subTab: 'bp21' },
  { label: 'eBupot — BP A1 – Bukti Pemotongan A1 Masa Pajak Terakhir', module: 'ebupot' as MainNavKey, subTab: 'bpa1' },
  { label: 'eBupot — Bukti Pemotongan Bulanan Pegawai Tetap (BPMP)', module: 'ebupot' as MainNavKey, subTab: 'bpmp' },
  { label: 'eBupot — Impor Data (XML)', module: 'ebupot' as MainNavKey, subTab: 'xml' },
  { label: 'Surat Pemberitahuan (SPT) — Konsep SPT', module: 'spt' as MainNavKey, subTab: 'konsep' },
  { label: 'Surat Pemberitahuan (SPT) — SPT Menunggu Pembayaran', module: 'spt' as MainNavKey, subTab: 'menunggu' },
  { label: 'Surat Pemberitahuan (SPT) — SPT Dilaporkan', module: 'spt' as MainNavKey, subTab: 'dilaporkan' },
  { label: 'Pembayaran — Permohonan Pemindahbukuan', module: 'pembayaran' as MainNavKey, subTab: 'pemindahbukuan' },
  { label: 'Pembayaran — Layanan Mandiri Kode Billing', module: 'pembayaran' as MainNavKey, subTab: 'buat' },
  { label: 'Pembayaran — Daftar Kode Billing Belum Dibayar', module: 'pembayaran' as MainNavKey, subTab: 'daftar' },
  { label: 'Pembayaran — Deposit Pajak', module: 'pembayaran' as MainNavKey, subTab: 'deposit' },
  { label: 'Buku Besar — Buku Besar Saya', module: 'bukubesar' as MainNavKey, subTab: 'ringkasan' },
];

const FlagMini: React.FC<{ lang: 'id-ID' | 'en-US' }> = ({ lang }) => {
  if (lang === 'en-US') {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" className="rounded-full shrink-0 border border-slate-200">
        <circle cx="12" cy="12" r="12" fill="#1E3A8A" />
        <path d="M0 10H24V14H0V10ZM10 0H14V24H10V0Z" fill="#FFFFFF" />
        <path d="M0 11H24V13H0V11ZM11 0H13V24H11V0Z" fill="#DC2626" />
      </svg>
    );
  }
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" className="rounded-full shrink-0 border border-slate-200">
      <clipPath id="coretaxPortalFlag">
        <circle cx="12" cy="12" r="12" />
      </clipPath>
      <g clipPath="url(#coretaxPortalFlag)">
        <rect x="0" y="0" width="24" height="12" fill="#DC2626" />
        <rect x="0" y="12" width="24" height="12" fill="#FFFFFF" />
      </g>
    </svg>
  );
};

/** Clean Navy badge icon matching the official Coretax horizontal nav bar with two-tone gold branding */
const ModuleBadgeIcon: React.FC<{ moduleKey?: string; icon?: React.FC<{ className?: string }> }> = ({
  moduleKey,
  icon: Icon,
}) => (
  <span className="relative inline-flex items-center justify-center w-5 h-5 shrink-0">
    {moduleKey ? (
      <MobileDuotoneModuleIcon moduleKey={moduleKey} active={true} />
    ) : Icon ? (
      <Icon className="w-[17px] h-[17px] text-[#1E2C5E]" />
    ) : null}
  </span>
);

/** Official Coretax Mobile & Desktop Duotone Navy + Gold (Kuning) Module Icon */
const MobileDuotoneModuleIcon: React.FC<{
  moduleKey: string;
  active?: boolean;
}> = ({ moduleKey, active = false }) => {
  const baseColor = active ? '#163A6B' : '#8C9BB5';
  const goldColor = '#F59E0B';

  switch (moduleKey) {
    case 'portal':
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="shrink-0">
          <path
            d="M12 2.5L4.5 5.8V11.6C4.5 16.6 7.7 21.1 12 22.5C16.3 21.1 19.5 16.6 19.5 11.6V5.8L12 2.5Z"
            fill={baseColor}
          />
          <circle cx="12" cy="10" r="2.6" fill={goldColor} />
          <path
            d="M8 16.8C8.6 14.7 10.1 13.7 12 13.7C13.9 13.7 15.4 14.7 16 16.8"
            stroke={goldColor}
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      );
    case 'efaktur':
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="shrink-0">
          <circle cx="12" cy="12" r="8.5" fill={goldColor} />
          <path
            d="M6 5h6.5a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z"
            fill={baseColor}
          />
          <path d="M7 8.5h4M7 12h4M7 15h2.5" stroke={goldColor} strokeWidth="1.4" strokeLinecap="round" />
          <circle cx="15.5" cy="14" r="3.5" fill="#FACC15" stroke={baseColor} strokeWidth="1" />
          <text x="15.5" y="15.8" textAnchor="middle" fontSize="4.8" fontWeight="bold" fill={baseColor}>Rp</text>
        </svg>
      );
    case 'ebupot':
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="shrink-0">
          <path
            d="M5 4a2 2 0 0 1 2-2h7l6 6v12a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V4z"
            fill={baseColor}
          />
          <path d="M14 2v4a2 2 0 0 0 2 2h4" fill={goldColor} />
          <rect x="8" y="10" width="5" height="1.8" rx="0.5" fill={goldColor} />
          <rect x="8" y="13.5" width="7" height="1.8" rx="0.5" fill={goldColor} />
          <rect x="8" y="17" width="4" height="1.8" rx="0.5" fill={goldColor} />
          <circle cx="16" cy="15.5" r="3.2" fill={goldColor} />
          <path d="M14.8 15.5l1 1 1.8-1.8" stroke={baseColor} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case 'spt':
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="shrink-0">
          <path
            d="M6 3.5C6 2.67 6.67 2 7.5 2H14.5L19 6.5V20.5C19 21.33 18.33 22 17.5 22H7.5C6.67 22 6 21.33 6 20.5V3.5Z"
            fill={baseColor}
          />
          <path d="M14.5 2V6.5H19L14.5 2Z" fill={goldColor} />
          <rect x="8.5" y="10" width="7" height="1.8" rx="0.9" fill="#FFFFFF" />
          <rect x="8.5" y="13.5" width="7" height="1.8" rx="0.9" fill={goldColor} />
          <rect x="8.5" y="17" width="4.5" height="1.8" rx="0.9" fill={goldColor} />
        </svg>
      );
    case 'pembayaran':
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="shrink-0">
          <rect x="2.5" y="5" width="19" height="14" rx="2.5" fill={baseColor} />
          <rect x="2.5" y="8" width="19" height="2.6" fill={goldColor} />
          <rect x="5.5" y="13" width="4.5" height="3.5" rx="0.8" fill={goldColor} />
          <circle cx="16.5" cy="14.8" r="2" fill={goldColor} />
        </svg>
      );
    case 'bukubesar':
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="shrink-0">
          <path
            d="M5 4a2 2 0 0 1 2-2h12v17a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V4z"
            fill={baseColor}
          />
          <path
            d="M5 4a2 2 0 0 1 2-2v19a2 2 0 0 1-2-2V4z"
            fill="#0F172A"
          />
          <path d="M12 2v7.5l2-1.8 2 1.8V2h-4z" fill={goldColor} />
          <line x1="8.5" y1="13.5" x2="15.5" y2="13.5" stroke={goldColor} strokeWidth="1.5" strokeLinecap="round" />
          <line x1="8.5" y1="16.5" x2="13.5" y2="16.5" stroke={goldColor} strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      );
    case 'layanan_wp':
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="shrink-0">
          <rect x="4" y="4" width="7" height="7" rx="1.5" fill={baseColor} />
          <rect x="13" y="4" width="7" height="7" rx="1.5" fill={goldColor} />
          <rect x="4" y="13" width="7" height="7" rx="1.5" fill={goldColor} />
          <rect x="13" y="13" width="7" height="7" rx="1.5" fill={baseColor} />
        </svg>
      );
    case 'manajemen_akses':
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="shrink-0">
          <rect x="3" y="4" width="18" height="16" rx="3" fill={baseColor} />
          <circle cx="10" cy="10" r="2.8" fill={goldColor} />
          <path d="M6 16.5c0-2 1.8-3.5 4-3.5s4 1.5 4 3.5" stroke={goldColor} strokeWidth="1.4" strokeLinecap="round" />
          <circle cx="16.5" cy="11" r="1.5" fill={goldColor} />
          <path d="M16.5 12.5v3.5m0-1.5h1.2" stroke={goldColor} strokeWidth="1.2" strokeLinecap="round" />
        </svg>
      );
    default:
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="shrink-0">
          <path
            d="M12 2.5L4.5 5.8V11.6C4.5 16.6 7.7 21.1 12 22.5C16.3 21.1 19.5 16.6 19.5 11.6V5.8L12 2.5Z"
            fill={baseColor}
          />
          <circle cx="12" cy="11.5" r="3.2" fill={goldColor} />
        </svg>
      );
  }
};

export const CoretaxShell: React.FC<CoretaxShellProps> = ({
  activeModule,
  activeSubTab,
  onNavigate,
  individualTaxpayer,
  corporateTaxpayer,
  accountMode,
  onSwitchAccountMode,
  notifications,
  onMarkAllNotificationsRead,
  onOpenExamDrawer,
  language,
  onLanguageChange,
  onLogout,
  children,
}) => {
  const [darkHeader, setDarkHeader] = useState(false);
  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [autoHideOnScroll, setAutoHideOnScroll] = useState(false);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    'Perubahan Data': true,
    'Perubahan Status': true,
  });

  const [openDropdown, setOpenDropdown] = useState<MainNavKey | null>(null);
  const [openExtraDropdown, setOpenExtraDropdown] = useState<'layanan_wp' | 'manajemen_akses' | null>(null);
  const [notifOpen, setNotifOpen] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [langMenuOpen, setLangMenuOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [compactSearchOpen, setCompactSearchOpen] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);

  const shellRef = useRef<HTMLDivElement>(null);
  const navScrollRef = useRef<HTMLDivElement>(null);
  const [navPopoverAnchor, setNavPopoverAnchor] = useState<{
    type: 'nav' | 'extra';
    key: string;
    top: number;
    left: number;
    title: string;
    items: { id?: string; label: string; targetModule?: MainNavKey; targetSubTab?: string }[];
  } | null>(null);
  const navPopoverTimer = useRef<any>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const compactSearchInputRef = useRef<HTMLInputElement>(null);
  const lastScrollYRef = useRef(0);
  const [canScrollNav, setCanScrollNav] = useState({ left: false, right: false, needed: false });

  const checkNavScroll = useCallback(() => {
    const el = navScrollRef.current;
    if (!el) return;
    const needed = el.scrollWidth > el.clientWidth + 2;
    const left = needed && el.scrollLeft > 2;
    const right = needed && el.scrollLeft < el.scrollWidth - el.clientWidth - 2;
    setCanScrollNav({ left, right, needed });
  }, []);

  useEffect(() => {
    checkNavScroll();
    const el = navScrollRef.current;
    if (!el) return;
    const handleScroll = () => checkNavScroll();
    el.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', checkNavScroll);
    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(() => checkNavScroll());
      ro.observe(el);
    }
    return () => {
      el.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', checkNavScroll);
      if (ro) ro.disconnect();
    };
  }, [checkNavScroll]);

  const handleNavOpen = (
    type: 'nav' | 'extra',
    key: any,
    targetEl: HTMLElement,
    title: string,
    items: any[]
  ) => {
    if (navPopoverTimer.current) clearTimeout(navPopoverTimer.current);
    const rect = targetEl.getBoundingClientRect();
    if (type === 'nav') {
      setOpenDropdown(key);
      setOpenExtraDropdown(null);
    } else {
      setOpenExtraDropdown(key);
      setOpenDropdown(null);
    }
    const clampedLeft = Math.max(16, Math.min(rect.left, window.innerWidth - 360));
    setNavPopoverAnchor({
      type,
      key,
      top: rect.bottom + 4,
      left: clampedLeft,
      title,
      items,
    });
  };

  const handleNavCloseDebounced = () => {
    if (navPopoverTimer.current) clearTimeout(navPopoverTimer.current);
    navPopoverTimer.current = setTimeout(() => {
      setOpenDropdown(null);
      setOpenExtraDropdown(null);
      setNavPopoverAnchor(null);
    }, 150);
  };

  const handleNavKeepOpen = () => {
    if (navPopoverTimer.current) clearTimeout(navPopoverTimer.current);
  };

  // Restore sidebar automatically whenever user navigates to another main module (or refreshes page)
  useEffect(() => {
    setLeftCollapsed(false);
  }, [activeModule]);

  // Lock background page scroll when mobile sidebar drawer is open
  useEffect(() => {
    if (!mobileMenuOpen) return;
    const prevBodyOverflow = document.body.style.overflow;
    const prevHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevBodyOverflow;
      document.documentElement.style.overflow = prevHtmlOverflow;
    };
  }, [mobileMenuOpen]);

  // Ctrl+K shortcut to focus global Coretax service search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (window.innerWidth >= 1280) {
          searchInputRef.current?.focus();
          setSearchFocused(true);
        } else {
          setCompactSearchOpen(true);
          setTimeout(() => compactSearchInputRef.current?.focus(), 40);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Auto-hide LEFT SIDEBAR when scrolling down (if toggle is active).
  // When scrolling back up: stays hidden (tidak tampil lagi kecuali menu ditekan).
  // If sidebar is visible, scrolling up does not hide it.
  useEffect(() => {
    const handleScroll = () => {
      const currentY = window.scrollY;
      const diff = currentY - lastScrollYRef.current;

      if (autoHideOnScroll) {
        if (currentY > 60 && diff > 8) {
          // Scrolling down (content goes up): hide sidebar
          setLeftCollapsed(true);
        }
      }

      setShowScrollTop(currentY > 180);
      lastScrollYRef.current = currentY;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [autoHideOnScroll]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (shellRef.current && !shellRef.current.contains(e.target as Node)) {
        setOpenDropdown(null);
        setNotifOpen(false);
        setAccountMenuOpen(false);
        setLangMenuOpen(false);
        setSearchFocused(false);
        setCompactSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const activeTaxpayer = accountMode === 'CORPORATE' ? corporateTaxpayer : individualTaxpayer;
  const unreadCount = notifications.filter((n) => !n.isRead).length;
  const filteredServices = searchTerm.trim()
    ? QUICK_SERVICES.filter((s) => s.label.toLowerCase().includes(searchTerm.toLowerCase()))
    : QUICK_SERVICES.slice(0, 7);

  const activeNavMeta = NAV_CONFIG.find((n) => n.key === activeModule) || NAV_CONFIG[0];
  const allActiveItems: NavItemDef[] = [
    ...activeNavMeta.items,
    ...(activeNavMeta.groups ? activeNavMeta.groups.flatMap((g) => g.items) : []),
  ];
  const activeSubMeta: NavItemDef | null =
    activeSubTab === 'empty' || !activeSubTab
      ? null
      : activeModule === 'efaktur' && activeSubTab && EFAKTUR_BREADCRUMB_MAP[activeSubTab]
        ? { id: activeSubTab, label: EFAKTUR_BREADCRUMB_MAP[activeSubTab] }
        : activeModule === 'portal' && activeSubTab === 'ikhtisar'
          ? { id: 'ikhtisar', label: 'Beranda' }
          : allActiveItems.find((i) => i.id === activeSubTab) || null;

  return (
    <div
      ref={shellRef}
      className={`min-h-screen flex flex-col relative overflow-x-clip transition-colors duration-200 ${
        darkHeader ? 'bg-[#0F172A] text-slate-100' : 'bg-[#EAEEF7] text-[#1E293B]'
      }`}
    >
      {/* Official Coretax Background (djpcoretaxbg.webp) from official DJP portal */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden z-0" aria-hidden="true">
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage:
              "url('https://coretaxdjp.pajak.go.id/identityproviderportal/asset-login-new/djpcoretaxbg.webp'), url('/djpcoretaxbg.webp')",
          }}
        />
        {darkHeader && (
          <div className="absolute inset-0 bg-[#0B1224]/85 backdrop-blur-[1px]" />
        )}
      </div>

      {/* ===================================================================== */}
      {/* PERMANENTLY STICKY 2-ROW WHITE HEADER CARD (EXACT CORETAX DJP)        */}
      {/* ===================================================================== */}
      <header className="sticky top-0 sm:top-2 z-30 mx-3 sm:mx-4 mt-2.5">
        <div
          className={`rounded-[16px] border shadow-[0_6px_26px_rgba(30,44,94,0.07)] transition-colors ${
            darkHeader
              ? 'bg-slate-900/95 border-slate-700/80 backdrop-blur-md'
              : 'bg-white border-[#E5EAF2]'
          }`}
        >
          {/* ROW 1: LOGO | SEARCH (Ctrl K on xl+) | UTILITIES | ACCOUNT BOX | HOME */}
          <div
            className={`px-3 sm:px-4 xl:px-5 py-2.5 flex items-center justify-between gap-1.5 sm:gap-2 xl:gap-3 min-w-0 lg:border-b ${
              darkHeader ? 'lg:border-slate-800' : 'lg:border-[#F1F5F9]'
            }`}
          >
            {/* Left: Official Kemenkeu & DJP Logo (KelasBrevet logo removed from navbar as requested) */}
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 min-w-0">
              <button
                type="button"
                onClick={() => onNavigate('portal', 'ikhtisar')}
                className="cursor-pointer text-left shrink-0"
                title="Beranda Coretax"
              >
                <KelasBrevetLogo variant="topbar" dark={darkHeader} />
              </button>
            </div>

            {/* Center: Inline Search Box with Ctrl + K badge (Desktop xl+ only to prevent tablet overflow) */}
            <div className="relative flex-1 min-w-[200px] max-w-[400px] hidden xl:block">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchTerm}
                onFocus={() => setSearchFocused(true)}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={language === 'id-ID' ? 'Cari layanan...' : 'Search services...'}
                className={`w-full rounded-[10px] pl-10 pr-16 py-2 text-[13px] border focus:outline-none transition ${
                  darkHeader
                    ? 'bg-slate-800 border-slate-700 text-white placeholder:text-slate-400 focus:border-[#F4C430]'
                    : 'bg-[#F4F6FA] border-[#E8EDF4] text-[#0F172A] placeholder:text-slate-400 focus:bg-white focus:border-[#1E2C5E]'
                }`}
              />
              <div className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
                <kbd
                  className={`px-1.5 py-0.5 text-[10px] font-semibold rounded border ${
                    darkHeader
                      ? 'bg-slate-700 border-slate-600 text-slate-300'
                      : 'bg-white border-slate-200 text-slate-500'
                  }`}
                >
                  Ctrl
                </kbd>
                <kbd
                  className={`px-1.5 py-0.5 text-[10px] font-semibold rounded border ${
                    darkHeader
                      ? 'bg-slate-700 border-slate-600 text-slate-300'
                      : 'bg-white border-slate-200 text-slate-500'
                  }`}
                >
                  K
                </kbd>
              </div>

              {searchFocused && (
                <div className="absolute left-0 right-0 top-full mt-2 bg-white text-slate-800 border border-[#E2E8F0] rounded-xl shadow-[0_18px_40px_rgba(30,44,94,0.14)] z-50 py-1.5 overflow-hidden">
                  {filteredServices.length === 0 ? (
                    <div className="px-4 py-3 text-xs text-slate-500">Layanan tidak ditemukan.</div>
                  ) : (
                    filteredServices.map((svc) => (
                      <button
                        key={svc.label}
                        type="button"
                        onClick={() => {
                          onNavigate(svc.module, svc.subTab);
                          setSearchFocused(false);
                          setSearchTerm('');
                        }}
                        className="w-full text-left px-4 py-2 text-[12.5px] text-slate-700 hover:bg-[#F4F6FA] hover:text-[#1E2C5E] font-medium cursor-pointer flex items-center justify-between"
                      >
                        <span>{svc.label}</span>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Right Controls: Search (<xl) · Help/Exam · Sun/Moon · Bell · Flag ID · Account Box · Home */}
            <div className="flex items-center gap-0.5 sm:gap-1.5 xl:gap-2 shrink-0 min-w-0">
              {/* Compact Search Toggle Button on Tablet (lg to xl); on mobile (<lg) search is in the bottom dock */}
              <button
                type="button"
                onClick={() => {
                  setCompactSearchOpen((prev) => {
                    const next = !prev;
                    if (next) {
                      setTimeout(() => compactSearchInputRef.current?.focus(), 40);
                    }
                    return next;
                  });
                }}
                title="Cari layanan (Ctrl+K)"
                className={`hidden lg:inline-flex xl:hidden p-1.5 sm:p-2 rounded-lg transition cursor-pointer ${
                  compactSearchOpen
                    ? 'bg-[#EEF2FA] text-[#1E2C5E]'
                    : darkHeader
                      ? 'text-slate-300 hover:bg-slate-800'
                      : 'text-[#1E2C5E] hover:bg-[#F4F6FA]'
                }`}
              >
                <Search className="w-[17px] h-[17px]" />
              </button>

              {/* Help / Read-Only Soal Latihan Icon */}
              <button
                type="button"
                onClick={onOpenExamDrawer}
                title="Lihat Soal Latihan"
                className={`hidden sm:inline-flex relative p-1.5 sm:p-2 rounded-lg transition cursor-pointer ${
                  darkHeader
                    ? 'text-slate-300 hover:bg-slate-800'
                    : 'text-[#1E2C5E] hover:bg-[#F4F6FA]'
                }`}
              >
                <HelpCircle className="w-[18px] h-[18px]" />
              </button>

              {/* Sun / Dark Theme Toggle */}
              <button
                type="button"
                onClick={() => setDarkHeader((prev) => !prev)}
                title={darkHeader ? 'Mode Terang' : 'Mode Gelap'}
                className={`p-2 rounded-lg transition cursor-pointer ${
                  darkHeader ? 'hover:bg-slate-800 text-[#F4C430]' : 'hover:bg-[#F4F6FA] text-[#F5B700]'
                }`}
              >
                {darkHeader ? <Moon className="w-[18px] h-[18px]" /> : <Sun className="w-[18px] h-[18px]" />}
              </button>

              {/* Notification Bell */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    setNotifOpen((prev) => !prev);
                    setAccountMenuOpen(false);
                    setLangMenuOpen(false);
                    setOpenDropdown(null);
                  }}
                  title="Notifikasi Saya"
                  className={`relative p-2 rounded-lg transition cursor-pointer ${
                    darkHeader
                      ? 'text-slate-300 hover:bg-slate-800'
                      : 'text-[#1E2C5E] hover:bg-[#F4F6FA]'
                  }`}
                >
                  <Bell className="w-[18px] h-[18px]" />
                  {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 min-w-[15px] h-[15px] px-0.5 bg-[#DC2626] text-white text-[9.5px] font-bold rounded-full flex items-center justify-center font-mono-num">
                      {unreadCount}
                    </span>
                  )}
                </button>

                {notifOpen && (
                  <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-white text-slate-800 border border-[#E2E8F0] rounded-2xl shadow-[0_20px_50px_rgba(30,44,94,0.16)] z-50 overflow-hidden">
                    <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-[#F8FAFC]">
                      <span className="text-xs font-bold text-[#1B2958]">
                        Notifikasi Saya ({notifications.length})
                      </span>
                      {unreadCount > 0 && (
                        <button
                          type="button"
                          onClick={onMarkAllNotificationsRead}
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#1E2C5E] hover:underline cursor-pointer"
                        >
                          <CheckCheck className="w-3.5 h-3.5" />
                          <span>Tandai Dibaca</span>
                        </button>
                      )}
                    </div>
                    <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                      {notifications.length === 0 ? (
                        <div className="p-6 text-center text-xs text-slate-500">
                          Belum ada notifikasi.
                        </div>
                      ) : (
                        notifications.map((n) => (
                          <div
                            key={n.id}
                            className={`p-3.5 text-xs ${n.isRead ? 'bg-white' : 'bg-[#F0F7FF]'}`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-bold text-[#1B2958]">{n.title}</span>
                              <span className="text-[10.5px] text-slate-400">{n.category}</span>
                            </div>
                            <p className="text-slate-600 mt-1 leading-snug">{n.message}</p>
                            <span className="text-[10px] text-slate-400 font-mono-num block mt-1">
                              {new Date(n.createdAt).toLocaleString('id-ID')}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Language Flag Selector (Visible on mobile & desktop like official mobile screenshot) */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    setLangMenuOpen((prev) => !prev);
                    setNotifOpen(false);
                    setAccountMenuOpen(false);
                  }}
                  className={`px-1.5 xl:px-2 py-1.5 rounded-lg inline-flex items-center gap-1 sm:gap-1.5 text-xs font-semibold transition cursor-pointer ${
                    darkHeader
                      ? 'text-slate-200 hover:bg-slate-800'
                      : 'text-[#1E293B] hover:bg-[#F4F6FA]'
                  }`}
                >
                  <FlagMini lang={language} />
                  <span>{language === 'id-ID' ? 'ID' : 'EN'}</span>
                  <ChevronDown className="w-3 h-3 opacity-60" />
                </button>

                {langMenuOpen && (
                  <div className="absolute right-0 top-full mt-2 w-36 bg-white text-slate-800 border border-[#E2E8F0] rounded-xl shadow-xl py-1 z-50">
                    <button
                      type="button"
                      onClick={() => {
                        onLanguageChange('id-ID');
                        setLangMenuOpen(false);
                      }}
                      className="w-full px-3 py-2 text-left text-xs font-medium hover:bg-slate-50 flex items-center justify-between cursor-pointer"
                    >
                      <span className="inline-flex items-center gap-2">
                        <FlagMini lang="id-ID" /> ID
                      </span>
                      {language === 'id-ID' && <Check className="w-3.5 h-3.5 text-[#1E2C5E]" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        onLanguageChange('en-US');
                        setLangMenuOpen(false);
                      }}
                      className="w-full px-3 py-2 text-left text-xs font-medium hover:bg-slate-50 flex items-center justify-between cursor-pointer"
                    >
                      <span className="inline-flex items-center gap-2">
                        <FlagMini lang="en-US" /> EN
                      </span>
                      {language === 'en-US' && <Check className="w-3.5 h-3.5 text-[#1E2C5E]" />}
                    </button>
                  </div>
                )}
              </div>

              {/* Rounded Bordered Taxpayer / Impersonate Box (Icon-only square on mobile/tablet, full pill on lg+) */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    setAccountMenuOpen((prev) => !prev);
                    setNotifOpen(false);
                    setLangMenuOpen(false);
                    setOpenDropdown(null);
                    setOpenExtraDropdown(null);
                  }}
                  title={`${activeTaxpayer.name} (${activeTaxpayer.nikNpwp})`}
                  className={`flex items-center justify-center gap-2 p-2 lg:px-3 lg:py-1.5 rounded-[10px] border transition cursor-pointer ${
                    darkHeader
                      ? 'bg-slate-800 border-slate-700 hover:border-slate-500 text-white'
                      : 'bg-white border-[#DCE2EC] hover:border-[#1E2C5E]/50 text-[#1B2958]'
                  }`}
                >
                  {accountMode === 'CORPORATE' ? (
                    <Building2 className="w-[18px] h-[18px] text-[#1D4ED8] shrink-0" />
                  ) : (
                    <UserCircle2
                      className={`w-[18px] h-[18px] shrink-0 ${
                        darkHeader ? 'text-slate-200' : 'text-[#1E2C5E]'
                      }`}
                    />
                  )}
                  <div className="hidden lg:block text-left leading-[1.15] max-w-[140px] xl:max-w-[175px]">
                    <div
                      className={`text-[10px] font-mono-num truncate ${
                        darkHeader ? 'text-slate-400' : 'text-slate-500'
                      }`}
                    >
                      {activeTaxpayer.nikNpwp}
                    </div>
                    <div className="text-[11px] xl:text-[11.5px] font-bold uppercase tracking-tight truncate">
                      {activeTaxpayer.name}
                    </div>
                  </div>
                  <span
                    className={`hidden lg:inline-block text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border shrink-0 ${
                      accountMode === 'CORPORATE'
                        ? 'bg-[#EFF6FF] border-[#BFDBFE] text-[#1D4ED8]'
                        : darkHeader
                          ? 'bg-slate-700 border-slate-600 text-slate-200'
                          : 'bg-[#F8FAFC] border-[#CBD5E1] text-[#1E2C5E]'
                    }`}
                  >
                    IMPERSONATE
                  </span>
                  <ChevronDown className="hidden lg:block w-3.5 h-3.5 opacity-60 shrink-0" />
                </button>

                {accountMenuOpen && (
                  <div className="absolute right-0 top-full mt-2 w-80 bg-white text-slate-800 border border-[#E2E8F0] rounded-2xl shadow-[0_20px_50px_rgba(30,44,94,0.16)] z-50 overflow-hidden">
                    <div className="px-4 py-2.5 bg-[#F8FAFC] border-b border-slate-100 text-[11px] font-semibold text-slate-500">
                      Pilih Akun / Impersonating
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        onSwitchAccountMode('INDIVIDUAL');
                        setAccountMenuOpen(false);
                      }}
                      className={`w-full text-left px-4 py-3 flex items-start gap-3 border-b border-slate-100 hover:bg-slate-50 cursor-pointer ${
                        accountMode === 'INDIVIDUAL' ? 'bg-[#FEF9E7]/70' : ''
                      }`}
                    >
                      <User className="w-4 h-4 text-[#1E2C5E] mt-0.5 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-bold text-[#1B2958]">
                            Akun Utama (Orang Pribadi)
                          </span>
                          {accountMode === 'INDIVIDUAL' && (
                            <span className="text-[11px] font-bold text-emerald-700">Aktif</span>
                          )}
                        </div>
                        <div className="text-xs font-medium text-slate-700 mt-0.5 truncate">
                          {individualTaxpayer.name}
                        </div>
                        <div className="text-[11px] font-mono-num text-slate-500">
                          {individualTaxpayer.nikNpwp}
                        </div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        onSwitchAccountMode('CORPORATE');
                        setAccountMenuOpen(false);
                      }}
                      className={`w-full text-left px-4 py-3 flex items-start gap-3 border-b border-slate-100 hover:bg-slate-50 cursor-pointer ${
                        accountMode === 'CORPORATE' ? 'bg-[#EFF6FF]' : ''
                      }`}
                    >
                      <Building2 className="w-4 h-4 text-[#1D4ED8] mt-0.5 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-bold text-[#1D4ED8]">
                            Impersonate (Badan / PKP)
                          </span>
                          {accountMode === 'CORPORATE' && (
                            <span className="text-[11px] font-bold text-[#1D4ED8]">Aktif</span>
                          )}
                        </div>
                        <div className="text-xs font-medium text-slate-700 mt-0.5 truncate">
                          {corporateTaxpayer.name}
                        </div>
                        <div className="text-[11px] font-mono-num text-slate-500">
                          {corporateTaxpayer.nikNpwp} · PKP
                        </div>
                      </div>
                    </button>

                    <div className="p-2 space-y-1 bg-[#F8FAFC]">
                      <button
                        type="button"
                        onClick={onLogout}
                        className="w-full px-3 py-2 rounded-lg text-left text-xs font-semibold text-rose-600 hover:bg-rose-50 flex items-center gap-2 cursor-pointer"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>Keluar</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Far-Right Home Icon Button */}
              <button
                type="button"
                onClick={() => onNavigate('portal', 'ikhtisar')}
                title="Beranda Portal"
                className={`hidden sm:inline-flex p-1.5 sm:p-2 rounded-lg transition cursor-pointer ${
                  darkHeader
                    ? 'text-slate-300 hover:bg-slate-800'
                    : 'text-[#1E2C5E] hover:bg-[#F4F6FA]'
                }`}
              >
                <Home className="w-[18px] h-[18px]" />
              </button>
            </div>
          </div>

          {/* COLLAPSIBLE SEARCH BAR FOR TABLET & MOBILE (< xl) */}
          {compactSearchOpen && (
            <div
              className={`xl:hidden px-3 sm:px-4 py-2.5 border-b relative ${
                darkHeader ? 'border-slate-800 bg-slate-900' : 'border-[#F1F5F9] bg-[#FAFBFD]'
              }`}
            >
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  ref={compactSearchInputRef}
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder={language === 'id-ID' ? 'Cari layanan...' : 'Search services...'}
                  className={`w-full rounded-[10px] pl-10 pr-9 py-2 text-[13px] border focus:outline-none ${
                    darkHeader
                      ? 'bg-slate-800 border-slate-700 text-white placeholder:text-slate-400'
                      : 'bg-white border-[#DCE2EC] text-[#0F172A] placeholder:text-slate-400 focus:border-[#1E2C5E]'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => {
                    setCompactSearchOpen(false);
                    setSearchTerm('');
                  }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="mt-2 bg-white text-slate-800 border border-[#E2E8F0] rounded-xl shadow-md py-1 max-h-56 overflow-y-auto">
                {filteredServices.length === 0 ? (
                  <div className="px-4 py-2.5 text-xs text-slate-500">Layanan tidak ditemukan.</div>
                ) : (
                  filteredServices.map((svc) => (
                    <button
                      key={svc.label}
                      type="button"
                      onClick={() => {
                        onNavigate(svc.module, svc.subTab);
                        setCompactSearchOpen(false);
                        setSearchTerm('');
                      }}
                      className="w-full text-left px-3.5 py-2 text-[12.5px] text-slate-700 hover:bg-[#F4F6FA] hover:text-[#1E2C5E] font-medium cursor-pointer flex items-center justify-between"
                    >
                      <span className="truncate">{svc.label}</span>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    </button>
                  ))
                )}
              </div>
            </div>
          )}

          {/* ROW 2: RESPONSIVE HORIZONTAL MODULE RIBBON (Desktop lg+ only; on mobile it sits in the bottom floating dock) */}
          <nav
            className="hidden lg:flex px-2 sm:px-3 xl:px-4 py-1.5 items-center justify-between gap-1 relative group select-none"
            onMouseLeave={handleNavCloseDebounced}
            onMouseEnter={handleNavKeepOpen}
          >
            {/* Left Scroll Arrow Button (Only displayed when menu overflows and can scroll left) */}
            {canScrollNav.needed && canScrollNav.left && (
              <button
                type="button"
                onClick={() => navScrollRef.current?.scrollBy({ left: -240, behavior: 'smooth' })}
                className="w-7 h-7 rounded-full bg-white/90 hover:bg-white text-[#1B2958] border border-[#CBD5E1] shadow-sm flex items-center justify-center cursor-pointer opacity-35 group-hover:opacity-100 hover:!opacity-100 transition-opacity shrink-0 z-10"
                title="Geser menu ke kiri"
                aria-label="Geser menu ke kiri"
              >
                <ChevronLeft className="w-4 h-4 text-slate-700" />
              </button>
            )}

            {/* Scrollable Single Horizontal Row (flex-nowrap, overflow-x-auto, no-scrollbar) */}
            <div
              ref={navScrollRef}
              className="flex-1 flex flex-nowrap items-center gap-1 sm:gap-1.5 lg:gap-2 xl:gap-2.5 overflow-x-auto no-scrollbar scroll-smooth py-1 px-1 min-w-0"
            >
              {NAV_CONFIG.map((item) => {
                const isActive = activeModule === item.key;
                const isHoveredOpen = openDropdown === item.key;
                const isHighlighted =
                  isHoveredOpen || (openDropdown === null && openExtraDropdown === null && isActive);

                return (
                  <div
                    key={item.key}
                    className="relative shrink-0"
                    onMouseEnter={(e) => {
                      if (item.hasChevron) {
                        handleNavOpen('nav', item.key, e.currentTarget, item.popoverTitle, item.items);
                      } else {
                        setOpenDropdown(null);
                        setOpenExtraDropdown(null);
                        setNavPopoverAnchor(null);
                      }
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setLeftCollapsed(false);
                        onNavigate(item.key, 'empty');
                        setOpenDropdown(null);
                        setNavPopoverAnchor(null);
                      }}
                      className={`inline-flex items-center gap-1.5 lg:gap-2 px-2.5 lg:px-3 py-1.5 lg:py-2 rounded-[10px] text-[12px] lg:text-[12.5px] transition-all duration-150 cursor-pointer whitespace-nowrap ${
                        isHighlighted
                          ? 'bg-[#FEF08A]/85 text-[#1B2958] font-bold border border-[#F4C430]/75 border-b-[3px] border-b-[#F2B705] shadow-[0_2px_8px_rgba(242,183,5,0.20)]'
                          : darkHeader
                            ? 'text-slate-200 hover:bg-slate-800 font-semibold border border-transparent'
                            : 'text-[#1E293B] hover:bg-[#F4F6FA] font-semibold border border-transparent'
                      }`}
                    >
                      <ModuleBadgeIcon moduleKey={item.key} icon={item.icon} />
                      <span>{item.label}</span>
                      {item.hasChevron && (
                        <ChevronDown
                          className={`w-3.5 h-3.5 opacity-70 transition-transform duration-150 ${
                            isHoveredOpen ? 'rotate-180' : ''
                          }`}
                        />
                      )}
                    </button>
                  </div>
                );
              })}

              {/* Official Coretax Menu 7 & 8: Layanan WP & Manajemen Akses */}
              {EXTRA_TOP_MENUS.map((extra) => {
                const isExtraOpen = openExtraDropdown === extra.key;
                return (
                  <div
                    key={extra.key}
                    className="relative shrink-0"
                    onMouseEnter={(e) => {
                      handleNavOpen('extra', extra.key, e.currentTarget, extra.popoverTitle, extra.items);
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        const first = extra.items[0];
                        if (first) onNavigate(first.targetModule, first.targetSubTab);
                        setOpenExtraDropdown(null);
                        setNavPopoverAnchor(null);
                      }}
                      className={`inline-flex items-center gap-1.5 lg:gap-2 px-2.5 lg:px-3 py-1.5 lg:py-2 rounded-[10px] text-[12px] lg:text-[12.5px] transition-all duration-150 cursor-pointer whitespace-nowrap ${
                        isExtraOpen
                          ? 'bg-[#FEF08A]/85 text-[#1B2958] font-bold border border-[#F4C430]/75 border-b-[3px] border-b-[#F2B705]'
                          : darkHeader
                            ? 'text-slate-200 hover:bg-slate-800 font-semibold border border-transparent'
                            : 'text-[#1E293B] hover:bg-[#F4F6FA] font-semibold border border-transparent'
                      }`}
                    >
                      <ModuleBadgeIcon moduleKey={extra.key} icon={ShieldUser} />
                      <span>{extra.label}</span>
                      <ChevronDown
                        className={`w-3.5 h-3.5 opacity-70 transition-transform duration-150 ${
                          isExtraOpen ? 'rotate-180' : ''
                        }`}
                      />
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Right Scroll Arrow Button (Only displayed when menu overflows and can scroll right) */}
            {canScrollNav.needed && canScrollNav.right && (
              <button
                type="button"
                onClick={() => navScrollRef.current?.scrollBy({ left: 240, behavior: 'smooth' })}
                className="w-7 h-7 rounded-full bg-white/90 hover:bg-white text-[#1B2958] border border-[#CBD5E1] shadow-sm flex items-center justify-center cursor-pointer opacity-35 group-hover:opacity-100 hover:!opacity-100 transition-opacity shrink-0 z-10"
                title="Geser menu ke kanan"
                aria-label="Geser menu ke kanan"
              >
                <ChevronRight className="w-4 h-4 text-slate-700" />
              </button>
            )}

            {/* Subtle Right-Aligned Read-Only Soal Latihan Button */}
            <button
              type="button"
              onClick={onOpenExamDrawer}
              className={`hidden 2xl:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[10px] text-xs font-semibold transition cursor-pointer whitespace-nowrap shrink-0 ml-1 ${
                darkHeader
                  ? 'bg-slate-800 text-[#F4C430] hover:bg-slate-700 border border-slate-700'
                  : 'bg-[#F4F6FA] hover:bg-[#FEF9E7] text-[#1B2958] border border-[#E5EAF2]'
              }`}
            >
              <Award className="w-3.5 h-3.5 text-[#D97706]" />
              <span>Soal Latihan</span>
            </button>
          </nav>

          {/* Floating Speech-Bubble Hover Popover Card Rendered with Fixed Coordinates */}
          {navPopoverAnchor && (
            <div
              style={{
                position: 'fixed',
                top: `${navPopoverAnchor.top}px`,
                left: `${navPopoverAnchor.left}px`,
                zIndex: 9999,
              }}
              onMouseEnter={handleNavKeepOpen}
              onMouseLeave={handleNavCloseDebounced}
              className="pt-1 select-none animate-in fade-in duration-100"
            >
              <div className="relative w-[min(350px,calc(100vw-2rem))] bg-white text-[#1B2958] border border-[#E5EAF2] rounded-[16px] shadow-[0_20px_50px_rgba(30,44,94,0.18)]">
                <div
                  className="w-3.5 h-3.5 bg-white border-l border-t border-[#E5EAF2] rotate-45 absolute -top-[7px] left-8"
                  aria-hidden="true"
                />
                <div className="px-5 pt-4 pb-2.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400 border-b border-[#F1F5F9]">
                  {navPopoverAnchor.title}
                </div>
                <div className="p-2 space-y-0.5 max-h-[65vh] overflow-y-auto">
                  {navPopoverAnchor.items.map((sub: any) => {
                    const isCurrentSub =
                      navPopoverAnchor.type === 'nav' &&
                      activeModule === (navPopoverAnchor.key as MainNavKey) &&
                      activeSubTab === sub.id;

                    return (
                      <button
                        key={sub.id || sub.label}
                        type="button"
                        onClick={() => {
                          setLeftCollapsed(false);
                          if (navPopoverAnchor.type === 'nav') {
                            onNavigate(navPopoverAnchor.key as MainNavKey, sub.id);
                          } else {
                            onNavigate(sub.targetModule, sub.targetSubTab);
                          }
                          setOpenDropdown(null);
                          setOpenExtraDropdown(null);
                          setNavPopoverAnchor(null);
                        }}
                        className={`w-full text-left px-3.5 py-2 rounded-[10px] text-[12.5px] transition cursor-pointer flex items-center justify-between gap-2 ${
                          isCurrentSub
                            ? 'bg-[#EEF2FA] text-[#1B2958] font-bold'
                            : 'text-[#1B2958] hover:bg-[#F4F6FA] font-semibold'
                        }`}
                      >
                        <span className="leading-snug">{sub.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* ===================================================================== */}
      {/* FLOATING 2-COLUMN WORKSPACE (LEFT SUBMENU CARD + RIGHT CONTENT CARD)  */}
      {/* ===================================================================== */}
      <div className="relative z-20 flex-1 flex gap-4 px-2.5 sm:px-4 py-3 sm:py-4 items-start max-w-full min-h-[260px]">
        {/* Authentic Collapsed Vertical Gold Tab on Far-Left Edge: Centered Vertically on Left Screen Edge (top-1/2) with z-40 above footer */}
        {leftCollapsed && (
          <button
            type="button"
            onClick={() => setLeftCollapsed(false)}
            title={`Buka menu ${activeNavMeta.sidebarLabel}`}
            className="hidden lg:flex fixed left-0 top-1/2 -translate-y-1/2 z-40 flex-col items-center gap-2 py-3.5 px-1.5 rounded-r-[10px] bg-[#FEF08A] hover:bg-[#F5C527] text-[#1B2958] border border-l-0 border-[#F4C430] shadow-[0_4px_16px_rgba(30,44,94,0.14)] cursor-pointer transition"
          >
            <ModuleBadgeIcon moduleKey={activeNavMeta.key} icon={activeNavMeta.icon} />
            <span
              className="text-[11px] font-bold tracking-wide max-h-[145px] truncate"
              style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
            >
              {activeNavMeta.sidebarLabel}
            </span>
          </button>
        )}

        {/* Mobile Left Edge Gold Tab to toggle mobile menu (Centered Vertically) */}
        {!mobileMenuOpen && (
          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            title={`Buka menu ${activeNavMeta.sidebarLabel}`}
            className="lg:hidden fixed left-0 top-1/2 -translate-y-1/2 z-40 flex flex-col items-center gap-2 py-3 px-1 rounded-r-[9px] bg-[#FEF08A] text-[#1B2958] border border-l-0 border-[#F4C430] shadow-sm cursor-pointer"
          >
            <MobileDuotoneModuleIcon moduleKey={activeNavMeta.key} active={true} />
            <span
              className="text-[10px] font-bold tracking-wide max-h-[120px] truncate"
              style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
            >
              {activeNavMeta.sidebarLabel}
            </span>
          </button>
        )}

        {/* LEFT FLOATING WHITE SUBMENU CARD (Level with right main content card from the start) */}
        {!leftCollapsed &&
          (() => {
            const sidebarMeta =
              (openDropdown ? NAV_CONFIG.find((n) => n.key === openDropdown) : activeNavMeta) ||
              activeNavMeta;
            const SidebarModuleIcon = sidebarMeta.icon;

            return (
              <aside
                className={`hidden lg:flex flex-col shrink-0 self-start rounded-[16px] border shadow-[0_6px_26px_rgba(30,44,94,0.06)] transition-all duration-200 sticky top-[124px] max-h-[calc(100vh-140px)] w-[224px] xl:w-[258px] ${
                  darkHeader ? 'bg-slate-900 border-slate-700/80' : 'bg-white border-[#E5EAF2]'
                }`}
              >
                {/* Top Shaded Module Header inside Left Panel */}
                <div
                  className={`m-3 rounded-[12px] px-3 py-2.5 flex items-center justify-between gap-2 ${
                    darkHeader ? 'bg-slate-800' : 'bg-[#F4F6FA]'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <ModuleBadgeIcon moduleKey={sidebarMeta.key} icon={SidebarModuleIcon} />
                    <span
                      title={sidebarMeta.sidebarLabel}
                      className={`font-display font-bold text-[13.5px] truncate ${
                        darkHeader ? 'text-white' : 'text-[#1B2958]'
                      }`}
                    >
                      {sidebarMeta.sidebarLabel}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => setLeftCollapsed(true)}
                    title="Tutup sidebar"
                    aria-label="Tutup sidebar"
                    className={`w-7 h-7 rounded-lg border flex items-center justify-center shrink-0 transition cursor-pointer ${
                      darkHeader
                        ? 'bg-slate-900 border-slate-700 text-slate-300 hover:text-white'
                        : 'bg-white border-[#E2E8F0] text-[#475569] hover:text-[#1B2958]'
                    }`}
                  >
                    <ChevronsLeft className="w-4 h-4" />
                  </button>
                </div>

                {/* Vertical Submenu Items List with authentic subtle gold active indicator */}
                <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-0.5">
                  {sidebarMeta.items.map((sub) => {
                    const isSubActive =
                      activeModule === sidebarMeta.key &&
                      (sidebarMeta.key === 'spt'
                        ? activeSubTab === sub.id ||
                          (['konsep', 'menunggu', 'dilaporkan', 'ditolak', 'dibatalkan'].includes(activeSubTab) &&
                            sub.id === 'konsep')
                        : activeSubTab === sub.id);
                    return (
                      <button
                        key={sub.id}
                        type="button"
                        title={sub.label}
                        onClick={() => {
                          onNavigate(sidebarMeta.key, sub.id);
                          setOpenDropdown(null);
                        }}
                        className={`relative w-full text-left px-3 py-2 rounded-[9px] text-[12.5px] transition cursor-pointer flex items-center justify-between gap-2 ${
                          isSubActive
                            ? darkHeader
                              ? 'bg-slate-800 text-[#F4C430] font-bold'
                              : 'bg-[#F1F4FA] text-[#1B2958] font-bold'
                            : darkHeader
                              ? 'text-slate-300 hover:bg-slate-800/60 font-medium'
                              : 'text-[#475569] hover:bg-[#F6F8FC] hover:text-[#1B2958] font-medium'
                        }`}
                      >
                        {isSubActive && (
                          <span
                            className="w-[3px] h-5 rounded-full bg-[#F4C430] absolute left-0.5 top-1/2 -translate-y-1/2"
                            aria-hidden="true"
                          />
                        )}
                        <span className="truncate">{sub.label}</span>
                        {sub.id === 'notifikasi' && unreadCount > 0 && (
                          <span className="text-[10.5px] font-mono-num font-bold text-[#DC2626]">
                            {unreadCount}
                          </span>
                        )}
                      </button>
                    );
                  })}

                  {/* Collapsible Portal Saya Sub-Groups (Perubahan Data & Perubahan Status) */}
                  {sidebarMeta.groups &&
                    sidebarMeta.groups.map((grp) => {
                      const isExpanded = openGroups[grp.groupLabel] ?? true;
                      return (
                        <div key={grp.groupLabel} className="pt-2 mt-1.5 border-t border-slate-100">
                          <button
                            type="button"
                            onClick={() =>
                              setOpenGroups((prev) => ({
                                ...prev,
                                [grp.groupLabel]: !isExpanded,
                              }))
                            }
                            className={`w-full px-3 py-1.5 flex items-center justify-between text-[12px] font-bold rounded-lg transition cursor-pointer ${
                              darkHeader
                                ? 'text-slate-300 hover:bg-slate-800/60'
                                : 'text-[#334155] hover:bg-[#F6F8FC]'
                            }`}
                          >
                            <span className="truncate">{grp.groupLabel}</span>
                            <ChevronDown
                              className={`w-3.5 h-3.5 opacity-70 transition-transform ${
                                isExpanded ? '' : '-rotate-90'
                              }`}
                            />
                          </button>

                          {isExpanded && (
                            <div className="mt-0.5 space-y-0.5 pl-2">
                              {grp.items.map((sub) => {
                                const isSubActive =
                                  activeModule === sidebarMeta.key && activeSubTab === sub.id;
                                return (
                                  <button
                                    key={sub.id}
                                    type="button"
                                    title={sub.label}
                                    onClick={() => {
                                      onNavigate(sidebarMeta.key, sub.id);
                                      setOpenDropdown(null);
                                    }}
                                    className={`relative w-full text-left px-2.5 py-1.5 rounded-[8px] text-[11.5px] transition cursor-pointer flex items-center gap-2 ${
                                      isSubActive
                                        ? darkHeader
                                          ? 'bg-slate-800 text-[#F4C430] font-bold'
                                          : 'bg-[#F1F4FA] text-[#1B2958] font-bold'
                                        : darkHeader
                                          ? 'text-slate-400 hover:bg-slate-800/60 font-medium'
                                          : 'text-[#64748B] hover:bg-[#F6F8FC] hover:text-[#1B2958] font-medium'
                                    }`}
                                  >
                                    <span className="w-1 h-1 rounded-full bg-current opacity-50 shrink-0" />
                                    <span className="truncate">{sub.label}</span>
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                </div>

                {/* Bottom "Auto hide saat di-scroll" Toggle Switch */}
                <div
                  className={`px-4 py-3 border-t flex items-center justify-between gap-2 text-[12px] ${
                    darkHeader ? 'border-slate-800 text-slate-400' : 'border-[#F1F5F9] text-[#52607A]'
                  }`}
                >
                  <span className="inline-flex items-center gap-2 truncate">
                    <PanelTop className="w-3.5 h-3.5 shrink-0 opacity-75" />
                    <span>
                      <em className="not-italic sm:italic">Auto hide</em> saat di-scroll
                    </span>
                  </span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={autoHideOnScroll}
                    onClick={() => setAutoHideOnScroll((prev) => !prev)}
                    className={`w-9 h-5 rounded-full p-0.5 transition-colors cursor-pointer shrink-0 flex items-center ${
                      autoHideOnScroll ? 'bg-[#F4C430] justify-end' : 'bg-slate-300 justify-start'
                    }`}
                  >
                    <span className="w-4 h-4 rounded-full bg-white shadow-sm block" />
                  </button>
                </div>
              </aside>
            );
          })()}

        {/* RIGHT FLOATING WHITE MAIN CONTENT CARD (Exact match to screenshot) */}
        <main
          className={`flex-1 min-w-0 rounded-[16px] border shadow-[0_6px_26px_rgba(30,44,94,0.06)] flex flex-col overflow-hidden ${
            darkHeader ? 'bg-slate-900/95 border-slate-700/80' : 'bg-white border-[#E5EAF2]'
          }`}
        >
          {/* Breadcrumb Strip: [Home] Beranda › Portal Saya › Home */}
          <div
            className={`px-5 sm:px-6 py-3.5 border-b flex items-center justify-between gap-3 text-[12.5px] ${
              darkHeader ? 'border-slate-800 text-slate-400' : 'border-[#F1F5F9] text-slate-500'
            }`}
          >
            <div className="flex items-center gap-1.5 min-w-0">
              <button
                type="button"
                onClick={() => onNavigate('portal', 'ikhtisar')}
                className="inline-flex items-center gap-1.5 hover:text-[#1B2958] transition cursor-pointer whitespace-nowrap"
              >
                <Home className="w-3.5 h-3.5" />
                <span>Beranda</span>
              </button>
              <ChevronRight className="w-3.5 h-3.5 opacity-50 shrink-0" />
              {!activeSubMeta ||
              (activeSubMeta.breadcrumbLabel || activeSubMeta.label) ===
                activeNavMeta.sidebarLabel ? (
                <span
                  className={`font-bold truncate ${
                    darkHeader ? 'text-[#F4C430]' : 'text-[#1B2958]'
                  }`}
                >
                  {activeNavMeta.sidebarLabel}
                </span>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setLeftCollapsed(false);
                      onNavigate(activeModule, activeNavMeta.items[0]?.id);
                    }}
                    className={`font-semibold hover:underline cursor-pointer whitespace-nowrap ${
                      darkHeader ? 'text-slate-200' : 'text-[#1B2958]'
                    }`}
                  >
                    {activeNavMeta.sidebarLabel}
                  </button>
                  <ChevronRight className="w-3.5 h-3.5 opacity-50 shrink-0" />
                  <span
                    className={`font-bold truncate ${
                      darkHeader ? 'text-[#F4C430]' : 'text-[#1B2958]'
                    }`}
                  >
                    {activeSubMeta.breadcrumbLabel || activeSubMeta.label}
                  </span>
                </>
              )}
            </div>

            <span className="hidden xl:inline text-[11px] text-slate-400 whitespace-nowrap">
              Lisensi Simulasi KelasBrevet
            </span>
          </div>

          {/* Active Module Content Viewport */}
          <div className="p-3 sm:p-5 xl:p-6 flex-1 bg-white text-[#1E293B] overflow-x-auto max-w-full">
            {children}
          </div>
        </main>
      </div>

      {/* ===================================================================== */}
      {/* MOBILE SUBMENU SLIDE-OVER DRAWER (Top-level sibling: z-[80] covers header z-30 & body) */}
      {/* ===================================================================== */}
      {mobileMenuOpen && (
        <div className="lg:hidden">
          {/* Dark Backdrop dimming entire screen including header and navbar (z-[80] covers header z-30) */}
          <div
            className="fixed inset-0 bg-slate-900/60 z-[80] backdrop-blur-[2px] transition-opacity touch-none"
            onClick={() => setMobileMenuOpen(false)}
          />

          {/* Floating Left Rounded Panel on layer z-[90], sitting on top of the dark backdrop */}
          <div
            className={`fixed left-2 sm:left-3 top-3 bottom-[82px] z-[90] w-[84vw] max-w-[315px] rounded-[18px] shadow-[0_22px_55px_rgba(15,23,42,0.45)] border border-slate-200/60 flex flex-col overflow-hidden overscroll-contain ${
              darkHeader ? 'bg-slate-900 text-slate-100 border-slate-700' : 'bg-white text-[#1B2958]'
            }`}
          >
            {/* Top Shaded Pill Box with Duotone Module Icon + Label + [<<] Collapse Button */}
            <div
              className={`m-3 rounded-[12px] px-3.5 py-2.5 flex items-center justify-between gap-2 ${
                darkHeader ? 'bg-slate-800' : 'bg-[#F4F6FA]'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <MobileDuotoneModuleIcon moduleKey={activeNavMeta.key} active={true} />
                <span
                  className={`font-display font-bold text-[14px] truncate ${
                    darkHeader ? 'text-white' : 'text-[#1B2958]'
                  }`}
                >
                  {activeNavMeta.sidebarLabel}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                title="Tutup menu"
                aria-label="Tutup menu"
                className={`w-7 h-7 rounded-lg border flex items-center justify-center shrink-0 transition cursor-pointer ${
                  darkHeader
                    ? 'bg-slate-900 border-slate-700 text-slate-300 hover:text-white'
                    : 'bg-white border-[#E2E8F0] text-[#1B2958] hover:bg-slate-50'
                }`}
              >
                <ChevronsLeft className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Clean Single-Line Truncated Submenu Items */}
            <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-0.5">
              {activeNavMeta.items.map((sub) => {
                const isSubActive = activeSubTab === sub.id;
                return (
                  <button
                    key={sub.id}
                    type="button"
                    title={sub.label}
                    onClick={() => {
                      onNavigate(activeModule, sub.id);
                      setMobileMenuOpen(false);
                    }}
                    className={`w-full text-left px-3.5 py-2 rounded-[8px] text-[13px] transition cursor-pointer block truncate ${
                      isSubActive
                        ? darkHeader
                          ? 'bg-slate-800 text-[#F4C430] font-bold'
                          : 'bg-[#F1F4FA] text-[#1B2958] font-bold'
                        : darkHeader
                          ? 'text-slate-300 hover:bg-slate-800/60 font-medium'
                          : 'text-[#334155] hover:bg-[#F8FAFC] font-medium'
                    }`}
                  >
                    {sub.label}
                  </button>
                );
              })}

              {activeNavMeta.groups &&
                activeNavMeta.groups.map((grp) => (
                  <div key={grp.groupLabel} className="pt-2 mt-1.5 border-t border-slate-100">
                    <div className="px-3.5 py-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      {grp.groupLabel}
                    </div>
                    {grp.items.map((sub) => {
                      const isSubActive = activeSubTab === sub.id;
                      return (
                        <button
                          key={sub.id}
                          type="button"
                          title={sub.label}
                          onClick={() => {
                            onNavigate(activeModule, sub.id);
                            setMobileMenuOpen(false);
                          }}
                          className={`w-full text-left px-3.5 py-2 rounded-[8px] text-[12.5px] transition cursor-pointer block truncate ${
                            isSubActive
                              ? darkHeader
                                ? 'bg-slate-800 text-[#F4C430] font-bold'
                                : 'bg-[#F1F4FA] text-[#1B2958] font-bold'
                              : darkHeader
                                ? 'text-slate-300 hover:bg-slate-800/60 font-medium'
                                : 'text-[#334155] hover:bg-[#F8FAFC] font-medium'
                          }`}
                        >
                          {sub.label}
                        </button>
                      );
                    })}
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MOBILE FLOATING BOTTOM NAVIGATION DOCK (Layer z-[90] above dark backdrop) */}
      {/* ===================================================================== */}
      <div className="lg:hidden fixed bottom-3 inset-x-0 z-[90] px-3 pointer-events-none flex justify-center">
        <div
          className={`pointer-events-auto w-full max-w-[440px] rounded-full border p-1.5 shadow-[0_14px_38px_rgba(27,41,88,0.22)] backdrop-blur-md flex items-center gap-1.5 ${
            darkHeader
              ? 'bg-slate-900/95 border-slate-700 text-slate-100'
              : 'bg-white/95 border-[#DCE2EE] text-[#1B2958]'
          }`}
        >
          {/* Horizontally Scrollable Module Pills */}
          <div className="flex-1 flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5 px-1">
            {NAV_CONFIG.map((item) => {
              const isActive = activeModule === item.key;
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => {
                    onNavigate(item.key, 'empty');
                    if (item.items.length > 0) {
                      setMobileMenuOpen(true);
                    } else {
                      setMobileMenuOpen(false);
                    }
                  }}
                  className={`relative shrink-0 min-w-[74px] px-3 py-1.5 rounded-full flex flex-col items-center justify-center gap-0.5 transition cursor-pointer ${
                    isActive
                      ? darkHeader
                        ? 'bg-slate-800 text-[#F4C430] font-bold shadow-inner'
                        : 'bg-[#E2E8F3] text-[#1B2958] font-bold shadow-inner'
                      : darkHeader
                        ? 'text-slate-300 hover:bg-slate-800/60 font-medium'
                        : 'text-[#64748B] hover:bg-[#F4F6FA] font-medium'
                  }`}
                >
                  <MobileDuotoneModuleIcon moduleKey={item.key} active={isActive} />
                  <span className="text-[10.5px] leading-tight whitespace-nowrap">
                    {item.label}
                  </span>
                  {isActive && (
                    <span
                      className="w-5 h-[2.5px] rounded-full bg-[#F4B81B] mt-0.5"
                      aria-hidden="true"
                    />
                  )}
                </button>
              );
            })}

            {EXTRA_TOP_MENUS.map((extra) => (
              <button
                key={extra.key}
                type="button"
                onClick={() => {
                  const first = extra.items[0];
                  if (first) onNavigate(first.targetModule, first.targetSubTab);
                }}
                className={`shrink-0 min-w-[78px] px-3 py-1.5 rounded-full flex flex-col items-center justify-center gap-0.5 transition cursor-pointer ${
                  darkHeader
                    ? 'text-slate-300 hover:bg-slate-800/60 font-medium'
                    : 'text-[#64748B] hover:bg-[#F4F6FA] font-medium'
                }`}
              >
                <MobileDuotoneModuleIcon moduleKey={extra.key} active={false} />
                <span className="text-[10.5px] leading-tight whitespace-nowrap">
                  {extra.label}
                </span>
              </button>
            ))}
          </div>

          {/* Right Circular Search Button inside Floating Bottom Pill */}
          <button
            type="button"
            onClick={() => {
              setCompactSearchOpen((prev) => {
                const next = !prev;
                if (next) {
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                  setTimeout(() => compactSearchInputRef.current?.focus(), 60);
                }
                return next;
              });
            }}
            title="Cari layanan"
            aria-label="Cari layanan"
            className={`w-11 h-11 rounded-full border shrink-0 flex items-center justify-center shadow-sm transition cursor-pointer ${
              compactSearchOpen
                ? 'bg-[#1E2C5E] border-[#1E2C5E] text-white'
                : darkHeader
                  ? 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700'
                  : 'bg-white border-[#E2E8F0] text-[#1E2C5E] hover:bg-[#F4F6FA]'
            }`}
          >
            <Search className="w-[18px] h-[18px]" />
          </button>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* OFFICIAL CORETAX DJP FOOTER (Exact Match to PDF 2, 3, 4)              */}
      {/* ===================================================================== */}
      <footer className="relative z-10 mx-2.5 sm:mx-4 mt-6 mb-24 lg:mb-4 clear-both">
        <div
          className={`rounded-[16px] border px-6 py-5 shadow-[0_4px_20px_rgba(30,44,94,0.04)] ${
            darkHeader
              ? 'bg-slate-900/95 border-slate-700/80 text-slate-300'
              : 'bg-[#F8FAFD] border-[#E5EAF2] text-[#334155]'
          }`}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-6 text-[11.5px]">
            {/* Col 1: DJP Logo & Address */}
            <div className="lg:col-span-4 space-y-1.5">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded bg-[#1E2C5E] flex items-center justify-center text-[#F4C430] font-display font-black text-xs shrink-0">
                  DJP
                </div>
                <div className="h-5 w-[1.5px] bg-slate-300" />
                <span className="font-display font-black text-[18px] tracking-tight text-[#1E2C5E]">
                  djp
                </span>
              </div>
              <div className="font-bold text-[#1E2C5E] pt-1 leading-snug">
                Kementerian Keuangan
                <br />
                Direktorat Jenderal Pajak
              </div>
              <div className="text-slate-500 text-[11px]">
                Jalan Gatot Subroto, Kav. 40-42, Jakarta, 12190
              </div>
            </div>

            {/* Col 2: Hubungi Kami */}
            <div className="lg:col-span-3 space-y-1.5">
              <div className="font-bold text-[#1E2C5E]">Hubungi Kami</div>
              <div className="text-slate-600 text-[11px] space-y-1">
                <div>✆ (021) 525 1609, (021) 525 0208, (021) 526 2880</div>
                <div>🎧 Kring Pajak: (021) 1500200</div>
                <div>✉ informasi@pajak.go.id</div>
              </div>
            </div>

            {/* Col 3: Layanan Digital */}
            <div className="lg:col-span-3 space-y-1.5">
              <div className="font-bold text-[#1E2C5E]">Layanan Digital</div>
              <div className="text-slate-600 text-[11px] space-y-1">
                <div>🌐 www.kemenkeu.go.id</div>
                <div>🌐 www.pajak.go.id</div>
              </div>
            </div>

            {/* Col 4: Temukan Kami */}
            <div className="lg:col-span-2 space-y-2">
              <div className="font-bold text-[#1E2C5E]">Temukan Kami</div>
              <div className="flex items-center gap-1.5">
                {['f', 'X', 'ig', '▶'].map((soc) => (
                  <span
                    key={soc}
                    className="w-6 h-6 rounded-full border border-slate-300 bg-white text-[#1E2C5E] text-[10px] font-bold inline-flex items-center justify-center"
                  >
                    {soc}
                  </span>
                ))}
              </div>
              <div className="font-bold text-[10.5px] text-[#1E2C5E]">@DITJENPAJAKRI</div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-200/80 flex flex-wrap items-center justify-between gap-2 text-[10.5px] text-slate-400">
            <span>Copyright © 2024 Direktorat Jenderal Pajak. All rights reserved.</span>
          </div>
        </div>
      </footer>

      {/* ===================================================================== */}
      {/* FLOATING SCROLL-TO-TOP BUTTON ON BOTTOM-RIGHT (Matches Coretax Image) */}
      {/* ===================================================================== */}
      {showScrollTop && (
        <button
          type="button"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          title="Kembali ke atas"
          aria-label="Kembali ke atas"
          className="fixed right-4 sm:right-6 bottom-20 lg:bottom-6 z-40 w-10 h-10 rounded-full bg-[#94A3B8]/85 hover:bg-[#1E2C5E] text-white shadow-[0_6px_20px_rgba(30,44,94,0.22)] backdrop-blur-sm flex items-center justify-center transition-all duration-200 cursor-pointer"
        >
          <ChevronUp className="w-5 h-5 stroke-[2.5]" />
        </button>
      )}
    </div>
  );
};
