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
│   ├── drug-details/      # Drug detail pages
│   └── excel-viewer/      # Excel order sentence viewer
├── components/
│   ├── atoms/             # Basic UI elements (TypeScript)
│   ├── molecules/         # Compound components (TypeScript)
│   ├── organisms/         # Complex components (TypeScript)
│   ├── templates/         # Page layouts (TypeScript)
│   └── ui/                # shadcn/ui components (JavaScript .jsx)
└── lib/
    ├── store/             # Redux store and slices
    ├── utils/             # Utility functions
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

6. **No Test Setup**: Currently no unit tests. Storybook is available for component testing.

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

## Missing/Recommended Improvements

- No `.env` file or environment variables (all APIs are public)
- No automated tests (consider adding Vitest or Jest)
- No CI/CD configuration
- Consider adding error boundaries for better error handling
- API rate limiting might be needed for production

## Workflow Context

The app supports different healthcare workflows:
- Pharmacist Detailed Review
- Rapid Clinical Assessment
- Complete Inventory Audit
- Simple Verification

Each workflow affects how data is displayed and what information is prioritized.