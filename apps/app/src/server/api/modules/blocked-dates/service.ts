import { prisma, Prisma } from "@sgs/db";
import type { z } from "zod";
import type { createBlockedDateSchema, listBlockedDatesQuerySchema } from "./schema.js";

type CreateInput = z.infer<typeof createBlockedDateSchema>;
type ListQuery = z.infer<typeof listBlockedDatesQuerySchema>;

export async function listBlockedDates(query: ListQuery) {
  const where: Prisma.UbsBlockedDateWhereInput = query.includePast ? {} : { blockEnd: { gte: new Date() } };

  const [items, total] = await Promise.all([
    prisma.ubsBlockedDate.findMany({
      where,
      include: { item: { select: { id: true, title: true } }, creator: { select: { username: true } } },
      orderBy: { blockStart: "asc" },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
    prisma.ubsBlockedDate.count({ where }),
  ]);

  return { items, total, page: query.page, pageSize: query.pageSize };
}

// Blocking doesn't cancel anything on its own — it returns the live
// bookings it overlaps so staff can reschedule or decline them with a
// proper reason (both of which notify the customer).
export async function createBlockedDate(input: CreateInput, createdBy: number) {
  const blockedDate = await prisma.ubsBlockedDate.create({
    data: {
      itemId: input.itemId ?? null,
      blockStart: input.blockStart,
      blockEnd: input.blockEnd,
      reason: input.reason,
      createdBy,
    },
    include: { item: { select: { id: true, title: true } } },
  });

  const overlapping = await prisma.ubsPackage.findMany({
    where: {
      ...(input.itemId ? { itemId: input.itemId } : {}),
      bookStart: { lt: input.blockEnd },
      bookEnd: { gt: input.blockStart },
      request: { status: { in: ["PENDED", "APPROVED"] } },
    },
    select: {
      bookStart: true,
      bookEnd: true,
      bookItem: { select: { title: true } },
      request: { select: { id: true, title: true, status: true, client: { select: { name: true } } } },
    },
    orderBy: { bookStart: "asc" },
  });

  const affected = overlapping.map((p) => ({
    requestId: p.request.id,
    title: p.request.title,
    status: p.request.status,
    clientName: p.request.client?.name ?? null,
    itemTitle: p.bookItem.title,
    bookStart: p.bookStart,
    bookEnd: p.bookEnd,
  }));

  return { blockedDate, affected };
}

export async function deleteBlockedDate(id: string) {
  await prisma.ubsBlockedDate.delete({ where: { id } });
}
