import React, { useState } from 'react';
import { TaxReturn, Taxpayer } from '../../../types/tax.ts';

interface BadanLampiranL10BProps {
  taxReturn: TaxReturn;
  activeTaxpayer: Taxpayer;
  isReadOnly?: boolean;
}

export const BadanLampiranL10B: React.FC<BadanLampiranL10BProps> = ({
  taxReturn,
  activeTaxpayer,
  isReadOnly = false,
}) => {
  const [answers, setAnswers] = useState<Record<string, 'TIDAK' | 'YA'>>({
    '1_1': 'TIDAK',
    '1_2': 'TIDAK',
    '1_3': 'TIDAK',
    '1_4': 'TIDAK',
    '2_1': 'TIDAK',
    '2_2': 'TIDAK',
    '2_3': 'TIDAK',
    '3_a': 'TIDAK',
    '3_b': 'TIDAK',
    '3_c': 'TIDAK',
    '3_d': 'TIDAK',
    '3_e': 'TIDAK',
    '4_1': 'TIDAK',
    '4_2': 'TIDAK',
    '4_3': 'TIDAK',
  });

  const handleSelect = (key: string, val: 'TIDAK' | 'YA') => {
    if (isReadOnly) return;
    setAnswers((prev) => ({ ...prev, [key]: val }));
  };

  const renderRadioItem = (key: string, label: string) => (
    <div key={key} className="flex flex-wrap items-center justify-between gap-4 py-2 border-b border-slate-100 text-[11.5px]">
      <span className="text-slate-700 flex-1 leading-snug">{label}</span>
      <div className="flex items-center gap-4 shrink-0">
        <label className="inline-flex items-center gap-1.5 cursor-pointer">
          <input
            type="radio"
            name={key}
            disabled={isReadOnly}
            checked={answers[key] === 'TIDAK'}
            onChange={() => handleSelect(key, 'TIDAK')}
            className="accent-[#1E2C5E] cursor-pointer"
          />
          <span className="text-slate-700">Tidak</span>
        </label>
        <label className="inline-flex items-center gap-1.5 cursor-pointer">
          <input
            type="radio"
            name={key}
            disabled={isReadOnly}
            checked={answers[key] === 'YA'}
            onChange={() => handleSelect(key, 'YA')}
            className="accent-[#1E2C5E] cursor-pointer"
          />
          <span className="text-slate-700">Ya</span>
        </label>
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      <h2 className="font-display font-bold text-[15px] text-[#1E2C5E] uppercase tracking-wide">
        PERNYATAAN TERKAIT TRANSAKSI YANG DIPENGARUHI HUBUNGAN ISTIMEWA
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

      <div className="bg-white border border-[#E2E8F0] rounded-xl shadow-sm overflow-hidden p-5 space-y-6">
        {/* 1. Mengenai Hubungan Istimewa */}
        <div>
          <h3 className="font-bold text-[13px] text-[#1E2C5E] mb-1">
            1. Mengenai Hubungan Istimewa
          </h3>
          <p className="text-[11.5px] text-slate-500 italic mb-2">
            Bahwasanya kami telah menerapkan Prinsip Kewajaran dan Kelaziman Usaha:
          </p>
          <div className="pl-3 border-l-2 border-slate-200">
            {renderRadioItem('1_1', 'Transaksi dengan pihak yang memiliki hubungan istimewa karena kepemilikan saham/penyertaan')}
            {renderRadioItem('1_2', 'Transaksi dengan pihak yang memiliki hubungan istimewa karena penguasaan')}
            {renderRadioItem('1_3', 'Transaksi dengan pihak yang memiliki hubungan istimewa karena hubungan keluarga')}
            {renderRadioItem('1_4', 'Transaksi yang dilakukan antarpihak yang tidak memiliki hubungan istimewa tetapi Pihak ketiga dari salah satu atau kedua pihak yang bertransaksi tersebut menentukan lawan transaksi dan harga transaksi')}
          </div>
        </div>

        {/* 2. Mengenai transaksi */}
        <div>
          <h3 className="font-bold text-[13px] text-[#1E2C5E] mb-1">
            2. Mengenai transaksi
          </h3>
          <p className="text-[11.5px] text-slate-500 italic mb-2">
            Bahwasanya kami telah menerapkan Prinsip Kewajaran dan Kelaziman Usaha:
          </p>
          <div className="pl-3 border-l-2 border-slate-200">
            {renderRadioItem('2_1', 'berdasarkan keadaan yang sebenarnya')}
            {renderRadioItem('2_2', 'pada saat Penentuan Harga Transfer (ex-ante) atau saat terjadinya transaksi yang Dipengaruhi Hubungan Istimewa')}
            {renderRadioItem('2_3', 'sesuai dengan tahapan penerapan Prinsip Kewajaran dan Kelaziman Usaha dan tahapan pendahuluan dalam hal terdapat Transaksi yang Dipengaruhi Hubungan Istimewa tertentu')}
          </div>
        </div>

        {/* 3. Mengenai Dokumentasi Penentuan Prinsip Kewajaran dan Kelaziman Usaha */}
        <div>
          <h3 className="font-bold text-[13px] text-[#1E2C5E] mb-1">
            3. Mengenai Dokumentasi Penentuan Prinsip Kewajaran dan Kelaziman Usaha
          </h3>
          <p className="text-[11.5px] text-slate-500 italic mb-2">
            Bahwasanya kami memiliki:
          </p>
          <div className="pl-3 border-l-2 border-slate-200">
            {renderRadioItem('3_a', 'a. nilai peredaran bruto tahun pajak sebelumnya dalam satu tahun pajak lebih dari Rp50.000.000.000,00 (lima puluh miliar rupiah);')}
            {renderRadioItem('3_b', 'b. nilai Transaksi Afiliasi tahun pajak sebelumnya dalam satu tahun pajak lebih dari Rp20.000.000.000,00 (dua puluh miliar rupiah) untuk transaksi barang berwujud;')}
            {renderRadioItem('3_c', 'c. nilai Transaksi Afiliasi tahun pajak sebelumnya dalam satu tahun pajak lebih dari Rp5.000.000.000,00 (lima miliar rupiah) untuk masing-masing penyediaan jasa, pembayaran bunga, pemanfaatan barang tidak berwujud, atau Transaksi Afiliasi lainnya;')}
            {renderRadioItem('3_d', 'd. Pihak Afiliasi yang berada di negara atau yurisdiksi dengan tarif pajak penghasilan lebih rendah daripada tarif pajak penghasilan;')}
            {renderRadioItem('3_e', 'e. Grup Usaha dengan peredaran bruto konsolidasi paling sedikit Rp11.000.000.000.000,00 (sebelas triliun rupiah) pada Tahun Pajak sebelum Tahun Pajak yang dilaporkan;')}
          </div>
        </div>

        {/* 4. Mengenai Dokumen Penentuan Harga Transfer */}
        <div>
          <h3 className="font-bold text-[13px] text-[#1E2C5E] mb-1">
            4. Mengenai Dokumen Penentuan Harga Transfer
          </h3>
          <p className="text-[11.5px] text-slate-500 italic mb-2">
            Bahwasanya kami telah menyelenggarakan:
          </p>
          <div className="pl-3 border-l-2 border-slate-200">
            {renderRadioItem('4_1', 'Dokumen Induk')}
            {renderRadioItem('4_2', 'Dokumen Lokal')}
            {renderRadioItem('4_3', 'Laporan per Negara')}
          </div>
        </div>
      </div>
    </div>
  );
};
