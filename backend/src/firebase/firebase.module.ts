import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';
import { App as FirebaseApp } from 'firebase-admin/app';
import { SecretManagerServiceClient } from '@google-cloud/secret-manager';
import { FIREBASE_APP, FIREBASE_FIRESTORE } from './firebase.constants';

async function parseServiceAccount(config: ConfigService): Promise<Record<string, unknown>> {
  // Try Secret Manager first (production)
  const projectId = process.env.GOOGLE_CLOUD_PROJECT || process.env.GCLOUD_PROJECT;
  const secretName = process.env.FIREBASE_SECRET_NAME || 'firebase-service-account';
  
  if (projectId) {
    try {
      const client = new SecretManagerServiceClient();
      const name = `projects/${projectId}/secrets/${secretName}/versions/latest`;
      const [version] = await client.accessSecretVersion({ name });
      const payload = version.payload?.data?.toString();
      
      if (payload) {
        const serviceAccount = JSON.parse(payload);
        console.log('✅ Firebase credentials loaded from Secret Manager');
        console.log(`📁 Project ID: ${serviceAccount.project_id}`);
        return serviceAccount;
      }
    } catch (error: any) {
      // Log but don't fail - fall back to environment variables
      console.warn('⚠️  Secret Manager access failed, trying environment variables:', error?.message);
    }
  }
  
  // Fallback to environment variables (development/local)
  const json = config.get<string>('FIREBASE_SERVICE_ACCOUNT_JSON');
  if (json) {
    try {
      const serviceAccount = JSON.parse(json);
      console.log('✅ Firebase credentials loaded from FIREBASE_SERVICE_ACCOUNT_JSON');
      console.log(`📁 Project ID: ${serviceAccount.project_id}`);
      return serviceAccount;
    } catch (error) {
      throw new Error('Invalid FIREBASE_SERVICE_ACCOUNT_JSON format');
    }
  }

  const base64 = config.get<string>('FIREBASE_SERVICE_ACCOUNT_KEY');
  if (base64) {
    try {
      const decoded = Buffer.from(base64, 'base64').toString('utf-8');
      const serviceAccount = JSON.parse(decoded);
      console.log('✅ Firebase credentials loaded from FIREBASE_SERVICE_ACCOUNT_KEY (Base64)');
      console.log(`📁 Project ID: ${serviceAccount.project_id}`);
      return serviceAccount;
    } catch (error) {
      throw new Error('Invalid FIREBASE_SERVICE_ACCOUNT_KEY format');
    }
  }

  throw new Error(
    'Firebase credentials missing. Set FIREBASE_SERVICE_ACCOUNT_JSON, FIREBASE_SERVICE_ACCOUNT_KEY, or configure Secret Manager.',
  );
}

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: FIREBASE_APP,
      useFactory: async (config: ConfigService): Promise<FirebaseApp> => {
        const serviceAccount = await parseServiceAccount(config);
        if (getApps().length > 0) {
          return getApps()[0]!;
        }
        return initializeApp({
          credential: cert(serviceAccount as Record<string, string>),
        });
      },
      inject: [ConfigService],
    },
    {
      provide: FIREBASE_FIRESTORE,
      useFactory: (app: FirebaseApp): Firestore => {
        return getFirestore(app);
      },
      inject: [FIREBASE_APP],
    },
  ],
  exports: [FIREBASE_APP, FIREBASE_FIRESTORE],
})
export class FirebaseModule {}

