import { test, expect } from '@playwright/test';

test('homepage loads and shows portal heading', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/Global Academy of Technology|Verification Portal/i);
  await expect(page.getByRole('link', { name: /Report Issue/i })).toBeVisible();
});

test('report issue page form fields are visible', async ({ page }) => {
  await page.goto('/report-issue');
  await expect(page.getByRole('heading', { name: /Report an Issue/i })).toBeVisible();
  await expect(page.getByLabel(/Title/i)).toBeVisible();
  await expect(page.getByLabel(/What happened\?/i)).toBeVisible();
  await expect(page.getByRole('button', { name: /Submit Report/i })).toBeVisible();
});
