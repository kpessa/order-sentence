import { DailyMedSplDetail } from '../store/slices/fdaDataSlice';
import { 
  processEnhancedSplContent, 
  deduplicateClinicalSections, 
  ProcessedSplData, 
  ClinicalSection,
  CLINICAL_SECTIONS 
} from './splContentProcessor';

export interface EnhancedPrioritizedSpl {
  dosage_form: string;
  primary_spl: ProcessedSplData;
  alternative_spls: ProcessedSplData[];
  consolidated_sections: ClinicalSection[];
  coverage_score: number;
  last_updated: string;
}

export interface PrioritizationResult {
  prioritized_by_form: Record<string, EnhancedPrioritizedSpl>;
  all_processed_spls: ProcessedSplData[];
  deduplication_stats: {
    original_count: number;
    deduplicated_count: number;
    similarity_threshold: number;
  };
  quality_distribution: {
    high_quality: number; // 80-100
    medium_quality: number; // 50-79
    low_quality: number; // 0-49
  };
}

/**
 * Enhanced SPL prioritization that handles multi-dimensional grouping,
 * content deduplication, and quality scoring
 */
export async function performEnhancedSplPrioritization(
  dailyMedSplDetails: Record<
    string,
    { data?: DailyMedSplDetail; status: string; error?: string | null }
  >,
  options: {
    similarityThreshold?: number;
    maxAlternatives?: number;
    qualityThreshold?: number;
  } = {}
): Promise<PrioritizationResult> {
  const {
    similarityThreshold = 0.75,
    maxAlternatives = 3,
    qualityThreshold = 30
  } = options;

  console.log('[performEnhancedSplPrioritization] Starting enhanced prioritization with options:', options);

  // Extract successful SPL details
  const successfulSpls: DailyMedSplDetail[] = [];
  for (const setId in dailyMedSplDetails) {
    const detailEntry = dailyMedSplDetails[setId];
    if (detailEntry.status === 'succeeded' && detailEntry.data?.xml_content) {
      successfulSpls.push(detailEntry.data);
    }
  }

  if (successfulSpls.length === 0) {
    console.log('[performEnhancedSplPrioritization] No successful SPLs to process');
    return {
      prioritized_by_form: {},
      all_processed_spls: [],
      deduplication_stats: {
        original_count: 0,
        deduplicated_count: 0,
        similarity_threshold: similarityThreshold
      },
      quality_distribution: {
        high_quality: 0,
        medium_quality: 0,
        low_quality: 0
      }
    };
  }

  console.log(`[performEnhancedSplPrioritization] Processing ${successfulSpls.length} SPLs`);

  // Process all SPLs with enhanced content extraction
  const processedSpls: ProcessedSplData[] = await Promise.all(
    successfulSpls.map(spl => processEnhancedSplContent(spl))
  );

  // Filter out low-quality SPLs
  const qualityFilteredSpls = processedSpls.filter(spl => 
    spl.quality_score >= qualityThreshold
  );

  console.log(`[performEnhancedSplPrioritization] Filtered ${processedSpls.length} -> ${qualityFilteredSpls.length} SPLs based on quality threshold`);

  // Create multi-dimensional grouping by ALL dosage forms FIRST
  const dosageFormGroups: Record<string, ProcessedSplData[]> = {};

  qualityFilteredSpls.forEach(spl => {
    // Group by ALL dosage forms, not just the first one
    if (spl.dosage_forms.length === 0) {
      // Handle SPLs without explicit dosage forms
      const formKey = 'UNSPECIFIED';
      if (!dosageFormGroups[formKey]) dosageFormGroups[formKey] = [];
      dosageFormGroups[formKey].push(spl);
    } else {
      // Add to all relevant dosage form groups
      spl.dosage_forms.forEach(form => {
        const formKey = form.toUpperCase();
        if (!dosageFormGroups[formKey]) dosageFormGroups[formKey] = [];
        dosageFormGroups[formKey].push(spl);
      });
    }
  });

  console.log(`[performEnhancedSplPrioritization] Created ${Object.keys(dosageFormGroups).length} dosage form groups:`, 
    Object.keys(dosageFormGroups));

  // Prioritize within each dosage form group
  const prioritizedByForm: Record<string, EnhancedPrioritizedSpl> = {};
  let totalDeduplicatedCount = 0;

  for (const [dosageForm, spls] of Object.entries(dosageFormGroups)) {
    if (spls.length === 0) continue;

    // Deduplicate clinical sections within this dosage form group
    const deduplicatedSpls = deduplicateClinicalSections(spls, similarityThreshold);
    totalDeduplicatedCount += deduplicatedSpls.length;

    // Sort by composite score: quality (60%) + recency (40%)
    const scoredSpls = deduplicatedSpls.map(spl => {
      const qualityScore = spl.quality_score / 100; // Normalize to 0-1
      
      // Calculate recency score (more recent = higher score)
      let recencyScore = 0;
      if (spl.published_date) {
        try {
          const splDate = new Date(spl.published_date);
          const now = new Date();
          const ageInDays = (now.getTime() - splDate.getTime()) / (1000 * 60 * 60 * 24);
          // Score decreases with age, max 5 years (1825 days)
          recencyScore = Math.max(0, 1 - (ageInDays / 1825));
        } catch (error) {
          recencyScore = 0;
        }
      }

      const compositeScore = (qualityScore * 0.6) + (recencyScore * 0.4);
      
      return {
        spl,
        qualityScore,
        recencyScore,
        compositeScore
      };
    });

    // Sort by composite score (highest first)
    scoredSpls.sort((a, b) => b.compositeScore - a.compositeScore);

    const primarySpl = scoredSpls[0].spl;
    const alternativeSpls = scoredSpls
      .slice(1, maxAlternatives + 1)
      .map(scored => scored.spl);

    // Consolidate clinical sections from primary + alternatives
    const allSections: ClinicalSection[] = [];
    const seenSections = new Set<string>();

    // Add primary SPL sections first (check for duplicates within primary too)
    primarySpl.clinical_sections.forEach(section => {
      if (!seenSections.has(section.id)) {
        allSections.push(section);
        seenSections.add(section.id);
      }
    });

    // Add missing sections from alternatives
    alternativeSpls.forEach(altSpl => {
      altSpl.clinical_sections.forEach(section => {
        if (!seenSections.has(section.id)) {
          allSections.push({
            ...section,
            source: `ALT:${altSpl.spl_set_id}`,
            confidence: section.confidence * 0.8 // Slightly lower confidence for alternatives
          });
          seenSections.add(section.id);
        }
      });
    });

    // Calculate coverage score (percentage of possible clinical sections covered)
    const totalPossibleSections = Object.keys(CLINICAL_SECTIONS).length;
    const coverageScore = (allSections.length / totalPossibleSections) * 100;

    // Get the most recent update date
    const lastUpdated = [primarySpl, ...alternativeSpls]
      .map(spl => spl.published_date)
      .filter(date => date)
      .sort()
      .reverse()[0] || '';

    prioritizedByForm[dosageForm] = {
      dosage_form: dosageForm,
      primary_spl: primarySpl,
      alternative_spls: alternativeSpls,
      consolidated_sections: allSections.sort((a, b) => a.priority - b.priority),
      coverage_score: coverageScore,
      last_updated: lastUpdated
    };

    console.log(`[performEnhancedSplPrioritization] ${dosageForm}: Primary SPL ${primarySpl.spl_set_id} (quality: ${primarySpl.quality_score}), ${alternativeSpls.length} alternatives, ${allSections.length}/${totalPossibleSections} sections (${coverageScore.toFixed(1)}% coverage)`);
  }

  // Calculate quality distribution stats
  const qualityDistribution = {
    high_quality: processedSpls.filter(spl => spl.quality_score >= 80).length,
    medium_quality: processedSpls.filter(spl => spl.quality_score >= 50 && spl.quality_score < 80).length,
    low_quality: processedSpls.filter(spl => spl.quality_score < 50).length
  };

  const result: PrioritizationResult = {
    prioritized_by_form: prioritizedByForm,
    all_processed_spls: processedSpls,
    deduplication_stats: {
      original_count: processedSpls.length,
      deduplicated_count: totalDeduplicatedCount,
      similarity_threshold: similarityThreshold
    },
    quality_distribution: qualityDistribution
  };

  console.log('[performEnhancedSplPrioritization] Completed. Results:', {
    dosage_forms: Object.keys(prioritizedByForm).length,
    total_processed: processedSpls.length,
    quality_distribution: qualityDistribution,
    avg_coverage: Object.values(prioritizedByForm)
      .reduce((sum, data) => sum + data.coverage_score, 0) / Object.keys(prioritizedByForm).length
  });

  return result;
}

/**
 * Get the best clinical section for a specific type across all dosage forms
 */
export function getBestClinicalSection(
  prioritizationResult: PrioritizationResult,
  sectionId: keyof typeof CLINICAL_SECTIONS
): ClinicalSection | null {
  const candidates: ClinicalSection[] = [];
  
  Object.values(prioritizationResult.prioritized_by_form).forEach(formData => {
    const section = formData.consolidated_sections.find(s => s.id === sectionId);
    if (section) {
      candidates.push(section);
    }
  });

  if (candidates.length === 0) return null;

  // Return the section with highest confidence
  return candidates.sort((a, b) => b.confidence - a.confidence)[0];
}

/**
 * Get a comprehensive dosing summary across all dosage forms
 */
export function getComprehensiveDosingInfo(
  prioritizationResult: PrioritizationResult
): {
  dosage_forms: string[];
  dosing_sections: Array<{
    form: string;
    content: string;
    markdown: string;
    source: string;
  }>;
  combined_markdown: string;
} {
  const dosageForms = Object.keys(prioritizationResult.prioritized_by_form);
  const dosingSections: Array<{
    form: string;
    content: string;
    markdown: string;
    source: string;
  }> = [];

  dosageForms.forEach(form => {
    const formData = prioritizationResult.prioritized_by_form[form];
    const dosageSection = formData.consolidated_sections.find(s => s.id === 'dosage');
    
    if (dosageSection) {
      dosingSections.push({
        form,
        content: dosageSection.content,
        markdown: dosageSection.markdownContent,
        source: dosageSection.source
      });
    }
  });

  // Create combined markdown with proper formatting
  let combinedMarkdown = '# Dosage & Administration\n\n';
  
  if (dosingSections.length === 1) {
    combinedMarkdown += dosingSections[0].markdown;
  } else if (dosingSections.length > 1) {
    dosingSections.forEach(section => {
      combinedMarkdown += `## ${section.form}\n\n${section.markdown}\n\n`;
    });
  } else {
    combinedMarkdown += '_No dosing information available._\n';
  }

  return {
    dosage_forms: dosageForms,
    dosing_sections: dosingSections,
    combined_markdown: combinedMarkdown.trim()
  };
}