import crypto from 'crypto';
import { NextFunction, Request, Response } from 'express';

const DEFAULT_ADMIN_EMAIL = 'admin@kelasbrevet.com';
const DEFAULT_ADMIN_PASSWORD = 'AdminBrevet2026!';
const DEFAULT_TOKEN_SECRET = 'kb_simulasi_admin_token_secret_dev_2026';
const DEFAULT_INTEGRATION_KEY = 'kb_live_simulasi_secret_key_2026';

export function getAdminCredentials() {
  return {
    email: (process.env.ADMIN_EMAIL || DEFAULT_ADMIN_EMAIL).trim().toLowerCase(),
    password: process.env.ADMIN_PASSWORD || DEFAULT_ADMIN_PASSWORD,
  };
}

export function getIntegrationApiKey(): string {
  return (process.env.INTEGRATION_API_KEY || DEFAULT_INTEGRATION_KEY).trim();
}

export function getPublicSimulationUrl(req?: Request): string {
  if (process.env.SIMULATION_PUBLIC_URL) {
    return process.env.SIMULATION_PUBLIC_URL.replace(/\/+$/, '');
  }
  if (process.env.APP_URL) {
    return process.env.APP_URL.replace(/\/+$/, '');
  }
  if (req) {
    const proto = (req.headers['x-forwarded-proto'] as string) || req.protocol || 'http';
    const host = req.headers['x-forwarded-host'] || req.headers.host || 'localhost:3000';
    return `${proto}://${host}`.replace(/\/+$/, '');
  }
  return 'http://localhost:3000';
}

export function hashPassword(plain: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(plain, salt, 64).toString('hex');
  return `${salt}:${derived}`;
}

export function verifyPassword(plain: string, storedHash: string): boolean {
  if (!storedHash || !storedHash.includes(':')) return false;
  const [salt, keyHex] = storedHash.split(':');
  if (!salt || !keyHex) return false;
  const derived = crypto.scryptSync(plain, salt, 64);
  const storedBuf = Buffer.from(keyHex, 'hex');
  if (derived.length !== storedBuf.length) return false;
  return crypto.timingSafeEqual(derived, storedBuf);
}

export function generateParticipantPassword(): string {
  const digits = String(crypto.randomInt(1000, 9999));
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let suffix = '';
  for (let i = 0; i < 4; i++) {
    suffix += alphabet[crypto.randomInt(0, alphabet.length)];
  }
  return `KB-${digits}-${suffix}`;
}

export function generateParticipantNik(seedHint?: string): string {
  if (seedHint) {
    const clean = seedHint.replace(/\D/g, '');
    if (clean.length === 16) return clean;
  }
  // Generate realistic 16-digit Indonesian NIK format (3174 + 12 random digits)
  const randPart = Array.from({ length: 12 }, () => String(crypto.randomInt(0, 10))).join('');
  return `3174${randPart}`;
}

export interface AdminTokenPayload {
  id: string;
  email: string;
  fullName: string;
  role: 'SUPER_ADMIN' | 'ADMIN';
  iat: number;
  exp: number;
}

function getTokenSecret(): string {
  return process.env.ADMIN_TOKEN_SECRET || DEFAULT_TOKEN_SECRET;
}

export function signAdminToken(admin: {
  id: string;
  email: string;
  fullName: string;
  role: 'SUPER_ADMIN' | 'ADMIN';
}): string {
  const payload: AdminTokenPayload = {
    id: admin.id,
    email: admin.email,
    fullName: admin.fullName,
    role: admin.role,
    iat: Date.now(),
    exp: Date.now() + 1000 * 60 * 60 * 12, // 12 hours
  };
  const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = crypto
    .createHmac('sha256', getTokenSecret())
    .update(encoded)
    .digest('base64url');
  return `${encoded}.${sig}`;
}

export function verifyAdminToken(token: string): AdminTokenPayload | null {
  if (!token || !token.includes('.')) return null;
  const [encoded, sig] = token.split('.');
  if (!encoded || !sig) return null;

  const expectedSig = crypto
    .createHmac('sha256', getTokenSecret())
    .update(encoded)
    .digest('base64url');

  const sigBuf = Buffer.from(sig);
  const expectedBuf = Buffer.from(expectedSig);
  if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
    return null;
  }

  try {
    const payload = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf-8')) as AdminTokenPayload;
    const validRole = payload.role === 'ADMIN' || payload.role === 'SUPER_ADMIN';
    if (!validRole || !payload.email || !payload.exp || Date.now() > payload.exp) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

export function requireAdminAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = String(req.headers.authorization || '');
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
  const payload = verifyAdminToken(token);
  if (!payload) {
    return res.status(401).json({
      error: 'Sesi Admin tidak valid atau sudah berakhir. Silakan login kembali.',
    });
  }
  (req as any).adminUser = payload;
  return next();
}

export function requireIntegrationApiKey(req: Request, res: Response, next: NextFunction) {
  const expected = getIntegrationApiKey();
  const headerKey = String(req.headers['x-api-key'] || '').trim();
  const authHeader = String(req.headers.authorization || '').trim();
  const bearerKey = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
  const provided = headerKey || bearerKey;

  if (!provided) {
    return res.status(401).json({
      error: 'Header X-API-Key atau Authorization Bearer API Key wajib disertakan.',
    });
  }

  const providedBuf = Buffer.from(provided);
  const expectedBuf = Buffer.from(expected);
  if (
    providedBuf.length !== expectedBuf.length ||
    !crypto.timingSafeEqual(providedBuf, expectedBuf)
  ) {
    return res.status(403).json({
      error: 'API Key integrasi kelasbrevet.com tidak valid.',
    });
  }
  return next();
}
