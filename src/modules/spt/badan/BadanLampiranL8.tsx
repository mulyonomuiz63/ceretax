import React, { useState } from 'react';
import { TaxReturn, Taxpayer } from '../../../types/tax.ts';
import { formatRp } from '../../../utils/taxCalc.ts';

interface BadanLampiranL8Props {
  taxReturn: TaxReturn;
  activeTaxpayer: Taxpayer;
  isReadOnly?: boolean;
}

export const BadanLampiranL8: React.FC<BadanLampiranL8Props> = ({
  taxReturn,
  activeTaxpayer,
  isReadOnly = false,
}) => {
  const [omzetBruto, setOmzetBruto] = useState(235_875_397);
  const [pkpFasilitas, setPkpFasilitas] = useState(114_000);
  const [pkpNonFasilitas, setPkpNonFasilitas] = useState(0);

  // Fasilitas Pasal 31E: tarif 50% x 22% = 11%
  const pphFasilitas = Math.round(pkpFasilitas * 0.11);
  // Non-fasilitas: tarif normal 22%
  const pphNonFasilitas = Math.round(pkpNonFasilitas * 0.22);
  const totalPphTerutang = pphFasilitas + pphNonFasilitas;

  return (
    <div className="space-y-4">
      <h2 className="font-display font-bold text-[15px] text-[#1E2C5E] uppercase tracking-wide leading-snug">
        PERHITUNGAN FASILITAS PENGURANGAN TARIF PPh BAGI WAJIB PAJAK BADAN DALAM NEGERI BERDASARKAN PASAL 31E AYAT (1) UNDANG-UNDANG PPh
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
            <label className="block text-[11.5px] font-semibold text-slate-600 mb-1">NPWP</label>
            <input
              type="text"
              readOnly
              value={activeTaxpayer.nikNpwp}
              className="w-full bg-[#F1F5F9] border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-700 font-mono-num"
            />
          </div>
        </div>
      </div>

      {/* Main Card */}
      <div className="bg-white border border-[#E2E8F0] rounded-xl shadow-sm overflow-hidden">
        <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 text-[#1E2C5E] font-bold text-[12px]">
          PERHITUNGAN FASILITAS PENGURANGAN TARIF PPh BAGI WAJIB PAJAK BADAN DALAM NEGERI BERDASARKAN PASAL 31E AYAT (1) UNDANG-UNDANG PPh
        </div>

        <div className="p-4 space-y-4 text-[12px]">
          {/* Section 1 */}
          <div className="space-y-2">
            <div className="font-bold text-slate-800">1. Jumlah Peredaran Bruto:</div>
            <div className="flex items-center justify-between pl-4">
              <span className="text-slate-700">Jumlah Peredaran Bruto</span>
              <div className="flex items-center gap-1">
                <span className="text-slate-400 text-xs">Rp</span>
                <input
                  type="number"
                  disabled={isReadOnly}
                  value={omzetBruto}
                  onChange={(e) => setOmzetBruto(Number(e.target.value) || 0)}
                  className="w-48 text-right border border-slate-300 rounded px-2.5 py-1 text-xs font-mono-num"
                />
              </div>
            </div>
          </div>

          {/* Section 2 */}
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <div className="font-bold text-slate-800">2. Penghasilan Kena Pajak:</div>
            <div className="flex items-center justify-between pl-4">
              <span className="text-slate-700">Penghasilan Kena Pajak dari bagian peredaran bruto yang memperoleh fasilitas</span>
              <div className="flex items-center gap-1">
                <span className="text-slate-400 text-xs">Rp</span>
                <input
                  type="number"
                  disabled={isReadOnly}
                  value={pkpFasilitas}
                  onChange={(e) => setPkpFasilitas(Number(e.target.value) || 0)}
                  className="w-48 text-right border border-slate-300 rounded px-2.5 py-1 text-xs font-mono-num"
                />
              </div>
            </div>
            <div className="flex items-center justify-between pl-4">
              <span className="text-slate-700">Penghasilan Kena Pajak dari bagian peredaran bruto yang tidak memperoleh fasilitas</span>
              <div className="flex items-center gap-1">
                <span className="text-slate-400 text-xs">Rp</span>
                <input
                  type="number"
                  disabled={isReadOnly}
                  value={pkpNonFasilitas}
                  onChange={(e) => setPkpNonFasilitas(Number(e.target.value) || 0)}
                  className="w-48 text-right border border-slate-300 rounded px-2.5 py-1 text-xs font-mono-num"
                />
              </div>
            </div>
          </div>

          {/* Section 3 */}
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <div className="font-bold text-slate-800">3. Pajak Terutang:</div>
            <div className="flex items-center justify-between pl-4">
              <span className="text-slate-700">PPh Terutang atas Penghasilan Kena Pajak dari bagian peredaran bruto yang memperoleh fasilitas (11%)</span>
              <div className="flex items-center gap-1">
                <span className="text-slate-400 text-xs">Rp</span>
                <input
                  type="text"
                  readOnly
                  value={formatRp(pphFasilitas).replace('Rp', '').trim()}
                  className="w-48 text-right border border-slate-200 bg-slate-50 rounded px-2.5 py-1 text-xs font-mono-num font-semibold text-slate-800"
                />
              </div>
            </div>
            <div className="flex items-center justify-between pl-4">
              <span className="text-slate-700">PPh Terutang atas Penghasilan Kena Pajak dari bagian peredaran bruto yang tidak memperoleh fasilitas (22%)</span>
              <div className="flex items-center gap-1">
                <span className="text-slate-400 text-xs">Rp</span>
                <input
                  type="text"
                  readOnly
                  value={formatRp(pphNonFasilitas).replace('Rp', '').trim()}
                  className="w-48 text-right border border-slate-200 bg-slate-50 rounded px-2.5 py-1 text-xs font-mono-num font-semibold text-slate-800"
                />
              </div>
            </div>
            <div className="flex items-center justify-between pl-4 pt-2 border-t border-slate-200 font-bold text-[#1E2C5E]">
              <span>Jumlah PPh Terutang</span>
              <div className="flex items-center gap-1">
                <span className="text-[#1E2C5E] text-xs">Rp</span>
                <input
                  type="text"
                  readOnly
                  value={formatRp(totalPphTerutang).replace('Rp', '').trim()}
                  className="w-48 text-right border border-[#EAB308] bg-[#FEF9E7] rounded px-2.5 py-1 text-xs font-mono-num font-extrabold text-[#1E2C5E]"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
