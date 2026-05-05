// tests/e2e/landing.spec.ts
import { test, expect } from '@playwright/test';

test('landing page renders branded heading and CTAs', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1, name: /trivix/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /get started/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /i'?m a host/i })).toBeVisible();
});

test('respects prefers-reduced-motion', async ({ browser }) => {
  const context = await browser.newContext({ reducedMotion: 'reduce' });
  const page = await context.newPage();
  await page.goto('/');
  // motion tier should be 'off'; ThemeProvider sets data-motion-tier
  const tier = await page.locator('[data-motion-tier]').first().getAttribute('data-motion-tier');
  expect(tier).toBe('off');
  await context.close();
});
