import React, { useState } from 'react';
import { TaxReturn, Taxpayer } from '../../../types/tax.ts';
import { formatRp } from '../../../utils/taxCalc.ts';
import { RotateCcw, Copy, FileSpreadsheet, FileText, Filter } from 'lucide-react';

interface BadanLampiranL10AProps {
  taxReturn: TaxReturn;
  activeTaxpayer: Taxpayer;
  isReadOnly?: boolean;
}

export const BadanLampiranL10A: React.FC<BadanLampiranL10AProps> = ({
  taxReturn,
  activeTaxpayer,
  isReadOnly = false,
}) => {
  const [transactions, setTransactions] = useState<any[]>([]);

  return (
    <div className="space-y-4">
      <h2 className="font-display font-bold text-[15px] text-[#1E2C5E] uppercase tracking-wide">
        DAFTAR TRANSAKSI YANG DIPENGARUHI HUBUNGAN ISTIMEWA
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
          Daftar Transaksi Yang Dipengaruhi Hubungan Istimewa
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
                <th className="px-3 py-2 text-left border-r border-amber-300/80">NAMA</th>
                <th className="px-3 py-2 text-left border-r border-amber-300/80">NPWP/NITK</th>
                <th className="px-3 py-2 text-left border-r border-amber-300/80">NEGARA</th>
                <th className="px-3 py-2 text-left border-r border-amber-300/80">BENTUK HUBUNGAN</th>
                <th className="px-3 py-2 text-left border-r border-amber-300/80">KEGIATAN USAHA</th>
                <th className="px-3 py-2 text-left border-r border-amber-300/80">JENIS TRANSAKSI</th>
                <th className="px-3 py-2 text-right border-r border-amber-300/80">NILAI TRANSAKSI (Rupiah)</th>
                <th className="px-3 py-2 text-left border-r border-amber-300/80">METODE PENENTUAN HARGA TRANSFER YANG DIGUNAKAN</th>
                <th className="px-3 py-2 text-left">ALASAN PENGGUNAAN METODE</th>
              </tr>
              {/* Filter Row */}
              <tr className="bg-[#FEF9E7] border-b border-amber-200">
                <th className="px-2 py-1"><input type="text" placeholder="Nama" className="w-full bg-white border border-slate-200 rounded px-1.5 py-0.5 text-[10px]" /></th>
                <th className="px-2 py-1"><input type="text" placeholder="NPWP" className="w-full bg-white border border-slate-200 rounded px-1.5 py-0.5 text-[10px]" /></th>
                <th className="px-2 py-1">
                  <select className="w-full bg-white border border-slate-200 rounded px-1 py-0.5 text-[10px]">
                    <option value="">Pilih Negara</option>
                    <option value="ID">Indonesia</option>
                    <option value="SG">Singapura</option>
                  </select>
                </th>
                <th className="px-2 py-1">
                  <select className="w-full bg-white border border-slate-200 rounded px-1 py-0.5 text-[10px]">
                    <option value="">Pilih Bentuk Hubungan</option>
                    <option value="1">Penyertaan Modal &gt;= 25%</option>
                    <option value="2">Penguasaan Manajemen</option>
                  </select>
                </th>
                <th className="px-2 py-1">
                  <select className="w-full bg-white border border-slate-200 rounded px-1 py-0.5 text-[10px]">
                    <option value="">Pilih Kegiatan Usaha</option>
                    <option value="1">Distribusi / Trading</option>
                    <option value="2">Jasa Manajemen</option>
                  </select>
                </th>
                <th className="px-2 py-1">
                  <select className="w-full bg-white border border-slate-200 rounded px-1 py-0.5 text-[10px]">
                    <option value="">Pilih Jenis Transaksi</option>
                    <option value="1">Penjualan Barang Jadi</option>
                    <option value="2">Pembayaran Royalti</option>
                  </select>
                </th>
                <th className="px-2 py-1"><input type="text" placeholder="Nilai" className="w-full bg-white border border-slate-200 rounded px-1.5 py-0.5 text-[10px] text-right" /></th>
                <th className="px-2 py-1">
                  <select className="w-full bg-white border border-slate-200 rounded px-1 py-0.5 text-[10px]">
                    <option value="">Pilih Metode TP</option>
                    <option value="CUP">CUP</option>
                    <option value="TNMM">TNMM</option>
                    <option value="RPM">RPM</option>
                  </select>
                </th>
                <th className="px-2 py-1"><input type="text" placeholder="Alasan" className="w-full bg-white border border-slate-200 rounded px-1.5 py-0.5 text-[10px]" /></th>
              </tr>
            </thead>
            <tbody>
              {transactions.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-3 py-6 text-center text-slate-400">
                    Tidak ada data yang ditemukan.
                  </td>
                </tr>
              ) : (
                transactions.map((t, idx) => (
                  <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="px-3 py-2 font-medium">{t.nama}</td>
                    <td className="px-3 py-2 font-mono-num">{t.npwp}</td>
                    <td className="px-3 py-2">{t.negara}</td>
                    <td className="px-3 py-2">{t.hubungan}</td>
                    <td className="px-3 py-2">{t.usaha}</td>
                    <td className="px-3 py-2">{t.transaksi}</td>
                    <td className="px-3 py-2 text-right font-mono-num font-semibold">{formatRp(t.nilai)}</td>
                    <td className="px-3 py-2">{t.metode}</td>
                    <td className="px-3 py-2 text-slate-600">{t.alasan}</td>
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
