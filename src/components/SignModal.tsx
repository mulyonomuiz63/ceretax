import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

interface SignModalProps {
  open: boolean;
  title?: string;
  description?: string;
  signerName: string;
  signerNik: string;
  confirmLabel?: string;
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
}

export const SignModal: React.FC<SignModalProps> = ({
  open,
  title = 'Tanda Tangan Dokumen',
  description,
  signerName,
  signerNik,
  confirmLabel = 'Konfirmasi Tanda Tangan',
  onClose,
  onConfirm,
}) => {
  const [signingType, setSigningType] = useState('TAXPAYER');
  const [provider, setProvider] = useState('KODE_OTORISASI_DJP');
  const [passphrase, setPassphrase] = useState('123456');
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passphrase.trim().length < 4) {
      setErr('Kata Sandi Penandatangan / Passphrase minimal 4 karakter (default simulasi: 123456).');
      return;
    }
    setErr(null);
    setSubmitting(true);
    try {
      await onConfirm();
      onClose();
    } catch (error: any) {
      setErr(error?.message || 'Gagal menandatangani dokumen.');
    } finally {
      setSubmitting(false);
    }
  };

  const modalContent = (
    <div className="fixed inset-0 z-[100] bg-slate-900/50 backdrop-blur-[1px] flex items-center justify-center p-4">
      <div className="bg-white rounded-[6px] shadow-2xl border border-[#CBD5E1] w-full max-w-[680px] overflow-hidden">
        {/* Authentic Coretax White Modal Title Bar */}
        <div className="bg-white px-5 py-3.5 flex items-center justify-between border-b border-[#E2E8F0]">
          <h3 className="font-display font-semibold text-[15px] text-[#1E293B]">
            {title}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1 rounded cursor-pointer"
            aria-label="Tutup"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {description && (
            <div className="bg-[#D8F1FD] border border-[#9EE0FB] text-[#0E4A6B] text-[12px] px-3.5 py-2.5 rounded-[4px] leading-relaxed">
              {description}
            </div>
          )}

          {/* Authentic Coretax Deep Navy "Tanda Tangan" Sub-Header */}
          <div className="border border-[#DCE2EC] rounded-[4px] overflow-hidden">
            <div className="bg-[#1E2C5E] text-white px-4 py-2 text-[12px] font-semibold">
              Tanda Tangan
            </div>

            <div className="p-4 space-y-3 bg-white text-[12px]">
              {/* Row 1: Jenis Penandatanganan */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 sm:items-center">
                <label className="sm:col-span-4 text-slate-600 font-medium">
                  Jenis Penandatanganan <span className="text-red-500">*</span>
                </label>
                <div className="sm:col-span-8">
                  <select
                    value={signingType}
                    onChange={(e) => setSigningType(e.target.value)}
                    className="w-full border border-[#CBD5E1] rounded-[4px] px-3 py-1.5 text-[12px] bg-white text-[#1E293B] focus:outline-none focus:border-[#1E2C5E]"
                  >
                    <option value="TAXPAYER">Tanda Tangan Pembayar Pajak</option>
                    <option value="REPRESENTATIVE">Tanda Tangan Wakil / Kuasa Wajib Pajak</option>
                  </select>
                </div>
              </div>

              {/* Row 2: Penyedia Penandatangan */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 sm:items-center">
                <label className="sm:col-span-4 text-slate-600 font-medium">
                  Penyedia Penandatangan <span className="text-red-500">*</span>
                </label>
                <div className="sm:col-span-8">
                  <select
                    value={provider}
                    onChange={(e) => setProvider(e.target.value)}
                    className="w-full border border-[#CBD5E1] rounded-[4px] px-3 py-1.5 text-[12px] bg-white text-[#1E293B] focus:outline-none focus:border-[#1E2C5E]"
                  >
                    <option value="KODE_OTORISASI_DJP">Kode Otorisasi DJP</option>
                    <option value="BSRE">Balai Sertifikasi Elektronik (BSrE)</option>
                    <option value="PERURI">PERURI Digital Signature</option>
                  </select>
                </div>
              </div>

              {/* Row 3: ID Penandatangan */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 sm:items-center">
                <label className="sm:col-span-4 text-slate-600 font-medium">
                  ID Penandatangan
                </label>
                <div className="sm:col-span-8">
                  <input
                    type="text"
                    readOnly
                    value={`${signerNik} — ${signerName}`}
                    className="w-full border border-[#DCE2EC] bg-[#EEF2F6] text-slate-700 rounded-[4px] px-3 py-1.5 text-[12px] font-mono-num"
                  />
                </div>
              </div>

              {/* Row 4: Kata Sandi Penandatangan */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 sm:items-center">
                <label className="sm:col-span-4 text-slate-600 font-medium">
                  Kata Sandi Penandatangan <span className="text-red-500">*</span>
                </label>
                <div className="sm:col-span-8">
                  <input
                    type="password"
                    value={passphrase}
                    onChange={(e) => setPassphrase(e.target.value)}
                    placeholder="Masukkan Passphrase Kode Otorisasi DJP (default: 123456)"
                    className="w-full border border-[#CBD5E1] bg-[#EEF4FF] rounded-[4px] px-3 py-1.5 text-[12px] font-mono-num text-[#1E293B] focus:outline-none focus:border-[#1E2C5E]"
                    required
                  />
                  <p className="text-[10.5px] text-slate-400 mt-1">
                    Simulasi Kode Otorisasi DJP: gunakan passphrase default{' '}
                    <strong className="font-mono-num text-slate-600">123456</strong>.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {err && (
            <div className="text-xs text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2">
              {err}
            </div>
          )}

          {/* Authentic Coretax Golden-Yellow Confirm Button on Bottom-Left */}
          <div className="flex items-center justify-between gap-2 pt-2">
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-1.5 text-[12px] font-bold bg-[#F7CA36] hover:bg-[#E7B923] text-[#1E293B] border border-[#1E293B]/60 rounded-[4px] shadow-xs disabled:opacity-60 cursor-pointer transition"
            >
              {submitting ? 'Memproses...' : confirmLabel}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 text-[12px] font-semibold border border-[#CBD5E1] rounded-[4px] text-slate-600 hover:bg-slate-50 cursor-pointer"
            >
              Batal
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent;
};
