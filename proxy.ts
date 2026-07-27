export { auth as proxy } from "@/lib/auth";

export const config = {
  matcher: [
    "/((?!api/auth|api/webhooks|login|_next/static|_next/image|favicon.ico|$).*)",
  ],
};
