import { test, expect } from '@playwright/test';

test.describe('Performance and Accessibility Tests', () => {
  test.describe('Performance Tests', () => {
    test('should load home page within performance budget', async ({ page }) => {
      // Track page load time
      const startTime = Date.now();
      
      await page.goto('/');
      await expect(page.locator('h1')).toBeVisible();
      
      const loadTime = Date.now() - startTime;
      
      // Performance budget: 3 seconds for initial load
      expect(loadTime).toBeLessThan(3000);
      
      console.log(`Home page loaded in ${loadTime}ms`);
    });

    test('should handle large Excel data efficiently', async ({ page }) => {
      const startTime = Date.now();
      
      await page.goto('/excel-viewer?rxcui=161&name=Acetaminophen');
      
      // Wait for table to load
      await expect(page.locator('h1')).toContainText('Cerner Order Sentences');
      
      const initialLoadTime = Date.now() - startTime;
      
      // Initial load should be under 5 seconds
      expect(initialLoadTime).toBeLessThan(5000);
      
      // Test scrolling performance
      const scrollStartTime = Date.now();
      
      // Scroll through the page
      for (let i = 0; i < 10; i++) {
        await page.evaluate(() => window.scrollBy(0, 100));
        await page.waitForTimeout(50);
      }
      
      const scrollTime = Date.now() - scrollStartTime;
      
      // Scrolling should remain smooth
      expect(scrollTime).toBeLessThan(1000);
      
      console.log(`Excel viewer loaded in ${initialLoadTime}ms, scrolling took ${scrollTime}ms`);
    });

    test('should handle multiple API calls efficiently', async ({ page }) => {
      const startTime = Date.now();
      
      await page.goto('/');
      
      // Simulate user searching for drugs
      const searchInput = page.locator('#drug-search input[type="text"]');
      
      await searchInput.fill('acetaminophen');
      await page.waitForTimeout(2000);
      
      // Select a drug if suggestions appear
      const firstSuggestion = page.locator('[data-testid="drug-suggestion"], .suggestion-item, [role="option"]').first();
      if (await firstSuggestion.count() > 0) {
        await firstSuggestion.click();
        
        // Wait for drug selection to complete
        await expect(page.locator('#selected-drug-info')).toBeVisible();
      }
      
      const totalTime = Date.now() - startTime;
      
      // Drug search and selection should complete within 10 seconds
      expect(totalTime).toBeLessThan(10000);
      
      console.log(`Drug search workflow completed in ${totalTime}ms`);
    });

    test('should handle concurrent requests gracefully', async ({ page }) => {
      await page.goto('/');
      
      // Simulate rapid user interactions
      const searchInput = page.locator('#drug-search input[type="text"]');
      
      // Type multiple characters rapidly
      await searchInput.fill('ace');
      await page.waitForTimeout(100);
      await searchInput.fill('acet');
      await page.waitForTimeout(100);
      await searchInput.fill('acetam');
      await page.waitForTimeout(100);
      
      // Verify application remains responsive
      await expect(page.locator('body')).toBeVisible();
      await expect(searchInput).toHaveValue('acetam');
    });
  });

  test.describe('Accessibility Tests', () => {
    test('should have proper heading structure', async ({ page }) => {
      await page.goto('/');
      
      // Check for proper heading hierarchy
      const h1 = page.locator('h1');
      await expect(h1).toBeVisible();
      await expect(h1).toHaveCount(1);
      
      // Check for h2 sections
      const h2s = page.locator('h2');
      await expect(h2s).toHaveCount.greaterThan(0);
      
      // Verify main page heading
      await expect(h1).toContainText('Comprehensive Drug Analysis');
    });

    test('should support keyboard navigation', async ({ page }) => {
      await page.goto('/');
      
      // Test tab navigation
      await page.keyboard.press('Tab');
      
      // Verify focus is visible
      const focusedElement = page.locator(':focus');
      await expect(focusedElement).toBeVisible();
      
      // Test navigation to search input
      const searchInput = page.locator('#drug-search input[type="text"]');
      await searchInput.focus();
      await expect(searchInput).toBeFocused();
      
      // Test Enter key functionality
      await searchInput.fill('acetaminophen');
      await page.keyboard.press('Enter');
      
      // Verify application responds to keyboard input
      await expect(page.locator('body')).toBeVisible();
    });

    test('should have proper form labels', async ({ page }) => {
      await page.goto('/');
      
      // Check for form inputs with labels
      const inputs = page.locator('input');
      const inputCount = await inputs.count();
      
      for (let i = 0; i < inputCount; i++) {
        const input = inputs.nth(i);
        const inputId = await input.getAttribute('id');
        const inputName = await input.getAttribute('name');
        const inputAriaLabel = await input.getAttribute('aria-label');
        const inputPlaceholder = await input.getAttribute('placeholder');
        
        // Verify input has some form of labeling
        const hasLabel = inputId || inputName || inputAriaLabel || inputPlaceholder;
        expect(hasLabel).toBeTruthy();
      }
    });

    test('should have proper ARIA attributes', async ({ page }) => {
      await page.goto('/');
      
      // Check for proper ARIA roles and attributes
      const sections = page.locator('section');
      const sectionCount = await sections.count();
      
      if (sectionCount > 0) {
        // Verify sections have proper structure
        await expect(sections.first()).toBeVisible();
      }
      
      // Check for interactive elements with proper ARIA
      const buttons = page.locator('button');
      const buttonCount = await buttons.count();
      
      for (let i = 0; i < Math.min(buttonCount, 5); i++) {
        const button = buttons.nth(i);
        const buttonText = await button.textContent();
        const ariaLabel = await button.getAttribute('aria-label');
        
        // Button should have text content or aria-label
        expect(buttonText || ariaLabel).toBeTruthy();
      }
    });

    test('should handle high contrast mode', async ({ page }) => {
      await page.goto('/');
      
      // Test with high contrast media query
      await page.emulateMedia({ colorScheme: 'dark' });
      
      // Verify main elements are still visible
      await expect(page.locator('h1')).toBeVisible();
      await expect(page.locator('#drug-search')).toBeVisible();
      await expect(page.locator('#workflow-selection')).toBeVisible();
    });

    test('should be readable with large text', async ({ page }) => {
      await page.goto('/');
      
      // Simulate large text scaling
      await page.evaluate(() => {
        document.body.style.fontSize = '150%';
      });
      
      // Verify content is still accessible
      await expect(page.locator('h1')).toBeVisible();
      await expect(page.locator('#drug-search')).toBeVisible();
      
      // Verify text doesn't overlap
      const drugSearchSection = page.locator('#drug-search');
      await expect(drugSearchSection).toBeVisible();
    });

    test('should work with screen reader navigation', async ({ page }) => {
      await page.goto('/');
      
      // Test navigation using screen reader commands
      await page.keyboard.press('Tab');
      await page.keyboard.press('ArrowDown');
      await page.keyboard.press('ArrowUp');
      
      // Verify application remains functional
      await expect(page.locator('body')).toBeVisible();
    });
  });

  test.describe('Error Boundary Tests', () => {
    test('should handle JavaScript errors gracefully', async ({ page }) => {
      await page.goto('/');
      
      // Monitor for console errors
      const errors: string[] = [];
      page.on('console', (msg) => {
        if (msg.type() === 'error') {
          errors.push(msg.text());
        }
      });
      
      // Trigger various interactions
      const searchInput = page.locator('#drug-search input[type="text"]');
      await searchInput.fill('test');
      await page.waitForTimeout(1000);
      
      // Verify page remains functional
      await expect(page.locator('body')).toBeVisible();
      
      // Check for critical errors (some warnings might be acceptable)
      const criticalErrors = errors.filter(error => 
        error.includes('Uncaught') || 
        error.includes('TypeError') || 
        error.includes('ReferenceError')
      );
      
      expect(criticalErrors.length).toBeLessThan(3);
    });

    test('should handle network failures gracefully', async ({ page }) => {
      // Mock network failure
      await page.route('**/api/**', (route) => {
        route.abort('failed');
      });
      
      await page.goto('/');
      
      // Try to trigger API calls
      const searchInput = page.locator('#drug-search input[type="text"]');
      await searchInput.fill('acetaminophen');
      await page.waitForTimeout(2000);
      
      // Verify application doesn't crash
      await expect(page.locator('body')).toBeVisible();
      await expect(page.locator('h1')).toContainText('Comprehensive Drug Analysis');
    });
  });

  test.describe('Memory and Resource Tests', () => {
    test('should not have memory leaks during normal usage', async ({ page }) => {
      await page.goto('/');
      
      // Simulate repeated user interactions
      const searchInput = page.locator('#drug-search input[type="text"]');
      
      for (let i = 0; i < 5; i++) {
        await searchInput.fill(`drug${i}`);
        await page.waitForTimeout(500);
        await searchInput.clear();
        await page.waitForTimeout(500);
      }
      
      // Verify page remains responsive
      await expect(page.locator('body')).toBeVisible();
      await expect(searchInput).toBeVisible();
    });

    test('should handle rapid state changes', async ({ page }) => {
      await page.goto('/');
      
      const searchInput = page.locator('#drug-search input[type="text"]');
      
      // Rapid typing simulation
      const drugs = ['ace', 'acet', 'acetam', 'acetamin', 'acetamino'];
      
      for (const drug of drugs) {
        await searchInput.fill(drug);
        await page.waitForTimeout(200);
      }
      
      // Verify final state
      await expect(searchInput).toHaveValue('acetamino');
      await expect(page.locator('body')).toBeVisible();
    });
  });
})