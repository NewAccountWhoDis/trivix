// lib/firebase/admin.ts
import "server-only";
import {
  getApps,
  initializeApp,
  cert,
  applicationDefault,
  type App,
} from "firebase-admin/app";
import {
  getAuth as getAdminAuth,
  type Auth,
} from "firebase-admin/auth";
import {
  getFirestore as getAdminFirestore,
  type Firestore,
} from "firebase-admin/firestore";

let _app: App | null = null;
let _auth: Auth | null = null;
let _db: Firestore | null = null;

function getAdminApp(): App {
  if (_app) return _app;
  if (getApps().length) {
    _app = getApps()[0]!;
    return _app;
  }
  const useEmulator = process.env.USE_FIREBASE_EMULATORS === "true";
  if (useEmulator) {
    process.env.FIRESTORE_EMULATOR_HOST ||= "127.0.0.1:8080";
    process.env.FIREBASE_AUTH_EMULATOR_HOST ||= "127.0.0.1:9099";
    _app = initializeApp({
      projectId: process.env.FIREBASE_PROJECT_ID || "trivix-dev",
    });
    return _app;
  }
  const sa = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (sa) {
    _app = initializeApp({ credential: cert(JSON.parse(sa)) });
    return _app;
  }
  _app = initializeApp({ credential: applicationDefault() });
  return _app;
}

/**
 * Lazy proxies. Initialization is deferred to first property access so
 * the SDK isn't constructed at import time during the Next build, which
 * runs without service-account env on CI.
 */
export const adminApp = new Proxy({} as App, {
  get(_target, prop) {
    return Reflect.get(getAdminApp(), prop, getAdminApp());
  },
});

export const adminAuth = new Proxy({} as Auth, {
  get(_target, prop) {
    if (!_auth) _auth = getAdminAuth(getAdminApp());
    return Reflect.get(_auth, prop, _auth);
  },
});

export const adminDb = new Proxy({} as Firestore, {
  get(_target, prop) {
    if (!_db) _db = getAdminFirestore(getAdminApp());
    return Reflect.get(_db, prop, _db);
  },
});
