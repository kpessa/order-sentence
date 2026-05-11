'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  MessageSquare, 
  Send, 
  Loader2,
  AlertCircle,
  Baby,
  Users,
  Stethoscope,
  Pill,
  Shield,
  Package,
  Brain,
  Heart,
  Zap
} from 'lucide-react';

interface ClinicalQuestionInterfaceProps {
  onAskQuestion: (question: string) => Promise<string>;
  isLoading?: boolean;
  drugName?: string;
}

// Predefined clinical questions
const PREDEFINED_QUESTIONS = [
  {
    category: 'Dosing',
    icon: <Pill className="w-4 h-4" />,
    questions: [
      'What are all the available dosage forms and strengths?',
      'What is the standard adult dosing?',
      'Are there any extended-release formulations?',
      'What is the maximum daily dose?'
    ]
  },
  {
    category: 'Special Populations',
    icon: <Users className="w-4 h-4" />,
    questions: [
      'What are the dosing adjustments for renal impairment?',
      'What are the dosing adjustments for hepatic impairment?',
      'What is the pediatric dosing?',
      'Are there special considerations for geriatric patients?',
      'Can this be used during pregnancy or breastfeeding?'
    ]
  },
  {
    category: 'Safety',
    icon: <Shield className="w-4 h-4" />,
    questions: [
      'Does this have a black box warning?',
      'What are the major contraindications?',
      'What are the most common adverse reactions?',
      'What are the serious adverse reactions?'
    ]
  },
  {
    category: 'Drug Interactions',
    icon: <Zap className="w-4 h-4" />,
    questions: [
      'What are the major drug interactions?',
      'Are there any CYP450 interactions?',
      'What drugs should not be used concomitantly?'
    ]
  },
  {
    category: 'Storage & Administration',
    icon: <Package className="w-4 h-4" />,
    questions: [
      'What are the storage requirements?',
      'Does it need protection from light?',
      'Can tablets be crushed or capsules opened?',
      'Are there special administration instructions?'
    ]
  }
];

export function ClinicalQuestionInterface({
  onAskQuestion,
  isLoading = false,
  drugName
}: ClinicalQuestionInterfaceProps) {
  const [customQuestion, setCustomQuestion] = useState('');
  const [currentAnswer, setCurrentAnswer] = useState<string | null>(null);
  const [selectedQuestion, setSelectedQuestion] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleQuestionClick = async (question: string) => {
    setError(null);
    setSelectedQuestion(question);
    setCurrentAnswer(null);
    
    try {
      const answer = await onAskQuestion(question);
      setCurrentAnswer(answer);
    } catch (err) {
      setError('Failed to get answer. Please try again.');
      console.error('Error getting answer:', err);
    }
  };

  const handleCustomQuestionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customQuestion.trim()) return;
    
    await handleQuestionClick(customQuestion);
    setCustomQuestion('');
  };

  return (
    <div className="space-y-4">
      {/* Custom Question Input */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            Ask a Clinical Question
          </CardTitle>
          {drugName && (
            <CardDescription>
              Ask specific questions about {drugName}
            </CardDescription>
          )}
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCustomQuestionSubmit} className="flex gap-2">
            <Input
              value={customQuestion}
              onChange={(e) => setCustomQuestion(e.target.value)}
              placeholder="Type your clinical question..."
              disabled={isLoading}
              className="flex-1"
            />
            <Button 
              type="submit" 
              disabled={isLoading || !customQuestion.trim()}
              size="sm"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </form>

          {/* Predefined Questions */}
          <div className="mt-4 space-y-3">
            <p className="text-sm text-gray-600 font-medium">Common Questions:</p>
            {PREDEFINED_QUESTIONS.map((category) => (
              <div key={category.category} className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                  {category.icon}
                  <span>{category.category}</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {category.questions.map((question) => (
                    <Button
                      key={question}
                      onClick={() => handleQuestionClick(question)}
                      variant="outline"
                      size="sm"
                      disabled={isLoading}
                      className="text-xs h-auto py-1 px-2"
                    >
                      {question}
                    </Button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Answer Display */}
      {(selectedQuestion || currentAnswer || error) && (
        <Card className={error ? 'border-red-200' : 'border-blue-200'}>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Brain className="w-4 h-4 text-blue-600" />
              {selectedQuestion}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center gap-2 text-blue-600">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm">Analyzing clinical data...</span>
              </div>
            ) : error ? (
              <div className="flex items-center gap-2 text-red-600">
                <AlertCircle className="w-4 h-4" />
                <span className="text-sm">{error}</span>
              </div>
            ) : currentAnswer ? (
              <div className="prose prose-sm max-w-none">
                <p className="whitespace-pre-wrap">{currentAnswer}</p>
              </div>
            ) : null}
          </CardContent>
        </Card>
      )}
    </div>
  );
}