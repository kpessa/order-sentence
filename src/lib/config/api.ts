/**
 * API Configuration
 * Centralizes all API endpoints and configuration
 */

// API Base URLs
export const API_CONFIG = {
  RXNORM: {
    BASE_URL: process.env.NEXT_PUBLIC_RXNORM_API_BASE_URL || 'https://rxnav.nlm.nih.gov/REST',
    TIMEOUT: parseInt(process.env.API_TIMEOUT_RXNORM || '10000'),
  },
  OPENFDA: {
    BASE_URL: process.env.NEXT_PUBLIC_OPENFDA_API_BASE_URL || 'https://api.fda.gov/drug',
    TIMEOUT: parseInt(process.env.API_TIMEOUT_OPENFDA || '15000'),
  },
  DAILYMED: {
    BASE_URL: process.env.NEXT_PUBLIC_DAILYMED_API_BASE_URL || 'https://dailymed.nlm.nih.gov/dailymed/services/v2',
    TIMEOUT: parseInt(process.env.API_TIMEOUT_DAILYMED || '20000'),
  },
} as const;

// Application Configuration
export const APP_CONFIG = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  LOG_LEVEL: process.env.LOG_LEVEL || 'info',
  ENABLE_REQUEST_LOGGING: process.env.ENABLE_REQUEST_LOGGING === 'true',
  DEBUG_API_CALLS: process.env.DEBUG_API_CALLS === 'true',
  MOCK_API_RESPONSES: process.env.MOCK_API_RESPONSES === 'true',
  VERBOSE_ERRORS: process.env.VERBOSE_ERRORS === 'true',
  RATE_LIMIT_REQUESTS_PER_MINUTE: parseInt(process.env.RATE_LIMIT_REQUESTS_PER_MINUTE || '100'),
} as const;

// Security Configuration
export const SECURITY_CONFIG = {
  ENABLE_SECURITY_HEADERS: process.env.ENABLE_SECURITY_HEADERS === 'true',
  ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
} as const;

// API Endpoints
export const API_ENDPOINTS = {
  RXNORM: {
    APPROXIMATE_TERM: (term: string, maxEntries = 10) => 
      `${API_CONFIG.RXNORM.BASE_URL}/approximateTerm.json?term=${encodeURIComponent(term)}&maxEntries=${maxEntries}&option=1`,
    
    RXCUI_PROPERTY: (rxcui: string, property = 'TTY') => 
      `${API_CONFIG.RXNORM.BASE_URL}/rxcui/${rxcui}/property.json?propName=${property}`,
    
    RXCUI_NDCS: (rxcui: string) => 
      `${API_CONFIG.RXNORM.BASE_URL}/rxcui/${rxcui}/ndcs.json`,
  },
  
  OPENFDA: {
    DRUG_LABEL_BY_NDC: (productNdc: string, limit = 10) => 
      `${API_CONFIG.OPENFDA.BASE_URL}/label.json?search=openfda.product_ndc:"${productNdc}"&limit=${limit}`,
    
    DRUGS_FDA: (searchQuery: string, limit = 100) => 
      `${API_CONFIG.OPENFDA.BASE_URL}/drugsfda.json?search=${searchQuery}&limit=${limit}`,
  },
  
  DAILYMED: {
    SPL_BY_DRUG_NAME: (drugName: string, pageSize = 100) => 
      `${API_CONFIG.DAILYMED.BASE_URL}/spls.json?drug_name=${encodeURIComponent(drugName)}&pagesize=${pageSize}`,
    
    SPL_XML: (setId: string) => 
      `${API_CONFIG.DAILYMED.BASE_URL}/spls/${setId}.xml`,
  },
} as const;

// Request Configuration
export const DEFAULT_REQUEST_CONFIG = {
  headers: {
    'User-Agent': 'NextJS-CustomFetcher/1.0',
    'Content-Type': 'application/json',
  },
  timeout: 10000, // Default timeout
} as const;

// Helper function to get request config with timeout
export function getRequestConfig(apiType: keyof typeof API_CONFIG) {
  return {
    ...DEFAULT_REQUEST_CONFIG,
    timeout: API_CONFIG[apiType].TIMEOUT,
  };
}

// Helper function to log API calls if debugging is enabled
export function logApiCall(endpoint: string, method = 'GET') {
  if (APP_CONFIG.DEBUG_API_CALLS) {
    console.log(`[API Call] ${method} ${endpoint}`);
  }
}

// Helper function to handle API errors consistently
export function handleApiError(error: any, context: string) {
  const errorMessage = error?.message || 'Unknown error';
  const errorDetails = APP_CONFIG.VERBOSE_ERRORS ? error : undefined;
  
  console.error(`[API Error] ${context}:`, errorMessage);
  
  if (errorDetails && APP_CONFIG.DEBUG_API_CALLS) {
    console.error('[API Error Details]:', errorDetails);
  }
  
  return {
    message: errorMessage,
    context,
    timestamp: new Date().toISOString(),
  };
}