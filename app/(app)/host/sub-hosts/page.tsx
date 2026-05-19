import { redirect } from "next/navigation";
import { adminDb } from "@/lib/firebase/admin";
import { verifySession } from "@/lib/firebase/session";
import { checkAndExpireHost } from "@/lib/host/expiration";
import { Card } from "@/components/ui/Card";
import {
  SubHostsManager,
  type SubHostEntry,
} from "@/components/host/SubHostsManager";

export const dynamic = "force-dynamic";

export default async function SubHostsPage() {
  const session = await verifySession();
  if (!session) redirect("/login");
  await checkAndExpireHost(session.uid);

  const userSnap = await adminDb.collection("users").doc(session.uid).get();
  if (!userSnap.exists) redirect("/dashboard");
  const u = userSnap.data() ?? {};
  if (
    u.role !== "host" ||
    u.hostStatus !== "approved" ||
    (u.mainHostUid ?? null) !== null
  ) {
    redirect("/host");
  }

  const subUids = (u.subHostUids as string[] | undefined) ?? [];
  const cap = Number(u.subHostCap ?? 0);
  const subs: SubHostEntry[] = [];
  if (subUids.length > 0) {
    const snaps = await Promise.all(
      subUids.map((id) => adminDb.collection("users").doc(id).get()),
    );
    for (const s of snaps) {
      if (!s.exists) continue;
      const d = s.data() ?? {};
      subs.push({
        uid: s.id,
        displayName: String(d.displayName ?? ""),
        email: String(d.email ?? ""),
      });
    }
  }

  return (
    <main className="min-h-screen px-6 py-10 md:px-12 md:py-14 max-w-3xl mx-auto">
      <h1 className="font-display text-4xl tracking-[3px] mb-2">SUB-HOSTS</h1>
      <p className="text-text-muted mb-8">
        Manage your sub-hosts ({subs.length} / {cap}).
      </p>
      {cap === 0 ? (
        <Card>
          <div className="p-5 text-text-muted text-sm">
            You don&apos;t have any sub-host slots. Ask an admin to raise your
            limit.
          </div>
        </Card>
      ) : (
        <SubHostsManager subs={subs} cap={cap} />
      )}
    </main>
  );
}
