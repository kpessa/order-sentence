import { performEnhancedSplPrioritization, PrioritizationResult } from '../enhancedSplPrioritization';
import { ProcessedSplData } from '../splContentProcessor';
import { DailyMedSplDetail } from '@/lib/store/slices/fdaDataSlice';

describe('enhancedSplPrioritization', () => {
  // Helper function to create mock SPL data
  const createMockSpl = (
    setId: string,
    dosageForms: string[],
    sections: Array<{ id: string; title: string; content: string }>,
    quality: Partial<ProcessedSplData['quality']> = {}
  ): ProcessedSplData => ({
    setId,
    title: `Mock SPL ${setId}`,
    dosageForms,
    sections,
    quality: {
      score: 0.8,
      hasStructuredDosing: true,
      hasContraindications: true,
      hasWarnings: true,
      hasDrugInteractions: true,
      hasAdverseReactions: true,
      contentCompleteness: 0.9,
      ...quality,
    },
    metadata: {
      effectiveDate: '2024-01-01',
      versionNumber: '1',
    },
  });

  describe('Multi-dimensional grouping', () => {
    it('should group SPLs by dosage forms', () => {
      const spls: ProcessedSplData[] = [
        createMockSpl('spl1', ['TABLET'], [
          { id: 'dosage-1', title: 'Dosage and Administration', content: 'Take 1 tablet daily' },
        ]),
        createMockSpl('spl2', ['CAPSULE'], [
          { id: 'dosage-2', title: 'Dosage and Administration', content: 'Take 1 capsule daily' },
        ]),
        createMockSpl('spl3', ['TABLET'], [
          { id: 'dosage-3', title: 'Dosage and Administration', content: 'Take 2 tablets daily' },
        ]),
      ];

      const result = enhancedSplPrioritization(spls);

      expect(Object.keys(result)).toHaveLength(2);
      expect(result['TABLET']).toBeDefined();
      expect(result['CAPSULE']).toBeDefined();
      expect(result['TABLET'].primarySplSetId).toBe('spl1');
      expect(result['CAPSULE'].primarySplSetId).toBe('spl2');
    });

    it('should handle SPLs with multiple dosage forms', () => {
      const spls: ProcessedSplData[] = [
        createMockSpl('spl1', ['TABLET', 'CAPSULE'], [
          { id: 'dosage-1', title: 'Dosage and Administration', content: 'Tablet: Take 1 daily\nCapsule: Take 2 daily' },
        ]),
      ];

      const result = enhancedSplPrioritization(spls);

      expect(Object.keys(result)).toHaveLength(2);
      expect(result['TABLET']).toBeDefined();
      expect(result['CAPSULE']).toBeDefined();
      expect(result['TABLET'].primarySplSetId).toBe('spl1');
      expect(result['CAPSULE'].primarySplSetId).toBe('spl1');
    });

    it('should create UNSPECIFIED group for SPLs without dosage forms', () => {
      const spls: ProcessedSplData[] = [
        createMockSpl('spl1', [], [
          { id: 'dosage-1', title: 'Dosage and Administration', content: 'Take as directed' },
        ]),
      ];

      const result = enhancedSplPrioritization(spls);

      expect(Object.keys(result)).toHaveLength(1);
      expect(result['UNSPECIFIED']).toBeDefined();
      expect(result['UNSPECIFIED'].primarySplSetId).toBe('spl1');
    });
  });

  describe('Quality-based prioritization', () => {
    it('should select highest quality SPL as primary', () => {
      const spls: ProcessedSplData[] = [
        createMockSpl('spl1', ['TABLET'], [
          { id: 'dosage-1', title: 'Dosage and Administration', content: 'Basic dosing' },
        ], { score: 0.5 }),
        createMockSpl('spl2', ['TABLET'], [
          { id: 'dosage-2', title: 'Dosage and Administration', content: 'Detailed dosing' },
        ], { score: 0.9 }),
        createMockSpl('spl3', ['TABLET'], [
          { id: 'dosage-3', title: 'Dosage and Administration', content: 'Simple dosing' },
        ], { score: 0.7 }),
      ];

      const result = enhancedSplPrioritization(spls);

      expect(result['TABLET'].primarySplSetId).toBe('spl2');
      expect(result['TABLET'].quality.score).toBe(0.9);
    });

    it('should calculate coverage based on contributing SPLs', () => {
      const spls: ProcessedSplData[] = [
        createMockSpl('spl1', ['TABLET'], [
          { id: 'dosage-1', title: 'Dosage and Administration', content: 'Dosing info' },
          { id: 'warnings-1', title: 'Warnings', content: 'Warning info' },
        ]),
        createMockSpl('spl2', ['TABLET'], [
          { id: 'contraindications-1', title: 'Contraindications', content: 'Contraindication info' },
          { id: 'interactions-1', title: 'Drug Interactions', content: 'Interaction info' },
        ]),
      ];

      const result = enhancedSplPrioritization(spls);

      expect(result['TABLET'].quality.coverage).toBeGreaterThan(0);
      expect(result['TABLET'].contributingSplCount).toBe(2);
    });
  });

  describe('Content consolidation', () => {
    it('should consolidate sections from multiple SPLs', () => {
      const spls: ProcessedSplData[] = [
        createMockSpl('spl1', ['TABLET'], [
          { id: 'dosage-1', title: 'Dosage and Administration', content: 'Primary dosing' },
          { id: 'warnings-1', title: 'Warnings', content: 'Primary warnings' },
        ]),
        createMockSpl('spl2', ['TABLET'], [
          { id: 'contraindications-1', title: 'Contraindications', content: 'Additional contraindications' },
          { id: 'adverse-1', title: 'Adverse Reactions', content: 'Additional adverse reactions' },
        ]),
      ];

      const result = enhancedSplPrioritization(spls);

      expect(result['TABLET'].sections).toHaveLength(4);
      expect(result['TABLET'].sections.map(s => s.title)).toContain('Dosage and Administration');
      expect(result['TABLET'].sections.map(s => s.title)).toContain('Warnings');
      expect(result['TABLET'].sections.map(s => s.title)).toContain('Contraindications');
      expect(result['TABLET'].sections.map(s => s.title)).toContain('Adverse Reactions');
    });

    it('should not duplicate sections from the primary SPL', () => {
      const spls: ProcessedSplData[] = [
        createMockSpl('spl1', ['TABLET'], [
          { id: 'dosage-1', title: 'Dosage and Administration', content: 'Primary dosing' },
          { id: 'warnings-1', title: 'Warnings', content: 'Primary warnings' },
          { id: 'dosage-1', title: 'Dosage and Administration', content: 'Primary dosing' }, // Duplicate
        ]),
      ];

      const result = enhancedSplPrioritization(spls);

      const dosageSections = result['TABLET'].sections.filter(s => s.title === 'Dosage and Administration');
      expect(dosageSections).toHaveLength(1);
    });
  });

  describe('Deduplication', () => {
    it('should deduplicate similar content within dosage form groups', () => {
      const spls: ProcessedSplData[] = [
        createMockSpl('spl1', ['TABLET'], [
          { id: 'dosage-1', title: 'Dosage and Administration', content: 'Take 1 tablet daily with food' },
        ]),
        createMockSpl('spl2', ['TABLET'], [
          { id: 'dosage-2', title: 'Dosage and Administration', content: 'Take 1 tablet daily with food' }, // Duplicate
        ]),
        createMockSpl('spl3', ['TABLET'], [
          { id: 'dosage-3', title: 'Dosage and Administration', content: 'Take 2 tablets daily' }, // Different
        ]),
      ];

      const result = enhancedSplPrioritization(spls);

      const dosageSections = result['TABLET'].sections.filter(s => s.title === 'Dosage and Administration');
      expect(dosageSections).toHaveLength(2); // One duplicate removed
    });

    it('should not deduplicate across different dosage forms', () => {
      const spls: ProcessedSplData[] = [
        createMockSpl('spl1', ['TABLET'], [
          { id: 'dosage-1', title: 'Dosage and Administration', content: 'Take 1 daily' },
        ]),
        createMockSpl('spl2', ['CAPSULE'], [
          { id: 'dosage-2', title: 'Dosage and Administration', content: 'Take 1 daily' }, // Same content, different form
        ]),
      ];

      const result = enhancedSplPrioritization(spls);

      expect(result['TABLET'].sections).toHaveLength(1);
      expect(result['CAPSULE'].sections).toHaveLength(1);
    });
  });

  describe('Edge cases', () => {
    it('should handle empty SPL list', () => {
      const result = enhancedSplPrioritization([]);
      expect(Object.keys(result)).toHaveLength(0);
    });

    it('should handle SPLs with no sections', () => {
      const spls: ProcessedSplData[] = [
        createMockSpl('spl1', ['TABLET'], []),
      ];

      const result = enhancedSplPrioritization(spls);

      expect(result['TABLET']).toBeDefined();
      expect(result['TABLET'].sections).toHaveLength(0);
    });

    it('should handle SPLs with low quality scores', () => {
      const spls: ProcessedSplData[] = [
        createMockSpl('spl1', ['TABLET'], [
          { id: 'dosage-1', title: 'Dosage', content: 'Basic info' },
        ], { score: 0.2, contentCompleteness: 0.1 }),
      ];

      const result = enhancedSplPrioritization(spls);

      // Should still include if it's the only option
      expect(result['TABLET']).toBeDefined();
      expect(result['TABLET'].quality.score).toBe(0.2);
    });

    it('should properly track contributing SPLs', () => {
      const spls: ProcessedSplData[] = [
        createMockSpl('spl1', ['TABLET'], [
          { id: 'dosage-1', title: 'Dosage', content: 'Dosing' },
        ]),
        createMockSpl('spl2', ['TABLET'], [
          { id: 'warnings-1', title: 'Warnings', content: 'Warnings' },
        ]),
        createMockSpl('spl3', ['TABLET'], [
          { id: 'adverse-1', title: 'Adverse Reactions', content: 'Reactions' },
        ]),
      ];

      const result = enhancedSplPrioritization(spls);

      expect(result['TABLET'].contributingSplSetIds).toContain('spl1');
      expect(result['TABLET'].contributingSplSetIds).toContain('spl2');
      expect(result['TABLET'].contributingSplSetIds).toContain('spl3');
      expect(result['TABLET'].contributingSplCount).toBe(3);
    });
  });
});