import bcrypt from "bcryptjs";
import { prisma } from "../../lib/prisma.js";

const APP_TAG = "ubs";

export interface AdminSessionUser {
  id: number;
  tag: string;
  username: string;
  roles: string[]; // e.g. ["ubs::administrator"]
}

async function fetchRoles(userId: number): Promise<string[]> {
  const userRoles = await prisma.userRole.findMany({
    where: { userId, status: true },
    include: { appRole: { include: { app: true } } },
  });

  return userRoles
    .filter((r) => r.appRole?.app?.tag === APP_TAG)
    .map((r) => `${APP_TAG}::${r.appRole!.title.toLowerCase()}`);
}

export async function verifyCredentials(tag: string, password: string): Promise<AdminSessionUser | null> {
  const user = await prisma.user.findUnique({ where: { tag } });
  if (!user || !user.status || user.locked) return null;

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) return null;

  const roles = await fetchRoles(user.id);
  if (roles.length === 0) return null; // no role on this app => not an admin-portal user

  return { id: user.id, tag: user.tag, username: user.username, roles };
}

export async function getSessionUser(userId: number): Promise<AdminSessionUser | null> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || !user.status || user.locked) return null;

  const roles = await fetchRoles(user.id);
  if (roles.length === 0) return null;

  return { id: user.id, tag: user.tag, username: user.username, roles };
}
