import React, { useState } from 'react';
import { TaxReturn, Taxpayer } from '../../../types/tax.ts';
import { formatRp } from '../../../utils/taxCalc.ts';
import { ChevronDown, ArrowUpDown } from 'lucide-react';

interface BadanLampiranL2Props {
  taxReturn: TaxReturn;
  activeTaxpayer: Taxpayer;
  isReadOnly?: boolean;
}

export const BadanLampiranL2: React.FC<BadanLampiranL2Props> = ({
  taxReturn,
  activeTaxpayer,
  isReadOnly = false,
}) => {
  // Section A: Pemegang Saham / Pengurus
  const [shareholders, setShareholders] = useState<any[]>([]);

  // Section B: Penyertaan Modal Afiliasi
  const [affiliates, setAffiliates] = useState<any[]>([]);

  const totalModalNilai = shareholders.reduce((acc, s) => acc + s.modalNilai, 0);
  const totalModalPersen = shareholders.reduce((acc, s) => acc + s.modalPersen, 0);
  const totalDividen = shareholders.reduce((acc, s) => acc + s.dividen, 0);

  return (
    <div className="space-y-4">
      {/* Title */}
      <div className="flex items-center justify-between">
        <h2 className="font-display font-bold text-[15px] text-[#1E2C5E] uppercase tracking-wide">
          DAFTAR KEPEMILIKAN
        </h2>
      </div>

      {/* Header Banner */}
      <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-4">
        <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2">HEADER</div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-[11.5px] font-semibold text-slate-600 mb-1">Tahun Pajak/Bagian Tahun Pajak</label>
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

      {/* SECTION A */}
      <div className="bg-white border border-[#E2E8F0] rounded-xl shadow-sm overflow-hidden">
        <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 text-[#1E2C5E] font-bold text-[12px] leading-snug">
          A. DAFTAR PEMEGANG SAHAM/PEMILIK MODAL DAN JUMLAH DIVIDEN/PEMBAGIAN LABA YANG DIBAGIKAN SERTA DAFTAR SUSUNAN PENGURUS DAN KOMISARIS
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-[11px]">
            <thead>
              <tr className="bg-[#F4C430] text-[#1E2C5E] font-bold border-b border-amber-300">
                <th rowSpan={2} className="px-2 py-2 text-center w-10 border-r border-amber-300/80">NO.</th>
                <th rowSpan={2} className="px-3 py-2 text-left border-r border-amber-300/80">NAMA</th>
                <th rowSpan={2} className="px-3 py-2 text-left border-r border-amber-300/80">ALAMAT</th>
                <th rowSpan={2} className="px-3 py-2 text-left border-r border-amber-300/80">NEGARA</th>
                <th rowSpan={2} className="px-3 py-2 text-left border-r border-amber-300/80">NPWP/NIK</th>
                <th rowSpan={2} className="px-3 py-2 text-left border-r border-amber-300/80">JABATAN</th>
                <th colSpan={2} className="px-3 py-1 text-center border-r border-amber-300/80">MODAL DISETOR</th>
                <th rowSpan={2} className="px-3 py-2 text-right">DIVIDEN/PEMBAGIAN LABA (Rp)</th>
              </tr>
              <tr className="bg-[#F4C430] text-[#1E2C5E] font-bold border-b border-amber-300">
                <th className="px-2 py-1 text-right border-r border-amber-300/80">NILAI (Rp)</th>
                <th className="px-2 py-1 text-center border-r border-amber-300/80">%</th>
              </tr>
            </thead>
            <tbody>
              {shareholders.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-3 py-6 text-center text-slate-400">
                    Tidak ada data untuk ditampilkan.
                  </td>
                </tr>
              ) : (
                shareholders.map((s, idx) => (
                  <tr key={s.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="px-2 py-2 text-center text-slate-500 font-mono-num">{idx + 1}</td>
                    <td className="px-3 py-2 font-medium text-slate-800">{s.nama}</td>
                    <td className="px-3 py-2 text-slate-600">{s.alamat}</td>
                    <td className="px-3 py-2 text-slate-600">{s.negara}</td>
                    <td className="px-3 py-2 font-mono-num text-slate-600">{s.npwpNik}</td>
                    <td className="px-3 py-2 text-slate-700">{s.jabatan}</td>
                    <td className="px-3 py-2 text-right font-mono-num font-semibold text-slate-800">
                      {formatRp(s.modalNilai)}
                    </td>
                    <td className="px-3 py-2 text-center font-mono-num">{s.modalPersen.toFixed(2)}%</td>
                    <td className="px-3 py-2 text-right font-mono-num font-semibold text-slate-800">
                      {formatRp(s.dividen)}
                    </td>
                  </tr>
                ))
              )}
              <tr className="bg-[#FAFBFD] font-bold text-[#1E2C5E] border-t border-slate-200">
                <td colSpan={6} className="px-3 py-2 text-right uppercase text-[10.5px]">TOTAL</td>
                <td className="px-3 py-2 text-right font-mono-num">{formatRp(totalModalNilai)}</td>
                <td className="px-3 py-2 text-center font-mono-num">{totalModalPersen.toFixed(4)}%</td>
                <td className="px-3 py-2 text-right font-mono-num">{formatRp(totalDividen)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* SECTION B */}
      <div className="bg-white border border-[#E2E8F0] rounded-xl shadow-sm overflow-hidden">
        <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 text-[#1E2C5E] font-bold text-[12px] leading-snug">
          B. DAFTAR PENYERTAAN MODAL, UTANG, DAN/ATAU PIUTANG PADA PERUSAHAAN AFILIASI
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-[11px]">
            <thead>
              <tr className="bg-[#F4C430] text-[#1E2C5E] font-bold border-b border-amber-300">
                <th rowSpan={2} className="px-2 py-2 text-center w-10 border-r border-amber-300/80">NO.</th>
                <th rowSpan={2} className="px-3 py-2 text-left border-r border-amber-300/80">NAMA</th>
                <th rowSpan={2} className="px-3 py-2 text-left border-r border-amber-300/80">NEGARA</th>
                <th rowSpan={2} className="px-3 py-2 text-left border-r border-amber-300/80">NPWP/NIK</th>
                <th colSpan={2} className="px-3 py-1 text-center border-r border-amber-300/80">PENYERTAAN MODAL</th>
                <th colSpan={3} className="px-3 py-1 text-center border-r border-amber-300/80">UTANG</th>
                <th colSpan={3} className="px-3 py-1 text-center">PIUTANG</th>
              </tr>
              <tr className="bg-[#F4C430] text-[#1E2C5E] font-bold border-b border-amber-300">
                <th className="px-2 py-1 text-right border-r border-amber-300/80">NILAI (Rp)</th>
                <th className="px-2 py-1 text-center border-r border-amber-300/80">%</th>
                <th className="px-2 py-1 text-right border-r border-amber-300/80">NILAI (Rp)</th>
                <th className="px-2 py-1 text-center border-r border-amber-300/80">TAHUN</th>
                <th className="px-2 py-1 text-center border-r border-amber-300/80">BUNGA UTANG/TAHUN %</th>
                <th className="px-2 py-1 text-right border-r border-amber-300/80">NILAI (Rp)</th>
                <th className="px-2 py-1 text-center border-r border-amber-300/80">TAHUN</th>
                <th className="px-2 py-1 text-center">BUNGA UTANG/TAHUN %</th>
              </tr>
            </thead>
            <tbody>
              {affiliates.length === 0 ? (
                <tr>
                  <td colSpan={12} className="px-3 py-6 text-center text-slate-400">
                    Tidak ada data untuk ditampilkan.
                  </td>
                </tr>
              ) : (
                affiliates.map((a, idx) => (
                  <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="px-2 py-2 text-center">{idx + 1}</td>
                    <td className="px-3 py-2">{a.nama}</td>
                    <td className="px-3 py-2">{a.negara}</td>
                    <td className="px-3 py-2">{a.npwpNik}</td>
                    <td className="px-3 py-2 text-right">{formatRp(a.modalNilai)}</td>
                    <td className="px-3 py-2 text-center">{a.modalPersen}%</td>
                    <td className="px-3 py-2 text-right">{formatRp(a.utangNilai)}</td>
                    <td className="px-3 py-2 text-center">{a.utangTahun}</td>
                    <td className="px-3 py-2 text-center">{a.utangBunga}%</td>
                    <td className="px-3 py-2 text-right">{formatRp(a.piutangNilai)}</td>
                    <td className="px-3 py-2 text-center">{a.piutangTahun}</td>
                    <td className="px-3 py-2 text-center">{a.piutangBunga}%</td>
                  </tr>
                ))
              )}
              <tr className="bg-[#FAFBFD] font-bold text-[#1E2C5E] border-t border-slate-200">
                <td colSpan={4} className="px-3 py-2 text-right uppercase text-[10.5px]">TOTAL</td>
                <td className="px-3 py-2 text-right font-mono-num">{formatRp(0)}</td>
                <td className="px-3 py-2 text-center font-mono-num">0.00%</td>
                <td className="px-3 py-2 text-right font-mono-num">{formatRp(0)}</td>
                <td colSpan={2}></td>
                <td className="px-3 py-2 text-right font-mono-num">{formatRp(0)}</td>
                <td colSpan={2}></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
