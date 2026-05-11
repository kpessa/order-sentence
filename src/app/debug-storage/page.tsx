'use client';

import React, { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { AppDispatch } from '@/lib/store';
import { selectFdaDataState, fetchSplDetailFromDailyMed } from '@/lib/store/slices/fdaDataSlice';
import { analyzeLocalStorage, printStorageAnalysis, clearLargeStorageItems } from '@/lib/utils/storageAnalyzer';
import { validateStorageTransforms, clearStorageTransformCache } from '@/lib/utils/storageMonitor';
import { clearProblematicStorage, cleanFdaDataInStorage } from '@/lib/utils/clearStorageAndReload';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function DebugStoragePage() {
  const dispatch = useDispatch<AppDispatch>();
  const fdaData = useSelector(selectFdaDataState);
  const [analysis, setAnalysis] = useState<any>(null);

  const runStorageAnalysis = () => {
    console.log('🔍 Running storage analysis...');
    const result = analyzeLocalStorage();
    printStorageAnalysis(result);
    setAnalysis(result);
  };

  const validateTransforms = () => {
    console.log('🔍 Validating storage transforms...');
    validateStorageTransforms();
  };

  const clearLargeItems = () => {
    console.log('🗑️ Clearing large storage items...');
    clearLargeStorageItems();
    setTimeout(runStorageAnalysis, 1000);
  };

  const clearTransformCache = () => {
    console.log('🗑️ Clearing transform cache...');
    clearStorageTransformCache();
    setTimeout(runStorageAnalysis, 1000);
  };

  const triggerLargeDataFetch = () => {
    // Fetch several SPLs to trigger potential quota issue
    const testSetIds = [
      'c73a52a8-6e66-4d17-b137-8d9b7e3f9a2b', // Example setId - replace with real ones
      'a1b2c3d4-e5f6-7890-1234-567890abcdef',
      'f1e2d3c4-b5a6-9876-5432-1098765fedcb'
    ];

    testSetIds.forEach(setId => {
      dispatch(fetchSplDetailFromDailyMed(setId));
    });
  };

  const clearAllStorage = () => {
    if (confirm('Clear ALL localStorage? This will reset the app state.')) {
      localStorage.clear();
      window.location.reload();
    }
  };

  const cleanFdaData = () => {
    console.log('🧹 Cleaning FDA data in storage...');
    cleanFdaDataInStorage();
    setTimeout(runStorageAnalysis, 1000);
  };

  const clearProblematic = () => {
    if (confirm('Clear problematic storage keys and reload? This will reset persist data.')) {
      clearProblematicStorage();
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Storage Debug Utilities</CardTitle>
          <CardDescription>
            Debug and monitor localStorage usage and quota issues
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <Button onClick={runStorageAnalysis} variant="outline">
              🔍 Analyze Storage
            </Button>
            <Button onClick={validateTransforms} variant="outline">
              ✅ Validate Transforms
            </Button>
            <Button onClick={cleanFdaData} variant="outline">
              🧹 Clean FDA Data
            </Button>
            <Button onClick={clearLargeItems} variant="outline">
              🗑️ Clear Large Items
            </Button>
            <Button onClick={clearTransformCache} variant="outline">
              🔄 Clear Transform Cache
            </Button>
            <Button onClick={clearProblematic} variant="outline">
              🔧 Clear & Reload
            </Button>
            <Button onClick={triggerLargeDataFetch} variant="outline">
              📥 Trigger Large Fetch
            </Button>
            <Button onClick={clearAllStorage} variant="destructive">
              💥 Clear All Storage
            </Button>
          </div>
        </CardContent>
      </Card>

      {analysis && (
        <Card>
          <CardHeader>
            <CardTitle>Storage Analysis Results</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold">Total Storage:</h3>
                <p>{(analysis.totalSize / (1024 * 1024)).toFixed(2)} MB</p>
              </div>
              
              {analysis.quota.total > 0 && (
                <div>
                  <h3 className="font-semibold">Quota Usage:</h3>
                  <p>
                    {(analysis.quota.used / (1024 * 1024)).toFixed(1)} MB / 
                    {(analysis.quota.total / (1024 * 1024)).toFixed(1)} MB 
                    ({analysis.quota.usedPercent.toFixed(1)}%)
                  </p>
                </div>
              )}

              <div>
                <h3 className="font-semibold">Largest Items:</h3>
                <div className="space-y-1">
                  {Object.entries(analysis.byKey)
                    .sort(([,a]: [string, any], [,b]: [string, any]) => b.size - a.size)
                    .slice(0, 5)
                    .map(([key, info]: [string, any]) => (
                      <div key={key} className="text-sm">
                        <span className="font-mono">{key}</span>: {info.sizeHuman}
                      </div>
                    ))}
                </div>
              </div>

              {analysis.persistRoot && (
                <div>
                  <h3 className="font-semibold">persist:root Breakdown:</h3>
                  <p>Total: {analysis.persistRoot.sizeHuman}</p>
                  {analysis.persistRoot.parsed && (
                    <div className="ml-4 space-y-1">
                      {Object.entries(analysis.persistRoot.parsed).map(([slice, info]: [string, any]) => (
                        <div key={slice}>
                          <div className="text-sm">
                            <span className="font-mono">{slice}</span>: {info.sizeHuman}
                          </div>
                          {info.details && (
                            <div className="ml-4 text-xs space-y-1">
                              {Object.entries(info.details).map(([detail, detailInfo]: [string, any]) => (
                                <div key={detail}>
                                  {detail}: {detailInfo.sizeHuman} ({detailInfo.count} items)
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Current FDA Data State</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <div>OpenFDA Results: {fdaData.openFdaResults?.length || 0} items</div>
            <div>DailyMed Details: {typeof fdaData.dailyMedDetails === 'object' ? Object.keys(fdaData.dailyMedDetails).length : 0} items</div>
            <div>Prioritized SPLs: {typeof fdaData.prioritizedSplsByDosageForm === 'object' ? Object.keys(fdaData.prioritizedSplsByDosageForm).length : 0} groups</div>
            <div>Status: {fdaData.status}</div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}