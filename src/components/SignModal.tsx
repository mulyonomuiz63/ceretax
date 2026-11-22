import React, { useState } from 'react';
import { KeyRound, ShieldCheck, X } from 'lucide-react';

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
  description = 'Masukkan Passphrase Kode Otorisasi DJP untuk menandatangani dokumen pajak secara elektronik.',
  signerName,
  signerNik,
  confirmLabel = 'Konfirmasi Tanda Tangan',
  onClose,
  onConfirm,
}) => {
  const [provider, setProvider] = useState('KODE_OTORISASI_DJP');
  const [passphrase, setPassphrase] = useState('123456');
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passphrase.trim().length < 4) {
      setErr('Passphrase minimal 4 karakter (default simulasi: 123456).');
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

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-md shadow-xl border border-[#CBD5E1] w-full max-w-md overflow-hidden">
        {/* Coretax Navy Modal Header */}
        <div className="bg-[#1D2B53] text-white px-5 py-3.5 flex items-center justify-between border-b-2 border-[#F4C430]">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#F4C430]" />
            <h3 className="font-display font-bold text-sm">{title}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-300 hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="bg-[#D9F2FD] border border-[#9EE0FB] text-[#0C5460] text-xs px-3.5 py-2.5 rounded leading-relaxed">
            {description}
          </div>

          <div className="grid grid-cols-2 gap-3 bg-slate-50 border border-slate-200 rounded p-3 text-xs">
            <div>
              <span className="text-slate-500 block text-[11px]">Penandatangan</span>
              <span className="font-bold text-[#1D2B53]">{signerName}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[11px]">ID Penandatangan</span>
              <span className="font-mono-num font-semibold text-[#1D2B53]">{signerNik}</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#1D2B53] mb-1">
              Penyedia Penandatangan <span className="text-red-500">*</span>
            </label>
            <select
              value={provider}
              onChange={(e) => setProvider(e.target.value)}
              className="w-full border border-[#CBD5E1] rounded px-3 py-2 text-xs bg-white focus:outline-none focus:border-[#1D2B53]"
            >
              <option value="KODE_OTORISASI_DJP">Kode Otorisasi DJP (Simulasi KelasBrevet)</option>
              <option value="BSRE">Balai Sertifikasi Elektronik (BSrE)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#1D2B53] mb-1">
              Kata Sandi Penandatangan / Passphrase <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="password"
                value={passphrase}
                onChange={(e) => setPassphrase(e.target.value)}
                placeholder="Masukkan passphrase (default: 123456)"
                className="w-full border border-[#CBD5E1] rounded pl-9 pr-3 py-2 text-xs font-mono-num focus:outline-none focus:border-[#1D2B53]"
                required
              />
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Petunjuk simulasi: Passphrase default adalah <strong className="font-mono-num">123456</strong>.
            </p>
          </div>

          {err && (
            <div className="text-xs text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2">
              {err}
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold border border-slate-300 rounded text-slate-700 hover:bg-slate-50 cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 text-xs font-bold bg-[#1D2B53] hover:bg-[#273A6E] text-white rounded shadow-sm disabled:opacity-60 cursor-pointer"
            >
              {submitting ? 'Memproses...' : confirmLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
