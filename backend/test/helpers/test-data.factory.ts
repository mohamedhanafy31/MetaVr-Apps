import { Firestore } from 'firebase-admin/firestore';
import { UserRole } from '../../src/auth/types/session.types';
import { randomUUID } from 'crypto';
import * as bcrypt from 'bcryptjs';

export interface TestUser {
  id: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  status: 'active' | 'suspended' | 'inactive';
  assignedApplications?: string[];
  createdAt: Date;
}

export interface TestSession {
  sessionId: string;
  userId: string;
  email: string;
  role: UserRole;
  rememberMe: boolean;
  expiresAt: number;
  revoked: boolean;
  lastAccessAt: number;
  createdAt: number;
}

export class TestDataFactory {
  private createdUsers: string[] = [];
  private createdSessions: string[] = [];
  private createdApplications: string[] = [];

  constructor(private firestore: Firestore) {}

  /**
   * Creates a test user in Firestore
   */
  async createUser(overrides: {
    email?: string;
    password?: string;
    passwordHash?: string;
    role?: UserRole;
    status?: 'active' | 'suspended' | 'inactive';
    assignedApplications?: string[];
  } = {}): Promise<TestUser> {
    const passwordHash = overrides.passwordHash || 
      (overrides.password ? await bcrypt.hash(overrides.password, 10) : await bcrypt.hash('password123', 10));

    const user = {
      email: overrides.email || `test-${randomUUID()}@test.com`,
      passwordHash,
      role: overrides.role || 'admin',
      status: overrides.status || 'active',
      assignedApplications: overrides.assignedApplications || [],
      createdAt: new Date(),
    };

    const docRef = await this.firestore.collection('users').add(user);
    this.createdUsers.push(docRef.id);

    return { id: docRef.id, ...user };
  }

  /**
   * Creates a test session in Firestore
   */
  async createSession(overrides: {
    userId?: string;
    email?: string;
    role?: UserRole;
    sessionId?: string;
    expiresAt?: number;
    revoked?: boolean;
    lastAccessAt?: number;
    rememberMe?: boolean;
  } = {}): Promise<TestSession> {
    const sessionId = overrides.sessionId || randomUUID();
    const now = Date.now();
    
    const session: TestSession = {
      sessionId,
      userId: overrides.userId || 'user-123',
      email: overrides.email || 'user@test.com',
      role: overrides.role || 'admin',
      rememberMe: overrides.rememberMe || false,
      expiresAt: overrides.expiresAt || now + 12 * 60 * 60 * 1000, // 12 hours
      revoked: overrides.revoked || false,
      lastAccessAt: overrides.lastAccessAt || now,
      createdAt: now,
    };

    await this.firestore.collection('sessions').doc(sessionId).set(session);
    this.createdSessions.push(sessionId);

    return session;
  }

  /**
   * Creates a test application in Firestore
   */
  async createApplication(overrides: {
    name?: string;
    path?: string;
    platform?: 'web' | 'desktop' | 'mobile';
  } = {}) {
    const app = {
      name: overrides.name || 'Test App',
      path: overrides.path || 'apps/test-app',
      platform: overrides.platform || 'web',
      status: 'active',
      authRequired: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const docRef = await this.firestore.collection('applications').add(app);
    this.createdApplications.push(docRef.id);

    return { id: docRef.id, ...app };
  }

  /**
   * Revokes a session
   */
  async revokeSession(sessionId: string, reason: string = 'test-revocation') {
    await this.firestore.collection('sessions').doc(sessionId).update({
      revoked: true,
      revokedAt: Date.now(),
      revocationReason: reason,
    });
  }

  /**
   * Updates user role
   */
  async updateUserRole(userId: string, role: UserRole) {
    await this.firestore.collection('users').doc(userId).update({ role });
  }

  /**
   * Updates user assigned applications
   */
  async updateUserAssignedApps(userId: string, assignedApplications: string[]) {
    await this.firestore.collection('users').doc(userId).update({ assignedApplications });
  }

  /**
   * Cleans up all created test data
   */
  async cleanup() {
    // Delete created users
    for (const userId of this.createdUsers) {
      try {
        await this.firestore.collection('users').doc(userId).delete();
      } catch (error) {
        // Ignore errors
      }
    }

    // Delete created sessions
    for (const sessionId of this.createdSessions) {
      try {
        await this.firestore.collection('sessions').doc(sessionId).delete();
      } catch (error) {
        // Ignore errors
      }
    }

    // Delete created applications
    for (const appId of this.createdApplications) {
      try {
        await this.firestore.collection('applications').doc(appId).delete();
      } catch (error) {
        // Ignore errors
      }
    }

    this.createdUsers = [];
    this.createdSessions = [];
    this.createdApplications = [];
  }
}

