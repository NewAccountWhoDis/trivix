import Link from "next/link";
import { redirect } from "next/navigation";
import { adminDb } from "@/lib/firebase/admin";
import { verifySession } from "@/lib/firebase/session";
import { HostApplicationForm } from "./HostApplicationForm";

export const dynamic = "force-dynamic";

export default async function HostApplicationPage() {
  const session = await verifySession();
  if (!session) redirect("/login?next=/host-application");

  const userSnap = await adminDb.collection("users").doc(session.uid).get();
  const u = userSnap.data() ?? {};

  if (u.hostStatus === "approved") {
    redirect("/host");
  }
  if (u.hostStatus === "pending") {
    redirect("/profile");
  }

  return (
    <main className="min-h-screen px-6 py-10 md:px-12 md:py-14 max-w-xl mx-auto">
      <Link
        href="/profile"
        className="text-sm text-text-muted hover:text-text-primary"
      >
        ← Back to profile
      </Link>
      <h1 className="font-display text-4xl tracking-[3px] mb-2 mt-4">
        REQUEST HOST ACCESS
      </h1>
      <p className="text-text-muted mb-8">
        Tell us about your venue. An admin will review and decide.
      </p>
      <HostApplicationForm />
    </main>
  );
}
