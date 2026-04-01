import dotenv from 'dotenv';

dotenv.config();

export type NodeEnv = 'development' | 'test' | 'production';

export interface EnvConfig {
  nodeEnv: NodeEnv;
  port: number;
  mongoDbUri: string;
  jwtSecret: string;
  jwtExpiresIn: string;
  allowedOrigins: string[];
  bcryptRounds: number;
}

function parseNumber(value: string, fallback?: number): number {
  const n = Number(value);
  if (Number.isFinite(n)) return n;
  if (fallback !== undefined) return fallback;
  throw new Error(`Invalid number env value: "${value}"`);
}

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
}

function parseNodeEnv(value: string | undefined): NodeEnv {
  const v = (value ?? 'development') as NodeEnv;
  if (v !== 'development' && v !== 'test' && v !== 'production') {
    throw new Error(`Invalid NODE_ENV: "${value}"`);
  }
  return v;
}

/**
 * jsonwebtoken treats a numeric `expiresIn` string like "7" as seconds (7s), not days.
 * Common mistake: JWT_EXPIRES_IN=7 meaning "7 days" → sessions expire in 7 seconds.
 * - If the value already has a unit (d, h, m, s) or words like "days", pass through.
 * - Bare integers 1–31 → treat as days (e.g. 7 → "7d").
 * - Bare integers > 31 → treat as seconds (e.g. 3600 → 3600 seconds).
 * For 32+ days use an explicit suffix: "90d".
 */
function normalizeJwtExpiresIn(raw: string | undefined): string {
  const fallback = '30d';
  if (!raw?.trim()) return fallback;
  const v = raw.trim();
  if (/[a-zA-Z]/.test(v)) return v;
  if (/^\d+$/.test(v)) {
    const n = Number(v);
    if (!Number.isFinite(n) || n <= 0) return fallback;
    if (n <= 31) return `${n}d`;
    return `${n}s`;
  }
  return v;
}

export function getEnv(): EnvConfig {
  const nodeEnv = parseNodeEnv(process.env.NODE_ENV);
  const allowedOrigins = (process.env.ALLOWED_ORIGINS ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  return {
    nodeEnv,
    port: parseNumber(process.env.PORT ?? '5000', 5000),
    mongoDbUri: required('MONGODB_URI'),
    jwtSecret: required('JWT_SECRET'),
    jwtExpiresIn: normalizeJwtExpiresIn(process.env.JWT_EXPIRES_IN),
    allowedOrigins,
    bcryptRounds: parseNumber(process.env.BCRYPT_ROUNDS ?? '12', 12),
  };
}