import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLogin } from "#/lib/queries/session";
import { ApiError } from "#/lib/api-client";
import { asset } from "#/lib/asset";

export const Route = createFileRoute("/sgs-admin/login")({
  head: () => ({ meta: [{ title: "UBS Admin" }] }),
  component: LoginPage,
});

const loginSchema = z.object({
  tag: z.string().min(1, "Required"),
  password: z.string().min(1, "Required"),
});

// Deliberately light-only, styled independent of the app's normal design
// tokens — matches how most account sign-in screens (Microsoft, Google,
// etc.) stay on a fixed light identity regardless of the app's own theme.
const SEGOE_STACK =
  '"Segoe UI", "Segoe UI Webfont", -apple-system, "Helvetica Neue", Roboto, "Noto Sans", Arial, sans-serif';

function LoginPage() {
  const navigate = useNavigate();
  const login = useLogin();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({ resolver: zodResolver(loginSchema) });

  const onSubmit = handleSubmit((values) => {
    login.mutate(values, { onSuccess: () => navigate({ to: "/sgs-admin" }) });
  });

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f3f3f3] px-4" style={{ fontFamily: SEGOE_STACK }}>
      <div className="w-full max-w-[380px] bg-white px-9 py-10 shadow-[0_2px_6px_rgba(0,0,0,0.2)]">
        <div className="flex items-center gap-2">
          <img src={asset("logo.webp")} alt="" className="h-8 w-8 object-contain" />
          <span className="text-[15px] font-semibold text-[#1b1b1b]">SGS Booking System</span>
        </div>

        <p className="mb-3 mt-4 text-2xl font-semibold text-[#1b1b1b]">Sign in</p>

        <form onSubmit={onSubmit} className="space-y-1">
          <div>
            <input
              id="tag"
              autoComplete="username"
              placeholder="Username"
              className="h-9 w-full border-0 border-b border-black/60 bg-transparent text-[15px] text-black outline-none placeholder:text-black/60 focus:border-b-[#0067b8]"
              {...register("tag")}
            />
            {errors.tag && <p className="mt-1 text-xs text-red-600">{errors.tag.message}</p>}
          </div>

          <div className="pt-3">
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              placeholder="Password"
              className="h-9 w-full border-0 border-b border-black/60 bg-transparent text-[15px] text-black outline-none placeholder:text-black/60 focus:border-b-[#0067b8]"
              {...register("password")}
            />
            {errors.password && <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>}
          </div>

          <p className="pt-4 text-[13px] leading-5 text-[#1b1b1b]">
            Staff accounts only — contact your administrator if you can't sign in.
          </p>

          {login.isError && (
            <p className="rounded-sm bg-red-50 px-3 py-2 text-[13px] text-red-700">
              {login.error instanceof ApiError ? login.error.message : "Something went wrong."}
            </p>
          )}

          <div className="flex justify-end gap-1 pt-6">
            <a
              href="/sgs-admin/"
              className="flex h-8 min-w-[100px] items-center justify-center bg-black/20 px-3 text-[15px] text-black transition-colors hover:bg-black/30"
            >
              Back
            </a>
            <button
              type="submit"
              disabled={login.isPending}
              className="flex h-8 min-w-[100px] items-center justify-center bg-[#0067b8] px-3 text-[15px] text-white transition-colors hover:bg-[#005da6] disabled:opacity-70"
            >
              {login.isPending ? "Signing in…" : "Sign in"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
