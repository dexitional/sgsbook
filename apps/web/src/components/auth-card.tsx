import { useState } from "react";
import { Button } from "#/components/ui/button";
import { GoogleIcon } from "#/components/google-icon";
import { authClient } from "#/lib/auth-client";
import { asset } from "#/lib/asset";

export function AuthCard({ title, subtitle }: { title: string; subtitle: string }) {
  const [loading, setLoading] = useState(false);

  const continueWithGoogle = async () => {
    setLoading(true);
    await authClient.signIn.social({ provider: "google", callbackURL: "/onboarding" });
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(900px 500px at 15% -10%, color-mix(in oklab, var(--primary) 20%, transparent), transparent 60%), radial-gradient(700px 500px at 110% 10%, color-mix(in oklab, var(--accent) 55%, transparent), transparent 65%)",
        }}
      />

      <div className="w-full max-w-sm space-y-6 rounded-xl border border-border bg-card p-8 shadow-lg shadow-black/5">
        <div className="flex flex-col items-center gap-2 text-center">
          <img src={asset("logo.webp")} alt="" className="h-12 w-12 object-contain" />
          <h1 className="text-xl font-semibold">{title}</h1>
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        </div>

        <Button variant="outline" className="w-full gap-2" onClick={continueWithGoogle} disabled={loading}>
          <GoogleIcon className="size-4" />
          {loading ? "Redirecting…" : "Continue with Google"}
        </Button>

        <p className="text-center text-xs text-muted-foreground">
          By continuing, you agree this booking system may contact you about your requests.
        </p>
      </div>
    </div>
  );
}
