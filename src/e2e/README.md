# End-to-End Testing Documentation

## Overview

This directory contains comprehensive end-to-end (E2E) tests for the Order Sentence Next.js application using Playwright. The tests cover main user workflows, component integration, performance, and accessibility.

## Test Structure

### 1. Basic Smoke Tests (`basic-smoke.spec.ts`)

- **Purpose**: Verify core application functionality works
- **Tests**:
  - Home page loading
  - Excel viewer page loading
  - Error handling for missing parameters
  - Responsive design on mobile

### 2. Main Workflows (`main-workflows.spec.ts`)

- **Purpose**: Test complete user workflows from start to finish
- **Tests**:
  - Drug search workflow
  - Workflow selection
  - OpenFDA results display
  - Excel viewer workflow
  - Error handling
  - Responsive design across devices
  - Performance benchmarks

### 3. Component Integration (`component-integration.spec.ts`)

- **Purpose**: Test component interactions and state management
- **Tests**:
  - Drug autocomplete integration
  - Workflow selector integration
  - OpenFDA results integration
  - Form validation and error handling
  - State management across components
  - Navigation integration
  - Loading states

### 4. Performance & Accessibility (`performance-accessibility.spec.ts`)

- **Purpose**: Ensure application meets performance and accessibility standards
- **Tests**:
  - Page load performance
  - Large data handling
  - Concurrent request handling
  - Accessibility compliance
  - Error boundary testing
  - Memory leak detection

## Test Scenarios Covered

### User Workflows

1. **Drug Search Flow**:

   - User enters drug name
   - Autocomplete suggestions appear
   - User selects drug
   - Drug information displays
   - Workflow options become available

2. **Excel Viewer Flow**:

   - User navigates to Excel viewer
   - Drug information loads from URL params
   - Excel data table displays
   - User can edit drug selection
   - Filters and sorting work correctly

3. **OpenFDA Data Flow**:
   - User selects drug
   - User triggers FDA data workflow
   - NDC data loads
   - OpenFDA results display
   - SPL details are prioritized
   - Dosage forms are organized

### Technical Tests

1. **Performance**:

   - Page load times under 3-5 seconds
   - Smooth scrolling with large datasets
   - Efficient API request handling
   - Memory usage optimization

2. **Accessibility**:

   - Proper heading hierarchy
   - Keyboard navigation support
   - Screen reader compatibility
   - High contrast mode support
   - Form labeling compliance

3. **Error Handling**:
   - Network failures
   - API timeouts
   - Invalid user inputs
   - JavaScript errors
   - Missing data graceful handling

## Running Tests

### Prerequisites

```bash
# Install Playwright browsers
pnpm exec playwright install

# Start development server (automatically handled by Playwright)
pnpm run dev
```

### Running All E2E Tests

```bash
# Run all E2E tests
pnpm run test:e2e

# Run with UI mode for debugging
pnpm run test:e2e:ui

# Run with debug mode
pnpm run test:e2e:debug
```

### Running Specific Test Files

```bash
# Run only smoke tests
pnpm exec playwright test src/e2e/basic-smoke.spec.ts

# Run only main workflows
pnpm exec playwright test src/e2e/main-workflows.spec.ts

# Run only component integration tests
pnpm exec playwright test src/e2e/component-integration.spec.ts

# Run only performance and accessibility tests
pnpm exec playwright test src/e2e/performance-accessibility.spec.ts
```

### Running Tests on Specific Browsers

```bash
# Run on Chrome only
pnpm exec playwright test --project=chromium

# Run on Firefox only
pnpm exec playwright test --project=firefox

# Run on mobile Chrome
pnpm exec playwright test --project="Mobile Chrome"
```

## Test Data and Mocking

### Test Data

- Uses real drug names like "acetaminophen", "ibuprofen" for realistic testing
- Tests with various RxCUI values
- Includes edge cases like empty inputs, invalid data

### API Mocking

Tests can mock external API calls for:

- RxNorm API responses
- OpenFDA API responses
- DailyMed API responses
- Network failures and timeouts

### Example Mock Usage

```typescript
// Mock API failure
await page.route('**/api/**', (route) => {
  route.fulfill({ status: 500, body: 'Internal Server Error' });
});

// Mock slow response
await page.route('**/api/**', (route) => {
  setTimeout(() => route.fulfill({ status: 200, body: '{}' }), 5000);
});
```

## Test Selectors and Data Attributes

### Recommended Test Selectors

Tests use a combination of:

- `data-testid` attributes (preferred)
- Semantic selectors (headings, buttons, inputs)
- CSS classes as fallbacks
- Text content matching

### Key Test IDs Used

- `data-testid="drug-suggestion"` - Drug autocomplete suggestions
- `data-testid="openfda-results"` - OpenFDA results container
- `data-testid="excel-table"` - Excel data table
- `data-testid="loading"` - Loading indicators
- `data-testid="error"` - Error messages

## Configuration

### Playwright Configuration (`playwright.config.ts`)

- Tests run against `http://localhost:3000`
- Automatic dev server startup
- Cross-browser testing (Chrome, Firefox, Safari, Mobile)
- Screenshot and video capture on failures
- Trace collection for debugging

### Browser Support

- Desktop Chrome, Firefox, Safari
- Mobile Chrome and Safari
- Microsoft Edge (optional)

### Performance Budgets

- Initial page load: < 3 seconds
- Excel data loading: < 5 seconds
- API responses: < 10 seconds
- Scrolling performance: < 1 second

## Debugging Tests

### Visual Debugging

```bash
# Run with headed browser
pnpm exec playwright test --headed

# Run with UI mode
pnpm run test:e2e:ui

# Run with debug mode
pnpm run test:e2e:debug
```

### Debugging Tips

1. **Screenshots**: Automatically captured on failure
2. **Videos**: Recorded for failed tests
3. **Traces**: Available for debugging complex interactions
4. **Console logs**: Use `console.log` in tests for debugging
5. **Browser DevTools**: Available in headed mode

### Common Issues

1. **Element not found**: Check selectors and timing
2. **Timeouts**: Increase timeout for slow operations
3. **Flaky tests**: Add proper waits and assertions
4. **API dependencies**: Mock external services

## Continuous Integration

### GitHub Actions Integration

Tests are configured to run in CI/CD pipeline:

- Run on pull requests
- Run on main branch pushes
- Generate test reports
- Archive screenshots/videos on failure

### CI Configuration

```yaml
- name: Run E2E tests
  run: pnpm run test:e2e

- name: Upload test results
  uses: actions/upload-artifact@v3
  if: always()
  with:
    name: playwright-report
    path: playwright-report/
```

## Best Practices

### Test Writing

1. **Use Page Object Model**: Organize selectors and actions
2. **Proper Waits**: Use `expect().toBeVisible()` instead of `waitForTimeout`
3. **Stable Selectors**: Prefer `data-testid` over CSS classes
4. **Descriptive Names**: Test names should explain what they verify
5. **Independent Tests**: Each test should be able to run in isolation

### Maintenance

1. **Regular Updates**: Keep tests updated with UI changes
2. **Performance Monitoring**: Track test execution times
3. **Flaky Test Resolution**: Fix unstable tests immediately
4. **Documentation**: Update test documentation with changes

## Reporting

### Test Reports

- HTML reports generated automatically
- Screenshots and videos for failed tests
- Performance metrics tracking
- Accessibility compliance reports

### Viewing Reports

```bash
# Open HTML report
pnpm exec playwright show-report
```

## Future Enhancements

### Planned Improvements

1. **Visual Regression Testing**: Screenshot comparison
2. **API Contract Testing**: Verify API responses
3. **Database Testing**: Test data persistence
4. **Load Testing**: Concurrent user simulation
5. **Security Testing**: XSS and injection protection

### Test Coverage Goals

- 100% of critical user workflows
- 95% of UI components
- 90% of error scenarios
- Performance benchmarks for all pages
