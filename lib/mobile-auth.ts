// Shared helpers for mobile (bearer-token) auth alongside the existing
// NextAuth cookie-based session. Token uses the same AUTH_SECRET so both
// paths can co-exist; protected API routes use `getUserFromRequest` to
// transparently accept either form.

import { SignJWT, jwtVerify } from "jose";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const ACCESS_TTL_SEC = 60 * 60; // 1 hour
const REFRESH_TTL_SEC = 60 * 60 * 24 * 30; // 30 days

function getSecret(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET is not set");
  return new TextEncoder().encode(secret);
}

export interface MobileJWTPayload {
  sub: string;
  email: string;
  name?: string | null;
  type: "access" | "refresh";
}

export async function signMobileToken(
  payload: Omit<MobileJWTPayload, "type">,
  type: "access" | "refresh"
): Promise<string> {
  const ttl = type === "access" ? ACCESS_TTL_SEC : REFRESH_TTL_SEC;
  return await new SignJWT({ ...payload, type })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(Math.floor(Date.now() / 1000) + ttl)
    .sign(getSecret());
}

export async function verifyMobileToken(
  token: string
): Promise<MobileJWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret(), {
      algorithms: ["HS256"],
    });
    if (typeof payload.sub !== "string") return null;
    return payload as unknown as MobileJWTPayload;
  } catch {
    return null;
  }
}

export interface AuthedUser {
  id: string;
  email: string;
  credits: number;
  name?: string | null;
}

/**
 * Read user from either a NextAuth session cookie OR an Authorization bearer
 * mobile token. Returns null when unauthenticated.
 */
export async function getUserFromRequest(
  request: Request
): Promise<AuthedUser | null> {
  // Try bearer token first (cheaper than DB session lookup)
  const authHeader = request.headers.get("authorization");
  if (authHeader && authHeader.toLowerCase().startsWith("bearer ")) {
    const token = authHeader.slice(7).trim();
    const payload = await verifyMobileToken(token);
    if (payload && payload.type === "access") {
      const user = await prisma.user.findUnique({
        where: { id: payload.sub },
        select: { id: true, email: true, credits: true, name: true },
      });
      if (user) return user;
    }
  }

  // Fall back to NextAuth session (web)
  const session = await auth();
  if (session?.user?.id) {
    return {
      id: session.user.id,
      email: session.user.email ?? "",
      credits: session.user.credits,
      name: session.user.name ?? null,
    };
  }

  return null;
}
