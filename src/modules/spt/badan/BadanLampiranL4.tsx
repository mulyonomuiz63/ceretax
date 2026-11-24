import React, { useState } from 'react';
import { TaxReturn, Taxpayer } from '../../../types/tax.ts';
import { formatRp } from '../../../utils/taxCalc.ts';
import { RotateCcw, Copy, FileSpreadsheet, FileText, Filter } from 'lucide-react';

interface BadanLampiranL4Props {
  taxReturn: TaxReturn;
  activeTaxpayer: Taxpayer;
  isReadOnly?: boolean;
}

export const BadanLampiranL4: React.FC<BadanLampiranL4Props> = ({
  taxReturn,
  activeTaxpayer,
  isReadOnly = false,
}) => {
  // Final tax rows matching Gambar 4 exactly
  const [finalTaxRows, setFinalTaxRows] = useState([
    {
      npwp: activeTaxpayer.nikNpwp,
      nama: activeTaxpayer.name,
      kodeObjek: '28-405-01',
      objekPajak: 'Transaksi Penjualan Saham Milik Perusahaan Modal Ventura Tidak di Bursa Efek',
      dpp: 0,
      tingkat: 0.1,
      pphTerutang: 0,
    },
    {
      npwp: activeTaxpayer.nikNpwp,
      nama: activeTaxpayer.name,
      kodeObjek: '28-409-08',
      objekPajak: 'Jasa Konstruksi Berupa Jasa Pelaksanaan Konstruksi (Dengan Kualifikasi Usaha)',
      dpp: 0,
      tingkat: 1.75,
      pphTerutang: 0,
    },
    {
      npwp: activeTaxpayer.nikNpwp,
      nama: activeTaxpayer.name,
      kodeObjek: '28-410-02',
      objekPajak: 'Imbalan yang Dibayarkan/Terutang Kepada Perusahaan Pelayaran Dalam Negeri',
      dpp: 0,
      tingkat: 1.2,
      pphTerutang: 0,
    },
    {
      npwp: activeTaxpayer.nikNpwp,
      nama: activeTaxpayer.name,
      kodeObjek: '28-409-11',
      objekPajak: 'Jasa Konstruksi Berupa Jasa Pelaksanaan Konstruksi (Kualifikasi Usaha Menengah dan Besar)',
      dpp: 0,
      tingkat: 2.65,
      pphTerutang: 0,
    },
    {
      npwp: activeTaxpayer.nikNpwp,
      nama: activeTaxpayer.name,
      kodeObjek: '22-401-02',
      objekPajak: 'Penjualan BBM oleh Badan Usaha Selain Pertamina atau Anak Perusahaan Pertamina Kepada SPBU/Agen/Penyalur (Final)',
      dpp: 0,
      tingkat: 0.3,
      pphTerutang: 0,
    },
    {
      npwp: activeTaxpayer.nikNpwp,
      nama: activeTaxpayer.name,
      kodeObjek: '28-417-01',
      objekPajak: 'Imbalan yang Dibayarkan/Terutang Kepada Perusahaan Pelayaran dan/atau Penerbangan Luar Negeri Sehubungan dengan Pengangkutan Orang dan/atau Barang (Selain Berdasarkan Perjanjian Charter)',
      dpp: 0,
      tingkat: 2.64,
      pphTerutang: 0,
    },
    {
      npwp: activeTaxpayer.nikNpwp,
      nama: activeTaxpayer.name,
      kodeObjek: '28-416-01',
      objekPajak: 'Revaluasi atau Penilaian Kembali Aset Tetap',
      dpp: 0,
      tingkat: 10,
      pphTerutang: 0,
    },
    {
      npwp: activeTaxpayer.nikNpwp,
      nama: activeTaxpayer.name,
      kodeObjek: '28-409-13',
      objekPajak: 'Jasa Konstruksi Berupa Jasa Pengawasan Konstruksi (Dengan Kualifikasi Usaha)',
      dpp: 0,
      tingkat: 3.5,
      pphTerutang: 0,
    },
  ]);

  // Non-taxable object rows
  const [nonTaxableRows, setNonTaxableRows] = useState([
    {
      id: '1',
      kode: 'NT-01',
      jenis: 'Dividen atau Bagian Laba dari Penyertaan Modal Dalam Negeri',
      sumber: '',
      bruto: 0,
    },
  ]);

  const totalFinalDpp = finalTaxRows.reduce((a, b) => a + b.dpp, 0);
  const totalFinalPph = finalTaxRows.reduce((a, b) => a + b.pphTerutang, 0);
  const totalNonTaxable = nonTaxableRows.reduce((a, b) => a + b.bruto, 0);

  return (
    <div className="space-y-4">
      <h2 className="font-display font-bold text-[15px] text-[#1E2C5E] uppercase tracking-wide">
        INCOME THAT ARE SUBJECT TO FINAL TAX AND LIST OF INCOME THAT IS NONTAXABLE OBJECT
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

      {/* SECTION A */}
      <div className="bg-white border border-[#E2E8F0] rounded-xl shadow-sm overflow-hidden">
        <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 text-[#1E2C5E] font-bold text-[12px]">
          A. PENGHASILAN YANG DIKENAKAN PPh YANG BERSIFAT FINAL
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
                <th className="px-3 py-2 text-left border-r border-amber-300/80">NPWP PEMOTONG/PEMUNGUT</th>
                <th className="px-3 py-2 text-left border-r border-amber-300/80">NAMA PEMOTONG/PEMUNGUT</th>
                <th className="px-3 py-2 text-center border-r border-amber-300/80">KODE OBJEK PAJAK</th>
                <th className="px-3 py-2 text-left border-r border-amber-300/80">OBJEK PAJAK</th>
                <th className="px-3 py-2 text-right border-r border-amber-300/80">DASAR PENGENAAN PAJAK (Rupiah)</th>
                <th className="px-3 py-2 text-center border-r border-amber-300/80">TINGKAT (%)</th>
                <th className="px-3 py-2 text-right">PPh FINAL TERUTANG (Rupiah)</th>
              </tr>
              {/* Filter Row */}
              <tr className="bg-[#FEF9E7] border-b border-amber-200">
                <th className="px-2 py-1"><input type="text" placeholder="Filter NPWP" className="w-full bg-white border border-slate-200 rounded px-1.5 py-0.5 text-[10.5px]" /></th>
                <th className="px-2 py-1"><input type="text" placeholder="Filter Nama" className="w-full bg-white border border-slate-200 rounded px-1.5 py-0.5 text-[10.5px]" /></th>
                <th className="px-2 py-1"><input type="text" placeholder="Filter Kode" className="w-full bg-white border border-slate-200 rounded px-1.5 py-0.5 text-[10.5px]" /></th>
                <th className="px-2 py-1"></th>
                <th className="px-2 py-1"><input type="text" placeholder="Filter DPP" className="w-full bg-white border border-slate-200 rounded px-1.5 py-0.5 text-[10.5px] text-right" /></th>
                <th className="px-2 py-1"></th>
                <th className="px-2 py-1"><input type="text" placeholder="Filter PPh" className="w-full bg-white border border-slate-200 rounded px-1.5 py-0.5 text-[10.5px] text-right" /></th>
              </tr>
            </thead>
            <tbody>
              {finalTaxRows.map((r, idx) => (
                <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="px-3 py-2 font-mono-num text-slate-600">{r.npwp}</td>
                  <td className="px-3 py-2 font-medium text-slate-800">{r.nama}</td>
                  <td className="px-3 py-2 text-center font-mono-num font-semibold text-slate-700">{r.kodeObjek}</td>
                  <td className="px-3 py-2 text-slate-700 leading-snug">{r.objekPajak}</td>
                  <td className="px-3 py-2 text-right font-mono-num">{formatRp(r.dpp)}</td>
                  <td className="px-3 py-2 text-center font-mono-num">{r.tingkat}%</td>
                  <td className="px-3 py-2 text-right font-mono-num font-semibold text-slate-800">{formatRp(r.pphTerutang)}</td>
                </tr>
              ))}
              <tr className="bg-[#FAFBFD] font-bold text-[#1E2C5E] border-t border-slate-200">
                <td colSpan={4} className="px-3 py-2 text-right uppercase text-[10.5px]">TOTAL</td>
                <td className="px-3 py-2 text-right font-mono-num">{formatRp(totalFinalDpp)}</td>
                <td></td>
                <td className="px-3 py-2 text-right font-mono-num">{formatRp(totalFinalPph)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* SECTION B */}
      <div className="bg-white border border-[#E2E8F0] rounded-xl shadow-sm overflow-hidden">
        <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 text-[#1E2C5E] font-bold text-[12px]">
          B. PENGHASILAN YANG TIDAK TERMASUK OBJEK PAJAK
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-[11px]">
            <thead>
              <tr className="bg-slate-100 text-[#1E2C5E] font-bold border-b border-slate-200">
                <th className="px-2 py-2 text-center w-12 border-r border-slate-200">NO.</th>
                <th className="px-3 py-2 text-left border-r border-slate-200">KODE</th>
                <th className="px-3 py-2 text-left border-r border-slate-200">JENIS PENGHASILAN</th>
                <th className="px-3 py-2 text-left border-r border-slate-200">SUMBER PENGHASILAN</th>
                <th className="px-3 py-2 text-right">PENGHASILAN BRUTO (Rp)</th>
              </tr>
            </thead>
            <tbody>
              {nonTaxableRows.map((r, idx) => (
                <tr key={r.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="px-2 py-2 text-center text-slate-500 font-mono-num">{idx + 1}</td>
                  <td className="px-3 py-2 font-mono-num text-slate-600">{r.kode}</td>
                  <td className="px-3 py-2 text-slate-800">{r.jenis}</td>
                  <td className="px-3 py-2 text-slate-600">{r.sumber}</td>
                  <td className="px-3 py-2 text-right font-mono-num font-semibold text-slate-800">{formatRp(r.bruto)}</td>
                </tr>
              ))}
              <tr className="bg-[#FAFBFD] font-bold text-[#1E2C5E] border-t border-slate-200">
                <td colSpan={4} className="px-3 py-2 text-right uppercase text-[10.5px]">TOTAL</td>
                <td className="px-3 py-2 text-right font-mono-num">{formatRp(totalNonTaxable)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
