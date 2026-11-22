import React from 'react';
import { KelasBrevetLogo } from './KelasBrevetLogo.tsx';

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
        {/* Animated Halo Ring + Branded KelasBrevet Shield & Wordmark */}
        <div className="relative flex items-center justify-center">
          <div
            className="w-20 h-20 rounded-full border-[3px] border-[#E5EAF2] border-t-[#1E2C5E] border-r-[#F4C430] animate-spin"
            aria-hidden="true"
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <svg
              width="42"
              height="42"
              viewBox="0 0 48 48"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
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
          </div>
        </div>

        {/* Official KelasBrevet Wordmark */}
        <div className="flex flex-col items-center gap-1.5 text-center">
          <KelasBrevetLogo variant="portalbar" />
          <p className="text-[12.5px] font-semibold text-[#52607A] mt-1">{message}</p>
        </div>

        {/* Subtle Gold & Navy Indeterminate Progress Bar */}
        <div className="w-full h-1.5 rounded-full bg-[#E8EDF6] overflow-hidden">
          <div className="h-full w-1/2 rounded-full bg-gradient-to-r from-[#1E2C5E] via-[#F4C430] to-[#1E2C5E] animate-pulse mx-auto" />
        </div>
      </div>
    </div>
  );
};
