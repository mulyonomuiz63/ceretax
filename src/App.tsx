import React, { useCallback, useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { BellRing, X } from 'lucide-react';
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
  const [printDoc, setPrintDoc] = useState<PrintablePayload | null>(null);
  const [examOpen, setExamOpen] = useState(false);
  const [toastNotif, setToastNotif] = useState<NotificationItem | null>(null);
  const [navHistory, setNavHistory] = useState<{
    entries: Array<{
      module: MainNavKey;
      subTab: string;
      accountMode: 'INDIVIDUAL' | 'CORPORATE';
    }>;
    index: number;
  }>({
    entries: [{ module: 'portal', subTab: 'ikhtisar', accountMode: 'INDIVIDUAL' }],
    index: 0,
  });

  const socketRef = useRef<Socket | null>(null);
  const navTimerRef = useRef<number | null>(null);
  const isPopStateRef = useRef(false);

  const SESSION_KEY = 'kelasbrevet_coretax_session_v1';

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
          const restoredMode = saved.accountMode || 'INDIVIDUAL';
          const restoredMod = saved.activeModule || 'portal';
          const restoredSub = saved.activeSubTab || 'ikhtisar';
          setAccountMode(restoredMode);
          setActiveModule(restoredMod);
          setActiveSubTab(restoredSub);
          setNavHistory({
            entries: [{ module: restoredMod, subTab: restoredSub, accountMode: restoredMode }],
            index: 0,
          });
          if (typeof window !== 'undefined') {
            window.history.replaceState(
              { coretaxIdx: 0, module: restoredMod, subTab: restoredSub, accountMode: restoredMode },
              ''
            );
          }
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
      setNavHistory({
        entries: [{ module: 'portal', subTab: 'ikhtisar', accountMode: 'INDIVIDUAL' }],
        index: 0,
      });
      if (typeof window !== 'undefined') {
        window.history.replaceState(
          { coretaxIdx: 0, module: 'portal', subTab: 'ikhtisar', accountMode: 'INDIVIDUAL' },
          ''
        );
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

  // Sync navigation changes (module, subTab, accountMode) into history stack & browser History API
  useEffect(() => {
    if (!workspace?.nikKey) return;
    if (isPopStateRef.current) {
      isPopStateRef.current = false;
      return;
    }

    setNavHistory((prev) => {
      const current = prev.entries[prev.index];
      if (
        current &&
        current.module === activeModule &&
        current.subTab === activeSubTab &&
        current.accountMode === accountMode
      ) {
        return prev;
      }
      const nextEntries = prev.entries.slice(0, prev.index + 1);
      const nextIndex = nextEntries.length;
      nextEntries.push({ module: activeModule, subTab: activeSubTab, accountMode });
      if (typeof window !== 'undefined') {
        window.history.pushState(
          {
            coretaxSimulator: true,
            coretaxIdx: nextIndex,
            module: activeModule,
            subTab: activeSubTab,
            accountMode,
          },
          ''
        );
      }
      return { entries: nextEntries, index: nextIndex };
    });
  }, [workspace?.nikKey, activeModule, activeSubTab, accountMode]);

  // Listen to browser native Back / Forward buttons (popstate) with boundary trap so undo never exits the simulation
  useEffect(() => {
    if (!workspace?.nikKey) return;
    const handlePopState = (e: PopStateEvent) => {
      const st = e.state as {
        coretaxSimulator?: boolean;
        coretaxIdx?: number;
        module?: MainNavKey;
        subTab?: string;
        accountMode?: 'INDIVIDUAL' | 'CORPORATE';
      } | null;

      // If user reaches the beginning of simulator history or pops outside, keep them inside the simulator
      if (!st || typeof st.coretaxIdx !== 'number' || st.coretaxIdx <= 0) {
        isPopStateRef.current = true;
        const rootEntry = navHistory.entries[0] || {
          module: 'portal',
          subTab: 'ikhtisar',
          accountMode: 'INDIVIDUAL',
        };
        setActiveModule(rootEntry.module);
        setActiveSubTab(rootEntry.subTab);
        setAccountMode(rootEntry.accountMode);
        setNavHistory((prev) => ({ ...prev, index: 0 }));

        // Re-push root state to prevent browser from navigating back to external history/other apps
        if (typeof window !== 'undefined') {
          window.history.pushState(
            {
              coretaxSimulator: true,
              coretaxIdx: 0,
              module: rootEntry.module,
              subTab: rootEntry.subTab,
              accountMode: rootEntry.accountMode,
            },
            ''
          );
        }
        return;
      }

      if (st.module && st.subTab) {
        isPopStateRef.current = true;
        setActiveModule(st.module);
        setActiveSubTab(st.subTab);
        if (st.accountMode) setAccountMode(st.accountMode);
        setNavHistory((prev) => ({
          ...prev,
          index: Math.max(0, Math.min(st.coretaxIdx!, prev.entries.length - 1)),
        }));
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [workspace?.nikKey, navHistory.entries]);

  const handleNavigate = (module: MainNavKey, subTab?: string) => {
    if (module !== activeModule) {
      triggerTransitionLoading('Memuat modul layanan KelasBrevet...');
    }
    setActiveModule(module);
    if (subTab) {
      setActiveSubTab(subTab);
    } else {
      const defaults: Record<MainNavKey, string> = {
        portal: 'dokumen',
        efaktur: 'dashboard',
        ebupot: 'bukti_potong_saya',
        spt: 'konsep',
        pembayaran: 'pemindahbukuan',
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
              await apiCall<{ taxpayer: Taxpayer }>(
                `/api/workspace/${workspace.nikKey}/taxpayer/${taxpayerId}`,
                { method: 'PATCH', body: JSON.stringify(updates) }
              );
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
              await apiCall<{ invoice: TaxInvoice }>(
                `/api/workspace/${workspace.nikKey}/invoices`,
                { method: 'POST', body: JSON.stringify(inv) }
              );
            }}
            onInvoiceAction={async (id, action, payload) => {
              await apiCall<{ invoice?: TaxInvoice }>(
                `/api/workspace/${workspace.nikKey}/invoices/${id}/action`,
                { method: 'POST', body: JSON.stringify({ action, payload }) }
              );
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
              await apiCall<{ slip: WithholdingSlip }>(
                `/api/workspace/${workspace.nikKey}/slips`,
                { method: 'POST', body: JSON.stringify(slip) }
              );
            }}
            onIssueSlips={async (ids) => {
              await apiCall<{ workspace: WorkspaceState }>(
                `/api/workspace/${workspace.nikKey}/slips/issue`,
                { method: 'POST', body: JSON.stringify({ ids }) }
              );
            }}
            onDeleteSlip={async (id) => {
              await apiCall(`/api/workspace/${workspace.nikKey}/slips/${id}`, {
                method: 'DELETE',
              });
            }}
            onUpdateSlip={async (id, updates) => {
              await apiCall<{ slip: WithholdingSlip }>(
                `/api/workspace/${workspace.nikKey}/slips/${id}`,
                { method: 'PUT', body: JSON.stringify(updates) }
              );
            }}
            onCancelSlips={async (ids) => {
              await apiCall<{ workspace: WorkspaceState }>(
                `/api/workspace/${workspace.nikKey}/slips/cancel`,
                { method: 'POST', body: JSON.stringify({ ids }) }
              );
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
              return res.taxReturn;
            }}
            onUpdateReturn={async (ret) => {
              await apiCall<{ taxReturn: TaxReturn }>(
                `/api/workspace/${workspace.nikKey}/returns/${ret.id}`,
                { method: 'PUT', body: JSON.stringify(ret) }
              );
            }}
            onDeleteReturn={async (id) => {
              await apiCall(`/api/workspace/${workspace.nikKey}/returns/${id}`, {
                method: 'DELETE',
              });
            }}
            onSubmitReturn={async (id, paymentMethod) => {
              await apiCall<{ taxReturn: TaxReturn }>(
                `/api/workspace/${workspace.nikKey}/returns/${id}/submit`,
                { method: 'POST', body: JSON.stringify({ paymentMethod }) }
              );
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
              await apiCall<{ billing: any }>(
                `/api/workspace/${workspace.nikKey}/billings`,
                { method: 'POST', body: JSON.stringify(payload) }
              );
            }}
            onPayBilling={async (id) => {
              await apiCall<{ billing: any }>(
                `/api/workspace/${workspace.nikKey}/billings/${id}/pay`,
                { method: 'POST' }
              );
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

