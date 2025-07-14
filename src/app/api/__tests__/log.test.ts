import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

// Mock NextRequest and NextResponse
jest.mock('next/server', () => ({
  NextRequest: jest.fn(),
  NextResponse: {
    json: jest.fn(),
  },
}))

// Mock fs module
jest.mock('fs', () => ({
  existsSync: jest.fn(),
  promises: {
    mkdir: jest.fn(),
    appendFile: jest.fn(),
  },
}))

// Mock path module
jest.mock('path', () => ({
  join: jest.fn((...args) => args.join('/')),
}))

// Mock process.cwd() before importing the module
jest.spyOn(process, 'cwd').mockReturnValue('/mock/cwd');

// Import the module after mocking
const { POST } = require('../log/route')

describe('/api/log API Route', () => {
  let mockNextResponseJson: jest.MockedFunction<typeof NextResponse.json>
  let mockFsExistsSync: jest.MockedFunction<typeof fs.existsSync>
  let mockFsMkdir: jest.MockedFunction<typeof fs.promises.mkdir>
  let mockFsAppendFile: jest.MockedFunction<typeof fs.promises.appendFile>
  let mockPathJoin: jest.MockedFunction<typeof path.join>

  beforeEach(() => {
    mockNextResponseJson = NextResponse.json as jest.MockedFunction<typeof NextResponse.json>
    mockFsExistsSync = fs.existsSync as jest.MockedFunction<typeof fs.existsSync>
    mockFsMkdir = fs.promises.mkdir as jest.MockedFunction<typeof fs.promises.mkdir>
    mockFsAppendFile = fs.promises.appendFile as jest.MockedFunction<typeof fs.promises.appendFile>
    mockPathJoin = path.join as jest.MockedFunction<typeof path.join>
    
    jest.clearAllMocks()
    
    // Mock console methods to reduce test noise
    jest.spyOn(console, 'log').mockImplementation()
    jest.spyOn(console, 'error').mockImplementation()

    // Setup default mocks
    mockFsExistsSync.mockReturnValue(true)
    mockNextResponseJson.mockReturnValue({} as any)
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  const createMockRequest = (body: any): NextRequest => ({
    json: async () => body,
  } as NextRequest)

  const createMockLogEntry = (overrides: Partial<any> = {}) => ({
    timestamp: '2024-01-01T12:00:00.000Z',
    type: 'INFO' as const,
    message: 'Test log message',
    optionalParams: [],
    ...overrides,
  })

  describe('request validation', () => {
    it('should return 400 error when body is missing logs property', async () => {
      const request = createMockRequest({})

      await POST(request)

      expect(mockNextResponseJson).toHaveBeenCalledWith(
        { message: 'Invalid log data. Expected an array of logs.' },
        { status: 400 }
      )
    })

    it('should return 400 error when logs is not an array', async () => {
      const request = createMockRequest({ logs: 'not-an-array' })

      await POST(request)

      expect(mockNextResponseJson).toHaveBeenCalledWith(
        { message: 'Invalid log data. Expected an array of logs.' },
        { status: 400 }
      )
    })

    it('should return 400 error when logs is null', async () => {
      const request = createMockRequest({ logs: null })

      await POST(request)

      expect(mockNextResponseJson).toHaveBeenCalledWith(
        { message: 'Invalid log data. Expected an array of logs.' },
        { status: 400 }
      )
    })
  })

  describe('successful log processing', () => {
    it('should successfully process valid log entries', async () => {
      const logEntries = [
        createMockLogEntry({ type: 'INFO', message: 'First log' }),
        createMockLogEntry({ type: 'ERROR', message: 'Error log' }),
      ]
      
      const request = createMockRequest({ logs: logEntries })

      await POST(request)

      expect(mockFsAppendFile).toHaveBeenCalledWith(
        expect.stringMatching(/\/mock\/cwd\/logs\/\d{2}-\d{2}_\d{2}-\d{2}-\d{2}\.log$/),
        expect.stringContaining('[2024-01-01T12:00:00.000Z] [INFO] First log')
      )
      expect(mockNextResponseJson).toHaveBeenCalledWith(
        { message: 'Logs received successfully.' },
        { status: 200 }
      )
    })

    it('should handle empty logs array', async () => {
      const request = createMockRequest({ logs: [] })

      await POST(request)

      expect(mockFsAppendFile).toHaveBeenCalledWith(
        expect.stringMatching(/\/mock\/cwd\/logs\/\d{2}-\d{2}_\d{2}-\d{2}-\d{2}\.log$/),
        '\n'
      )
      expect(mockNextResponseJson).toHaveBeenCalledWith(
        { message: 'Logs received successfully.' },
        { status: 200 }
      )
    })

    it('should handle logs with optional parameters', async () => {
      const logEntries = [
        createMockLogEntry({
          message: 'Log with params',
          optionalParams: ['param1', { key: 'value' }, 123]
        }),
      ]
      
      const request = createMockRequest({ logs: logEntries })

      await POST(request)

      expect(mockFsAppendFile).toHaveBeenCalledWith(
        expect.stringMatching(/\/mock\/cwd\/logs\/\d{2}-\d{2}_\d{2}-\d{2}-\d{2}\.log$/),
        expect.stringContaining('[INFO] Log with params param1 {"key":"value"} 123')
      )
    })

    it('should handle logs without optional parameters', async () => {
      const logEntries = [
        createMockLogEntry({
          message: 'Log without params',
          optionalParams: []
        }),
      ]
      
      const request = createMockRequest({ logs: logEntries })

      await POST(request)

      expect(mockFsAppendFile).toHaveBeenCalledWith(
        expect.stringMatching(/\/mock\/cwd\/logs\/\d{2}-\d{2}_\d{2}-\d{2}-\d{2}\.log$/),
        expect.stringContaining('[INFO] Log without params ')
      )
    })
  })

  describe('directory creation', () => {
    it('should create log directory if it does not exist', async () => {
      mockFsExistsSync.mockReturnValue(false)
      const logEntries = [createMockLogEntry()]
      const request = createMockRequest({ logs: logEntries })

      await POST(request)

      expect(mockFsMkdir).toHaveBeenCalledWith('/mock/cwd/logs', { recursive: true })
    })

    it('should not create log directory if it already exists', async () => {
      mockFsExistsSync.mockReturnValue(true)
      const logEntries = [createMockLogEntry()]
      const request = createMockRequest({ logs: logEntries })

      await POST(request)

      expect(mockFsMkdir).not.toHaveBeenCalled()
    })
  })

  describe('log types', () => {
    it('should handle all log types', async () => {
      const logTypes = ['LOG', 'INFO', 'WARN', 'ERROR', 'DEBUG'] as const
      const logEntries = logTypes.map(type => 
        createMockLogEntry({ type, message: `${type} message` })
      )
      
      const request = createMockRequest({ logs: logEntries })

      await POST(request)

      logTypes.forEach(type => {
        expect(mockFsAppendFile).toHaveBeenCalledWith(
          expect.stringMatching(/\/mock\/cwd\/logs\/\d{2}-\d{2}_\d{2}-\d{2}-\d{2}\.log$/),
          expect.stringContaining(`[${type}] ${type} message`)
        )
      })
    })
  })

  describe('error handling', () => {
    it('should handle JSON parsing errors', async () => {
      const request = {
        json: async () => {
          throw new Error('Invalid JSON')
        }
      } as NextRequest

      await POST(request)

      expect(mockNextResponseJson).toHaveBeenCalledWith(
        { 
          message: 'Failed to process logs.',
          error: 'Invalid JSON'
        },
        { status: 500 }
      )
    })

    it('should handle file system errors', async () => {
      const logEntries = [createMockLogEntry()]
      const request = createMockRequest({ logs: logEntries })
      
      mockFsAppendFile.mockRejectedValue(new Error('File system error'))

      await POST(request)

      expect(mockNextResponseJson).toHaveBeenCalledWith(
        { 
          message: 'Failed to process logs.',
          error: 'File system error'
        },
        { status: 500 }
      )
    })

    it('should handle directory creation errors', async () => {
      mockFsExistsSync.mockReturnValue(false)
      mockFsMkdir.mockRejectedValue(new Error('Cannot create directory'))
      
      const logEntries = [createMockLogEntry()]
      const request = createMockRequest({ logs: logEntries })

      await POST(request)

      expect(mockNextResponseJson).toHaveBeenCalledWith(
        { 
          message: 'Failed to process logs.',
          error: 'Cannot create directory'
        },
        { status: 500 }
      )
    })

    it('should handle non-Error exceptions', async () => {
      const logEntries = [createMockLogEntry()]
      const request = createMockRequest({ logs: logEntries })
      
      mockFsAppendFile.mockRejectedValue('String error')

      await POST(request)

      expect(mockNextResponseJson).toHaveBeenCalledWith(
        { 
          message: 'Failed to process logs.',
          error: 'Internal Server Error'
        },
        { status: 500 }
      )
    })
  })

  describe('log formatting', () => {
    it('should format log entries correctly', async () => {
      const logEntry = createMockLogEntry({
        timestamp: '2024-01-01T12:00:00.000Z',
        type: 'INFO',
        message: 'Test message',
        optionalParams: ['param1', { key: 'value' }]
      })
      
      const request = createMockRequest({ logs: [logEntry] })

      await POST(request)

      expect(mockFsAppendFile).toHaveBeenCalledWith(
        expect.stringMatching(/\/mock\/cwd\/logs\/\d{2}-\d{2}_\d{2}-\d{2}-\d{2}\.log$/),
        '[2024-01-01T12:00:00.000Z] [INFO] Test message param1 {"key":"value"}\n'
      )
    })

    it('should handle complex optional parameters', async () => {
      const complexObject = {
        nested: { array: [1, 2, 3] },
        fn: () => {},
        date: new Date('2024-01-01'),
      }
      
      const logEntry = createMockLogEntry({
        optionalParams: [complexObject, null, undefined, 0, false]
      })
      
      const request = createMockRequest({ logs: [logEntry] })

      await POST(request)

      expect(mockFsAppendFile).toHaveBeenCalledWith(
        expect.stringMatching(/\/mock\/cwd\/logs\/\d{2}-\d{2}_\d{2}-\d{2}-\d{2}\.log$/),
        expect.stringContaining('"nested":{"array":[1,2,3]}')
      )
    })
  })

  describe('filename generation', () => {
    it('should generate filename with current date and time', async () => {
      // Mock Date to return consistent values
      const mockDate = new Date('2024-01-15T14:30:45.123Z')
      jest.spyOn(global, 'Date').mockImplementation(() => mockDate)

      const logEntries = [createMockLogEntry()]
      const request = createMockRequest({ logs: logEntries })

      await POST(request)

      // The filename should be based on the mocked date
      expect(mockPathJoin).toHaveBeenCalledWith(
        '/mock/cwd/logs',
        expect.stringMatching(/^\d{2}-\d{2}_\d{2}-\d{2}-\d{2}\.log$/)
      )
    })
  })
})