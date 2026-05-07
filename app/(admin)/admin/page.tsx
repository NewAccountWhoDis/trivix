import Link from "next/link";
import { adminDb } from "@/lib/firebase/admin";
import { Card } from "@/components/ui/Card";

export default async function AdminOverviewPage() {
  const [pendingApps, allUsers, allTeams] = await Promise.all([
    adminDb
      .collection("hostApplications")
      .where("status", "==", "pending")
      .count()
      .get(),
    adminDb.collection("users").count().get(),
    adminDb.collection("teams").count().get(),
  ]);

  const stats = [
    {
      label: "Pending host applications",
      value: pendingApps.data().count,
      href: "/admin/host-applications",
    },
    {
      label: "Users",
      value: allUsers.data().count,
      href: "/admin/users",
    },
    {
      label: "Teams",
      value: allTeams.data().count,
      href: "/admin/teams",
    },
  ];

  return (
    <div>
      <h1 className="font-display text-3xl tracking-[3px] mb-6">OVERVIEW</h1>
      <div className="grid sm:grid-cols-3 gap-4">
        {stats.map((s) => (
          <Link key={s.href} href={s.href} className="block">
            <Card
              variant="elevated"
              className="p-6 hover:border-brand-red transition cursor-pointer"
            >
              <div className="text-xs uppercase tracking-[3px] text-text-faint mb-2">
                {s.label}
              </div>
              <div className="font-display text-4xl tracking-[2px]">
                {s.value}
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
