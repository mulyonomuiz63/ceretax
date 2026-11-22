import React from 'react';

interface KelasBrevetLogoProps {
  variant?: 'header' | 'login' | 'light' | 'topbar' | 'hero' | 'portalbar';
  dark?: boolean;
  className?: string;
}

export const KelasBrevetLogo: React.FC<KelasBrevetLogoProps> = ({
  variant = 'header',
  dark = false,
  className = '',
}) => {
  // 3-segment horizontal lockup replacing [Kemenkeu | djp | CORETAX] in the 2026 Home-Portal header
  if (variant === 'portalbar') {
    const textClass = dark ? 'text-white' : 'text-[#1E2C5E]';
    const dividerClass = dark ? 'bg-slate-600' : 'bg-slate-300';
    return (
      <div className={`inline-flex items-center gap-2 xl:gap-2.5 select-none shrink-0 ${className}`}>
        {/* Segment 1: Shield Crest Emblem */}
        <svg
          width="28"
          height="28"
          viewBox="0 0 48 48"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="shrink-0 xl:w-[30px] xl:h-[30px]"
          aria-label="Emblem KelasBrevet"
        >
          <path
            d="M24 3L6 10.5V23.5C6 34.4 13.7 42.9 24 46C34.3 42.9 42 34.4 42 23.5V10.5L24 3Z"
            fill="#1E2C5E"
          />
          <path
            d="M24 6.2L9.2 12.4V23.4C9.2 32.5 15.6 39.8 24 42.6C32.4 39.8 38.8 32.5 38.8 23.4V12.4L24 6.2Z"
            stroke="#F4C430"
            strokeWidth="2"
            fill="none"
          />
          <path d="M24 12.5L34.5 17.5L24 22.5L13.5 17.5L24 12.5Z" fill="#F4C430" />
          <path
            d="M17.5 21.5V28.2C17.5 30.1 20.4 32 24 32C27.6 32 30.5 30.1 30.5 28.2V21.5"
            stroke="#FFFFFF"
            strokeWidth="2.3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>

        <span className={`hidden xl:inline-block h-6 w-[1px] ${dividerClass}`} aria-hidden="true" />

        {/* Segment 2: Compact Badge + kb mark (exact rhythm of djp, shown on xl+ desktop) */}
        <div className="hidden xl:inline-flex items-center gap-1.5">
          <svg
            width="22"
            height="20"
            viewBox="0 0 32 26"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="shrink-0"
            aria-hidden="true"
          >
            <rect x="2" y="2" width="24" height="22" rx="5.5" fill="#1E2C5E" />
            <path
              d="M2 8C2 4.68629 4.68629 2 8 2H20.5C23.5376 2 26 4.46243 26 7.5V12.5H13.5C7.14873 12.5 2 10.4853 2 8Z"
              fill="#F5BC1B"
            />
            <rect x="8.5" y="7.5" width="11" height="11" rx="2.5" fill="#FFFFFF" />
          </svg>
          <span className={`font-display font-extrabold text-[15px] tracking-tight leading-none ${textClass}`}>
            kb
          </span>
        </div>

        <span className={`h-5 xl:h-6 w-[1px] ${dividerClass}`} aria-hidden="true" />

        {/* Segment 3: Bold Wordmark (replaces CORETAX in exact navy + gold styling) */}
        <div className="font-display font-black tracking-[-0.02em] text-[15px] sm:text-[16px] xl:text-[17px] leading-none flex items-baseline">
          <span className={textClass}>KELAS</span>
          <span className="text-[#F4B81B]">BREVET</span>
        </div>
      </div>
    );
  }

  // Top-left institutional lockup replacing [Kemenkeu | djp] on Landing & Login screens
  if (variant === 'topbar') {
    const textClass = dark ? 'text-white' : 'text-[#1E2C5E]';
    const dividerClass = dark ? 'bg-slate-600' : 'bg-slate-300';
    return (
      <div className={`inline-flex items-center gap-3.5 select-none ${className}`}>
        {/* Official KelasBrevet Crest Emblem */}
        <svg
          width="36"
          height="36"
          viewBox="0 0 48 48"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="shrink-0"
          aria-label="Emblem KelasBrevet"
        >
          <path
            d="M24 3L6 10.5V23.5C6 34.4 13.7 42.9 24 46C34.3 42.9 42 34.4 42 23.5V10.5L24 3Z"
            fill="#1E2C5E"
          />
          <path
            d="M24 6.2L9.2 12.4V23.4C9.2 32.5 15.6 39.8 24 42.6C32.4 39.8 38.8 32.5 38.8 23.4V12.4L24 6.2Z"
            stroke="#F4C430"
            strokeWidth="2"
            fill="none"
          />
          <path d="M24 12.5L34.5 17.5L24 22.5L13.5 17.5L24 12.5Z" fill="#F4C430" />
          <path
            d="M17.5 21.5V28.2C17.5 30.1 20.4 32 24 32C27.6 32 30.5 30.1 30.5 28.2V21.5"
            stroke="#FFFFFF"
            strokeWidth="2.3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path d="M34.5 17.5V25.5" stroke="#F4C430" strokeWidth="2" strokeLinecap="round" />
          <circle cx="34.5" cy="26.5" r="1.8" fill="#F4C430" />
        </svg>

        <span className={`h-8 w-[1px] ${dividerClass}`} aria-hidden="true" />

        {/* Stylized Mark matching DJP square-mark + lowercase bold wordmark proportion */}
        <div className="inline-flex items-center gap-2">
          <svg
            width="28"
            height="24"
            viewBox="0 0 32 26"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="shrink-0"
            aria-hidden="true"
          >
            <rect x="2" y="2" width="24" height="22" rx="5.5" fill="#1E2C5E" />
            <path
              d="M2 8C2 4.68629 4.68629 2 8 2H20.5C23.5376 2 26 4.46243 26 7.5V12.5H13.5C7.14873 12.5 2 10.4853 2 8Z"
              fill="#F5BC1B"
            />
            <rect x="8.5" y="7.5" width="11" height="11" rx="2.5" fill="#FFFFFF" />
            <path d="M12 10.5V15.5M12 13L15.8 10.5M13.5 12.2L16.2 15.5" stroke="#1E2C5E" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className={`font-display font-extrabold text-[19px] tracking-tight leading-none ${textClass}`}>
            kelasbrevet
          </span>
        </div>
      </div>
    );
  }

  // Hero wordmark replacing CORETAX on Landing & Login screens (same visual scale, navy + gold palette)
  if (variant === 'hero') {
    const primaryText = dark ? 'text-white' : 'text-[#1B2A5B]';
    return (
      <div className={`inline-flex items-center gap-2.5 select-none ${className}`} aria-label="KelasBrevet">
        <svg
          width="42"
          height="42"
          viewBox="0 0 48 48"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="shrink-0"
          aria-hidden="true"
        >
          <circle cx="24" cy="24" r="21" fill="#1B2A5B" />
          <path
            d="M24 3C35.598 3 45 12.402 45 24C45 27.6 44.08 31 42.47 33.96L24 24V3Z"
            fill="#F4C430"
          />
          <circle cx="24" cy="24" r="13.5" fill="#FFFFFF" />
          <path d="M24 14.5L32.5 18.8L24 23L15.5 18.8L24 14.5Z" fill="#1B2A5B" />
          <path
            d="M18.5 21.8V27.6C18.5 29.2 21 30.8 24 30.8C27 30.8 29.5 29.2 29.5 27.6V21.8"
            stroke="#1B2A5B"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="24" cy="25.5" r="2.8" fill="#DC2626" />
        </svg>
        <div className="font-display font-black tracking-[-0.03em] text-[34px] sm:text-[38px] leading-none flex items-baseline">
          <span className={primaryText}>KELAS</span>
          <span className="text-[#F4B81B]">BREVET</span>
        </div>
      </div>
    );
  }

  const isLight = variant === 'light';
  const primaryColorClass = isLight ? 'text-white' : 'text-[#1D2B53]';
  const subtitleColorClass = isLight ? 'text-slate-300' : 'text-slate-600';

  return (
    <div className={`inline-flex items-center gap-2.5 select-none ${className}`}>
      <svg
        width={variant === 'login' ? 44 : 36}
        height={variant === 'login' ? 44 : 36}
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0"
        aria-label="Logo KelasBrevet"
      >
        <path
          d="M24 3L6 10.5V23.5C6 34.4 13.7 42.9 24 46C34.3 42.9 42 34.4 42 23.5V10.5L24 3Z"
          fill="#1D2B53"
        />
        <path
          d="M24 6.2L9.2 12.4V23.4C9.2 32.5 15.6 39.8 24 42.6C32.4 39.8 38.8 32.5 38.8 23.4V12.4L24 6.2Z"
          stroke="#F4C430"
          strokeWidth="1.8"
          fill="none"
        />
        <path d="M24 12.5L34.5 17.5L24 22.5L13.5 17.5L24 12.5Z" fill="#F4C430" />
        <path
          d="M17.5 21.5V28.2C17.5 30.1 20.4 32 24 32C27.6 32 30.5 30.1 30.5 28.2V21.5"
          stroke="#FFFFFF"
          strokeWidth="2.3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path d="M34.5 17.5V25.5" stroke="#F4C430" strokeWidth="2" strokeLinecap="round" />
        <circle cx="34.5" cy="26.5" r="1.8" fill="#F4C430" />
      </svg>

      <div className="flex flex-col leading-none">
        <div className="flex items-center gap-1.5">
          <span
            className={`font-display font-extrabold tracking-tight ${
              variant === 'login' ? 'text-[22px]' : 'text-[17px]'
            } ${primaryColorClass}`}
          >
            kelas<span className="text-[#D49E00]">brevet</span>
          </span>
          <span className="h-4 w-[1.5px] bg-slate-300 mx-0.5" />
          <span
            className={`font-display font-bold tracking-wider uppercase ${
              variant === 'login' ? 'text-[13px]' : 'text-[11px]'
            } ${primaryColorClass}`}
          >
            CORETAX
          </span>
        </div>
        <span className={`text-[10px] font-medium tracking-wide mt-0.5 ${subtitleColorClass}`}>
          Lisensi Edukasi &amp; Simulasi Perpajakan
        </span>
      </div>
    </div>
  );
};
