import { test, expect } from '@playwright/test'

test.describe('Example E2E Tests', () => {
  test('should load homepage', async ({ page }) => {
    await page.goto('/')
    
    // Wait for the page to load
    await page.waitForLoadState('networkidle')
    
    // Check if the page has loaded correctly
    await expect(page).toHaveTitle(/Order Sentence Next|ai-starter/)
  })

  test('should navigate to excel viewer', async ({ page }) => {
    await page.goto('/')
    
    // Navigate to excel viewer (adjust selector based on actual navigation)
    // This is a placeholder - update based on actual navigation structure
    const excelViewerLink = page.locator('[href="/excel-viewer"]')
    if (await excelViewerLink.isVisible()) {
      await excelViewerLink.click()
      await expect(page).toHaveURL(/excel-viewer/)
    }
  })

  test('should handle basic drug search', async ({ page }) => {
    await page.goto('/')
    
    // Look for drug search input (adjust selector based on actual component)
    const searchInput = page.locator('input[type="search"]').first()
    if (await searchInput.isVisible()) {
      await searchInput.fill('lisinopril')
      await searchInput.press('Enter')
      
      // Wait for search results (adjust based on actual implementation)
      await page.waitForTimeout(1000)
    }
  })
})

test.describe('Error Handling', () => {
  test('should handle 404 pages', async ({ page }) => {
    await page.goto('/non-existent-page')
    
    // Check if error page is displayed or redirect to home
    const response = await page.waitForResponse('**/non-existent-page')
    expect(response.status()).toBe(404)
  })

  test('should handle network errors gracefully', async ({ page }) => {
    // Mock network failure
    await page.route('**/api/**', route => {
      route.abort('failed')
    })
    
    await page.goto('/')
    
    // App should still load even if API calls fail
    await page.waitForLoadState('networkidle')
    await expect(page).toHaveTitle(/Order Sentence Next|ai-starter/)
  })
})