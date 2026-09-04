import { createFileRoute } from "@tanstack/react-router";
import { AuthCard } from "#/components/auth-card";

export const Route = createFileRoute("/_web/signup")({ component: SignupPage });

function SignupPage() {
  return (
    <AuthCard
      title="Create your account"
      subtitle="Sign up with Google to start booking campus facilities."
    />
  );
}
