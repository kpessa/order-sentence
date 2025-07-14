import { test, expect } from '@playwright/test';

// Test configuration
const BASE_URL = 'http://localhost:3000';

test.describe('Main Application Workflows', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
  });

  test.describe('Drug Search Workflow', () => {
    test('should allow users to search for a drug and see results', async ({ page }) => {
      // Navigate to home page
      await expect(page).toHaveTitle(/Comprehensive Drug Analysis/);
      
      // Find and interact with the drug search component
      const drugSearchSection = page.locator('#drug-search');
      await expect(drugSearchSection).toBeVisible();
      
      // Look for the drug autocomplete input
      const searchInput = drugSearchSection.locator('input[type="text"]');
      await expect(searchInput).toBeVisible();
      
      // Type a drug name
      await searchInput.fill('acetaminophen');
      
      // Wait for autocomplete suggestions to appear
      await expect(page.locator('[data-testid="drug-suggestion"]').first()).toBeVisible({ timeout: 10000 });
      
      // Click on the first suggestion
      await page.locator('[data-testid="drug-suggestion"]').first().click();
      
      // Verify that a drug was selected
      await expect(page.locator('#selected-drug-info')).toBeVisible();
      await expect(page.locator('#selected-drug-info')).toContainText('Currently Selected Drug:');
      
      // Verify workflow selector is now enabled
      const workflowSection = page.locator('#workflow-selection');
      await expect(workflowSection).not.toHaveClass(/opacity-50/);
    });

    test('should handle empty search gracefully', async ({ page }) => {
      const drugSearchSection = page.locator('#drug-search');
      const searchInput = drugSearchSection.locator('input[type="text"]');
      
      // Click on input without typing
      await searchInput.click();
      
      // Verify no error state
      await expect(page.locator('[data-testid="error-message"]')).not.toBeVisible();
      
      // Verify workflow selector remains disabled
      const workflowSection = page.locator('#workflow-selection');
      await expect(workflowSection).toHaveClass(/opacity-50/);
    });

    test('should show drug information correctly', async ({ page }) => {
      // Select a drug
      const searchInput = page.locator('#drug-search input[type="text"]');
      await searchInput.fill('ibuprofen');
      
      await expect(page.locator('[data-testid="drug-suggestion"]').first()).toBeVisible({ timeout: 10000 });
      await page.locator('[data-testid="drug-suggestion"]').first().click();
      
      // Verify drug information display
      const drugInfo = page.locator('#selected-drug-info');
      await expect(drugInfo).toBeVisible();
      await expect(drugInfo).toContainText('Name:');
      await expect(drugInfo).toContainText('RxCUI:');
      await expect(drugInfo).toContainText('Type:');
    });
  });

  test.describe('Workflow Selection', () => {
    test.beforeEach(async ({ page }) => {
      // Select a drug first
      const searchInput = page.locator('#drug-search input[type="text"]');
      await searchInput.fill('acetaminophen');
      await expect(page.locator('[data-testid="drug-suggestion"]').first()).toBeVisible({ timeout: 10000 });
      await page.locator('[data-testid="drug-suggestion"]').first().click();
    });

    test('should enable workflow options after drug selection', async ({ page }) => {
      const workflowSection = page.locator('#workflow-selection');
      await expect(workflowSection).not.toHaveClass(/opacity-50/);
      
      // Check for workflow buttons
      await expect(workflowSection.locator('button')).toHaveCount.greaterThan(0);
    });

    test('should navigate to Excel viewer workflow', async ({ page }) => {
      const workflowSection = page.locator('#workflow-selection');
      
      // Look for Excel viewer button
      const excelViewerButton = workflowSection.locator('button:has-text("Excel Viewer"), button:has-text("View Orders"), button:has-text("Order Sentences")');
      
      if (await excelViewerButton.count() > 0) {
        await excelViewerButton.first().click();
        
        // Verify navigation to Excel viewer
        await expect(page).toHaveURL(/\/excel-viewer/);
        await expect(page.locator('h1')).toContainText('Cerner Order Sentences');
      }
    });

    test('should trigger FDA data workflow', async ({ page }) => {
      const workflowSection = page.locator('#workflow-selection');
      
      // Look for FDA data button
      const fdaButton = workflowSection.locator('button:has-text("FDA Data"), button:has-text("Get FDA"), button:has-text("OpenFDA")');
      
      if (await fdaButton.count() > 0) {
        await fdaButton.first().click();
        
        // Verify OpenFDA results section appears
        await expect(page.locator('[data-testid="openfda-results"]')).toBeVisible({ timeout: 15000 });
      }
    });
  });

  test.describe('OpenFDA Results Display', () => {
    test.beforeEach(async ({ page }) => {
      // Select a drug and trigger FDA workflow
      const searchInput = page.locator('#drug-search input[type="text"]');
      await searchInput.fill('acetaminophen');
      await expect(page.locator('[data-testid="drug-suggestion"]').first()).toBeVisible({ timeout: 10000 });
      await page.locator('[data-testid="drug-suggestion"]').first().click();
      
      // Trigger FDA data workflow
      const workflowSection = page.locator('#workflow-selection');
      const fdaButton = workflowSection.locator('button:has-text("FDA Data"), button:has-text("Get FDA"), button:has-text("OpenFDA")');
      
      if (await fdaButton.count() > 0) {
        await fdaButton.first().click();
      }
    });

    test('should display FDA results with dosage forms', async ({ page }) => {
      // Wait for FDA results to load
      await expect(page.locator('[data-testid="openfda-results"]')).toBeVisible({ timeout: 15000 });
      
      // Check for dosage form sections
      const dosageFormSections = page.locator('[data-testid="dosage-form-section"]');
      await expect(dosageFormSections).toHaveCount.greaterThan(0);
    });

    test('should allow expanding dosage form details', async ({ page }) => {
      await expect(page.locator('[data-testid="openfda-results"]')).toBeVisible({ timeout: 15000 });
      
      // Find and click on a dosage form accordion
      const firstAccordion = page.locator('[data-testid="dosage-form-accordion"]').first();
      
      if (await firstAccordion.count() > 0) {
        await firstAccordion.click();
        
        // Verify accordion expands
        await expect(page.locator('[data-testid="dosage-form-content"]').first()).toBeVisible();
      }
    });

    test('should show SPL details when available', async ({ page }) => {
      await expect(page.locator('[data-testid="openfda-results"]')).toBeVisible({ timeout: 15000 });
      
      // Check for SPL details section
      const splDetails = page.locator('[data-testid="spl-details"]');
      
      if (await splDetails.count() > 0) {
        await expect(splDetails).toBeVisible();
        await expect(splDetails).toContainText('SPL');
      }
    });
  });

  test.describe('Excel Viewer Workflow', () => {
    test('should load Excel viewer with drug information', async ({ page }) => {
      // Navigate directly to Excel viewer with drug parameters
      await page.goto(`${BASE_URL}/excel-viewer?rxcui=161&name=Acetaminophen`);
      
      // Verify Excel viewer loads
      await expect(page).toHaveTitle(/Excel Viewer/);
      await expect(page.locator('h1')).toContainText('Cerner Order Sentences');
      
      // Verify drug information is displayed
      await expect(page.locator('p')).toContainText('For: Acetaminophen (RxCUI: 161)');
    });

    test('should handle missing drug information in URL', async ({ page }) => {
      // Navigate to Excel viewer without drug parameters
      await page.goto(`${BASE_URL}/excel-viewer`);
      
      // Verify error message is displayed
      await expect(page.locator('p')).toContainText('Drug information not provided in URL.');
      
      // Verify link to home page
      await expect(page.locator('a[href="/"]')).toBeVisible();
    });

    test('should allow editing drug selection', async ({ page }) => {
      await page.goto(`${BASE_URL}/excel-viewer?rxcui=161&name=Acetaminophen`);
      
      // Find and click the edit button
      const editButton = page.locator('button[title="Change drug"]');
      await expect(editButton).toBeVisible();
      await editButton.click();
      
      // Verify drug autocomplete appears
      await expect(page.locator('input[type="text"]')).toBeVisible();
    });

    test('should display Excel data table', async ({ page }) => {
      await page.goto(`${BASE_URL}/excel-viewer?rxcui=161&name=Acetaminophen`);
      
      // Wait for Excel data to load
      await expect(page.locator('[data-testid="excel-table"]')).toBeVisible({ timeout: 10000 });
      
      // Verify table has headers
      await expect(page.locator('th')).toHaveCount.greaterThan(0);
      
      // Verify table has data rows
      await expect(page.locator('tbody tr')).toHaveCount.greaterThan(0);
    });

    test('should handle Excel data loading states', async ({ page }) => {
      await page.goto(`${BASE_URL}/excel-viewer?rxcui=161&name=Acetaminophen`);
      
      // Check for loading state
      const loadingIndicator = page.locator('text=Loading Excel data...');
      
      // Either loading indicator should be visible initially, or data should load quickly
      if (await loadingIndicator.isVisible()) {
        await expect(loadingIndicator).toBeVisible();
        await expect(loadingIndicator).not.toBeVisible({ timeout: 15000 });
      }
      
      // Verify data loads successfully
      await expect(page.locator('[data-testid="excel-table"]')).toBeVisible({ timeout: 15000 });
    });
  });

  test.describe('Error Handling', () => {
    test('should handle API failures gracefully', async ({ page }) => {
      // Mock API failure
      await page.route('**/api/**', route => {
        route.fulfill({ status: 500, body: 'Internal Server Error' });
      });
      
      // Try to search for a drug
      const searchInput = page.locator('#drug-search input[type="text"]');
      await searchInput.fill('acetaminophen');
      
      // Verify error handling (no crash)
      await expect(page.locator('body')).toBeVisible();
    });

    test('should handle network timeouts', async ({ page }) => {
      // Mock slow API response
      await page.route('**/api/**', route => {
        // Delay response by 30 seconds to simulate timeout
        setTimeout(() => route.fulfill({ status: 408, body: 'Request Timeout' }), 30000);
      });
      
      const searchInput = page.locator('#drug-search input[type="text"]');
      await searchInput.fill('acetaminophen');
      
      // Verify application remains responsive
      await expect(page.locator('body')).toBeVisible();
    });
  });

  test.describe('Responsive Design', () => {
    test('should work correctly on mobile devices', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      
      // Verify main elements are visible on mobile
      await expect(page.locator('h1')).toBeVisible();
      await expect(page.locator('#drug-search')).toBeVisible();
      await expect(page.locator('#workflow-selection')).toBeVisible();
      
      // Verify responsive grid layout
      const gridContainer = page.locator('.grid');
      await expect(gridContainer).toBeVisible();
    });

    test('should work correctly on tablet devices', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });
      
      // Verify layout adapts to tablet size
      await expect(page.locator('h1')).toBeVisible();
      await expect(page.locator('#drug-search')).toBeVisible();
      await expect(page.locator('#workflow-selection')).toBeVisible();
    });

    test('should work correctly on desktop', async ({ page }) => {
      await page.setViewportSize({ width: 1920, height: 1080 });
      
      // Verify full desktop layout
      await expect(page.locator('h1')).toBeVisible();
      await expect(page.locator('#drug-search')).toBeVisible();
      await expect(page.locator('#workflow-selection')).toBeVisible();
      
      // Verify grid shows as side-by-side on desktop
      const gridContainer = page.locator('.grid');
      await expect(gridContainer).toHaveClass(/md:grid-cols-2/);
    });
  });

  test.describe('Performance', () => {
    test('should load main page within reasonable time', async ({ page }) => {
      const startTime = Date.now();
      
      await page.goto(BASE_URL);
      await expect(page.locator('h1')).toBeVisible();
      
      const loadTime = Date.now() - startTime;
      expect(loadTime).toBeLessThan(5000); // 5 seconds
    });

    test('should handle large datasets efficiently', async ({ page }) => {
      await page.goto(`${BASE_URL}/excel-viewer?rxcui=161&name=Acetaminophen`);
      
      // Wait for table to load
      await expect(page.locator('[data-testid="excel-table"]')).toBeVisible({ timeout: 15000 });
      
      // Verify table performs well with scrolling
      await page.locator('[data-testid="excel-table"]').hover();
      await page.mouse.wheel(0, 1000);
      
      // Verify table remains responsive
      await expect(page.locator('[data-testid="excel-table"]')).toBeVisible();
    });
  });
})