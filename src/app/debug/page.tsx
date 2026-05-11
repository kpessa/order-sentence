'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { 
  Bug, 
  Database, 
  TestTube, 
  Activity,
  Zap,
  Settings
} from 'lucide-react';
import { StorageDebugPanel } from '@/components/debug/StorageDebugPanel';

export default function DebugPage() {
  const [testResults, setTestResults] = useState<any>(null);

  const runQuickTests = async () => {
    console.log('🧪 Running Quick Integration Tests...');
    
    const results = {
      timestamp: new Date().toISOString(),
      tests: []
    };

    // Test 1: Enhanced SPL Import
    try {
      const { performEnhancedSplPrioritization } = await import('@/lib/utils/enhancedSplPrioritization');
      results.tests.push({
        name: 'Enhanced SPL Import',
        status: 'pass',
        message: 'Successfully imported enhanced prioritization function'
      });
    } catch (error) {
      results.tests.push({
        name: 'Enhanced SPL Import',
        status: 'fail',
        message: `Import failed: ${error}`
      });
    }

    // Test 2: Storage Transform Check
    try {
      const storageItem = localStorage.getItem('persist:root');
      if (storageItem) {
        const parsed = JSON.parse(storageItem);
        const fdaData = parsed.fdaData ? JSON.parse(parsed.fdaData) : {};
        
        results.tests.push({
          name: 'Storage Transform Check',
          status: Object.keys(fdaData.dailyMedDetails || {}).length > 0 ? 'fail' : 'pass',
          message: `dailyMedDetails in storage: ${Object.keys(fdaData.dailyMedDetails || {}).length} items`
        });
      } else {
        results.tests.push({
          name: 'Storage Transform Check',
          status: 'info',
          message: 'No persist:root found in localStorage'
        });
      }
    } catch (error) {
      results.tests.push({
        name: 'Storage Transform Check',
        status: 'error',
        message: `Storage check failed: ${error}`
      });
    }

    // Test 3: Redux Store Check
    try {
      // This is a basic check - would need store access for full testing
      results.tests.push({
        name: 'Redux Store Structure',
        status: 'info',
        message: 'Basic store structure check (would need store access for full test)'
      });
    } catch (error) {
      results.tests.push({
        name: 'Redux Store Structure',
        status: 'error',
        message: `Store check failed: ${error}`
      });
    }

    setTestResults(results);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <Bug className="w-8 h-8 text-red-500" />
        <div>
          <h1 className="text-3xl font-bold">Debug & Testing Console</h1>
          <p className="text-gray-600">
            Diagnose and test the enhanced SPL prioritization system
          </p>
        </div>
      </div>

      <Tabs defaultValue="storage" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="storage" className="flex items-center gap-2">
            <Database className="w-4 h-4" />
            Storage
          </TabsTrigger>
          <TabsTrigger value="tests" className="flex items-center gap-2">
            <TestTube className="w-4 h-4" />
            Tests
          </TabsTrigger>
          <TabsTrigger value="monitoring" className="flex items-center gap-2">
            <Activity className="w-4 h-4" />
            Monitoring
          </TabsTrigger>
          <TabsTrigger value="config" className="flex items-center gap-2">
            <Settings className="w-4 h-4" />
            Config
          </TabsTrigger>
        </TabsList>

        <TabsContent value="storage">
          <StorageDebugPanel />
        </TabsContent>

        <TabsContent value="tests">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TestTube className="w-5 h-5" />
                Integration Tests
              </CardTitle>
              <CardDescription>
                Run automated tests to verify system functionality
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Button onClick={runQuickTests}>
                  <Zap className="w-4 h-4 mr-2" />
                  Run Quick Tests
                </Button>
              </div>

              {testResults && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <h4 className="font-semibold">Test Results</h4>
                    <Badge variant="outline">
                      {new Date(testResults.timestamp).toLocaleTimeString()}
                    </Badge>
                  </div>
                  
                  <div className="space-y-2">
                    {testResults.tests.map((test: any, index: number) => (
                      <div key={index} className="flex items-center justify-between p-3 border rounded">
                        <div>
                          <div className="font-medium">{test.name}</div>
                          <div className="text-sm text-gray-600">{test.message}</div>
                        </div>
                        <Badge variant={
                          test.status === 'pass' ? 'default' :
                          test.status === 'fail' ? 'destructive' :
                          test.status === 'error' ? 'destructive' : 'secondary'
                        }>
                          {test.status.toUpperCase()}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-semibold mb-2">Manual Test Instructions:</h4>
                <ol className="list-decimal list-inside space-y-1 text-sm">
                  <li>Search for "aspirin" and select it</li>
                  <li>Go to Clinical Data tab</li>
                  <li>Check for duplicate sections</li>
                  <li>Monitor storage usage while testing</li>
                  <li>Try multiple drugs and dosage forms</li>
                </ol>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="monitoring">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5" />
                System Monitoring
              </CardTitle>
              <CardDescription>
                Real-time monitoring of enhanced SPL system
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="bg-yellow-50 p-4 rounded-lg">
                  <h4 className="font-semibold mb-2">Console Monitoring:</h4>
                  <p className="text-sm text-gray-700 mb-2">
                    Open browser console (F12) and watch for these log patterns:
                  </p>
                  <div className="font-mono text-xs space-y-1 bg-gray-100 p-2 rounded">
                    <div>[performEnhancedSplPrioritization] Starting...</div>
                    <div>[processEnhancedSplContent] Processed SPL...</div>
                    <div>[ClinicalDataDisplay] Error in enhanced prioritization...</div>
                  </div>
                </div>
                
                <div className="bg-green-50 p-4 rounded-lg">
                  <h4 className="font-semibold mb-2">Performance Metrics:</h4>
                  <p className="text-sm text-gray-700">
                    Monitor processing time, memory usage, and API response times in the Network tab.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="config">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Configuration Debug
              </CardTitle>
              <CardDescription>
                Current configuration and environment details
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-semibold mb-2">Environment</h4>
                    <div className="space-y-1 text-sm">
                      <div>Node ENV: {process.env.NODE_ENV}</div>
                      <div>Browser Storage: {typeof window !== 'undefined' && window.localStorage ? 'Available' : 'Not Available'}</div>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-semibold mb-2">Features</h4>
                    <div className="space-y-1 text-sm">
                      <div>Enhanced SPL: Enabled</div>
                      <div>Markdown Rendering: react-markdown</div>
                      <div>Storage Transforms: Configured</div>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-semibold mb-2">Quick Actions:</h4>
                  <div className="space-y-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => {
                        console.clear();
                        console.log('🧹 Console cleared for debugging');
                      }}
                    >
                      Clear Console
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}