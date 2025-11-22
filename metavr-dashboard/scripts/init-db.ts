import { db } from '@/lib/firebase/admin';
import { hashPassword } from '@/lib/auth/session';

async function initializeDatabase() {
  try {
    console.log('Initializing MetaVR database...');

    // Create admin user
    const adminPassword = await hashPassword('Admin123!');
    const adminUser = {
      email: 'admin@metavr.com',
      displayName: 'System Administrator',
      passwordHash: adminPassword,
      role: 'admin',
      status: 'active',
      metadata: {
        company: 'MetaVR',
        jobTitle: 'System Administrator',
        phone: '+1 (555) 123-4567',
      },
      createdAt: new Date(),
      updatedAt: new Date(),
      lastLoginAt: null,
    };

    await db.collection('users').doc('admin-user').set(adminUser);
    console.log('✅ Admin user created: admin@metavr.com / Admin123!');

    // Create sample applications
    const applications = [
      {
        name: 'VR Training Simulator',
        description: 'Immersive VR training environment for corporate learning',
        platform: 'desktop',
        status: 'active',
        authRequired: true,
        iconUrl: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastHealthCheck: new Date(),
      },
      {
        name: 'AR Design Studio',
        description: 'Augmented reality design and prototyping tool',
        platform: 'mobile',
        status: 'active',
        authRequired: true,
        iconUrl: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastHealthCheck: new Date(),
      },
      {
        name: 'Metaverse Conference Room',
        description: 'Virtual meeting spaces for remote collaboration',
        platform: 'web',
        status: 'maintenance',
        authRequired: false,
        iconUrl: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastHealthCheck: new Date(),
      },
    ];

    for (const app of applications) {
      await db.collection('applications').add(app);
    }
    console.log('✅ Sample applications created');

    // Create sample access requests
    const accessRequests = [
      {
        fullName: 'John Smith',
        email: 'john.smith@techcorp.com',
        company: 'TechCorp Inc.',
        jobTitle: 'Software Engineer',
        phone: '+1 (555) 987-6543',
        applicationId: 'vr-training-simulator',
        useCase: 'We want to evaluate VR training for our software development team onboarding process.',
        status: 'pending',
        createdAt: new Date(),
        processedAt: null,
        processedBy: null,
        notes: null,
      },
      {
        fullName: 'Sarah Johnson',
        email: 'sarah.johnson@designstudio.com',
        company: 'Design Studio LLC',
        jobTitle: 'Creative Director',
        phone: '+1 (555) 456-7890',
        applicationId: 'ar-design-studio',
        useCase: 'Looking to integrate AR design tools into our creative workflow for client presentations.',
        status: 'pending',
        createdAt: new Date(),
        processedAt: null,
        processedBy: null,
        notes: null,
      },
    ];

    for (const request of accessRequests) {
      await db.collection('accessRequests').add(request);
    }
    console.log('✅ Sample access requests created');

    console.log('🎉 Database initialization completed successfully!');
    console.log('\n📋 Login Credentials:');
    console.log('Email: admin@metavr.com');
    console.log('Password: Admin123!');
    console.log('\n🌐 Access the application at: http://localhost:3000');

  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    process.exit(1);
  }
}

// Run the initialization
initializeDatabase();
