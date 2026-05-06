/**
 * Emulator seed: creates a known set of users for tests + manual dev.
 * Spec §3.4 fixtures: admin, pendingHost, approvedHost, captain, player, teamlessPlayer.
 *
 * Usage (server-side, against running emulators):
 *   await seedEmulator(); // populates auth + firestore
 */

import { adminAuth, adminDb } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";
import { DEFAULT_USER_STATS, type Role, type HostStatus } from "@/types/firestore";

interface SeedSpec {
  uid: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  displayName: string;
  role: Role;
  hostStatus: HostStatus;
  isAdmin: boolean;
  emailVerified: boolean;
}

export const SEED_USERS: SeedSpec[] = [
  {
    uid: "seed-admin",
    email: "admin@trivix.test",
    password: "password123",
    firstName: "Anna",
    lastName: "Admin",
    displayName: "anna_admin",
    role: "player",
    hostStatus: "none",
    isAdmin: true,
    emailVerified: true,
  },
  {
    uid: "seed-pending-host",
    email: "pendinghost@trivix.test",
    password: "password123",
    firstName: "Pat",
    lastName: "Pending",
    displayName: "pat_pending",
    role: "host",
    hostStatus: "pending",
    isAdmin: false,
    emailVerified: true,
  },
  {
    uid: "seed-approved-host",
    email: "approvedhost@trivix.test",
    password: "password123",
    firstName: "Hank",
    lastName: "Host",
    displayName: "hank_host",
    role: "host",
    hostStatus: "approved",
    isAdmin: false,
    emailVerified: true,
  },
  {
    uid: "seed-captain",
    email: "captain@trivix.test",
    password: "password123",
    firstName: "Cap",
    lastName: "Tain",
    displayName: "cap_tain",
    role: "player",
    hostStatus: "none",
    isAdmin: false,
    emailVerified: true,
  },
  {
    uid: "seed-player",
    email: "player@trivix.test",
    password: "password123",
    firstName: "Penny",
    lastName: "Player",
    displayName: "penny_player",
    role: "player",
    hostStatus: "none",
    isAdmin: false,
    emailVerified: true,
  },
  {
    uid: "seed-teamless",
    email: "teamless@trivix.test",
    password: "password123",
    firstName: "Tess",
    lastName: "Teamless",
    displayName: "tess_teamless",
    role: "player",
    hostStatus: "none",
    isAdmin: false,
    emailVerified: true,
  },
];

export async function seedEmulator(): Promise<void> {
  const now = FieldValue.serverTimestamp();
  for (const u of SEED_USERS) {
    // Auth
    await adminAuth
      .createUser({
        uid: u.uid,
        email: u.email,
        password: u.password,
        emailVerified: u.emailVerified,
        displayName: u.displayName,
      })
      .catch(async (err) => {
        if (err?.code === "auth/uid-already-exists") {
          await adminAuth.updateUser(u.uid, {
            email: u.email,
            password: u.password,
            emailVerified: u.emailVerified,
          });
          return;
        }
        throw err;
      });

    // Firestore: users + displayNames + (optional) hostApplication
    const userRef = adminDb.collection("users").doc(u.uid);
    const dnRef = adminDb
      .collection("displayNames")
      .doc(u.displayName.toLowerCase());

    const batch = adminDb.batch();
    batch.set(userRef, {
      uid: u.uid,
      email: u.email,
      emailVerified: u.emailVerified,
      firstName: u.firstName,
      lastName: u.lastName,
      displayName: u.displayName,
      displayNameKey: u.displayName.toLowerCase(),
      avatarSeed: u.uid,
      role: u.role,
      hostStatus: u.hostStatus,
      isAdmin: u.isAdmin,
      teamId: null,
      teamHistory: [],
      stats: DEFAULT_USER_STATS,
      createdAt: now,
      updatedAt: now,
    });
    batch.set(dnRef, { uid: u.uid });

    if (u.role === "host") {
      const appRef = adminDb.collection("hostApplications").doc(u.uid);
      batch.set(appRef, {
        uid: u.uid,
        email: u.email,
        displayName: u.displayName,
        reason: null,
        status: u.hostStatus === "approved" ? "approved" : "pending",
        appliedAt: now,
        decidedAt: u.hostStatus === "approved" ? now : null,
        decidedBy: u.hostStatus === "approved" ? "seed-admin" : null,
      });
    }
    await batch.commit();
  }
}

export async function clearSeed(): Promise<void> {
  for (const u of SEED_USERS) {
    await adminAuth.deleteUser(u.uid).catch(() => {});
    await adminDb.collection("users").doc(u.uid).delete().catch(() => {});
    await adminDb
      .collection("displayNames")
      .doc(u.displayName.toLowerCase())
      .delete()
      .catch(() => {});
    await adminDb
      .collection("hostApplications")
      .doc(u.uid)
      .delete()
      .catch(() => {});
  }
}
