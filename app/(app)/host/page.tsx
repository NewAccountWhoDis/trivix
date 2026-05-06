import { redirect } from "next/navigation";
import Link from "next/link";
import { adminDb } from "@/lib/firebase/admin";
import { verifySession } from "@/lib/firebase/session";
import { Card } from "@/components/ui/Card";

export default async function HostPage() {
  const session = await verifySession();
  if (!session) redirect("/login?next=/host");

  const userSnap = await adminDb.collection("users").doc(session.uid).get();
  const u = userSnap.data() ?? {};
  const role = u.role as string | undefined;
  const hostStatus = u.hostStatus as string | undefined;

  if (role !== "host" || hostStatus !== "approved") {
    return (
      <main className="min-h-screen px-6 py-10 md:px-12 md:py-14 max-w-2xl mx-auto">
        <h1 className="font-display text-4xl tracking-[3px] mb-4">HOST TOOLS</h1>
        <Card>
          <div className="p-6">
            <p className="text-text-muted">
              {hostStatus === "pending"
                ? "Your host application is still under review."
                : "Host tools are only available to approved hosts."}
            </p>
            <p className="mt-4">
              <Link href="/dashboard" className="text-brand-red hover:underline">
                Back to dashboard
              </Link>
            </p>
          </div>
        </Card>
      </main>
    );
  }

  return (
    <main className="min-h-screen px-6 py-10 md:px-12 md:py-14 max-w-3xl mx-auto">
      <h1 className="font-display text-4xl tracking-[3px] mb-2">HOST TOOLS</h1>
      <p className="text-text-muted mb-8">
        Game-night tools land in a future slice. You&apos;re approved.
      </p>
      <Card variant="neon">
        <div className="p-6">
          <p className="text-text-muted">
            Coming soon: build a question set, start a live game, manage venues.
          </p>
        </div>
      </Card>
    </main>
  );
}
