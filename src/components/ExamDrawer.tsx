import React, { useState } from 'react';
import {
  Award,
  Building2,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  RotateCcw,
  User,
  X,
  XCircle,
} from 'lucide-react';
import { EXAM_CASE_STUDIES } from '../data/seedData.ts';
import { ExamCaseCode, ExamEvaluation } from '../types/tax.ts';

interface ExamDrawerProps {
  open: boolean;
  onClose: () => void;
  evaluations: Record<string, ExamEvaluation>;
  onEvaluate: (caseCode: ExamCaseCode) => Promise<void>;
  onResetWorkspace: () => Promise<void>;
  onNavigateAndSwitch: (
    accountMode: 'INDIVIDUAL' | 'CORPORATE',
    module: string,
    subTab?: string
  ) => void;
}

export const ExamDrawer: React.FC<ExamDrawerProps> = ({
  open,
  onClose,
  evaluations,
  onEvaluate,
  onResetWorkspace,
  onNavigateAndSwitch,
}) => {
  const [selectedCase, setSelectedCase] = useState<ExamCaseCode>('CASE_PPN');
  const [checking, setChecking] = useState(false);
  const [resetting, setResetting] = useState(false);

  if (!open) return null;

  const activeMeta = EXAM_CASE_STUDIES.find((c) => c.code === selectedCase) || EXAM_CASE_STUDIES[0];
  const currentEval = evaluations[selectedCase];

  const handleCheck = async () => {
    setChecking(true);
    try {
      await onEvaluate(selectedCase);
    } finally {
      setChecking(false);
    }
  };

  const handleReset = async () => {
    setResetting(true);
    try {
      await onResetWorkspace();
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="fixed inset-y-0 right-0 z-40 w-full max-w-[440px] bg-white shadow-2xl border-l border-[#CBD5E1] flex flex-col">
      {/* Header */}
      <div className="bg-[#1D2B53] text-white px-4 py-3.5 flex items-center justify-between border-b-2 border-[#F4C430]">
        <div className="flex items-center gap-2">
          <Award className="w-5 h-5 text-[#F4C430]" />
          <div>
            <h3 className="font-display font-bold text-sm leading-tight">
              Panel Soal Latihan &amp; Cek Otomatis
            </h3>
            <p className="text-[11px] text-slate-300">
              5 Paket Studi Kasus Ujian KelasBrevet
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-slate-300 hover:text-white p-1 cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Case Selector Strip */}
      <div className="p-3 bg-[#F8FAFC] border-b border-slate-200 grid grid-cols-5 gap-1.5">
        {EXAM_CASE_STUDIES.map((cs, idx) => {
          const ev = evaluations[cs.code];
          const isSelected = cs.code === selectedCase;
          return (
            <button
              key={cs.code}
              type="button"
              onClick={() => setSelectedCase(cs.code)}
              className={`px-2 py-2 rounded text-center border transition cursor-pointer ${
                isSelected
                  ? 'bg-[#1D2B53] text-white border-[#1D2B53]'
                  : 'bg-white text-slate-700 border-slate-200 hover:border-[#1D2B53]'
              }`}
            >
              <div className="text-[10px] font-bold">Soal {idx + 1}</div>
              <div
                className={`text-[10px] font-mono-num mt-0.5 font-bold ${
                  ev
                    ? ev.score === 100
                      ? isSelected
                        ? 'text-[#F4C430]'
                        : 'text-emerald-600'
                      : isSelected
                      ? 'text-amber-300'
                      : 'text-amber-600'
                    : isSelected
                    ? 'text-slate-300'
                    : 'text-slate-400'
                }`}
              >
                {ev ? `${ev.score}%` : '--'}
              </div>
            </button>
          );
        })}
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="border border-[#D9E0E8] rounded p-3.5 bg-white">
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <span className="text-[11px] font-bold text-[#1D2B53] bg-[#FEF3C7] px-2 py-0.5 rounded">
              {activeMeta.moduleTag}
            </span>
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-600">
              {activeMeta.accountMode === 'CORPORATE' ? (
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

          <h4 className="font-display font-bold text-sm text-[#1D2B53] mt-1">
            {activeMeta.title}
          </h4>
          <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
            {activeMeta.summary}
          </p>

          <button
            type="button"
            onClick={() => {
              onNavigateAndSwitch(
                activeMeta.accountMode,
                activeMeta.targetMenu.module,
                activeMeta.targetMenu.subTab
              );
            }}
            className="mt-3 w-full inline-flex items-center justify-center gap-1.5 text-xs font-bold bg-[#EDF2F7] hover:bg-[#E2E8F0] text-[#1D2B53] py-2 px-3 rounded border border-[#CBD5E1] cursor-pointer"
          >
            <span>Buka Menu Modul &amp; Sesuaikan Akun Otomatis</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Step-by-Step Instructions */}
        <div>
          <h5 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
            Langkah Pengerjaan Studi Kasus
          </h5>
          <ol className="space-y-2">
            {activeMeta.instructions.map((step, i) => (
              <li
                key={i}
                className="flex items-start gap-2.5 text-xs text-slate-700 bg-slate-50 border border-slate-200 rounded p-2.5 leading-relaxed"
              >
                <span className="w-5 h-5 rounded bg-[#1D2B53] text-[#F4C430] font-bold text-[11px] flex items-center justify-center shrink-0">
                  {i + 1}
                </span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </div>

        {/* Live Evaluation Output */}
        {currentEval && (
          <div className="border border-[#CBD5E1] rounded overflow-hidden">
            <div
              className={`px-3.5 py-2.5 flex items-center justify-between ${
                currentEval.score === 100
                  ? 'bg-emerald-700 text-white'
                  : 'bg-[#1D2B53] text-white'
              }`}
            >
              <span className="text-xs font-bold">
                Hasil Pengecekan ({currentEval.passedCount}/{currentEval.totalChecks} Benar)
              </span>
              <span className="font-mono-num font-extrabold text-base text-[#F4C430]">
                Nilai: {currentEval.score}
              </span>
            </div>
            <div className="divide-y divide-slate-200 bg-white">
              {currentEval.checks.map((chk) => (
                <div key={chk.id} className="p-3 text-xs">
                  <div className="flex items-start gap-2">
                    {chk.passed ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1">
                      <div className="font-semibold text-slate-800">{chk.label}</div>
                      <div className="text-[11px] text-slate-600 mt-0.5">
                        Status saat ini: <strong className="font-mono-num">{chk.actualValue}</strong>
                      </div>
                      {!chk.passed && (
                        <div className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded px-2 py-1 mt-1">
                          Petunjuk: {chk.expectedHint}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Action Footer */}
      <div className="p-3.5 bg-[#F8FAFC] border-t border-slate-200 flex items-center gap-2">
        <button
          type="button"
          onClick={handleReset}
          disabled={resetting}
          className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 rounded cursor-pointer"
          title="Kembalikan data latihan ke kondisi awal"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>{resetting ? 'Reset...' : 'Reset Soal'}</span>
        </button>
        <button
          type="button"
          onClick={handleCheck}
          disabled={checking}
          className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-bold bg-[#F4C430] hover:bg-[#E0AF1A] text-[#1D2B53] rounded shadow-sm cursor-pointer"
        >
          <ClipboardCheck className="w-4 h-4" />
          <span>{checking ? 'Memeriksa...' : 'Periksa Jawaban Saya'}</span>
        </button>
      </div>
    </div>
  );
};
