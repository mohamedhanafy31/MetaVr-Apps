import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { Firestore } from 'firebase-admin/firestore';
import { FIREBASE_FIRESTORE } from '../firebase/firebase.constants';
import { AppLoggerService } from '../logger/logger.service';
import { EmailService } from '../email/email.service';
import {
  SubmitAccessRequestDto,
  ApproveAccessRequestDto,
  RejectAccessRequestDto,
  RegenerateUserAccessCodeDto,
  ResendAccessCodeDto,
  ToggleUserAppAccessDto,
} from './dto/user-access-request.dto';

interface UserAccessRequest {
  id?: string; // Firestore document ID
  email: string;
  name: string;
  phone: string;
  appId: string;
  appKey: string;
  appPath: string;
  appName: string;
  status: 'pending' | 'approved' | 'rejected';
  requestedAt: FirebaseFirestore.Timestamp | Date;
  reviewedAt?: FirebaseFirestore.Timestamp | Date | null;
  reviewedBy?: string | null;
  rejectionReason?: string | null;
}

interface UserAccessCode {
  code: string;
  appId: string;
  appKey: string;
  appName: string;
  appPath: string;
  createdAt: number;
  updatedAt: number;
}

type UserAccessCodes = Record<string, UserAccessCode>;

@Injectable()
export class UserAccessService {
  private readonly requestsCollection = 'userAccessRequests';
  private readonly usersCollection = 'users';
  private readonly applicationsCollection = 'applications';

  constructor(
    @Inject(FIREBASE_FIRESTORE) private readonly firestore: Firestore,
    private readonly logger: AppLoggerService,
    private readonly emailService: EmailService,
  ) {}

  async submitAccessRequest(
    dto: SubmitAccessRequestDto,
  ): Promise<{
    success: boolean;
    message: string;
    createdRequests?: number;
    alreadyHasAccess?: Array<{ appId: string; appKey: string; appName: string }>;
  }> {
    const { email, appIds, name, phone } = dto;

    // Check if user exists
    const userExists = await this.checkIfUserExists(email);
    
    // If user doesn't exist, name and phone are required
    if (!userExists && (!name || !phone)) {
      throw new BadRequestException('Name and phone are required for first-time users');
    }

    // Get or create user
    const userId = await this.createOrUpdateUser(email, name, phone);
    const userDoc = await this.firestore.collection(this.usersCollection).doc(userId).get();
    const userData = userDoc.data() || {};
    const userAccessMap = (userData?.access || {}) as Record<string, boolean>;
    const userAccessCodes = (userData?.accessCodes || {}) as UserAccessCodes;
    const fallbackName = typeof userData?.name === 'string' ? userData.name : '';
    const fallbackPhone = typeof userData?.phone === 'string' ? userData.phone : '';

    // Fetch application details
    const applications = await this.fetchApplications(appIds);

    if (applications.length === 0) {
      throw new BadRequestException('No valid applications found');
    }

    // Create request for each app
    const requests: Promise<void>[] = [];
    const alreadyHasAccess: Array<{ appId: string; appKey: string; appName: string }> = [];
    let createdRequestCount = 0;

    for (const app of applications) {
      const normalizedKey = this.normalizeAppKey(app.appKey || app.path?.split('/').pop() || app.id);

      const hasAccess =
        userAccessMap?.[normalizedKey] === true ||
        (userAccessCodes?.[normalizedKey] && userAccessCodes[normalizedKey]?.code);

      if (hasAccess) {
        alreadyHasAccess.push({
          appId: app.id,
          appKey: normalizedKey,
          appName: app.name,
        });
        continue;
      }

      // Check if request already exists
      const existingRequest = await this.firestore
        .collection(this.requestsCollection)
        .where('email', '==', email)
        .where('appId', '==', app.id)
        .where('status', '==', 'pending')
        .limit(1)
        .get();

      if (!existingRequest.empty) {
        this.logger.log(`Request already exists for ${email} and app ${app.id}`, 'UserAccessService');
        continue;
      }

      const requestData: Omit<UserAccessRequest, 'requestedAt'> & { requestedAt: Date } = {
        email,
        name: name || fallbackName || '',
        phone: phone || fallbackPhone || '',
        appId: app.id,
        appKey: normalizedKey,
        appPath: app.path || `apps/${app.appKey || app.id}`,
        appName: app.name,
        status: 'pending',
        reviewedAt: null,
        reviewedBy: null,
        rejectionReason: null,
        requestedAt: new Date(),
      };

      requests.push(
        this.firestore.collection(this.requestsCollection).add(requestData).then(() => {
          createdRequestCount += 1;
          this.logger.log(`Access request created for ${email} - ${app.name}`, 'UserAccessService');
        }),
      );
    }

    await Promise.all(requests);

    const message =
      createdRequestCount > 0
        ? `Access request(s) submitted successfully for ${createdRequestCount} app(s)`
        : alreadyHasAccess.length > 0
          ? 'You already have access to the selected application(s)'
          : 'No access requests were created';

    return {
      success: true,
      message,
      createdRequests: createdRequestCount,
      alreadyHasAccess,
    };
  }

  async getAccessRequests(supervisorId: string): Promise<Record<string, (UserAccessRequest & {
    existingApps?: Array<{ appKey: string; appName: string; enabled: boolean; grantedAt?: number }>;
    userId?: string;
  })[]>> {
    // Get supervisor's assigned apps
    const supervisorDoc = await this.firestore.collection(this.usersCollection).doc(supervisorId).get();
    if (!supervisorDoc.exists) {
      throw new NotFoundException('Supervisor not found');
    }

    const supervisorData = supervisorDoc.data();
    const assignedApps: string[] = (supervisorData?.assignedApplications || []).map((value: any) => String(value));

    // Fetch all pending requests
    const requestsSnapshot = await this.firestore
      .collection(this.requestsCollection)
      .where('status', '==', 'pending')
      .get();

    // Filter requests by supervisor's assigned apps
    const requests: UserAccessRequest[] = [];
    for (const doc of requestsSnapshot.docs) {
      const data = doc.data();
      const appId = data.appId;
      const appKey = data.appKey;
      const appPath = data.appPath;

      // Check if supervisor has access to this app
      const hasAccess =
        assignedApps.includes(appId) ||
        assignedApps.includes(appKey) ||
        assignedApps.includes(appPath) ||
        assignedApps.some((assigned) => {
          const slug = appPath?.split('/').pop();
          return assigned === `apps/${slug}` || assigned === slug;
        });

      if (hasAccess) {
        // Get userId from email
        const userDoc = await this.findUserByEmail(data.email);
        const userId = userDoc?.id;

        const userProfile = userDoc?.data() || {};
        const accessFlags = (userProfile?.access || {}) as Record<string, boolean>;
        const accessCodes: UserAccessCodes = (userProfile?.accessCodes || {}) as UserAccessCodes;
        const existingApps =
          Object.entries(accessCodes || {}).map(([key, code]) => ({
            appKey: key,
            appName: code?.appName || key,
            enabled: accessFlags?.[`${key}_enabled`] !== false,
            grantedAt: code?.updatedAt || code?.createdAt,
          })) ?? [];

        requests.push({
          id: doc.id, // Include Firestore document ID
          ...data,
          name: data.name || userProfile?.name || '',
          phone: data.phone || userProfile?.phone || '',
          requestedAt: this.normalizeTimestamp(data.requestedAt),
          userId: userId, // Include userId for regenerate functionality
          existingApps,
        } as unknown as UserAccessRequest & {
          id: string;
          userId?: string;
          existingApps?: Array<{ appKey: string; appName: string; enabled: boolean; grantedAt?: number }>;
        });
      }
    }

    // Group by appKey
    const grouped: Record<string, UserAccessRequest[]> = {};
    for (const request of requests) {
      if (!grouped[request.appKey]) {
        grouped[request.appKey] = [];
      }
      grouped[request.appKey].push(request);
    }

    return grouped;
  }

  async getAccessRequestHistory(
    supervisorId: string,
    options?: { limit?: number },
  ): Promise<
    Array<
      UserAccessRequest & {
        id: string;
        requestedAt: string | null;
        reviewedAt?: string | null;
      }
    >
  > {
    const limit = Math.min(Math.max(options?.limit ?? 200, 25), 500);

    const supervisorDoc = await this.firestore.collection(this.usersCollection).doc(supervisorId).get();
    if (!supervisorDoc.exists) {
      throw new NotFoundException('Supervisor not found');
    }

    const supervisorData = supervisorDoc.data();
    const assignedApps: string[] = (supervisorData?.assignedApplications || []).map((value: any) => String(value));

    if (assignedApps.length === 0) {
      return [];
    }

    const fetchLimit = limit * 3;
    const snapshot = await this.firestore
      .collection(this.requestsCollection)
      .orderBy('requestedAt', 'desc')
      .limit(fetchLimit)
      .get();

    const history: Array<
      UserAccessRequest & { id: string; requestedAt: string | null; reviewedAt?: string | null }
    > = [];

    for (const doc of snapshot.docs) {
      const data = doc.data() as UserAccessRequest;
      const appId = data.appId;
      const appKey = data.appKey;
      const appPath = data.appPath;
      const slug = appPath?.split('/').pop();

      const hasAccess =
        assignedApps.includes(appId) ||
        assignedApps.includes(appKey) ||
        assignedApps.includes(appPath) ||
        (!!slug && (assignedApps.includes(slug) || assignedApps.includes(`apps/${slug}`)));

      if (!hasAccess) {
        continue;
      }

      history.push({
        id: doc.id,
        ...data,
        requestedAt: this.normalizeTimestamp(data.requestedAt),
        reviewedAt: data.reviewedAt ? this.normalizeTimestamp(data.reviewedAt) : undefined,
      } as UserAccessRequest & {
        id: string;
        requestedAt: string | null;
        reviewedAt?: string | null;
      });

      if (history.length >= limit) {
        break;
      }
    }

    return history;
  }

  async approveAccessRequest(dto: ApproveAccessRequestDto, supervisorId: string): Promise<{ success: boolean; message: string; userId?: string }> {
    const { requestId } = dto;

    const requestDoc = await this.firestore.collection(this.requestsCollection).doc(requestId).get();
    if (!requestDoc.exists) {
      throw new NotFoundException('Access request not found');
    }

    const requestData = requestDoc.data() as UserAccessRequest;
    if (requestData.status !== 'pending') {
      throw new BadRequestException('Request is not pending');
    }

    // Get or create user
    const userDoc = await this.findUserByEmail(requestData.email);
    if (!userDoc) {
      throw new NotFoundException('User not found');
    }

    const userId = userDoc.id;

    const userData = userDoc.data();
    const accessCodes: UserAccessCodes = (userData?.accessCodes || {}) as UserAccessCodes;
    const accessSupervisors: Record<string, string> = (userData?.accessSupervisors || {}) as Record<string, string>;
    const now = Date.now();

    // Generate access code
    const accessCode = this.generateAccessCode();
    const appKey = requestData.appKey;

    // Update user's access codes
    const updatedCodes: UserAccessCodes = {
      ...accessCodes,
      [appKey]: {
        code: accessCode,
        appId: requestData.appId,
        appKey: appKey,
        appName: requestData.appName,
        appPath: requestData.appPath,
        createdAt: accessCodes[appKey]?.createdAt || now,
        updatedAt: now,
      },
    };

    // Update user's access flags
    const access = userData?.access || {};
    access[appKey] = true;
    access[`${appKey}_enabled`] = true; // Default to enabled when approved

    // Update user document
    accessSupervisors[appKey] = supervisorId;

    await userDoc.ref.update({
      accessCodes: updatedCodes,
      access: access,
      accessSupervisors,
      updatedAt: new Date(),
    });

    // Update request status
    await requestDoc.ref.update({
      status: 'approved',
      reviewedAt: new Date(),
      reviewedBy: supervisorId,
    });

    // Send email
    await this.emailService.sendAccessCodeEmail(
      requestData.email,
      requestData.name,
      requestData.appName,
      accessCode,
    );

    this.logger.log(`Access request approved: ${requestId}`, 'UserAccessService', {
      email: requestData.email,
      appName: requestData.appName,
    });

    return {
      success: true,
      message: 'Access request approved and access code sent via email',
      userId: userId,
    };
  }

  async rejectAccessRequest(dto: RejectAccessRequestDto, supervisorId: string): Promise<{ success: boolean; message: string }> {
    const { requestId, reason } = dto;

    const requestDoc = await this.firestore.collection(this.requestsCollection).doc(requestId).get();
    if (!requestDoc.exists) {
      throw new NotFoundException('Access request not found');
    }

    const requestData = requestDoc.data() as UserAccessRequest;
    if (requestData.status !== 'pending') {
      throw new BadRequestException('Request is not pending');
    }

    // Update request status
    await requestDoc.ref.update({
      status: 'rejected',
      reviewedAt: new Date(),
      reviewedBy: supervisorId,
      rejectionReason: reason || null,
    });

    // Update user's access flag (set to false)
    const userDoc = await this.findUserByEmail(requestData.email);
    if (userDoc) {
      const userData = userDoc.data();
      const access = userData?.access || {};
      access[requestData.appKey] = false;

      await userDoc.ref.update({
        access: access,
        updatedAt: new Date(),
      });
    }

    // Send rejection email
    await this.emailService.sendRejectionEmail(
      requestData.email,
      requestData.name,
      requestData.appName,
    );

    this.logger.log(`Access request rejected: ${requestId}`, 'UserAccessService', {
      email: requestData.email,
      appName: requestData.appName,
      reason,
    });

    return {
      success: true,
      message: 'Access request rejected and notification sent via email',
    };
  }

  async regenerateUserAccessCode(dto: RegenerateUserAccessCodeDto, supervisorId: string): Promise<{ success: boolean; code: string; message: string }> {
    const { userId, appKey } = dto;
    const normalizedKey = this.normalizeAppKey(appKey);

    const userDoc = await this.firestore.collection(this.usersCollection).doc(userId).get();
    if (!userDoc.exists) {
      throw new NotFoundException('User not found');
    }

    const userData = userDoc.data();
    if (userData?.role !== 'user') {
      throw new BadRequestException('User is not a regular user');
    }

    const accessCodes: UserAccessCodes = (userData?.accessCodes || {}) as UserAccessCodes;
    const existingCode = accessCodes[normalizedKey];

    if (!existingCode) {
      throw new BadRequestException('User does not have an access code for this application');
    }

    // Generate new code
    const newCode = this.generateAccessCode();
    const now = Date.now();

    // Update access code
    const updatedCodes: UserAccessCodes = {
      ...accessCodes,
      [normalizedKey]: {
        ...existingCode,
        code: newCode,
        updatedAt: now,
      },
    };

    await userDoc.ref.update({
      accessCodes: updatedCodes,
      updatedAt: new Date(),
    });

    // Send email with new code
    await this.emailService.sendAccessCodeEmail(
      userData.email,
      userData.name || 'User',
      existingCode.appName,
      newCode,
    );

    this.logger.log(`Access code regenerated for user ${userId} - app ${normalizedKey}`, 'UserAccessService');

    return {
      success: true,
      code: newCode,
      message: 'Access code regenerated and sent via email',
    };
  }

  private async checkIfUserExists(email: string): Promise<boolean> {
    const snapshot = await this.firestore
      .collection(this.usersCollection)
      .where('email', '==', email)
      .where('role', '==', 'user')
      .limit(1)
      .get();
    return !snapshot.empty;
  }

  private async findUserByEmail(email: string) {
    const snapshot = await this.firestore
      .collection(this.usersCollection)
      .where('email', '==', email)
      .where('role', '==', 'user')
      .limit(1)
      .get();
    return snapshot.empty ? null : snapshot.docs[0];
  }

  private async createOrUpdateUser(email: string, name?: string, phone?: string): Promise<string> {
    const existingUser = await this.findUserByEmail(email);

    if (existingUser) {
      // Update existing user if name/phone provided
      if (name || phone) {
        const updates: any = { updatedAt: new Date() };
        if (name) updates.name = name;
        if (phone) updates.phone = phone;
        await existingUser.ref.update(updates);
      }
      return existingUser.id;
    }

    // Create new user
    const userData = {
      email,
      name: name || '',
      phone: phone || '',
      role: 'user' as const,
      status: 'active' as const,
      access: {},
      accessCodes: {},
      accessSupervisors: {},
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const userRef = await this.firestore.collection(this.usersCollection).add(userData);
    this.logger.log(`New user created: ${email}`, 'UserAccessService');
    return userRef.id;
  }

  private async fetchApplications(appIds: string[]): Promise<Array<{ id: string; name: string; path?: string; appKey?: string }>> {
    const applications: Array<{ id: string; name: string; path?: string; appKey?: string }> = [];

    for (const appId of appIds) {
      try {
        // First try to find by document ID
        let appDoc = await this.firestore.collection(this.applicationsCollection).doc(appId).get();
        
        // If not found by ID, try to find by path (appId might be a path like "apps/iq-questions")
        if (!appDoc.exists) {
          const normalizedPath = appId.startsWith('apps/') ? appId : `apps/${appId}`;
          const querySnapshot = await this.firestore
            .collection(this.applicationsCollection)
            .where('path', '==', normalizedPath)
            .limit(1)
            .get();
          
          if (!querySnapshot.empty) {
            appDoc = querySnapshot.docs[0];
          }
        }
        
        // If still not found, try to find by appKey field
        if (!appDoc.exists) {
          const normalizedKey = this.normalizeAppKey(appId);
          const querySnapshot = await this.firestore
            .collection(this.applicationsCollection)
            .where('appKey', '==', normalizedKey)
            .limit(1)
            .get();
          
          if (!querySnapshot.empty) {
            appDoc = querySnapshot.docs[0];
          }
        }
        
        // If still not found, try to find by path ending (slug)
        if (!appDoc.exists) {
          const slug = appId.split('/').pop() || appId;
          const allApps = await this.firestore.collection(this.applicationsCollection).get();
          for (const doc of allApps.docs) {
            const data = doc.data();
            const pathSlug = data?.path?.split('/').pop();
            const appKeySlug = data?.appKey;
            if (pathSlug === slug || appKeySlug === slug || this.normalizeAppKey(pathSlug || '') === this.normalizeAppKey(slug)) {
              appDoc = doc;
              break;
            }
          }
        }
        
        if (appDoc.exists) {
          const data = appDoc.data();
          const pathSlug = data?.path?.split('/').pop();
          applications.push({
            id: appDoc.id,
            name: data?.name || 'Unknown App',
            path: data?.path,
            appKey: data?.appKey || pathSlug || appId,
          });
        } else {
          this.logger.log(`Application not found: ${appId}`, 'UserAccessService');
        }
      } catch (error) {
        this.logger.logError(error instanceof Error ? error : String(error), 'UserAccessService', {
          appId,
        });
      }
    }

    return applications;
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

  async resendAccessCode(dto: ResendAccessCodeDto): Promise<{ success: boolean; message: string }> {
    const { email, appKey } = dto;
    const normalizedKey = this.normalizeAppKey(appKey);

    // Find user by email
    const userDoc = await this.findUserByEmail(email);
    if (!userDoc) {
      throw new NotFoundException('User not found with this email address');
    }

    const userData = userDoc.data();
    if (userData?.role !== 'user') {
      throw new BadRequestException('This email is not associated with a user account');
    }

    const accessCodes: UserAccessCodes = (userData?.accessCodes || {}) as UserAccessCodes;
    const existingCode = accessCodes[normalizedKey];

    if (!existingCode) {
      throw new BadRequestException('No access code found for this application. Please request access first.');
    }

    // Check if access is approved
    const access = userData?.access || {};
    if (access[normalizedKey] !== true) {
      throw new BadRequestException('Access to this application has not been approved yet.');
    }

    // Send email with existing code
    await this.emailService.sendAccessCodeEmail(
      email,
      userData.name || 'User',
      existingCode.appName,
      existingCode.code,
    );

    this.logger.log(`Access code resent to ${email} for app ${normalizedKey}`, 'UserAccessService');

    return {
      success: true,
      message: 'Access code has been sent to your email address',
    };
  }

  async getUsersWithAccess(supervisorId: string): Promise<Array<{
    userId: string;
    email: string;
    name: string;
    phone: string;
    apps: Array<{
      appKey: string;
      appName: string;
      appId: string;
      enabled: boolean;
      accessCode: string;
    }>;
  }>> {
    // Get supervisor's assigned apps
    const supervisorDoc = await this.firestore.collection(this.usersCollection).doc(supervisorId).get();
    if (!supervisorDoc.exists) {
      throw new NotFoundException('Supervisor not found');
    }

    const supervisorData = supervisorDoc.data();
    const assignedApps: string[] = (supervisorData?.assignedApplications || []).map((value: any) => String(value));

    // Get all users with role 'user'
    const usersSnapshot = await this.firestore
      .collection(this.usersCollection)
      .where('role', '==', 'user')
      .get();

    const usersWithAccess: Array<{
      userId: string;
      email: string;
      name: string;
      phone: string;
      apps: Array<{
        appKey: string;
        appName: string;
        appId: string;
        enabled: boolean;
        accessCode: string;
      }>;
    }> = [];

    for (const userDoc of usersSnapshot.docs) {
      const userData = userDoc.data();
      const access = userData?.access || {};
      const accessCodes: UserAccessCodes = (userData?.accessCodes || {}) as UserAccessCodes;

      // Filter apps that are approved and belong to supervisor's assigned apps
      const userApps: Array<{
        appKey: string;
        appName: string;
        appId: string;
        enabled: boolean;
        accessCode: string;
      }> = [];

      for (const [appKey, codeData] of Object.entries(accessCodes)) {
        const normalizedKey = this.normalizeAppKey(appKey);
        const isApproved = access[normalizedKey] === true;

        if (!isApproved) {
          continue;
        }

        // Check if supervisor has access to this app
        const hasAccess =
          assignedApps.includes(codeData.appId) ||
          assignedApps.includes(normalizedKey) ||
          assignedApps.includes(codeData.appPath) ||
          assignedApps.some((assigned) => {
            const slug = codeData.appPath?.split('/').pop();
            return assigned === `apps/${slug}` || assigned === slug;
          });

        if (hasAccess) {
          // Check if app is enabled (default to true if not set)
          const enabled = access[`${normalizedKey}_enabled`] !== false;

          userApps.push({
            appKey: normalizedKey,
            appName: codeData.appName || normalizedKey,
            appId: codeData.appId || '',
            enabled: enabled,
            accessCode: codeData.code || '',
          });
        }
      }

      // Only include users who have at least one approved app
      if (userApps.length > 0) {
        usersWithAccess.push({
          userId: userDoc.id,
          email: userData.email || '',
          name: userData.name || '',
          phone: userData.phone || '',
          apps: userApps,
        });
      }
    }

    return usersWithAccess;
  }

  async toggleUserAppAccess(dto: ToggleUserAppAccessDto, supervisorId: string): Promise<{ success: boolean; message: string }> {
    const { userId, appKey, enabled } = dto;
    const normalizedKey = this.normalizeAppKey(appKey);

    const userDoc = await this.firestore.collection(this.usersCollection).doc(userId).get();
    if (!userDoc.exists) {
      throw new NotFoundException('User not found');
    }

    const userData = userDoc.data();
    if (userData?.role !== 'user') {
      throw new BadRequestException('User is not a regular user');
    }

    // Verify supervisor has access to this app
    const supervisorDoc = await this.firestore.collection(this.usersCollection).doc(supervisorId).get();
    if (!supervisorDoc.exists) {
      throw new NotFoundException('Supervisor not found');
    }

    const supervisorData = supervisorDoc.data();
    const assignedApps: string[] = (supervisorData?.assignedApplications || []).map((value: any) => String(value));
    const accessCodes: UserAccessCodes = (userData?.accessCodes || {}) as UserAccessCodes;
    const userApp = accessCodes[normalizedKey];

    if (!userApp) {
      throw new BadRequestException('User does not have access to this application');
    }

    // Check if supervisor has access to this app
    const hasAccess =
      assignedApps.includes(userApp.appId) ||
      assignedApps.includes(normalizedKey) ||
      assignedApps.includes(userApp.appPath) ||
      assignedApps.some((assigned) => {
        const slug = userApp.appPath?.split('/').pop();
        return assigned === `apps/${slug}` || assigned === slug;
      });

    if (!hasAccess) {
      throw new BadRequestException('Supervisor does not have access to manage this application');
    }

    // Update access enabled flag
    const access = userData?.access || {};
    access[`${normalizedKey}_enabled`] = enabled;

    await userDoc.ref.update({
      access: access,
      updatedAt: new Date(),
    });

    this.logger.log(`User app access toggled: ${userId} - ${normalizedKey} = ${enabled}`, 'UserAccessService', {
      supervisorId,
      userId,
      appKey: normalizedKey,
      enabled,
    });

    return {
      success: true,
      message: `App access ${enabled ? 'enabled' : 'disabled'} successfully`,
    };
  }

  private generateAccessCode(): string {
    const min = 100000000; // ensure 9 digits
    const max = 999999999;
    return Math.floor(Math.random() * (max - min + 1) + min).toString();
  }
  private normalizeTimestamp(value: FirebaseFirestore.Timestamp | Date | string | undefined): string | null {
    if (!value) {
      return null;
    }

    if (typeof value === 'string') {
      const parsed = new Date(value);
      return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
    }

    if (value instanceof Date) {
      return value.toISOString();
    }

    if (typeof value.toDate === 'function') {
      return value.toDate().toISOString();
    }

    return null;
  }
}

