import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { FIREBASE_FIRESTORE } from '../firebase/firebase.constants';
import { Firestore } from 'firebase-admin/firestore';
import * as bcrypt from 'bcryptjs';

async function createAdmin() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const firestore = app.get<Firestore>(FIREBASE_FIRESTORE);

  try {
    const email = 'admin@metavr.com';
    const password = 'Admin123!';

    console.log('Creating admin user...');
    console.log(`Email: ${email}`);

    // Check if admin user already exists
    const existingAdminQuery = await firestore
      .collection('users')
      .where('email', '==', email)
      .where('role', '==', 'admin')
      .limit(1)
      .get();

    if (!existingAdminQuery.empty) {
      const existingAdmin = existingAdminQuery.docs[0];
      console.log('⚠️  Admin user already exists!');
      console.log(`   Document ID: ${existingAdmin.id}`);
      
      // Ask if user wants to update password
      const updatePassword = process.argv.includes('--update-password');
      if (updatePassword) {
        const passwordHash = await bcrypt.hash(password, 10);
        await existingAdmin.ref.update({
          passwordHash,
          updatedAt: new Date(),
        });
        console.log('✅ Admin password updated successfully!');
      } else {
        console.log('   Use --update-password flag to update the password');
      }
      await app.close();
      return;
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create admin user
    const adminUser = {
      email,
      displayName: 'System Administrator',
      passwordHash,
      role: 'admin' as const,
      status: 'active' as const,
      metadata: {
        company: 'MetaVR',
        jobTitle: 'System Administrator',
        phone: '+1 (555) 123-4567',
      },
      createdAt: new Date(),
      updatedAt: new Date(),
      lastLoginAt: null,
    };

    // Try to use a fixed document ID first (admin-user)
    const adminDocRef = firestore.collection('users').doc('admin-user');
    const adminDoc = await adminDocRef.get();

    if (adminDoc.exists) {
      // If document exists but with different email/role, create new one
      const existingData = adminDoc.data();
      if (existingData?.email !== email || existingData?.role !== 'admin') {
        await firestore.collection('users').add(adminUser);
        console.log('✅ Admin user created successfully!');
      } else {
        // Update existing
        await adminDocRef.update({
          passwordHash,
          updatedAt: new Date(),
        });
        console.log('✅ Admin user updated successfully!');
      }
    } else {
      // Create new with fixed ID
      await adminDocRef.set(adminUser);
      console.log('✅ Admin user created successfully!');
    }

    console.log('\n📋 Login Credentials:');
    console.log(`   Email: ${email}`);
    console.log(`   Password: ${password}`);
    console.log('\n🌐 Access the application at: https://metavrai.shop/admin/login');

  } catch (error) {
    console.error('❌ Failed to create admin user:', error);
    process.exit(1);
  } finally {
    await app.close();
  }
}

// Run the script
createAdmin();

