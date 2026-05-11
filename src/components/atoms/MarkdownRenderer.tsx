'use client';

import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import remarkEmoji from 'remark-emoji';
import rehypeHighlight from 'rehype-highlight';
import rehypeRaw from 'rehype-raw';
import rehypeSlug from 'rehype-slug';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneLight, oneDark } from 'react-syntax-highlighter/dist/cjs/styles/prism';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Clock, CheckCircle, AlertTriangle, Info, Copy, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MarkdownRendererProps {
  content: string;
  source?: string;
  confidence?: number;
  lastUpdated?: string;
  className?: string;
  darkMode?: boolean;
}

/**
 * Professional markdown renderer using react-markdown with clinical content highlighting
 */
export function MarkdownRenderer({ 
  content, 
  source, 
  confidence, 
  lastUpdated, 
  className = '',
  darkMode = false
}: MarkdownRendererProps) {
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const copyToClipboard = async (text: string, codeId: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedCode(codeId);
      setTimeout(() => setCopiedCode(null), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  const processContentForClinical = (text: string): string => {
    if (!text) return '';
    
    // Add clinical highlighting using HTML that will be processed by rehype-raw
    let processedText = text
      // Dosage highlighting
      .replace(
        /(\d+(?:\.\d+)?\s*(?:mg|g|mL|mcg|μg|units?|tablets?|capsules?|drops?|teaspoons?)(?:\/kg|\/m²|\/day|\/dose)?)/gi,
        '<mark class="dosage-highlight">$1</mark>'
      )
      // Frequency highlighting
      .replace(
        /(once daily|twice daily|three times daily|four times daily|bid|tid|qid|q\d+h|every \d+ hours?|daily|weekly|monthly)/gi,
        '<mark class="frequency-highlight">$1</mark>'
      )
      // Warning terms highlighting
      .replace(
        /(contraindicated|warning|caution|avoid|do not|should not|black box|boxed warning)/gi,
        '<mark class="warning-highlight">$1</mark>'
      )
      // Route highlighting
      .replace(
        /(orally|intravenously|intramuscularly|subcutaneously|topically|rectally|sublingual|buccal|intranasal)/gi,
        '<mark class="route-highlight">$1</mark>'
      );
    
    return processedText;
  };

  const customComponents = {
    code({ node, inline, className, children, ...props }: any) {
      const match = /language-(\w+)/.exec(className || '');
      const codeString = String(children).replace(/\n$/, '');
      const codeId = `code-${Math.random().toString(36).substr(2, 9)}`;
      
      if (!inline && match) {
        return (
          <div className="relative">
            <div className="flex items-center justify-between bg-gray-100 dark:bg-gray-800 px-4 py-2 text-sm rounded-t-lg">
              <span className="font-medium text-gray-700 dark:text-gray-300">
                {match[1]}
              </span>
              <Button
                size="sm"
                variant="ghost"
                className="h-6 px-2"
                onClick={() => copyToClipboard(codeString, codeId)}
              >
                {copiedCode === codeId ? (
                  <Check className="w-3 h-3" />
                ) : (
                  <Copy className="w-3 h-3" />
                )}
              </Button>
            </div>
            <SyntaxHighlighter
              style={darkMode ? oneDark : oneLight}
              language={match[1]}
              PreTag="div"
              className="!mt-0 !rounded-t-none"
              {...props}
            >
              {codeString}
            </SyntaxHighlighter>
          </div>
        );
      }
      
      return (
        <code 
          className={cn(
            "bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-sm font-mono",
            className
          )} 
          {...props}
        >
          {children}
        </code>
      );
    },
    
    table({ children, ...props }: any) {
      return (
        <div className="overflow-x-auto my-4">
          <table className="min-w-full border border-gray-300 dark:border-gray-600 rounded-lg" {...props}>
            {children}
          </table>
        </div>
      );
    },
    
    th({ children, ...props }: any) {
      return (
        <th 
          className="px-4 py-2 text-left text-sm font-semibold text-gray-900 dark:text-gray-100 bg-gray-50 dark:bg-gray-800 border-b border-gray-300 dark:border-gray-600" 
          {...props}
        >
          {children}
        </th>
      );
    },
    
    td({ children, ...props }: any) {
      return (
        <td 
          className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700" 
          {...props}
        >
          {children}
        </td>
      );
    },
    
    blockquote({ children, ...props }: any) {
      return (
        <blockquote 
          className="border-l-4 border-blue-500 bg-blue-50 dark:bg-blue-900/20 pl-4 py-2 my-4 italic" 
          {...props}
        >
          {children}
        </blockquote>
      );
    },
    
    mark({ children, className, ...props }: any) {
      const highlightClasses = {
        'dosage-highlight': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 px-1 py-0.5 rounded font-medium',
        'frequency-highlight': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 px-1 py-0.5 rounded font-medium',
        'warning-highlight': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 px-1 py-0.5 rounded font-medium',
        'route-highlight': 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200 px-1 py-0.5 rounded font-medium'
      };
      
      return (
        <mark 
          className={cn(
            highlightClasses[className as keyof typeof highlightClasses] || 'bg-yellow-100 text-yellow-800 px-1 py-0.5 rounded',
            className
          )} 
          {...props}
        >
          {children}
        </mark>
      );
    }
  };

  const getConfidenceColor = (conf: number = 0) => {
    if (conf >= 0.8) return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
    if (conf >= 0.6) return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
    return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
  };

  const getConfidenceIcon = (conf: number = 0) => {
    if (conf >= 0.8) return <CheckCircle className="w-3 h-3" />;
    if (conf >= 0.6) return <AlertTriangle className="w-3 h-3" />;
    return <Info className="w-3 h-3" />;
  };

  if (!content?.trim()) {
    return (
      <div className={cn('text-gray-500 italic py-4', className)}>
        No content available
      </div>
    );
  }

  return (
    <div className={cn('markdown-renderer', className)}>
      {/* Clinical highlighting styles */}
      <style jsx global>{`
        .markdown-renderer .prose {
          color: inherit;
        }
        .markdown-renderer .prose h1,
        .markdown-renderer .prose h2,
        .markdown-renderer .prose h3,
        .markdown-renderer .prose h4,
        .markdown-renderer .prose h5,
        .markdown-renderer .prose h6 {
          color: inherit;
          font-weight: 600;
          margin-top: 1.5rem;
          margin-bottom: 0.5rem;
        }
        .markdown-renderer .prose p {
          margin-top: 0.75rem;
          margin-bottom: 0.75rem;
        }
        .markdown-renderer .prose ul,
        .markdown-renderer .prose ol {
          margin-top: 0.75rem;
          margin-bottom: 0.75rem;
        }
        .markdown-renderer .prose li {
          margin-top: 0.25rem;
          margin-bottom: 0.25rem;
        }
      `}</style>
      
      {/* Content */}
      <div className="prose prose-sm max-w-none dark:prose-invert">
        <ReactMarkdown
          remarkPlugins={[remarkGfm, remarkMath, remarkEmoji]}
          rehypePlugins={[rehypeHighlight, rehypeRaw, rehypeSlug]}
          components={customComponents}
        >
          {processContentForClinical(content)}
        </ReactMarkdown>
      </div>

      {/* Metadata footer */}
      {(source || confidence !== undefined || lastUpdated) && (
        <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
            {source && (
              <div className="flex items-center gap-1">
                <Info className="w-3 h-3" />
                <span>Source: {source}</span>
              </div>
            )}
            
            {confidence !== undefined && (
              <Badge className={cn('text-xs', getConfidenceColor(confidence))}>
                {getConfidenceIcon(confidence)}
                <span className="ml-1">
                  {Math.round(confidence * 100)}% confidence
                </span>
              </Badge>
            )}
            
            {lastUpdated && (
              <div className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                <span>Updated: {new Date(lastUpdated).toLocaleDateString()}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Specialized dosage renderer with clinical formatting
 */
export function DosageRenderer({ 
  content, 
  dosageForms, 
  source, 
  className = '' 
}: {
  content: string;
  dosageForms?: string[];
  source?: string;
  className?: string;
}) {
  return (
    <Card className={className}>
      <CardContent className="p-6">
        {dosageForms && dosageForms.length > 1 && (
          <div className="mb-4">
            <div className="flex flex-wrap gap-2">
              {dosageForms.map(form => (
                <Badge key={form} variant="secondary" className="text-xs">
                  {form}
                </Badge>
              ))}
            </div>
          </div>
        )}
        
        <MarkdownRenderer 
          content={content}
          source={source}
          className="dosage-specific"
        />
      </CardContent>
    </Card>
  );
}

/**
 * Clinical section renderer with section-specific styling
 */
export function ClinicalSectionRenderer({
  title,
  content,
  icon,
  priority,
  source,
  confidence,
  lastUpdated,
  className = ''
}: {
  title: string;
  content: string;
  icon?: string;
  priority?: number;
  source?: string;
  confidence?: number;
  lastUpdated?: string;
  className?: string;
}) {
  const getPriorityColor = (pri: number = 0) => {
    if (pri <= 3) return 'border-l-red-500 bg-red-50 dark:bg-red-900/20';
    if (pri <= 6) return 'border-l-yellow-500 bg-yellow-50 dark:bg-yellow-900/20';
    return 'border-l-blue-500 bg-blue-50 dark:bg-blue-900/20';
  };

  return (
    <div className={cn('clinical-section border-l-4 p-4 rounded-r-lg', getPriorityColor(priority), className)}>
      <div className="flex items-center gap-2 mb-3">
        {icon && <span className="text-lg">{icon}</span>}
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{title}</h3>
        {priority && priority <= 3 && (
          <Badge variant="destructive" className="text-xs">High Priority</Badge>
        )}
      </div>
      
      <MarkdownRenderer
        content={content}
        source={source}
        confidence={confidence}
        lastUpdated={lastUpdated}
      />
    </div>
  );
}