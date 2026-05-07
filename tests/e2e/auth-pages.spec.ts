import { expect, test } from "@playwright/test";

test.describe("auth pages render", () => {
  test("/login shows the sign-in form", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByRole("heading", { name: /sign in/i })).toBeVisible();
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByLabel("Password")).toBeVisible();
    await expect(page.getByRole("button", { name: /sign in/i })).toBeVisible();
    await expect(
      page.getByRole("button", { name: /continue with google/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: /forgot password/i }),
    ).toBeVisible();
  });

  test("/signup shows the wizard at step 1", async ({ page }) => {
    await page.goto("/signup");
    await expect(
      page.getByRole("heading", { name: /create account/i }),
    ).toBeVisible();
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByLabel("Password")).toBeVisible();
  });

  test("/signup?step=2 renders identity step", async ({ page }) => {
    await page.goto("/signup?step=2");
    await expect(
      page.getByRole("heading", { name: /your identity/i }),
    ).toBeVisible();
    await expect(page.getByLabel("First name")).toBeVisible();
    await expect(page.getByLabel("Last name")).toBeVisible();
    await expect(page.getByLabel("Username")).toBeVisible();
  });

  test("/signup?step=3 renders role step with options", async ({ page }) => {
    await page.goto("/signup?step=3");
    await expect(
      page.getByRole("heading", { name: /your role/i }),
    ).toBeVisible();
    await expect(page.getByText(/I want to play trivia/i)).toBeVisible();
    await expect(page.getByText(/I want to host/i)).toBeVisible();
  });

  test("/signup?step=4 renders verify step", async ({ page }) => {
    await page.goto("/signup?step=4");
    await expect(
      page.getByRole("heading", { name: /check your email/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /resend email/i }),
    ).toBeVisible();
  });

  test("/forgot-password shows the reset form", async ({ page }) => {
    await page.goto("/forgot-password");
    await expect(
      page.getByRole("heading", { name: /reset password/i }),
    ).toBeVisible();
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(
      page.getByRole("button", { name: /send reset link/i }),
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
});
