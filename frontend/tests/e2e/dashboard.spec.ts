import { test, expect } from '@playwright/test';

test('renders dashboard shell and generate button', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('button', { name: /generate|refresh/i })).toBeVisible();
  await expect(page.getByText('SYSTEM READY', { exact: false })).toBeVisible();
});
