import { JwtService } from '@nestjs/jwt';
import { UserRole, SessionPayload, HandshakePayload } from '../../src/auth/types/session.types';
import { randomUUID } from 'crypto';

/**
 * Creates a mock session token for testing
 */
export function createMockSessionToken(payload: {
  userId?: string;
  email?: string;
  role?: UserRole;
  sessionId?: string;
  expiresAt?: number;
  rememberMe?: boolean;
} = {}): string {
  const jwtService = new JwtService({
    secret: process.env.SESSION_SECRET || 'test-secret-key-for-jwt-signing',
  });

  const defaultPayload: SessionPayload = {
    userId: payload.userId || 'user-123',
    email: payload.email || 'user@test.com',
    role: payload.role || 'admin',
    sessionId: payload.sessionId || randomUUID(),
    expiresAt: payload.expiresAt || Date.now() + 12 * 60 * 60 * 1000, // 12 hours
    rememberMe: payload.rememberMe || false,
  };

  return jwtService.sign(defaultPayload, {
    issuer: process.env.SESSION_TOKEN_ISSUER || 'metavr-backend',
    audience: 'metavr-session',
    expiresIn: '12h',
    subject: defaultPayload.userId,
    jwtid: defaultPayload.sessionId,
  });
}

/**
 * Creates a mock handshake token for testing
 */
export function createMockHandshakeToken(payload: {
  userId?: string;
  email?: string;
  role?: UserRole;
  handshakeId?: string;
  rememberMe?: boolean;
}): string {
  const jwtService = new JwtService({
    secret: process.env.SESSION_SECRET || 'test-secret-key-for-jwt-signing',
  });

  const defaultPayload: HandshakePayload = {
    userId: payload.userId || 'user-123',
    email: payload.email || 'user@test.com',
    role: payload.role || 'admin',
    handshakeId: payload.handshakeId || randomUUID(),
    rememberMe: payload.rememberMe || false,
  };

  return jwtService.sign(defaultPayload, {
    issuer: process.env.SESSION_TOKEN_ISSUER || 'metavr-backend',
    audience: 'metavr-handshake',
    expiresIn: '5m',
    subject: defaultPayload.userId,
    jwtid: defaultPayload.handshakeId,
  });
}

/**
 * Creates a mock Firestore instance for testing
 */
export function createMockFirestore() {
  const mockCollection = jest.fn();
  const mockDoc = jest.fn();
  const mockGet = jest.fn();
  const mockSet = jest.fn();
  const mockUpdate = jest.fn();
  const mockWhere = jest.fn();
  const mockLimit = jest.fn();

  mockCollection.mockReturnValue({
    doc: mockDoc,
    where: mockWhere,
    add: jest.fn(),
  });

  mockDoc.mockReturnValue({
    get: mockGet,
    set: mockSet,
    update: mockUpdate,
    ref: {
      update: mockUpdate,
    },
  });

  mockWhere.mockReturnValue({
    limit: mockLimit,
  });

  mockLimit.mockReturnValue({
    get: mockGet,
  });

  return {
    collection: mockCollection,
    doc: mockDoc,
    get: mockGet,
    set: mockSet,
    update: mockUpdate,
    where: mockWhere,
    limit: mockLimit,
  };
}

/**
 * Creates a mock logger service for testing
 */
export function createMockLogger() {
  return {
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
    verbose: jest.fn(),
    logSecurity: jest.fn(),
    logError: jest.fn(),
    logRequest: jest.fn(),
    logPerformance: jest.fn(),
    logDatabase: jest.fn(),
  };
}

/**
 * Extracts cookie value from Set-Cookie header
 */
export function extractCookie(response: any, cookieName: string): string | undefined {
  const setCookieHeaders = response.headers['set-cookie'] || [];
  const cookie = setCookieHeaders.find((c: string) => c.startsWith(`${cookieName}=`));
  if (!cookie) return undefined;
  
  return cookie.split(';')[0].split('=')[1];
}

/**
 * Creates a session cookie string for testing
 */
export function createSessionCookieString(token: string): string {
  return `session=${token}`;
}

