#!/usr/bin/env node
/**
 * Script to update application URLs in Firestore by app ID
 * Usage: node scripts/update-app-urls-by-id.js <app_id> <app_url> [firebase_service_account_json]
 */

const path = require('path');
const fs = require('fs');

// Try to load firebase-admin from backend node_modules first, then try root
let admin;
try {
  // Try backend node_modules
  const backendAdminPath = path.join(__dirname, '..', 'backend', 'node_modules', 'firebase-admin');
  if (fs.existsSync(backendAdminPath)) {
    admin = require(backendAdminPath);
  } else {
    // Try root node_modules
    admin = require('firebase-admin');
  }
} catch (error) {
  console.error('Failed to load firebase-admin. Please install it:');
  console.error('  npm install firebase-admin (in backend directory)');
  process.exit(1);
}

// Get command line arguments
const appId = process.argv[2];
const appUrl = process.argv[3];
const serviceAccountJson = process.argv[4] || process.env.FIREBASE_SERVICE_ACCOUNT_JSON;

if (!appId || !appUrl) {
  console.error('Usage: node scripts/update-app-urls-by-id.js <app_id> <app_url> [firebase_service_account_json]');
  process.exit(1);
}

// Initialize Firebase Admin
if (!admin.apps.length) {
  try {
    if (serviceAccountJson) {
      const serviceAccount = JSON.parse(serviceAccountJson);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
    } else {
      // Try to use default credentials or service account file
      const serviceAccountPath = path.join(__dirname, '..', 'firebase-service-account.json');
      try {
        const serviceAccount = require(serviceAccountPath);
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
        });
      } catch (error) {
        // Try default credentials (for GCP environments)
        admin.initializeApp();
      }
    }
  } catch (error) {
    console.error('Failed to initialize Firebase Admin:', error.message);
    process.exit(1);
  }
}

const db = admin.firestore();

async function updateAppUrl() {
  try {
    console.log(`Updating application with ID: ${appId}`);
    
    // Get application document by ID
    const appRef = db.collection('applications').doc(appId);
    const appDoc = await appRef.get();
    
    if (!appDoc.exists) {
      console.log(`⚠️  Application with ID '${appId}' not found in database.`);
      console.log(`   URL: ${appUrl}`);
      process.exit(1);
    }
    
    const appData = appDoc.data();
    
    console.log(`Found application: ${appData.name} (ID: ${appId})`);
    console.log(`Updating URL from '${appData.url || 'null'}' to '${appUrl}'`);
    
    // Update the URL
    await appRef.update({
      url: appUrl,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    
    console.log(`✅ Successfully updated application URL`);
    console.log(`   App: ${appData.name}`);
    console.log(`   ID: ${appId}`);
    console.log(`   URL: ${appUrl}`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error updating application URL:', error.message);
    process.exit(1);
  }
}

updateAppUrl();

