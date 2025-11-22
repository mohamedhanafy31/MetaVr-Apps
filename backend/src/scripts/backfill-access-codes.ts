import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { AuthService, AppAssignmentInput } from '../auth/auth.service';
import { FIREBASE_FIRESTORE } from '../firebase/firebase.constants';
import { Firestore } from 'firebase-admin/firestore';

async function buildAssignments(
  firestore: Firestore,
  appIds: string[],
): Promise<AppAssignmentInput[]> {
  const assignments: AppAssignmentInput[] = [];

  for (const appId of appIds) {
    if (!appId) {
      continue;
    }

    try {
      const doc = await firestore.collection('applications').doc(appId).get();
      if (!doc.exists) {
        assignments.push({
          appId,
          appKey: sanitizeAppKey(appId),
          appName: appId,
        });
        continue;
      }

      const data = doc.data() || {};
      const path = typeof data.path === 'string' ? data.path : undefined;
      const slugFromPath = path?.split('/').filter(Boolean).pop();
      const appKey = sanitizeAppKey(slugFromPath || appId);

      assignments.push({
        appId: doc.id,
        appKey,
        appName: (data.name as string) || doc.id,
        appPath: path,
      });
    } catch (error) {
      console.warn(`[backfill] Failed to load application ${appId}:`, error);
    }
  }

  return assignments;
}

function sanitizeAppKey(value: string): string {
  return value
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

async function backfill() {
  const appContext = await NestFactory.createApplicationContext(AppModule, {
    logger: ['log', 'error', 'warn'],
  });

  try {
    const firestore = appContext.get<Firestore>(FIREBASE_FIRESTORE);
    const authService = appContext.get(AuthService);

    const supervisorsSnapshot = await firestore.collection('users').where('role', '==', 'supervisor').get();
    if (supervisorsSnapshot.empty) {
      console.log('[backfill] No supervisors found. Nothing to do.');
      return;
    }

    let processed = 0;

    for (const doc of supervisorsSnapshot.docs) {
      const data = doc.data();
      const assignedApps = Array.isArray(data.assignedApplications)
        ? data.assignedApplications.map((value: unknown) => String(value))
        : [];

      const assignments = await buildAssignments(firestore, assignedApps);
      await authService.syncSupervisorAccessCodes(doc.id, assignments);
      processed += 1;
      console.log(`[backfill] Synced access codes for supervisor ${doc.id} (${assignments.length} apps)`);
    }

    console.log(`[backfill] Completed successfully. Updated ${processed} supervisors.`);
  } catch (error) {
    console.error('[backfill] Failed to backfill access codes:', error);
    process.exitCode = 1;
  } finally {
    await appContext.close();
  }
}

void backfill();


