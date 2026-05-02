import { test, expect } from "@playwright/test";
import { ensureTestUser, signIn, E2E_EMAIL } from "./_helpers";

test.beforeAll(async ({ request }) => {
  await ensureTestUser(request);
});

test("can sign in and land on /home", async ({ page }) => {
  await signIn(page);
  expect(page.url()).toMatch(/\/home/);
  // The home page renders Mobile + Desktop variants both in the DOM; CSS
  // hides one based on viewport. At Playwright's default desktop viewport
  // we expect the explore CTA heading to be visible somewhere on screen.
  await expect(
    page.getByRole("heading", { name: /what would you like/i }).last()
  ).toBeVisible();
});

test("rejects invalid credentials with an inline error", async ({ page }) => {
  await page.goto("/auth/signin");
  await page.getByPlaceholder("you@example.com").fill(E2E_EMAIL);
  await page.getByPlaceholder("••••••••").fill("definitely-wrong");
  await page.getByRole("button", { name: /sign in/i }).click();
  await expect(page.getByText(/invalid email or password/i)).toBeVisible();
  expect(page.url()).toMatch(/\/auth\/signin/);
});

test("auth-gated routes redirect to sign-in when signed out", async ({ page }) => {
  // Use a fresh context implicitly — Playwright spins one per test by default.
  await page.goto("/home");
  await expect(page).toHaveURL(/\/auth\/signin/);
});

test("signup form validates short passwords client-side", async ({ page }) => {
  await page.goto("/auth/signup");
  await page.getByPlaceholder("what should sage call you?").fill("Test User");
  await page.getByPlaceholder("you@example.com").fill("never-used@sage.test");
  await page.getByPlaceholder("6+ characters").fill("123");
  await page.getByRole("button", { name: /create account/i }).click();
  await expect(page.getByText(/at least 6 characters/i)).toBeVisible();
});
