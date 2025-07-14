import { configureStore } from '@reduxjs/toolkit'
import excelDataReducer, {
  fetchExcelData,
  selectAllExcelData,
  selectExcelDataLoading,
  selectExcelDataError,
  ExcelRow,
} from '../excelDataSlice'
import { createMockFetch } from '@/__tests__/utils/mock-factories'
import * as XLSX from 'xlsx'

// Mock XLSX library
jest.mock('xlsx', () => ({
  read: jest.fn(),
  utils: {
    sheet_to_json: jest.fn(),
  },
}))

// Mock data
const mockExcelData: ExcelRow[] = [
  {
    'Generic Name': 'Lisinopril',
    'Brand Name': 'Prinivil',
    'Strength': '10 mg',
    'Form': 'Tablet',
    'Route': 'PO',
    'Frequency': 'Daily',
    'Order Type': 'Scheduled',
    'Order Sentence': 'Lisinopril 10 mg PO Daily',
  },
  {
    'Generic Name': 'Metformin',
    'Brand Name': 'Glucophage',
    'Strength': '500 mg',
    'Form': 'Tablet',
    'Route': 'PO',
    'Frequency': 'BID',
    'Order Type': 'Scheduled',
    'Order Sentence': 'Metformin 500 mg PO BID',
  },
]

const mockWorkbook = {
  SheetNames: ['Order Sentences'],
  Sheets: {
    'Order Sentences': {
      '!ref': 'A1:H10',
    },
  },
}

const mockRawSheetData = [
  ['Column A', 'Column B', 'Column C'],
  ['Generic Name', 'Brand Name', 'Strength', 'Form', 'Route', 'Frequency', 'Order Type', 'Order Sentence'],
  ['Lisinopril', 'Prinivil', '10 mg', 'Tablet', 'PO', 'Daily', 'Scheduled', 'Lisinopril 10 mg PO Daily'],
  ['Metformin', 'Glucophage', '500 mg', 'Tablet', 'PO', 'BID', 'Scheduled', 'Metformin 500 mg PO BID'],
]

describe('excelDataSlice', () => {
  let store: ReturnType<typeof configureStore>
  let mockFetch: jest.MockedFunction<typeof fetch>
  let mockXLSXRead: jest.MockedFunction<typeof XLSX.read>
  let mockSheetToJson: jest.MockedFunction<typeof XLSX.utils.sheet_to_json>

  beforeEach(() => {
    store = configureStore({
      reducer: {
        excelData: excelDataReducer,
      },
    })
    mockFetch = createMockFetch()
    mockXLSXRead = XLSX.read as jest.MockedFunction<typeof XLSX.read>
    mockSheetToJson = XLSX.utils.sheet_to_json as jest.MockedFunction<typeof XLSX.utils.sheet_to_json>
    
    // Reset mock implementations
    mockFetch.mockReset()
    mockXLSXRead.mockReset()
    mockSheetToJson.mockReset()
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('initial state', () => {
    it('should have correct initial state', () => {
      const state = store.getState().excelData
      expect(state).toEqual({
        data: [],
        loading: 'idle',
        error: null,
      })
    })
  })

  describe('selectors', () => {
    it('should select all excel data', () => {
      const data = selectAllExcelData(store.getState())
      expect(data).toEqual([])
    })

    it('should select excel data loading state', () => {
      const loading = selectExcelDataLoading(store.getState())
      expect(loading).toBe('idle')
    })

    it('should select excel data error', () => {
      const error = selectExcelDataError(store.getState())
      expect(error).toBe(null)
    })
  })

  describe('fetchExcelData async thunk', () => {
    const mockArrayBuffer = new ArrayBuffer(8)

    beforeEach(() => {
      mockXLSXRead.mockReturnValue(mockWorkbook)
      mockSheetToJson.mockReturnValue(mockRawSheetData)
    })

    it('should successfully fetch and parse Excel data', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        arrayBuffer: async () => mockArrayBuffer,
      } as Response)

      const result = await store.dispatch(fetchExcelData())
      
      expect(result.type).toBe('excelData/fetchData/fulfilled')
      expect(result.payload).toEqual(mockExcelData)
      
      const state = store.getState().excelData
      expect(state.loading).toBe('succeeded')
      expect(state.data).toEqual(mockExcelData)
      expect(state.error).toBe(null)
    })

    it('should handle fetch errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      const result = await store.dispatch(fetchExcelData())
      
      expect(result.type).toBe('excelData/fetchData/rejected')
      expect(result.payload).toBe('Network error')
      
      const state = store.getState().excelData
      expect(state.loading).toBe('failed')
      expect(state.error).toBe('Network error')
    })

    it('should handle non-200 HTTP responses', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        statusText: 'Not Found',
      } as Response)

      const result = await store.dispatch(fetchExcelData())
      
      expect(result.type).toBe('excelData/fetchData/rejected')
      expect(result.payload).toBe('Failed to fetch Excel file: Not Found')
      
      const state = store.getState().excelData
      expect(state.loading).toBe('failed')
      expect(state.error).toBe('Failed to fetch Excel file: Not Found')
    })

    it('should handle missing worksheet', async () => {
      const workbookWithoutSheet = {
        SheetNames: ['Different Sheet'],
        Sheets: {
          'Different Sheet': {},
        },
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        arrayBuffer: async () => mockArrayBuffer,
      } as Response)
      
      mockXLSXRead.mockReturnValue(workbookWithoutSheet)

      const result = await store.dispatch(fetchExcelData())
      
      expect(result.type).toBe('excelData/fetchData/rejected')
      expect(result.payload).toBe('Sheet "Order Sentences" not found.')
    })

    it('should handle insufficient rows for header', async () => {
      const insufficientRows = [
        ['Only one row'],
      ]

      mockFetch.mockResolvedValueOnce({
        ok: true,
        arrayBuffer: async () => mockArrayBuffer,
      } as Response)
      
      mockSheetToJson.mockReturnValue(insufficientRows)

      const result = await store.dispatch(fetchExcelData())
      
      expect(result.type).toBe('excelData/fetchData/rejected')
      expect(result.payload).toBe('Header row 2 is out of bounds. Sheet has 1 rows.')
    })

    it('should handle empty data after header row', async () => {
      const onlyHeaderData = [
        ['Column A'],
        ['Generic Name', 'Brand Name', 'Strength'],
      ]

      mockFetch.mockResolvedValueOnce({
        ok: true,
        arrayBuffer: async () => mockArrayBuffer,
      } as Response)
      
      mockSheetToJson.mockReturnValue(onlyHeaderData)

      const result = await store.dispatch(fetchExcelData())
      
      expect(result.type).toBe('excelData/fetchData/fulfilled')
      expect(result.payload).toEqual([])
    })

    it('should handle rows with missing columns', async () => {
      const incompleteRowData = [
        ['Column A'],
        ['Generic Name', 'Brand Name', 'Strength'],
        ['Lisinopril', 'Prinivil'], // Missing some columns
      ]

      mockFetch.mockResolvedValueOnce({
        ok: true,
        arrayBuffer: async () => mockArrayBuffer,
      } as Response)
      
      mockSheetToJson.mockReturnValue(incompleteRowData)

      const result = await store.dispatch(fetchExcelData())
      
      expect(result.type).toBe('excelData/fetchData/fulfilled')
      expect(result.payload).toEqual([
        {
          'Generic Name': 'Lisinopril',
          'Brand Name': 'Prinivil',
          'Strength': undefined,
        },
      ])
    })

    it('should handle headers with whitespace', async () => {
      const headerWithSpaces = [
        ['Column A'],
        [' Generic Name ', '  Brand Name  ', 'Strength'],
        ['Lisinopril', 'Prinivil', '10 mg'],
      ]

      mockFetch.mockResolvedValueOnce({
        ok: true,
        arrayBuffer: async () => mockArrayBuffer,
      } as Response)
      
      mockSheetToJson.mockReturnValue(headerWithSpaces)

      const result = await store.dispatch(fetchExcelData())
      
      expect(result.type).toBe('excelData/fetchData/fulfilled')
      expect(result.payload).toEqual([
        {
          'Generic Name': 'Lisinopril',
          'Brand Name': 'Prinivil',
          'Strength': '10 mg',
        },
      ])
    })

    it('should handle empty headers', async () => {
      const emptyHeaderData = [
        ['Column A'],
        ['Generic Name', '', 'Strength'],
        ['Lisinopril', 'Prinivil', '10 mg'],
      ]

      mockFetch.mockResolvedValueOnce({
        ok: true,
        arrayBuffer: async () => mockArrayBuffer,
      } as Response)
      
      mockSheetToJson.mockReturnValue(emptyHeaderData)

      const result = await store.dispatch(fetchExcelData())
      
      expect(result.type).toBe('excelData/fetchData/fulfilled')
      expect(result.payload).toEqual([
        {
          'Generic Name': 'Lisinopril',
          'Strength': '10 mg',
        },
      ])
    })

    it('should handle XLSX parsing errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        arrayBuffer: async () => mockArrayBuffer,
      } as Response)
      
      mockXLSXRead.mockImplementation(() => {
        throw new Error('Invalid Excel file')
      })

      const result = await store.dispatch(fetchExcelData())
      
      expect(result.type).toBe('excelData/fetchData/rejected')
      expect(result.payload).toBe('Invalid Excel file')
    })
  })

  describe('extraReducers', () => {
    it('should handle fetchExcelData.pending', () => {
      const pendingAction = { type: fetchExcelData.pending.type }
      const state = excelDataReducer(undefined, pendingAction)
      
      expect(state.loading).toBe('pending')
      expect(state.error).toBe(null)
    })

    it('should handle fetchExcelData.fulfilled', () => {
      const fulfilledAction = {
        type: fetchExcelData.fulfilled.type,
        payload: mockExcelData,
      }
      const state = excelDataReducer(undefined, fulfilledAction)
      
      expect(state.loading).toBe('succeeded')
      expect(state.data).toEqual(mockExcelData)
    })

    it('should handle fetchExcelData.rejected with payload', () => {
      const rejectedAction = {
        type: fetchExcelData.rejected.type,
        payload: 'Test error',
      }
      const state = excelDataReducer(undefined, rejectedAction)
      
      expect(state.loading).toBe('failed')
      expect(state.error).toBe('Test error')
    })

    it('should handle fetchExcelData.rejected without payload', () => {
      const rejectedAction = {
        type: fetchExcelData.rejected.type,
        error: { message: 'Error from error object' },
      }
      const state = excelDataReducer(undefined, rejectedAction)
      
      expect(state.loading).toBe('failed')
      expect(state.error).toBe('Error from error object')
    })

    it('should handle fetchExcelData.rejected with fallback error', () => {
      const rejectedAction = {
        type: fetchExcelData.rejected.type,
        payload: undefined,
        error: {},
      }
      const state = excelDataReducer(undefined, rejectedAction)
      
      expect(state.loading).toBe('failed')
      expect(state.error).toBe('Failed to fetch Excel data')
    })
  })

  describe('integration with store', () => {
    it('should work with selectors after failed fetch', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      await store.dispatch(fetchExcelData())
      
      expect(selectAllExcelData(store.getState())).toEqual([])
      expect(selectExcelDataLoading(store.getState())).toBe('failed')
      expect(selectExcelDataError(store.getState())).toBe('Network error')
    })
  })
})