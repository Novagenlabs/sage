# Mobile API integration — additions to the web app

This documents the **two** additive changes to the `sage/` web app that enable the Expo mobile client to use the existing backend. Web behavior is unchanged.

## 1. New files

- `lib/mobile-auth.ts` — JWT signing/verification using the same `AUTH_SECRET`, plus a shared `getUserFromRequest(req)` helper that accepts **either** a NextAuth session cookie **or** an `Authorization: Bearer …` token.
- `app/api/auth/mobile/login/route.ts` — POST `{email, password}` → `{token, refreshToken, user}`.
- `app/api/auth/mobile/refresh/route.ts` — POST `{refreshToken}` → fresh `{token, refreshToken, user}`.

## 2. Migrating protected routes

For each protected route (e.g. `app/api/chat/route.ts`, `app/api/conversations/route.ts`, `app/api/livekit/token/route.ts`, `app/api/user/profile/route.ts`, etc.), replace:

```ts
import { auth } from "@/auth";

const session = await auth();
if (!session?.user?.id) {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
const userId = session.user.id;
```

with:

```ts
import { getUserFromRequest } from "@/lib/mobile-auth";

const user = await getUserFromRequest(request);
if (!user) {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
const userId = user.id;
```

Web continues to send cookies; mobile sends `Authorization: Bearer <token>`. Both paths land in the same handler with the same `userId`.

## 3. Paystack callback for mobile

`app/api/payments/initialize/route.ts` should accept an optional `callback_url` from the body and forward it to Paystack:

```ts
const { credits, amount, callback_url } = await request.json();
// ...
const paystackBody = {
  email: user.email,
  amount,
  metadata: { userId: user.id, credits },
  callback_url: callback_url ?? `${process.env.NEXT_PUBLIC_SITE_URL}/credits?verify=1`,
};
```

Mobile passes `callback_url: "sage://payments/return"` so the WebBrowser auth session deep-links back into the app on completion. Web continues to use the default web URL.

## 4. Optional: voice concurrency cap

In `app/api/livekit/token/route.ts`, before issuing a token, reject if the user already has an active voice session within the last N minutes. Cheapest implementation: query LiveKit's REST API for active rooms with a participant identity matching the user, or maintain a small Redis key with TTL.

## 5. Env

No new env vars. `AUTH_SECRET` is reused.

## 6. Deploy notes

- `jose` is already pulled in transitively by `next-auth@5`. No new dependency.
- Bump only after sign-out: existing NextAuth sessions are unaffected.
