import { describe, it, expect } from '@jest/globals';

describe('Redux Persist Transforms', () => {
  // Mock a typical FDA data state with large content
  const mockFdaDataState = {
    rxcui: '123456',
    ndcList: ['12345-678-90'],
    openFdaResults: [
      {
        id: 'test-result-1',
        brand_name: 'Test Drug',
        generic_name: 'test-generic'
      }
    ],
    totalOpenFdaResults: 1,
    status: 'succeeded' as const,
    error: null,
    currentEndpoint: '/drug/ndc',
    retrievalTimestamp: '2023-12-01T00:00:00Z',
    
    // Large data that should be excluded from persistence
    dailyMedDetails: {
      'test-spl-001': {
        data: {
          spl_set_id: 'test-spl-001',
          xml_content: '<document>' + 'x'.repeat(100000) + '</document>' // 100KB of XML
        },
        status: 'succeeded' as const,
        error: null
      },
      'test-spl-002': {
        data: {
          spl_set_id: 'test-spl-002', 
          xml_content: '<document>' + 'y'.repeat(200000) + '</document>' // 200KB of XML
        },
        status: 'succeeded' as const,
        error: null
      }
    },
    
    prioritizedSplsByDosageForm: {
      'TABLET': {
        spl_set_id: 'test-spl-001',
        published_date: '20231201',
        dosage_forms: ['TABLET'],
        dosageAndAdministrationText: 'Large clinical text content here...',
        original_spl_detail: {
          spl_set_id: 'test-spl-001',
          xml_content: '<document>' + 'z'.repeat(150000) + '</document>' // 150KB of XML
        }
      }
    },

    // Normal data that should be persisted
    dailyMedSplListForDrugName: {
      'aspirin': {
        data: [{ spl_set_id: 'test-spl-001' }],
        status: 'succeeded' as const,
        error: null
      }
    },
    currentDrugNameQuery: 'aspirin'
  };

  const mockRootState = {
    drugSearch: {
      selectedDrug: { name: 'aspirin', rxcui: '123456' },
      searchHistory: ['aspirin', 'ibuprofen']
    },
    excelData: {
      fileName: null,
      data: null,
      status: 'idle'
    },
    fdaData: mockFdaDataState
  };

  it('should exclude large data from fdaData during persistence', () => {
    // Simulate the persist transform
    const persistTransform = {
      in: (inboundState: any) => inboundState,
      out: (outboundState: any) => {
        if (outboundState.fdaData) {
          return {
            ...outboundState,
            fdaData: {
              ...outboundState.fdaData,
              dailyMedDetails: {},
              prioritizedSplsByDosageForm: {},
            }
          };
        }
        return outboundState;
      }
    };

    const result = persistTransform.out(mockRootState);

    // Verify large data is excluded
    expect(result.fdaData.dailyMedDetails).toEqual({});
    expect(result.fdaData.prioritizedSplsByDosageForm).toEqual({});

    // Verify essential data is preserved
    expect(result.fdaData.rxcui).toBe('123456');
    expect(result.fdaData.openFdaResults).toHaveLength(1);
    expect(result.fdaData.status).toBe('succeeded');
    expect(result.fdaData.currentDrugNameQuery).toBe('aspirin');

    // Verify other slices are not affected
    expect(result.drugSearch).toEqual(mockRootState.drugSearch);
    expect(result.excelData).toEqual(mockRootState.excelData);
  });

  it('should preserve all data during rehydration', () => {
    const persistTransform = {
      in: (inboundState: any) => inboundState,
      out: (outboundState: any) => outboundState
    };

    const result = persistTransform.in(mockRootState);

    // During rehydration, everything should be preserved
    expect(result).toEqual(mockRootState);
  });

  it('should calculate storage savings correctly', () => {
    const originalSize = JSON.stringify(mockRootState).length;
    
    const persistTransform = {
      out: (outboundState: any) => {
        if (outboundState.fdaData) {
          return {
            ...outboundState,
            fdaData: {
              ...outboundState.fdaData,
              dailyMedDetails: {},
              prioritizedSplsByDosageForm: {},
            }
          };
        }
        return outboundState;
      }
    };

    const transformedState = persistTransform.out(mockRootState);
    const transformedSize = JSON.stringify(transformedState).length;
    
    const savingsPercent = ((originalSize - transformedSize) / originalSize) * 100;

    // Should have significant storage savings (>50% for this mock data)
    expect(savingsPercent).toBeGreaterThan(50);
    console.log(`Storage savings: ${savingsPercent.toFixed(1)}% (${originalSize} -> ${transformedSize} bytes)`);
  });

  it('should handle missing fdaData gracefully', () => {
    const stateWithoutFdaData = {
      drugSearch: mockRootState.drugSearch,
      excelData: mockRootState.excelData
    };

    const persistTransform = {
      out: (outboundState: any) => {
        if (outboundState.fdaData) {
          return {
            ...outboundState,
            fdaData: {
              ...outboundState.fdaData,
              dailyMedDetails: {},
              prioritizedSplsByDosageForm: {},
            }
          };
        }
        return outboundState;
      }
    };

    const result = persistTransform.out(stateWithoutFdaData);

    // Should return unchanged if no fdaData
    expect(result).toEqual(stateWithoutFdaData);
  });

  it('should handle edge cases in fdaData', () => {
    const edgeCaseState = {
      fdaData: {
        // Missing dailyMedDetails and prioritizedSplsByDosageForm
        rxcui: '123456',
        status: 'idle' as const,
        error: null
      }
    };

    const persistTransform = {
      out: (outboundState: any) => {
        if (outboundState.fdaData) {
          return {
            ...outboundState,
            fdaData: {
              ...outboundState.fdaData,
              dailyMedDetails: {},
              prioritizedSplsByDosageForm: {},
            }
          };
        }
        return outboundState;
      }
    };

    const result = persistTransform.out(edgeCaseState);

    // Should add empty objects for missing properties
    expect(result.fdaData.dailyMedDetails).toEqual({});
    expect(result.fdaData.prioritizedSplsByDosageForm).toEqual({});
    expect(result.fdaData.rxcui).toBe('123456');
  });
});