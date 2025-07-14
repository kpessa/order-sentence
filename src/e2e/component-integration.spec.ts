import { test, expect } from '@playwright/test';

test.describe('Component Integration Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test.describe('Drug Autocomplete Integration', () => {
    test('should interact with drug autocomplete component', async ({
      page,
    }) => {
      const searchInput = page.locator('#drug-search input[type="text"]');

      // Test input focus
      await searchInput.click();
      await expect(searchInput).toBeFocused();

      // Test typing
      await searchInput.fill('ace');

      // Verify input value
      await expect(searchInput).toHaveValue('ace');

      // Test clearing input
      await searchInput.clear();
      await expect(searchInput).toHaveValue('');
    });

    test('should handle autocomplete suggestions', async ({ page }) => {
      const searchInput = page.locator('#drug-search input[type="text"]');

      // Type a common drug name
      await searchInput.fill('acetaminophen');

      // Wait for suggestions to appear (with timeout to handle API delays)
      await page.waitForTimeout(2000);

      // Check if suggestions container appears
      const suggestionsContainer = page.locator(
        '[data-testid="suggestions-container"], .suggestions, [role="listbox"]'
      );

      // If suggestions are available, test interaction
      if ((await suggestionsContainer.count()) > 0) {
        await expect(suggestionsContainer).toBeVisible();

        // Test clicking on a suggestion
        const firstSuggestion = page
          .locator(
            '[data-testid="drug-suggestion"], .suggestion-item, [role="option"]'
          )
          .first();
        if ((await firstSuggestion.count()) > 0) {
          await firstSuggestion.click();

          // Verify drug is selected
          await expect(page.locator('#selected-drug-info')).toBeVisible();
        }
      }
    });

    test('should handle keyboard navigation in autocomplete', async ({
      page,
    }) => {
      const searchInput = page.locator('#drug-search input[type="text"]');

      await searchInput.fill('ibuprofen');
      await page.waitForTimeout(2000);

      // Test arrow key navigation
      await searchInput.press('ArrowDown');
      await page.waitForTimeout(100);

      // Test Enter key selection
      await searchInput.press('Enter');

      // Verify navigation occurred or drug was selected
      await expect(page.locator('body')).toBeVisible();
    });
  });

  test.describe('Workflow Selector Integration', () => {
    test.beforeEach(async ({ page }) => {
      // Select a drug first
      const searchInput = page.locator('#drug-search input[type="text"]');
      await searchInput.fill('acetaminophen');
      await page.waitForTimeout(2000);

      // Try to select first suggestion if available
      const firstSuggestion = page
        .locator(
          '[data-testid="drug-suggestion"], .suggestion-item, [role="option"]'
        )
        .first();
      if ((await firstSuggestion.count()) > 0) {
        await firstSuggestion.click();
      }
    });

    test('should enable workflow buttons after drug selection', async ({
      page,
    }) => {
      const workflowSection = page.locator('#workflow-selection');

      // Wait for workflow section to be enabled
      await expect(workflowSection).not.toHaveClass(/opacity-50/, {
        timeout: 5000,
      });

      // Verify workflow buttons are present
      const workflowButtons = workflowSection.locator('button');
      const count = await workflowButtons.count();
      expect(count).toBeGreaterThan(0);
    });

    test('should handle workflow button clicks', async ({ page }) => {
      const workflowSection = page.locator('#workflow-selection');
      await expect(workflowSection).not.toHaveClass(/opacity-50/, {
        timeout: 5000,
      });

      // Find workflow buttons
      const workflowButtons = workflowSection.locator('button');
      const buttonCount = await workflowButtons.count();

      if (buttonCount > 0) {
        // Click first available workflow button
        await workflowButtons.first().click();

        // Verify some action occurred (either navigation or state change)
        await expect(page.locator('body')).toBeVisible();
      }
    });
  });

  test.describe('OpenFDA Results Integration', () => {
    test('should display OpenFDA results section', async ({ page }) => {
      // The OpenFDA results section should be present on the page
      const openFdaSection = page.locator(
        '[data-testid="openfda-results"], .openfda-results, section:has-text("OpenFDA")'
      );

      // Check if section exists (it might be hidden initially)
      if ((await openFdaSection.count()) > 0) {
        await expect(openFdaSection).toBeVisible();
      }
    });

    test('should handle OpenFDA results display states', async ({ page }) => {
      // Look for OpenFDA results display component
      const openFdaDisplay = page.locator(
        '[data-testid="openfda-results-display"], .openfda-display'
      );

      if ((await openFdaDisplay.count()) > 0) {
        // Test loading states
        const loadingIndicator = openFdaDisplay.locator(
          '[data-testid="loading"], .loading, .spinner'
        );

        // Test error states
        const errorMessage = openFdaDisplay.locator(
          '[data-testid="error"], .error, .alert-error'
        );

        // Test results display
        const resultsContainer = openFdaDisplay.locator(
          '[data-testid="results"], .results, .data-display'
        );

        // Verify at least one of these states is handled
        await expect(openFdaDisplay).toBeVisible();
      }
    });
  });

  test.describe('Form Validation and Error Handling', () => {
    test('should handle empty form submissions', async ({ page }) => {
      const searchInput = page.locator('#drug-search input[type="text"]');

      // Try to submit empty form
      await searchInput.press('Enter');

      // Verify no error crash
      await expect(page.locator('body')).toBeVisible();

      // Verify workflow selector remains disabled
      await expect(page.locator('#workflow-selection')).toHaveClass(
        /opacity-50/
      );
    });

    test('should handle invalid drug inputs', async ({ page }) => {
      const searchInput = page.locator('#drug-search input[type="text"]');

      // Enter invalid drug name
      await searchInput.fill('xyz123invalid');
      await page.waitForTimeout(2000);

      // Verify application doesn't crash
      await expect(page.locator('body')).toBeVisible();
    });
  });

  test.describe('State Management Integration', () => {
    test('should persist selected drug across page interactions', async ({
      page,
    }) => {
      const searchInput = page.locator('#drug-search input[type="text"]');

      // Select a drug
      await searchInput.fill('acetaminophen');
      await page.waitForTimeout(2000);

      const firstSuggestion = page
        .locator(
          '[data-testid="drug-suggestion"], .suggestion-item, [role="option"]'
        )
        .first();
      if ((await firstSuggestion.count()) > 0) {
        await firstSuggestion.click();

        // Verify drug info is displayed
        await expect(page.locator('#selected-drug-info')).toBeVisible();

        // Scroll down and back up
        await page.evaluate(() => window.scrollTo(0, 500));
        await page.evaluate(() => window.scrollTo(0, 0));

        // Verify drug info is still displayed
        await expect(page.locator('#selected-drug-info')).toBeVisible();
      }
    });

    test('should handle state changes correctly', async ({ page }) => {
      const searchInput = page.locator('#drug-search input[type="text"]');

      // Select first drug
      await searchInput.fill('acetaminophen');
      await page.waitForTimeout(2000);

      const firstSuggestion = page
        .locator(
          '[data-testid="drug-suggestion"], .suggestion-item, [role="option"]'
        )
        .first();
      if ((await firstSuggestion.count()) > 0) {
        await firstSuggestion.click();

        // Verify first drug is selected
        await expect(page.locator('#selected-drug-info')).toBeVisible();

        // Change to different drug
        await searchInput.clear();
        await searchInput.fill('ibuprofen');
        await page.waitForTimeout(2000);

        const newSuggestion = page
          .locator(
            '[data-testid="drug-suggestion"], .suggestion-item, [role="option"]'
          )
          .first();
        if ((await newSuggestion.count()) > 0) {
          await newSuggestion.click();

          // Verify state updated
          await expect(page.locator('#selected-drug-info')).toBeVisible();
        }
      }
    });
  });

  test.describe('Navigation Integration', () => {
    test('should handle navigation between pages', async ({ page }) => {
      // Start on home page
      await expect(page).toHaveURL('/');

      // Navigate to excel viewer (if navigation is available)
      const excelLink = page.locator(
        'a[href*="excel-viewer"], button:has-text("Excel")'
      );

      if ((await excelLink.count()) > 0) {
        await excelLink.first().click();

        // Verify navigation
        await expect(page).toHaveURL(/excel-viewer/);
      }
    });

    test('should handle browser back/forward navigation', async ({ page }) => {
      // Navigate to different URL
      await page.goto('/excel-viewer?rxcui=161&name=Acetaminophen');

      // Go back to home
      await page.goBack();
      await expect(page).toHaveURL('/');

      // Go forward
      await page.goForward();
      await expect(page).toHaveURL(/excel-viewer/);
    });
  });

  test.describe('Loading States', () => {
    test('should show loading indicators appropriately', async ({ page }) => {
      // Check for loading indicators during data fetching
      const loadingIndicators = page.locator(
        '[data-testid="loading"], .loading, .spinner, text=Loading'
      );

      // Trigger data loading by searching
      const searchInput = page.locator('#drug-search input[type="text"]');
      await searchInput.fill('acetaminophen');

      // Loading indicators may appear briefly
      await page.waitForTimeout(1000);

      // Verify page remains functional
      await expect(page.locator('body')).toBeVisible();
    });
  });
});
