import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { db } from './db';
import { UserRole } from './types';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'wa-gateway-super-secret-jwt-key-2026-production-ready'
);

const COOKIE_NAME = 'wa_session';

export interface SessionUser {
  id: string;
  email: string;
  role: UserRole | string;
  workspaceId?: string | null;
  workspaceName?: string | null;
}

export async function createSessionToken(user: SessionUser): Promise<string> {
  return new SignJWT({ ...user })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(JWT_SECRET);
}

export async function verifySessionToken(token: string): Promise<SessionUser | null> {
  try {
    const verified = await jwtVerify(token, JWT_SECRET);
    return verified.payload as unknown as SessionUser;
  } catch {
    return null;
  }
}

export async function getSession(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

export async function setSessionCookie(user: SessionUser) {
  const token = await createSessionToken(user);
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: '/',
  });
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

export async function requireAuth(allowedRoles?: (UserRole | string)[]) {
  const session = await getSession();
  if (!session) {
    throw new Error('UNAUTHORIZED');
  }

  const dbUser = await db.user.findUnique({
    where: { id: session.id },
    select: { isSuspended: true, role: true },
  });

  if (!dbUser || dbUser.isSuspended) {
    await clearSessionCookie();
    throw new Error('ACCOUNT_SUSPENDED');
  }

  if (allowedRoles && !allowedRoles.includes(dbUser.role)) {
    throw new Error('FORBIDDEN');
  }

  return session;
}
