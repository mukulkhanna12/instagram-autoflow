import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { enabledSocialProviders } from "@/lib/social-auth";
import { LoginForm } from "./login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ pending?: string; error?: string; next?: string; email?: string }>;
}) {
  const { pending, error, next: rawNext, email } = await searchParams;
  // Only ever return to an invite link — never an arbitrary URL.
  const next = rawNext && /^\/invite\/[A-Za-z0-9_-]+$/.test(rawNext) ? rawNext : null;

  const session = await auth();
  if (session?.user) redirect(next ?? "/dashboard");

  return (
    <LoginForm
      providers={enabledSocialProviders()}
      pendingEmail={pending ?? null}
      error={error ?? null}
      next={next}
      initialEmail={email ?? null}
    />
  );
}
