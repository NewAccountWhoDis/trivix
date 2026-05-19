import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { adminDb } from "@/lib/firebase/admin";
import { verifySession } from "@/lib/firebase/session";
import { checkAndExpireHost } from "@/lib/host/expiration";
import { serializeUser } from "@/lib/user/serialize";
import { UserProvider } from "@/components/auth/UserProvider";
import { AppHeader } from "@/components/layout/AppHeader";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const session = await verifySession();
  if (!session) {
    redirect("/login");
  }

  // Lazy host-expiration check — keeps UI fresh without a scheduled job.
  await checkAndExpireHost(session.uid);

  const userSnap = await adminDb.collection("users").doc(session.uid).get();
  if (!userSnap.exists) {
    // Orphan Auth account — user closed tab between wizard steps.
    redirect("/signup?step=2");
  }

  if (userSnap.data()?.archived === true) {
    redirect("/account-removed");
  }

  const user = serializeUser(session.uid, userSnap.data() ?? {});

  return (
    <UserProvider user={user}>
      <AppHeader />
      {children}
    </UserProvider>
  );
}
