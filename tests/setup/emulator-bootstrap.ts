// tests/setup/emulator-bootstrap.ts
// Sets emulator env so Admin SDK / @firebase/rules-unit-testing connect locally.
process.env.FIRESTORE_EMULATOR_HOST =
  process.env.FIRESTORE_EMULATOR_HOST ?? "127.0.0.1:8080";
process.env.FIREBASE_AUTH_EMULATOR_HOST =
  process.env.FIREBASE_AUTH_EMULATOR_HOST ?? "127.0.0.1:9099";
process.env.GCLOUD_PROJECT = "trivix-dev";
process.env.FIREBASE_PROJECT_ID = "trivix-dev";
process.env.USE_FIREBASE_EMULATORS = "true";
