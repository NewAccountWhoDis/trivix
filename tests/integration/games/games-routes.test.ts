// @vitest-environment node
import "@/tests/setup/emulator-bootstrap";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST as createGame } from "@/app/api/games/route";
import { POST as joinGame } from "@/app/api/games/join/route";
import {
  GET as readGame,
  DELETE as cancelGame,
} from "@/app/api/games/[id]/route";
import { POST as startGame } from "@/app/api/games/[id]/start/route";
import { POST as advanceGame } from "@/app/api/games/[id]/advance/route";
import { POST as submitAnswer } from "@/app/api/games/[id]/answer/route";
import { POST as endGame } from "@/app/api/games/[id]/end/route";
import { GET as adminListGames } from "@/app/api/admin/games/route";
import { Timestamp } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { DEFAULT_USER_STATS } from "@/types/firestore";
import * as session from "@/lib/firebase/session";

const FS_EMU = "http://127.0.0.1:8080";
const PROJECT = "trivix-dev";

async function clearFirestore() {
  await fetch(
    `${FS_EMU}/emulator/v1/projects/${PROJECT}/databases/(default)/documents`,
    { method: "DELETE" },
  );
}

async function seedUser(uid: string, opts: Record<string, unknown> = {}) {
  await adminDb
    .collection("users")
    .doc(uid)
    .set({
      uid,
      email: `${uid}@x.test`,
      emailVerified: true,
      firstName: "F",
      lastName: "L",
      displayName: uid,
      displayNameKey: uid,
      avatarSeed: uid,
      role: "player",
      hostStatus: "none",
      isAdmin: false,
      teamId: null,
      teamHistory: [],
      stats: DEFAULT_USER_STATS,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...opts,
    });
  await adminDb.collection("displayNames").doc(uid).set({ uid });
}

async function seedVenue(ownerUid: string, id = "v1", name = "Joe's Pub") {
  await adminDb
    .collection("venues")
    .doc(id)
    .set({
      venueId: id,
      ownerUid,
      name,
      address: { street: "1 Main", city: "Albany", state: "NY", zip: "12207" },
      createdAt: new Date(),
      updatedAt: new Date(),
    });
}

async function seedQuestionSet(
  ownerUid: string,
  id = "qs1",
  questions: Array<{
    prompt: string;
    choices: string[];
    correctIndex: number;
    points: number;
  }> = [
    {
      prompt: "Capital of NY?",
      choices: ["Albany", "NYC", "Buffalo", "Syracuse"],
      correctIndex: 0,
      points: 1,
    },
    {
      prompt: "Capital of CA?",
      choices: ["LA", "Sacramento", "SF", "San Diego"],
      correctIndex: 1,
      points: 2,
    },
  ],
) {
  await adminDb.collection("questionSets").doc(id).set({
    setId: id,
    ownerUid,
    name: "Capitals",
    description: null,
    questions,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
}

function asUser(uid: string, opts: { emailVerified?: boolean } = {}) {
  vi.spyOn(session, "verifySession").mockResolvedValue({
    uid,
    email: `${uid}@x.test`,
    emailVerified: opts.emailVerified ?? true,
  });
}

function jsonReq(method: string, body?: unknown): Request {
  const init: RequestInit = { method };
  if (body !== undefined) {
    init.headers = { "Content-Type": "application/json" };
    init.body = JSON.stringify(body);
  }
  return new Request("http://localhost/x", init);
}

beforeEach(clearFirestore);
afterEach(() => {
  vi.restoreAllMocks();
  return clearFirestore();
});

async function setupHostWithGame() {
  await seedUser("alice", { role: "host", hostStatus: "approved" });
  await seedVenue("alice");
  await seedQuestionSet("alice");
  asUser("alice");
  const res = await createGame(
    jsonReq("POST", { venueId: "v1", questionSetId: "qs1" }),
  );
  const body = (await res.json()) as { sessionId: string; sessionCode: string };
  return body;
}

describe("POST /api/games (create)", () => {
  it("approved host creates session, snapshots questions and venue name", async () => {
    const { sessionId, sessionCode } = await setupHostWithGame();
    expect(sessionCode).toMatch(/^[A-HJ-KM-NP-Z2-9]{6}$/);

    const s = await adminDb.collection("gameSessions").doc(sessionId).get();
    expect(s.data()!.status).toBe("lobby");
    expect(s.data()!.hostUid).toBe("alice");
    expect(s.data()!.venueNameSnapshot).toBe("Joe's Pub");
    expect(s.data()!.questions).toHaveLength(2);
  });

  it("strips correctIndex from gameSessions and writes it to gameSessionKeys", async () => {
    const { sessionId } = await setupHostWithGame();
    const s = await adminDb.collection("gameSessions").doc(sessionId).get();
    expect(s.data()!.questions[0].correctIndex).toBeNull();
    expect(s.data()!.questions[1].correctIndex).toBeNull();
    const k = await adminDb.collection("gameSessionKeys").doc(sessionId).get();
    expect(k.exists).toBe(true);
    expect(k.data()!.questions[0].correctIndex).toBe(0);
    expect(k.data()!.questions[1].correctIndex).toBe(1);
  });

  it("404 if venue is not the host's", async () => {
    await seedUser("alice", { role: "host", hostStatus: "approved" });
    await seedUser("bob", { role: "host", hostStatus: "approved" });
    await seedVenue("bob");
    await seedQuestionSet("alice");
    asUser("alice");
    const res = await createGame(
      jsonReq("POST", { venueId: "v1", questionSetId: "qs1" }),
    );
    expect(res.status).toBe(404);
  });

  it("400 if question set is empty", async () => {
    await seedUser("alice", { role: "host", hostStatus: "approved" });
    await seedVenue("alice");
    await seedQuestionSet("alice", "qs1", []);
    asUser("alice");
    const res = await createGame(
      jsonReq("POST", { venueId: "v1", questionSetId: "qs1" }),
    );
    expect(res.status).toBe(400);
  });

  it("403 for non-host caller", async () => {
    await seedUser("alice");
    asUser("alice");
    const res = await createGame(
      jsonReq("POST", { venueId: "v1", questionSetId: "qs1" }),
    );
    expect(res.status).toBe(403);
  });
});

describe("POST /api/games/join", () => {
  it("player joins via session code", async () => {
    const { sessionId, sessionCode } = await setupHostWithGame();
    await seedUser("bob");
    asUser("bob");
    const res = await joinGame(jsonReq("POST", { sessionCode }));
    expect(res.status).toBe(200);
    const body = (await res.json()) as { sessionId: string };
    expect(body.sessionId).toBe(sessionId);

    const s = await adminDb.collection("gameSessions").doc(sessionId).get();
    expect(s.data()!.players.bob).toBeTruthy();
  });

  it("idempotent on repeat join", async () => {
    const { sessionCode } = await setupHostWithGame();
    await seedUser("bob");
    asUser("bob");
    await joinGame(jsonReq("POST", { sessionCode }));
    const res2 = await joinGame(jsonReq("POST", { sessionCode }));
    expect(res2.status).toBe(200);
    const body = (await res2.json()) as { alreadyJoined?: boolean };
    expect(body.alreadyJoined).toBe(true);
  });

  it("404 for unknown code", async () => {
    await seedUser("bob");
    asUser("bob");
    const res = await joinGame(jsonReq("POST", { sessionCode: "ZZZZ99" }));
    expect(res.status).toBe(404);
  });

  it("409 once game is active and you weren't already in", async () => {
    const { sessionId, sessionCode } = await setupHostWithGame();
    asUser("alice");
    await startGame(jsonReq("POST"), {
      params: Promise.resolve({ id: sessionId }),
    });
    await seedUser("bob");
    asUser("bob");
    const res = await joinGame(jsonReq("POST", { sessionCode }));
    expect(res.status).toBe(409);
  });
});

describe("GET /api/games/[id]", () => {
  it("host sees full questions including correctIndex", async () => {
    const { sessionId } = await setupHostWithGame();
    asUser("alice");
    const res = await readGame(jsonReq("GET"), {
      params: Promise.resolve({ id: sessionId }),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      isHost: boolean;
      questions: Array<{ correctIndex: number | null; hidden?: boolean }>;
    };
    expect(body.isHost).toBe(true);
    expect(body.questions[0]!.correctIndex).toBe(0);
    expect(body.questions[1]!.correctIndex).toBe(1);
  });

  it("player sees only the current question, no correct answer until reveal", async () => {
    const { sessionId, sessionCode } = await setupHostWithGame();
    await seedUser("bob");
    asUser("bob");
    await joinGame(jsonReq("POST", { sessionCode }));

    asUser("alice");
    await startGame(jsonReq("POST"), {
      params: Promise.resolve({ id: sessionId }),
    });

    asUser("bob");
    const res = await readGame(jsonReq("GET"), {
      params: Promise.resolve({ id: sessionId }),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      isPlayer: boolean;
      questions: Array<{ correctIndex: number | null; hidden?: boolean }>;
    };
    expect(body.isPlayer).toBe(true);
    expect(body.questions[0]!.correctIndex).toBeNull();
    expect(body.questions[1]!.hidden).toBe(true);
  });

  it("403 for stranger", async () => {
    const { sessionId } = await setupHostWithGame();
    await seedUser("eve");
    asUser("eve");
    const res = await readGame(jsonReq("GET"), {
      params: Promise.resolve({ id: sessionId }),
    });
    expect(res.status).toBe(403);
  });
});

describe("POST /api/games/[id]/start", () => {
  it("host starts the game", async () => {
    const { sessionId } = await setupHostWithGame();
    asUser("alice");
    const res = await startGame(jsonReq("POST"), {
      params: Promise.resolve({ id: sessionId }),
    });
    expect(res.status).toBe(200);
    const s = await adminDb.collection("gameSessions").doc(sessionId).get();
    expect(s.data()!.status).toBe("active");
    expect(s.data()!.currentQuestionIndex).toBe(0);
  });

  it("403 for non-host", async () => {
    const { sessionId, sessionCode } = await setupHostWithGame();
    await seedUser("bob");
    asUser("bob");
    await joinGame(jsonReq("POST", { sessionCode }));
    const res = await startGame(jsonReq("POST"), {
      params: Promise.resolve({ id: sessionId }),
    });
    expect(res.status).toBe(403);
  });
});

describe("POST /api/games/[id]/answer", () => {
  it("correct answer adds points to score", async () => {
    const { sessionId, sessionCode } = await setupHostWithGame();
    await seedUser("bob");
    asUser("bob");
    await joinGame(jsonReq("POST", { sessionCode }));

    asUser("alice");
    await startGame(jsonReq("POST"), {
      params: Promise.resolve({ id: sessionId }),
    });

    asUser("bob");
    const res = await submitAnswer(
      jsonReq("POST", { questionIndex: 0, choiceIndex: 0 }),
      { params: Promise.resolve({ id: sessionId }) },
    );
    expect(res.status).toBe(200);
    const s = await adminDb.collection("gameSessions").doc(sessionId).get();
    expect(s.data()!.players.bob.score).toBe(1);
    expect(s.data()!.players.bob.answers["0"].correct).toBe(true);
  });

  it("wrong answer adds 0 points", async () => {
    const { sessionId, sessionCode } = await setupHostWithGame();
    await seedUser("bob");
    asUser("bob");
    await joinGame(jsonReq("POST", { sessionCode }));

    asUser("alice");
    await startGame(jsonReq("POST"), {
      params: Promise.resolve({ id: sessionId }),
    });

    asUser("bob");
    const res = await submitAnswer(
      jsonReq("POST", { questionIndex: 0, choiceIndex: 2 }),
      { params: Promise.resolve({ id: sessionId }) },
    );
    expect(res.status).toBe(200);
    const s = await adminDb.collection("gameSessions").doc(sessionId).get();
    expect(s.data()!.players.bob.score).toBe(0);
    expect(s.data()!.players.bob.answers["0"].correct).toBe(false);
  });

  it("409 on second answer to same question", async () => {
    const { sessionId, sessionCode } = await setupHostWithGame();
    await seedUser("bob");
    asUser("bob");
    await joinGame(jsonReq("POST", { sessionCode }));
    asUser("alice");
    await startGame(jsonReq("POST"), {
      params: Promise.resolve({ id: sessionId }),
    });
    asUser("bob");
    await submitAnswer(jsonReq("POST", { questionIndex: 0, choiceIndex: 0 }), {
      params: Promise.resolve({ id: sessionId }),
    });
    const res2 = await submitAnswer(
      jsonReq("POST", { questionIndex: 0, choiceIndex: 1 }),
      { params: Promise.resolve({ id: sessionId }) },
    );
    expect(res2.status).toBe(409);
  });

  it("409 if questionIndex doesn't match current", async () => {
    const { sessionId, sessionCode } = await setupHostWithGame();
    await seedUser("bob");
    asUser("bob");
    await joinGame(jsonReq("POST", { sessionCode }));
    asUser("alice");
    await startGame(jsonReq("POST"), {
      params: Promise.resolve({ id: sessionId }),
    });
    asUser("bob");
    const res = await submitAnswer(
      jsonReq("POST", { questionIndex: 1, choiceIndex: 0 }),
      { params: Promise.resolve({ id: sessionId }) },
    );
    expect(res.status).toBe(409);
  });
});

describe("POST /api/games/[id]/advance", () => {
  it("advances to next question and reveals previous", async () => {
    const { sessionId } = await setupHostWithGame();
    asUser("alice");
    await startGame(jsonReq("POST"), {
      params: Promise.resolve({ id: sessionId }),
    });
    const res = await advanceGame(jsonReq("POST"), {
      params: Promise.resolve({ id: sessionId }),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { ended: boolean };
    expect(body.ended).toBe(false);
    const s = await adminDb.collection("gameSessions").doc(sessionId).get();
    expect(s.data()!.currentQuestionIndex).toBe(1);
    expect(s.data()!.revealedIndex).toBe(0);
  });

  it("advancing past last question ends the game and triggers stats", async () => {
    const { sessionId, sessionCode } = await setupHostWithGame();
    await seedUser("bob");
    asUser("bob");
    await joinGame(jsonReq("POST", { sessionCode }));

    asUser("alice");
    await startGame(jsonReq("POST"), {
      params: Promise.resolve({ id: sessionId }),
    });

    asUser("bob");
    await submitAnswer(jsonReq("POST", { questionIndex: 0, choiceIndex: 0 }), {
      params: Promise.resolve({ id: sessionId }),
    });

    asUser("alice");
    await advanceGame(jsonReq("POST"), {
      params: Promise.resolve({ id: sessionId }),
    });

    asUser("bob");
    await submitAnswer(jsonReq("POST", { questionIndex: 1, choiceIndex: 1 }), {
      params: Promise.resolve({ id: sessionId }),
    });

    asUser("alice");
    const res = await advanceGame(jsonReq("POST"), {
      params: Promise.resolve({ id: sessionId }),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { ended: boolean };
    expect(body.ended).toBe(true);

    const s = await adminDb.collection("gameSessions").doc(sessionId).get();
    expect(s.data()!.status).toBe("ended");

    const userBob = await adminDb.collection("users").doc("bob").get();
    expect(userBob.data()!.stats.gamesPlayed).toBe(1);
    expect(userBob.data()!.stats.gamesWon).toBe(1);
    expect(userBob.data()!.stats.totalCorrectAnswers).toBe(2);
    expect(userBob.data()!.stats.totalQuestionsAnswered).toBe(2);
    expect(userBob.data()!.stats.highestScore).toBe(3);
    expect(userBob.data()!.stats.currentWinStreak).toBe(1);
    expect(userBob.data()!.stats.longestWinStreak).toBe(1);
    expect(userBob.data()!.stats.venues).toHaveLength(1);
    expect(userBob.data()!.stats.venues[0].venueId).toBe("v1");
    expect(userBob.data()!.stats.venues[0].gamesAttended).toBe(1);
  });
});

describe("POST /api/games/[id]/end (force-end + stats)", () => {
  it("ties produce no winner (no gamesWon++ for tied players)", async () => {
    const { sessionId, sessionCode } = await setupHostWithGame();
    await seedUser("bob");
    await seedUser("carol");
    asUser("bob");
    await joinGame(jsonReq("POST", { sessionCode }));
    asUser("carol");
    await joinGame(jsonReq("POST", { sessionCode }));
    asUser("alice");
    await startGame(jsonReq("POST"), {
      params: Promise.resolve({ id: sessionId }),
    });

    // Both answer Q0 correctly → both have 1 point, tied.
    asUser("bob");
    await submitAnswer(jsonReq("POST", { questionIndex: 0, choiceIndex: 0 }), {
      params: Promise.resolve({ id: sessionId }),
    });
    asUser("carol");
    await submitAnswer(jsonReq("POST", { questionIndex: 0, choiceIndex: 0 }), {
      params: Promise.resolve({ id: sessionId }),
    });

    asUser("alice");
    const res = await endGame(jsonReq("POST"), {
      params: Promise.resolve({ id: sessionId }),
    });
    expect(res.status).toBe(200);

    const userBob = await adminDb.collection("users").doc("bob").get();
    const userCarol = await adminDb.collection("users").doc("carol").get();
    expect(userBob.data()!.stats.gamesWon).toBe(0);
    expect(userCarol.data()!.stats.gamesWon).toBe(0);
    expect(userBob.data()!.stats.gamesPlayed).toBe(1);
    expect(userCarol.data()!.stats.gamesPlayed).toBe(1);
  });

  it("non-winner has currentWinStreak reset to 0", async () => {
    const { sessionId, sessionCode } = await setupHostWithGame();
    await seedUser("bob");
    await seedUser("carol", {
      stats: {
        ...DEFAULT_USER_STATS,
        currentWinStreak: 5,
        longestWinStreak: 5,
      },
    });
    asUser("bob");
    await joinGame(jsonReq("POST", { sessionCode }));
    asUser("carol");
    await joinGame(jsonReq("POST", { sessionCode }));
    asUser("alice");
    await startGame(jsonReq("POST"), {
      params: Promise.resolve({ id: sessionId }),
    });

    // Bob answers correctly, Carol does not. Bob wins.
    asUser("bob");
    await submitAnswer(jsonReq("POST", { questionIndex: 0, choiceIndex: 0 }), {
      params: Promise.resolve({ id: sessionId }),
    });
    asUser("carol");
    await submitAnswer(jsonReq("POST", { questionIndex: 0, choiceIndex: 2 }), {
      params: Promise.resolve({ id: sessionId }),
    });

    asUser("alice");
    await endGame(jsonReq("POST"), {
      params: Promise.resolve({ id: sessionId }),
    });

    const userBob = await adminDb.collection("users").doc("bob").get();
    const userCarol = await adminDb.collection("users").doc("carol").get();
    expect(userBob.data()!.stats.gamesWon).toBe(1);
    expect(userBob.data()!.stats.currentWinStreak).toBe(1);
    expect(userCarol.data()!.stats.currentWinStreak).toBe(0);
    expect(userCarol.data()!.stats.longestWinStreak).toBe(5);
  });
});

describe("Plan 8 — split collection + timer enforcement", () => {
  it("/advance copies correctIndex into gameSessions on reveal", async () => {
    const { sessionId } = await setupHostWithGame();
    asUser("alice");
    await startGame(jsonReq("POST"), {
      params: Promise.resolve({ id: sessionId }),
    });
    let s = await adminDb.collection("gameSessions").doc(sessionId).get();
    expect(s.data()!.questions[0].correctIndex).toBeNull();

    await advanceGame(jsonReq("POST"), {
      params: Promise.resolve({ id: sessionId }),
    });
    s = await adminDb.collection("gameSessions").doc(sessionId).get();
    expect(s.data()!.questions[0].correctIndex).toBe(0);
    // Question 1 (next, not yet revealed) still null.
    expect(s.data()!.questions[1].correctIndex).toBeNull();
  });

  it("/answer rejects after currentQuestionDeadline with 409", async () => {
    const { sessionId, sessionCode } = await setupHostWithGame();
    await seedUser("bob");
    asUser("bob");
    await joinGame(jsonReq("POST", { sessionCode }));
    asUser("alice");
    await startGame(jsonReq("POST"), {
      params: Promise.resolve({ id: sessionId }),
    });

    // Backdate the deadline by 5 seconds.
    await adminDb
      .collection("gameSessions")
      .doc(sessionId)
      .update({
        currentQuestionDeadline: Timestamp.fromMillis(Date.now() - 5000),
      });

    asUser("bob");
    const res = await submitAnswer(
      jsonReq("POST", { questionIndex: 0, choiceIndex: 0 }),
      { params: Promise.resolve({ id: sessionId }) },
    );
    expect(res.status).toBe(409);
  });

  it("finalize deletes gameSessionKeys when game ends", async () => {
    const { sessionId, sessionCode } = await setupHostWithGame();
    await seedUser("bob");
    asUser("bob");
    await joinGame(jsonReq("POST", { sessionCode }));
    asUser("alice");
    await startGame(jsonReq("POST"), {
      params: Promise.resolve({ id: sessionId }),
    });
    await endGame(jsonReq("POST"), {
      params: Promise.resolve({ id: sessionId }),
    });
    expect(
      (await adminDb.collection("gameSessionKeys").doc(sessionId).get()).exists,
    ).toBe(false);
  });

  it("DELETE cancel removes both gameSessions and gameSessionKeys", async () => {
    const { sessionId } = await setupHostWithGame();
    asUser("alice");
    await cancelGame(jsonReq("DELETE"), {
      params: Promise.resolve({ id: sessionId }),
    });
    expect(
      (await adminDb.collection("gameSessions").doc(sessionId).get()).exists,
    ).toBe(false);
    expect(
      (await adminDb.collection("gameSessionKeys").doc(sessionId).get()).exists,
    ).toBe(false);
  });
});

describe("Plan 9 — team integration", () => {
  async function seedTeam(teamId: string, name: string, captainUid: string) {
    await adminDb
      .collection("teams")
      .doc(teamId)
      .set({
        teamId,
        name,
        inviteCode: "TESTCD",
        captainUid,
        memberUids: [captainUid],
        createdBy: captainUid,
        stats: {
          gamesPlayed: 0,
          gamesWon: 0,
          lastPlayedAt: null,
          recentGames: [],
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      });
  }

  it("/games/join snapshots teamId + teamNameSnapshot for teamed players", async () => {
    const { sessionId, sessionCode } = await setupHostWithGame();
    await seedTeam("t1", "Quiz Crew", "bob");
    await seedUser("bob", { teamId: "t1" });
    asUser("bob");
    await joinGame(jsonReq("POST", { sessionCode }));

    const s = await adminDb.collection("gameSessions").doc(sessionId).get();
    expect(s.data()!.players.bob.teamId).toBe("t1");
    expect(s.data()!.players.bob.teamNameSnapshot).toBe("Quiz Crew");
  });

  it("/games/join records teamId=null for free agents", async () => {
    const { sessionId, sessionCode } = await setupHostWithGame();
    await seedUser("bob");
    asUser("bob");
    await joinGame(jsonReq("POST", { sessionCode }));

    const s = await adminDb.collection("gameSessions").doc(sessionId).get();
    expect(s.data()!.players.bob.teamId).toBeNull();
    expect(s.data()!.players.bob.teamNameSnapshot).toBeNull();
  });

  it("finalize updates per-team stats; winning team gets gamesWon++", async () => {
    const { sessionId, sessionCode } = await setupHostWithGame();
    await seedTeam("t1", "Crew A", "bob");
    await seedTeam("t2", "Crew B", "carol");
    await seedUser("bob", { teamId: "t1" });
    await seedUser("carol", { teamId: "t2" });
    asUser("bob");
    await joinGame(jsonReq("POST", { sessionCode }));
    asUser("carol");
    await joinGame(jsonReq("POST", { sessionCode }));
    asUser("alice");
    await startGame(jsonReq("POST"), {
      params: Promise.resolve({ id: sessionId }),
    });

    asUser("bob");
    await submitAnswer(
      jsonReq("POST", { questionIndex: 0, choiceIndex: 0 }),
      { params: Promise.resolve({ id: sessionId }) },
    );
    asUser("carol");
    await submitAnswer(
      jsonReq("POST", { questionIndex: 0, choiceIndex: 2 }),
      { params: Promise.resolve({ id: sessionId }) },
    );

    asUser("alice");
    await endGame(jsonReq("POST"), {
      params: Promise.resolve({ id: sessionId }),
    });

    const t1 = await adminDb.collection("teams").doc("t1").get();
    const t2 = await adminDb.collection("teams").doc("t2").get();
    expect(t1.data()!.stats.gamesPlayed).toBe(1);
    expect(t1.data()!.stats.gamesWon).toBe(1);
    expect(t1.data()!.stats.recentGames).toHaveLength(1);
    expect(t1.data()!.stats.recentGames[0]!.finalRank).toBe(1);
    expect(t1.data()!.stats.recentGames[0]!.totalTeams).toBe(2);
    expect(t1.data()!.stats.recentGames[0]!.teamScore).toBe(1);

    expect(t2.data()!.stats.gamesPlayed).toBe(1);
    expect(t2.data()!.stats.gamesWon).toBe(0);
    expect(t2.data()!.stats.recentGames[0]!.finalRank).toBe(2);
  });

  it("teams tied for top → no team gets gamesWon++", async () => {
    const { sessionId, sessionCode } = await setupHostWithGame();
    await seedTeam("t1", "Crew A", "bob");
    await seedTeam("t2", "Crew B", "carol");
    await seedUser("bob", { teamId: "t1" });
    await seedUser("carol", { teamId: "t2" });
    asUser("bob");
    await joinGame(jsonReq("POST", { sessionCode }));
    asUser("carol");
    await joinGame(jsonReq("POST", { sessionCode }));
    asUser("alice");
    await startGame(jsonReq("POST"), {
      params: Promise.resolve({ id: sessionId }),
    });
    asUser("bob");
    await submitAnswer(
      jsonReq("POST", { questionIndex: 0, choiceIndex: 0 }),
      { params: Promise.resolve({ id: sessionId }) },
    );
    asUser("carol");
    await submitAnswer(
      jsonReq("POST", { questionIndex: 0, choiceIndex: 0 }),
      { params: Promise.resolve({ id: sessionId }) },
    );
    asUser("alice");
    await endGame(jsonReq("POST"), {
      params: Promise.resolve({ id: sessionId }),
    });

    const t1 = await adminDb.collection("teams").doc("t1").get();
    const t2 = await adminDb.collection("teams").doc("t2").get();
    expect(t1.data()!.stats.gamesWon).toBe(0);
    expect(t2.data()!.stats.gamesWon).toBe(0);
    expect(t1.data()!.stats.gamesPlayed).toBe(1);
    expect(t2.data()!.stats.gamesPlayed).toBe(1);
  });

  it("disbanded team mid-game is silently skipped on finalize", async () => {
    const { sessionId, sessionCode } = await setupHostWithGame();
    await seedTeam("t1", "Crew A", "bob");
    await seedUser("bob", { teamId: "t1" });
    asUser("bob");
    await joinGame(jsonReq("POST", { sessionCode }));
    asUser("alice");
    await startGame(jsonReq("POST"), {
      params: Promise.resolve({ id: sessionId }),
    });
    asUser("bob");
    await submitAnswer(
      jsonReq("POST", { questionIndex: 0, choiceIndex: 0 }),
      { params: Promise.resolve({ id: sessionId }) },
    );

    await adminDb.collection("teams").doc("t1").delete();

    asUser("alice");
    const res = await endGame(jsonReq("POST"), {
      params: Promise.resolve({ id: sessionId }),
    });
    expect(res.status).toBe(200);
    const userBob = await adminDb.collection("users").doc("bob").get();
    expect(userBob.data()!.stats.gamesPlayed).toBe(1);
  });
});

describe("DELETE /api/games/[id] (cancel)", () => {
  it("host cancels session in lobby", async () => {
    const { sessionId } = await setupHostWithGame();
    asUser("alice");
    const res = await cancelGame(jsonReq("DELETE"), {
      params: Promise.resolve({ id: sessionId }),
    });
    expect(res.status).toBe(200);
    expect(
      (await adminDb.collection("gameSessions").doc(sessionId).get()).exists,
    ).toBe(false);
  });

  it("409 if session is active (cannot cancel)", async () => {
    const { sessionId } = await setupHostWithGame();
    asUser("alice");
    await startGame(jsonReq("POST"), {
      params: Promise.resolve({ id: sessionId }),
    });
    const res = await cancelGame(jsonReq("DELETE"), {
      params: Promise.resolve({ id: sessionId }),
    });
    expect(res.status).toBe(409);
  });
});

describe("GET /api/admin/games", () => {
  it("admin sees the session", async () => {
    const { sessionId } = await setupHostWithGame();
    await seedUser("admin", { isAdmin: true });
    asUser("admin");
    const res = await adminListGames();
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      sessions: Array<{ sessionId: string }>;
    };
    expect(body.sessions.find((s) => s.sessionId === sessionId)).toBeTruthy();
  });
});
