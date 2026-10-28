// Customer/staff notifications for request lifecycle events beyond approval
// (which stays inline in modules/requests/service.ts). Best-effort
// throughout, same as approval: delivery failures are logged, never thrown,
// so a status change or reschedule never fails because email/SMS hiccupped.
import { prisma, Prisma } from "@sgs/db";
import { emailService, staffEmailService } from "./email.js";
import { smsService } from "./sms.js";
import { buildRejectionEmail, buildScheduleChangeEmail, escapeHtml, getLogoAttachment } from "./invoice-email.js";

export const notifyInclude = {
  client: true,
  packages: { include: { bookItem: true, UbsAddon: { include: { item: true } } } },
  payment: { where: { status: true }, select: { paidAmount: true } },
} satisfies Prisma.UbsRequestInclude;

type NotifiableRequest = Prisma.UbsRequestGetPayload<{ include: typeof notifyInclude }>;

// Staff who should be alerted to prepare the facility — every active user
// with a role on this app, regardless of which role (admin, facilitator,
// decorator all get notified).
export async function getActiveStaffContacts() {
  const app = await prisma.app.findUnique({ where: { tag: "ubs" } });
  if (!app) return [];
  const users = await prisma.user.findMany({
    where: { status: true, userRole: { some: { status: true, appRole: { appId: app.id } } } },
    select: { name: true, username: true, email: true, phone: true },
  });
  return users;
}

function formatWhen(value: Date | string) {
  return new Date(value).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" });
}

export function notifyRequestRejected(request: NotifiableRequest, reason: string) {
  const client = request.client;
  if (!client) return;

  if (client.email) {
    const email = buildRejectionEmail({
      requestId: request.id,
      title: request.title,
      clientName: client.organisation || client.name,
      reason,
      packages: request.packages,
    });
    void emailService
      .send({ to: client.email, subject: email.subject, html: email.html, attachments: [getLogoAttachment()] })
      .catch((err) => console.error("Failed to send rejection email:", err));
  }

  if (client.phone) {
    void smsService
      .send([client.phone], `Hi ${client.name}, your booking "${request.title}" was declined. Reason: ${reason}`)
      .catch((err) => console.error("Failed to send rejection SMS:", err));
  }
}

function formatMoney(value: number) {
  return `GHS ${value.toLocaleString()}`;
}

export function notifyScheduleChanged(
  request: NotifiableRequest,
  change: { type: "RESCHEDULE" | "EXTENSION"; reason: string; byStaff: boolean; chargeBefore: number },
) {
  const client = request.client;
  const extended = change.type === "EXTENSION";
  const verb = extended ? "extended" : "rescheduled";
  const chargeAfter = request.chargeAmount ?? 0;
  const paid = request.payment.reduce((sum, p) => sum + (p.paidAmount ?? 0), 0);
  const balance = chargeAfter - paid;
  const schedule = request.packages
    .filter((p) => p.bookStart && p.bookEnd)
    .map((p) => `${p.bookItem.title}: ${formatWhen(p.bookStart!)} - ${formatWhen(p.bookEnd!)}`)
    .join("; ");
  // Extension: the extra charge is the point. Reschedule: the total is
  // re-priced on the new period, so say what it is now.
  const moneyLine = extended
    ? `Extra charge: ${formatMoney(chargeAfter - change.chargeBefore)}. Balance due: ${formatMoney(Math.max(0, balance))}.`
    : chargeAfter !== change.chargeBefore
      ? `New total: ${formatMoney(chargeAfter)} (was ${formatMoney(change.chargeBefore)}).`
      : "";

  if (client?.email) {
    const email = buildScheduleChangeEmail({
      type: change.type,
      requestId: request.id,
      title: request.title,
      clientName: client.organisation || client.name,
      reason: change.reason,
      changedByStaff: change.byStaff,
      chargeBefore: change.chargeBefore,
      chargeAmount: chargeAfter,
      paidAmount: paid,
      packages: request.packages,
    });
    void emailService
      .send({ to: client.email, subject: email.subject, html: email.html, attachments: [getLogoAttachment()] })
      .catch((err) => console.error(`Failed to send ${verb} email:`, err));
  }

  if (client?.phone) {
    void smsService
      .send(
        [client.phone],
        `Hi ${client.name}, your booking "${request.title}" has been ${verb}. ${schedule}. ${moneyLine}`.trim(),
      )
      .catch((err) => console.error(`Failed to send ${verb} SMS:`, err));
  }

  // Staff only need to hear about it once the slot is actually committed —
  // a PENDED request's dates changing doesn't affect facility prep yet.
  if (request.status !== "APPROVED") return;

  void getActiveStaffContacts()
    .then((staff) => {
      const emails = staff.map((s) => s.email).filter((e): e is string => !!e);
      const phones = staff.map((s) => s.phone).filter((p): p is string => !!p);
      const who = change.byStaff ? "staff" : (client?.organisation || client?.name || "the customer");

      if (emails.length > 0) {
        void staffEmailService
          .send({
            to: emails[0],
            bcc: emails.slice(1),
            subject: `Booking ${verb}: ${request.title}`,
            html: `<p>Approved booking "<strong>${request.title}</strong>" was ${verb} by ${who}.</p><p>New schedule: ${schedule}</p>${moneyLine ? `<p>${moneyLine}</p>` : ""}<p>Reason: ${escapeHtml(change.reason)}</p>`,
          })
          .catch((err) => console.error(`Failed to send staff ${verb} email:`, err));
      }

      if (phones.length > 0) {
        void smsService
          .send(phones, `Booking "${request.title}" ${verb}. ${schedule}.`)
          .catch((err) => console.error(`Failed to send staff ${verb} SMS:`, err));
      }
    })
    .catch((err) => console.error(`Failed to load staff contacts for ${verb} notification:`, err));
}
