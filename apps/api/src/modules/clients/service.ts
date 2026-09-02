import { prisma, Prisma } from "@sgs/db";
import type { z } from "zod";
import type { contactPersonSchema, createClientSchema, listClientsQuerySchema, updateClientSchema } from "./schema.js";

type CreateClientInput = z.infer<typeof createClientSchema>;
type UpdateClientInput = z.infer<typeof updateClientSchema>;
type ContactPersonInput = z.infer<typeof contactPersonSchema>;
type ListQuery = z.infer<typeof listClientsQuerySchema>;

export async function listClients(query: ListQuery) {
  const where: Prisma.UbsClientWhereInput = {
    status: true,
    ...(query.type ? { type: query.type } : {}),
    ...(query.search
      ? {
          OR: [
            { name: { contains: query.search } },
            { email: { contains: query.search } },
            { organisation: { contains: query.search } },
          ],
        }
      : {}),
  };

  const [items, total] = await Promise.all([
    prisma.ubsClient.findMany({
      where,
      include: { contacts: { where: { status: true } }, _count: { select: { UbsRequest: true } } },
      orderBy: { createdAt: "desc" },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
    prisma.ubsClient.count({ where }),
  ]);

  return { items, total, page: query.page, pageSize: query.pageSize };
}

export async function getClient(id: string) {
  return prisma.ubsClient.findUnique({
    where: { id },
    include: {
      contacts: { where: { status: true } },
      UbsRequest: { orderBy: { createdAt: "desc" }, take: 20 },
    },
  });
}

export async function createClient(input: CreateClientInput) {
  const { contacts, ...clientData } = input;
  return prisma.ubsClient.create({
    data: {
      ...clientData,
      contacts: contacts?.length ? { create: contacts } : undefined,
    },
    include: { contacts: true },
  });
}

export async function updateClient(id: string, input: UpdateClientInput) {
  return prisma.ubsClient.update({ where: { id }, data: input });
}

export async function addContact(clientId: string, input: ContactPersonInput) {
  return prisma.ubsContactPerson.create({ data: { ...input, clientId } });
}

export async function updateContact(contactId: string, input: Partial<ContactPersonInput>) {
  return prisma.ubsContactPerson.update({ where: { id: contactId }, data: input });
}

export async function removeContact(contactId: string) {
  return prisma.ubsContactPerson.update({ where: { id: contactId }, data: { status: false } });
}
