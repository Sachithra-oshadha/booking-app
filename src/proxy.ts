import { getSessionCookie } from "better-auth/cookies";
import { NextResponse, type NextRequest } from "next/server";

// Optimistic check only (cookie present). Real authorization happens in server/*.
export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const loggedIn = !!getSessionCookie(req);
  const isAuthPage = pathname === "/login" || pathname === "/register";
  if (!loggedIn && !isAuthPage) return NextResponse.redirect(new URL("/login", req.url));
  if (loggedIn && isAuthPage) return NextResponse.redirect(new URL("/resources", req.url));
  return NextResponse.next();
}

export const config = { matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"] };
