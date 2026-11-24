import React, { useState } from 'react';
import { TaxReturn, Taxpayer } from '../../../types/tax.ts';
import { formatRp } from '../../../utils/taxCalc.ts';

interface BadanLampiranL1AProps {
  taxReturn: TaxReturn;
  activeTaxpayer: Taxpayer;
  isReadOnly?: boolean;
}

export const BadanLampiranL1A: React.FC<BadanLampiranL1AProps> = ({
  taxReturn,
  activeTaxpayer,
  isReadOnly = false,
}) => {
  // Section A: Laba Rugi Umum rows matching Gambar 1-2
  const [salesRows, setSalesRows] = useState([
    { code: '4002', name: 'Domestic', komersial: 0, nonObjek: 0, final: 0, tidakFinal: 0, koreksiPositif: 0, koreksiNegatif: 0, kodeFiskal: '', nilaiFiskal: 0 },
    { code: '4003', name: 'Export', komersial: 0, nonObjek: 0, final: 0, tidakFinal: 0, koreksiPositif: 0, koreksiNegatif: 0, kodeFiskal: '', nilaiFiskal: 0 },
    { code: '4004', name: 'Gross Sales', isSubtotal: true, komersial: 271_026_364, nonObjek: 0, final: 0, tidakFinal: 271_026_364, koreksiPositif: 0, koreksiNegatif: 0, kodeFiskal: '', nilaiFiskal: 271_026_364 },
    { code: '4011', name: 'Return', komersial: 0, nonObjek: 0, final: 0, tidakFinal: 0, koreksiPositif: 0, koreksiNegatif: 0, kodeFiskal: '', nilaiFiskal: 0 },
    { code: '4012', name: 'Sales Discount', komersial: 0, nonObjek: 0, final: 0, tidakFinal: 0, koreksiPositif: 0, koreksiNegatif: 0, kodeFiskal: '', nilaiFiskal: 0 },
    { code: '4013', name: 'Sales Adjustment', komersial: 0, nonObjek: 0, final: 0, tidakFinal: 0, koreksiPositif: 0, koreksiNegatif: 0, kodeFiskal: '', nilaiFiskal: 0 },
    { code: '4020', name: 'Net Sales', isSubtotal: true, komersial: 271_026_364, nonObjek: 0, final: 0, tidakFinal: 271_026_364, koreksiPositif: 0, koreksiNegatif: 0, kodeFiskal: '', nilaiFiskal: 271_026_364 },
  ]);

  const [cogsRows, setCogsRows] = useState([
    { code: '5001', name: 'Purchase of materials/merchandise', komersial: 66_110_000, nonObjek: 0, final: 0, tidakFinal: 66_110_000, koreksiPositif: 0, koreksiNegatif: 0, kodeFiskal: '', nilaiFiskal: 66_110_000 },
    { code: '5003', name: 'Freight expenses', komersial: 0, nonObjek: 0, final: 0, tidakFinal: 0, koreksiPositif: 0, koreksiNegatif: 0, kodeFiskal: '', nilaiFiskal: 0 },
    { code: '5007', name: 'Other expenses', komersial: 0, nonObjek: 0, final: 0, tidakFinal: 0, koreksiPositif: 0, koreksiNegatif: 0, kodeFiskal: '', nilaiFiskal: 0 },
    { code: '5008', name: 'Beginning Inventory', komersial: 0, nonObjek: 0, final: 0, tidakFinal: 0, koreksiPositif: 0, koreksiNegatif: 0, kodeFiskal: '', nilaiFiskal: 0 },
    { code: '5009', name: 'Less Ending Inventory', komersial: 0, nonObjek: 0, final: 0, tidakFinal: 0, koreksiPositif: 0, koreksiNegatif: 0, kodeFiskal: '', nilaiFiskal: 0 },
    { code: '5020', name: 'Total of COGS (Cost of Goods Sold)', isSubtotal: true, komersial: 66_110_000, nonObjek: 0, final: 0, tidakFinal: 66_110_000, koreksiPositif: 0, koreksiNegatif: 0, kodeFiskal: '', nilaiFiskal: 66_110_000 },
    { code: '4300', name: 'Gross Profit', isSubtotal: true, komersial: 204_916_364, nonObjek: 0, final: 0, tidakFinal: 204_916_364, koreksiPositif: 0, koreksiNegatif: 0, kodeFiskal: '', nilaiFiskal: 204_916_364 },
    { code: '4199', name: 'Other Income', komersial: 0, nonObjek: 0, final: 0, tidakFinal: 0, koreksiPositif: 0, koreksiNegatif: 0, kodeFiskal: '', nilaiFiskal: 0 },
  ]);

  const [operatingExpenseRows, setOperatingExpenseRows] = useState([
    { code: '5211', name: 'Salaries, Wages, Bonuses, Gratification expenses', komersial: 0, nonObjek: 0, final: 0, tidakFinal: 0, koreksiPositif: 0, koreksiNegatif: 0, kodeFiskal: '', nilaiFiskal: 0 },
    { code: '5212', name: 'Other Employee Benefit', komersial: 0, nonObjek: 0, final: 0, tidakFinal: 0, koreksiPositif: 0, koreksiNegatif: 0, kodeFiskal: '', nilaiFiskal: 0 },
    { code: '5213', name: 'Transportation expenses', komersial: 0, nonObjek: 0, final: 0, tidakFinal: 0, koreksiPositif: 0, koreksiNegatif: 0, kodeFiskal: '', nilaiFiskal: 0 },
    { code: '5214', name: 'Depreciation and Amortization expenses', komersial: 4_900_000, nonObjek: 0, final: 0, tidakFinal: 4_900_000, koreksiPositif: 0, koreksiNegatif: 0, kodeFiskal: '', nilaiFiskal: 4_900_000 },
    { code: '5215', name: 'Rental expenses', komersial: 0, nonObjek: 0, final: 0, tidakFinal: 0, koreksiPositif: 0, koreksiNegatif: 0, kodeFiskal: '', nilaiFiskal: 0 },
    { code: '5216', name: 'Interest expenses', komersial: 0, nonObjek: 0, final: 0, tidakFinal: 0, koreksiPositif: 0, koreksiNegatif: 0, kodeFiskal: '', nilaiFiskal: 0 },
    { code: '5217', name: 'Expenses related to services', komersial: 0, nonObjek: 0, final: 0, tidakFinal: 0, koreksiPositif: 0, koreksiNegatif: 0, kodeFiskal: '', nilaiFiskal: 0 },
    { code: '5218', name: 'Impairment expenses', komersial: 0, nonObjek: 0, final: 0, tidakFinal: 0, koreksiPositif: 0, koreksiNegatif: 0, kodeFiskal: '', nilaiFiskal: 0 },
    { code: '5219', name: 'Royalties expenses', komersial: 0, nonObjek: 0, final: 0, tidakFinal: 0, koreksiPositif: 0, koreksiNegatif: 0, kodeFiskal: '', nilaiFiskal: 0 },
    { code: '5220', name: 'Marketing/promotion expenses', komersial: 0, nonObjek: 0, final: 0, tidakFinal: 0, koreksiPositif: 0, koreksiNegatif: 0, kodeFiskal: '', nilaiFiskal: 0 },
    { code: '5221', name: 'Entertainment expenses', komersial: 0, nonObjek: 0, final: 0, tidakFinal: 0, koreksiPositif: 0, koreksiNegatif: 0, kodeFiskal: '', nilaiFiskal: 0 },
    { code: '5222', name: 'General and Administration expenses', komersial: 0, nonObjek: 0, final: 0, tidakFinal: 0, koreksiPositif: 0, koreksiNegatif: 0, kodeFiskal: '', nilaiFiskal: 0 },
    { code: '5399', name: 'Other operating expenses', komersial: 213_847_548, nonObjek: 0, final: 0, tidakFinal: 213_847_548, koreksiPositif: 0, koreksiNegatif: 0, kodeFiskal: '', nilaiFiskal: 213_847_548 },
    { code: '5400', name: 'Total Operating expenses', isSubtotal: true, komersial: 218_747_550, nonObjek: 0, final: 0, tidakFinal: 218_747_550, koreksiPositif: 0, koreksiNegatif: 0, kodeFiskal: '', nilaiFiskal: 218_747_550 },
    { code: '4500', name: 'Operating Profit (Loss)', isSubtotal: true, komersial: -13_831_186, nonObjek: 0, final: 0, tidakFinal: -13_831_186, koreksiPositif: 0, koreksiNegatif: 0, kodeFiskal: '', nilaiFiskal: 114_283 },
  ]);

  const [nonOperatingRows, setNonOperatingRows] = useState([
    { code: '4501', name: 'Foreign Exchange Gain', komersial: 0, nonObjek: 0, final: 0, tidakFinal: 0, koreksiPositif: 0, koreksiNegatif: 0, kodeFiskal: '', nilaiFiskal: 0 },
    { code: '4502', name: 'Gain on Sales of Asset Other Than Inventories', komersial: 0, nonObjek: 0, final: 0, tidakFinal: 0, koreksiPositif: 0, koreksiNegatif: 0, kodeFiskal: '', nilaiFiskal: 0 },
    { code: '4511', name: 'Interest income (from implicit interest rate)', komersial: 0, nonObjek: 0, final: 0, tidakFinal: 0, koreksiPositif: 0, koreksiNegatif: 0, kodeFiskal: '', nilaiFiskal: 0 },
    { code: '4599', name: 'Other non-operating income', komersial: 0, nonObjek: 0, final: 0, tidakFinal: 0, koreksiPositif: 0, koreksiNegatif: 0, kodeFiskal: '', nilaiFiskal: 0 },
    { code: '4600', name: 'Total Non Operating Income', isSubtotal: true, komersial: 0, nonObjek: 0, final: 0, tidakFinal: 0, koreksiPositif: 0, koreksiNegatif: 0, kodeFiskal: '', nilaiFiskal: 0 },
    { code: '5405', name: 'Loss on Sales of Asset Other Than Inventories', komersial: 0, nonObjek: 0, final: 0, tidakFinal: 0, koreksiPositif: 0, koreksiNegatif: 0, kodeFiskal: '', nilaiFiskal: 0 },
    { code: '5409', name: 'Donation', komersial: 0, nonObjek: 0, final: 0, tidakFinal: 0, koreksiPositif: 0, koreksiNegatif: 0, kodeFiskal: '', nilaiFiskal: 0 },
    { code: '5421', name: 'Foreign Exchange Loss', komersial: 0, nonObjek: 0, final: 0, tidakFinal: 0, koreksiPositif: 0, koreksiNegatif: 0, kodeFiskal: '', nilaiFiskal: 0 },
    { code: '5499', name: 'Other non-operating expenses', komersial: 1_358_182, nonObjek: 0, final: 0, tidakFinal: 1_358_182, koreksiPositif: 0, koreksiNegatif: 0, kodeFiskal: '', nilaiFiskal: 0 },
    { code: '5500', name: 'Total non-operating expenses', isSubtotal: true, komersial: 1_358_182, nonObjek: 0, final: 0, tidakFinal: 1_358_182, koreksiPositif: 0, koreksiNegatif: 0, kodeFiskal: '', nilaiFiskal: 0 },
    { code: '4700', name: 'Non-operating Profit (Loss)', isSubtotal: true, komersial: -1_358_182, nonObjek: 0, final: 0, tidakFinal: -1_358_182, koreksiPositif: 0, koreksiNegatif: 0, kodeFiskal: '', nilaiFiskal: 0 },
    { code: '4800', name: 'Laba (Rugi) Sebelum Pajak', isSubtotal: true, komersial: -15_189_368, nonObjek: 0, final: 0, tidakFinal: -15_189_368, koreksiPositif: 15_303_651, koreksiNegatif: 0, kodeFiskal: '', nilaiFiskal: 114_283 },
  ]);

  return (
    <div className="space-y-4">
      <h2 className="font-display font-bold text-[15px] text-[#1E2C5E] uppercase tracking-wide">
        REKONSILIASI LAPORAN KEUANGAN - UMUM
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

      {/* SECTION A: LAPORAN LABA RUGI */}
      <div className="bg-white border border-[#E2E8F0] rounded-xl shadow-sm overflow-hidden">
        <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 text-[#1E2C5E] font-bold text-[12px] leading-snug">
          A. LAPORAN LABA RUGI
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-[10.5px]">
            <thead>
              <tr className="bg-[#F8FAFC] text-[#1E2C5E] font-bold border-b border-slate-200">
                <th className="px-2 py-2 text-left w-14 border-r border-slate-200">KODE AKUN</th>
                <th className="px-3 py-2 text-left min-w-[200px] border-r border-slate-200">NAMA AKUN</th>
                <th className="px-2 py-2 text-right border-r border-slate-200">NILAI KOMERSIAL</th>
                <th className="px-2 py-2 text-right border-r border-slate-200">TIDAK TERMASUK OBJEK PAJAK</th>
                <th className="px-2 py-2 text-right border-r border-slate-200">DIKENAKAN PPh BERSIFAT FINAL</th>
                <th className="px-2 py-2 text-right border-r border-slate-200">OBJEK PAJAK TIDAK FINAL</th>
                <th className="px-2 py-2 text-right border-r border-slate-200">PENYESUAIAN FISKAL POSITIF</th>
                <th className="px-2 py-2 text-right border-r border-slate-200">PENYESUAIAN FISKAL NEGATIF</th>
                <th className="px-2 py-2 text-center w-24 border-r border-slate-200">KODE PENYESUAIAN FISKAL</th>
                <th className="px-2 py-2 text-right">NILAI FISKAL</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {/* Penjualan Header */}
              <tr className="bg-slate-50 font-bold text-slate-700">
                <td colSpan={10} className="px-3 py-1.5">Penjualan</td>
              </tr>
              {salesRows.map((r, i) => (
                <tr key={i} className={r.isSubtotal ? 'bg-[#FAFBFD] font-bold text-[#1E2C5E]' : 'hover:bg-slate-50'}>
                  <td className="px-2 py-1 font-mono-num text-slate-500">{r.code}</td>
                  <td className="px-3 py-1 text-slate-800">{r.name}</td>
                  <td className="px-2 py-1 text-right font-mono-num">{formatRp(r.komersial)}</td>
                  <td className="px-2 py-1 text-right font-mono-num">{formatRp(r.nonObjek)}</td>
                  <td className="px-2 py-1 text-right font-mono-num">{formatRp(r.final)}</td>
                  <td className="px-2 py-1 text-right font-mono-num">{formatRp(r.tidakFinal)}</td>
                  <td className="px-2 py-1 text-right font-mono-num text-amber-700 font-semibold">{formatRp(r.koreksiPositif)}</td>
                  <td className="px-2 py-1 text-right font-mono-num text-blue-700 font-semibold">{formatRp(r.koreksiNegatif)}</td>
                  <td className="px-2 py-1 text-center font-mono-num font-bold text-amber-800">{r.kodeFiskal}</td>
                  <td className="px-2 py-1 text-right font-mono-num font-semibold text-[#1E2C5E]">{formatRp(r.nilaiFiskal)}</td>
                </tr>
              ))}

              {/* HPP Header */}
              <tr className="bg-slate-50 font-bold text-slate-700">
                <td colSpan={10} className="px-3 py-1.5">Harga Pokok Penjualan (HPP)</td>
              </tr>
              {cogsRows.map((r, i) => (
                <tr key={i} className={r.isSubtotal ? 'bg-[#FAFBFD] font-bold text-[#1E2C5E]' : 'hover:bg-slate-50'}>
                  <td className="px-2 py-1 font-mono-num text-slate-500">{r.code}</td>
                  <td className="px-3 py-1 text-slate-800">{r.name}</td>
                  <td className="px-2 py-1 text-right font-mono-num">{formatRp(r.komersial)}</td>
                  <td className="px-2 py-1 text-right font-mono-num">{formatRp(r.nonObjek)}</td>
                  <td className="px-2 py-1 text-right font-mono-num">{formatRp(r.final)}</td>
                  <td className="px-2 py-1 text-right font-mono-num">{formatRp(r.tidakFinal)}</td>
                  <td className="px-2 py-1 text-right font-mono-num text-amber-700 font-semibold">{formatRp(r.koreksiPositif)}</td>
                  <td className="px-2 py-1 text-right font-mono-num text-blue-700 font-semibold">{formatRp(r.koreksiNegatif)}</td>
                  <td className="px-2 py-1 text-center font-mono-num font-bold text-amber-800">{r.kodeFiskal}</td>
                  <td className="px-2 py-1 text-right font-mono-num font-semibold text-[#1E2C5E]">{formatRp(r.nilaiFiskal)}</td>
                </tr>
              ))}

              {/* Beban Usaha Header */}
              <tr className="bg-slate-50 font-bold text-slate-700">
                <td colSpan={10} className="px-3 py-1.5">Beban Usaha</td>
              </tr>
              {operatingExpenseRows.map((r, i) => (
                <tr key={i} className={r.isSubtotal ? 'bg-[#FAFBFD] font-bold text-[#1E2C5E]' : 'hover:bg-slate-50'}>
                  <td className="px-2 py-1 font-mono-num text-slate-500">{r.code}</td>
                  <td className="px-3 py-1 text-slate-800">{r.name}</td>
                  <td className="px-2 py-1 text-right font-mono-num">{formatRp(r.komersial)}</td>
                  <td className="px-2 py-1 text-right font-mono-num">{formatRp(r.nonObjek)}</td>
                  <td className="px-2 py-1 text-right font-mono-num">{formatRp(r.final)}</td>
                  <td className="px-2 py-1 text-right font-mono-num">{formatRp(r.tidakFinal)}</td>
                  <td className="px-2 py-1 text-right font-mono-num text-amber-700 font-semibold">{formatRp(r.koreksiPositif)}</td>
                  <td className="px-2 py-1 text-right font-mono-num text-blue-700 font-semibold">{formatRp(r.koreksiNegatif)}</td>
                  <td className="px-2 py-1 text-center font-mono-num font-bold text-amber-800">{r.kodeFiskal}</td>
                  <td className="px-2 py-1 text-right font-mono-num font-semibold text-[#1E2C5E]">{formatRp(r.nilaiFiskal)}</td>
                </tr>
              ))}

              {/* Pendapatan dan Beban Non Usaha */}
              <tr className="bg-slate-50 font-bold text-slate-700">
                <td colSpan={10} className="px-3 py-1.5">Pendapatan dan Beban Non Usaha</td>
              </tr>
              {nonOperatingRows.map((r, i) => (
                <tr key={i} className={r.isSubtotal ? 'bg-[#FEF9E7] font-bold text-[#1E2C5E]' : 'hover:bg-slate-50'}>
                  <td className="px-2 py-1 font-mono-num text-slate-500">{r.code}</td>
                  <td className="px-3 py-1 text-slate-800">{r.name}</td>
                  <td className="px-2 py-1 text-right font-mono-num">{formatRp(r.komersial)}</td>
                  <td className="px-2 py-1 text-right font-mono-num">{formatRp(r.nonObjek)}</td>
                  <td className="px-2 py-1 text-right font-mono-num">{formatRp(r.final)}</td>
                  <td className="px-2 py-1 text-right font-mono-num">{formatRp(r.tidakFinal)}</td>
                  <td className="px-2 py-1 text-right font-mono-num text-amber-700 font-semibold">{formatRp(r.koreksiPositif)}</td>
                  <td className="px-2 py-1 text-right font-mono-num text-blue-700 font-semibold">{formatRp(r.koreksiNegatif)}</td>
                  <td className="px-2 py-1 text-center font-mono-num font-bold text-amber-800">{r.kodeFiskal}</td>
                  <td className="px-2 py-1 text-right font-mono-num font-semibold text-[#1E2C5E]">{formatRp(r.nilaiFiskal)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* SECTION B: LAPORAN POSISI KEUANGAN (NERACA UMUM) */}
      <div className="bg-white border border-[#E2E8F0] rounded-xl shadow-sm overflow-hidden">
        <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 text-[#1E2C5E] font-bold text-[12px] leading-snug">
          B. LAPORAN POSISI KEUANGAN
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-slate-200">
          {/* LEFT COLUMN: ASET */}
          <div className="p-3 space-y-3">
            <div>
              <div className="px-2 py-1.5 bg-[#EFF6FF] border border-[#BFDBFE] text-[#1E2C5E] font-bold text-[11px] uppercase rounded mb-1">
                Aset Lancar
              </div>
              <div className="space-y-1">
                {[
                  { code: '1101', name: 'Kas dan Setara Kas', val: 103020270 },
                  { code: '1102', name: 'Piutang Usaha - Pihak Ketiga', val: 22618364 },
                  { code: '1103', name: 'Piutang Usaha - Pihak yang Mempunyai Hubungan Istimewa', val: 0 },
                  { code: '1104', name: 'Piutang Lainnya - Pihak Ketiga', val: 0 },
                  { code: '1105', name: 'Piutang Lainnya - Pihak yang Mempunyai Hubungan Istimewa', val: 0 },
                  { code: '1191', name: 'Cadangan Kerugian Penurunan Nilai - Aset Lancar', val: 0 },
                  { code: '1199', name: 'Aset Kontrak', val: 0 },
                  { code: '1200', name: 'Persediaan', val: 0 },
                  { code: '1402', name: 'Pajak Dibayar di Muka', val: 0 },
                  { code: '1403', name: 'Biaya Dibayar di Muka', val: 0 },
                  { code: '1405', name: 'Uang Muka', val: 0 },
                  { code: '1406', name: 'Aset Lancar Lainnya', val: 0 },
                ].map((row) => (
                  <div key={row.code} className="flex items-center justify-between gap-2 py-1 px-2 border-b border-slate-100 hover:bg-slate-50 text-[11px]">
                    <span className="w-12 text-slate-400 font-mono-num">{row.code}</span>
                    <span className="flex-1 text-slate-700 truncate" title={row.name}>{row.name}</span>
                    <div className="flex items-center gap-1 shrink-0">
                      <span className="text-slate-400 text-[10px]">Rp</span>
                      <input
                        type="text"
                        readOnly={isReadOnly}
                        defaultValue={row.val.toLocaleString('id-ID')}
                        className="w-32 text-right border border-slate-200 bg-white rounded px-2 py-0.5 font-mono-num text-[11px] focus:outline-none focus:border-[#1E2C5E]"
                      />
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between py-1.5 px-2 bg-[#F8FAFC] border-t border-slate-200 font-bold text-[11.5px] mt-2">
                <span className="w-12 text-slate-500 font-mono-num">1000</span>
                <span className="flex-1 text-slate-800">Jumlah Aset Lancar</span>
                <span className="font-mono-num text-[#1E2C5E]">{formatRp(125638634)}</span>
              </div>
            </div>

            <div>
              <div className="px-2 py-1.5 bg-[#EFF6FF] border border-[#BFDBFE] text-[#1E2C5E] font-bold text-[11px] uppercase rounded mb-1">
                Aset Tidak Lancar
              </div>
              <div className="space-y-1">
                {[
                  { code: '1501', name: 'Piutang Jangka Panjang', val: 0 },
                  { code: '1520', name: 'Properti Investasi', val: 0 },
                  { code: '1533', name: 'Tanah dan Bangunan', val: 0 },
                  { code: '1534', name: '(Dikurangi) Akumulasi Penyusutan - Tanah dan Bangunan', val: 0 },
                  { code: '1539', name: 'Aset Tetap Lainnya', val: 0 },
                  { code: '1540', name: '(Dikurangi) Akumulasi Penyusutan - Aset Tetap Lainnya', val: 0 },
                  { code: '1535', name: 'Aset Hak Guna', val: 0 },
                  { code: '1536', name: '(Dikurangi) Akumulasi Penyusutan - Aset Hak Guna', val: 0 },
                  { code: '1551', name: 'Investasi pada Perusahaan Asosiasi', val: 0 },
                  { code: '1600', name: 'Aset Tak Berwujud', val: 0 },
                  { code: '1601', name: '(Dikurangi) Akumulasi Amortisasi Aset Tak Berwujud', val: 0 },
                  { code: '1651', name: 'Aktiva Pajak Tangguhan', val: 0 },
                  { code: '1655', name: 'Klaim atas Pengembalian Pajak', val: 0 },
                  { code: '1658', name: 'Cadangan Kerugian Penurunan Nilai - Aset Tidak Lancar', val: 0 },
                  { code: '1698', name: 'Aset Tidak Lancar Lainnya', val: 0 },
                ].map((row) => (
                  <div key={row.code} className="flex items-center justify-between gap-2 py-1 px-2 border-b border-slate-100 hover:bg-slate-50 text-[11px]">
                    <span className="w-12 text-slate-400 font-mono-num">{row.code}</span>
                    <span className="flex-1 text-slate-700 truncate" title={row.name}>{row.name}</span>
                    <div className="flex items-center gap-1 shrink-0">
                      <span className="text-slate-400 text-[10px]">Rp</span>
                      <input
                        type="text"
                        readOnly={isReadOnly}
                        defaultValue={row.val.toLocaleString('id-ID')}
                        className="w-32 text-right border border-slate-200 bg-white rounded px-2 py-0.5 font-mono-num text-[11px] focus:outline-none focus:border-[#1E2C5E]"
                      />
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between py-1.5 px-2 bg-[#F8FAFC] border-t border-slate-200 font-bold text-[11.5px] mt-2">
                <span className="w-12 text-slate-500 font-mono-num">1099</span>
                <span className="flex-1 text-slate-800">Jumlah Aset Tidak Lancar</span>
                <span className="font-mono-num text-[#1E2C5E]">{formatRp(0)}</span>
              </div>
            </div>

            <div className="flex items-center justify-between p-2.5 bg-[#FEF9E7] border border-[#F4C430] rounded-lg font-extrabold text-[12.5px] text-[#1E2C5E]">
              <span>TOTAL ASET</span>
              <span className="font-mono-num">{formatRp(125638634)}</span>
            </div>
          </div>

          {/* RIGHT COLUMN: LIABILITAS & EKUITAS */}
          <div className="p-3 space-y-3">
            <div>
              <div className="px-2 py-1.5 bg-[#FEF3C7] border border-[#FCD34D] text-[#92400E] font-bold text-[11px] uppercase rounded mb-1">
                Liabilitas Jangka Pendek
              </div>
              <div className="space-y-1">
                {[
                  { code: '2102', name: 'Utang Usaha - Pihak Ketiga', val: 2400000 },
                  { code: '2103', name: 'Utang Usaha - Pihak yang Mempunyai Hubungan Istimewa', val: 0 },
                  { code: '2111', name: 'Utang Bunga', val: 0 },
                  { code: '2190', name: 'Liabilitas Kontrak', val: 0 },
                  { code: '2197', name: 'Liabilitas Sewa Jangka Pendek', val: 0 },
                  { code: '2191', name: 'Utang Pajak', val: 1358182 },
                  { code: '2192', name: 'Utang Dividen', val: 0 },
                  { code: '2193', name: 'Beban yang Masih Harus Dibayar', val: 0 },
                  { code: '2201', name: 'Utang Bank Jangka Pendek', val: 0 },
                  { code: '2202', name: 'Utang Jangka Panjang yang Jatuh Tempo dalam Satu Tahun', val: 0 },
                  { code: '2203', name: 'Pendapatan Diterima di Muka', val: 0 },
                  { code: '2216', name: 'Liabilitas Jangka Pendek Lainnya', val: 0 },
                ].map((row) => (
                  <div key={row.code} className="flex items-center justify-between gap-2 py-1 px-2 border-b border-slate-100 hover:bg-slate-50 text-[11px]">
                    <span className="w-12 text-slate-400 font-mono-num">{row.code}</span>
                    <span className="flex-1 text-slate-700 truncate" title={row.name}>{row.name}</span>
                    <div className="flex items-center gap-1 shrink-0">
                      <span className="text-slate-400 text-[10px]">Rp</span>
                      <input
                        type="text"
                        readOnly={isReadOnly}
                        defaultValue={row.val.toLocaleString('id-ID')}
                        className="w-32 text-right border border-slate-200 bg-white rounded px-2 py-0.5 font-mono-num text-[11px] focus:outline-none focus:border-[#1E2C5E]"
                      />
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between py-1.5 px-2 bg-[#F8FAFC] border-t border-slate-200 font-bold text-[11.5px] mt-2">
                <span className="w-12 text-slate-500 font-mono-num">2229</span>
                <span className="flex-1 text-slate-800">Jumlah Liabilitas Jangka Pendek</span>
                <span className="font-mono-num text-[#1E2C5E]">{formatRp(3758182)}</span>
              </div>
            </div>

            <div>
              <div className="px-2 py-1.5 bg-[#FEF3C7] border border-[#FCD34D] text-[#92400E] font-bold text-[11px] uppercase rounded mb-1">
                Liabilitas Jangka Panjang
              </div>
              <div className="space-y-1">
                {[
                  { code: '2301', name: 'Utang Bank Jangka Panjang', val: 0 },
                  { code: '2302', name: 'Utang Jangka Panjang Pihak Ketiga', val: 0 },
                  { code: '2304', name: 'Utang Jangka Panjang - Pihak Hubungan Istimewa', val: 0 },
                  { code: '2312', name: 'Liabilitas Sewa Jangka Panjang', val: 0 },
                  { code: '2322', name: 'Liabilitas Imbalan Kerja', val: 0 },
                  { code: '2331', name: 'Liabilitas Pajak Tangguhan', val: 0 },
                  { code: '2998', name: 'Liabilitas Jangka Panjang Lainnya', val: 0 },
                ].map((row) => (
                  <div key={row.code} className="flex items-center justify-between gap-2 py-1 px-2 border-b border-slate-100 hover:bg-slate-50 text-[11px]">
                    <span className="w-12 text-slate-400 font-mono-num">{row.code}</span>
                    <span className="flex-1 text-slate-700 truncate" title={row.name}>{row.name}</span>
                    <div className="flex items-center gap-1 shrink-0">
                      <span className="text-slate-400 text-[10px]">Rp</span>
                      <input
                        type="text"
                        readOnly={isReadOnly}
                        defaultValue={row.val.toLocaleString('id-ID')}
                        className="w-32 text-right border border-slate-200 bg-white rounded px-2 py-0.5 font-mono-num text-[11px] focus:outline-none focus:border-[#1E2C5E]"
                      />
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between py-1.5 px-2 bg-[#F8FAFC] border-t border-slate-200 font-bold text-[11.5px] mt-2">
                <span className="w-12 text-slate-500 font-mono-num">2000</span>
                <span className="flex-1 text-slate-800">Jumlah Liabilitas</span>
                <span className="font-mono-num text-[#1E2C5E]">{formatRp(3758182)}</span>
              </div>
            </div>

            <div>
              <div className="px-2 py-1.5 bg-[#ECFDF5] border border-[#A7F3D0] text-[#065F46] font-bold text-[11px] uppercase rounded mb-1">
                Ekuitas
              </div>
              <div className="space-y-1">
                {[
                  { code: '3102', name: 'Modal Saham', val: 100000000 },
                  { code: '3120', name: 'Tambahan Modal Disetor', val: 0 },
                  { code: '3200', name: 'Laba Ditahan', val: 21880452 },
                  { code: '3217', name: 'Pendapatan Komprehensif Lainnya', val: 0 },
                  { code: '3298', name: 'Ekuitas Lainnya', val: 0 },
                ].map((row) => (
                  <div key={row.code} className="flex items-center justify-between gap-2 py-1 px-2 border-b border-slate-100 hover:bg-slate-50 text-[11px]">
                    <span className="w-12 text-slate-400 font-mono-num">{row.code}</span>
                    <span className="flex-1 text-slate-700 truncate" title={row.name}>{row.name}</span>
                    <div className="flex items-center gap-1 shrink-0">
                      <span className="text-slate-400 text-[10px]">Rp</span>
                      <input
                        type="text"
                        readOnly={isReadOnly}
                        defaultValue={row.val.toLocaleString('id-ID')}
                        className="w-32 text-right border border-slate-200 bg-white rounded px-2 py-0.5 font-mono-num text-[11px] focus:outline-none focus:border-[#1E2C5E]"
                      />
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between py-1.5 px-2 bg-[#F8FAFC] border-t border-slate-200 font-bold text-[11.5px] mt-2">
                <span className="w-12 text-slate-500 font-mono-num">3099</span>
                <span className="flex-1 text-slate-800">Jumlah Ekuitas</span>
                <span className="font-mono-num text-[#1E2C5E]">{formatRp(121880452)}</span>
              </div>
            </div>

            <div className="flex items-center justify-between p-2.5 bg-[#FEF9E7] border border-[#F4C430] rounded-lg font-extrabold text-[12.5px] text-[#1E2C5E]">
              <span className="font-mono-num">3309</span>
              <span className="flex-1 ml-2">JUMLAH LIABILITAS DAN EKUITAS</span>
              <span className="font-mono-num">{formatRp(125638634)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
