// mNotify (https://mnotify.com) bulk SMS gateway — no official Node SDK,
// plain fetch against their "quick" send endpoint. NOTE: implemented from
// general knowledge of mNotify's documented API shape, not verified against
// a live send (that would cost money / actually text someone) — confirm
// against the current docs in your mNotify dashboard if the first real send
// fails, and check the response `code` in the logs.
//
// mNotify requires an alphanumeric Sender ID (max 11 chars) to be
// pre-registered/approved in your account dashboard before it can be used —
// an unapproved one will likely be rejected or silently substituted.
export interface SmsService {
  send(recipients: string[], message: string): Promise<void>;
}

class MnotifySmsService implements SmsService {
  private readonly endpoint = "https://api.mnotify.com/api/sms/quick";

  constructor(
    private readonly apiKey: string,
    private readonly senderId: string,
  ) {}

  async send(recipients: string[], message: string): Promise<void> {
    if (recipients.length === 0) return;

    const res = await fetch(`${this.endpoint}?key=${encodeURIComponent(this.apiKey)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        recipient: recipients,
        sender: this.senderId,
        message,
        is_schedule: "false",
        schedule_date: "",
      }),
    });

    const body = await res.json().catch(() => null);
    if (!res.ok || (body && String(body.code) !== "2000")) {
      throw new Error(`mNotify send failed (${res.status}): ${JSON.stringify(body)}`);
    }
  }
}

class NoopSmsService implements SmsService {
  async send(recipients: string[], message: string): Promise<void> {
    console.warn(`[sms:noop] MNOTIFY_API_KEY not set — skipping SMS to ${recipients.join(", ")}: "${message}"`);
  }
}

const apiKey = process.env.MNOTIFY_API_KEY;
const senderId = process.env.MNOTIFY_SENDER_ID ?? "SGS";

export const smsService: SmsService = apiKey ? new MnotifySmsService(apiKey, senderId) : new NoopSmsService();
