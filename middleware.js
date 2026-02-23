import { NextResponse } from "next/server";

export function middleware(request) {
  const auth = request.cookies.get("auth")?.value;
  const pathname = request.nextUrl.pathname;

  if (pathname.startsWith("/dashboard") && !auth) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (pathname === "/login" && auth) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/login"],
};