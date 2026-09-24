/**
 * Data layer — the ONLY place Supabase + local-mirror SQLite + sync live (plan §1).
 * App features import from here; nothing else in the app talks to Supabase directly.
 */

export { getSupabase, resetSupabaseForTesting, setSupabaseForTesting } from './supabaseClient';
export {
  initLocalDb, getLocalDb, localExecute, localQuery, localQueryOne, localTransaction,
  resetLocalDbForTesting,
} from './localDb';
export {
  LOCAL_SCHEMA_VERSION, LOCAL_SCHEMA_STATEMENTS, SYNCED_TABLES, APPEND_ONLY_TABLES,
} from './localSchema';
export type { SyncedTable } from './localSchema';
export {
  enqueue, enqueueInTx, getPending, countPending, markSynced, markError, markFailed,
  getFailed, getActiveQueue, countFailed, retryFailed, discardFailed, pruneSynced,
} from './syncQueue';
export type { SyncQueueRow, SyncOperationType, EnqueueInput, BundleRow, BundlePayload } from './syncQueue';
export { startSyncWorker, stopSyncWorker, flushQueue } from './syncWorker';
export { pullAll, needsBootstrap, forceFullResync } from './pullSync';
export { insertRow, updateRow, softDeleteRow, enqueueRpc, atomicWrite, newOperationId } from './writeThrough';
export type { AtomicOp, AtomicInsert, AtomicUpdate, AtomicDelete, AtomicWriteOptions, AtomicWriteResult } from './writeThrough';
export { initDataLayer, stopDataLayer, isDataLayerStarted, getPullStatus, pullNow, fullResync } from './dataLayer';
export type { InitResult, PullStatus } from './dataLayer';
export {
  login, logout, getSession, listStaff, getStaffByUsername, verifyStaffPassword,
  createStaff, changePassword, updateStaff, deactivateStaff, isDefaultAdminOnly,
  getLockoutRemainingSeconds,
} from './authService';
export type { StaffUserRow, StaffRole, Session, CreateStaffInput } from './authService';
