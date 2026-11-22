import * as mysqlRepo from './mysqlRepository.ts';
import * as localRepo from './localRepository.ts';

/**
 * Storage Driver Selection:
 * - Production (NODE_ENV=production): ALWAYS uses MySQL (never local file DB).
 * - Explicit override (DB_DRIVER=mysql): uses MySQL.
 * - Development with MYSQL_USER & MYSQL_DATABASE configured (unless DB_DRIVER=local): uses MySQL.
 * - Development without MySQL credentials: uses local JSON file DB (data/simulator-db.json).
 */
export function isMysqlActive(): boolean {
  const isProd = process.env.NODE_ENV === 'production';
  if (isProd) return true;

  const explicitDriver = String(process.env.DB_DRIVER || '').toLowerCase();
  if (explicitDriver === 'mysql') return true;
  if (explicitDriver === 'local') return false;

  return Boolean(process.env.MYSQL_USER && process.env.MYSQL_DATABASE);
}

export function getActiveDriverLabel(): 'MySQL Server' | 'Local Development DB' {
  return isMysqlActive() ? 'MySQL Server' : 'Local Development DB';
}

function activeRepo() {
  return isMysqlActive() ? mysqlRepo : localRepo;
}

export const loadWorkspace: typeof mysqlRepo.loadWorkspace = (...args) =>
  activeRepo().loadWorkspace(...args);
export const getOrCreateWorkspace: typeof mysqlRepo.getOrCreateWorkspace = (...args) =>
  activeRepo().getOrCreateWorkspace(...args);
export const resetWorkspace: typeof mysqlRepo.resetWorkspace = (...args) =>
  activeRepo().resetWorkspace(...args);
export const updateTaxpayer: typeof mysqlRepo.updateTaxpayer = (...args) =>
  activeRepo().updateTaxpayer(...args);
export const insertInvoice: typeof mysqlRepo.insertInvoice = (...args) =>
  activeRepo().insertInvoice(...args);
export const getInvoiceById: typeof mysqlRepo.getInvoiceById = (...args) =>
  activeRepo().getInvoiceById(...args);
export const countInvoices: typeof mysqlRepo.countInvoices = (...args) =>
  activeRepo().countInvoices(...args);
export const updateInvoice: typeof mysqlRepo.updateInvoice = (...args) =>
  activeRepo().updateInvoice(...args);
export const deleteInvoice: typeof mysqlRepo.deleteInvoice = (...args) =>
  activeRepo().deleteInvoice(...args);
export const insertSlip: typeof mysqlRepo.insertSlip = (...args) =>
  activeRepo().insertSlip(...args);
export const insertSlipsBatch: typeof mysqlRepo.insertSlipsBatch = (...args) =>
  activeRepo().insertSlipsBatch(...args);
export const countSlips: typeof mysqlRepo.countSlips = (...args) =>
  activeRepo().countSlips(...args);
export const issueSlips: typeof mysqlRepo.issueSlips = (...args) =>
  activeRepo().issueSlips(...args);
export const deleteSlip: typeof mysqlRepo.deleteSlip = (...args) =>
  activeRepo().deleteSlip(...args);
export const insertAsset: typeof mysqlRepo.insertAsset = (...args) =>
  activeRepo().insertAsset(...args);
export const deleteAsset: typeof mysqlRepo.deleteAsset = (...args) =>
  activeRepo().deleteAsset(...args);
export const insertReturn: typeof mysqlRepo.insertReturn = (...args) =>
  activeRepo().insertReturn(...args);
export const getReturnById: typeof mysqlRepo.getReturnById = (...args) =>
  activeRepo().getReturnById(...args);
export const updateReturn: typeof mysqlRepo.updateReturn = (...args) =>
  activeRepo().updateReturn(...args);
export const deleteReturn: typeof mysqlRepo.deleteReturn = (...args) =>
  activeRepo().deleteReturn(...args);
export const submitReturnInMysql: typeof mysqlRepo.submitReturnInMysql = (...args) =>
  activeRepo().submitReturnInMysql(...args);
export const insertBilling: typeof mysqlRepo.insertBilling = (...args) =>
  activeRepo().insertBilling(...args);
export const payBillingInMysql: typeof mysqlRepo.payBillingInMysql = (...args) =>
  activeRepo().payBillingInMysql(...args);
export const insertNotification: typeof mysqlRepo.insertNotification = (...args) =>
  activeRepo().insertNotification(...args);
export const markAllNotificationsRead: typeof mysqlRepo.markAllNotificationsRead = (...args) =>
  activeRepo().markAllNotificationsRead(...args);
export const upsertExamEvaluation: typeof mysqlRepo.upsertExamEvaluation = (...args) =>
  activeRepo().upsertExamEvaluation(...args);
