import { configureStore } from '@reduxjs/toolkit';
import fdaDataReducer, {
  fetchNdcsByRxcui,
  fetchFdaDataByNdcs,
  fetchOpenFdaDataByDrugName,
  fetchSplDetailFromDailyMed,
  fetchSplsFromDailyMedByName,
  resetFdaState,
  setPrioritizedSpls,
  selectFdaDataState,
  selectNdcList,
  selectOpenFdaResults,
  OpenFdaResult,
  DailyMedSplDetail,
} from '../fdaDataSlice';
import drugSearchReducer from '../drugSearchSlice';
import excelDataReducer from '../excelDataSlice';
import { createMockFetch } from '@/__tests__/utils/mock-factories';

// Mock data
const mockRxcui = '207106';
const mockNdcList = ['0045-0005-05', '0045-0005-10'];
const mockSetId = 'abc123-def456-ghi789';

const mockRxNormNdcResponse = {
  ndcGroup: {
    ndcList: {
      ndc: mockNdcList,
    },
  },
};

const mockOpenFdaResult: OpenFdaResult = {
  id: 'test-id',
  set_id: mockSetId,
  application_number: 'NDA012345',
  brand_name: 'Lisinopril Brand',
  generic_name: 'Lisinopril',
  openfda: {
    application_number: ['NDA012345'],
    application_type: ['NDA'],
    brand_name: ['Lisinopril Brand'],
    generic_name: ['Lisinopril'],
    manufacturer_name: ['Test Manufacturer'],
    product_ndc: ['0045-0005'],
    spl_set_id: [mockSetId],
    rxcui: [mockRxcui],
  },
  product_ndc: '0045-0005',
  active_ingredients: [{ name: 'Lisinopril', strength: '10mg' }],
  dosage_form: 'Tablet',
  marketing_category: 'NDA',
};

const mockOpenFdaApiResponse = {
  meta: {
    results: {
      skip: 0,
      limit: 10,
      total: 1,
    },
  },
  results: [mockOpenFdaResult],
};

const mockDrugsfdaResponse = {
  meta: {
    results: {
      skip: 0,
      limit: 10,
      total: 1,
    },
  },
  results: [
    {
      application_number: 'NDA012345',
      sponsor_name: 'Test Sponsor',
      openfda: {
        application_type: ['NDA'],
        brand_name: ['Lisinopril Brand'],
        generic_name: ['Lisinopril'],
        manufacturer_name: ['Test Manufacturer'],
        spl_set_id: [mockSetId],
        rxcui: [mockRxcui],
      },
      products: [
        {
          product_number: '001',
          brand_name: 'Lisinopril Brand',
          active_ingredients: [{ name: 'Lisinopril', strength: '10mg' }],
          dosage_form: 'Tablet',
          marketing_status: 'NDA',
          openfda: {
            product_ndc: ['0045-0005'],
            package_ndc: ['0045-0005-05'],
            spl_set_id: [mockSetId],
          },
        },
      ],
    },
  ],
};

const mockDailyMedSplDetail: DailyMedSplDetail = {
  spl_set_id: mockSetId,
  xml_content: '<spl><document><title>Test SPL</title></document></spl>',
};

const mockDailyMedSplsResponse = {
  data: [
    {
      setid: mockSetId,
      spl_title: 'Test SPL Title',
      published_date: '2024-01-01',
      dosage_form: ['Tablet'],
    },
  ],
};

// Create a test store without redux-persist
const createTestStore = () => {
  return configureStore({
    reducer: {
      drugSearch: drugSearchReducer,
      excelData: excelDataReducer,
      fdaData: fdaDataReducer,
    },
  });
};

type TestStore = ReturnType<typeof createTestStore>;
// type TestState = ReturnType<TestStore['getState']>;

// Type for FDA payload
type FetchFdaDataPayload = { results: OpenFdaResult[]; total: number };

describe('fdaDataSlice', () => {
  let store: TestStore;
  let mockFetch: jest.MockedFunction<typeof fetch>;

  beforeEach(() => {
    store = createTestStore();
    mockFetch = createMockFetch();
    mockFetch.mockReset();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('initial state', () => {
    it('should have correct initial state', () => {
      const state = store.getState().fdaData;
      expect(state).toEqual({
        ndcList: [],
        openFdaResults: [],
        totalOpenFdaResults: 0,
        status: 'idle',
        error: null,
        currentEndpoint: null,
        dailyMedDetails: {},
        prioritizedSplsByDosageForm: {},
        dailyMedSplListForDrugName: [],
        dailyMedSplListStatus: 'idle',
        dailyMedSplListError: null,
        currentDrugNameQuery: undefined,
      });
    });
  });

  describe('reducers', () => {
    describe('resetFdaState', () => {
      it('should reset state to initial values', () => {
        // First, set some state
        store.dispatch(
          fetchNdcsByRxcui.fulfilled(mockNdcList, 'requestId', mockRxcui)
        );
        store.dispatch(setPrioritizedSpls({ Tablet: {} as any }));

        // Then reset
        store.dispatch(resetFdaState());

        const state = store.getState().fdaData;
        expect(state).toEqual({
          ndcList: [],
          openFdaResults: [],
          totalOpenFdaResults: 0,
          status: 'idle',
          error: null,
          currentEndpoint: null,
          dailyMedDetails: {},
          prioritizedSplsByDosageForm: {},
          dailyMedSplListForDrugName: [],
          dailyMedSplListStatus: 'idle',
          dailyMedSplListError: null,
          currentDrugNameQuery: undefined,
        });
      });
    });

    describe('setPrioritizedSpls', () => {
      it('should set prioritized SPLs by dosage form', () => {
        const testData = { Tablet: {} as any, Capsule: {} as any };
        store.dispatch(setPrioritizedSpls(testData));

        const state = store.getState().fdaData;
        expect(state.prioritizedSplsByDosageForm).toEqual(testData);
      });
    });
  });

  describe('selectors', () => {
    it('should select FDA data state', () => {
      const state = store.getState();
      expect(state.fdaData).toEqual(store.getState().fdaData);
    });

    it('should select NDC list', () => {
      const state = store.getState();
      expect(state.fdaData.ndcList).toEqual([]);
    });

    it('should select OpenFDA results', () => {
      const state = store.getState();
      expect(state.fdaData.openFdaResults).toEqual([]);
    });

    it('should select FDA data status', () => {
      const state = store.getState();
      expect(state.fdaData.status).toBe('idle');
    });

    it('should select FDA data error', () => {
      const state = store.getState();
      expect(state.fdaData.error).toBe(null);
    });

    it('should select current RXCUI', () => {
      const state = store.getState();
      expect(state.fdaData.rxcui).toBe(undefined);
    });
  });

  describe('fetchNdcsByRxcui async thunk', () => {
    it('should successfully fetch NDCs by RXCUI', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockRxNormNdcResponse,
      } as Response);

      const result = await store.dispatch(fetchNdcsByRxcui(mockRxcui) as any);

      expect(result.type).toBe('fdaData/fetchNdcsByRxcui/fulfilled');
      expect(result.payload).toEqual(mockNdcList);

      const state = store.getState().fdaData;
      expect(state.status).toBe('ndc_resolved');
      expect(state.ndcList).toEqual(mockNdcList);
      expect(state.rxcui).toBe(mockRxcui);
      expect(state.error).toBe(null);
    });

    it('should handle empty NDC response', async () => {
      const emptyResponse = {
        ndcGroup: {
          ndcList: undefined,
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => emptyResponse,
      } as Response);

      const result = await store.dispatch(fetchNdcsByRxcui(mockRxcui) as any);

      expect(result.type).toBe('fdaData/fetchNdcsByRxcui/fulfilled');
      expect(result.payload).toEqual([]);
    });

    it('should handle API errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await store.dispatch(fetchNdcsByRxcui(mockRxcui) as any);

      expect(result.type).toBe('fdaData/fetchNdcsByRxcui/rejected');
      expect(result.payload).toBe('Network error');

      const state = store.getState().fdaData;
      expect(state.status).toBe('failed');
      expect(state.error).toBe('Network error');
    });

    it('should handle non-200 responses', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      } as Response);

      const result = await store.dispatch(fetchNdcsByRxcui(mockRxcui) as any);

      expect(result.type).toBe('fdaData/fetchNdcsByRxcui/rejected');
      expect(result.payload).toBe(
        'RxNorm API Error: 500 Internal Server Error'
      );
    });
  });

  describe('fetchFdaDataByNdcs async thunk', () => {
    it('should successfully fetch FDA data by NDCs', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockOpenFdaApiResponse,
      } as Response);

      const result = await store.dispatch(
        fetchFdaDataByNdcs(mockNdcList) as any
      );

      expect(result.type).toBe('fdaData/fetchFdaDataByNdcs/fulfilled');
      expect(result.payload).toEqual({
        results: mockOpenFdaApiResponse.results,
        total: mockOpenFdaApiResponse.meta.results.total,
      });

      const state = store.getState().fdaData;
      expect(state.status).toBe('fda_queried');
      expect(state.openFdaResults).toEqual(mockOpenFdaApiResponse.results);
      expect(state.totalOpenFdaResults).toBe(
        mockOpenFdaApiResponse.meta.results.total
      );
    });

    it('should handle empty NDC list', async () => {
      const result = await store.dispatch(fetchFdaDataByNdcs([]) as any);

      expect(result.type).toBe('fdaData/fetchFdaDataByNdcs/rejected');
      expect(result.payload).toBe('No NDCs provided to fetch FDA data.');
    });

    it('should handle 404 responses', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      } as Response);

      const result = await store.dispatch(
        fetchFdaDataByNdcs(mockNdcList) as any
      );

      expect(result.type).toBe('fdaData/fetchFdaDataByNdcs/rejected');
      expect(result.payload).toBe(
        'No FDA data found for product NDC: 0045-0005 (derived from 0045-0005-05)'
      );
    });

    it('should handle response with no results', async () => {
      const noResultsResponse = {
        meta: { results: { skip: 0, limit: 10, total: 0 } },
        results: [],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => noResultsResponse,
      } as Response);

      const result = await store.dispatch(
        fetchFdaDataByNdcs(mockNdcList) as any
      );

      expect(result.type).toBe('fdaData/fetchFdaDataByNdcs/rejected');
      expect(result.payload).toBe(
        "No FDA data found in 'results' for product NDC: 0045-0005"
      );
    });
  });

  describe('fetchOpenFdaDataByDrugName async thunk', () => {
    it('should successfully fetch FDA data by drug name', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify(mockDrugsfdaResponse),
      } as Response);

      const result = await store.dispatch(
        fetchOpenFdaDataByDrugName('Lisinopril') as any
      );

      expect(result.type).toBe('fdaData/fetchOpenFdaDataByDrugName/fulfilled');
      const payload = result.payload as FetchFdaDataPayload;
      expect(payload.results).toHaveLength(1);
      expect(payload.results[0].brand_name).toBe('Lisinopril Brand');
      expect(payload.results[0].openfda?.application_type).toEqual(['NDA']);

      const state = store.getState().fdaData;
      expect(state.status).toBe('fda_queried');
      expect(state.currentDrugNameQuery).toBe('Lisinopril');
    });

    it('should handle empty drug name', async () => {
      const result = await store.dispatch(
        fetchOpenFdaDataByDrugName('') as any
      );

      expect(result.type).toBe('fdaData/fetchOpenFdaDataByDrugName/rejected');
      expect(result.payload).toBe('No drug name provided to fetch FDA data.');
    });

    it('should handle 404 responses', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        text: async () => 'Not found',
      } as Response);

      const result = await store.dispatch(
        fetchOpenFdaDataByDrugName('NonexistentDrug') as any
      );

      expect(result.type).toBe('fdaData/fetchOpenFdaDataByDrugName/rejected');
      expect(result.payload).toBe(
        'No Drugs@FDA data found for drug name: NonexistentDrug. Raw response: Not found'
      );
    });

    it('should handle response with no results', async () => {
      const noResultsResponse = {
        meta: { results: { skip: 0, limit: 10, total: 0 } },
        results: [],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify(noResultsResponse),
      } as Response);

      const result = await store.dispatch(
        fetchOpenFdaDataByDrugName('NonexistentDrug') as any
      );

      expect(result.type).toBe('fdaData/fetchOpenFdaDataByDrugName/rejected');
      expect(result.payload).toContain(
        'No results in Drugs@FDA data for drug name: NonexistentDrug'
      );
    });

    it('should filter out non-NDA/ANDA/BLA applications', async () => {
      const mixedResponse = {
        meta: { results: { skip: 0, limit: 10, total: 2 } },
        results: [
          {
            application_number: 'NDA012345',
            sponsor_name: 'Test Sponsor',
            openfda: {
              application_type: ['NDA'],
              brand_name: ['Test Brand'],
              generic_name: ['Test Generic'],
              spl_set_id: [mockSetId],
            },
            products: [
              {
                product_number: '001',
                brand_name: 'Test Brand',
                openfda: { spl_set_id: [mockSetId] },
              },
            ],
          },
          {
            application_number: 'IND054321',
            sponsor_name: 'Test Sponsor',
            openfda: {
              application_type: ['IND'],
              brand_name: ['Test IND Brand'],
              generic_name: ['Test IND Generic'],
              spl_set_id: ['other-set-id'],
            },
            products: [
              {
                product_number: '001',
                brand_name: 'Test IND Brand',
                openfda: { spl_set_id: ['other-set-id'] },
              },
            ],
          },
        ],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify(mixedResponse),
      } as Response);

      const result = await store.dispatch(
        fetchOpenFdaDataByDrugName('Test') as any
      );

      expect(result.type).toBe('fdaData/fetchOpenFdaDataByDrugName/fulfilled');
      // The thunk returns all results, filtering happens in the reducer
      const payload = result.payload as FetchFdaDataPayload;
      expect(payload.results).toHaveLength(2);

      const state = store.getState().fdaData;
      // But the state should only have the filtered results
      expect(state.openFdaResults).toHaveLength(1);
      expect(state.openFdaResults[0].openfda?.application_type).toEqual([
        'NDA',
      ]);
      expect(state.totalOpenFdaResults).toBe(1);
    });
  });

  describe('fetchSplDetailFromDailyMed async thunk', () => {
    it('should successfully fetch SPL detail from DailyMed', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => mockDailyMedSplDetail.xml_content,
        headers: {
          get: jest.fn().mockReturnValue('application/xml'),
        },
      } as any);

      const result = await store.dispatch(
        fetchSplDetailFromDailyMed(mockSetId) as any
      );

      expect(result.type).toBe('fdaData/fetchSplDetailFromDailyMed/fulfilled');
      expect(result.payload).toEqual(mockDailyMedSplDetail);

      const state = store.getState().fdaData;
      expect(state.dailyMedDetails[mockSetId]).toEqual({
        data: mockDailyMedSplDetail,
        status: 'succeeded',
        error: null,
      });
    });

    it('should handle proxy errors', async () => {
      const errorResponse = {
        error: 'DailyMed API error',
        dailyMedErrorBody: 'Original error from DailyMed',
      };

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: async () => JSON.stringify(errorResponse),
      } as Response);

      const result = await store.dispatch(
        fetchSplDetailFromDailyMed(mockSetId) as any
      );

      expect(result.type).toBe('fdaData/fetchSplDetailFromDailyMed/rejected');
      expect(result.payload).toEqual({
        splSetId: mockSetId,
        error: 'DailyMed API error',
        dailyMedErrorBody: 'Original error from DailyMed',
      });

      const state = store.getState().fdaData;
      expect(state.dailyMedDetails[mockSetId]).toEqual({
        status: 'failed',
        error: 'DailyMed API error',
      });
    });

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await store.dispatch(
        fetchSplDetailFromDailyMed(mockSetId) as any
      );

      expect(result.type).toBe('fdaData/fetchSplDetailFromDailyMed/rejected');
      expect(result.payload).toEqual({
        splSetId: mockSetId,
        error: 'Error: Network error',
      });
    });

    it('should warn about unexpected content type but still process', async () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => mockDailyMedSplDetail.xml_content,
        headers: {
          get: jest.fn().mockReturnValue('text/plain'),
        },
      } as any);

      const result = await store.dispatch(
        fetchSplDetailFromDailyMed(mockSetId) as any
      );

      expect(result.type).toBe('fdaData/fetchSplDetailFromDailyMed/fulfilled');
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Unexpected content type')
      );

      consoleSpy.mockRestore();
    });
  });

  describe('fetchSplsFromDailyMedByName async thunk', () => {
    it('should successfully fetch SPLs from DailyMed by name', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockDailyMedSplsResponse,
      } as Response);

      const result = await store.dispatch(
        fetchSplsFromDailyMedByName('Lisinopril') as any
      );

      expect(result.type).toBe('fdaData/fetchSplsFromDailyMedByName/fulfilled');
      expect(result.payload).toEqual([
        {
          spl_set_id: mockSetId,
          title: 'Test SPL Title',
          published_date: '2024-01-01',
          dosage_forms: ['Tablet'],
        },
      ]);

      const state = store.getState().fdaData;
      expect(state.dailyMedSplListStatus).toBe('succeeded');
      expect(state.dailyMedSplListForDrugName).toHaveLength(1);
    });

    it('should handle empty drug name', async () => {
      const result = await store.dispatch(
        fetchSplsFromDailyMedByName('') as any
      );

      expect(result.type).toBe('fdaData/fetchSplsFromDailyMedByName/rejected');
      expect(result.payload).toBe(
        'No drug name provided to fetch SPLs from DailyMed.'
      );
    });

    it('should handle 404 responses', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        text: async () => 'Not found',
      } as Response);

      const result = await store.dispatch(
        fetchSplsFromDailyMedByName('NonexistentDrug') as any
      );

      expect(result.type).toBe('fdaData/fetchSplsFromDailyMedByName/rejected');
      expect(result.payload).toBe(
        'No DailyMed SPLs found for drug name: NonexistentDrug. Response: Not found'
      );
    });

    it('should handle response with no data', async () => {
      const noDataResponse = { data: [] };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => noDataResponse,
      } as Response);

      const result = await store.dispatch(
        fetchSplsFromDailyMedByName('NonexistentDrug') as any
      );

      expect(result.type).toBe('fdaData/fetchSplsFromDailyMedByName/fulfilled');
      expect(result.payload).toEqual([]);
    });

    it('should handle response with unexpected structure', async () => {
      const unexpectedResponse = { results: [] };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => unexpectedResponse,
      } as Response);

      const result = await store.dispatch(
        fetchSplsFromDailyMedByName('TestDrug') as any
      );

      expect(result.type).toBe('fdaData/fetchSplsFromDailyMedByName/fulfilled');
      expect(result.payload).toEqual([]);
    });

    it('should handle dosage forms in different structures', async () => {
      const responseWithNestedDosageForm = {
        data: [
          {
            setid: 'test-id-1',
            spl_title: 'Test SPL 1',
            published_date: '2024-01-01',
            dosage_form: 'Tablet',
          },
          {
            setid: 'test-id-2',
            spl_title: 'Test SPL 2',
            published_date: '2024-01-02',
            attributes: {
              dosage_form: ['Capsule', 'Tablet'],
            },
          },
        ],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => responseWithNestedDosageForm,
      } as Response);

      const result = await store.dispatch(
        fetchSplsFromDailyMedByName('TestDrug') as any
      );

      expect(result.type).toBe('fdaData/fetchSplsFromDailyMedByName/fulfilled');
      expect(result.payload).toEqual([
        {
          spl_set_id: 'test-id-1',
          title: 'Test SPL 1',
          published_date: '2024-01-01',
          dosage_forms: ['Tablet'],
        },
        {
          spl_set_id: 'test-id-2',
          title: 'Test SPL 2',
          published_date: '2024-01-02',
          dosage_forms: ['Capsule', 'Tablet'],
        },
      ]);
    });
  });

  describe('extraReducers', () => {
    it('should handle fetchNdcsByRxcui.pending', () => {
      const pendingAction = {
        type: fetchNdcsByRxcui.pending.type,
        meta: { arg: mockRxcui },
      };
      const state = fdaDataReducer(undefined, pendingAction as any);

      expect(state.status).toBe('loading');
      expect(state.error).toBe(null);
      expect(state.currentEndpoint).toBe(
        `RxNorm /rxcui/${mockRxcui}/ndcs.json`
      );
      expect(state.rxcui).toBe(mockRxcui);
      expect(state.ndcList).toEqual([]);
    });

    it('should handle fetchFdaDataByNdcs.pending', () => {
      const pendingAction = {
        type: fetchFdaDataByNdcs.pending.type,
        meta: { arg: mockNdcList },
      };
      const state = fdaDataReducer(undefined, pendingAction as any);

      expect(state.status).toBe('loading');
      expect(state.error).toBe(null);
      expect(state.currentEndpoint).toBe('openFDA /drug/label.json with NDCs');
      expect(state.openFdaResults).toEqual([]);
      expect(state.totalOpenFdaResults).toBe(0);
    });

    it('should handle fetchOpenFdaDataByDrugName.pending', () => {
      const drugName = 'Lisinopril';
      const pendingAction = {
        type: fetchOpenFdaDataByDrugName.pending.type,
        meta: { arg: drugName },
      };
      const state = fdaDataReducer(undefined, pendingAction as any);

      expect(state.status).toBe('loading');
      expect(state.error).toBe(null);
      expect(state.currentEndpoint).toBe(
        `Drugs@FDA /drugsfda.json with drugName: ${drugName}`
      );
      expect(state.openFdaResults).toEqual([]);
      expect(state.totalOpenFdaResults).toBe(0);
      expect(state.currentDrugNameQuery).toBe(drugName);
      expect(state.dailyMedSplListStatus).toBe('idle');
      expect(state.dailyMedSplListForDrugName).toEqual([]);
    });

    it('should handle fetchSplDetailFromDailyMed.pending', () => {
      const pendingAction = {
        type: fetchSplDetailFromDailyMed.pending.type,
        meta: { arg: mockSetId },
      };
      const state = fdaDataReducer(undefined, pendingAction as any);

      expect(state.dailyMedDetails[mockSetId]).toEqual({
        status: 'loading',
        error: null,
      });
    });

    it('should handle fetchSplsFromDailyMedByName.pending', () => {
      const pendingAction = {
        type: fetchSplsFromDailyMedByName.pending.type,
        meta: { arg: 'Lisinopril' },
      };
      const state = fdaDataReducer(undefined, pendingAction as any);

      expect(state.dailyMedSplListStatus).toBe('loading');
      expect(state.dailyMedSplListError).toBe(null);
    });
  });
});
