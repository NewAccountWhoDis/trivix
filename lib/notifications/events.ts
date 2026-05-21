import type { AdminNotificationEventKey } from "@/types/firestore";

export type { AdminNotificationEventKey };

export interface AdminNotificationEventMeta {
  key: AdminNotificationEventKey;
  label: string;
}

/** The six admin notification events, in alphabetical label order for the UI. */
export const ADMIN_NOTIFICATION_EVENTS: AdminNotificationEventMeta[] = [
  { key: "accountDeletionRequest", label: "Account deletion request" },
  { key: "accountsNeedReview", label: "Accounts need review" },
  { key: "gameStarted", label: "Game started" },
  { key: "newHostRequest", label: "New host request" },
  { key: "newUserSignup", label: "New user signup" },
  { key: "newVenueAdded", label: "New venue added" },
];

export interface ChannelPrefs {
  email: boolean;
  sms: boolean;
}

export type EventPrefs = Record<AdminNotificationEventKey, ChannelPrefs>;

/** All events off — used as the default and as a normalization base. */
export function emptyEventPrefs(): EventPrefs {
  return ADMIN_NOTIFICATION_EVENTS.reduce((acc, e) => {
    acc[e.key] = { email: false, sms: false };
    return acc;
  }, {} as EventPrefs);
}
