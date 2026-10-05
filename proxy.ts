import { NextResponse, type NextRequest } from "next/server";

// /lab/* is a dev tool (spec 2.7): open locally and on preview deploys, blocked in production
// unless ?key= matches LAB_KEY. A matching key sets a cookie so later visits need no query.
const COOKIE = "ps_lab";

export function proxy(request: NextRequest) {
  if (process.env.VERCEL_ENV !== "production") return withNoIndex(NextResponse.next());

  const expected = process.env.LAB_KEY;
  const key = request.nextUrl.searchParams.get("key") ?? request.cookies.get(COOKIE)?.value;
  if (!expected || key !== expected) {
    return new NextResponse("Not found", { status: 404, headers: { "X-Robots-Tag": "noindex" } });
  }

  const res = withNoIndex(NextResponse.next());
  res.cookies.set(COOKIE, expected, { httpOnly: true, secure: true, sameSite: "lax", path: "/lab", maxAge: 60 * 60 * 24 * 30 });
  return res;
}

function withNoIndex(res: NextResponse) {
  res.headers.set("X-Robots-Tag", "noindex, nofollow");
  return res;
}

export const config = {
  matcher: "/lab/:path*",
};
