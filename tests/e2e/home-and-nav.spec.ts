import { test, expect } from "@playwright/test";
import {
  ensureTestUser,
  signIn,
  stubConversationApis,
  stubExplore,
} from "./_helpers";

test.beforeAll(async ({ request }) => {
  await ensureTestUser(request);
});

test.beforeEach(async ({ page }) => {
  await stubConversationApis(page);
  await stubExplore(page);
});

test("home shows three actions and tab bar", async ({ page }) => {
  await signIn(page);
  // Home renders Mobile + Desktop in parallel; the desktop variant has the
  // label INSIDE a card so the link's accessible name includes the sub-line
  // "best for thinking out loud in writing". Match permissively.
  await expect(
    page.getByRole("link", { name: /type/i }).last()
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: /talk/i }).last()
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: /see/i }).last()
  ).toBeVisible();
});

test("explore tab shows stubbed prompt cards", async ({ page }) => {
  await signIn(page);
  await page.goto("/v2/explore");
  await expect(page.getByText("stubbed test prompts.")).toBeVisible();
  await expect(page.getByRole("heading", { name: /stub one/i })).toBeVisible();
});

test("entries tab loads with empty state", async ({ page }) => {
  await signIn(page);
  await page.goto("/v2/entries");
  // Either the empty welcome or the entries header should be visible.
  await expect(
    page.getByRole("heading", { name: /^entries$/i, level: 1 }).first()
  ).toBeVisible();
});

test("profile shows the user's name and email", async ({ page }) => {
  await signIn(page);
  await page.goto("/v2/profile");
  // The lowercased firstName is the H1; the email is the only e2e-user
  // string on the page so we can match it directly.
  await expect(page.getByText("e2e-user@sage.test")).toBeVisible();
  await expect(
    page.locator("h1").filter({ hasText: "e2e" })
  ).toBeVisible();
});

test("can sign out from profile", async ({ page }) => {
  await signIn(page);
  await page.goto("/v2/profile");
  // The TopNav's sign-out lives inside a conditionally-rendered dropdown
  // (menuOpen=false by default). Profile's sign-out is the only one in DOM.
  await page.getByRole("button", { name: /sign out/i }).click();
  await expect(page).toHaveURL(/\/v2\/auth\/signin/);
});
