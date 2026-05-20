// Higher-order auth wrapper for route handlers.
//
// Centralizes authentication so individual routes never re-implement the
// cookie-vs-bearer check. Wrap a handler and it receives a guaranteed
// authenticated `user` (resolved from EITHER a NextAuth session cookie (web)
// OR an Authorization: Bearer mobile token), or the request is rejected 401.
//
//   export const GET = withAuth(async (request, user) => {
//     // user.id, user.email, user.credits, user.name are guaranteed
//   });
//
// This keeps web auth working unchanged while making every wrapped route
// usable by the mobile app too.

import { getUserFromRequest, type AuthedUser } from "@/lib/mobile-auth";

// Handler receives the authenticated user as its 2nd arg, after `request`.
// Any remaining Next.js route args (e.g. the `{ params }` context for dynamic
// `[id]` routes) are forwarded through `ctx`, so the same wrapper works for
// both static and dynamic routes:
//
//   export const GET = withAuth(async (request, user) => { ... });
//   export const GET = withAuth(async (request, user, { params }) => { ... });
type AuthedHandler<Ctx extends unknown[]> = (
  request: Request,
  user: AuthedUser,
  ...ctx: Ctx
) => Promise<Response> | Response;

export function withAuth<Ctx extends unknown[]>(handler: AuthedHandler<Ctx>) {
  return async (request: Request, ...ctx: Ctx): Promise<Response> => {
    const user = await getUserFromRequest(request);
    if (!user) {
      return new Response(JSON.stringify({ error: "Authentication required" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }
    return handler(request, user, ...ctx);
  };
}
