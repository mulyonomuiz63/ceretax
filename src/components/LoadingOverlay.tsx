import React from 'react';
import { DEFAULT_ICON_LOGO_URL, KelasBrevetLogo } from './KelasBrevetLogo.tsx';

interface LoadingOverlayProps {
  visible: boolean;
  message?: string;
  fullscreen?: boolean;
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  visible,
  message = 'Memuat layanan KelasBrevet...',
  fullscreen = true,
}) => {
  if (!visible) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className={`${
        fullscreen ? 'fixed inset-0 z-[100]' : 'absolute inset-0 z-40'
      } flex items-center justify-center bg-[#EEF2FA]/85 backdrop-blur-[5px] transition-opacity duration-200`}
    >
      <div className="bg-white/95 border border-[#DCE4F2] rounded-[22px] shadow-[0_24px_64px_rgba(27,41,88,0.14)] px-9 py-8 flex flex-col items-center gap-5 max-w-[340px] w-[90%]">
        {/* Animated Halo Ring + Icon-Only Emblem */}
        <div className="relative flex items-center justify-center">
          <div
            className="w-20 h-20 rounded-full border-[3px] border-[#E5EAF2] border-t-[#155EEF] border-r-[#95B5F6] animate-spin"
            aria-hidden="true"
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <img
              src={DEFAULT_ICON_LOGO_URL}
              alt="KelasBrevet"
              className="w-10 h-10 object-contain"
            />
          </div>
        </div>

        {/* Full KelasBrevet Logo (or Admin Custom Logo) */}
        <div className="flex flex-col items-center gap-1.5 text-center">
          <KelasBrevetLogo variant="header" />
          <p className="text-[12.5px] font-semibold text-[#52607A] mt-1">{message}</p>
        </div>

        {/* Subtle Blue Indeterminate Progress Bar */}
        <div className="w-full h-1.5 rounded-full bg-[#E8EDF6] overflow-hidden">
          <div className="h-full w-1/2 rounded-full bg-gradient-to-r from-[#155EEF] via-[#60A5FA] to-[#155EEF] animate-pulse mx-auto" />
        </div>
      </div>
    </div>
  );
};
