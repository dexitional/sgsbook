// Gmail SMTP via nodemailer, used for every outbound email this app sends —
// both customer-facing (booking invoice on approval, receipt on payment)
// and staff prep-notification emails. Previously routed customer emails
// through Unosend, but its sender domain was never verified, so it could
// never actually deliver — dropped in favor of the already-working Gmail
// account.
import nodemailer from "nodemailer";

export interface EmailAttachment {
  filename: string;
  content: Buffer;
  cid?: string;
}

export interface SendEmailInput {
  to: string;
  bcc?: string[];
  subject: string;
  html: string;
  text?: string;
  attachments?: EmailAttachment[];
}

export interface EmailService {
  send(input: SendEmailInput): Promise<void>;
}

// GMAIL_APP_PASSWORD must be a Google App Password (Google Account ->
// Security -> 2-Step Verification -> App passwords) — Gmail SMTP rejects a
// normal account login password. The From address must match the
// authenticated account; anything else gets silently rewritten or rejected.
class GmailEmailService implements EmailService {
  private transporter: import("nodemailer").Transporter;

  constructor(
    private readonly fromAddress: string,
    private readonly fromName: string,
    password: string,
  ) {
    this.transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user: fromAddress, pass: password },
    });
  }

  async send(input: SendEmailInput): Promise<void> {
    await this.transporter.sendMail({
      from: `${this.fromName} <${this.fromAddress}>`,
      to: input.to,
      bcc: input.bcc,
      subject: input.subject,
      html: input.html,
      text: input.text,
      attachments: input.attachments,
    });
  }
}

class NoopEmailService implements EmailService {
  async send(input: SendEmailInput): Promise<void> {
    console.warn(`[email:noop] GMAIL_USER/GMAIL_APP_PASSWORD not set — skipping email to ${input.to}: "${input.subject}"`);
  }
}

const gmailUser = process.env.GMAIL_USER;
const gmailPassword = process.env.GMAIL_APP_PASSWORD;
const gmailFromName = process.env.GMAIL_FROM_NAME ?? "SGS Booking Platform";

const gmailEmailService: EmailService =
  gmailUser && gmailPassword ? new GmailEmailService(gmailUser, gmailFromName, gmailPassword) : new NoopEmailService();

export const emailService: EmailService = gmailEmailService;
export const staffEmailService: EmailService = gmailEmailService;
