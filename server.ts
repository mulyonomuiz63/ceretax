import 'dotenv/config';
import express, { Request, Response } from 'express';
import fs from 'fs';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { Server as SocketIOServer } from 'socket.io';
import {
  AdminPublicUser,
  AdminRole,
  AdminUser,
  BillingCode,
  ExamQuestion,
  NotificationItem,
  OpAssetLiabilityFamily,
  ParticipantAccount,
  TaxInvoice,
  TaxReturn,
  WithholdingSlip,
} from './src/types/tax.ts';
import {
  formatRp,
  generateBillingCode,
  generateFakturNumber,
} from './src/utils/taxCalc.ts';
import * as mysqlRepo from './src/db/repository.ts';
import {
  generateParticipantNik,
  generateParticipantPassword,
  getPublicSimulationUrl,
  hashPassword,
  requireAdminAuth,
  requireIntegrationApiKey,
  signAdminToken,
  verifyPassword,
} from './src/lib/serverAuth.ts';
import {
  buildAdminAnalytics,
  DEFAULT_PASSING_SCORE,
  evaluateParticipantWorkspace,
  renderQuestionPrintableHtml,
  toPublicParticipant,
} from './src/lib/evaluationService.ts';

const rawPort = process.env.PORT;
const PORT: number | string =
  rawPort && !Number.isNaN(Number(rawPort)) ? Number(rawPort) : rawPort || 3000;

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

  // === Auth: NIK Login (Supports KelasBrevet Provisioned Accounts with Password + Demo NIK) ===
  app.post('/api/auth/nik-login', async (req: Request, res: Response) => {
    try {
      const rawNik = String(req.body?.nik || '').replace(/\D/g, '');
      const rawPassword = String(req.body?.password || '').trim();
      if (rawNik.length < 10) {
        return res.status(400).json({ error: 'Masukkan NIK/NPWP minimal 10–16 digit angka.' });
      }
      const nik = normalizeNik(rawNik);
      const participant = await mysqlRepo.findParticipantByNik(nik);

      if (participant) {
        if (!participant.isActive) {
          return res.status(403).json({
            error: 'Akun simulasi Anda sedang dinonaktifkan. Hubungi admin KelasBrevet.',
          });
        }
        if (participant.passwordHash) {
          if (!rawPassword) {
            return res.status(401).json({
              error:
                'Masukkan Kata Sandi simulasi yang ditampilkan pada halaman akun Anda di kelasbrevet.com.',
            });
          }
          if (!verifyPassword(rawPassword, participant.passwordHash)) {
            return res.status(401).json({
              error:
                'Kata Sandi tidak sesuai. Periksa kembali ID Pengguna & Kata Sandi simulasi Anda di kelasbrevet.com.',
            });
          }
        }
        await mysqlRepo.touchParticipantLogin(nik);
        const ws = await mysqlRepo.syncWorkspaceProfileFromParticipant(nik, participant);
        return res.json({
          ok: true,
          workspace: ws,
          participant: toPublicParticipant(participant),
        });
      }

      const ws = await mysqlRepo.getOrCreateWorkspace(nik);
      return res.json({ ok: true, workspace: ws });
    } catch (err) {
      return handleDbError(res, err, 'Gagal memuat sesi login dari database.');
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

      if (action === 'DELETE' || action === 'REQUEST_CANCEL' || action === 'CANCEL' || action === 'APPROVE_CANCEL') {
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
        if (inv.direction !== 'EXPORT' && (!inv.invoiceNumber || inv.invoiceNumber.startsWith('DRAFT'))) {
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
        if (inv.invoiceNumber.length >= 4) {
          inv.invoiceNumber = `${inv.invoiceNumber.slice(0, 3)}1${inv.invoiceNumber.slice(4)}`;
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
      } else if (action === 'UPDATE') {
        if (payload) {
          Object.assign(inv, payload);
        }
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

  app.put('/api/workspace/:nik/slips/:id', async (req: Request, res: Response) => {
    try {
      const nik = normalizeNik(req.params.nik);
      const updated = await mysqlRepo.updateSlip(nik, req.params.id, req.body || {});
      if (!updated) {
        return res.status(404).json({ error: 'Bukti Potong tidak ditemukan.' });
      }
      const ws = await broadcastWorkspace(nik);
      return res.json({ slip: updated, workspace: ws });
    } catch (err) {
      return handleDbError(res, err, 'Gagal memperbarui Bukti Potong di MySQL.');
    }
  });

  app.post('/api/workspace/:nik/slips/cancel', async (req: Request, res: Response) => {
    try {
      const nik = normalizeNik(req.params.nik);
      const ws = await mysqlRepo.getOrCreateWorkspace(nik);
      const ids: string[] = Array.isArray(req.body?.ids) ? req.body.ids : [];
      const count = await mysqlRepo.cancelSlips(nik, ids);
      if (count > 0) {
        const { workspace } = await pushNotification(
          nik,
          ws.corporateTaxpayer.id,
          `${count} Bukti Potong e-Bupot Dibatalkan`,
          `${count} dokumen e-Bupot telah dibatalkan dan berstatus CANCELLED.`,
          'BUPOT'
        );
        return res.json({ cancelledCount: count, workspace });
      }
      const latest = await mysqlRepo.getOrCreateWorkspace(nik);
      return res.json({ cancelledCount: count, workspace: latest });
    } catch (err) {
      return handleDbError(res, err, 'Gagal membatalkan Bukti Potong di MySQL.');
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

  // === Public Read-Only Questions & Printable PDF (Simulator UI — NO Scores/Results) ===
  app.get('/api/questions', async (_req: Request, res: Response) => {
    try {
      const questions = await mysqlRepo.listExamQuestions(true);
      return res.json({ questions });
    } catch (err) {
      return handleDbError(res, err, 'Gagal memuat daftar soal latihan.');
    }
  });

  app.get('/api/questions/:id/pdf', async (req: Request, res: Response) => {
    try {
      if (req.params.id === 'all') {
        const all = await mysqlRepo.listExamQuestions(true);
        if (all.length === 0) {
          return res.status(404).send('Belum ada soal latihan aktif.');
        }
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        return res.send(renderQuestionPrintableHtml(all[0], all));
      }
      const q = await mysqlRepo.getExamQuestionById(req.params.id);
      if (!q) return res.status(404).send('Soal tidak ditemukan.');
      if (q.pdfUrl && /^https?:\/\//i.test(q.pdfUrl)) {
        return res.redirect(q.pdfUrl);
      }
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.send(renderQuestionPrintableHtml(q));
    } catch (err) {
      return handleDbError(res, err, 'Gagal memuat dokumen PDF soal.');
    }
  });

  // Helper: Provision participant (shared by kelasbrevet.com API & Admin manual creation)
  async function provisionParticipantAccount(
    body: Record<string, any>,
    source: ParticipantAccount['source'],
    req: Request
  ) {
    const externalUserId = body.externalUserId ? String(body.externalUserId).trim() : undefined;
    const rawNikInput = body.nik ? String(body.nik).replace(/\D/g, '') : '';
    const fullName = String(body.fullName || body.name || '').trim();
    const email = String(body.email || '').trim().toLowerCase();
    const phone = String(body.phone || '').trim();
    const packageName = String(body.packageName || 'Brevet A & B').trim();
    const companyName = String(body.companyName || '').trim();
    const companyNpwp = String(body.companyNpwp || '').replace(/\D/g, '').slice(0, 16);
    const passingScore = Math.min(100, Math.max(1, Number(body.passingScore || DEFAULT_PASSING_SCORE)));
    const regeneratePassword = Boolean(body.regeneratePassword);
    const customPassword = body.password ? String(body.password).trim() : '';

    if (!fullName) {
      throw Object.assign(new Error('Field fullName (nama peserta) wajib diisi.'), { statusCode: 400 });
    }

    let existing: ParticipantAccount | null = null;
    if (externalUserId) {
      existing = await mysqlRepo.findParticipantByIdentifier(externalUserId);
    }
    if (!existing && rawNikInput.length >= 10) {
      existing = await mysqlRepo.findParticipantByNik(normalizeNik(rawNikInput));
    }

    const now = new Date().toISOString();
    const nikKey = existing
      ? existing.nikKey
      : rawNikInput.length >= 10
        ? normalizeNik(rawNikInput)
        : generateParticipantNik();

    const shouldCreatePassword = !existing || regeneratePassword || Boolean(customPassword);
    const plainPassword = shouldCreatePassword
      ? customPassword || generateParticipantPassword()
      : existing?.initialPassword || generateParticipantPassword();

    const passwordHash = shouldCreatePassword
      ? hashPassword(plainPassword)
      : existing!.passwordHash || hashPassword(plainPassword);

    const participant: ParticipantAccount = {
      id: existing?.id || `part-${Date.now()}-${Math.floor(Math.random() * 9999)}`,
      externalUserId: externalUserId || existing?.externalUserId,
      nikKey,
      passwordHash,
      initialPassword: plainPassword,
      fullName,
      email: email || existing?.email || '',
      phone: phone || existing?.phone || '',
      packageName: packageName || existing?.packageName || 'Brevet A & B',
      companyName:
        companyName || existing?.companyName || `PT SIMULASI BREVET ${nikKey.slice(-4)} (PKP)`,
      companyNpwp: companyNpwp || existing?.companyNpwp || `01${nikKey.slice(2, 13)}000`,
      source: existing?.source || source,
      isActive: body.isActive !== undefined ? Boolean(body.isActive) : true,
      passingScore,
      lastLoginAt: existing?.lastLoginAt,
      createdAt: existing?.createdAt || now,
      updatedAt: now,
    };

    const saved = await mysqlRepo.upsertParticipant(participant);
    await mysqlRepo.syncWorkspaceProfileFromParticipant(saved.nikKey, saved);

    const baseUrl = getPublicSimulationUrl(req);
    const simulationUrl = `${baseUrl}/?nik=${encodeURIComponent(saved.nikKey)}`;

    return {
      isNewAccount: !existing,
      credentials: {
        nik: saved.nikKey,
        password: plainPassword,
        simulationUrl,
        passphraseDjp: '123456',
      },
      participant: toPublicParticipant(saved),
    };
  }

  // Helper: Load all evaluated participant summaries
  async function loadAllEvaluatedParticipants() {
    const participants = await mysqlRepo.listParticipants();
    const results = await Promise.all(
      participants.map(async (p) => {
        const ws = await mysqlRepo.getOrCreateWorkspace(p.nikKey);
        return evaluateParticipantWorkspace(p, ws);
      })
    );
    return results;
  }

  // ==========================================================================
  // INTEGRATION API v1 FOR KELASBREVET.COM (Protected by X-API-Key)
  // ==========================================================================
  app.post(
    '/api/integration/v1/participants/provision',
    requireIntegrationApiKey,
    async (req: Request, res: Response) => {
      try {
        const data = await provisionParticipantAccount(req.body || {}, 'KELASBREVET_API', req);
        return res.status(data.isNewAccount ? 201 : 200).json({
          ok: true,
          ...data,
        });
      } catch (err: any) {
        if (err?.statusCode === 400) {
          return res.status(400).json({ ok: false, error: err.message });
        }
        return handleDbError(res, err, 'Gagal membuat/menyinkronkan akun peserta simulasi.');
      }
    }
  );

  app.get(
    '/api/integration/v1/participants',
    requireIntegrationApiKey,
    async (_req: Request, res: Response) => {
      try {
        const results = await loadAllEvaluatedParticipants();
        return res.json({
          ok: true,
          total: results.length,
          participants: results.map((r) => ({
            id: r.participant.id,
            externalUserId: r.participant.externalUserId,
            nik: r.participant.nikKey,
            fullName: r.participant.fullName,
            email: r.participant.email,
            packageName: r.participant.packageName,
            averageScore: r.averageScore,
            passingScore: r.passingScore,
            isPassed: r.isPassed,
            graduationStatus: r.graduationStatus,
            progressStatus: r.progressStatus,
            completedModules: r.completedModules,
            totalModules: r.totalModules,
            lastLoginAt: r.participant.lastLoginAt,
          })),
        });
      } catch (err) {
        return handleDbError(res, err, 'Gagal memuat daftar peserta simulasi.');
      }
    }
  );

  app.get(
    '/api/integration/v1/participants/:identifier/result',
    requireIntegrationApiKey,
    async (req: Request, res: Response) => {
      try {
        const participant = await mysqlRepo.findParticipantByIdentifier(req.params.identifier);
        if (!participant) {
          return res.status(404).json({
            ok: false,
            error: 'Peserta tidak ditemukan. Pastikan akun telah dibuat melalui endpoint provision.',
          });
        }
        const ws = await mysqlRepo.getOrCreateWorkspace(participant.nikKey);
        const result = evaluateParticipantWorkspace(participant, ws);
        return res.json({ ok: true, result });
      } catch (err) {
        return handleDbError(res, err, 'Gagal mengevaluasi hasil simulasi peserta.');
      }
    }
  );

  app.post(
    '/api/integration/v1/participants/:identifier/reset',
    requireIntegrationApiKey,
    async (req: Request, res: Response) => {
      try {
        const participant = await mysqlRepo.findParticipantByIdentifier(req.params.identifier);
        if (!participant) {
          return res.status(404).json({ ok: false, error: 'Peserta tidak ditemukan.' });
        }
        const { workspace } = await mysqlRepo.resetWorkspace(participant.nikKey);
        await mysqlRepo.syncWorkspaceProfileFromParticipant(participant.nikKey, participant);
        io.to(`room:nik:${participant.nikKey}`).emit('workspace:updated', workspace);
        return res.json({
          ok: true,
          message: 'Workspace simulasi peserta berhasil direset ke kondisi awal.',
          nik: participant.nikKey,
        });
      } catch (err) {
        return handleDbError(res, err, 'Gagal mereset workspace peserta.');
      }
    }
  );

  app.get(
    '/api/integration/v1/questions',
    requireIntegrationApiKey,
    async (req: Request, res: Response) => {
      try {
        const activeOnly = String(req.query.activeOnly || 'false').toLowerCase() === 'true';
        const questions = await mysqlRepo.listExamQuestions(activeOnly);
        const baseUrl = getPublicSimulationUrl(req);
        return res.json({
          ok: true,
          total: questions.length,
          allPdfUrl: `${baseUrl}/api/questions/all/pdf`,
          questions: questions.map((q) => ({
            ...q,
            downloadPdfUrl: q.pdfUrl || `${baseUrl}/api/questions/${encodeURIComponent(q.id)}/pdf`,
          })),
        });
      } catch (err) {
        return handleDbError(res, err, 'Gagal memuat daftar soal latihan.');
      }
    }
  );

  app.post(
    '/api/integration/v1/questions',
    requireIntegrationApiKey,
    async (req: Request, res: Response) => {
      try {
        const b = req.body || {};
        if (!b.title || !b.summary) {
          return res.status(400).json({ ok: false, error: 'Field title dan summary wajib diisi.' });
        }
        const now = new Date().toISOString();
        const existingList = await mysqlRepo.listExamQuestions(false);
        const q: ExamQuestion = {
          id: `q-${Date.now()}-${Math.floor(Math.random() * 999)}`,
          code: String(b.code || `CASE_CUSTOM_${Date.now().toString().slice(-5)}`)
            .toUpperCase()
            .replace(/[^A-Z0-9_]/g, '_'),
          moduleTag: String(b.moduleTag || `Modul ${existingList.length + 1}`),
          title: String(b.title).trim(),
          accountMode: b.accountMode === 'INDIVIDUAL' ? 'INDIVIDUAL' : 'CORPORATE',
          summary: String(b.summary).trim(),
          instructions: Array.isArray(b.instructions)
            ? b.instructions.map((s: any) => String(s).trim()).filter(Boolean)
            : [],
          pdfUrl: b.pdfUrl ? String(b.pdfUrl).trim() : '',
          passingScore: Number(b.passingScore || DEFAULT_PASSING_SCORE),
          targetModule: String(b.targetModule || 'portal'),
          targetSubTab: b.targetSubTab ? String(b.targetSubTab) : undefined,
          sortOrder: Number(b.sortOrder ?? existingList.length + 1),
          isActive: b.isActive !== undefined ? Boolean(b.isActive) : true,
          createdAt: now,
          updatedAt: now,
        };
        const created = await mysqlRepo.createExamQuestion(q);
        return res.status(201).json({ ok: true, question: created });
      } catch (err) {
        return handleDbError(res, err, 'Gagal menambahkan soal latihan.');
      }
    }
  );

  app.put(
    '/api/integration/v1/questions/:id',
    requireIntegrationApiKey,
    async (req: Request, res: Response) => {
      try {
        const b = req.body || {};
        const updates: Partial<ExamQuestion> = {};
        if (b.code !== undefined) updates.code = String(b.code).trim();
        if (b.moduleTag !== undefined) updates.moduleTag = String(b.moduleTag).trim();
        if (b.title !== undefined) updates.title = String(b.title).trim();
        if (b.accountMode !== undefined) {
          updates.accountMode = b.accountMode === 'INDIVIDUAL' ? 'INDIVIDUAL' : 'CORPORATE';
        }
        if (b.summary !== undefined) updates.summary = String(b.summary).trim();
        if (Array.isArray(b.instructions)) {
          updates.instructions = b.instructions.map((s: any) => String(s).trim()).filter(Boolean);
        }
        if (b.pdfUrl !== undefined) updates.pdfUrl = String(b.pdfUrl).trim();
        if (b.passingScore !== undefined) updates.passingScore = Number(b.passingScore);
        if (b.targetModule !== undefined) updates.targetModule = String(b.targetModule);
        if (b.targetSubTab !== undefined) updates.targetSubTab = String(b.targetSubTab);
        if (b.sortOrder !== undefined) updates.sortOrder = Number(b.sortOrder);
        if (b.isActive !== undefined) updates.isActive = Boolean(b.isActive);

        const updated = await mysqlRepo.updateExamQuestion(req.params.id, updates);
        if (!updated) return res.status(404).json({ ok: false, error: 'Soal tidak ditemukan.' });
        return res.json({ ok: true, question: updated });
      } catch (err) {
        return handleDbError(res, err, 'Gagal memperbarui soal latihan.');
      }
    }
  );

  app.delete(
    '/api/integration/v1/questions/:id',
    requireIntegrationApiKey,
    async (req: Request, res: Response) => {
      try {
        const deleted = await mysqlRepo.deleteExamQuestion(req.params.id);
        if (!deleted) return res.status(404).json({ ok: false, error: 'Soal tidak ditemukan.' });
        return res.json({ ok: true, deletedId: req.params.id });
      } catch (err) {
        return handleDbError(res, err, 'Gagal menghapus soal latihan.');
      }
    }
  );

  app.get(
    '/api/integration/v1/questions/:id/pdf',
    requireIntegrationApiKey,
    async (req: Request, res: Response) => {
      try {
        const q = await mysqlRepo.getExamQuestionById(req.params.id);
        if (!q) return res.status(404).json({ ok: false, error: 'Soal tidak ditemukan.' });
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        return res.send(renderQuestionPrintableHtml(q));
      } catch (err) {
        return handleDbError(res, err, 'Gagal menghasilkan dokumen PDF soal.');
      }
    }
  );

  // ==========================================================================
  // PUBLIC BRANDING / LOGO & META ICON SETTINGS (Stored in app_settings DB table)
  // ==========================================================================
  app.get('/api/branding', async (_req: Request, res: Response) => {
    try {
      const branding = await mysqlRepo.getBrandingSettings();
      return res.json({ ok: true, branding });
    } catch (err) {
      return handleDbError(res, err, 'Gagal memuat pengaturan branding.');
    }
  });

  app.get('/api/branding/meta-icon', async (_req: Request, res: Response) => {
    try {
      const branding = await mysqlRepo.getBrandingSettings();
      const raw = (branding.metaIconUrl || '').trim();

      if (raw.startsWith('data:image/')) {
        const match = /^data:(image\/[a-zA-Z0-9.+-]+)(?:;charset=[^;,]+)?(;base64)?,([\s\S]+)$/.exec(raw);
        if (match) {
          const mime = match[1];
          const isBase64 = Boolean(match[2]);
          const dataPayload = match[3];
          const buf = isBase64
            ? Buffer.from(dataPayload, 'base64')
            : Buffer.from(decodeURIComponent(dataPayload), 'utf-8');
          res.setHeader('Content-Type', mime);
          res.setHeader('Cache-Control', 'public, max-age=300');
          return res.send(buf);
        }
      }

      if (raw.startsWith('http://') || raw.startsWith('https://')) {
        return res.redirect(302, raw);
      }

      const serverDir = path.dirname(fileURLToPath(import.meta.url));
      const relPath =
        raw.startsWith('/') && !raw.includes('..')
          ? raw.replace(/^\/+/, '')
          : 'assets/aistudio/kelasbrevet_icon_transparent.png';
      const iconCandidates = [
        path.resolve(process.cwd(), 'public', relPath),
        path.resolve(process.cwd(), 'dist', relPath),
        path.resolve(serverDir, '..', 'dist', relPath),
        path.resolve(serverDir, '..', 'public', relPath),
        path.resolve(process.cwd(), 'public/assets/aistudio/kelasbrevet_icon_transparent.png'),
        path.resolve(process.cwd(), 'dist/assets/aistudio/kelasbrevet_icon_transparent.png'),
      ];
      const foundIcon = iconCandidates.find((p) => fs.existsSync(p) && fs.statSync(p).isFile());
      if (foundIcon) {
        res.setHeader('Cache-Control', 'public, max-age=300');
        return res.sendFile(foundIcon);
      }
      return res.status(404).end();
    } catch {
      return res.status(404).end();
    }
  });

  // ==========================================================================
  // ADMIN MANAGEMENT PORTAL API (DB-Backed admin_users Table)
  // ==========================================================================
  function toPublicAdmin(a: AdminUser): AdminPublicUser {
    return {
      id: a.id,
      email: a.email,
      fullName: a.fullName,
      role: a.role,
      isActive: a.isActive,
      lastLoginAt: a.lastLoginAt,
      createdAt: a.createdAt,
      updatedAt: a.updatedAt,
    };
  }

  app.post('/api/admin/login', async (req: Request, res: Response) => {
    try {
      const email = String(req.body?.email || '').trim().toLowerCase();
      const password = String(req.body?.password || '');

      if (!email || !password) {
        return res.status(400).json({ error: 'Email dan kata sandi wajib diisi.' });
      }

      const admin = await mysqlRepo.getAdminUserByEmail(email);
      if (!admin || !verifyPassword(password, admin.passwordHash)) {
        return res.status(401).json({
          error: 'Email atau kata sandi Admin tidak valid.',
        });
      }

      if (!admin.isActive) {
        return res.status(403).json({
          error: 'Akun Admin ini sedang dinonaktifkan. Hubungi Super Admin.',
        });
      }

      await mysqlRepo.touchAdminLastLogin(admin.id);
      const token = signAdminToken({
        id: admin.id,
        email: admin.email,
        fullName: admin.fullName,
        role: admin.role,
      });

      return res.json({
        ok: true,
        token,
        admin: toPublicAdmin({ ...admin, lastLoginAt: new Date().toISOString() }),
      });
    } catch (err) {
      return handleDbError(res, err, 'Gagal memverifikasi login Admin di database.');
    }
  });

  app.get('/api/admin/me', requireAdminAuth, async (req: Request, res: Response) => {
    try {
      const tokenUser = (req as any).adminUser;
      const dbAdmin =
        (tokenUser?.id && (await mysqlRepo.getAdminUserById(tokenUser.id))) ||
        (tokenUser?.email && (await mysqlRepo.getAdminUserByEmail(tokenUser.email))) ||
        null;

      if (!dbAdmin || !dbAdmin.isActive) {
        return res.status(401).json({
          error: 'Akun Admin tidak ditemukan atau sudah dinonaktifkan.',
        });
      }

      return res.json({
        ok: true,
        admin: toPublicAdmin(dbAdmin),
        dbDriver: mysqlRepo.getActiveDriverLabel(),
        publicUrl: getPublicSimulationUrl(req),
      });
    } catch (err) {
      return handleDbError(res, err, 'Gagal memuat sesi Admin.');
    }
  });

  // === Admin Users CRUD (Stored in admin_users table) ===
  app.get('/api/admin/users', requireAdminAuth, async (_req: Request, res: Response) => {
    try {
      const admins = await mysqlRepo.listAdminUsers();
      return res.json({ ok: true, admins: admins.map(toPublicAdmin) });
    } catch (err) {
      return handleDbError(res, err, 'Gagal memuat daftar akun Admin.');
    }
  });

  app.post('/api/admin/users', requireAdminAuth, async (req: Request, res: Response) => {
    try {
      const b = req.body || {};
      const email = String(b.email || '').trim().toLowerCase();
      const fullName = String(b.fullName || '').trim();
      const password = String(b.password || '');
      const role: AdminRole = b.role === 'SUPER_ADMIN' ? 'SUPER_ADMIN' : 'ADMIN';

      if (!email || !email.includes('@')) {
        return res.status(400).json({ error: 'Format email Admin tidak valid.' });
      }
      if (!fullName) {
        return res.status(400).json({ error: 'Nama lengkap Admin wajib diisi.' });
      }
      if (password.length < 6) {
        return res.status(400).json({ error: 'Kata sandi minimal 6 karakter.' });
      }

      const existing = await mysqlRepo.getAdminUserByEmail(email);
      if (existing) {
        return res.status(409).json({ error: 'Email Admin tersebut sudah terdaftar di database.' });
      }

      const now = new Date().toISOString();
      const created = await mysqlRepo.createAdminUser({
        id: `adm-${Date.now()}-${Math.floor(Math.random() * 999)}`,
        email,
        fullName,
        passwordHash: hashPassword(password),
        role,
        isActive: b.isActive !== undefined ? Boolean(b.isActive) : true,
        createdAt: now,
        updatedAt: now,
      });

      return res.status(201).json({ ok: true, admin: toPublicAdmin(created) });
    } catch (err) {
      return handleDbError(res, err, 'Gagal menambahkan akun Admin.');
    }
  });

  app.put('/api/admin/users/:id', requireAdminAuth, async (req: Request, res: Response) => {
    try {
      const targetId = req.params.id;
      const currentAdmin = (req as any).adminUser;
      const existing = await mysqlRepo.getAdminUserById(targetId);
      if (!existing) {
        return res.status(404).json({ error: 'Akun Admin tidak ditemukan.' });
      }

      const b = req.body || {};
      const updates: Partial<AdminUser> = {};

      if (b.fullName !== undefined) {
        const cleanName = String(b.fullName).trim();
        if (!cleanName) return res.status(400).json({ error: 'Nama lengkap tidak boleh kosong.' });
        updates.fullName = cleanName;
      }

      if (b.email !== undefined) {
        const cleanEmail = String(b.email).trim().toLowerCase();
        if (!cleanEmail || !cleanEmail.includes('@')) {
          return res.status(400).json({ error: 'Format email tidak valid.' });
        }
        if (cleanEmail !== existing.email) {
          const dup = await mysqlRepo.getAdminUserByEmail(cleanEmail);
          if (dup && dup.id !== targetId) {
            return res.status(409).json({ error: 'Email sudah digunakan oleh akun Admin lain.' });
          }
        }
        updates.email = cleanEmail;
      }

      if (b.role !== undefined) {
        updates.role = b.role === 'SUPER_ADMIN' ? 'SUPER_ADMIN' : 'ADMIN';
      }

      if (b.password !== undefined && String(b.password).length > 0) {
        const newPw = String(b.password);
        if (newPw.length < 6) {
          return res.status(400).json({ error: 'Kata sandi baru minimal 6 karakter.' });
        }
        updates.passwordHash = hashPassword(newPw);
      }

      if (b.isActive !== undefined) {
        const nextActive = Boolean(b.isActive);
        if (!nextActive && currentAdmin?.id === targetId) {
          return res.status(400).json({ error: 'Anda tidak dapat menonaktifkan akun Anda sendiri.' });
        }
        if (!nextActive) {
          const all = await mysqlRepo.listAdminUsers();
          const otherActive = all.filter((a) => a.id !== targetId && a.isActive);
          if (otherActive.length === 0) {
            return res.status(400).json({ error: 'Minimal harus ada 1 akun Admin yang aktif.' });
          }
        }
        updates.isActive = nextActive;
      }

      const updated = await mysqlRepo.updateAdminUser(targetId, updates);
      if (!updated) return res.status(404).json({ error: 'Akun Admin tidak ditemukan.' });
      return res.json({ ok: true, admin: toPublicAdmin(updated) });
    } catch (err) {
      return handleDbError(res, err, 'Gagal memperbarui akun Admin.');
    }
  });

  app.delete('/api/admin/users/:id', requireAdminAuth, async (req: Request, res: Response) => {
    try {
      const targetId = req.params.id;
      const currentAdmin = (req as any).adminUser;
      if (currentAdmin?.id === targetId) {
        return res.status(400).json({ error: 'Anda tidak dapat menghapus akun yang sedang login.' });
      }
      const all = await mysqlRepo.listAdminUsers();
      const otherActive = all.filter((a) => a.id !== targetId && a.isActive);
      if (otherActive.length === 0) {
        return res.status(400).json({ error: 'Minimal harus ada 1 akun Admin aktif tersisa.' });
      }
      const deleted = await mysqlRepo.deleteAdminUser(targetId);
      if (!deleted) return res.status(404).json({ error: 'Akun Admin tidak ditemukan.' });
      return res.json({ ok: true, deletedId: targetId });
    } catch (err) {
      return handleDbError(res, err, 'Gagal menghapus akun Admin.');
    }
  });

  // === Admin Branding / Logo & Meta Icon Management ===
  app.put('/api/admin/branding', requireAdminAuth, async (req: Request, res: Response) => {
    try {
      const b = req.body || {};
      const logoUrl = b.logoUrl !== undefined ? String(b.logoUrl).trim() : undefined;
      const metaIconUrl = b.metaIconUrl !== undefined ? String(b.metaIconUrl).trim() : undefined;
      const brandName = b.brandName !== undefined ? String(b.brandName).trim() : undefined;

      if (logoUrl && logoUrl.length > 3_000_000) {
        return res.status(400).json({
          error: 'Ukuran file logo terlalu besar (maksimal ~2 MB). Kompres gambar terlebih dahulu.',
        });
      }

      if (
        logoUrl &&
        !logoUrl.startsWith('data:image/') &&
        !logoUrl.startsWith('http://') &&
        !logoUrl.startsWith('https://') &&
        !logoUrl.startsWith('/')
      ) {
        return res.status(400).json({
          error: 'Format logo harus berupa file gambar yang diunggah atau URL http(s)/path yang valid.',
        });
      }

      if (metaIconUrl && metaIconUrl.length > 3_000_000) {
        return res.status(400).json({
          error: 'Ukuran file Icon Meta terlalu besar (maksimal ~2 MB). Kompres gambar terlebih dahulu.',
        });
      }

      if (
        metaIconUrl &&
        !metaIconUrl.startsWith('data:image/') &&
        !metaIconUrl.startsWith('http://') &&
        !metaIconUrl.startsWith('https://') &&
        !metaIconUrl.startsWith('/')
      ) {
        return res.status(400).json({
          error: 'Format Icon Meta harus berupa file gambar (PNG/ICO/SVG/JPG/WebP) atau URL yang valid.',
        });
      }

      let footerUpdates: Record<string, string> | undefined;
      if (b.footer && typeof b.footer === 'object') {
        const cleanText = (v: unknown, maxLen = 220) =>
          typeof v === 'string' ? v.trim().slice(0, maxLen) : undefined;
        const cleanUrl = (v: unknown) => {
          if (typeof v !== 'string') return undefined;
          const trimmed = v.trim().slice(0, 300);
          if (!trimmed) return '';
          if (/^javascript:/i.test(trimmed) || /^data:/i.test(trimmed)) return '';
          return trimmed;
        };
        const f = b.footer as Record<string, unknown>;
        footerUpdates = {};
        const textFields = [
          'orgTitle',
          'orgSubtitle',
          'address',
          'phone',
          'hotlineLabel',
          'email',
          'websitePrimary',
          'websiteSecondary',
          'socialHandle',
          'copyrightText',
        ];
        for (const key of textFields) {
          const cleaned = cleanText(f[key], key === 'address' ? 320 : 200);
          if (cleaned !== undefined) footerUpdates[key] = cleaned;
        }
        const urlFields = ['facebookUrl', 'xUrl', 'instagramUrl', 'youtubeUrl'];
        for (const key of urlFields) {
          const cleaned = cleanUrl(f[key]);
          if (cleaned !== undefined) footerUpdates[key] = cleaned;
        }
      }

      const branding = await mysqlRepo.saveBrandingSettings({
        logoUrl,
        metaIconUrl,
        brandName,
        footer: footerUpdates,
      });
      return res.json({ ok: true, branding });
    } catch (err) {
      return handleDbError(res, err, 'Gagal menyimpan pengaturan branding & footer.');
    }
  });

  app.get('/api/admin/analytics', requireAdminAuth, async (_req: Request, res: Response) => {
    try {
      const [results, questions] = await Promise.all([
        loadAllEvaluatedParticipants(),
        mysqlRepo.listExamQuestions(false),
      ]);
      const analytics = buildAdminAnalytics(results, questions);
      return res.json({ ok: true, analytics });
    } catch (err) {
      return handleDbError(res, err, 'Gagal memuat analitik simulasi.');
    }
  });

  app.get('/api/admin/participants', requireAdminAuth, async (_req: Request, res: Response) => {
    try {
      const results = await loadAllEvaluatedParticipants();
      return res.json({ ok: true, participants: results });
    } catch (err) {
      return handleDbError(res, err, 'Gagal memuat daftar peserta.');
    }
  });

  app.post('/api/admin/participants', requireAdminAuth, async (req: Request, res: Response) => {
    try {
      const data = await provisionParticipantAccount(req.body || {}, 'ADMIN_MANUAL', req);
      return res.status(201).json({ ok: true, ...data });
    } catch (err: any) {
      if (err?.statusCode === 400) {
        return res.status(400).json({ error: err.message });
      }
      return handleDbError(res, err, 'Gagal menambahkan akun peserta.');
    }
  });

  app.post(
    '/api/admin/integration/test-provision',
    requireAdminAuth,
    async (req: Request, res: Response) => {
      try {
        const data = await provisionParticipantAccount(req.body || {}, 'KELASBREVET_API', req);
        return res.status(201).json({ ok: true, ...data });
      } catch (err: any) {
        if (err?.statusCode === 400) {
          return res.status(400).json({ error: err.message });
        }
        return handleDbError(res, err, 'Gagal menjalankan simulasi provisioning API.');
      }
    }
  );

  app.get(
    '/api/admin/participants/:nik/detail',
    requireAdminAuth,
    async (req: Request, res: Response) => {
      try {
        const participant = await mysqlRepo.findParticipantByNik(normalizeNik(req.params.nik));
        if (!participant) {
          return res.status(404).json({ error: 'Peserta tidak ditemukan.' });
        }
        const ws = await mysqlRepo.getOrCreateWorkspace(participant.nikKey);
        const result = evaluateParticipantWorkspace(participant, ws);
        return res.json({
          ok: true,
          result,
          simulationUrl: `${getPublicSimulationUrl(req)}/?nik=${encodeURIComponent(participant.nikKey)}`,
        });
      } catch (err) {
        return handleDbError(res, err, 'Gagal memuat detail peserta.');
      }
    }
  );

  app.patch(
    '/api/admin/participants/:nik',
    requireAdminAuth,
    async (req: Request, res: Response) => {
      try {
        const nikKey = normalizeNik(req.params.nik);
        const b = req.body || {};
        const updates: Partial<ParticipantAccount> = {};
        if (b.fullName !== undefined) updates.fullName = String(b.fullName).trim();
        if (b.email !== undefined) updates.email = String(b.email).trim();
        if (b.phone !== undefined) updates.phone = String(b.phone).trim();
        if (b.packageName !== undefined) updates.packageName = String(b.packageName).trim();
        if (b.isActive !== undefined) updates.isActive = Boolean(b.isActive);
        if (b.passingScore !== undefined) {
          updates.passingScore = Math.min(100, Math.max(1, Number(b.passingScore)));
        }
        if (b.regeneratePassword) {
          const newPw = generateParticipantPassword();
          updates.passwordHash = hashPassword(newPw);
          updates.initialPassword = newPw;
        }
        const updated = await mysqlRepo.updateParticipantMeta(nikKey, updates);
        if (!updated) return res.status(404).json({ error: 'Peserta tidak ditemukan.' });
        await mysqlRepo.syncWorkspaceProfileFromParticipant(nikKey, updated);
        return res.json({ ok: true, participant: toPublicParticipant(updated) });
      } catch (err) {
        return handleDbError(res, err, 'Gagal memperbarui data peserta.');
      }
    }
  );

  app.post(
    '/api/admin/participants/:nik/reset',
    requireAdminAuth,
    async (req: Request, res: Response) => {
      try {
        const nikKey = normalizeNik(req.params.nik);
        const participant = await mysqlRepo.findParticipantByNik(nikKey);
        const { workspace } = await mysqlRepo.resetWorkspace(nikKey);
        if (participant) {
          await mysqlRepo.syncWorkspaceProfileFromParticipant(nikKey, participant);
        }
        io.to(`room:nik:${nikKey}`).emit('workspace:updated', workspace);
        return res.json({ ok: true, message: 'Workspace peserta berhasil direset.' });
      } catch (err) {
        return handleDbError(res, err, 'Gagal mereset workspace peserta.');
      }
    }
  );

  app.delete(
    '/api/admin/participants/:nik',
    requireAdminAuth,
    async (req: Request, res: Response) => {
      try {
        const nikKey = normalizeNik(req.params.nik);
        const deleted = await mysqlRepo.deleteParticipant(nikKey);
        if (!deleted) return res.status(404).json({ error: 'Peserta tidak ditemukan.' });
        return res.json({ ok: true, deletedNik: nikKey });
      } catch (err) {
        return handleDbError(res, err, 'Gagal menghapus peserta.');
      }
    }
  );

  app.get('/api/admin/questions', requireAdminAuth, async (_req: Request, res: Response) => {
    try {
      const questions = await mysqlRepo.listExamQuestions(false);
      return res.json({ ok: true, questions });
    } catch (err) {
      return handleDbError(res, err, 'Gagal memuat daftar soal.');
    }
  });

  app.post('/api/admin/questions', requireAdminAuth, async (req: Request, res: Response) => {
    try {
      const b = req.body || {};
      if (!b.title || !b.summary) {
        return res.status(400).json({ error: 'Judul soal dan ringkasan skenario wajib diisi.' });
      }
      const now = new Date().toISOString();
      const existingList = await mysqlRepo.listExamQuestions(false);
      const q: ExamQuestion = {
        id: `q-${Date.now()}-${Math.floor(Math.random() * 999)}`,
        code: String(b.code || `SOAL_${existingList.length + 1}_${Date.now().toString().slice(-4)}`)
          .toUpperCase()
          .replace(/[^A-Z0-9_]/g, '_'),
        moduleTag: String(b.moduleTag || `Modul ${existingList.length + 1}`).trim(),
        title: String(b.title).trim(),
        accountMode: b.accountMode === 'INDIVIDUAL' ? 'INDIVIDUAL' : 'CORPORATE',
        summary: String(b.summary).trim(),
        instructions: Array.isArray(b.instructions)
          ? b.instructions.map((s: any) => String(s).trim()).filter(Boolean)
          : [],
        pdfUrl: b.pdfUrl ? String(b.pdfUrl).trim() : '',
        passingScore: Number(b.passingScore || DEFAULT_PASSING_SCORE),
        targetModule: String(b.targetModule || 'portal'),
        targetSubTab: b.targetSubTab ? String(b.targetSubTab) : undefined,
        sortOrder: Number(b.sortOrder ?? existingList.length + 1),
        isActive: b.isActive !== undefined ? Boolean(b.isActive) : true,
        createdAt: now,
        updatedAt: now,
      };
      const created = await mysqlRepo.createExamQuestion(q);
      return res.status(201).json({ ok: true, question: created });
    } catch (err) {
      return handleDbError(res, err, 'Gagal membuat soal baru.');
    }
  });

  app.put('/api/admin/questions/:id', requireAdminAuth, async (req: Request, res: Response) => {
    try {
      const b = req.body || {};
      const updates: Partial<ExamQuestion> = {};
      if (b.code !== undefined) updates.code = String(b.code).trim();
      if (b.moduleTag !== undefined) updates.moduleTag = String(b.moduleTag).trim();
      if (b.title !== undefined) updates.title = String(b.title).trim();
      if (b.accountMode !== undefined) {
        updates.accountMode = b.accountMode === 'INDIVIDUAL' ? 'INDIVIDUAL' : 'CORPORATE';
      }
      if (b.summary !== undefined) updates.summary = String(b.summary).trim();
      if (Array.isArray(b.instructions)) {
        updates.instructions = b.instructions.map((s: any) => String(s).trim()).filter(Boolean);
      }
      if (b.pdfUrl !== undefined) updates.pdfUrl = String(b.pdfUrl).trim();
      if (b.passingScore !== undefined) updates.passingScore = Number(b.passingScore);
      if (b.targetModule !== undefined) updates.targetModule = String(b.targetModule);
      if (b.targetSubTab !== undefined) updates.targetSubTab = String(b.targetSubTab);
      if (b.sortOrder !== undefined) updates.sortOrder = Number(b.sortOrder);
      if (b.isActive !== undefined) updates.isActive = Boolean(b.isActive);

      const updated = await mysqlRepo.updateExamQuestion(req.params.id, updates);
      if (!updated) return res.status(404).json({ error: 'Soal tidak ditemukan.' });
      return res.json({ ok: true, question: updated });
    } catch (err) {
      return handleDbError(res, err, 'Gagal memperbarui soal.');
    }
  });

  app.delete('/api/admin/questions/:id', requireAdminAuth, async (req: Request, res: Response) => {
    try {
      const deleted = await mysqlRepo.deleteExamQuestion(req.params.id);
      if (!deleted) return res.status(404).json({ error: 'Soal tidak ditemukan.' });
      return res.json({ ok: true, deletedId: req.params.id });
    } catch (err) {
      return handleDbError(res, err, 'Gagal menghapus soal.');
    }
  });

  // === Mount Vite in dev or serve dist in prod ===
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const serverDir = path.dirname(fileURLToPath(import.meta.url));
    const candidates = [
      path.resolve(process.cwd(), 'dist'),
      path.resolve(serverDir, '..', 'dist'),
      path.resolve(serverDir, 'dist'),
    ];
    const distPath = candidates.find((dir) => fs.existsSync(path.join(dir, 'index.html'))) || candidates[0];
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const onListening = () => {
    console.log(
      `KelasBrevet Coretax Simulator running on ${
        typeof PORT === 'number' ? `http://0.0.0.0:${PORT}` : PORT
      } [DB: ${mysqlRepo.getActiveDriverLabel()}]`
    );
  };

  if (typeof PORT === 'number') {
    httpServer.listen(PORT, '0.0.0.0', onListening);
  } else {
    httpServer.listen(PORT, onListening);
  }
}

startServer();
