import React, { ReactElement } from 'react'
import { render, RenderOptions } from '@testing-library/react'
import { Provider } from 'react-redux'
import { configureStore, combineReducers } from '@reduxjs/toolkit'
import drugSearchReducer from '@/lib/store/slices/drugSearchSlice'
import excelDataReducer from '@/lib/store/slices/excelDataSlice'
import fdaDataReducer from '@/lib/store/slices/fdaDataSlice'
// import { store } from '@/lib/store'
// import type { RootState } from '@/lib/store'

// Create root reducer just like in the main store
const rootReducer = combineReducers({
  drugSearch: drugSearchReducer,
  excelData: excelDataReducer,
  fdaData: fdaDataReducer,
})

// Helper function to create test store
function createTestStore(preloadedState?: any) {
  return configureStore({
    reducer: rootReducer,
    preloadedState,
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({
        serializableCheck: {
          ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE'],
          ignoredPaths: ['excelData.data'],
        },
      }),
  })
}

// Define test store type
type TestStore = ReturnType<typeof createTestStore>

// Define test state type based on the root reducer
type TestState = ReturnType<typeof rootReducer>

// This type interface extends the default options for render from RTL, as well
// as allows the user to specify other things such as initialState, store.
interface ExtendedRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  preloadedState?: Partial<TestState>
  // Automatically create a store instance if no store was passed in
  store?: TestStore
}

export function renderWithProviders(
  ui: ReactElement,
  extendedRenderOptions: ExtendedRenderOptions = {}
) {
  const {
    preloadedState = {},
    // Automatically create a store instance if no store was passed in
    store = createTestStore(preloadedState),
    ...renderOptions
  } = extendedRenderOptions

  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <Provider store={store}>{children}</Provider>
  )

  // Return an object with the store and all of RTL's query functions
  return {
    store,
    ...render(ui, { wrapper: Wrapper, ...renderOptions }),
  }
}

// Mock data helpers
export const mockDrugSearchState = {
  selectedDrug: {
    rxcui: '207106',
    name: 'Lisinopril',
    tty: 'IN',
  },
  searchResults: [
    {
      rxcui: '207106',
      name: 'Lisinopril',
      tty: 'IN',
    },
    {
      rxcui: '202442',
      name: 'Lisinopril / Hydrochlorothiazide',
      tty: 'IN',
    },
  ],
  isLoading: false,
  error: null,
}

export const mockExcelDataState = {
  data: [
    {
      'Order Id': '123456',
      'Drug Name': 'Lisinopril',
      'Dose': '10 mg',
      'Route': 'PO',
      'Frequency': 'Daily',
    },
  ],
  fileName: 'test-orders.xlsx',
  isLoading: false,
  error: null,
}

export const mockFdaDataState = {
  openFdaResults: [
    {
      id: 'test-id',
      set_id: 'test-set-id',
      brand_name: ['Test Brand'],
      generic_name: ['Test Generic'],
      purpose: ['Test Purpose'],
      dosage_form: ['Tablet'],
      route: ['Oral'],
      manufacturer_name: ['Test Manufacturer'],
    },
  ],
  dailyMedSpls: [
    {
      setId: 'test-set-id',
      title: 'Test SPL Title',
      effectiveTime: '2024-01-01',
      xmlContent: '<spl>test content</spl>',
    },
  ],
  prioritizedSpls: [
    {
      setId: 'test-set-id',
      title: 'Test SPL Title',
      effectiveTime: '2024-01-01',
      xmlContent: '<spl>test content</spl>',
      priority: 1,
      dosageForm: 'Tablet',
    },
  ],
  isLoading: false,
  error: null,
}

// API response mocks
export const mockRxNormResponse = {
  drugGroup: {
    conceptGroup: [
      {
        tty: 'IN',
        conceptProperties: [
          {
            rxcui: '207106',
            name: 'Lisinopril',
            tty: 'IN',
          },
        ],
      },
    ],
  },
}

export const mockOpenFdaResponse = {
  results: [
    {
      id: 'test-id',
      set_id: 'test-set-id',
      brand_name: ['Test Brand'],
      generic_name: ['Test Generic'],
      purpose: ['Test Purpose'],
      dosage_form: ['Tablet'],
      route: ['Oral'],
      manufacturer_name: ['Test Manufacturer'],
    },
  ],
}

export const mockDailyMedResponse = `
<?xml version="1.0" encoding="UTF-8"?>
<document>
  <title>Test SPL Title</title>
  <effectiveTime value="20240101"/>
  <component>
    <section>
      <title>Test Section</title>
      <text>Test content</text>
    </section>
  </component>
</document>
`

// Custom matchers
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeInTheDocument(): R
      toHaveClass(className: string): R
      toHaveTextContent(text: string): R
    }
  }
}

export * from '@testing-library/react'
export { renderWithProviders as render }