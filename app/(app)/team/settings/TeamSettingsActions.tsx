"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";
import { Card } from "@/components/ui/Card";

interface Member {
  uid: string;
  displayName: string;
  firstName: string;
  lastName: string;
  avatarSeed: string;
}

interface JoinReq {
  uid: string;
  displayName: string;
}

export function TeamSettingsActions({
  teamId,
  inviteCode,
  members,
  requests,
  captainUid,
}: {
  teamId: string;
  inviteCode: string;
  members: Member[];
  requests: JoinReq[];
  captainUid: string;
}) {
  const router = useRouter();
  const [code, setCode] = useState(inviteCode);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function call(
    path: string,
    method: "POST" | "DELETE",
    body?: unknown,
  ): Promise<Response> {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(path, {
        method,
        ...(body
          ? {
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(body),
            }
          : {}),
      });
      if (!res.ok) {
        const b = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(b.error ?? "Request failed");
      }
      return res;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed");
      throw err;
    } finally {
      setBusy(false);
    }
  }

  async function handleRegen() {
    try {
      const res = await call(`/api/teams/${teamId}/regenerate-code`, "POST");
      const body = (await res.json()) as { inviteCode: string };
      setCode(body.inviteCode);
    } catch {
      // error already shown
    }
  }

  function handleCopy() {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  async function handleApprove(uid: string) {
    try {
      await call(`/api/teams/${teamId}/requests/${uid}`, "POST", {
        action: "approve",
      });
      router.refresh();
    } catch {
      // shown
    }
  }

  async function handleDeny(uid: string) {
    try {
      await call(`/api/teams/${teamId}/requests/${uid}`, "POST", {
        action: "deny",
      });
      router.refresh();
    } catch {
      // shown
    }
  }

  async function handleTransfer(uid: string) {
    if (!confirm(`Transfer captain to @${uid}?`)) return;
    try {
      await call(`/api/teams/${teamId}/transfer-captain`, "POST", { uid });
      router.push("/team");
      router.refresh();
    } catch {
      // shown
    }
  }

  async function handleDisband() {
    if (
      !confirm(
        "Disband the team? Every member will lose their team. This cannot be undone.",
      )
    )
      return;
    try {
      await call(`/api/teams/${teamId}`, "DELETE");
      router.push("/team");
      router.refresh();
    } catch {
      // shown
    }
  }

  const otherMembers = members.filter((m) => m.uid !== captainUid);

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <div className="p-5">
          <div className="text-xs uppercase tracking-[3px] text-text-faint mb-2">
            Invite code
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <div className="font-display text-3xl tracking-[6px]">{code}</div>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleCopy}
              disabled={busy}
            >
              {copied ? "Copied" : "Copy"}
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleRegen}
              disabled={busy}
            >
              Regenerate
            </Button>
          </div>
          <p className="text-xs text-text-faint mt-3">
            Regenerating immediately invalidates the old code.
          </p>
        </div>
      </Card>

      <Card>
        <div className="p-5">
          <div className="text-xs uppercase tracking-[3px] text-text-faint mb-3">
            Pending requests ({requests.length})
          </div>
          {requests.length === 0 ? (
            <p className="text-sm text-text-muted">No pending requests.</p>
          ) : (
            <ul className="divide-y divide-brand-line">
              {requests.map((r) => (
                <li
                  key={r.uid}
                  className="flex items-center justify-between gap-3 py-3"
                >
                  <span className="text-text-primary">@{r.displayName}</span>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleApprove(r.uid)}
                      disabled={busy}
                    >
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDeny(r.uid)}
                      disabled={busy}
                    >
                      Deny
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Card>

      {otherMembers.length > 0 && (
        <Card>
          <div className="p-5">
            <div className="text-xs uppercase tracking-[3px] text-text-faint mb-3">
              Transfer captain
            </div>
            <ul className="divide-y divide-brand-line">
              {otherMembers.map((m) => (
                <li
                  key={m.uid}
                  className="flex items-center justify-between gap-3 py-3"
                >
                  <span className="text-text-primary">@{m.displayName}</span>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => handleTransfer(m.uid)}
                    disabled={busy}
                  >
                    Make captain
                  </Button>
                </li>
              ))}
            </ul>
          </div>
        </Card>
      )}

      <Card variant="elevated" className="border-game-red/40">
        <div className="p-5">
          <div className="text-xs uppercase tracking-[3px] text-game-red mb-2">
            Danger zone
          </div>
          <p className="text-sm text-text-muted mb-3">
            Disband this team. All members lose their team affiliation.
          </p>
          <Button variant="danger" onClick={handleDisband} disabled={busy}>
            Disband team
          </Button>
        </div>
      </Card>

      {error && (
        <div
          role="alert"
          className="text-sm text-game-red bg-game-red/10 border border-game-red/30 rounded-md px-3 py-2"
        >
          {error}
        </div>
      )}
    </div>
  );
}
