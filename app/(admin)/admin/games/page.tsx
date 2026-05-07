import { Timestamp } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";

function tsToMs(value: unknown): number | null {
  if (value instanceof Timestamp) return value.toMillis();
  return null;
}

export default async function AdminGamesPage() {
  const snap = await adminDb
    .collection("gameSessions")
    .orderBy("createdAt", "desc")
    .limit(100)
    .get();

  const hostUids = Array.from(
    new Set(
      snap.docs
        .map((d) => d.data().hostUid as string | undefined)
        .filter((v): v is string => Boolean(v)),
    ),
  );
  const hostMap: Record<string, string> = {};
  await Promise.all(
    hostUids.map(async (uid) => {
      const u = await adminDb.collection("users").doc(uid).get();
      if (u.exists) hostMap[uid] = String(u.data()?.displayName ?? uid);
    }),
  );

  const games = snap.docs.map((d) => {
    const data = d.data();
    const players = (data.players as Record<string, unknown>) ?? {};
    const hostUid = String(data.hostUid ?? "");
    const teamIds = new Set<string>();
    for (const p of Object.values(players)) {
      const tid = (p as { teamId?: string | null }).teamId;
      if (tid) teamIds.add(tid);
    }
    return {
      sessionId: d.id,
      hostDisplayName: hostMap[hostUid] ?? hostUid,
      venue: String(data.venueNameSnapshot ?? ""),
      questionSet: String(data.questionSetNameSnapshot ?? ""),
      status: (data.status as "lobby" | "active" | "ended") ?? "lobby",
      sessionCode: String(data.sessionCode ?? ""),
      playerCount: Object.keys(players).length,
      teamCount: teamIds.size,
      createdAt: tsToMs(data.createdAt),
    };
  });

  return (
    <div>
      <h1 className="font-display text-3xl tracking-[3px] mb-6">GAMES</h1>
      <Card>
        {games.length === 0 ? (
          <div className="p-5 text-text-muted text-sm">
            No game sessions yet.
          </div>
        ) : (
          <ul className="divide-y divide-brand-line">
            {games.map((g) => (
              <li
                key={g.sessionId}
                className="flex items-center gap-4 p-4 flex-wrap"
              >
                <div className="flex-1 min-w-[14rem]">
                  <div className="text-text-primary">
                    {g.venue}{" "}
                    <span className="text-text-faint">· {g.questionSet}</span>
                  </div>
                  <div className="text-xs text-text-faint">
                    host @{g.hostDisplayName} · {g.playerCount} player
                    {g.playerCount === 1 ? "" : "s"}
                    {g.teamCount > 0 && (
                      <>
                        {" "}
                        · {g.teamCount} team
                        {g.teamCount === 1 ? "" : "s"}
                      </>
                    )}{" "}
                    ·{" "}
                    {g.createdAt ? new Date(g.createdAt).toLocaleString() : "—"}
                  </div>
                </div>
                <div className="font-display text-sm tracking-[4px] text-text-muted">
                  {g.sessionCode}
                </div>
                <Badge
                  tone={
                    g.status === "ended"
                      ? "neutral"
                      : g.status === "active"
                        ? "success"
                        : "pending"
                  }
                >
                  {g.status}
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
