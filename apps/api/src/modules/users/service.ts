import bcrypt from "bcryptjs";
import { prisma, Prisma } from "@sgs/db";
import type { z } from "zod";
import { AppError } from "../../middleware/error-handler.js";
import type { createRoleSchema, createUserSchema, listUsersQuerySchema, updateUserSchema } from "./schema.js";

// Staff accounts for the "ubs" app only — this module manages the same
// sso_user/sso_urole/sso_arole tables admin-auth reads from, but scoped to
// this one app so it can't accidentally touch users/roles for other apps
// that might share this RBAC schema.
const APP_TAG = "ubs";
const STAFF_GROUP_TITLE = "UBS Staff";

type CreateUserInput = z.infer<typeof createUserSchema>;
type UpdateUserInput = z.infer<typeof updateUserSchema>;
type ListQuery = z.infer<typeof listUsersQuerySchema>;
type CreateRoleInput = z.infer<typeof createRoleSchema>;

const userInclude = {
  userRole: { where: { status: true }, include: { appRole: true } },
} satisfies Prisma.userInclude;

type UserWithRoles = Prisma.userGetPayload<{ include: typeof userInclude }>;

function shapeUser(user: UserWithRoles) {
  const { password: _password, userRole, ...rest } = user;
  return {
    ...rest,
    roles: userRole
      .filter((ur) => ur.appRole)
      .map((ur) => ({ id: ur.appRole!.id, title: ur.appRole!.title })),
  };
}

async function getUbsApp() {
  const app = await prisma.app.findUnique({ where: { tag: APP_TAG } });
  if (!app) throw new AppError("App not configured.", 404);
  return app;
}

async function getStaffGroup() {
  const existing = await prisma.group.findFirst({ where: { title: STAFF_GROUP_TITLE } });
  if (existing) return existing;
  return prisma.group.create({
    data: { title: STAFF_GROUP_TITLE, description: "Staff accounts for the booking system admin portal." },
  });
}

export async function listUsers(query: ListQuery) {
  const app = await getUbsApp();
  const where: Prisma.userWhereInput = {
    userRole: { some: { appRole: { appId: app.id } } },
    ...(query.search
      ? {
          OR: [
            { username: { contains: query.search } },
            { tag: { contains: query.search } },
            { name: { contains: query.search } },
          ],
        }
      : {}),
  };

  const [items, total] = await Promise.all([
    prisma.user.findMany({
      where,
      include: userInclude,
      orderBy: { createdAt: "desc" },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
    prisma.user.count({ where }),
  ]);

  return { items: items.map(shapeUser), total, page: query.page, pageSize: query.pageSize };
}

export async function createUser(input: CreateUserInput) {
  const existingTag = await prisma.user.findUnique({ where: { tag: input.tag } });
  if (existingTag) throw new AppError("A user with this tag already exists.", 409);

  const roles = await prisma.appRole.findMany({ where: { id: { in: input.appRoleIds } } });
  if (roles.length !== input.appRoleIds.length) throw new AppError("One or more roles are invalid.", 400);

  const group = await getStaffGroup();
  const hashed = await bcrypt.hash(input.password, 10);

  const user = await prisma.user.create({
    data: {
      groupId: group.id,
      tag: input.tag,
      username: input.username,
      name: input.name,
      password: hashed,
      userRole: {
        create: roles.map((role) => ({ appRoleId: role.id, roleMeta: `${APP_TAG}::${role.title.toLowerCase()}` })),
      },
    },
    include: userInclude,
  });

  return shapeUser(user);
}

export async function updateUser(id: number, input: UpdateUserInput) {
  const data: Prisma.userUpdateInput = {};
  if (input.username !== undefined) data.username = input.username;
  if (input.name !== undefined) data.name = input.name;
  if (input.status !== undefined) data.status = input.status;
  if (input.locked !== undefined) data.locked = input.locked;
  if (input.password) data.password = await bcrypt.hash(input.password, 10);

  let roles: { id: number; title: string }[] | null = null;
  if (input.appRoleIds) {
    roles = await prisma.appRole.findMany({ where: { id: { in: input.appRoleIds } } });
    if (roles.length !== input.appRoleIds.length) throw new AppError("One or more roles are invalid.", 400);
  }

  const user = await prisma.$transaction(async (tx) => {
    if (roles) {
      await tx.userRole.deleteMany({ where: { userId: id } });
      await tx.userRole.createMany({
        data: roles.map((role) => ({
          userId: id,
          appRoleId: role.id,
          roleMeta: `${APP_TAG}::${role.title.toLowerCase()}`,
        })),
      });
    }
    return tx.user.update({ where: { id }, data, include: userInclude });
  });

  return shapeUser(user);
}

export async function deleteUser(id: number, currentUserId: number) {
  if (id === currentUserId) throw new AppError("You can't delete your own account.", 400);
  // userRole doesn't cascade-delete on its `user` FK, so the role links
  // must go first or the delete fails with a foreign key violation.
  await prisma.$transaction([
    prisma.userRole.deleteMany({ where: { userId: id } }),
    prisma.user.delete({ where: { id } }),
  ]);
}

export async function listRoles() {
  const app = await getUbsApp();
  return prisma.appRole.findMany({ where: { appId: app.id, status: true }, orderBy: { title: "asc" } });
}

export async function createRole(input: CreateRoleInput) {
  const app = await getUbsApp();
  const existing = await prisma.appRole.findFirst({ where: { appId: app.id, title: input.title } });
  if (existing) throw new AppError("A role with this title already exists.", 409);

  return prisma.appRole.create({
    data: { appId: app.id, title: input.title, description: input.description || `${input.title} role` },
  });
}
