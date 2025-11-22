import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AppLoggerService } from '../logger/logger.service';
import { FIREBASE_FIRESTORE } from '../firebase/firebase.constants';
import { SESSION_IDLE_TIMEOUT_SECONDS } from './auth.constants';
import {
  createMockSessionToken,
  createMockFirestore,
  createMockLogger,
} from '../../test/helpers/auth.helpers';

describe('AuthService - Session Validation', () => {
  let service: AuthService;
  let mockFirestore: any;
  let mockJwtService: jest.Mocked<JwtService>;
  let mockLogger: any;
  let mockConfigService: jest.Mocked<ConfigService>;

  beforeEach(async () => {
    mockFirestore = createMockFirestore();
    mockLogger = createMockLogger();
    mockJwtService = {
      sign: jest.fn(),
      verify: jest.fn(),
    } as any;

    mockConfigService = {
      get: jest.fn((key: string, defaultValue?: any) => {
        const config: Record<string, any> = {
          SESSION_TOKEN_ISSUER: 'metavr-backend',
          SESSION_TOKEN_AUDIENCE: 'metavr-session',
          HANDSHAKE_TOKEN_AUDIENCE: 'metavr-handshake',
        };
        return config[key] || defaultValue;
      }),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: FIREBASE_FIRESTORE,
          useValue: mockFirestore,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: AppLoggerService,
          useValue: mockLogger,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Valid Session (Scenario 1.5)', () => {
    it('should update lastAccessAt on successful validation', async () => {
      // Arrange
      const sessionId = 'session-123';
      const sessionToken = createMockSessionToken({ sessionId });
      const now = Date.now();

      mockJwtService.verify.mockReturnValue({
        userId: 'user-123',
        email: 'user@test.com',
        role: 'admin',
        sessionId,
        expiresAt: now + 3600000,
      });

      const updateMock = jest.fn().mockResolvedValue(undefined);
      const sessionSnapshot = {
        exists: true,
        data: () => ({
          sessionId,
          revoked: false,
          expiresAt: now + 3600000,
          lastAccessAt: now - 60000, // 1 minute ago
        }),
        ref: {
          update: updateMock,
        },
      };

      const sessionDocRef = {
        get: jest.fn().mockResolvedValue(sessionSnapshot),
      };

      mockFirestore.collection.mockReturnValue({
        doc: jest.fn().mockReturnValue(sessionDocRef),
      });

      // Act
      await service.validateSessionToken(sessionToken);

      // Assert
      expect(updateMock).toHaveBeenCalledWith({
        lastAccessAt: expect.any(Number),
      });
      const updateCall = updateMock.mock.calls[0][0];
      expect(updateCall.lastAccessAt).toBeGreaterThan(now - 1000);
    });
  });

  describe('Invalid Session Token (Scenario 3.1)', () => {
    it('should reject tampered token', async () => {
      // Arrange
      const validToken = createMockSessionToken();
      const tamperedToken = validToken.slice(0, -5) + 'XXXXX';

      mockJwtService.verify.mockImplementation(() => {
        throw new Error('Invalid signature');
      });

      // Act & Assert
      try {
        await service.validateSessionToken(tamperedToken);
        fail('Should have thrown UnauthorizedException');
      } catch (error) {
        expect(error).toBeInstanceOf(UnauthorizedException);
        // Verify security log was called (may be called in verifySessionToken or validateSessionToken)
        expect(mockLogger.logSecurity).toHaveBeenCalled();
      }
    });

    it('should log security event for tampered token', async () => {
      const tamperedToken = 'invalid.jwt.token';

      mockJwtService.verify.mockImplementation(() => {
        throw new Error('Invalid signature');
      });

      try {
        await service.validateSessionToken(tamperedToken);
      } catch (error) {
        expect(mockLogger.logSecurity).toHaveBeenCalledWith(
          'Session rejected: signature validation failed'
        );
      }
    });
  });

  describe('Expired Session Token (Scenario 3.2)', () => {
    it('should reject expired JWT token', async () => {
      // Arrange: Create token with past expiration
      const expiredToken = createMockSessionToken({
        expiresAt: Date.now() - 3600000, // 1 hour ago
      });

      mockJwtService.verify.mockImplementation(() => {
        const error: any = new Error('jwt expired');
        error.name = 'TokenExpiredError';
        throw error;
      });

      // Act & Assert
      await expect(service.validateSessionToken(expiredToken)).rejects.toThrow(
        UnauthorizedException
      );
      expect(mockLogger.logSecurity).toHaveBeenCalledWith(
        'Session verification failed',
        expect.objectContaining({
          reason: expect.stringContaining('expired'),
        })
      );
    });
  });

  describe('Revoked Session (Scenario 3.3)', () => {
    it('should reject revoked session', async () => {
      // Arrange
      const sessionId = 'session-123';
      const sessionToken = createMockSessionToken({ sessionId });

      mockJwtService.verify.mockReturnValue({
        userId: 'user-123',
        email: 'user@test.com',
        role: 'admin',
        sessionId,
        expiresAt: Date.now() + 3600000,
      });

      const sessionDocRef = {
        get: jest.fn().mockResolvedValue({
          exists: true,
          data: () => ({
            sessionId,
            revoked: true,
            revokedAt: Date.now() - 1000,
            revocationReason: 'logout',
            expiresAt: Date.now() + 3600000,
            lastAccessAt: Date.now(),
          }),
        }),
      };

      mockFirestore.collection.mockReturnValue({
        doc: jest.fn().mockReturnValue(sessionDocRef),
      });

      // Act & Assert
      await expect(service.validateSessionToken(sessionToken)).rejects.toThrow(
        UnauthorizedException
      );
      expect(mockLogger.logSecurity).toHaveBeenCalledWith(
        'Session rejected: revoked',
        expect.objectContaining({
          reason: 'logout',
        })
      );
    });

    it('should include revocation reason in log', async () => {
      const sessionId = 'session-123';
      const sessionToken = createMockSessionToken({ sessionId });

      mockJwtService.verify.mockReturnValue({
        userId: 'user-123',
        email: 'user@test.com',
        role: 'admin',
        sessionId,
        expiresAt: Date.now() + 3600000,
      });

      const sessionDocRef = {
        get: jest.fn().mockResolvedValue({
          exists: true,
          data: () => ({
            sessionId,
            revoked: true,
            revokedAt: Date.now() - 1000,
            revocationReason: 'idle-timeout',
            expiresAt: Date.now() + 3600000,
            lastAccessAt: Date.now(),
          }),
        }),
      };

      mockFirestore.collection.mockReturnValue({
        doc: jest.fn().mockReturnValue(sessionDocRef),
      });

      try {
        await service.validateSessionToken(sessionToken);
      } catch (error) {
        expect(mockLogger.logSecurity).toHaveBeenCalledWith(
          'Session rejected: revoked',
          expect.objectContaining({
            reason: 'idle-timeout',
          })
        );
      }
    });
  });

  describe('Session Record Not Found (Scenario 3.4)', () => {
    it('should reject when session document does not exist', async () => {
      // Arrange: Valid JWT but no Firestore record
      const sessionId = 'non-existent-session';
      const validToken = createMockSessionToken({ sessionId });

      mockJwtService.verify.mockReturnValue({
        userId: 'user-123',
        email: 'user@test.com',
        role: 'admin',
        sessionId,
        expiresAt: Date.now() + 3600000,
      });

      const sessionDocRef = {
        get: jest.fn().mockResolvedValue({
          exists: false,
        }),
      };

      mockFirestore.collection.mockReturnValue({
        doc: jest.fn().mockReturnValue(sessionDocRef),
      });

      // Act & Assert
      await expect(service.validateSessionToken(validToken)).rejects.toThrow(
        UnauthorizedException
      );
      expect(mockLogger.logSecurity).toHaveBeenCalledWith(
        'Session rejected: record missing',
        expect.objectContaining({
          sessionId,
        })
      );
    });
  });

  describe('Session Expired in Firestore (Scenario 3.5)', () => {
    it('should reject when Firestore expiresAt is in past', async () => {
      // Arrange: Valid JWT but Firestore shows expired
      const sessionId = 'session-123';
      const validToken = createMockSessionToken({ sessionId });

      mockJwtService.verify.mockReturnValue({
        userId: 'user-123',
        email: 'user@test.com',
        role: 'admin',
        sessionId,
        expiresAt: Date.now() + 3600000, // JWT not expired yet
      });

      const sessionDocRef = {
        get: jest.fn().mockResolvedValue({
          exists: true,
          data: () => ({
            sessionId,
            revoked: false,
            expiresAt: Date.now() - 3600000, // 1 hour ago in Firestore
            lastAccessAt: Date.now() - 7200000,
          }),
        }),
      };

      mockFirestore.collection.mockReturnValue({
        doc: jest.fn().mockReturnValue(sessionDocRef),
      });

      // Act & Assert
      await expect(service.validateSessionToken(validToken)).rejects.toThrow(
        UnauthorizedException
      );
      expect(mockLogger.logSecurity).toHaveBeenCalledWith(
        'Session rejected: expired',
        expect.objectContaining({
          sessionId,
        })
      );
    });
  });

  describe('Idle Timeout Exceeded (Scenario 3.6)', () => {
    it('should revoke session when idle timeout exceeded', async () => {
      // Arrange: Session with old lastAccessAt
      const sessionId = 'session-123';
      const sessionToken = createMockSessionToken({ sessionId });
      const now = Date.now();
      const oldLastAccessAt = now - (SESSION_IDLE_TIMEOUT_SECONDS * 1000 + 1000); // Exceeded

      mockJwtService.verify.mockReturnValue({
        userId: 'user-123',
        email: 'user@test.com',
        role: 'admin',
        sessionId,
        expiresAt: now + 3600000,
      });

      const updateMock = jest.fn().mockResolvedValue(undefined);
      const sessionSnapshot = {
        exists: true,
        data: () => ({
          sessionId,
          revoked: false,
          expiresAt: now + 3600000,
          lastAccessAt: oldLastAccessAt,
        }),
        ref: {
          update: updateMock,
        },
      };

      const sessionDocRef = {
        get: jest.fn().mockResolvedValue(sessionSnapshot),
      };

      mockFirestore.collection.mockReturnValue({
        doc: jest.fn().mockReturnValue(sessionDocRef),
      });

      // Act & Assert
      await expect(service.validateSessionToken(sessionToken)).rejects.toThrow(
        UnauthorizedException
      );

      // Verify session was revoked
      expect(updateMock).toHaveBeenCalledWith({
        revoked: true,
        revokedAt: expect.any(Number),
        revocationReason: 'idle-timeout',
      });

      expect(mockLogger.logSecurity).toHaveBeenCalledWith(
        'Session revoked due to inactivity',
        expect.objectContaining({
          sessionId,
        })
      );
    });
  });

  describe('Wrong Token Audience (Scenario 3.7)', () => {
    it('should reject handshake token used as session token', async () => {
      // Arrange: Create handshake token (different audience)
      const handshakeToken = createMockSessionToken({});

      mockJwtService.verify.mockImplementation(() => {
        const error: any = new Error('jwt audience invalid');
        error.name = 'JsonWebTokenError';
        throw error;
      });

      // Act & Assert
      await expect(service.validateSessionToken(handshakeToken)).rejects.toThrow(
        UnauthorizedException
      );
      expect(mockLogger.logSecurity).toHaveBeenCalledWith(
        'Session verification failed',
        expect.objectContaining({
          reason: expect.stringContaining('audience'),
        })
      );
    });
  });

  describe('Wrong Token Issuer (Scenario 3.8)', () => {
    it('should reject token from different issuer', async () => {
      // Arrange: Create token with wrong issuer
      const wrongIssuerToken = createMockSessionToken({});

      mockJwtService.verify.mockImplementation(() => {
        const error: any = new Error('jwt issuer invalid');
        error.name = 'JsonWebTokenError';
        throw error;
      });

      // Act & Assert
      await expect(service.validateSessionToken(wrongIssuerToken)).rejects.toThrow(
        UnauthorizedException
      );
      expect(mockLogger.logSecurity).toHaveBeenCalledWith(
        'Session verification failed',
        expect.objectContaining({
          reason: expect.stringContaining('issuer'),
        })
      );
    });
  });
});

