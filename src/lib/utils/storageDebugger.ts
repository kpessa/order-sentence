/**
 * Storage debugging utilities to diagnose persist issues
 */

export interface StorageAnalysis {
  totalSize: number;
  itemCount: number;
  largestItems: Array<{ key: string; size: number; sizeFormatted: string }>;
  persistRootSize?: number;
  persistRootSizeFormatted?: string;
  breakdown: Record<string, { size: number; sizeFormatted: string }>;
}

/**
 * Calculate the size of an object in bytes (approximate)
 */
export function calculateObjectSize(obj: any): number {
  const jsonString = JSON.stringify(obj);
  return new Blob([jsonString]).size;
}

/**
 * Format bytes to human readable format
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Analyze localStorage usage
 */
export function analyzeLocalStorage(): StorageAnalysis {
  const analysis: StorageAnalysis = {
    totalSize: 0,
    itemCount: 0,
    largestItems: [],
    breakdown: {}
  };

  if (typeof window === 'undefined' || !window.localStorage) {
    return analysis;
  }

  const items: Array<{ key: string; size: number; sizeFormatted: string }> = [];

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key) {
      const value = localStorage.getItem(key);
      if (value) {
        const size = new Blob([value]).size;
        items.push({
          key,
          size,
          sizeFormatted: formatBytes(size)
        });
        analysis.totalSize += size;
        analysis.breakdown[key] = {
          size,
          sizeFormatted: formatBytes(size)
        };
      }
    }
  }

  analysis.itemCount = items.length;
  analysis.largestItems = items.sort((a, b) => b.size - a.size).slice(0, 10);

  // Special analysis for persist:root
  const persistRoot = localStorage.getItem('persist:root');
  if (persistRoot) {
    analysis.persistRootSize = new Blob([persistRoot]).size;
    analysis.persistRootSizeFormatted = formatBytes(analysis.persistRootSize);
  }

  return analysis;
}

/**
 * Analyze the contents of persist:root in detail
 */
export function analyzePersistRoot(): any {
  if (typeof window === 'undefined' || !window.localStorage) {
    return null;
  }

  const persistRoot = localStorage.getItem('persist:root');
  if (!persistRoot) {
    return null;
  }

  try {
    const parsed = JSON.parse(persistRoot);
    const analysis: any = {
      keys: Object.keys(parsed),
      sizes: {}
    };

    Object.keys(parsed).forEach(key => {
      const value = parsed[key];
      const size = calculateObjectSize(value);
      analysis.sizes[key] = {
        size,
        sizeFormatted: formatBytes(size),
        preview: typeof value === 'string' ? value.substring(0, 100) + '...' : '[Object]'
      };
    });

    // Special analysis for fdaData
    if (parsed.fdaData) {
      try {
        const fdaData = JSON.parse(parsed.fdaData);
        analysis.fdaDataBreakdown = {
          keys: Object.keys(fdaData),
          sizes: {}
        };

        Object.keys(fdaData).forEach(key => {
          const size = calculateObjectSize(fdaData[key]);
          analysis.fdaDataBreakdown.sizes[key] = {
            size,
            sizeFormatted: formatBytes(size),
            itemCount: Array.isArray(fdaData[key]) ? fdaData[key].length : 
                      typeof fdaData[key] === 'object' ? Object.keys(fdaData[key]).length : 1
          };
        });
      } catch (e) {
        analysis.fdaDataError = 'Failed to parse fdaData: ' + e;
      }
    }

    return analysis;
  } catch (error) {
    return { error: 'Failed to parse persist:root: ' + error };
  }
}

/**
 * Clear specific parts of localStorage
 */
export function clearStorageItem(key: string): boolean {
  if (typeof window === 'undefined' || !window.localStorage) {
    return false;
  }

  try {
    localStorage.removeItem(key);
    return true;
  } catch (error) {
    console.error('Failed to clear storage item:', error);
    return false;
  }
}

/**
 * Clear all persist data
 */
export function clearAllPersistData(): boolean {
  const keys = ['persist:root', 'persist:drugSearch', 'persist:excelData', 'persist:fdaData'];
  let success = true;

  keys.forEach(key => {
    if (!clearStorageItem(key)) {
      success = false;
    }
  });

  return success;
}

/**
 * Monitor storage usage in real-time
 */
export class StorageMonitor {
  private intervalId: number | null = null;
  private callback: (analysis: StorageAnalysis) => void;

  constructor(callback: (analysis: StorageAnalysis) => void) {
    this.callback = callback;
  }

  start(intervalMs: number = 2000): void {
    if (this.intervalId) {
      this.stop();
    }

    this.intervalId = window.setInterval(() => {
      const analysis = analyzeLocalStorage();
      this.callback(analysis);
    }, intervalMs);
  }

  stop(): void {
    if (this.intervalId) {
      window.clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }
}

/**
 * Development helper to log storage analysis
 */
export function logStorageAnalysis(): void {
  const analysis = analyzeLocalStorage();
  const persistAnalysis = analyzePersistRoot();

  console.group('🔍 Storage Analysis');
  console.log('📊 Overall Storage:', {
    totalSize: analysis.totalSize,
    totalSizeFormatted: formatBytes(analysis.totalSize),
    itemCount: analysis.itemCount
  });

  console.log('📦 Largest Items:', analysis.largestItems);

  if (analysis.persistRootSize) {
    console.log('🔄 Persist Root:', {
      size: analysis.persistRootSize,
      sizeFormatted: analysis.persistRootSizeFormatted
    });
  }

  if (persistAnalysis) {
    console.log('🔬 Persist Root Breakdown:', persistAnalysis);
  }

  console.groupEnd();
}

/**
 * Check if we're approaching storage limits
 */
export function checkStorageLimits(): { 
  isNearLimit: boolean; 
  percentUsed: number; 
  estimatedLimit: number;
  currentUsage: number;
} {
  const analysis = analyzeLocalStorage();
  
  // Rough estimate of localStorage limit (usually 5-10MB)
  const estimatedLimit = 5 * 1024 * 1024; // 5MB conservative estimate
  const percentUsed = (analysis.totalSize / estimatedLimit) * 100;
  
  return {
    isNearLimit: percentUsed > 80,
    percentUsed,
    estimatedLimit,
    currentUsage: analysis.totalSize
  };
}