import React, { useState } from 'react';
import { TaxReturn, Taxpayer } from '../../../types/tax.ts';
import { formatRp } from '../../../utils/taxCalc.ts';
import { RotateCcw, Copy, FileSpreadsheet, FileText, Filter } from 'lucide-react';

interface BadanLampiranL13AProps {
  taxReturn: TaxReturn;
  activeTaxpayer: Taxpayer;
  isReadOnly?: boolean;
}

export const BadanLampiranL13A: React.FC<BadanLampiranL13AProps> = ({
  taxReturn,
  activeTaxpayer,
  isReadOnly = false,
}) => {
  const [facilities, setFacilities] = useState<any[]>([]);

  return (
    <div className="space-y-4">
      <h2 className="font-display font-bold text-[15px] text-[#1E2C5E] uppercase tracking-wide">
        DAFTAR FASILITAS PENANAMAN MODAL
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
          FASILITAS PERPAJAKAN DALAM RANGKA PENANAMAN MODAL
        </div>

        {/* Toolbar matching screenshot */}
        <div className="p-2.5 bg-white border-b border-slate-100 flex items-center gap-1.5">
          <button type="button" className="p-1.5 rounded hover:bg-slate-100 text-slate-600 cursor-pointer" title="Refresh">
            <RotateCcw className="w-4 h-4" />
          </button>
          <button type="button" className="p-1.5 rounded hover:bg-slate-100 text-slate-600 cursor-pointer" title="Copy">
            <Copy className="w-4 h-4" />
          </button>
          <button type="button" className="p-1.5 rounded hover:bg-emerald-50 text-emerald-600 cursor-pointer" title="Export Excel">
            <FileSpreadsheet className="w-4 h-4" />
          </button>
          <button type="button" className="p-1.5 rounded hover:bg-red-50 text-red-600 cursor-pointer" title="Export CSV">
            <FileText className="w-4 h-4" />
          </button>
          <button type="button" className="p-1.5 rounded hover:bg-blue-50 text-blue-600 cursor-pointer" title="Filter">
            <Filter className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-[10.5px]">
            <thead>
              <tr className="bg-[#F4C430] text-[#1E2C5E] font-bold border-b border-amber-300">
                <th rowSpan={2} className="px-2 py-2 text-center w-10 border-r border-amber-300/80">NO.</th>
                <th colSpan={2} className="px-3 py-1 text-center border-r border-amber-300/80">KEPUTUSAN PEMBERIAN FASILITAS</th>
                <th colSpan={2} className="px-3 py-1 text-center border-r border-amber-300/80">KEPUTUSAN PEMANFAATAN FASILITAS</th>
                <th colSpan={4} className="px-3 py-1 text-center border-r border-amber-300/80">JUMLAH PENANAMAN MODAL YANG DISETUJUI</th>
                <th rowSpan={2} className="px-3 py-2 text-left border-r border-amber-300/80">BENTUK PENANAMAN MODAL</th>
                <th rowSpan={2} className="px-3 py-2 text-left">DI BIDANG DAN/ATAU DAERAH TERTENTU</th>
              </tr>
              <tr className="bg-[#F4C430] text-[#1E2C5E] font-bold border-b border-amber-300">
                <th className="px-2 py-1 text-left border-r border-amber-300/80">NO.</th>
                <th className="px-2 py-1 text-center border-r border-amber-300/80">TANGGAL</th>
                <th className="px-2 py-1 text-left border-r border-amber-300/80">NO.</th>
                <th className="px-2 py-1 text-center border-r border-amber-300/80">TANGGAL</th>
                <th className="px-2 py-1 text-right border-r border-amber-300/80">DALAM MATA UANG ASING</th>
                <th className="px-2 py-1 text-center border-r border-amber-300/80">EKUIVALEN</th>
                <th className="px-2 py-1 text-right border-r border-amber-300/80">DALAM RUPIAH</th>
                <th className="px-2 py-1 text-right border-r border-amber-300/80">JUMLAH (Rp)</th>
              </tr>
              {/* Filter Row */}
              <tr className="bg-[#FEF9E7] border-b border-amber-200">
                <th className="px-2 py-1"></th>
                <th className="px-2 py-1"><input type="text" placeholder="No" className="w-full bg-white border border-slate-200 rounded px-1 py-0.5 text-[10px]" /></th>
                <th className="px-2 py-1"><input type="text" placeholder="Tgl" className="w-full bg-white border border-slate-200 rounded px-1 py-0.5 text-[10px]" /></th>
                <th className="px-2 py-1"><input type="text" placeholder="No" className="w-full bg-white border border-slate-200 rounded px-1 py-0.5 text-[10px]" /></th>
                <th className="px-2 py-1"><input type="text" placeholder="Tgl" className="w-full bg-white border border-slate-200 rounded px-1 py-0.5 text-[10px]" /></th>
                <th className="px-2 py-1"></th>
                <th className="px-2 py-1"></th>
                <th className="px-2 py-1"></th>
                <th className="px-2 py-1"></th>
                <th className="px-2 py-1"><input type="text" placeholder="Bentuk" className="w-full bg-white border border-slate-200 rounded px-1 py-0.5 text-[10px]" /></th>
                <th className="px-2 py-1"><input type="text" placeholder="Bidang/Daerah" className="w-full bg-white border border-slate-200 rounded px-1 py-0.5 text-[10px]" /></th>
              </tr>
            </thead>
            <tbody>
              {facilities.length === 0 ? (
                <tr>
                  <td colSpan={11} className="px-3 py-6 text-center text-slate-400">
                    Tidak ada data untuk ditampilkan.
                  </td>
                </tr>
              ) : (
                facilities.map((f, idx) => (
                  <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="px-2 py-2 text-center">{idx + 1}</td>
                    <td className="px-3 py-2">{f.kepNo}</td>
                    <td className="px-3 py-2 text-center">{f.kepTgl}</td>
                    <td className="px-3 py-2">{f.manfaatNo}</td>
                    <td className="px-3 py-2 text-center">{f.manfaatTgl}</td>
                    <td className="px-3 py-2 text-right">{f.valAsing}</td>
                    <td className="px-3 py-2 text-center">{f.ekuivalen}</td>
                    <td className="px-3 py-2 text-right">{f.valRp}</td>
                    <td className="px-3 py-2 text-right">{formatRp(f.jumlahRp)}</td>
                    <td className="px-3 py-2">{f.bentuk}</td>
                    <td className="px-3 py-2">{f.bidang}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
