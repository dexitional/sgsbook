import { prisma, Prisma } from "@sgs/db";
import type { z } from "zod";
import { AppError } from "../../middleware/error-handler.js";
import type { createItemSchema, listItemsQuerySchema, updateItemSchema } from "./schema.js";

type CreateItemInput = z.infer<typeof createItemSchema>;
type UpdateItemInput = z.infer<typeof updateItemSchema>;
type ListQuery = z.infer<typeof listItemsQuerySchema>;

export async function listItems(query: ListQuery) {
  const where: Prisma.UbsItemWhereInput = {
    ...(query.itemType ? { itemType: query.itemType } : {}),
    ...(query.search ? { title: { contains: query.search } } : {}),
  };

  const [items, total] = await Promise.all([
    prisma.ubsItem.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
    prisma.ubsItem.count({ where }),
  ]);

  return { items, total, page: query.page, pageSize: query.pageSize };
}

export async function getItem(id: string) {
  return prisma.ubsItem.findUnique({ where: { id } });
}

export async function createItem(input: CreateItemInput) {
  return prisma.ubsItem.create({ data: input });
}

export async function updateItem(id: string, input: UpdateItemInput) {
  return prisma.ubsItem.update({ where: { id }, data: input });
}

export async function deleteItem(id: string) {
  const [packageCount, addonCount] = await Promise.all([
    prisma.ubsPackage.count({ where: { itemId: id } }),
    prisma.ubsAddon.count({ where: { itemId: id } }),
  ]);

  if (packageCount > 0 || addonCount > 0) {
    throw new AppError("This item is used in existing booking requests and can't be deleted. Disable it instead.", 409);
  }

  await prisma.ubsItem.delete({ where: { id } });
}
