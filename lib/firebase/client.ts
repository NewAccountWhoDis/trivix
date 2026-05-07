// lib/firebase/client.ts
import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAuth, connectAuthEmulator } from "firebase/auth";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";

// Fallbacks let static prerender succeed when NEXT_PUBLIC_* env vars are
// absent (e.g. CI build step). At runtime the real env values populate
// these and Firebase connects to the real project.
const config = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "build-stub-key",
  authDomain:
    process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ||
    "build-stub.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "build-stub",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:0:web:0",
};

function ensureApp(): FirebaseApp {
  if (getApps().length) return getApp();
  return initializeApp(config);
}

export const firebaseApp = ensureApp();
export const firebaseAuth = getAuth(firebaseApp);
export const firebaseDb = getFirestore(firebaseApp);

if (
  typeof window !== "undefined" &&
  process.env.NEXT_PUBLIC_USE_EMULATORS === "true" &&
  !(globalThis as { __TRIVIX_EMU__?: boolean }).__TRIVIX_EMU__
) {
  connectAuthEmulator(firebaseAuth, "http://127.0.0.1:9099", {
    disableWarnings: true,
  });
  connectFirestoreEmulator(firebaseDb, "127.0.0.1", 8080);
  (globalThis as { __TRIVIX_EMU__?: boolean }).__TRIVIX_EMU__ = true;
}
