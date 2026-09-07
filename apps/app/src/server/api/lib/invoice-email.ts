// Builds the HTML email bodies for the invoice (sent on request approval)
// and receipt (sent on payment recorded) customer emails. Mirrors the
// content/layout of the print pages (routes/requests/$requestId/print.tsx
// and routes/invoices/$paymentId/print.tsx) as plain inline-styled HTML,
// since email clients don't run Tailwind/CSS files.
import { computeDays } from "@sgs/ui";
import type { EmailAttachment } from "./email.js";
import { LOGO_BASE64, LOGO_MIME } from "./logo-base64.js";

const LOGO_CID = "sgs-logo";

// Gmail (and most clients) strip both relative-path <img> and data: URIs
// from received HTML email, so the logo has to travel as a real CID inline
// attachment rather than a normal <img src>.
export function getLogoAttachment(): EmailAttachment {
  return { filename: `logo.${LOGO_MIME.split("/")[1]}`, content: Buffer.from(LOGO_BASE64, "base64"), cid: LOGO_CID };
}

interface EmailPackageLine {
  bookStart: Date | string | null;
  bookEnd: Date | string | null;
  bookItem: { title: string; amount: number | null };
  UbsAddon: { item: { title: string; amount: number | null } }[];
}

function formatWhen(value: Date | string): string {
  return new Date(value).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" });
}

function renderPackageRows(packages: EmailPackageLine[]): string {
  return packages
    .map((pkg) => {
      const days = pkg.bookStart && pkg.bookEnd ? computeDays(pkg.bookStart, pkg.bookEnd) : 1;
      const unitPrice = pkg.bookItem.amount ?? 0;
      const facilityTotal = unitPrice * days;
      const addonsTotal = pkg.UbsAddon.reduce((sum, a) => sum + (a.item.amount ?? 0) * days, 0);
      const addonNames = pkg.UbsAddon.map((a) => a.item.title).join(", ");
      return `
        <tr>
          <td style="padding:8px 0;border-bottom:1px solid #e5e7eb;">
            <strong>${pkg.bookItem.title}</strong>
            ${addonNames ? `<br><span style="font-size:12px;color:#6b7280;">+ ${addonNames}</span>` : ""}
          </td>
          <td style="padding:8px 0;border-bottom:1px solid #e5e7eb;color:#6b7280;font-size:13px;">
            ${pkg.bookStart ? `${formatWhen(pkg.bookStart)}<br>` : ""}${days} ${days === 1 ? "day" : "days"}
          </td>
          <td style="padding:8px 0;border-bottom:1px solid #e5e7eb;text-align:right;font-family:monospace;white-space:nowrap;">
            GHS ${(facilityTotal + addonsTotal).toLocaleString()}
          </td>
        </tr>`;
    })
    .join("");
}

const PAY_TO_BLOCK = `
  <div style="margin-top:16px;border-top:1px solid #e5e7eb;padding-top:12px;">
    <p style="margin:0;text-transform:uppercase;color:#6b7280;font-size:10px;">Pay to</p>
    <p style="margin:2px 0 0;font-weight:bold;color:#6b7280;font-size:11px;">School of Graduate Studies,</p>
    <p style="margin:0;font-weight:bold;color:#6b7280;font-size:11px;">National Investment Bank,</p>
    <p style="margin:0;font-weight:bold;color:#6b7280;font-size:11px;">Account No. 1111000120801</p>
    <p style="margin:0;font-weight:bold;color:#6b7280;font-size:11px;">Cape Coast</p>
  </div>`;

function wrapEmail(input: {
  label: string;
  refValue: string;
  clientName: string;
  infoHtml: string;
  rowsHtml: string;
  footerHtml: string;
}): string {
  return `
    <div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;color:#111827;">
      <div style="display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #e5e7eb;padding-bottom:16px;margin-bottom:16px;">
        <div style="display:flex;align-items:center;gap:10px;">
          <img src="cid:${LOGO_CID}" alt="" width="36" height="36" style="width:36px;height:36px;object-fit:contain;" />
          <div>
            <p style="margin:0;font-weight:600;">School of Graduate Studies</p>
            <p style="margin:0;font-size:12px;color:#6b7280;">Facilities Booking System</p>
          </div>
        </div>
        <div style="text-align:right;">
          <p style="margin:0;font-size:10px;text-transform:uppercase;color:#6b7280;">${input.label}</p>
          <p style="margin:0;font-family:monospace;font-size:13px;">${input.refValue}</p>
        </div>
      </div>
      <p style="margin:0 0 12px;">Hi ${input.clientName},</p>
      ${input.infoHtml}
      <table style="width:100%;border-collapse:collapse;font-size:14px;margin-top:12px;">
        <thead>
          <tr style="text-align:left;font-size:11px;text-transform:uppercase;color:#6b7280;">
            <th style="padding-bottom:6px;">Package</th>
            <th style="padding-bottom:6px;">Period</th>
            <th style="padding-bottom:6px;text-align:right;">Amount</th>
          </tr>
        </thead>
        <tbody>${input.rowsHtml}</tbody>
      </table>
      ${input.footerHtml}
      <p style="margin-top:20px;text-align:center;font-size:12px;color:#6b7280;">Thank you for booking with us.</p>
    </div>`;
}

export function buildInvoiceEmail(input: {
  requestId: string;
  title: string;
  clientName: string;
  chargeAmount: number | null;
  packages: EmailPackageLine[];
}): { subject: string; html: string } {
  const totalsRow = `
    <tr>
      <td colspan="2" style="padding-top:12px;text-align:right;font-weight:600;">Invoice total</td>
      <td style="padding-top:12px;text-align:right;font-family:monospace;font-weight:600;white-space:nowrap;">GHS ${(input.chargeAmount ?? 0).toLocaleString()}</td>
    </tr>`;

  const html = wrapEmail({
    label: "Invoice",
    refValue: input.requestId.slice(0, 8).toUpperCase(),
    clientName: input.clientName,
    infoHtml: `<p style="margin:0 0 4px;">Your booking request "<strong>${input.title}</strong>" has been approved. Please find the invoice below.</p>`,
    rowsHtml: renderPackageRows(input.packages) + totalsRow,
    footerHtml: PAY_TO_BLOCK,
  });

  return { subject: `Invoice for your booking: ${input.title}`, html };
}

export function buildReceiptEmail(input: {
  paymentId: string;
  title: string;
  clientName: string;
  chargeAmount: number | null;
  paidAmount: number | null;
  paidRef?: string | null;
  paidAt: Date | string;
  packages: EmailPackageLine[];
}): { subject: string; html: string } {
  const totalsRows = `
    <tr>
      <td colspan="2" style="padding-top:12px;text-align:right;color:#6b7280;">Invoice total</td>
      <td style="padding-top:12px;text-align:right;font-family:monospace;color:#6b7280;white-space:nowrap;">GHS ${(input.chargeAmount ?? 0).toLocaleString()}</td>
    </tr>
    <tr>
      <td colspan="2" style="text-align:right;font-weight:600;">Total paid</td>
      <td style="text-align:right;font-family:monospace;font-weight:600;white-space:nowrap;">GHS ${(input.paidAmount ?? 0).toLocaleString()}</td>
    </tr>`;

  const html = wrapEmail({
    label: "Receipt",
    refValue: input.paymentId.slice(0, 8).toUpperCase(),
    clientName: input.clientName,
    infoHtml: `
      <p style="margin:0 0 4px;">We've recorded your payment for "<strong>${input.title}</strong>". Please find the receipt below.</p>
      <p style="margin:0;font-size:12px;color:#6b7280;">Paid on ${formatWhen(input.paidAt)}${input.paidRef ? ` &middot; Ref: ${input.paidRef}` : ""}</p>`,
    rowsHtml: renderPackageRows(input.packages) + totalsRows,
    footerHtml: "",
  });

  return { subject: `Receipt for your payment: ${input.title}`, html };
}
