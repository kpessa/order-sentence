import { DailyMedSplDetail } from '../store/slices/fdaDataSlice';
import { parseStringPromise, processors } from 'xml2js';

// Clinical section mapping based on LOINC codes used in SPLs
export const CLINICAL_SECTIONS = {
  'indications': {
    code: '34067-9',
    title: 'Indications & Usage',
    priority: 1,
    icon: '🎯'
  },
  'dosage': {
    code: '34068-7', 
    title: 'Dosage & Administration',
    priority: 2,
    icon: '💊'
  },
  'contraindications': {
    code: '34070-3',
    title: 'Contraindications', 
    priority: 3,
    icon: '⚠️'
  },
  'warnings': {
    code: '43685-7',
    title: 'Warnings & Precautions',
    priority: 4,
    icon: '🛡️'
  },
  'adverse': {
    code: '34084-4',
    title: 'Adverse Reactions',
    priority: 5,
    icon: '⚡'
  },
  'interactions': {
    code: '34073-7',
    title: 'Drug Interactions',
    priority: 6,
    icon: '🔄'
  },
  'pharmacology': {
    code: '34090-1',
    title: 'Clinical Pharmacology',
    priority: 7,
    icon: '🧬'
  },
  'overdosage': {
    code: '34088-5',
    title: 'Overdosage',
    priority: 8,
    icon: '🚨'
  },
  'storage': {
    code: '44425-7',
    title: 'Storage & Handling',
    priority: 9,
    icon: '📦'
  }
} as const;

export interface ClinicalSection {
  id: keyof typeof CLINICAL_SECTIONS;
  title: string;
  content: string;
  markdownContent: string;
  priority: number;
  icon: string;
  source: string;
  confidence: number;
  lastUpdated?: string;
}

export interface ProcessedSplData {
  spl_set_id: string;
  published_date: string;
  dosage_forms: string[];
  manufacturer?: string;
  brand_names: string[];
  generic_names: string[];
  clinical_sections: ClinicalSection[];
  quality_score: number;
  content_fingerprint: string;
  original_spl_detail: DailyMedSplDetail;
}

// Helper function to recursively extract text from XML nodes
const extractTextRecursively = (node: any): string => {
  if (!node) return '';
  let text = '';
  
  if (typeof node === 'string') return node + ' ';
  if (node._ && typeof node._ === 'string') text += node._ + ' ';

  for (const key in node) {
    if (['$', 'caption', 'footnote', 'footnoteRef'].includes(key)) continue;

    if (Array.isArray(node[key])) {
      node[key].forEach((childNode: any) => {
        text += extractTextRecursively(childNode);
      });
    } else if (typeof node[key] === 'object') {
      text += extractTextRecursively(node[key]);
    }
  }
  return text;
};

// Convert SPL text content to clean markdown
const convertToMarkdown = (rawText: string, sectionType: keyof typeof CLINICAL_SECTIONS): string => {
  if (!rawText) return '';
  
  let markdown = rawText
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/\n\s*\n\s*/g, '\n\n'); // Clean up extra whitespace

  // Special formatting for dosage sections
  if (sectionType === 'dosage') {
    // Convert dosing regimens to structured format
    markdown = markdown
      .replace(/(\d+(?:\.\d+)?\s*mg(?:\/kg)?(?:\/day)?)/gi, '**$1**') // Bold dosages
      .replace(/(once daily|twice daily|three times daily|four times daily|bid|tid|qid|q\d+h)/gi, '_$1_') // Italicize frequencies
      .replace(/(\d+\s*to\s*\d+\s*(?:mg|g|mL|units?))/gi, '**$1**'); // Bold dose ranges
  }

  // Convert bullet points and numbered lists
  markdown = markdown
    .replace(/•\s*/g, '- ') // Convert bullets to markdown lists
    .replace(/(?:^|\n)\s*(\d+)\.\s+/g, '\n$1. '); // Format numbered lists

  // Clean up table-like structures
  markdown = markdown
    .replace(/\t/g, ' | ') // Convert tabs to table separators
    .replace(/\s{3,}/g, ' | '); // Convert multiple spaces to table separators

  // Add proper line breaks for readability
  markdown = markdown
    .replace(/([.!?])\s+([A-Z])/g, '$1\n\n$2') // Add breaks between sentences starting with caps
    .replace(/:\s*([A-Z])/g, ':\n\n$1'); // Add breaks after colons

  return markdown.trim();
};

// Calculate content similarity using simple text comparison
const calculateContentSimilarity = (text1: string, text2: string): number => {
  if (!text1 || !text2) return 0;
  
  const normalize = (text: string) => text.toLowerCase().replace(/[^\w\s]/g, '').trim();
  const words1 = new Set(normalize(text1).split(/\s+/));
  const words2 = new Set(normalize(text2).split(/\s+/));
  
  const intersection = new Set([...words1].filter(word => words2.has(word)));
  const union = new Set([...words1, ...words2]);
  
  return intersection.size / union.size; // Jaccard similarity
};

// Generate content fingerprint for deduplication
const generateContentFingerprint = (sections: ClinicalSection[]): string => {
  const contentHash = sections
    .map(section => `${section.id}:${section.content.slice(0, 100)}`)
    .join('|');
  
  // Simple hash function (you could use a proper crypto hash here)
  let hash = 0;
  for (let i = 0; i < contentHash.length; i++) {
    const char = contentHash.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(36);
};

// Calculate quality score based on content completeness and structure
const calculateQualityScore = (sections: ClinicalSection[], dosageForms: string[]): number => {
  let score = 0;
  
  // Base score for having content
  score += sections.length * 10;
  
  // Bonus for critical sections
  const criticalSections = ['indications', 'dosage', 'contraindications', 'warnings'];
  const hasCriticalSections = criticalSections.filter(id => 
    sections.some(section => section.id === id)
  ).length;
  score += hasCriticalSections * 15;
  
  // Bonus for content length and structure
  sections.forEach(section => {
    const contentLength = section.content.length;
    if (contentLength > 100) score += 5;
    if (contentLength > 500) score += 10;
    if (contentLength > 1000) score += 15;
    
    // Check for structured content (lists, tables, etc.)
    if (section.content.includes('•') || section.content.includes('\t')) score += 5;
    if (section.markdownContent.includes('**') || section.markdownContent.includes('_')) score += 3;
  });
  
  // Bonus for multiple dosage forms
  score += Math.min(dosageForms.length * 5, 25);
  
  return Math.min(score, 100); // Cap at 100
};

/**
 * Enhanced SPL content processor that extracts all clinical sections
 * and converts them to well-formatted markdown
 */
export async function processEnhancedSplContent(
  splDetail: DailyMedSplDetail
): Promise<ProcessedSplData> {
  const defaultResult: ProcessedSplData = {
    spl_set_id: splDetail.spl_set_id,
    published_date: '',
    dosage_forms: [],
    brand_names: [],
    generic_names: [],
    clinical_sections: [],
    quality_score: 0,
    content_fingerprint: '',
    original_spl_detail: splDetail
  };

  if (!splDetail.xml_content) {
    console.warn(`[processEnhancedSplContent] No XML content for SPL ${splDetail.spl_set_id}`);
    return defaultResult;
  }

  try {
    const parsedXml = await parseStringPromise(splDetail.xml_content, {
      explicitArray: false,
      trim: true,
      charkey: '_',
      valueProcessors: [processors.parseNumbers, processors.parseBooleans],
      attrkey: '$',
    });

    let published_date = '';
    const dosage_forms: string[] = [];
    const brand_names: string[] = [];
    const generic_names: string[] = [];
    const clinical_sections: ClinicalSection[] = [];
    let manufacturer = '';

    if (!parsedXml.document) {
      console.warn(`[processEnhancedSplContent] No document structure found for SPL ${splDetail.spl_set_id}`);
      return defaultResult;
    }
    

    // Extract basic metadata
    if (parsedXml.document.effectiveTime) {
      published_date = parsedXml.document.effectiveTime.value || 
                      parsedXml.document.effectiveTime.$?.value || 
                      parsedXml.document.effectiveTime || '';
    }

    // Extract dosage forms from multiple locations
    const extractDosageFormsFromNode = (node: any, location: string) => {
      if (!node?.formCode) return;
      
      const formNodes = Array.isArray(node.formCode) ? node.formCode : [node.formCode];
      formNodes.forEach((formNode: any) => {
        // Handle different XML parsing formats
        let formName = null;
        
        // Check for displayName as attribute ($ notation from xml2js)
        if (formNode?.$?.displayName) {
          formName = formNode.$.displayName;
        }
        // Check for displayName as direct property
        else if (formNode?.displayName) {
          formName = typeof formNode.displayName === 'object' && formNode.displayName._
            ? formNode.displayName._
            : formNode.displayName;
        }
        
        if (formName && typeof formName === 'string') {
          dosage_forms.push(formName.toUpperCase());
        }
      });
    };

    // Check multiple paths for dosage forms and product info
    if (parsedXml.document.component?.manufacturedProduct?.manufacturedProduct) {
      extractDosageFormsFromNode(parsedXml.document.component.manufacturedProduct.manufacturedProduct, 'root');
      
      // Extract brand/generic names
      const product = parsedXml.document.component.manufacturedProduct.manufacturedProduct;
      if (product.name) {
        const nameNode = Array.isArray(product.name) ? product.name : [product.name];
        nameNode.forEach((name: any) => {
          if (name?._ || name) {
            const nameText = name._ || name;
            if (typeof nameText === 'string') {
              brand_names.push(nameText);
            }
          }
        });
      }
    }

    // Extract clinical sections from structured body
    if (parsedXml.document.component?.structuredBody?.component) {
      const sectionsOuter = Array.isArray(parsedXml.document.component.structuredBody.component)
        ? parsedXml.document.component.structuredBody.component
        : [parsedXml.document.component.structuredBody.component];

      for (const comp of sectionsOuter) {
        if (comp?.section) {
          const sectionDetails = Array.isArray(comp.section) ? comp.section : [comp.section];
          
          for (const section of sectionDetails) {
            // Check for clinical sections by LOINC code
            const sectionCode = section.$?.code;
            const sectionTitle = section.title?._ || section.title || '';
            
            // Find matching clinical section
            const matchingSection = Object.entries(CLINICAL_SECTIONS).find(([_, config]) => 
              config.code === sectionCode || 
              (typeof sectionTitle === 'string' && 
               sectionTitle.toLowerCase().includes(config.title.toLowerCase().split(' ')[0]))
            );

            if (matchingSection) {
              const [sectionId, sectionConfig] = matchingSection;
              
              // Extract content
              let rawContent = '';
              if (section.text) {
                rawContent = extractTextRecursively(section.text);
              }
              
              // Check for nested components
              if (section.component) {
                const components = Array.isArray(section.component) ? section.component : [section.component];
                components.forEach((subComp: any) => {
                  if (subComp.section?.text) {
                    rawContent += '\n\n' + extractTextRecursively(subComp.section.text);
                  }
                });
              }

              if (rawContent.trim()) {
                const markdownContent = convertToMarkdown(rawContent, sectionId as keyof typeof CLINICAL_SECTIONS);
                
                clinical_sections.push({
                  id: sectionId as keyof typeof CLINICAL_SECTIONS,
                  title: sectionConfig.title,
                  content: rawContent.trim(),
                  markdownContent,
                  priority: sectionConfig.priority,
                  icon: sectionConfig.icon,
                  source: `SPL:${splDetail.spl_set_id}`,
                  confidence: 0.9,
                  lastUpdated: published_date
                });
              }
            }

            // Continue checking for dosage forms in sections
            if (section.subject?.manufacturedProduct?.manufacturedProduct) {
              extractDosageFormsFromNode(section.subject.manufacturedProduct.manufacturedProduct, 'section');
            }
          }
        }
      }
    }

    // Remove duplicates and sort
    const uniqueDosageForms = Array.from(new Set(dosage_forms));
    const uniqueBrandNames = Array.from(new Set(brand_names));
    clinical_sections.sort((a, b) => a.priority - b.priority);

    // Calculate quality metrics
    const quality_score = calculateQualityScore(clinical_sections, uniqueDosageForms);
    const content_fingerprint = generateContentFingerprint(clinical_sections);

    console.log(`[processEnhancedSplContent] Processed SPL ${splDetail.spl_set_id}: ${clinical_sections.length} sections, quality: ${quality_score}`);

    return {
      spl_set_id: splDetail.spl_set_id,
      published_date: published_date || '',
      dosage_forms: uniqueDosageForms,
      manufacturer,
      brand_names: uniqueBrandNames,
      generic_names,
      clinical_sections,
      quality_score,
      content_fingerprint,
      original_spl_detail: splDetail
    };

  } catch (error) {
    console.error(`[processEnhancedSplContent] Error processing SPL ${splDetail.spl_set_id}:`, error);
    return defaultResult;
  }
}

/**
 * Detect and merge similar clinical sections to avoid duplication
 */
export function deduplicateClinicalSections(
  allProcessedSpls: ProcessedSplData[],
  similarityThreshold: number = 0.8
): ProcessedSplData[] {
  const sectionGroups: { [key: string]: ClinicalSection[] } = {};
  
  // Group sections by type
  allProcessedSpls.forEach(spl => {
    spl.clinical_sections.forEach(section => {
      const key = section.id;
      if (!sectionGroups[key]) sectionGroups[key] = [];
      sectionGroups[key].push(section);
    });
  });

  // Deduplicate within each section type
  Object.keys(sectionGroups).forEach(sectionType => {
    const sections = sectionGroups[sectionType];
    const uniqueSections: ClinicalSection[] = [];
    
    sections.forEach(section => {
      const existingSimilar = uniqueSections.find(existing => 
        calculateContentSimilarity(existing.content, section.content) > similarityThreshold
      );
      
      if (!existingSimilar) {
        uniqueSections.push(section);
      } else {
        // Merge with higher quality/confidence section
        if (section.confidence > existingSimilar.confidence) {
          const index = uniqueSections.indexOf(existingSimilar);
          uniqueSections[index] = section;
        }
      }
    });
    
    sectionGroups[sectionType] = uniqueSections;
  });

  // Rebuild SPL data with deduplicated sections
  return allProcessedSpls.map(spl => ({
    ...spl,
    clinical_sections: spl.clinical_sections.filter(section => 
      sectionGroups[section.id]?.includes(section)
    )
  }));
}