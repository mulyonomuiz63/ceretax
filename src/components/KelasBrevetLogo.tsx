import React from 'react';
import { useBranding } from '../lib/brandingStore.ts';

export const DEFAULT_DJP_LOGO_URL = '/assets/aistudio/kemenkeu_djp_transparent.png';
export const DEFAULT_ICON_LOGO_URL = '/assets/aistudio/kelasbrevet_icon_transparent.png';
export const DEFAULT_FULL_LOGO_URL = '/assets/aistudio/kelasbrevet_full_transparent.png';

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

  // TOPBAR (Landing / Login top-left): Preserves official [Kemenkeu | djp] logo with transparent background
  if (variant === 'topbar') {
    return (
      <div className={`inline-flex items-center select-none shrink-0 ${className}`}>
        <img
          src={DEFAULT_DJP_LOGO_URL}
          alt="Kementerian Keuangan & Direktorat Jenderal Pajak"
          className={`h-8 sm:h-9 w-auto object-contain ${blendClass}`}
        />
      </div>
    );
  }

  // HERO (Landing & Login above heading): Full KelasBrevet logo (transparent, NO white background)
  if (variant === 'hero') {
    return (
      <div className={`inline-flex items-center select-none shrink-0 ${className}`} aria-label={brandName}>
        <img
          src={fullLogoSrc}
          alt={brandName}
          className={`h-10 sm:h-12 w-auto max-w-[260px] object-contain ${blendClass}`}
        />
      </div>
    );
  }

  // PORTALBAR (Coretax Portal Header top-left): [Kemenkeu | djp] + [KelasBrevet] matching official layout
  if (variant === 'portalbar') {
    return (
      <div className={`inline-flex items-center gap-3 select-none shrink-0 ${className}`}>
        <img
          src={DEFAULT_DJP_LOGO_URL}
          alt="Kementerian Keuangan & DJP"
          className={`h-7 sm:h-8 w-auto object-contain ${blendClass}`}
        />
        <img
          src={fullLogoSrc}
          alt={brandName}
          className={`h-6 sm:h-7 w-auto max-w-[160px] object-contain ${blendClass}`}
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
