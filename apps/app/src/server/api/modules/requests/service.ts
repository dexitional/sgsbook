import { prisma, Prisma } from "@sgs/db";
import type { z } from "zod";
import { emailService, staffEmailService } from "../../lib/email.js";
import { smsService } from "../../lib/sms.js";
import { buildInvoiceEmail, getLogoAttachment } from "../../lib/invoice-email.js";
import { computeRequestInvoice, type PackageInput } from "../../lib/pricing.js";
import type { createRequestSchema, listRequestsQuerySchema, updateStatusSchema } from "./schema.js";

// Staff who should be alerted to prepare the facility once a booking is
// approved — every active user with a role on this app, regardless of which
// role (admin, facilitator, decorator all get notified).
async function getActiveStaffContacts() {
  const app = await prisma.app.findUnique({ where: { tag: "ubs" } });
  if (!app) return [];
  const users = await prisma.user.findMany({
    where: { status: true, userRole: { some: { status: true, appRole: { appId: app.id } } } },
    select: { name: true, username: true, email: true, phone: true },
  });
  return users;
}

type CreateRequestInput = z.infer<typeof createRequestSchema>;
type UpdateStatusInput = z.infer<typeof updateStatusSchema>;
type ListQuery = z.infer<typeof listRequestsQuerySchema>;

const detailInclude = {
  client: { include: { contacts: true } },
  packages: { include: { bookItem: true, UbsAddon: { include: { item: true } } } },
  payment: true,
} satisfies Prisma.UbsRequestInclude;

export async function listRequests(query: ListQuery) {
  const where: Prisma.UbsRequestWhereInput = {
    ...(query.status ? { status: query.status } : {}),
    ...(query.clientId ? { clientId: query.clientId } : {}),
  };

  const [items, total] = await Promise.all([
    prisma.ubsRequest.findMany({
      where,
      include: { client: true, packages: { include: { bookItem: true } } },
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
  const request = await prisma.ubsRequest.update({
    where: { id },
    data: { status: input.status },
    include: detailInclude,
  });

  if (input.status === "APPROVED") {
    // Best-effort throughout — a booking's approval must not fail because
    // notification delivery hiccups. Failures are logged, not thrown.
    if (request.client?.email) {
      const invoiceEmail = buildInvoiceEmail({
        requestId: request.id,
        title: request.title,
        clientName: request.client.organisation || request.client.name,
        chargeAmount: request.chargeAmount,
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
        .send([request.client.phone], `Hi ${request.client.name}, your booking "${request.title}" has been approved.`)
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
