import type { SessionTakeoverRequest } from "@/types/firestore";

/** How often a live player pings presence. */
export const HEARTBEAT_MS = 10_000;
/** A player counts as "present" if seen within this window (2.5 heartbeats). */
export const PRESENCE_ACTIVE_MS = 25_000;
/** How long the current captain has to respond before takeover auto-approves. */
export const TAKEOVER_WINDOW_MS = 30_000;

/** True when a heartbeat timestamp is recent enough to count as present. */
export function isPresent(
  lastSeenMs: number | null | undefined,
  nowMs: number,
): boolean {
  if (!lastSeenMs) return false;
  return nowMs - lastSeenMs < PRESENCE_ACTIVE_MS;
}

export interface TakeoverInput {
  /** Current captain uid, or null if the team has no captain yet. */
  captainUid: string | null;
  /** Whether the current captain is presently active (ignored if no captain). */
  captainPresent: boolean;
  /** Existing pending request on the team, if any. */
  pending: SessionTakeoverRequest | null;
  /** The uid asking to become captain. */
  requesterUid: string;
  nowMs: number;
}

export type TakeoverDecision =
  /** Grant captaincy to the requester immediately. */
  | { kind: "claim" }
  /** Open (or keep) a 30s approval request for the current captain. */
  | { kind: "pending"; deadlineMs: number }
  /** A different requester already has an unexpired request in flight. */
  | { kind: "in_progress" };

/**
 * Decide what happens when `requesterUid` asks to take over as captain.
 *
 * - No captain, or the requester is already captain → instant claim.
 * - A same-requester request whose 30s window has elapsed → instant claim
 *   (this is the auto-approve path the client triggers at the deadline).
 * - The current captain isn't present → instant claim.
 * - Otherwise → open a pending request (or report one already in progress).
 *
 * Any *other* requester's expired request is treated as stale and ignored.
 */
export function decideTakeover(input: TakeoverInput): TakeoverDecision {
  const { captainUid, captainPresent, pending, requesterUid, nowMs } = input;

  const pendingActive = pending != null && pending.deadlineMs > nowMs;

  // The requester's own request has run out its clock → auto-approve.
  if (
    pending != null &&
    pending.requesterUid === requesterUid &&
    pending.deadlineMs <= nowMs
  ) {
    return { kind: "claim" };
  }

  if (captainUid == null || captainUid === requesterUid) {
    return { kind: "claim" };
  }

  // A live request from someone else blocks new ones until it resolves.
  if (pendingActive && pending!.requesterUid !== requesterUid) {
    return { kind: "in_progress" };
  }

  if (!captainPresent) {
    return { kind: "claim" };
  }

  if (pendingActive && pending!.requesterUid === requesterUid) {
    return { kind: "pending", deadlineMs: pending!.deadlineMs };
  }

  return { kind: "pending", deadlineMs: nowMs + TAKEOVER_WINDOW_MS };
}
