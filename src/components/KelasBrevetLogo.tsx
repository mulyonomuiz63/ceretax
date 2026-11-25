import React from 'react';
import { useBranding } from '../lib/brandingStore.ts';

export const DEFAULT_DJP_LOGO_URL = '/assets/aistudio/kemenkeu_djp_transparent.png';
export const DEFAULT_ICON_LOGO_URL = '/assets/aistudio/kelasbrevet_icon_transparent.png';
export const DEFAULT_FULL_LOGO_URL = '/assets/aistudio/kelasbrevet_full_transparent.png';
export const DEFAULT_CORETAX_LOGO_URL = '/coretax-logo.png';

interface KelasBrevetLogoProps {
  variant?: 'header' | 'login' | 'light' | 'topbar' | 'hero' | 'portalbar' | 'admin';
  dark?: boolean;
  className?: string;
  /** Optional explicit override (used for live preview inside Admin Logo Editor) */
  logoUrlOverride?: string;
  brandNameOverride?: string;
}

/**
 * Transparent icon-only KelasBrevet emblem.
 */
export const KelasBrevetEmblem: React.FC<{ size?: number; className?: string }> = ({
  size = 34,
  className = '',
}) => (
  <img
    src={DEFAULT_ICON_LOGO_URL}
    alt="KelasBrevet"
    style={{ width: size, height: size }}
    className={`object-contain shrink-0 select-none ${className}`}
  />
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

  const fullLogoSrc = customLogoUrl || DEFAULT_FULL_LOGO_URL;
  const isDarkSurface = dark || variant === 'light' || variant === 'admin';
  // On light surfaces, mix-blend-multiply guarantees any residual white pixels vanish cleanly
  const blendClass = isDarkSurface ? '' : 'mix-blend-multiply';

  // TOPBAR (Landing, Login, Logout, and Logged-in Portal Header top-left): KelasBrevet logo
  if (variant === 'topbar') {
    return (
      <div
        className={`inline-flex items-center select-none shrink-0 ${
          isDarkSurface ? 'bg-white/95 px-2.5 py-1 rounded-lg' : ''
        } ${className}`}
        aria-label={brandName}
      >
        <img
          src={fullLogoSrc}
          alt={brandName}
          className={`h-7 sm:h-8 w-auto max-w-[180px] object-contain ${isDarkSurface ? '' : 'mix-blend-multiply'}`}
        />
      </div>
    );
  }

  // HERO (Landing, Login & Logout above main heading): Attached Coretax wordmark logo
  if (variant === 'hero') {
    return (
      <div
        className={`inline-flex items-center select-none shrink-0 ${
          isDarkSurface ? 'bg-white/95 px-3.5 py-2 rounded-xl shadow-sm' : ''
        } ${className}`}
        aria-label="CORETAX"
      >
        <img
          src={DEFAULT_CORETAX_LOGO_URL}
          alt="CORETAX"
          className="h-9 sm:h-11 w-auto max-w-[235px] object-contain"
        />
      </div>
    );
  }

  // PORTALBAR (Portal Header preview): KelasBrevet logo
  if (variant === 'portalbar') {
    return (
      <div
        className={`inline-flex items-center gap-2.5 select-none shrink-0 ${
          isDarkSurface ? 'bg-white/95 px-2.5 py-1 rounded-lg' : ''
        } ${className}`}
      >
        <img
          src={fullLogoSrc}
          alt={brandName}
          className={`h-7 sm:h-8 w-auto max-w-[175px] object-contain ${isDarkSurface ? '' : 'mix-blend-multiply'}`}
        />
      </div>
    );
  }

  // ADMIN / LOGIN / HEADER / LIGHT (transparent, NO white background box)
  const heightClass: Record<string, string> = {
    admin: 'h-7 max-w-[170px]',
    login: 'h-10 max-w-[220px]',
    header: 'h-8 max-w-[185px]',
    light: 'h-8 max-w-[185px]',
  };

  return (
    <div className={`inline-flex items-center select-none shrink-0 ${className}`}>
      <img
        src={fullLogoSrc}
        alt={brandName}
        className={`${heightClass[variant] || 'h-8 max-w-[185px]'} w-auto object-contain ${blendClass}`}
      />
    </div>
  );
};

