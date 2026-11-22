import React, { useState } from 'react';
import {
  ArrowRight,
  Check,
  ChevronDown,
  Eye,
  EyeOff,
  Link2,
  Lock,
  LockOpen,
  Moon,
  RefreshCw,
  ShieldCheck,
  ShieldX,
  Sun,
  User,
  UserX,
  Wifi,
  X,
} from 'lucide-react';
import { KelasBrevetLogo } from './KelasBrevetLogo.tsx';

interface LoginPageProps {
  onLoginNik: (nik: string, password?: string) => Promise<void>;
  language: 'id-ID' | 'en-US';
  onLanguageChange: (lang: 'id-ID' | 'en-US') => void;
  loading: boolean;
  error: string | null;
}

const FlagIcon: React.FC<{ lang: 'id-ID' | 'en-US' }> = ({ lang }) => {
  if (lang === 'en-US') {
    return (
      <svg width="20" height="20" viewBox="0 0 24 24" className="rounded-full shrink-0 border border-slate-200">
        <circle cx="12" cy="12" r="12" fill="#1E3A8A" />
        <path d="M0 10H24V14H0V10ZM10 0H14V24H10V0Z" fill="#FFFFFF" />
        <path d="M0 11H24V13H0V11ZM11 0H13V24H11V0Z" fill="#DC2626" />
      </svg>
    );
  }
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" className="rounded-full shrink-0 border border-slate-200">
      <clipPath id="idFlagClip">
        <circle cx="12" cy="12" r="12" />
      </clipPath>
      <g clipPath="url(#idFlagClip)">
        <rect x="0" y="0" width="24" height="12" fill="#DC2626" />
        <rect x="0" y="12" width="24" height="12" fill="#FFFFFF" />
      </g>
    </svg>
  );
};

export const LoginPage: React.FC<LoginPageProps> = ({
  onLoginNik,
  language,
  onLanguageChange,
  loading,
  error,
}) => {
  const initialNikParam =
    typeof window !== 'undefined'
      ? (new URLSearchParams(window.location.search).get('nik') || '').replace(/\D/g, '').slice(0, 16)
      : '';

  const [step, setStep] = useState<'LANDING' | 'LOGIN'>(initialNikParam ? 'LOGIN' : 'LANDING');
  const [darkTheme, setDarkTheme] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const [frontInfoCard, setFrontInfoCard] = useState<'SAFE' | 'AVOID'>('SAFE');

  const [nik, setNik] = useState(initialNikParam);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [humanVerified, setHumanVerified] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [modalMode, setModalMode] = useState<'NONE' | 'FORGOT'>('NONE');

  const isId = language === 'id-ID';
  const displayError = localError || error;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    const cleanedNik = nik.replace(/\D/g, '');
    if (cleanedNik.length < 10) {
      setLocalError(
        isId
          ? 'Masukkan ID Pengguna (NIK/NPWP 16 digit) yang valid.'
          : 'Please enter a valid 16-digit NIK/NPWP User ID.'
      );
      return;
    }

    if (!humanVerified) {
      setHumanVerified(true);
    }

    await onLoginNik(cleanedNik, password.trim() || undefined);
  };

  return (
    <div
      className={`min-h-screen relative overflow-hidden flex flex-col justify-between transition-colors duration-200 ${
        darkTheme
          ? 'bg-[#0F172A] text-slate-100'
          : 'bg-[#F3F5FA] text-[#1B2958]'
      }`}
    >
      {/* Luminous Pearl-White / Warm-Ivory to Cool-Periwinkle Sculpted 3D Backdrop (Exact 2026 Coretax Aesthetic) */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        {/* Base multi-directional atmospheric luminance */}
        <div
          className={`absolute inset-0 ${
            darkTheme
              ? 'bg-[radial-gradient(circle_at_8%_18%,rgba(244,196,48,0.10)_0%,transparent_42%),radial-gradient(circle_at_88%_35%,rgba(59,89,182,0.28)_0%,transparent_55%),linear-gradient(135deg,#0B1224_0%,#111C38_55%,#18254A_100%)]'
              : 'bg-[radial-gradient(circle_at_6%_24%,rgba(255,244,214,0.78)_0%,transparent_44%),radial-gradient(circle_at_92%_28%,rgba(216,225,246,0.92)_0%,transparent_54%),linear-gradient(125deg,#FAFBFD_0%,#F6F7FB_48%,#E9EEF8_100%)]'
          }`}
        />

        {/* Sculpted 3D Embossed Geometric Reliefs & Sweeping Silk Wave SVG */}
        <svg
          viewBox="0 0 1440 820"
          preserveAspectRatio="xMidYMid slice"
          className="absolute inset-0 w-full h-full"
        >
          <defs>
            <linearGradient id="silkWaveLight" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor={darkTheme ? '#243563' : '#D5DDEE'} stopOpacity={darkTheme ? '0.55' : '0.85'} />
              <stop offset="48%" stopColor={darkTheme ? '#1A274D' : '#F8FAFF'} stopOpacity={darkTheme ? '0.65' : '0.96'} />
              <stop offset="100%" stopColor={darkTheme ? '#131E3D' : '#C9D4EA'} stopOpacity={darkTheme ? '0.5' : '0.78'} />
            </linearGradient>
            <linearGradient id="reliefOrb" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor={darkTheme ? '#2B3E75' : '#FFFFFF'} stopOpacity={darkTheme ? '0.55' : '0.92'} />
              <stop offset="100%" stopColor={darkTheme ? '#152042' : '#CDD6EA'} stopOpacity={darkTheme ? '0.45' : '0.65'} />
            </linearGradient>
            <filter id="softEmbossed" x="-15%" y="-15%" width="130%" height="130%">
              <feDropShadow
                dx="0"
                dy="14"
                stdDeviation="18"
                floodColor={darkTheme ? '#050914' : '#9AA9C8'}
                floodOpacity={darkTheme ? '0.45' : '0.32'}
              />
            </filter>
          </defs>

          {/* Right-side embossed 3D sculptural circles & petals (matches both Coretax screenshots) */}
          <g filter="url(#softEmbossed)">
            {/* Top-right sweeping rounded arc */}
            <path
              d="M1195 -40 C1150 90 1190 215 1310 250 C1385 272 1455 245 1495 190 L1495 -40 Z"
              fill="url(#reliefOrb)"
              stroke={darkTheme ? '#384D88' : '#FFFFFF'}
              strokeWidth="2.5"
            />
            {/* Mid-right sculpted circular disc */}
            <circle
              cx="1348"
              cy="412"
              r="116"
              fill="url(#reliefOrb)"
              stroke={darkTheme ? '#384D88' : '#FFFFFF'}
              strokeWidth="2.5"
            />
            {/* Bottom-right sculpted teardrop / petal */}
            <path
              d="M1480 518 C1390 520 1358 585 1364 685 C1368 750 1425 790 1490 770 Z"
              fill="url(#reliefOrb)"
              stroke={darkTheme ? '#384D88' : '#FFFFFF'}
              strokeWidth="2.5"
            />
            {/* Lower-right curved ribbon */}
            <path
              d="M1195 840 C1235 765 1315 735 1470 725 L1470 840 Z"
              fill="url(#reliefOrb)"
              stroke={darkTheme ? '#384D88' : '#FFFFFF'}
              strokeWidth="2"
            />
          </g>

          {/* Bottom-left sweeping silk wave ribbon (prominent in Login screenshot & subtle on Landing) */}
          <g filter="url(#softEmbossed)">
            <path
              d="M-60 555 C120 515 265 625 495 835 L-60 835 Z"
              fill="url(#silkWaveLight)"
              stroke={darkTheme ? '#34477C' : '#FFFFFF'}
              strokeWidth="3"
            />
            <path
              d="M-60 660 C115 615 230 690 365 840"
              fill="none"
              stroke={darkTheme ? '#3E5594' : '#FFFFFF'}
              strokeWidth="2.2"
              opacity="0.7"
            />
          </g>
        </svg>
      </div>

      {/* TOP HEADER BAR — Exact Layout of Official Coretax Landing & Login */}
      <header className="relative z-20 w-full max-w-[1380px] mx-auto px-6 sm:px-10 lg:px-14 pt-6 sm:pt-7 pb-3 flex items-center justify-between gap-4">
        <button
          type="button"
          onClick={() => setStep('LANDING')}
          className="cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1E2C5E] rounded-lg py-0.5 text-left"
          title={isId ? 'Kembali ke Beranda Coretax KelasBrevet' : 'Return to Landing Page'}
        >
          <KelasBrevetLogo variant="topbar" dark={darkTheme} />
        </button>

        {/* Right Controls: Theme Toggle (visible on Login like official screenshot) + Language Pill */}
        <div className="flex items-center gap-3 shrink-0">
          {step === 'LOGIN' && (
            <button
              type="button"
              onClick={() => setDarkTheme((prev) => !prev)}
              aria-label={darkTheme ? 'Switch to light mode' : 'Switch to dark mode'}
              title={darkTheme ? 'Mode Terang' : 'Mode Gelap'}
              className={`w-10 h-10 rounded-full flex items-center justify-center transition shadow-[0_4px_16px_rgba(30,44,94,0.08)] cursor-pointer ${
                darkTheme
                  ? 'bg-slate-800 border border-slate-700 text-[#F4C430] hover:bg-slate-700'
                  : 'bg-white border border-slate-100 text-[#F5B700] hover:bg-slate-50'
              }`}
            >
              {darkTheme ? <Moon className="w-[18px] h-[18px]" /> : <Sun className="w-[18px] h-[18px]" />}
            </button>
          )}

          {/* Flag + Language Selector Pill */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setLangOpen((prev) => !prev)}
              className={`h-10 px-3.5 rounded-full inline-flex items-center gap-2 text-[13px] font-semibold transition shadow-[0_4px_16px_rgba(30,44,94,0.08)] cursor-pointer whitespace-nowrap ${
                darkTheme
                  ? 'bg-slate-800 border border-slate-700 text-slate-100 hover:bg-slate-700'
                  : 'bg-white border border-slate-100 text-[#1E293B] hover:bg-slate-50'
              }`}
            >
              <FlagIcon lang={language} />
              <span>{isId ? 'ID' : 'EN'}</span>
              <ChevronDown className="w-3.5 h-3.5 opacity-70" />
            </button>

            {langOpen && (
              <div
                className={`absolute right-0 mt-2 w-40 rounded-xl shadow-xl border py-1.5 z-40 ${
                  darkTheme
                    ? 'bg-slate-800 border-slate-700 text-slate-100'
                    : 'bg-white border-slate-200 text-slate-800'
                }`}
              >
                <button
                  type="button"
                  onClick={() => {
                    onLanguageChange('id-ID');
                    setLangOpen(false);
                  }}
                  className={`w-full px-3.5 py-2 text-left text-xs font-medium flex items-center justify-between cursor-pointer ${
                    darkTheme ? 'hover:bg-slate-700' : 'hover:bg-slate-50'
                  }`}
                >
                  <span className="inline-flex items-center gap-2">
                    <FlagIcon lang="id-ID" /> Indonesia (ID)
                  </span>
                  {isId && (
                    <Check
                      className={`w-3.5 h-3.5 ${darkTheme ? 'text-[#F4C430]' : 'text-[#1E2C5E]'}`}
                    />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onLanguageChange('en-US');
                    setLangOpen(false);
                  }}
                  className={`w-full px-3.5 py-2 text-left text-xs font-medium flex items-center justify-between cursor-pointer ${
                    darkTheme ? 'hover:bg-slate-700' : 'hover:bg-slate-50'
                  }`}
                >
                  <span className="inline-flex items-center gap-2">
                    <FlagIcon lang="en-US" /> English (EN)
                  </span>
                  {!isId && (
                    <Check
                      className={`w-3.5 h-3.5 ${darkTheme ? 'text-[#F4C430]' : 'text-[#1E2C5E]'}`}
                    />
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ===================================================================== */}
      {/* VIEW 1: OFFICIAL CORETAX LANDING PAGE (SECURITY GATE)                 */}
      {/* ===================================================================== */}
      {step === 'LANDING' ? (
        <main className="relative z-10 w-full max-w-[1260px] mx-auto px-6 sm:px-10 lg:px-14 flex-1 flex items-center py-6 sm:py-10">
          <div className="w-full grid grid-cols-1 lg:grid-cols-12 items-center gap-12 lg:gap-10">
            {/* LEFT HERO COLUMN */}
            <div className="lg:col-span-6 space-y-6">
              <KelasBrevetLogo variant="hero" dark={darkTheme} />

              <h1
                className={`font-display font-extrabold text-[36px] sm:text-[44px] lg:text-[48px] leading-[1.16] tracking-[-0.02em] ${
                  darkTheme ? 'text-white' : 'text-[#1B2958]'
                }`}
              >
                {isId ? (
                  <>
                    Selamat Datang
                    <br />
                    Anda akan masuk ke Simulasi
                    <br />
                    Coretax DJP
                  </>
                ) : (
                  <>
                    Welcome
                    <br />
                    You are entering Simulation
                    <br />
                    Coretax DJP
                  </>
                )}
              </h1>

              <p
                className={`text-[15px] sm:text-[15.5px] leading-[1.68] max-w-[495px] ${
                  darkTheme ? 'text-slate-300' : 'text-[#475569]'
                }`}
              >
                {isId
                  ? 'Pastikan Anda menggunakan perangkat dan jaringan yang aman sebelum melanjutkan proses login. Dengan melanjutkan, Anda menyetujui ketentuan penggunaan dan kebijakan keamanan DJP.'
                  : 'Please ensure you are using a secure device and network before proceeding to login. By continuing, you agree to the DJP terms of use and security policy.'}
              </p>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setStep('LOGIN')}
                  className="inline-flex items-center gap-3 px-8 py-4 rounded-full bg-[linear-gradient(90deg,#23326B_0%,#394885_55%,#5A679F_100%)] hover:brightness-110 active:scale-[0.99] text-white font-semibold text-[15px] shadow-[0_14px_30px_rgba(35,50,107,0.28)] transition-all cursor-pointer whitespace-nowrap"
                >
                  <span>{isId ? 'Lanjutkan ke Login' : 'Continue to Login'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* RIGHT COLUMN: INTERACTIVE OVERLAPPING "PRAKTIK AMAN" & "HAL YANG DIHINDARI" CARDS */}
            <div
              className="lg:col-span-6 relative flex flex-col"
              onMouseLeave={() => setFrontInfoCard('SAFE')}
            >
              {/* Card 1 (Upper-Left — Front by default like Screenshot 1, shifts behind on Card 2 hover) */}
              <div
                onMouseEnter={() => setFrontInfoCard('SAFE')}
                onClick={() => setFrontInfoCard('SAFE')}
                className={`w-full max-w-[405px] rounded-[24px] p-6 sm:p-7 backdrop-blur-md relative cursor-pointer transition-all duration-300 ease-out ${
                  frontInfoCard === 'SAFE'
                    ? darkTheme
                      ? 'z-30 scale-100 bg-slate-900/95 border border-emerald-400/40 shadow-[0_26px_60px_rgba(0,0,0,0.55)]'
                      : 'z-30 scale-100 bg-white/98 border border-white ring-1 ring-emerald-200/80 shadow-[0_24px_60px_rgba(30,44,94,0.13)]'
                    : darkTheme
                      ? 'z-10 scale-[0.985] bg-slate-900/85 border border-emerald-500/20 shadow-[0_14px_36px_rgba(0,0,0,0.35)] opacity-95'
                      : 'z-10 scale-[0.985] bg-white/92 border border-white ring-1 ring-emerald-100/70 shadow-[0_14px_38px_rgba(30,44,94,0.07)] opacity-95'
                }`}
              >
                <div className="flex items-start gap-3.5">
                  <div
                    className={`w-11 h-11 rounded-[14px] flex items-center justify-center shrink-0 ${
                      darkTheme ? 'bg-emerald-500/15 text-emerald-400' : 'bg-[#DCFCE7] text-[#10B981]'
                    }`}
                  >
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h2
                      className={`font-display font-bold text-[19px] leading-snug ${
                        darkTheme ? 'text-white' : 'text-[#111827]'
                      }`}
                    >
                      {isId ? 'Praktik Aman' : 'Safe Practices'}
                    </h2>
                    <p
                      className={`text-[13px] leading-snug mt-0.5 ${
                        darkTheme ? 'text-slate-400' : 'text-[#4B5563]'
                      }`}
                    >
                      {isId
                        ? 'Lindungi akun dengan kebiasaan digital yang aman.'
                        : 'Protect your account with secure digital habits.'}
                    </p>
                  </div>
                </div>

                <div className={`h-px my-4 ${darkTheme ? 'bg-slate-800' : 'bg-slate-100'}`} />

                <ul className="space-y-1">
                  <li
                    className={`flex items-start gap-3.5 rounded-xl px-3 py-2.5 -mx-3 transition-colors duration-150 ${
                      darkTheme
                        ? 'hover:bg-slate-800/80'
                        : 'hover:bg-[#F8FAFC] hover:shadow-[0_2px_10px_rgba(30,44,94,0.05)]'
                    }`}
                  >
                    <Lock className="w-[18px] h-[18px] text-[#10B981] shrink-0 mt-0.5" />
                    <div>
                      <div
                        className={`text-[13.5px] font-bold leading-snug ${
                          darkTheme ? 'text-slate-100' : 'text-[#1E293B]'
                        }`}
                      >
                        {isId ? 'Gunakan sandi kuat & aktifkan 2FA' : 'Use strong passwords & enable 2FA'}
                      </div>
                      <div
                        className={`text-[12.5px] mt-0.5 ${
                          darkTheme ? 'text-slate-400' : 'text-[#64748B]'
                        }`}
                      >
                        {isId
                          ? 'Buat sandi unik, panjang, dan sulit ditebak.'
                          : 'Create a unique, long, and hard-to-guess password.'}
                      </div>
                    </div>
                  </li>

                  <li
                    className={`flex items-start gap-3.5 rounded-xl px-3 py-2.5 -mx-3 transition-colors duration-150 ${
                      darkTheme
                        ? 'hover:bg-slate-800/80'
                        : 'hover:bg-[#F8FAFC] hover:shadow-[0_2px_10px_rgba(30,44,94,0.05)]'
                    }`}
                  >
                    <RefreshCw className="w-[18px] h-[18px] text-[#10B981] shrink-0 mt-0.5" />
                    <div>
                      <div
                        className={`text-[13.5px] font-bold leading-snug ${
                          darkTheme ? 'text-slate-100' : 'text-[#1E293B]'
                        }`}
                      >
                        {isId ? 'Perbarui sistem & peramban' : 'Keep OS & browser updated'}
                      </div>
                      <div
                        className={`text-[12.5px] mt-0.5 ${
                          darkTheme ? 'text-slate-400' : 'text-[#64748B]'
                        }`}
                      >
                        {isId
                          ? 'Pastikan OS dan browser selalu mutakhir.'
                          : 'Make sure your operating system and browser are up to date.'}
                      </div>
                    </div>
                  </li>

                  <li
                    className={`flex items-start gap-3.5 rounded-xl px-3 py-2.5 -mx-3 transition-colors duration-150 ${
                      darkTheme
                        ? 'hover:bg-slate-800/80'
                        : 'hover:bg-[#F8FAFC] hover:shadow-[0_2px_10px_rgba(30,44,94,0.05)]'
                    }`}
                  >
                    <Wifi className="w-[18px] h-[18px] text-[#10B981] shrink-0 mt-0.5" />
                    <div>
                      <div
                        className={`text-[13.5px] font-bold leading-snug ${
                          darkTheme ? 'text-slate-100' : 'text-[#1E293B]'
                        }`}
                      >
                        {isId ? 'Akses dari jaringan tepercaya' : 'Access from a trusted network'}
                      </div>
                      <div
                        className={`text-[12.5px] mt-0.5 ${
                          darkTheme ? 'text-slate-400' : 'text-[#64748B]'
                        }`}
                      >
                        {isId
                          ? 'Gunakan jaringan, wifi atau VPN yang tepercaya'
                          : 'Use a trusted network, Wi-Fi, or VPN.'}
                      </div>
                    </div>
                  </li>
                </ul>
              </div>

              {/* Card 2 (Lower-Right — Behind by default like Screenshot 1, rises to Front on hover like Screenshot 2) */}
              <div
                onMouseEnter={() => setFrontInfoCard('AVOID')}
                onClick={() => setFrontInfoCard('AVOID')}
                className={`mt-5 lg:-mt-40 lg:ml-auto w-full max-w-[405px] rounded-[24px] p-6 sm:p-7 backdrop-blur-md relative cursor-pointer transition-all duration-300 ease-out ${
                  frontInfoCard === 'AVOID'
                    ? darkTheme
                      ? 'z-30 scale-100 bg-slate-900/95 border border-rose-400/40 shadow-[0_26px_60px_rgba(0,0,0,0.55)]'
                      : 'z-30 scale-100 bg-[#F9F8FC]/98 border border-white ring-1 ring-rose-200/80 shadow-[0_26px_62px_rgba(30,44,94,0.14)]'
                    : darkTheme
                      ? 'z-10 scale-[0.985] bg-slate-900/85 border border-rose-500/20 shadow-[0_14px_36px_rgba(0,0,0,0.35)] opacity-95'
                      : 'z-10 scale-[0.985] bg-[#F5F4FA]/94 border border-white ring-1 ring-rose-100/70 shadow-[0_16px_40px_rgba(30,44,94,0.08)] opacity-95'
                }`}
              >
                <div className="flex items-start gap-3.5">
                  <div
                    className={`w-11 h-11 rounded-[14px] flex items-center justify-center shrink-0 ${
                      darkTheme ? 'bg-rose-500/15 text-rose-400' : 'bg-[#FDE8E8] text-[#E05252]'
                    }`}
                  >
                    <ShieldX className="w-5 h-5" />
                  </div>
                  <div>
                    <h2
                      className={`font-display font-bold text-[19px] leading-snug ${
                        darkTheme ? 'text-white' : 'text-[#111827]'
                      }`}
                    >
                      {isId ? 'Hal yang Dihindari' : 'What to Avoid'}
                    </h2>
                    <p
                      className={`text-[13px] leading-snug mt-0.5 ${
                        darkTheme ? 'text-slate-400' : 'text-[#4B5563]'
                      }`}
                    >
                      {isId
                        ? 'Waspadai tindakan yang membahayakan akun.'
                        : 'Stay alert to actions that compromise your account.'}
                    </p>
                  </div>
                </div>

                <div className={`h-px my-4 ${darkTheme ? 'bg-slate-800' : 'bg-slate-200/70'}`} />

                <ul className="space-y-1">
                  <li
                    className={`flex items-start gap-3.5 rounded-xl px-3 py-2.5 -mx-3 transition-colors duration-150 ${
                      darkTheme
                        ? 'hover:bg-slate-800/80'
                        : 'hover:bg-white hover:shadow-[0_2px_12px_rgba(30,44,94,0.06)]'
                    }`}
                  >
                    <UserX className="w-[18px] h-[18px] text-[#E05252] shrink-0 mt-0.5" />
                    <div>
                      <div
                        className={`text-[13.5px] font-bold leading-snug ${
                          darkTheme ? 'text-slate-100' : 'text-[#1E293B]'
                        }`}
                      >
                        {isId ? 'Membagikan OTP / Kode Akses' : 'Sharing OTP / Access Codes'}
                      </div>
                      <div
                        className={`text-[12.5px] mt-0.5 ${
                          darkTheme ? 'text-slate-400' : 'text-[#64748B]'
                        }`}
                      >
                        {isId
                          ? 'Jangan berikan kode kepada siapa pun.'
                          : 'Never share verification codes with anyone.'}
                      </div>
                    </div>
                  </li>

                  <li
                    className={`flex items-start gap-3.5 rounded-xl px-3 py-2.5 -mx-3 transition-colors duration-150 ${
                      darkTheme
                        ? 'hover:bg-slate-800/80'
                        : 'hover:bg-white hover:shadow-[0_2px_12px_rgba(30,44,94,0.06)]'
                    }`}
                  >
                    <Link2 className="w-[18px] h-[18px] text-[#E05252] shrink-0 mt-0.5" />
                    <div>
                      <div
                        className={`text-[13.5px] font-bold leading-snug ${
                          darkTheme ? 'text-slate-100' : 'text-[#1E293B]'
                        }`}
                      >
                        {isId ? 'Mengklik tautan mencurigakan' : 'Clicking suspicious links'}
                      </div>
                      <div
                        className={`text-[12.5px] mt-0.5 ${
                          darkTheme ? 'text-slate-400' : 'text-[#64748B]'
                        }`}
                      >
                        {isId
                          ? 'Hindari tautan asing dari WhatsApp atau Email.'
                          : 'Avoid unknown links from WhatsApp or Email.'}
                      </div>
                    </div>
                  </li>

                  <li
                    className={`flex items-start gap-3.5 rounded-xl px-3 py-2.5 -mx-3 transition-colors duration-150 ${
                      darkTheme
                        ? 'hover:bg-slate-800/80'
                        : 'hover:bg-white hover:shadow-[0_2px_12px_rgba(30,44,94,0.06)]'
                    }`}
                  >
                    <LockOpen className="w-[18px] h-[18px] text-[#E05252] shrink-0 mt-0.5" />
                    <div>
                      <div
                        className={`text-[13.5px] font-bold leading-snug ${
                          darkTheme ? 'text-slate-100' : 'text-[#1E293B]'
                        }`}
                      >
                        {isId ? 'Meninggalkan perangkat terbuka' : 'Leaving devices unlocked'}
                      </div>
                      <div
                        className={`text-[12.5px] mt-0.5 ${
                          darkTheme ? 'text-slate-400' : 'text-[#64748B]'
                        }`}
                      >
                        {isId
                          ? 'Selalu lock perangkat Anda saat tidak digunakan.'
                          : 'Always lock your device when unattended.'}
                      </div>
                    </div>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </main>
      ) : (
        /* ===================================================================== */
        /* VIEW 2: OFFICIAL CORETAX LOGIN SCREEN                                 */
        /* ===================================================================== */
        <main className="relative z-10 w-full max-w-[1260px] mx-auto px-6 sm:px-10 lg:px-14 flex-1 flex items-center py-6">
          <div className="w-full grid grid-cols-1 lg:grid-cols-12 items-center gap-10 lg:gap-12">
            {/* LEFT BRANDING COLUMN (Lower-middle balanced exactly like official Login screenshot) */}
            <div className="lg:col-span-6 lg:pt-20 space-y-4">
              <KelasBrevetLogo variant="hero" dark={darkTheme} />

              <h1
                className={`font-display font-extrabold text-[34px] sm:text-[40px] leading-[1.18] tracking-[-0.02em] ${
                  darkTheme ? 'text-white' : 'text-[#1B2958]'
                }`}
              >
                {isId ? (
                  <>
                    Sistem Inti Administrasi
                    <br />
                    Perpajakan
                  </>
                ) : (
                  <>
                    Core Tax Administration
                    <br />
                    System
                  </>
                )}
              </h1>

              {/* Iconic short horizontal golden bar */}
              <div className="w-12 h-[3.5px] bg-[#F4C430] rounded-full" />

              <p
                className={`text-[15px] font-medium ${
                  darkTheme ? 'text-slate-300' : 'text-[#64748B]'
                }`}
              >
                Pajak Tumbuh, Indonesia Tangguh
              </p>
            </div>

            {/* RIGHT FLOATING ROUNDED LOGIN CARD */}
            <div className="lg:col-span-6 flex justify-center lg:justify-end">
              <div
                className={`w-full max-w-[465px] rounded-[24px] p-7 sm:p-9 backdrop-blur-md transition-colors ${
                  darkTheme
                    ? 'bg-slate-900/95 border border-slate-700/80 shadow-[0_24px_60px_rgba(0,0,0,0.55)]'
                    : 'bg-white/95 border border-white shadow-[0_24px_64px_rgba(30,44,94,0.10)]'
                }`}
              >
                <h2
                  className={`font-display font-extrabold text-[26px] tracking-tight ${
                    darkTheme ? 'text-white' : 'text-[#1B2958]'
                  }`}
                >
                  {isId ? 'Selamat Datang!' : 'Welcome!'}
                </h2>
                <p
                  className={`text-[13.5px] mt-1 mb-6 ${
                    darkTheme ? 'text-slate-400' : 'text-[#64748B]'
                  }`}
                >
                  {isId
                    ? 'Masuk untuk mengakses Layanan Coretax DJP'
                    : 'Sign in to access Coretax DJP Services'}
                </p>

                {displayError && (
                  <div className="mb-4 px-3.5 py-2.5 rounded-[10px] border border-red-200 bg-red-50 text-[#B91C1C] text-[12.5px] leading-snug">
                    {displayError}
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* ID Pengguna */}
                  <div>
                    <label
                      htmlFor="coretax-user-id"
                      className={`block text-[13px] font-bold mb-1.5 ${
                        darkTheme ? 'text-slate-200' : 'text-[#1E293B]'
                      }`}
                    >
                      {isId ? 'ID Pengguna' : 'User ID'}
                    </label>
                    <div
                      className={`flex items-center rounded-[10px] border px-3.5 transition ${
                        darkTheme
                          ? 'bg-slate-800/80 border-slate-700 focus-within:border-[#F4C430]'
                          : 'bg-white border-[#DCE1EB] focus-within:border-[#1E2C5E] focus-within:ring-2 focus-within:ring-[#1E2C5E]/10'
                      }`}
                    >
                      <User
                        className={`w-[18px] h-[18px] shrink-0 mr-2.5 ${
                          darkTheme ? 'text-slate-400' : 'text-[#334155]'
                        }`}
                      />
                      <input
                        id="coretax-user-id"
                        type="text"
                        value={nik}
                        onChange={(e) => {
                          setNik(e.target.value.replace(/[^\d]/g, '').slice(0, 16));
                          if (localError) setLocalError(null);
                        }}
                        placeholder={
                          isId
                            ? 'NIK/NPWP/NITKU identitas khusus untuk ILAP'
                            : 'NIK/NPWP/NITKU 16-digit identifier'
                        }
                        className={`w-full py-3 text-[13.5px] bg-transparent focus:outline-none ${
                          darkTheme
                            ? 'text-white placeholder:text-slate-500'
                            : 'text-[#0F172A] placeholder:text-[#94A3B8]'
                        }`}
                      />
                    </div>
                  </div>

                  {/* Kata Sandi (Visual replica — optional for NIK-only simulation) */}
                  <div>
                    <label
                      htmlFor="coretax-password"
                      className={`block text-[13px] font-bold mb-1.5 ${
                        darkTheme ? 'text-slate-200' : 'text-[#1E293B]'
                      }`}
                    >
                      {isId ? 'Kata Sandi' : 'Password'}
                    </label>
                    <div
                      className={`flex items-center rounded-[10px] border px-3.5 transition ${
                        darkTheme
                          ? 'bg-slate-800/80 border-slate-700 focus-within:border-[#F4C430]'
                          : 'bg-white border-[#DCE1EB] focus-within:border-[#1E2C5E] focus-within:ring-2 focus-within:ring-[#1E2C5E]/10'
                      }`}
                    >
                      <Lock
                        className={`w-[18px] h-[18px] shrink-0 mr-2.5 ${
                          darkTheme ? 'text-slate-400' : 'text-[#334155]'
                        }`}
                      />
                      <input
                        id="coretax-password"
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder={isId ? 'Masukkan kata sandi Anda' : 'Enter your password'}
                        className={`w-full py-3 text-[13.5px] bg-transparent focus:outline-none ${
                          darkTheme
                            ? 'text-white placeholder:text-slate-500'
                            : 'text-[#0F172A] placeholder:text-[#94A3B8]'
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((prev) => !prev)}
                        aria-label="Toggle password visibility"
                        className={`ml-2 p-1 rounded cursor-pointer ${
                          darkTheme
                            ? 'text-slate-400 hover:text-slate-200'
                            : 'text-[#334155] hover:text-[#1E2C5E]'
                        }`}
                      >
                        {showPassword ? <EyeOff className="w-[18px] h-[18px]" /> : <Eye className="w-[18px] h-[18px]" />}
                      </button>
                    </div>
                  </div>

                  {/* Verifikasi — Exact "Saya bukan robot" Box */}
                  <div>
                    <span
                      className={`block text-[13px] font-bold mb-1.5 ${
                        darkTheme ? 'text-slate-200' : 'text-[#1E293B]'
                      }`}
                    >
                      {isId ? 'Verifikasi' : 'Verification'}
                    </span>
                    <button
                      type="button"
                      onClick={() => setHumanVerified((prev) => !prev)}
                      className={`w-full max-w-[275px] rounded-[10px] border px-4 py-3.5 flex items-center gap-3 text-left transition cursor-pointer ${
                        darkTheme
                          ? 'bg-slate-800/80 border-slate-700 hover:border-slate-500'
                          : 'bg-white border-[#DCE1EB] hover:border-[#B6C2D9]'
                      }`}
                    >
                      <span
                        className={`w-5 h-5 rounded-[4px] border flex items-center justify-center shrink-0 transition ${
                          humanVerified
                            ? 'bg-[#1E2C5E] border-[#1E2C5E] text-white'
                            : darkTheme
                              ? 'border-slate-500 bg-slate-900'
                              : 'border-[#94A3B8] bg-white'
                        }`}
                      >
                        {humanVerified && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                      </span>
                      <span
                        className={`text-[13px] font-semibold ${
                          darkTheme ? 'text-slate-200' : 'text-[#1E293B]'
                        }`}
                      >
                        {isId ? 'Saya bukan robot' : 'I am not a robot'}
                      </span>
                    </button>
                  </div>

                  {/* Lupa Kata Sandi? */}
                  <div className="pt-0.5">
                    <button
                      type="button"
                      onClick={() => setModalMode('FORGOT')}
                      className={`text-[12.5px] font-bold hover:underline cursor-pointer ${
                        darkTheme ? 'text-slate-300' : 'text-[#1E2C5E]'
                      }`}
                    >
                      {isId ? 'Lupa Kata Sandi?' : 'Forgot Password?'}
                    </button>
                  </div>

                  {/* Primary Deep Navy "Masuk" Button */}
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full mt-1 py-3.5 rounded-[10px] bg-[#1E2C5E] hover:bg-[#16224A] active:bg-[#111A3A] disabled:opacity-60 text-white font-bold text-[15px] shadow-[0_8px_20px_rgba(30,44,94,0.22)] transition cursor-pointer"
                  >
                    {loading
                      ? isId
                        ? 'Memproses...'
                        : 'Signing in...'
                      : isId
                        ? 'Masuk'
                        : 'Sign In'}
                  </button>
                </form>
              </div>
            </div>
          </div>
        </main>
      )}

      {/* QUIET FOOTER — Unboxed metadata & optional Cloud Sync */}
      <footer className="relative z-10 w-full max-w-[1380px] mx-auto px-6 sm:px-10 lg:px-14 py-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-[12px]">
        <div className={darkTheme ? 'text-slate-400' : 'text-[#64748B]'}>
          Lisensi Simulasi Perpajakan{' '}
          <span className={`font-semibold ${darkTheme ? 'text-slate-200' : 'text-[#1E2C5E]'}`}>
            KelasBrevet
          </span>
          <span className="mx-2" aria-hidden="true">·</span>
          <span>Login NIK Otomatis</span>
        </div>

        <div className="flex items-center gap-4">
          {step === 'LOGIN' && (
            <button
              type="button"
              onClick={() => setStep('LANDING')}
              className={`hover:underline cursor-pointer ${
                darkTheme ? 'text-slate-300' : 'text-[#475569]'
              }`}
            >
              {isId ? 'Halaman Keamanan' : 'Security Landing'}
            </button>
          )}
        </div>
      </footer>

      {/* HELPER MODAL FOR LUPA KATA SANDI */}
      {modalMode !== 'NONE' && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-[2px] flex items-center justify-center p-4">
          <div className="bg-white text-slate-800 rounded-[16px] shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden">
            <div className="bg-[#1E2C5E] text-white px-5 py-4 flex items-center justify-between">
              <h3 className="font-display font-bold text-sm">
                Informasi Login &amp; Kata Sandi Simulasi
              </h3>
              <button
                type="button"
                onClick={() => setModalMode('NONE')}
                className="text-slate-300 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs text-slate-700">
              <div className="space-y-3 leading-relaxed">
                <div className="bg-[#EFF6FF] border border-[#BFDBFE] text-[#1E3A8A] p-3.5 rounded-lg">
                  Bagi peserta paket Brevet dari <strong>kelasbrevet.com</strong>, silakan gunakan <strong>ID Pengguna (NIK/NPWP)</strong> dan <strong>Kata Sandi</strong> yang ditampilkan pada menu Simulasi di dashboard <strong>kelasbrevet.com</strong>.
                </div>
                <p>
                  Untuk penandatanganan elektronik (e-Faktur, e-Bupot, dan SPT), gunakan Passphrase default Kode Otorisasi DJP: <strong className="font-mono-num text-[#1E2C5E]">123456</strong>.
                </p>
              </div>

              <div className="flex justify-end pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalMode('NONE')}
                  className="px-4 py-2 bg-[#1E2C5E] text-white font-semibold rounded-lg text-xs cursor-pointer"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
