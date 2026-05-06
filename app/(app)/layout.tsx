import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { adminDb } from "@/lib/firebase/admin";
import { verifySession } from "@/lib/firebase/session";
import { serializeUser } from "@/lib/user/serialize";
import { UserProvider } from "@/components/auth/UserProvider";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const session = await verifySession();
  if (!session) {
    redirect("/login");
  }

  const userSnap = await adminDb.collection("users").doc(session.uid).get();
  if (!userSnap.exists) {
    // Orphan Auth account — user closed tab between wizard steps.
    redirect("/signup?step=2");
  }

  if (!session.emailVerified) {
    redirect("/verify-email");
  }

  const user = serializeUser(session.uid, userSnap.data() ?? {});

  return <UserProvider user={user}>{children}</UserProvider>;
}
