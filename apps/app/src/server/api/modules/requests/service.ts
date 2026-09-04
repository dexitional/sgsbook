import { prisma, Prisma } from "@sgs/db";
import type { z } from "zod";
import { emailService } from "../../lib/email.js";
import { computeRequestInvoice, type PackageInput } from "../../lib/pricing.js";
import type { createRequestSchema, listRequestsQuerySchema, updateStatusSchema } from "./schema.js";

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

  if (input.status === "APPROVED" && request.client?.email) {
    // Best-effort — a booking's approval must not fail because email delivery
    // hiccups. Failures are logged, not thrown.
    void emailService
      .send({
        to: request.client.email,
        subject: `Booking approved: ${request.title}`,
        html: `<p>Hi ${request.client.name},</p><p>Your booking request "<strong>${request.title}</strong>" has been approved.</p>`,
      })
      .catch((err) => console.error("Failed to send approval email:", err));
  }

  return request;
}
