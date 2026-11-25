import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import {
  ArrowRight,
  BookOpen,
  Calendar,
  FileText,
  GraduationCap,
  Megaphone,
  Send,
  Sparkles,
  X,
} from 'lucide-react';
import { Taxpayer } from '../types/tax.ts';
import { DEFAULT_CORETAX_LOGO_URL } from './KelasBrevetLogo.tsx';
import type { MainNavKey } from './CoretaxShell.tsx';

interface CoretaxDashboardProps {
  activeTaxpayer: Taxpayer;
  onNavigate: (module: MainNavKey, subTab?: string) => void;
  onOpenExamDrawer: () => void;
}

function formatDisplayName(name: string): string {
  const cleaned = (name || '').trim();
  if (!cleaned) return 'Wajib Pajak';
  // Preserve acronyms like PT / CV, otherwise convert ALL-CAPS names to Title Case like "Mulyono"
  if (cleaned === cleaned.toUpperCase()) {
    return cleaned
      .split(/\s+/)
      .map((w) => {
        if (['PT', 'CV', 'UD', 'PD', 'KPP', 'PKP', 'TBK'].includes(w)) return w;
        return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
      })
      .join(' ');
  }
  return cleaned;
}

export const CoretaxDashboard: React.FC<CoretaxDashboardProps> = ({
  activeTaxpayer,
  onNavigate,
  onOpenExamDrawer,
}) => {
  const [activeTab, setActiveTab] = useState<'pengumuman' | 'bantuan'>('bantuan');
  const [infoModal, setInfoModal] = useState<{
    title: string;
    subtitle: string;
    bullets: string[];
    actionLabel?: string;
    onAction?: () => void;
  } | null>(null);

  const displayName = formatDisplayName(activeTaxpayer.name);

  return (
    <div className="w-full max-w-[1320px] mx-auto space-y-4">
      {/* =================================================================== */}
      {/* MAIN HERO WHITE CARD (Exact Layout Match to Official Coretax Home)  */}
      {/* =================================================================== */}
      <section className="bg-white border border-[#E5EAF2] rounded-[20px] shadow-[0_8px_30px_rgba(30,44,94,0.06)] p-6 sm:p-8 lg:p-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-start">
          {/* LEFT COLUMN: Welcome Headline + 2-Tab Switcher */}
          <div className="lg:col-span-5 flex flex-col justify-between space-y-6">
            <div>
              <p className="text-[14.5px] text-[#334155]">
                Selamat datang, <strong className="font-bold text-[#1B2958]">{displayName}</strong>.
              </p>

              <h1 className="mt-2.5 font-display font-extrabold text-[28px] sm:text-[34px] leading-[1.22] tracking-[-0.02em] text-[#1B2958]">
                <span className="inline-block border-b-[4px] border-[#F4C430] pb-0.5">
                  Coretax DJP
                </span>{' '}
                siap melayani kebutuhan perpajakan Anda.
              </h1>

              <p className="mt-3.5 text-[13.5px] leading-relaxed text-[#64748B] max-w-md">
                Pilih tab untuk lihat pengumuman terbaru atau panduan bantuan.
              </p>
            </div>

            {/* Vertical 2-Tab Navigation */}
            <div className="space-y-1 pt-1">
              {/* Tab 1: Pengumuman Terbaru */}
              <button
                type="button"
                onClick={() => setActiveTab('pengumuman')}
                className={`w-full text-left py-4 border-b transition cursor-pointer group ${
                  activeTab === 'pengumuman'
                    ? 'border-b-2 border-[#F4C430]'
                    : 'border-[#E2E8F0] hover:border-slate-300'
                }`}
              >
                <div className="flex items-start gap-3.5">
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition ${
                      activeTab === 'pengumuman'
                        ? 'bg-[#FEF3C7] text-[#1B2958]'
                        : 'bg-[#F1F5F9] text-slate-400 group-hover:text-slate-600'
                    }`}
                  >
                    <Megaphone className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div
                      className={`font-display text-[15px] transition ${
                        activeTab === 'pengumuman'
                          ? 'font-bold text-[#1B2958]'
                          : 'font-semibold text-slate-400 group-hover:text-slate-600'
                      }`}
                    >
                      Pengumuman Terbaru
                    </div>
                    {activeTab === 'pengumuman' && (
                      <p className="text-[12.5px] text-[#64748B] mt-1 leading-relaxed">
                        Informasi terbaru seputar pembaruan modul simulasi e-Faktur, eBUPOT, SPT, dan Pembayaran.
                      </p>
                    )}
                  </div>
                </div>
              </button>

              {/* Tab 2: Bantuan & Panduan (Default Active) */}
              <button
                type="button"
                onClick={() => setActiveTab('bantuan')}
                className={`w-full text-left py-4 border-b transition cursor-pointer group ${
                  activeTab === 'bantuan'
                    ? 'border-b-2 border-[#F4C430]'
                    : 'border-[#E2E8F0] hover:border-slate-300'
                }`}
              >
                <div className="flex items-start gap-3.5">
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition ${
                      activeTab === 'bantuan'
                        ? 'bg-[#FEF3C7] text-[#1B2958]'
                        : 'bg-[#F1F5F9] text-slate-400 group-hover:text-slate-600'
                    }`}
                  >
                    <FileText className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div
                      className={`font-display text-[15px] transition ${
                        activeTab === 'bantuan'
                          ? 'font-bold text-[#1B2958]'
                          : 'font-semibold text-slate-400 group-hover:text-slate-600'
                      }`}
                    >
                      Bantuan &amp; Panduan
                    </div>
                    {activeTab === 'bantuan' && (
                      <p className="text-[12.5px] text-[#64748B] mt-1 leading-relaxed">
                        Akses panduan umum melalui Coretaxpedia atau panduan fitur SPT Tahunan secara khusus.
                      </p>
                    )}
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* RIGHT COLUMN: 2 Stacked Banner Cards */}
          <div className="lg:col-span-7 space-y-4">
            {activeTab === 'bantuan' ? (
              <>
                {/* Banner Card 1: Mau lapor SPT di Coretax tapi belum Paham? */}
                <div className="bg-[#F5F7FB] border border-[#E2E8F0] rounded-[16px] p-6 sm:p-7 flex flex-col sm:flex-row items-center justify-between gap-6">
                  <div className="space-y-2 max-w-md">
                    <h2 className="font-display font-extrabold text-[20px] sm:text-[23px] leading-[1.28] text-[#1B2958]">
                      Mau lapor SPT di Coretax tapi belum Paham?
                    </h2>
                    <p className="text-[13.5px] text-[#64748B] font-medium">
                      #KamiDampingiSampaiBerhasil
                    </p>
                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={() => onNavigate('spt', 'konsep')}
                        className="inline-flex items-center gap-2 text-[13.5px] font-bold text-[#1B2958] hover:text-[#2563EB] transition cursor-pointer group"
                      >
                        <span>Di sini panduannya</span>
                        <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                      </button>
                    </div>
                  </div>

                  {/* Clean Vector Illustration matching Coretax Dashboard */}
                  <div className="shrink-0 select-none" aria-hidden="true">
                    <svg
                      width="190"
                      height="135"
                      viewBox="0 0 210 150"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                      className="w-[165px] sm:w-[190px] h-auto"
                    >
                      {/* Subtle desk line */}
                      <path
                        d="M120 132H198"
                        stroke="#CBD5E1"
                        strokeWidth="3"
                        strokeLinecap="round"
                      />
                      {/* Monitor stand */}
                      <path d="M150 108H166L170 130H146L150 108Z" fill="#475569" />
                      <rect x="138" y="128" width="40" height="5" rx="2.5" fill="#1E293B" />
                      {/* Monitor body */}
                      <path
                        d="M126 52C126 48.6863 128.686 46 132 46H192C195.314 46 198 48.6863 198 52L192 104C191.6 107.3 188.8 109.8 185.5 109.8H132C128.686 109.8 126 107.114 126 103.8V52Z"
                        fill="#1E293B"
                      />
                      <circle cx="161" cy="78" r="14" fill="#334155" />
                      <circle cx="161" cy="78" r="6" fill="#475569" />
                      {/* High-five sparkle lines */}
                      <path d="M107 40L110 31" stroke="#1E293B" strokeWidth="2.2" strokeLinecap="round" />
                      <path d="M115 44L121 37" stroke="#1E293B" strokeWidth="2.2" strokeLinecap="round" />
                      <path d="M119 52L126 50" stroke="#1E293B" strokeWidth="2.2" strokeLinecap="round" />
                      {/* Computer hand reaching out */}
                      <path
                        d="M128 84C118 82 112 72 109 62C108 58 112 56 115 59L122 68"
                        stroke="#1E293B"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        fill="#FFFFFF"
                      />
                      {/* Person curly hair */}
                      <circle cx="48" cy="36" r="14" fill="#0F172A" />
                      <circle cx="62" cy="28" r="14" fill="#0F172A" />
                      <circle cx="75" cy="34" r="12" fill="#0F172A" />
                      <circle cx="44" cy="49" r="10" fill="#0F172A" />
                      {/* Person head */}
                      <ellipse cx="64" cy="52" rx="14" ry="16" fill="#F97316" />
                      {/* Smile & eyes */}
                      <circle cx="69" cy="49" r="1.8" fill="#0F172A" />
                      <circle cx="76" cy="48" r="1.6" fill="#0F172A" />
                      <path
                        d="M66 57C68.5 60 73.5 60 76 57"
                        stroke="#0F172A"
                        strokeWidth="2"
                        strokeLinecap="round"
                      />
                      {/* Neck */}
                      <rect x="57" y="66" width="11" height="10" rx="4" fill="#EA580C" />
                      {/* Shirt (White tee with sleeves) */}
                      <path
                        d="M36 92C38 79 48 74 62 74C75 74 84 79 88 90L94 128H32L36 92Z"
                        fill="#FFFFFF"
                        stroke="#1E293B"
                        strokeWidth="2.2"
                        strokeLinejoin="round"
                      />
                      {/* Right arm raised to high-five */}
                      <path
                        d="M84 96C95 92 104 80 107 64"
                        stroke="#F97316"
                        strokeWidth="12"
                        strokeLinecap="round"
                      />
                      <circle cx="107" cy="60" r="6.5" fill="#F97316" />
                      {/* Left arm bent cheerfully */}
                      <path
                        d="M42 94C36 105 42 115 54 114"
                        stroke="#1E293B"
                        strokeWidth="2.2"
                        strokeLinecap="round"
                      />
                    </svg>
                  </div>
                </div>

                {/* Banner Card 2: CORETAX PEDIA Warm Yellow Card */}
                <div className="bg-[#FEF9E2] border border-[#F5D67B] rounded-[16px] p-6 sm:p-7 flex flex-col sm:flex-row items-start sm:items-center gap-6">
                  {/* CORETAX PEDIA Brand Lockup */}
                  <div className="shrink-0 flex flex-col items-center sm:items-end justify-center sm:w-[195px]">
                    <img
                      src={DEFAULT_CORETAX_LOGO_URL}
                      alt="CORETAX"
                      className="h-9 sm:h-10 w-auto object-contain"
                    />
                    <span className="mt-1 inline-block px-3.5 py-0.5 rounded-[4px] bg-[#FACC15] text-[#DC2626] font-display font-black text-[12px] tracking-[0.26em] uppercase shadow-2xs">
                      PEDIA
                    </span>
                  </div>

                  {/* Text & CTA */}
                  <div className="space-y-1.5 flex-1">
                    <h2 className="font-display font-bold text-[19px] sm:text-[21px] text-[#1B2958]">
                      Belum familiar dengan <span className="font-black">Coretax?</span>
                    </h2>
                    <p className="text-[13.5px] text-[#475569] leading-relaxed">
                      Pelajari semua fitur lewat panduan dan FAQ di Coretaxpedia.
                    </p>
                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={() =>
                          setInfoModal({
                            title: 'Coretaxpedia — Panduan Simulasi KelasBrevet',
                            subtitle:
                              'Ringkasan modul aktif dan alur latihan perpajakan yang tersedia di Simulasi Coretax KelasBrevet:',
                            bullets: [
                              'e-Faktur: Pembuatan Faktur Pajak Keluaran (DPP Nilai Lain 11/12 & PPN 12% PMK 131/2024), Tanda Tangan Elektronik, Faktur Pengganti, Pembatalan, Pajak Masukan, dan Retur.',
                              'eBUPOT: Bukti Potong BPMP (TER PP 58/2023), BP 21, BP A1/A2, BPPU PPh 23 Unifikasi, TTE massal, serta impor XML.',
                              'SPT: Wizard Konsep SPT Masa PPN, SPT Masa PPh 21/26 & Unifikasi, SPT Tahunan OP, dan SPT Tahunan PPh Badan hingga cetak BPE.',
                              'Pembayaran: Pembuatan Kode Billing mandiri, pembayaran simulasi NTPN, daftar tagihan, dan Deposit Pajak.',
                            ],
                            actionLabel: 'Buka Soal Latihan',
                            onAction: () => {
                              setInfoModal(null);
                              onOpenExamDrawer();
                            },
                          })
                        }
                        className="inline-flex items-center gap-2 text-[13.5px] font-bold text-[#1B2958] hover:text-[#B45309] transition cursor-pointer group"
                      >
                        <span>Buka Coretaxpedia</span>
                        <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                      </button>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              /* PENGUMUMAN TERBARU TAB VIEW */
              <div className="space-y-4">
                <div className="bg-[#F5F7FB] border border-[#E2E8F0] rounded-[16px] p-6 space-y-2.5">
                  <div className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[#1E2C5E] bg-[#FEF3C7] px-2.5 py-1 rounded-md">
                    <Sparkles className="w-3.5 h-3.5 text-[#D97706]" />
                    <span>Pembaruan Simulasi</span>
                  </div>
                  <h2 className="font-display font-extrabold text-[19px] text-[#1B2958]">
                    4 Modul Utama Simulasi Coretax KelasBrevet Siap Digunakan
                  </h2>
                  <p className="text-[13px] text-[#475569] leading-relaxed">
                    Peserta dapat langsung mempraktikkan alur <strong>e-Faktur</strong>,{' '}
                    <strong>eBUPOT</strong>, <strong>SPT</strong>, dan <strong>Pembayaran</strong>{' '}
                    sesuai tampilan dan ketentuan terbaru PMK 131/2024 serta PP 58/2023. Menu
                    lainnya (Portal Saya, Buku Besar, Layanan WP, dan Manajemen Akses) saat ini
                    masih dalam tahap pengembangan.
                  </p>
                  <div className="pt-1 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => onNavigate('efaktur', 'dashboard')}
                      className="px-3.5 py-2 rounded-lg bg-[#1E2C5E] hover:bg-[#152048] text-white text-xs font-bold transition cursor-pointer"
                    >
                      Buka e-Faktur
                    </button>
                    <button
                      type="button"
                      onClick={() => onNavigate('ebupot', 'empty')}
                      className="px-3.5 py-2 rounded-lg bg-white border border-slate-300 hover:bg-slate-50 text-[#1E2C5E] text-xs font-bold transition cursor-pointer"
                    >
                      Buka eBUPOT
                    </button>
                    <button
                      type="button"
                      onClick={() => onNavigate('spt', 'konsep')}
                      className="px-3.5 py-2 rounded-lg bg-white border border-slate-300 hover:bg-slate-50 text-[#1E2C5E] text-xs font-bold transition cursor-pointer"
                    >
                      Buka SPT
                    </button>
                  </div>
                </div>

                <div className="bg-[#FEF9E2] border border-[#F5D67B] rounded-[16px] p-6 space-y-2">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-[#B45309]">
                    Tips Latihan Peserta
                  </div>
                  <h3 className="font-display font-bold text-[17px] text-[#1B2958]">
                    Gunakan Fitur Akun Perwakilan untuk Latihan WP Badan / PKP
                  </h3>
                  <p className="text-[13px] text-[#475569] leading-relaxed">
                    Klik kotak akun di pojok kanan atas untuk berpindah antara{' '}
                    <strong>Akun Utama</strong> dan <strong>Akun Perwakilan</strong>{' '}
                    sesuai kebutuhan studi kasus pelatihan Brevet Anda.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* =================================================================== */}
      {/* BOTTOM EDUCATION BAR: Layanan Edukasi Perpajakan (Exact Match)      */}
      {/* =================================================================== */}
      <section className="bg-white border border-[#E5EAF2] rounded-[16px] shadow-[0_6px_24px_rgba(30,44,94,0.05)] px-5 py-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 items-center">
          {/* Col 1: Title Block */}
          <div className="flex items-start gap-3 pr-2 xl:border-r xl:border-[#F1F5F9]">
            <div className="w-9 h-9 rounded-xl bg-[#FEF9E2] border border-[#FDE68A] text-[#1B2958] flex items-center justify-center shrink-0 mt-0.5">
              <GraduationCap className="w-[18px] h-[18px]" />
            </div>
            <div className="min-w-0">
              <div className="font-display font-bold text-[12.5px] text-[#1B2958] leading-snug">
                Layanan Edukasi Perpajakan
              </div>
              <p className="text-[11px] text-[#64748B] leading-snug mt-0.5">
                Akses materi pembelajaran, ajukan permohonan kegiatan edukasi, dan lihat jadwal kegiatan edukasi.
              </p>
            </div>
          </div>

          {/* Col 2: Materi Edukasi Umum */}
          <button
            type="button"
            onClick={onOpenExamDrawer}
            className="flex items-center justify-between gap-3 p-2.5 -m-1 rounded-xl hover:bg-[#F8FAFC] transition text-left cursor-pointer group"
          >
            <div className="flex items-start gap-3 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-[#FEF9E2] text-[#1B2958] flex items-center justify-center shrink-0 mt-0.5">
                <BookOpen className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="font-display font-bold text-[12.5px] text-[#1B2958] leading-snug group-hover:text-[#1D4ED8] transition">
                  Materi Edukasi Umum
                </div>
                <p className="text-[11px] text-[#64748B] leading-snug mt-0.5">
                  Artikel, panduan, dan materi pembelajaran perpajakan untuk umum.
                </p>
              </div>
            </div>
            <span className="w-6 h-6 rounded-full border border-[#CBD5E1] group-hover:border-[#1B2958] group-hover:bg-[#1B2958] group-hover:text-white text-[#1B2958] flex items-center justify-center shrink-0 transition">
              <ArrowRight className="w-3.5 h-3.5" />
            </span>
          </button>

          {/* Col 3: Permohonan Edukasi */}
          <button
            type="button"
            onClick={() =>
              setInfoModal({
                title: 'Permohonan Edukasi Perpajakan',
                subtitle: 'Layanan pengajuan kegiatan edukasi & pelatihan perpajakan bersama KelasBrevet.',
                bullets: [
                  'Program Brevet Pajak A & B Terpadu dengan simulasi praktik Coretax penuh.',
                  'In-house training pelaporan e-Faktur PMK 131/2024, eBUPOT PP 58/2023, dan SPT Tahunan.',
                  'Hubungi tim layanan peserta KelasBrevet melalui kontak pada bagian bawah halaman ini.',
                ],
              })
            }
            className="flex items-center justify-between gap-3 p-2.5 -m-1 rounded-xl hover:bg-[#F8FAFC] transition text-left cursor-pointer group"
          >
            <div className="flex items-start gap-3 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-[#FEF9E2] text-[#1B2958] flex items-center justify-center shrink-0 mt-0.5">
                <Send className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="font-display font-bold text-[12.5px] text-[#1B2958] leading-snug group-hover:text-[#1D4ED8] transition">
                  Permohonan Edukasi
                </div>
                <p className="text-[11px] text-[#64748B] leading-snug mt-0.5">
                  Ajukan permohonan kegiatan sosialisasi atau kelas edukasi perpajakan.
                </p>
              </div>
            </div>
            <span className="w-6 h-6 rounded-full border border-[#CBD5E1] group-hover:border-[#1B2958] group-hover:bg-[#1B2958] group-hover:text-white text-[#1B2958] flex items-center justify-center shrink-0 transition">
              <ArrowRight className="w-3.5 h-3.5" />
            </span>
          </button>

          {/* Col 4: Jadwal Kegiatan Edukasi */}
          <button
            type="button"
            onClick={() =>
              setInfoModal({
                title: 'Jadwal Kegiatan Edukasi',
                subtitle: 'Agenda sesi praktik dan bimbingan simulasi Coretax KelasBrevet:',
                bullets: [
                  'Sesi Praktik e-Faktur & SPT Masa PPN (PMK 131/2024) — Tersedia setiap pekan.',
                  'Sesi Praktik eBUPOT PPh 21 (TER PP 58/2023) & Unifikasi PPh 23 — Tersedia setiap pekan.',
                  'Klinik Pelaporan SPT Tahunan Orang Pribadi & PPh Badan — Akses 24/7 melalui simulator ini.',
                ],
              })
            }
            className="flex items-center justify-between gap-3 p-2.5 -m-1 rounded-xl hover:bg-[#F8FAFC] transition text-left cursor-pointer group"
          >
            <div className="flex items-start gap-3 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-[#FEF9E2] text-[#1B2958] flex items-center justify-center shrink-0 mt-0.5">
                <Calendar className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="font-display font-bold text-[12.5px] text-[#1B2958] leading-snug group-hover:text-[#1D4ED8] transition">
                  Jadwal Kegiatan Edukasi
                </div>
                <p className="text-[11px] text-[#64748B] leading-snug mt-0.5">
                  Jadwal sosialisasi, kelas pajak, dan kegiatan edukasi lainnya.
                </p>
              </div>
            </div>
            <span className="w-6 h-6 rounded-full border border-[#CBD5E1] group-hover:border-[#1B2958] group-hover:bg-[#1B2958] group-hover:text-white text-[#1B2958] flex items-center justify-center shrink-0 transition">
              <ArrowRight className="w-3.5 h-3.5" />
            </span>
          </button>
        </div>
      </section>

      {/* Info / Coretaxpedia Modal (Portaled to document.body above sticky navbar) */}
      {infoModal &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            className="fixed inset-0 z-[100] bg-slate-900/55 backdrop-blur-[2px] flex items-center justify-center p-4"
            onClick={() => setInfoModal(null)}
          >
            <div
              className="w-full max-w-lg bg-white rounded-2xl border border-[#E2E8F0] shadow-[0_24px_60px_rgba(15,23,42,0.28)] overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-6 py-4 bg-[#1E2C5E] text-white flex items-center justify-between gap-3">
                <h3 className="font-display font-bold text-base">{infoModal.title}</h3>
                <button
                  type="button"
                  onClick={() => setInfoModal(null)}
                  className="p-1 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition cursor-pointer"
                  aria-label="Tutup"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="p-6 space-y-4 text-xs text-slate-600">
                <p className="text-[13px] text-slate-700 leading-relaxed">{infoModal.subtitle}</p>
                <ul className="space-y-2.5">
                  {infoModal.bullets.map((item, idx) => (
                    <li
                      key={idx}
                      className="flex items-start gap-2.5 bg-[#F8FAFC] border border-slate-200/80 rounded-xl p-3 text-[12.5px] leading-relaxed text-slate-700"
                    >
                      <span className="w-5 h-5 rounded-full bg-[#FEF3C7] text-[#B45309] font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                        {idx + 1}
                      </span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
                <div className="pt-2 flex items-center justify-end gap-2.5">
                  {infoModal.actionLabel && infoModal.onAction && (
                    <button
                      type="button"
                      onClick={infoModal.onAction}
                      className="px-4 py-2 rounded-lg bg-[#1E2C5E] hover:bg-[#152048] text-white font-bold text-xs transition cursor-pointer"
                    >
                      {infoModal.actionLabel}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setInfoModal(null)}
                    className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition cursor-pointer"
                  >
                    Tutup
                  </button>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};
