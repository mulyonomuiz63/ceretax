import { doc, getDoc, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from './firebase.ts';
import { BillingCode, ExamEvaluation, TaxInvoice, TaxReturn, Taxpayer, WithholdingSlip } from '../types/tax.ts';

function sanitizeDocId(id: string): string {
  return id.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 120);
}

export async function ensureCloudUserRoot(activeNik: string): Promise<boolean> {
  const user = auth.currentUser;
  if (!user || !user.emailVerified || !user.email) return false;
  const path = `users/${user.uid}`;
  try {
    const ref = doc(db, 'users', user.uid);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      await setDoc(ref, {
        ownerId: user.uid,
        email: user.email.slice(0, 200),
        activeNik: activeNik.slice(0, 32),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      await updateDoc(ref, {
        activeNik: activeNik.slice(0, 32),
        email: user.email.slice(0, 200),
        updatedAt: serverTimestamp(),
      });
    }
    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
    return false;
  }
}

export async function syncTaxpayerToCloud(tp: Taxpayer): Promise<void> {
  const user = auth.currentUser;
  if (!user || !user.emailVerified) return;
  const docId = sanitizeDocId(tp.id);
  const path = `users/${user.uid}/taxpayers/${docId}`;
  try {
    const ref = doc(db, 'users', user.uid, 'taxpayers', docId);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      await setDoc(ref, {
        ownerId: user.uid,
        nikNpwp: tp.nikNpwp.slice(0, 32),
        name: tp.name.slice(0, 160),
        taxpayerType: tp.taxpayerType,
        isPkp: Boolean(tp.isPkp),
        ptkpStatus: tp.ptkpStatus.slice(0, 16),
        address: tp.address.slice(0, 400),
        kluCode: tp.kluCode.slice(0, 32),
        kluName: tp.kluName.slice(0, 200),
        depositBalance: Math.max(0, Number(tp.depositBalance || 0)),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      await updateDoc(ref, {
        name: tp.name.slice(0, 160),
        isPkp: Boolean(tp.isPkp),
        ptkpStatus: tp.ptkpStatus.slice(0, 16),
        address: tp.address.slice(0, 400),
        kluCode: tp.kluCode.slice(0, 32),
        kluName: tp.kluName.slice(0, 200),
        depositBalance: Math.max(0, Number(tp.depositBalance || 0)),
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function syncInvoiceToCloud(inv: TaxInvoice): Promise<void> {
  const user = auth.currentUser;
  if (!user || !user.emailVerified) return;
  const docId = sanitizeDocId(inv.id);
  const path = `users/${user.uid}/invoices/${docId}`;
  try {
    const ref = doc(db, 'users', user.uid, 'invoices', docId);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      await setDoc(ref, {
        ownerId: user.uid,
        taxpayerId: sanitizeDocId(inv.taxpayerId),
        direction: inv.direction,
        transactionCode: inv.transactionCode.slice(0, 8),
        invoiceNumber: inv.invoiceNumber.slice(0, 64),
        counterpartyNpwp: inv.counterpartyNpwp.slice(0, 32),
        counterpartyName: inv.counterpartyName.slice(0, 160),
        invoiceDate: inv.invoiceDate.slice(0, 32),
        taxPeriodMonth: inv.taxPeriodMonth,
        taxPeriodYear: inv.taxPeriodYear,
        dppTotal: Math.max(0, inv.dppTotal),
        dppOtherValue: Math.max(0, inv.dppOtherValue),
        ppnTotal: Math.max(0, inv.ppnTotal),
        ppnbmTotal: Math.max(0, inv.ppnbmTotal),
        status: inv.status,
        isCredited: Boolean(inv.isCredited),
        returnAmount: Math.max(0, inv.returnAmount),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else if (snap.data()?.status !== 'CANCELLED') {
      await updateDoc(ref, {
        status: inv.status,
        invoiceNumber: inv.invoiceNumber.slice(0, 64),
        dppTotal: Math.max(0, inv.dppTotal),
        dppOtherValue: Math.max(0, inv.dppOtherValue),
        ppnTotal: Math.max(0, inv.ppnTotal),
        ppnbmTotal: Math.max(0, inv.ppnbmTotal),
        isCredited: Boolean(inv.isCredited),
        returnAmount: Math.max(0, inv.returnAmount),
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function syncSlipToCloud(slip: WithholdingSlip): Promise<void> {
  const user = auth.currentUser;
  if (!user || !user.emailVerified) return;
  const docId = sanitizeDocId(slip.id);
  const path = `users/${user.uid}/slips/${docId}`;
  try {
    const ref = doc(db, 'users', user.uid, 'slips', docId);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      await setDoc(ref, {
        ownerId: user.uid,
        issuerId: sanitizeDocId(slip.issuerId),
        recipientNikNpwp: slip.recipientNikNpwp.slice(0, 32),
        recipientName: slip.recipientName.slice(0, 160),
        slipType: slip.slipType,
        slipNumber: slip.slipNumber.slice(0, 64),
        taxPeriodMonth: slip.taxPeriodMonth,
        taxPeriodYear: slip.taxPeriodYear,
        objectCode: slip.objectCode.slice(0, 32),
        objectName: slip.objectName.slice(0, 200),
        grossAmount: Math.max(0, slip.grossAmount),
        ratePercent: Math.min(100, Math.max(0, slip.ratePercent)),
        taxWithheld: Math.max(0, slip.taxWithheld),
        status: slip.status,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else if (snap.data()?.status !== 'CANCELLED') {
      await updateDoc(ref, {
        status: slip.status,
        slipNumber: slip.slipNumber.slice(0, 64),
        grossAmount: Math.max(0, slip.grossAmount),
        ratePercent: Math.min(100, Math.max(0, slip.ratePercent)),
        taxWithheld: Math.max(0, slip.taxWithheld),
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function syncReturnToCloud(ret: TaxReturn): Promise<void> {
  const user = auth.currentUser;
  if (!user || !user.emailVerified) return;
  const docId = sanitizeDocId(ret.id);
  const path = `users/${user.uid}/returns/${docId}`;
  try {
    const ref = doc(db, 'users', user.uid, 'returns', docId);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      await setDoc(ref, {
        ownerId: user.uid,
        taxpayerId: sanitizeDocId(ret.taxpayerId),
        returnType: ret.returnType,
        taxYear: ret.taxYear,
        taxPeriodMonth: ret.taxPeriodMonth,
        revisionNo: ret.revisionNo,
        status: ret.status,
        bpeNumber: (ret.bpeNumber || '').slice(0, 64),
        taxPayable: ret.taxPayable,
        taxCredit: ret.taxCredit,
        underOverPayment: ret.underOverPayment,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else if (snap.data()?.status !== 'SUBMITTED') {
      await updateDoc(ref, {
        status: ret.status,
        bpeNumber: (ret.bpeNumber || '').slice(0, 64),
        taxPayable: ret.taxPayable,
        taxCredit: ret.taxCredit,
        underOverPayment: ret.underOverPayment,
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function syncBillingToCloud(bill: BillingCode): Promise<void> {
  const user = auth.currentUser;
  if (!user || !user.emailVerified) return;
  const docId = sanitizeDocId(bill.id);
  const path = `users/${user.uid}/billings/${docId}`;
  try {
    const ref = doc(db, 'users', user.uid, 'billings', docId);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      await setDoc(ref, {
        ownerId: user.uid,
        taxpayerId: sanitizeDocId(bill.taxpayerId),
        kapCode: bill.kapCode.slice(0, 16),
        kjsCode: bill.kjsCode.slice(0, 16),
        billingCode: bill.billingCode.slice(0, 32),
        amount: Math.max(0, bill.amount),
        status: bill.status,
        ntpn: (bill.ntpn || '').slice(0, 32),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else if (snap.data()?.status !== 'PAID') {
      await updateDoc(ref, {
        status: bill.status,
        ntpn: (bill.ntpn || '').slice(0, 32),
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function syncExamToCloud(evalRes: ExamEvaluation): Promise<void> {
  const user = auth.currentUser;
  if (!user || !user.emailVerified) return;
  const docId = sanitizeDocId(evalRes.caseCode);
  const path = `users/${user.uid}/examAttempts/${docId}`;
  try {
    const ref = doc(db, 'users', user.uid, 'examAttempts', docId);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      await setDoc(ref, {
        ownerId: user.uid,
        caseCode: evalRes.caseCode,
        score: evalRes.score,
        passedCount: evalRes.passedCount,
        totalChecks: evalRes.totalChecks,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      await updateDoc(ref, {
        score: evalRes.score,
        passedCount: evalRes.passedCount,
        totalChecks: evalRes.totalChecks,
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}
