'use client';

import { useGlobalLogSender } from '@/lib/hooks/useGlobalLogSender';
import { useEffect } from 'react';
import { startStorageMonitoring, validateStorageTransforms } from '@/lib/utils/storageMonitor';
import { analyzeLocalStorage, printStorageAnalysis } from '@/lib/utils/storageAnalyzer';

export function GlobalEffects() {
  useGlobalLogSender();
  
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      // Start storage monitoring
      startStorageMonitoring();
      
      // Initial storage analysis
      setTimeout(() => {
        console.log('🔍 Initial storage analysis:');
        const analysis = analyzeLocalStorage();
        printStorageAnalysis(analysis);
        validateStorageTransforms();
      }, 2000);
    }
  }, []);
  
  return null; // This component doesn't render anything visible
}
