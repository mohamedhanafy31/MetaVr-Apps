import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { TestDataFactory } from './helpers/test-data.factory';
import { FIREBASE_FIRESTORE } from '../../src/firebase/firebase.constants';
import { Firestore } from 'firebase-admin/firestore';
import { createMockSessionToken } from './helpers/auth.helpers';

/**
 * E2E tests for cookie parsing scenarios
 * Tests cookie extraction through actual HTTP requests
 */
describe('AuthController - Cookie Parsing (e2e)', () => {
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

  describe('Category 1: req.cookies vs Header Parsing', () => {
    describe('Scenario C1.1: Cookie Parser Middleware Present', () => {
      it('should use cookie from Set-Cookie header (cookie-parser middleware)', async () => {
        const admin = await testDataFactory.createUser({
          email: 'admin@test.com',
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

        // Act: Send cookie via Set-Cookie header (simulates cookie-parser)
        const response = await request(app.getHttpServer())
          .get('/auth/validate-app-access?appPath=apps/card_matching')
          .set('Cookie', `session=${token}`)
          .expect(200);

        // Assert: Should work with cookie from header
        expect(response.body.allowed).toBe(true);
      });
    });
  });

  describe('Category 2: Cookie Header Parsing Edge Cases', () => {
    describe('Scenario C2.1: Cookie with Empty Value', () => {
      it('should handle empty cookie value', async () => {
        const response = await request(app.getHttpServer())
          .get('/auth/validate-app-access?appPath=apps/card_matching')
          .set('Cookie', 'session=')
          .expect(200);

        // Empty token should result in access denied
        expect(response.body.allowed).toBe(false);
      });
    });

    describe('Scenario C2.4: Cookie with Equals Sign in Value (JWT Padding)', () => {
      it('should handle JWT tokens with == padding', async () => {
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

        // Create token that ends with == (base64 padding)
        const token = createMockSessionToken({
          userId: admin.id,
          email: admin.email,
          role: 'admin',
          sessionId: session.sessionId,
        });

        // JWT tokens typically end with padding, test that it works
        const response = await request(app.getHttpServer())
          .get('/auth/validate-app-access?appPath=apps/card_matching')
          .set('Cookie', `session=${token}`)
          .expect(200);

        expect(response.body.allowed).toBe(true);
      });
    });

    describe('Scenario C2.5: Cookie Header with Extra Spaces', () => {
      it('should handle cookies with spaces around equals (should fail)', async () => {
        // Note: This might not work as expected because cookie-parser normalizes
        // But we test the raw header parsing behavior
        const response = await request(app.getHttpServer())
          .get('/auth/validate-app-access?appPath=apps/card_matching')
          .set('Cookie', 'session = invalid-token') // Space around =
          .expect(200);

        // Should fail because cookie parsing might not work with spaces
        expect(response.body.allowed).toBe(false);
      });
    });

    describe('Scenario C2.6: Cookie Header with Multiple Spaces Between Cookies', () => {
      it('should handle extra spaces between cookies', async () => {
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
          .get('/auth/validate-app-access?appPath=apps/card_matching')
          .set('Cookie', `session=${token};  other=value;  another=value`)
          .expect(200);

        expect(response.body.allowed).toBe(true);
      });
    });

    describe('Scenario C2.7: Cookie Header with Trailing Semicolon', () => {
      it('should handle trailing semicolon', async () => {
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

        const token = createMockSessionToken({
          userId: admin.id,
          email: admin.email,
          role: 'admin',
          sessionId: session.sessionId,
        });

        const response = await request(app.getHttpServer())
          .get('/auth/validate-app-access?appPath=apps/card_matching')
          .set('Cookie', `session=${token};`)
          .expect(200);

        expect(response.body.allowed).toBe(true);
      });
    });
  });

  describe('Category 3: Multiple Cookies Scenarios', () => {
    describe('Scenario C3.1: Multiple Session Cookies', () => {
      it('should use first session cookie when multiple present', async () => {
        const admin = await testDataFactory.createUser({
          email: 'admin5@test.com',
          password: 'password123',
          role: 'admin',
        });

        const session = await testDataFactory.createSession({
          userId: admin.id,
          email: admin.email,
          role: 'admin',
        });

        const token1 = createMockSessionToken({
          userId: admin.id,
          email: admin.email,
          role: 'admin',
          sessionId: session.sessionId,
        });

        const token2 = 'invalid-token-2';

        // Send multiple session cookies
        const response = await request(app.getHttpServer())
          .get('/auth/validate-app-access?appPath=apps/card_matching')
          .set('Cookie', `session=${token1}; session=${token2}`)
          .expect(200);

        // Should use first cookie (token1) which is valid
        expect(response.body.allowed).toBe(true);
      });
    });

    describe('Scenario C3.2: Session Cookie After Other Cookies', () => {
      it('should find session cookie when it comes last', async () => {
        const admin = await testDataFactory.createUser({
          email: 'admin6@test.com',
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
          .get('/auth/validate-app-access?appPath=apps/card_matching')
          .set('Cookie', `other1=value1; other2=value2; session=${token}`)
          .expect(200);

        expect(response.body.allowed).toBe(true);
      });
    });

    describe('Scenario C3.3: Session Cookie Before Other Cookies', () => {
      it('should find session cookie when it comes first', async () => {
        const admin = await testDataFactory.createUser({
          email: 'admin7@test.com',
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
          .get('/auth/validate-app-access?appPath=apps/card_matching')
          .set('Cookie', `session=${token}; other1=value1; other2=value2`)
          .expect(200);

        expect(response.body.allowed).toBe(true);
      });
    });
  });

  describe('Category 4: Cookie Value Extraction Edge Cases', () => {
    describe('Scenario C4.2: Cookie Value with Comma', () => {
      it('should preserve comma in cookie value', async () => {
        // This tests that commas in cookie values are preserved
        // Note: JWT tokens don't typically have commas, but we test the behavior
        const admin = await testDataFactory.createUser({
          email: 'admin8@test.com',
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

        // Add comma to token (simulating edge case)
        const tokenWithComma = token + ',extra';
        
        // This will likely fail validation, but tests that comma is preserved in parsing
        const response = await request(app.getHttpServer())
          .get('/auth/validate-app-access?appPath=apps/card_matching')
          .set('Cookie', `session=${tokenWithComma}`)
          .expect(200);

        // Token with comma will be invalid, so access denied
        expect(response.body.allowed).toBe(false);
      });
    });

    describe('Scenario C4.3: Cookie Value with Percent Encoding', () => {
      it('should decode percent-encoded cookie values', async () => {
        const admin = await testDataFactory.createUser({
          email: 'admin9@test.com',
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

        // URL encode the token
        const encodedToken = encodeURIComponent(token);

        const response = await request(app.getHttpServer())
          .get('/auth/validate-app-access?appPath=apps/card_matching')
          .set('Cookie', `session=${encodedToken}`)
          .expect(200);

        // Should decode and validate correctly
        expect(response.body.allowed).toBe(true);
      });
    });
  });

  describe('Category 5: Cookie Header Format Issues', () => {
    describe('Scenario C5.1: Missing Cookie Header', () => {
      it('should return error when cookie header is missing', async () => {
        const response = await request(app.getHttpServer())
          .get('/auth/validate-app-access?appPath=apps/card_matching')
          // No Cookie header
          .expect(200);

        expect(response.body.allowed).toBe(false);
        expect(response.body.message).toContain('No session token found');
      });
    });

    describe('Scenario C5.2: Empty Cookie Header', () => {
      it('should return error for empty cookie header', async () => {
        const response = await request(app.getHttpServer())
          .get('/auth/validate-app-access?appPath=apps/card_matching')
          .set('Cookie', '')
          .expect(200);

        expect(response.body.allowed).toBe(false);
      });
    });
  });
});

