import React, { useState } from 'react';
import { TaxReturn, Taxpayer } from '../../../types/tax.ts';
import { formatRp } from '../../../utils/taxCalc.ts';
import { ChevronDown, ChevronRight, RotateCcw, Copy, FileSpreadsheet, FileText, Filter, Download } from 'lucide-react';

interface BadanLampiranL9Props {
  taxReturn: TaxReturn;
  activeTaxpayer: Taxpayer;
  isReadOnly?: boolean;
}

export const BadanLampiranL9: React.FC<BadanLampiranL9Props> = ({
  taxReturn,
  activeTaxpayer,
  isReadOnly = false,
}) => {
  // Accordion collapsed state
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    berwujud: true,
    bangunan: true,
    tidakBerwujud: true,
    kel1: true,
    kel2: true,
    kel3: false,
    kel4: false,
    kelLain: true,
    bangunanPerm: true,
    bangunanNonPerm: true,
    amKel1: true,
    amKel2: false,
    amKel3: false,
    amKel4: false,
    amKelLain: false,
  });

  const toggle = (key: string) => {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const renderTableChrome = (data: any[] = []) => (
    <div className="space-y-1">
      {/* Table Toolbar */}
      <div className="p-2 bg-white flex items-center gap-1.5 border-b border-slate-100">
        <button type="button" className="p-1 rounded hover:bg-slate-100 text-slate-600" title="Refresh"><RotateCcw className="w-3.5 h-3.5" /></button>
        <button type="button" className="p-1 rounded hover:bg-slate-100 text-slate-600" title="Copy"><Copy className="w-3.5 h-3.5" /></button>
        <button type="button" className="p-1 rounded hover:bg-emerald-50 text-emerald-600" title="Excel"><FileSpreadsheet className="w-3.5 h-3.5" /></button>
        <button type="button" className="p-1 rounded hover:bg-red-50 text-red-600" title="CSV"><FileText className="w-3.5 h-3.5" /></button>
        <button type="button" className="p-1 rounded hover:bg-blue-50 text-blue-600" title="Filter"><Filter className="w-3.5 h-3.5" /></button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-[10.5px]">
          <thead>
            <tr className="bg-[#F4C430] text-[#1E2C5E] font-bold border-b border-amber-300">
              <th rowSpan={2} className="px-2.5 py-2 text-left border-r border-amber-300/80">KODE HARTA</th>
              <th rowSpan={2} className="px-3 py-2 text-left border-r border-amber-300/80 min-w-[160px]">KELOMPOK/JENIS HARTA</th>
              <th rowSpan={2} className="px-2.5 py-2 text-center border-r border-amber-300/80">BULAN/TAHUN PEROLEHAN</th>
              <th rowSpan={2} className="px-2.5 py-2 text-right border-r border-amber-300/80">BIAYA PEROLEHAN (Rp)</th>
              <th rowSpan={2} className="px-2.5 py-2 text-right border-r border-amber-300/80">NILAI SISA BUKU FISKAL PADA AWAL TAHUN (Rp)</th>
              <th colSpan={2} className="px-3 py-1 text-center border-r border-amber-300/80">METODE PENYUSUTAN/AMORTISASI</th>
              <th rowSpan={2} className="px-2.5 py-2 text-right border-r border-amber-300/80">PENYUSUTAN/AMORTISASI FISKAL TAHUN INI (Rp)</th>
              <th rowSpan={2} className="px-3 py-2 text-left">KETERANGAN</th>
            </tr>
            <tr className="bg-[#F4C430] text-[#1E2C5E] font-bold border-b border-amber-300">
              <th className="px-2 py-1 text-center border-r border-amber-300/80">KOMERSIAL</th>
              <th className="px-2 py-1 text-center border-r border-amber-300/80">FISKAL</th>
            </tr>
            {/* Filter row */}
            <tr className="bg-[#FEF9E7] border-b border-amber-200">
              <th className="px-2 py-1"><input type="text" placeholder="Kode" className="w-full bg-white border border-slate-200 rounded px-1.5 py-0.5 text-[10px]" /></th>
              <th className="px-2 py-1">
                <select className="w-full bg-white border border-slate-200 rounded px-1 py-0.5 text-[10px]">
                  <option value="">PILIH KELOMPOK/JENIS HARTA</option>
                  <option value="1">Mebel & Peralatan Kantor</option>
                  <option value="2">Komputer & IT</option>
                </select>
              </th>
              <th className="px-2 py-1"><input type="text" placeholder="MM-YYYY" className="w-full bg-white border border-slate-200 rounded px-1 py-0.5 text-[10px] text-center" /></th>
              <th className="px-2 py-1"><input type="text" placeholder="Biaya" className="w-full bg-white border border-slate-200 rounded px-1 py-0.5 text-[10px] text-right" /></th>
              <th className="px-2 py-1"><input type="text" placeholder="NSB Awal" className="w-full bg-white border border-slate-200 rounded px-1 py-0.5 text-[10px] text-right" /></th>
              <th className="px-2 py-1">
                <select className="w-full bg-white border border-slate-200 rounded px-1 py-0.5 text-[10px]">
                  <option value="">Pilih Komersial</option>
                  <option value="GL">Garis Lurus</option>
                  <option value="SM">Saldo Menurun</option>
                </select>
              </th>
              <th className="px-2 py-1">
                <select className="w-full bg-white border border-slate-200 rounded px-1 py-0.5 text-[10px]">
                  <option value="">Pilih Fiskal</option>
                  <option value="GL">Garis Lurus</option>
                  <option value="SM">Saldo Menurun</option>
                </select>
              </th>
              <th className="px-2 py-1"><input type="text" placeholder="Fiskal Thn Ini" className="w-full bg-white border border-slate-200 rounded px-1 py-0.5 text-[10px] text-right" /></th>
              <th className="px-2 py-1"><input type="text" placeholder="Keterangan" className="w-full bg-white border border-slate-200 rounded px-1 py-0.5 text-[10px]" /></th>
            </tr>
          </thead>
          <tbody>
            {data.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-3 py-5 text-center text-slate-400">
                  Tidak ada data yang ditemukan.
                </td>
              </tr>
            ) : (
              data.map((r, i) => (
                <tr key={i} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="px-2.5 py-1.5 font-mono-num">{r.kode}</td>
                  <td className="px-3 py-1.5">{r.jenis}</td>
                  <td className="px-2.5 py-1.5 text-center font-mono-num">{r.tgl}</td>
                  <td className="px-2.5 py-1.5 text-right font-mono-num">{formatRp(r.biaya)}</td>
                  <td className="px-2.5 py-1.5 text-right font-mono-num">{formatRp(r.nsb)}</td>
                  <td className="px-2 py-1.5 text-center">{r.metodeKomersial}</td>
                  <td className="px-2 py-1.5 text-center">{r.metodeFiskal}</td>
                  <td className="px-2.5 py-1.5 text-right font-mono-num font-semibold text-[#1E2C5E]">{formatRp(r.penyusutan)}</td>
                  <td className="px-3 py-1.5 text-slate-600">{r.keterangan}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      <h2 className="font-display font-bold text-[15px] text-[#1E2C5E] uppercase tracking-wide">
        DAFTAR PENYUSUTAN DAN AMORTISASI FISKAL
      </h2>

      {/* Header Banner */}
      <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">HEADER</div>
          <button
            type="button"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#1E2C5E] text-white rounded text-xs font-semibold hover:bg-[#16224A] cursor-pointer"
          >
            <span>Impor data</span>
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
        </div>
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

      {/* SECTION 1: HARTA BERWUJUD */}
      <div className="bg-white border border-[#E2E8F0] rounded-xl shadow-sm overflow-hidden">
        <button
          type="button"
          onClick={() => toggle('berwujud')}
          className="w-full px-4 py-2.5 bg-slate-50 hover:bg-slate-100 border-b border-slate-200 flex items-center justify-between text-[#1E2C5E] font-bold text-[12px] cursor-pointer"
        >
          <span>HARTA BERWUJUD</span>
          <ChevronDown className={`w-4 h-4 transition-transform ${openSections.berwujud ? 'rotate-180' : ''}`} />
        </button>

        {openSections.berwujud && (
          <div className="p-3 space-y-3">
            {/* Kelompok 1 */}
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <div className="px-3 py-1.5 bg-slate-50 text-[11px] font-bold text-slate-700 uppercase border-b border-slate-200">
                KELOMPOK 1
              </div>
              {renderTableChrome([])}
            </div>

            {/* Kelompok 2 */}
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <div className="px-3 py-1.5 bg-slate-50 text-[11px] font-bold text-slate-700 uppercase border-b border-slate-200">
                KELOMPOK 2
              </div>
              {renderTableChrome([])}
            </div>

            {/* Kelompok 3 */}
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <div className="px-3 py-1.5 bg-slate-50 text-[11px] font-bold text-slate-700 uppercase border-b border-slate-200">
                KELOMPOK 3
              </div>
              {renderTableChrome([])}
            </div>

            {/* Kelompok 4 */}
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <div className="px-3 py-1.5 bg-slate-50 text-[11px] font-bold text-slate-700 uppercase border-b border-slate-200">
                KELOMPOK 4
              </div>
              {renderTableChrome([])}
            </div>

            {/* Kelompok Lainnya */}
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <div className="px-3 py-1.5 bg-slate-50 text-[11px] font-bold text-slate-700 uppercase border-b border-slate-200">
                KELOMPOK LAINNYA
              </div>
              {renderTableChrome([
                {
                  kode: '0799',
                  jenis: 'Aset Lainnya',
                  tgl: '01-2024',
                  biaya: 0,
                  nsb: 0,
                  metodeKomersial: 'Garis Lurus',
                  metodeFiskal: 'Garis Lurus',
                  penyusutan: 0,
                  keterangan: '-',
                },
              ])}
            </div>
          </div>
        )}
      </div>

      {/* SECTION 2: BANGUNAN */}
      <div className="bg-white border border-[#E2E8F0] rounded-xl shadow-sm overflow-hidden">
        <button
          type="button"
          onClick={() => toggle('bangunan')}
          className="w-full px-4 py-2.5 bg-slate-50 hover:bg-slate-100 border-b border-slate-200 flex items-center justify-between text-[#1E2C5E] font-bold text-[12px] cursor-pointer"
        >
          <span>BANGUNAN</span>
          <ChevronDown className={`w-4 h-4 transition-transform ${openSections.bangunan ? 'rotate-180' : ''}`} />
        </button>

        {openSections.bangunan && (
          <div className="p-3 space-y-3">
            {/* Permanen */}
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <div className="px-3 py-1.5 bg-slate-50 text-[11px] font-bold text-slate-700 uppercase border-b border-slate-200">
                PERMANEN
              </div>
              {renderTableChrome([])}
            </div>

            {/* Tidak Permanen */}
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <div className="px-3 py-1.5 bg-slate-50 text-[11px] font-bold text-slate-700 uppercase border-b border-slate-200">
                TIDAK PERMANEN
              </div>
              {renderTableChrome([
                {
                  kode: '0503',
                  jenis: 'Bangunan untuk usaha: toko, pabrik, kantor, gudang, dan sejenisnya',
                  tgl: '01-2024',
                  biaya: 0,
                  nsb: 0,
                  metodeKomersial: 'Garis Lurus',
                  metodeFiskal: 'Garis Lurus',
                  penyusutan: 0,
                  keterangan: '-',
                },
              ])}
            </div>

            {/* Bangunan Summary matching screenshot */}
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1.5 text-[11px] font-semibold text-slate-700">
              <div className="flex justify-between items-center">
                <span>JUMLAH PENYUSUTAN FISKAL</span>
                <span className="font-mono-num text-[#1E2C5E] font-bold">Rp 0</span>
              </div>
              <div className="flex justify-between items-center">
                <span>JUMLAH PENYUSUTAN KOMERSIAL</span>
                <span className="font-mono-num text-slate-800">Rp 0</span>
              </div>
              <div className="flex justify-between items-center pt-1 border-t border-slate-200">
                <span>SELISIH PENYUSUTAN</span>
                <span className="font-mono-num text-amber-700 font-bold">Rp 0</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* SECTION 3: HARTA TIDAK BERWUJUD */}
      <div className="bg-white border border-[#E2E8F0] rounded-xl shadow-sm overflow-hidden">
        <button
          type="button"
          onClick={() => toggle('tidakBerwujud')}
          className="w-full px-4 py-2.5 bg-slate-50 hover:bg-slate-100 border-b border-slate-200 flex items-center justify-between text-[#1E2C5E] font-bold text-[12px] cursor-pointer"
        >
          <span>HARTA TIDAK BERWUJUD</span>
          <ChevronDown className={`w-4 h-4 transition-transform ${openSections.tidakBerwujud ? 'rotate-180' : ''}`} />
        </button>

        {openSections.tidakBerwujud && (
          <div className="p-3 space-y-3">
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <div className="px-3 py-1.5 bg-slate-50 text-[11px] font-bold text-slate-700 uppercase border-b border-slate-200">
                KELOMPOK 1
              </div>
              {renderTableChrome([])}
            </div>

            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <div className="px-3 py-1.5 bg-slate-50 text-[11px] font-bold text-slate-700 uppercase border-b border-slate-200">
                KELOMPOK 2
              </div>
              {renderTableChrome([])}
            </div>

            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <div className="px-3 py-1.5 bg-slate-50 text-[11px] font-bold text-slate-700 uppercase border-b border-slate-200">
                KELOMPOK 3
              </div>
              {renderTableChrome([])}
            </div>

            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <div className="px-3 py-1.5 bg-slate-50 text-[11px] font-bold text-slate-700 uppercase border-b border-slate-200">
                KELOMPOK 4
              </div>
              {renderTableChrome([])}
            </div>

            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <div className="px-3 py-1.5 bg-slate-50 text-[11px] font-bold text-slate-700 uppercase border-b border-slate-200">
                KELOMPOK LAINNYA
              </div>
              {renderTableChrome([])}
            </div>

            {/* Amortisasi Summary matching screenshot */}
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1.5 text-[11px] font-semibold text-slate-700">
              <div className="flex justify-between items-center">
                <span>JUMLAH AMORTISASI FISKAL</span>
                <span className="font-mono-num text-[#1E2C5E] font-bold">Rp 0</span>
              </div>
              <div className="flex justify-between items-center">
                <span>JUMLAH AMORTISASI KOMERSIAL</span>
                <span className="font-mono-num text-slate-800">Rp 0</span>
              </div>
              <div className="flex justify-between items-center pt-1 border-t border-slate-200">
                <span>SELISIH AMORTISASI</span>
                <span className="font-mono-num text-amber-700 font-bold">Rp 0</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
