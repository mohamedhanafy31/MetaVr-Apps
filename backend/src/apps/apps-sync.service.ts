import { Injectable, OnModuleInit } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { promises as fs } from 'fs';
import { join } from 'path';
import { Storage } from '@google-cloud/storage';
import { Firestore } from 'firebase-admin/firestore';
import { FIREBASE_FIRESTORE } from '../firebase/firebase.constants';
import { AppLoggerService } from '../logger/logger.service';

type PlatformType = 'web' | 'desktop' | 'mobile';

interface AppMetadata {
  name: string;
  description: string;
  platform: PlatformType;
  path: string;
  version?: string;
  authRequired?: boolean;
  port?: number | null;
  url?: string | null;
  configPath?: string | null;
}

interface ManualConfigEntry {
  name?: string;
  description?: string;
  platform?: PlatformType;
  port?: number;
  url?: string;
  configPath?: string;
}

@Injectable()
export class AppsSyncService implements OnModuleInit {
  constructor(
    @Inject(FIREBASE_FIRESTORE) private readonly firestore: Firestore,
    private readonly logger: AppLoggerService,
  ) {}

  async onModuleInit() {
    const shouldSync = (process.env.SYNC_APPS_ON_STARTUP ?? 'true').toLowerCase() !== 'false';

    if (!shouldSync) {
      this.logger.log('Skipping app sync on startup (SYNC_APPS_ON_STARTUP=false)', AppsSyncService.name);
      return;
    }

    try {
      const result = await this.syncAppsToDatabase();
      this.logger.log('Apps synced on startup', AppsSyncService.name, result);
    } catch (error) {
      this.logger.logError(error instanceof Error ? error : String(error), AppsSyncService.name, {
        event: 'apps.sync.startup.error',
      });
    }
  }

  private resolveAppsDirectory(): string {
    // In Cloud Storage mode, we don't need a local directory
    if (process.env.APPS_CONFIG_BUCKET) {
      // Return a dummy path - we won't use it when Cloud Storage is configured
      return '/tmp/apps';
    }
    
    if (process.env.APPS_DIRECTORY) {
      return process.env.APPS_DIRECTORY;
    }
    // backend runs inside backend/, apps directory lives one level up
    return join(process.cwd(), '..', 'apps');
  }

  private async loadManualConfig(appsDir?: string): Promise<Record<string, ManualConfigEntry>> {
    // Try Cloud Storage first (production)
    if (process.env.APPS_CONFIG_BUCKET) {
      try {
        const storage = new Storage();
        const bucket = storage.bucket(process.env.APPS_CONFIG_BUCKET);
        const file = bucket.file('apps-map.json');
        const [exists] = await file.exists();
        
        if (exists) {
          const [contents] = await file.download();
          const config = JSON.parse(contents.toString('utf-8')) as Record<string, ManualConfigEntry>;
          this.logger.log('Loaded apps-map.json from Cloud Storage', AppsSyncService.name);
          return config;
        }
      } catch (error: any) {
        this.logger.warn(
          `Failed to load apps-map.json from Cloud Storage: ${error?.message ?? error}`,
          AppsSyncService.name,
        );
      }
    }
    
    // Fallback to local filesystem (development)
    const configDir = appsDir ?? this.resolveAppsDirectory();
    const configPath = join(configDir, 'apps-map.json');
    try {
      const raw = await fs.readFile(configPath, 'utf-8');
      const config = JSON.parse(raw) as Record<string, ManualConfigEntry>;
      this.logger.log('Loaded apps-map.json from local filesystem', AppsSyncService.name);
      return config;
    } catch (error: any) {
      if (error?.code !== 'ENOENT') {
        this.logger.warn(`Unable to read ${configPath}: ${error?.message ?? error}`, AppsSyncService.name);
      }
      return {};
    }
  }

  private formatAppName(dirName: string, packageName?: string, manualName?: string): string {
    if (manualName) return manualName;
    if (packageName) {
      return packageName
        .replace(/-app$/, '')
        .replace(/-/g, ' ')
        .replace(/\b\w/g, (letter) => letter.toUpperCase());
    }
    return dirName.replace(/-/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
  }

  private inferPlatform(manualEntry: ManualConfigEntry | undefined, packageJson: any): PlatformType {
    if (manualEntry?.platform) {
      return manualEntry.platform;
    }
    if (packageJson?.dependencies?.electron) {
      return 'desktop';
    }
    if (packageJson?.dependencies?.['react-native']) {
      return 'mobile';
    }
    return 'web';
  }

  private async discoverApps(appsDir: string): Promise<AppMetadata[]> {
    const discovered: AppMetadata[] = [];

    // If using Cloud Storage, we can't discover apps from filesystem
    // Apps must be defined in apps-map.json only
    if (process.env.APPS_CONFIG_BUCKET) {
      const manualConfig = await this.loadManualConfig();
      
      // Convert apps-map.json entries to AppMetadata
      for (const [appId, entry] of Object.entries(manualConfig)) {
        discovered.push({
          name: entry.name || appId,
          description: entry.description || `Application: ${appId}`,
          platform: entry.platform || 'web',
          path: `apps/${appId}`,
          authRequired: false,
          port: entry.port ?? null,
          url: entry.url ?? null,
          configPath: entry.configPath ?? null,
        });
      }
      
      return discovered;
    }

    try {
      await fs.access(appsDir);
    } catch {
      this.logger.warn(`Apps directory not found: ${appsDir}`, AppsSyncService.name);
      return discovered;
    }

    const manualConfig = await this.loadManualConfig(appsDir);
    const entries = await fs.readdir(appsDir, { withFileTypes: true });
    const directories = entries.filter((entry) => entry.isDirectory());

    for (const dir of directories) {
      const appPath = join(appsDir, dir.name);
      const packageJsonPath = join(appPath, 'package.json');
      const readmePath = join(appPath, 'README.md');
      const manualEntry = manualConfig[dir.name] || manualConfig[`apps/${dir.name}`];

      try {
        let packageJson: Record<string, any> = {};
        try {
          const pkgRaw = await fs.readFile(packageJsonPath, 'utf-8');
          packageJson = JSON.parse(pkgRaw);
      } catch (error: any) {
        this.logger.warn(`Could not read package.json for ${dir.name}: ${error?.message ?? error}`, AppsSyncService.name);
        }

        let description = manualEntry?.description || packageJson.description || '';
        try {
          const readmeContent = await fs.readFile(readmePath, 'utf-8');
          const lines = readmeContent
            .split('\n')
            .map((line) => line.trim())
            .filter((line) => line && !line.startsWith('#'));
          if (lines.length > 0) {
            description = lines.slice(0, 3).join(' ').substring(0, 200) || description;
          }
        } catch {
          // README optional
        }

        const platform = this.inferPlatform(manualEntry, packageJson);
        const name = this.formatAppName(dir.name, packageJson.name, manualEntry?.name);

        const port =
          typeof manualEntry?.port === 'number'
            ? manualEntry.port
            : typeof packageJson?.devServer?.port === 'number'
            ? packageJson.devServer.port
            : null;

        const url =
          typeof manualEntry?.url === 'string'
            ? manualEntry.url
            : typeof packageJson?.homepage === 'string'
            ? packageJson.homepage
            : null;

        discovered.push({
          name,
          description: description || `Application located at ${dir.name}`,
          platform,
          path: `apps/${dir.name}`,
          version: packageJson.version,
          authRequired: false,
          port,
          url,
          configPath: manualEntry?.configPath || null,
        });
      } catch (error: any) {
        this.logger.logError(
          error instanceof Error ? error : String(error),
          AppsSyncService.name,
          { event: 'apps.discover.error', appDir: dir.name },
        );
      }
    }

    return discovered;
  }

  async syncAppsToDatabase(customAppsDir?: string) {
    const appsDir = customAppsDir ?? this.resolveAppsDirectory();
    const discoveredApps = await this.discoverApps(appsDir);

    const result = {
      created: 0,
      updated: 0,
      errors: 0,
      total: discoveredApps.length,
    };

    for (const app of discoveredApps) {
      try {
        const appData = {
          name: app.name,
          description: app.description,
          platform: app.platform,
          path: app.path,
          url: app.url ?? null,
          port: typeof app.port === 'number' ? app.port : null,
          configPath: app.configPath ?? null,
          authRequired: app.authRequired !== false,
          status: 'active',
          deploymentType: 'manual',
          healthCheck: {
            lastCheck: new Date(),
            status: 'healthy',
          },
          updatedAt: new Date(),
        };

        const existingQuery = await this.firestore
          .collection('applications')
          .where('path', '==', app.path)
          .limit(1)
          .get();

        if (!existingQuery.empty) {
          const existingDoc = existingQuery.docs[0];
          await existingDoc.ref.update(appData);
          result.updated += 1;
        } else {
          await this.firestore.collection('applications').add({
            ...appData,
            createdAt: new Date(),
          });
          result.created += 1;
        }
      } catch (error: any) {
        result.errors += 1;
        this.logger.logError(
          error instanceof Error ? error : String(error),
          AppsSyncService.name,
          { event: 'apps.sync.error', appName: app.name },
        );
      }
    }

    if (result.total === 0) {
      this.logger.log(`No applications discovered in ${appsDir}`, AppsSyncService.name);
    }

    return result;
  }
}


