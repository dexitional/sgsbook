// Single source of truth for "can this facility be booked for this period?"
// — shared by customer booking (server/customer.ts), staff-created requests,
// approval, and rescheduling, so every path enforces the same two rules:
//   1. No overlap with another APPROVED/COMPLETED booking of the same item
//      (a PENDED request hasn't claimed the slot yet — matches the public
//      calendar's own convention).
//   2. No overlap with an admin-blocked window for that item, or one that
//      blocks every facility (itemId null).
import { prisma } from "@sgs/db";
import { AppError } from "../middleware/error-handler.js";

export interface PeriodInput {
  itemId: string;
  bookStart: Date;
  bookEnd: Date;
}

function formatWhen(value: Date | null) {
  return value ? value.toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" }) : "—";
}

export function assertValidPeriod(pkg: { bookStart: Date; bookEnd: Date }) {
  if (pkg.bookEnd.getTime() <= pkg.bookStart.getTime()) {
    throw new AppError("The end date must be after the start date.", 422);
  }
}

export async function findBlockingWindow(pkg: PeriodInput) {
  return prisma.ubsBlockedDate.findFirst({
    where: {
      OR: [{ itemId: pkg.itemId }, { itemId: null }],
      blockStart: { lt: pkg.bookEnd },
      blockEnd: { gt: pkg.bookStart },
    },
    include: { item: { select: { title: true } } },
    orderBy: { blockStart: "asc" },
  });
}

// `excludeRequestId` lets approval/rescheduling of a request ignore its own
// packages instead of conflicting with itself.
export async function assertAvailable(packages: PeriodInput[], options: { excludeRequestId?: string } = {}) {
  for (const pkg of packages) {
    assertValidPeriod(pkg);

    const blocked = await findBlockingWindow(pkg);
    if (blocked) {
      const item = await prisma.ubsItem.findUnique({ where: { id: pkg.itemId }, select: { title: true } });
      throw new AppError(
        `${item?.title ?? "This facility"} is unavailable from ${formatWhen(blocked.blockStart)} to ${formatWhen(blocked.blockEnd)} (${blocked.reason}). Please choose a different time.`,
        409,
      );
    }

    const conflict = await prisma.ubsPackage.findFirst({
      where: {
        itemId: pkg.itemId,
        bookStart: { lt: pkg.bookEnd },
        bookEnd: { gt: pkg.bookStart },
        request: {
          status: { in: ["APPROVED", "COMPLETED"] },
          ...(options.excludeRequestId ? { id: { not: options.excludeRequestId } } : {}),
        },
      },
      include: { bookItem: true },
    });
    if (conflict) {
      throw new AppError(
        `${conflict.bookItem.title} is already booked from ${formatWhen(conflict.bookStart)} to ${formatWhen(conflict.bookEnd)}. Please choose a different time.`,
        409,
      );
    }
  }
}
