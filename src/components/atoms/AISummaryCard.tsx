'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Brain, 
  Sparkles, 
  AlertCircle,
  Loader2,
  RefreshCw,
  Eye,
  EyeOff
} from 'lucide-react';
import { ClinicalSummary } from '@/lib/services/aiSummaryService';

interface AISummaryCardProps {
  summary: ClinicalSummary | null;
  isLoading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  onToggleDetails?: () => void;
  showDetails?: boolean;
  drugName?: string;
}

export function AISummaryCard({
  summary,
  isLoading = false,
  error = null,
  onRetry,
  onToggleDetails,
  showDetails = false,
  drugName
}: AISummaryCardProps) {

  if (isLoading) {
    return (
      <Card className="border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-blue-600 animate-pulse" />
            <CardTitle className="text-lg">AI Clinical Summary</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3 text-blue-600">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm">Analyzing clinical data...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-600" />
              <CardTitle className="text-lg text-red-800">Summary Unavailable</CardTitle>
            </div>
            {onRetry && (
              <Button
                onClick={onRetry}
                variant="outline"
                size="sm"
                className="border-red-300 text-red-700 hover:bg-red-100"
              >
                <RefreshCw className="w-3 h-3 mr-1" />
                Retry
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-red-700">{error}</p>
        </CardContent>
      </Card>
    );
  }

  if (!summary) {
    return null;
  }

  return (
    <Card className="border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50 shadow-lg">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Brain className="w-5 h-5 text-blue-600" />
              <CardTitle className="text-lg">AI Clinical Summary</CardTitle>
              <Badge variant="secondary" className="text-xs">
                <Sparkles className="w-3 h-3 mr-1" />
                AI Generated
              </Badge>
            </div>
            {drugName && (
              <CardDescription className="text-sm text-blue-700">
                Concise summary for {drugName}
              </CardDescription>
            )}
          </div>
          <div className="flex gap-2">
            {onToggleDetails && (
              <Button
                onClick={onToggleDetails}
                variant="outline"
                size="sm"
                className="border-blue-300 text-blue-700 hover:bg-blue-100"
              >
                {showDetails ? (
                  <>
                    <Eye className="w-3 h-3 mr-1" />
                    Summary View
                  </>
                ) : (
                  <>
                    <EyeOff className="w-3 h-3 mr-1" />
                    Detailed View
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Simple Summary */}
        <div className="prose prose-sm max-w-none">
          <p className="text-gray-800 leading-relaxed whitespace-pre-wrap">{summary.overallSummary}</p>
        </div>

        {/* Key Points - Only if they exist */}
        {summary.keyPoints && summary.keyPoints.length > 0 && (
          <div className="border-t pt-3 space-y-2">
            <h4 className="font-medium text-sm text-gray-700 flex items-center gap-1">
              <AlertCircle className="w-4 h-4" />
              Additional Notes
            </h4>
            <ul className="space-y-1">
              {summary.keyPoints.slice(0, 3).map((point, index) => (
                <li key={index} className="flex items-start gap-2 text-sm text-gray-600">
                  <span className="text-blue-500 mt-0.5">•</span>
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}