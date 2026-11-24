import React, { useState } from 'react';
import { TaxReturn, Taxpayer } from '../../../types/tax.ts';
import { formatRp } from '../../../utils/taxCalc.ts';
import { ChevronDown } from 'lucide-react';

interface BadanLampiranL11BProps {
  taxReturn: TaxReturn;
  activeTaxpayer: Taxpayer;
  isReadOnly?: boolean;
}

export const BadanLampiranL11B: React.FC<BadanLampiranL11BProps> = ({
  taxReturn,
  activeTaxpayer,
  isReadOnly = false,
}) => {
  const [openEbitda, setOpenEbitda] = useState(true);
  const [openDer, setOpenDer] = useState(true);
  const [openBiayaPinjaman, setOpenBiayaPinjaman] = useState(true);

  // EBITDA fields
  const [netoKomersial, setNetoKomersial] = useState(0);
  const [penyusutanAmortisasi, setPenyusutanAmortisasi] = useState(0);
  const [bebanPph, setBebanPph] = useState(0);
  const [bebanPinjaman, setBebanPinjaman] = useState(0);

  const ebitda = netoKomersial + penyusutanAmortisasi + bebanPph + bebanPinjaman;
  const ebitda25 = Math.round(ebitda * 0.25);

  const [hasForeignPrivateDebt, setHasForeignPrivateDebt] = useState<'TIDAK' | 'YA'>('TIDAK');

  // Months labels
  const months = Array.from({ length: 12 }, (_, i) => `Bulan - ${i + 1}`);

  return (
    <div className="space-y-4">
      <h2 className="font-display font-bold text-[14.5px] text-[#1E2C5E] uppercase tracking-wide leading-snug">
        PENGHITUNGAN BIAYA PINJAMAN YANG DAPAT DIBEBANKAN UNTUK KEPERLUAN PENGHITUNGAN PAJAK PENGHASILAN
      </h2>

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

      {/* SECTION I: PERHITUNGAN EBITDA */}
      <div className="bg-white border border-[#E2E8F0] rounded-xl shadow-sm overflow-hidden">
        <button
          type="button"
          onClick={() => setOpenEbitda((v) => !v)}
          className="w-full px-4 py-2.5 bg-slate-50 hover:bg-slate-100 border-b border-slate-200 flex items-center justify-between text-[#1E2C5E] font-bold text-[12px] cursor-pointer"
        >
          <span>I. PERHITUNGAN EBITDA</span>
          <ChevronDown className={`w-4 h-4 transition-transform ${openEbitda ? 'rotate-180' : ''}`} />
        </button>

        {openEbitda && (
          <div className="p-4 space-y-2.5 text-[11.5px]">
            <div className="flex items-center justify-between">
              <span className="text-slate-700">1. PENGHASILAN NETO KOMERSIAL</span>
              <div className="flex items-center gap-1">
                <span className="text-slate-400 text-xs">Rp</span>
                <input
                  type="number"
                  disabled={isReadOnly}
                  value={netoKomersial}
                  onChange={(e) => setNetoKomersial(Number(e.target.value) || 0)}
                  className="w-48 text-right border border-slate-300 rounded px-2.5 py-1 font-mono-num text-xs"
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-700">2. BEBAN PENYUSUTAN DAN AMORTISASI</span>
              <div className="flex items-center gap-1">
                <span className="text-slate-400 text-xs">Rp</span>
                <input
                  type="number"
                  disabled={isReadOnly}
                  value={penyusutanAmortisasi}
                  onChange={(e) => setPenyusutanAmortisasi(Number(e.target.value) || 0)}
                  className="w-48 text-right border border-slate-300 rounded px-2.5 py-1 font-mono-num text-xs"
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-700">3. BEBAN PAJAK PENGHASILAN</span>
              <div className="flex items-center gap-1">
                <span className="text-slate-400 text-xs">Rp</span>
                <input
                  type="number"
                  disabled={isReadOnly}
                  value={bebanPph}
                  onChange={(e) => setBebanPph(Number(e.target.value) || 0)}
                  className="w-48 text-right border border-slate-300 rounded px-2.5 py-1 font-mono-num text-xs"
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-700">4. BEBAN BIAYA PINJAMAN</span>
              <div className="flex items-center gap-1">
                <span className="text-slate-400 text-xs">Rp</span>
                <input
                  type="number"
                  disabled={isReadOnly}
                  value={bebanPinjaman}
                  onChange={(e) => setBebanPinjaman(Number(e.target.value) || 0)}
                  className="w-48 text-right border border-slate-300 rounded px-2.5 py-1 font-mono-num text-xs"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-1 border-t border-slate-200 font-bold text-[#1E2C5E]">
              <span>5. EBITDA</span>
              <div className="flex items-center gap-1">
                <span className="text-xs">Rp</span>
                <input
                  type="text"
                  readOnly
                  value={formatRp(ebitda).replace('Rp', '').trim()}
                  className="w-48 text-right border border-slate-200 bg-slate-50 rounded px-2.5 py-1 font-mono-num text-xs font-bold text-[#1E2C5E]"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-1 border-t border-slate-200 font-bold text-[#1E2C5E] bg-[#FEF9E7] p-2 rounded">
              <span>6. EBITDA (25%)</span>
              <div className="flex items-center gap-1">
                <span className="text-xs">Rp</span>
                <input
                  type="text"
                  readOnly
                  value={formatRp(ebitda25).replace('Rp', '').trim()}
                  className="w-48 text-right border border-[#EAB308] bg-white rounded px-2.5 py-1 font-mono-num text-xs font-extrabold text-[#1E2C5E]"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* SECTION II: PERBANDINGAN ANTARA UTANG DAN MODAL (DER) */}
      <div className="bg-white border border-[#E2E8F0] rounded-xl shadow-sm overflow-hidden">
        <button
          type="button"
          onClick={() => setOpenDer((v) => !v)}
          className="w-full px-4 py-2.5 bg-slate-50 hover:bg-slate-100 border-b border-slate-200 flex items-center justify-between text-[#1E2C5E] font-bold text-[12px] cursor-pointer"
        >
          <span>II. PERBANDINGAN ANTARA UTANG DAN MODAL (DEBT TO EQUITY RATIO)</span>
          <ChevronDown className={`w-4 h-4 transition-transform ${openDer ? 'rotate-180' : ''}`} />
        </button>

        {openDer && (
          <div className="p-3 space-y-4">
            {/* Part A: Saldo Utang */}
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <div className="px-3 py-1.5 bg-slate-50 text-[11px] font-bold text-slate-700 uppercase border-b border-slate-200">
                A. PENGHITUNGAN RATA-RATA SALDO UTANG
              </div>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-[10px]">
                  <thead>
                    <tr className="bg-slate-100 text-[#1E2C5E] font-bold border-b border-slate-200">
                      <th colSpan={3} className="px-2 py-1 text-center border-r border-slate-200">PEMBERI PINJAMAN</th>
                      <th colSpan={12} className="px-2 py-1 text-center border-r border-slate-200">SALDO UTANG TIAP AKHIR BULAN (Rp)</th>
                      <th rowSpan={2} className="px-2 py-2 text-right">RATA-RATA</th>
                    </tr>
                    <tr className="bg-slate-100 text-[#1E2C5E] font-bold border-b border-slate-200">
                      <th className="px-2 py-1 text-left border-r border-slate-200">Nomor Identitas</th>
                      <th className="px-2 py-1 text-left border-r border-slate-200">Nama</th>
                      <th className="px-2 py-1 text-left border-r border-slate-200">Hubungan</th>
                      {months.map((m) => (
                        <th key={m} className="px-1.5 py-1 text-right border-r border-slate-200 whitespace-nowrap">{m}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td colSpan={16} className="px-3 py-4 text-center text-slate-400">Tidak ada data untuk ditampilkan.</td>
                    </tr>
                    <tr className="bg-[#FAFBFD] font-bold text-[#1E2C5E] border-t border-slate-200">
                      <td colSpan={3} className="px-2 py-1.5 text-right uppercase">TOTAL</td>
                      {Array.from({ length: 12 }).map((_, i) => (
                        <td key={i} className="px-1.5 py-1.5 text-right font-mono-num">0</td>
                      ))}
                      <td className="px-2 py-1.5 text-right font-mono-num">0</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Part B: Saldo Modal */}
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <div className="px-3 py-1.5 bg-slate-50 text-[11px] font-bold text-slate-700 uppercase border-b border-slate-200">
                B. PENGHITUNGAN SALDO RATA-RATA MODAL
              </div>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-[10px]">
                  <thead>
                    <tr className="bg-slate-100 text-[#1E2C5E] font-bold border-b border-slate-200">
                      <th rowSpan={2} className="px-3 py-2 text-left border-r border-slate-200 min-w-[120px]">RINCIAN MODAL</th>
                      <th colSpan={12} className="px-2 py-1 text-center border-r border-slate-200">SALDO MODAL TIAP AKHIR BULAN (Rp)</th>
                      <th rowSpan={2} className="px-2 py-2 text-right">RATA-RATA</th>
                    </tr>
                    <tr className="bg-slate-100 text-[#1E2C5E] font-bold border-b border-slate-200">
                      {months.map((m) => (
                        <th key={m} className="px-1.5 py-1 text-right border-r border-slate-200 whitespace-nowrap">{m}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td colSpan={14} className="px-3 py-4 text-center text-slate-400">Tidak ada data untuk ditampilkan.</td>
                    </tr>
                    <tr className="bg-[#FAFBFD] font-bold text-[#1E2C5E] border-t border-slate-200">
                      <td className="px-3 py-1.5 text-right uppercase">TOTAL</td>
                      {Array.from({ length: 12 }).map((_, i) => (
                        <td key={i} className="px-1.5 py-1.5 text-right font-mono-num">0</td>
                      ))}
                      <td className="px-2 py-1.5 text-right font-mono-num">0</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Part C: Perhitungan DER */}
            <div className="p-3 bg-[#FAFBFD] border border-slate-200 rounded-lg flex flex-wrap items-center justify-between gap-4 text-[12px]">
              <span className="font-bold text-[#1E2C5E]">PERHITUNGAN DER</span>
              <div className="flex items-center gap-3">
                <div className="text-center font-mono-num">
                  <div className="border-b border-slate-400 pb-0.5">Jumlah Saldo Rata-Rata Utang (0)</div>
                  <div className="pt-0.5">Jumlah Saldo Rata-Rata Modal (0)</div>
                </div>
                <span className="font-bold">=</span>
                <span className="font-bold text-[#1E2C5E] bg-white border border-slate-200 px-3 py-1 rounded">N/A</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* SECTION III: PENGHITUNGAN BIAYA PINJAMAN */}
      <div className="bg-white border border-[#E2E8F0] rounded-xl shadow-sm overflow-hidden">
        <button
          type="button"
          onClick={() => setOpenBiayaPinjaman((v) => !v)}
          className="w-full px-4 py-2.5 bg-slate-50 hover:bg-slate-100 border-b border-slate-200 flex items-center justify-between text-[#1E2C5E] font-bold text-[12px] cursor-pointer"
        >
          <span>III. PENGHITUNGAN BIAYA PINJAMAN</span>
          <ChevronDown className={`w-4 h-4 transition-transform ${openBiayaPinjaman ? 'rotate-180' : ''}`} />
        </button>

        {openBiayaPinjaman && (
          <div className="p-3 space-y-4">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-[10.5px]">
                <thead>
                  <tr className="bg-slate-100 text-[#1E2C5E] font-bold border-b border-slate-200">
                    <th className="px-3 py-2 text-left border-r border-slate-200">PEMBERI PINJAMAN</th>
                    <th className="px-3 py-2 text-right border-r border-slate-200">Saldo Rata-Rata Utang (Rp)</th>
                    <th className="px-3 py-2 text-right border-r border-slate-200">Biaya Pinjaman (Bunga) (Rp)</th>
                    <th className="px-3 py-2 text-right border-r border-slate-200">Biaya Pinjaman Yang Dapat Diperhitungkan (Rp)</th>
                    <th className="px-3 py-2 text-right">Biaya Pinjaman Yang Tidak Dapat Diperhitungkan (Rp)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td colSpan={5} className="px-3 py-4 text-center text-slate-400">Tidak ada data untuk ditampilkan.</td>
                  </tr>
                  <tr className="bg-[#FAFBFD] font-bold text-[#1E2C5E] border-t border-slate-200">
                    <td className="px-3 py-1.5 text-right uppercase">TOTAL</td>
                    <td className="px-3 py-1.5 text-right font-mono-num">0</td>
                    <td className="px-3 py-1.5 text-right font-mono-num">0</td>
                    <td className="px-3 py-1.5 text-right font-mono-num">0</td>
                    <td className="px-3 py-1.5 text-right font-mono-num">0</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Foreign Debt Question matching screenshot */}
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex flex-wrap items-center justify-between gap-4 text-[12px]">
              <span className="text-slate-700">Apakah Anda mempunyai utang swasta luar negeri?</span>
              <div className="flex items-center gap-4">
                <label className="inline-flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="foreign_debt"
                    disabled={isReadOnly}
                    checked={hasForeignPrivateDebt === 'TIDAK'}
                    onChange={() => setHasForeignPrivateDebt('TIDAK')}
                    className="accent-[#1E2C5E]"
                  />
                  <span>Tidak</span>
                </label>
                <label className="inline-flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="foreign_debt"
                    disabled={isReadOnly}
                    checked={hasForeignPrivateDebt === 'YA'}
                    onChange={() => setHasForeignPrivateDebt('YA')}
                    className="accent-[#1E2C5E]"
                  />
                  <span>Ya</span>
                </label>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
