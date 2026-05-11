'use client';

import React, { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '@/lib/store';
import { fetchOpenFdaDataByDrugName } from '@/lib/store/slices/fdaDataSlice';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, Pill, FileText, Stethoscope, Database, AlertCircle, Clock, RefreshCw } from 'lucide-react';
import { OpenFdaResultsDisplay } from './OpenFdaResultsDisplay/OpenFdaResultsDisplay';
import { ClinicalDataDisplay } from './ClinicalDataDisplay';
import { SkeletonLoader, SkeletonCard } from '@/components/atoms/SkeletonLoader';
import { useRouter } from 'next/navigation';

interface DrugInformationPanelProps {
  selectedDrug: {
    name: string;
    rxcui: string;
    tty: string;
    isIngredient?: boolean;
  } | null;
}

export function DrugInformationPanel({ selectedDrug }: DrugInformationPanelProps) {
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const [activeTab, setActiveTab] = useState('overview');
  
  // Get FDA data state
  const fdaData = useSelector((state: RootState) => state.fdaData);
  const { openFdaResults, status: fdaStatus, error: fdaError } = fdaData;
  
  const handleRetryFetch = () => {
    if (selectedDrug?.name) {
      dispatch(fetchOpenFdaDataByDrugName(selectedDrug.name));
    }
  };

  if (!selectedDrug) {
    return (
      <Card className="w-full">
        <CardHeader className="text-center py-12">
          <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <Pill className="w-8 h-8 text-gray-400" />
          </div>
          <CardTitle className="text-gray-500">Select a Drug to Get Started</CardTitle>
          <CardDescription>
            Search for a medication above to view comprehensive drug information, package inserts, and clinical data.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const isLoading = fdaStatus === 'loading';
  const hasResults = openFdaResults && openFdaResults.length > 0;
  const hasError = fdaStatus === 'failed' && fdaError;

  return (
    <div className="w-full space-y-6">
      {/* Hero Drug Card */}
      <Card className="w-full">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <CardTitle className="text-2xl font-bold text-blue-900">
                {selectedDrug.name}
              </CardTitle>
              <div className="flex gap-2 flex-wrap">
                <Badge variant="secondary">RxCUI: {selectedDrug.rxcui}</Badge>
                <Badge variant={selectedDrug.isIngredient ? "default" : "outline"}>
                  {selectedDrug.tty} {selectedDrug.isIngredient ? '(Active Ingredient)' : ''}
                </Badge>
              </div>
            </div>
            <div className="flex gap-2">
              {isLoading && (
                <div className="flex items-center gap-2 text-blue-600">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm">Loading data...</span>
                </div>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Tabbed Information Panel */}
      <Card className="w-full">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <CardHeader className="pb-0">
            <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 gap-1">
              <TabsTrigger value="overview" className="flex items-center gap-1 md:gap-2 text-xs md:text-sm">
                <Pill className="w-3 h-3 md:w-4 md:h-4" />
                <span className="hidden sm:inline">Overview</span>
                <span className="sm:hidden">Info</span>
              </TabsTrigger>
              <TabsTrigger value="packages" className="flex items-center gap-1 md:gap-2 text-xs md:text-sm">
                <FileText className="w-3 h-3 md:w-4 md:h-4" />
                <span className="hidden sm:inline">Package Inserts</span>
                <span className="sm:hidden">FDA</span>
                {hasResults && <Badge className="ml-1 text-xs">{openFdaResults.length}</Badge>}
              </TabsTrigger>
              <TabsTrigger value="clinical" className="flex items-center gap-1 md:gap-2 text-xs md:text-sm">
                <Stethoscope className="w-3 h-3 md:w-4 md:h-4" />
                <span className="hidden sm:inline">Clinical Data</span>
                <span className="sm:hidden">Clinical</span>
              </TabsTrigger>
              <TabsTrigger value="orders" className="flex items-center gap-1 md:gap-2 text-xs md:text-sm">
                <Database className="w-3 h-3 md:w-4 md:h-4" />
                <span className="hidden sm:inline">Order Sentences</span>
                <span className="sm:hidden">Orders</span>
              </TabsTrigger>
            </TabsList>
          </CardHeader>

          <CardContent className="pt-6">
            <TabsContent value="overview" className="space-y-4">
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Drug Information</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Drug Name:</span>
                      <span className="font-medium">{selectedDrug.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">RxNorm CUI:</span>
                      <span className="font-medium">{selectedDrug.rxcui}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Term Type:</span>
                      <span className="font-medium">{selectedDrug.tty}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Classification:</span>
                      <span className="font-medium">
                        {selectedDrug.isIngredient ? 'Active Ingredient' : 'Drug Product'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Data Sources</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <span>OpenFDA Package Inserts</span>
                      {isLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                      ) : hasResults ? (
                        <Badge className="bg-green-100 text-green-800">{openFdaResults.length} found</Badge>
                      ) : hasError ? (
                        <Badge variant="destructive">Error</Badge>
                      ) : (
                        <Badge variant="secondary">Not searched</Badge>
                      )}
                    </div>
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <span>DailyMed Clinical Data</span>
                      <Badge variant="secondary">Available</Badge>
                    </div>
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <span>Cerner Order Sentences</span>
                      <Badge variant="secondary">Available</Badge>
                    </div>
                  </div>
                </div>
              </div>

              {hasError && (
                <div className="mt-6 p-4 border border-red-200 rounded-lg bg-red-50">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-5 h-5 text-red-500 mt-0.5" />
                      <div>
                        <h4 className="font-medium text-red-800">Data Loading Error</h4>
                        <p className="text-red-700 mt-1 text-sm">{fdaError}</p>
                        <p className="text-red-600 mt-2 text-xs">
                          Some data sources may be temporarily unavailable. You can still access other information about this drug.
                        </p>
                      </div>
                    </div>
                    <Button
                      onClick={handleRetryFetch}
                      variant="outline"
                      size="sm"
                      className="ml-4 border-red-300 text-red-700 hover:bg-red-100"
                    >
                      <RefreshCw className="w-3 h-3 mr-1" />
                      Retry
                    </Button>
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="packages" className="space-y-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">FDA Package Inserts</h3>
                  {isLoading && (
                    <div className="flex items-center gap-2 text-blue-600">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span className="text-sm">Loading FDA data...</span>
                    </div>
                  )}
                </div>
                
                {isLoading ? (
                  <div className="space-y-4">
                    <SkeletonCard />
                    <div className="grid md:grid-cols-2 gap-4">
                      <SkeletonCard />
                      <SkeletonCard />
                    </div>
                  </div>
                ) : hasError ? (
                  <div className="space-y-4">
                    <div className="text-center py-8 p-6 border border-red-200 rounded-lg bg-red-50">
                      <AlertCircle className="w-12 h-12 mx-auto mb-3 text-red-400" />
                      <h4 className="text-lg font-medium text-red-800 mb-2">Unable to Load Package Inserts</h4>
                      <p className="text-red-700 mb-4">{fdaError}</p>
                      <Button
                        onClick={handleRetryFetch}
                        variant="outline"
                        className="border-red-300 text-red-700 hover:bg-red-100"
                      >
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Try Again
                      </Button>
                    </div>
                  </div>
                ) : hasResults ? (
                  <OpenFdaResultsDisplay />
                ) : (
                  <div className="text-center py-12 text-gray-500">
                    <FileText className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                    <h4 className="text-lg font-medium mb-2">No Package Insert Data</h4>
                    <p>No FDA package insert data is available for this medication.</p>
                    <Button
                      onClick={handleRetryFetch}
                      variant="outline"
                      className="mt-4"
                    >
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Search Again
                    </Button>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="clinical" className="space-y-4">
              <ClinicalDataDisplay selectedDrug={selectedDrug} />
            </TabsContent>

            <TabsContent value="orders" className="space-y-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Cerner Order Sentences</h3>
                  <Button 
                    onClick={() => router.push(`/excel-viewer?rxcui=${selectedDrug.rxcui}&name=${encodeURIComponent(selectedDrug.name)}`)}
                    variant="outline"
                  >
                    Open Excel Viewer
                  </Button>
                </div>
                <div className="text-center py-8 text-gray-500">
                  <Database className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p className="mb-4">View and analyze Cerner order sentence data for {selectedDrug.name}.</p>
                  <p className="text-sm text-gray-400">Click "Open Excel Viewer" to upload and analyze Excel files with order sentences.</p>
                </div>
              </div>
            </TabsContent>
          </CardContent>
        </Tabs>
      </Card>
    </div>
  );
}