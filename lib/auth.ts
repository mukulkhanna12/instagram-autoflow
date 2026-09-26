import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import Facebook from "next-auth/providers/facebook";
import type { Provider } from "next-auth/providers";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { db } from "./db";
import { isApprovedEmail, normalizeEmail, registerOrGetAccess, verifyLoginCode } from "./otp";
import { facebookConfig, googleConfig } from "./social-auth";

/** How often a signed-in session re-confirms the user is still approved. */
const APPROVAL_RECHECK_MS = 5 * 60 * 1000;

// Google and Facebook are only registered when their keys are set; see
// lib/social-auth.ts. Both verify the email address before handing it over,
// which is what makes linking to an existing email-code account safe — and the
// linking is needed, because the approval gate below creates the User row
// before the adapter gets to it.
const google = googleConfig();
const facebook = facebookConfig();
const socialProviders: Provider[] = [
  ...(google ? [Google({ ...google, allowDangerousEmailAccountLinking: true })] : []),
  ...(facebook ? [Facebook({ ...facebook, allowDangerousEmailAccountLinking: true })] : []),
];

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(db),
  // Auth.js v5 reads AUTH_SECRET by name; pass ours explicitly so NEXTAUTH_SECRET
  // (or AUTH_SECRET) works. Without a secret, production throws a "Configuration"
  // error. trustHost is required behind a proxy/host like Vercel.
  secret: process.env.NEXTAUTH_SECRET ?? process.env.AUTH_SECRET,
  trustHost: true,
  // Credentials-based sign-in requires JWT sessions (there's no OAuth account to
  // persist), so the session id is carried in the token rather than a DB row.
  session: { strategy: "jwt" },
  providers: [
    Credentials({
      // The login page collects the email, requests a code (/api/auth/otp), then
      // submits email + code here. We re-check approval and verify the code.
      credentials: { email: {}, code: {} },
      authorize: async (creds) => {
        const email = typeof creds?.email === "string" ? normalizeEmail(creds.email) : "";
        const code = typeof creds?.code === "string" ? creds.code : "";
        if (!email || !code) return null;

        // Checked again here, not just when the code was issued: an account
        // revoked in between must not be able to redeem a code already sent.
        if (!(await isApprovedEmail(email))) return null;

        const ok = await verifyLoginCode(email, code);
        if (!ok) return null;

        // The row was created when the code was requested; each signed-in user
        // is its own tenant and their Instagram accounts hang off this row.
        const user = await db.user.findUnique({ where: { email } });
        if (!user) return null;
        return { id: user.id, email: user.email, name: user.name };
      },
    }),
    ...socialProviders,
  ],
  callbacks: {
    /**
     * The approval gate, for Google and Facebook. Signing in with either is the
     * same as asking for an email code: it registers an unapproved account, and
     * nobody gets a session until it is approved by hand. A pending account is
     * sent back to the login page's "waiting for approval" message.
     */
    signIn: async ({ account, profile, user }) => {
      // Email codes and invite links are checked in their own authorize().
      if (!account || account.type === "credentials") return true;

      // Already linked to an account: sign in as that account, whatever email
      // the provider reports — it may differ from the one the account uses.
      const linked = await db.account.findUnique({
        where: { provider_providerAccountId: { provider: account.provider, providerAccountId: account.providerAccountId } },
        select: { user: { select: { email: true, isApproved: true } } },
      });
      if (linked) {
        return linked.user.isApproved ? true : `/login?pending=${encodeURIComponent(linked.user.email)}`;
      }

      // Signed in already and connecting Google/Facebook from Settings →
      // Sign-in methods: Auth.js links the new account to the current user, so
      // the provider's email doesn't go through the sign-up gate at all.
      const current = await auth();
      if (current?.user?.id) return true;

      const rawEmail = profile?.email ?? user?.email;
      if (!rawEmail) return "/login?error=no_email";
      const email = normalizeEmail(rawEmail);

      const access = await registerOrGetAccess(email);
      if (access === "limited") return "/login?error=busy";
      if (access !== "approved") return `/login?pending=${encodeURIComponent(email)}`;

      // registerOrGetAccess names a new row "AutoFlow"; take the real name and
      // photo from the provider the first time we see them.
      const row = await db.user.findUnique({ where: { email }, select: { name: true, image: true } });
      if (row && (!row.name || row.name === "AutoFlow" || !row.image)) {
        await db.user.update({
          where: { email },
          data: {
            name: !row.name || row.name === "AutoFlow" ? (user?.name ?? row.name) : row.name,
            image: row.image ?? user?.image ?? null,
          },
        });
      }
      return true;
    },
    /**
     * Sessions are self-contained JWTs, so on their own they'd outlive a
     * revoked approval by up to 30 days. Every few minutes the token is checked
     * against the database, and a user who is gone or no longer approved is
     * signed out (returning null ends the session).
     */
    jwt: async ({ token, user }) => {
      if (user) {
        token.id = user.id;
        token.checkedAt = Date.now();
        return token;
      }
      if (!token.id) return null;
      if (Date.now() - ((token.checkedAt as number | undefined) ?? 0) > APPROVAL_RECHECK_MS) {
        const row = await db.user.findUnique({
          where: { id: token.id as string },
          select: { isApproved: true },
        });
        if (!row?.isApproved) return null;
        token.checkedAt = Date.now();
      }
      return token;
    },
    session: async ({ session, token }) => {
      if (session.user && token.id) session.user.id = token.id as string;
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
});
