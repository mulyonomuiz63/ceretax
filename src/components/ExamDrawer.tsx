import React, { useEffect, useState } from 'react';
import {
  BookOpen,
  Building2,
  ChevronRight,
  Download,
  FileText,
  Info,
  Loader2,
  User,
  X,
} from 'lucide-react';
import { ExamQuestion } from '../types/tax.ts';
import { createDefaultExamQuestions } from '../lib/evaluationService.ts';

interface ExamDrawerProps {
  open: boolean;
  onClose: () => void;
  onNavigateAndSwitch: (
    accountMode: 'INDIVIDUAL' | 'CORPORATE',
    module: string,
    subTab?: string
  ) => void;
}

export const ExamDrawer: React.FC<ExamDrawerProps> = ({
  open,
  onClose,
  onNavigateAndSwitch,
}) => {
  const [questions, setQuestions] = useState<ExamQuestion[]>(() => createDefaultExamQuestions());
  const [selectedId, setSelectedId] = useState<string>('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    let active = true;
    setLoading(true);
    fetch('/api/questions')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!active || !data?.questions) return;
        const list: ExamQuestion[] = data.questions;
        if (list.length > 0) {
          setQuestions(list);
          setSelectedId((prev) =>
            prev && list.some((q) => q.id === prev) ? prev : list[0].id
          );
        }
      })
      .catch(() => {
        // Fallback silently to default questions
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [open]);

  if (!open) return null;

  const activeQuestion =
    questions.find((q) => q.id === selectedId) || questions[0] || null;

  const downloadUrl = activeQuestion
    ? activeQuestion.pdfUrl && /^https?:\/\//i.test(activeQuestion.pdfUrl)
      ? activeQuestion.pdfUrl
      : `/api/questions/${encodeURIComponent(activeQuestion.id)}/pdf`
    : '/api/questions/all/pdf';

  return (
    <div className="fixed inset-y-0 right-0 z-40 w-full max-w-[460px] bg-white shadow-2xl border-l border-[#CBD5E1] flex flex-col">
      {/* Header */}
      <div className="bg-[#1D2B53] text-white px-4 py-3.5 flex items-center justify-between border-b-2 border-[#F4C430]">
        <div className="flex items-center gap-2.5 min-w-0">
          <BookOpen className="w-5 h-5 text-[#F4C430] shrink-0" />
          <div className="min-w-0">
            <h3 className="font-display font-bold text-sm leading-tight truncate">
              Soal Latihan Simulasi
            </h3>
            <p className="text-[11px] text-slate-300 truncate">
              Panduan Studi Kasus Resmi KelasBrevet ({questions.length} Soal)
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-slate-300 hover:text-white p-1 cursor-pointer shrink-0"
          aria-label="Tutup panel soal latihan"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Question Selector Strip (Read-Only — No Scores / No Pass-Fail) */}
      {questions.length > 0 && (
        <div className="p-3 bg-[#F8FAFC] border-b border-slate-200 flex items-center gap-1.5 overflow-x-auto">
          {questions.map((q, idx) => {
            const isSelected = activeQuestion?.id === q.id;
            return (
              <button
                key={q.id}
                type="button"
                onClick={() => setSelectedId(q.id)}
                className={`px-3 py-2 rounded-lg text-center border transition cursor-pointer shrink-0 whitespace-nowrap ${
                  isSelected
                    ? 'bg-[#1D2B53] text-white border-[#1D2B53] shadow-sm'
                    : 'bg-white text-slate-700 border-slate-200 hover:border-[#1D2B53]'
                }`}
              >
                <div className="text-[11px] font-bold">Soal {idx + 1}</div>
              </button>
            );
          })}
        </div>
      )}

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {loading && questions.length === 0 ? (
          <div className="py-12 flex flex-col items-center justify-center text-slate-500 gap-2 text-xs">
            <Loader2 className="w-5 h-5 animate-spin text-[#1D2B53]" />
            <span>Memuat daftar soal latihan...</span>
          </div>
        ) : !activeQuestion ? (
          <div className="py-12 text-center text-xs text-slate-500">
            Belum ada soal latihan aktif yang tersedia.
          </div>
        ) : (
          <>
            <div className="border border-[#D9E0E8] rounded-xl p-4 bg-white space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2 text-[11px]">
                <span className="font-bold text-[#1D2B53]">{activeQuestion.moduleTag}</span>
                <span className="inline-flex items-center gap-1 font-semibold text-slate-600">
                  {activeQuestion.accountMode === 'CORPORATE' ? (
                    <>
                      <Building2 className="w-3.5 h-3.5 text-[#1D2B53]" />
                      <span>Akun Impersonate PKP</span>
                    </>
                  ) : (
                    <>
                      <User className="w-3.5 h-3.5 text-[#1D2B53]" />
                      <span>Akun Orang Pribadi</span>
                    </>
                  )}
                </span>
              </div>

              <h4 className="font-display font-bold text-[15px] text-[#1D2B53] leading-snug">
                {activeQuestion.title}
              </h4>
              <p className="text-xs text-slate-600 leading-relaxed">{activeQuestion.summary}</p>

              <div className="pt-1 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    onNavigateAndSwitch(
                      activeQuestion.accountMode,
                      activeQuestion.targetModule || 'portal',
                      activeQuestion.targetSubTab
                    );
                  }}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 text-xs font-bold bg-[#EEF2FA] hover:bg-[#E2E8F0] text-[#1D2B53] py-2 px-3 rounded-lg border border-[#CBD5E1] cursor-pointer whitespace-nowrap"
                >
                  <span>Buka Menu Modul</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
                <a
                  href={downloadUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-1.5 text-xs font-bold bg-[#1D2B53] hover:bg-[#273A6E] text-white py-2 px-3 rounded-lg cursor-pointer whitespace-nowrap"
                >
                  <Download className="w-3.5 h-3.5 text-[#F4C430]" />
                  <span>Unduh PDF</span>
                </a>
              </div>
            </div>

            {/* Step-by-Step Instructions */}
            <div>
              <h5 className="text-xs font-bold text-slate-700 mb-2.5">
                Langkah Pengerjaan Studi Kasus
              </h5>
              {activeQuestion.instructions.length === 0 ? (
                <div className="text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-lg p-3">
                  Ikuti instruksi pada dokumen PDF soal latihan.
                </div>
              ) : (
                <ol className="space-y-2">
                  {activeQuestion.instructions.map((step, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-2.5 text-xs text-slate-700 bg-slate-50 border border-slate-200 rounded-lg p-3 leading-relaxed"
                    >
                      <span className="w-5 h-5 rounded bg-[#1D2B53] text-[#F4C430] font-bold text-[11px] flex items-center justify-center shrink-0">
                        {i + 1}
                      </span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ol>
              )}
            </div>

            {/* Read-only policy notice */}
            <div className="bg-[#F8FAFC] border border-slate-200 rounded-xl p-3.5 flex items-start gap-2.5 text-[11.5px] text-slate-600 leading-relaxed">
              <Info className="w-4 h-4 text-[#1D2B53] shrink-0 mt-0.5" />
              <div>
                <strong className="text-[#1D2B53]">Informasi Penilaian:</strong> Panel ini hanya menampilkan soal latihan. Hasil nilai dan status kelulusan Anda dapat dilihat langsung melalui halaman akun peserta di{' '}
                <strong className="text-[#1D2B53]">kelasbrevet.com</strong>.
              </div>
            </div>
          </>
        )}
      </div>

      {/* Footer: Download Complete PDF Booklet Only (No Evaluation / No Score Buttons) */}
      <div className="p-3.5 bg-[#F8FAFC] border-t border-slate-200 flex items-center justify-between gap-2">
        <a
          href="/api/questions/all/pdf"
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-bold bg-[#1D2B53] hover:bg-[#273A6E] text-white rounded-lg shadow-sm cursor-pointer"
        >
          <FileText className="w-4 h-4 text-[#F4C430]" />
          <span>Unduh Semua Soal Latihan (PDF)</span>
        </a>
      </div>
    </div>
  );
};
