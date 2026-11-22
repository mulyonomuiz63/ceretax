import {
  AdminAnalyticsSummary,
  ExamCaseCode,
  ExamQuestion,
  ModuleResultItem,
  ParticipantAccount,
  ParticipantPublicInfo,
  ParticipantResultSummary,
  WorkspaceState,
} from '../types/tax.ts';
import { EXAM_CASE_STUDIES, evaluateExamCase } from '../data/seedData.ts';

export const DEFAULT_PASSING_SCORE = 75;

export function toPublicParticipant(p: ParticipantAccount): ParticipantPublicInfo {
  const { passwordHash: _omitted, ...publicInfo } = p;
  return publicInfo;
}

export function createDefaultExamQuestions(): ExamQuestion[] {
  const now = new Date().toISOString();
  return EXAM_CASE_STUDIES.map((cs, idx) => ({
    id: `q-default-${idx + 1}`,
    code: cs.code,
    moduleTag: cs.moduleTag,
    title: cs.title,
    accountMode: cs.accountMode,
    summary: cs.summary,
    instructions: [...cs.instructions],
    pdfUrl: '',
    passingScore: DEFAULT_PASSING_SCORE,
    targetModule: cs.targetMenu.module,
    targetSubTab: cs.targetMenu.subTab,
    sortOrder: idx + 1,
    isActive: true,
    createdAt: now,
    updatedAt: now,
  }));
}

export function evaluateParticipantWorkspace(
  participant: ParticipantAccount,
  workspace: WorkspaceState
): ParticipantResultSummary {
  const passingScore = participant.passingScore || DEFAULT_PASSING_SCORE;
  const modules: ModuleResultItem[] = EXAM_CASE_STUDIES.map((cs) => {
    const ev = evaluateExamCase(workspace, cs.code);
    return {
      caseCode: cs.code,
      moduleTag: cs.moduleTag,
      title: cs.title,
      score: ev.score,
      passedCount: ev.passedCount,
      totalChecks: ev.totalChecks,
      isPassed: ev.score >= passingScore,
      checks: ev.checks,
    };
  });

  const totalScore = modules.reduce((sum, m) => sum + m.score, 0);
  const averageScore = modules.length > 0 ? Math.round(totalScore / modules.length) : 0;
  const completedModules = modules.filter((m) => m.isPassed).length;

  // Compute real student activity beyond initial seeded items
  // Seed starts with: 1 APPROVED output inv, 1 credited input inv, 1 ISSUED BPA1 slip, 0 returns, 0 billings
  const approvedInvoices = workspace.invoices.filter(
    (i) => i.direction === 'OUTPUT' && (i.status === 'APPROVED' || i.status === 'AMENDED')
  ).length;
  const creditedInputs = workspace.invoices.filter(
    (i) => i.direction === 'INPUT' && i.isCredited
  ).length;
  const issuedSlips = workspace.slips.filter(
    (s) => s.status === 'ISSUED' && s.slipType !== 'BPA1'
  ).length;
  const submittedReturns = workspace.returns.filter((r) => r.status === 'SUBMITTED').length;
  const paidBillings = workspace.billings.filter((b) => b.status === 'PAID').length;

  const extraInvoiceActions = Math.max(0, approvedInvoices - 1) + Math.max(0, creditedInputs - 1);
  const totalActions =
    extraInvoiceActions + issuedSlips + workspace.returns.length + workspace.billings.length;

  const isPassed = averageScore >= passingScore;
  let progressStatus: ParticipantResultSummary['progressStatus'] = 'NOT_STARTED';
  if (isPassed || completedModules === modules.length) {
    progressStatus = 'COMPLETED';
  } else if (totalActions > 0 || Boolean(participant.lastLoginAt)) {
    progressStatus = 'IN_PROGRESS';
  }

  return {
    participant: toPublicParticipant(participant),
    averageScore,
    passingScore,
    isPassed,
    graduationStatus: isPassed ? 'LULUS' : 'BELUM_LULUS',
    progressStatus,
    completedModules,
    totalModules: modules.length,
    activityMetrics: {
      approvedInvoices,
      issuedSlips,
      submittedReturns,
      paidBillings,
      totalActions,
    },
    modules,
    evaluatedAt: new Date().toISOString(),
  };
}

export function buildAdminAnalytics(
  results: ParticipantResultSummary[],
  questions: ExamQuestion[]
): AdminAnalyticsSummary {
  const totalParticipants = results.length;
  const passedCount = results.filter((r) => r.isPassed).length;
  const failedCount = totalParticipants - passedCount;
  const completedCount = results.filter((r) => r.progressStatus === 'COMPLETED').length;
  const activeWorkingCount = results.filter((r) => r.progressStatus === 'IN_PROGRESS').length;
  const notStartedCount = results.filter((r) => r.progressStatus === 'NOT_STARTED').length;

  const passRatePercent =
    totalParticipants > 0 ? Math.round((passedCount / totalParticipants) * 100) : 0;
  const averageScore =
    totalParticipants > 0
      ? Math.round(results.reduce((s, r) => s + r.averageScore, 0) / totalParticipants)
      : 0;

  const moduleBreakdown = EXAM_CASE_STUDIES.map((cs) => {
    const scores = results.map(
      (r) => r.modules.find((m) => m.caseCode === cs.code)?.score ?? 0
    );
    const modPassed = results.filter(
      (r) => r.modules.find((m) => m.caseCode === cs.code)?.isPassed
    ).length;
    const avg =
      scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
    return {
      caseCode: cs.code as ExamCaseCode,
      moduleTag: cs.moduleTag,
      title: cs.title,
      averageScore: avg,
      passedCount: modPassed,
      totalParticipants,
    };
  });

  const recentActivity = [...results]
    .sort((a, b) => {
      const timeA = a.participant.lastLoginAt || a.participant.updatedAt;
      const timeB = b.participant.lastLoginAt || b.participant.updatedAt;
      return timeB.localeCompare(timeA);
    })
    .slice(0, 12)
    .map((r) => ({
      nikKey: r.participant.nikKey,
      fullName: r.participant.fullName,
      email: r.participant.email,
      packageName: r.participant.packageName,
      averageScore: r.averageScore,
      graduationStatus: r.graduationStatus,
      progressStatus: r.progressStatus,
      submittedReturns: r.activityMetrics.submittedReturns,
      lastLoginAt: r.participant.lastLoginAt,
      updatedAt: r.participant.updatedAt,
    }));

  return {
    totalParticipants,
    activeWorkingCount,
    completedCount,
    notStartedCount,
    passedCount,
    failedCount,
    passRatePercent,
    averageScore,
    totalQuestions: questions.length,
    activeQuestions: questions.filter((q) => q.isActive).length,
    moduleBreakdown,
    recentActivity,
  };
}

export function renderQuestionPrintableHtml(
  question: ExamQuestion,
  allQuestions?: ExamQuestion[]
): string {
  const list = allQuestions && allQuestions.length > 0 ? allQuestions : [question];
  const esc = (s: string) =>
    String(s || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');

  const blocks = list
    .map(
      (q, index) => `
      <section class="card">
        <div class="meta">
          <span>${esc(q.moduleTag)}</span>
          <span>&middot;</span>
          <span>Kode: ${esc(q.code)}</span>
          <span>&middot;</span>
          <span>Mode Akun: ${q.accountMode === 'CORPORATE' ? 'Impersonate Badan / PKP' : 'Orang Pribadi'}</span>
        </div>
        <h2>${index + 1}. ${esc(q.title)}</h2>
        <p class="summary">${esc(q.summary)}</p>
        <h3>Instruksi &amp; Langkah Pengerjaan</h3>
        <ol class="steps">
          ${q.instructions.map((step) => `<li>${esc(step)}</li>`).join('')}
        </ol>
      </section>`
    )
    .join('');

  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Soal Latihan Simulasi Coretax — ${esc(allQuestions ? 'Paket Lengkap' : question.title)}</title>
  <style>
    * { box-sizing: border-box; }
    body {
      font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
      color: #0f172a;
      background: #f8fafc;
      margin: 0;
      padding: 32px 20px;
      line-height: 1.6;
    }
    .sheet {
      max-width: 820px;
      margin: 0 auto;
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 36px 40px;
    }
    .topbar {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 16px;
      border-bottom: 2px solid #1e2c5e;
      padding-bottom: 16px;
      margin-bottom: 24px;
    }
    .brand {
      font-size: 20px;
      font-weight: 800;
      color: #1e2c5e;
      letter-spacing: -0.02em;
    }
    .brand span { color: #d97706; }
    .subtitle { font-size: 13px; color: #475569; margin-top: 4px; }
    .print-btn {
      background: #1e2c5e;
      color: #ffffff;
      border: none;
      border-radius: 8px;
      padding: 10px 18px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
    }
    .card {
      padding: 18px 0;
      border-bottom: 1px solid #e2e8f0;
      page-break-inside: avoid;
    }
    .card:last-of-type { border-bottom: none; }
    .meta {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      font-size: 12px;
      color: #475569;
      font-weight: 600;
      margin-bottom: 6px;
    }
    h2 { font-size: 18px; margin: 0 0 8px; color: #0f172a; }
    h3 { font-size: 13px; text-transform: uppercase; letter-spacing: 0.04em; color: #334155; margin: 16px 0 8px; }
    .summary { font-size: 14px; color: #334155; margin: 0; }
    .steps { padding-left: 20px; margin: 0; font-size: 13.5px; color: #1e293b; }
    .steps li { margin-bottom: 8px; }
    .footer-note {
      margin-top: 24px;
      padding-top: 14px;
      border-top: 1px solid #e2e8f0;
      font-size: 12px;
      color: #64748b;
    }
    @media print {
      body { background: #ffffff; padding: 0; }
      .sheet { border: none; padding: 0; max-width: 100%; }
      .no-print { display: none !important; }
    }
  </style>
</head>
<body>
  <div class="sheet">
    <div class="topbar">
      <div>
        <div class="brand">KELAS<span>BREVET</span> &middot; Lembar Soal Simulasi Coretax</div>
        <div class="subtitle">Dokumen Latihan Resmi &mdash; Hasil nilai dan status kelulusan dilihat melalui portal kelasbrevet.com</div>
      </div>
      <button class="print-btn no-print" onclick="window.print()">Cetak / Simpan PDF</button>
    </div>
    ${blocks}
    <div class="footer-note">
      Dicetak dari Simulator Coretax KelasBrevet &middot; Kerjakan seluruh instruksi di aplikasi simulasi, lalu cek nilai dan status kelulusan Anda pada dashboard peserta di <strong>kelasbrevet.com</strong>.
    </div>
  </div>
</body>
</html>`;
}
