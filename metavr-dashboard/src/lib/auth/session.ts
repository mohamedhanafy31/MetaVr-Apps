import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';
import jwt, { SignOptions, VerifyOptions } from 'jsonwebtoken';

const SESSION_SECRET = process.env.SESSION_SECRET;
const SESSION_PUBLIC_KEY = process.env.SESSION_PUBLIC_KEY
  ? process.env.SESSION_PUBLIC_KEY.replace(/\\n/g, '\n')
  : undefined;

if (!SESSION_SECRET) {
  throw new Error('[auth] SESSION_SECRET environment variable must be set before startup');
}

// Type assertion: SESSION_SECRET is guaranteed to be defined after the check above
const SESSION_SECRET_ASSERTED: string = SESSION_SECRET;

const DEFAULT_ISSUER = process.env.NEXT_PUBLIC_SESSION_ISSUER ?? 'metavr-backend';
const DEFAULT_AUDIENCE = process.env.NEXT_PUBLIC_SESSION_AUDIENCE ?? 'metavr-dashboard';
const SIGNING_ALGORITHM = SESSION_PUBLIC_KEY ? 'RS256' : 'HS256';

const sessionSignOptions: SignOptions = {
  algorithm: SIGNING_ALGORITHM,
  issuer: DEFAULT_ISSUER,
  audience: DEFAULT_AUDIENCE,
};

const sessionVerifyOptions: VerifyOptions = {
  algorithms: [SIGNING_ALGORITHM],
  issuer: DEFAULT_ISSUER,
  audience: DEFAULT_AUDIENCE,
};

const SESSION_EXPIRY = 12 * 60 * 60; // 12 hours
const REMEMBER_ME_EXPIRY = 7 * 24 * 60 * 60; // 7 days

export interface SessionData {
  userId: string;
  email: string;
  role: 'admin' | 'supervisor';
  expiresAt: number;
  rememberMe?: boolean;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function createSessionToken(data: SessionData): string {
  if (SIGNING_ALGORITHM === 'RS256') {
    throw new Error('Session tokens are issued exclusively by the backend when RS256 is enabled');
  }
  return jwt.sign(data, SESSION_SECRET_ASSERTED, { expiresIn: SESSION_EXPIRY, ...sessionSignOptions });
}

export function createRememberMeToken(data: SessionData): string {
  if (SIGNING_ALGORITHM === 'RS256') {
    throw new Error('Session tokens are issued exclusively by the backend when RS256 is enabled');
  }
  return jwt.sign(data, SESSION_SECRET_ASSERTED, {
    expiresIn: REMEMBER_ME_EXPIRY,
    ...sessionSignOptions,
  });
}

export function verifySessionToken(token: string): SessionData | null {
  try {
    const verificationKey = SESSION_PUBLIC_KEY || SESSION_SECRET_ASSERTED;
    const decoded = jwt.verify(token, verificationKey, sessionVerifyOptions) as SessionData;
    
    // Check if session is expired based on expiresAt field
    if (decoded.expiresAt && decoded.expiresAt < Date.now()) {
      console.warn('[auth] Session expired (expiresAt check)');
      return null;
    }
    
    return decoded;
  } catch (error) {
    console.warn('[auth] Session verification failed', error);
    return null;
  }
}

export async function setSessionCookie(sessionData: SessionData, rememberMe: boolean = false) {
  const token = rememberMe ? createRememberMeToken(sessionData) : createSessionToken(sessionData);
  const expiresAt = rememberMe ? REMEMBER_ME_EXPIRY : SESSION_EXPIRY;
  
  const cookieStore = await cookies();
  cookieStore.set('session', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: expiresAt,
    path: '/',
  });
}

export async function getSessionFromCookie(): Promise<SessionData | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get('session')?.value;
  
  if (!token) return null;
  
  return verifySessionToken(token);
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete('session');
}

export function getSessionFromRequest(request: NextRequest): SessionData | null {
  const token = request.cookies.get('session')?.value;
  
  if (!token) return null;
  
  return verifySessionToken(token);
}

export function generateSecurePassword(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
  let password = '';
  
  // Ensure at least one character from each required category
  password += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[Math.floor(Math.random() * 26)]; // uppercase
  password += 'abcdefghijklmnopqrstuvwxyz'[Math.floor(Math.random() * 26)]; // lowercase
  password += '0123456789'[Math.floor(Math.random() * 10)]; // number
  password += '!@#$%^&*'[Math.floor(Math.random() * 8)]; // special char
  
  // Fill the rest randomly
  for (let i = 4; i < 12; i++) {
    password += chars[Math.floor(Math.random() * chars.length)];
  }
  
  // Shuffle the password
  return password.split('').sort(() => Math.random() - 0.5).join('');
}

export function validatePasswordStrength(password: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }
  
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  
  if (!/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  
  if (!/[@$!%*?&]/.test(password)) {
    errors.push('Password must contain at least one special character (@$!%*?&)');
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}

// Handshake token (short lived) ------------------------------------------------
export interface HandshakeClaims {
  userId: string;
  email: string;
  role: 'admin' | 'supervisor';
  rememberMe?: boolean;
}

export function createHandshakeToken(claims: HandshakeClaims, ttlSeconds = 60): string {
  if (SIGNING_ALGORITHM === 'RS256') {
    throw new Error('Handshake tokens are issued exclusively by the backend when RS256 is enabled');
  }
  return jwt.sign({ ...claims }, SESSION_SECRET_ASSERTED, { expiresIn: ttlSeconds, ...sessionSignOptions });
}

export function verifyHandshakeToken(token: string): (HandshakeClaims & { iat: number; exp: number }) | null {
  try {
    const verificationKey = SESSION_PUBLIC_KEY || SESSION_SECRET_ASSERTED;
    return jwt.verify(token, verificationKey, sessionVerifyOptions) as HandshakeClaims & {
      iat: number;
      exp: number;
    };
  } catch (error) {
    console.warn('[auth] Handshake verification failed', error);
    return null;
  }
}

export function isExpiringSoon(session: SessionData, thresholdSeconds: number = 3600): boolean {
  const now = Date.now();
  return session.expiresAt - now <= thresholdSeconds * 1000;
}
