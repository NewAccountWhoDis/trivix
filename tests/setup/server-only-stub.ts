// Stub for the `server-only` package during tests. Vitest doesn't run inside
// an RSC, so the real package's import-time throw fires; this empty module
// silences it without changing production behavior.
export {};
