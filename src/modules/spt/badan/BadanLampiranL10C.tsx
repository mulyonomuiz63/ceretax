import React, { useState } from 'react';
import { TaxReturn, Taxpayer } from '../../../types/tax.ts';
import { formatRp } from '../../../utils/taxCalc.ts';

interface BadanLampiranL10CProps {
  taxReturn: TaxReturn;
  activeTaxpayer: Taxpayer;
  isReadOnly?: boolean;
}

export const BadanLampiranL10C: React.FC<BadanLampiranL10CProps> = ({
  taxReturn,
  activeTaxpayer,
  isReadOnly = false,
}) => {
  const [taxHavenRows, setTaxHavenRows] = useState<any[]>([]);
  const [armLengthPrinciple, setArmLengthPrinciple] = useState<'YA' | 'TIDAK'>('TIDAK');

  return (
    <div className="space-y-4">
      <h2 className="font-display font-bold text-[15px] text-[#1E2C5E] uppercase tracking-wide">
        PERNYATAAN TRANSAKSI DENGAN PIHAK YANG MERUPAKAN PENDUDUK TAX HAVEN COUNTRY
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

      {/* Section I */}
      <div className="bg-white border border-[#E2E8F0] rounded-xl shadow-sm overflow-hidden">
        <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 text-[#1E2C5E] font-bold text-[12px]">
          I. DALAM HAL WAJIB PAJAK DALAM TAHUN PAJAK INI MELAKUKAN TRANSAKSI DENGAN PIHAK-PIHAK YANG MERUPAKAN PENDUDUK TAX HAVEN COUNTRY
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-[11px]">
            <thead>
              <tr className="bg-slate-100 text-[#1E2C5E] font-bold border-b border-slate-200">
                <th className="px-2 py-2 text-center w-12 border-r border-slate-200">NO.</th>
                <th className="px-3 py-2 text-left border-r border-slate-200">NAMA MITRA TRANSAKSI</th>
                <th className="px-3 py-2 text-left border-r border-slate-200">JENIS TRANSAKSI</th>
                <th className="px-3 py-2 text-left border-r border-slate-200">NEGARA</th>
                <th className="px-3 py-2 text-right">NILAI TRANSAKSI (RUPIAH)</th>
              </tr>
            </thead>
            <tbody>
              {taxHavenRows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 py-6 text-center text-slate-400">
                    Tidak ada data untuk ditampilkan.
                  </td>
                </tr>
              ) : (
                taxHavenRows.map((r, idx) => (
                  <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="px-2 py-2 text-center font-mono-num">{idx + 1}</td>
                    <td className="px-3 py-2">{r.nama}</td>
                    <td className="px-3 py-2">{r.jenis}</td>
                    <td className="px-3 py-2">{r.negara}</td>
                    <td className="px-3 py-2 text-right font-mono-num">{formatRp(r.nilai)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Section II */}
      <div className="bg-white border border-[#E2E8F0] rounded-xl shadow-sm overflow-hidden p-4">
        <div className="text-[12px] font-bold text-[#1E2C5E] mb-3">
          II. PENENTUAN HARGA TRANSAKSI DI ATAS, DITENTUKAN DENGAN MENGGUNAKAN PRINSIP KEWAJARAN DAN KELAZIMAN USAHA
        </div>
        <div className="flex items-center gap-6 pl-2 text-[12px]">
          <label className="inline-flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="tax_haven_principle"
              disabled={isReadOnly}
              checked={armLengthPrinciple === 'YA'}
              onChange={() => setArmLengthPrinciple('YA')}
              className="accent-[#1E2C5E] cursor-pointer"
            />
            <span className="text-slate-700">Ya</span>
          </label>
          <label className="inline-flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="tax_haven_principle"
              disabled={isReadOnly}
              checked={armLengthPrinciple === 'TIDAK'}
              onChange={() => setArmLengthPrinciple('TIDAK')}
              className="accent-[#1E2C5E] cursor-pointer"
            />
            <span className="text-slate-700">Tidak</span>
          </label>
        </div>
      </div>
    </div>
  );
};
