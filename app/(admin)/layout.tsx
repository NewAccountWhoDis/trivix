import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { adminDb } from "@/lib/firebase/admin";
import { verifySession } from "@/lib/firebase/session";
import { Badge } from "@/components/ui/Badge";
import { AdminNav } from "@/components/admin/AdminNav";

export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await verifySession();
  if (!session) redirect("/login?next=/admin");

  const userSnap = await adminDb.collection("users").doc(session.uid).get();
  if (!userSnap.exists) redirect("/dashboard");
  const isAdmin = Boolean(userSnap.data()?.isAdmin);
  if (!isAdmin) redirect("/dashboard");

  return (
    <div className="min-h-screen bg-brand-black text-text-primary">
      <header className="sticky top-0 z-30 backdrop-blur bg-brand-black/80 border-b border-brand-line">
        <div className="max-w-5xl mx-auto px-6 py-4 flex flex-col gap-3">
          <div className="flex items-center justify-between gap-4">
            <Link
              href="/admin"
              className="font-display text-xl tracking-[3px] hover:opacity-80 transition"
            >
              TRIVIX <span className="text-text-faint">·</span> ADMIN
            </Link>
            <div className="flex items-center gap-3">
              <Badge tone="pro">admin</Badge>
              <Link
                href="/dashboard"
                className="text-sm text-text-muted hover:text-text-primary"
              >
                Exit admin
              </Link>
            </div>
          </div>
          <AdminNav />
        </div>
      </header>
      <main className="max-w-5xl mx-auto px-6 py-8">{children}</main>
    </div>
  );
}
