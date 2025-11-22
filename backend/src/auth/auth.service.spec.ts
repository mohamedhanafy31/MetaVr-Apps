import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Request, Response } from 'express';
import * as bcrypt from 'bcryptjs';
import { AuthService } from './auth.service';
import { AppLoggerService } from '../logger/logger.service';
import {
  DEFAULT_SESSION_EXPIRY_SECONDS,
  REMEMBER_ME_EXPIRY_SECONDS,
  SESSION_COOKIE_NAME,
} from './auth.constants';
import { UserRole } from './types/session.types';

jest.mock('bcryptjs', () => ({
  compare: jest.fn(),
}));

type MockUserDoc = {
  id: string;
  data: () => {
    email: string;
    passwordHash: string;
    role: UserRole;
    status: 'active' | 'suspended';
  };
  ref: { update: jest.Mock };
};

describe('AuthService', () => {
  let authService: AuthService;
  let jwtService: jest.Mocked<JwtService>;
  let configService: jest.Mocked<ConfigService>;
  let logger: jest.Mocked<AppLoggerService>;
  let firestore: any;
  let userCollection: any;
  let handshakeCollection: any;
  let sessionCollection: any;
  let handshakeSnapshot: any;
  let sessionSnapshot: any;
  let sessionDocRef: any;
  let response: Response;
  let request: Request;
  const bcryptCompare = bcrypt.compare as jest.MockedFunction<typeof bcrypt.compare>;

  beforeEach(() => {
    jwtService = {
      sign: jest.fn(),
      verify: jest.fn(),
    } as unknown as jest.Mocked<JwtService>;

    configService = {
      get: jest.fn((key: string, defaultValue?: string) => {
        if (key === 'NODE_ENV') {
          return 'production';
        }
        if (key === 'SESSION_SECRET') {
          return 'test-secret';
        }
        if (key === 'SESSION_TOKEN_AUDIENCE') {
          return 'metavr-dashboard';
        }
        if (key === 'SESSION_TOKEN_ISSUER') {
          return 'metavr-backend';
        }
        return defaultValue ?? null;
      }),
    } as unknown as jest.Mocked<ConfigService>;

    logger = {
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
      verbose: jest.fn(),
      logRequest: jest.fn(),
      logError: jest.fn(),
      logPerformance: jest.fn(),
      logSecurity: jest.fn(),
      logDatabase: jest.fn(),
    } as unknown as jest.Mocked<AppLoggerService>;

    handshakeSnapshot = {
      exists: true,
      data: () => ({
        handshakeId: 'handshake-id',
        userId: 'user-id',
        rememberMe: false,
        expiresAt: Date.now() + 60000,
        used: false,
        createdAt: Date.now(),
      }),
      ref: { update: jest.fn() },
    };

    userCollection = {
      where: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      get: jest.fn(),
    };

    handshakeCollection = {
      doc: jest.fn().mockReturnValue({
        set: jest.fn(),
        get: jest.fn().mockResolvedValue(handshakeSnapshot),
      }),
    };

    sessionSnapshot = {
      exists: true,
      data: () => ({
        sessionId: 'session-id',
        userId: 'user-id',
        email: 'user@example.com',
        role: 'admin',
        rememberMe: false,
        expiresAt: Date.now() + 60000,
        revoked: false,
        lastAccessAt: Date.now(),
        createdAt: Date.now(),
      }),
      ref: { update: jest.fn() },
    };

    sessionDocRef = {
      set: jest.fn(),
      get: jest.fn().mockResolvedValue(sessionSnapshot),
    };

    sessionCollection = {
      doc: jest.fn().mockReturnValue(sessionDocRef),
    };

    firestore = {
      collection: jest.fn((name: string) => {
        switch (name) {
          case 'users':
            return userCollection;
          case 'handshakeTokens':
            return handshakeCollection;
          case 'sessions':
            return sessionCollection;
          default:
            return sessionCollection;
        }
      }),
    };

    response = { cookie: jest.fn() } as unknown as Response;
    request = {
      headers: {},
      originalUrl: '/auth',
    } as unknown as Request;

    authService = new AuthService(firestore as any, jwtService, configService, logger);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  function mockUserDoc(overrides?: Partial<MockUserDoc['data']>): MockUserDoc {
    const data = {
      email: 'user@example.com',
      passwordHash: 'hashed',
      role: 'admin' as UserRole,
      status: 'active' as const,
      ...overrides,
    };

    return {
      id: 'user-id',
      data: () => data,
      ref: { update: jest.fn() },
    };
  }

  describe('login', () => {
    it('returns role for valid credentials and sets handshake cookie', async () => {
      const doc = mockUserDoc();
      userCollection.get.mockResolvedValue({ empty: false, docs: [doc] });
      bcryptCompare.mockResolvedValue(true);
      (jwtService.sign as jest.Mock).mockReturnValueOnce('handshake-token');

      const result = await authService.login(
        {
          email: 'user@example.com',
          password: 'secret123',
          rememberMe: true,
        },
        response,
      );

      expect(doc.ref.update).toHaveBeenCalledWith({ lastLoginAt: expect.any(Date) });
      expect(response.cookie).toHaveBeenCalledWith(
        expect.any(String),
        'handshake-token',
        expect.objectContaining({
          httpOnly: true,
        }),
      );
      expect(result).toEqual({
        role: 'admin',
      });
    });

    it('throws UnauthorizedException for unknown email', async () => {
      userCollection.get.mockResolvedValue({ empty: true });

      await expect(
        authService.login(
          {
            email: 'missing@example.com',
            password: 'secret123',
          },
          response,
        ),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('throws UnauthorizedException for suspended users', async () => {
      const doc = mockUserDoc({ status: 'suspended' });
      userCollection.get.mockResolvedValue({ empty: false, docs: [doc] });
      bcryptCompare.mockResolvedValue(true);

      await expect(
        authService.login(
          {
            email: 'user@example.com',
            password: 'secret123',
          },
          response,
        ),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('throws UnauthorizedException for invalid password', async () => {
      const doc = mockUserDoc();
      userCollection.get.mockResolvedValue({ empty: false, docs: [doc] });
      bcryptCompare.mockResolvedValue(false);

      await expect(
        authService.login(
          {
            email: 'user@example.com',
            password: 'wrong',
          },
          response,
        ),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });
  });

  describe('handleHandshake', () => {
    it('sets session cookie and returns redirect info for admin', async () => {
      const payload = {
        userId: 'user-id',
        email: 'user@example.com',
        role: 'admin' as UserRole,
        rememberMe: false,
        handshakeId: 'handshake-id',
      };
      jwtService.verify.mockReturnValue(payload);
      jwtService.sign.mockReturnValue('session-jwt');
      userCollection.get.mockResolvedValue({ empty: false, docs: [mockUserDoc()] });

      const result = await authService.handleHandshake('token', request, response);

      expect(result).toEqual({
        role: 'admin',
        redirectTo: '/admin/dashboard',
      });
      expect(jwtService.sign).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-id',
          expiresAt: expect.any(Number),
        }),
        expect.objectContaining({ expiresIn: DEFAULT_SESSION_EXPIRY_SECONDS }),
      );
      const sessionCookieCall = (response.cookie as jest.Mock).mock.calls[1];
      expect(sessionCookieCall[0]).toBe(SESSION_COOKIE_NAME);
      expect(sessionCookieCall[1]).toBe('session-jwt');
      expect(sessionCookieCall[2]).toEqual(
        expect.objectContaining({
          httpOnly: true,
          sameSite: 'strict',
          secure: true,
          maxAge: DEFAULT_SESSION_EXPIRY_SECONDS * 1000,
        }),
      );
    });

    it('extends cookie lifetime when rememberMe is true', async () => {
      const payload = {
        userId: 'user-id',
        email: 'user@example.com',
        role: 'supervisor' as UserRole,
        rememberMe: true,
        handshakeId: 'handshake-id',
      };
      jwtService.verify.mockReturnValue(payload);
      jwtService.sign.mockReturnValue('session-jwt');

      const result = await authService.handleHandshake('token', request, response);

      expect(result.redirectTo).toBe('/supervisor/dashboard');
      expect(jwtService.sign).toHaveBeenCalledWith(
        expect.objectContaining({ rememberMe: true }),
        expect.objectContaining({ expiresIn: REMEMBER_ME_EXPIRY_SECONDS }),
      );
      const sessionCookieCall = (response.cookie as jest.Mock).mock.calls[1];
      expect(sessionCookieCall[0]).toBe(SESSION_COOKIE_NAME);
      expect(sessionCookieCall[2]).toEqual(
        expect.objectContaining({
          maxAge: REMEMBER_ME_EXPIRY_SECONDS * 1000,
        }),
      );
    });

    it('throws BadRequestException when handshake token is invalid', async () => {
      jwtService.verify.mockImplementation(() => {
        throw new Error('invalid');
      });

      await expect(
        authService.handleHandshake('bad-token', request, response),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('marks cookies as insecure outside production', async () => {
      const payload = {
        userId: 'user-id',
        email: 'user@example.com',
        role: 'admin' as UserRole,
        handshakeId: 'handshake-id',
      };
      jwtService.verify.mockReturnValue(payload);
      jwtService.sign.mockReturnValue('session-jwt');

      const devConfigService = {
        get: jest.fn((key: string, defaultValue?: string) => {
          if (key === 'NODE_ENV') {
            return 'development';
          }
          return defaultValue ?? null;
        }),
      } as unknown as ConfigService;

      const service = new AuthService(firestore as any, jwtService, devConfigService, logger);
      const response = { cookie: jest.fn() } as unknown as Response;
      await service.handleHandshake('token', request, response);

      expect(response.cookie).toHaveBeenCalledWith(
        SESSION_COOKIE_NAME,
        'session-jwt',
        expect.objectContaining({
          secure: false,
        }),
      );
    });
  });

  describe('logout', () => {
    it('clears the session cookie', async () => {
      const response = { cookie: jest.fn() } as unknown as Response;
      const req = {
        headers: { cookie: `${SESSION_COOKIE_NAME}=token` },
        originalUrl: '/auth/logout',
      } as unknown as Request;
      jwtService.verify.mockReturnValue({
        sessionId: 'session-id',
        userId: 'user-id',
        email: 'user@example.com',
        role: 'admin',
        expiresAt: Date.now() + 1000,
      });

      await authService.logout(req, response);

      expect(response.cookie).toHaveBeenCalledWith(
        SESSION_COOKIE_NAME,
        '',
        expect.objectContaining({
          httpOnly: true,
          secure: true,
          sameSite: 'strict',
          maxAge: 0,
        }),
      );
    });

    it('clears cookie without secure flag in non-production', async () => {
      const response = { cookie: jest.fn() } as unknown as Response;
      const req = {
        headers: { cookie: `${SESSION_COOKIE_NAME}=token` },
        originalUrl: '/auth/logout',
      } as unknown as Request;
      const devConfigService = {
        get: jest.fn((key: string, defaultValue?: string) => {
          if (key === 'NODE_ENV') {
            return 'development';
          }
          return defaultValue ?? null;
        }),
      } as unknown as ConfigService;
      const service = new AuthService(firestore as any, jwtService, devConfigService, logger);

      jwtService.verify.mockReturnValue({
        sessionId: 'session-id',
        userId: 'user-id',
        email: 'user@example.com',
        role: 'admin',
        expiresAt: Date.now() + 1000,
      });

      await service.logout(req, response);

      expect(response.cookie).toHaveBeenCalledWith(
        SESSION_COOKIE_NAME,
        '',
        expect.objectContaining({
          secure: false,
        }),
      );
    });
  });

  describe('validateSessionToken', () => {
    it('returns payload when token and session record are valid', async () => {
      const payload = {
        sessionId: 'session-id',
        userId: 'user-id',
        email: 'user@example.com',
        role: 'admin' as UserRole,
        expiresAt: Date.now() + 60000,
      };
      jwtService.verify.mockReturnValue(payload);

      await expect(authService.validateSessionToken('token')).resolves.toEqual(payload);
    });

    it('throws UnauthorizedException when JWT verification fails', async () => {
      jwtService.verify.mockImplementation(() => {
        throw new Error('bad token');
      });

      await expect(authService.validateSessionToken('token')).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });

    it('throws UnauthorizedException when session record is revoked', async () => {
      sessionSnapshot.data = () => ({
        sessionId: 'session-id',
        userId: 'user-id',
        email: 'user@example.com',
        role: 'admin',
        rememberMe: false,
        expiresAt: Date.now() + 60000,
        revoked: true,
        revocationReason: 'manual',
        lastAccessAt: Date.now(),
        createdAt: Date.now(),
      });
      const payload = {
        sessionId: 'session-id',
        userId: 'user-id',
        email: 'user@example.com',
        role: 'admin' as UserRole,
        expiresAt: Date.now() + 60000,
      };
      jwtService.verify.mockReturnValue(payload);

      await expect(authService.validateSessionToken('token')).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });
  });
});

