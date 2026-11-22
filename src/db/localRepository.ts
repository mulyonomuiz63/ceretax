import fs from 'fs';
import path from 'path';
import {
  BillingCode,
  ExamEvaluation,
  NotificationItem,
  OpAssetLiabilityFamily,
  TaxInvoice,
  TaxReturn,
  Taxpayer,
  WithholdingSlip,
  WorkspaceState,
} from '../types/tax.ts';
import { createSeedWorkspace } from '../data/seedData.ts';
import {
  formatRp,
  generateBillingCode,
  generateBpeNumber,
  generateNtpn,
} from '../utils/taxCalc.ts';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'simulator-db.json');

let store: Record<string, WorkspaceState> | null = null;

function ensureStoreLoaded(): Record<string, WorkspaceState> {
  if (store !== null) return store;
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (fs.existsSync(DB_FILE)) {
      const raw = fs.readFileSync(DB_FILE, 'utf-8');
      store = JSON.parse(raw) as Record<string, WorkspaceState>;
      return store;
    }
  } catch (err) {
    console.error('[Local Dev DB] Failed to load local store:', err);
  }
  store = {};
  return store;
}

function saveStore(): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(DB_FILE, JSON.stringify(store ?? {}, null, 2), 'utf-8');
  } catch (err) {
    console.error('[Local Dev DB] Failed to persist local store:', err);
  }
}

function getOrSeedSync(nikKey: string): WorkspaceState {
  const db = ensureStoreLoaded();
  if (!db[nikKey]) {
    db[nikKey] = createSeedWorkspace(nikKey);
    saveStore();
  }
  return db[nikKey];
}

export async function loadWorkspace(nikKey: string): Promise<WorkspaceState | null> {
  const db = ensureStoreLoaded();
  return db[nikKey] || null;
}

export async function getOrCreateWorkspace(nikKey: string): Promise<WorkspaceState> {
  return getOrSeedSync(nikKey);
}

export async function resetWorkspace(nikKey: string): Promise<{
  workspace: WorkspaceState;
  notif: NotificationItem;
}> {
  const db = ensureStoreLoaded();
  db[nikKey] = createSeedWorkspace(nikKey);
  const notif: NotificationItem = {
    id: `notif-${Date.now()}-${Math.floor(Math.random() * 9999)}`,
    taxpayerId: db[nikKey].individualTaxpayer.id,
    title: 'Skenario Simulasi Direset',
    message: 'Data latihan telah dikembalikan ke kondisi awal soal studi kasus KelasBrevet.',
    category: 'EXAM',
    isRead: false,
    createdAt: new Date().toISOString(),
  };
  db[nikKey].notifications.unshift(notif);
  saveStore();
  return { workspace: db[nikKey], notif };
}

export async function updateTaxpayer(
  nikKey: string,
  taxpayerId: string,
  updates: Partial<Taxpayer>
): Promise<Taxpayer | null> {
  const ws = getOrSeedSync(nikKey);
  const target =
    ws.individualTaxpayer.id === taxpayerId
      ? ws.individualTaxpayer
      : ws.corporateTaxpayer.id === taxpayerId
        ? ws.corporateTaxpayer
        : null;
  if (!target) return null;

  Object.assign(target, {
    name: updates.name ?? target.name,
    address: updates.address ?? target.address,
    email: updates.email ?? target.email,
    phone: updates.phone ?? target.phone,
    ptkpStatus: updates.ptkpStatus ?? target.ptkpStatus,
    kluCode: updates.kluCode ?? target.kluCode,
    kluName: updates.kluName ?? target.kluName,
  });
  saveStore();
  return target;
}

export async function insertInvoice(nikKey: string, inv: TaxInvoice): Promise<void> {
  const ws = getOrSeedSync(nikKey);
  ws.invoices.unshift(inv);
  saveStore();
}

export async function getInvoiceById(nikKey: string, id: string): Promise<TaxInvoice | null> {
  const ws = getOrSeedSync(nikKey);
  return ws.invoices.find((i) => i.id === id) || null;
}

export async function countInvoices(nikKey: string): Promise<number> {
  const ws = getOrSeedSync(nikKey);
  return ws.invoices.length;
}

export async function updateInvoice(nikKey: string, inv: TaxInvoice): Promise<void> {
  const ws = getOrSeedSync(nikKey);
  const idx = ws.invoices.findIndex((i) => i.id === inv.id);
  if (idx !== -1) {
    ws.invoices[idx] = { ...inv };
    saveStore();
  }
}

export async function deleteInvoice(nikKey: string, id: string): Promise<void> {
  const ws = getOrSeedSync(nikKey);
  ws.invoices = ws.invoices.filter((i) => i.id !== id);
  saveStore();
}

export async function insertSlip(nikKey: string, slip: WithholdingSlip): Promise<void> {
  const ws = getOrSeedSync(nikKey);
  ws.slips.unshift(slip);
  saveStore();
}

export async function insertSlipsBatch(nikKey: string, slips: WithholdingSlip[]): Promise<void> {
  const ws = getOrSeedSync(nikKey);
  for (const slip of slips) {
    ws.slips.unshift(slip);
  }
  saveStore();
}

export async function countSlips(nikKey: string): Promise<number> {
  const ws = getOrSeedSync(nikKey);
  return ws.slips.length;
}

export async function issueSlips(nikKey: string, ids: string[]): Promise<number> {
  const ws = getOrSeedSync(nikKey);
  let count = 0;
  const now = new Date().toISOString();
  for (const slip of ws.slips) {
    if (ids.includes(slip.id) && slip.status === 'UNISSUED') {
      slip.status = 'ISSUED';
      const prefix = slip.slipType === 'BPPU_23' ? '2.3' : slip.slipType === 'BPA1' ? '1.1' : '1.3';
      const mm = String(slip.taxPeriodMonth).padStart(2, '0');
      const yy = String(slip.taxPeriodYear).slice(-2);
      slip.slipNumber = `${prefix}-${mm}.${yy}-${String(Math.floor(1000000 + Math.random() * 8999999))}`;
      slip.signedAt = now;
      count++;
    }
  }
  if (count > 0) saveStore();
  return count;
}

export async function deleteSlip(nikKey: string, id: string): Promise<void> {
  const ws = getOrSeedSync(nikKey);
  ws.slips = ws.slips.filter((s) => s.id !== id);
  saveStore();
}

export async function insertAsset(nikKey: string, item: OpAssetLiabilityFamily): Promise<void> {
  const ws = getOrSeedSync(nikKey);
  ws.assets.push(item);
  saveStore();
}

export async function deleteAsset(nikKey: string, id: string): Promise<void> {
  const ws = getOrSeedSync(nikKey);
  ws.assets = ws.assets.filter((a) => a.id !== id);
  saveStore();
}

export async function insertReturn(nikKey: string, ret: TaxReturn): Promise<void> {
  const ws = getOrSeedSync(nikKey);
  ws.returns.unshift(ret);
  saveStore();
}

export async function getReturnById(nikKey: string, id: string): Promise<TaxReturn | null> {
  const ws = getOrSeedSync(nikKey);
  return ws.returns.find((r) => r.id === id) || null;
}

export async function updateReturn(nikKey: string, ret: TaxReturn): Promise<void> {
  const ws = getOrSeedSync(nikKey);
  const idx = ws.returns.findIndex((r) => r.id === ret.id);
  if (idx !== -1) {
    ws.returns[idx] = { ...ret };
    saveStore();
  }
}

export async function deleteReturn(nikKey: string, id: string): Promise<void> {
  const ws = getOrSeedSync(nikKey);
  ws.returns = ws.returns.filter((r) => r.id !== id);
  saveStore();
}

export async function submitReturnInMysql(
  nikKey: string,
  returnId: string,
  paymentMethod?: 'DEPOSIT' | 'BILLING' | 'NONE'
): Promise<{
  error?: string;
  statusCode?: number;
  taxReturn?: TaxReturn;
  notif?: NotificationItem;
}> {
  const ws = getOrSeedSync(nikKey);
  const ret = ws.returns.find((r) => r.id === returnId);
  if (!ret) return { error: 'SPT tidak ditemukan.', statusCode: 404 };

  const tp =
    ret.taxpayerId === ws.corporateTaxpayer.id ? ws.corporateTaxpayer : ws.individualTaxpayer;

  const kapMap: Record<
    TaxReturn['returnType'],
    { kap: string; kjs: string; code: string; desc: string }
  > = {
    SPT_MASA_PPN: { kap: '411211', kjs: '100', code: 'PPN', desc: 'SPT Masa PPN Dalam Negeri' },
    SPT_MASA_PPH21: {
      kap: '411121',
      kjs: '100',
      code: 'PPH21',
      desc: 'SPT Masa PPh Pasal 21/26',
    },
    SPT_MASA_UNIFIKASI: {
      kap: '411124',
      kjs: '104',
      code: 'UNIF',
      desc: 'SPT Masa PPh Unifikasi (PPh 23)',
    },
    SPT_TAHUNAN_OP: {
      kap: '411125',
      kjs: '200',
      code: 'OP',
      desc: 'SPT Tahunan PPh Orang Pribadi',
    },
    SPT_TAHUNAN_BADAN: {
      kap: '411126',
      kjs: '200',
      code: 'BDN',
      desc: 'SPT Tahunan PPh Badan (Pasal 29)',
    },
  };
  const meta = kapMap[ret.returnType];
  const now = new Date().toISOString();
  let notif: NotificationItem;

  if (ret.underOverPayment > 0) {
    if (paymentMethod === 'DEPOSIT') {
      if (tp.depositBalance < ret.underOverPayment) {
        return {
          error:
            'Saldo Deposit Pajak tidak mencukupi. Gunakan Kode Billing atau isi Deposit.',
          statusCode: 400,
        };
      }
      tp.depositBalance -= ret.underOverPayment;
      ret.paymentMethod = 'DEPOSIT';
      ret.status = 'SUBMITTED';
      ret.bpeNumber = generateBpeNumber(meta.code);
      ret.submittedAt = now;
      notif = {
        id: `notif-${Date.now()}-${Math.floor(Math.random() * 9999)}`,
        taxpayerId: tp.id,
        title: `BPE Terbit — ${meta.desc}`,
        message: `Pemindahbukuan Deposit sebesar ${formatRp(ret.underOverPayment)} berhasil. SPT telah dilaporkan dengan BPE ${ret.bpeNumber}.`,
        category: 'SPT',
        relatedEntityId: ret.id,
        isRead: false,
        createdAt: now,
      };
    } else {
      const billing: BillingCode = {
        id: `bill-${Date.now()}-${Math.floor(Math.random() * 999)}`,
        taxpayerId: tp.id,
        returnId: ret.id,
        kapCode: meta.kap,
        kjsCode: meta.kjs,
        description: meta.desc,
        taxPeriodLabel:
          ret.taxPeriodMonth > 0
            ? `Masa ${ret.taxPeriodMonth}/${ret.taxYear}`
            : `Tahun ${ret.taxYear}`,
        billingCode: generateBillingCode(),
        amount: ret.underOverPayment,
        status: 'UNPAID',
        createdAt: now,
      };
      ws.billings.unshift(billing);
      ret.paymentMethod = 'BILLING';
      ret.billingCodeId = billing.id;
      ret.status = 'WAITING_PAYMENT';
      notif = {
        id: `notif-${Date.now()}-${Math.floor(Math.random() * 9999)}`,
        taxpayerId: tp.id,
        title: `Kode Billing Dibuat (${billing.billingCode})`,
        message: `SPT menunggu pelunasan ${formatRp(billing.amount)}. Buka menu Pembayaran > Daftar Kode Billing Belum Dibayar untuk melunasi & menerbitkan BPE.`,
        category: 'BILLING',
        relatedEntityId: billing.id,
        isRead: false,
        createdAt: now,
      };
    }
  } else {
    ret.paymentMethod = 'NONE';
    ret.status = 'SUBMITTED';
    ret.bpeNumber = generateBpeNumber(meta.code);
    ret.submittedAt = now;
    notif = {
      id: `notif-${Date.now()}-${Math.floor(Math.random() * 9999)}`,
      taxpayerId: tp.id,
      title: `BPE Terbit — ${meta.desc}`,
      message: `SPT berstatus ${ret.underOverPayment === 0 ? 'NIHIL' : 'LEBIH BAYAR'} telah resmi dilaporkan dengan Nomor BPE ${ret.bpeNumber}.`,
      category: 'SPT',
      relatedEntityId: ret.id,
      isRead: false,
      createdAt: now,
    };
  }

  ret.updatedAt = now;
  ws.notifications.unshift(notif);
  if (ws.notifications.length > 60) ws.notifications.pop();
  saveStore();
  return { taxReturn: ret, notif };
}

export async function insertBilling(nikKey: string, bill: BillingCode): Promise<void> {
  const ws = getOrSeedSync(nikKey);
  ws.billings.unshift(bill);
  saveStore();
}

export async function payBillingInMysql(
  nikKey: string,
  billingId: string
): Promise<{
  error?: string;
  statusCode?: number;
  billing?: BillingCode;
  notif?: NotificationItem | null;
}> {
  const ws = getOrSeedSync(nikKey);
  const bill = ws.billings.find((b) => b.id === billingId);
  if (!bill) return { error: 'Kode Billing tidak ditemukan.', statusCode: 404 };
  if (bill.status === 'PAID') return { billing: bill, notif: null };

  const now = new Date().toISOString();
  bill.status = 'PAID';
  bill.ntpn = generateNtpn();
  bill.paidAt = now;

  const tp =
    bill.taxpayerId === ws.corporateTaxpayer.id ? ws.corporateTaxpayer : ws.individualTaxpayer;

  let notif: NotificationItem | null = null;
  if (bill.kapCode === '411618') {
    tp.depositBalance += bill.amount;
    notif = {
      id: `notif-${Date.now()}-${Math.floor(Math.random() * 9999)}`,
      taxpayerId: tp.id,
      title: 'Top-Up Saldo Deposit Berhasil',
      message: `NTPN ${bill.ntpn} diterima. Saldo Deposit Pajak bertambah ${formatRp(bill.amount)}.`,
      category: 'BILLING',
      relatedEntityId: bill.id,
      isRead: false,
      createdAt: now,
    };
  } else if (bill.returnId) {
    const ret = ws.returns.find((r) => r.id === bill.returnId);
    if (ret && ret.status === 'WAITING_PAYMENT') {
      ret.status = 'SUBMITTED';
      ret.bpeNumber = generateBpeNumber(ret.returnType.replace('SPT_', '').slice(0, 4));
      ret.submittedAt = now;
      ret.updatedAt = now;
      notif = {
        id: `notif-${Date.now()}-${Math.floor(Math.random() * 9999)}`,
        taxpayerId: tp.id,
        title: 'Pembayaran NTPN Sukses & BPE Terbit',
        message: `NTPN ${bill.ntpn} untuk Billing ${bill.billingCode} terkonfirmasi. SPT otomatis berstatus DILAPORKAN dengan BPE ${ret.bpeNumber}.`,
        category: 'SPT',
        relatedEntityId: ret.id,
        isRead: false,
        createdAt: now,
      };
    }
  } else {
    notif = {
      id: `notif-${Date.now()}-${Math.floor(Math.random() * 9999)}`,
      taxpayerId: tp.id,
      title: 'Pembayaran Pajak Terkonfirmasi',
      message: `ID Billing ${bill.billingCode} lunas dengan NTPN ${bill.ntpn}.`,
      category: 'BILLING',
      relatedEntityId: bill.id,
      isRead: false,
      createdAt: now,
    };
  }

  if (notif) {
    ws.notifications.unshift(notif);
    if (ws.notifications.length > 60) ws.notifications.pop();
  }
  saveStore();
  return { billing: bill, notif };
}

export async function insertNotification(
  nikKey: string,
  notif: NotificationItem
): Promise<void> {
  const ws = getOrSeedSync(nikKey);
  ws.notifications.unshift(notif);
  if (ws.notifications.length > 60) ws.notifications.pop();
  saveStore();
}

export async function markAllNotificationsRead(nikKey: string): Promise<void> {
  const ws = getOrSeedSync(nikKey);
  ws.notifications.forEach((n) => (n.isRead = true));
  saveStore();
}

export async function upsertExamEvaluation(
  nikKey: string,
  evaluation: ExamEvaluation
): Promise<void> {
  const ws = getOrSeedSync(nikKey);
  ws.examEvaluations[evaluation.caseCode] = evaluation;
  saveStore();
}
