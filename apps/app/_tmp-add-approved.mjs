import { prisma } from "@sgs/db";
const item = await prisma.ubsItem.findFirst({ where: { title: "StandBy Generator" } });
const client = await prisma.ubsClient.findFirst();
const req = await prisma.ubsRequest.create({
  data: { clientId: client.id, title: "TEST-approved-tooltip", status: "APPROVED", chargeAmount: 0 },
});
await prisma.ubsPackage.create({
  data: { itemId: item.id, requestId: req.id, bookStart: new Date("2026-09-20T09:00:00Z"), bookEnd: new Date("2026-09-20T15:00:00Z") },
});
console.log("created APPROVED test booking, request id:", req.id);
await prisma.$disconnect();
