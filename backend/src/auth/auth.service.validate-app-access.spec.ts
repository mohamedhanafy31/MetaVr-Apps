import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AppLoggerService } from '../logger/logger.service';
import { FIREBASE_FIRESTORE } from '../firebase/firebase.constants';
import { UserRole } from './types/session.types';
import {
  createMockSessionToken,
  createMockFirestore,
  createMockLogger,
} from '../../test/helpers/auth.helpers';

describe('AuthService - validateAppAccess', () => {
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

  describe('Admin Access', () => {
    it('should grant access to admin for any app (Scenario 1.1)', async () => {
      // Arrange
      const adminToken = createMockSessionToken({ role: 'admin' });
      const appPath = 'apps/iq-questions';

      mockJwtService.verify.mockReturnValue({
        userId: 'admin-123',
        email: 'admin@test.com',
        role: 'admin',
        sessionId: 'session-123',
        expiresAt: Date.now() + 3600000,
      });

      // Mock session validation
      mockFirestore.collection.mockReturnValue({
        doc: jest.fn().mockReturnValue({
          get: jest.fn().mockResolvedValue({
            exists: true,
            data: () => ({
              sessionId: 'session-123',
              revoked: false,
              expiresAt: Date.now() + 3600000,
              lastAccessAt: Date.now(),
            }),
            ref: {
              update: jest.fn().mockResolvedValue(undefined),
            },
          }),
        }),
      });

      // Act
      const result = await service.validateAppAccess(adminToken, appPath);

      // Assert
      expect(result.allowed).toBe(true);
      expect(result.role).toBe('admin');
      expect(result.userId).toBe('admin-123');
      // Admin should not query users collection
      expect(mockFirestore.collection).not.toHaveBeenCalledWith('users');
    });

    it('should grant access to admin for different apps (Scenario 6.1, 6.2)', async () => {
      const adminToken = createMockSessionToken({ role: 'admin' });

      mockJwtService.verify.mockReturnValue({
        userId: 'admin-123',
        email: 'admin@test.com',
        role: 'admin',
        sessionId: 'session-123',
        expiresAt: Date.now() + 3600000,
      });

      mockFirestore.collection.mockReturnValue({
        doc: jest.fn().mockReturnValue({
          get: jest.fn().mockResolvedValue({
            exists: true,
            data: () => ({
              sessionId: 'session-123',
              revoked: false,
              expiresAt: Date.now() + 3600000,
              lastAccessAt: Date.now(),
            }),
            ref: {
              update: jest.fn().mockResolvedValue(undefined),
            },
          }),
        }),
      });

      // Test first app
      const result1 = await service.validateAppAccess(adminToken, 'apps/card_matching');
      expect(result1.allowed).toBe(true);

      // Test second app
      const result2 = await service.validateAppAccess(adminToken, 'apps/iq-questions');
      expect(result2.allowed).toBe(true);
    });
  });

  describe('Supervisor Access - Exact Path Match (Scenario 1.2)', () => {
    it('should grant access when assignedApplications contains exact path', async () => {
      // Arrange
      const supervisorToken = createMockSessionToken({
        role: 'supervisor',
        userId: 'supervisor-123',
      });
      const appPath = 'apps/card_matching';

      mockJwtService.verify.mockReturnValue({
        userId: 'supervisor-123',
        email: 'supervisor@test.com',
        role: 'supervisor',
        sessionId: 'session-123',
        expiresAt: Date.now() + 3600000,
      });

      // Mock session validation
      const sessionDocRef = {
        update: jest.fn().mockResolvedValue(undefined),
        get: jest.fn().mockResolvedValue({
          exists: true,
          data: () => ({
            sessionId: 'session-123',
            revoked: false,
            expiresAt: Date.now() + 3600000,
            lastAccessAt: Date.now(),
          }),
          ref: {
            update: jest.fn().mockResolvedValue(undefined),
          },
        }),
      };

      // Mock user document
      const userDocRef = {
        get: jest.fn().mockResolvedValue({
          exists: true,
          data: () => ({
            assignedApplications: ['apps/card_matching', 'apps/iq-questions'],
          }),
        }),
      };

      const sessionCollection = {
        doc: jest.fn().mockReturnValue(sessionDocRef),
      };

      const userCollection = {
        doc: jest.fn().mockReturnValue(userDocRef),
      };

      mockFirestore.collection
        .mockReturnValueOnce(sessionCollection) // First call: sessions
        .mockReturnValueOnce(userCollection); // Second call: users

      // Act
      const result = await service.validateAppAccess(supervisorToken, appPath);

      // Assert
      expect(result.allowed).toBe(true);
      expect(result.role).toBe('supervisor');
      expect(mockFirestore.collection).toHaveBeenCalledWith('users');
    });
  });

  describe('Supervisor Access - Slug Match (Scenario 1.3)', () => {
    it('should grant access when assignedApplications contains slug', async () => {
      const supervisorToken = createMockSessionToken({
        role: 'supervisor',
        userId: 'supervisor-123',
      });

      mockJwtService.verify.mockReturnValue({
        userId: 'supervisor-123',
        email: 'supervisor@test.com',
        role: 'supervisor',
        sessionId: 'session-123',
        expiresAt: Date.now() + 3600000,
      });

      const sessionDocRef = {
        update: jest.fn().mockResolvedValue(undefined),
        get: jest.fn().mockResolvedValue({
          exists: true,
          data: () => ({
            sessionId: 'session-123',
            revoked: false,
            expiresAt: Date.now() + 3600000,
            lastAccessAt: Date.now(),
          }),
          ref: {
            update: jest.fn().mockResolvedValue(undefined),
          },
        }),
      };

      const userDocRef = {
        get: jest.fn().mockResolvedValue({
          exists: true,
          data: () => ({
            assignedApplications: ['card_matching'], // Slug only
          }),
        }),
      };

      const sessionCollection = {
        doc: jest.fn().mockReturnValue(sessionDocRef),
      };

      const userCollection = {
        doc: jest.fn().mockReturnValue(userDocRef),
      };

      mockFirestore.collection
        .mockReturnValueOnce(sessionCollection)
        .mockReturnValueOnce(userCollection);

      const result = await service.validateAppAccess(
        supervisorToken,
        'apps/card_matching'
      );

      expect(result.allowed).toBe(true);
    });
  });

  describe('Supervisor Access - App ID Match (Scenario 1.4)', () => {
    it('should grant access when assignedApplications contains app document ID', async () => {
      const supervisorToken = createMockSessionToken({
        role: 'supervisor',
        userId: 'supervisor-123',
      });
      const appPath = 'apps/card_matching';
      const appDocId = 'app-doc-id-123';

      mockJwtService.verify.mockReturnValue({
        userId: 'supervisor-123',
        email: 'supervisor@test.com',
        role: 'supervisor',
        sessionId: 'session-123',
        expiresAt: Date.now() + 3600000,
      });

      const sessionDocRef = {
        update: jest.fn().mockResolvedValue(undefined),
        get: jest.fn().mockResolvedValue({
          exists: true,
          data: () => ({
            sessionId: 'session-123',
            revoked: false,
            expiresAt: Date.now() + 3600000,
            lastAccessAt: Date.now(),
          }),
          ref: {
            update: jest.fn().mockResolvedValue(undefined),
          },
        }),
      };

      const userDocRef = {
        get: jest.fn().mockResolvedValue({
          exists: true,
          data: () => ({
            assignedApplications: [appDocId], // App ID
          }),
        }),
      };

      const appsQuery = {
        empty: false,
        docs: [
          {
            id: appDocId,
            data: () => ({ path: appPath }),
          },
        ],
      };

      const sessionCollection = {
        doc: jest.fn().mockReturnValue(sessionDocRef),
      };

      const userCollection = {
        doc: jest.fn().mockReturnValue(userDocRef),
      };

      const appsCollection = {
        where: jest.fn().mockReturnValue({
          limit: jest.fn().mockReturnValue({
            get: jest.fn().mockResolvedValue(appsQuery),
          }),
        }),
      };

      mockFirestore.collection
        .mockReturnValueOnce(sessionCollection)
        .mockReturnValueOnce(userCollection)
        .mockReturnValueOnce(appsCollection);

      const result = await service.validateAppAccess(supervisorToken, appPath);

      expect(result.allowed).toBe(true);
      expect(mockFirestore.collection).toHaveBeenCalledWith('applications');
    });
  });

  describe('Access Denied - Supervisor Unassigned App (Scenario 2.2)', () => {
    it('should deny access when app not in assignedApplications', async () => {
      const supervisorToken = createMockSessionToken({
        role: 'supervisor',
        userId: 'supervisor-123',
      });

      mockJwtService.verify.mockReturnValue({
        userId: 'supervisor-123',
        email: 'supervisor@test.com',
        role: 'supervisor',
        sessionId: 'session-123',
        expiresAt: Date.now() + 3600000,
      });

      const sessionDocRef = {
        update: jest.fn().mockResolvedValue(undefined),
        get: jest.fn().mockResolvedValue({
          exists: true,
          data: () => ({
            sessionId: 'session-123',
            revoked: false,
            expiresAt: Date.now() + 3600000,
            lastAccessAt: Date.now(),
          }),
        }),
      };

      const userDocRef = {
        get: jest.fn().mockResolvedValue({
          exists: true,
          data: () => ({
            assignedApplications: ['apps/iq-questions'], // Different app
          }),
        }),
      };

      const appsQuery = {
        empty: true,
        docs: [],
      };

      const appsCollection = {
        where: jest.fn().mockReturnValue({
          limit: jest.fn().mockReturnValue({
            get: jest.fn().mockResolvedValue(appsQuery),
          }),
        }),
      };

      mockFirestore.collection
        .mockReturnValueOnce({
          doc: jest.fn().mockReturnValue(sessionDocRef),
        })
        .mockReturnValueOnce({
          doc: jest.fn().mockReturnValue(userDocRef),
        })
        .mockReturnValueOnce(appsCollection);

      const result = await service.validateAppAccess(
        supervisorToken,
        'apps/card_matching'
      );

      expect(result.allowed).toBe(false);
      expect(result.role).toBeUndefined();
    });
  });

  describe('Access Denied - Empty Assigned Applications (Scenario 2.3)', () => {
    it('should deny access when assignedApplications is empty array', async () => {
      const supervisorToken = createMockSessionToken({
        role: 'supervisor',
        userId: 'supervisor-123',
      });

      mockJwtService.verify.mockReturnValue({
        userId: 'supervisor-123',
        email: 'supervisor@test.com',
        role: 'supervisor',
        sessionId: 'session-123',
        expiresAt: Date.now() + 3600000,
      });

      const sessionDocRef = {
        update: jest.fn().mockResolvedValue(undefined),
        get: jest.fn().mockResolvedValue({
          exists: true,
          data: () => ({
            sessionId: 'session-123',
            revoked: false,
            expiresAt: Date.now() + 3600000,
            lastAccessAt: Date.now(),
          }),
        }),
      };

      const userDocRef = {
        get: jest.fn().mockResolvedValue({
          exists: true,
          data: () => ({
            assignedApplications: [], // Empty array
          }),
        }),
      };

      mockFirestore.collection
        .mockReturnValueOnce({
          doc: jest.fn().mockReturnValue(sessionDocRef),
        })
        .mockReturnValueOnce({
          doc: jest.fn().mockReturnValue(userDocRef),
        });

      const result = await service.validateAppAccess(
        supervisorToken,
        'apps/card_matching'
      );

      expect(result.allowed).toBe(false);
    });
  });

  describe('Access Denied - Supervisor Document Not Found (Scenario 2.4)', () => {
    it('should deny access when supervisor document does not exist', async () => {
      const supervisorToken = createMockSessionToken({
        role: 'supervisor',
        userId: 'supervisor-123',
      });

      mockJwtService.verify.mockReturnValue({
        userId: 'supervisor-123',
        email: 'supervisor@test.com',
        role: 'supervisor',
        sessionId: 'session-123',
        expiresAt: Date.now() + 3600000,
      });

      const sessionDocRef = {
        update: jest.fn().mockResolvedValue(undefined),
        get: jest.fn().mockResolvedValue({
          exists: true,
          data: () => ({
            sessionId: 'session-123',
            revoked: false,
            expiresAt: Date.now() + 3600000,
            lastAccessAt: Date.now(),
          }),
        }),
      };

      const userDocRef = {
        get: jest.fn().mockResolvedValue({
          exists: false, // Document doesn't exist
        }),
      };

      mockFirestore.collection
        .mockReturnValueOnce({
          doc: jest.fn().mockReturnValue(sessionDocRef),
        })
        .mockReturnValueOnce({
          doc: jest.fn().mockReturnValue(userDocRef),
        });

      const result = await service.validateAppAccess(
        supervisorToken,
        'apps/card_matching'
      );

      expect(result.allowed).toBe(false);
    });
  });

  // Roles outside admin/supervisor are no longer valid, so no additional role checks are required.

  describe('Edge Cases - Null/Undefined assignedApplications (Scenario 5.9, 5.10)', () => {
    it('should handle null assignedApplications', async () => {
      const supervisorToken = createMockSessionToken({
        role: 'supervisor',
        userId: 'supervisor-123',
      });

      mockJwtService.verify.mockReturnValue({
        userId: 'supervisor-123',
        email: 'supervisor@test.com',
        role: 'supervisor',
        sessionId: 'session-123',
        expiresAt: Date.now() + 3600000,
      });

      const sessionDocRef = {
        update: jest.fn().mockResolvedValue(undefined),
        get: jest.fn().mockResolvedValue({
          exists: true,
          data: () => ({
            sessionId: 'session-123',
            revoked: false,
            expiresAt: Date.now() + 3600000,
            lastAccessAt: Date.now(),
          }),
        }),
      };

      const userDocRef = {
        get: jest.fn().mockResolvedValue({
          exists: true,
          data: () => ({
            assignedApplications: null,
          }),
        }),
      };

      mockFirestore.collection
        .mockReturnValueOnce({
          doc: jest.fn().mockReturnValue(sessionDocRef),
        })
        .mockReturnValueOnce({
          doc: jest.fn().mockReturnValue(userDocRef),
        });

      const result = await service.validateAppAccess(
        supervisorToken,
        'apps/card_matching'
      );

      expect(result.allowed).toBe(false);
    });

    it('should handle undefined assignedApplications', async () => {
      const supervisorToken = createMockSessionToken({
        role: 'supervisor',
        userId: 'supervisor-123',
      });

      mockJwtService.verify.mockReturnValue({
        userId: 'supervisor-123',
        email: 'supervisor@test.com',
        role: 'supervisor',
        sessionId: 'session-123',
        expiresAt: Date.now() + 3600000,
      });

      const sessionDocRef = {
        update: jest.fn().mockResolvedValue(undefined),
        get: jest.fn().mockResolvedValue({
          exists: true,
          data: () => ({
            sessionId: 'session-123',
            revoked: false,
            expiresAt: Date.now() + 3600000,
            lastAccessAt: Date.now(),
          }),
        }),
      };

      const userDocRef = {
        get: jest.fn().mockResolvedValue({
          exists: true,
          data: () => ({}), // No assignedApplications field
        }),
      };

      mockFirestore.collection
        .mockReturnValueOnce({
          doc: jest.fn().mockReturnValue(sessionDocRef),
        })
        .mockReturnValueOnce({
          doc: jest.fn().mockReturnValue(userDocRef),
        });

      const result = await service.validateAppAccess(
        supervisorToken,
        'apps/card_matching'
      );

      expect(result.allowed).toBe(false);
    });
  });

  describe('Edge Cases - Case Sensitivity (Scenario 5.11)', () => {
    it('should be case-sensitive in matching', async () => {
      const supervisorToken = createMockSessionToken({
        role: 'supervisor',
        userId: 'supervisor-123',
      });

      mockJwtService.verify.mockReturnValue({
        userId: 'supervisor-123',
        email: 'supervisor@test.com',
        role: 'supervisor',
        sessionId: 'session-123',
        expiresAt: Date.now() + 3600000,
      });

      const sessionDocRef = {
        update: jest.fn().mockResolvedValue(undefined),
        get: jest.fn().mockResolvedValue({
          exists: true,
          data: () => ({
            sessionId: 'session-123',
            revoked: false,
            expiresAt: Date.now() + 3600000,
            lastAccessAt: Date.now(),
          }),
        }),
      };

      const userDocRef = {
        get: jest.fn().mockResolvedValue({
          exists: true,
          data: () => ({
            assignedApplications: ['apps/card_matching'], // lowercase
          }),
        }),
      };

      mockFirestore.collection
        .mockReturnValueOnce({
          doc: jest.fn().mockReturnValue(sessionDocRef),
        })
        .mockReturnValueOnce({
          doc: jest.fn().mockReturnValue(userDocRef),
        });

      // Request with different case
      const result = await service.validateAppAccess(
        supervisorToken,
        'Apps/Card_Matching' // Different case
      );

      expect(result.allowed).toBe(false);
    });
  });

  describe('Edge Cases - Trailing Slash (Scenario 5.12)', () => {
    it('should not match path with trailing slash', async () => {
      const supervisorToken = createMockSessionToken({
        role: 'supervisor',
        userId: 'supervisor-123',
      });

      mockJwtService.verify.mockReturnValue({
        userId: 'supervisor-123',
        email: 'supervisor@test.com',
        role: 'supervisor',
        sessionId: 'session-123',
        expiresAt: Date.now() + 3600000,
      });

      const sessionDocRef = {
        update: jest.fn().mockResolvedValue(undefined),
        get: jest.fn().mockResolvedValue({
          exists: true,
          data: () => ({
            sessionId: 'session-123',
            revoked: false,
            expiresAt: Date.now() + 3600000,
            lastAccessAt: Date.now(),
          }),
        }),
      };

      const userDocRef = {
        get: jest.fn().mockResolvedValue({
          exists: true,
          data: () => ({
            assignedApplications: ['apps/card_matching'], // No trailing slash
          }),
        }),
      };

      mockFirestore.collection
        .mockReturnValueOnce({
          doc: jest.fn().mockReturnValue(sessionDocRef),
        })
        .mockReturnValueOnce({
          doc: jest.fn().mockReturnValue(userDocRef),
        });

      // Request with trailing slash
      const result = await service.validateAppAccess(
        supervisorToken,
        'apps/card_matching/' // Trailing slash
      );

      expect(result.allowed).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('should return allowed: false on error (fail-secure)', async () => {
      const token = createMockSessionToken();

      // Mock JWT verification to throw error
      mockJwtService.verify.mockImplementation(() => {
        throw new Error('JWT verification failed');
      });

      const result = await service.validateAppAccess(token, 'apps/card_matching');

      expect(result.allowed).toBe(false);
      expect(mockLogger.logSecurity).toHaveBeenCalled();
    });
  });
});

