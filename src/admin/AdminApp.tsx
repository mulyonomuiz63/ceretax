import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  BarChart3,
  BookOpen,
  Check,
  CheckCircle2,
  Code2,
  Copy,
  Download,
  Edit3,
  Eye,
  EyeOff,
  FileDown,
  Globe,
  Image as ImageIcon,
  KeyRound,
  LogOut,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  Shield,
  ShieldCheck,
  Trash2,
  Upload,
  UserPlus,
  Users,
  X,
  XCircle,
} from 'lucide-react';
import {
  AdminAnalyticsSummary,
  AdminPublicUser,
  AdminRole,
  BrandingSettings,
  ExamQuestion,
  ParticipantResultSummary,
} from '../types/tax.ts';
import { KelasBrevetLogo } from '../components/KelasBrevetLogo.tsx';
import { DEFAULT_META_ICON_URL, setBrandingCache } from '../lib/brandingStore.ts';

type AdminTab = 'analytics' | 'participants' | 'questions' | 'admins' | 'branding' | 'integration';

const ADMIN_TOKEN_STORAGE = 'kelasbrevet_admin_console_token_v1';

interface AdminSession {
  id: string;
  email: string;
  fullName: string;
  role: string;
  dbDriver?: string;
  publicUrl?: string;
}

interface ProvisionResult {
  isNewAccount: boolean;
  credentials: {
    nik: string;
    password: string;
    simulationUrl: string;
    passphraseDjp: string;
  };
  participant: {
    fullName: string;
    email: string;
    packageName: string;
    nikKey: string;
  };
}

export const AdminApp: React.FC = () => {
  const [token, setToken] = useState<string>(() => {
    try {
      return sessionStorage.getItem(ADMIN_TOKEN_STORAGE) || '';
    } catch {
      return '';
    }
  });
  const [session, setSession] = useState<AdminSession | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(Boolean(token));

  // Login Form State
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPw, setShowLoginPw] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loginBusy, setLoginBusy] = useState(false);

  // Dashboard State
  const [activeTab, setActiveTab] = useState<AdminTab>('analytics');
  const [loadingData, setLoadingData] = useState(false);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  const [analytics, setAnalytics] = useState<AdminAnalyticsSummary | null>(null);
  const [participants, setParticipants] = useState<ParticipantResultSummary[]>([]);
  const [questions, setQuestions] = useState<ExamQuestion[]>([]);

  // Participant Filters & Modals
  const [searchParticipant, setSearchParticipant] = useState('');
  const [statusFilter, setStatusFilter] = useState<
    'ALL' | 'LULUS' | 'BELUM_LULUS' | 'NOT_STARTED' | 'KELASBREVET_API'
  >('ALL');
  const [detailTarget, setDetailTarget] = useState<{
    result: ParticipantResultSummary;
    simulationUrl: string;
  } | null>(null);
  const [addPartOpen, setAddPartOpen] = useState(false);
  const [createdCreds, setCreatedCreds] = useState<ProvisionResult | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Manual Participant Form
  const [newPartName, setNewPartName] = useState('');
  const [newPartEmail, setNewPartEmail] = useState('');
  const [newPartPhone, setNewPartPhone] = useState('');
  const [newPartNik, setNewPartNik] = useState('');
  const [newPartPackage, setNewPartPackage] = useState('Brevet A & B');
  const [newPartCompany, setNewPartCompany] = useState('');
  const [newPartPassing, setNewPartPassing] = useState(75);
  const [savingParticipant, setSavingParticipant] = useState(false);

  // Question CRUD Modal
  const [questionModalOpen, setQuestionModalOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<ExamQuestion | null>(null);
  const [qCode, setQCode] = useState('');
  const [qModuleTag, setQModuleTag] = useState('');
  const [qTitle, setQTitle] = useState('');
  const [qAccountMode, setQAccountMode] = useState<'CORPORATE' | 'INDIVIDUAL'>('CORPORATE');
  const [qTargetModule, setQTargetModule] = useState('efaktur');
  const [qTargetSubTab, setQTargetSubTab] = useState('output');
  const [qPassingScore, setQPassingScore] = useState(75);
  const [qSortOrder, setQSortOrder] = useState(1);
  const [qPdfUrl, setQPdfUrl] = useState('');
  const [qSummary, setQSummary] = useState('');
  const [qInstructionsText, setQInstructionsText] = useState('');
  const [qIsActive, setQIsActive] = useState(true);
  const [savingQuestion, setSavingQuestion] = useState(false);

  // Admin Users DB Management State
  const [adminUsers, setAdminUsers] = useState<AdminPublicUser[]>([]);
  const [adminModalOpen, setAdminModalOpen] = useState(false);
  const [editingAdminUser, setEditingAdminUser] = useState<AdminPublicUser | null>(null);
  const [admFullName, setAdmFullName] = useState('');
  const [admEmail, setAdmEmail] = useState('');
  const [admPassword, setAdmPassword] = useState('');
  const [admRole, setAdmRole] = useState<AdminRole>('ADMIN');
  const [admIsActive, setAdmIsActive] = useState(true);
  const [savingAdminUser, setSavingAdminUser] = useState(false);

  // Logo & Branding Settings State
  const [brandLogoUrl, setBrandLogoUrl] = useState('');
  const [brandMetaIconUrl, setBrandMetaIconUrl] = useState('');
  const [brandName, setBrandName] = useState('KelasBrevet');
  const [brandUpdatedAt, setBrandUpdatedAt] = useState('');
  const [savingBranding, setSavingBranding] = useState(false);

  // Integration Simulator Form
  const [simExtId, setSimExtId] = useState('KB-USR-2026-001');
  const [simName, setSimName] = useState('Rizky Pratama');
  const [simEmail, setSimEmail] = useState('rizky.pratama@kelasbrevet.com');
  const [simPhone, setSimPhone] = useState('081234567890');
  const [simPackage, setSimPackage] = useState('Brevet A & B Terpadu');
  const [simResult, setSimResult] = useState<ProvisionResult | null>(null);
  const [simRunning, setSimRunning] = useState(false);

  const showToast = useCallback((msg: string) => {
    setSuccessToast(msg);
    window.setTimeout(() => {
      setSuccessToast((prev) => (prev === msg ? null : prev));
    }, 4000);
  }, []);

  const copyText = (key: string, text: string) => {
    navigator.clipboard?.writeText(text).catch(() => {});
    setCopiedField(key);
    window.setTimeout(() => setCopiedField(null), 1800);
  };

  const adminFetch = useCallback(
    async <T,>(url: string, options?: RequestInit): Promise<T> => {
      const resp = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          ...(options?.headers || {}),
        },
      });
      const data = await resp.json().catch(() => ({}));
      if (resp.status === 401) {
        try {
          sessionStorage.removeItem(ADMIN_TOKEN_STORAGE);
        } catch {}
        setToken('');
        setSession(null);
        throw new Error(data.error || 'Sesi Admin telah berakhir.');
      }
      if (!resp.ok) {
        throw new Error(data.error || 'Permintaan gagal diproses.');
      }
      return data as T;
    },
    [token]
  );

  const loadAllData = useCallback(async () => {
    if (!token) return;
    setLoadingData(true);
    setErrorBanner(null);
    try {
      const [anRes, partRes, qRes, admRes, brandRes] = await Promise.all([
        adminFetch<{ analytics: AdminAnalyticsSummary }>('/api/admin/analytics'),
        adminFetch<{ participants: ParticipantResultSummary[] }>('/api/admin/participants'),
        adminFetch<{ questions: ExamQuestion[] }>('/api/admin/questions'),
        adminFetch<{ admins: AdminPublicUser[] }>('/api/admin/users'),
        fetch('/api/branding').then((r) => (r.ok ? r.json() : null)),
      ]);
      setAnalytics(anRes.analytics);
      setParticipants(partRes.participants);
      setQuestions(qRes.questions);
      setAdminUsers(admRes.admins || []);
      if (brandRes?.branding) {
        const b: BrandingSettings = brandRes.branding;
        setBrandLogoUrl(b.logoUrl || '');
        setBrandMetaIconUrl(b.metaIconUrl || '');
        setBrandName(b.brandName || 'KelasBrevet');
        setBrandUpdatedAt(b.updatedAt || '');
        setBrandingCache(b);
      }
    } catch (err: any) {
      setErrorBanner(err?.message || 'Gagal memuat data konsol admin.');
    } finally {
      setLoadingData(false);
    }
  }, [token, adminFetch]);

  // Verify existing admin token on mount
  useEffect(() => {
    if (!token) {
      setCheckingAuth(false);
      return;
    }
    let active = true;
    setCheckingAuth(true);
    fetch('/api/admin/me', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!active) return;
        if (data?.ok && data.admin) {
          setSession({
            id: data.admin.id || '',
            email: data.admin.email,
            fullName: data.admin.fullName || 'Administrator',
            role: data.admin.role,
            dbDriver: data.dbDriver,
            publicUrl: data.publicUrl,
          });
        } else {
          try {
            sessionStorage.removeItem(ADMIN_TOKEN_STORAGE);
          } catch {}
          setToken('');
          setSession(null);
        }
      })
      .catch(() => {
        if (active) setSession(null);
      })
      .finally(() => {
        if (active) setCheckingAuth(false);
      });
    return () => {
      active = false;
    };
  }, [token]);

  useEffect(() => {
    if (session && token) {
      loadAllData();
    }
  }, [session, token, loadAllData]);

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setLoginBusy(true);
    try {
      const resp = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail.trim(), password: loginPassword }),
      });
      const data = await resp.json();
      if (!resp.ok) {
        setLoginError(data.error || 'Email atau kata sandi tidak valid.');
        return;
      }
      try {
        sessionStorage.setItem(ADMIN_TOKEN_STORAGE, data.token);
      } catch {}
      setToken(data.token);
      setSession({
        id: data.admin.id || '',
        email: data.admin.email,
        fullName: data.admin.fullName || 'Administrator',
        role: data.admin.role,
      });
      setLoginPassword('');
    } catch {
      setLoginError('Tidak dapat terhubung ke server.');
    } finally {
      setLoginBusy(false);
    }
  };

  const handleLogout = () => {
    try {
      sessionStorage.removeItem(ADMIN_TOKEN_STORAGE);
    } catch {}
    setToken('');
    setSession(null);
    setAnalytics(null);
    setParticipants([]);
    setQuestions([]);
    setAdminUsers([]);
  };

  // === Admin Users CRUD Handlers ===
  const openNewAdminModal = () => {
    setEditingAdminUser(null);
    setAdmFullName('');
    setAdmEmail('');
    setAdmPassword('');
    setAdmRole('ADMIN');
    setAdmIsActive(true);
    setAdminModalOpen(true);
  };

  const openEditAdminModal = (adm: AdminPublicUser) => {
    setEditingAdminUser(adm);
    setAdmFullName(adm.fullName);
    setAdmEmail(adm.email);
    setAdmPassword('');
    setAdmRole(adm.role);
    setAdmIsActive(adm.isActive);
    setAdminModalOpen(true);
  };

  const handleSaveAdminUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingAdminUser(true);
    setErrorBanner(null);
    try {
      const payload: Record<string, any> = {
        fullName: admFullName.trim(),
        email: admEmail.trim().toLowerCase(),
        role: admRole,
        isActive: admIsActive,
      };
      if (admPassword.trim()) {
        payload.password = admPassword;
      }
      if (editingAdminUser) {
        await adminFetch(`/api/admin/users/${encodeURIComponent(editingAdminUser.id)}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
        showToast(`Akun admin ${payload.email} berhasil diperbarui di database.`);
      } else {
        await adminFetch('/api/admin/users', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        showToast(`Akun admin baru ${payload.email} berhasil ditambahkan ke database.`);
      }
      setAdminModalOpen(false);
      await loadAllData();
    } catch (err: any) {
      setErrorBanner(err?.message || 'Gagal menyimpan akun admin.');
    } finally {
      setSavingAdminUser(false);
    }
  };

  const handleDeleteAdminUser = async (adm: AdminPublicUser) => {
    setErrorBanner(null);
    try {
      await adminFetch(`/api/admin/users/${encodeURIComponent(adm.id)}`, {
        method: 'DELETE',
      });
      showToast(`Akun admin ${adm.email} telah dihapus dari database.`);
      await loadAllData();
    } catch (err: any) {
      setErrorBanner(err?.message || 'Gagal menghapus akun admin.');
    }
  };

  // === Branding / Logo & Meta Icon Upload Handlers ===
  const handleLogoFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setErrorBanner('File harus berupa gambar (PNG, JPG, SVG, atau WebP).');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setErrorBanner('Ukuran gambar maksimal 2 MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setBrandLogoUrl(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleMetaIconFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const isIco = file.name.toLowerCase().endsWith('.ico');
    if (!file.type.startsWith('image/') && !isIco) {
      setErrorBanner('File Icon Meta harus berupa gambar (PNG, ICO, SVG, JPG, atau WebP).');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setErrorBanner('Ukuran Icon Meta maksimal 2 MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        let result = reader.result;
        if (isIco && result.startsWith('data:application/octet-stream;')) {
          result = result.replace('data:application/octet-stream;', 'data:image/x-icon;');
        }
        setBrandMetaIconUrl(result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSaveBranding = async (overrides?: {
    logoUrl?: string;
    metaIconUrl?: string;
    toastMessage?: string;
  }) => {
    setSavingBranding(true);
    setErrorBanner(null);
    try {
      const targetLogoUrl =
        overrides?.logoUrl !== undefined ? overrides.logoUrl : brandLogoUrl.trim();
      const targetMetaIconUrl =
        overrides?.metaIconUrl !== undefined ? overrides.metaIconUrl : brandMetaIconUrl.trim();
      const res = await adminFetch<{ branding: BrandingSettings }>('/api/admin/branding', {
        method: 'PUT',
        body: JSON.stringify({
          logoUrl: targetLogoUrl,
          metaIconUrl: targetMetaIconUrl,
          brandName: brandName.trim() || 'KelasBrevet',
        }),
      });
      setBrandLogoUrl(res.branding.logoUrl || '');
      setBrandMetaIconUrl(res.branding.metaIconUrl || '');
      setBrandName(res.branding.brandName || 'KelasBrevet');
      setBrandUpdatedAt(res.branding.updatedAt || '');
      setBrandingCache(res.branding);
      showToast(
        overrides?.toastMessage ||
          'Pengaturan Logo & Icon Meta berhasil disimpan ke database dan langsung diterapkan.'
      );
    } catch (err: any) {
      setErrorBanner(err?.message || 'Gagal menyimpan pengaturan branding.');
    } finally {
      setSavingBranding(false);
    }
  };

  const filteredParticipants = useMemo(() => {
    return participants.filter((row) => {
      if (statusFilter === 'LULUS' && !row.isPassed) return false;
      if (statusFilter === 'BELUM_LULUS' && row.isPassed) return false;
      if (statusFilter === 'NOT_STARTED' && row.progressStatus !== 'NOT_STARTED') return false;
      if (statusFilter === 'KELASBREVET_API' && row.participant.source !== 'KELASBREVET_API') {
        return false;
      }
      if (searchParticipant.trim()) {
        const q = searchParticipant.toLowerCase();
        return (
          row.participant.fullName.toLowerCase().includes(q) ||
          row.participant.nikKey.includes(q) ||
          row.participant.email.toLowerCase().includes(q) ||
          row.participant.packageName.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [participants, statusFilter, searchParticipant]);

  const openParticipantDetail = async (nikKey: string) => {
    try {
      const data = await adminFetch<{
        result: ParticipantResultSummary;
        simulationUrl: string;
      }>(`/api/admin/participants/${encodeURIComponent(nikKey)}/detail`);
      setDetailTarget(data);
    } catch (err: any) {
      setErrorBanner(err?.message || 'Gagal memuat detail peserta.');
    }
  };

  const handleCreateParticipant = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingParticipant(true);
    try {
      const data = await adminFetch<ProvisionResult>('/api/admin/participants', {
        method: 'POST',
        body: JSON.stringify({
          fullName: newPartName,
          email: newPartEmail,
          phone: newPartPhone,
          nik: newPartNik || undefined,
          packageName: newPartPackage,
          companyName: newPartCompany || undefined,
          passingScore: newPartPassing,
        }),
      });
      setCreatedCreds(data);
      setNewPartName('');
      setNewPartEmail('');
      setNewPartPhone('');
      setNewPartNik('');
      setNewPartCompany('');
      showToast('Akun peserta berhasil dibuat.');
      loadAllData();
    } catch (err: any) {
      setErrorBanner(err?.message || 'Gagal membuat akun peserta.');
    } finally {
      setSavingParticipant(false);
    }
  };

  const handleResetParticipant = async (nikKey: string, fullName: string) => {
    try {
      await adminFetch(`/api/admin/participants/${encodeURIComponent(nikKey)}/reset`, {
        method: 'POST',
      });
      showToast(`Workspace latihan ${fullName} berhasil direset.`);
      await loadAllData();
      if (detailTarget?.result.participant.nikKey === nikKey) {
        await openParticipantDetail(nikKey);
      }
    } catch (err: any) {
      setErrorBanner(err?.message || 'Gagal mereset workspace peserta.');
    }
  };

  const handleDeleteParticipant = async (nikKey: string, fullName: string) => {
    try {
      await adminFetch(`/api/admin/participants/${encodeURIComponent(nikKey)}`, {
        method: 'DELETE',
      });
      showToast(`Peserta ${fullName} dihapus.`);
      if (detailTarget?.result.participant.nikKey === nikKey) {
        setDetailTarget(null);
      }
      await loadAllData();
    } catch (err: any) {
      setErrorBanner(err?.message || 'Gagal menghapus peserta.');
    }
  };

  const handleToggleParticipantActive = async (nikKey: string, nextActive: boolean) => {
    try {
      await adminFetch(`/api/admin/participants/${encodeURIComponent(nikKey)}`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive: nextActive }),
      });
      showToast(nextActive ? 'Akun peserta diaktifkan.' : 'Akun peserta dinonaktifkan.');
      await loadAllData();
      await openParticipantDetail(nikKey);
    } catch (err: any) {
      setErrorBanner(err?.message || 'Gagal memperbarui status peserta.');
    }
  };

  const handleRegeneratePassword = async (nikKey: string) => {
    try {
      await adminFetch(`/api/admin/participants/${encodeURIComponent(nikKey)}`, {
        method: 'PATCH',
        body: JSON.stringify({ regeneratePassword: true }),
      });
      showToast('Kata sandi baru peserta berhasil dibuat.');
      await loadAllData();
      await openParticipantDetail(nikKey);
    } catch (err: any) {
      setErrorBanner(err?.message || 'Gagal mereset kata sandi peserta.');
    }
  };

  const handleExportCsv = () => {
    const header = [
      'Nama Peserta',
      'Email',
      'ID Akun (NIK)',
      'Paket Brevet',
      'Sumber',
      'Nilai Rata-Rata',
      'KKM',
      'Status Kelulusan',
      'Progres',
      'SPT Dilaporkan',
      'Login Terakhir',
    ];
    const rows = filteredParticipants.map((r) => [
      `"${r.participant.fullName.replace(/"/g, '""')}"`,
      `"${r.participant.email}"`,
      `="${r.participant.nikKey}"`,
      `"${r.participant.packageName}"`,
      r.participant.source,
      r.averageScore,
      r.passingScore,
      r.graduationStatus,
      r.progressStatus,
      r.activityMetrics.submittedReturns,
      r.participant.lastLoginAt || '-',
    ]);
    const csv = [header.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `laporan-peserta-simulasi-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const openNewQuestionModal = () => {
    setEditingQuestion(null);
    setQCode(`SOAL_${questions.length + 1}`);
    setQModuleTag(`Modul ${questions.length + 1}`);
    setQTitle('');
    setQAccountMode('CORPORATE');
    setQTargetModule('efaktur');
    setQTargetSubTab('output');
    setQPassingScore(75);
    setQSortOrder(questions.length + 1);
    setQPdfUrl('');
    setQSummary('');
    setQInstructionsText('');
    setQIsActive(true);
    setQuestionModalOpen(true);
  };

  const openEditQuestionModal = (q: ExamQuestion) => {
    setEditingQuestion(q);
    setQCode(q.code);
    setQModuleTag(q.moduleTag);
    setQTitle(q.title);
    setQAccountMode(q.accountMode);
    setQTargetModule(q.targetModule);
    setQTargetSubTab(q.targetSubTab || '');
    setQPassingScore(q.passingScore);
    setQSortOrder(q.sortOrder);
    setQPdfUrl(q.pdfUrl || '');
    setQSummary(q.summary);
    setQInstructionsText(q.instructions.join('\n'));
    setQIsActive(q.isActive);
    setQuestionModalOpen(true);
  };

  const handleSaveQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingQuestion(true);
    const instructions = qInstructionsText
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);

    const payload = {
      code: qCode.trim(),
      moduleTag: qModuleTag.trim(),
      title: qTitle.trim(),
      accountMode: qAccountMode,
      targetModule: qTargetModule,
      targetSubTab: qTargetSubTab.trim() || undefined,
      passingScore: Number(qPassingScore) || 75,
      sortOrder: Number(qSortOrder) || 1,
      pdfUrl: qPdfUrl.trim(),
      summary: qSummary.trim(),
      instructions,
      isActive: qIsActive,
    };

    try {
      if (editingQuestion) {
        await adminFetch(`/api/admin/questions/${encodeURIComponent(editingQuestion.id)}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
        showToast('Soal latihan berhasil diperbarui.');
      } else {
        await adminFetch('/api/admin/questions', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        showToast('Soal latihan baru berhasil ditambahkan.');
      }
      setQuestionModalOpen(false);
      await loadAllData();
    } catch (err: any) {
      setErrorBanner(err?.message || 'Gagal menyimpan soal latihan.');
    } finally {
      setSavingQuestion(false);
    }
  };

  const handleToggleQuestionActive = async (q: ExamQuestion) => {
    try {
      await adminFetch(`/api/admin/questions/${encodeURIComponent(q.id)}`, {
        method: 'PUT',
        body: JSON.stringify({ isActive: !q.isActive }),
      });
      showToast(q.isActive ? 'Soal dinonaktifkan.' : 'Soal diaktifkan kembali.');
      await loadAllData();
    } catch (err: any) {
      setErrorBanner(err?.message || 'Gagal mengubah status soal.');
    }
  };

  const handleDeleteQuestion = async (q: ExamQuestion) => {
    try {
      await adminFetch(`/api/admin/questions/${encodeURIComponent(q.id)}`, {
        method: 'DELETE',
      });
      showToast(`Soal "${q.title}" berhasil dihapus.`);
      await loadAllData();
    } catch (err: any) {
      setErrorBanner(err?.message || 'Gagal menghapus soal.');
    }
  };

  const handleTestProvision = async (e: React.FormEvent) => {
    e.preventDefault();
    setSimRunning(true);
    try {
      const res = await adminFetch<ProvisionResult>('/api/admin/integration/test-provision', {
        method: 'POST',
        body: JSON.stringify({
          externalUserId: simExtId.trim(),
          fullName: simName.trim(),
          email: simEmail.trim(),
          phone: simPhone.trim(),
          packageName: simPackage.trim(),
        }),
      });
      setSimResult(res);
      showToast('Simulasi API Provisioning berhasil diproses.');
      loadAllData();
    } catch (err: any) {
      setErrorBanner(err?.message || 'Gagal menguji API provisioning.');
    } finally {
      setSimRunning(false);
    }
  };

  // =========================================================================
  // LOADING CHECK
  // =========================================================================
  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-[#0F172A] text-slate-200 flex items-center justify-center p-6">
        <div className="text-sm font-medium text-slate-400">Memverifikasi sesi konsol admin...</div>
      </div>
    );
  }

  // =========================================================================
  // SEPARATE ADMIN LOGIN SCREEN (Completely Distinct from Coretax UI)
  // =========================================================================
  if (!session) {
    return (
      <div className="min-h-screen bg-[#0F172A] flex flex-col lg:flex-row">
        {/* Left Editorial Brand Panel */}
        <div className="lg:w-1/2 p-8 sm:p-14 flex flex-col justify-between bg-[#0B1120] border-b lg:border-b-0 lg:border-r border-slate-800">
          <div className="flex items-center gap-3 text-white">
            <KelasBrevetLogo variant="admin" dark />
            <span className="text-[11px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
              Admin
            </span>
          </div>

          <div className="my-12 lg:my-0 max-w-md space-y-4">
            <h1 className="font-display font-bold text-3xl sm:text-4xl text-white tracking-tight leading-tight">
              Pusat Manajemen Simulasi &amp; Penilaian
            </h1>
            <p className="text-sm text-slate-400 leading-relaxed">
              Kelola bank soal latihan, pantau progres pengerjaan peserta, tinjau kelulusan otomatis, dan hubungkan sinkronisasi akun dari portal kelasbrevet.com.
            </p>
            <div className="pt-4 grid grid-cols-3 gap-6 border-t border-slate-800 text-xs text-slate-400">
              <div>
                <div className="text-slate-100 font-semibold">Bank Soal CRUD</div>
                <div className="mt-1">Kelola modul &amp; PDF</div>
              </div>
              <div>
                <div className="text-slate-100 font-semibold">Evaluasi Otomatis</div>
                <div className="mt-1">Skor &amp; status lulus</div>
              </div>
              <div>
                <div className="text-slate-100 font-semibold">API Integrasi</div>
                <div className="mt-1">Sinkron kelasbrevet</div>
              </div>
            </div>
          </div>

          <div className="text-xs text-slate-500">
            Akses Khusus Administrator &middot; Terpisah dari Portal Simulasi Peserta
          </div>
        </div>

        {/* Right Clean Auth Form */}
        <div className="lg:w-1/2 flex items-center justify-center p-8 sm:p-14 bg-[#F8FAFC]">
          <div className="w-full max-w-sm space-y-6">
            <div>
              <h2 className="font-display font-bold text-2xl text-slate-900">
                Masuk Administrator
              </h2>
              <p className="text-sm text-slate-500 mt-1">
                Gunakan kredensial admin manajemen simulasi Anda.
              </p>
            </div>

            {loginError && (
              <div className="px-3.5 py-2.5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs font-medium">
                {loginError}
              </div>
            )}

            <form onSubmit={handleAdminLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Email Administrator
                </label>
                <input
                  type="email"
                  required
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  placeholder="admin@kelasbrevet.com"
                  className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/15"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Kata Sandi
                </label>
                <div className="relative">
                  <input
                    type={showLoginPw ? 'text' : 'password'}
                    required
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="Masukkan kata sandi admin"
                    className="w-full px-3.5 py-2.5 pr-10 text-sm bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/15"
                  />
                  <button
                    type="button"
                    onClick={() => setShowLoginPw((v) => !v)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showLoginPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loginBusy}
                className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 disabled:opacity-60 text-white text-sm font-semibold rounded-lg transition cursor-pointer"
              >
                {loginBusy ? 'Memverifikasi...' : 'Masuk ke Konsol Admin'}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // AUTHENTICATED ADMIN MANAGEMENT CONSOLE (Enterprise SaaS Workspace)
  // =========================================================================
  const navItems: Array<{ id: AdminTab; label: string; icon: React.FC<{ className?: string }> }> = [
    { id: 'analytics', label: 'Analitik Peserta', icon: BarChart3 },
    { id: 'participants', label: 'Peserta & Nilai', icon: Users },
    { id: 'questions', label: 'Manajemen Soal', icon: BookOpen },
    { id: 'admins', label: 'Akun Admin', icon: ShieldCheck },
    { id: 'branding', label: 'Logo & Icon Meta', icon: ImageIcon },
    { id: 'integration', label: 'Integrasi API', icon: Code2 },
  ];

  const tabTitles: Record<AdminTab, string> = {
    analytics: 'Analitik & Progres Simulasi',
    participants: 'Daftar Peserta, Nilai & Kelulusan',
    questions: 'Manajemen Bank Soal Latihan',
    admins: 'Manajemen Akun Admin (Database)',
    branding: 'Pengaturan Logo & Icon Meta',
    integration: 'Integrasi API kelasbrevet.com',
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex flex-col lg:flex-row">
      {/* LEFT DARK SLATE SIDEBAR (256px) */}
      <aside className="w-full lg:w-64 bg-[#0F172A] text-slate-200 shrink-0 flex flex-col border-b lg:border-b-0 lg:border-r border-slate-800">
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <KelasBrevetLogo variant="admin" dark />
          </div>
        </div>

        <nav className="p-3 flex lg:flex-col gap-1 overflow-x-auto lg:overflow-visible flex-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-xs font-medium transition cursor-pointer whitespace-nowrap shrink-0 ${
                  active
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-800 hidden lg:block space-y-3">
          <div className="text-xs">
            <div className="text-slate-100 font-semibold truncate">{session.fullName || session.email}</div>
            <div className="text-slate-400 text-[11px] truncate mt-0.5">{session.email}</div>
            <div className="text-indigo-300 text-[10px] font-semibold uppercase tracking-wider mt-1">
              {session.role === 'SUPER_ADMIN' ? 'Super Admin' : 'Admin'} &middot; {session.dbDriver || 'Database'}
            </div>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-800 transition cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Keluar Admin</span>
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT VIEWPORT */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Top Bar Contract: Breadcrumb on left, 1–2 primary actions on right */}
        <header className="bg-white border-b border-slate-200 px-6 py-3.5 flex items-center justify-between gap-4 sticky top-0 z-20">
          <div className="min-w-0">
            <div className="text-xs text-slate-500 flex items-center gap-1.5">
              <span>Konsol Admin</span>
              <span>/</span>
              <span className="text-slate-900 font-semibold truncate">{tabTitles[activeTab]}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={loadAllData}
              disabled={loadingData}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition cursor-pointer whitespace-nowrap"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingData ? 'animate-spin' : ''}`} />
              <span>Muat Ulang</span>
            </button>

            {activeTab === 'participants' && (
              <button
                type="button"
                onClick={() => {
                  setCreatedCreds(null);
                  setAddPartOpen(true);
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition cursor-pointer whitespace-nowrap"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Tambah Peserta</span>
              </button>
            )}

            {activeTab === 'questions' && (
              <button
                type="button"
                onClick={openNewQuestionModal}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition cursor-pointer whitespace-nowrap"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Tambah Soal</span>
              </button>
            )}

            {activeTab === 'admins' && (
              <button
                type="button"
                onClick={openNewAdminModal}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition cursor-pointer whitespace-nowrap"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Tambah Admin</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleLogout}
              className="lg:hidden p-2 text-slate-500 hover:text-slate-900 rounded-lg border border-slate-200 cursor-pointer"
              title="Keluar"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Feedback Alerts */}
        <main className="p-6 space-y-6 max-w-[1360px] w-full mx-auto">
          {errorBanner && (
            <div className="px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-center justify-between gap-2">
              <span>{errorBanner}</span>
              <button type="button" onClick={() => setErrorBanner(null)} className="cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {successToast && (
            <div className="px-4 py-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium flex items-center justify-between gap-2">
              <span>{successToast}</span>
              <button type="button" onClick={() => setSuccessToast(null)} className="cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* =============================================================== */}
          {/* TAB 1: ANALITIK PESERTA                                         */}
          {/* =============================================================== */}
          {activeTab === 'analytics' && (
            <div className="space-y-6">
              <div>
                <h1 className="font-display font-bold text-xl text-slate-900">
                  Ringkasan Analitik Simulasi
                </h1>
                <p className="text-xs text-slate-500 mt-1">
                  Pantau tingkat partisipasi, pencapaian nilai rata-rata, dan status kelulusan peserta secara real-time.
                </p>
              </div>

              {/* 4-Column Flat KPI Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                <div className="bg-white border border-slate-200 rounded-xl p-5">
                  <div className="text-xs font-medium text-slate-500">Total Peserta Terdaftar</div>
                  <div className="text-2xl font-bold text-slate-900 tabular-nums mt-2">
                    {analytics?.totalParticipants ?? 0}
                  </div>
                  <div className="text-xs text-slate-500 mt-1.5 tabular-nums">
                    {analytics?.activeQuestions ?? 0} dari {analytics?.totalQuestions ?? 0} soal aktif
                  </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-xl p-5">
                  <div className="text-xs font-medium text-slate-500">Sedang / Selesai Mengerjakan</div>
                  <div className="text-2xl font-bold text-slate-900 tabular-nums mt-2">
                    {(analytics?.activeWorkingCount ?? 0) + (analytics?.completedCount ?? 0)}
                  </div>
                  <div className="text-xs text-slate-500 mt-1.5 tabular-nums">
                    {analytics?.notStartedCount ?? 0} peserta belum mulai
                  </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-xl p-5">
                  <div className="text-xs font-medium text-slate-500">Peserta Lulus (≥ KKM)</div>
                  <div className="text-2xl font-bold text-emerald-700 tabular-nums mt-2">
                    {analytics?.passedCount ?? 0}
                  </div>
                  <div className="text-xs text-slate-500 mt-1.5 tabular-nums">
                    Tingkat kelulusan {analytics?.passRatePercent ?? 0}%
                  </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-xl p-5">
                  <div className="text-xs font-medium text-slate-500">Rata-Rata Nilai Peserta</div>
                  <div className="text-2xl font-bold text-indigo-700 tabular-nums mt-2">
                    {analytics?.averageScore ?? 0}
                    <span className="text-sm font-normal text-slate-400"> / 100</span>
                  </div>
                  <div className="text-xs text-slate-500 mt-1.5 tabular-nums">
                    {analytics?.failedCount ?? 0} peserta belum lulus
                  </div>
                </div>
              </div>

              {/* 2-Column Analytics Breakdown */}
              <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
                {/* Module Performance */}
                <div className="xl:col-span-7 bg-white border border-slate-200 rounded-xl overflow-hidden">
                  <div className="px-5 py-4 border-b border-slate-200">
                    <h2 className="font-display font-bold text-sm text-slate-900">
                      Analisis Nilai &amp; Kelulusan per Modul
                    </h2>
                  </div>
                  <div className="divide-y divide-slate-100">
                    {(analytics?.moduleBreakdown || []).map((m) => (
                      <div key={m.caseCode} className="px-5 py-4 space-y-2">
                        <div className="flex items-center justify-between gap-4">
                          <div className="min-w-0">
                            <div className="text-xs font-semibold text-slate-900 truncate">
                              {m.title}
                            </div>
                            <div className="text-[11px] text-slate-500 mt-0.5">
                              {m.moduleTag} &middot; {m.passedCount} dari {m.totalParticipants} peserta lulus modul
                            </div>
                          </div>
                          <div className="text-sm font-bold text-slate-900 tabular-nums shrink-0">
                            {m.averageScore}%
                          </div>
                        </div>
                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-indigo-600 rounded-full transition-all"
                            style={{ width: `${m.averageScore}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Distribution + Recent Activity */}
                <div className="xl:col-span-5 bg-white border border-slate-200 rounded-xl overflow-hidden">
                  <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
                    <h2 className="font-display font-bold text-sm text-slate-900">
                      Aktivitas Peserta Terbaru
                    </h2>
                    <button
                      type="button"
                      onClick={() => setActiveTab('participants')}
                      className="text-xs font-medium text-indigo-600 hover:underline cursor-pointer"
                    >
                      Lihat Semua
                    </button>
                  </div>

                  {!analytics || analytics.recentActivity.length === 0 ? (
                    <div className="p-8 text-center text-xs text-slate-500 space-y-3">
                      <p>Belum ada peserta terdaftar dari kelasbrevet.com maupun input manual.</p>
                      <button
                        type="button"
                        onClick={() => {
                          setActiveTab('participants');
                          setAddPartOpen(true);
                        }}
                        className="px-3.5 py-2 bg-indigo-600 text-white rounded-lg text-xs font-semibold cursor-pointer"
                      >
                        Tambah Peserta Pertama
                      </button>
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100">
                      {analytics.recentActivity.map((act) => (
                        <button
                          key={act.nikKey}
                          type="button"
                          onClick={() => openParticipantDetail(act.nikKey)}
                          className="w-full text-left px-5 py-3.5 hover:bg-slate-50 transition flex items-center justify-between gap-3 cursor-pointer"
                        >
                          <div className="min-w-0">
                            <div className="text-xs font-semibold text-slate-900 truncate">
                              {act.fullName}
                            </div>
                            <div className="text-[11px] text-slate-500 truncate mt-0.5">
                              {act.packageName} &middot; {act.submittedReturns} SPT dilaporkan
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <div className="text-xs font-bold tabular-nums text-slate-900">
                              Nilai {act.averageScore}
                            </div>
                            <div
                              className={`text-[11px] font-semibold mt-0.5 ${
                                act.graduationStatus === 'LULUS'
                                  ? 'text-emerald-700'
                                  : 'text-amber-700'
                              }`}
                            >
                              {act.graduationStatus === 'LULUS' ? 'LULUS' : 'BELUM LULUS'}
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* =============================================================== */}
          {/* TAB 2: DAFTAR PESERTA, NILAI & KELULUSAN                        */}
          {/* =============================================================== */}
          {activeTab === 'participants' && (
            <div className="space-y-4">
              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                {/* Filter Toolbar */}
                <div className="p-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[260px]">
                    <div className="relative flex-1 max-w-xs">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={searchParticipant}
                        onChange={(e) => setSearchParticipant(e.target.value)}
                        placeholder="Cari nama, NIK, email, atau paket..."
                        className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:border-indigo-600"
                      />
                    </div>

                    <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
                      {(
                        [
                          { id: 'ALL', label: 'Semua' },
                          { id: 'LULUS', label: 'Lulus' },
                          { id: 'BELUM_LULUS', label: 'Belum Lulus' },
                          { id: 'NOT_STARTED', label: 'Belum Mulai' },
                          { id: 'KELASBREVET_API', label: 'API KelasBrevet' },
                        ] as const
                      ).map((f) => (
                        <button
                          key={f.id}
                          type="button"
                          onClick={() => setStatusFilter(f.id)}
                          className={`px-2.5 py-1.5 text-xs font-medium rounded-md transition cursor-pointer whitespace-nowrap ${
                            statusFilter === f.id
                              ? 'bg-white text-slate-900 shadow-xs'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          {f.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleExportCsv}
                    disabled={filteredParticipants.length === 0}
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 disabled:opacity-50 rounded-lg cursor-pointer whitespace-nowrap"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Ekspor CSV</span>
                  </button>
                </div>

                {/* High-Density Data Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold text-left">
                        <th className="px-4 py-3 whitespace-nowrap">Peserta</th>
                        <th className="px-4 py-3 whitespace-nowrap">ID Akun (NIK)</th>
                        <th className="px-4 py-3 whitespace-nowrap">Paket &amp; Sumber</th>
                        <th className="px-4 py-3 text-right whitespace-nowrap">Aktivitas</th>
                        <th className="px-4 py-3 text-right whitespace-nowrap">Nilai Rata-Rata</th>
                        <th className="px-4 py-3 whitespace-nowrap">Status Kelulusan</th>
                        <th className="px-4 py-3 text-right whitespace-nowrap">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredParticipants.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="px-4 py-12 text-center text-slate-500">
                            Tidak ada data peserta yang sesuai filter.
                          </td>
                        </tr>
                      ) : (
                        filteredParticipants.map((row) => (
                          <tr key={row.participant.id} className="hover:bg-slate-50/80">
                            <td className="px-4 py-3">
                              <div className="font-semibold text-slate-900">
                                {row.participant.fullName}
                              </div>
                              <div className="text-[11px] text-slate-500">
                                {row.participant.email || '-'}
                              </div>
                            </td>
                            <td className="px-4 py-3 font-mono tabular-nums text-slate-800 whitespace-nowrap">
                              <div>{row.participant.nikKey}</div>
                              {row.participant.initialPassword && (
                                <div className="text-[11px] text-slate-400">
                                  PW: {row.participant.initialPassword}
                                </div>
                              )}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <div className="text-slate-800 font-medium">
                                {row.participant.packageName}
                              </div>
                              <div className="text-[11px] text-slate-500">
                                {row.participant.source === 'KELASBREVET_API'
                                  ? 'kelasbrevet.com'
                                  : 'Input Admin'}
                                {!row.participant.isActive && ' · Nonaktif'}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-right tabular-nums text-slate-600 whitespace-nowrap">
                              <div>{row.activityMetrics.submittedReturns} SPT</div>
                              <div className="text-[11px] text-slate-400">
                                {row.completedModules}/{row.totalModules} modul lulus
                              </div>
                            </td>
                            <td className="px-4 py-3 text-right font-mono tabular-nums whitespace-nowrap">
                              <span className="text-sm font-bold text-slate-900">
                                {row.averageScore}
                              </span>
                              <span className="text-[11px] text-slate-400">
                                {' '}
                                / KKM {row.passingScore}
                              </span>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <div
                                className={`inline-flex items-center gap-1.5 font-semibold ${
                                  row.isPassed ? 'text-emerald-700' : 'text-amber-700'
                                }`}
                              >
                                {row.isPassed ? (
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                ) : (
                                  <XCircle className="w-3.5 h-3.5" />
                                )}
                                <span>{row.isPassed ? 'LULUS' : 'BELUM LULUS'}</span>
                              </div>
                              <div className="text-[11px] text-slate-400 mt-0.5">
                                {row.progressStatus === 'COMPLETED'
                                  ? 'Selesai'
                                  : row.progressStatus === 'IN_PROGRESS'
                                    ? 'Sedang mengerjakan'
                                    : 'Belum mulai'}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-right whitespace-nowrap">
                              <div className="inline-flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => openParticipantDetail(row.participant.nikKey)}
                                  className="px-2.5 py-1.5 text-xs font-medium text-indigo-700 hover:bg-indigo-50 border border-slate-200 rounded-md cursor-pointer"
                                >
                                  Detail
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleResetParticipant(
                                      row.participant.nikKey,
                                      row.participant.fullName
                                    )
                                  }
                                  className="p-1.5 text-slate-600 hover:bg-slate-100 border border-slate-200 rounded-md cursor-pointer"
                                  title="Reset Workspace Latihan"
                                >
                                  <RotateCcw className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleDeleteParticipant(
                                      row.participant.nikKey,
                                      row.participant.fullName
                                    )
                                  }
                                  className="p-1.5 text-red-600 hover:bg-red-50 border border-slate-200 rounded-md cursor-pointer"
                                  title="Hapus Peserta"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
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

          {/* =============================================================== */}
          {/* TAB 3: MANAJEMEN SOAL LATIHAN (CRUD MANUAL)                     */}
          {/* =============================================================== */}
          {activeTab === 'questions' && (
            <div className="space-y-4">
              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="font-display font-bold text-sm text-slate-900">
                      Bank Soal Latihan Simulasi ({questions.length})
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Soal aktif tampil secara read-only di panel Soal Latihan peserta dan dapat diunduh sebagai PDF melalui kelasbrevet.com.
                    </p>
                  </div>
                  <a
                    href="/api/questions/all/pdf"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg cursor-pointer whitespace-nowrap"
                  >
                    <FileDown className="w-3.5 h-3.5" />
                    <span>Pratinjau PDF Gabungan</span>
                  </a>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold text-left">
                        <th className="px-4 py-3 whitespace-nowrap">#</th>
                        <th className="px-4 py-3 whitespace-nowrap">Judul &amp; Modul</th>
                        <th className="px-4 py-3 whitespace-nowrap">Mode Akun</th>
                        <th className="px-4 py-3 text-right whitespace-nowrap">Langkah</th>
                        <th className="px-4 py-3 text-right whitespace-nowrap">KKM</th>
                        <th className="px-4 py-3 whitespace-nowrap">Status</th>
                        <th className="px-4 py-3 text-right whitespace-nowrap">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {questions.map((q) => (
                        <tr key={q.id} className="hover:bg-slate-50/80">
                          <td className="px-4 py-3 font-mono tabular-nums text-slate-500">
                            {q.sortOrder}
                          </td>
                          <td className="px-4 py-3 max-w-md">
                            <div className="font-semibold text-slate-900">{q.title}</div>
                            <div className="text-[11px] text-slate-500 mt-0.5">
                              {q.moduleTag} &middot; <span className="font-mono">{q.code}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-slate-700 whitespace-nowrap">
                            {q.accountMode === 'CORPORATE' ? 'Badan / PKP' : 'Orang Pribadi'}
                          </td>
                          <td className="px-4 py-3 text-right tabular-nums text-slate-600">
                            {q.instructions.length}
                          </td>
                          <td className="px-4 py-3 text-right font-mono tabular-nums font-semibold text-slate-900">
                            {q.passingScore}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => handleToggleQuestionActive(q)}
                              className={`text-xs font-semibold cursor-pointer hover:underline ${
                                q.isActive ? 'text-emerald-700' : 'text-slate-400'
                              }`}
                            >
                              {q.isActive ? 'Aktif' : 'Nonaktif'}
                            </button>
                          </td>
                          <td className="px-4 py-3 text-right whitespace-nowrap">
                            <div className="inline-flex items-center gap-1.5">
                              <a
                                href={
                                  q.pdfUrl && /^https?:\/\//i.test(q.pdfUrl)
                                    ? q.pdfUrl
                                    : `/api/questions/${encodeURIComponent(q.id)}/pdf`
                                }
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 border border-slate-200 rounded-md"
                              >
                                PDF
                              </a>
                              <button
                                type="button"
                                onClick={() => openEditQuestionModal(q)}
                                className="p-1.5 text-indigo-700 hover:bg-indigo-50 border border-slate-200 rounded-md cursor-pointer"
                                title="Edit Soal"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteQuestion(q)}
                                className="p-1.5 text-red-600 hover:bg-red-50 border border-slate-200 rounded-md cursor-pointer"
                                title="Hapus Soal"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* =============================================================== */}
          {/* TAB 4: INTEGRASI API KELASBREVET.COM                            */}
          {/* =============================================================== */}
          {activeTab === 'integration' && (
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
              {/* Endpoint Reference */}
              <div className="xl:col-span-7 bg-white border border-slate-200 rounded-xl overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-200">
                  <h2 className="font-display font-bold text-sm text-slate-900">
                    Daftar Endpoint REST API untuk kelasbrevet.com
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Sertakan header <code className="font-mono text-slate-800">X-API-Key</code> dari environment server <code className="font-mono text-slate-800">INTEGRATION_API_KEY</code> pada setiap permintaan server-to-server.
                  </p>
                </div>

                <div className="divide-y divide-slate-100 text-xs">
                  {[
                    {
                      method: 'POST',
                      path: '/api/integration/v1/participants/provision',
                      desc: 'Dipanggil saat peserta klik tombol akses simulasi di kelasbrevet.com. Otomatis membuat akun dan mengembalikan ID Akun (NIK), Password, dan Link Login.',
                    },
                    {
                      method: 'GET',
                      path: '/api/integration/v1/participants/:identifier/result',
                      desc: 'Mengambil nilai rata-rata, detail per modul, dan status kelulusan (LULUS / BELUM_LULUS) untuk ditampilkan pada halaman peserta di kelasbrevet.com.',
                    },
                    {
                      method: 'POST',
                      path: '/api/integration/v1/participants/:identifier/reset',
                      desc: 'Mereset data latihan peserta ke kondisi awal studi kasus.',
                    },
                    {
                      method: 'GET',
                      path: '/api/integration/v1/questions',
                      desc: 'Mengambil daftar soal latihan beserta tautan unduh PDF soal (downloadPdfUrl & allPdfUrl).',
                    },
                    {
                      method: 'POST / PUT / DELETE',
                      path: '/api/integration/v1/questions/:id',
                      desc: 'CRUD manajemen soal latihan langsung dari admin/backend kelasbrevet.com.',
                    },
                  ].map((ep) => (
                    <div key={ep.path} className="px-5 py-3.5 space-y-1">
                      <div className="flex flex-wrap items-center gap-2 font-mono text-[11.5px]">
                        <span className="font-bold text-indigo-700">{ep.method}</span>
                        <span className="text-slate-900 font-semibold">{ep.path}</span>
                      </div>
                      <p className="text-slate-600 leading-relaxed">{ep.desc}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Live Provisioning Simulator */}
              <div className="xl:col-span-5 bg-white border border-slate-200 rounded-xl overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-200">
                  <h2 className="font-display font-bold text-sm text-slate-900">
                    Uji Alur Tombol Aktivasi kelasbrevet.com
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Simulasikan kiriman data peserta dari database kelasbrevet.com untuk melihat kredensial dan link login yang dihasilkan.
                  </p>
                </div>

                <form onSubmit={handleTestProvision} className="p-5 space-y-3 text-xs">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      External User ID (ID User di kelasbrevet.com)
                    </label>
                    <input
                      type="text"
                      value={simExtId}
                      onChange={(e) => setSimExtId(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono"
                      required
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Nama Peserta</label>
                    <input
                      type="text"
                      value={simName}
                      onChange={(e) => setSimName(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Email</label>
                      <input
                        type="email"
                        value={simEmail}
                        onChange={(e) => setSimEmail(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                        required
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">No. HP</label>
                      <input
                        type="text"
                        value={simPhone}
                        onChange={(e) => setSimPhone(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Paket Brevet</label>
                    <input
                      type="text"
                      value={simPackage}
                      onChange={(e) => setSimPackage(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={simRunning}
                    className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg cursor-pointer"
                  >
                    {simRunning
                      ? 'Memproses Provisioning...'
                      : 'Simulasikan Klik Tombol Aktivasi'}
                  </button>

                  {simResult && (
                    <div className="mt-4 p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-2.5">
                      <div className="font-semibold text-slate-900">
                        Respons Kredensial untuk Ditampilkan di kelasbrevet.com
                      </div>
                      <div className="space-y-1.5 font-mono text-[11.5px]">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-slate-500">ID Akun (NIK):</span>
                          <span className="font-bold text-slate-900">
                            {simResult.credentials.nik}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-slate-500">Kata Sandi:</span>
                          <span className="font-bold text-indigo-700">
                            {simResult.credentials.password}
                          </span>
                        </div>
                        <div className="pt-1">
                          <a
                            href={simResult.credentials.simulationUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-indigo-700 font-semibold hover:underline break-all"
                          >
                            {simResult.credentials.simulationUrl}
                          </a>
                        </div>
                      </div>
                    </div>
                  )}
                </form>
              </div>
            </div>
          )}

          {/* =============================================================== */}
          {/* TAB 5: MANAJEMEN AKUN ADMIN (TABEL DATABASE admin_users)         */}
          {/* =============================================================== */}
          {activeTab === 'admins' && (
            <div className="space-y-4">
              <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="font-display font-bold text-base text-slate-900">
                    Daftar Akun Administrator (Tabel <code className="font-mono text-indigo-700">admin_users</code>)
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">
                    Seluruh kredensial login Admin disimpan terenkripsi (scrypt hash) di database MySQL, bukan hardcoded pada konfigurasi manual.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={openNewAdminModal}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition cursor-pointer whitespace-nowrap shrink-0"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Tambah Akun Admin</span>
                </button>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold">
                        <th className="py-3 px-4">Administrator</th>
                        <th className="py-3 px-4">Email Login</th>
                        <th className="py-3 px-4">Peran</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4">Login Terakhir</th>
                        <th className="py-3 px-4 text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {adminUsers.map((adm) => {
                        const isSelf = session?.id === adm.id || session?.email === adm.email;
                        return (
                          <tr key={adm.id} className="hover:bg-slate-50/70">
                            <td className="py-3 px-4">
                              <div className="font-semibold text-slate-900 flex items-center gap-2">
                                <span>{adm.fullName}</span>
                                {isSelf && (
                                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                                    Akun Anda
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] font-mono text-slate-400 mt-0.5">{adm.id}</div>
                            </td>
                            <td className="py-3 px-4 font-mono text-slate-700">{adm.email}</td>
                            <td className="py-3 px-4">
                              <span
                                className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold border ${
                                  adm.role === 'SUPER_ADMIN'
                                    ? 'bg-slate-900 text-white border-slate-900'
                                    : 'bg-slate-100 text-slate-700 border-slate-200'
                                }`}
                              >
                                {adm.role === 'SUPER_ADMIN' ? 'Super Admin' : 'Admin'}
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              <span
                                className={`inline-flex items-center gap-1 text-[11px] font-semibold ${
                                  adm.isActive ? 'text-emerald-700' : 'text-slate-400'
                                }`}
                              >
                                <span
                                  className={`w-2 h-2 rounded-full ${
                                    adm.isActive ? 'bg-emerald-500' : 'bg-slate-300'
                                  }`}
                                />
                                {adm.isActive ? 'Aktif' : 'Nonaktif'}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-slate-500">
                              {adm.lastLoginAt
                                ? new Date(adm.lastLoginAt).toLocaleString('id-ID')
                                : 'Belum pernah login'}
                            </td>
                            <td className="py-3 px-4 text-right">
                              <div className="inline-flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => openEditAdminModal(adm)}
                                  className="px-2.5 py-1.5 text-[11px] font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-md cursor-pointer inline-flex items-center gap-1"
                                >
                                  <Edit3 className="w-3 h-3" />
                                  <span>Edit / Password</span>
                                </button>
                                {!isSelf && (
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteAdminUser(adm)}
                                    className="p-1.5 text-slate-400 hover:text-red-600 border border-slate-200 hover:border-red-200 rounded-md cursor-pointer"
                                    title="Hapus akun admin"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                      {adminUsers.length === 0 && (
                        <tr>
                          <td colSpan={6} className="py-8 text-center text-slate-400">
                            Belum ada akun admin terdaftar.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* =============================================================== */}
          {/* TAB 6: PENGATURAN LOGO & ICON META KELASBREVET                  */}
          {/* =============================================================== */}
          {activeTab === 'branding' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left Column: Logo Form + Icon Meta Form */}
              <div className="space-y-6">
                {/* Card 1: Main Logo */}
                <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
                  <div>
                    <h2 className="font-display font-bold text-base text-slate-900">
                      Ubah Logo KelasBrevet
                    </h2>
                    <p className="text-xs text-slate-500 mt-1">
                      Logo yang disimpan di tabel{' '}
                      <code className="font-mono text-indigo-700">app_settings</code> akan otomatis
                      tampil pada halaman Login, Header Simulasi, Layar Loading, Dokumen Cetak, dan
                      Konsol Admin.
                    </p>
                  </div>

                  <div className="space-y-4 text-xs">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1.5">
                        Nama Brand
                      </label>
                      <input
                        type="text"
                        value={brandName}
                        onChange={(e) => setBrandName(e.target.value)}
                        placeholder="KelasBrevet"
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1.5">
                        Unggah Foto / File Logo Baru (PNG, JPG, SVG, WebP — maks. 2 MB)
                      </label>
                      <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-slate-300 hover:border-indigo-500 rounded-xl p-5 bg-slate-50/70 hover:bg-indigo-50/30 transition cursor-pointer text-center">
                        <Upload className="w-6 h-6 text-indigo-600" />
                        <div className="font-semibold text-slate-700">
                          Klik untuk pilih file logo dari komputer Anda
                        </div>
                        <div className="text-[11px] text-slate-500">
                          Disarankan PNG / SVG transparan horizontal (misal 400&times;100 px)
                        </div>
                        <input
                          type="file"
                          accept="image/png,image/jpeg,image/webp,image/svg+xml"
                          onChange={handleLogoFileSelected}
                          className="hidden"
                        />
                      </label>
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1.5">
                        Atau Masukkan URL Gambar Logo (Opsional)
                      </label>
                      <input
                        type="text"
                        value={brandLogoUrl.startsWith('data:') ? '' : brandLogoUrl}
                        onChange={(e) => setBrandLogoUrl(e.target.value)}
                        placeholder="https://kelasbrevet.com/assets/logo.png (kosongkan untuk logo default)"
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono text-[11.5px] text-slate-800"
                      />
                      {brandLogoUrl.startsWith('data:') && (
                        <div className="mt-1.5 text-[11px] text-emerald-700 font-medium">
                          File logo siap disimpan (Data URL terpasang).
                        </div>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5 pt-1">
                      <button
                        type="button"
                        disabled={savingBranding}
                        onClick={() =>
                          handleSaveBranding({
                            toastMessage:
                              'Logo & Nama Brand berhasil disimpan ke database dan diterapkan.',
                          })
                        }
                        className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-semibold rounded-lg transition cursor-pointer"
                      >
                        {savingBranding ? 'Menyimpan...' : 'Simpan Logo ke Database'}
                      </button>
                      <button
                        type="button"
                        disabled={savingBranding}
                        onClick={() =>
                          handleSaveBranding({
                            logoUrl: '',
                            toastMessage: 'Logo dikembalikan ke logo default resmi KelasBrevet.',
                          })
                        }
                        className="px-4 py-2.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold rounded-lg transition cursor-pointer"
                      >
                        Reset ke Logo Default
                      </button>
                    </div>
                  </div>
                </div>

                {/* Card 2: Meta Icon (Favicon & OpenGraph / Social Icon) */}
                <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h2 className="font-display font-bold text-base text-slate-900 flex items-center gap-2">
                        <Globe className="w-4 h-4 text-indigo-600" />
                        Upload Icon Meta (Favicon &amp; Meta Tag)
                      </h2>
                      <p className="text-xs text-slate-500 mt-1">
                        Icon Meta digunakan sebagai <strong>Favicon Tab Browser</strong>,{' '}
                        <strong>Apple Touch Icon</strong>, serta{' '}
                        <strong>og:image / twitter:image</strong> saat tautan aplikasi dibagikan ke
                        WhatsApp, Telegram, atau media sosial.
                      </p>
                    </div>
                    <div className="w-12 h-12 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-center shrink-0 p-1.5">
                      <img
                        src={brandMetaIconUrl || DEFAULT_META_ICON_URL}
                        alt="Icon Meta Saat Ini"
                        className="w-full h-full object-contain"
                      />
                    </div>
                  </div>

                  <div className="space-y-4 text-xs">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1.5">
                        Unggah File Icon Meta (PNG, ICO, SVG, JPG, WebP — maks. 2 MB)
                      </label>
                      <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-slate-300 hover:border-indigo-500 rounded-xl p-5 bg-slate-50/70 hover:bg-indigo-50/30 transition cursor-pointer text-center">
                        <Upload className="w-6 h-6 text-indigo-600" />
                        <div className="font-semibold text-slate-700">
                          Klik untuk unggah Icon Meta (Favicon)
                        </div>
                        <div className="text-[11px] text-slate-500">
                          Disarankan rasio persegi 1:1 (misal 512&times;512 px atau 180&times;180 px PNG/ICO)
                        </div>
                        <input
                          type="file"
                          accept="image/png,image/x-icon,image/vnd.microsoft.icon,image/svg+xml,image/jpeg,image/webp,.ico"
                          onChange={handleMetaIconFileSelected}
                          className="hidden"
                        />
                      </label>
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1.5">
                        Atau Masukkan URL Icon Meta (Opsional)
                      </label>
                      <input
                        type="text"
                        value={brandMetaIconUrl.startsWith('data:') ? '' : brandMetaIconUrl}
                        onChange={(e) => setBrandMetaIconUrl(e.target.value)}
                        placeholder="https://kelasbrevet.com/favicon.png (kosongkan untuk icon default)"
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono text-[11.5px] text-slate-800"
                      />
                      {brandMetaIconUrl.startsWith('data:') && (
                        <div className="mt-1.5 text-[11px] text-emerald-700 font-medium">
                          File Icon Meta siap disimpan (Data URL terpasang).
                        </div>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5 pt-1">
                      <button
                        type="button"
                        disabled={savingBranding}
                        onClick={() =>
                          handleSaveBranding({
                            toastMessage:
                              'Icon Meta berhasil disimpan ke database dan langsung aktif pada tab browser & meta tag.',
                          })
                        }
                        className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-semibold rounded-lg transition cursor-pointer"
                      >
                        {savingBranding ? 'Menyimpan...' : 'Simpan Icon Meta ke Database'}
                      </button>
                      <button
                        type="button"
                        disabled={savingBranding}
                        onClick={() =>
                          handleSaveBranding({
                            metaIconUrl: '',
                            toastMessage: 'Icon Meta dikembalikan ke ikon default KelasBrevet.',
                          })
                        }
                        className="px-4 py-2.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold rounded-lg transition cursor-pointer"
                      >
                        Reset ke Icon Default
                      </button>
                    </div>

                    {brandUpdatedAt && (
                      <div className="text-[11px] text-slate-400">
                        Terakhir diperbarui: {new Date(brandUpdatedAt).toLocaleString('id-ID')}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Right Column: Live Multi-Surface Preview (Icon Meta + Logo) */}
              <div className="space-y-6">
                {/* Preview Card 1: Browser Tab & Social Meta Preview */}
                <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
                  <div>
                    <h3 className="font-display font-bold text-sm text-slate-900">
                      Pratinjau Icon Meta (Tab Browser &amp; Bagikan Tautan)
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Tampilan langsung Favicon di tab browser, shortcut layar utama, dan kartu
                      meta link.
                    </p>
                  </div>

                  {/* Browser Tab Mockup */}
                  <div className="rounded-xl border border-slate-200 overflow-hidden bg-slate-100">
                    <div className="px-3 pt-2.5 flex items-end gap-2 bg-slate-200/80 border-b border-slate-200">
                      <div className="flex items-center gap-1.5 pb-2 pr-1">
                        <span className="w-2.5 h-2.5 rounded-full bg-rose-400 inline-block" />
                        <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block" />
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block" />
                      </div>
                      <div className="inline-flex items-center gap-2 bg-white px-3 py-1.5 rounded-t-lg border-t border-x border-slate-200 text-[11px] font-medium text-slate-700 max-w-[260px]">
                        <img
                          src={brandMetaIconUrl || DEFAULT_META_ICON_URL}
                          alt="Favicon Preview"
                          className="w-4 h-4 object-contain shrink-0"
                        />
                        <span className="truncate">
                          {brandName || 'KelasBrevet'} Coretax Simulator
                        </span>
                      </div>
                    </div>
                    <div className="px-3.5 py-2 bg-white text-[11px] text-slate-400 font-mono truncate">
                      {session?.publicUrl || window.location.origin}
                    </div>
                  </div>

                  {/* App Icon + Social Share Card */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="rounded-xl border border-slate-200 p-3.5 bg-slate-50 flex flex-col items-center justify-center gap-2 text-center">
                      <div className="w-14 h-14 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center justify-center p-2">
                        <img
                          src={brandMetaIconUrl || DEFAULT_META_ICON_URL}
                          alt="Apple Touch Icon"
                          className="w-full h-full object-contain"
                        />
                      </div>
                      <span className="text-[10.5px] font-semibold text-slate-600">
                        Apple Touch / App Icon
                      </span>
                    </div>

                    <div className="sm:col-span-2 rounded-xl border border-slate-200 p-3.5 bg-white flex items-center gap-3.5">
                      <div className="w-16 h-16 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center p-2 shrink-0">
                        <img
                          src={brandMetaIconUrl || DEFAULT_META_ICON_URL}
                          alt="OpenGraph Image"
                          className="w-full h-full object-contain"
                        />
                      </div>
                      <div className="min-w-0">
                        <div className="text-[10px] font-semibold uppercase tracking-wider text-indigo-600">
                          Meta OpenGraph (og:image)
                        </div>
                        <div className="text-xs font-bold text-slate-900 truncate mt-0.5">
                          {brandName || 'KelasBrevet'} Coretax Simulator
                        </div>
                        <div className="text-[11px] text-slate-500 line-clamp-2 mt-0.5">
                          Simulasi interaktif Coretax untuk latihan e-Faktur, e-Bupot, dan SPT.
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Preview Card 2: Live Multi-Surface Logo Preview */}
                <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
                  <div>
                    <h3 className="font-display font-bold text-sm text-slate-900">
                      Pratinjau Langsung Logo di Aplikasi
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Perubahan logo akan langsung terlihat pada tampilan simulasi di bawah ini.
                    </p>
                  </div>

                  <div className="space-y-3">
                    <div className="rounded-xl border border-slate-200 p-4 bg-white">
                      <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-2.5">
                        Header Portal Simulasi (Mode Terang)
                      </div>
                      <div className="flex items-center justify-between px-4 py-3 rounded-lg bg-slate-50 border border-slate-200">
                        <KelasBrevetLogo
                          variant="portalbar"
                          logoUrlOverride={brandLogoUrl}
                          brandNameOverride={brandName}
                        />
                        <span className="text-[11px] text-slate-400">Cari layanan...</span>
                      </div>
                    </div>

                    <div className="rounded-xl border border-slate-800 p-4 bg-[#0F172A]">
                      <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-2.5">
                        Header Gelap &amp; Konsol Admin
                      </div>
                      <div className="flex items-center justify-between px-4 py-3 rounded-lg bg-[#1E293B] border border-slate-700">
                        <KelasBrevetLogo
                          variant="admin"
                          dark
                          logoUrlOverride={brandLogoUrl}
                          brandNameOverride={brandName}
                        />
                        <span className="text-[11px] text-slate-400">Administrator</span>
                      </div>
                    </div>

                    <div className="rounded-xl border border-slate-200 p-4 bg-[#EEF2FA]">
                      <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-2.5">
                        Halaman Login &amp; Layar Loading
                      </div>
                      <div className="bg-white rounded-xl border border-slate-200 py-5 px-6 flex flex-col items-center gap-2">
                        <KelasBrevetLogo
                          variant="hero"
                          logoUrlOverride={brandLogoUrl}
                          brandNameOverride={brandName}
                        />
                        <span className="text-[11px] text-slate-500">
                          Memuat layanan {brandName || 'KelasBrevet'}...
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* =================================================================== */}
      {/* MODAL: DETAIL PESERTA & RINCIAN PENILAIAN                           */}
      {/* =================================================================== */}
      {detailTarget && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xl w-full max-w-3xl my-6 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="font-display font-bold text-base text-slate-900">
                  {detailTarget.result.participant.fullName}
                </h3>
                <div className="text-xs text-slate-500 mt-0.5">
                  {detailTarget.result.participant.email || '-'} &middot;{' '}
                  {detailTarget.result.participant.packageName} &middot;{' '}
                  <span className="font-mono">{detailTarget.result.participant.nikKey}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDetailTarget(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto text-xs">
              {/* Credentials & Overall Result Row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-2">
                  <div className="font-semibold text-slate-900">Kredensial Akses Simulasi</div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-slate-500">ID Pengguna (NIK):</span>
                    <button
                      type="button"
                      onClick={() => copyText('det-nik', detailTarget.result.participant.nikKey)}
                      className="inline-flex items-center gap-1.5 font-mono font-bold text-slate-900 cursor-pointer"
                    >
                      <span>{detailTarget.result.participant.nikKey}</span>
                      {copiedField === 'det-nik' ? (
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <Copy className="w-3.5 h-3.5 text-slate-400" />
                      )}
                    </button>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-slate-500">Kata Sandi:</span>
                    <button
                      type="button"
                      onClick={() =>
                        copyText('det-pw', detailTarget.result.participant.initialPassword || '')
                      }
                      className="inline-flex items-center gap-1.5 font-mono font-bold text-indigo-700 cursor-pointer"
                    >
                      <span>{detailTarget.result.participant.initialPassword || '(Terenkripsi)'}</span>
                      {copiedField === 'det-pw' ? (
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <Copy className="w-3.5 h-3.5 text-slate-400" />
                      )}
                    </button>
                  </div>
                  <div className="pt-2 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        handleRegeneratePassword(detailTarget.result.participant.nikKey)
                      }
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-white border border-slate-300 rounded-md font-medium text-slate-700 hover:bg-slate-100 cursor-pointer"
                    >
                      <KeyRound className="w-3.5 h-3.5" />
                      <span>Reset Kata Sandi</span>
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        handleToggleParticipantActive(
                          detailTarget.result.participant.nikKey,
                          !detailTarget.result.participant.isActive
                        )
                      }
                      className="px-2.5 py-1.5 bg-white border border-slate-300 rounded-md font-medium text-slate-700 hover:bg-slate-100 cursor-pointer"
                    >
                      {detailTarget.result.participant.isActive ? 'Nonaktifkan Akun' : 'Aktifkan Akun'}
                    </button>
                  </div>
                </div>

                <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-2">
                  <div className="font-semibold text-slate-900">Ringkasan Penilaian</div>
                  <div className="flex items-baseline justify-between">
                    <span className="text-slate-500">Nilai Rata-Rata:</span>
                    <span className="text-2xl font-bold font-mono tabular-nums text-slate-900">
                      {detailTarget.result.averageScore}
                      <span className="text-xs font-normal text-slate-500">
                        {' '}
                        / KKM {detailTarget.result.passingScore}
                      </span>
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Status Kelulusan:</span>
                    <span
                      className={`font-bold ${
                        detailTarget.result.isPassed ? 'text-emerald-700' : 'text-amber-700'
                      }`}
                    >
                      {detailTarget.result.graduationStatus}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 pt-1">
                    {detailTarget.result.activityMetrics.approvedInvoices} Faktur Disetujui &middot;{' '}
                    {detailTarget.result.activityMetrics.issuedSlips} Bupot Terbit &middot;{' '}
                    {detailTarget.result.activityMetrics.submittedReturns} SPT Dilaporkan
                  </div>
                </div>
              </div>

              {/* Per-Module Evaluation Breakdown */}
              <div className="space-y-3">
                <h4 className="font-semibold text-slate-900">Evaluasi per Modul Simulasi</h4>
                {detailTarget.result.modules.map((mod) => (
                  <div
                    key={mod.caseCode}
                    className="border border-slate-200 rounded-lg overflow-hidden"
                  >
                    <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-2">
                      <span className="font-semibold text-slate-900">
                        {mod.moduleTag} — {mod.title}
                      </span>
                      <span
                        className={`font-mono font-bold tabular-nums ${
                          mod.isPassed ? 'text-emerald-700' : 'text-amber-700'
                        }`}
                      >
                        {mod.score} ({mod.passedCount}/{mod.totalChecks})
                      </span>
                    </div>
                    <div className="divide-y divide-slate-100">
                      {mod.checks.map((chk) => (
                        <div key={chk.id} className="px-4 py-2.5 flex items-start gap-2.5">
                          {chk.passed ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                          ) : (
                            <XCircle className="w-4 h-4 text-slate-300 shrink-0 mt-0.5" />
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-slate-800">{chk.label}</div>
                            <div className="text-[11px] text-slate-500">
                              Aktual: <span className="font-mono">{chk.actualValue}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* MODAL: TAMBAH PESERTA MANUAL                                        */}
      {/* =================================================================== */}
      {addPartOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xl w-full max-w-lg my-6 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="font-display font-bold text-base text-slate-900">
                Tambah Akun Peserta Manual
              </h3>
              <button
                type="button"
                onClick={() => setAddPartOpen(false)}
                className="text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {createdCreds ? (
              <div className="p-6 space-y-4 text-xs">
                <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 font-medium">
                  Akun peserta berhasil dibuat. Bagikan kredensial dan link login berikut kepada peserta:
                </div>
                <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-2.5 font-mono">
                  <div className="flex justify-between">
                    <span className="text-slate-500">ID Pengguna (NIK):</span>
                    <strong className="text-slate-900">{createdCreds.credentials.nik}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Kata Sandi:</span>
                    <strong className="text-indigo-700">{createdCreds.credentials.password}</strong>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-slate-500 shrink-0">Link Simulasi:</span>
                    <a
                      href={createdCreds.credentials.simulationUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-indigo-700 underline truncate"
                    >
                      {createdCreds.credentials.simulationUrl}
                    </a>
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setCreatedCreds(null)}
                    className="px-4 py-2 border border-slate-300 rounded-lg font-medium text-slate-700 cursor-pointer"
                  >
                    Tambah Lagi
                  </button>
                  <button
                    type="button"
                    onClick={() => setAddPartOpen(false)}
                    className="px-4 py-2 bg-slate-900 text-white rounded-lg font-semibold cursor-pointer"
                  >
                    Selesai
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleCreateParticipant} className="p-6 space-y-3.5 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Nama Lengkap *</label>
                  <input
                    type="text"
                    required
                    value={newPartName}
                    onChange={(e) => setNewPartName(e.target.value)}
                    placeholder="Contoh: Ahmad Fauzan"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Email</label>
                    <input
                      type="email"
                      value={newPartEmail}
                      onChange={(e) => setNewPartEmail(e.target.value)}
                      placeholder="peserta@email.com"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">No. Telepon</label>
                    <input
                      type="text"
                      value={newPartPhone}
                      onChange={(e) => setNewPartPhone(e.target.value)}
                      placeholder="0812..."
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      NIK 16 Digit (Opsional)
                    </label>
                    <input
                      type="text"
                      value={newPartNik}
                      onChange={(e) => setNewPartNik(e.target.value.replace(/\D/g, '').slice(0, 16))}
                      placeholder="Kosongkan untuk auto-generate"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      KKM Lulus (1–100)
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={100}
                      value={newPartPassing}
                      onChange={(e) => setNewPartPassing(Number(e.target.value))}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Paket Brevet</label>
                    <input
                      type="text"
                      value={newPartPackage}
                      onChange={(e) => setNewPartPackage(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Nama Perusahaan PKP (Opsional)
                    </label>
                    <input
                      type="text"
                      value={newPartCompany}
                      onChange={(e) => setNewPartCompany(e.target.value)}
                      placeholder="PT SIMULASI BREVET..."
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={() => setAddPartOpen(false)}
                    className="px-4 py-2 border border-slate-300 rounded-lg font-medium text-slate-700 cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={savingParticipant}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold cursor-pointer"
                  >
                    {savingParticipant ? 'Menyimpan...' : 'Buat Akun Peserta'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* MODAL: TAMBAH / EDIT SOAL LATIHAN (CRUD)                            */}
      {/* =================================================================== */}
      {questionModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xl w-full max-w-2xl my-6 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="font-display font-bold text-base text-slate-900">
                {editingQuestion ? 'Ubah Soal Latihan' : 'Tambah Soal Latihan Manual'}
              </h3>
              <button
                type="button"
                onClick={() => setQuestionModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={handleSaveQuestion}
              className="p-6 space-y-4 text-xs max-h-[78vh] overflow-y-auto"
            >
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Kode Soal *</label>
                  <input
                    type="text"
                    required
                    value={qCode}
                    onChange={(e) => setQCode(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Tag Modul *</label>
                  <input
                    type="text"
                    required
                    value={qModuleTag}
                    onChange={(e) => setQModuleTag(e.target.value)}
                    placeholder="Modul 6 — PPN Ekspor"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Mode Akun</label>
                  <select
                    value={qAccountMode}
                    onChange={(e) =>
                      setQAccountMode(e.target.value as 'CORPORATE' | 'INDIVIDUAL')
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="CORPORATE">Badan / PKP (Impersonate)</option>
                    <option value="INDIVIDUAL">Orang Pribadi</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Judul Soal *</label>
                <input
                  type="text"
                  required
                  value={qTitle}
                  onChange={(e) => setQTitle(e.target.value)}
                  placeholder="Contoh: Studi Kasus Faktur Pajak Pengganti & Nota Retur"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Ringkasan Skenario *
                </label>
                <textarea
                  required
                  rows={3}
                  value={qSummary}
                  onChange={(e) => setQSummary(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Langkah Pengerjaan (1 baris = 1 langkah)
                </label>
                <textarea
                  rows={5}
                  value={qInstructionsText}
                  onChange={(e) => setQInstructionsText(e.target.value)}
                  placeholder={'Beralih ke akun PKP.\nBuka menu e-Faktur > Pajak Keluaran.\nBuat faktur dan tanda tangani.'}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Menu Target</label>
                  <select
                    value={qTargetModule}
                    onChange={(e) => setQTargetModule(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="portal">Portal Saya</option>
                    <option value="efaktur">e-Faktur</option>
                    <option value="ebupot">eBUPOT</option>
                    <option value="spt">SPT</option>
                    <option value="pembayaran">Pembayaran</option>
                    <option value="bukubesar">Buku Besar</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Sub-Tab Target</label>
                  <input
                    type="text"
                    value={qTargetSubTab}
                    onChange={(e) => setQTargetSubTab(e.target.value)}
                    placeholder="output / konsep / bpmp"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">KKM</label>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={qPassingScore}
                    onChange={(e) => setQPassingScore(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Urutan</label>
                  <input
                    type="number"
                    min={1}
                    value={qSortOrder}
                    onChange={(e) => setQSortOrder(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  URL File PDF Eksternal (Opsional — kosongkan untuk generator PDF otomatis)
                </label>
                <input
                  type="url"
                  value={qPdfUrl}
                  onChange={(e) => setQPdfUrl(e.target.value)}
                  placeholder="https://kelasbrevet.com/files/soal-modul-1.pdf"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>

              <label className="inline-flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={qIsActive}
                  onChange={(e) => setQIsActive(e.target.checked)}
                />
                <span className="font-medium text-slate-700">
                  Aktifkan soal ini pada panel Soal Latihan peserta
                </span>
              </label>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setQuestionModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg font-medium text-slate-700 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={savingQuestion}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold cursor-pointer"
                >
                  {savingQuestion ? 'Menyimpan...' : 'Simpan Soal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* MODAL: TAMBAH / EDIT AKUN ADMIN (admin_users)                       */}
      {/* =================================================================== */}
      {adminModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="font-display font-bold text-base text-slate-900">
                {editingAdminUser ? 'Edit Akun Administrator' : 'Tambah Akun Administrator Baru'}
              </h3>
              <button
                type="button"
                onClick={() => setAdminModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAdminUser} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Nama Lengkap *</label>
                <input
                  type="text"
                  required
                  value={admFullName}
                  onChange={(e) => setAdmFullName(e.target.value)}
                  placeholder="Mis. Admin Akademik Brevet"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Email Login *</label>
                <input
                  type="email"
                  required
                  value={admEmail}
                  onChange={(e) => setAdmEmail(e.target.value)}
                  placeholder="admin2@kelasbrevet.com"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  {editingAdminUser
                    ? 'Kata Sandi Baru (Kosongkan jika tidak ingin mengubah)'
                    : 'Kata Sandi * (min. 6 karakter)'}
                </label>
                <input
                  type="password"
                  required={!editingAdminUser}
                  minLength={editingAdminUser ? undefined : 6}
                  value={admPassword}
                  onChange={(e) => setAdmPassword(e.target.value)}
                  placeholder={editingAdminUser ? 'Isi hanya jika ingin ganti password' : 'Minimal 6 karakter'}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Peran</label>
                <select
                  value={admRole}
                  onChange={(e) => setAdmRole(e.target.value as AdminRole)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
                >
                  <option value="ADMIN">Admin Manajemen Simulasi</option>
                  <option value="SUPER_ADMIN">Super Admin</option>
                </select>
              </div>

              <label className="inline-flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={admIsActive}
                  onChange={(e) => setAdmIsActive(e.target.checked)}
                />
                <span className="font-medium text-slate-700">Akun aktif dan dapat login</span>
              </label>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setAdminModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg font-medium text-slate-700 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={savingAdminUser}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold cursor-pointer"
                >
                  {savingAdminUser ? 'Menyimpan...' : 'Simpan Akun Admin'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
