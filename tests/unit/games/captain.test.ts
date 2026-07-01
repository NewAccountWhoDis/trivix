import { describe, expect, it } from "vitest";
import {
  decideTakeover,
  isPresent,
  PRESENCE_ACTIVE_MS,
  TAKEOVER_WINDOW_MS,
} from "@/lib/games/captain";
import type { SessionTakeoverRequest } from "@/types/firestore";

const NOW = 1_000_000;

describe("isPresent", () => {
  it("is present within the active window", () => {
    expect(isPresent(NOW - (PRESENCE_ACTIVE_MS - 1), NOW)).toBe(true);
  });
  it("is absent past the active window", () => {
    expect(isPresent(NOW - PRESENCE_ACTIVE_MS, NOW)).toBe(false);
  });
  it("is absent with no heartbeat", () => {
    expect(isPresent(null, NOW)).toBe(false);
    expect(isPresent(undefined, NOW)).toBe(false);
  });
});

const pending = (over: Partial<SessionTakeoverRequest> = {}): SessionTakeoverRequest => ({
  requesterUid: "req",
  requesterName: "Req",
  deadlineMs: NOW + TAKEOVER_WINDOW_MS,
  ...over,
});

describe("decideTakeover", () => {
  it("claims instantly when the team has no captain", () => {
    expect(
      decideTakeover({
        captainUid: null,
        captainPresent: false,
        pending: null,
        requesterUid: "a",
        nowMs: NOW,
      }),
    ).toEqual({ kind: "claim" });
  });

  it("claims instantly when the requester already is captain", () => {
    expect(
      decideTakeover({
        captainUid: "a",
        captainPresent: true,
        pending: null,
        requesterUid: "a",
        nowMs: NOW,
      }),
    ).toEqual({ kind: "claim" });
  });

  it("claims instantly when the current captain isn't present", () => {
    expect(
      decideTakeover({
        captainUid: "a",
        captainPresent: false,
        pending: null,
        requesterUid: "b",
        nowMs: NOW,
      }),
    ).toEqual({ kind: "claim" });
  });

  it("opens a 30s pending request against a present captain", () => {
    expect(
      decideTakeover({
        captainUid: "a",
        captainPresent: true,
        pending: null,
        requesterUid: "b",
        nowMs: NOW,
      }),
    ).toEqual({ kind: "pending", deadlineMs: NOW + TAKEOVER_WINDOW_MS });
  });

  it("keeps the same deadline when the same requester asks again", () => {
    const p = pending({ requesterUid: "b", deadlineMs: NOW + 5000 });
    expect(
      decideTakeover({
        captainUid: "a",
        captainPresent: true,
        pending: p,
        requesterUid: "b",
        nowMs: NOW,
      }),
    ).toEqual({ kind: "pending", deadlineMs: NOW + 5000 });
  });

  it("reports in-progress when someone else has a live request", () => {
    const p = pending({ requesterUid: "b" });
    expect(
      decideTakeover({
        captainUid: "a",
        captainPresent: true,
        pending: p,
        requesterUid: "c",
        nowMs: NOW,
      }),
    ).toEqual({ kind: "in_progress" });
  });

  it("auto-approves once the requester's own window has elapsed", () => {
    const p = pending({ requesterUid: "b", deadlineMs: NOW - 1 });
    expect(
      decideTakeover({
        captainUid: "a",
        captainPresent: true,
        pending: p,
        requesterUid: "b",
        nowMs: NOW,
      }),
    ).toEqual({ kind: "claim" });
  });

  it("ignores another requester's stale (expired) request", () => {
    const p = pending({ requesterUid: "b", deadlineMs: NOW - 1 });
    // Captain present, so a fresh request from c opens its own pending.
    expect(
      decideTakeover({
        captainUid: "a",
        captainPresent: true,
        pending: p,
        requesterUid: "c",
        nowMs: NOW,
      }),
    ).toEqual({ kind: "pending", deadlineMs: NOW + TAKEOVER_WINDOW_MS });
  });
});
