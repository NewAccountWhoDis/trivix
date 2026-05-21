import "server-only";

/**
 * Sends a plain-text email via Resend's REST API. No-ops (with a warning) when
 * the API key or sender address isn't configured, so local/dev never errors.
 * Never throws — failures are logged so they can't break the triggering action.
 */
export async function sendEmail(opts: {
  to: string;
  subject: string;
  text: string;
}): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.NOTIFICATIONS_FROM_EMAIL;
  if (!apiKey || !from) {
    console.warn(
      "[notifications] RESEND_API_KEY / NOTIFICATIONS_FROM_EMAIL not set — skipping email to",
      opts.to,
    );
    return;
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: opts.to,
        subject: opts.subject,
        text: opts.text,
      }),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      console.error("[notifications] Resend send failed", res.status, detail);
    }
  } catch (err) {
    console.error("[notifications] Resend request error", err);
  }
}
