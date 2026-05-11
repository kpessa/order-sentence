/**
 * Advanced storage analyzer to investigate quota exceeded issues
 */

export interface StorageAnalysis {
  totalSize: number;
  byKey: Record<string, {
    size: number;
    sizeHuman: string;
    type: string;
    preview: string;
  }>;
  persistRoot?: {
    size: number;
    sizeHuman: string;
    parsed?: {
      drugSearch?: { size: number; sizeHuman: string };
      excelData?: { size: number; sizeHuman: string };
      fdaData?: { 
        size: number; 
        sizeHuman: string;
        details?: {
          dailyMedDetails?: { size: number; sizeHuman: string; count: number };
          prioritizedSplsByDosageForm?: { size: number; sizeHuman: string; count: number };
          openFdaResults?: { size: number; sizeHuman: string; count: number };
        };
      };
    };
  };
  quota: {
    used: number;
    remaining: number;
    total: number;
    usedPercent: number;
  };
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function getStringByteSize(str: string): number {
  return new Blob([str]).size;
}

function analyzeValue(value: any): { size: number; type: string; preview: string } {
  const stringified = JSON.stringify(value);
  const size = getStringByteSize(stringified);
  const type = Array.isArray(value) ? 'array' : typeof value;
  
  let preview = '';
  if (typeof value === 'string') {
    preview = value.length > 100 ? `${value.substring(0, 100)}...` : value;
  } else if (Array.isArray(value)) {
    preview = `Array(${value.length})`;
  } else if (typeof value === 'object' && value !== null) {
    const keys = Object.keys(value);
    preview = `Object{${keys.slice(0, 3).join(', ')}${keys.length > 3 ? '...' : ''}}`;
  } else {
    preview = String(value);
  }
  
  return { size, type, preview };
}

export function analyzeLocalStorage(): StorageAnalysis {
  const analysis: StorageAnalysis = {
    totalSize: 0,
    byKey: {},
    quota: {
      used: 0,
      remaining: 0,
      total: 0,
      usedPercent: 0
    }
  };

  // Calculate quota usage
  if (typeof window !== 'undefined' && 'navigator' in window && 'storage' in navigator) {
    navigator.storage.estimate().then(estimate => {
      if (estimate.quota && estimate.usage) {
        analysis.quota.total = estimate.quota;
        analysis.quota.used = estimate.usage;
        analysis.quota.remaining = estimate.quota - estimate.usage;
        analysis.quota.usedPercent = (estimate.usage / estimate.quota) * 100;
      }
    });
  }

  // Analyze localStorage
  if (typeof window !== 'undefined' && window.localStorage) {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;
      
      try {
        const value = localStorage.getItem(key);
        if (value) {
          const { size, type, preview } = analyzeValue(value);
          analysis.byKey[key] = {
            size,
            sizeHuman: formatBytes(size),
            type,
            preview: preview.substring(0, 200)
          };
          analysis.totalSize += size;
        }
      } catch (error) {
        analysis.byKey[key] = {
          size: 0,
          sizeHuman: '0 B',
          type: 'error',
          preview: `Error reading: ${error}`
        };
      }
    }

    // Special analysis for persist:root and persist:fdaData
    const persistRoot = localStorage.getItem('persist:root');
    const persistFdaData = localStorage.getItem('persist:fdaData');
    
    if (persistRoot) {
      try {
        const parsed = JSON.parse(persistRoot);
        const persistAnalysis: any = {
          size: getStringByteSize(persistRoot),
          sizeHuman: formatBytes(getStringByteSize(persistRoot)),
          parsed: {}
        };

        // Analyze each slice in persist:root
        for (const [sliceKey, sliceValue] of Object.entries(parsed)) {
          if (typeof sliceValue === 'string') {
            try {
              const sliceParsed = JSON.parse(sliceValue);
              const sliceSize = getStringByteSize(sliceValue);
              persistAnalysis.parsed[sliceKey] = {
                size: sliceSize,
                sizeHuman: formatBytes(sliceSize)
              };

              // Special analysis for fdaData
              if (sliceKey === 'fdaData' && sliceParsed) {
                persistAnalysis.parsed[sliceKey].details = {};
                
                if (sliceParsed.dailyMedDetails) {
                  const dailyMedSize = getStringByteSize(JSON.stringify(sliceParsed.dailyMedDetails));
                  persistAnalysis.parsed[sliceKey].details.dailyMedDetails = {
                    size: dailyMedSize,
                    sizeHuman: formatBytes(dailyMedSize),
                    count: Object.keys(sliceParsed.dailyMedDetails).length
                  };
                }

                if (sliceParsed.prioritizedSplsByDosageForm) {
                  const prioritizedSize = getStringByteSize(JSON.stringify(sliceParsed.prioritizedSplsByDosageForm));
                  persistAnalysis.parsed[sliceKey].details.prioritizedSplsByDosageForm = {
                    size: prioritizedSize,
                    sizeHuman: formatBytes(prioritizedSize),
                    count: Object.keys(sliceParsed.prioritizedSplsByDosageForm).length
                  };
                }

                if (sliceParsed.openFdaResults) {
                  const openFdaSize = getStringByteSize(JSON.stringify(sliceParsed.openFdaResults));
                  persistAnalysis.parsed[sliceKey].details.openFdaResults = {
                    size: openFdaSize,
                    sizeHuman: formatBytes(openFdaSize),
                    count: Array.isArray(sliceParsed.openFdaResults) ? sliceParsed.openFdaResults.length : 0
                  };
                }
              }
            } catch (error) {
              persistAnalysis.parsed[sliceKey] = {
                size: getStringByteSize(sliceValue),
                sizeHuman: formatBytes(getStringByteSize(sliceValue)),
                error: String(error)
              };
            }
          }
        }

        analysis.persistRoot = persistAnalysis;
      } catch (error) {
        console.error('Error analyzing persist:root:', error);
      }
    }

    // Add analysis for persist:fdaData if it exists separately
    if (persistFdaData) {
      try {
        const parsed = JSON.parse(persistFdaData);
        const fdaAnalysis: any = {
          size: getStringByteSize(persistFdaData),
          sizeHuman: formatBytes(getStringByteSize(persistFdaData)),
          details: {}
        };

        if (parsed.dailyMedDetails) {
          const dailyMedSize = getStringByteSize(JSON.stringify(parsed.dailyMedDetails));
          fdaAnalysis.details.dailyMedDetails = {
            size: dailyMedSize,
            sizeHuman: formatBytes(dailyMedSize),
            count: Object.keys(parsed.dailyMedDetails).length
          };
        }

        if (parsed.prioritizedSplsByDosageForm) {
          const prioritizedSize = getStringByteSize(JSON.stringify(parsed.prioritizedSplsByDosageForm));
          fdaAnalysis.details.prioritizedSplsByDosageForm = {
            size: prioritizedSize,
            sizeHuman: formatBytes(prioritizedSize),
            count: Object.keys(parsed.prioritizedSplsByDosageForm).length
          };
        }

        if (parsed.openFdaResults) {
          const openFdaSize = getStringByteSize(JSON.stringify(parsed.openFdaResults));
          fdaAnalysis.details.openFdaResults = {
            size: openFdaSize,
            sizeHuman: formatBytes(openFdaSize),
            count: Array.isArray(parsed.openFdaResults) ? parsed.openFdaResults.length : 0
          };
        }

        (analysis as any).persistFdaData = fdaAnalysis;
      } catch (error) {
        console.error('Error analyzing persist:fdaData:', error);
      }
    }
  }

  return analysis;
}

export function printStorageAnalysis(analysis: StorageAnalysis): void {
  console.group('🔍 Storage Analysis');
  
  console.log(`📊 Total Storage: ${formatBytes(analysis.totalSize)}`);
  
  if (analysis.quota.total > 0) {
    console.log(`💾 Quota: ${formatBytes(analysis.quota.used)} / ${formatBytes(analysis.quota.total)} (${analysis.quota.usedPercent.toFixed(1)}%)`);
  }

  console.group('📋 By Key:');
  Object.entries(analysis.byKey)
    .sort(([,a], [,b]) => b.size - a.size)
    .forEach(([key, info]) => {
      console.log(`${key}: ${info.sizeHuman} (${info.type})`);
    });
  console.groupEnd();

  if (analysis.persistRoot) {
    console.group('🎯 persist:root Analysis:');
    console.log(`Total: ${analysis.persistRoot.sizeHuman}`);
    
    if (analysis.persistRoot.parsed) {
      Object.entries(analysis.persistRoot.parsed).forEach(([slice, info]: [string, any]) => {
        console.log(`  ${slice}: ${info.sizeHuman}`);
        
        if (info.details) {
          Object.entries(info.details).forEach(([detail, detailInfo]: [string, any]) => {
            console.log(`    ${detail}: ${detailInfo.sizeHuman} (${detailInfo.count} items)`);
          });
        }
      });
    }
    console.groupEnd();
  }

  if ((analysis as any).persistFdaData) {
    const fdaData = (analysis as any).persistFdaData;
    console.group('🎯 persist:fdaData Analysis:');
    console.log(`Total: ${fdaData.sizeHuman}`);
    
    if (fdaData.details) {
      Object.entries(fdaData.details).forEach(([detail, detailInfo]: [string, any]) => {
        console.log(`  ${detail}: ${detailInfo.sizeHuman} (${detailInfo.count} items)`);
      });
    }
    console.groupEnd();
  }

  console.groupEnd();
}

export function clearLargeStorageItems(): void {
  if (typeof window !== 'undefined' && window.localStorage) {
    const analysis = analyzeLocalStorage();
    
    // Clear items larger than 1MB
    Object.entries(analysis.byKey).forEach(([key, info]) => {
      if (info.size > 1024 * 1024) { // 1MB
        console.log(`🗑️ Clearing large storage item: ${key} (${info.sizeHuman})`);
        localStorage.removeItem(key);
      }
    });
  }
}

// Development helper
export function monitorStorage(): void {
  if (typeof window !== 'undefined') {
    const originalSetItem = localStorage.setItem;
    localStorage.setItem = function(key: string, value: string) {
      const size = getStringByteSize(value);
      console.log(`📝 Setting localStorage[${key}]: ${formatBytes(size)}`);
      
      if (size > 5 * 1024 * 1024) { // 5MB
        console.warn(`⚠️ Large storage write detected: ${key} (${formatBytes(size)})`);
      }
      
      try {
        return originalSetItem.call(this, key, value);
      } catch (error) {
        console.error(`❌ Storage write failed for ${key}:`, error);
        const analysis = analyzeLocalStorage();
        printStorageAnalysis(analysis);
        throw error;
      }
    };
  }
}