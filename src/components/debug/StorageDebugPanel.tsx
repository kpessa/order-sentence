'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Database, 
  Trash2, 
  RefreshCw, 
  AlertTriangle, 
  Info,
  Monitor,
  HardDrive
} from 'lucide-react';
import { 
  analyzeLocalStorage, 
  analyzePersistRoot, 
  clearAllPersistData,
  checkStorageLimits,
  formatBytes,
  StorageMonitor,
  type StorageAnalysis
} from '@/lib/utils/storageDebugger';

export function StorageDebugPanel() {
  const [analysis, setAnalysis] = useState<StorageAnalysis | null>(null);
  const [persistAnalysis, setPersistAnalysis] = useState<any>(null);
  const [monitoring, setMonitoring] = useState(false);
  const [monitor, setMonitor] = useState<StorageMonitor | null>(null);
  const [limitsCheck, setLimitsCheck] = useState<any>(null);

  const refreshAnalysis = () => {
    const storageAnalysis = analyzeLocalStorage();
    const persistRoot = analyzePersistRoot();
    const limits = checkStorageLimits();
    
    setAnalysis(storageAnalysis);
    setPersistAnalysis(persistRoot);
    setLimitsCheck(limits);
  };

  const handleClearStorage = () => {
    if (confirm('Are you sure you want to clear all persisted data? This will reset the app state.')) {
      const success = clearAllPersistData();
      if (success) {
        alert('Storage cleared successfully. Please refresh the page.');
        refreshAnalysis();
      } else {
        alert('Failed to clear some storage items.');
      }
    }
  };

  const toggleMonitoring = () => {
    if (monitoring) {
      monitor?.stop();
      setMonitor(null);
      setMonitoring(false);
    } else {
      const newMonitor = new StorageMonitor((analysis) => {
        setAnalysis(analysis);
        setLimitsCheck(checkStorageLimits());
      });
      newMonitor.start(1000); // Update every second
      setMonitor(newMonitor);
      setMonitoring(true);
    }
  };

  useEffect(() => {
    refreshAnalysis();
    
    return () => {
      monitor?.stop();
    };
  }, []);

  if (!analysis) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Storage Debug Panel</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Loading storage analysis...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Database className="w-5 h-5" />
                Storage Debug Panel
              </CardTitle>
              <CardDescription>
                Monitor localStorage usage and debug persist issues
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={refreshAnalysis}
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </Button>
              <Button
                variant={monitoring ? "destructive" : "secondary"}
                size="sm"
                onClick={toggleMonitoring}
              >
                <Monitor className="w-4 h-4 mr-2" />
                {monitoring ? 'Stop' : 'Monitor'}
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleClearStorage}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Clear All
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Storage Limits Warning */}
          {limitsCheck?.isNearLimit && (
            <Alert variant="destructive">
              <AlertTriangle className="w-4 h-4" />
              <AlertDescription>
                Storage usage is at {limitsCheck.percentUsed.toFixed(1)}% of estimated limit. 
                Consider clearing data to avoid quota errors.
              </AlertDescription>
            </Alert>
          )}

          {/* Overall Statistics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {formatBytes(analysis.totalSize)}
              </div>
              <div className="text-sm text-gray-600">Total Storage</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {analysis.itemCount}
              </div>
              <div className="text-sm text-gray-600">Items Stored</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {analysis.persistRootSizeFormatted || 'N/A'}
              </div>
              <div className="text-sm text-gray-600">Persist Root</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {limitsCheck ? `${limitsCheck.percentUsed.toFixed(1)}%` : 'N/A'}
              </div>
              <div className="text-sm text-gray-600">Usage %</div>
            </div>
          </div>

          {/* Largest Items */}
          <div>
            <h4 className="font-semibold mb-2 flex items-center gap-2">
              <HardDrive className="w-4 h-4" />
              Largest Storage Items
            </h4>
            <div className="space-y-2">
              {analysis.largestItems.slice(0, 5).map((item, index) => (
                <div key={item.key} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                  <div className="flex items-center gap-2">
                    <Badge variant={item.key === 'persist:root' ? 'destructive' : 'secondary'}>
                      #{index + 1}
                    </Badge>
                    <span className="font-mono text-sm">{item.key}</span>
                  </div>
                  <span className="font-semibold">{item.sizeFormatted}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Persist Root Analysis */}
          {persistAnalysis && (
            <div>
              <h4 className="font-semibold mb-2 flex items-center gap-2">
                <Info className="w-4 h-4" />
                Persist Root Breakdown
              </h4>
              {persistAnalysis.error ? (
                <Alert variant="destructive">
                  <AlertTriangle className="w-4 h-4" />
                  <AlertDescription>{persistAnalysis.error}</AlertDescription>
                </Alert>
              ) : (
                <div className="space-y-2">
                  {Object.entries(persistAnalysis.sizes || {}).map(([key, data]: [string, any]) => (
                    <div key={key} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                      <div>
                        <span className="font-mono text-sm">{key}</span>
                        {data.preview && (
                          <div className="text-xs text-gray-500 truncate max-w-xs">
                            {data.preview}
                          </div>
                        )}
                      </div>
                      <Badge variant={data.size > 100000 ? 'destructive' : 'secondary'}>
                        {data.sizeFormatted}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}

              {/* FDA Data Specific Analysis */}
              {persistAnalysis.fdaDataBreakdown && (
                <div className="mt-4">
                  <h5 className="font-medium mb-2">FDA Data Breakdown:</h5>
                  <div className="space-y-1">
                    {Object.entries(persistAnalysis.fdaDataBreakdown.sizes || {}).map(([key, data]: [string, any]) => (
                      <div key={key} className="flex justify-between items-center text-sm p-1 bg-blue-50 rounded">
                        <span>{key}</span>
                        <div className="flex gap-2">
                          <span className="text-gray-600">{data.itemCount} items</span>
                          <Badge variant={data.size > 50000 ? 'destructive' : 'outline'}>
                            {data.sizeFormatted}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {monitoring && (
            <Alert>
              <Monitor className="w-4 h-4" />
              <AlertDescription>
                Real-time monitoring active. Storage usage will update every second.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
}