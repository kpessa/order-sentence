import { ClinicalSection } from '@/lib/utils/splContentProcessor';
import { EnhancedPrioritizedSpl } from '@/lib/utils/enhancedSplPrioritization';

export interface AISummaryRequest {
  content: string;
  type?: 'clinical' | 'general' | 'question';
  maxLength?: number;
  question?: string;
}

export interface AISummaryResponse {
  summary: string;
  model: string;
  timestamp: string;
}

export interface ClinicalSummary {
  overallSummary: string;
  sectionSummaries: Record<string, string>;
  keyPoints: string[];
  timestamp: string;
}

export class AISummaryService {
  private static cache = new Map<string, { summary: ClinicalSummary; expiry: number }>();
  private static CACHE_DURATION = 1000 * 60 * 60; // 1 hour

  /**
   * Generate a comprehensive summary for clinical data
   */
  static async generateClinicalSummary(
    spls: EnhancedPrioritizedSpl[],
    drugName: string
  ): Promise<ClinicalSummary> {
    const cacheKey = `${drugName}-${spls.map(s => s.primary_spl.spl_set_id).join('-')}`;
    
    // Check cache first
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    try {
      // Consolidate all clinical sections from all SPLs
      const allSections = this.consolidateClinicalSections(spls);
      
      // Prepare comprehensive content with focus on key clinical information
      const comprehensiveContent = this.prepareComprehensiveContent(allSections, spls, drugName);
      
      // Generate overall summary with enhanced prompt
      const overallSummary = await this.callSummarizeAPI({
        content: comprehensiveContent,
        type: 'clinical',
        maxLength: 800
      });

      // Skip section-specific summaries for simpler output
      const sectionSummaries: Record<string, string> = {};

      // Extract enhanced key points
      const keyPoints = this.extractEnhancedKeyPoints(allSections, spls);

      const result: ClinicalSummary = {
        overallSummary: overallSummary.summary,
        sectionSummaries,
        keyPoints,
        timestamp: new Date().toISOString()
      };

      // Cache the result
      this.setCache(cacheKey, result);

      return result;
    } catch (error) {
      console.error('Error generating clinical summary:', error);
      throw error;
    }
  }

  /**
   * Generate a summary for a specific clinical section
   */
  static async generateSectionSummary(
    section: ClinicalSection,
    maxLength = 200
  ): Promise<string> {
    try {
      const response = await this.callSummarizeAPI({
        content: section.content,
        type: 'clinical',
        maxLength
      });
      return response.summary;
    } catch (error) {
      console.error(`Error summarizing section ${section.id}:`, error);
      return ''; // Return empty string on error
    }
  }

  /**
   * Answer a specific clinical question about the drug
   */
  static async answerClinicalQuestion(
    spls: EnhancedPrioritizedSpl[],
    drugName: string,
    question: string
  ): Promise<string> {
    try {
      // Consolidate all clinical sections
      const allSections = this.consolidateClinicalSections(spls);
      
      // Prepare comprehensive content for the question
      const comprehensiveContent = this.prepareComprehensiveContent(allSections, spls, drugName);
      
      // Call API with question type
      const response = await this.callSummarizeAPI({
        content: comprehensiveContent,
        type: 'question',
        question: question,
        maxLength: 1000 // Allow longer responses for questions
      });
      
      return response.summary;
    } catch (error) {
      console.error('Error answering clinical question:', error);
      throw error;
    }
  }

  /**
   * Call the summarize API endpoint
   */
  private static async callSummarizeAPI(request: AISummaryRequest): Promise<AISummaryResponse> {
    const response = await fetch('/api/summarize', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to generate summary');
    }

    return response.json();
  }

  /**
   * Consolidate clinical sections from multiple SPLs
   */
  private static consolidateClinicalSections(spls: EnhancedPrioritizedSpl[]): ClinicalSection[] {
    const sectionMap = new Map<string, ClinicalSection>();

    for (const spl of spls) {
      for (const section of spl.consolidated_sections) {
        const existing = sectionMap.get(section.id);
        if (!existing || section.confidence > existing.confidence) {
          sectionMap.set(section.id, section);
        }
      }
    }

    return Array.from(sectionMap.values()).sort((a, b) => a.priority - b.priority);
  }

  /**
   * Prepare comprehensive content for AI processing
   */
  private static prepareComprehensiveContent(
    sections: ClinicalSection[], 
    spls: EnhancedPrioritizedSpl[],
    drugName: string
  ): string {
    let content = `Drug: ${drugName}\n\n`;
    
    // Include all dosage forms found
    const dosageForms = spls.map(spl => spl.dosage_form).filter(Boolean);
    if (dosageForms.length > 0) {
      content += `Available Dosage Forms: ${[...new Set(dosageForms)].join(', ')}\n\n`;
    }
    
    // Critical sections that need full content
    const criticalSections = ['dosage', 'dosage_forms_and_strengths', 'how_supplied'];
    const importantSections = ['indications', 'contraindications', 'warnings', 'adverse', 'drug_interactions'];
    const specialPopulationSections = ['use_in_specific_populations', 'pediatric_use', 'geriatric_use'];
    
    // Add critical sections with full content
    content += "=== DOSING AND FORMULATION INFORMATION ===\n";
    for (const sectionId of criticalSections) {
      const section = sections.find(s => s.id === sectionId);
      if (section && section.content) {
        content += `\n${section.title.toUpperCase()}:\n`;
        // Include full content for dosing sections (up to 5000 chars)
        content += section.content.substring(0, 5000);
        if (section.content.length > 5000) content += '...';
        content += '\n\n';
      }
    }
    
    // Add important clinical sections
    content += "\n=== KEY CLINICAL INFORMATION ===\n";
    for (const sectionId of importantSections) {
      const section = sections.find(s => s.id === sectionId);
      if (section && section.content) {
        content += `\n${section.title.toUpperCase()}:\n`;
        // Include substantial content (up to 2000 chars)
        content += section.content.substring(0, 2000);
        if (section.content.length > 2000) content += '...';
        content += '\n\n';
      }
    }
    
    // Add special populations
    content += "\n=== SPECIAL POPULATIONS ===\n";
    for (const sectionId of specialPopulationSections) {
      const section = sections.find(s => s.id === sectionId);
      if (section && section.content) {
        content += `\n${section.title}:\n`;
        content += section.content.substring(0, 1500);
        if (section.content.length > 1500) content += '...';
        content += '\n\n';
      }
    }
    
    // Add storage information if available
    const storageSection = sections.find(s => s.id === 'storage');
    if (storageSection && storageSection.content) {
      content += `\n=== STORAGE ===\n${storageSection.content.substring(0, 500)}\n\n`;
    }
    
    return content;
  }

  /**
   * Extract enhanced key points from clinical sections
   */
  private static extractEnhancedKeyPoints(sections: ClinicalSection[], spls: EnhancedPrioritizedSpl[]): string[] {
    const keyPoints: string[] = [];

    // Check for extended-release or special formulations
    const dosageForms = spls.map(spl => spl.dosage_form).filter(Boolean);
    const hasExtendedRelease = dosageForms.some(form => 
      form.toLowerCase().includes('extended') || 
      form.toLowerCase().includes('sustained') ||
      form.toLowerCase().includes('modified')
    );
    if (hasExtendedRelease) {
      keyPoints.push('Available in extended-release formulation');
    }

    // Check for Black Box Warning
    const warningsSection = sections.find(s => s.id === 'warnings' || s.id === 'boxed_warning');
    if (warningsSection && (warningsSection.content.includes('Black Box') || warningsSection.content.includes('BLACK BOX'))) {
      keyPoints.push('Contains FDA Black Box Warning');
    }

    // Extract primary indication
    const indicationsSection = sections.find(s => s.id === 'indications');
    if (indicationsSection) {
      const firstSentence = this.extractFirstSentence(indicationsSection.content);
      if (firstSentence) {
        keyPoints.push(`Primary indication: ${firstSentence}`);
      }
    }

    // Check for special storage requirements
    const storageSection = sections.find(s => s.id === 'storage' || s.id === 'storage_and_handling');
    if (storageSection) {
      if (storageSection.content.toLowerCase().includes('light')) {
        keyPoints.push('Protect from light');
      }
      if (storageSection.content.toLowerCase().includes('refrigerat')) {
        keyPoints.push('Requires refrigeration');
      }
    }

    // Check for special population considerations
    const specialPopSection = sections.find(s => s.id === 'use_in_specific_populations');
    if (specialPopSection) {
      if (specialPopSection.content.toLowerCase().includes('renal impairment')) {
        keyPoints.push('Dose adjustment for renal impairment');
      }
      if (specialPopSection.content.toLowerCase().includes('hepatic impairment')) {
        keyPoints.push('Dose adjustment for hepatic impairment');
      }
    }

    // Check dosage section for multiple strengths
    const dosageSection = sections.find(s => s.id === 'dosage_forms_and_strengths' || s.id === 'how_supplied');
    if (dosageSection) {
      const strengthMatches = dosageSection.content.match(/\d+\s*mg/gi);
      if (strengthMatches && strengthMatches.length > 2) {
        keyPoints.push(`Available in multiple strengths: ${[...new Set(strengthMatches)].slice(0, 5).join(', ')}`);
      }
    }

    return keyPoints.slice(0, 8); // Allow more key points
  }

  /**
   * Extract the first sentence from content
   */
  private static extractFirstSentence(content: string): string {
    const match = content.match(/^[^.!?]+[.!?]/);
    return match ? match[0].trim() : content.substring(0, 100) + '...';
  }

  /**
   * Get from cache if not expired
   */
  private static getFromCache(key: string): ClinicalSummary | null {
    const cached = this.cache.get(key);
    if (cached && cached.expiry > Date.now()) {
      return cached.summary;
    }
    this.cache.delete(key);
    return null;
  }

  /**
   * Set cache with expiry
   */
  private static setCache(key: string, summary: ClinicalSummary): void {
    this.cache.set(key, {
      summary,
      expiry: Date.now() + this.CACHE_DURATION
    });
  }

  /**
   * Clear all cached summaries
   */
  static clearCache(): void {
    this.cache.clear();
  }
}