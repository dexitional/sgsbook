import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { sign, verify } from "hono/jwt";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import { loginSchema } from "./schema.js";
import { getSessionUser, verifyCredentials } from "./service.js";
import { AppError } from "../../middleware/error-handler.js";

export const SESSION_COOKIE = "sgs_admin_session";
const SESSION_TTL_SECONDS = 60 * 60 * 12; // 12h

function sessionSecret(): string {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret) throw new Error("ADMIN_SESSION_SECRET is not set.");
  return secret;
}

export async function readSessionUserId(token: string | undefined): Promise<number | null> {
  if (!token) return null;
  try {
    const payload = await verify(token, sessionSecret(), "HS256");
    return typeof payload.sub === "number" ? payload.sub : Number(payload.sub);
  } catch {
    return null;
  }
}

export const adminAuthRoute = new Hono()
  .post("/login", zValidator("json", loginSchema), async (c) => {
    const { tag, password } = c.req.valid("json");
    const user = await verifyCredentials(tag, password);
    if (!user) throw new AppError("Invalid credentials or no access to this application.", 401);

    const now = Math.floor(Date.now() / 1000);
    const token = await sign(
      { sub: user.id, roles: user.roles, iat: now, exp: now + SESSION_TTL_SECONDS },
      sessionSecret(),
      "HS256",
    );

    setCookie(c, SESSION_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "Lax",
      path: "/",
      maxAge: SESSION_TTL_SECONDS,
    });

    return c.json({ user });
  })
  .post("/logout", (c) => {
    deleteCookie(c, SESSION_COOKIE, { path: "/" });
    return c.json({ ok: true });
  })
  .get("/me", async (c) => {
    const token = getCookie(c, SESSION_COOKIE);
    const userId = await readSessionUserId(token);
    if (!userId) throw new AppError("Not authenticated.", 401);

    const user = await getSessionUser(userId);
    if (!user) throw new AppError("Not authenticated.", 401);

    return c.json({ user });
  });
