import { prisma } from "@sgs/db";

export async function listPublicFacilities() {
  return prisma.ubsItem.findMany({
    where: { status: true, itemType: "FACILITY" },
    select: {
      id: true,
      title: true,
      description: true,
      imageUrl: true,
      amount: true,
      intamount: true,
      extamount: true,
      itemType: true,
    },
    orderBy: { title: "asc" },
  });
}

// PII-safe by construction: selects only item + time-block fields, and never
// touches UbsRequest.client. Only APPROVED/COMPLETED bookings are shown —
// PENDED/REJECTED requests aren't public commitments yet.
export async function listPublicCalendar(from: Date, to: Date) {
  const packages = await prisma.ubsPackage.findMany({
    where: {
      bookStart: { lte: to },
      bookEnd: { gte: from },
      request: { status: { in: ["APPROVED", "COMPLETED"] } },
    },
    select: {
      id: true,
      bookStart: true,
      bookEnd: true,
      bookItem: { select: { id: true, title: true, itemType: true } },
      request: { select: { status: true } },
    },
    orderBy: { bookStart: "asc" },
  });

  return packages.map((p) => ({
    id: p.id,
    itemId: p.bookItem.id,
    itemTitle: p.bookItem.title,
    itemType: p.bookItem.itemType,
    bookStart: p.bookStart,
    bookEnd: p.bookEnd,
    status: p.request.status,
  }));
}
