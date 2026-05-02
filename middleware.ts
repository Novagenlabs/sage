import { NextResponse, type NextRequest } from "next/server";

// Backwards-compat: any old /v2/* link (bookmarks, shared URLs, push
// notifications minted before the rename) gets a 308 redirect to the
// new path at the root. Strip the /v2 prefix and forward.
//
// The matcher below ensures this middleware only runs on /v2 paths,
// so non-v2 requests pay zero cost.
export function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  const stripped = pathname.replace(/^\/v2(\/|$)/, "/");
  const url = req.nextUrl.clone();
  url.pathname = stripped === "" ? "/" : stripped;
  url.search = search;
  return NextResponse.redirect(url, 308);
}

export const config = {
  matcher: ["/v2", "/v2/:path*"],
};
