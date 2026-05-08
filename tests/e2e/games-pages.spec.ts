import { expect, test } from "@playwright/test";

test.describe("games pages — middleware redirects", () => {
  test("/host/games/abc/present without cookie redirects to /login", async ({
    page,
  }) => {
    await page.goto("/host/games/abc/present");
    await expect(page).toHaveURL(
      /\/login\?next=%2Fhost%2Fgames%2Fabc%2Fpresent/,
    );
  });

  test("/play preserves ?code= through the login redirect", async ({
    page,
  }) => {
    await page.goto("/play?code=ABCD23");
    await expect(page).toHaveURL(/\/login\?next=%2Fplay%3Fcode%3DABCD23/);
  });
});
