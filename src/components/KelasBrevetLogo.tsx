import React from 'react';
import { useBranding } from '../lib/brandingStore.ts';

export const DEFAULT_ICON_LOGO_URL = '/assets/aistudio/image_d4c8f37b.png';
export const DEFAULT_FULL_LOGO_URL = '/assets/aistudio/image_1f556637.png';

interface KelasBrevetLogoProps {
  variant?: 'header' | 'login' | 'light' | 'topbar' | 'hero' | 'portalbar' | 'admin';
  dark?: boolean;
  className?: string;
  /** Optional explicit override (used for live preview inside Admin Logo Editor) */
  logoUrlOverride?: string;
  brandNameOverride?: string;
}

/**
 * Icon-only KelasBrevet brand mark (replaces DJP emblem with zero text).
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

  // TOPBAR (Landing / Login top-left): Replaces DJP logo -> Icon-only mark WITHOUT text
  if (variant === 'topbar') {
    return (
      <div className={`inline-flex items-center select-none shrink-0 ${className}`}>
        <img
          src={DEFAULT_ICON_LOGO_URL}
          alt={brandName}
          className={`h-9 sm:h-10 w-auto object-contain ${
            isDarkSurface ? 'bg-white/95 rounded-lg p-1' : ''
          }`}
        />
      </div>
    );
  }

  // HERO (Landing & Login above heading): Replaces CORETAX logo -> Full KelasBrevet logo (or admin custom upload)
  if (variant === 'hero') {
    return (
      <div className={`inline-flex items-center select-none shrink-0 ${className}`} aria-label={brandName}>
        <img
          src={fullLogoSrc}
          alt={brandName}
          className={`h-10 sm:h-12 w-auto max-w-[260px] object-contain ${
            isDarkSurface ? 'bg-white/95 rounded-xl px-3 py-1.5' : ''
          }`}
        />
      </div>
    );
  }

  // PORTALBAR (Coretax Shell Header top-left): [Icon-only replacing DJP] | [Full KelasBrevet replacing CORETAX]
  if (variant === 'portalbar') {
    return (
      <div className={`inline-flex items-center gap-2.5 select-none shrink-0 ${className}`}>
        <img
          src={DEFAULT_ICON_LOGO_URL}
          alt="Emblem"
          className={`h-7 sm:h-8 w-auto object-contain ${
            isDarkSurface ? 'bg-white/95 rounded-md p-0.5' : ''
          }`}
        />
        <span
          className={`h-6 w-px ${isDarkSurface ? 'bg-slate-600' : 'bg-slate-300'}`}
          aria-hidden="true"
        />
        <img
          src={fullLogoSrc}
          alt={brandName}
          className={`h-7 sm:h-8 w-auto max-w-[165px] object-contain ${
            isDarkSurface ? 'bg-white/95 rounded-md px-2 py-0.5' : ''
          }`}
        />
      </div>
    );
  }

  // ADMIN / LOGIN / HEADER / LIGHT
  const heightClass: Record<string, string> = {
    admin: 'h-8 max-w-[170px]',
    login: 'h-10 max-w-[220px]',
    header: 'h-8 max-w-[185px]',
    light: 'h-8 max-w-[185px]',
  };

  return (
    <div className={`inline-flex items-center select-none shrink-0 ${className}`}>
      <img
        src={fullLogoSrc}
        alt={brandName}
        className={`${heightClass[variant] || 'h-8 max-w-[185px]'} w-auto object-contain ${
          isDarkSurface ? 'bg-white/95 rounded-lg px-2 py-1' : ''
        }`}
      />
    </div>
  );
};
