// @vitest-environment node
import { describe, expect, it } from "vitest";
import { Timestamp } from "firebase-admin/firestore";
import { serializeUser } from "@/lib/user/serialize";

describe("serializeUser", () => {
  it("converts Firestore Timestamps to epoch millis", () => {
    const created = Timestamp.fromMillis(1_700_000_000_000);
    const updated = Timestamp.fromMillis(1_700_000_500_000);

    const out = serializeUser("uid-1", {
      email: "joe@example.com",
      emailVerified: true,
      firstName: "Joe",
      lastName: "Black",
      displayName: "joe_black",
      displayNameKey: "joe_black",
      avatarSeed: "uid-1",
      role: "player",
      hostStatus: "none",
      isAdmin: false,
      teamId: null,
      teamHistory: [],
      stats: {
        gamesPlayed: 3,
        gamesWon: 1,
        totalCorrectAnswers: 12,
        totalQuestionsAnswered: 30,
        highestScore: 5,
        currentWinStreak: 0,
        longestWinStreak: 1,
        lastPlayedAt: created,
        venues: [
          {
            venueId: "v1",
            venueName: "Joe's Pub",
            gamesAttended: 3,
            lastVisitedAt: created,
          },
        ],
        favoriteVenueId: "v1",
        favoriteTeammateUid: null,
      },
      createdAt: created,
      updatedAt: updated,
    });

    expect(out.createdAt).toBe(1_700_000_000_000);
    expect(out.updatedAt).toBe(1_700_000_500_000);
    expect(out.stats.lastPlayedAt).toBe(1_700_000_000_000);
    expect(out.stats.venues[0]!.lastVisitedAt).toBe(1_700_000_000_000);
    expect(out.role).toBe("player");
  });

  it("handles missing optional fields with defaults", () => {
    const created = Timestamp.fromMillis(1_700_000_000_000);
    const out = serializeUser("uid-2", {
      createdAt: created,
      updatedAt: created,
    });

    expect(out.uid).toBe("uid-2");
    expect(out.email).toBe("");
    expect(out.role).toBe("player");
    expect(out.hostStatus).toBe("none");
    expect(out.isAdmin).toBe(false);
    expect(out.teamHistory).toEqual([]);
    expect(out.avatarSeed).toBe("uid-2");
    expect(out.stats.gamesPlayed).toBe(0);
    expect(out.stats.lastPlayedAt).toBeNull();
    expect(out.stats.venues).toEqual([]);
  });
});
