import React, { useEffect, useRef, useState } from 'react';
import {
  Award,
  Bell,
  Building2,
  Check,
  CheckCheck,
  ChevronDown,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Cloud,
  CreditCard,
  FileSpreadsheet,
  FileText,
  HelpCircle,
  Home,
  LogOut,
  Menu,
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

export type MainNavKey = 'portal' | 'efaktur' | 'ebupot' | 'spt' | 'pembayaran';

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
  examCompletedCount: number;
  language: 'id-ID' | 'en-US';
  onLanguageChange: (lang: 'id-ID' | 'en-US') => void;
  cloudUserEmail: string | null;
  onConnectCloud: () => void;
  onLogout: () => void;
  children: React.ReactNode;
}

const NAV_CONFIG: Array<{
  key: MainNavKey;
  label: string;
  sidebarLabel: string;
  popoverTitle: string;
  hasChevron: boolean;
  icon: React.FC<{ className?: string }>;
  items: Array<{ id: string; label: string; breadcrumbLabel?: string }>;
}> = [
  {
    key: 'portal',
    label: 'Portal Saya',
    sidebarLabel: 'Portal Saya',
    popoverTitle: 'PORTAL SAYA',
    hasChevron: true,
    icon: ShieldUser,
    items: [
      { id: 'ikhtisar', label: 'Home', breadcrumbLabel: 'Home' },
      { id: 'dokumen', label: 'Dokumen Saya' },
      { id: 'notifikasi', label: 'Notifikasi Saya' },
      { id: 'profil', label: 'Profil Saya' },
    ],
  },
  {
    key: 'efaktur',
    label: 'e-Faktur',
    sidebarLabel: 'e-Faktur',
    popoverTitle: 'E-FAKTUR',
    hasChevron: false,
    icon: Receipt,
    items: [
      { id: 'output', label: 'Pajak Keluaran' },
      { id: 'input', label: 'Pajak Masukan' },
      { id: 'export', label: 'Dokumen Lain' },
      { id: 'retur', label: 'Retur Pajak Keluaran' },
    ],
  },
  {
    key: 'ebupot',
    label: 'eBUPOT',
    sidebarLabel: 'eBupot',
    popoverTitle: 'EBUPOT',
    hasChevron: true,
    icon: FileSpreadsheet,
    items: [
      { id: 'bppu', label: 'BPPU' },
      { id: 'bp21', label: 'BP 21 - Bukti Pemotongan Selain Pegawai Tetap' },
      { id: 'bpa1', label: 'BP A1 - Bukti Pemotongan A1 Masa Pajak Terakhir' },
      { id: 'bpmp', label: 'Bukti Pemotongan Bulanan Pegawai Tetap' },
      { id: 'xml', label: 'Impor Data' },
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
      { id: 'buat', label: 'Layanan Mandiri Kode Billing' },
      { id: 'daftar', label: 'Daftar Kode Billing Belum Dibayar' },
      { id: 'deposit', label: 'Deposit Pajak' },
    ],
  },
];

const QUICK_SERVICES = [
  { label: 'Portal Saya — Dokumen Saya', module: 'portal' as MainNavKey, subTab: 'dokumen' },
  { label: 'Portal Saya — Profil Saya', module: 'portal' as MainNavKey, subTab: 'profil' },
  { label: 'e-Faktur — Pajak Keluaran', module: 'efaktur' as MainNavKey, subTab: 'output' },
  { label: 'e-Faktur — Pajak Masukan', module: 'efaktur' as MainNavKey, subTab: 'input' },
  { label: 'e-Faktur — Retur Pajak Keluaran', module: 'efaktur' as MainNavKey, subTab: 'retur' },
  { label: 'eBupot — Bukti Pemotongan Bulanan Pegawai Tetap', module: 'ebupot' as MainNavKey, subTab: 'bpmp' },
  { label: 'eBupot — BP 21 - Bukti Pemotongan Selain Pegawai Tetap', module: 'ebupot' as MainNavKey, subTab: 'bp21' },
  { label: 'eBupot — BP A1 - Bukti Pemotongan A1 Masa Pajak Terakhir', module: 'ebupot' as MainNavKey, subTab: 'bpa1' },
  { label: 'eBupot — BPPU', module: 'ebupot' as MainNavKey, subTab: 'bppu' },
  { label: 'Surat Pemberitahuan (SPT) — Konsep SPT', module: 'spt' as MainNavKey, subTab: 'konsep' },
  { label: 'Surat Pemberitahuan (SPT) — SPT Menunggu Pembayaran', module: 'spt' as MainNavKey, subTab: 'menunggu' },
  { label: 'Surat Pemberitahuan (SPT) — SPT Dilaporkan', module: 'spt' as MainNavKey, subTab: 'dilaporkan' },
  { label: 'Pembayaran — Layanan Mandiri Kode Billing', module: 'pembayaran' as MainNavKey, subTab: 'buat' },
  { label: 'Pembayaran — Daftar Kode Billing Belum Dibayar', module: 'pembayaran' as MainNavKey, subTab: 'daftar' },
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

/** Dual-tone Navy & Gold badge icon matching the 2026 Coretax horizontal nav bar */
const ModuleBadgeIcon: React.FC<{ icon: React.FC<{ className?: string }> }> = ({ icon: Icon }) => (
  <span className="relative inline-flex items-center justify-center w-5 h-5 shrink-0">
    <Icon className="w-[17px] h-[17px] text-[#1E2C5E]" />
    <span className="w-1.5 h-1.5 rounded-full bg-[#F4B81B] absolute -bottom-0.5 -right-0.5 ring-1 ring-white" />
  </span>
);

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
  examCompletedCount,
  language,
  onLanguageChange,
  cloudUserEmail,
  onConnectCloud,
  onLogout,
  children,
}) => {
  const [darkHeader, setDarkHeader] = useState(false);
  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [autoHideOnScroll, setAutoHideOnScroll] = useState(true);
  const [scrolledDown, setScrolledDown] = useState(false);

  const [openDropdown, setOpenDropdown] = useState<MainNavKey | null>(null);
  const [notifOpen, setNotifOpen] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [langMenuOpen, setLangMenuOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [compactSearchOpen, setCompactSearchOpen] = useState(false);

  const shellRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const compactSearchInputRef = useRef<HTMLInputElement>(null);

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

  // Auto-hide header on scroll toggle (authentic Coretax feature from bottom-left switch)
  useEffect(() => {
    let lastY = window.scrollY;
    const handleScroll = () => {
      const y = window.scrollY;
      if (autoHideOnScroll && y > 130 && y > lastY) {
        setScrolledDown(true);
      } else {
        setScrolledDown(false);
      }
      lastY = y;
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
    : QUICK_SERVICES.slice(0, 6);

  const activeNavMeta = NAV_CONFIG.find((n) => n.key === activeModule) || NAV_CONFIG[0];
  const activeSubMeta =
    activeNavMeta.items.find((i) => i.id === activeSubTab) || activeNavMeta.items[0];

  return (
    <div
      ref={shellRef}
      className={`min-h-screen flex flex-col relative overflow-x-clip transition-colors duration-200 ${
        darkHeader ? 'bg-[#0F172A] text-slate-100' : 'bg-[#EAEEF7] text-[#1E293B]'
      }`}
    >
      {/* Subtle Sculpted Pearl-Lavender Atmospheric Background matching Official 2026 Coretax */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden z-0" aria-hidden="true">
        <div
          className={`absolute inset-0 ${
            darkHeader
              ? 'bg-[radial-gradient(circle_at_90%_12%,rgba(59,89,182,0.22)_0%,transparent_48%),linear-gradient(135deg,#0B1224_0%,#111C38_100%)]'
              : 'bg-[radial-gradient(circle_at_92%_10%,rgba(216,226,248,0.9)_0%,transparent_45%),radial-gradient(circle_at_8%_85%,rgba(221,230,248,0.85)_0%,transparent_50%),linear-gradient(135deg,#F1F4FA_0%,#E7ECF6_100%)]'
          }`}
        />
        <svg
          viewBox="0 0 1440 820"
          preserveAspectRatio="xMidYMid slice"
          className="absolute inset-0 w-full h-full opacity-50"
        >
          <circle
            cx="1370"
            cy="310"
            r="150"
            fill={darkHeader ? '#1E2F5C' : '#FFFFFF'}
            fillOpacity={darkHeader ? '0.28' : '0.45'}
          />
          <path
            d="M-60 560 C180 510 380 650 640 840 L-60 840 Z"
            fill={darkHeader ? '#19274D' : '#FFFFFF'}
            fillOpacity={darkHeader ? '0.25' : '0.42'}
          />
        </svg>
      </div>

      {/* Impersonation Slim Ribbon when acting as Corporate PKP */}
      {accountMode === 'CORPORATE' && (
        <div className="relative z-30 bg-[#1D4ED8] text-white text-xs px-4 sm:px-6 py-1.5 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Building2 className="w-3.5 h-3.5 text-[#F4C430] shrink-0" />
            <span>
              <strong>Impersonating (Wajib Pajak Badan / PKP):</strong>{' '}
              <span className="font-bold">{corporateTaxpayer.name}</span>
              <span className="mx-1.5 opacity-60">·</span>
              <span className="font-mono-num">{corporateTaxpayer.nikNpwp}</span>
            </span>
          </div>
          <button
            type="button"
            onClick={() => onSwitchAccountMode('INDIVIDUAL')}
            className="text-[11px] font-semibold bg-white/15 hover:bg-white/25 px-3 py-0.5 rounded-full border border-white/30 transition cursor-pointer"
          >
            Kembali ke Akun Utama ({individualTaxpayer.name})
          </button>
        </div>
      )}

      {/* ===================================================================== */}
      {/* FLOATING 2-ROW WHITE HEADER CARD (EXACT MATCH TO 2026 CORETAX)        */}
      {/* ===================================================================== */}
      <header
        className={`sticky top-2.5 z-30 mx-3 sm:mx-4 mt-3 transition-transform duration-300 ${
          scrolledDown ? '-translate-y-[125%]' : 'translate-y-0'
        }`}
      >
        <div
          className={`rounded-[16px] border shadow-[0_6px_26px_rgba(30,44,94,0.07)] transition-colors ${
            darkHeader
              ? 'bg-slate-900/95 border-slate-700/80 backdrop-blur-md'
              : 'bg-white border-[#E5EAF2]'
          }`}
        >
          {/* ROW 1: LOGO | SEARCH (Ctrl K on xl+) | UTILITIES | ACCOUNT BOX | HOME */}
          <div
            className={`px-3 sm:px-4 xl:px-5 py-2.5 flex items-center justify-between gap-2 xl:gap-3 min-w-0 border-b ${
              darkHeader ? 'border-slate-800' : 'border-[#F1F5F9]'
            }`}
          >
            {/* Left: Mobile/Tablet Menu Button + KelasBrevet Logo Lockup */}
            <div className="flex items-center gap-2 shrink-0 min-w-0">
              <button
                type="button"
                onClick={() => setMobileMenuOpen(true)}
                className="lg:hidden p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 cursor-pointer shrink-0"
                aria-label="Buka submenu"
              >
                <Menu className="w-5 h-5" />
              </button>
              <button
                type="button"
                onClick={() => onNavigate('portal', 'ikhtisar')}
                className="cursor-pointer text-left shrink-0"
                title="Beranda Coretax KelasBrevet"
              >
                <KelasBrevetLogo variant="portalbar" dark={darkHeader} />
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
            <div className="flex items-center gap-1 sm:gap-1.5 xl:gap-2 shrink-0 min-w-0">
              {/* Compact Search Toggle Button on Tablet & Mobile (< xl) */}
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
                className={`xl:hidden p-1.5 sm:p-2 rounded-lg transition cursor-pointer ${
                  compactSearchOpen
                    ? 'bg-[#EEF2FA] text-[#1E2C5E]'
                    : darkHeader
                      ? 'text-slate-300 hover:bg-slate-800'
                      : 'text-[#1E2C5E] hover:bg-[#F4F6FA]'
                }`}
              >
                <Search className="w-[17px] h-[17px]" />
              </button>

              {/* Help / Guided Exam Icon */}
              <button
                type="button"
                onClick={onOpenExamDrawer}
                title={`Soal Latihan & Cek Otomatis (${examCompletedCount}/5)`}
                className={`relative p-1.5 sm:p-2 rounded-lg transition cursor-pointer ${
                  darkHeader
                    ? 'text-slate-300 hover:bg-slate-800'
                    : 'text-[#1E2C5E] hover:bg-[#F4F6FA]'
                }`}
              >
                <HelpCircle className="w-[18px] h-[18px]" />
                <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-[16px] px-1 rounded-full bg-[#F4C430] text-[#1B2958] text-[9.5px] font-extrabold font-mono-num flex items-center justify-center">
                  {examCompletedCount}
                </span>
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

              {/* Language Flag Selector */}
              <div className="relative hidden md:block">
                <button
                  type="button"
                  onClick={() => {
                    setLangMenuOpen((prev) => !prev);
                    setNotifOpen(false);
                    setAccountMenuOpen(false);
                  }}
                  className={`px-1.5 xl:px-2 py-1.5 rounded-lg inline-flex items-center gap-1.5 text-xs font-semibold transition cursor-pointer ${
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

              {/* Rounded Bordered Taxpayer / Impersonate Box */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    setAccountMenuOpen((prev) => !prev);
                    setNotifOpen(false);
                    setLangMenuOpen(false);
                    setOpenDropdown(null);
                  }}
                  className={`flex items-center gap-2 px-2 sm:px-2.5 xl:px-3 py-1.5 rounded-[10px] border transition cursor-pointer ${
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
                  <div className="hidden md:block text-left leading-[1.15] max-w-[110px] lg:max-w-[135px] xl:max-w-[165px]">
                    <div
                      className={`text-[10px] font-mono-num truncate ${
                        darkHeader ? 'text-slate-400' : 'text-slate-500'
                      }`}
                    >
                      {activeTaxpayer.nikNpwp}
                    </div>
                    <div className="text-[11.5px] xl:text-[12px] font-bold uppercase tracking-tight truncate">
                      {activeTaxpayer.name}
                    </div>
                  </div>
                  <ChevronDown className="w-3.5 h-3.5 opacity-60 shrink-0" />
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
                        onClick={() => {
                          onConnectCloud();
                          setAccountMenuOpen(false);
                        }}
                        className="w-full px-3 py-2 rounded-lg text-left text-xs font-medium text-slate-700 hover:bg-white flex items-center gap-2 cursor-pointer"
                      >
                        <Cloud className="w-3.5 h-3.5 text-[#1E2C5E]" />
                        <span className="truncate">
                          {cloudUserEmail ? `Cloud: ${cloudUserEmail}` : 'Hubungkan Cloud Sync'}
                        </span>
                      </button>
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
                className={`p-1.5 sm:p-2 rounded-lg transition cursor-pointer ${
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

          {/* ROW 2: RESPONSIVE HORIZONTAL MODULE RIBBON (Zero Tablet Overflow + Smart Edge-Clamped Popovers) */}
          <nav
            className="px-2.5 sm:px-4 xl:px-5 py-2 flex flex-wrap items-center justify-between gap-x-2 gap-y-1.5"
            onMouseLeave={() => setOpenDropdown(null)}
          >
            <div className="flex flex-wrap items-center gap-1 sm:gap-1.5 lg:gap-2.5 xl:gap-4 min-w-0">
              {NAV_CONFIG.map((item) => {
                const isActive = activeModule === item.key;
                const isHoveredOpen = openDropdown === item.key;
                const isHighlighted = isHoveredOpen || (openDropdown === null && isActive);

                const popoverAlignClass =
                  item.key === 'pembayaran'
                    ? 'right-0 lg:right-auto lg:left-0'
                    : item.key === 'spt'
                      ? 'left-1/2 -translate-x-1/2 sm:left-0 sm:translate-x-0'
                      : 'left-0';

                const caretAlignClass =
                  item.key === 'pembayaran'
                    ? 'right-10 lg:right-auto lg:left-12'
                    : item.key === 'spt'
                      ? 'left-1/2 -translate-x-1/2 sm:left-12 sm:translate-x-0'
                      : 'left-12';

                return (
                  <div
                    key={item.key}
                    className="relative shrink-0"
                    onMouseEnter={() => {
                      if (item.hasChevron) {
                        setOpenDropdown(item.key);
                      } else {
                        setOpenDropdown(null);
                      }
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        onNavigate(item.key, item.items[0].id);
                        setOpenDropdown(null);
                      }}
                      className={`inline-flex items-center gap-1.5 lg:gap-2 px-2.5 lg:px-3.5 py-1.5 lg:py-2 rounded-[10px] text-[12px] lg:text-[13px] transition-all duration-150 cursor-pointer whitespace-nowrap ${
                        isHighlighted
                          ? 'bg-[#FEF08A]/85 text-[#1B2958] font-bold border border-[#F4C430]/75 border-b-[3px] border-b-[#F2B705] shadow-[0_2px_8px_rgba(242,183,5,0.20)]'
                          : darkHeader
                            ? 'text-slate-200 hover:bg-slate-800 font-semibold border border-transparent'
                            : 'text-[#1E293B] hover:bg-[#F4F6FA] font-semibold border border-transparent'
                      }`}
                    >
                      <ModuleBadgeIcon icon={item.icon} />
                      <span>{item.label}</span>
                      {item.hasChevron && (
                        <ChevronDown
                          className={`w-3.5 h-3.5 opacity-70 transition-transform duration-150 ${
                            isHoveredOpen ? 'rotate-180' : ''
                          }`}
                        />
                      )}
                    </button>

                    {/* Floating Speech-Bubble Hover Popover Card (Edge-Clamped for Tablet & Desktop) */}
                    {item.hasChevron && isHoveredOpen && (
                      <div className={`absolute top-full pt-2.5 z-50 ${popoverAlignClass}`}>
                        <div className="relative w-[min(350px,calc(100vw-2rem))] bg-white text-[#1B2958] border border-[#E5EAF2] rounded-[16px] shadow-[0_20px_50px_rgba(30,44,94,0.16)]">
                          {/* Speech-bubble upward caret pointer */}
                          <div
                            className={`w-3.5 h-3.5 bg-white border-l border-t border-[#E5EAF2] rotate-45 absolute -top-[7px] ${caretAlignClass}`}
                            aria-hidden="true"
                          />

                          {/* Muted Uppercase Popover Header */}
                          <div className="px-5 pt-4 pb-2.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400 border-b border-[#F1F5F9]">
                            {item.popoverTitle}
                          </div>

                          {/* Submenu List */}
                          <div className="p-2 space-y-0.5">
                            {item.items.map((sub) => {
                              const isCurrentSub =
                                isActive &&
                                (item.key === 'spt' ? true : activeSubTab === sub.id);
                              return (
                                <button
                                  key={sub.id}
                                  type="button"
                                  onClick={() => {
                                    onNavigate(item.key, sub.id);
                                    setOpenDropdown(null);
                                  }}
                                  className={`w-full text-left px-3.5 py-2 rounded-[10px] text-[13px] transition cursor-pointer flex items-center justify-between gap-2 ${
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
                );
              })}
            </div>

            {/* Subtle Right-Aligned Guided Exam Button (Desktop lg+ so tablet ribbon stays airy) */}
            <button
              type="button"
              onClick={onOpenExamDrawer}
              className={`hidden lg:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[10px] text-xs font-semibold transition cursor-pointer whitespace-nowrap shrink-0 ${
                darkHeader
                  ? 'bg-slate-800 text-[#F4C430] hover:bg-slate-700 border border-slate-700'
                  : 'bg-[#F4F6FA] hover:bg-[#FEF9E7] text-[#1B2958] border border-[#E5EAF2]'
              }`}
            >
              <Award className="w-3.5 h-3.5 text-[#D97706]" />
              <span>Soal Latihan</span>
              <span
                className={`font-mono-num font-bold ${
                  darkHeader ? 'text-[#F4C430]' : 'text-[#1E2C5E]'
                }`}
              >
                {examCompletedCount}/5
              </span>
            </button>
          </nav>
        </div>
      </header>

      {/* ===================================================================== */}
      {/* FLOATING 2-COLUMN WORKSPACE (LEFT SUBMENU CARD + RIGHT CONTENT CARD)  */}
      {/* ===================================================================== */}
      <div className="relative z-10 flex-1 flex gap-4 px-3 sm:px-4 py-4 items-start">
        {/* LEFT FLOATING WHITE SUBMENU CARD (Syncs with hovered navbar module like screenshots 2-4) */}
        {(() => {
          const sidebarMeta =
            (openDropdown ? NAV_CONFIG.find((n) => n.key === openDropdown) : activeNavMeta) ||
            activeNavMeta;
          const SidebarModuleIcon = sidebarMeta.icon;

          return (
            <aside
              className={`hidden lg:flex flex-col shrink-0 rounded-[16px] border shadow-[0_6px_26px_rgba(30,44,94,0.06)] transition-all duration-200 sticky top-[132px] max-h-[calc(100vh-148px)] ${
                darkHeader ? 'bg-slate-900 border-slate-700/80' : 'bg-white border-[#E5EAF2]'
              } ${leftCollapsed ? 'w-[64px]' : 'w-[224px] xl:w-[258px]'}`}
            >
              {/* Top Shaded Module Header inside Left Panel */}
              <div
                className={`m-3 rounded-[12px] px-3 py-2.5 flex items-center ${
                  leftCollapsed ? 'justify-center' : 'justify-between gap-2'
                } ${darkHeader ? 'bg-slate-800' : 'bg-[#F4F6FA]'}`}
              >
                {!leftCollapsed && (
                  <div className="flex items-center gap-2 min-w-0">
                    <ModuleBadgeIcon icon={SidebarModuleIcon} />
                    <span
                      title={sidebarMeta.sidebarLabel}
                      className={`font-display font-bold text-[13.5px] truncate ${
                        darkHeader ? 'text-white' : 'text-[#1B2958]'
                      }`}
                    >
                      {sidebarMeta.sidebarLabel}
                    </span>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => setLeftCollapsed((prev) => !prev)}
                  title={leftCollapsed ? 'Tampilkan panel menu' : 'Sembunyikan panel menu'}
                  className={`w-7 h-7 rounded-lg border flex items-center justify-center shrink-0 transition cursor-pointer ${
                    darkHeader
                      ? 'bg-slate-900 border-slate-700 text-slate-300 hover:text-white'
                      : 'bg-white border-[#E2E8F0] text-[#475569] hover:text-[#1B2958]'
                  }`}
                >
                  {leftCollapsed ? (
                    <ChevronsRight className="w-4 h-4" />
                  ) : (
                    <ChevronsLeft className="w-4 h-4" />
                  )}
                </button>
              </div>

              {/* Vertical Submenu Items List with authentic subtle gold active indicator */}
              {!leftCollapsed && (
                <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-0.5">
                  {sidebarMeta.items.map((sub) => {
                    const isSubActive =
                      activeModule === sidebarMeta.key &&
                      (sidebarMeta.key === 'spt' ? true : activeSubTab === sub.id);
                    return (
                      <button
                        key={sub.id}
                        type="button"
                        title={sub.label}
                        onClick={() => {
                          onNavigate(sidebarMeta.key, sub.id);
                          setOpenDropdown(null);
                        }}
                        className={`relative w-full text-left px-3.5 py-2.5 rounded-[10px] text-[13px] transition cursor-pointer flex items-center justify-between gap-2 ${
                          isSubActive
                            ? darkHeader
                              ? 'bg-slate-800 text-[#F4C430] font-bold'
                              : 'bg-[#F1F4FA] text-[#1B2958] font-bold'
                            : darkHeader
                              ? 'text-slate-300 hover:bg-slate-800/60 font-medium'
                              : 'text-[#52607A] hover:bg-[#F6F8FC] hover:text-[#1B2958] font-medium'
                        }`}
                      >
                        {isSubActive && (
                          <span
                            className="w-[3px] h-5 rounded-full bg-[#F4C430] absolute left-1 top-1/2 -translate-y-1/2"
                            aria-hidden="true"
                          />
                        )}
                        <span className="truncate">{sub.label}</span>
                        {sidebarMeta.key === 'spt' && isSubActive && (
                          <span className="w-5 h-5 rounded-full bg-white border border-slate-200 flex items-center justify-center shrink-0">
                            <ChevronRight className="w-3 h-3 text-[#1B2958]" />
                          </span>
                        )}
                        {sub.id === 'notifikasi' && unreadCount > 0 && (
                          <span className="text-[10.5px] font-mono-num font-bold text-[#DC2626]">
                            {unreadCount}
                          </span>
                        )}
                      </button>
                    );
                  })}

                  {/* Extra contextual Impersonate shortcut when on Portal Saya */}
                  {sidebarMeta.key === 'portal' && (
                    <button
                      type="button"
                      onClick={() =>
                        onSwitchAccountMode(accountMode === 'CORPORATE' ? 'INDIVIDUAL' : 'CORPORATE')
                      }
                      className={`w-full text-left px-3.5 py-2.5 rounded-[10px] text-[13px] font-medium transition cursor-pointer ${
                        darkHeader
                          ? 'text-slate-300 hover:bg-slate-800/60'
                          : 'text-[#52607A] hover:bg-[#F6F8FC] hover:text-[#1B2958]'
                      }`}
                    >
                      {accountMode === 'CORPORATE'
                        ? 'Kembali ke Orang Pribadi'
                        : 'Impersonate Badan / PKP'}
                    </button>
                  )}
                </div>
              )}

              {/* Bottom "Auto hide saat di-scroll" Toggle Switch */}
              {!leftCollapsed && (
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
              )}
            </aside>
          );
        })()}

        {/* MOBILE SUBMENU SLIDE-OVER DRAWER */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-50 lg:hidden flex">
            <div
              className="fixed inset-0 bg-slate-900/45 backdrop-blur-[2px]"
              onClick={() => setMobileMenuOpen(false)}
            />
            <div className="relative z-10 w-[275px] max-w-[84vw] h-full bg-white shadow-2xl flex flex-col">
              <div className="px-4 py-3.5 border-b border-slate-100 flex items-center justify-between">
                <span className="font-display font-bold text-sm text-[#1B2958]">
                  {activeNavMeta.sidebarLabel}
                </span>
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-3 space-y-1">
                {activeNavMeta.items.map((sub) => (
                  <button
                    key={sub.id}
                    type="button"
                    onClick={() => {
                      onNavigate(activeModule, sub.id);
                      setMobileMenuOpen(false);
                    }}
                    className={`w-full text-left px-3.5 py-2.5 rounded-xl text-[13px] cursor-pointer ${
                      activeSubTab === sub.id
                        ? 'bg-[#EEF2FA] text-[#1B2958] font-bold'
                        : 'text-slate-600 hover:bg-slate-50 font-medium'
                    }`}
                  >
                    {sub.label}
                  </button>
                ))}
              </div>
              <div className="p-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    onOpenExamDrawer();
                    setMobileMenuOpen(false);
                  }}
                  className="w-full py-2.5 px-3 rounded-xl bg-[#FEF9E7] border border-[#F4C430] text-[#1B2958] text-xs font-bold flex items-center justify-between cursor-pointer"
                >
                  <span>Soal Latihan</span>
                  <span className="font-mono-num">{examCompletedCount}/5</span>
                </button>
              </div>
            </div>
          </div>
        )}

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
              {(activeSubMeta.breadcrumbLabel || activeSubMeta.label) === activeNavMeta.sidebarLabel ? (
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
                    onClick={() => onNavigate(activeModule, activeNavMeta.items[0].id)}
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
          <div className="p-4 sm:p-5 xl:p-6 flex-1 bg-white text-[#1E293B]">{children}</div>
        </main>
      </div>
    </div>
  );
};
