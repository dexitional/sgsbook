import { createFileRoute } from "@tanstack/react-router";
import { AuthCard } from "#/components/auth-card";

export const Route = createFileRoute("/sgs/_web/signin")({ component: SigninPage });

function SigninPage() {
  return <AuthCard title="Welcome back" subtitle="Sign in with Google to view your bookings." />;
}
