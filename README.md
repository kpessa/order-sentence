# Order Sentence Next - Pharmaceutical Data Analysis

![Deploy](https://github.com/pessk/order-sentence-next/actions/workflows/deploy.yml/badge.svg)
![Vercel](https://vercelbadge.vercel.app/api/pessk/order-sentence-next)

A Next.js 14+ pharmaceutical/medical data analysis application for healthcare professionals to analyze Cerner order sentences and drug information.

## Features

### Core Functionality

- 🔍 **Drug Search**: Real-time autocomplete using RxNorm API
- 📊 **Excel Processing**: Parse and analyze Cerner order sentences
- 💊 **FDA Integration**: OpenFDA and DailyMed data integration
- 🗄️ **Persistent Storage**: Redux + IndexedDB for offline capability
- 🏥 **Healthcare Workflows**: Support for various clinical workflows

### Technical Stack

- **Framework**: Next.js 14+ with App Router
- **State Management**: Redux Toolkit with Redux Persist
- **UI**: Tailwind CSS + shadcn/ui components
- **Data Tables**: TanStack Table v8
- **Testing**: Jest + React Testing Library + Playwright
- **CI/CD**: GitHub Actions + Vercel deployment

## Quick Start

### Development

```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev

# Run Storybook for component development
pnpm storybook
```

### Testing

```bash
# Run unit tests
pnpm test

# Run E2E tests
pnpm test:e2e

# Run all tests
pnpm test:all
```

### Code Quality

```bash
# Lint and fix
pnpm lint:fix

# Format code
pnpm format

# Type checking
pnpm typecheck
```

## Deployment

This application is configured for automated deployment to Vercel:

- **Production**: Automatically deploys from `main` branch
- **Preview**: Creates preview deployments for pull requests
- **Health Check**: Monitor at `/api/health`

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed deployment instructions.

## Environment Variables

Copy `.env.example` to `.env.local` for local development. Key variables:

- `NEXT_PUBLIC_RXNORM_API_BASE_URL`: RxNorm API endpoint
- `NEXT_PUBLIC_OPENFDA_API_BASE_URL`: OpenFDA API endpoint
- `NEXT_PUBLIC_DAILYMED_API_BASE_URL`: DailyMed API endpoint

## Documentation

- [Deployment Guide](./DEPLOYMENT.md)
- [API Documentation](./src/app/api/README.md)
- [Component Storybook](http://localhost:6006) (when running locally)

## License

Private - Healthcare Application
