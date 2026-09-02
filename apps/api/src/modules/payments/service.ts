import { prisma, Prisma } from "@sgs/db";
import type { z } from "zod";
import { emailService } from "../../lib/email.js";
import type { listPaymentsQuerySchema, recordPaymentSchema } from "./schema.js";

type RecordPaymentInput = z.infer<typeof recordPaymentSchema>;
type ListQuery = z.infer<typeof listPaymentsQuerySchema>;

export async function listPayments(query: ListQuery) {
  const where: Prisma.UbsPaymentWhereInput = {
    status: true,
    ...(query.requestId ? { requestId: query.requestId } : {}),
  };

  const [items, total] = await Promise.all([
    prisma.ubsPayment.findMany({
      where,
      include: {
        request: {
          include: { client: true, packages: { include: { bookItem: true, UbsAddon: { include: { item: true } } } } },
        },
      },
      orderBy: { paidAt: "desc" },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
    prisma.ubsPayment.count({ where }),
  ]);

  return { items, total, page: query.page, pageSize: query.pageSize };
}

export async function getPayment(id: string) {
  return prisma.ubsPayment.findUnique({
    where: { id },
    include: {
      request: {
        include: { client: true, packages: { include: { bookItem: true, UbsAddon: { include: { item: true } } } } },
      },
    },
  });
}

export async function recordPayment(input: RecordPaymentInput, createdBy: number) {
  const payment = await prisma.ubsPayment.create({
    data: { ...input, createdBy },
    include: { request: { include: { client: true } } },
  });

  const client = payment.request?.client;
  if (client?.email) {
    void emailService
      .send({
        to: client.email,
        subject: `Payment received — ${payment.request?.title ?? "your booking"}`,
        html: `<p>Hi ${client.name},</p><p>We've recorded a payment of <strong>${payment.paidAmount}</strong>${
          payment.paidRef ? ` (ref: ${payment.paidRef})` : ""
        } for "${payment.request?.title}".</p>`,
      })
      .catch((err) => console.error("Failed to send payment receipt email:", err));
  }

  return payment;
}
