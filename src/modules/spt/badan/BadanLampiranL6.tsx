import React, { useState } from 'react';
import { TaxReturn, Taxpayer } from '../../../types/tax.ts';
import { formatRp } from '../../../utils/taxCalc.ts';

interface BadanLampiranL6Props {
  taxReturn: TaxReturn;
  activeTaxpayer: Taxpayer;
  isReadOnly?: boolean;
}

export const BadanLampiranL6: React.FC<BadanLampiranL6Props> = ({
  taxReturn,
  activeTaxpayer,
  isReadOnly = false,
}) => {
  const [dasarAngsuran, setDasarAngsuran] = useState(0);
  const [kompensasiRugi, setKompensasiRugi] = useState(0);
  const [kreditLalu, setKreditLalu] = useState(0);

  const pkp = Math.max(0, dasarAngsuran - kompensasiRugi);
  const pphTerutang = Math.round(pkp * 0.22);
  const pphBayarSendiri = Math.max(0, pphTerutang - kreditLalu);
  const angsuranPph25 = Math.round(pphBayarSendiri / 12);

  return (
    <div className="space-y-4">
      <h2 className="font-display font-bold text-[15px] text-[#1E2C5E] uppercase tracking-wide">
        ANGSURAN PAJAK PENGHASILAN TAHUN PAJAK BERJALAN
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

      {/* Main Calculation Card */}
      <div className="bg-white border border-[#E2E8F0] rounded-xl shadow-sm overflow-hidden">
        <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 text-[#1E2C5E] font-bold text-[12px]">
          ANGSURAN PAJAK PENGHASILAN TAHUN PAJAK BERJALAN
        </div>

        <div className="p-4 space-y-3">
          {/* Row 1 */}
          <div className="flex flex-wrap items-center justify-between gap-2 py-2 border-b border-slate-100 text-[12px]">
            <span className="text-slate-700 font-medium max-w-xl">
              1. PENGHASILAN YANG MENJADI DASAR PENGHITUNGAN ANGSURAN
            </span>
            <div className="flex items-center gap-1 shrink-0">
              <span className="text-slate-400 text-xs">Rp</span>
              <input
                type="number"
                disabled={isReadOnly}
                value={dasarAngsuran}
                onChange={(e) => setDasarAngsuran(Number(e.target.value) || 0)}
                className="w-44 text-right border border-slate-300 rounded px-2.5 py-1 text-xs font-mono-num"
              />
            </div>
          </div>

          {/* Row 2 */}
          <div className="flex flex-wrap items-center justify-between gap-2 py-2 border-b border-slate-100 text-[12px]">
            <span className="text-slate-700 font-medium max-w-xl">
              2. KOMPENSASI KERUGIAN FISKAL (Diisi dari Formulir Lampiran 87: Jumlah Kompensasi Kerugian Fiskal Tahun Pajak Berjalan)
            </span>
            <div className="flex items-center gap-1 shrink-0">
              <span className="text-slate-400 text-xs">Rp</span>
              <input
                type="number"
                disabled={isReadOnly}
                value={kompensasiRugi}
                onChange={(e) => setKompensasiRugi(Number(e.target.value) || 0)}
                className="w-44 text-right border border-slate-300 rounded px-2.5 py-1 text-xs font-mono-num"
              />
            </div>
          </div>

          {/* Row 3 */}
          <div className="flex flex-wrap items-center justify-between gap-2 py-2 border-b border-slate-100 text-[12px]">
            <span className="text-slate-700 font-medium max-w-xl">
              3. PENGHASILAN KENA PAJAK
            </span>
            <div className="flex items-center gap-1 shrink-0">
              <span className="text-slate-400 text-xs">Rp</span>
              <input
                type="text"
                readOnly
                value={formatRp(pkp).replace('Rp', '').trim()}
                className="w-44 text-right border border-slate-200 bg-slate-50 rounded px-2.5 py-1 text-xs font-mono-num font-semibold text-slate-800"
              />
            </div>
          </div>

          {/* Row 4 */}
          <div className="flex flex-wrap items-center justify-between gap-2 py-2 border-b border-slate-100 text-[12px]">
            <span className="text-slate-700 font-medium max-w-xl">
              4. PPh YANG TERUTANG
            </span>
            <div className="flex items-center gap-1 shrink-0">
              <span className="text-slate-400 text-xs">Rp</span>
              <input
                type="text"
                readOnly
                value={formatRp(pphTerutang).replace('Rp', '').trim()}
                className="w-44 text-right border border-slate-200 bg-slate-50 rounded px-2.5 py-1 text-xs font-mono-num font-semibold text-slate-800"
              />
            </div>
          </div>

          {/* Row 5 */}
          <div className="flex flex-wrap items-center justify-between gap-2 py-2 border-b border-slate-100 text-[12px]">
            <span className="text-slate-700 font-medium max-w-xl">
              5. KREDIT PAJAK TAHUN PAJAK YANG LALU ATAS PENGHASILAN YANG TERMASUK DALAM ANGKA 1 YANG DIPOTONG/DIPUNGUT PIHAK LAIN
            </span>
            <div className="flex items-center gap-1 shrink-0">
              <span className="text-slate-400 text-xs">Rp</span>
              <input
                type="number"
                disabled={isReadOnly}
                value={kreditLalu}
                onChange={(e) => setKreditLalu(Number(e.target.value) || 0)}
                className="w-44 text-right border border-slate-300 rounded px-2.5 py-1 text-xs font-mono-num"
              />
            </div>
          </div>

          {/* Row 6 */}
          <div className="flex flex-wrap items-center justify-between gap-2 py-2 border-b border-slate-100 text-[12px]">
            <span className="text-slate-700 font-medium max-w-xl">
              6. PPh YANG HARUS DIBAYAR SENDIRI
            </span>
            <div className="flex items-center gap-1 shrink-0">
              <span className="text-slate-400 text-xs">Rp</span>
              <input
                type="text"
                readOnly
                value={formatRp(pphBayarSendiri).replace('Rp', '').trim()}
                className="w-44 text-right border border-slate-200 bg-slate-50 rounded px-2.5 py-1 text-xs font-mono-num font-semibold text-slate-800"
              />
            </div>
          </div>

          {/* Row 7 */}
          <div className="flex flex-wrap items-center justify-between gap-2 py-2.5 bg-[#FEF9E7] border border-[#F4C430] rounded-lg px-3 text-[12px] font-bold text-[#1E2C5E]">
            <span className="max-w-xl">
              7. ANGSURAN PPh PASAL 25
            </span>
            <div className="flex items-center gap-1 shrink-0">
              <span className="text-[#1E2C5E] text-xs">Rp</span>
              <input
                type="text"
                readOnly
                value={formatRp(angsuranPph25).replace('Rp', '').trim()}
                className="w-44 text-right border border-[#EAB308] bg-white rounded px-2.5 py-1 text-xs font-mono-num font-extrabold text-[#1E2C5E]"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
