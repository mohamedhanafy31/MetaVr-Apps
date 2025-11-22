import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
  NotFoundException,
} from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Firestore } from 'firebase-admin/firestore';
import * as bcrypt from 'bcryptjs';
import { Request, Response } from 'express';
import { randomUUID } from 'crypto';
import {
  DEFAULT_HANDSHAKE_TTL_SECONDS,
  DEFAULT_SESSION_EXPIRY_SECONDS,
  DEFAULT_TOKEN_ISSUER,
  HANDSHAKE_COOKIE_NAME,
  HANDSHAKE_TOKEN_AUDIENCE,
  REMEMBER_ME_EXPIRY_SECONDS,
  SESSION_COOKIE_NAME,
  SESSION_IDLE_TIMEOUT_SECONDS,
  SESSION_TOKEN_AUDIENCE,
} from './auth.constants';
import { FIREBASE_FIRESTORE } from '../firebase/firebase.constants';
import { HandshakePayload, SessionPayload, UserRole } from './types/session.types';
import { LoginDto } from './dto/login.dto';
import { AppLoggerService } from '../logger/logger.service';
import { EmailService } from '../email/email.service';

interface UserDocument {
  email: string;
  passwordHash: string;
  role: UserRole;
  status: 'active' | 'suspended' | 'inactive';
}

interface SessionRecord {
  sessionId: string;
  userId: string;
  email: string;
  role: UserRole;
  rememberMe: boolean;
  expiresAt: number;
  revoked: boolean;
  revokedAt?: number;
  revocationReason?: string;
  lastAccessAt: number;
  createdAt: number;
}

interface HandshakeRecord {
  handshakeId: string;
  userId: string;
  rememberMe: boolean;
  expiresAt: number;
  used: boolean;
  createdAt: number;
  usedAt?: number;
}

export interface AppAssignmentInput {
  appId: string;
  appKey: string;
  appName?: string;
  appPath?: string | null;
}

interface StoredAccessCode {
  code: string;
  appId?: string;
  appKey: string;
  appName?: string;
  appPath?: string | null;
  createdAt: number;
  updatedAt: number;
}

type SupervisorAccessCodes = Record<string, StoredAccessCode>;

@Injectable()
export class AuthService {
  private readonly tokenIssuer: string;
  private readonly sessionAudience: string;
  private readonly handshakeAudience: string;
  private readonly sessionCollectionName = 'sessions';
  private readonly handshakeCollectionName = 'handshakeTokens';

  constructor(
    @Inject(FIREBASE_FIRESTORE) private readonly firestore: Firestore,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly logger: AppLoggerService,
    private readonly emailService: EmailService,
  ) {
    this.tokenIssuer = this.configService.get<string>('SESSION_TOKEN_ISSUER', DEFAULT_TOKEN_ISSUER);
    this.sessionAudience = this.configService.get<string>('SESSION_TOKEN_AUDIENCE', SESSION_TOKEN_AUDIENCE);
    this.handshakeAudience = this.configService.get<string>(
      'HANDSHAKE_TOKEN_AUDIENCE',
      HANDSHAKE_TOKEN_AUDIENCE,
    );
  }

  async login(dto: LoginDto, res: Response): Promise<{ role: UserRole }> {
    const { email, password, rememberMe } = dto;
    const userDoc = await this.findUserByEmail(email);

    if (!userDoc) {
      this.logger.logSecurity('Login failed: unknown email', { email });
      throw new UnauthorizedException('Invalid credentials');
    }

    const data = userDoc.data() as UserDocument;

    const isValidPassword = await bcrypt.compare(password, data.passwordHash);
    if (!isValidPassword) {
      this.logger.logSecurity('Login failed: invalid password', { email });
      throw new UnauthorizedException('Invalid credentials');
    }

    if (data.status !== 'active') {
      this.logger.logSecurity('Login blocked: account not active', {
        email,
        status: data.status,
      });
      throw new UnauthorizedException('Account is suspended or inactive');
    }

    await userDoc.ref.update({ lastLoginAt: new Date() });

    const handshakePayload: HandshakePayload = {
      userId: userDoc.id,
      email: data.email,
      role: data.role,
      rememberMe,
      handshakeId: randomUUID(),
    };

    const handshakeToken = this.createHandshakeToken(handshakePayload);
    await this.persistHandshakeRecord(handshakePayload, DEFAULT_HANDSHAKE_TTL_SECONDS);
    this.attachHandshakeCookie(res, handshakeToken);
    this.logger.log('Handshake issued', 'AuthService', {
      email: data.email,
      role: data.role,
      userId: userDoc.id,
      rememberMe,
    });

    return { role: data.role };
  }

  async handleHandshake(
    suppliedToken: string | undefined,
    req: Request,
    res: Response,
  ): Promise<{ role: UserRole; redirectTo: string }> {
    const token = suppliedToken || this.getCookie(req, HANDSHAKE_COOKIE_NAME);
    if (!token) {
      this.logger.logSecurity('Handshake blocked: missing token source', {
        path: req.originalUrl,
      });
      throw new BadRequestException('Handshake token missing');
    }

    const claims = this.verifyHandshakeToken(token);

    if (!claims) {
      this.clearHandshakeCookie(res);
      throw new BadRequestException('Invalid or expired handshake token');
    }

    await this.consumeHandshake(claims.handshakeId);
    this.clearHandshakeCookie(res);
    await this.setSessionCookie(res, claims);

    const redirectTo = claims.role === 'supervisor' ? '/supervisor/dashboard' : '/admin/dashboard';
    this.logger.log('Session created', 'AuthService', {
      email: claims.email,
      role: claims.role,
      userId: claims.userId,
      redirectTo,
    });

    return { role: claims.role, redirectTo };
  }

  async logout(req: Request, res: Response): Promise<void> {
    const sessionToken = this.getCookie(req, SESSION_COOKIE_NAME);
    if (sessionToken) {
      const payload = this.verifySessionToken(sessionToken);
      if (payload) {
        await this.revokeSession(payload.sessionId, 'logout');
      }
    }
    this.clearSessionCookie(res);
  }

  async validateSessionToken(token: string): Promise<SessionPayload> {
    const payload = this.verifySessionToken(token);
    if (!payload) {
      this.logger.logSecurity('Session rejected: signature validation failed');
      throw new UnauthorizedException('Invalid session token');
    }

    await this.ensureSessionActive(payload);
    return payload;
  }

  private async findUserByEmail(email: string) {
    const usersRef = this.firestore.collection('users');

    // Prefer supervisor or admin accounts when multiple roles share the same email
    const supervisorSnapshot = await usersRef
      .where('email', '==', email)
      .where('role', '==', 'supervisor')
      .limit(1)
      .get();

    if (!supervisorSnapshot.empty) {
      return supervisorSnapshot.docs[0];
    }

    const adminSnapshot = await usersRef
      .where('email', '==', email)
      .where('role', '==', 'admin')
      .limit(1)
      .get();

    if (!adminSnapshot.empty) {
      return adminSnapshot.docs[0];
    }

    // Fallback: any user with this email (e.g., role 'user')
    const snapshot = await usersRef.where('email', '==', email).limit(1).get();
    return snapshot.empty ? null : snapshot.docs[0];
  }

  private createHandshakeToken(
    payload: HandshakePayload,
    ttlSeconds: number = DEFAULT_HANDSHAKE_TTL_SECONDS,
  ): string {
    return this.jwtService.sign(payload, {
      expiresIn: ttlSeconds,
      issuer: this.tokenIssuer,
      audience: this.handshakeAudience,
      subject: payload.userId,
      jwtid: payload.handshakeId,
    });
  }

  private verifyHandshakeToken(token: string): HandshakePayload | null {
    try {
      return this.jwtService.verify<HandshakePayload>(token, {
        issuer: this.tokenIssuer,
        audience: this.handshakeAudience,
      });
    } catch (error) {
      this.logger.logSecurity('Handshake verification failed', {
        reason: error instanceof Error ? error.message : 'unknown',
      });
      return null;
    }
  }

  private verifySessionToken(token: string): SessionPayload | null {
    try {
      return this.jwtService.verify<SessionPayload>(token, {
        issuer: this.tokenIssuer,
        audience: this.sessionAudience,
      });
    } catch (error) {
      this.logger.logSecurity('Session verification failed', {
        reason: error instanceof Error ? error.message : 'unknown',
      });
      return null;
    }
  }

  private async setSessionCookie(res: Response, payload: HandshakePayload) {
    const rememberMe = Boolean(payload.rememberMe);
    const expiresSeconds = rememberMe ? REMEMBER_ME_EXPIRY_SECONDS : DEFAULT_SESSION_EXPIRY_SECONDS;
    const sessionId = randomUUID();
    const expiresAt = Date.now() + expiresSeconds * 1000;

    const sessionPayload: SessionPayload = {
      userId: payload.userId,
      email: payload.email,
      role: payload.role,
      rememberMe,
      sessionId,
      expiresAt,
    };

    const token = this.jwtService.sign(sessionPayload, {
      expiresIn: expiresSeconds,
      issuer: this.tokenIssuer,
      audience: this.sessionAudience,
      subject: payload.userId,
      jwtid: sessionId,
    });

    await this.persistSessionRecord(sessionPayload);

    res.cookie(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      secure: this.isProduction(),
      sameSite: 'strict',
      maxAge: expiresSeconds * 1000,
      path: '/',
    });
  }

  private async persistSessionRecord(payload: SessionPayload) {
    const record: SessionRecord = {
      sessionId: payload.sessionId,
      userId: payload.userId,
      email: payload.email,
      role: payload.role,
      rememberMe: Boolean(payload.rememberMe),
      expiresAt: payload.expiresAt,
      revoked: false,
      lastAccessAt: Date.now(),
      createdAt: Date.now(),
    };

    await this.firestore.collection(this.sessionCollectionName).doc(record.sessionId).set(record);
  }

  private async persistHandshakeRecord(payload: HandshakePayload, ttlSeconds: number) {
    const record: HandshakeRecord = {
      handshakeId: payload.handshakeId,
      userId: payload.userId,
      rememberMe: Boolean(payload.rememberMe),
      expiresAt: Date.now() + ttlSeconds * 1000,
      used: false,
      createdAt: Date.now(),
    };

    await this.firestore.collection(this.handshakeCollectionName).doc(record.handshakeId).set(record);
  }

  private async consumeHandshake(handshakeId: string) {
    const snapshot = await this.firestore.collection(this.handshakeCollectionName).doc(handshakeId).get();
    if (!snapshot.exists) {
      this.logger.logSecurity('Handshake rejected: record missing', { handshakeId });
      throw new BadRequestException('Handshake token expired or already used');
    }

    const record = snapshot.data() as HandshakeRecord;
    const now = Date.now();

    if (record.used) {
      this.logger.logSecurity('Handshake rejected: token reused', { handshakeId });
      throw new BadRequestException('Handshake token already consumed');
    }

    if (record.expiresAt <= now) {
      this.logger.logSecurity('Handshake rejected: token expired', { handshakeId });
      throw new BadRequestException('Handshake token expired');
    }

    await snapshot.ref.update({ used: true, usedAt: now });
  }

  private async revokeSession(sessionId: string, reason: string) {
    await this.firestore
      .collection(this.sessionCollectionName)
      .doc(sessionId)
      .set(
        {
          revoked: true,
          revokedAt: Date.now(),
          revocationReason: reason,
        },
        { merge: true },
      );

    this.logger.logSecurity('Session revoked', { sessionId, reason });
  }

  private async ensureSessionActive(payload: SessionPayload) {
    const snapshot = await this.firestore.collection(this.sessionCollectionName).doc(payload.sessionId).get();
    if (!snapshot.exists) {
      this.logger.logSecurity('Session rejected: record missing', {
        sessionId: payload.sessionId,
      });
      throw new UnauthorizedException('Session not recognized');
    }

    const record = snapshot.data() as SessionRecord;
    const now = Date.now();

    if (record.revoked) {
      this.logger.logSecurity('Session rejected: revoked', {
        sessionId: payload.sessionId,
        reason: record.revocationReason,
      });
      throw new UnauthorizedException('Session revoked');
    }

    if (record.expiresAt <= now || payload.expiresAt <= now) {
      this.logger.logSecurity('Session rejected: expired', { sessionId: payload.sessionId });
      throw new UnauthorizedException('Session expired');
    }

    if (now - record.lastAccessAt > SESSION_IDLE_TIMEOUT_SECONDS * 1000) {
      await snapshot.ref.update({
        revoked: true,
        revokedAt: now,
        revocationReason: 'idle-timeout',
      });
      this.logger.logSecurity('Session revoked due to inactivity', {
        sessionId: payload.sessionId,
      });
      throw new UnauthorizedException('Session expired due to inactivity');
    }

    await snapshot.ref.update({ lastAccessAt: now });
  }

  private attachHandshakeCookie(res: Response, token: string, ttlSeconds = DEFAULT_HANDSHAKE_TTL_SECONDS) {
    res.cookie(HANDSHAKE_COOKIE_NAME, token, {
      httpOnly: true,
      secure: this.isProduction(),
      sameSite: 'strict',
      maxAge: ttlSeconds * 1000,
      path: '/',
    });
  }

  private clearHandshakeCookie(res: Response) {
    res.cookie(HANDSHAKE_COOKIE_NAME, '', {
      httpOnly: true,
      secure: this.isProduction(),
      sameSite: 'strict',
      maxAge: 0,
      path: '/',
    });
  }

  private clearSessionCookie(res: Response) {
    res.cookie(SESSION_COOKIE_NAME, '', {
      httpOnly: true,
      secure: this.isProduction(),
      sameSite: 'strict',
      maxAge: 0,
      path: '/',
    });
  }

  private getCookie(req: Request, name: string): string | undefined {
    const cookieJar = (req as any).cookies;
    if (cookieJar && cookieJar[name]) {
      return cookieJar[name];
    }

    const header = req.headers?.cookie;
    if (!header) {
      return undefined;
    }

    const match = header.split(';').map((part) => part.trim()).find((part) => part.startsWith(`${name}=`));
    if (!match) {
      return undefined;
    }

    const value = match.substring(name.length + 1);
    if (value === '') {
      return undefined; // Treat empty value as missing cookie
    }

    try {
      return decodeURIComponent(value);
    } catch (error) {
      // Handle invalid percent encoding gracefully
      this.logger.logSecurity('Failed to decode cookie value', {
        cookieName: name,
        error: error instanceof Error ? error.message : String(error),
      });
      return undefined;
    }
  }

  private isProduction(): boolean {
    return this.configService.get('NODE_ENV') === 'production';
  }

  async validateAppAccess(token: string, appPath: string): Promise<{ allowed: boolean; role?: UserRole; userId?: string }> {
    try {
      const payload = await this.validateSessionToken(token);
      
      // Admin can access all apps
      if (payload.role === 'admin') {
        return { allowed: true, role: payload.role, userId: payload.userId };
      }

      // Supervisor needs to check app assignment
      if (payload.role === 'supervisor') {
        const supervisorDoc = await this.firestore.collection('users').doc(payload.userId).get();
        if (!supervisorDoc.exists) {
          return { allowed: false };
        }

        const supervisorData = supervisorDoc.data();
        const assignedApps: string[] = (supervisorData?.assignedApplications || []).map((value: any) => String(value));

        // Check if app is assigned by ID, path, or slug
        const appSlug = appPath.split('/').pop();
        const isAssigned = assignedApps.some((assigned) => {
          return (
            assigned === appPath ||
            assigned === `apps/${appSlug}` ||
            assigned === appSlug
          );
        });

        // Also check by querying applications collection
        if (!isAssigned) {
          const appsQuery = await this.firestore
            .collection('applications')
            .where('path', '==', appPath)
            .limit(1)
            .get();

          if (!appsQuery.empty) {
            const appId = appsQuery.docs[0].id;
            if (assignedApps.includes(appId)) {
              return { allowed: true, role: payload.role, userId: payload.userId };
            }
          }
        }

        if (isAssigned) {
          return { allowed: true, role: payload.role, userId: payload.userId };
        }

        return { allowed: false };
      }

      // Other roles not allowed
      return { allowed: false };
    } catch (error) {
      this.logger.logSecurity('App access validation failed', {
        error: error instanceof Error ? error.message : String(error),
        appPath,
      });
      return { allowed: false };
    }
  }

  async syncSupervisorAccessCodes(
    supervisorId: string,
    assignments: AppAssignmentInput[],
  ): Promise<SupervisorAccessCodes> {
    const normalizedAssignments = this.normalizeAssignments(assignments);
    const now = Date.now();

    const supervisorRef = this.firestore.collection('users').doc(supervisorId);

    const result = await this.firestore.runTransaction(async (tx) => {
      const doc = await tx.get(supervisorRef);
      if (!doc.exists) {
        throw new BadRequestException('Supervisor not found');
      }

      const data = doc.data() || {};
      const currentCodes: SupervisorAccessCodes = (data.accessCodes || {}) as SupervisorAccessCodes;
      const updatedCodes: SupervisorAccessCodes = {};

      normalizedAssignments.forEach((assignment) => {
        const existing = currentCodes[assignment.appKey];
        if (existing) {
          updatedCodes[assignment.appKey] = {
            ...existing,
            appId: assignment.appId,
            appKey: assignment.appKey,
            appName: assignment.appName ?? existing.appName ?? assignment.appKey,
            appPath: assignment.appPath ?? existing.appPath ?? null,
            updatedAt: now,
          };
        } else {
          updatedCodes[assignment.appKey] = {
            code: this.generateAccessCode(),
            appId: assignment.appId,
            appKey: assignment.appKey,
            appName: assignment.appName ?? assignment.appKey,
            appPath: assignment.appPath ?? null,
            createdAt: now,
            updatedAt: now,
          };
        }
      });

      tx.update(supervisorRef, {
        accessCodes: updatedCodes,
        updatedAt: new Date(),
      });

      return updatedCodes;
    });

    this.logger.log('Supervisor access codes synced', 'AuthService', {
      supervisorId,
      assignments: normalizedAssignments.length,
    });

    return result;
  }

  async regenerateSupervisorAccessCode(supervisorId: string, appKey: string): Promise<StoredAccessCode> {
    const normalizedKey = this.normalizeAppKey(appKey);
    if (!normalizedKey) {
      throw new BadRequestException('Invalid app key');
    }

    const supervisorRef = this.firestore.collection('users').doc(supervisorId);
    const now = Date.now();
    let supervisorEmail = '';
    let supervisorName = '';

    const updatedEntry = await this.firestore.runTransaction(async (tx) => {
      const doc = await tx.get(supervisorRef);
      if (!doc.exists) {
        throw new BadRequestException('Supervisor not found');
      }

      const data = doc.data() || {};
      supervisorEmail = data.email || '';
      supervisorName = data.displayName || data.name || 'Supervisor';
      const accessCodes: SupervisorAccessCodes = (data.accessCodes || {}) as SupervisorAccessCodes;
      const existing = accessCodes[normalizedKey];

      if (!existing) {
        throw new BadRequestException('Supervisor does not have an access code for this application');
      }

      const nextEntry: StoredAccessCode = {
        ...existing,
        code: this.generateAccessCode(),
        updatedAt: now,
        appKey: normalizedKey,
      };

      accessCodes[normalizedKey] = nextEntry;

      tx.update(supervisorRef, {
        accessCodes,
        updatedAt: new Date(),
      });

      return nextEntry;
    });

    this.logger.log('Supervisor access code regenerated', 'AuthService', {
      supervisorId,
      appKey: normalizedKey,
    });

    if (supervisorEmail) {
      await this.emailService.sendSupervisorAccessCodeUpdate(
        supervisorEmail,
        supervisorName,
        updatedEntry.appName || updatedEntry.appKey,
        updatedEntry.code,
      );
    }

    return updatedEntry;
  }
  async sendSupervisorWelcomeEmail(supervisorId: string, password: string): Promise<{ success: boolean }> {
    const supervisorDoc = await this.firestore.collection('users').doc(supervisorId).get();
    if (!supervisorDoc.exists) {
      throw new NotFoundException('Supervisor not found');
    }

    const supervisorData = supervisorDoc.data() || {};
    const email = supervisorData.email as string | undefined;
    if (!email) {
      throw new BadRequestException('Supervisor does not have an email address');
    }

    const name = (supervisorData.displayName as string) || (supervisorData.name as string) || 'Supervisor';
    const accessCodes: SupervisorAccessCodes = (supervisorData.accessCodes || {}) as SupervisorAccessCodes;
    const apps = Object.values(accessCodes).map((entry) => ({
      appName: entry.appName || entry.appKey,
      appKey: entry.appKey,
      accessCode: entry.code,
    }));

    await this.emailService.sendSupervisorWelcomeEmail(email, name, password, apps);

    this.logger.log('Supervisor welcome email sent', 'AuthService', {
      supervisorId,
      apps: apps.length,
    });

    return { success: true };
  }

  async verifyAccessCode(
    appKey: string,
    code: string,
  ): Promise<{
    valid: boolean;
    supervisorEmail?: string;
    supervisorId?: string;
    userEmail?: string;
    userId?: string;
    role?: 'supervisor' | 'user';
    appId?: string;
    appName?: string;
  }> {
    const normalizedKey = this.normalizeAppKey(appKey);
    const sanitizedCode = this.sanitizeCode(code);

    if (!normalizedKey || !sanitizedCode) {
      return { valid: false };
    }

    try {
      // First, check supervisor codes
      const supervisorQuery = await this.firestore
        .collection('users')
        .where('role', '==', 'supervisor')
        .where(`accessCodes.${normalizedKey}.code`, '==', sanitizedCode)
        .limit(1)
        .get();

      if (!supervisorQuery.empty) {
        const doc = supervisorQuery.docs[0];
        const data = doc.data();
        const codes: SupervisorAccessCodes = (data.accessCodes || {}) as SupervisorAccessCodes;
        const entry = codes[normalizedKey];

        if (entry) {
          return {
            valid: true,
            supervisorEmail: data.email,
            supervisorId: doc.id,
            role: 'supervisor',
            appId: entry.appId,
            appName: entry.appName || entry.appKey,
          };
        }
      }

      // Then, check user codes
      const userQuery = await this.firestore
        .collection('users')
        .where('role', '==', 'user')
        .where(`accessCodes.${normalizedKey}.code`, '==', sanitizedCode)
        .limit(1)
        .get();

      if (!userQuery.empty) {
        const doc = userQuery.docs[0];
        const data = doc.data();
        const codes = (data.accessCodes || {}) as Record<string, any>;
        const entry = codes[normalizedKey];

        if (entry) {
          // Check if app access is enabled for this user
          const access = data.access || {};
          const appEnabled = access[`${normalizedKey}_enabled`] !== false; // Default to true if not set
          const appApproved = access[normalizedKey] === true;
          const accessSupervisors = (data.accessSupervisors || {}) as Record<string, string>;
          let assignedSupervisor: string | undefined = accessSupervisors[normalizedKey];

          if (!assignedSupervisor) {
            assignedSupervisor = await this.lookupLegacySupervisorForUser(data.email, normalizedKey);
            if (assignedSupervisor) {
              await doc.ref.set(
                {
                  accessSupervisors: {
                    ...accessSupervisors,
                    [normalizedKey]: assignedSupervisor,
                  },
                },
                { merge: true },
              );
            }
          }

          // Only allow access if app is both approved and enabled
          if (appApproved && appEnabled) {
            return {
              valid: true,
              userEmail: data.email,
              userId: doc.id,
              supervisorId: assignedSupervisor,
              role: 'user',
              appId: entry.appId,
              appName: entry.appName || normalizedKey,
            };
          }
        }
      }

      return { valid: false };
    } catch (error) {
      this.logger.logSecurity('Access code verification failed', {
        appKey: normalizedKey,
        error: error instanceof Error ? error.message : String(error),
      });
      return { valid: false };
    }
  }

  private normalizeAssignments(assignments: AppAssignmentInput[]): AppAssignmentInput[] {
    const unique = new Map<string, AppAssignmentInput>();

    assignments.forEach((assignment) => {
      const normalizedKey = this.normalizeAppKey(assignment.appKey);
      if (!normalizedKey) {
        return;
      }

      unique.set(normalizedKey, {
        appId: assignment.appId,
        appKey: normalizedKey,
        appName: assignment.appName,
        appPath: assignment.appPath,
      });
    });

    return Array.from(unique.values());
  }

  private normalizeAppKey(appKey: string): string {
    if (!appKey) {
      return '';
    }

    return appKey
      .toString()
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  private async lookupLegacySupervisorForUser(email: string | undefined, appKey: string): Promise<string | undefined> {
    if (!email) {
      return undefined;
    }

    try {
      const snapshot = await this.firestore
        .collection('userAccessRequests')
        .where('email', '==', email)
        .where('appKey', '==', appKey)
        .where('status', '==', 'approved')
        .orderBy('reviewedAt', 'desc')
        .limit(1)
        .get();

      if (!snapshot.empty) {
        const requestData = snapshot.docs[0].data() as { reviewedBy?: string | null };
        if (requestData?.reviewedBy && typeof requestData.reviewedBy === 'string') {
          return requestData.reviewedBy;
        }
      }
    } catch (error) {
      this.logger.logError(error instanceof Error ? error : String(error), 'AuthService', {
        context: 'lookupLegacySupervisorForUser',
        email,
        appKey,
      });
    }

    return undefined;
  }

  private sanitizeCode(code: string): string {
    if (!code) {
      return '';
    }

    const digits = code.toString().replace(/\D/g, '');
    if (digits.length !== 9) {
      return '';
    }

    return digits;
  }

  private generateAccessCode(): string {
    const min = 100000000; // ensure 9 digits
    const max = 999999999;
    return Math.floor(Math.random() * (max - min + 1) + min).toString();
  }
}

