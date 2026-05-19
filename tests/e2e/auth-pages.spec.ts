import { expect, test } from "@playwright/test";

test.describe("auth pages render", () => {
  test("/login shows the sign-in form", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByRole("heading", { name: /sign in/i })).toBeVisible();
    await expect(
      page.getByLabel(/username, email, or phone/i),
    ).toBeVisible();
    await expect(page.getByLabel("Password")).toBeVisible();
    await expect(page.getByRole("button", { name: /sign in/i })).toBeVisible();
    await expect(
      page.getByRole("link", { name: /forgot password/i }),
    ).toBeVisible();
  });

  test("/signup shows the wizard at step 1 (phone)", async ({ page }) => {
    await page.goto("/signup");
    await expect(
      page.getByRole("heading", { name: /verify your phone/i }),
    ).toBeVisible();
    await expect(page.getByLabel(/phone number/i)).toBeVisible();
    await expect(
      page.getByRole("button", { name: /send code/i }),
    ).toBeVisible();
  });

  test("/forgot-password shows the choose-method screen", async ({ page }) => {
    await page.goto("/forgot-password");
    await expect(
      page.getByRole("heading", { name: /reset password/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /email me a reset link/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /text me a code/i }),
    ).toBeVisible();
  });

  test("/reset-password without oobCode shows expired link", async ({
    page,
  }) => {
    await page.goto("/reset-password");
    await expect(
      page.getByRole("heading", { name: /link expired/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: /request a new link/i }),
    ).toBeVisible();
  });
});

test.describe("middleware redirects", () => {
  test("/dashboard without cookie redirects to /login?next=/dashboard", async ({
    page,
  }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login\?next=%2Fdashboard/);
  });

  test("/profile without cookie redirects to /login?next=/profile", async ({
    page,
  }) => {
    await page.goto("/profile");
    await expect(page).toHaveURL(/\/login\?next=%2Fprofile/);
  });

  test("/host without cookie redirects to /login", async ({ page }) => {
    await page.goto("/host");
    await expect(page).toHaveURL(/\/login/);
  });

  test("/admin without cookie redirects to /login?next=/admin", async ({
    page,
  }) => {
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/login\?next=%2Fadmin/);
  });

  test("/admin/host-applications without cookie redirects", async ({
    page,
  }) => {
    await page.goto("/admin/host-applications");
    await expect(page).toHaveURL(/\/login\?next=%2Fadmin%2Fhost-applications/);
  });

  test("/admin/users without cookie redirects", async ({ page }) => {
    await page.goto("/admin/users");
    await expect(page).toHaveURL(/\/login\?next=%2Fadmin%2Fusers/);
  });

  test("/admin/teams without cookie redirects", async ({ page }) => {
    await page.goto("/admin/teams");
    await expect(page).toHaveURL(/\/login\?next=%2Fadmin%2Fteams/);
  });

  test("/admin/venues without cookie redirects", async ({ page }) => {
    await page.goto("/admin/venues");
    await expect(page).toHaveURL(/\/login\?next=%2Fadmin%2Fvenues/);
  });

  test("/host/venues/new without cookie redirects", async ({ page }) => {
    await page.goto("/host/venues/new");
    await expect(page).toHaveURL(/\/login\?next=%2Fhost%2Fvenues%2Fnew/);
  });

  test("/host/question-sets without cookie redirects", async ({ page }) => {
    await page.goto("/host/question-sets");
    await expect(page).toHaveURL(/\/login\?next=%2Fhost%2Fquestion-sets/);
  });

  test("/admin/question-sets without cookie redirects", async ({ page }) => {
    await page.goto("/admin/question-sets");
    await expect(page).toHaveURL(/\/login\?next=%2Fadmin%2Fquestion-sets/);
  });

  test("/host/games/new without cookie redirects", async ({ page }) => {
    await page.goto("/host/games/new");
    await expect(page).toHaveURL(/\/login\?next=%2Fhost%2Fgames%2Fnew/);
  });

  test("/play without cookie redirects", async ({ page }) => {
    await page.goto("/play");
    await expect(page).toHaveURL(/\/login\?next=%2Fplay/);
  });

  test("/admin/games without cookie redirects", async ({ page }) => {
    await page.goto("/admin/games");
    await expect(page).toHaveURL(/\/login\?next=%2Fadmin%2Fgames/);
  });
});
