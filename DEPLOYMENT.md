# Deployment Guide for Order Sentence Next.js Application

This guide covers deploying the pharmaceutical data analysis application to Vercel and other platforms.

## Table of Contents

- [Vercel Deployment (Recommended)](#vercel-deployment-recommended)
- [Alternative Deployment Options](#alternative-deployment-options)
- [Environment Variables](#environment-variables)
- [Post-Deployment Checklist](#post-deployment-checklist)
- [Monitoring & Health Checks](#monitoring--health-checks)

## Vercel Deployment (Recommended)

Vercel is the recommended platform for Next.js applications, offering seamless integration and optimal performance.

### Prerequisites

- GitHub repository connected to Vercel
- Vercel account (free tier available)
- pnpm installed locally

### Step 1: Import Project to Vercel

1. Visit [vercel.com/new](https://vercel.com/new)
2. Import your GitHub repository
3. Vercel will automatically detect Next.js and configure build settings

### Step 2: Configure Environment Variables

In your Vercel project dashboard:

1. Go to **Settings → Environment Variables**
2. Add the following variables:

```bash
# API Configuration (without NEXT_PUBLIC_ prefix for mapping)
rxnorm_api_base_url=https://rxnav.nlm.nih.gov/REST
openfda_api_base_url=https://api.fda.gov/drug
dailymed_api_base_url=https://dailymed.nlm.nih.gov/dailymed/services/v2

# API Timeouts
api_rxnorm_timeout=30000
api_openfda_timeout=30000
api_dailymed_timeout=30000

# API Settings
enable_api_logging=false
max_retries=3
retry_delay=1000
```

### Step 3: Configure GitHub Secrets for CI/CD

In your GitHub repository:

1. Go to **Settings → Secrets and variables → Actions**
2. Add the following secrets:
   - `VERCEL_TOKEN`: Get from Vercel dashboard → Account Settings → Tokens
   - `VERCEL_ORG_ID`: Found in Vercel dashboard → Team Settings
   - `VERCEL_PROJECT_ID`: Found in Vercel dashboard → Project Settings

### Step 4: Deploy

The application will automatically deploy when you:

- Push to the `main` branch
- Create a pull request (preview deployment)
- Manually trigger the GitHub Action

## Alternative Deployment Options

### Docker Deployment

```bash
# Build the Docker image
docker build -t order-sentence-app .

# Run with environment variables
docker run -p 3000:3000 \
  -e NEXT_PUBLIC_RXNORM_API_BASE_URL=https://rxnav.nlm.nih.gov/REST \
  -e NEXT_PUBLIC_OPENFDA_API_BASE_URL=https://api.fda.gov/drug \
  -e NEXT_PUBLIC_DAILYMED_API_BASE_URL=https://dailymed.nlm.nih.gov/dailymed/services/v2 \
  order-sentence-app

# Or use docker-compose
docker-compose up -d
```

### Deploy to AWS/GCP/Azure

1. Build the Docker image
2. Push to container registry (ECR, GCR, ACR)
3. Deploy using:
   - AWS: ECS, App Runner, or Elastic Beanstalk
   - GCP: Cloud Run or App Engine
   - Azure: Container Instances or App Service

### Static Export (CDN Deployment)

For static hosting (Netlify, AWS S3 + CloudFront):

1. Add to `next.config.mjs`:

   ```javascript
   output: 'export';
   ```

2. Build static files:

   ```bash
   pnpm build
   ```

3. Deploy the `out` directory to your CDN

**Note**: Static export has limitations with dynamic routes and API routes.

## Environment Variables

### Required Variables

| Variable                            | Description           | Example                                             |
| ----------------------------------- | --------------------- | --------------------------------------------------- |
| `NEXT_PUBLIC_RXNORM_API_BASE_URL`   | RxNorm API endpoint   | `https://rxnav.nlm.nih.gov/REST`                    |
| `NEXT_PUBLIC_OPENFDA_API_BASE_URL`  | OpenFDA API endpoint  | `https://api.fda.gov/drug`                          |
| `NEXT_PUBLIC_DAILYMED_API_BASE_URL` | DailyMed API endpoint | `https://dailymed.nlm.nih.gov/dailymed/services/v2` |

### Optional Variables

| Variable                           | Description               | Default |
| ---------------------------------- | ------------------------- | ------- |
| `NEXT_PUBLIC_API_RXNORM_TIMEOUT`   | RxNorm API timeout (ms)   | `30000` |
| `NEXT_PUBLIC_API_OPENFDA_TIMEOUT`  | OpenFDA API timeout (ms)  | `30000` |
| `NEXT_PUBLIC_API_DAILYMED_TIMEOUT` | DailyMed API timeout (ms) | `30000` |
| `NEXT_PUBLIC_ENABLE_API_LOGGING`   | Enable API call logging   | `false` |
| `NEXT_PUBLIC_MAX_RETRIES`          | API retry attempts        | `3`     |
| `NEXT_PUBLIC_RETRY_DELAY`          | Retry delay (ms)          | `1000`  |

## Post-Deployment Checklist

### Functionality Tests

- [ ] Drug search autocomplete works
- [ ] Excel file upload and parsing functions
- [ ] OpenFDA data loads correctly
- [ ] DailyMed API proxy works (no CORS errors)
- [ ] Redux state persists across sessions
- [ ] Error boundaries display properly

### Performance Checks

- [ ] Page load time < 3 seconds
- [ ] API response times are acceptable
- [ ] No console errors in production
- [ ] IndexedDB storage works correctly

### Security Verification

- [ ] Security headers are applied
- [ ] Environment variables are not exposed
- [ ] API endpoints are properly configured
- [ ] No sensitive data in client-side code

## Monitoring & Health Checks

### Health Check Endpoint

The application includes a health check endpoint at `/api/health`:

```bash
# Check application health
curl https://your-app.vercel.app/api/health

# Response example:
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "environment": "production",
  "version": "0.1.0",
  "services": {
    "app": "operational",
    "envVars": "configured"
  }
}
```

### Vercel Analytics

Enable Vercel Analytics in your project dashboard for:

- Real User Monitoring (RUM)
- Web Vitals tracking
- Error tracking
- Performance insights

### Custom Monitoring

For advanced monitoring, consider integrating:

- **Sentry**: Error tracking and performance monitoring
- **LogRocket**: Session replay and debugging
- **Datadog/New Relic**: APM and infrastructure monitoring

## Troubleshooting

### Common Issues

1. **Build Failures**

   - Check Node.js version (requires 20.x)
   - Verify all dependencies are installed
   - Review build logs in Vercel dashboard

2. **API CORS Errors**

   - Ensure DailyMed proxy is configured
   - Check API base URLs in environment variables
   - Verify `vercel.json` rewrites

3. **State Persistence Issues**

   - Check IndexedDB support in browser
   - Verify Redux Persist configuration
   - Clear browser storage and retry

4. **Environment Variable Issues**
   - Ensure variables are set in Vercel dashboard
   - Check variable naming (with/without `NEXT_PUBLIC_`)
   - Verify `vercel.json` environment mapping

### Getting Help

- Check deployment logs in Vercel dashboard
- Review GitHub Actions logs for CI/CD issues
- Use `/api/health` endpoint for diagnostics
- Enable `NEXT_PUBLIC_ENABLE_API_LOGGING` for debugging

## Rollback Procedure

If issues occur after deployment:

1. **Vercel Dashboard**: Use "Instant Rollback" to previous deployment
2. **Git Revert**: Create a revert commit and push to trigger new deployment
3. **Manual**: Deploy a specific commit using Vercel CLI

```bash
vercel --prod --force [commit-sha]
```

---

For more information, consult the [Vercel documentation](https://vercel.com/docs) or the [Next.js deployment guide](https://nextjs.org/docs/deployment).
