import { test, expect } from "@playwright/test";
import { ensureTestUser, E2E_EMAIL } from "./_helpers";

test.beforeAll(async ({ request }) => {
  await ensureTestUser(request);
});

test("signin page links to forgot-password", async ({ page }) => {
  await page.goto("/auth/signin");
  await page.getByRole("link", { name: /forgot password/i }).click();
  await expect(page).toHaveURL(/\/auth\/forgot-password/);
  await expect(
    page.getByRole("heading", { name: /reset your password/i })
  ).toBeVisible();
});

test("forgot-password form submits and shows the privacy-preserving success state", async ({
  page,
}) => {
  // Stub the API so we don't actually try to send an email.
  await page.route("**/api/auth/forgot", async (route) => {
    await route.fulfill({
      status: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ok: true,
        message: "If that email is registered, we've sent a link…",
      }),
    });
  });

  await page.goto("/auth/forgot-password");
  await page.getByPlaceholder("you@example.com").fill(E2E_EMAIL);
  await page.getByRole("button", { name: /send reset link/i }).click();

  await expect(page.getByText(/if that email is registered/i)).toBeVisible({
    timeout: 5_000,
  });
  await expect(
    page.getByRole("link", { name: /back to sign in/i })
  ).toBeVisible();
});

test("reset-password without a token shows the missing-token state", async ({
  page,
}) => {
  await page.goto("/auth/reset-password");
  await expect(page.getByText(/missing its token/i)).toBeVisible();
});

test("reset-password with a token shows the password form and validates inputs", async ({
  page,
}) => {
  await page.goto(`/auth/reset-password?token=${"x".repeat(64)}`);
  await expect(
    page.getByRole("heading", { name: /choose a new password/i })
  ).toBeVisible();

  // Mismatched confirm → inline error, no API call.
  await page.getByPlaceholder("••••••••").first().fill("hunter22");
  await page.getByPlaceholder("••••••••").nth(1).fill("hunter23");
  await page.getByRole("button", { name: /update password/i }).click();
  await expect(page.getByText(/passwords don't match/i)).toBeVisible();
});
