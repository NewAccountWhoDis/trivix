import Link from "next/link";
import { redirect } from "next/navigation";
import { adminDb } from "@/lib/firebase/admin";
import { verifySession } from "@/lib/firebase/session";
import { Avatar } from "@/components/ui/Avatar";
import { Card } from "@/components/ui/Card";
import { TeamSettingsActions } from "./TeamSettingsActions";

export default async function TeamSettingsPage() {
  const session = await verifySession();
  if (!session) redirect("/login?next=/team/settings");

  const userSnap = await adminDb.collection("users").doc(session.uid).get();
  const teamId = userSnap.data()?.teamId as string | null | undefined;
  if (!teamId) redirect("/team");

  const teamSnap = await adminDb.collection("teams").doc(teamId).get();
  if (!teamSnap.exists) redirect("/team");
  const team = teamSnap.data() ?? {};
  if ((team.captainUid as string | null) !== session.uid) {
    redirect("/team");
  }

  const memberUids: string[] = (team.memberUids as string[]) ?? [];
  const memberSnaps = await Promise.all(
    memberUids.map((uid) => adminDb.collection("users").doc(uid).get()),
  );
  const members = memberSnaps
    .filter((s) => s.exists)
    .map((s) => {
      const u = s.data() ?? {};
      return {
        uid: s.id,
        displayName: String(u.displayName ?? ""),
        firstName: String(u.firstName ?? ""),
        lastName: String(u.lastName ?? ""),
        avatarSeed: String(u.avatarSeed ?? s.id),
      };
    });

  const reqsSnap = await adminDb
    .collection("teams")
    .doc(teamId)
    .collection("joinRequests")
    .orderBy("requestedAt", "asc")
    .get();
  const requests = reqsSnap.docs.map((d) => ({
    uid: d.id,
    displayName: String(d.data().displayName ?? d.id),
  }));

  return (
    <main className="min-h-screen px-6 py-10 md:px-12 md:py-14 max-w-3xl mx-auto">
      <div className="mb-6">
        <Link
          href="/team"
          className="text-sm text-text-muted hover:text-text-primary"
        >
          ← Back to team
        </Link>
      </div>
      <h1 className="font-display text-4xl tracking-[3px] mb-2">
        TEAM SETTINGS
      </h1>
      <p className="text-text-muted mb-8">
        Captain-only controls for {String(team.name ?? "")}.
      </p>

      <TeamSettingsActions
        teamId={teamId}
        inviteCode={String(team.inviteCode ?? "")}
        members={members}
        requests={requests}
        captainUid={session.uid}
      />

      <Card className="mt-8">
        <div className="p-5">
          <div className="text-xs uppercase tracking-[3px] text-text-faint mb-3">
            Members
          </div>
          <ul className="divide-y divide-brand-line">
            {members.map((m) => (
              <li key={m.uid} className="flex items-center gap-3 py-3">
                <Avatar
                  firstName={m.firstName}
                  lastName={m.lastName}
                  seed={m.avatarSeed}
                  size="sm"
                />
                <div className="flex-1 text-text-primary">@{m.displayName}</div>
              </li>
            ))}
          </ul>
        </div>
      </Card>
    </main>
  );
}
