import { test, expect } from "@playwright/test";
import { ensureTestUser, signIn } from "./_helpers";

test.beforeAll(async ({ request }) => {
  await ensureTestUser(request);
});

test("library: editorial grid renders + card opens detail sheet", async ({
  page,
}) => {
  await signIn(page);
  await page.goto("/library");

  // Header
  await expect(
    page.getByRole("heading", { name: /things worth/i })
  ).toBeVisible({ timeout: 15_000 });

  // Filter chips visible. Match exact label-with-count text — "books 20" —
  // so we don't collide with card titles that also contain "books".
  await expect(page.getByRole("button", { name: /^all\s+\d+$/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /^books\s+\d+$/i })).toBeVisible();

  // First card — pulled from the seeded catalog. Plato's Allegory of the
  // Cave is the first resource we seeded so it should always be visible.
  const card = page
    .getByRole("button", { name: /plato's allegory of the cave/i })
    .first();
  await expect(card).toBeVisible();

  await card.click();
  const dialog = page.getByRole("dialog", {
    name: /plato's allegory of the cave/i,
  });
  await expect(dialog).toBeVisible({ timeout: 10_000 });

  // The detail sheet renders the resource player which should attach a
  // YouTube iframe for this catalog item.
  await expect(
    dialog.locator("iframe[src*='youtube.com/embed']")
  ).toBeAttached({ timeout: 5_000 });

  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden({ timeout: 3_000 });
});

test("library: filter chip narrows the grid", async ({ page }) => {
  await signIn(page);
  await page.goto("/library");

  await page.getByRole("button", { name: /^videos\s+\d+$/i }).click();
  // After picking 'videos' only the Plato + Power-of-Myth (etc.) videos
  // remain. We don't know exact catalog count so just assert at least one
  // video card is visible and at least one book title is gone.
  await expect(
    page.getByRole("button", { name: /plato's allegory/i }).first()
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: /tao te ching/i })
  ).toHaveCount(0);
});
