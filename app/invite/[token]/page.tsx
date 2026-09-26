import Link from "next/link";
import { AlertCircle, Users } from "lucide-react";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { findInviteByToken } from "@/lib/invites";
import { normalizeEmail } from "@/lib/otp";
import { Logo } from "@/components/brand";
import { AcceptInviteButton, ExpiresAt, JoinWithInviteForm, SwitchAccountButton } from "@/components/workspace/accept-invite";

export const metadata = { title: "Join a workspace — AutoFlow" };

/**
 * Where an invite link lands. Public, so someone without an account can see
 * what they've been invited to before signing up. Accepting needs you signed in
 * as the invited address; signing in from here brings you straight back.
 */
export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const [invite, session] = await Promise.all([findInviteByToken(token), auth()]);

  const me = session?.user?.id
    ? await db.user.findUnique({ where: { id: session.user.id }, select: { email: true } })
    : null;

  const who = invite
    ? invite.invitedBy.name && invite.invitedBy.name !== "AutoFlow" ? invite.invitedBy.name : invite.invitedBy.email
    : "";
  const next = `/invite/${token}`;

  let body: React.ReactNode;
  if (!invite || invite.status !== "pending") {
    const why = !invite
      ? "This invite link isn't valid."
      : invite.status === "accepted"
        ? "This invite has already been used."
        : invite.status === "expired"
          ? "This invite has expired."
          : "This invite was cancelled.";
    body = (
      <>
        <Badge icon={AlertCircle} tone="amber" />
        <h1 className="mt-5 text-2xl font-extrabold">{why}</h1>
        <p className="mt-2 text-gray-500">Ask the workspace owner to send you a new one.</p>
        <Link href={me ? "/dashboard" : "/login"} className="mt-7 inline-flex h-12 items-center justify-center rounded-full bg-gray-950 px-6 font-bold text-white">
          {me ? "Go to your dashboard" : "Log in"}
        </Link>
      </>
    );
  } else {
    body = (
      <>
        <Badge icon={Users} tone="lime" />
        <p className="mt-5 text-gray-500"><strong className="text-gray-950">{who}</strong> invited you to join</p>
        <h1 className="mt-1 text-3xl font-extrabold tracking-tight">{invite.workspace.name}</h1>
        <p className="mt-3 text-gray-500">
          You&apos;ll be able to build and run its Instagram automations, as a member.
        </p>
        <div className="mt-4"><ExpiresAt iso={invite.expiresAt.toISOString()} /></div>

        <div className="mt-8">
          {!me ? (
            <JoinWithInviteForm token={token} email={invite.email} workspaceName={invite.workspace.name} />
          ) : normalizeEmail(me.email) === invite.email ? (
            <AcceptInviteButton token={token} />
          ) : (
            <div className="space-y-3">
              <p className="rounded-2xl bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-900">
                This invite is for <strong>{invite.email}</strong>, but you&apos;re signed in as <strong>{me.email}</strong>.
              </p>
              <SwitchAccountButton next={next} email={invite.email} />
            </div>
          )}
        </div>
      </>
    );
  }

  return (
    <div className="min-h-screen bg-[#f3f4f1] flex flex-col">
      <header className="px-6 py-5 max-w-6xl w-full mx-auto"><Logo /></header>
      <main className="flex-1 flex items-center justify-center px-4 pb-16">
        <div className="w-full max-w-md rounded-[2rem] bg-white p-8 sm:p-10 text-center shadow-[0_30px_60px_-30px_rgba(0,0,0,0.25)]">
          {body}
        </div>
      </main>
    </div>
  );
}

function Badge({ icon: Icon, tone }: { icon: React.ComponentType<{ className?: string }>; tone: "lime" | "amber" }) {
  return (
    <span className={`mx-auto flex h-16 w-16 items-center justify-center rounded-3xl ${tone === "lime" ? "bg-brand-900 text-lime" : "bg-amber-100 text-amber-600"}`}>
      <Icon className="h-7 w-7" />
    </span>
  );
}

