import React, { useState } from 'react';
import { TaxReturn, Taxpayer } from '../../../types/tax.ts';
import { formatRp } from '../../../utils/taxCalc.ts';
import { RotateCcw, Copy, FileSpreadsheet, FileText, Filter, Upload } from 'lucide-react';

interface BadanLampiranL3Props {
  taxReturn: TaxReturn;
  activeTaxpayer: Taxpayer;
  isReadOnly?: boolean;
}

export const BadanLampiranL3: React.FC<BadanLampiranL3Props> = ({
  taxReturn,
  activeTaxpayer,
  isReadOnly = false,
}) => {
  const [foreignIncomes, setForeignIncomes] = useState<any[]>([]);
  const [withheldIncomes, setWithheldIncomes] = useState<any[]>([]);

  const totalDpp = withheldIncomes.reduce((acc, r) => acc + r.dpp, 0);
  const totalPph = withheldIncomes.reduce((acc, r) => acc + r.pph, 0);

  return (
    <div className="space-y-4">
      <h2 className="font-display font-bold text-[15px] text-[#1E2C5E] uppercase tracking-wide">
        DAFTAR PAJAK PENGHASILAN YANG DIPOTONG/ DIPUNGUT OLEH PIHAK LAIN
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

      {/* SECTION A: PENGHASILAN DARI LUAR NEGERI */}
      <div className="bg-white border border-[#E2E8F0] rounded-xl shadow-sm overflow-hidden">
        <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <span className="text-[#1E2C5E] font-bold text-[12px]">A. PENGHASILAN DARI LUAR NEGERI</span>
          <button
            type="button"
            className="p-1 rounded bg-[#1E2C5E] text-white hover:bg-[#16224A] cursor-pointer"
            title="Unggah Bukti Potong Luar Negeri"
          >
            <Upload className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-[11px]">
            <thead>
              <tr className="bg-slate-100 text-[#1E2C5E] font-bold border-b border-slate-200">
                <th rowSpan={2} className="px-2 py-2 text-center w-10 border-r border-slate-200">NO.</th>
                <th colSpan={2} className="px-3 py-1 text-center border-r border-slate-200">PEMOTONG PAJAK</th>
                <th rowSpan={2} className="px-3 py-2 text-center border-r border-slate-200">TANGGAL TRANSAKSI/ PEMBAYARAN PPh</th>
                <th rowSpan={2} className="px-3 py-2 text-left border-r border-slate-200">JENIS PENGHASILAN</th>
                <th rowSpan={2} className="px-3 py-2 text-right border-r border-slate-200">PENGHASILAN NETO (DI RUPIAHKAN)</th>
                <th colSpan={3} className="px-3 py-1 text-center border-r border-slate-200">PPh YANG DIBAYAR/DIPOTONG/TERUTANG DI LUAR NEGERI</th>
                <th rowSpan={2} className="px-3 py-2 text-right">JUMLAH KREDIT PAJAK YANG DAPAT DIPERHITUNGKAN (Rp)</th>
              </tr>
              <tr className="bg-slate-100 text-[#1E2C5E] font-bold border-b border-slate-200">
                <th className="px-2 py-1 text-left border-r border-slate-200">NAMA</th>
                <th className="px-2 py-1 text-left border-r border-slate-200">NEGARA</th>
                <th className="px-2 py-1 text-right border-r border-slate-200">NILAI (Rp)</th>
                <th className="px-2 py-1 text-center border-r border-slate-200">MATA UANG</th>
                <th className="px-2 py-1 text-right border-r border-slate-200">NILAI DALAM MATA UANG ASING</th>
              </tr>
            </thead>
            <tbody>
              {foreignIncomes.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-3 py-6 text-center text-slate-400">
                    Tidak ada data untuk ditampilkan.
                  </td>
                </tr>
              ) : (
                foreignIncomes.map((r, idx) => (
                  <tr key={idx} className="border-b border-slate-100">
                    <td className="px-2 py-2 text-center">{idx + 1}</td>
                    <td className="px-3 py-2">{r.nama}</td>
                    <td className="px-3 py-2">{r.negara}</td>
                    <td className="px-3 py-2 text-center">{r.tgl}</td>
                    <td className="px-3 py-2">{r.jenis}</td>
                    <td className="px-3 py-2 text-right">{formatRp(r.neto)}</td>
                    <td className="px-3 py-2 text-right">{formatRp(r.pphRp)}</td>
                    <td className="px-3 py-2 text-center">{r.curr}</td>
                    <td className="px-3 py-2 text-right">{r.valForeign}</td>
                    <td className="px-3 py-2 text-right">{formatRp(r.kredit)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Foreign Tax Credit Summary */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 space-y-1.5 text-[11px] font-semibold text-slate-700">
          <div className="flex justify-between items-center">
            <span>REFUND/DEDUCTION OF CREDITED OVERSEAS INCOME TAXES (ARTICLE 24) THAT HAS BEEN CREDITED FOR PREVIOUS YEAR</span>
            <span className="font-mono-num text-slate-800">Rp 0</span>
          </div>
          <div className="flex justify-between items-center pt-1 border-t border-slate-200">
            <span>TOTAL INCOME TAX PAID IN OVERSEAS THAT CAN BE CALCULATED IN CURRENT YEAR</span>
            <span className="font-mono-num text-[#1E2C5E] font-bold">Rp 0</span>
          </div>
        </div>
      </div>

      {/* SECTION B: PPh YANG DIPOTONG/DIPUNGUT PIHAK LAIN */}
      <div className="bg-white border border-[#E2E8F0] rounded-xl shadow-sm overflow-hidden">
        <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 text-[#1E2C5E] font-bold text-[12px]">
          B. PPh YANG DIPOTONG/DIPUNGUT PIHAK LAIN
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
          <table className="w-full border-collapse text-[11px]">
            <thead>
              <tr className="bg-[#F4C430] text-[#1E2C5E] font-bold border-b border-amber-300">
                <th className="px-2 py-2 text-center w-10 border-r border-amber-300/80">NO.</th>
                <th className="px-3 py-2 text-left border-r border-amber-300/80">NAMA PEMOTONG/PEMUNGUT</th>
                <th className="px-3 py-2 text-left border-r border-amber-300/80">NPWP PEMOTONG/PEMUNGUT</th>
                <th className="px-3 py-2 text-left border-r border-amber-300/80">JENIS PAJAK</th>
                <th className="px-3 py-2 text-right border-r border-amber-300/80">DASAR PENGENAAN PAJAK (Rupiah)</th>
                <th className="px-3 py-2 text-right border-r border-amber-300/80">PPh YANG DIPOTONG/DIPUNGUT (Rupiah)</th>
                <th className="px-3 py-2 text-left border-r border-amber-300/80">BUKTI POTONG/SSP/SSPCP - NOMOR</th>
                <th className="px-3 py-2 text-center">BUKTI POTONG/SSP/SSPCP - TANGGAL</th>
              </tr>
              {/* Filter Row */}
              <tr className="bg-[#FEF9E7] border-b border-amber-200">
                <th className="px-2 py-1"></th>
                <th className="px-2 py-1">
                  <input type="text" placeholder="Cari Nama" className="w-full bg-white border border-slate-200 rounded px-2 py-0.5 text-[10.5px]" />
                </th>
                <th className="px-2 py-1">
                  <input type="text" placeholder="Cari NPWP" className="w-full bg-white border border-slate-200 rounded px-2 py-0.5 text-[10.5px]" />
                </th>
                <th className="px-2 py-1">
                  <select className="w-full bg-white border border-slate-200 rounded px-1.5 py-0.5 text-[10.5px]">
                    <option value="">Pilih Jenis Pajak</option>
                    <option value="PPh 23">PPh 23</option>
                    <option value="PPh 22">PPh 22</option>
                  </select>
                </th>
                <th className="px-2 py-1">
                  <input type="text" placeholder="Filter DPP" className="w-full bg-white border border-slate-200 rounded px-2 py-0.5 text-[10.5px] text-right" />
                </th>
                <th className="px-2 py-1">
                  <input type="text" placeholder="Filter PPh" className="w-full bg-white border border-slate-200 rounded px-2 py-0.5 text-[10.5px] text-right" />
                </th>
                <th className="px-2 py-1">
                  <input type="text" placeholder="Cari Nomor" className="w-full bg-white border border-slate-200 rounded px-2 py-0.5 text-[10.5px]" />
                </th>
                <th className="px-2 py-1">
                  <input type="text" placeholder="YYYY-MM-DD" className="w-full bg-white border border-slate-200 rounded px-2 py-0.5 text-[10.5px] text-center" />
                </th>
              </tr>
            </thead>
            <tbody>
              {withheldIncomes.map((r, idx) => (
                <tr key={r.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="px-2 py-2 text-center text-slate-500 font-mono-num">{idx + 1}</td>
                  <td className="px-3 py-2 font-medium text-slate-800">{r.namaPemotong}</td>
                  <td className="px-3 py-2 font-mono-num text-slate-600">{r.npwpPemotong}</td>
                  <td className="px-3 py-2 text-slate-700">{r.jenisPajak}</td>
                  <td className="px-3 py-2 text-right font-mono-num">{formatRp(r.dpp)}</td>
                  <td className="px-3 py-2 text-right font-mono-num font-bold text-[#1E2C5E]">{formatRp(r.pph)}</td>
                  <td className="px-3 py-2 font-mono-num text-slate-600">{r.buktiNomor}</td>
                  <td className="px-3 py-2 text-center font-mono-num text-slate-600">{r.buktiTanggal}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Section B Summary matching screenshot */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 space-y-1.5 text-[11px] font-semibold text-slate-700">
          <div className="flex justify-between items-center">
            <span>TOTAL</span>
            <span className="font-mono-num text-slate-800 font-bold">{formatRp(totalPph)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span>KREDIT PAJAK LUAR NEGERI</span>
            <span className="font-mono-num text-slate-800">Rp 0</span>
          </div>
          <div className="flex justify-between items-center pt-1 border-t border-slate-200">
            <span className="text-[#1E2C5E] font-bold">JUMLAH KREDIT PAJAK</span>
            <span className="font-mono-num text-[#1E2C5E] font-extrabold text-[12px]">{formatRp(totalPph)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
