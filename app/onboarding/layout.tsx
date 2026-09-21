import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { Logo } from "@/components/brand";

/**
 * Full-screen, distraction-free shell for the three first-run steps. No
 * sidebar: there is nothing to navigate to until an account is connected.
 */
export default async function OnboardingLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { onboardedAt: true },
  });
  if (user?.onboardedAt) redirect("/dashboard");

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <header className="px-6 py-5 max-w-6xl w-full mx-auto">
        <Logo href={null} />
      </header>
      <main className="flex-1 flex flex-col items-center px-4 pt-6 pb-16">{children}</main>
      <footer className="px-6 pb-8 text-center text-xs text-gray-400 space-y-1">
        <p>We connect through Instagram&apos;s official login — we never see your password.</p>
        <p>
          <a href="/privacy" className="underline underline-offset-2 hover:text-gray-700">
            Privacy Policy
          </a>
        </p>
      </footer>
    </div>
  );
}
