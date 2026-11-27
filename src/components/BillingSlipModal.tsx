import React, { useMemo } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle2, CreditCard, Printer, X } from 'lucide-react';
import { BillingCode, Taxpayer } from '../types/tax.ts';
import {
  formatExpiryDjp,
  formatMasaPajakDjp,
  formatNominalDjp,
  terbilang,
} from '../utils/taxCalc.ts';
import {
  createDjpEmblemDataUrl,
  generateQrCodeDataUrl,
} from '../utils/sptIndukPdfGenerator.ts';

interface BillingSlipModalProps {
  open: boolean;
  billing: BillingCode | null;
  taxpayer: Taxpayer;
  onClose: () => void;
  onPay?: (billingId: string) => Promise<void>;
}

export const BillingSlipModal: React.FC<BillingSlipModalProps> = ({
  open,
  billing,
  taxpayer,
  onClose,
  onPay,
}) => {
  const [paying, setPaying] = React.useState(false);

  const emblemUrl = useMemo(() => {
    if (typeof window === 'undefined') return '';
    try {
      return createDjpEmblemDataUrl();
    } catch {
      return '';
    }
  }, []);

  const qrUrl = useMemo(() => {
    if (!billing) return '';
    try {
      return generateQrCodeDataUrl(
        `DJP-CORETAX|BILLING|${billing.billingCode}|${taxpayer.nikNpwp}|${billing.amount}|EXP:${billing.expiredAt || ''}`
      );
    } catch {
      return '';
    }
  }, [billing, taxpayer.nikNpwp]);

  if (!open || !billing) return null;

  const handlePrint = () => {
    window.print();
  };

  const handlePay = async () => {
    if (!onPay) return;
    setPaying(true);
    try {
      await onPay(billing.id);
      onClose();
    } finally {
      setPaying(false);
    }
  };

  const masaDisplay = formatMasaPajakDjp(
    undefined,
    new Date(billing.createdAt || Date.now()).getFullYear()
  );

  const modalContent = (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 print:p-0 print:bg-white"
    >
      <div className="relative w-full max-w-[700px] bg-white rounded-[10px] shadow-2xl border border-slate-200 overflow-hidden print:border-none print:shadow-none print:max-w-none">
        {/* Top Control Bar (Hidden when printing) */}
        <div className="flex items-center justify-between px-5 py-3 bg-[#1E2C5E] text-white print:hidden">
          <div className="flex items-center gap-2">
            <span className="font-display font-bold text-sm tracking-wide">
              Cetakan Kode Billing Coretax DJP
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded bg-white/10 hover:bg-white/20 text-white text-xs font-semibold cursor-pointer transition"
              title="Cetak Slip Billing"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Cetak Slip</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded text-slate-300 hover:text-white hover:bg-white/10 cursor-pointer transition"
              aria-label="Tutup"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Paper Document Body (Exact match to Gambar 2) */}
        <div className="p-6 sm:p-9 bg-white text-slate-900 font-sans text-[12px] leading-relaxed space-y-5">
          {/* 1. Header (Ministry Logo Lockup Left + Top-Right Billing Box) */}
          <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4">
            <div className="flex items-center gap-3">
              {emblemUrl ? (
                <img
                  src={emblemUrl}
                  alt="Emblem DJP"
                  className="w-11 h-12 shrink-0 object-contain"
                />
              ) : (
                <div className="w-11 h-12 bg-[#10356C] rounded flex items-center justify-center text-amber-400 font-bold text-xs">
                  DJP
                </div>
              )}
              <div className="font-bold text-[11px] leading-snug tracking-wider text-[#10356C]">
                <div>KEMENTERIAN KEUANGAN RI</div>
                <div>DIREKTORAT JENDERAL PAJAK</div>
              </div>
            </div>

            {/* Top Right Box */}
            <div className="border border-slate-800 rounded px-5 py-2 text-center shrink-0">
              <div className="text-[11px] font-bold tracking-wider text-slate-700">
                KODE <span className="italic font-serif">BILLING</span>
              </div>
              <div className="font-mono-num font-extrabold text-[18px] sm:text-[20px] text-slate-900 tracking-wider mt-0.5">
                {billing.billingCode}
              </div>
            </div>
          </div>

          {/* 2. Taxpayer Metadata Grid */}
          <div className="grid grid-cols-12 gap-y-1.5 text-[11.5px]">
            <div className="col-span-3 text-slate-700 font-semibold">NPWP</div>
            <div className="col-span-9 font-mono-num font-bold text-slate-900">
              : {taxpayer.nikNpwp}
            </div>

            <div className="col-span-3 text-slate-700 font-semibold">NAMA</div>
            <div className="col-span-9 font-bold text-slate-900 uppercase">
              : {taxpayer.name}
            </div>

            <div className="col-span-3 text-slate-700 font-semibold">ALAMAT</div>
            <div className="col-span-9 text-slate-800 uppercase leading-snug">
              : {taxpayer.address || '-'}
            </div>

            <div className="col-span-3 text-slate-700 font-semibold pt-1">MATA UANG</div>
            <div className="col-span-9 text-slate-900 pt-1 font-semibold">
              : IDR
            </div>

            <div className="col-span-3 text-slate-700 font-semibold">NOMINAL</div>
            <div className="col-span-9 font-mono-num font-bold text-slate-900">
              : {formatNominalDjp(billing.amount)}
            </div>

            <div className="col-span-3 text-slate-700 font-semibold">JUMLAH DETAIL</div>
            <div className="col-span-9 font-mono-num text-slate-900">
              : 1
            </div>
          </div>

          {/* 3. Detail Billing Table (Yellow Header) */}
          <div className="pt-2">
            <div className="font-bold text-[12px] text-slate-900 uppercase tracking-wide mb-1.5">
              DETAIL BILLING:
            </div>
            <div className="border border-slate-300 rounded overflow-hidden">
              <table className="w-full text-[11px] border-collapse">
                <thead>
                  <tr className="bg-[#F6C324] text-slate-900 font-bold border-b border-slate-300">
                    <th className="px-3 py-2 text-center border-r border-slate-300">KAP-KJS</th>
                    <th className="px-3 py-2 text-center border-r border-slate-300">MASA PAJAK</th>
                    <th className="px-3 py-2 text-center border-r border-slate-300">REF TAGIHAN</th>
                    <th className="px-3 py-2 text-center border-r border-slate-300">NOP</th>
                    <th className="px-3 py-2 text-right">NOMINAL</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  <tr>
                    <td className="px-3 py-2 font-mono-num text-center border-r border-slate-200">
                      {billing.kapCode}-{billing.kjsCode}
                    </td>
                    <td className="px-3 py-2 font-mono-num text-center border-r border-slate-200">
                      {masaDisplay}
                    </td>
                    <td className="px-3 py-2 text-center border-r border-slate-200 text-slate-400">
                      -
                    </td>
                    <td className="px-3 py-2 text-center border-r border-slate-200 text-slate-400">
                      -
                    </td>
                    <td className="px-3 py-2 font-mono-num font-bold text-right">
                      Rp{formatNominalDjp(billing.amount)}
                    </td>
                  </tr>
                  <tr className="bg-[#F6C324] text-slate-900 font-bold border-t border-slate-300">
                    <td colSpan={4} className="px-3 py-1.5 font-bold uppercase text-left">
                      TOTAL
                    </td>
                    <td className="px-3 py-1.5 font-mono-num font-bold text-right whitespace-nowrap">
                      Rp{formatNominalDjp(billing.amount)}
                    </td>
                  </tr>
                  <tr className="bg-slate-50 border-t border-slate-200">
                    <td colSpan={5} className="px-3 py-2 text-[10.5px] italic text-slate-700">
                      Terbilang: {terbilang(billing.amount)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* 4. Uraian */}
          <div className="space-y-0.5 text-[11px]">
            <div className="font-bold text-slate-900 uppercase">URAIAN:</div>
            <div className="text-slate-700 font-medium">{billing.description || '-'}</div>
          </div>

          {/* 5. Instruction & Verification Strip */}
          <div className="pt-2 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="space-y-1.5 text-[11.5px] w-full sm:w-auto">
              <div className="font-bold text-slate-900 uppercase tracking-wide">
                GUNAKAN KODE <span className="italic font-serif">BILLING</span> DI BAWAH INI
                <br />
                UNTUK MELAKUKAN PEMBAYARAN
              </div>
              <div className="grid grid-cols-12 gap-1 text-[11.5px] pt-1">
                <div className="col-span-4 font-bold text-slate-800">
                  KODE <span className="italic font-serif">BILLING</span>
                </div>
                <div className="col-span-8 font-mono-num font-extrabold text-[#1E2C5E]">
                  : {billing.billingCode}
                </div>

                <div className="col-span-4 font-bold text-slate-800">MASA AKTIF</div>
                <div className="col-span-8 font-mono-num font-bold text-slate-900">
                  : {formatExpiryDjp(billing.expiredAt || billing.createdAt)}
                </div>

                <div className="col-span-4 font-bold text-slate-800">STATUS</div>
                <div className="col-span-8">
                  {billing.status === 'PAID' ? (
                    <span className="font-bold text-emerald-700 inline-flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> LUNAS (NTPN: {billing.ntpn})
                    </span>
                  ) : billing.status === 'EXPIRED' ? (
                    <span className="font-bold text-rose-600">KEDALUWARSA (EXPIRED)</span>
                  ) : (
                    <span className="font-bold text-amber-700">BELUM DIBAYAR</span>
                  )}
                </div>
              </div>
            </div>

            {/* Right Side: QR Code */}
            {qrUrl && (
              <div className="flex flex-col items-center shrink-0">
                <img
                  src={qrUrl}
                  alt="QR Code DJP"
                  className="w-24 h-24 object-contain border border-slate-200 rounded p-1 bg-white shadow-xs"
                />
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons in Modal Footer (Hidden when printing) */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 print:hidden">
          <div className="text-[11px] text-slate-500">
            * Data SPT otomatis tersimpan di menu <strong>Pembayaran</strong> dan{' '}
            <strong>SPT Menunggu Pembayaran</strong>.
          </div>
          <div className="flex items-center gap-2">
            {onPay && billing.status === 'UNPAID' && (
              <button
                type="button"
                disabled={paying}
                onClick={handlePay}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-[5px] bg-[#2E7D32] hover:bg-[#256628] text-white text-[12px] font-bold cursor-pointer transition shadow-xs disabled:opacity-60"
              >
                <CreditCard className="w-3.5 h-3.5" />
                <span>{paying ? 'Memproses NTPN...' : 'Bayar Sekarang (Simulasi Pelunasan NTPN)'}</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-[5px] bg-slate-200 hover:bg-slate-300 text-slate-800 text-[12px] font-bold cursor-pointer transition"
            >
              Tutup / Bayar Nanti
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined'
    ? createPortal(modalContent, document.body)
    : modalContent;
};
