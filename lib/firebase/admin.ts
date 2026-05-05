// lib/firebase/admin.ts
import 'server-only';
import { getApps, initializeApp, cert, applicationDefault, type App } from 'firebase-admin/app';
import { getAuth as getAdminAuth } from 'firebase-admin/auth';
import { getFirestore as getAdminFirestore } from 'firebase-admin/firestore';

function getAdminApp(): App {
  if (getApps().length) return getApps()[0]!;
  const useEmulator = process.env.USE_FIREBASE_EMULATORS === 'true';
  if (useEmulator) {
    process.env.FIRESTORE_EMULATOR_HOST ||= '127.0.0.1:8080';
    process.env.FIREBASE_AUTH_EMULATOR_HOST ||= '127.0.0.1:9099';
    return initializeApp({ projectId: process.env.FIREBASE_PROJECT_ID || 'trivix-dev' });
  }
  const sa = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (sa) {
    return initializeApp({ credential: cert(JSON.parse(sa)) });
  }
  return initializeApp({ credential: applicationDefault() });
}

export const adminApp = getAdminApp();
export const adminAuth = getAdminAuth(adminApp);
export const adminDb = getAdminFirestore(adminApp);
