import { PoolConnection, RowDataPacket } from 'mysql2/promise';
import {
  BillingCode,
  ExamCaseCode,
  ExamCheckItem,
  ExamEvaluation,
  NotificationItem,
  OpAssetLiabilityFamily,
  PtkpStatus,
  ReturnStatus,
  ReturnType,
  SlipStatus,
  SlipType,
  TaxInvoice,
  TaxInvoiceItem,
  TaxReturn,
  Taxpayer,
  TaxpayerType,
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
import { ensureMysqlSchema, withMysqlTransaction } from './mysql.ts';

function parseJsonSafe<T>(raw: unknown, fallback: T): T {
  if (raw === null || raw === undefined) return fallback;
  if (typeof raw !== 'string') return raw as T;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function mapTaxpayerRow(row: RowDataPacket): Taxpayer {
  return {
    id: String(row.id),
    nikNpwp: String(row.nik_npwp),
    name: String(row.name),
    taxpayerType: String(row.taxpayer_type) as TaxpayerType,
    isPkp: Boolean(row.is_pkp),
    ptkpStatus: String(row.ptkp_status) as PtkpStatus,
    address: String(row.address),
    kluCode: String(row.klu_code),
    kluName: String(row.klu_name),
    email: String(row.email),
    phone: String(row.phone),
    kppName: String(row.kpp_name),
    passphraseHint: String(row.passphrase_hint),
    depositBalance: Number(row.deposit_balance || 0),
    isDemo: Boolean(row.is_demo),
    linkedCorporateId: row.linked_corporate_id ? String(row.linked_corporate_id) : undefined,
  };
}

function mapInvoiceRow(row: RowDataPacket): TaxInvoice {
  return {
    id: String(row.id),
    taxpayerId: String(row.taxpayer_id),
    direction: String(row.direction) as TaxInvoice['direction'],
    transactionCode: String(row.transaction_code),
    invoiceNumber: String(row.invoice_number),
    amendmentSeq: Number(row.amendment_seq || 0),
    referenceCode: String(row.reference_code || ''),
    counterpartyNpwp: String(row.counterparty_npwp),
    counterpartyName: String(row.counterparty_name),
    invoiceDate: String(row.invoice_date),
    taxPeriodMonth: Number(row.tax_period_month),
    taxPeriodYear: Number(row.tax_period_year),
    items: parseJsonSafe<TaxInvoiceItem[]>(row.items_json, []),
    dppTotal: Number(row.dpp_total || 0),
    dppOtherValue: Number(row.dpp_other_value || 0),
    ppnTotal: Number(row.ppn_total || 0),
    ppnbmTotal: Number(row.ppnbm_total || 0),
    status: String(row.status) as TaxInvoice['status'],
    isCredited: Boolean(row.is_credited),
    sp2dNumber: row.sp2d_number ? String(row.sp2d_number) : undefined,
    returnAmount: Number(row.return_amount || 0),
    returnNoteNumber: row.return_note_number ? String(row.return_note_number) : undefined,
    returnDate: row.return_date ? String(row.return_date) : undefined,
    signedAt: row.signed_at ? String(row.signed_at) : undefined,
    createdAt: String(row.created_at),
  };
}

function mapSlipRow(row: RowDataPacket): WithholdingSlip {
  return {
    id: String(row.id),
    issuerId: String(row.issuer_id),
    issuerNpwp: String(row.issuer_npwp),
    issuerName: String(row.issuer_name),
    recipientNikNpwp: String(row.recipient_nik_npwp),
    recipientName: String(row.recipient_name),
    recipientAddress: row.recipient_address ? String(row.recipient_address) : undefined,
    slipType: String(row.slip_type) as SlipType,
    slipNumber: String(row.slip_number),
    taxPeriodMonth: Number(row.tax_period_month),
    taxPeriodYear: Number(row.tax_period_year),
    objectCode: String(row.object_code),
    objectName: String(row.object_name),
    ptkpStatus: String(row.ptkp_status) as PtkpStatus,
    grossAmount: Number(row.gross_amount || 0),
    positionAllowance: row.position_allowance !== null ? Number(row.position_allowance) : undefined,
    pensionContribution:
      row.pension_contribution !== null ? Number(row.pension_contribution) : undefined,
    netAmount: Number(row.net_amount || 0),
    ptkpAmount: row.ptkp_amount !== null ? Number(row.ptkp_amount) : undefined,
    pkpAmount: row.pkp_amount !== null ? Number(row.pkp_amount) : undefined,
    ratePercent: Number(row.rate_percent || 0),
    taxWithheld: Number(row.tax_withheld || 0),
    status: String(row.status) as SlipStatus,
    signedAt: row.signed_at ? String(row.signed_at) : undefined,
    createdAt: String(row.created_at),
  };
}

function mapAssetRow(row: RowDataPacket): OpAssetLiabilityFamily {
  return {
    id: String(row.id),
    taxpayerId: String(row.taxpayer_id),
    recordType: String(row.record_type) as OpAssetLiabilityFamily['recordType'],
    code: String(row.code),
    description: String(row.description),
    yearAcquired: Number(row.year_acquired || 2024),
    amount: Number(row.amount || 0),
    relationOrLender: String(row.relation_or_lender || ''),
    nikMember: row.nik_member ? String(row.nik_member) : undefined,
  };
}

function mapReturnRow(row: RowDataPacket): TaxReturn {
  return {
    id: String(row.id),
    taxpayerId: String(row.taxpayer_id),
    returnType: String(row.return_type) as ReturnType,
    taxYear: Number(row.tax_year),
    taxPeriodMonth: Number(row.tax_period_month || 0),
    revisionNo: Number(row.revision_no || 0),
    status: String(row.status) as ReturnStatus,
    bpeNumber: row.bpe_number ? String(row.bpe_number) : undefined,
    taxPayable: Number(row.tax_payable || 0),
    taxCredit: Number(row.tax_credit || 0),
    underOverPayment: Number(row.under_over_payment || 0),
    paymentMethod: row.payment_method
      ? (String(row.payment_method) as TaxReturn['paymentMethod'])
      : undefined,
    billingCodeId: row.billing_code_id ? String(row.billing_code_id) : undefined,
    payload: parseJsonSafe<TaxReturn['payload']>(row.payload_json, {} as TaxReturn['payload']),
    submittedAt: row.submitted_at ? String(row.submitted_at) : undefined,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function mapBillingRow(row: RowDataPacket): BillingCode {
  return {
    id: String(row.id),
    taxpayerId: String(row.taxpayer_id),
    returnId: row.return_id ? String(row.return_id) : undefined,
    kapCode: String(row.kap_code),
    kjsCode: String(row.kjs_code),
    description: String(row.description),
    taxPeriodLabel: String(row.tax_period_label),
    billingCode: String(row.billing_code),
    amount: Number(row.amount || 0),
    status: String(row.status) as BillingCode['status'],
    ntpn: row.ntpn ? String(row.ntpn) : undefined,
    paidAt: row.paid_at ? String(row.paid_at) : undefined,
    createdAt: String(row.created_at),
  };
}

function mapNotificationRow(row: RowDataPacket): NotificationItem {
  return {
    id: String(row.id),
    taxpayerId: String(row.taxpayer_id),
    title: String(row.title),
    message: String(row.message),
    category: String(row.category) as NotificationItem['category'],
    relatedEntityId: row.related_entity_id ? String(row.related_entity_id) : undefined,
    isRead: Boolean(row.is_read),
    createdAt: String(row.created_at),
  };
}

function mapExamRow(row: RowDataPacket): ExamEvaluation {
  return {
    caseCode: String(row.case_code) as ExamCaseCode,
    score: Number(row.score || 0),
    passedCount: Number(row.passed_count || 0),
    totalChecks: Number(row.total_checks || 0),
    checks: parseJsonSafe<ExamCheckItem[]>(row.checks_json, []),
    evaluatedAt: String(row.evaluated_at),
  };
}

async function insertTaxpayerWithConn(
  conn: PoolConnection,
  nikKey: string,
  role: 'INDIVIDUAL' | 'CORPORATE',
  tp: Taxpayer
): Promise<void> {
  await conn.execute(
    `INSERT INTO taxpayers (
      id, nik_key, account_role, nik_npwp, name, taxpayer_type, is_pkp, ptkp_status,
      address, klu_code, klu_name, email, phone, kpp_name, passphrase_hint,
      deposit_balance, is_demo, linked_corporate_id
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      tp.id,
      nikKey,
      role,
      tp.nikNpwp,
      tp.name,
      tp.taxpayerType,
      tp.isPkp ? 1 : 0,
      tp.ptkpStatus,
      tp.address,
      tp.kluCode,
      tp.kluName,
      tp.email,
      tp.phone,
      tp.kppName,
      tp.passphraseHint,
      Math.round(tp.depositBalance || 0),
      tp.isDemo ? 1 : 0,
      tp.linkedCorporateId ?? null,
    ]
  );
}

async function insertInvoiceWithConn(
  conn: PoolConnection,
  nikKey: string,
  inv: TaxInvoice
): Promise<void> {
  await conn.execute(
    `INSERT INTO tax_invoices (
      id, nik_key, taxpayer_id, direction, transaction_code, invoice_number, amendment_seq,
      reference_code, counterparty_npwp, counterparty_name, invoice_date, tax_period_month,
      tax_period_year, items_json, dpp_total, dpp_other_value, ppn_total, ppnbm_total,
      status, is_credited, sp2d_number, return_amount, return_note_number, return_date,
      signed_at, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      inv.id,
      nikKey,
      inv.taxpayerId,
      inv.direction,
      inv.transactionCode,
      inv.invoiceNumber,
      inv.amendmentSeq || 0,
      inv.referenceCode || '',
      inv.counterpartyNpwp,
      inv.counterpartyName,
      inv.invoiceDate,
      inv.taxPeriodMonth,
      inv.taxPeriodYear,
      JSON.stringify(inv.items || []),
      Math.round(inv.dppTotal || 0),
      Math.round(inv.dppOtherValue || 0),
      Math.round(inv.ppnTotal || 0),
      Math.round(inv.ppnbmTotal || 0),
      inv.status,
      inv.isCredited ? 1 : 0,
      inv.sp2dNumber ?? null,
      Math.round(inv.returnAmount || 0),
      inv.returnNoteNumber ?? null,
      inv.returnDate ?? null,
      inv.signedAt ?? null,
      inv.createdAt,
    ]
  );
}

async function insertSlipWithConn(
  conn: PoolConnection,
  nikKey: string,
  slip: WithholdingSlip
): Promise<void> {
  await conn.execute(
    `INSERT INTO withholding_slips (
      id, nik_key, issuer_id, issuer_npwp, issuer_name, recipient_nik_npwp, recipient_name,
      recipient_address, slip_type, slip_number, tax_period_month, tax_period_year,
      object_code, object_name, ptkp_status, gross_amount, position_allowance,
      pension_contribution, net_amount, ptkp_amount, pkp_amount, rate_percent,
      tax_withheld, status, signed_at, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      slip.id,
      nikKey,
      slip.issuerId,
      slip.issuerNpwp,
      slip.issuerName,
      slip.recipientNikNpwp,
      slip.recipientName,
      slip.recipientAddress ?? null,
      slip.slipType,
      slip.slipNumber,
      slip.taxPeriodMonth,
      slip.taxPeriodYear,
      slip.objectCode,
      slip.objectName,
      slip.ptkpStatus,
      Math.round(slip.grossAmount || 0),
      slip.positionAllowance !== undefined ? Math.round(slip.positionAllowance) : null,
      slip.pensionContribution !== undefined ? Math.round(slip.pensionContribution) : null,
      Math.round(slip.netAmount || 0),
      slip.ptkpAmount !== undefined ? Math.round(slip.ptkpAmount) : null,
      slip.pkpAmount !== undefined ? Math.round(slip.pkpAmount) : null,
      Number(slip.ratePercent || 0),
      Math.round(slip.taxWithheld || 0),
      slip.status,
      slip.signedAt ?? null,
      slip.createdAt,
    ]
  );
}

async function insertAssetWithConn(
  conn: PoolConnection,
  nikKey: string,
  item: OpAssetLiabilityFamily
): Promise<void> {
  await conn.execute(
    `INSERT INTO op_assets_liabilities_family (
      id, nik_key, taxpayer_id, record_type, code, description,
      year_acquired, amount, relation_or_lender, nik_member
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      item.id,
      nikKey,
      item.taxpayerId,
      item.recordType,
      item.code,
      item.description,
      item.yearAcquired,
      Math.round(item.amount || 0),
      item.relationOrLender || '',
      item.nikMember ?? null,
    ]
  );
}

async function insertNotificationWithConn(
  conn: PoolConnection,
  nikKey: string,
  notif: NotificationItem
): Promise<void> {
  await conn.execute(
    `INSERT INTO notifications (
      id, nik_key, taxpayer_id, title, message, category, related_entity_id, is_read, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      notif.id,
      nikKey,
      notif.taxpayerId,
      notif.title,
      notif.message,
      notif.category,
      notif.relatedEntityId ?? null,
      notif.isRead ? 1 : 0,
      notif.createdAt,
    ]
  );

  // Keep latest 60 notifications per workspace
  await conn.execute(
    `DELETE FROM notifications
     WHERE nik_key = ?
       AND id NOT IN (
         SELECT id FROM (
           SELECT id FROM notifications WHERE nik_key = ? ORDER BY created_at DESC LIMIT 60
         ) AS keep_rows
       )`,
    [nikKey, nikKey]
  );
}

async function seedWorkspaceInTransaction(
  conn: PoolConnection,
  nikKey: string
): Promise<void> {
  const seed = createSeedWorkspace(nikKey);
  const now = new Date().toISOString();

  await conn.execute(
    `INSERT INTO workspaces (nik_key, created_at, updated_at) VALUES (?, ?, ?)`,
    [nikKey, now, now]
  );

  await insertTaxpayerWithConn(conn, nikKey, 'INDIVIDUAL', seed.individualTaxpayer);
  await insertTaxpayerWithConn(conn, nikKey, 'CORPORATE', seed.corporateTaxpayer);

  for (const inv of seed.invoices) {
    await insertInvoiceWithConn(conn, nikKey, inv);
  }
  for (const slip of seed.slips) {
    await insertSlipWithConn(conn, nikKey, slip);
  }
  for (const asset of seed.assets) {
    await insertAssetWithConn(conn, nikKey, asset);
  }
  for (const notif of seed.notifications) {
    await insertNotificationWithConn(conn, nikKey, notif);
  }
}

export async function loadWorkspace(nikKey: string): Promise<WorkspaceState | null> {
  const pool = await ensureMysqlSchema();

  const [wsRows] = await pool.execute<RowDataPacket[]>(
    `SELECT nik_key FROM workspaces WHERE nik_key = ? LIMIT 1`,
    [nikKey]
  );
  if (wsRows.length === 0) return null;

  const [
    [taxpayerRows],
    [invoiceRows],
    [slipRows],
    [assetRows],
    [returnRows],
    [billingRows],
    [notifRows],
    [examRows],
  ] = await Promise.all([
    pool.execute<RowDataPacket[]>(`SELECT * FROM taxpayers WHERE nik_key = ?`, [nikKey]),
    pool.execute<RowDataPacket[]>(
      `SELECT * FROM tax_invoices WHERE nik_key = ? ORDER BY created_at DESC`,
      [nikKey]
    ),
    pool.execute<RowDataPacket[]>(
      `SELECT * FROM withholding_slips WHERE nik_key = ? ORDER BY created_at DESC`,
      [nikKey]
    ),
    pool.execute<RowDataPacket[]>(
      `SELECT * FROM op_assets_liabilities_family WHERE nik_key = ?`,
      [nikKey]
    ),
    pool.execute<RowDataPacket[]>(
      `SELECT * FROM tax_returns WHERE nik_key = ? ORDER BY created_at DESC`,
      [nikKey]
    ),
    pool.execute<RowDataPacket[]>(
      `SELECT * FROM billing_codes WHERE nik_key = ? ORDER BY created_at DESC`,
      [nikKey]
    ),
    pool.execute<RowDataPacket[]>(
      `SELECT * FROM notifications WHERE nik_key = ? ORDER BY created_at DESC LIMIT 60`,
      [nikKey]
    ),
    pool.execute<RowDataPacket[]>(
      `SELECT * FROM exam_evaluations WHERE nik_key = ?`,
      [nikKey]
    ),
  ]);

  const indRow = taxpayerRows.find((r) => String(r.account_role) === 'INDIVIDUAL');
  const corpRow = taxpayerRows.find((r) => String(r.account_role) === 'CORPORATE');
  if (!indRow || !corpRow) return null;

  const examEvaluations: Record<string, ExamEvaluation> = {};
  for (const row of examRows) {
    const ev = mapExamRow(row);
    examEvaluations[ev.caseCode] = ev;
  }

  return {
    nikKey,
    individualTaxpayer: mapTaxpayerRow(indRow),
    corporateTaxpayer: mapTaxpayerRow(corpRow),
    invoices: invoiceRows.map(mapInvoiceRow),
    slips: slipRows.map(mapSlipRow),
    assets: assetRows.map(mapAssetRow),
    returns: returnRows.map(mapReturnRow),
    billings: billingRows.map(mapBillingRow),
    notifications: notifRows.map(mapNotificationRow),
    examEvaluations,
  };
}

export async function getOrCreateWorkspace(nikKey: string): Promise<WorkspaceState> {
  const existing = await loadWorkspace(nikKey);
  if (existing) return existing;

  try {
    await withMysqlTransaction(async (conn) => {
      const [check] = await conn.execute<RowDataPacket[]>(
        `SELECT nik_key FROM workspaces WHERE nik_key = ? FOR UPDATE`,
        [nikKey]
      );
      if (check.length === 0) {
        await seedWorkspaceInTransaction(conn, nikKey);
      }
    });
  } catch (err: any) {
    // Handle concurrent first-login race cleanly
    if (err?.code !== 'ER_DUP_ENTRY') throw err;
  }

  const created = await loadWorkspace(nikKey);
  if (!created) {
    throw new Error('Gagal memuat data workspace dari database MySQL.');
  }
  return created;
}

export async function resetWorkspace(nikKey: string): Promise<{
  workspace: WorkspaceState;
  notif: NotificationItem;
}> {
  let resetNotif!: NotificationItem;
  await withMysqlTransaction(async (conn) => {
    await conn.execute(`DELETE FROM workspaces WHERE nik_key = ?`, [nikKey]);
    await seedWorkspaceInTransaction(conn, nikKey);

    const [indRows] = await conn.execute<RowDataPacket[]>(
      `SELECT id FROM taxpayers WHERE nik_key = ? AND account_role = 'INDIVIDUAL' LIMIT 1`,
      [nikKey]
    );
    const individualId = String(indRows[0]?.id || `tp-ind-${nikKey}`);
    resetNotif = {
      id: `notif-${Date.now()}-${Math.floor(Math.random() * 9999)}`,
      taxpayerId: individualId,
      title: 'Skenario Simulasi Direset',
      message: 'Data latihan telah dikembalikan ke kondisi awal soal studi kasus KelasBrevet.',
      category: 'EXAM',
      isRead: false,
      createdAt: new Date().toISOString(),
    };
    await insertNotificationWithConn(conn, nikKey, resetNotif);
  });

  const workspace = await getOrCreateWorkspace(nikKey);
  return { workspace, notif: resetNotif };
}

export async function updateTaxpayer(
  nikKey: string,
  taxpayerId: string,
  updates: Partial<Taxpayer>
): Promise<Taxpayer | null> {
  const pool = await ensureMysqlSchema();
  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT * FROM taxpayers WHERE nik_key = ? AND id = ? LIMIT 1`,
    [nikKey, taxpayerId]
  );
  if (rows.length === 0) return null;

  const current = mapTaxpayerRow(rows[0]);
  const updated: Taxpayer = {
    ...current,
    name: updates.name ?? current.name,
    address: updates.address ?? current.address,
    email: updates.email ?? current.email,
    phone: updates.phone ?? current.phone,
    ptkpStatus: updates.ptkpStatus ?? current.ptkpStatus,
    kluCode: updates.kluCode ?? current.kluCode,
    kluName: updates.kluName ?? current.kluName,
  };

  await pool.execute(
    `UPDATE taxpayers
     SET name = ?, address = ?, email = ?, phone = ?, ptkp_status = ?, klu_code = ?, klu_name = ?
     WHERE nik_key = ? AND id = ?`,
    [
      updated.name,
      updated.address,
      updated.email,
      updated.phone,
      updated.ptkpStatus,
      updated.kluCode,
      updated.kluName,
      nikKey,
      taxpayerId,
    ]
  );

  return updated;
}

export async function insertInvoice(nikKey: string, inv: TaxInvoice): Promise<void> {
  await withMysqlTransaction(async (conn) => {
    await insertInvoiceWithConn(conn, nikKey, inv);
  });
}

export async function getInvoiceById(nikKey: string, id: string): Promise<TaxInvoice | null> {
  const pool = await ensureMysqlSchema();
  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT * FROM tax_invoices WHERE nik_key = ? AND id = ? LIMIT 1`,
    [nikKey, id]
  );
  return rows.length > 0 ? mapInvoiceRow(rows[0]) : null;
}

export async function countInvoices(nikKey: string): Promise<number> {
  const pool = await ensureMysqlSchema();
  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT COUNT(*) AS total FROM tax_invoices WHERE nik_key = ?`,
    [nikKey]
  );
  return Number(rows[0]?.total || 0);
}

export async function updateInvoice(nikKey: string, inv: TaxInvoice): Promise<void> {
  const pool = await ensureMysqlSchema();
  await pool.execute(
    `UPDATE tax_invoices
     SET invoice_number = ?, amendment_seq = ?, dpp_total = ?, dpp_other_value = ?,
         ppn_total = ?, ppnbm_total = ?, status = ?, is_credited = ?, sp2d_number = ?,
         return_amount = ?, return_note_number = ?, return_date = ?, signed_at = ?, items_json = ?
     WHERE nik_key = ? AND id = ?`,
    [
      inv.invoiceNumber,
      inv.amendmentSeq || 0,
      Math.round(inv.dppTotal || 0),
      Math.round(inv.dppOtherValue || 0),
      Math.round(inv.ppnTotal || 0),
      Math.round(inv.ppnbmTotal || 0),
      inv.status,
      inv.isCredited ? 1 : 0,
      inv.sp2dNumber ?? null,
      Math.round(inv.returnAmount || 0),
      inv.returnNoteNumber ?? null,
      inv.returnDate ?? null,
      inv.signedAt ?? null,
      JSON.stringify(inv.items || []),
      nikKey,
      inv.id,
    ]
  );
}

export async function deleteInvoice(nikKey: string, id: string): Promise<void> {
  const pool = await ensureMysqlSchema();
  await pool.execute(`DELETE FROM tax_invoices WHERE nik_key = ? AND id = ?`, [nikKey, id]);
}

export async function insertSlip(nikKey: string, slip: WithholdingSlip): Promise<void> {
  await withMysqlTransaction(async (conn) => {
    await insertSlipWithConn(conn, nikKey, slip);
  });
}

export async function insertSlipsBatch(nikKey: string, slips: WithholdingSlip[]): Promise<void> {
  await withMysqlTransaction(async (conn) => {
    for (const slip of slips) {
      await insertSlipWithConn(conn, nikKey, slip);
    }
  });
}

export async function countSlips(nikKey: string): Promise<number> {
  const pool = await ensureMysqlSchema();
  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT COUNT(*) AS total FROM withholding_slips WHERE nik_key = ?`,
    [nikKey]
  );
  return Number(rows[0]?.total || 0);
}

export async function issueSlips(nikKey: string, ids: string[]): Promise<number> {
  if (ids.length === 0) return 0;
  return withMysqlTransaction(async (conn) => {
    const placeholders = ids.map(() => '?').join(',');
    const [rows] = await conn.execute<RowDataPacket[]>(
      `SELECT * FROM withholding_slips
       WHERE nik_key = ? AND status = 'UNISSUED' AND id IN (${placeholders})`,
      [nikKey, ...ids]
    );
    let count = 0;
    const now = new Date().toISOString();
    for (const row of rows) {
      const slipType = String(row.slip_type) as SlipType;
      const prefix = slipType === 'BPPU_23' ? '2.3' : slipType === 'BPA1' ? '1.1' : '1.3';
      const mm = String(row.tax_period_month).padStart(2, '0');
      const yy = String(row.tax_period_year).slice(-2);
      const slipNumber = `${prefix}-${mm}.${yy}-${String(Math.floor(1000000 + Math.random() * 8999999))}`;
      await conn.execute(
        `UPDATE withholding_slips
         SET status = 'ISSUED', slip_number = ?, signed_at = ?
         WHERE nik_key = ? AND id = ?`,
        [slipNumber, now, nikKey, String(row.id)]
      );
      count++;
    }
    return count;
  });
}

export async function deleteSlip(nikKey: string, id: string): Promise<void> {
  const pool = await ensureMysqlSchema();
  await pool.execute(`DELETE FROM withholding_slips WHERE nik_key = ? AND id = ?`, [nikKey, id]);
}

export async function insertAsset(nikKey: string, item: OpAssetLiabilityFamily): Promise<void> {
  await withMysqlTransaction(async (conn) => {
    await insertAssetWithConn(conn, nikKey, item);
  });
}

export async function deleteAsset(nikKey: string, id: string): Promise<void> {
  const pool = await ensureMysqlSchema();
  await pool.execute(`DELETE FROM op_assets_liabilities_family WHERE nik_key = ? AND id = ?`, [
    nikKey,
    id,
  ]);
}

export async function insertReturn(nikKey: string, ret: TaxReturn): Promise<void> {
  const pool = await ensureMysqlSchema();
  await pool.execute(
    `INSERT INTO tax_returns (
      id, nik_key, taxpayer_id, return_type, tax_year, tax_period_month, revision_no,
      status, bpe_number, tax_payable, tax_credit, under_over_payment, payment_method,
      billing_code_id, payload_json, submitted_at, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      ret.id,
      nikKey,
      ret.taxpayerId,
      ret.returnType,
      ret.taxYear,
      ret.taxPeriodMonth,
      ret.revisionNo || 0,
      ret.status,
      ret.bpeNumber ?? null,
      Math.round(ret.taxPayable || 0),
      Math.round(ret.taxCredit || 0),
      Math.round(ret.underOverPayment || 0),
      ret.paymentMethod ?? null,
      ret.billingCodeId ?? null,
      JSON.stringify(ret.payload || {}),
      ret.submittedAt ?? null,
      ret.createdAt,
      ret.updatedAt,
    ]
  );
}

export async function getReturnById(nikKey: string, id: string): Promise<TaxReturn | null> {
  const pool = await ensureMysqlSchema();
  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT * FROM tax_returns WHERE nik_key = ? AND id = ? LIMIT 1`,
    [nikKey, id]
  );
  return rows.length > 0 ? mapReturnRow(rows[0]) : null;
}

export async function updateReturn(nikKey: string, ret: TaxReturn): Promise<void> {
  const pool = await ensureMysqlSchema();
  await pool.execute(
    `UPDATE tax_returns
     SET return_type = ?, tax_year = ?, tax_period_month = ?, revision_no = ?, status = ?,
         bpe_number = ?, tax_payable = ?, tax_credit = ?, under_over_payment = ?,
         payment_method = ?, billing_code_id = ?, payload_json = ?, submitted_at = ?, updated_at = ?
     WHERE nik_key = ? AND id = ?`,
    [
      ret.returnType,
      ret.taxYear,
      ret.taxPeriodMonth,
      ret.revisionNo || 0,
      ret.status,
      ret.bpeNumber ?? null,
      Math.round(ret.taxPayable || 0),
      Math.round(ret.taxCredit || 0),
      Math.round(ret.underOverPayment || 0),
      ret.paymentMethod ?? null,
      ret.billingCodeId ?? null,
      JSON.stringify(ret.payload || {}),
      ret.submittedAt ?? null,
      ret.updatedAt,
      nikKey,
      ret.id,
    ]
  );
}

export async function deleteReturn(nikKey: string, id: string): Promise<void> {
  const pool = await ensureMysqlSchema();
  await pool.execute(`DELETE FROM tax_returns WHERE nik_key = ? AND id = ?`, [nikKey, id]);
}

export async function submitReturnInMysql(
  nikKey: string,
  returnId: string,
  paymentMethod?: 'DEPOSIT' | 'BILLING' | 'NONE'
): Promise<{ error?: string; statusCode?: number; taxReturn?: TaxReturn; notif?: NotificationItem }> {
  return withMysqlTransaction(async (conn) => {
    const [retRows] = await conn.execute<RowDataPacket[]>(
      `SELECT * FROM tax_returns WHERE nik_key = ? AND id = ? FOR UPDATE`,
      [nikKey, returnId]
    );
    if (retRows.length === 0) {
      return { error: 'SPT tidak ditemukan.', statusCode: 404 };
    }
    const ret = mapReturnRow(retRows[0]);

    const [tpRows] = await conn.execute<RowDataPacket[]>(
      `SELECT * FROM taxpayers WHERE nik_key = ? AND id = ? FOR UPDATE`,
      [nikKey, ret.taxpayerId]
    );
    if (tpRows.length === 0) {
      return { error: 'Wajib Pajak tidak ditemukan.', statusCode: 404 };
    }
    const tp = mapTaxpayerRow(tpRows[0]);

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
        const newDeposit = tp.depositBalance - ret.underOverPayment;
        await conn.execute(
          `UPDATE taxpayers SET deposit_balance = ? WHERE nik_key = ? AND id = ?`,
          [Math.round(newDeposit), nikKey, tp.id]
        );
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
        await conn.execute(
          `INSERT INTO billing_codes (
            id, nik_key, taxpayer_id, return_id, kap_code, kjs_code, description,
            tax_period_label, billing_code, amount, status, ntpn, paid_at, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            billing.id,
            nikKey,
            billing.taxpayerId,
            billing.returnId ?? null,
            billing.kapCode,
            billing.kjsCode,
            billing.description,
            billing.taxPeriodLabel,
            billing.billingCode,
            Math.round(billing.amount),
            billing.status,
            null,
            null,
            billing.createdAt,
          ]
        );
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
    await conn.execute(
      `UPDATE tax_returns
       SET status = ?, payment_method = ?, billing_code_id = ?, bpe_number = ?,
           submitted_at = ?, updated_at = ?
       WHERE nik_key = ? AND id = ?`,
      [
        ret.status,
        ret.paymentMethod ?? null,
        ret.billingCodeId ?? null,
        ret.bpeNumber ?? null,
        ret.submittedAt ?? null,
        ret.updatedAt,
        nikKey,
        ret.id,
      ]
    );

    await insertNotificationWithConn(conn, nikKey, notif);
    return { taxReturn: ret, notif };
  });
}

export async function insertBilling(nikKey: string, bill: BillingCode): Promise<void> {
  const pool = await ensureMysqlSchema();
  await pool.execute(
    `INSERT INTO billing_codes (
      id, nik_key, taxpayer_id, return_id, kap_code, kjs_code, description,
      tax_period_label, billing_code, amount, status, ntpn, paid_at, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      bill.id,
      nikKey,
      bill.taxpayerId,
      bill.returnId ?? null,
      bill.kapCode,
      bill.kjsCode,
      bill.description,
      bill.taxPeriodLabel,
      bill.billingCode,
      Math.round(bill.amount || 0),
      bill.status,
      bill.ntpn ?? null,
      bill.paidAt ?? null,
      bill.createdAt,
    ]
  );
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
  return withMysqlTransaction(async (conn) => {
    const [billRows] = await conn.execute<RowDataPacket[]>(
      `SELECT * FROM billing_codes WHERE nik_key = ? AND id = ? FOR UPDATE`,
      [nikKey, billingId]
    );
    if (billRows.length === 0) {
      return { error: 'Kode Billing tidak ditemukan.', statusCode: 404 };
    }
    const bill = mapBillingRow(billRows[0]);
    if (bill.status === 'PAID') {
      return { billing: bill, notif: null };
    }

    const now = new Date().toISOString();
    bill.status = 'PAID';
    bill.ntpn = generateNtpn();
    bill.paidAt = now;

    await conn.execute(
      `UPDATE billing_codes SET status = 'PAID', ntpn = ?, paid_at = ? WHERE nik_key = ? AND id = ?`,
      [bill.ntpn, bill.paidAt, nikKey, bill.id]
    );

    let notif: NotificationItem | null = null;

    if (bill.kapCode === '411618') {
      await conn.execute(
        `UPDATE taxpayers SET deposit_balance = deposit_balance + ? WHERE nik_key = ? AND id = ?`,
        [Math.round(bill.amount), nikKey, bill.taxpayerId]
      );
      notif = {
        id: `notif-${Date.now()}-${Math.floor(Math.random() * 9999)}`,
        taxpayerId: bill.taxpayerId,
        title: 'Top-Up Saldo Deposit Berhasil',
        message: `NTPN ${bill.ntpn} diterima. Saldo Deposit Pajak bertambah ${formatRp(bill.amount)}.`,
        category: 'BILLING',
        relatedEntityId: bill.id,
        isRead: false,
        createdAt: now,
      };
    } else if (bill.returnId) {
      const [retRows] = await conn.execute<RowDataPacket[]>(
        `SELECT * FROM tax_returns WHERE nik_key = ? AND id = ? FOR UPDATE`,
        [nikKey, bill.returnId]
      );
      if (retRows.length > 0) {
        const ret = mapReturnRow(retRows[0]);
        if (ret.status === 'WAITING_PAYMENT') {
          const bpeNumber = generateBpeNumber(ret.returnType.replace('SPT_', '').slice(0, 4));
          await conn.execute(
            `UPDATE tax_returns
             SET status = 'SUBMITTED', bpe_number = ?, submitted_at = ?, updated_at = ?
             WHERE nik_key = ? AND id = ?`,
            [bpeNumber, now, now, nikKey, ret.id]
          );
          notif = {
            id: `notif-${Date.now()}-${Math.floor(Math.random() * 9999)}`,
            taxpayerId: bill.taxpayerId,
            title: 'Pembayaran NTPN Sukses & BPE Terbit',
            message: `NTPN ${bill.ntpn} untuk Billing ${bill.billingCode} terkonfirmasi. SPT otomatis berstatus DILAPORKAN dengan BPE ${bpeNumber}.`,
            category: 'SPT',
            relatedEntityId: ret.id,
            isRead: false,
            createdAt: now,
          };
        }
      }
    } else {
      notif = {
        id: `notif-${Date.now()}-${Math.floor(Math.random() * 9999)}`,
        taxpayerId: bill.taxpayerId,
        title: 'Pembayaran Pajak Terkonfirmasi',
        message: `ID Billing ${bill.billingCode} lunas dengan NTPN ${bill.ntpn}.`,
        category: 'BILLING',
        relatedEntityId: bill.id,
        isRead: false,
        createdAt: now,
      };
    }

    if (notif) {
      await insertNotificationWithConn(conn, nikKey, notif);
    }

    return { billing: bill, notif };
  });
}

export async function insertNotification(
  nikKey: string,
  notif: NotificationItem
): Promise<void> {
  await withMysqlTransaction(async (conn) => {
    await insertNotificationWithConn(conn, nikKey, notif);
  });
}

export async function markAllNotificationsRead(nikKey: string): Promise<void> {
  const pool = await ensureMysqlSchema();
  await pool.execute(`UPDATE notifications SET is_read = 1 WHERE nik_key = ?`, [nikKey]);
}

export async function upsertExamEvaluation(
  nikKey: string,
  evaluation: ExamEvaluation
): Promise<void> {
  const pool = await ensureMysqlSchema();
  await pool.execute(
    `INSERT INTO exam_evaluations (
      nik_key, case_code, score, passed_count, total_checks, checks_json, evaluated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      score = VALUES(score),
      passed_count = VALUES(passed_count),
      total_checks = VALUES(total_checks),
      checks_json = VALUES(checks_json),
      evaluated_at = VALUES(evaluated_at)`,
    [
      nikKey,
      evaluation.caseCode,
      evaluation.score,
      evaluation.passedCount,
      evaluation.totalChecks,
      JSON.stringify(evaluation.checks || []),
      evaluation.evaluatedAt,
    ]
  );
}
