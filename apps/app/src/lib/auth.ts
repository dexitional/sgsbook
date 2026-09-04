import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { tanstackStartCookies } from "better-auth/tanstack-start";
import { prisma } from "@sgs/db";

// Customer identity only — Google sign-in, no email/password. Deliberately
// separate from the admin/staff RBAC login in apps/api (see sso.prisma).
// Model names are remapped so nothing collides with sso.prisma's `user`
// model; keep this in sync with packages/db/prisma/schema/auth.prisma.
export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: "mysql" }),
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
    },
  },
  user: { modelName: "authUser" },
  session: { modelName: "authSession" },
  account: { modelName: "authAccount" },
  verification: { modelName: "authVerification" },
  plugins: [tanstackStartCookies()],
});
