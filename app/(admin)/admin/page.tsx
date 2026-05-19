import Link from "next/link";
import { adminDb } from "@/lib/firebase/admin";
import { Card } from "@/components/ui/Card";

export default async function AdminOverviewPage() {
  const [pendingApps, accountReviews, allUsers, allTeams, allVenues, allSets] =
    await Promise.all([
      adminDb
        .collection("hostApplications")
        .where("status", "==", "pending")
        .count()
        .get(),
      // orderBy implicitly excludes docs missing the field, so we don't need
      // a composite index for deletionRequestedAt != null + archived == false.
      // Filter archived client-side.
      adminDb
        .collection("users")
        .orderBy("deletionRequestedAt", "asc")
        .limit(500)
        .get(),
      adminDb.collection("users").count().get(),
      adminDb.collection("teams").count().get(),
      adminDb.collection("venues").count().get(),
      adminDb.collection("questionSets").count().get(),
    ]);

  const reviewsCount = accountReviews.docs.filter(
    (d) => !d.data().archived,
  ).length;
  const stats = [
    {
      label: "Pending host applications",
      value: pendingApps.data().count,
      href: "/admin/host-applications",
    },
    {
      label: "Accounts for review",
      value: reviewsCount,
      href: "/admin/account-reviews",
      flag: reviewsCount > 0,
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
    {
      label: "Venues",
      value: allVenues.data().count,
      href: "/admin/venues",
    },
    {
      label: "Question sets",
      value: allSets.data().count,
      href: "/admin/question-sets",
    },
  ];

  return (
    <div>
      <h1 className="font-display text-3xl tracking-[3px] mb-6">OVERVIEW</h1>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <Link key={s.href} href={s.href} className="block">
            <Card
              variant="elevated"
              className={`p-6 hover:border-brand-red transition cursor-pointer ${
                s.flag ? "border-game-yellow" : ""
              }`}
            >
              <div className="text-xs uppercase tracking-[3px] text-text-faint mb-2">
                {s.label}
              </div>
              <div
                className={`font-display text-4xl tracking-[2px] ${
                  s.flag ? "text-game-yellow" : ""
                }`}
              >
                {s.value}
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
