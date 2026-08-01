import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { db } from "./db";
import { isAllowedEmail, normalizeEmail, verifyLoginCode } from "./otp";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(db),
  // Credentials-based sign-in requires JWT sessions (there's no OAuth account to
  // persist), so the session id is carried in the token rather than a DB row.
  session: { strategy: "jwt" },
  providers: [
    Credentials({
      // The login page collects the email, requests a code (/api/auth/otp), then
      // submits email + code here. We re-check the allow-list and verify the code.
      credentials: { email: {}, code: {} },
      authorize: async (creds) => {
        const email = typeof creds?.email === "string" ? normalizeEmail(creds.email) : "";
        const code = typeof creds?.code === "string" ? creds.code : "";
        if (!email || !code || !isAllowedEmail(email)) return null;

        const ok = await verifyLoginCode(email, code);
        if (!ok) return null;

        // Ensure the single owning user row exists (Instagram accounts hang off it).
        const user = await db.user.upsert({
          where: { email },
          create: { email, name: "AutoFlow" },
          update: {},
        });
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
