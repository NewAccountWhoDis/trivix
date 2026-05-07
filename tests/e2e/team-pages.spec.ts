import { expect, test } from "@playwright/test";

test.describe("team pages — middleware redirects", () => {
  test("/team without cookie redirects to /login?next=/team", async ({
    page,
  }) => {
    await page.goto("/team");
    await expect(page).toHaveURL(/\/login\?next=%2Fteam/);
  });

  test("/team/create redirects to /login", async ({ page }) => {
    await page.goto("/team/create");
    await expect(page).toHaveURL(/\/login\?next=%2Fteam%2Fcreate/);
  });

  test("/team/join redirects to /login", async ({ page }) => {
    await page.goto("/team/join");
    await expect(page).toHaveURL(/\/login\?next=%2Fteam%2Fjoin/);
  });

  test("/team/pending redirects to /login", async ({ page }) => {
    await page.goto("/team/pending");
    await expect(page).toHaveURL(/\/login\?next=%2Fteam%2Fpending/);
  });

  test("/team/settings redirects to /login", async ({ page }) => {
    await page.goto("/team/settings");
    await expect(page).toHaveURL(/\/login\?next=%2Fteam%2Fsettings/);
  });
});
