import 'dotenv/config';
import express, { Request, Response } from 'express';
import http from 'http';
import path from 'path';
import { Server as SocketIOServer } from 'socket.io';
import { createServer as createViteServer } from 'vite';
import {
  BillingCode,
  ExamCaseCode,
  NotificationItem,
  OpAssetLiabilityFamily,
  TaxInvoice,
  TaxReturn,
  WithholdingSlip,
} from './src/types/tax.ts';
import { evaluateExamCase } from './src/data/seedData.ts';
import {
  formatRp,
  generateBillingCode,
  generateFakturNumber,
} from './src/utils/taxCalc.ts';
import * as mysqlRepo from './src/db/repository.ts';

const PORT = Number(process.env.PORT || 3000);

function normalizeNik(nik: string): string {
  return String(nik || '')
    .replace(/\D/g, '')
    .padEnd(16, '0')
    .slice(0, 16);
}

function handleDbError(res: Response, err: unknown, fallbackMessage: string) {
  console.error('[MySQL Error]', err);
  const code = (err as any)?.code;
  if (
    code === 'ECONNREFUSED' ||
    code === 'ENOTFOUND' ||
    code === 'ER_ACCESS_DENIED_ERROR' ||
    code === 'ER_BAD_DB_ERROR' ||
    (err instanceof Error && err.message.includes('Konfigurasi MySQL'))
  ) {
    return res.status(503).json({
      error:
        'Gagal terhubung ke server database MySQL. Periksa variabel MYSQL_HOST, MYSQL_PORT, MYSQL_USER, MYSQL_PASSWORD, dan MYSQL_DATABASE pada server.',
    });
  }
  return res.status(500).json({ error: fallbackMessage });
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '5mb' }));

  const httpServer = http.createServer(app);
  const io = new SocketIOServer(httpServer, {
    cors: { origin: '*' },
    path: '/socket.io',
  });

  io.on('connection', (socket) => {
    socket.on('join:nik', (nikRaw: string) => {
      const nik = normalizeNik(nikRaw);
      socket.join(`room:nik:${nik}`);
    });
  });

  async function pushNotification(
    nik: string,
    taxpayerId: string,
    title: string,
    message: string,
    category: NotificationItem['category'],
    relatedEntityId?: string
  ) {
    const notif: NotificationItem = {
      id: `notif-${Date.now()}-${Math.floor(Math.random() * 9999)}`,
      taxpayerId,
      title,
      message,
      category,
      relatedEntityId,
      isRead: false,
      createdAt: new Date().toISOString(),
    };
    await mysqlRepo.insertNotification(nik, notif);
    const ws = await mysqlRepo.getOrCreateWorkspace(nik);
    io.to(`room:nik:${nik}`).emit('notification:new', notif);
    io.to(`room:nik:${nik}`).emit('workspace:updated', ws);
    return { notif, workspace: ws };
  }

  async function broadcastWorkspace(nik: string) {
    const ws = await mysqlRepo.getOrCreateWorkspace(nik);
    io.to(`room:nik:${nik}`).emit('workspace:updated', ws);
    return ws;
  }

  // === Auth: NIK Login (100% MySQL-backed auto-provisioning) ===
  app.post('/api/auth/nik-login', async (req: Request, res: Response) => {
    try {
      const rawNik = String(req.body?.nik || '').replace(/\D/g, '');
      if (rawNik.length < 10) {
        return res.status(400).json({ error: 'Masukkan NIK/NPWP minimal 10–16 digit angka.' });
      }
      const nik = normalizeNik(rawNik);
      const ws = await mysqlRepo.getOrCreateWorkspace(nik);
      return res.json({ ok: true, workspace: ws });
    } catch (err) {
      return handleDbError(res, err, 'Gagal memuat sesi login dari MySQL.');
    }
  });

  app.get('/api/workspace/:nik', async (req: Request, res: Response) => {
    try {
      const nik = normalizeNik(req.params.nik);
      const ws = await mysqlRepo.getOrCreateWorkspace(nik);
      return res.json(ws);
    } catch (err) {
      return handleDbError(res, err, 'Gagal memuat workspace dari MySQL.');
    }
  });

  app.post('/api/workspace/:nik/reset', async (req: Request, res: Response) => {
    try {
      const nik = normalizeNik(req.params.nik);
      const { workspace, notif } = await mysqlRepo.resetWorkspace(nik);
      io.to(`room:nik:${nik}`).emit('notification:new', notif);
      io.to(`room:nik:${nik}`).emit('workspace:updated', workspace);
      return res.json(workspace);
    } catch (err) {
      return handleDbError(res, err, 'Gagal mereset workspace di MySQL.');
    }
  });

  // === Profile Update ===
  app.patch('/api/workspace/:nik/taxpayer/:taxpayerId', async (req: Request, res: Response) => {
    try {
      const nik = normalizeNik(req.params.nik);
      const updated = await mysqlRepo.updateTaxpayer(nik, req.params.taxpayerId, {
        name: req.body.name,
        address: req.body.address,
        email: req.body.email,
        phone: req.body.phone,
        ptkpStatus: req.body.ptkpStatus,
        kluCode: req.body.kluCode,
        kluName: req.body.kluName,
      });
      if (!updated) {
        return res.status(404).json({ error: 'Wajib Pajak tidak ditemukan.' });
      }
      const ws = await broadcastWorkspace(nik);
      return res.json({ taxpayer: updated, workspace: ws });
    } catch (err) {
      return handleDbError(res, err, 'Gagal memperbarui profil Wajib Pajak di MySQL.');
    }
  });

  // === e-Faktur CRUD & Workflow ===
  app.post('/api/workspace/:nik/invoices', async (req: Request, res: Response) => {
    try {
      const nik = normalizeNik(req.params.nik);
      await mysqlRepo.getOrCreateWorkspace(nik);
      const inv: TaxInvoice = {
        ...req.body,
        id: `inv-${Date.now()}-${Math.floor(Math.random() * 999)}`,
        status: req.body.status || 'DRAFT',
        amendmentSeq: 0,
        returnAmount: Number(req.body.returnAmount || 0),
        createdAt: new Date().toISOString(),
      };
      await mysqlRepo.insertInvoice(nik, inv);
      const ws = await broadcastWorkspace(nik);
      return res.json({ invoice: inv, workspace: ws });
    } catch (err) {
      return handleDbError(res, err, 'Gagal menyimpan Faktur Pajak ke MySQL.');
    }
  });

  app.post('/api/workspace/:nik/invoices/:id/action', async (req: Request, res: Response) => {
    try {
      const nik = normalizeNik(req.params.nik);
      const inv = await mysqlRepo.getInvoiceById(nik, req.params.id);
      if (!inv) return res.status(404).json({ error: 'Faktur Pajak tidak ditemukan.' });

      const { action, payload } = req.body as { action: string; payload?: Record<string, any> };

      if (action === 'DELETE') {
        await mysqlRepo.deleteInvoice(nik, inv.id);
        const ws = await broadcastWorkspace(nik);
        return res.json({ workspace: ws });
      }

      let notifMeta:
        | { title: string; message: string }
        | null = null;

      if (action === 'APPROVE') {
        const seq = (await mysqlRepo.countInvoices(nik)) + 10;
        inv.status = 'APPROVED';
        if (inv.direction !== 'EXPORT' && inv.invoiceNumber.startsWith('DRAFT')) {
          inv.invoiceNumber = generateFakturNumber(inv.transactionCode, seq, false);
        }
        inv.signedAt = new Date().toISOString();
        notifMeta = {
          title: 'e-Faktur Disetujui (APPROVED)',
          message: `Faktur Pajak No. ${inv.invoiceNumber} untuk ${inv.counterpartyName} (PPN ${formatRp(inv.ppnTotal)}) telah ditandatangani secara elektronik.`,
        };
      } else if (action === 'REQUEST_AMEND') {
        inv.status = 'WAITING_FOR_AMENDMENT';
        if (payload?.dppTotal !== undefined) {
          inv.dppTotal = Number(payload.dppTotal);
          inv.dppOtherValue = Number(payload.dppOtherValue ?? Math.round((inv.dppTotal * 11) / 12));
          inv.ppnTotal = Number(payload.ppnTotal ?? Math.round(inv.dppOtherValue * 0.12));
        }
        notifMeta = {
          title: 'Permintaan Faktur Pengganti Menunggu Persetujuan',
          message: `Faktur No. ${inv.invoiceNumber} diajukan Pengganti. Klik Setujui Pengganti (simulasi lawan transaksi) untuk memfinalisasi status AMENDED.`,
        };
      } else if (action === 'APPROVE_AMEND') {
        inv.status = 'AMENDED';
        inv.amendmentSeq = (inv.amendmentSeq || 0) + 1;
        if (inv.invoiceNumber.length >= 3) {
          inv.invoiceNumber = `${inv.invoiceNumber.slice(0, 2)}1${inv.invoiceNumber.slice(3)}`;
        }
        notifMeta = {
          title: 'Faktur Pengganti Disetujui (AMENDED)',
          message: `Lawan transaksi telah menyetujui Faktur Pengganti No. ${inv.invoiceNumber}. Data siap di-Posting ke SPT Masa PPN.`,
        };
      } else if (action === 'REQUEST_CANCEL') {
        inv.status = 'WAITING_FOR_CANCELLATION';
        notifMeta = {
          title: 'Permintaan Pembatalan Faktur Dikirim',
          message: `Faktur No. ${inv.invoiceNumber} menunggu konfirmasi pembatalan dari ${inv.counterpartyName}.`,
        };
      } else if (action === 'APPROVE_CANCEL') {
        inv.status = 'CANCELLED';
        inv.isCredited = false;
        notifMeta = {
          title: 'Faktur Pajak Dibatalkan (CANCELLED)',
          message: `Faktur Pajak No. ${inv.invoiceNumber} resmi dibatalkan dan tidak diperhitungkan dalam SPT Masa PPN.`,
        };
      } else if (action === 'TOGGLE_CREDIT') {
        inv.isCredited = Boolean(payload?.isCredited);
        if (payload?.sp2dNumber !== undefined) inv.sp2dNumber = String(payload.sp2dNumber);
        notifMeta = {
          title: inv.isCredited
            ? 'Pajak Masukan Dikreditkan'
            : 'Pajak Masukan Tidak Dikreditkan',
          message: `Faktur Masukan No. ${inv.invoiceNumber} (PPN ${formatRp(inv.ppnTotal)}) diubah status pengkreditannya.`,
        };
      } else if (action === 'INPUT_RETURN') {
        inv.returnAmount = Number(payload?.returnAmount || 0);
        inv.returnNoteNumber = String(
          payload?.returnNoteNumber || `NR-${Date.now().toString().slice(-6)}`
        );
        inv.returnDate = String(payload?.returnDate || new Date().toISOString().slice(0, 10));
        notifMeta = {
          title: 'Nota Retur PPN Dicatat',
          message: `Retur sebesar PPN ${formatRp(inv.returnAmount)} atas Faktur ${inv.invoiceNumber} (${inv.returnNoteNumber}) telah dicatat pada Lampiran C.`,
        };
      }

      await mysqlRepo.updateInvoice(nik, inv);

      if (notifMeta) {
        const { workspace } = await pushNotification(
          nik,
          inv.taxpayerId,
          notifMeta.title,
          notifMeta.message,
          'FAKTUR',
          inv.id
        );
        return res.json({ invoice: inv, workspace });
      }

      const ws = await broadcastWorkspace(nik);
      return res.json({ invoice: inv, workspace: ws });
    } catch (err) {
      return handleDbError(res, err, 'Gagal memperbarui Faktur Pajak di MySQL.');
    }
  });

  // === e-Bupot CRUD, Batch Issue & XML Import ===
  app.post('/api/workspace/:nik/slips', async (req: Request, res: Response) => {
    try {
      const nik = normalizeNik(req.params.nik);
      await mysqlRepo.getOrCreateWorkspace(nik);
      const existingCount = await mysqlRepo.countSlips(nik);
      const slip: WithholdingSlip = {
        ...req.body,
        id: `slip-${Date.now()}-${Math.floor(Math.random() * 999)}`,
        slipNumber: req.body.slipNumber || `DRAFT-${req.body.slipType}-${existingCount + 1}`,
        status: 'UNISSUED',
        createdAt: new Date().toISOString(),
      };
      await mysqlRepo.insertSlip(nik, slip);
      const ws = await broadcastWorkspace(nik);
      return res.json({ slip, workspace: ws });
    } catch (err) {
      return handleDbError(res, err, 'Gagal menyimpan Bukti Potong eBupot ke MySQL.');
    }
  });

  app.post('/api/workspace/:nik/slips/issue', async (req: Request, res: Response) => {
    try {
      const nik = normalizeNik(req.params.nik);
      const ws = await mysqlRepo.getOrCreateWorkspace(nik);
      const ids: string[] = Array.isArray(req.body?.ids) ? req.body.ids : [];
      const count = await mysqlRepo.issueSlips(nik, ids);
      if (count > 0) {
        const { workspace } = await pushNotification(
          nik,
          ws.corporateTaxpayer.id,
          `${count} Bukti Potong e-Bupot Diterbitkan`,
          `${count} dokumen e-Bupot telah ditandatangani dengan Kode Otorisasi DJP dan berpindah ke daftar Telah Terbit (siap di-Posting ke SPT Masa).`,
          'BUPOT'
        );
        return res.json({ issuedCount: count, workspace });
      }
      const latest = await mysqlRepo.getOrCreateWorkspace(nik);
      return res.json({ issuedCount: count, workspace: latest });
    } catch (err) {
      return handleDbError(res, err, 'Gagal menerbitkan Bukti Potong di MySQL.');
    }
  });

  app.delete('/api/workspace/:nik/slips/:id', async (req: Request, res: Response) => {
    try {
      const nik = normalizeNik(req.params.nik);
      await mysqlRepo.deleteSlip(nik, req.params.id);
      const ws = await broadcastWorkspace(nik);
      return res.json({ workspace: ws });
    } catch (err) {
      return handleDbError(res, err, 'Gagal menghapus Bukti Potong dari MySQL.');
    }
  });

  app.post('/api/workspace/:nik/slips/import-xml', async (req: Request, res: Response) => {
    try {
      const nik = normalizeNik(req.params.nik);
      const ws = await mysqlRepo.getOrCreateWorkspace(nik);
      const xmlText = String(req.body?.xml || '');
      const recordMatches = [...xmlText.matchAll(/<Bupot>([\s\S]*?)<\/Bupot>/gi)];
      const imported: WithholdingSlip[] = [];
      const baseCount = ws.slips.length;

      for (const m of recordMatches) {
        const block = m[1];
        const pick = (tag: string, fallback = '') => {
          const resTag = block.match(new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`, 'i'));
          return resTag ? resTag[1].trim() : fallback;
        };
        const slipTypeRaw = pick('SlipType', 'BPMP').toUpperCase();
        const slipType: WithholdingSlip['slipType'] =
          slipTypeRaw === 'BPPU_23' || slipTypeRaw === 'BP21' || slipTypeRaw === 'BPA1'
            ? slipTypeRaw
            : 'BPMP';
        const grossAmount = Number(pick('GrossAmount', '10000000')) || 0;
        const ratePercent = Number(pick('RatePercent', slipType === 'BPPU_23' ? '2' : '5')) || 0;
        const taxWithheld =
          Number(pick('TaxWithheld', String(Math.round((grossAmount * ratePercent) / 100)))) || 0;

        const slip: WithholdingSlip = {
          id: `slip-xml-${Date.now()}-${Math.floor(Math.random() * 9999)}`,
          issuerId: ws.corporateTaxpayer.id,
          issuerNpwp: ws.corporateTaxpayer.nikNpwp,
          issuerName: ws.corporateTaxpayer.name,
          recipientNikNpwp: pick('RecipientNikNpwp', '3174099988770001'),
          recipientName: pick('RecipientName', 'PENERIMA IMPOR XML'),
          slipType,
          slipNumber: `XML-${slipType}-${baseCount + imported.length + 1}`,
          taxPeriodMonth: Number(pick('Month', '1')) || 1,
          taxPeriodYear: Number(pick('Year', '2025')) || 2025,
          objectCode: pick('ObjectCode', slipType === 'BPPU_23' ? '24-104-29' : '21-100-01'),
          objectName: pick(
            'ObjectName',
            slipType === 'BPPU_23' ? 'Jasa Konsultan / Manajemen' : 'Pegawai Tetap (Impor XML)'
          ),
          ptkpStatus: (pick('Ptkp', 'TK/0') as any) || 'TK/0',
          grossAmount,
          netAmount: grossAmount,
          ratePercent,
          taxWithheld,
          status: 'UNISSUED',
          createdAt: new Date().toISOString(),
        };
        imported.push(slip);
      }

      if (imported.length === 0) {
        return res
          .status(400)
          .json({ error: 'Tidak ditemukan elemen <Bupot> valid dalam berkas XML.' });
      }

      await mysqlRepo.insertSlipsBatch(nik, imported);
      const { workspace } = await pushNotification(
        nik,
        ws.corporateTaxpayer.id,
        `Impor XML Berhasil (${imported.length} Bukti Potong)`,
        `${imported.length} draf bukti potong berhasil diimpor ke tab Belum Terbit.`,
        'BUPOT'
      );
      return res.json({ importedCount: imported.length, workspace });
    } catch (err) {
      return handleDbError(res, err, 'Gagal mengimpor Bukti Potong XML ke MySQL.');
    }
  });

  // === OP Assets / Liabilities / Family ===
  app.post('/api/workspace/:nik/assets', async (req: Request, res: Response) => {
    try {
      const nik = normalizeNik(req.params.nik);
      const ws = await mysqlRepo.getOrCreateWorkspace(nik);
      const item: OpAssetLiabilityFamily = {
        ...req.body,
        id: `ast-${Date.now()}-${Math.floor(Math.random() * 999)}`,
        taxpayerId: ws.individualTaxpayer.id,
      };
      await mysqlRepo.insertAsset(nik, item);
      const updatedWs = await broadcastWorkspace(nik);
      return res.json({ asset: item, workspace: updatedWs });
    } catch (err) {
      return handleDbError(res, err, 'Gagal menyimpan data harta/utang/keluarga ke MySQL.');
    }
  });

  app.delete('/api/workspace/:nik/assets/:id', async (req: Request, res: Response) => {
    try {
      const nik = normalizeNik(req.params.nik);
      await mysqlRepo.deleteAsset(nik, req.params.id);
      const ws = await broadcastWorkspace(nik);
      return res.json({ workspace: ws });
    } catch (err) {
      return handleDbError(res, err, 'Gagal menghapus data harta/utang/keluarga dari MySQL.');
    }
  });

  // === Tax Returns (SPT) CRUD & Submit ===
  app.post('/api/workspace/:nik/returns', async (req: Request, res: Response) => {
    try {
      const nik = normalizeNik(req.params.nik);
      await mysqlRepo.getOrCreateWorkspace(nik);
      const now = new Date().toISOString();
      const ret: TaxReturn = {
        ...req.body,
        id: `spt-${Date.now()}-${Math.floor(Math.random() * 999)}`,
        status: 'DRAFT',
        createdAt: now,
        updatedAt: now,
      };
      await mysqlRepo.insertReturn(nik, ret);
      const ws = await broadcastWorkspace(nik);
      return res.json({ taxReturn: ret, workspace: ws });
    } catch (err) {
      return handleDbError(res, err, 'Gagal membuat Konsep SPT di MySQL.');
    }
  });

  app.put('/api/workspace/:nik/returns/:id', async (req: Request, res: Response) => {
    try {
      const nik = normalizeNik(req.params.nik);
      const existing = await mysqlRepo.getReturnById(nik, req.params.id);
      if (!existing) return res.status(404).json({ error: 'SPT tidak ditemukan.' });

      const merged: TaxReturn = {
        ...existing,
        ...req.body,
        id: existing.id,
        updatedAt: new Date().toISOString(),
      };
      await mysqlRepo.updateReturn(nik, merged);
      const ws = await broadcastWorkspace(nik);
      return res.json({ taxReturn: merged, workspace: ws });
    } catch (err) {
      return handleDbError(res, err, 'Gagal menyimpan perubahan SPT ke MySQL.');
    }
  });

  app.delete('/api/workspace/:nik/returns/:id', async (req: Request, res: Response) => {
    try {
      const nik = normalizeNik(req.params.nik);
      await mysqlRepo.deleteReturn(nik, req.params.id);
      const ws = await broadcastWorkspace(nik);
      return res.json({ workspace: ws });
    } catch (err) {
      return handleDbError(res, err, 'Gagal menghapus Konsep SPT dari MySQL.');
    }
  });

  app.post('/api/workspace/:nik/returns/:id/submit', async (req: Request, res: Response) => {
    try {
      const nik = normalizeNik(req.params.nik);
      const { paymentMethod } = req.body as { paymentMethod?: 'DEPOSIT' | 'BILLING' | 'NONE' };
      const result = await mysqlRepo.submitReturnInMysql(nik, req.params.id, paymentMethod);
      if (result.error) {
        return res.status(result.statusCode || 400).json({ error: result.error });
      }
      const ws = await broadcastWorkspace(nik);
      if (result.notif) {
        io.to(`room:nik:${nik}`).emit('notification:new', result.notif);
      }
      return res.json({ taxReturn: result.taxReturn, workspace: ws });
    } catch (err) {
      return handleDbError(res, err, 'Gagal melaporkan SPT di MySQL.');
    }
  });

  // === Billing & Deposit ===
  app.post('/api/workspace/:nik/billings', async (req: Request, res: Response) => {
    try {
      const nik = normalizeNik(req.params.nik);
      await mysqlRepo.getOrCreateWorkspace(nik);
      const bill: BillingCode = {
        id: `bill-${Date.now()}-${Math.floor(Math.random() * 999)}`,
        taxpayerId: req.body.taxpayerId,
        kapCode: req.body.kapCode || '411128',
        kjsCode: req.body.kjsCode || '100',
        description: req.body.description || 'Setoran Deposit Pajak',
        taxPeriodLabel: req.body.taxPeriodLabel || '2025',
        billingCode: generateBillingCode(),
        amount: Number(req.body.amount || 0),
        status: 'UNPAID',
        createdAt: new Date().toISOString(),
      };
      await mysqlRepo.insertBilling(nik, bill);
      const { workspace } = await pushNotification(
        nik,
        bill.taxpayerId,
        'Kode Billing Berhasil Dibuat',
        `ID Billing ${bill.billingCode} (${bill.kapCode}-${bill.kjsCode}) sebesar ${formatRp(bill.amount)} siap dibayar.`,
        'BILLING',
        bill.id
      );
      return res.json({ billing: bill, workspace });
    } catch (err) {
      return handleDbError(res, err, 'Gagal membuat Kode Billing di MySQL.');
    }
  });

  app.post('/api/workspace/:nik/billings/:id/pay', async (req: Request, res: Response) => {
    try {
      const nik = normalizeNik(req.params.nik);
      const result = await mysqlRepo.payBillingInMysql(nik, req.params.id);
      if (result.error) {
        return res.status(result.statusCode || 400).json({ error: result.error });
      }
      const ws = await broadcastWorkspace(nik);
      if (result.notif) {
        io.to(`room:nik:${nik}`).emit('notification:new', result.notif);
      }
      return res.json({ billing: result.billing, workspace: ws });
    } catch (err) {
      return handleDbError(res, err, 'Gagal memproses pembayaran Kode Billing di MySQL.');
    }
  });

  // === Notifications ===
  app.post('/api/workspace/:nik/notifications/read-all', async (req: Request, res: Response) => {
    try {
      const nik = normalizeNik(req.params.nik);
      await mysqlRepo.markAllNotificationsRead(nik);
      const ws = await broadcastWorkspace(nik);
      return res.json({ workspace: ws });
    } catch (err) {
      return handleDbError(res, err, 'Gagal memperbarui status notifikasi di MySQL.');
    }
  });

  // === Exam Case Auto-Evaluator ===
  app.post('/api/workspace/:nik/exam/evaluate', async (req: Request, res: Response) => {
    try {
      const nik = normalizeNik(req.params.nik);
      const ws = await mysqlRepo.getOrCreateWorkspace(nik);
      const caseCode = req.body?.caseCode as ExamCaseCode;
      const evaluation = evaluateExamCase(ws, caseCode);
      await mysqlRepo.upsertExamEvaluation(nik, evaluation);
      const { workspace } = await pushNotification(
        nik,
        ws.individualTaxpayer.id,
        `Hasil Evaluasi Latihan: ${evaluation.score}/100`,
        `Studi kasus ${caseCode.replace('CASE_', '')}: ${evaluation.passedCount} dari ${evaluation.totalChecks} kriteria terpenuhi.`,
        'EXAM'
      );
      return res.json({ evaluation, workspace });
    } catch (err) {
      return handleDbError(res, err, 'Gagal menyimpan hasil evaluasi latihan ke MySQL.');
    }
  });

  // === Mount Vite in dev or serve dist in prod ===
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(
      `KelasBrevet Coretax Simulator running on http://0.0.0.0:${PORT} [DB: ${mysqlRepo.getActiveDriverLabel()}]`
    );
  });
}

startServer();
