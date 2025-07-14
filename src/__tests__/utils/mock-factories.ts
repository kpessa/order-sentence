// Mock factory for external API calls
export const createMockFetch = () => {
  const mockFetch = jest.fn()
  global.fetch = mockFetch
  return mockFetch
}

// RxNorm API Mock Factory
export const mockRxNormApiResponse = (data: any) => {
  return {
    ok: true,
    status: 200,
    json: async () => data,
  }
}

// OpenFDA API Mock Factory
export const mockOpenFdaApiResponse = (data: any) => {
  return {
    ok: true,
    status: 200,
    json: async () => data,
  }
}

// DailyMed API Mock Factory
export const mockDailyMedApiResponse = (xmlContent: string) => {
  return {
    ok: true,
    status: 200,
    text: async () => xmlContent,
  }
}

// Mock data factories
export const createMockDrug = (overrides: any = {}) => ({
  rxcui: '207106',
  name: 'Lisinopril',
  tty: 'IN',
  ...overrides,
})

export const createMockExcelRow = (overrides: any = {}) => ({
  'Order Id': '123456',
  'Drug Name': 'Lisinopril',
  'Dose': '10 mg',
  'Route': 'PO',
  'Frequency': 'Daily',
  'Instructions': 'Take with food',
  ...overrides,
})

export const createMockOpenFdaResult = (overrides: any = {}) => ({
  id: 'test-id',
  set_id: 'test-set-id',
  brand_name: ['Test Brand'],
  generic_name: ['Test Generic'],
  purpose: ['Test Purpose'],
  dosage_form: ['Tablet'],
  route: ['Oral'],
  manufacturer_name: ['Test Manufacturer'],
  ...overrides,
})

export const createMockSpl = (overrides: any = {}) => ({
  setId: 'test-set-id',
  title: 'Test SPL Title',
  effectiveTime: '2024-01-01',
  xmlContent: '<spl>test content</spl>',
  ...overrides,
})

export const createMockPrioritizedSpl = (overrides: any = {}) => ({
  setId: 'test-set-id',
  title: 'Test SPL Title',
  effectiveTime: '2024-01-01',
  xmlContent: '<spl>test content</spl>',
  priority: 1,
  dosageForm: 'Tablet',
  ...overrides,
})

// Mock IndexedDB
export const createMockIndexedDB = () => {
  const mockDB = {
    transaction: jest.fn(),
    objectStore: jest.fn(),
    add: jest.fn(),
    get: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
    clear: jest.fn(),
  }

  const mockTransaction = {
    objectStore: jest.fn(() => mockDB),
    oncomplete: null,
    onerror: null,
  }

  const mockRequest = {
    result: mockDB,
    onsuccess: null,
    onerror: null,
  }

  const mockIndexedDB = {
    open: jest.fn(() => mockRequest),
    deleteDatabase: jest.fn(),
    cmp: jest.fn(),
  }

  global.indexedDB = mockIndexedDB as any
  
  return {
    mockDB,
    mockTransaction,
    mockRequest,
    mockIndexedDB,
  }
}

// Mock Window APIs
export const mockWindowAPIs = () => {
  // Mock window.location
  delete (window as any).location
  window.location = {
    href: 'http://localhost:3000',
    origin: 'http://localhost:3000',
    protocol: 'http:',
    hostname: 'localhost',
    port: '3000',
    pathname: '/',
    search: '',
    hash: '',
  } as any

  // Mock window.alert, confirm, prompt
  window.alert = jest.fn()
  window.confirm = jest.fn(() => true)
  window.prompt = jest.fn(() => 'test')

  // Mock localStorage
  const mockLocalStorage = {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
    clear: jest.fn(),
  }
  global.localStorage = mockLocalStorage as any

  // Mock sessionStorage
  const mockSessionStorage = {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
    clear: jest.fn(),
  }
  global.sessionStorage = mockSessionStorage as any

  return {
    mockLocalStorage,
    mockSessionStorage,
  }
}

// Mock file operations
export const createMockFile = (
  name: string,
  content: string,
  type: string = 'text/plain'
) => {
  const file = new File([content], name, { type })
  return file
}

export const createMockFileReader = () => {
  const mockFileReader = {
    readAsText: jest.fn(),
    readAsDataURL: jest.fn(),
    readAsArrayBuffer: jest.fn(),
    result: null,
    error: null,
    onload: null,
    onerror: null,
    onloadstart: null,
    onloadend: null,
    onprogress: null,
    onabort: null,
  }

  global.FileReader = jest.fn(() => mockFileReader) as any

  return mockFileReader
}

// Mock Console methods for testing
export const mockConsole = () => {
  const originalConsole = { ...console }
  
  console.log = jest.fn()
  console.warn = jest.fn()
  console.error = jest.fn()
  console.info = jest.fn()
  console.debug = jest.fn()

  return {
    restore: () => {
      console.log = originalConsole.log
      console.warn = originalConsole.warn
      console.error = originalConsole.error
      console.info = originalConsole.info
      console.debug = originalConsole.debug
    },
  }
}

// Reset all mocks
export const resetAllMocks = () => {
  jest.clearAllMocks()
  jest.restoreAllMocks()
}