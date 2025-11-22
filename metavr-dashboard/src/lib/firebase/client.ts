import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Load Firebase configuration from environment variables
function getFirebaseConfig() {
  let serviceAccount;
  
  // Primary: JSON environment variable (recommended)
  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    try {
      serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
      console.log('✅ Firebase client config loaded from FIREBASE_SERVICE_ACCOUNT_JSON');
    } catch (error) {
      console.error('❌ Error parsing FIREBASE_SERVICE_ACCOUNT_JSON:', error);
      throw new Error('Invalid FIREBASE_SERVICE_ACCOUNT_JSON format');
    }
  }
  // Alternative: Base64 encoded JSON environment variable
  else if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
    try {
      const decodedKey = Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_KEY, 'base64').toString('utf-8');
      serviceAccount = JSON.parse(decodedKey);
      console.log('✅ Firebase client config loaded from FIREBASE_SERVICE_ACCOUNT_KEY (Base64)');
    } catch (error) {
      console.error('❌ Error parsing FIREBASE_SERVICE_ACCOUNT_KEY:', error);
      throw new Error('Invalid FIREBASE_SERVICE_ACCOUNT_KEY format');
    }
  }
  else {
    console.error('❌ Firebase service account not found!');
    console.error('Please set FIREBASE_SERVICE_ACCOUNT_JSON or FIREBASE_SERVICE_ACCOUNT_KEY environment variable.');
    throw new Error('Firebase service account not found. Set FIREBASE_SERVICE_ACCOUNT_JSON or FIREBASE_SERVICE_ACCOUNT_KEY environment variable.');
  }
  
  // Extract Firebase client configuration from service account
  return {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 'AIzaSyDummyKey', // Fallback for API key
    authDomain: `${serviceAccount.project_id}.firebaseapp.com`,
    projectId: serviceAccount.project_id,
    storageBucket: `${serviceAccount.project_id}.appspot.com`,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '123456789', // Fallback
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '1:123456789:web:abcdef', // Fallback
  };
}

const firebaseConfig = getFirebaseConfig();

// Initialize Firebase
const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const storage = getStorage(app);

export default app;
