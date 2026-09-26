import type { NextResponse } from "next/server";
import { WORKSPACE_COOKIE } from "./workspace";

/** Remember the chosen workspace. Only an id — access is re-checked on every request. */
export function setWorkspaceCookie(res: NextResponse, workspaceId: string) {
  res.cookies.set(WORKSPACE_COOKIE, workspaceId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  return res;
}
