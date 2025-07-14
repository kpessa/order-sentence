import { test, expect } from '@playwright/test';

test.describe('Basic Smoke Tests', () => {
  test('should load the home page', async ({ page }) => {
    await page.goto('/');

    // Verify page loads
    await expect(page).toHaveTitle(/Comprehensive Drug Analysis/);

    // Verify main heading
    await expect(page.locator('h1')).toContainText(
      'Comprehensive Drug Analysis'
    );

    // Verify main sections are present
    await expect(page.locator('#drug-search')).toBeVisible();
    await expect(page.locator('#workflow-selection')).toBeVisible();

    // Verify drug search section
    await expect(page.locator('#drug-search h2')).toContainText(
      'Step 1: Drug Search'
    );

    // Verify workflow selection section
    await expect(page.locator('#workflow-selection h2')).toContainText(
      'Step 2: Workflow Selection'
    );

    // Verify workflow selection is initially disabled
    await expect(page.locator('#workflow-selection')).toHaveClass(/opacity-50/);
  });

  test('should load the excel viewer page', async ({ page }) => {
    await page.goto('/excel-viewer?rxcui=161&name=Acetaminophen');

    // Wait for page to load
    await expect(page.locator('h1')).toContainText('Cerner Order Sentences');

    // Verify drug information is displayed
    await expect(page.locator('p')).toContainText('For: Acetaminophen');
    await expect(page.locator('p')).toContainText('RxCUI: 161');
  });

  test('should handle missing drug information in excel viewer', async ({
    page,
  }) => {
    await page.goto('/excel-viewer');

    // Verify error message
    await expect(page.locator('p')).toContainText(
      'Drug information not provided in URL'
    );

    // Verify home link is present
    await expect(page.locator('a[href="/"]')).toBeVisible();
  });

  test('should be responsive on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');

    // Verify main elements are visible on mobile
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('#drug-search')).toBeVisible();
    await expect(page.locator('#workflow-selection')).toBeVisible();
  });
});
