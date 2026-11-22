import React from 'react';
import { Printer, X } from 'lucide-react';
import { BillingCode, TaxInvoice, TaxReturn, Taxpayer, WithholdingSlip } from '../types/tax.ts';
import { formatRp, MONTHS_ID } from '../utils/taxCalc.ts';
import { KelasBrevetLogo } from './KelasBrevetLogo.tsx';

export type PrintablePayload =
  | { type: 'BPE'; taxReturn: TaxReturn; taxpayer: Taxpayer }
  | { type: 'BPA1'; slip: WithholdingSlip }
  | { type: 'FAKTUR'; invoice: TaxInvoice; seller: Taxpayer }
  | { type: 'BILLING'; billing: BillingCode; taxpayer: Taxpayer };

interface DocumentPrintModalProps {
  doc: PrintablePayload | null;
  onClose: () => void;
}

export const DocumentPrintModal: React.FC<DocumentPrintModalProps> = ({ doc, onClose }) => {
  if (!doc) return null;

  const returnTypeLabel: Record<TaxReturn['returnType'], string> = {
    SPT_MASA_PPN: 'SPT MASA PAJAK PERTAMBAHAN NILAI (PPN)',
    SPT_MASA_PPH21: 'SPT MASA PPh PASAL 21 / 26',
    SPT_MASA_UNIFIKASI: 'SPT MASA PPh UNIFIKASI (PPh 23)',
    SPT_TAHUNAN_OP: 'SPT TAHUNAN PPh ORANG PRIBADI',
    SPT_TAHUNAN_BADAN: 'SPT TAHUNAN PPh BADAN',
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-md shadow-2xl border border-slate-300 w-full max-w-3xl my-8 overflow-hidden">
        {/* Toolbar */}
        <div className="bg-[#1D2B53] text-white px-5 py-3 flex items-center justify-between border-b-2 border-[#F4C430]">
          <span className="font-display font-bold text-sm">
            Pratinjau Dokumen Resmi Simulasi Coretax — KelasBrevet
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 bg-[#F4C430] hover:bg-[#E0AF1A] text-[#1D2B53] font-bold text-xs px-3 py-1.5 rounded cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Cetak / Simpan PDF</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="text-slate-300 hover:text-white p-1 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Printable Paper */}
        <div id="printable-tax-document" className="p-8 bg-white text-slate-900 space-y-5 text-xs">
          {/* Official Header */}
          <div className="flex items-center justify-between border-b-2 border-[#1D2B53] pb-4">
            <KelasBrevetLogo variant="header" />
            <div className="text-right">
              <div className="font-display font-extrabold text-[#1D2B53] text-sm uppercase">
                {doc.type === 'BPE' && 'BUKTI PENERIMAAN ELEKTRONIK (BPE)'}
                {doc.type === 'BPA1' && 'BUKTI PEMOTONGAN PPh PASAL 21 (FORM BPA1)'}
                {doc.type === 'FAKTUR' && 'FAKTUR PAJAK ELEKTRONIK (e-FAKTUR)'}
                {doc.type === 'BILLING' && 'CETAKAN KODE BILLING PAJAK'}
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                Dokumen Simulasi Pembelajaran — Core Tax Administration System
              </div>
            </div>
          </div>

          {doc.type === 'BPE' && (
            <div className="space-y-4">
              <div className="bg-[#F8FAFC] border border-[#CBD5E1] rounded p-4 grid grid-cols-2 gap-3">
                <div>
                  <span className="text-slate-500 block">Nomor Tanda Terima Elektronik (BPE)</span>
                  <span className="font-mono-num font-bold text-sm text-[#1D2B53]">
                    {doc.taxReturn.bpeNumber || '-'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Tanggal Penyampaian</span>
                  <span className="font-mono-num font-semibold">
                    {doc.taxReturn.submittedAt
                      ? new Date(doc.taxReturn.submittedAt).toLocaleString('id-ID')
                      : '-'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Nama Wajib Pajak</span>
                  <span className="font-bold text-[#1D2B53]">{doc.taxpayer.name}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">NPWP / NIK (16 Digit)</span>
                  <span className="font-mono-num font-semibold">{doc.taxpayer.nikNpwp}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Jenis SPT</span>
                  <span className="font-semibold">{returnTypeLabel[doc.taxReturn.returnType]}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Masa / Tahun Pajak</span>
                  <span className="font-semibold">
                    {doc.taxReturn.taxPeriodMonth > 0
                      ? `${MONTHS_ID[doc.taxReturn.taxPeriodMonth - 1]} ${doc.taxReturn.taxYear}`
                      : `Tahun Pajak ${doc.taxReturn.taxYear}`}{' '}
                    (Pembetulan ke-{doc.taxReturn.revisionNo})
                  </span>
                </div>
              </div>

              <table className="w-full border-collapse border border-slate-300">
                <thead>
                  <tr className="bg-[#F4C430] text-[#1D2B53]">
                    <th className="border border-slate-300 px-3 py-2 text-left">Uraian Ringkasan SPT</th>
                    <th className="border border-slate-300 px-3 py-2 text-right">Jumlah (IDR)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-slate-300 px-3 py-2">Pajak Terutang / Keluaran</td>
                    <td className="border border-slate-300 px-3 py-2 text-right font-mono-num">
                      {formatRp(doc.taxReturn.taxPayable)}
                    </td>
                  </tr>
                  <tr>
                    <td className="border border-slate-300 px-3 py-2">Kredit Pajak / Pajak Masukan</td>
                    <td className="border border-slate-300 px-3 py-2 text-right font-mono-num">
                      {formatRp(doc.taxReturn.taxCredit)}
                    </td>
                  </tr>
                  <tr className="bg-slate-50 font-bold">
                    <td className="border border-slate-300 px-3 py-2">
                      Status SPT:{' '}
                      {doc.taxReturn.underOverPayment > 0
                        ? 'KURANG BAYAR (LUNAS)'
                        : doc.taxReturn.underOverPayment < 0
                        ? 'LEBIH BAYAR'
                        : 'NIHIL'}
                    </td>
                    <td className="border border-slate-300 px-3 py-2 text-right font-mono-num text-[#1D2B53]">
                      {formatRp(doc.taxReturn.underOverPayment)}
                    </td>
                  </tr>
                </tbody>
              </table>

              <div className="border border-emerald-200 bg-emerald-50 text-emerald-900 rounded p-3 text-[11px]">
                Dokumen ini ditandatangani secara elektronik menggunakan <strong>Kode Otorisasi DJP (Simulasi KelasBrevet)</strong> dan sah sebagai bukti latihan pelaporan SPT.
              </div>
            </div>
          )}

          {doc.type === 'BPA1' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 border border-slate-300 rounded p-3.5 bg-slate-50">
                <div>
                  <span className="text-slate-500 block">Nomor Bukti Potong</span>
                  <span className="font-mono-num font-bold text-[#1D2B53]">{doc.slip.slipNumber}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Masa / Tahun Pajak</span>
                  <span className="font-semibold">
                    {MONTHS_ID[Math.max(0, doc.slip.taxPeriodMonth - 1)]} {doc.slip.taxPeriodYear}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Pemotong Pajak (Pemberi Kerja)</span>
                  <span className="font-bold">{doc.slip.issuerName}</span>
                  <span className="block font-mono-num text-[11px] text-slate-600">{doc.slip.issuerNpwp}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Penerima Penghasilan (Karyawan)</span>
                  <span className="font-bold">{doc.slip.recipientName}</span>
                  <span className="block font-mono-num text-[11px] text-slate-600">
                    NIK/NPWP: {doc.slip.recipientNikNpwp} | Status PTKP: {doc.slip.ptkpStatus}
                  </span>
                </div>
              </div>

              <table className="w-full border-collapse border border-slate-300">
                <thead>
                  <tr className="bg-[#F4C430] text-[#1D2B53]">
                    <th className="border border-slate-300 px-3 py-2 text-left">Kode &amp; Uraian Penghasilan</th>
                    <th className="border border-slate-300 px-3 py-2 text-right">Jumlah (IDR)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-slate-300 px-3 py-2">1. Jumlah Penghasilan Bruto ({doc.slip.objectCode})</td>
                    <td className="border border-slate-300 px-3 py-2 text-right font-mono-num">{formatRp(doc.slip.grossAmount)}</td>
                  </tr>
                  <tr>
                    <td className="border border-slate-300 px-3 py-2">2. Pengurangan: Biaya Jabatan / Pensiun</td>
                    <td className="border border-slate-300 px-3 py-2 text-right font-mono-num">
                      {formatRp((doc.slip.positionAllowance || 0) + (doc.slip.pensionContribution || 0))}
                    </td>
                  </tr>
                  <tr className="bg-slate-50 font-semibold">
                    <td className="border border-slate-300 px-3 py-2">3. Jumlah Penghasilan Neto</td>
                    <td className="border border-slate-300 px-3 py-2 text-right font-mono-num">{formatRp(doc.slip.netAmount)}</td>
                  </tr>
                  {doc.slip.ptkpAmount !== undefined && (
                    <tr>
                      <td className="border border-slate-300 px-3 py-2">4. Penghasilan Tidak Kena Pajak (PTKP — {doc.slip.ptkpStatus})</td>
                      <td className="border border-slate-300 px-3 py-2 text-right font-mono-num">{formatRp(doc.slip.ptkpAmount)}</td>
                    </tr>
                  )}
                  {doc.slip.pkpAmount !== undefined && (
                    <tr>
                      <td className="border border-slate-300 px-3 py-2">5. Penghasilan Kena Pajak (PKP)</td>
                      <td className="border border-slate-300 px-3 py-2 text-right font-mono-num">{formatRp(doc.slip.pkpAmount)}</td>
                    </tr>
                  )}
                  <tr className="bg-[#EEF2FF] font-bold text-[#1D2B53]">
                    <td className="border border-slate-300 px-3 py-2">6. PPh Pasal 21 / 23 yang Dipotong</td>
                    <td className="border border-slate-300 px-3 py-2 text-right font-mono-num">{formatRp(doc.slip.taxWithheld)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {doc.type === 'FAKTUR' && (
            <div className="space-y-4">
              <div className="border border-slate-300 rounded p-3.5 space-y-2">
                <div className="flex justify-between">
                  <span>Kode &amp; Nomor Seri Faktur Pajak:</span>
                  <span className="font-mono-num font-bold text-[#1D2B53]">{doc.invoice.invoiceNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span>Status Faktur:</span>
                  <span className="font-bold">{doc.invoice.status}</span>
                </div>
                <div className="flex justify-between">
                  <span>Tanggal Faktur / Referensi:</span>
                  <span className="font-mono-num">{doc.invoice.invoiceDate} / {doc.invoice.referenceCode}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="border border-slate-300 rounded p-3">
                  <div className="font-bold text-[#1D2B53] mb-1">Pengusaha Kena Pajak (Penjual)</div>
                  <div className="font-semibold">{doc.seller.name}</div>
                  <div className="font-mono-num text-[11px]">{doc.seller.nikNpwp}</div>
                  <div className="text-[11px] text-slate-600 mt-1">{doc.seller.address}</div>
                </div>
                <div className="border border-slate-300 rounded p-3">
                  <div className="font-bold text-[#1D2B53] mb-1">Pembeli BKP / Penerima JKP</div>
                  <div className="font-semibold">{doc.invoice.counterpartyName}</div>
                  <div className="font-mono-num text-[11px]">{doc.invoice.counterpartyNpwp}</div>
                </div>
              </div>

              <table className="w-full border-collapse border border-slate-300">
                <thead>
                  <tr className="bg-[#F4C430] text-[#1D2B53]">
                    <th className="border border-slate-300 px-2.5 py-2 text-left">Kode</th>
                    <th className="border border-slate-300 px-2.5 py-2 text-left">Nama Barang / Jasa</th>
                    <th className="border border-slate-300 px-2.5 py-2 text-right">Qty</th>
                    <th className="border border-slate-300 px-2.5 py-2 text-right">Harga Jual / DPP</th>
                    <th className="border border-slate-300 px-2.5 py-2 text-right">DPP Nilai Lain</th>
                    <th className="border border-slate-300 px-2.5 py-2 text-right">PPN 12%</th>
                  </tr>
                </thead>
                <tbody>
                  {doc.invoice.items.map((it) => (
                    <tr key={it.id}>
                      <td className="border border-slate-300 px-2.5 py-1.5 font-mono-num">{it.itemCode}</td>
                      <td className="border border-slate-300 px-2.5 py-1.5">{it.itemName}</td>
                      <td className="border border-slate-300 px-2.5 py-1.5 text-right font-mono-num">{it.quantity}</td>
                      <td className="border border-slate-300 px-2.5 py-1.5 text-right font-mono-num">{formatRp(it.dpp)}</td>
                      <td className="border border-slate-300 px-2.5 py-1.5 text-right font-mono-num">{formatRp(it.dppOtherValue)}</td>
                      <td className="border border-slate-300 px-2.5 py-1.5 text-right font-mono-num">{formatRp(it.ppn)}</td>
                    </tr>
                  ))}
                  <tr className="bg-slate-50 font-bold">
                    <td colSpan={3} className="border border-slate-300 px-2.5 py-2 text-right">Total</td>
                    <td className="border border-slate-300 px-2.5 py-2 text-right font-mono-num">{formatRp(doc.invoice.dppTotal)}</td>
                    <td className="border border-slate-300 px-2.5 py-2 text-right font-mono-num">{formatRp(doc.invoice.dppOtherValue)}</td>
                    <td className="border border-slate-300 px-2.5 py-2 text-right font-mono-num text-[#1D2B53]">{formatRp(doc.invoice.ppnTotal)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {doc.type === 'BILLING' && (
            <div className="space-y-4">
              <div className="border-2 border-[#1D2B53] rounded p-5 text-center bg-[#F8FAFC]">
                <div className="text-[11px] uppercase tracking-wider text-slate-500">ID BILLING (15 DIGIT)</div>
                <div className="text-2xl font-mono-num font-extrabold text-[#1D2B53] tracking-widest mt-1">
                  {doc.billing.billingCode}
                </div>
                <div className="text-xs font-semibold mt-1 text-slate-600">
                  Status: {doc.billing.status === 'PAID' ? `LUNAS (NTPN: ${doc.billing.ntpn})` : 'MENUNGGU PEMBAYARAN'}
                </div>
              </div>
              <table className="w-full border-collapse border border-slate-300">
                <tbody>
                  <tr>
                    <td className="border border-slate-300 px-3 py-2 font-semibold w-1/3">NPWP / NIK</td>
                    <td className="border border-slate-300 px-3 py-2 font-mono-num">{doc.taxpayer.nikNpwp}</td>
                  </tr>
                  <tr>
                    <td className="border border-slate-300 px-3 py-2 font-semibold">Nama Wajib Pajak</td>
                    <td className="border border-slate-300 px-3 py-2">{doc.taxpayer.name}</td>
                  </tr>
                  <tr>
                    <td className="border border-slate-300 px-3 py-2 font-semibold">Kode Akun Pajak (KAP) / KJS</td>
                    <td className="border border-slate-300 px-3 py-2 font-mono-num">
                      {doc.billing.kapCode} / {doc.billing.kjsCode} — {doc.billing.description}
                    </td>
                  </tr>
                  <tr>
                    <td className="border border-slate-300 px-3 py-2 font-semibold">Masa / Tahun Pajak</td>
                    <td className="border border-slate-300 px-3 py-2">{doc.billing.taxPeriodLabel}</td>
                  </tr>
                  <tr className="bg-[#FEF9E7] font-bold">
                    <td className="border border-slate-300 px-3 py-2">Jumlah Setor</td>
                    <td className="border border-slate-300 px-3 py-2 font-mono-num text-[#1D2B53] text-sm">
                      {formatRp(doc.billing.amount)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
