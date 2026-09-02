import { PrismaClient } from "../prisma/generated/client/client.js";
import { mysqlAdapter } from "./mysqlAdapter.js";

declare global {
  // eslint-disable-next-line no-var
  var __prismaSgs: PrismaClient | undefined;
}

export const prisma: PrismaClient =
  global.__prismaSgs ??
  new PrismaClient({
    adapter: mysqlAdapter,
  });

if (process.env.NODE_ENV !== "production") {
  global.__prismaSgs = prisma;
}
