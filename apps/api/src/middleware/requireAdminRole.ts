import type { Context, Next } from "hono";
import { getCookie } from "hono/cookie";
import { SESSION_COOKIE, readSessionUserId } from "../modules/admin-auth/route.js";
import { getSessionUser, type AdminSessionUser } from "../modules/admin-auth/service.js";
import { AppError } from "./error-handler.js";

declare module "hono" {
  interface ContextVariableMap {
    adminUser: AdminSessionUser;
  }
}

// Server-side equivalent of the umsa-family `useHasRole(app, [roles])` hook —
// role tags are shaped `${appTag}::${roleTitle}`, e.g. "ubs::administrator".
export function requireAdminRole(allowed: string[]) {
  return async (c: Context, next: Next) => {
    const token = getCookie(c, SESSION_COOKIE);
    const userId = await readSessionUserId(token);
    if (!userId) throw new AppError("Not authenticated.", 401);

    const user = await getSessionUser(userId);
    if (!user) throw new AppError("Not authenticated.", 401);

    const hasRole = user.roles.some((role) => allowed.includes(role));
    if (!hasRole) throw new AppError("Forbidden.", 403);

    c.set("adminUser", user);
    await next();
  };
}
