import React, { useState } from 'react';
import { TaxReturn, Taxpayer } from '../../../types/tax.ts';
import { formatRp } from '../../../utils/taxCalc.ts';

interface BadanLampiranL1CProps {
  taxReturn: TaxReturn;
  activeTaxpayer: Taxpayer;
  isReadOnly?: boolean;
}

export const BadanLampiranL1C: React.FC<BadanLampiranL1CProps> = ({
  taxReturn,
  activeTaxpayer,
  isReadOnly = false,
}) => {
  // Balance sheet values state (pre-seeded with realistic figures)
  const [values, setValues] = useState<Record<string, number>>({
    // Aset Lancar
    '1101': 550_149_856, // Kas dan Setara Kas
    '1102': 0, // Piutang Usaha - Pihak Ketiga
    '1103': 0, // Piutang Usaha - Hubungan Istimewa
    '1104': 0, // Piutang Lainnya - Pihak Ketiga
    '1105': 0, // Piutang Lainnya - Hubungan Istimewa
    '1106': 0, // Aset Kontrak
    '1107': 0, // Cadangan Kerugian Penurunan Nilai
    '1401': 27_052, // Persediaan
    '1402': 0, // Pajak Dibayar di Muka
    '1403': -1_608, // Biaya Dibayar di Muka
    '1405': 0, // Uang Muka
    '1406': 0, // Aset Lancar Lainnya

    // Aset Tidak Lancar
    '1501': 0, // Piutang Jangka Panjang
    '1520': 0, // Properti Investasi
    '1533': 0, // Tanah dan Bangunan
    '1534': 0, // Akumulasi Penyusutan Tanah dan Bangunan
    '1539': 0, // Aset Tetap Lainnya
    '1540': 0, // Akumulasi Penyusutan Aset Tetap Lainnya
    '1535': 0, // Aset Hak Guna
    '1536': 0, // Akumulasi Penyusutan Aset Hak Guna
    '1551': 0, // Investasi pada Perusahaan Asosiasi
    '1550': 0, // Investasi Jangka Panjang Lainnya
    '1600': 0, // Aset Tak Berwujud
    '1601': 0, // Akumulasi Amortisasi Aset Tak Berwujud
    '1651': 0, // Aktiva Pajak Tangguhan
    '1655': 0, // Klaim atas Pengembalian Pajak
    '1658': 0, // Cadangan Kerugian Penurunan Nilai - Aset Tidak Lancar
    '1698': 0, // Aset Tidak Lancar Lainnya

    // Liabilitas Jangka Pendek
    '2101': 0, // Utang Usaha - Pihak Ketiga
    '2102': 0, // Utang Usaha - Hubungan Istimewa
    '2111': 0, // Utang Bunga
    '2181': 0, // Utang Pajak
    '2182': 0, // Liabilitas Kontrak
    '2187': 0, // Liabilitas Sewa Jangka Pendek
    '2192': 0, // Utang Dividen
    '2193': 0, // Beban yang Masih Harus Dibayar
    '2201': 0, // Utang Bank Jangka Pendek
    '2202': 0, // Utang Jangka Panjang Jatuh Tempo dalam Satu Tahun
    '2203': 1_391_907_658, // Pendapatan Diterima di Muka
    '2216': 0, // Liabilitas Jangka Pendek Lainnya

    // Liabilitas Jangka Panjang
    '2301': 0, // Utang Bank Jangka Panjang
    '2302': 0, // Utang Jangka Panjang Pihak Ketiga
    '2304': 0, // Utang Jangka Panjang Hubungan Istimewa
    '2312': 0, // Liabilitas Sewa Jangka Panjang
    '2322': 0, // Liabilitas Imbalan Kerja
    '2331': 0, // Liabilitas Pajak Tangguhan
    '2998': 0, // Liabilitas Jangka Panjang Lainnya

    // Ekuitas
    '3102': 10_000_000, // Modal Saham
    '3120': 0, // Tambahan Modal Disetor
    '3200': 0, // Laba Ditahan
    '3217': 0, // Pendapatan Komprehensif Lainnya
    '3298': 0, // Ekuitas Lainnya
  });

  const handleChange = (code: string, val: number) => {
    if (isReadOnly) return;
    setValues((prev) => ({ ...prev, [code]: val }));
  };

  // Calculations
  const asetLancarCodes = ['1101', '1102', '1103', '1104', '1105', '1106', '1107', '1401', '1402', '1403', '1405', '1406'];
  const jumlahAsetLancar = asetLancarCodes.reduce((sum, c) => sum + (values[c] || 0), 0);

  const asetTidakLancarCodes = [
    '1501', '1520', '1533', '1534', '1539', '1540', '1535', '1536', '1551', '1550', '1600', '1601', '1651', '1655', '1658', '1698',
  ];
  const jumlahAsetTidakLancar = asetTidakLancarCodes.reduce((sum, c) => sum + (values[c] || 0), 0);
  const totalAset = jumlahAsetLancar + jumlahAsetTidakLancar;

  const liabilitasPendekCodes = ['2101', '2102', '2111', '2181', '2182', '2187', '2192', '2193', '2201', '2202', '2203', '2216'];
  const jumlahLiabilitasPendek = liabilitasPendekCodes.reduce((sum, c) => sum + (values[c] || 0), 0);

  const liabilitasPanjangCodes = ['2301', '2302', '2304', '2312', '2322', '2331', '2998'];
  const jumlahLiabilitasPanjang = liabilitasPanjangCodes.reduce((sum, c) => sum + (values[c] || 0), 0);
  const totalLiabilitas = jumlahLiabilitasPendek + jumlahLiabilitasPanjang;

  const ekuitasCodes = ['3102', '3120', '3200', '3217', '3298'];
  const jumlahEkuitas = ekuitasCodes.reduce((sum, c) => sum + (values[c] || 0), 0);
  const totalLiabilitasDanEkuitas = totalLiabilitas + jumlahEkuitas;

  const renderRow = (code: string, label: string) => (
    <div key={code} className="flex items-center justify-between gap-2 py-1 px-2 border-b border-slate-100 hover:bg-slate-50 text-[11.5px]">
      <span className="w-12 text-slate-400 font-mono-num">{code}</span>
      <span className="flex-1 text-slate-700 truncate" title={label}>{label}</span>
      <div className="flex items-center gap-1 shrink-0">
        <span className="text-slate-400 text-[10px]">Rp</span>
        <input
          type="number"
          disabled={isReadOnly}
          value={values[code] ?? 0}
          onChange={(e) => handleChange(code, Number(e.target.value) || 0)}
          className="w-36 text-right border border-slate-200 bg-white rounded px-2 py-0.5 font-mono-num text-[11.5px] focus:outline-none focus:border-[#1E2C5E]"
        />
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Header Banner */}
      <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-4">
        <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2">HEADER</div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">Tahun Pajak</label>
            <input
              type="text"
              readOnly
              value={taxReturn.taxYear}
              className="w-full bg-[#F1F5F9] border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-700 font-mono-num"
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">Nomor Identitas WP</label>
            <input
              type="text"
              readOnly
              value={activeTaxpayer.nikNpwp}
              className="w-full bg-[#F1F5F9] border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-700 font-mono-num"
            />
          </div>
        </div>
      </div>

      <div className="bg-white border border-[#E2E8F0] rounded-xl shadow-sm overflow-hidden">
        <div className="px-5 py-3 bg-[#1E2C5E] text-white font-bold text-xs uppercase tracking-wider">
          L1-C. LAPORAN POSISI KEUANGAN (NERACA)
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-slate-200">
          {/* LEFT COLUMN: ASET */}
          <div className="p-3 space-y-3">
            <div>
              <div className="px-2 py-1.5 bg-[#EFF6FF] border border-[#BFDBFE] text-[#1E2C5E] font-bold text-[11.5px] uppercase rounded mb-1">
                Aset Lancar
              </div>
              {renderRow('1101', 'Kas dan Setara Kas')}
              {renderRow('1102', 'Piutang Usaha - Pihak Ketiga')}
              {renderRow('1103', 'Piutang Usaha - Pihak yang Mempunyai Hubungan Istimewa')}
              {renderRow('1104', 'Piutang Lainnya - Pihak Ketiga')}
              {renderRow('1105', 'Piutang Lainnya - Pihak yang Mempunyai Hubungan Istimewa')}
              {renderRow('1106', 'Aset Kontrak')}
              {renderRow('1107', 'Cadangan Kerugian Penurunan Nilai - Aset Lancar')}
              {renderRow('1401', 'Persediaan')}
              {renderRow('1402', 'Pajak Dibayar di Muka')}
              {renderRow('1403', 'Biaya Dibayar di Muka')}
              {renderRow('1405', 'Uang Muka')}
              {renderRow('1406', 'Aset Lancar Lainnya')}
              <div className="flex items-center justify-between py-1.5 px-2 bg-[#F8FAFC] border-t border-slate-200 font-bold text-[11.5px]">
                <span className="w-12 text-slate-500 font-mono-num">1000</span>
                <span className="flex-1 text-slate-800">Jumlah Aset Lancar</span>
                <span className="font-mono-num text-[#1E2C5E]">{formatRp(jumlahAsetLancar)}</span>
              </div>
            </div>

            <div>
              <div className="px-2 py-1.5 bg-[#EFF6FF] border border-[#BFDBFE] text-[#1E2C5E] font-bold text-[11.5px] uppercase rounded mb-1">
                Aset Tidak Lancar
              </div>
              {renderRow('1501', 'Piutang Jangka Panjang')}
              {renderRow('1520', 'Properti Investasi')}
              {renderRow('1533', 'Tanah dan Bangunan')}
              {renderRow('1534', '(Dikurangi) - Akumulasi Penyusutan - Tanah dan Bangunan')}
              {renderRow('1539', 'Aset Tetap Lainnya')}
              {renderRow('1540', '(Dikurangi) Akumulasi Penyusutan - Aset Tetap Lainnya')}
              {renderRow('1535', 'Aset Hak Guna')}
              {renderRow('1536', '(Dikurangi) Akumulasi Penyusutan - Aset Hak Guna')}
              {renderRow('1551', 'Investasi pada Perusahaan Asosiasi, Ventura Bersama dan Anak Perusahaan')}
              {renderRow('1550', 'Investasi Jangka Panjang Lainnya')}
              {renderRow('1600', 'Aset Tak Berwujud')}
              {renderRow('1601', '(Dikurangi) - Akumulasi Amortisasi Aset Tak Berwujud')}
              {renderRow('1651', 'Aktiva Pajak Tangguhan')}
              {renderRow('1655', 'Klaim atas Pengembalian Pajak')}
              {renderRow('1658', 'Cadangan Kerugian Penurunan Nilai - Aset Tidak Lancar')}
              {renderRow('1698', 'Aset Tidak Lancar Lainnya')}
              <div className="flex items-center justify-between py-1.5 px-2 bg-[#F8FAFC] border-t border-slate-200 font-bold text-[11.5px]">
                <span className="w-12 text-slate-500 font-mono-num">1099</span>
                <span className="flex-1 text-slate-800">Jumlah Aset Tidak Lancar</span>
                <span className="font-mono-num text-[#1E2C5E]">{formatRp(jumlahAsetTidakLancar)}</span>
              </div>
            </div>

            <div className="flex items-center justify-between p-2.5 bg-[#FEF9E7] border border-[#F4C430] rounded-lg font-extrabold text-[12.5px] text-[#1E2C5E]">
              <span>TOTAL ASET</span>
              <span className="font-mono-num">{formatRp(totalAset)}</span>
            </div>
          </div>

          {/* RIGHT COLUMN: LIABILITAS & EKUITAS */}
          <div className="p-3 space-y-3">
            <div>
              <div className="px-2 py-1.5 bg-[#FEF3C7] border border-[#FCD34D] text-[#92400E] font-bold text-[11.5px] uppercase rounded mb-1">
                Liabilitas Jangka Pendek
              </div>
              {renderRow('2101', 'Utang Usaha - Pihak Ketiga')}
              {renderRow('2102', 'Utang Usaha - Pihak yang Mempunyai Hubungan Istimewa')}
              {renderRow('2111', 'Utang Bunga')}
              {renderRow('2181', 'Utang Pajak')}
              {renderRow('2182', 'Liabilitas Kontrak')}
              {renderRow('2187', 'Liabilitas Sewa Jangka Pendek')}
              {renderRow('2192', 'Utang Dividen')}
              {renderRow('2193', 'Beban yang Masih Harus Dibayar')}
              {renderRow('2201', 'Utang Bank Jangka Pendek')}
              {renderRow('2202', 'Utang Jangka Panjang yang Jatuh Tempo dalam Satu Tahun')}
              {renderRow('2203', 'Pendapatan Diterima di Muka')}
              {renderRow('2216', 'Liabilitas Jangka Pendek Lainnya')}
              <div className="flex items-center justify-between py-1.5 px-2 bg-[#F8FAFC] border-t border-slate-200 font-bold text-[11.5px]">
                <span className="w-12 text-slate-500 font-mono-num">2229</span>
                <span className="flex-1 text-slate-800">Jumlah Liabilitas Jangka Pendek</span>
                <span className="font-mono-num text-[#1E2C5E]">{formatRp(jumlahLiabilitasPendek)}</span>
              </div>
            </div>

            <div>
              <div className="px-2 py-1.5 bg-[#FEF3C7] border border-[#FCD34D] text-[#92400E] font-bold text-[11.5px] uppercase rounded mb-1">
                Liabilitas Jangka Panjang
              </div>
              {renderRow('2301', 'Utang Bank Jangka Panjang')}
              {renderRow('2302', 'Utang Jangka Panjang Pihak Ketiga')}
              {renderRow('2304', 'Utang Jangka Panjang - Pihak yang Mempunyai Hubungan Istimewa')}
              {renderRow('2312', 'Liabilitas Sewa Jangka Panjang')}
              {renderRow('2322', 'Liabilitas Imbalan Kerja')}
              {renderRow('2331', 'Liabilitas Pajak Tangguhan')}
              {renderRow('2998', 'Liabilitas Jangka Panjang Lainnya')}
              <div className="flex items-center justify-between py-1.5 px-2 bg-[#F8FAFC] border-t border-slate-200 font-bold text-[11.5px]">
                <span className="w-12 text-slate-500 font-mono-num">2000</span>
                <span className="flex-1 text-slate-800">Jumlah Liabilitas</span>
                <span className="font-mono-num text-[#1E2C5E]">{formatRp(totalLiabilitas)}</span>
              </div>
            </div>

            <div>
              <div className="px-2 py-1.5 bg-[#ECFDF5] border border-[#A7F3D0] text-[#065F46] font-bold text-[11.5px] uppercase rounded mb-1">
                Ekuitas
              </div>
              {renderRow('3102', 'Modal Saham')}
              {renderRow('3120', 'Tambahan Modal Disetor')}
              {renderRow('3200', 'Laba Ditahan')}
              {renderRow('3217', 'Pendapatan Komprehensif Lainnya')}
              {renderRow('3298', 'Ekuitas Lainnya')}
              <div className="flex items-center justify-between py-1.5 px-2 bg-[#F8FAFC] border-t border-slate-200 font-bold text-[11.5px]">
                <span className="w-12 text-slate-500 font-mono-num">3099</span>
                <span className="flex-1 text-slate-800">Jumlah Ekuitas</span>
                <span className="font-mono-num text-[#1E2C5E]">{formatRp(jumlahEkuitas)}</span>
              </div>
            </div>

            <div className="flex items-center justify-between p-2.5 bg-[#FEF9E7] border border-[#F4C430] rounded-lg font-extrabold text-[12.5px] text-[#1E2C5E]">
              <span className="font-mono-num">3309</span>
              <span className="flex-1 ml-2">JUMLAH LIABILITAS DAN EKUITAS</span>
              <span className="font-mono-num">{formatRp(totalLiabilitasDanEkuitas)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
