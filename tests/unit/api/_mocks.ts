// Shared mock factory for API route tests. Each test file calls these and
// stages the responses they need before importing the route under test.
import { vi } from "vitest";

type AuthResult = { user: { id: string; email?: string } } | null;

export const mockAuth = vi.fn<() => Promise<AuthResult>>();

export const mockPrisma = {
  user: {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    update: vi.fn(),
    create: vi.fn(),
  },
  conversation: {
    findFirst: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
    delete: vi.fn(),
  },
  message: {
    create: vi.fn(),
    findMany: vi.fn(),
  },
  conversationInsight: {
    createMany: vi.fn(),
    findMany: vi.fn(),
  },
  userInsight: {
    findMany: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  feedback: {
    create: vi.fn(),
  },
  resource: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  recommendation: {
    findMany: vi.fn(),
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  payment: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  referral: {
    count: vi.fn(),
    create: vi.fn(),
  },
  usageRecord: {
    create: vi.fn(),
  },
  $transaction: vi.fn(),
};

export const mockInngestSend = vi.fn();

// Inngest event helpers used by some routes.
vi.mock("@/lib/inngest/client", () => ({
  inngest: { send: mockInngestSend },
}));

// Auth — every route auth-gates via this.
vi.mock("@/auth", () => ({
  auth: mockAuth,
}));

// Prisma — every route reads/writes through this.
vi.mock("@/lib/prisma", () => ({
  prisma: mockPrisma,
}));

// Credits helper — most routes that gate on credits or deduct go through here.
export const mockHasEnoughCredits = vi.fn();
export const mockDeductCredits = vi.fn();
export const mockDeductCreditsWithOptions = vi.fn();
export const mockAddCredits = vi.fn();
vi.mock("@/lib/credits", () => ({
  hasEnoughCredits: mockHasEnoughCredits,
  deductCredits: mockDeductCredits,
  deductCreditsWithOptions: mockDeductCreditsWithOptions,
  addCredits: mockAddCredits,
  calculateCreditsUsed: (a: number, b: number) => Math.ceil((a + b) / 1000),
}));

export function resetMocks() {
  vi.clearAllMocks();
  mockAuth.mockResolvedValue(null);
  mockHasEnoughCredits.mockResolvedValue(true);
  mockDeductCredits.mockResolvedValue({ success: true, remainingCredits: 100 });
  mockDeductCreditsWithOptions.mockResolvedValue({ success: true, remainingCredits: 100 });
}

/**
 * Build a Request to feed into a Next route handler.
 * Defaults to POST + JSON body.
 */
export function makeReq(
  url: string,
  init?: { method?: string; body?: unknown; headers?: Record<string, string> }
): Request {
  const method = init?.method ?? (init?.body ? "POST" : "GET");
  const headers = {
    "Content-Type": "application/json",
    ...(init?.headers ?? {}),
  };
  return new Request(url, {
    method,
    headers,
    body: init?.body !== undefined ? JSON.stringify(init.body) : undefined,
  });
}
