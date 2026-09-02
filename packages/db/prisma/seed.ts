import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient } from "./generated/client/client.js";
import { mysqlAdapter } from "../src/mysqlAdapter.js";

const prisma = new PrismaClient({ adapter: mysqlAdapter });

const APP_TAG = "ubs";
const ROLES = ["Administrator", "Facilitator", "Decorator"] as const;

// Seeded staff accounts, one per role — replace/rotate these before shipping.
const SEED_USERS: Array<{ tag: string; username: string; password: string; role: (typeof ROLES)[number] }> = [
  { tag: "admin", username: "admin", password: "ChangeMe123!", role: "Administrator" },
  { tag: "facilitator", username: "facilitator", password: "ChangeMe123!", role: "Facilitator" },
  { tag: "decorator", username: "decorator", password: "ChangeMe123!", role: "Decorator" },
];

async function main() {
  const app = await prisma.app.upsert({
    where: { tag: APP_TAG },
    update: {},
    create: {
      tag: APP_TAG,
      title: "University Booking System",
      description: "Facilities booking, requests, and payments.",
    },
  });

  const roleByTitle = new Map<string, { id: number }>();
  for (const title of ROLES) {
    const existing = await prisma.appRole.findFirst({ where: { appId: app.id, title } });
    const role =
      existing ??
      (await prisma.appRole.create({
        data: { appId: app.id, title, description: `${title} role for ${app.title}` },
      }));
    roleByTitle.set(title, role);
  }

  let group = await prisma.group.findFirst({ where: { title: "UBS Staff" } });
  if (!group) {
    group = await prisma.group.create({
      data: { title: "UBS Staff", description: "Staff accounts for the booking system admin portal." },
    });
  }

  for (const seedUser of SEED_USERS) {
    const existingUser = await prisma.user.findUnique({ where: { tag: seedUser.tag } });
    const user =
      existingUser ??
      (await prisma.user.create({
        data: {
          groupId: group.id,
          tag: seedUser.tag,
          username: seedUser.username,
          password: await bcrypt.hash(seedUser.password, 10),
        },
      }));

    const role = roleByTitle.get(seedUser.role);
    if (!role) continue;

    const existingUserRole = await prisma.userRole.findFirst({
      where: { userId: user.id, appRoleId: role.id },
    });
    if (!existingUserRole) {
      await prisma.userRole.create({
        data: { userId: user.id, appRoleId: role.id, roleMeta: `${APP_TAG}::${seedUser.role.toLowerCase()}` },
      });
    }
  }

  console.log(`Seeded app "${app.tag}" with ${ROLES.length} roles and ${SEED_USERS.length} staff users.`);
  console.log("Seeded credentials (change before shipping):");
  for (const u of SEED_USERS) {
    console.log(`  ${u.tag} / ${u.password}  (${u.role})`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
