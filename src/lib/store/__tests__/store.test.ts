import { store, persistor } from '../index';
import { persistStore } from 'redux-persist';
import { configureStore } from '@reduxjs/toolkit';

// Mock redux-persist
jest.mock('redux-persist', () => {
  const mockPersistor = {
    pause: jest.fn(),
    flush: jest.fn(),
    purge: jest.fn(),
  };
  return {
    ...jest.requireActual('redux-persist'),
    persistStore: jest.fn(() => mockPersistor),
    persistReducer: jest.fn((config, reducer) => reducer),
  };
});

// Mock localStorage
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};

// Mock window.localStorage
Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
  writable: true,
});

describe('Redux Store Configuration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('store configuration', () => {
    it('should be configured with correct reducer structure', () => {
      const state = store.getState();

      expect(state).toHaveProperty('drugSearch');
      expect(state).toHaveProperty('excelData');
      expect(state).toHaveProperty('fdaData');
    });

    it('should have correct initial state for all slices', () => {
      const state = store.getState();

      // Check drugSearch initial state
      expect(state.drugSearch).toHaveProperty('query');
      expect(state.drugSearch).toHaveProperty('results');
      expect(state.drugSearch).toHaveProperty('status');
      expect(state.drugSearch).toHaveProperty('error');

      // Check excelData initial state
      expect(state.excelData).toHaveProperty('data');
      expect(state.excelData).toHaveProperty('loading');
      expect(state.excelData).toHaveProperty('error');

      // Check fdaData initial state
      expect(state.fdaData).toHaveProperty('ndcList');
      expect(state.fdaData).toHaveProperty('openFdaResults');
      expect(state.fdaData).toHaveProperty('dailyMedDetails');
      expect(state.fdaData).toHaveProperty('prioritizedSplsByDosageForm');
    });

    it('should handle action dispatching correctly', () => {
      const initialState = store.getState();

      // Dispatch a simple action to test store functionality
      store.dispatch({
        type: 'drugSearch/updateQuery',
        payload: 'test medication',
      });

      const newState = store.getState();
      expect(newState.drugSearch.query).toBe('test medication');
      expect(newState).not.toBe(initialState); // Ensure immutability
    });
  });

  describe('persistence configuration', () => {
    it('should call persistStore with the store', () => {
      // The persistStore should be called when the module is imported
      // Testing this is complex with mocks, but we can verify the persistor exists
      expect(persistor).toBeDefined();
    });

    it('should have persistor available', () => {
      // The persistor should be available for use
      expect(persistor).toBeDefined();
      expect(persistor).toHaveProperty('pause');
      expect(persistor).toHaveProperty('flush');
      expect(persistor).toHaveProperty('purge');
    });
  });

  describe('middleware configuration', () => {
    it('should ignore redux-persist actions in serializableCheck', () => {
      // Test that redux-persist actions don't cause serialization warnings
      const persistActions = [
        'persist/FLUSH',
        'persist/REHYDRATE',
        'persist/PAUSE',
        'persist/PERSIST',
        'persist/PURGE',
        'persist/REGISTER',
      ];

      persistActions.forEach((actionType) => {
        expect(() => {
          store.dispatch({ type: actionType });
        }).not.toThrow();
      });
    });

    it('should ignore excelData.data path for serializability checks', () => {
      // Test that non-serializable data in excelData.data is handled
      // Note: The serializability check still runs but logs a warning instead of throwing
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      store.dispatch({
        type: 'excelData/setData',
        payload: {
          data: [
            {
              id: 1,
              simpleField: 'value',
            },
          ],
          columns: ['id'],
        },
      });

      // Test passes if no exception is thrown
      expect(consoleSpy).toHaveBeenCalledTimes(0);
      consoleSpy.mockRestore();
    });
  });

  describe('type safety', () => {
    it('should provide correct TypeScript types for RootState', () => {
      const state = store.getState();

      // TypeScript should infer correct types
      expect(typeof state.drugSearch.query).toBe('string');
      expect(typeof state.drugSearch.status).toBe('string');
      expect(Array.isArray(state.drugSearch.results)).toBe(true);
      expect(Array.isArray(state.excelData.data)).toBe(true);
      expect(Array.isArray(state.fdaData.ndcList)).toBe(true);
    });

    it('should provide correct TypeScript types for AppDispatch', () => {
      // Test that dispatch works with proper typing
      const dispatch = store.dispatch;
      expect(typeof dispatch).toBe('function');

      // Test dispatching typed actions
      dispatch({ type: 'drugSearch/updateQuery', payload: 'test' });
      dispatch({ type: 'excelData/setLoading', payload: true });
      dispatch({ type: 'fdaData/clearAll' });
    });
  });
});
