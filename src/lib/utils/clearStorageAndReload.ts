/**
 * Utility to clear problematic storage and reload with fresh state
 */

export function clearProblematicStorage() {
  if (typeof window === 'undefined') return;
  
  console.log('🗑️ Clearing problematic storage keys...');
  
  // Clear specific persist keys that might have large data
  const keysToRemove = [
    'persist:fdaData',
    'persist:root',
    '_persist'
  ];
  
  keysToRemove.forEach(key => {
    if (localStorage.getItem(key)) {
      console.log(`  Removing ${key}`);
      localStorage.removeItem(key);
    }
  });
  
  console.log('✅ Storage cleared. Reloading page...');
  window.location.reload();
}

export function cleanFdaDataInStorage() {
  if (typeof window === 'undefined') return;
  
  const persistFdaData = localStorage.getItem('persist:fdaData');
  if (persistFdaData) {
    try {
      const parsed = JSON.parse(persistFdaData);
      const cleaned = {
        ...parsed,
        dailyMedDetails: {},
        prioritizedSplsByDosageForm: {}
      };
      localStorage.setItem('persist:fdaData', JSON.stringify(cleaned));
      console.log('✅ Cleaned persist:fdaData in place');
    } catch (error) {
      console.error('Failed to clean persist:fdaData:', error);
    }
  }
  
  const persistRoot = localStorage.getItem('persist:root');
  if (persistRoot) {
    try {
      const parsed = JSON.parse(persistRoot);
      if (parsed.fdaData) {
        const fdaData = JSON.parse(parsed.fdaData);
        const cleanedFdaData = {
          ...fdaData,
          dailyMedDetails: {},
          prioritizedSplsByDosageForm: {}
        };
        parsed.fdaData = JSON.stringify(cleanedFdaData);
        localStorage.setItem('persist:root', JSON.stringify(parsed));
        console.log('✅ Cleaned fdaData in persist:root');
      }
    } catch (error) {
      console.error('Failed to clean persist:root:', error);
    }
  }
}