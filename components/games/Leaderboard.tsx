import type { TeamAggregate } from "@/lib/games/team-aggregate";

interface Props {
  teams: TeamAggregate[];
  /** Highlight the viewer's own team row. */
  myTeamId?: string | null;
  /** "lg" for the shared presenter screen; "sm" for player phones. */
  size?: "sm" | "lg";
  /** Final standings — highlight the unique winner and show a trophy. */
  final?: boolean;
  /** Cap the number of rows shown (e.g. on the presenter). */
  max?: number;
}

export function Leaderboard({
  teams,
  myTeamId = null,
  size = "sm",
  final = false,
  max,
}: Props) {
  const rows = typeof max === "number" ? teams.slice(0, max) : teams;
  const hasWinner =
    final &&
    teams.length > 0 &&
    teams[0]!.score > 0 &&
    (teams.length === 1 || teams[0]!.score > (teams[1]?.score ?? 0));

  const lg = size === "lg";

  return (
    <div className="flex flex-col gap-2">
      <p
        className={`font-display tracking-[4px] text-text-muted ${
          lg ? "text-3xl md:text-4xl" : "text-sm"
        }`}
      >
        {teams.length} {teams.length === 1 ? "TEAM" : "TEAMS"} PLAYING
      </p>
      <ul className="flex flex-col gap-1.5">
        {rows.map((t, i) => {
          const isWinner = final && hasWinner && i === 0;
          const isMine = t.teamId !== null && t.teamId === myTeamId;
          return (
            <li
              key={t.teamId ?? "solo"}
              className={`flex items-center gap-3 rounded-md border ${
                lg ? "px-5 py-3" : "px-3 py-2"
              } ${
                isWinner
                  ? "border-game-green bg-game-green/15"
                  : isMine
                    ? "border-brand-red/50 bg-brand-red/10"
                    : "border-brand-line bg-brand-ink"
              }`}
            >
              <span
                className={`font-display text-text-faint tabular-nums ${
                  lg ? "text-2xl md:text-3xl w-9" : "text-base w-5"
                }`}
              >
                {i + 1}
              </span>
              <span
                className={`flex-1 truncate ${
                  lg ? "text-2xl md:text-3xl" : "text-sm"
                } ${isWinner ? "text-game-green" : "text-text-primary"}`}
              >
                {t.teamName}
                {isWinner && <span className="ml-2">🏆</span>}
                {isMine && !isWinner && (
                  <span className="ml-2 text-xs text-text-faint">(you)</span>
                )}
              </span>
              <span
                className={`font-display tabular-nums ${
                  lg ? "text-2xl md:text-4xl" : "text-lg"
                } ${isWinner ? "text-game-green" : "text-text-primary"}`}
              >
                {t.score}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
