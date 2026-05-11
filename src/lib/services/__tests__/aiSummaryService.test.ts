import { AISummaryService } from '../aiSummaryService';
import { EnhancedPrioritizedSpl } from '@/lib/utils/enhancedSplPrioritization';

// Mock the fetch function
global.fetch = jest.fn();

describe('AISummaryService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    AISummaryService.clearCache();
  });

  describe('Extended-Release Detection', () => {
    it('should detect extended-release formulations in fluoxetine', async () => {
      // Mock fluoxetine SPL data with extended-release
      const mockFluoxetineSpls: EnhancedPrioritizedSpl[] = [
        {
          dosage_form: 'CAPSULE, DELAYED RELEASE',
          primary_spl: {
            spl_set_id: 'test-spl-1',
            title: 'Fluoxetine Hydrochloride',
            effective_time: '20230101',
            marketing_category: 'ANDA',
            application_number: 'ANDA123456'
          },
          alternative_spls: [],
          consolidated_sections: [
            {
              id: 'dosage_forms_and_strengths',
              title: 'Dosage Forms and Strengths',
              content: 'Fluoxetine hydrochloride delayed-release capsules: 90 mg (weekly dosing). Fluoxetine hydrochloride capsules: 10 mg, 20 mg, and 40 mg (daily dosing).',
              priority: 2,
              confidence: 0.95,
              source: 'test-spl-1',
              lastUpdated: '2023-01-01',
              markdownContent: '',
              icon: '💊'
            },
            {
              id: 'dosage',
              title: 'Dosage and Administration',
              content: 'Major Depressive Disorder: Initial dose 20 mg/day. After several weeks, may increase to 20-60 mg/day. Weekly dosing: 90 mg delayed-release capsule once weekly, starting 7 days after last daily dose.',
              priority: 1,
              confidence: 0.95,
              source: 'test-spl-1',
              lastUpdated: '2023-01-01',
              markdownContent: '',
              icon: '💊'
            }
          ],
          coverage_score: 95,
          quality_score: 0.9,
          last_updated: '2023-01-01'
        }
      ];

      // Mock successful API response
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          summary: 'Fluoxetine is available in immediate-release capsules (10mg, 20mg, 40mg) for daily dosing and delayed-release capsules (90mg) for weekly dosing.',
          model: 'claude-3-haiku',
          timestamp: new Date().toISOString()
        })
      });

      const result = await AISummaryService.generateClinicalSummary(
        mockFluoxetineSpls,
        'Fluoxetine'
      );

      // Verify extended-release detection in key points
      expect(result.keyPoints).toContain('Available in extended-release formulation');
      
      // Verify the comprehensive content sent to API includes dosage forms
      const fetchCall = (global.fetch as jest.Mock).mock.calls[0];
      const requestBody = JSON.parse(fetchCall[1].body);
      expect(requestBody.messages[0].content).toContain('CAPSULE, DELAYED RELEASE');
      expect(requestBody.messages[0].content).toContain('90 mg');
      expect(requestBody.messages[0].content).toContain('weekly dosing');
    });

    it('should include all dosage forms in comprehensive content', async () => {
      const mockMultipleFormSpls: EnhancedPrioritizedSpl[] = [
        {
          dosage_form: 'TABLET',
          primary_spl: { spl_set_id: 'test-1', title: 'Test Drug', effective_time: '20230101', marketing_category: 'NDA', application_number: 'NDA123' },
          alternative_spls: [],
          consolidated_sections: [{
            id: 'dosage_forms_and_strengths',
            title: 'Dosage Forms',
            content: 'Immediate-release tablets: 25mg, 50mg. Extended-release tablets: 100mg, 200mg.',
            priority: 2,
            confidence: 0.9,
            source: 'test-1',
            lastUpdated: '2023-01-01',
            markdownContent: '',
            icon: '💊'
          }],
          coverage_score: 90,
          quality_score: 0.85,
          last_updated: '2023-01-01'
        },
        {
          dosage_form: 'TABLET, EXTENDED RELEASE',
          primary_spl: { spl_set_id: 'test-2', title: 'Test Drug XR', effective_time: '20230101', marketing_category: 'NDA', application_number: 'NDA124' },
          alternative_spls: [],
          consolidated_sections: [],
          coverage_score: 85,
          quality_score: 0.8,
          last_updated: '2023-01-01'
        }
      ];

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ summary: 'Test summary', model: 'claude-3-haiku', timestamp: new Date().toISOString() })
      });

      await AISummaryService.generateClinicalSummary(mockMultipleFormSpls, 'Test Drug');

      const fetchCall = (global.fetch as jest.Mock).mock.calls[0];
      const requestBody = JSON.parse(fetchCall[1].body);
      const content = requestBody.messages[0].content;
      
      // Verify all dosage forms are included
      expect(content).toContain('Available Dosage Forms: TABLET, TABLET, EXTENDED RELEASE');
      expect(content).toContain('DOSING AND FORMULATION INFORMATION');
    });
  });

  describe('Special Population Detection', () => {
    it('should detect renal and hepatic dosing adjustments', async () => {
      const mockSplWithAdjustments: EnhancedPrioritizedSpl[] = [
        {
          dosage_form: 'TABLET',
          primary_spl: { spl_set_id: 'test-1', title: 'Test Drug', effective_time: '20230101', marketing_category: 'NDA', application_number: 'NDA123' },
          alternative_spls: [],
          consolidated_sections: [
            {
              id: 'use_in_specific_populations',
              title: 'Use in Specific Populations',
              content: 'Renal Impairment: For patients with CrCl < 30 mL/min, reduce dose by 50%. Hepatic Impairment: For moderate hepatic impairment, reduce dose by 25%.',
              priority: 3,
              confidence: 0.9,
              source: 'test-1',
              lastUpdated: '2023-01-01',
              markdownContent: '',
              icon: '👥'
            }
          ],
          coverage_score: 90,
          quality_score: 0.85,
          last_updated: '2023-01-01'
        }
      ];

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ summary: 'Test', model: 'claude-3-haiku', timestamp: new Date().toISOString() })
      });

      const result = await AISummaryService.generateClinicalSummary(
        mockSplWithAdjustments,
        'Test Drug'
      );

      expect(result.keyPoints).toContain('Dose adjustment for renal impairment');
      expect(result.keyPoints).toContain('Dose adjustment for hepatic impairment');
    });
  });

  describe('Storage Requirements Detection', () => {
    it('should detect light protection and refrigeration requirements', async () => {
      const mockSplWithStorage: EnhancedPrioritizedSpl[] = [
        {
          dosage_form: 'SOLUTION',
          primary_spl: { spl_set_id: 'test-1', title: 'Test Drug', effective_time: '20230101', marketing_category: 'NDA', application_number: 'NDA123' },
          alternative_spls: [],
          consolidated_sections: [
            {
              id: 'storage_and_handling',
              title: 'Storage and Handling',
              content: 'Store in refrigerator at 2-8°C. Protect from light. Do not freeze.',
              priority: 8,
              confidence: 0.95,
              source: 'test-1',
              lastUpdated: '2023-01-01',
              markdownContent: '',
              icon: '📦'
            }
          ],
          coverage_score: 90,
          quality_score: 0.85,
          last_updated: '2023-01-01'
        }
      ];

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ summary: 'Test', model: 'claude-3-haiku', timestamp: new Date().toISOString() })
      });

      const result = await AISummaryService.generateClinicalSummary(
        mockSplWithStorage,
        'Test Drug'
      );

      expect(result.keyPoints).toContain('Protect from light');
      expect(result.keyPoints).toContain('Requires refrigeration');
    });
  });
});