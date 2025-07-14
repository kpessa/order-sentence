import { NextResponse } from 'next/server';

/**
 * Health check endpoint for production monitoring
 * Used by Vercel, Docker health checks, and uptime monitoring services
 *
 * Returns:
 * - 200 OK with system status
 * - 503 Service Unavailable if critical services are down
 */
export async function GET() {
  try {
    // Check if environment variables are properly configured
    const requiredEnvVars = [
      'NEXT_PUBLIC_RXNORM_API_BASE_URL',
      'NEXT_PUBLIC_OPENFDA_API_BASE_URL',
      'NEXT_PUBLIC_DAILYMED_API_BASE_URL',
    ];

    const missingEnvVars = requiredEnvVars.filter(
      (varName) => !process.env[varName]
    );

    // Basic health check response
    const healthStatus = {
      status: missingEnvVars.length === 0 ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      version: process.env.npm_package_version || '0.1.0',
      services: {
        app: 'operational',
        envVars: missingEnvVars.length === 0 ? 'configured' : 'missing',
        missingVars: missingEnvVars,
        rxnorm: undefined as string | undefined,
        openfda: undefined as string | undefined,
      },
    };

    // Optional: Check external API connectivity (disabled by default to avoid rate limits)
    const checkExternalApis = process.env.HEALTH_CHECK_EXTERNAL_APIS === 'true';

    if (checkExternalApis) {
      // Test RxNorm API
      try {
        const rxnormUrl = `${process.env.NEXT_PUBLIC_RXNORM_API_BASE_URL}/spellingsuggestions.json?name=test`;
        const rxnormResponse = await fetch(rxnormUrl, {
          signal: AbortSignal.timeout(5000),
        });
        healthStatus.services.rxnorm = rxnormResponse.ok
          ? 'operational'
          : 'down';
      } catch {
        healthStatus.services.rxnorm = 'unreachable';
      }

      // Test OpenFDA API
      try {
        const openfdaUrl = `${process.env.NEXT_PUBLIC_OPENFDA_API_BASE_URL}/label.json?limit=1`;
        const openfdaResponse = await fetch(openfdaUrl, {
          signal: AbortSignal.timeout(5000),
        });
        healthStatus.services.openfda = openfdaResponse.ok
          ? 'operational'
          : 'down';
      } catch {
        healthStatus.services.openfda = 'unreachable';
      }
    }

    // Return appropriate status code
    const statusCode = healthStatus.status === 'healthy' ? 200 : 503;

    return NextResponse.json(healthStatus, { status: statusCode });
  } catch (error) {
    // Critical error in health check itself
    return NextResponse.json(
      {
        status: 'error',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 503 }
    );
  }
}

// Simple HEAD request support for lightweight monitoring
export async function HEAD() {
  return new NextResponse(null, { status: 200 });
}
