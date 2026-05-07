import Link from "next/link";
import { redirect } from "next/navigation";
import { Timestamp } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { verifySession } from "@/lib/firebase/session";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui";
import { Card } from "@/components/ui/Card";
import { TeamActions } from "./TeamActions";

function tsToMs(value: unknown): number {
  if (value instanceof Timestamp) return value.toMillis();
  return 0;
}

export default async function TeamPage() {
  const session = await verifySession();
  if (!session) redirect("/login?next=/team");

  const userSnap = await adminDb.collection("users").doc(session.uid).get();
  const teamId = userSnap.data()?.teamId as string | null | undefined;

  if (!teamId) {
    return (
      <main className="min-h-screen px-6 py-10 md:px-12 md:py-14 max-w-2xl mx-auto">
        <h1 className="font-display text-4xl tracking-[3px] mb-2">YOUR TEAM</h1>
        <p className="text-text-muted mb-8">
          Roll with a crew. Build a team or join one with an invite code.
        </p>
        <div className="grid sm:grid-cols-2 gap-4">
          <Link href="/team/create" className="block">
            <Card
              variant="elevated"
              className="p-5 hover:border-brand-red transition cursor-pointer h-full"
            >
              <div className="text-xs uppercase tracking-[3px] text-text-faint mb-2">
                Captain
              </div>
              <div className="font-display text-2xl tracking-[2px]">
                Create a team
              </div>
              <p className="text-sm text-text-muted mt-2">
                Pick a name. Get an invite code. Approve who joins.
              </p>
            </Card>
          </Link>
          <Link href="/team/join" className="block">
            <Card
              variant="elevated"
              className="p-5 hover:border-brand-red transition cursor-pointer h-full"
            >
              <div className="text-xs uppercase tracking-[3px] text-text-faint mb-2">
                Player
              </div>
              <div className="font-display text-2xl tracking-[2px]">
                Join with a code
              </div>
              <p className="text-sm text-text-muted mt-2">
                Got a 6-character invite code? Use it here.
              </p>
            </Card>
          </Link>
        </div>
      </main>
    );
  }

  const teamSnap = await adminDb.collection("teams").doc(teamId).get();
  if (!teamSnap.exists) {
    // Stale teamId — clean up and bounce.
    await adminDb.collection("users").doc(session.uid).update({ teamId: null });
    redirect("/team");
  }
  const team = teamSnap.data() ?? {};
  const memberUids: string[] = (team.memberUids as string[]) ?? [];
  const captainUid: string | null = (team.captainUid as string | null) ?? null;
  const isCaptain = captainUid === session.uid;

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
        isCaptain: s.id === captainUid,
      };
    });

  return (
    <main className="min-h-screen px-6 py-10 md:px-12 md:py-14 max-w-3xl mx-auto">
      <header className="flex items-start justify-between gap-4 mb-8">
        <div>
          <p className="text-text-muted text-sm">Team</p>
          <h1 className="font-display text-4xl tracking-[3px]">
            {String(team.name ?? "").toUpperCase()}
          </h1>
          <p className="text-text-faint text-sm mt-2">
            Created {new Date(tsToMs(team.createdAt)).toLocaleDateString()}
          </p>
        </div>
        <div className="flex flex-col gap-2 items-end">
          {isCaptain && (
            <Button variant="secondary" size="sm" asChild>
              <Link href="/team/settings">Settings</Link>
            </Button>
          )}
        </div>
      </header>

      <Card className="mb-6">
        <div className="p-5 flex items-center justify-between">
          <div>
            <div className="text-xs uppercase tracking-[3px] text-text-faint mb-1">
              Invite code
            </div>
            <div className="font-display text-3xl tracking-[6px]">
              {String(team.inviteCode ?? "")}
            </div>
          </div>
          <Badge tone={isCaptain ? "captain" : "neutral"}>
            {isCaptain
              ? "captain"
              : captainUid === null
                ? "no captain"
                : "member"}
          </Badge>
        </div>
      </Card>

      <h2 className="font-display text-2xl tracking-[3px] mb-3">MEMBERS</h2>
      <Card>
        <ul className="divide-y divide-brand-line">
          {members.map((m) => (
            <li key={m.uid} className="flex items-center gap-4 p-4">
              <Avatar
                firstName={m.firstName}
                lastName={m.lastName}
                seed={m.avatarSeed}
                size="sm"
              />
              <div className="flex-1">
                <div className="text-text-primary">@{m.displayName}</div>
                <div className="text-xs text-text-faint">
                  {m.firstName} {m.lastName}
                </div>
              </div>
              {m.isCaptain && <Badge tone="captain">captain</Badge>}
            </li>
          ))}
        </ul>
      </Card>

      <TeamActions
        teamId={teamId}
        isCaptain={isCaptain}
        captainPresent={captainUid !== null}
      />
    </main>
  );
}
