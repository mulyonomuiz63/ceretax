import React from 'react';

interface SubMenuPromptProps {
  moduleName: string;
  subMenuCount: number;
}

export const SubMenuPrompt: React.FC<SubMenuPromptProps> = ({
  moduleName,
  subMenuCount,
}) => {
  return (
    <div className="bg-white border border-[#E2E8F0] rounded-2xl shadow-xs p-10 md:p-16 flex flex-col items-center justify-center text-center min-h-[460px] select-none">
      {/* Coretax document folder illustration with yellow dot & sparkles */}
      <div className="relative mb-6">
        {/* Soft sparkle dots */}
        <span className="absolute -top-3 -left-4 w-2 h-2 rounded-full bg-[#FDE047] opacity-80" />
        <span className="absolute top-1/2 -left-6 w-1.5 h-1.5 rounded-full bg-[#CBD5E1]" />
        <span className="absolute -top-1 -right-6 w-2.5 h-2.5 rounded-full bg-[#FEF08A] opacity-70" />
        <span className="absolute top-1/2 -right-5 w-2 h-2 rounded-full bg-[#FDE047] opacity-80" />

        <div className="relative w-28 h-24 rounded-2xl border-2 border-slate-200 bg-slate-50 flex items-center justify-center shadow-xs">
          {/* Inner card with text lines */}
          <div className="w-18 h-16 rounded-xl border border-slate-300 bg-white p-2.5 flex flex-col justify-center gap-1.5 shadow-sm">
            <div className="w-8 h-1 bg-slate-300 rounded-full" />
            <div className="w-12 h-1 bg-slate-200 rounded-full" />
            <div className="w-10 h-1 bg-slate-200 rounded-full" />
          </div>

          {/* Golden/Yellow badge on top right */}
          <span className="absolute -top-1.5 -right-1.5 w-4.5 h-4.5 rounded-full bg-[#F59E0B] border-2 border-white shadow-xs" />
        </div>
      </div>

      {/* Main Heading */}
      <h3 className="font-display font-extrabold text-xl md:text-2xl text-[#1E2C5E] tracking-tight mb-2">
        Pilih sub menu untuk melanjutkan
      </h3>

      {/* Sub menu count & module name */}
      <p className="text-sm font-semibold text-slate-700">
        {subMenuCount} sub menu tersedia di{' '}
        <span className="font-bold text-[#1E2C5E]">{moduleName}</span>.
      </p>

      {/* Direction text */}
      <p className="text-xs text-slate-500 mt-1.5">
        Klik salah satu di sebelah kiri untuk membukanya.
      </p>
    </div>
  );
};
