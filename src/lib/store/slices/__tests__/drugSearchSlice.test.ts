import { configureStore } from '@reduxjs/toolkit';
import drugSearchReducer, {
  updateQuery,
  selectDrug,
  resetSearchState,
  incrementRetry,
  setStatus,
  fetchDrugResults,
  selectDrugSearchQuery,
  selectDrugSearchResults,
  selectSelectedDrug,
  selectDrugSearchStatus,
  selectDrugSearchError,
  selectDrugSearchRetries,
} from '../drugSearchSlice';
import excelDataReducer from '../excelDataSlice';
import fdaDataReducer from '../fdaDataSlice';
import { RxNormSuggestion, SelectedDrugInfo } from '@/lib/types';
import { createMockFetch } from '@/__tests__/utils/mock-factories';

// Mock data
const mockRxNormSuggestion: RxNormSuggestion = {
  rxcui: '207106',
  name: 'Lisinopril',
  tty: 'IN',
  synonym: 'lisinopril',
  score: '100',
  source: 'RXNORM',
};

const mockSelectedDrug: SelectedDrugInfo = {
  name: 'Lisinopril',
  rxcui: '207106',
  tty: 'IN',
  isIngredient: true,
};

const mockApproximateTermResponse = {
  approximateGroup: {
    candidate: [
      {
        rxcui: '207106',
        name: 'Lisinopril',
        tty: 'IN',
        score: '100',
        rank: '1',
        source: 'RXNORM',
      },
      {
        rxcui: '202442',
        name: 'Lisinopril / Hydrochlorothiazide',
        tty: 'IN',
        score: '90',
        rank: '2',
        source: 'RXNORM',
      },
    ],
  },
};

const mockPropertyResponse = {
  propConceptGroup: {
    propConcept: [
      {
        propName: 'TTY',
        propValue: 'IN',
      },
    ],
  },
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
type TestState = ReturnType<TestStore['getState']>;

describe('drugSearchSlice', () => {
  let store: TestStore;
  let mockFetch: jest.MockedFunction<typeof fetch>;

  beforeEach(() => {
    store = createTestStore();
    mockFetch = createMockFetch();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('reducers', () => {
    describe('updateQuery', () => {
      it('should update query and reset state', () => {
        // Set up initial state with some data
        store.dispatch(selectDrug(mockRxNormSuggestion));
        store.dispatch(setStatus('succeeded'));

        // Update query
        store.dispatch(updateQuery('aspirin'));

        const state = store.getState().drugSearch;
        expect(state.query).toBe('aspirin');
        expect(state.status).toBe('idle');
        expect(state.error).toBe(null);
        expect(state.results).toEqual([]);
        expect(state.selectedDrug).toBe(null);
      });

      it('should handle empty query', () => {
        store.dispatch(updateQuery(''));

        const state = store.getState().drugSearch;
        expect(state.query).toBe('');
      });
    });

    describe('selectDrug', () => {
      it('should select drug and update selectedDrug state', () => {
        store.dispatch(selectDrug(mockRxNormSuggestion));

        const state = store.getState().drugSearch;
        expect(state.selectedDrug).toEqual(mockSelectedDrug);
        expect(state.results).toEqual([]);
        expect(state.status).toBe('idle');
      });

      it('should mark non-ingredient drugs correctly', () => {
        const brandNameSuggestion: RxNormSuggestion = {
          ...mockRxNormSuggestion,
          tty: 'BN',
        };

        store.dispatch(selectDrug(brandNameSuggestion));

        const state = store.getState().drugSearch;
        expect(state.selectedDrug?.isIngredient).toBe(false);
      });

      it('should handle PIN and MIN ingredient types', () => {
        const pinSuggestion: RxNormSuggestion = {
          ...mockRxNormSuggestion,
          tty: 'PIN',
        };

        store.dispatch(selectDrug(pinSuggestion));

        const state = store.getState().drugSearch;
        expect(state.selectedDrug?.isIngredient).toBe(true);
      });
    });

    describe('resetSearchState', () => {
      it('should reset all search state to initial values', () => {
        // Set up some state
        store.dispatch(updateQuery('test'));
        store.dispatch(selectDrug(mockRxNormSuggestion));
        store.dispatch(setStatus('failed'));
        store.dispatch(incrementRetry());

        // Reset state
        store.dispatch(resetSearchState());

        const state = store.getState().drugSearch;
        expect(state.query).toBe('');
        expect(state.results).toEqual([]);
        expect(state.selectedDrug).toBe(null);
        expect(state.status).toBe('idle');
        expect(state.error).toBe(null);
        expect(state.lastSearchTimestamp).toBe(null);
        expect(state.retries).toBe(0);
      });
    });

    describe('incrementRetry', () => {
      it('should increment retry count', () => {
        store.dispatch(incrementRetry());
        store.dispatch(incrementRetry());

        const state = store.getState().drugSearch;
        expect(state.retries).toBe(2);
      });
    });

    describe('setStatus', () => {
      it('should update status', () => {
        store.dispatch(setStatus('loading'));

        const state = store.getState().drugSearch;
        expect(state.status).toBe('loading');
      });

      it('should handle all status types', () => {
        const statuses = [
          'idle',
          'loading',
          'succeeded',
          'failed',
          'retrying',
        ] as const;

        statuses.forEach((status) => {
          store.dispatch(setStatus(status));
          expect(store.getState().drugSearch.status).toBe(status);
        });
      });
    });
  });

  describe('selectors', () => {
    beforeEach(() => {
      // Set up some state for selectors
      store.dispatch(updateQuery('test query'));
      store.dispatch(selectDrug(mockRxNormSuggestion));
      store.dispatch(setStatus('succeeded'));
      store.dispatch(incrementRetry());
    });

    it('should select query', () => {
      const state = store.getState();
      expect(state.drugSearch.query).toBe('test query');
    });

    it('should select results', () => {
      const state = store.getState();
      expect(state.drugSearch.results).toEqual([]);
    });

    it('should select selected drug', () => {
      const state = store.getState();
      expect(state.drugSearch.selectedDrug).toEqual(mockSelectedDrug);
    });

    it('should select status', () => {
      const state = store.getState();
      expect(state.drugSearch.status).toBe('succeeded');
    });

    it('should select error', () => {
      const state = store.getState();
      expect(state.drugSearch.error).toBe(null);
    });

    it('should select retries', () => {
      const state = store.getState();
      expect(state.drugSearch.retries).toBe(1);
    });
  });

  describe('fetchDrugResults async thunk', () => {
    beforeEach(() => {
      mockFetch.mockClear();
    });

    it('should handle successful API response with ingredient TTY', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockApproximateTermResponse,
      } as Response);

      const result = await store.dispatch(fetchDrugResults('lisinopril'));

      expect(result.type).toBe('drugSearch/fetchResults/fulfilled');
      expect(result.payload).toEqual([
        {
          rxcui: '207106',
          name: 'Lisinopril',
          tty: 'IN',
          synonym: '',
          score: '100',
          source: 'RXNORM',
        },
        {
          rxcui: '202442',
          name: 'Lisinopril / Hydrochlorothiazide',
          tty: 'IN',
          synonym: '',
          score: '90',
          source: 'RXNORM',
        },
      ]);

      const state = store.getState().drugSearch;
      expect(state.status).toBe('succeeded');
      expect(state.results).toHaveLength(2);
      expect(state.retries).toBe(0);
    });

    it('should handle candidates without TTY by fetching TTY separately', async () => {
      const candidateWithoutTTY = {
        approximateGroup: {
          candidate: [
            {
              rxcui: '207106',
              name: 'lisinopril',
              score: '100',
              rank: '1',
              source: 'RXNORM',
            },
          ],
        },
      };

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => candidateWithoutTTY,
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockPropertyResponse,
        } as Response);

      const result = await store.dispatch(fetchDrugResults('lisinopril'));

      expect(result.type).toBe('drugSearch/fetchResults/fulfilled');
      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://rxnav.nlm.nih.gov/REST/rxcui/207106/property.json?propName=TTY'
      );

      expect(result.payload).toEqual([
        {
          rxcui: '207106',
          name: 'lisinopril',
          tty: 'IN',
          synonym: '',
          score: '100',
          source: 'RXNORM',
        },
      ]);
    });

    it('should filter out non-ingredient drugs', async () => {
      const mixedTTYResponse = {
        approximateGroup: {
          candidate: [
            {
              rxcui: '207106',
              name: 'Lisinopril',
              tty: 'IN',
              score: '100',
              rank: '1',
              source: 'RXNORM',
            },
            {
              rxcui: '207107',
              name: 'Lisinopril Brand',
              tty: 'BN',
              score: '90',
              rank: '2',
              source: 'RXNORM',
            },
          ],
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mixedTTYResponse,
      } as Response);

      const result = await store.dispatch(fetchDrugResults('lisinopril'));

      expect(result.type).toBe('drugSearch/fetchResults/fulfilled');
      expect(result.payload).toHaveLength(1);
      expect((result.payload as RxNormSuggestion[])[0].tty).toBe('IN');
    });

    it('should handle empty API response', async () => {
      const emptyResponse = {
        approximateGroup: {
          candidate: [],
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => emptyResponse,
      } as Response);

      const result = await store.dispatch(fetchDrugResults('nonexistent'));

      expect(result.type).toBe('drugSearch/fetchResults/fulfilled');
      expect(result.payload).toEqual([]);
    });

    it('should handle API errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await store.dispatch(fetchDrugResults('lisinopril'));

      expect(result.type).toBe('drugSearch/fetchResults/rejected');
      expect(result.payload).toBe('Network error');

      const state = store.getState().drugSearch;
      expect(state.status).toBe('failed');
      expect(state.error).toBe('Network error');
    });

    it('should handle non-200 API responses', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      } as Response);

      const result = await store.dispatch(fetchDrugResults('lisinopril'));

      expect(result.type).toBe('drugSearch/fetchResults/rejected');
      expect(result.payload).toBe(
        'RxNorm API (approximateTerm) request failed with status: 500'
      );
    });

    it('should deduplicate results by rxcui and source', async () => {
      const duplicateResponse = {
        approximateGroup: {
          candidate: [
            {
              rxcui: '207106',
              name: 'Lisinopril',
              tty: 'IN',
              score: '100',
              rank: '1',
              source: 'RXNORM',
            },
            {
              rxcui: '207106',
              name: 'Lisinopril',
              tty: 'IN',
              score: '100',
              rank: '1',
              source: 'RXNORM',
            },
          ],
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => duplicateResponse,
      } as Response);

      const result = await store.dispatch(fetchDrugResults('lisinopril'));

      expect(result.type).toBe('drugSearch/fetchResults/fulfilled');
      expect(result.payload).toHaveLength(1);
    });

    it('should sort results by score and name', async () => {
      const unsortedResponse = {
        approximateGroup: {
          candidate: [
            {
              rxcui: '207108',
              name: 'Zebra Drug',
              tty: 'IN',
              score: '50',
              rank: '3',
              source: 'RXNORM',
            },
            {
              rxcui: '207106',
              name: 'Lisinopril',
              tty: 'IN',
              score: '100',
              rank: '1',
              source: 'RXNORM',
            },
            {
              rxcui: '207107',
              name: 'Alpha Drug',
              tty: 'IN',
              score: '100',
              rank: '2',
              source: 'RXNORM',
            },
          ],
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => unsortedResponse,
      } as Response);

      const result = await store.dispatch(fetchDrugResults('test'));

      expect(result.type).toBe('drugSearch/fetchResults/fulfilled');
      expect(result.payload).toHaveLength(3);
      expect((result.payload as RxNormSuggestion[])[0].name).toBe('Alpha Drug'); // Higher score, alphabetically first
      expect((result.payload as RxNormSuggestion[])[1].name).toBe('Lisinopril'); // Higher score, alphabetically second
      expect((result.payload as RxNormSuggestion[])[2].name).toBe('Zebra Drug'); // Lower score
    });

    it('should limit results to 15 items', async () => {
      const manyResults = Array.from({ length: 20 }, (_, i) => ({
        rxcui: `20710${i}`,
        name: `Drug ${i}`,
        tty: 'IN',
        score: '100',
        rank: `${i + 1}`,
        source: 'RXNORM',
      }));

      const largeResponse = {
        approximateGroup: {
          candidate: manyResults,
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => largeResponse,
      } as Response);

      const result = await store.dispatch(fetchDrugResults('drug'));

      expect(result.type).toBe('drugSearch/fetchResults/fulfilled');
      expect(result.payload).toHaveLength(15);
    });
  });

  describe('extraReducers', () => {
    it('should handle fetchDrugResults.pending', () => {
      const pendingAction = { type: fetchDrugResults.pending.type };
      const state = drugSearchReducer(undefined, pendingAction);

      expect(state.status).toBe('loading');
      expect(state.error).toBe(null);
      expect(state.lastSearchTimestamp).toBeDefined();
    });

    it('should handle fetchDrugResults.fulfilled', () => {
      const fulfilledAction = {
        type: fetchDrugResults.fulfilled.type,
        payload: [mockRxNormSuggestion],
      };
      const state = drugSearchReducer(undefined, fulfilledAction);

      expect(state.status).toBe('succeeded');
      expect(state.results).toEqual([mockRxNormSuggestion]);
      expect(state.retries).toBe(0);
    });

    it('should handle fetchDrugResults.rejected', () => {
      const rejectedAction = {
        type: fetchDrugResults.rejected.type,
        payload: 'Test error',
      };
      const state = drugSearchReducer(undefined, rejectedAction);

      expect(state.status).toBe('failed');
      expect(state.error).toBe('Test error');
    });
  });

  describe('initial state', () => {
    it('should have correct initial state', () => {
      const state = drugSearchReducer(undefined, { type: 'unknown' });

      expect(state).toEqual({
        query: '',
        results: [],
        selectedDrug: null,
        status: 'idle',
        error: null,
        lastSearchTimestamp: null,
        retries: 0,
        maxRetries: 3,
      });
    });
  });
});
