import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, ChevronDown } from 'lucide-react';

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
  signerNik,
  confirmLabel = 'Konfirmasi Tanda Tangan',
  onClose,
  onConfirm,
}) => {
  const [signingType, setSigningType] = useState('Tanda Tangan Pembayar Pajak');
  const [provider, setProvider] = useState('Kode Otorisasi DJP');
  const [passphrase, setPassphrase] = useState('123456');
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passphrase.trim().length < 4) {
      setErr('Kata Sandi Penandatangan minimal 4 karakter.');
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
      <div className="bg-white rounded-[4px] shadow-2xl border border-[#CBD5E1] w-full max-w-[850px] overflow-hidden">
        {/* Authentic Coretax Modal Title Bar */}
        <div className="bg-white px-6 py-4 flex items-center justify-between border-b border-[#E2E8F0]">
          <h3 className="font-sans font-medium text-[15px] text-[#1E293B]">
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

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Authentic Coretax Light Gray "Tanda Tangan" Sub-Header Container */}
          <div className="border border-[#E2E8F0] rounded-[3px] overflow-hidden">
            <div className="bg-[#F8FAFC] text-slate-700 px-4 py-2.5 text-[12px] font-normal border-b border-[#E2E8F0]">
              Tanda Tangan
            </div>

            <div className="p-5 space-y-4 bg-white text-[12px]">
              {/* Row 1: Jenis Penandatanganan */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 sm:items-center">
                <label className="sm:col-span-4 text-slate-700 font-normal">
                  Jenis Penandatanganan*
                </label>
                <div className="sm:col-span-8">
                  <div className="relative">
                    <select
                      value={signingType}
                      onChange={(e) => setSigningType(e.target.value)}
                      className="w-full border border-[#CBD5E1] rounded-[3px] px-3 py-1.5 h-[34px] text-[12px] bg-[#F8FAFC] text-[#1E293B] appearance-none pr-8 cursor-pointer focus:outline-none focus:border-[#0088FF]"
                    >
                      <option value="Tanda Tangan Pembayar Pajak">Tanda Tangan Pembayar Pajak</option>
                      <option value="Tanda Tangan Wakil / Kuasa Wajib Pajak">Tanda Tangan Wakil / Kuasa Wajib Pajak</option>
                    </select>
                    <ChevronDown className="w-4 h-4 text-slate-500 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>
              </div>

              {/* Row 2: Penyedia Penandatangan */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 sm:items-center">
                <label className="sm:col-span-4 text-slate-700 font-normal">
                  Penyedia Penandatangan*
                </label>
                <div className="sm:col-span-8">
                  <div className="relative flex items-center">
                    <select
                      value={provider}
                      onChange={(e) => setProvider(e.target.value)}
                      className="w-full border border-[#CBD5E1] rounded-[3px] px-3 py-1.5 h-[34px] text-[12px] bg-white text-[#1E293B] appearance-none pr-12 cursor-pointer focus:outline-none focus:border-[#0088FF]"
                    >
                      <option value="Kode Otorisasi DJP">Kode Otorisasi DJP</option>
                      <option value="Balai Sertifikasi Elektronik (BSrE)">Balai Sertifikasi Elektronik (BSrE)</option>
                    </select>
                    <div className="absolute right-2.5 flex items-center gap-1.5 pointer-events-none text-slate-400">
                      <X className="w-3.5 h-3.5 hover:text-slate-600" />
                      <ChevronDown className="w-4 h-4 text-slate-500" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Row 3: ID Penandatangan */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 sm:items-center">
                <label className="sm:col-span-4 text-slate-700 font-normal">
                  ID Penandatangan
                </label>
                <div className="sm:col-span-8">
                  <input
                    type="text"
                    readOnly
                    value={signerNik || '3175022907720009'}
                    className="w-full sm:w-[55%] border border-[#CBD5E1] bg-[#EEF2F6] text-slate-700 rounded-[3px] px-3 py-1.5 h-[34px] text-[12px] font-mono-num cursor-not-allowed"
                  />
                </div>
              </div>

              {/* Row 4: Kata Sandi Penandatangan */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 sm:items-center">
                <label className="sm:col-span-4 text-slate-700 font-normal">
                  Kata Sandi Penandatangan
                </label>
                <div className="sm:col-span-8">
                  <input
                    type="password"
                    value={passphrase}
                    onChange={(e) => setPassphrase(e.target.value)}
                    placeholder=""
                    className="w-full sm:w-[65%] border border-[#CBD5E1] bg-white rounded-[3px] px-3 py-1.5 h-[34px] text-[12px] font-mono-num text-[#1E293B] focus:outline-none focus:border-[#0088FF]"
                    required
                  />
                </div>
              </div>
            </div>
          </div>

          {err && (
            <div className="text-xs text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2">
              {err}
            </div>
          )}

          {/* Authentic Coretax Bottom Buttons: [Simpan] (Gray) & [Konfirmasi Tanda Tangan] (Gold/Amber) */}
          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 rounded-[3px] bg-[#64748B] hover:bg-[#526175] text-white font-normal text-[12px] cursor-pointer shadow-sm transition"
            >
              Simpan
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2 rounded-[3px] bg-[#E5A800] hover:bg-[#CA9400] text-white font-normal text-[12px] cursor-pointer shadow-sm disabled:opacity-60 transition"
            >
              {submitting ? 'Memproses...' : confirmLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent;
};
