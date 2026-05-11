'use client';

import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { AppDispatch } from '@/lib/store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  Loader2, 
  ChevronDown, 
  ChevronRight, 
  AlertTriangle, 
  Info, 
  Pill,
  FileText,
  RefreshCw,
  Target,
  Shield,
  Zap,
  Repeat,
  Atom,
  Siren,
  Package,
  Brain
} from 'lucide-react';
import { 
  selectDailyMedDetails,
  selectDailyMedSplListStatus,
  selectCurrentDrugNameQuery,
  fetchSplsFromDailyMedByName,
  selectAISummary,
  selectAISummaryStatus,
  selectAISummaryError,
  setAISummaryLoading,
  setAISummarySuccess,
  setAISummaryError,
  clearAISummary
} from '@/lib/store/slices/fdaDataSlice';
import { SkeletonCard } from '@/components/atoms/SkeletonLoader';
import { MarkdownRenderer } from '@/components/atoms/MarkdownRenderer';
import { 
  performEnhancedSplPrioritization, 
  type PrioritizationResult
} from '@/lib/utils/enhancedSplPrioritization';
import { type ClinicalSection } from '@/lib/utils/splContentProcessor';
import { AISummaryService } from '@/lib/services/aiSummaryService';
import { AISummaryCard } from '@/components/atoms/AISummaryCard';
import { ClinicalQuestionInterface } from '@/components/atoms/ClinicalQuestionInterface';

interface ClinicalDataDisplayProps {
  selectedDrug: {
    name: string;
    rxcui: string;
  } | null;
}

interface ClinicalDataState {
  prioritizationResult: PrioritizationResult | null;
  isProcessing: boolean;
  error: string | null;
  showDetailedView: boolean;
  activeTab: 'summary' | 'questions';
}

export function ClinicalDataDisplay({ selectedDrug }: ClinicalDataDisplayProps) {
  const dispatch = useDispatch<AppDispatch>();
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});
  const [clinicalData, setClinicalData] = useState<ClinicalDataState>({
    prioritizationResult: null,
    isProcessing: false,
    error: null,
    showDetailedView: false,
    activeTab: 'summary'
  });

  // Redux selectors
  const dailyMedDetails = useSelector(selectDailyMedDetails);
  const splListStatus = useSelector(selectDailyMedSplListStatus);
  const currentDrugQuery = useSelector(selectCurrentDrugNameQuery);
  const aiSummary = useSelector(selectAISummary);
  const aiSummaryStatus = useSelector(selectAISummaryStatus);
  const aiSummaryError = useSelector(selectAISummaryError);

  // Auto-fetch SPL data when drug is selected
  useEffect(() => {
    if (selectedDrug?.name && selectedDrug.name !== currentDrugQuery) {
      console.log(`[ClinicalDataDisplay] Fetching SPL data for: ${selectedDrug.name}`);
      dispatch(fetchSplsFromDailyMedByName(selectedDrug.name));
      dispatch(clearAISummary()); // Clear previous AI summary
    }
  }, [selectedDrug?.name, currentDrugQuery, dispatch]);

  // Process SPL data with enhanced prioritization when available
  useEffect(() => {
    const processEnhancedPrioritization = async () => {
      if (Object.keys(dailyMedDetails).length === 0) return;
      
      // Check if we have successful SPL details to process
      const hasSuccessfulSpls = Object.values(dailyMedDetails).some(
        detail => detail.status === 'succeeded' && detail.data?.xml_content
      );
      
      if (!hasSuccessfulSpls) return;
      
      setClinicalData(prev => ({ ...prev, isProcessing: true, error: null }));
      
      try {
        const result = await performEnhancedSplPrioritization(dailyMedDetails);
        setClinicalData(prev => ({
          ...prev,
          prioritizationResult: result,
          isProcessing: false,
          error: null
        }));
        
        // Generate AI summary if we have results
        if (result && selectedDrug?.name) {
          generateAISummary(result, selectedDrug.name);
        }
      } catch (error) {
        console.error('[ClinicalDataDisplay] Error in enhanced prioritization:', error);
        setClinicalData(prev => ({
          ...prev,
          prioritizationResult: null,
          isProcessing: false,
          error: 'Failed to process clinical data'
        }));
      }
    };
    
    processEnhancedPrioritization();
  }, [dailyMedDetails, selectedDrug?.name, dispatch]);
  
  // Generate AI summary function
  const generateAISummary = async (prioritizationResult: PrioritizationResult, drugName: string) => {
    dispatch(setAISummaryLoading());
    
    try {
      // Get all SPLs from all dosage forms
      const allSpls = Object.values(prioritizationResult.prioritized_by_form);
      const summary = await AISummaryService.generateClinicalSummary(allSpls, drugName);
      
      dispatch(setAISummarySuccess(summary));
    } catch (error) {
      console.error('[ClinicalDataDisplay] Error generating AI summary:', error);
      dispatch(setAISummaryError('Failed to generate AI summary'));
    }
  };
  
  // Toggle between summary and detailed view
  const toggleDetailedView = () => {
    setClinicalData(prev => ({ ...prev, showDetailedView: !prev.showDetailedView }));
  };
  
  // Retry AI summary generation
  const retryAISummary = () => {
    if (clinicalData.prioritizationResult && selectedDrug?.name) {
      generateAISummary(clinicalData.prioritizationResult, selectedDrug.name);
    }
  };
  
  // Handle clinical questions
  const handleClinicalQuestion = async (question: string): Promise<string> => {
    if (!clinicalData.prioritizationResult || !selectedDrug?.name) {
      throw new Error('No clinical data available');
    }
    
    const allSpls = Object.values(clinicalData.prioritizationResult.prioritized_by_form);
    const answer = await AISummaryService.answerClinicalQuestion(
      allSpls,
      selectedDrug.name,
      question
    );
    
    return answer;
  };

  const toggleSection = (sectionId: string) => {
    setOpenSections(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId]
    }));
  };
  
  // Get all clinical sections from all dosage forms
  const getAllClinicalSections = (): ClinicalSection[] => {
    if (!clinicalData.prioritizationResult) return [];
    
    const sectionMap = new Map<string, ClinicalSection>();
    
    // Consolidate sections from all dosage forms
    Object.values(clinicalData.prioritizationResult.prioritized_by_form).forEach(formData => {
      formData.consolidated_sections.forEach(section => {
        const existing = sectionMap.get(section.id);
        if (!existing || section.confidence > existing.confidence) {
          sectionMap.set(section.id, section);
        }
      });
    });
    
    return Array.from(sectionMap.values()).sort((a, b) => a.priority - b.priority);
  };

  const handleRetryFetch = () => {
    if (selectedDrug?.name) {
      dispatch(fetchSplsFromDailyMedByName(selectedDrug.name));
    }
  };

  // Get icon for clinical section
  const getSectionIcon = (sectionId: string) => {
    const iconMap: Record<string, React.ReactNode> = {
      'indications': <Target className="w-4 h-4" />,
      'dosage': <Pill className="w-4 h-4" />,
      'contraindications': <AlertTriangle className="w-4 h-4" />,
      'warnings': <Shield className="w-4 h-4" />,
      'adverse': <Zap className="w-4 h-4" />,
      'interactions': <Repeat className="w-4 h-4" />,
      'pharmacology': <Atom className="w-4 h-4" />,
      'overdosage': <Siren className="w-4 h-4" />,
      'storage': <Package className="w-4 h-4" />
    };
    return iconMap[sectionId] || <Info className="w-4 h-4" />;
  };
  

  const isLoading = splListStatus === 'loading' || clinicalData.isProcessing;
  const hasError = splListStatus === 'failed' || clinicalData.error !== null;
  const hasSplData = clinicalData.prioritizationResult && Object.keys(clinicalData.prioritizationResult.prioritized_by_form).length > 0;
  const clinicalSections = getAllClinicalSections();

  if (!selectedDrug) {
    return (
      <div className="text-center py-12 text-gray-500">
        <FileText className="w-16 h-16 mx-auto mb-4 text-gray-300" />
        <h4 className="text-lg font-medium mb-2">No Drug Selected</h4>
        <p>Select a drug to view clinical data and SPL information.</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-blue-600 mb-4">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-sm">Loading clinical data from DailyMed...</span>
        </div>
        <SkeletonCard />
        <div className="grid md:grid-cols-2 gap-4">
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </div>
    );
  }

  if (hasError) {
    return (
      <div className="text-center py-8 p-6 border border-red-200 rounded-lg bg-red-50">
        <AlertTriangle className="w-12 h-12 mx-auto mb-3 text-red-400" />
        <h4 className="text-lg font-medium text-red-800 mb-2">Clinical Data Unavailable</h4>
        <p className="text-red-700 mb-4">
          Unable to load clinical data for {selectedDrug.name} from DailyMed.
        </p>
        <Button
          onClick={handleRetryFetch}
          variant="outline"
          className="border-red-300 text-red-700 hover:bg-red-100"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Try Again
        </Button>
      </div>
    );
  }

  if (!hasSplData) {
    return (
      <div className="text-center py-12 text-gray-500">
        <FileText className="w-16 h-16 mx-auto mb-4 text-gray-300" />
        <h4 className="text-lg font-medium mb-2">No Clinical Data Available</h4>
        <p className="mb-4">No DailyMed SPL data is available for {selectedDrug.name}.</p>
        <Button
          onClick={handleRetryFetch}
          variant="outline"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Search Again
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* AI Clinical Assistant - Tabs for Summary and Q&A */}
      {!clinicalData.showDetailedView && hasSplData && (
        <Card className="border-blue-200">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Brain className="w-5 h-5 text-blue-600" />
              AI Clinical Assistant
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs 
              value={clinicalData.activeTab} 
              onValueChange={(value) => setClinicalData(prev => ({ ...prev, activeTab: value as 'summary' | 'questions' }))}
            >
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="summary">Summary</TabsTrigger>
                <TabsTrigger value="questions">Ask Questions</TabsTrigger>
              </TabsList>
              
              <TabsContent value="summary" className="mt-4">
                <AISummaryCard
                  summary={aiSummary}
                  isLoading={aiSummaryStatus === 'loading'}
                  error={aiSummaryError}
                  onRetry={retryAISummary}
                  onToggleDetails={toggleDetailedView}
                  showDetails={clinicalData.showDetailedView}
                  drugName={selectedDrug?.name}
                />
              </TabsContent>
              
              <TabsContent value="questions" className="mt-4">
                <ClinicalQuestionInterface
                  onAskQuestion={handleClinicalQuestion}
                  drugName={selectedDrug?.name}
                />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}

      {/* Show detailed view or summary stats based on toggle */}
      {clinicalData.showDetailedView && clinicalData.prioritizationResult && (
        <>
          {/* Enhanced Prioritization Stats */}
          <Card className="bg-gradient-to-r from-gray-50 to-gray-100 border-gray-200">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Detailed Clinical Data</CardTitle>
                <Button
                  onClick={toggleDetailedView}
                  variant="outline"
                  size="sm"
                >
                  Back to Summary
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-blue-600">
                    {Object.keys(clinicalData.prioritizationResult.prioritized_by_form).length}
                  </div>
                  <div className="text-xs text-blue-700">Dosage Forms</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-green-600">
                    {clinicalData.prioritizationResult.quality_distribution.high_quality}
                  </div>
                  <div className="text-xs text-green-700">High Quality SPLs</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-yellow-600">
                    {clinicalData.prioritizationResult.deduplication_stats.deduplicated_count}
                  </div>
                  <div className="text-xs text-yellow-700">Unique SPLs</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-purple-600">
                    {clinicalSections.length}
                  </div>
                  <div className="text-xs text-purple-700">Clinical Sections</div>
                </div>
              </div>
              <div className="mt-4 text-sm text-gray-600 text-center">
                Consolidated data from all {Object.keys(clinicalData.prioritizationResult.prioritized_by_form).length} dosage forms
              </div>
            </CardContent>
          </Card>

          {/* All Clinical Sections - No tabs, just a unified view */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">All Clinical Information</h3>
            {clinicalSections.map((section) => (
              <Card key={section.id}>
                <Collapsible
                  open={openSections[section.id]}
                  onOpenChange={() => toggleSection(section.id)}
                >
                  <CollapsibleTrigger asChild>
                    <CardHeader className="cursor-pointer hover:bg-gray-50 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-lg">{getSectionIcon(section.id)}</span>
                          <div>
                            <CardTitle className="text-base">{section.title}</CardTitle>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge 
                                variant={section.priority <= 3 ? 'destructive' : section.priority <= 6 ? 'default' : 'secondary'}
                                className="text-xs"
                              >
                                Priority {section.priority}
                              </Badge>
                              <Badge variant="outline" className="text-xs">
                                {Math.round(section.confidence * 100)}% confidence
                              </Badge>
                            </div>
                          </div>
                        </div>
                        {openSections[section.id] ? (
                          <ChevronDown className="w-4 h-4" />
                        ) : (
                          <ChevronRight className="w-4 h-4" />
                        )}
                      </div>
                    </CardHeader>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <CardContent className="pt-0">
                      <MarkdownRenderer
                        content={section.markdownContent}
                        source={section.source}
                        confidence={section.confidence}
                        lastUpdated={section.lastUpdated}
                        className="markdown-content"
                      />
                    </CardContent>
                  </CollapsibleContent>
                </Collapsible>
              </Card>
            ))}
          </div>

          {/* Enhanced SPL Source Information */}
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <Info className="w-5 h-5 text-blue-600 mt-0.5" />
                <div>
                  <h4 className="font-medium text-blue-900 mb-1">Data Sources</h4>
                  <p className="text-sm text-blue-800 mb-3">
                    Clinical data consolidated from {clinicalData.prioritizationResult.deduplication_stats.total_spls} SPL documents 
                    across {Object.keys(clinicalData.prioritizationResult.prioritized_by_form).length} dosage forms, 
                    with enhanced prioritization and quality scoring.
                  </p>
                  <div className="text-xs text-blue-700">
                    High Quality: {clinicalData.prioritizationResult.quality_distribution.high_quality} | 
                    Medium: {clinicalData.prioritizationResult.quality_distribution.medium_quality} | 
                    Low: {clinicalData.prioritizationResult.quality_distribution.low_quality}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}