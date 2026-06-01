import { createHmac, randomBytes } from 'crypto';
import { cookies } from 'next/headers';

const COOKIE_NAME = 'admin_session';
const SESSION_DURATION_MS = 8 * 60 * 60 * 1000; // 8 horas

function getSecret(): string {
  return process.env.SESSION_SECRET ?? 'dev-session-secret-change-in-prod';
}

function sign(payload: string): string {
  return createHmac('sha256', getSecret()).update(payload).digest('hex');
}

export function createSessionToken(): string {
  const payload = JSON.stringify({
    u: 'admin',
    exp: Date.now() + SESSION_DURATION_MS,
    nonce: randomBytes(8).toString('hex'),
  });
  const b64 = Buffer.from(payload).toString('base64url');
  return `${b64}.${sign(b64)}`;
}

export function verifySessionToken(token: string): boolean {
  const [b64, sig] = token.split('.');
  if (!b64 || !sig) return false;
  if (sign(b64) !== sig) return false;
  try {
    const { exp } = JSON.parse(Buffer.from(b64, 'base64url').toString());
    return Date.now() < exp;
  } catch {
    return false;
  }
}

export function checkAdminCredentials(username: string, password: string): boolean {
  const validUser = process.env.ADMIN_USERNAME ?? 'admincr';
  const validPass = process.env.ADMIN_PASSWORD ?? 'admincr';
  return username === validUser && password === validPass;
}

export async function getAdminSession(): Promise<boolean> {
  const jar = await cookies();
  const token = jar.get(COOKIE_NAME)?.value;
  if (!token) return false;
  return verifySessionToken(token);
}

export { COOKIE_NAME };
