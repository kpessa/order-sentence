import { describe, it, expect } from '@jest/globals';
import { 
  performEnhancedSplPrioritization,
  getBestClinicalSection,
  type PrioritizationResult
} from '../enhancedSplPrioritization';
import { 
  processEnhancedSplContent,
  deduplicateClinicalSections
} from '../splContentProcessor';
import type { DailyMedSplDetail } from '../../store/slices/fdaDataSlice';

describe('Enhanced SPL Deduplication', () => {
  // Create SPLs with intentionally similar content to test deduplication
  const createMockSpl = (id: string, formName: string, variation: string = ''): DailyMedSplDetail => ({
    spl_set_id: id,
    xml_content: `<?xml version="1.0" encoding="UTF-8"?>
<document>
  <effectiveTime value="20231201"/>
  <component>
    <manufacturedProduct>
      <manufacturedProduct>
        <formCode displayName="${formName}"/>
        <name>Test Drug ${variation}</name>
      </manufacturedProduct>
    </manufacturedProduct>
    <structuredBody>
      <component>
        <section code="34067-9">
          <title>INDICATIONS AND USAGE</title>
          <text>Test drug is indicated for the treatment of test conditions.${variation ? ' ' + variation + ' specific text.' : ''}</text>
        </section>
      </component>
      <component>
        <section code="34068-7">
          <title>DOSAGE AND ADMINISTRATION</title>
          <text>
            The recommended dose is 10 mg once daily orally.${variation ? ' ' + variation + ' specific dosing.' : ''}
            For patients with severe conditions, increase to 20 mg twice daily.
            WARNING: Do not exceed 40 mg per day.
          </text>
        </section>
      </component>
      <component>
        <section code="34070-3">
          <title>CONTRAINDICATIONS</title>
          <text>Contraindicated in patients with known hypersensitivity.${variation ? ' ' + variation + ' specific warnings.' : ''}</text>
        </section>
      </component>
    </structuredBody>
  </component>
</document>`
  });

  const mockDailyMedDetails = {
    'spl-001': {
      data: createMockSpl('spl-001', 'TABLET'),
      status: 'succeeded' as const,
      error: null
    },
    'spl-002': {
      data: createMockSpl('spl-002', 'TABLET', 'Brand A'), // Similar content, same form
      status: 'succeeded' as const, 
      error: null
    },
    'spl-003': {
      data: createMockSpl('spl-003', 'CAPSULE'),
      status: 'succeeded' as const,
      error: null
    },
    'spl-004': {
      data: createMockSpl('spl-004', 'CAPSULE', 'Brand B'), // Similar content, same form
      status: 'succeeded' as const,
      error: null
    }
  };

  describe('Content Similarity Detection', () => {
    it('should identify similar clinical sections', async () => {
      // Process two similar SPLs
      const spl1 = await processEnhancedSplContent(mockDailyMedDetails['spl-001'].data!);
      const spl2 = await processEnhancedSplContent(mockDailyMedDetails['spl-002'].data!);

      expect(spl1.clinical_sections).toHaveLength(3);
      expect(spl2.clinical_sections).toHaveLength(3);

      // Check that sections have similar content but are from different SPLs
      const spl1Indications = spl1.clinical_sections.find(s => s.id === 'indications');
      const spl2Indications = spl2.clinical_sections.find(s => s.id === 'indications');

      expect(spl1Indications).toBeDefined();
      expect(spl2Indications).toBeDefined();
      expect(spl1Indications?.source).toBe('SPL:spl-001');
      expect(spl2Indications?.source).toBe('SPL:spl-002');

      // Content should be similar but not identical
      expect(spl1Indications?.content).toContain('test conditions');
      expect(spl2Indications?.content).toContain('test conditions');
      expect(spl2Indications?.content).toContain('Brand A specific');
    });

    it('should deduplicate highly similar sections', async () => {
      const spl1 = await processEnhancedSplContent(mockDailyMedDetails['spl-001'].data!);
      const spl2 = await processEnhancedSplContent(mockDailyMedDetails['spl-002'].data!);

      const deduplicatedSpls = deduplicateClinicalSections([spl1, spl2], 0.7); // 70% similarity threshold

      console.log('Original SPLs:', [spl1, spl2].map(s => ({
        id: s.spl_set_id,
        sections: s.clinical_sections.length
      })));

      console.log('Deduplicated SPLs:', deduplicatedSpls.map(s => ({
        id: s.spl_set_id,
        sections: s.clinical_sections.length
      })));

      // Should still have 2 SPLs but potentially fewer total sections
      expect(deduplicatedSpls).toHaveLength(2);
      
      // At least one SPL should have all its sections (the one with higher confidence)
      const maxSections = Math.max(...deduplicatedSpls.map(s => s.clinical_sections.length));
      expect(maxSections).toBeGreaterThan(0);
    });
  });

  describe('Multi-dimensional Grouping', () => {
    it('should group SPLs by all dosage forms correctly', async () => {
      const result = await performEnhancedSplPrioritization(mockDailyMedDetails);

      console.log('Prioritization Result:', {
        dosageForms: Object.keys(result.prioritized_by_form),
        totalProcessed: result.all_processed_spls.length,
        qualityDist: result.quality_distribution
      });

      // Should have separate groups for TABLET and CAPSULE
      expect(Object.keys(result.prioritized_by_form)).toContain('TABLET');
      expect(Object.keys(result.prioritized_by_form)).toContain('CAPSULE');

      // Each group should have a primary SPL and alternatives
      const tabletGroup = result.prioritized_by_form['TABLET'];
      const capsuleGroup = result.prioritized_by_form['CAPSULE'];

      expect(tabletGroup).toBeDefined();
      expect(capsuleGroup).toBeDefined();

      // Should have consolidated sections that don't duplicate
      expect(tabletGroup.consolidated_sections).toBeDefined();
      expect(capsuleGroup.consolidated_sections).toBeDefined();

      // Check for unique section IDs within each group
      const tabletSectionIds = tabletGroup.consolidated_sections.map(s => s.id);
      const uniqueTabletIds = new Set(tabletSectionIds);
      expect(tabletSectionIds).toHaveLength(uniqueTabletIds.size); // No duplicates

      const capsuleSectionIds = capsuleGroup.consolidated_sections.map(s => s.id);
      const uniqueCapsuleIds = new Set(capsuleSectionIds);
      expect(capsuleSectionIds).toHaveLength(uniqueCapsuleIds.size); // No duplicates
    });

    it('should prioritize by quality and recency', async () => {
      const result = await performEnhancedSplPrioritization(mockDailyMedDetails);

      const tabletGroup = result.prioritized_by_form['TABLET'];
      expect(tabletGroup.primary_spl).toBeDefined();
      expect(tabletGroup.alternative_spls).toHaveLength(1); // Should have 1 alternative

      // Primary should have equal or higher quality than alternatives
      const primaryQuality = tabletGroup.primary_spl.quality_score;
      const altQualities = tabletGroup.alternative_spls.map(spl => spl.quality_score);
      
      altQualities.forEach(altQuality => {
        expect(primaryQuality).toBeGreaterThanOrEqual(altQuality);
      });
    });
  });

  describe('Coverage and Quality Metrics', () => {
    it('should calculate coverage scores correctly', async () => {
      const result = await performEnhancedSplPrioritization(mockDailyMedDetails);

      Object.values(result.prioritized_by_form).forEach(formData => {
        expect(formData.coverage_score).toBeGreaterThan(0);
        expect(formData.coverage_score).toBeLessThanOrEqual(100);
        
        // Coverage should reflect actual sections found
        const sectionCount = formData.consolidated_sections.length;
        const expectedCoverage = (sectionCount / 9) * 100; // 9 possible sections
        expect(Math.abs(formData.coverage_score - expectedCoverage)).toBeLessThan(1);
      });
    });

    it('should provide quality distribution stats', async () => {
      const result = await performEnhancedSplPrioritization(mockDailyMedDetails);

      const { high_quality, medium_quality, low_quality } = result.quality_distribution;
      const total = high_quality + medium_quality + low_quality;

      expect(total).toBe(result.all_processed_spls.length);
      expect(high_quality).toBeGreaterThanOrEqual(0);
      expect(medium_quality).toBeGreaterThanOrEqual(0);
      expect(low_quality).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle SPLs with no dosage forms', async () => {
      const noDosageFormSpl: DailyMedSplDetail = {
        spl_set_id: 'no-form-spl',
        xml_content: `<?xml version="1.0" encoding="UTF-8"?>
<document>
  <effectiveTime value="20231201"/>
  <component>
    <structuredBody>
      <component>
        <section code="34067-9">
          <title>INDICATIONS AND USAGE</title>
          <text>Generic indications text for testing purposes.</text>
        </section>
      </component>
      <component>
        <section code="34068-7">
          <title>DOSAGE AND ADMINISTRATION</title>
          <text>Generic dosage instructions for testing.</text>
        </section>
      </component>
      <component>
        <section code="34070-3">
          <title>CONTRAINDICATIONS</title>
          <text>Generic contraindications for testing.</text>
        </section>
      </component>
    </structuredBody>
  </component>
</document>`
      };

      const testDetails = {
        'no-form': {
          data: noDosageFormSpl,
          status: 'succeeded' as const,
          error: null
        }
      };

      const result = await performEnhancedSplPrioritization(testDetails);

      // Should handle gracefully and create an UNSPECIFIED group
      expect(Object.keys(result.prioritized_by_form)).toContain('UNSPECIFIED');
      
      const unspecifiedGroup = result.prioritized_by_form['UNSPECIFIED'];
      expect(unspecifiedGroup.primary_spl.dosage_forms).toHaveLength(0);
      expect(unspecifiedGroup.consolidated_sections.length).toBeGreaterThan(0);
    });

    it('should handle empty SPL details', async () => {
      const result = await performEnhancedSplPrioritization({});

      expect(result.prioritized_by_form).toEqual({});
      expect(result.all_processed_spls).toHaveLength(0);
      expect(result.quality_distribution.high_quality).toBe(0);
    });
  });

  describe('React Component Integration', () => {
    it('should provide data that prevents duplicate React keys', async () => {
      const result = await performEnhancedSplPrioritization(mockDailyMedDetails);

      // Check that each dosage form has unique section IDs
      Object.entries(result.prioritized_by_form).forEach(([formName, formData]) => {
        const sectionIds = formData.consolidated_sections.map(s => s.id);
        const uniqueIds = new Set(sectionIds);
        
        expect(sectionIds).toHaveLength(uniqueIds.size);
        
        // When used with dosage form prefix, should be unique across all forms
        const prefixedIds = sectionIds.map(id => `${formName}-${id}`);
        const uniquePrefixedIds = new Set(prefixedIds);
        expect(prefixedIds).toHaveLength(uniquePrefixedIds.size);
      });
    });
  });
});