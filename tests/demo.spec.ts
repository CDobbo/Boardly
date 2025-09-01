import { test, expect } from '@playwright/test';

test.describe('Demo Tests', () => {
  test('should pass - basic page load', async ({ page }) => {
    await page.goto('https://example.com');
    await expect(page).toHaveTitle(/Example/);
  });

  test('should pass - simple assertion', async ({ page }) => {
    await page.goto('https://example.com');
    const heading = page.locator('h1');
    await expect(heading).toContainText('Example Domain');
  });

  test('should pass - wait for element', async ({ page }) => {
    await page.goto('https://httpbin.org/delay/1');
    await expect(page.locator('body')).toContainText('origin');
  });

  test('should fail - intentional failure for demo', async ({ page }) => {
    await page.goto('https://example.com');
    // This will fail to demonstrate error handling
    await expect(page.locator('h1')).toContainText('This text does not exist');
  });

  test.skip('should skip - skipped test demo', async ({ page }) => {
    await page.goto('https://example.com');
    await expect(page).toHaveTitle('Skipped Test');
  });
});