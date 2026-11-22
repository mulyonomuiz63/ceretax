# Security Specification — KelasBrevet Coretax Simulator

## 1. Data Invariants
1. Every document under `/users/{userId}/...` belongs strictly to `userId == request.auth.uid` with `request.auth.token.email_verified == true`.
2. Every subcollection document (`taxpayers`, `invoices`, `slips`, `returns`, `billings`, `examAttempts`) requires the parent `/users/{userId}` document to exist (Master Gate).
3. `ownerId` and `createdAt` are immutable once created. `createdAt == request.time` on create; `updatedAt == request.time` on update.
4. Terminal states (`CANCELLED` on `invoices`/`slips`, `SUBMITTED` on `returns`, `PAID` on `billings`) cannot be overwritten by subsequent updates.
5. Every string field enforces explicit `.size()` bounds; every document ID matches `^[a-zA-Z0-9_\-]+$` (max 128 chars).

## 2. The "Dirty Dozen" Payloads (Expected: PERMISSION_DENIED)
1. **Unauthenticated Read**: `GET /users/uid1/invoices/inv1` without auth token.
2. **Unverified Email Write**: `CREATE /users/uid1` with `email_verified: false`.
3. **Cross-Tenant Read**: `uid2` attempts `GET /users/uid1/taxpayers/tp1`.
4. **Identity Spoofing**: `uid1` creates `/users/uid1/invoices/inv1` with `ownerId: "uid2"`.
5. **Shadow / Ghost Field Injection**: `uid1` creates `/users/uid1` with extra key `isAdmin: true`.
6. **ID Poisoning**: `uid1` creates `/users/uid1/invoices/` with 200-char invalid ID containing `$` or spaces.
7. **Orphaned Subcollection Create**: `uid1` creates `/users/uid1/returns/ret1` before `/users/uid1` exists.
8. **Immutable Owner Mutation**: `uid1` updates `ownerId` on an existing `/users/uid1/returns/ret1`.
9. **Client Timestamp Forgery**: `uid1` creates `/users/uid1/billings/b1` with a forged client timestamp instead of `request.time`.
10. **Terminal State Violation (SPT Submitted)**: `uid1` updates a `SUBMITTED` tax return back to `DRAFT`.
11. **Terminal State Violation (Billing Paid)**: `uid1` modifies `amount` on a `PAID` billing code.
12. **Value Poisoning / Oversized String**: `uid1` updates `name` on `/users/uid1/taxpayers/tp1` with a 500-char string (> 160 maxLength).
