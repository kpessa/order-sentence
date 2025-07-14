# CLAUDE.md - AI Assistant Context for order-sentence-next

This file contains important context and conventions for AI assistants working on this codebase.

## Project Overview

**Type**: Next.js 14+ pharmaceutical/medical data analysis application  
**Purpose**: Drug information system integrating FDA data, Excel order sentence processing, and drug search functionality  
**Primary Users**: Healthcare professionals analyzing Cerner order sentences and drug information

## Tech Stack

- **Framework**: Next.js 14.2.20 (App Router)
- **Language**: Mixed TypeScript and JavaScript (transitioning to TypeScript)
- **State Management**: Redux Toolkit with Redux Persist (IndexedDB storage)
- **UI**: Tailwind CSS + shadcn/ui components
- **Data Tables**: TanStack Table v8
- **Component Development**: Storybook
- **Package Manager**: pnpm

## Key Commands

```bash
# Development
pnpm dev          # Start development server (port 3000)
pnpm storybook    # Start Storybook for component development

# Build & Production
pnpm build        # Build for production
pnpm start        # Start production server

# Testing
pnpm test         # Run unit tests with Jest
pnpm test:watch   # Run tests in watch mode
pnpm test:coverage # Run tests with coverage report
pnpm test:ci      # Run tests for CI (no watch)
pnpm test:e2e     # Run E2E tests with Playwright
pnpm test:e2e:ui  # Run E2E tests with UI mode
pnpm test:all     # Run all tests (unit + E2E)
pnpm typecheck    # Type checking with TypeScript

# Code Quality
pnpm lint         # Run ESLint
pnpm lint:fix     # Auto-fix linting issues
pnpm format       # Format code with Prettier
pnpm format:check # Check code formatting
```

## Project Structure & Conventions

### Directory Structure (Atomic Design)

```
src/
├── app/                    # Next.js App Router pages
│   ├── api/               # API routes (DailyMed proxy, logging)
│   │   └── __tests__/     # API route tests
│   ├── drug-details/      # Drug detail pages
│   └── excel-viewer/      # Excel order sentence viewer
├── components/
│   ├── atoms/             # Basic UI elements (TypeScript)
│   ├── molecules/         # Compound components (TypeScript)
│   ├── organisms/         # Complex components (TypeScript)
│   ├── templates/         # Page layouts (TypeScript)
│   └── ui/                # shadcn/ui components (JavaScript .jsx)
├── e2e/                   # End-to-end tests (Playwright)
│   ├── basic-smoke.spec.ts
│   ├── main-workflows.spec.ts
│   ├── component-integration.spec.ts
│   └── performance-accessibility.spec.ts
└── lib/
    ├── store/             # Redux store and slices
    │   └── __tests__/     # Redux store tests
    ├── utils/             # Utility functions
    │   └── __tests__/     # Utility function tests
    ├── hooks/             # Custom React hooks
    └── types/             # TypeScript type definitions
```

### File Naming Conventions

- Components: PascalCase (e.g., `DrugAutocomplete.tsx`)
- Stories: `ComponentName.stories.js`
- Utilities: camelCase (e.g., `parseOrderSentence.ts`)
- **Important**: UI components from shadcn are `.jsx` files, not TypeScript

### State Management

Redux store with three main slices:

- `drugSearchSlice`: Drug search, selected drug, RxNorm data
- `excelDataSlice`: Excel file data, parsed order sentences
- `fdaDataSlice`: OpenFDA results, DailyMed SPLs, prioritized data

**Note**: Large Excel data is persisted to IndexedDB. Path `excelData.data` is excluded from serializability checks.

## Architecture Patterns

### Data Flow

1. **Drug Search**: User input → RxNorm API → Filter ingredients → Redux store
2. **Excel Processing**: Upload file → Parse with xlsx → Store in Redux/IndexedDB
3. **FDA Data**: Selected drug → OpenFDA API → DailyMed API → Prioritize by dosage form

### API Integration

- **RxNorm API**: Direct client-side calls for drug search
- **OpenFDA API**: Client-side calls with multiple search strategies
- **DailyMed API**: Proxied through `/api/dailymed/[setid]` to avoid CORS

### Key Features

- Real-time drug autocomplete with ingredient filtering
- Excel order sentence parsing with regex patterns
- Multi-column filtering and sorting in data tables
- SPL (Structured Product Labeling) prioritization
- Persistent state across sessions

## Common Pitfalls & Important Notes

1. **Mixed TypeScript/JavaScript**: Be careful with imports. UI components (`/components/ui/`) are JavaScript, while most app code is TypeScript.

2. **Redux Persist Configuration**: The store uses IndexedDB for persistence. Server-side rendering uses a no-op storage.

3. **API Proxying**: DailyMed API requires proxy due to CORS. Use `/api/dailymed/[setid]` endpoint.

4. **Component Imports**: Always use path aliases:

   - `@/components/*`
   - `@/lib/*`
   - `@/app/*`

5. **Client vs Server Components**: Pay attention to 'use client' directives. Most complex components are client-side.

6. **Testing Infrastructure**: Comprehensive test suite with Jest for unit tests and Playwright for E2E testing.

## External API Dependencies

1. **RxNorm API** (https://rxnav.nlm.nih.gov)

   - Drug name to RxCUI lookup
   - Ingredient type filtering (IN, MIN, PIN)

2. **OpenFDA API** (https://api.fda.gov)

   - Drug label information
   - NDC to SPL mapping

3. **DailyMed API** (https://dailymed.nlm.nih.gov)
   - Detailed SPL data in XML format
   - Requires proxy due to CORS

## Development Tips

1. **Use Storybook** for isolated component development
2. **Redux DevTools** are essential for debugging state changes
3. **Log Interceptor** is set up for debugging (see `lib/utils/logInterceptor.ts`)
4. **Excel Parsing** happens client-side - be mindful of large files
5. **Check for existing utilities** before writing new ones

## Testing Infrastructure

### Unit Testing (Jest + React Testing Library)

- **Coverage**: Redux slices, utility functions, API routes
- **Mock Factories**: External API responses for consistent testing
- **Test Structure**: Comprehensive test suites with descriptive scenarios
- **Configuration**: TypeScript support with jsdom environment

### End-to-End Testing (Playwright)

- **Browser Coverage**: Chrome, Firefox, Safari (desktop + mobile)
- **Test Categories**:
  - Basic smoke tests (page loading, responsive design)
  - Main workflows (drug search, Excel viewer, OpenFDA integration)
  - Component integration (autocomplete, state management)
  - Performance & accessibility (load times, ARIA compliance)
- **Test Data**: Real drug names with comprehensive edge cases
- **Error Handling**: Network failures, invalid inputs, JavaScript errors

### CI/CD Pipeline (GitHub Actions)

- **Triggers**: Pull requests and main branch pushes
- **Steps**: Linting, type checking, unit tests, E2E tests
- **Reporting**: Test coverage and artifact upload
- **Browser Installation**: Automated Playwright setup

### Test Commands Summary

```bash
pnpm test          # Unit tests
pnpm test:coverage # Unit tests with coverage
pnpm test:e2e      # E2E tests
pnpm test:all      # All tests
```

## Environment Configuration

### Environment Variables

The application uses environment variables for configuration and API endpoints:

- **`.env.example`**: Template with all available configuration options and documentation
- **`.env.local`**: Local development configuration (not committed to git)
- **`.env.production`**: Production configuration template

### API Configuration

- **Centralized Configuration**: All API endpoints managed through `src/lib/config/api.ts`
- **Environment-based URLs**: API base URLs configurable via environment variables
- **Timeout Configuration**: Configurable timeouts for each API service
- **Debug Logging**: Optional API call logging for development and debugging
- **Error Handling**: Consistent error handling across all API calls

### Key Environment Variables

- `NEXT_PUBLIC_RXNORM_API_BASE_URL`: RxNorm API base URL
- `NEXT_PUBLIC_OPENFDA_API_BASE_URL`: OpenFDA API base URL
- `NEXT_PUBLIC_DAILYMED_API_BASE_URL`: DailyMed API base URL
- `NEXT_PUBLIC_API_*_TIMEOUT`: Timeout settings for each API
- `NEXT_PUBLIC_ENABLE_API_LOGGING`: Enable/disable API call logging

## Error Handling

### React Error Boundaries

The application implements a comprehensive error boundary system for graceful error handling:

#### Error Boundary Components

1. **`ErrorBoundary`**: Base error boundary component with customizable fallback UI

   - Context-aware error messages
   - Optional error details display in development
   - Retry functionality
   - Error callbacks for reporting

2. **`RootErrorBoundary`**: Application-level error boundary

   - Wraps entire application in layout.tsx
   - Provides comprehensive error recovery options
   - Clears local storage/IndexedDB when needed
   - Error reporting integration ready

3. **`RouteErrorBoundary`**: Route-level error handling

   - Wraps individual pages
   - Route-specific error messages
   - Navigation recovery options

4. **`ApiErrorBoundary`**: API-specific error handling

   - Wraps components making API calls
   - API-specific error messages
   - Retry API calls functionality

5. **`ChunkErrorBoundary`**: Code-splitting error handling
   - Handles lazy loading failures
   - Automatic retry for chunk loading errors
   - Clear cache and reload options

#### Error Boundary Usage

```tsx
// Root level (in layout.tsx)
<RootErrorBoundary>
  <StoreProvider>
    <GlobalEffects />
    {children}
  </StoreProvider>
</RootErrorBoundary>

// Route level (in pages)
<RouteErrorBoundary routeName="Excel Viewer">
  <ApiErrorBoundary apiName="Excel Data">
    <ExcelViewerContent />
  </ApiErrorBoundary>
</RouteErrorBoundary>
```

#### Error Recovery Features

- Try Again button to reset error state
- Reload Page to refresh the application
- Clear Data & Reload for persistent errors
- Report Bug for user feedback
- Automatic error logging to console with context

### Key Environment Variables

```bash
# API Base URLs
NEXT_PUBLIC_RXNORM_API_BASE_URL=https://rxnav.nlm.nih.gov/REST
NEXT_PUBLIC_OPENFDA_API_BASE_URL=https://api.fda.gov/drug
NEXT_PUBLIC_DAILYMED_API_BASE_URL=https://dailymed.nlm.nih.gov/dailymed/services/v2

# API Timeouts
API_TIMEOUT_RXNORM=10000
API_TIMEOUT_OPENFDA=15000
API_TIMEOUT_DAILYMED=20000

# Debugging & Logging
LOG_LEVEL=info
DEBUG_API_CALLS=false
ENABLE_REQUEST_LOGGING=true
```

## Missing/Recommended Improvements

- Consider adding error boundaries for better error handling
- API rate limiting might be needed for production
- Visual regression testing for UI consistency
- Database integration testing
- Load testing for performance benchmarks

## Workflow Context

The app supports different healthcare workflows:

- Pharmacist Detailed Review
- Rapid Clinical Assessment
- Complete Inventory Audit
- Simple Verification

Each workflow affects how data is displayed and what information is prioritized.
