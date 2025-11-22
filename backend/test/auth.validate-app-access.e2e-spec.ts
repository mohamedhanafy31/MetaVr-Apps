import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { TestDataFactory } from './helpers/test-data.factory';
import { FIREBASE_FIRESTORE } from '../src/firebase/firebase.constants';
import { Firestore } from 'firebase-admin/firestore';
import { createMockSessionToken } from './helpers/auth.helpers';

describe('AuthController - validate-app-access (e2e)', () => {
  let app: INestApplication;
  let testDataFactory: TestDataFactory;
  let firestore: Firestore;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    firestore = moduleFixture.get<Firestore>(FIREBASE_FIRESTORE);
    testDataFactory = new TestDataFactory(firestore);
  });

  afterEach(async () => {
    await testDataFactory.cleanup();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Admin Access (Scenario 1.1, 6.1, 6.2)', () => {
    it('should allow admin to access any app', async () => {
      // Arrange: Create admin user
      const admin = await testDataFactory.createUser({
        email: 'admin@test.com',
        password: 'password123',
        role: 'admin',
      });

      // Create session
      const session = await testDataFactory.createSession({
        userId: admin.id,
        email: admin.email,
        role: 'admin',
      });

      const token = createMockSessionToken({
        userId: admin.id,
        email: admin.email,
        role: 'admin',
        sessionId: session.sessionId,
      });

      // Act: Validate app access
      const response = await request(app.getHttpServer())
        .get('/auth/validate-app-access?appPath=apps/card_matching')
        .set('Cookie', `session=${token}`)
        .expect(200);

      // Assert
      expect(response.body.success).toBe(true);
      expect(response.body.allowed).toBe(true);
      expect(response.body.role).toBe('admin');
      expect(response.body.userId).toBe(admin.id);
    });

    it('should allow admin to access multiple apps', async () => {
      const admin = await testDataFactory.createUser({
        email: 'admin2@test.com',
        password: 'password123',
        role: 'admin',
      });

      const session = await testDataFactory.createSession({
        userId: admin.id,
        email: admin.email,
        role: 'admin',
      });

      const token = createMockSessionToken({
        userId: admin.id,
        email: admin.email,
        role: 'admin',
        sessionId: session.sessionId,
      });

      // Test first app
      const response1 = await request(app.getHttpServer())
        .get('/auth/validate-app-access?appPath=apps/card_matching')
        .set('Cookie', `session=${token}`)
        .expect(200);

      expect(response1.body.allowed).toBe(true);

      // Test second app
      const response2 = await request(app.getHttpServer())
        .get('/auth/validate-app-access?appPath=apps/iq-questions')
        .set('Cookie', `session=${token}`)
        .expect(200);

      expect(response2.body.allowed).toBe(true);
    });
  });

  describe('Supervisor Access - Exact Path (Scenario 1.2)', () => {
    it('should allow supervisor to access assigned app (exact path)', async () => {
      // Arrange: Create supervisor with app assignment
      const supervisor = await testDataFactory.createUser({
        email: 'supervisor@test.com',
        password: 'password123',
        role: 'supervisor',
        assignedApplications: ['apps/card_matching'],
      });

      const session = await testDataFactory.createSession({
        userId: supervisor.id,
        email: supervisor.email,
        role: 'supervisor',
      });

      const token = createMockSessionToken({
        userId: supervisor.id,
        email: supervisor.email,
        role: 'supervisor',
        sessionId: session.sessionId,
      });

      // Act
      const response = await request(app.getHttpServer())
        .get('/auth/validate-app-access?appPath=apps/card_matching')
        .set('Cookie', `session=${token}`)
        .expect(200);

      // Assert
      expect(response.body.success).toBe(true);
      expect(response.body.allowed).toBe(true);
      expect(response.body.role).toBe('supervisor');
    });
  });

  describe('Supervisor Access - Slug Match (Scenario 1.3)', () => {
    it('should allow supervisor to access assigned app (slug match)', async () => {
      const supervisor = await testDataFactory.createUser({
        email: 'supervisor2@test.com',
        password: 'password123',
        role: 'supervisor',
        assignedApplications: ['card_matching'], // Slug only
      });

      const session = await testDataFactory.createSession({
        userId: supervisor.id,
        email: supervisor.email,
        role: 'supervisor',
      });

      const token = createMockSessionToken({
        userId: supervisor.id,
        email: supervisor.email,
        role: 'supervisor',
        sessionId: session.sessionId,
      });

      const response = await request(app.getHttpServer())
        .get('/auth/validate-app-access?appPath=apps/card_matching')
        .set('Cookie', `session=${token}`)
        .expect(200);

      expect(response.body.allowed).toBe(true);
    });
  });

  describe('Supervisor Access - App ID Match (Scenario 1.4)', () => {
    it('should allow supervisor to access assigned app (app ID match)', async () => {
      // Create application first
      const testApp = await testDataFactory.createApplication({
        name: 'Card Matching',
        path: 'apps/card_matching',
      });

      const supervisor = await testDataFactory.createUser({
        email: 'supervisor3@test.com',
        password: 'password123',
        role: 'supervisor',
        assignedApplications: [testApp.id], // App document ID
      });

      const session = await testDataFactory.createSession({
        userId: supervisor.id,
        email: supervisor.email,
        role: 'supervisor',
      });

      const token = createMockSessionToken({
        userId: supervisor.id,
        email: supervisor.email,
        role: 'supervisor',
        sessionId: session.sessionId,
      });

      const response = await request(app.getHttpServer())
        .get('/auth/validate-app-access?appPath=apps/card_matching')
        .set('Cookie', `session=${token}`)
        .expect(200);

      expect(response.body.allowed).toBe(true);
    });
  });

  describe('Access Denied - No Session Cookie (Scenario 2.1)', () => {
    it('should return error when no session cookie', async () => {
      const response = await request(app.getHttpServer())
        .get('/auth/validate-app-access?appPath=apps/card_matching')
        .expect(200);

      expect(response.body.success).toBe(false);
      expect(response.body.allowed).toBe(false);
      expect(response.body.message).toContain('No session token found');
    });
  });

  describe('Access Denied - Supervisor Unassigned App (Scenario 2.2)', () => {
    it('should deny access when app not in assignedApplications', async () => {
      const supervisor = await testDataFactory.createUser({
        email: 'supervisor4@test.com',
        password: 'password123',
        role: 'supervisor',
        assignedApplications: ['apps/iq-questions'], // Different app
      });

      const session = await testDataFactory.createSession({
        userId: supervisor.id,
        email: supervisor.email,
        role: 'supervisor',
      });

      const token = createMockSessionToken({
        userId: supervisor.id,
        email: supervisor.email,
        role: 'supervisor',
        sessionId: session.sessionId,
      });

      const response = await request(app.getHttpServer())
        .get('/auth/validate-app-access?appPath=apps/card_matching')
        .set('Cookie', `session=${token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.allowed).toBe(false);
    });
  });

  describe('Access Denied - Empty Assigned Applications (Scenario 2.3)', () => {
    it('should deny access when assignedApplications is empty', async () => {
      const supervisor = await testDataFactory.createUser({
        email: 'supervisor5@test.com',
        password: 'password123',
        role: 'supervisor',
        assignedApplications: [], // Empty array
      });

      const session = await testDataFactory.createSession({
        userId: supervisor.id,
        email: supervisor.email,
        role: 'supervisor',
      });

      const token = createMockSessionToken({
        userId: supervisor.id,
        email: supervisor.email,
        role: 'supervisor',
        sessionId: session.sessionId,
      });

      const response = await request(app.getHttpServer())
        .get('/auth/validate-app-access?appPath=apps/card_matching')
        .set('Cookie', `session=${token}`)
        .expect(200);

      expect(response.body.allowed).toBe(false);
    });
  });

  describe('Access Denied - Missing appPath (Scenario 2.5)', () => {
    it('should return error when appPath is missing', async () => {
      const admin = await testDataFactory.createUser({
        email: 'admin3@test.com',
        password: 'password123',
        role: 'admin',
      });

      const session = await testDataFactory.createSession({
        userId: admin.id,
        email: admin.email,
        role: 'admin',
      });

      const token = createMockSessionToken({
        userId: admin.id,
        email: admin.email,
        role: 'admin',
        sessionId: session.sessionId,
      });

      const response = await request(app.getHttpServer())
        .get('/auth/validate-app-access') // No appPath parameter
        .set('Cookie', `session=${token}`)
        .expect(200);

      expect(response.body.success).toBe(false);
      expect(response.body.allowed).toBe(false);
      expect(response.body.message).toContain('appPath');
    });
  });

  // Roles outside admin/supervisor are no longer issued, so additional invalid-role coverage is unnecessary.

  describe('Session Validation Failures', () => {
    it('should reject invalid session token (Scenario 3.1)', async () => {
      const response = await request(app.getHttpServer())
        .get('/auth/validate-app-access?appPath=apps/card_matching')
        .set('Cookie', 'session=invalid.jwt.token')
        .expect(200);

      expect(response.body.allowed).toBe(false);
    });

    it('should reject expired session token (Scenario 3.2)', async () => {
      const expiredToken = createMockSessionToken({
        expiresAt: Date.now() - 3600000, // 1 hour ago
      });

      const response = await request(app.getHttpServer())
        .get('/auth/validate-app-access?appPath=apps/card_matching')
        .set('Cookie', `session=${expiredToken}`)
        .expect(200);

      expect(response.body.allowed).toBe(false);
    });

    it('should reject revoked session (Scenario 3.3)', async () => {
      const admin = await testDataFactory.createUser({
        email: 'admin4@test.com',
        password: 'password123',
        role: 'admin',
      });

      const session = await testDataFactory.createSession({
        userId: admin.id,
        email: admin.email,
        role: 'admin',
      });

      // Revoke the session
      await testDataFactory.revokeSession(session.sessionId, 'test-revocation');

      const token = createMockSessionToken({
        userId: admin.id,
        email: admin.email,
        role: 'admin',
        sessionId: session.sessionId,
      });

      const response = await request(app.getHttpServer())
        .get('/auth/validate-app-access?appPath=apps/card_matching')
        .set('Cookie', `session=${token}`)
        .expect(200);

      expect(response.body.allowed).toBe(false);
    });
  });
});

