import { prisma, Prisma } from "@sgs/db";
import type { z } from "zod";
import { emailService, staffEmailService } from "../../lib/email.js";
import { smsService } from "../../lib/sms.js";
import { buildInvoiceEmail, getLogoAttachment } from "../../lib/invoice-email.js";
import { computeRequestInvoice, type PackageInput } from "../../lib/pricing.js";
import { assertAvailable } from "../../lib/availability.js";
import { paymentDueFrom, sweepUnpaidApprovalsThrottled } from "../../lib/payment-deadline.js";
import { getActiveStaffContacts, notifyRequestRejected } from "../../lib/request-notifications.js";
import { extendRequest as extendRequestCore, rescheduleRequest as rescheduleRequestCore } from "../../lib/reschedule.js";
import { AppError } from "../../middleware/error-handler.js";
import type {
  createRequestSchema,
  extendRequestSchema,
  listRequestsQuerySchema,
  rescheduleRequestSchema,
  updateStatusSchema,
} from "./schema.js";

type CreateRequestInput = z.infer<typeof createRequestSchema>;
type UpdateStatusInput = z.infer<typeof updateStatusSchema>;
type ListQuery = z.infer<typeof listRequestsQuerySchema>;
type RescheduleInput = z.infer<typeof rescheduleRequestSchema>;
type ExtendInput = z.infer<typeof extendRequestSchema>;

const detailInclude = {
  client: { include: { contacts: true } },
  packages: { include: { bookItem: true, UbsAddon: { include: { item: true } } } },
  payment: true,
  reschedules: { orderBy: { createdAt: "desc" } },
} satisfies Prisma.UbsRequestInclude;

export async function listRequests(query: ListQuery) {
  await sweepUnpaidApprovalsThrottled();

  const where: Prisma.UbsRequestWhereInput = {
    ...(query.status ? { status: query.status } : {}),
    ...(query.clientId ? { clientId: query.clientId } : {}),
  };

  const [items, total] = await Promise.all([
    prisma.ubsRequest.findMany({
      where,
      include: {
        client: true,
        // Addons + payment amounts let the list show balances and price
        // reschedule/extension previews without a detail fetch per row.
        packages: { include: { bookItem: true, UbsAddon: { include: { item: true } } } },
        payment: { where: { status: true }, select: { id: true, paidAmount: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
    prisma.ubsRequest.count({ where }),
  ]);

  return { items, total, page: query.page, pageSize: query.pageSize };
}

export async function getRequest(id: string) {
  return prisma.ubsRequest.findUnique({ where: { id }, include: detailInclude });
}

export async function createRequest(input: CreateRequestInput, createdBy: number) {
  const itemIds = Array.from(
    new Set(input.packages.flatMap((pkg) => [pkg.itemId, ...(pkg.addonItemIds ?? [])])),
  );
  const items = await prisma.ubsItem.findMany({ where: { id: { in: itemIds } } });
  const itemById = new Map(items.map((item) => [item.id, item]));

  const pricingPackages: PackageInput[] = input.packages.map((pkg) => {
    const facility = itemById.get(pkg.itemId);
    if (!facility) throw new Error(`Item not found: ${pkg.itemId}`);
    return {
      bookStart: pkg.bookStart,
      bookEnd: pkg.bookEnd,
      facility: { id: facility.id, title: facility.title, amount: facility.amount },
      addons: (pkg.addonItemIds ?? []).map((addonItemId) => {
        const addon = itemById.get(addonItemId);
        if (!addon) throw new Error(`Item not found: ${addonItemId}`);
        return { id: addon.id, title: addon.title, amount: addon.amount };
      }),
    };
  });

  await assertAvailable(input.packages);

  const invoice = computeRequestInvoice(pricingPackages);

  return prisma.$transaction(async (tx) => {
    const request = await tx.ubsRequest.create({
      data: {
        clientId: input.clientId,
        title: input.title,
        description: input.description,
        chargeAmount: invoice.total,
        createdBy,
      },
    });

    for (const pkg of input.packages) {
      const created = await tx.ubsPackage.create({
        data: {
          itemId: pkg.itemId,
          requestId: request.id,
          bookStart: pkg.bookStart,
          bookEnd: pkg.bookEnd,
        },
      });

      if (pkg.addonItemIds?.length) {
        await tx.ubsAddon.createMany({
          data: pkg.addonItemIds.map((addonItemId) => ({ itemId: addonItemId, packageId: created.id })),
        });
      }
    }

    return tx.ubsRequest.findUniqueOrThrow({ where: { id: request.id }, include: detailInclude });
  });
}

export async function updateStatus(id: string, input: UpdateStatusInput) {
  const existing = await prisma.ubsRequest.findUnique({ where: { id }, include: { packages: true } });
  if (!existing) throw new AppError("Request not found.", 404);

  if (input.status === "APPROVED") {
    // Re-check at approval time: the slot may have been taken by another
    // approval, or blocked by an admin, since this request was submitted.
    await assertAvailable(
      existing.packages
        .filter((p) => p.bookStart && p.bookEnd)
        .map((p) => ({ itemId: p.itemId, bookStart: p.bookStart!, bookEnd: p.bookEnd! })),
      { excludeRequestId: id },
    );
  }

  const reason = input.reason?.trim();
  const request = await prisma.ubsRequest.update({
    where: { id },
    data: {
      status: input.status,
      ...(input.status === "APPROVED" ? { paymentDueAt: paymentDueFrom(new Date()), rejectReason: null } : {}),
      ...(input.status === "REJECTED" ? { rejectReason: reason } : {}),
    },
    include: detailInclude,
  });

  if (input.status === "REJECTED" && reason) {
    notifyRequestRejected(request, reason);
  }

  if (input.status === "APPROVED") {
    // Best-effort throughout — a booking's approval must not fail because
    // notification delivery hiccups. Failures are logged, not thrown.
    if (request.client?.email) {
      const invoiceEmail = buildInvoiceEmail({
        requestId: request.id,
        title: request.title,
        clientName: request.client.organisation || request.client.name,
        chargeAmount: request.chargeAmount,
        paymentDueAt: request.paymentDueAt,
        packages: request.packages,
      });
      void emailService
        .send({
          to: request.client.email,
          subject: invoiceEmail.subject,
          html: invoiceEmail.html,
          attachments: [getLogoAttachment()],
        })
        .catch((err) => console.error("Failed to send approval invoice email:", err));
    }

    if (request.client?.phone) {
      void smsService
        .send([request.client.phone], `Hi ${request.client.name}, your booking "${request.title}" has been approved. Please pay GHS ${(request.chargeAmount ?? 0).toLocaleString()} by ${request.paymentDueAt?.toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })} or the request will be declined.`)
        .catch((err) => console.error("Failed to send approval SMS to client:", err));
    }

    const facilityNames = Array.from(new Set(request.packages.map((p) => p.bookItem.title))).join(", ");
    const firstStart = request.packages[0]?.bookStart;

    void getActiveStaffContacts()
      .then((staff) => {
        const emails = staff.map((s) => s.email).filter((e): e is string => !!e);
        const phones = staff.map((s) => s.phone).filter((p): p is string => !!p);

        if (emails.length > 0) {
          void staffEmailService
            .send({
              to: emails[0],
              bcc: emails.slice(1),
              subject: `Prepare facility: ${facilityNames || request.title}`,
              html: `<p>Booking request "<strong>${request.title}</strong>" has been approved.</p><p>Facility: ${facilityNames}${firstStart ? `<br>When: ${new Date(firstStart).toLocaleString()}` : ""}</p><p>Please prepare the place for the customer.</p>`,
            })
            .catch((err) => console.error("Failed to send staff prep email:", err));
        }

        if (phones.length > 0) {
          void smsService
            .send(
              phones,
              `Booking approved: ${facilityNames || request.title}${firstStart ? ` on ${new Date(firstStart).toLocaleString()}` : ""}. Please prepare the place for the customer.`,
            )
            .catch((err) => console.error("Failed to send staff prep SMS:", err));
        }
      })
      .catch((err) => console.error("Failed to load staff contacts for prep notification:", err));
  }

  return request;
}

export async function rescheduleRequest(id: string, input: RescheduleInput, changedBy: string) {
  await rescheduleRequestCore(id, input, { changedBy, byStaff: true });
  return getRequest(id);
}

export async function extendRequest(id: string, input: ExtendInput, changedBy: string) {
  await extendRequestCore(id, input, { changedBy, byStaff: true });
  return getRequest(id);
}
