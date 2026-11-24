import React, { useState } from 'react';
import { ChevronDown, Check, Sun, Moon } from 'lucide-react';
import { KelasBrevetLogo } from './KelasBrevetLogo.tsx';

interface LogoutPageProps {
  onGoToLogin: () => void;
  language?: 'id-ID' | 'en-US';
  onLanguageChange?: (lang: 'id-ID' | 'en-US') => void;
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
      <clipPath id="idFlagClipLogout">
        <circle cx="12" cy="12" r="12" />
      </clipPath>
      <g clipPath="url(#idFlagClipLogout)">
        <rect x="0" y="0" width="24" height="12" fill="#DC2626" />
        <rect x="0" y="12" width="24" height="12" fill="#FFFFFF" />
      </g>
    </svg>
  );
};

export const LogoutPage: React.FC<LogoutPageProps> = ({
  onGoToLogin,
  language = 'id-ID',
  onLanguageChange = () => {},
}) => {
  const [darkTheme, setDarkTheme] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const isId = language === 'id-ID';

  return (
    <div
      className={`min-h-screen relative flex flex-col justify-between overflow-x-hidden font-sans select-none ${
        darkTheme ? 'bg-[#0B1224] text-slate-100' : 'bg-[#F4F7FC] text-slate-800'
      }`}
    >
      {/* Background with Coretax watermarks and smooth curves */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-90 transition-opacity duration-500"
          style={{
            backgroundImage:
              "url('https://coretaxdjp.pajak.go.id/identityproviderportal/asset-login-new/djpcoretaxbg.webp'), url('/djpcoretaxbg.webp')",
          }}
        />
        {darkTheme && <div className="absolute inset-0 bg-[#0B1224]/85 backdrop-blur-[1px]" />}
      </div>

      {/* TOP HEADER */}
      <header className="relative z-20 w-full max-w-[1380px] mx-auto px-6 sm:px-10 lg:px-14 pt-6 sm:pt-7 pb-3 flex items-center justify-between gap-4">
        <div className="py-0.5 text-left">
          <KelasBrevetLogo variant="topbar" dark={darkTheme} />
        </div>

        {/* Right Controls: Theme Toggle + Language Dropdown */}
        <div className="flex items-center gap-3 shrink-0">
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

          {/* Language Selector */}
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

      {/* MAIN BODY: 2 COLUMNS MATCHING GAMBAR 2 */}
      <main className="relative z-10 w-full max-w-[1280px] mx-auto px-6 sm:px-10 lg:px-14 py-8 md:py-16 flex-1 flex items-center">
        <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-16 items-center">
          {/* LEFT COLUMN: BRANDING & LOGOUT SUMMARY */}
          <div className="lg:col-span-6 space-y-4">
            <div>
              <KelasBrevetLogo variant="hero" dark={darkTheme} />
            </div>

            <div>
              <h1 className="font-display font-black text-3xl sm:text-4xl text-[#1E2C5E] tracking-tight">
                Anda Telah Keluar
              </h1>
              <div className="w-16 h-1 bg-[#F59E0B] rounded mt-2.5 mb-4" />
            </div>

            <p className="text-slate-600 text-sm sm:text-base leading-relaxed max-w-lg">
              Sesi Anda telah diakhiri dengan aman. Terima kasih telah menggunakan Simulasi Coretax by Kelasbrevet.
            </p>
          </div>

          {/* RIGHT COLUMN: LOGGED OUT CARD */}
          <div className="lg:col-span-6 flex justify-center lg:justify-end">
            <div
              className={`w-full max-w-md rounded-2xl p-8 sm:p-10 shadow-[0_12px_40px_rgba(30,44,94,0.08)] border transition-all ${
                darkTheme
                  ? 'bg-slate-800/90 border-slate-700 text-slate-100 backdrop-blur-md'
                  : 'bg-white/95 border-slate-200/90 text-slate-800 backdrop-blur-md'
              }`}
            >
              <h2 className="font-display font-extrabold text-2xl text-[#1E2C5E] tracking-tight text-center sm:text-left">
                Anda Telah Keluar
              </h2>
              <p className="text-xs text-slate-500 mt-1 mb-8 text-center sm:text-left">
                Sesi Anda telah diakhiri dengan aman
              </p>

              {/* Official Coretax Yellow Logout / Exit Icon (Matching user reference 100%) */}
              <div className="flex justify-center my-8">
                <svg
                  className="w-14 h-14 text-[#FFC70F]"
                  viewBox="0 0 54 55"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M 19.5 17.5 C 19.5 9 26.5 3 37 3 C 46 3 52 9.5 52 18.5 L 52 36.5 C 52 45.5 46 52 37 52 C 26.5 52 19.5 46 19.5 37.5" />
                  <polyline points="11.5 18 2.5 27.5 11.5 37" />
                  <line x1="37" y1="27.5" x2="2.5" y2="27.5" />
                </svg>
              </div>

              <p className="text-xs text-slate-600 text-center mb-6 leading-relaxed">
                Klik tombol di bawah untuk masuk kembali ke portal Wajib Pajak.
              </p>

              <button
                type="button"
                onClick={onGoToLogin}
                className="w-full py-3.5 px-6 rounded-xl bg-[#1E2C5E] hover:bg-[#152048] active:scale-[0.99] text-white font-bold text-xs uppercase tracking-wider transition-all shadow-md cursor-pointer flex items-center justify-center gap-2"
              >
                <span>Akses Halaman Login Portal Wajib Pajak</span>
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* FOOTER */}
      <footer className="relative z-10 w-full py-5 text-center text-xs text-slate-500 border-t border-slate-200/60 bg-white/40 backdrop-blur-xs">
        <p>© 2026 Direktorat Jenderal Pajak. Seluruh hak cipta dilindungi.</p>
      </footer>
    </div>
  );
};
