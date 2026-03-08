import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware() {
    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
);

// Protect all app routes; auth/api routes are public
export const config = {
  matcher: [
    "/dashboard/:path*",
    "/staffing/:path*",
    "/actuals/:path*",
    "/reports/:path*",
    "/admin/:path*",
  ],
};
