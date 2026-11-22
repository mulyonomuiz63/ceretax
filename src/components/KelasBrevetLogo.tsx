import React from 'react';
import { useBranding } from '../lib/brandingStore.ts';

interface KelasBrevetLogoProps {
  variant?: 'header' | 'login' | 'light' | 'topbar' | 'hero' | 'portalbar' | 'admin';
  dark?: boolean;
  className?: string;
  /** Optional explicit override (used for live preview inside Admin Logo Editor) */
  logoUrlOverride?: string;
  brandNameOverride?: string;
}

/**
 * Official KelasBrevet geometric blue double-chevron emblem (matches uploaded brand mark).
 */
export const KelasBrevetEmblem: React.FC<{ size?: number; className?: string }> = ({
  size = 34,
  className = '',
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 64 64"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`shrink-0 ${className}`}
    aria-label="Emblem KelasBrevet"
  >
    {/* Top royal blue mountain/chevron peak */}
    <path
      d="M32 4.5C33.2 4.5 34.3 5 35.1 5.9L59.4 30.8C61.1 32.5 61.1 35.2 59.4 36.9C57.7 38.5 55 38.5 53.3 36.8L44.2 27.6C43.1 26.5 41.3 26.5 40.2 27.6L34.7 33.1C33.2 34.6 30.8 34.6 29.3 33.1L23.8 27.6C22.7 26.5 20.9 26.5 19.8 27.6L10.7 36.8C9 38.5 6.3 38.5 4.6 36.9C2.9 35.2 2.9 32.5 4.6 30.8L28.9 5.9C29.7 5 30.8 4.5 32 4.5Z"
      fill="#155EEF"
    />
    {/* Bottom periwinkle-blue nested chevron + pillar stem */}
    <path
      d="M21.8 34.5C22.9 33.4 24.7 33.4 25.8 34.5L32 40.7L38.2 34.5C39.3 33.4 41.1 33.4 42.2 34.5L52.6 44.9C54 46.3 54 48.6 52.6 50L50.8 51.8C49.4 53.2 47.1 53.2 45.7 51.8L41.8 47.9C40.7 46.8 38.8 47.6 38.8 49.2V51.4C38.8 52.4 38.4 53.4 37.7 54.1L34.2 57.6C33 58.8 31 58.8 29.8 57.6L26.3 54.1C25.6 53.4 25.2 52.4 25.2 51.4V49.2C25.2 47.6 23.3 46.8 22.2 47.9L18.3 51.8C16.9 53.2 14.6 53.2 13.2 51.8L11.4 50C10 48.6 10 46.3 11.4 44.9L21.8 34.5Z"
      fill="#95B5F6"
    />
  </svg>
);

export const KelasBrevetLogo: React.FC<KelasBrevetLogoProps> = ({
  variant = 'header',
  dark = false,
  className = '',
  logoUrlOverride,
  brandNameOverride,
}) => {
  const branding = useBranding();
  const customLogoUrl =
    logoUrlOverride !== undefined ? logoUrlOverride : branding.logoUrl;
  const brandName =
    brandNameOverride !== undefined ? brandNameOverride : branding.brandName || 'KelasBrevet';

  // Height presets per placement when rendering an uploaded custom logo image
  const imgHeightClass: Record<NonNullable<KelasBrevetLogoProps['variant']>, string> = {
    portalbar: 'h-8 sm:h-9 max-w-[180px]',
    topbar: 'h-9 sm:h-10 max-w-[200px]',
    hero: 'h-12 sm:h-14 max-w-[260px]',
    login: 'h-11 max-w-[220px]',
    header: 'h-9 max-w-[190px]',
    light: 'h-9 max-w-[190px]',
    admin: 'h-8 max-w-[170px]',
  };

  if (customLogoUrl) {
    return (
      <div className={`inline-flex items-center select-none shrink-0 ${className}`}>
        <img
          src={customLogoUrl}
          alt={brandName}
          className={`${imgHeightClass[variant]} w-auto object-contain ${
            dark || variant === 'light' || variant === 'admin'
              ? 'bg-white/95 rounded-lg px-2 py-1'
              : ''
          }`}
        />
      </div>
    );
  }

  const isDarkSurface = dark || variant === 'light' || variant === 'admin';
  const primaryTextClass = isDarkSurface ? 'text-white' : 'text-[#0B0F19]';
  const accentTextClass = isDarkSurface ? 'text-[#60A5FA]' : 'text-[#155EEF]';

  // Split "KelasBrevet" cleanly into "Kelas" + "Brevet" (or render custom brandName)
  const renderWordmark = (sizeClass: string) => {
    if (brandName.toLowerCase() === 'kelasbrevet') {
      return (
        <span className={`font-display font-extrabold tracking-[-0.03em] leading-none ${sizeClass}`}>
          <span className={primaryTextClass}>Kelas</span>
          <span className={accentTextClass}>Brevet</span>
        </span>
      );
    }
    return (
      <span
        className={`font-display font-extrabold tracking-[-0.03em] leading-none ${sizeClass} ${primaryTextClass}`}
      >
        {brandName}
      </span>
    );
  };

  if (variant === 'portalbar') {
    return (
      <div className={`inline-flex items-center gap-2.5 select-none shrink-0 ${className}`}>
        <KelasBrevetEmblem size={30} />
        {renderWordmark('text-[19px] sm:text-[21px]')}
      </div>
    );
  }

  if (variant === 'topbar') {
    return (
      <div className={`inline-flex items-center gap-2.5 select-none ${className}`}>
        <KelasBrevetEmblem size={34} />
        {renderWordmark('text-[21px] sm:text-[23px]')}
      </div>
    );
  }

  if (variant === 'hero') {
    return (
      <div className={`inline-flex items-center gap-3.5 select-none ${className}`} aria-label={brandName}>
        <KelasBrevetEmblem size={48} />
        {renderWordmark('text-[34px] sm:text-[40px]')}
      </div>
    );
  }

  if (variant === 'admin') {
    return (
      <div className={`inline-flex items-center gap-2.5 select-none ${className}`}>
        <KelasBrevetEmblem size={30} />
        {renderWordmark('text-[19px]')}
      </div>
    );
  }

  const subtitleColorClass = isDarkSurface ? 'text-slate-300' : 'text-slate-500';
  return (
    <div className={`inline-flex items-center gap-2.5 select-none ${className}`}>
      <KelasBrevetEmblem size={variant === 'login' ? 40 : 34} />
      <div className="flex flex-col leading-none">
        <div className="flex items-center gap-2">
          {renderWordmark(variant === 'login' ? 'text-[23px]' : 'text-[19px]')}
          <span className="h-4 w-[1px] bg-slate-300" />
          <span
            className={`font-display font-bold tracking-wider uppercase ${
              variant === 'login' ? 'text-[12px]' : 'text-[11px]'
            } ${primaryTextClass}`}
          >
            CORETAX
          </span>
        </div>
        <span className={`text-[10px] font-medium tracking-wide mt-1 ${subtitleColorClass}`}>
          Lisensi Edukasi &amp; Simulasi Perpajakan
        </span>
      </div>
    </div>
  );
};
