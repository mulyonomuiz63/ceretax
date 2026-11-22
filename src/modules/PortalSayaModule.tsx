import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  Bell,
  Building2,
  CreditCard,
  Download,
  Eye,
  FileCheck2,
  FileSpreadsheet,
  FileText,
  Receipt,
  Save,
  ShieldAlert,
  User,
  Wallet,
} from 'lucide-react';
import { PtkpStatus, Taxpayer, WorkspaceState } from '../types/tax.ts';
import { formatRp, MONTHS_ID } from '../utils/taxCalc.ts';
import { MainNavKey } from '../components/CoretaxShell.tsx';
import { PrintablePayload } from '../components/DocumentPrintModal.tsx';

interface PortalSayaModuleProps {
  subTab: string;
  onChangeSubTab: (tab: string) => void;
  workspace: WorkspaceState;
  activeTaxpayer: Taxpayer;
  accountMode: 'INDIVIDUAL' | 'CORPORATE';
  onSwitchAccountMode: (mode: 'INDIVIDUAL' | 'CORPORATE') => void;
  onNavigate: (module: MainNavKey, subTab?: string) => void;
  onUpdateProfile: (taxpayerId: string, updates: Partial<Taxpayer>) => Promise<void>;
  onPrintDocument: (doc: PrintablePayload) => void;
}

export const PortalSayaModule: React.FC<PortalSayaModuleProps> = ({
  subTab,
  onChangeSubTab,
  workspace,
  activeTaxpayer,
  accountMode,
  onSwitchAccountMode,
  onNavigate,
  onUpdateProfile,
  onPrintDocument,
}) => {
  const [form, setForm] = useState({
    name: activeTaxpayer.name,
    address: activeTaxpayer.address,
    email: activeTaxpayer.email,
    phone: activeTaxpayer.phone,
    ptkpStatus: activeTaxpayer.ptkpStatus,
    kluCode: activeTaxpayer.kluCode,
    kluName: activeTaxpayer.kluName,
  });
  const [saving, setSaving] = useState(false);
  const [savedNotice, setSavedNotice] = useState(false);

  useEffect(() => {
    setForm({
      name: activeTaxpayer.name,
      address: activeTaxpayer.address,
      email: activeTaxpayer.email,
      phone: activeTaxpayer.phone,
      ptkpStatus: activeTaxpayer.ptkpStatus,
      kluCode: activeTaxpayer.kluCode,
      kluName: activeTaxpayer.kluName,
    });
  }, [activeTaxpayer]);

  const bpa1Docs = workspace.slips.filter(
    (s) =>
      s.status === 'ISSUED' &&
      (accountMode === 'INDIVIDUAL'
        ? s.recipientNikNpwp === workspace.individualTaxpayer.nikNpwp || s.slipType === 'BPA1'
        : s.issuerId === workspace.corporateTaxpayer.id)
  );

  const submittedReturns = workspace.returns.filter(
    (r) => r.status === 'SUBMITTED' && r.taxpayerId === activeTaxpayer.id
  );

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onUpdateProfile(activeTaxpayer.id, form);
      setSavedNotice(true);
      setTimeout(() => setSavedNotice(false), 2500);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* ================================================================= */}
      {/* SUB-TAB 1: HOME (EXACT CORETAX HOME-PORTAL ANNOUNCEMENT + ACCESS) */}
      {/* ================================================================= */}
      {subTab === 'ikhtisar' && (
        <div className="space-y-6">
          {/* Official Coretax Home-Portal Security Awareness Banner ("WASPADA 2 HAL Terkait dengan CORETAX") */}
          <div className="rounded-[14px] overflow-hidden border border-[#E5EAF2] shadow-[0_8px_28px_rgba(27,41,88,0.10)] grid grid-cols-1 lg:grid-cols-12">
            {/* Left Crimson Red Impact Panel */}
            <div className="lg:col-span-4 bg-[linear-gradient(155deg,#E11D2E_0%,#B91C1C_100%)] text-white p-6 sm:p-7 flex flex-col justify-between relative overflow-hidden">
              <div className="relative z-10">
                <div className="font-display font-black text-[28px] sm:text-[32px] leading-[1.05] tracking-tight uppercase">
                  Waspada
                </div>
                <div className="flex items-end gap-2 mt-1">
                  <span className="font-display font-black text-[76px] sm:text-[86px] leading-[0.82] tracking-tighter text-white drop-shadow-sm">
                    2
                  </span>
                  <span className="font-display font-black text-[34px] sm:text-[38px] leading-none uppercase pb-1">
                    Hal
                  </span>
                </div>
                <p className="text-xs sm:text-[13px] font-semibold text-white/90 mt-4">
                  Terkait dengan layanan simulasi &amp; portal
                </p>
                <div className="font-display font-black text-xl tracking-tight mt-0.5">
                  KELAS<span className="text-[#F4C430]">BREVET</span>
                </div>
              </div>

              <div className="relative z-10 mt-5 pt-3 border-t border-white/20 flex items-center gap-2 text-[11.5px] text-white/90">
                <ShieldAlert className="w-4 h-4 text-[#F4C430] shrink-0" />
                <span>Simulasi resmi edukasi prosedur Coretax DJP</span>
              </div>
            </div>

            {/* Right Deep Navy Two-Point Warning Panel */}
            <div className="lg:col-span-8 bg-[#1A265A] text-white p-6 sm:p-7 flex flex-col justify-between space-y-5">
              {/* Point 1: Penipu */}
              <div>
                <div className="flex flex-wrap items-center gap-2.5">
                  <span className="w-7 h-7 rounded-full border-2 border-[#EF4444] text-white font-display font-extrabold text-sm inline-flex items-center justify-center shrink-0">
                    1
                  </span>
                  <span className="bg-[#DC2626] text-white font-display font-extrabold text-base px-3 py-0.5 rounded-[4px]">
                    Penipu
                  </span>
                  <span className="font-semibold text-sm text-white/95">
                    yang mengatasnamakan DJP
                  </span>
                </div>
                <div className="mt-3 pl-1 sm:pl-9 space-y-1.5 text-[12px] text-slate-200">
                  <div className="font-bold text-[#F4C430]">Ciri-ciri yang harus diwaspadai:</div>
                  <ul className="space-y-1 leading-snug">
                    <li>▸ Menghubungi lewat <strong>WhatsApp, SMS, atau telepon</strong> mengaku dari DJP</li>
                    <li>▸ Mengirim <strong>link mencurigakan (phishing)</strong> untuk login atau update data</li>
                    <li>▸ Meminta <strong>data sensitif</strong> (nomor rekening, OTP) dan <strong>pembayaran tertentu</strong></li>
                    <li>▸ Mengancam dengan denda/pemblokiran akun jika tidak segera mengikuti instruksi</li>
                  </ul>
                  <div className="text-[#F4C430] font-bold pt-1">
                    Abaikan jika menemui ciri-ciri tersebut.
                  </div>
                </div>
              </div>

              <div className="h-[1.5px] bg-[#DC2626]/70" />

              {/* Point 2: Calo */}
              <div>
                <div className="flex flex-wrap items-center gap-2.5">
                  <span className="w-7 h-7 rounded-full border-2 border-[#EF4444] text-white font-display font-extrabold text-sm inline-flex items-center justify-center shrink-0">
                    2
                  </span>
                  <span className="bg-[#DC2626] text-white font-display font-extrabold text-base px-3 py-0.5 rounded-[4px]">
                    Calo
                  </span>
                  <span className="font-semibold text-sm text-white/95">
                    yang menawarkan jasa Coretax
                  </span>
                </div>
                <div className="mt-3 pl-1 sm:pl-9 grid grid-cols-1 sm:grid-cols-2 gap-3 text-[12px] text-slate-200">
                  <p className="leading-relaxed">
                    Banyak beredar pihak tidak resmi yang menawarkan jasa pengisian SPT melalui Coretax dengan imbalan murah. Pelajari alurnya secara mandiri melalui simulasi ini.
                  </p>
                  <div className="space-y-1">
                    <div className="font-bold text-[#F4C430]">Risiko yang bisa terjadi:</div>
                    <div>▸ <strong>Kebocoran data</strong> pribadi dan perpajakan</div>
                    <div>▸ <strong>Akun diambil alih</strong> di luar kendali Anda</div>
                    <div>▸ <strong>Masalah hukum</strong> karena aktivitas ilegal</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ACTIVE ACCOUNT & DEPOSIT STRIP */}
          <div className="rounded-[14px] border border-[#E5EAF2] bg-[#F8FAFC] px-5 py-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5 min-w-0">
              <div
                className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
                  accountMode === 'CORPORATE'
                    ? 'bg-[#1D4ED8] text-white'
                    : 'bg-[#1E2C5E] text-[#F4C430]'
                }`}
              >
                {accountMode === 'CORPORATE' ? (
                  <Building2 className="w-5 h-5" />
                ) : (
                  <User className="w-5 h-5" />
                )}
              </div>
              <div className="min-w-0">
                <div className="text-[11px] font-semibold text-slate-500">
                  {accountMode === 'CORPORATE'
                    ? 'Wajib Pajak Badan · Impersonating PKP'
                    : 'Wajib Pajak Orang Pribadi · Akun Utama'}
                </div>
                <div className="font-display font-extrabold text-base text-[#1B2958] truncate">
                  {activeTaxpayer.name}
                </div>
                <div className="text-xs text-slate-600 flex flex-wrap items-center gap-x-2">
                  <span className="font-mono-num font-semibold">{activeTaxpayer.nikNpwp}</span>
                  <span>·</span>
                  <span>{activeTaxpayer.kppName}</span>
                  <span>·</span>
                  <span>
                    {activeTaxpayer.isPkp ? 'PKP Aktif' : `PTKP ${activeTaxpayer.ptkpStatus}`}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4 shrink-0">
              <div className="text-left lg:text-right">
                <div className="text-[11px] text-slate-500 inline-flex items-center gap-1">
                  <Wallet className="w-3.5 h-3.5 text-[#1E2C5E]" />
                  <span>Saldo Deposit Pajak</span>
                </div>
                <div className="font-mono-num font-extrabold text-base text-[#1B2958]">
                  {formatRp(activeTaxpayer.depositBalance)}
                </div>
              </div>

              <button
                type="button"
                onClick={() =>
                  onSwitchAccountMode(accountMode === 'CORPORATE' ? 'INDIVIDUAL' : 'CORPORATE')
                }
                className="px-4 py-2 rounded-[10px] bg-[#1E2C5E] hover:bg-[#16224A] text-white text-xs font-semibold transition cursor-pointer whitespace-nowrap"
              >
                {accountMode === 'CORPORATE'
                  ? 'Beralih ke Orang Pribadi'
                  : 'Impersonate ke Perusahaan PKP'}
              </button>
            </div>
          </div>

          {/* 5 MANDATORY SIMULATION LAUNCHER CARDS */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-display font-bold text-sm text-[#1B2958]">
                Akses Cepat 5 Modul Simulasi Wajib
              </h2>
              <span className="text-xs text-slate-500">
                Faktur: <strong className="font-mono-num text-[#1B2958]">{workspace.invoices.length}</strong> · eBupot:{' '}
                <strong className="font-mono-num text-[#1B2958]">{workspace.slips.length}</strong> · BPE:{' '}
                <strong className="font-mono-num text-emerald-700">
                  {workspace.returns.filter((r) => r.status === 'SUBMITTED').length}
                </strong>
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3.5">
              {[
                {
                  index: '01',
                  title: 'SPT Masa PPN & e-Faktur',
                  desc: 'Keluaran, Masukan, Pengganti, Retur, Ekspor & Induk PPN A1–C.',
                  mode: 'CORPORATE' as const,
                  nav: ['efaktur', 'output'] as [MainNavKey, string],
                  icon: Receipt,
                },
                {
                  index: '02',
                  title: 'PPh 21 Tahunan Karyawan',
                  desc: 'Unduh Bukti Potong BPA1 di Dokumen Saya & lapor SPT Tahunan.',
                  mode: 'INDIVIDUAL' as const,
                  nav: ['portal', 'dokumen'] as [MainNavKey, string],
                  icon: FileCheck2,
                },
                {
                  index: '03',
                  title: 'e-Bupot & SPT Masa 21/23',
                  desc: 'BPMP TER, BP21, BPA1, BPPU PPh 23, Impor XML & SPT Masa.',
                  mode: 'CORPORATE' as const,
                  nav: ['ebupot', 'bpmp'] as [MainNavKey, string],
                  icon: FileSpreadsheet,
                },
                {
                  index: '04',
                  title: 'SPT Tahunan Orang Pribadi',
                  desc: 'Posting SPT, Induk A–K, Lampiran L-1 Harta/Utang & L-2.',
                  mode: 'INDIVIDUAL' as const,
                  nav: ['spt', 'konsep'] as [MainNavKey, string],
                  icon: FileText,
                },
                {
                  index: '05',
                  title: 'SPT Tahunan PPh Badan',
                  desc: 'Laporan Keuangan, Rekonsiliasi Fiskal, Fasilitas 31E & PPh 29.',
                  mode: 'CORPORATE' as const,
                  nav: ['spt', 'konsep'] as [MainNavKey, string],
                  icon: CreditCard,
                },
              ].map((m) => {
                const Icon = m.icon;
                return (
                  <button
                    key={m.index}
                    type="button"
                    onClick={() => {
                      onSwitchAccountMode(m.mode);
                      onNavigate(m.nav[0], m.nav[1]);
                    }}
                    className="text-left bg-white rounded-[14px] border border-[#E5EAF2] hover:border-[#F4C430] hover:bg-[#FEFCE8]/40 p-4 transition flex flex-col justify-between group cursor-pointer"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2.5">
                        <span className="w-8 h-8 rounded-lg bg-[#F4F6FA] group-hover:bg-[#FEF08A] text-[#1E2C5E] flex items-center justify-center transition">
                          <Icon className="w-4 h-4" />
                        </span>
                        <span className="font-mono-num text-[11px] font-bold text-slate-400">
                          {m.index}
                        </span>
                      </div>
                      <div className="font-display font-bold text-[13px] text-[#1B2958] leading-snug">
                        {m.title}
                      </div>
                      <p className="text-[11.5px] text-slate-500 mt-1 leading-relaxed">{m.desc}</p>
                    </div>
                    <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] font-semibold text-[#1E2C5E]">
                      <span>{m.mode === 'CORPORATE' ? 'Mode PKP/Badan' : 'Mode OP'}</span>
                      <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* SUB-TAB 2: NOTIFIKASI SAYA                                        */}
      {/* ================================================================= */}
      {subTab === 'notifikasi' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-display font-bold text-base text-[#1B2958]">Notifikasi Saya</h1>
              <p className="text-xs text-slate-500">
                Pemberitahuan real-time penerbitan faktur, bukti potong e-Bupot, kode billing, dan BPE SPT.
              </p>
            </div>
            <span className="text-xs font-mono-num text-slate-500">
              Total: {workspace.notifications.length} pesan
            </span>
          </div>

          <div className="border border-[#E5EAF2] rounded-[14px] divide-y divide-slate-100 overflow-hidden">
            {workspace.notifications.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500">
                Belum ada notifikasi pada akun Anda.
              </div>
            ) : (
              workspace.notifications.map((n) => (
                <div
                  key={n.id}
                  className={`p-4 flex items-start gap-3 text-xs ${
                    n.isRead ? 'bg-white' : 'bg-[#F0F7FF]'
                  }`}
                >
                  <div className="w-8 h-8 rounded-lg bg-[#EEF2FA] text-[#1E2C5E] flex items-center justify-center shrink-0 mt-0.5">
                    <Bell className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-[#1B2958]">{n.title}</span>
                      <span className="text-[11px] text-slate-400 font-mono-num">
                        {new Date(n.createdAt).toLocaleString('id-ID')}
                      </span>
                    </div>
                    <p className="text-slate-600 mt-1 leading-relaxed">{n.message}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* SUB-TAB 3: PROFIL SAYA                                            */}
      {/* ================================================================= */}
      {subTab === 'profil' && (
        <form onSubmit={handleSaveProfile} className="space-y-5">
          <div>
            <h1 className="font-display font-bold text-base text-[#1B2958]">Profil Saya</h1>
            <p className="text-xs text-slate-500">
              Pembaruan profil Wajib Pajak otomatis tersinkronisasi ke formulir SPT, e-Faktur, dan e-Bupot.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-[13px]">
            <div>
              <label className="block text-xs font-bold text-[#1B2958] mb-1.5">
                NIK / NPWP (16 Digit)
              </label>
              <input
                type="text"
                value={activeTaxpayer.nikNpwp}
                disabled
                className="w-full border border-[#E2E8F0] bg-[#F8FAFC] rounded-[10px] px-3.5 py-2.5 font-mono-num text-slate-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#1B2958] mb-1.5">
                Nama Wajib Pajak
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full border border-[#DCE1EB] rounded-[10px] px-3.5 py-2.5 focus:outline-none focus:border-[#1E2C5E]"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#1B2958] mb-1.5">
                Email Terdaftar
              </label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full border border-[#DCE1EB] rounded-[10px] px-3.5 py-2.5 focus:outline-none focus:border-[#1E2C5E]"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#1B2958] mb-1.5">
                Nomor Telepon
              </label>
              <input
                type="text"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="w-full border border-[#DCE1EB] rounded-[10px] px-3.5 py-2.5 focus:outline-none focus:border-[#1E2C5E]"
              />
            </div>
            {accountMode === 'INDIVIDUAL' && (
              <div>
                <label className="block text-xs font-bold text-[#1B2958] mb-1.5">Status PTKP</label>
                <select
                  value={form.ptkpStatus}
                  onChange={(e) => setForm({ ...form, ptkpStatus: e.target.value as PtkpStatus })}
                  className="w-full border border-[#DCE1EB] rounded-[10px] px-3.5 py-2.5 bg-white focus:outline-none focus:border-[#1E2C5E]"
                >
                  {(['TK/0', 'TK/1', 'TK/2', 'TK/3', 'K/0', 'K/1', 'K/2', 'K/3'] as PtkpStatus[]).map(
                    (p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    )
                  )}
                </select>
              </div>
            )}
            <div>
              <label className="block text-xs font-bold text-[#1B2958] mb-1.5">
                Kode &amp; Nama KLU
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={form.kluCode}
                  onChange={(e) => setForm({ ...form, kluCode: e.target.value })}
                  className="w-24 border border-[#DCE1EB] rounded-[10px] px-3 py-2.5 font-mono-num"
                />
                <input
                  type="text"
                  value={form.kluName}
                  onChange={(e) => setForm({ ...form, kluName: e.target.value })}
                  className="flex-1 border border-[#DCE1EB] rounded-[10px] px-3.5 py-2.5"
                />
              </div>
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-[#1B2958] mb-1.5">
                Alamat Domisili / Usaha
              </label>
              <textarea
                rows={2}
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                className="w-full border border-[#DCE1EB] rounded-[10px] px-3.5 py-2.5 focus:outline-none focus:border-[#1E2C5E]"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-slate-100">
            {savedNotice ? (
              <span className="text-xs font-semibold text-emerald-700">
                Perubahan profil berhasil disimpan.
              </span>
            ) : (
              <span />
            )}
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 bg-[#1E2C5E] hover:bg-[#16224A] text-white font-semibold text-xs px-5 py-2.5 rounded-[10px] transition cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{saving ? 'Menyimpan...' : 'Simpan Perubahan Profil'}</span>
            </button>
          </div>
        </form>
      )}

      {/* ================================================================= */}
      {/* SUB-TAB 4: DOKUMEN SAYA (MODUL 2 — BPA1 KARYAWAN & BPE)           */}
      {/* ================================================================= */}
      {subTab === 'dokumen' && (
        <div className="space-y-5">
          <div className="bg-[#EFF6FF] border border-[#BFDBFE] text-[#1E3A8A] text-xs px-4 py-3.5 rounded-[12px] flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-[#1D4ED8]" />
              <span className="leading-relaxed">
                <strong>Modul 2 — Pelaporan PPh 21 Tahunan (Karyawan):</strong> Unduh Bukti Potong Tahunan <strong>BPA1</strong> di bawah ini, lalu lanjutkan ke menu <strong>SPT › Konsep SPT</strong> untuk <em>Posting SPT</em> otomatis.
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                onSwitchAccountMode('INDIVIDUAL');
                onNavigate('spt', 'konsep');
              }}
              className="bg-[#1E2C5E] hover:bg-[#16224A] text-white font-semibold text-xs px-4 py-2 rounded-[10px] shrink-0 cursor-pointer"
            >
              Lanjut Lapor SPT Tahunan OP →
            </button>
          </div>

          {/* Table: Bukti Potong BPA1 */}
          <div>
            <h2 className="font-display font-bold text-sm text-[#1B2958] mb-2.5">
              Daftar Bukti Potong Tahunan (BPA1) &amp; Dokumen Pajak Diterima
            </h2>
            <div className="overflow-x-auto border border-[#E5EAF2] rounded-[12px]">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-[#F8FAFC] text-[#475569] font-semibold border-b border-[#E5EAF2]">
                    <th className="px-4 py-3 text-left">Aksi</th>
                    <th className="px-4 py-3 text-left">Jenis Dokumen</th>
                    <th className="px-4 py-3 text-left">Nomor Dokumen</th>
                    <th className="px-4 py-3 text-left">Pemberi Kerja / Pemotong</th>
                    <th className="px-4 py-3 text-left">Masa / Tahun</th>
                    <th className="px-4 py-3 text-right">Penghasilan Bruto</th>
                    <th className="px-4 py-3 text-right">PPh Dipotong</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {bpa1Docs.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                        Belum ada dokumen bukti potong yang diterbitkan untuk akun ini.
                      </td>
                    </tr>
                  ) : (
                    bpa1Docs.map((slip) => (
                      <tr key={slip.id} className="hover:bg-[#F8FAFC] transition-colors">
                        <td className="px-4 py-3 whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => onPrintDocument({ type: 'BPA1', slip })}
                            className="inline-flex items-center gap-1.5 bg-[#1E2C5E] hover:bg-[#16224A] text-white text-[11px] font-semibold px-3 py-1.5 rounded-lg cursor-pointer"
                          >
                            <Download className="w-3 h-3 text-[#F4C430]" />
                            <span>Unduh / Lihat</span>
                          </button>
                        </td>
                        <td className="px-4 py-3 font-bold text-[#1B2958]">{slip.slipType}</td>
                        <td className="px-4 py-3 font-mono-num text-slate-700">{slip.slipNumber}</td>
                        <td className="px-4 py-3">
                          <div className="font-semibold text-[#1B2958]">{slip.issuerName}</div>
                          <div className="text-[10.5px] font-mono-num text-slate-500">
                            {slip.issuerNpwp}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-slate-700">
                          {MONTHS_ID[Math.max(0, slip.taxPeriodMonth - 1)]} {slip.taxPeriodYear}
                        </td>
                        <td className="px-4 py-3 text-right font-mono-num text-slate-700">
                          {formatRp(slip.grossAmount)}
                        </td>
                        <td className="px-4 py-3 text-right font-mono-num font-bold text-[#1B2958]">
                          {formatRp(slip.taxWithheld)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Table: Bukti Penerimaan Elektronik (BPE) */}
          <div>
            <h2 className="font-display font-bold text-sm text-[#1B2958] mb-2.5">
              Bukti Penerimaan Elektronik (BPE) SPT Dilaporkan
            </h2>
            <div className="overflow-x-auto border border-[#E5EAF2] rounded-[12px]">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-[#F8FAFC] text-[#475569] font-semibold border-b border-[#E5EAF2]">
                    <th className="px-4 py-3 text-left">Aksi</th>
                    <th className="px-4 py-3 text-left">Nomor BPE</th>
                    <th className="px-4 py-3 text-left">Jenis SPT</th>
                    <th className="px-4 py-3 text-left">Periode</th>
                    <th className="px-4 py-3 text-right">Kurang / Lebih Bayar</th>
                    <th className="px-4 py-3 text-left">Tanggal Lapor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {submittedReturns.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                        Belum ada BPE SPT yang diterbitkan pada akun aktif.
                      </td>
                    </tr>
                  ) : (
                    submittedReturns.map((ret) => (
                      <tr key={ret.id} className="hover:bg-[#F8FAFC] transition-colors">
                        <td className="px-4 py-3">
                          <button
                            type="button"
                            onClick={() =>
                              onPrintDocument({ type: 'BPE', taxReturn: ret, taxpayer: activeTaxpayer })
                            }
                            className="inline-flex items-center gap-1.5 bg-[#1E2C5E] hover:bg-[#16224A] text-white text-[11px] font-semibold px-3 py-1.5 rounded-lg cursor-pointer"
                          >
                            <Eye className="w-3 h-3 text-[#F4C430]" />
                            <span>Lihat BPE</span>
                          </button>
                        </td>
                        <td className="px-4 py-3 font-mono-num font-bold text-emerald-700">
                          {ret.bpeNumber}
                        </td>
                        <td className="px-4 py-3 font-semibold text-[#1B2958]">
                          {ret.returnType.replace(/_/g, ' ')}
                        </td>
                        <td className="px-4 py-3 text-slate-700">
                          {ret.taxPeriodMonth > 0
                            ? `${MONTHS_ID[ret.taxPeriodMonth - 1]} ${ret.taxYear}`
                            : `Tahun ${ret.taxYear}`}
                        </td>
                        <td className="px-4 py-3 text-right font-mono-num text-slate-700">
                          {formatRp(ret.underOverPayment)}
                        </td>
                        <td className="px-4 py-3 font-mono-num text-slate-500">
                          {ret.submittedAt ? new Date(ret.submittedAt).toLocaleString('id-ID') : '-'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
