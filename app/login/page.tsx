import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { enabledSocialProviders } from "@/lib/social-auth";
import { LoginForm } from "./login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ pending?: string; error?: string }>;
}) {
  const session = await auth();
  if (session?.user) redirect("/dashboard");
  const { pending, error } = await searchParams;

  return (
    <LoginForm
      providers={enabledSocialProviders()}
      pendingEmail={pending ?? null}
      error={error ?? null}
    />
  );
}
