import React, { useCallback, useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { onAuthStateChanged, signInWithPopup } from 'firebase/auth';
import { BellRing, X } from 'lucide-react';
import { auth, googleAuthProvider } from './lib/firebase.ts';
import {
  ensureCloudUserRoot,
  syncBillingToCloud,
  syncInvoiceToCloud,
  syncReturnToCloud,
  syncSlipToCloud,
  syncTaxpayerToCloud,
} from './lib/firebaseSync.ts';
import {
  NotificationItem,
  OpAssetLiabilityFamily,
  TaxInvoice,
  TaxReturn,
  Taxpayer,
  WithholdingSlip,
  WorkspaceState,
} from './types/tax.ts';
import { LoginPage } from './components/LoginPage.tsx';
import { CoretaxShell, MainNavKey } from './components/CoretaxShell.tsx';
import { DocumentPrintModal, PrintablePayload } from './components/DocumentPrintModal.tsx';
import { ExamDrawer } from './components/ExamDrawer.tsx';
import { LoadingOverlay } from './components/LoadingOverlay.tsx';
import { AdminApp } from './admin/AdminApp.tsx';
import { PortalSayaModule } from './modules/PortalSayaModule.tsx';
import { EFakturModule } from './modules/EFakturModule.tsx';
import { EBupotModule } from './modules/EBupotModule.tsx';
import { SptModule } from './modules/SptModule.tsx';
import { PembayaranModule } from './modules/PembayaranModule.tsx';
import { BukuBesarModule } from './modules/BukuBesarModule.tsx';

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; message: string }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, message: '' };
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, message: error?.message || 'Terjadi kesalahan pada antarmuka.' };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-[#F4F6F9] p-6">
          <div className="bg-white border border-red-200 rounded-md shadow p-6 max-w-md w-full space-y-3">
            <h2 className="font-display font-bold text-base text-[#1D2B53]">
              Terjadi Gangguan Sesi Simulasi
            </h2>
            <p className="text-xs text-slate-600">{this.state.message}</p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-[#1D2B53] text-white text-xs font-bold rounded cursor-pointer"
            >
              Muat Ulang Simulator
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function CoretaxSimulatorApp() {
  const [workspace, setWorkspace] = useState<WorkspaceState | null>(null);
  const [accountMode, setAccountMode] = useState<'INDIVIDUAL' | 'CORPORATE'>('INDIVIDUAL');
  const [activeModule, setActiveModule] = useState<MainNavKey>('portal');
  const [activeSubTab, setActiveSubTab] = useState<string>('ikhtisar');
  const [language, setLanguage] = useState<'id-ID' | 'en-US'>('id-ID');
  const [loginLoading, setLoginLoading] = useState(false);
  const [bootLoading, setBootLoading] = useState(true);
  const [navLoading, setNavLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('Memuat Portal KelasBrevet...');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [cloudUserEmail, setCloudUserEmail] = useState<string | null>(null);
  const [printDoc, setPrintDoc] = useState<PrintablePayload | null>(null);
  const [examOpen, setExamOpen] = useState(false);
  const [toastNotif, setToastNotif] = useState<NotificationItem | null>(null);

  const socketRef = useRef<Socket | null>(null);
  const navTimerRef = useRef<number | null>(null);

  const SESSION_KEY = 'kelasbrevet_coretax_session_v1';

  // Track Firebase Auth state for optional Cloud Firestore sync
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setCloudUserEmail(user?.email || null);
    });
    return () => unsub();
  }, []);

  // Auto-restore active NIK session on page refresh + show branded KelasBrevet splash briefly
  useEffect(() => {
    let active = true;
    const minSplash = new Promise<void>((resolve) => window.setTimeout(resolve, 420));
    const restoreTask = (async () => {
      try {
        const raw = sessionStorage.getItem(SESSION_KEY);
        if (!raw) return;
        const saved = JSON.parse(raw) as {
          nikKey?: string;
          accountMode?: 'INDIVIDUAL' | 'CORPORATE';
          activeModule?: MainNavKey;
          activeSubTab?: string;
        };
        if (!saved.nikKey) return;
        const resp = await fetch(`/api/workspace/${encodeURIComponent(saved.nikKey)}`);
        if (!resp.ok) return;
        const ws: WorkspaceState = await resp.json();
        if (active && ws?.nikKey) {
          setWorkspace(ws);
          if (saved.accountMode) setAccountMode(saved.accountMode);
          if (saved.activeModule) setActiveModule(saved.activeModule);
          if (saved.activeSubTab) setActiveSubTab(saved.activeSubTab);
        }
      } catch {
        // Ignore malformed sessionStorage or network errors on restore
      }
    })();

    Promise.all([minSplash, restoreTask]).finally(() => {
      if (active) setBootLoading(false);
    });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!workspace?.nikKey) return;
    try {
      sessionStorage.setItem(
        SESSION_KEY,
        JSON.stringify({
          nikKey: workspace.nikKey,
          accountMode,
          activeModule,
          activeSubTab,
        })
      );
    } catch {
      // Ignore storage quota errors
    }
  }, [workspace?.nikKey, accountMode, activeModule, activeSubTab]);

  // Connect Socket.io real-time notification room when logged in with NIK
  useEffect(() => {
    if (!workspace?.nikKey) return;

    const socket = io('/', { path: '/socket.io', transports: ['websocket', 'polling'] });
    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('join:nik', workspace.nikKey);
    });

    socket.on('notification:new', (notif: NotificationItem) => {
      setToastNotif(notif);
      setTimeout(() => {
        setToastNotif((prev) => (prev?.id === notif.id ? null : prev));
      }, 6000);
    });

    socket.on('workspace:updated', (ws: WorkspaceState) => {
      setWorkspace(ws);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [workspace?.nikKey]);

  const handleConnectCloud = async () => {
    try {
      const cred = await signInWithPopup(auth, googleAuthProvider);
      if (cred.user?.email) {
        setCloudUserEmail(cred.user.email);
        if (workspace) {
          await ensureCloudUserRoot(workspace.nikKey);
          await syncTaxpayerToCloud(workspace.individualTaxpayer);
          await syncTaxpayerToCloud(workspace.corporateTaxpayer);
        }
      }
    } catch (err) {
      console.error('Cloud auth cancelled or failed:', err);
    }
  };

  const handleLoginNik = async (nik: string, password?: string) => {
    setLoginLoading(true);
    setLoginError(null);
    try {
      const resp = await fetch('/api/auth/nik-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nik, password }),
      });
      const data = await resp.json();
      if (!resp.ok) {
        setLoginError(data.error || 'Gagal login NIK.');
        return;
      }
      setWorkspace(data.workspace);
      setAccountMode('INDIVIDUAL');
      setActiveModule('portal');
      setActiveSubTab('ikhtisar');
      if (auth.currentUser?.emailVerified) {
        ensureCloudUserRoot(data.workspace.nikKey).catch(() => {});
        syncTaxpayerToCloud(data.workspace.individualTaxpayer).catch(() => {});
        syncTaxpayerToCloud(data.workspace.corporateTaxpayer).catch(() => {});
      }
    } catch {
      setLoginError('Tidak dapat menghubungi server simulasi.');
    } finally {
      setLoginLoading(false);
    }
  };

  const apiCall = useCallback(
    async <T,>(url: string, options?: RequestInit): Promise<T> => {
      const resp = await fetch(url, {
        headers: { 'Content-Type': 'application/json' },
        ...options,
      });
      const data = await resp.json();
      if (!resp.ok) {
        throw new Error(data.error || 'Permintaan gagal diproses.');
      }
      if (data.workspace) {
        setWorkspace(data.workspace);
      }
      return data as T;
    },
    []
  );

  const triggerTransitionLoading = useCallback((msg: string, durationMs = 260) => {
    setLoadingMessage(msg);
    setNavLoading(true);
    if (navTimerRef.current) window.clearTimeout(navTimerRef.current);
    navTimerRef.current = window.setTimeout(() => {
      setNavLoading(false);
    }, durationMs);
  }, []);

  const handleNavigate = (module: MainNavKey, subTab?: string) => {
    if (module !== activeModule) {
      triggerTransitionLoading('Memuat modul layanan KelasBrevet...');
    }
    setActiveModule(module);
    if (subTab) {
      setActiveSubTab(subTab);
    } else {
      const defaults: Record<MainNavKey, string> = {
        portal: 'ikhtisar',
        efaktur: 'dashboard',
        ebupot: 'bpmp',
        spt: 'konsep',
        pembayaran: 'daftar',
        bukubesar: 'ringkasan',
      };
      setActiveSubTab(defaults[module]);
    }
  };

  const handleSwitchAccountMode = (mode: 'INDIVIDUAL' | 'CORPORATE') => {
    if (mode !== accountMode) {
      triggerTransitionLoading(
        mode === 'CORPORATE'
          ? 'Beralih ke akun Badan / PKP (Impersonating)...'
          : 'Kembali ke akun Utama Orang Pribadi...',
        320
      );
      setAccountMode(mode);
    }
  };

  const globalLoadingVisible = bootLoading || loginLoading || navLoading;

  if (!workspace) {
    return (
      <>
        <LoadingOverlay
          visible={globalLoadingVisible}
          message={loginLoading ? 'Memverifikasi akun KelasBrevet...' : loadingMessage}
        />
        <LoginPage
          onLoginNik={handleLoginNik}
          language={language}
          onLanguageChange={setLanguage}
          cloudUserEmail={cloudUserEmail}
          onConnectCloud={handleConnectCloud}
          loading={loginLoading}
          error={loginError}
        />
      </>
    );
  }

  const activeTaxpayer =
    accountMode === 'CORPORATE' ? workspace.corporateTaxpayer : workspace.individualTaxpayer;

  return (
    <>
      <LoadingOverlay visible={globalLoadingVisible} message={loadingMessage} />
      <CoretaxShell
        activeModule={activeModule}
        activeSubTab={activeSubTab}
        onNavigate={handleNavigate}
        individualTaxpayer={workspace.individualTaxpayer}
        corporateTaxpayer={workspace.corporateTaxpayer}
        accountMode={accountMode}
        onSwitchAccountMode={handleSwitchAccountMode}
        notifications={workspace.notifications}
        onMarkAllNotificationsRead={() => {
          apiCall(`/api/workspace/${workspace.nikKey}/notifications/read-all`, {
            method: 'POST',
          }).catch(() => {});
        }}
        onOpenExamDrawer={() => setExamOpen(true)}
        language={language}
        onLanguageChange={setLanguage}
        cloudUserEmail={cloudUserEmail}
        onConnectCloud={handleConnectCloud}
        onLogout={() => {
          try {
            sessionStorage.removeItem(SESSION_KEY);
          } catch {}
          setWorkspace(null);
        }}
      >
        {activeModule === 'portal' && (
          <PortalSayaModule
            subTab={activeSubTab}
            onChangeSubTab={setActiveSubTab}
            workspace={workspace}
            activeTaxpayer={activeTaxpayer}
            accountMode={accountMode}
            onSwitchAccountMode={setAccountMode}
            onNavigate={handleNavigate}
            onUpdateProfile={async (taxpayerId, updates: Partial<Taxpayer>) => {
              const res = await apiCall<{ taxpayer: Taxpayer }>(
                `/api/workspace/${workspace.nikKey}/taxpayer/${taxpayerId}`,
                { method: 'PATCH', body: JSON.stringify(updates) }
              );
              if (auth.currentUser?.emailVerified) {
                syncTaxpayerToCloud(res.taxpayer).catch(() => {});
              }
            }}
            onPrintDocument={setPrintDoc}
          />
        )}

        {activeModule === 'efaktur' && (
          <EFakturModule
            subTab={activeSubTab}
            onChangeSubTab={setActiveSubTab}
            workspace={workspace}
            activeTaxpayer={activeTaxpayer}
            accountMode={accountMode}
            onSwitchAccountMode={setAccountMode}
            onCreateInvoice={async (inv: Omit<TaxInvoice, 'id' | 'createdAt' | 'amendmentSeq'>) => {
              const res = await apiCall<{ invoice: TaxInvoice }>(
                `/api/workspace/${workspace.nikKey}/invoices`,
                { method: 'POST', body: JSON.stringify(inv) }
              );
              if (auth.currentUser?.emailVerified) {
                syncInvoiceToCloud(res.invoice).catch(() => {});
              }
            }}
            onInvoiceAction={async (id, action, payload) => {
              const res = await apiCall<{ invoice?: TaxInvoice }>(
                `/api/workspace/${workspace.nikKey}/invoices/${id}/action`,
                { method: 'POST', body: JSON.stringify({ action, payload }) }
              );
              if (res.invoice && auth.currentUser?.emailVerified) {
                syncInvoiceToCloud(res.invoice).catch(() => {});
              }
            }}
            onPrintDocument={setPrintDoc}
          />
        )}

        {activeModule === 'ebupot' && (
          <EBupotModule
            subTab={activeSubTab}
            onChangeSubTab={setActiveSubTab}
            workspace={workspace}
            activeTaxpayer={activeTaxpayer}
            accountMode={accountMode}
            onSwitchAccountMode={setAccountMode}
            onCreateSlip={async (slip: Omit<WithholdingSlip, 'id' | 'createdAt' | 'status'>) => {
              const res = await apiCall<{ slip: WithholdingSlip }>(
                `/api/workspace/${workspace.nikKey}/slips`,
                { method: 'POST', body: JSON.stringify(slip) }
              );
              if (auth.currentUser?.emailVerified) {
                syncSlipToCloud(res.slip).catch(() => {});
              }
            }}
            onIssueSlips={async (ids) => {
              const res = await apiCall<{ workspace: WorkspaceState }>(
                `/api/workspace/${workspace.nikKey}/slips/issue`,
                { method: 'POST', body: JSON.stringify({ ids }) }
              );
              if (auth.currentUser?.emailVerified) {
                res.workspace.slips
                  .filter((s) => ids.includes(s.id))
                  .forEach((s) => syncSlipToCloud(s).catch(() => {}));
              }
            }}
            onDeleteSlip={async (id) => {
              await apiCall(`/api/workspace/${workspace.nikKey}/slips/${id}`, {
                method: 'DELETE',
              });
            }}
            onImportXml={async (xml) => {
              const res = await apiCall<{ importedCount: number }>(
                `/api/workspace/${workspace.nikKey}/slips/import-xml`,
                { method: 'POST', body: JSON.stringify({ xml }) }
              );
              return res.importedCount;
            }}
            onPrintDocument={setPrintDoc}
          />
        )}

        {activeModule === 'spt' && (
          <SptModule
            subTab={activeSubTab}
            onChangeSubTab={setActiveSubTab}
            workspace={workspace}
            activeTaxpayer={activeTaxpayer}
            accountMode={accountMode}
            onCreateReturn={async (ret) => {
              const res = await apiCall<{ taxReturn: TaxReturn }>(
                `/api/workspace/${workspace.nikKey}/returns`,
                { method: 'POST', body: JSON.stringify(ret) }
              );
              if (auth.currentUser?.emailVerified) {
                syncReturnToCloud(res.taxReturn).catch(() => {});
              }
              return res.taxReturn;
            }}
            onUpdateReturn={async (ret) => {
              const res = await apiCall<{ taxReturn: TaxReturn }>(
                `/api/workspace/${workspace.nikKey}/returns/${ret.id}`,
                { method: 'PUT', body: JSON.stringify(ret) }
              );
              if (auth.currentUser?.emailVerified) {
                syncReturnToCloud(res.taxReturn).catch(() => {});
              }
            }}
            onDeleteReturn={async (id) => {
              await apiCall(`/api/workspace/${workspace.nikKey}/returns/${id}`, {
                method: 'DELETE',
              });
            }}
            onSubmitReturn={async (id, paymentMethod) => {
              const res = await apiCall<{ taxReturn: TaxReturn }>(
                `/api/workspace/${workspace.nikKey}/returns/${id}/submit`,
                { method: 'POST', body: JSON.stringify({ paymentMethod }) }
              );
              if (auth.currentUser?.emailVerified) {
                syncReturnToCloud(res.taxReturn).catch(() => {});
              }
            }}
            onAddAsset={async (item: Omit<OpAssetLiabilityFamily, 'id' | 'taxpayerId'>) => {
              await apiCall(`/api/workspace/${workspace.nikKey}/assets`, {
                method: 'POST',
                body: JSON.stringify(item),
              });
            }}
            onDeleteAsset={async (id) => {
              await apiCall(`/api/workspace/${workspace.nikKey}/assets/${id}`, {
                method: 'DELETE',
              });
            }}
            onPrintDocument={setPrintDoc}
          />
        )}

        {activeModule === 'pembayaran' && (
          <PembayaranModule
            subTab={activeSubTab}
            onChangeSubTab={setActiveSubTab}
            workspace={workspace}
            activeTaxpayer={activeTaxpayer}
            onCreateBilling={async (payload) => {
              const res = await apiCall<{ billing: any }>(
                `/api/workspace/${workspace.nikKey}/billings`,
                { method: 'POST', body: JSON.stringify(payload) }
              );
              if (auth.currentUser?.emailVerified) {
                syncBillingToCloud(res.billing).catch(() => {});
              }
            }}
            onPayBilling={async (id) => {
              const res = await apiCall<{ billing: any }>(
                `/api/workspace/${workspace.nikKey}/billings/${id}/pay`,
                { method: 'POST' }
              );
              if (auth.currentUser?.emailVerified) {
                syncBillingToCloud(res.billing).catch(() => {});
              }
            }}
            onPrintDocument={setPrintDoc}
          />
        )}

        {activeModule === 'bukubesar' && (
          <BukuBesarModule workspace={workspace} activeTaxpayer={activeTaxpayer} />
        )}
      </CoretaxShell>

      {/* Real-Time Socket.io Toast Notification */}
      {toastNotif && (
        <div className="fixed bottom-5 right-5 z-50 w-80 sm:w-96 bg-[#1B2958] text-white border border-white/15 rounded-2xl shadow-[0_20px_48px_rgba(27,41,88,0.32)] p-4 text-xs">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2 font-bold text-[#F4C430]">
              <BellRing className="w-4 h-4 shrink-0" />
              <span>{toastNotif.title}</span>
            </div>
            <button
              type="button"
              onClick={() => setToastNotif(null)}
              className="text-slate-300 hover:text-white cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <p className="text-slate-200 mt-1 leading-snug">{toastNotif.message}</p>
        </div>
      )}

      {/* Printable BPE / BPA1 / e-Faktur / Billing Modal */}
      <DocumentPrintModal doc={printDoc} onClose={() => setPrintDoc(null)} />

      {/* Read-Only Soal Latihan Drawer (No Scores / No Pass-Fail inside Simulator) */}
      <ExamDrawer
        open={examOpen}
        onClose={() => setExamOpen(false)}
        onNavigateAndSwitch={(mode, mod, sub) => {
          setAccountMode(mode);
          handleNavigate(mod as MainNavKey, sub);
          setExamOpen(false);
        }}
      />
    </>
  );
}

export default function App() {
  const isAdminRoute =
    typeof window !== 'undefined' && window.location.pathname.startsWith('/admin');

  return (
    <ErrorBoundary>
      {isAdminRoute ? <AdminApp /> : <CoretaxSimulatorApp />}
    </ErrorBoundary>
  );
}

