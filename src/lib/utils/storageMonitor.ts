/**
 * Real-time storage monitoring and quota management
 */

let isMonitoring = false;

export function startStorageMonitoring() {
  if (isMonitoring || typeof window === 'undefined') return;
  
  isMonitoring = true;
  console.log('🔍 Storage monitoring started');

  // Monitor localStorage writes
  const originalSetItem = localStorage.setItem;
  localStorage.setItem = function(key: string, value: string) {
    const size = new Blob([value]).size;
    const sizeMB = (size / (1024 * 1024)).toFixed(2);
    
    console.log(`📝 localStorage.setItem: ${key} (${sizeMB}MB)`);
    
    // Emergency prevention for persist:fdaData with large data
    if (key === 'persist:fdaData' && size > 5 * 1024 * 1024) {
      console.error(`🚨 PREVENTING large persist:fdaData write (${sizeMB}MB) - transform may have failed`);
      
      try {
        const parsed = JSON.parse(value);
        const cleaned = {
          ...parsed,
          dailyMedDetails: {},
          prioritizedSplsByDosageForm: {}
        };
        const cleanedValue = JSON.stringify(cleaned);
        const cleanedSize = new Blob([cleanedValue]).size;
        console.log(`🔧 Cleaned persist:fdaData from ${sizeMB}MB to ${(cleanedSize / (1024 * 1024)).toFixed(2)}MB`);
        return originalSetItem.call(this, key, cleanedValue);
      } catch (error) {
        console.error('Failed to clean persist:fdaData:', error);
      }
    }
    
    // Warn about large writes
    if (size > 5 * 1024 * 1024) { // 5MB
      console.warn(`⚠️ Large localStorage write: ${key} (${sizeMB}MB)`);
    }
    
    // Check quota before writing
    if (size > 2 * 1024 * 1024) { // 2MB
      checkStorageQuota();
    }
    
    try {
      return originalSetItem.call(this, key, value);
    } catch (error) {
      console.error(`❌ localStorage.setItem failed for ${key}:`, error);
      
      if (error instanceof DOMException && error.name === 'QuotaExceededError') {
        handleQuotaExceeded(key, size);
      }
      
      throw error;
    }
  };

  // Monitor storage quota periodically
  setInterval(checkStorageQuota, 30000); // Every 30 seconds
}

function checkStorageQuota() {
  if (typeof window === 'undefined') return;
  
  if ('storage' in navigator && 'estimate' in navigator.storage) {
    navigator.storage.estimate().then(estimate => {
      if (estimate.quota && estimate.usage) {
        const usedPercent = (estimate.usage / estimate.quota) * 100;
        const usedMB = (estimate.usage / (1024 * 1024)).toFixed(1);
        const totalMB = (estimate.quota / (1024 * 1024)).toFixed(1);
        
        console.log(`💾 Storage: ${usedMB}MB / ${totalMB}MB (${usedPercent.toFixed(1)}%)`);
        
        if (usedPercent > 80) {
          console.warn(`⚠️ Storage usage high: ${usedPercent.toFixed(1)}%`);
          
          if (usedPercent > 90) {
            console.error(`🚨 Storage critically full: ${usedPercent.toFixed(1)}%`);
            emergencyCleanup();
          }
        }
      }
    }).catch(error => {
      console.error('Error checking storage quota:', error);
    });
  }
}

function handleQuotaExceeded(key: string, attemptedSize: number) {
  console.error(`🚨 QuotaExceededError for ${key} (${(attemptedSize / (1024 * 1024)).toFixed(2)}MB)`);
  
  // Analyze current storage
  const analysis = analyzeCurrentStorage();
  console.group('📊 Storage Analysis at Quota Exceeded:');
  console.log('Total items:', analysis.totalItems);
  console.log('Total size:', `${(analysis.totalSize / (1024 * 1024)).toFixed(2)}MB`);
  console.log('Largest items:');
  analysis.largestItems.slice(0, 5).forEach(item => {
    console.log(`  ${item.key}: ${(item.size / (1024 * 1024)).toFixed(2)}MB`);
  });
  console.groupEnd();
  
  // Suggest cleanup
  suggestCleanup(analysis);
}

function analyzeCurrentStorage() {
  const items: Array<{key: string, size: number, value: string}> = [];
  let totalSize = 0;
  
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key) {
      const value = localStorage.getItem(key) || '';
      const size = new Blob([value]).size;
      items.push({ key, size, value });
      totalSize += size;
    }
  }
  
  return {
    totalItems: items.length,
    totalSize,
    largestItems: items.sort((a, b) => b.size - a.size),
    items
  };
}

function suggestCleanup(analysis: any) {
  const suggestions: string[] = [];
  
  // Check for persist:root
  const persistRoot = analysis.items.find((item: any) => item.key === 'persist:root');
  if (persistRoot && persistRoot.size > 5 * 1024 * 1024) {
    suggestions.push('persist:root is very large - check if transforms are working');
    
    try {
      const parsed = JSON.parse(persistRoot.value);
      if (parsed.fdaData) {
        const fdaData = JSON.parse(parsed.fdaData);
        const dailyMedSize = fdaData.dailyMedDetails ? JSON.stringify(fdaData.dailyMedDetails).length : 0;
        const prioritizedSize = fdaData.prioritizedSplsByDosageForm ? JSON.stringify(fdaData.prioritizedSplsByDosageForm).length : 0;
        
        if (dailyMedSize > 1024 * 1024) {
          suggestions.push(`dailyMedDetails is ${(dailyMedSize / (1024 * 1024)).toFixed(1)}MB - should be excluded by transform`);
        }
        if (prioritizedSize > 1024 * 1024) {
          suggestions.push(`prioritizedSplsByDosageForm is ${(prioritizedSize / (1024 * 1024)).toFixed(1)}MB - should be excluded by transform`);
        }
      }
    } catch (error) {
      suggestions.push('Unable to parse persist:root for detailed analysis');
    }
  }
  
  // Check for other large items
  analysis.largestItems.forEach((item: any) => {
    if (item.size > 2 * 1024 * 1024 && item.key !== 'persist:root') {
      suggestions.push(`${item.key} is ${(item.size / (1024 * 1024)).toFixed(1)}MB - consider cleanup`);
    }
  });
  
  console.group('💡 Cleanup Suggestions:');
  suggestions.forEach(suggestion => console.log(`• ${suggestion}`));
  console.groupEnd();
}

function emergencyCleanup() {
  console.log('🚨 Running emergency storage cleanup...');
  
  const analysis = analyzeCurrentStorage();
  
  // Remove items larger than 10MB
  analysis.largestItems.forEach(item => {
    if (item.size > 10 * 1024 * 1024) {
      console.log(`🗑️ Emergency cleanup: removing ${item.key} (${(item.size / (1024 * 1024)).toFixed(1)}MB)`);
      localStorage.removeItem(item.key);
    }
  });
  
  // Clear specific debug/temp keys
  const debugKeys = ['debug:', 'temp:', 'cache:'];
  for (let i = localStorage.length - 1; i >= 0; i--) {
    const key = localStorage.key(i);
    if (key && debugKeys.some(prefix => key.startsWith(prefix))) {
      console.log(`🗑️ Emergency cleanup: removing debug key ${key}`);
      localStorage.removeItem(key);
    }
  }
}

export function clearStorageTransformCache() {
  // Clear any cached transform data that might be interfering
  const keysToCheck = ['persist:fdaData', 'persist:root', '_persist', 'persist:excelData', 'persist:drugSearch'];
  
  keysToCheck.forEach(key => {
    if (localStorage.getItem(key)) {
      console.log(`🗑️ Clearing transform cache: ${key}`);
      localStorage.removeItem(key);
    }
  });
}

export function validateStorageTransforms() {
  // Check both persist:root and persist:fdaData
  const persistRoot = localStorage.getItem('persist:root');
  const persistFdaData = localStorage.getItem('persist:fdaData');
  
  console.group('🔍 Validating Storage Transforms:');
  
  if (persistRoot) {
    try {
      const parsed = JSON.parse(persistRoot);
      console.log('persist:root found, keys:', Object.keys(parsed));
      
      if (parsed.fdaData) {
        console.warn('⚠️ fdaData found in persist:root - should be in separate persist:fdaData');
        const fdaData = JSON.parse(parsed.fdaData);
        const hasLargeData = Object.keys(fdaData.dailyMedDetails || {}).length > 0 || 
                            Object.keys(fdaData.prioritizedSplsByDosageForm || {}).length > 0;
        
        if (hasLargeData) {
          console.error('❌ Large data in persist:root fdaData');
        }
      } else {
        console.log('✅ fdaData correctly excluded from persist:root');
      }
    } catch (error) {
      console.error('Error parsing persist:root:', error);
    }
  } else {
    console.log('ℹ️ No persist:root found');
  }
  
  if (persistFdaData) {
    try {
      const parsed = JSON.parse(persistFdaData);
      console.log('persist:fdaData found');
      
      const hasLargeData = Object.keys(parsed.dailyMedDetails || {}).length > 0 || 
                          Object.keys(parsed.prioritizedSplsByDosageForm || {}).length > 0;
      
      if (hasLargeData) {
        console.error('❌ Storage transforms NOT working - large data found in persist:fdaData');
        console.log('dailyMedDetails keys:', Object.keys(parsed.dailyMedDetails || {}));
        console.log('prioritizedSplsByDosageForm keys:', Object.keys(parsed.prioritizedSplsByDosageForm || {}));
      } else {
        console.log('✅ Storage transforms working - large data excluded from persist:fdaData');
      }
    } catch (error) {
      console.error('Error parsing persist:fdaData:', error);
    }
  } else {
    console.log('ℹ️ No persist:fdaData found');
  }
  
  console.groupEnd();
}

// Auto-start monitoring in development
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  startStorageMonitoring();
}