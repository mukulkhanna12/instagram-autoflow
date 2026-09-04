import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { db } from "./db";
import { isApprovedEmail, normalizeEmail, verifyLoginCode } from "./otp";

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
  ],
  callbacks: {
    jwt: async ({ token, user }) => {
      if (user) token.id = user.id;
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
