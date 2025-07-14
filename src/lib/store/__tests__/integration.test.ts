import { store } from '../index'
import { updateQuery, selectDrug, resetSearchState } from '../slices/drugSearchSlice'
import { resetFdaState } from '../slices/fdaDataSlice'

describe('Redux Store Integration', () => {
  beforeEach(() => {
    // Reset store to initial state before each test
    store.dispatch(resetSearchState())
    store.dispatch(resetFdaState())
  })

  describe('basic cross-slice interactions', () => {
    it('should handle basic drug search state updates', () => {
      // Initial state
      const initialState = store.getState()
      expect(initialState.drugSearch.query).toBe('')
      expect(initialState.drugSearch.results).toEqual([])
      expect(initialState.drugSearch.selectedDrug).toBeNull()

      // Update search query
      store.dispatch(updateQuery('acetaminophen'))
      let state = store.getState()
      expect(state.drugSearch.query).toBe('acetaminophen')

      // Select a drug (manually create drug data)
      const mockDrug = {
        rxcui: '161',
        name: 'Acetaminophen',
        tty: 'IN',
        isIngredient: true
      }
      store.dispatch(selectDrug(mockDrug))
      state = store.getState()
      expect(state.drugSearch.selectedDrug).toEqual(mockDrug)
    })

    it('should handle excel data initial state', () => {
      // Test the initial state of excel data slice
      const state = store.getState()
      expect(state.excelData.data).toEqual([])
      expect(state.excelData.loading).toBe('idle')
      expect(state.excelData.error).toBeNull()
    })

    it('should handle FDA data state updates', () => {
      const initialState = store.getState()
      expect(initialState.fdaData.ndcList).toEqual([])
      expect(initialState.fdaData.openFdaResults).toEqual([])
      expect(initialState.fdaData.dailyMedDetails).toEqual({})

      // Clear all FDA data (should be no-op but test the action)
      store.dispatch(resetFdaState())
      const state = store.getState()
      expect(state.fdaData.ndcList).toEqual([])
    })
  })

  describe('state consistency', () => {
    it('should maintain consistent state across multiple actions', () => {
      // Dispatch multiple actions to different slices
      store.dispatch(updateQuery('test drug'))
      store.dispatch(resetFdaState())
      
      const state = store.getState()
      
      // Verify each slice maintained its state correctly
      expect(state.drugSearch.query).toBe('test drug')
      expect(state.excelData.data).toEqual([]) // Initial state
      expect(state.fdaData.ndcList).toEqual([])
    })

    it('should handle state resets correctly', () => {
      // Set some initial state
      store.dispatch(updateQuery('initial query'))
      store.dispatch(selectDrug({
        rxcui: '123',
        name: 'Test Drug',
        tty: 'IN',
        isIngredient: true
      }))

      let state = store.getState()
      expect(state.drugSearch.query).toBe('initial query')
      expect(state.drugSearch.selectedDrug).not.toBeNull()

      // Reset search state
      store.dispatch(resetSearchState())
      state = store.getState()
      expect(state.drugSearch.query).toBe('')
      expect(state.drugSearch.selectedDrug).toBeNull()
      expect(state.drugSearch.results).toEqual([])
    })
  })

  describe('performance considerations', () => {
    it('should handle large state updates efficiently', () => {
      // Test performance with drug search state updates
      const startTime = performance.now()
      
      // Dispatch multiple query updates rapidly
      for (let i = 0; i < 1000; i++) {
        store.dispatch(updateQuery(`query-${i}`))
      }
      
      const endTime = performance.now()
      const state = store.getState()
      
      expect(state.drugSearch.query).toBe('query-999')
      expect(endTime - startTime).toBeLessThan(100) // Should be fast
    })

    it('should handle multiple state updates efficiently', () => {
      const startTime = performance.now()
      
      // Dispatch multiple actions rapidly
      for (let i = 0; i < 100; i++) {
        store.dispatch(updateQuery(`term-${i}`))
      }
      
      const endTime = performance.now()
      const state = store.getState()
      
      expect(state.drugSearch.query).toBe('term-99')
      expect(endTime - startTime).toBeLessThan(50) // Should be fast
    })
  })

  describe('type safety', () => {
    it('should provide correct TypeScript types for state', () => {
      const state = store.getState()
      
      // TypeScript should infer correct types
      expect(typeof state.drugSearch.query).toBe('string')
      expect(typeof state.drugSearch.status).toBe('string')
      expect(Array.isArray(state.drugSearch.results)).toBe(true)
      expect(Array.isArray(state.excelData.data)).toBe(true)
      expect(Array.isArray(state.fdaData.ndcList)).toBe(true)
    })

    it('should provide correct TypeScript types for dispatch', () => {
      // Test that dispatch works with proper typing
      const dispatch = store.dispatch
      expect(typeof dispatch).toBe('function')
      
      // Test dispatching typed actions
      dispatch(updateQuery('test'))
      dispatch(resetFdaState())
      
      // Verify the actions worked
      const state = store.getState()
      expect(state.drugSearch.query).toBe('test')
    })
  })
})