import React, { useState } from 'react';
import { TaxReturn, Taxpayer } from '../../../types/tax.ts';
import { formatRp } from '../../../utils/taxCalc.ts';

interface BadanLampiranL7Props {
  taxReturn: TaxReturn;
  activeTaxpayer: Taxpayer;
  isReadOnly?: boolean;
}

export const BadanLampiranL7: React.FC<BadanLampiranL7Props> = ({
  taxReturn,
  activeTaxpayer,
  isReadOnly = false,
}) => {
  const currentYear = taxReturn.taxYear || 2024;
  const years = Array.from({ length: 11 }, (_, i) => currentYear - 2 - i);

  const [lossRows, setLossRows] = useState(
    years.map((y, idx) => ({
      no: idx + 1,
      tahun: y,
      nilai: 0,
      y5: 0,
      y4: 0,
      y3: 0,
      y2: 0,
      y1: 0,
      currentY: 0,
      nextY: 0,
    }))
  );

  return (
    <div className="space-y-4">
      <h2 className="font-display font-bold text-[15px] text-[#1E2C5E] uppercase tracking-wide">
        PENGHITUNGAN KOMPENSASI KERUGIAN FISKAL
      </h2>

      {/* Header Banner */}
      <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-4">
        <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2">HEADER</div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-[11.5px] font-semibold text-slate-600 mb-1">Tahun Pajak</label>
            <input
              type="text"
              readOnly
              value={taxReturn.taxYear}
              className="w-full bg-[#F1F5F9] border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-700 font-mono-num"
            />
          </div>
          <div>
            <label className="block text-[11.5px] font-semibold text-slate-600 mb-1">Nomor Identitas WP</label>
            <input
              type="text"
              readOnly
              value={activeTaxpayer.nikNpwp}
              className="w-full bg-[#F1F5F9] border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-700 font-mono-num"
            />
          </div>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white border border-[#E2E8F0] rounded-xl shadow-sm overflow-hidden">
        <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 text-[#1E2C5E] font-bold text-[12px]">
          PENGHITUNGAN KOMPENSASI KERUGIAN FISKAL
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-[10.5px]">
            <thead>
              <tr className="bg-[#F4C430] text-[#1E2C5E] font-bold border-b border-amber-300">
                <th rowSpan={2} className="px-2 py-2 text-center w-10 border-r border-amber-300/80">NO.</th>
                <th colSpan={2} className="px-3 py-1 text-center border-r border-amber-300/80">LABA (RUGI) NETTO FISKAL</th>
                <th colSpan={7} className="px-3 py-1 text-center">KOMPENSASI KERUGIAN FISKAL</th>
              </tr>
              <tr className="bg-[#F4C430] text-[#1E2C5E] font-bold border-b border-amber-300">
                <th className="px-2 py-1 text-center border-r border-amber-300/80">TAHUN/BAGIAN TAHUN PAJAK</th>
                <th className="px-2 py-1 text-right border-r border-amber-300/80">NILAI (Rp)</th>
                <th className="px-2 py-1 text-right border-r border-amber-300/80">Y-5</th>
                <th className="px-2 py-1 text-right border-r border-amber-300/80">Y-4</th>
                <th className="px-2 py-1 text-right border-r border-amber-300/80">Y-3</th>
                <th className="px-2 py-1 text-right border-r border-amber-300/80">Y-2</th>
                <th className="px-2 py-1 text-right border-r border-amber-300/80">Y-1</th>
                <th className="px-2 py-1 text-right border-r border-amber-300/80">{currentYear}</th>
                <th className="px-2 py-1 text-right">Y+1</th>
              </tr>
            </thead>
            <tbody>
              {lossRows.map((r, idx) => (
                <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="px-2 py-1.5 text-center text-slate-500 font-mono-num">{r.no}</td>
                  <td className="px-2 py-1.5 text-center font-mono-num font-medium text-slate-700">{r.tahun}</td>
                  <td className="px-2 py-1.5 text-right font-mono-num text-slate-600">{r.nilai}</td>
                  <td className="px-2 py-1.5 text-right font-mono-num text-slate-600">{r.y5}</td>
                  <td className="px-2 py-1.5 text-right font-mono-num text-slate-600">{r.y4}</td>
                  <td className="px-2 py-1.5 text-right font-mono-num text-slate-600">{r.y3}</td>
                  <td className="px-2 py-1.5 text-right font-mono-num text-slate-600">{r.y2}</td>
                  <td className="px-2 py-1.5 text-right font-mono-num text-slate-600">{r.y1}</td>
                  <td className="px-2 py-1.5 text-right font-mono-num font-semibold text-[#1E2C5E]">{r.currentY}</td>
                  <td className="px-2 py-1.5 text-right font-mono-num text-slate-600">{r.nextY}</td>
                </tr>
              ))}
              <tr className="bg-[#FAFBFD] font-bold text-[#1E2C5E] border-t border-slate-200">
                <td colSpan={2} className="px-3 py-2 text-right uppercase text-[10.5px]">JUMLAH</td>
                <td className="px-2 py-2 text-right font-mono-num">0</td>
                <td className="px-2 py-2 text-right font-mono-num">0</td>
                <td className="px-2 py-2 text-right font-mono-num">0</td>
                <td className="px-2 py-2 text-right font-mono-num">0</td>
                <td className="px-2 py-2 text-right font-mono-num">0</td>
                <td className="px-2 py-2 text-right font-mono-num">0</td>
                <td className="px-2 py-2 text-right font-mono-num">0</td>
                <td className="px-2 py-2 text-right font-mono-num">0</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
