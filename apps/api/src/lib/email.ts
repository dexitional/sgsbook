// Thin wrapper around Unosend's REST API (https://docs.unosend.co) — no
// official Node SDK exists, so this is a plain fetch call behind a small
// interface, kept swappable if that changes.

export interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export interface EmailService {
  send(input: SendEmailInput): Promise<void>;
}

class UnosendEmailService implements EmailService {
  // Per docs.unosend.co: POST /emails (no /v1 prefix), `from` is a plain
  // "Name <email>" string, body fields are `to`/`html`/`text` directly —
  // not the {address,name} / htmlbody shape this was first written against.
  private readonly endpoint = "https://api.unosend.co/emails";

  constructor(
    private readonly apiKey: string,
    private readonly fromAddress: string,
    private readonly fromName: string,
  ) {}

  async send(input: SendEmailInput): Promise<void> {
    const res = await fetch(this.endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: `${this.fromName} <${this.fromAddress}>`,
        to: [input.to],
        subject: input.subject,
        html: input.html,
        text: input.text,
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`Unosend send failed (${res.status}): ${body}`);
    }
  }
}

class NoopEmailService implements EmailService {
  async send(input: SendEmailInput): Promise<void> {
    console.warn(`[email:noop] UNOSEND_API_KEY not set — skipping email to ${input.to}: "${input.subject}"`);
  }
}

const apiKey = process.env.UNOSEND_API_KEY;
const fromAddress = process.env.UNOSEND_FROM_ADDRESS;
const fromName = process.env.UNOSEND_FROM_NAME ?? "SGS Booking Platform";

export const emailService: EmailService =
  apiKey && fromAddress ? new UnosendEmailService(apiKey, fromAddress, fromName) : new NoopEmailService();
