import { prisma, Prisma } from "@sgs/db";
import type { z } from "zod";
import { emailService } from "../../lib/email.js";
import { smsService } from "../../lib/sms.js";
import { buildReceiptEmail, getLogoAttachment } from "../../lib/invoice-email.js";
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
    include: {
      request: {
        include: { client: true, packages: { include: { bookItem: true, UbsAddon: { include: { item: true } } } } },
      },
    },
  });

  const client = payment.request?.client;
  if (client?.email && payment.request) {
    const receiptEmail = buildReceiptEmail({
      paymentId: payment.id,
      title: payment.request.title,
      clientName: client.organisation || client.name,
      chargeAmount: payment.request.chargeAmount,
      paidAmount: payment.paidAmount,
      paidRef: payment.paidRef,
      paidAt: payment.paidAt,
      packages: payment.request.packages,
    });
    void emailService
      .send({
        to: client.email,
        subject: receiptEmail.subject,
        html: receiptEmail.html,
        attachments: [getLogoAttachment()],
      })
      .catch((err) => console.error("Failed to send payment receipt email:", err));
  }

  if (client?.phone) {
    void smsService
      .send(
        [client.phone],
        `Hi ${client.name}, we've recorded a payment of GHS ${payment.paidAmount} for "${payment.request?.title ?? "your booking"}". Thank you.`,
      )
      .catch((err) => console.error("Failed to send payment receipt SMS:", err));
  }

  return payment;
}
