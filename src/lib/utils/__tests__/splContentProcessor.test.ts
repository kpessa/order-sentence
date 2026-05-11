import { processSplContent } from '../splContentProcessor';
import { DailyMedSplDetail } from '@/lib/store/slices/fdaDataSlice';

// Mock XML data for testing
const createMockXml = (options: {
  title?: string;
  dosageForms?: Array<{ code: string; displayName: string }>;
  sections?: Array<{ code: string; title: string; text: string }>;
  effectiveDate?: string;
  versionNumber?: string;
}) => {
  const { 
    title = 'Test Drug Label',
    dosageForms = [],
    sections = [],
    effectiveDate = '20240101',
    versionNumber = '1'
  } = options;

  const dosageFormsXml = dosageForms.map(form => 
    `<formCode code="${form.code}" displayName="${form.displayName}"/>`
  ).join('');

  const sectionsXml = sections.map(section => `
    <component>
      <section>
        <code code="${section.code}" displayName="${section.title}"/>
        <title>${section.title}</title>
        <text>${section.text}</text>
      </section>
    </component>
  `).join('');

  return `<?xml version="1.0" encoding="UTF-8"?>
    <document>
      <title>${title}</title>
      <effectiveTime value="${effectiveDate}"/>
      <versionNumber value="${versionNumber}"/>
      <component>
        <structuredBody>
          ${dosageFormsXml}
          ${sectionsXml}
        </structuredBody>
      </component>
    </document>`;
};

describe('processSplContent', () => {
  describe('Basic XML parsing', () => {
    it('should extract title and metadata', () => {
      const xmlContent = createMockXml({
        title: 'Aspirin Tablets',
        effectiveDate: '20240115',
        versionNumber: '3'
      });

      const spl: DailyMedSplDetail = {
        spl_set_id: 'test-123',
        xml_content: xmlContent
      };

      const result = processSplContent(spl);

      expect(result.setId).toBe('test-123');
      expect(result.title).toBe('Aspirin Tablets');
      expect(result.metadata.effectiveDate).toBe('20240115');
      expect(result.metadata.versionNumber).toBe('3');
    });

    it('should handle missing XML content', () => {
      const spl: DailyMedSplDetail = {
        spl_set_id: 'test-123',
        xml_content: undefined
      };

      const result = processSplContent(spl);

      expect(result.setId).toBe('test-123');
      expect(result.title).toBe('Unknown SPL');
      expect(result.sections).toHaveLength(0);
      expect(result.dosageForms).toHaveLength(0);
    });
  });

  describe('Dosage form extraction', () => {
    it('should extract single dosage form', () => {
      const xmlContent = createMockXml({
        dosageForms: [
          { code: 'C42895', displayName: 'TABLET' }
        ]
      });

      const spl: DailyMedSplDetail = {
        spl_set_id: 'test-123',
        xml_content: xmlContent
      };

      const result = processSplContent(spl);

      expect(result.dosageForms).toEqual(['TABLET']);
    });

    it('should extract multiple dosage forms', () => {
      const xmlContent = createMockXml({
        dosageForms: [
          { code: 'C42895', displayName: 'TABLET' },
          { code: 'C42896', displayName: 'CAPSULE' }
        ]
      });

      const spl: DailyMedSplDetail = {
        spl_set_id: 'test-123',
        xml_content: xmlContent
      };

      const result = processSplContent(spl);

      expect(result.dosageForms).toEqual(['TABLET', 'CAPSULE']);
    });

    it('should handle missing dosage forms', () => {
      const xmlContent = createMockXml({
        dosageForms: []
      });

      const spl: DailyMedSplDetail = {
        spl_set_id: 'test-123',
        xml_content: xmlContent
      };

      const result = processSplContent(spl);

      expect(result.dosageForms).toEqual([]);
    });
  });

  describe('Section extraction', () => {
    it('should extract clinical sections', () => {
      const xmlContent = createMockXml({
        sections: [
          { code: '34068-7', title: 'Dosage and Administration', text: 'Take 1 tablet daily' },
          { code: '34071-1', title: 'Warnings', text: 'Do not exceed dose' },
          { code: '34070-3', title: 'Contraindications', text: 'Allergy to aspirin' }
        ]
      });

      const spl: DailyMedSplDetail = {
        spl_set_id: 'test-123',
        xml_content: xmlContent
      };

      const result = processSplContent(spl);

      expect(result.sections).toHaveLength(3);
      expect(result.sections[0]).toEqual({
        id: 'test-123-34068-7',
        title: 'Dosage and Administration',
        content: 'Take 1 tablet daily',
        sectionCode: '34068-7',
        sourceSetId: 'test-123'
      });
    });

    it('should generate unique section IDs', () => {
      const xmlContent = createMockXml({
        sections: [
          { code: '34068-7', title: 'Dosage', text: 'Content 1' },
          { code: '34068-7', title: 'Dosage', text: 'Content 2' } // Duplicate code
        ]
      });

      const spl: DailyMedSplDetail = {
        spl_set_id: 'test-123',
        xml_content: xmlContent
      };

      const result = processSplContent(spl);

      const sectionIds = result.sections.map(s => s.id);
      expect(new Set(sectionIds).size).toBe(sectionIds.length); // All IDs should be unique
    });

    it('should clean HTML from section content', () => {
      const xmlContent = createMockXml({
        sections: [
          { 
            code: '34068-7', 
            title: 'Dosage', 
            text: '<p>Take <strong>1 tablet</strong> daily</p>' 
          }
        ]
      });

      const spl: DailyMedSplDetail = {
        spl_set_id: 'test-123',
        xml_content: xmlContent
      };

      const result = processSplContent(spl);

      expect(result.sections[0].content).not.toContain('<p>');
      expect(result.sections[0].content).not.toContain('<strong>');
      expect(result.sections[0].content).toContain('Take 1 tablet daily');
    });
  });

  describe('Quality scoring', () => {
    it('should calculate quality score based on content', () => {
      const xmlContent = createMockXml({
        sections: [
          { code: '34068-7', title: 'Dosage and Administration', text: 'Detailed dosing info' },
          { code: '34071-1', title: 'Warnings', text: 'Important warnings' },
          { code: '34070-3', title: 'Contraindications', text: 'Contraindication list' },
          { code: '34073-7', title: 'Drug Interactions', text: 'Interaction details' },
          { code: '34084-4', title: 'Adverse Reactions', text: 'Side effects' }
        ]
      });

      const spl: DailyMedSplDetail = {
        spl_set_id: 'test-123',
        xml_content: xmlContent
      };

      const result = processSplContent(spl);

      expect(result.quality.hasStructuredDosing).toBe(true);
      expect(result.quality.hasContraindications).toBe(true);
      expect(result.quality.hasWarnings).toBe(true);
      expect(result.quality.hasDrugInteractions).toBe(true);
      expect(result.quality.hasAdverseReactions).toBe(true);
      expect(result.quality.score).toBeGreaterThan(0.5);
      expect(result.quality.contentCompleteness).toBeGreaterThan(0);
    });

    it('should handle missing sections in quality scoring', () => {
      const xmlContent = createMockXml({
        sections: [
          { code: '34068-7', title: 'Dosage and Administration', text: 'Basic dosing' }
        ]
      });

      const spl: DailyMedSplDetail = {
        spl_set_id: 'test-123',
        xml_content: xmlContent
      };

      const result = processSplContent(spl);

      expect(result.quality.hasStructuredDosing).toBe(true);
      expect(result.quality.hasContraindications).toBe(false);
      expect(result.quality.hasWarnings).toBe(false);
      expect(result.quality.hasDrugInteractions).toBe(false);
      expect(result.quality.hasAdverseReactions).toBe(false);
      expect(result.quality.score).toBeLessThan(0.5);
    });
  });

  describe('Error handling', () => {
    it('should handle malformed XML gracefully', () => {
      const spl: DailyMedSplDetail = {
        spl_set_id: 'test-123',
        xml_content: 'This is not valid XML <broken>'
      };

      const result = processSplContent(spl);

      expect(result.setId).toBe('test-123');
      expect(result.title).toBe('Unknown SPL');
      expect(result.sections).toHaveLength(0);
      expect(result.dosageForms).toHaveLength(0);
    });

    it('should handle XML with missing structure', () => {
      const xmlContent = `<?xml version="1.0"?>
        <document>
          <title>Test Label</title>
        </document>`;

      const spl: DailyMedSplDetail = {
        spl_set_id: 'test-123',
        xml_content: xmlContent
      };

      const result = processSplContent(spl);

      expect(result.title).toBe('Test Label');
      expect(result.sections).toHaveLength(0);
      expect(result.dosageForms).toHaveLength(0);
    });
  });
});