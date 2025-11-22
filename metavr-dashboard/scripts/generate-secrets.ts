#!/usr/bin/env tsx

/**
 * Generate secure secrets for MetaVR Dashboard
 * This script generates cryptographically secure random strings for:
 * - SESSION_SECRET: Used for JWT token signing
 * - ADMIN_SETUP_TOKEN: Used for admin user creation
 */

import { randomBytes } from 'crypto';

function generateSecureSecret(length: number = 32): string {
  return randomBytes(length).toString('base64');
}

function generateSessionSecret(): string {
  return generateSecureSecret(32);
}

function generateAdminSetupToken(): string {
  return generateSecureSecret(32);
}

function main() {
  console.log('🔐 MetaVR Dashboard - Secret Generator');
  console.log('=====================================\n');
  
  const sessionSecret = generateSessionSecret();
  const adminSetupToken = generateAdminSetupToken();
  
  console.log('Generated secure secrets:');
  console.log('========================\n');
  
  console.log('SESSION_SECRET=' + sessionSecret);
  console.log('ADMIN_SETUP_TOKEN=' + adminSetupToken);
  
  console.log('\n📋 Instructions:');
  console.log('================');
  console.log('1. Copy these values to your .env.local file');
  console.log('2. Replace the placeholder values in .env.local');
  console.log('3. Keep these secrets secure and never commit them to version control');
  console.log('4. Use different secrets for development and production');
  
  console.log('\n⚠️  Security Notes:');
  console.log('==================');
  console.log('- SESSION_SECRET: Used for signing JWT tokens (32 bytes = 256 bits)');
  console.log('- ADMIN_SETUP_TOKEN: Used for admin user creation API protection');
  console.log('- These are cryptographically secure random values');
  console.log('- Generate new secrets for each environment (dev/staging/prod)');
}

// Run the script
main();
