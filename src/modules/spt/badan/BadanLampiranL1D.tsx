import React, { useState } from 'react';
import { TaxReturn, Taxpayer } from '../../../types/tax.ts';
import { formatRp } from '../../../utils/taxCalc.ts';

interface BadanLampiranL1DProps {
  taxReturn: TaxReturn;
  activeTaxpayer: Taxpayer;
  isReadOnly?: boolean;
}

export const BadanLampiranL1D: React.FC<BadanLampiranL1DProps> = ({
  taxReturn,
  activeTaxpayer,
  isReadOnly = false,
}) => {
  // Laba Rugi Jasa rows matching Gambar 1
  const [incomeRows, setIncomeRows] = useState([
    { code: '4001', name: 'Pendapatan Jasa', komersial: 235_875_397, nonObjek: 0, final: 0, tidakFinal: 235_875_397, koreksiPositif: 0, koreksiNegatif: 0, kodeFiskal: '', nilaiFiskal: 235_875_397 },
    { code: '4014', name: 'Penyesuaian Penjualan', komersial: 0, nonObjek: 0, final: 0, tidakFinal: 0, koreksiPositif: 0, koreksiNegatif: 0, kodeFiskal: '', nilaiFiskal: 0 },
    { code: '5000', name: 'Biaya Pokok Jasa', komersial: 141_761_114, nonObjek: 0, final: 0, tidakFinal: 141_761_114, koreksiPositif: 32_000_000, koreksiNegatif: 0, kodeFiskal: 'FPO-12', nilaiFiskal: 109_761_114 },
    { code: '4000', name: 'Laba Kotor', isSubtotal: true, komersial: 94_114_283, nonObjek: 0, final: 0, tidakFinal: 94_114_283, koreksiPositif: 0, koreksiNegatif: 0, kodeFiskal: '', nilaiFiskal: 126_114_283 },
    { code: '4199', name: 'Pendapatan Usaha Lainnya', komersial: 0, nonObjek: 0, final: 0, tidakFinal: 0, koreksiPositif: 0, koreksiNegatif: 0, kodeFiskal: '', nilaiFiskal: 0 },
  ]);

  const [expenseRows, setExpenseRows] = useState([
    { code: '5211', name: 'Gaji, Tunjangan, Bonus, Honorarium, THR, dsb', komersial: 126_000_000, nonObjek: 0, final: 0, tidakFinal: 126_000_000, koreksiPositif: 0, koreksiNegatif: 0, kodeFiskal: '', nilaiFiskal: 126_000_000 },
    { code: '5212', name: 'Beban Imbalan Kerja Lainnya', komersial: 0, nonObjek: 0, final: 0, tidakFinal: 0, koreksiPositif: 0, koreksiNegatif: 0, kodeFiskal: '', nilaiFiskal: 0 },
    { code: '5213', name: 'Beban Transportasi', komersial: 0, nonObjek: 0, final: 0, tidakFinal: 0, koreksiPositif: 0, koreksiNegatif: 0, kodeFiskal: '', nilaiFiskal: 0 },
    { code: '5214', name: 'Beban Penyusutan dan Amortisasi', komersial: 0, nonObjek: 0, final: 0, tidakFinal: 0, koreksiPositif: 0, koreksiNegatif: 0, kodeFiskal: '', nilaiFiskal: 0 },
    { code: '5215', name: 'Beban Sewa', komersial: 0, nonObjek: 0, final: 0, tidakFinal: 0, koreksiPositif: 0, koreksiNegatif: 0, kodeFiskal: '', nilaiFiskal: 0 },
    { code: '5216', name: 'Beban Bunga', komersial: 0, nonObjek: 0, final: 0, tidakFinal: 0, koreksiPositif: 0, koreksiNegatif: 0, kodeFiskal: '', nilaiFiskal: 0 },
    { code: '5217', name: 'Beban Sehubungan dengan Jasa', komersial: 0, nonObjek: 0, final: 0, tidakFinal: 0, koreksiPositif: 0, koreksiNegatif: 0, kodeFiskal: '', nilaiFiskal: 0 },
    { code: '5218', name: 'Beban Penurunan Nilai', komersial: 0, nonObjek: 0, final: 0, tidakFinal: 0, koreksiPositif: 0, koreksiNegatif: 0, kodeFiskal: '', nilaiFiskal: 0 },
    { code: '5219', name: 'Beban Royalti', komersial: 0, nonObjek: 0, final: 0, tidakFinal: 0, koreksiPositif: 0, koreksiNegatif: 0, kodeFiskal: '', nilaiFiskal: 0 },
    { code: '5220', name: 'Beban Pemasaran atau Promosi', komersial: 0, nonObjek: 0, final: 0, tidakFinal: 0, koreksiPositif: 0, koreksiNegatif: 0, kodeFiskal: '', nilaiFiskal: 0 },
    { code: '5221', name: 'Beban Entertainment', komersial: 0, nonObjek: 0, final: 0, tidakFinal: 0, koreksiPositif: 0, koreksiNegatif: 0, kodeFiskal: '', nilaiFiskal: 0 },
    { code: '5499', name: 'Beban Usaha Lainnya', komersial: 0, nonObjek: 0, final: 0, tidakFinal: 0, koreksiPositif: 0, koreksiNegatif: 0, kodeFiskal: '', nilaiFiskal: 0 },
    { code: '5400', name: 'Jumlah Beban Usaha', isSubtotal: true, komersial: 126_000_000, nonObjek: 0, final: 0, tidakFinal: 126_000_000, koreksiPositif: 0, koreksiNegatif: 0, kodeFiskal: '', nilaiFiskal: 126_000_000 },
    { code: '4500', name: 'Laba (Rugi) Usaha', isSubtotal: true, komersial: -31_885_717, nonObjek: 0, final: 0, tidakFinal: -31_885_717, koreksiPositif: 0, koreksiNegatif: 0, kodeFiskal: '', nilaiFiskal: 114_283 },
  ]);

  const [nonOperatingRows, setNonOperatingRows] = useState([
    { code: '4501', name: 'Keuntungan Selisih Kurs', komersial: 0, nonObjek: 0, final: 0, tidakFinal: 0, koreksiPositif: 0, koreksiNegatif: 0, kodeFiskal: '', nilaiFiskal: 0 },
    { code: '4502', name: 'Keuntungan Penjualan Aset selain Persediaan', komersial: 0, nonObjek: 0, final: 0, tidakFinal: 0, koreksiPositif: 0, koreksiNegatif: 0, kodeFiskal: '', nilaiFiskal: 0 },
    { code: '4511', name: 'Pendapatan Bunga (Komponen Pembiayaan pada Kontrak Pelanggan)', komersial: 0, nonObjek: 0, final: 0, tidakFinal: 0, koreksiPositif: 0, koreksiNegatif: 0, kodeFiskal: '', nilaiFiskal: 0 },
    { code: '4599', name: 'Pendapatan Non Usaha Lainnya', komersial: 0, nonObjek: 0, final: 0, tidakFinal: 0, koreksiPositif: 0, koreksiNegatif: 0, kodeFiskal: '', nilaiFiskal: 0 },
    { code: '4600', name: 'Jumlah Pendapatan Non Usaha', isSubtotal: true, komersial: 0, nonObjek: 0, final: 0, tidakFinal: 0, koreksiPositif: 0, koreksiNegatif: 0, kodeFiskal: '', nilaiFiskal: 0 },
    { code: '5405', name: 'Kerugian Penjualan Aset selain Persediaan', komersial: 0, nonObjek: 0, final: 0, tidakFinal: 0, koreksiPositif: 0, koreksiNegatif: 0, kodeFiskal: '', nilaiFiskal: 0 },
    { code: '5409', name: 'Sumbangan', komersial: 0, nonObjek: 0, final: 0, tidakFinal: 0, koreksiPositif: 0, koreksiNegatif: 0, kodeFiskal: '', nilaiFiskal: 0 },
    { code: '5421', name: 'Kerugian Selisih Kurs', komersial: 0, nonObjek: 0, final: 0, tidakFinal: 0, koreksiPositif: 0, koreksiNegatif: 0, kodeFiskal: '', nilaiFiskal: 0 },
    { code: '5599', name: 'Beban Non Usaha Lainnya', komersial: 3_729_934, nonObjek: 0, final: 0, tidakFinal: 3_729_934, koreksiPositif: 3_729_934, koreksiNegatif: 0, kodeFiskal: 'FPO-12', nilaiFiskal: 0 },
    { code: '5500', name: 'Jumlah Beban Non Usaha', isSubtotal: true, komersial: 3_729_934, nonObjek: 0, final: 0, tidakFinal: 3_729_934, koreksiPositif: 0, koreksiNegatif: 0, kodeFiskal: '', nilaiFiskal: 0 },
    { code: '4700', name: 'Laba (Rugi) Non Usaha', isSubtotal: true, komersial: -3_729_934, nonObjek: 0, final: 0, tidakFinal: -3_729_934, koreksiPositif: 0, koreksiNegatif: 0, kodeFiskal: '', nilaiFiskal: 0 },
    { code: '4800', name: 'Laba (Rugi) Sebelum Pajak', isSubtotal: true, komersial: -35_615_651, nonObjek: 0, final: 0, tidakFinal: -35_615_651, koreksiPositif: 35_729_934, koreksiNegatif: 0, kodeFiskal: '', nilaiFiskal: 114_283 },
  ]);

  return (
    <div className="space-y-4">
      {/* Title */}
      <h2 className="font-display font-bold text-[15px] text-[#1E2C5E] uppercase tracking-wide">
        REKONSILIASI LAPORAN KEUANGAN - JASA
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
              {/* Pendapatan Header */}
              <tr className="bg-slate-50 font-bold text-slate-700">
                <td colSpan={10} className="px-3 py-1.5">Pendapatan</td>
              </tr>
              {incomeRows.map((r, i) => (
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
              {expenseRows.map((r, i) => (
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

              {/* Non Usaha Header */}
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
    </div>
  );
};
