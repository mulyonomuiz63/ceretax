import mysql, { Pool, PoolConnection, PoolOptions } from 'mysql2/promise';

declare global {
  var _kelasBrevetMysqlPool: Pool | undefined;
  var _kelasBrevetMysqlSchemaReady: Promise<void> | undefined;
}

const SCHEMA_STATEMENTS: string[] = [
  `CREATE TABLE IF NOT EXISTS workspaces (
    nik_key VARCHAR(16) NOT NULL,
    created_at VARCHAR(40) NOT NULL,
    updated_at VARCHAR(40) NOT NULL,
    PRIMARY KEY (nik_key)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS taxpayers (
    id VARCHAR(80) NOT NULL,
    nik_key VARCHAR(16) NOT NULL,
    account_role ENUM('INDIVIDUAL', 'CORPORATE') NOT NULL,
    nik_npwp VARCHAR(32) NOT NULL,
    name VARCHAR(255) NOT NULL,
    taxpayer_type ENUM('INDIVIDUAL', 'CORPORATE') NOT NULL,
    is_pkp TINYINT(1) NOT NULL DEFAULT 0,
    ptkp_status VARCHAR(16) NOT NULL DEFAULT 'TK/0',
    address TEXT NOT NULL,
    klu_code VARCHAR(32) NOT NULL DEFAULT '',
    klu_name VARCHAR(255) NOT NULL DEFAULT '',
    email VARCHAR(255) NOT NULL DEFAULT '',
    phone VARCHAR(64) NOT NULL DEFAULT '',
    kpp_name VARCHAR(255) NOT NULL DEFAULT '',
    passphrase_hint VARCHAR(255) NOT NULL DEFAULT '',
    deposit_balance BIGINT NOT NULL DEFAULT 0,
    is_demo TINYINT(1) NOT NULL DEFAULT 0,
    linked_corporate_id VARCHAR(80) NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uq_taxpayers_nik_role (nik_key, account_role),
    KEY idx_taxpayers_nik_key (nik_key),
    CONSTRAINT fk_taxpayers_workspace
      FOREIGN KEY (nik_key) REFERENCES workspaces(nik_key) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS tax_invoices (
    id VARCHAR(80) NOT NULL,
    nik_key VARCHAR(16) NOT NULL,
    taxpayer_id VARCHAR(80) NOT NULL,
    direction ENUM('OUTPUT', 'INPUT', 'EXPORT') NOT NULL,
    transaction_code VARCHAR(16) NOT NULL,
    invoice_number VARCHAR(100) NOT NULL,
    amendment_seq INT NOT NULL DEFAULT 0,
    reference_code VARCHAR(128) NOT NULL DEFAULT '',
    counterparty_npwp VARCHAR(32) NOT NULL,
    counterparty_name VARCHAR(255) NOT NULL,
    invoice_date VARCHAR(20) NOT NULL,
    tax_period_month INT NOT NULL,
    tax_period_year INT NOT NULL,
    items_json LONGTEXT NOT NULL,
    dpp_total BIGINT NOT NULL DEFAULT 0,
    dpp_other_value BIGINT NOT NULL DEFAULT 0,
    ppn_total BIGINT NOT NULL DEFAULT 0,
    ppnbm_total BIGINT NOT NULL DEFAULT 0,
    status VARCHAR(40) NOT NULL DEFAULT 'DRAFT',
    is_credited TINYINT(1) NOT NULL DEFAULT 0,
    sp2d_number VARCHAR(100) NULL,
    return_amount BIGINT NOT NULL DEFAULT 0,
    return_note_number VARCHAR(100) NULL,
    return_date VARCHAR(20) NULL,
    signed_at VARCHAR(40) NULL,
    created_at VARCHAR(40) NOT NULL,
    PRIMARY KEY (id),
    KEY idx_invoices_nik_created (nik_key, created_at),
    KEY idx_invoices_taxpayer (taxpayer_id),
    CONSTRAINT fk_invoices_workspace
      FOREIGN KEY (nik_key) REFERENCES workspaces(nik_key) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS withholding_slips (
    id VARCHAR(80) NOT NULL,
    nik_key VARCHAR(16) NOT NULL,
    issuer_id VARCHAR(80) NOT NULL,
    issuer_npwp VARCHAR(32) NOT NULL,
    issuer_name VARCHAR(255) NOT NULL,
    recipient_nik_npwp VARCHAR(32) NOT NULL,
    recipient_name VARCHAR(255) NOT NULL,
    recipient_address TEXT NULL,
    slip_type ENUM('BPMP', 'BP21', 'BPA1', 'BPPU_23') NOT NULL,
    slip_number VARCHAR(100) NOT NULL,
    tax_period_month INT NOT NULL,
    tax_period_year INT NOT NULL,
    object_code VARCHAR(32) NOT NULL,
    object_name VARCHAR(255) NOT NULL,
    ptkp_status VARCHAR(16) NOT NULL DEFAULT 'TK/0',
    gross_amount BIGINT NOT NULL DEFAULT 0,
    position_allowance BIGINT NULL,
    pension_contribution BIGINT NULL,
    net_amount BIGINT NOT NULL DEFAULT 0,
    ptkp_amount BIGINT NULL,
    pkp_amount BIGINT NULL,
    rate_percent DECIMAL(10, 4) NOT NULL DEFAULT 0,
    tax_withheld BIGINT NOT NULL DEFAULT 0,
    status ENUM('UNISSUED', 'ISSUED', 'CANCELLED') NOT NULL DEFAULT 'UNISSUED',
    signed_at VARCHAR(40) NULL,
    created_at VARCHAR(40) NOT NULL,
    PRIMARY KEY (id),
    KEY idx_slips_nik_created (nik_key, created_at),
    KEY idx_slips_issuer (issuer_id),
    CONSTRAINT fk_slips_workspace
      FOREIGN KEY (nik_key) REFERENCES workspaces(nik_key) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS op_assets_liabilities_family (
    id VARCHAR(80) NOT NULL,
    nik_key VARCHAR(16) NOT NULL,
    taxpayer_id VARCHAR(80) NOT NULL,
    record_type ENUM('ASSET', 'LIABILITY', 'FAMILY') NOT NULL,
    code VARCHAR(32) NOT NULL,
    description VARCHAR(255) NOT NULL,
    year_acquired INT NOT NULL DEFAULT 2024,
    amount BIGINT NOT NULL DEFAULT 0,
    relation_or_lender VARCHAR(255) NOT NULL DEFAULT '',
    nik_member VARCHAR(32) NULL,
    PRIMARY KEY (id),
    KEY idx_assets_nik_key (nik_key),
    CONSTRAINT fk_assets_workspace
      FOREIGN KEY (nik_key) REFERENCES workspaces(nik_key) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS tax_returns (
    id VARCHAR(80) NOT NULL,
    nik_key VARCHAR(16) NOT NULL,
    taxpayer_id VARCHAR(80) NOT NULL,
    return_type VARCHAR(40) NOT NULL,
    tax_year INT NOT NULL,
    tax_period_month INT NOT NULL DEFAULT 0,
    revision_no INT NOT NULL DEFAULT 0,
    status VARCHAR(32) NOT NULL DEFAULT 'DRAFT',
    bpe_number VARCHAR(100) NULL,
    tax_payable BIGINT NOT NULL DEFAULT 0,
    tax_credit BIGINT NOT NULL DEFAULT 0,
    under_over_payment BIGINT NOT NULL DEFAULT 0,
    payment_method VARCHAR(20) NULL,
    billing_code_id VARCHAR(80) NULL,
    payload_json LONGTEXT NOT NULL,
    submitted_at VARCHAR(40) NULL,
    created_at VARCHAR(40) NOT NULL,
    updated_at VARCHAR(40) NOT NULL,
    PRIMARY KEY (id),
    KEY idx_returns_nik_created (nik_key, created_at),
    KEY idx_returns_taxpayer (taxpayer_id),
    CONSTRAINT fk_returns_workspace
      FOREIGN KEY (nik_key) REFERENCES workspaces(nik_key) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS billing_codes (
    id VARCHAR(80) NOT NULL,
    nik_key VARCHAR(16) NOT NULL,
    taxpayer_id VARCHAR(80) NOT NULL,
    return_id VARCHAR(80) NULL,
    kap_code VARCHAR(16) NOT NULL,
    kjs_code VARCHAR(16) NOT NULL,
    description VARCHAR(255) NOT NULL,
    tax_period_label VARCHAR(64) NOT NULL,
    billing_code VARCHAR(64) NOT NULL,
    amount BIGINT NOT NULL DEFAULT 0,
    status ENUM('UNPAID', 'PAID') NOT NULL DEFAULT 'UNPAID',
    ntpn VARCHAR(64) NULL,
    paid_at VARCHAR(40) NULL,
    created_at VARCHAR(40) NOT NULL,
    PRIMARY KEY (id),
    KEY idx_billings_nik_created (nik_key, created_at),
    KEY idx_billings_return (return_id),
    CONSTRAINT fk_billings_workspace
      FOREIGN KEY (nik_key) REFERENCES workspaces(nik_key) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS notifications (
    id VARCHAR(80) NOT NULL,
    nik_key VARCHAR(16) NOT NULL,
    taxpayer_id VARCHAR(80) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    category VARCHAR(32) NOT NULL,
    related_entity_id VARCHAR(80) NULL,
    is_read TINYINT(1) NOT NULL DEFAULT 0,
    created_at VARCHAR(40) NOT NULL,
    PRIMARY KEY (id),
    KEY idx_notifications_nik_created (nik_key, created_at),
    CONSTRAINT fk_notifications_workspace
      FOREIGN KEY (nik_key) REFERENCES workspaces(nik_key) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS exam_evaluations (
    nik_key VARCHAR(16) NOT NULL,
    case_code VARCHAR(40) NOT NULL,
    score INT NOT NULL DEFAULT 0,
    passed_count INT NOT NULL DEFAULT 0,
    total_checks INT NOT NULL DEFAULT 0,
    checks_json LONGTEXT NOT NULL,
    evaluated_at VARCHAR(40) NOT NULL,
    PRIMARY KEY (nik_key, case_code),
    CONSTRAINT fk_exam_workspace
      FOREIGN KEY (nik_key) REFERENCES workspaces(nik_key) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
];

function buildPoolOptions(): PoolOptions {
  const host = process.env.MYSQL_HOST || '127.0.0.1';
  const port = Number(process.env.MYSQL_PORT || 3306);
  const user = process.env.MYSQL_USER || '';
  const password = process.env.MYSQL_PASSWORD || '';
  const database = process.env.MYSQL_DATABASE || '';
  const connectionLimit = Number(process.env.MYSQL_CONNECTION_LIMIT || 10);
  const useSsl = String(process.env.MYSQL_SSL || 'false').toLowerCase() === 'true';

  if (!user || !database) {
    throw new Error(
      'Konfigurasi MySQL belum lengkap. Isi MYSQL_HOST, MYSQL_PORT, MYSQL_USER, MYSQL_PASSWORD, dan MYSQL_DATABASE pada environment server.'
    );
  }

  return {
    host,
    port,
    user,
    password,
    database,
    waitForConnections: true,
    connectionLimit,
    queueLimit: 0,
    connectTimeout: 15000,
    charset: 'utf8mb4',
    ...(useSsl ? { ssl: { rejectUnauthorized: false } } : {}),
  };
}

export function getMysqlPool(): Pool {
  if (!global._kelasBrevetMysqlPool) {
    global._kelasBrevetMysqlPool = mysql.createPool(buildPoolOptions());
  }
  return global._kelasBrevetMysqlPool;
}

/**
 * Lazily guarantees all MySQL tables exist on first database interaction.
 * Avoids eager startup probes while supporting empty production databases cleanly.
 */
export async function ensureMysqlSchema(): Promise<Pool> {
  const pool = getMysqlPool();
  if (!global._kelasBrevetMysqlSchemaReady) {
    global._kelasBrevetMysqlSchemaReady = (async () => {
      const conn = await pool.getConnection();
      try {
        for (const sql of SCHEMA_STATEMENTS) {
          await conn.execute(sql);
        }
      } finally {
        conn.release();
      }
    })().catch((err) => {
      global._kelasBrevetMysqlSchemaReady = undefined;
      throw err;
    });
  }
  await global._kelasBrevetMysqlSchemaReady;
  return pool;
}

export async function withMysqlTransaction<T>(
  fn: (conn: PoolConnection) => Promise<T>
): Promise<T> {
  const pool = await ensureMysqlSchema();
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const result = await fn(conn);
    await conn.commit();
    return result;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}
