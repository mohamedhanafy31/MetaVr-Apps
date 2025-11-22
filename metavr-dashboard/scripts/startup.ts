#!/usr/bin/env tsx

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

/**
 * Checks if a file exists
 */
function fileExists(filePath: string): boolean {
  try {
    return fs.existsSync(filePath);
  } catch {
    return false;
  }
}

/**
 * Runs the download script
 */
async function runDownload(): Promise<void> {
  try {
    console.log('🔄 Running file download script...');
    execSync('tsx scripts/download-file.ts', { 
      stdio: 'inherit',
      cwd: process.cwd()
    });
    console.log('✅ Download script completed');
  } catch (error) {
    console.warn('⚠️  Download script failed, continuing with startup...');
    console.warn('Error:', error);
  }
}

/**
 * Starts the Next.js development server
 */
function startDevServer(): void {
  try {
    console.log('🚀 Starting Next.js development server...');
    execSync('npm run dev', { 
      stdio: 'inherit',
      cwd: process.cwd()
    });
  } catch (error) {
    console.error('❌ Failed to start development server:', error);
    process.exit(1);
  }
}

/**
 * Main startup function - FORCES download before starting
 */
async function main() {
  console.log('🎯 MetaVR Dashboard Startup Script');
  console.log('================================');
  
  // ALWAYS download credentials - no skipping
  console.log('📥 Downloading Firebase credentials (FORCED)...');
  await runDownload();
  
  // Verify the file exists and is valid
  const credentialPath = path.join(process.cwd(), 'downloads', 'firebase-service-account.json');
  if (!fileExists(credentialPath)) {
    console.error('❌ CRITICAL: Firebase credentials not found after download!');
    console.error(`Expected: ${credentialPath}`);
    process.exit(1);
  }
  
  // Validate JSON structure
  try {
    // Use fs.readFileSync for Next.js build compatibility
    const serviceAccountContent = fs.readFileSync(credentialPath, 'utf8');
    const serviceAccount = JSON.parse(serviceAccountContent);
    if (!serviceAccount.project_id || !serviceAccount.private_key) {
      throw new Error('Invalid service account structure');
    }
    console.log('✅ Firebase credentials validated successfully');
    console.log(`📁 Project ID: ${serviceAccount.project_id}`);
  } catch (error) {
    console.error('❌ CRITICAL: Invalid Firebase credentials!');
    console.error('Error:', error);
    process.exit(1);
  }
  
  // Start the development server
  startDevServer();
}

// Run the startup script
main().catch((error) => {
  console.error('💥 Startup failed:', error);
  process.exit(1);
});
