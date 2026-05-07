import { Timestamp } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { verifySession } from "@/lib/firebase/session";
import { UsersTable, type AdminUserRow } from "./UsersTable";

function tsToMs(value: unknown): number {
  if (value instanceof Timestamp) return value.toMillis();
  return 0;
}

export default async function AdminUsersPage() {
  const session = await verifySession();
  const snap = await adminDb
    .collection("users")
    .orderBy("createdAt", "asc")
    .get();

  const users: AdminUserRow[] = snap.docs.map((d) => {
    const data = d.data();
    return {
      uid: d.id,
      email: String(data.email ?? ""),
      displayName: String(data.displayName ?? ""),
      role: (data.role as "player" | "host") ?? "player",
      hostStatus:
        (data.hostStatus as "none" | "pending" | "approved" | "denied") ??
        "none",
      isAdmin: Boolean(data.isAdmin),
      teamId: (data.teamId as string | null | undefined) ?? null,
      createdAt: tsToMs(data.createdAt),
    };
  });

  return (
    <div>
      <h1 className="font-display text-3xl tracking-[3px] mb-6">USERS</h1>
      <UsersTable users={users} currentAdminUid={session?.uid ?? null} />
    </div>
  );
}
