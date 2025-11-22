import { promises as fs } from 'fs';
import { join, basename } from 'path';
import { db } from '@/lib/firebase/admin';
import { writeLog } from '@/lib/logger';

interface AppMetadata {
  name: string;
  description: string;
  platform: 'web' | 'desktop' | 'mobile';
  path: string;
  version?: string;
  authRequired?: boolean;
  port?: number | null;
  url?: string | null;
  configPath?: string | null;
}

/**
 * Scans the apps directory and discovers applications
 */
export async function discoverApps(appsDir?: string): Promise<AppMetadata[]> {
  // Default to ../apps relative to the project root (metavr-dashboard)
  if (!appsDir) {
    appsDir = join(process.cwd(), '..', 'apps');
  }
  const discoveredApps: AppMetadata[] = [];

  try {
    // Check if apps directory exists
    try {
      await fs.access(appsDir);
    } catch {
      console.warn(`Apps directory not found: ${appsDir}`);
      return discoveredApps;
    }

    let manualConfig: Record<
      string,
      {
        name?: string;
        description?: string;
        platform?: 'web' | 'desktop' | 'mobile';
        port?: number;
        url?: string;
        configPath?: string;
      }
    > = {};

    const configPath = join(appsDir, 'apps-map.json');
    try {
      const rawConfig = await fs.readFile(configPath, 'utf-8');
      manualConfig = JSON.parse(rawConfig);
    } catch (error: any) {
      if (error?.code !== 'ENOENT') {
        console.warn(`Unable to read ${configPath}:`, error);
      }
    }

    // Directories to ignore when scanning for apps
    const ignoredDirs = ['logs', 'node_modules', '.git', '.next', 'dist', 'build', '.cache'];
    
    // Read all directories in apps folder
    const entries = await fs.readdir(appsDir, { withFileTypes: true });
    const appDirs = entries.filter(entry => 
      entry.isDirectory() && !ignoredDirs.includes(entry.name)
    );

    for (const appDir of appDirs) {
      const appPath = join(appsDir, appDir.name);
      const packageJsonPath = join(appPath, 'package.json');
      const readmePath = join(appPath, 'README.md');
      const manualEntry = manualConfig[appDir.name] || manualConfig[`apps/${appDir.name}`];

      try {
        // Read package.json
        let packageJson: any = {};
        try {
          const packageJsonContent = await fs.readFile(packageJsonPath, 'utf-8');
          packageJson = JSON.parse(packageJsonContent);
        } catch (error) {
          console.warn(`Could not read package.json for ${appDir.name}:`, error);
        }

        const manualDescription = (manualEntry?.description || '').trim();
        // Read README.md for description (only if we don't already have a manual description)
        let description = manualDescription || packageJson.description || '';
        if (!manualDescription) {
          try {
            const readmeContent = await fs.readFile(readmePath, 'utf-8');
            // Extract first paragraph or first few lines as description
            const lines = readmeContent.split('\n').filter(line => line.trim() && !line.startsWith('#'));
            if (lines.length > 0) {
              description = lines.slice(0, 3).join(' ').substring(0, 200) || description;
            }
          } catch (error) {
            // README is optional
          }
        }

        // Determine platform based on package.json or directory structure
        let platform: 'web' | 'desktop' | 'mobile' =
          (manualEntry?.platform as 'web' | 'desktop' | 'mobile') || 'web';
        if (!manualEntry?.platform) {
          if (packageJson.dependencies?.next || packageJson.dependencies?.react) {
            platform = 'web';
          } else if (packageJson.dependencies?.electron) {
            platform = 'desktop';
          } else if (packageJson.dependencies?.['react-native']) {
            platform = 'mobile';
          }
        }

        // Generate app name from directory name or package.json
        const appName = manualEntry?.name
          ? manualEntry.name
          : packageJson.name
          ? packageJson.name.replace(/-app$/, '').replace(/-/g, ' ').replace(/\b\w/g, (l: string) =>
              l.toUpperCase(),
            )
          : appDir.name.replace(/-/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());

        const mappedPort =
          typeof manualEntry?.port === 'number'
            ? manualEntry.port
            : typeof packageJson?.devServer?.port === 'number'
            ? packageJson.devServer.port
            : null;

        const mappedUrl =
          typeof manualEntry?.url === 'string'
            ? manualEntry.url
            : typeof packageJson?.homepage === 'string'
            ? packageJson.homepage
            : null;

        discoveredApps.push({
          name: appName,
          description: description || `Application located at ${appDir.name}`,
          platform,
          path: `apps/${appDir.name}`,
          version: packageJson.version,
          authRequired: false, // Default to false, can be overridden
          port: mappedPort,
          url: mappedUrl,
          configPath: manualEntry?.configPath || null,
        });
      } catch (error) {
        console.error(`Error processing app ${appDir.name}:`, error);
      }
    }
  } catch (error) {
    console.error('Error discovering apps:', error);
    throw error;
  }

  return discoveredApps;
}

/**
 * Syncs discovered apps with Firestore database
 * Creates new apps or updates existing ones based on path
 */
export async function syncAppsToDatabase(appsDir?: string): Promise<{ created: number; updated: number; deleted: number; errors: number }> {
  const result = { created: 0, updated: 0, deleted: 0, errors: 0 };

  try {
    // Use the same default path logic as discoverApps
    if (!appsDir) {
      appsDir = join(process.cwd(), '..', 'apps');
    }
    const discoveredApps = await discoverApps(appsDir);
    const discoveredPaths = new Set(discoveredApps.map(app => app.path));

    // Get all existing apps from database
    const allAppsSnapshot = await db.collection('applications').get();
    const existingApps = allAppsSnapshot.docs.map(doc => ({
      id: doc.id,
      path: doc.data().path,
      name: doc.data().name,
    }));

    // Delete apps that are no longer discovered (e.g., logs directory)
    const ignoredPaths = ['logs', 'node_modules', '.git', '.next', 'dist', 'build', '.cache'];
    for (const existingApp of existingApps) {
      if (!existingApp.path) continue;
      
      // Check if app path ends with an ignored directory name
      const pathParts = existingApp.path.split('/');
      const lastPart = pathParts[pathParts.length - 1];
      
      // Delete if not in discovered apps and is an ignored path
      if (!discoveredPaths.has(existingApp.path) && ignoredPaths.includes(lastPart)) {
        try {
          await db.collection('applications').doc(existingApp.id).delete();
          result.deleted++;
          console.log(`Deleted ignored app: ${existingApp.name} (${existingApp.path})`);
        } catch (error) {
          console.error(`Error deleting app ${existingApp.name}:`, error);
          result.errors++;
        }
      }
    }

    for (const app of discoveredApps) {
      try {
        // Check if app already exists by path
        const existingAppsQuery = await db.collection('applications')
          .where('path', '==', app.path)
          .limit(1)
          .get();

        const appData = {
          name: app.name,
          description: app.description,
          platform: app.platform,
          path: app.path,
          url: app.url || null,
          port: typeof app.port === 'number' ? app.port : null,
          configPath: app.configPath || null,
          authRequired: app.authRequired !== false,
          status: 'active',
          deploymentType: 'manual',
          healthCheck: {
            lastCheck: new Date(),
            status: 'healthy',
          },
          updatedAt: new Date(),
        };

        if (!existingAppsQuery.empty) {
          // Update existing app
          const existingAppDoc = existingAppsQuery.docs[0];
          await existingAppDoc.ref.update({
            ...appData,
            // Preserve createdAt
          });
          result.updated++;
          console.log(`Updated app: ${app.name} (${app.path})`);
        } else {
          // Create new app
          await db.collection('applications').add({
            ...appData,
            createdAt: new Date(),
          });
          result.created++;
          console.log(`Created app: ${app.name} (${app.path})`);
        }
      } catch (error) {
        console.error(`Error syncing app ${app.name}:`, error);
        result.errors++;
      }
    }

    await writeLog('apps.sync.success', {
      created: result.created,
      updated: result.updated,
      deleted: result.deleted,
      errors: result.errors,
      total: discoveredApps.length,
    });

    return result;
  } catch (error) {
    console.error('Error syncing apps to database:', error);
    await writeLog('apps.sync.error', { error: String(error) });
    throw error;
  }
}

