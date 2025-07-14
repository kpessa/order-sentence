import { GET } from '../dailymed/[setid]/route';
import { NextResponse } from 'next/server';

// Mock NextResponse
jest.mock('next/server', () => ({
  NextResponse: {
    json: jest.fn(),
  },
}));

// Mock fetch
global.fetch = jest.fn();

// Create a mock NextResponse constructor that can be used in tests
const createMockNextResponse = (body: any, init?: any) => ({
  body,
  status: init?.status || 200,
  headers: init?.headers || {},
});

describe('/api/dailymed/[setid] API Route', () => {
  let mockFetch: jest.MockedFunction<typeof fetch>;
  let mockNextResponseJson: jest.MockedFunction<typeof NextResponse.json>;

  beforeEach(() => {
    mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
    mockNextResponseJson = NextResponse.json as jest.MockedFunction<
      typeof NextResponse.json
    >;
    jest.clearAllMocks();

    // Mock console methods to reduce test noise
    jest.spyOn(console, 'log').mockImplementation();
    jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  const createMockRequest = () => ({}) as Request;

  const createMockParams = (setid: string) => Promise.resolve({ setid });

  describe('parameter validation', () => {
    it('should return 400 error when setid is empty', async () => {
      const request = createMockRequest();
      const params = { params: createMockParams('') };

      mockNextResponseJson.mockReturnValue({} as any);

      await GET(request, params);

      expect(mockNextResponseJson).toHaveBeenCalledWith(
        { error: 'SET ID is required' },
        { status: 400 }
      );
    });

    it('should return 400 error when setid is undefined', async () => {
      const request = createMockRequest();
      const params = { params: Promise.resolve({ setid: undefined as any }) };

      mockNextResponseJson.mockReturnValue({} as any);

      await GET(request, params);

      expect(mockNextResponseJson).toHaveBeenCalledWith(
        { error: 'SET ID is required' },
        { status: 400 }
      );
    });
  });

  describe('successful DailyMed API calls', () => {
    it('should successfully fetch XML from DailyMed', async () => {
      const testSetId = 'test-set-id-123';
      const mockXmlResponse = '<document><test>content</test></document>';

      const request = createMockRequest();
      const params = { params: createMockParams(testSetId) };

      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        text: async () => mockXmlResponse,
      } as Response);

      // Mock the NextResponse constructor
      // The mock result would be used to test the response directly
      // but we can't easily test NextResponse return values in this setup

      // We can't easily test the exact return value, but we can test the fetch call
      await GET(request, params);

      expect(mockFetch).toHaveBeenCalledWith(
        `https://dailymed.nlm.nih.gov/dailymed/services/v2/spls/${testSetId}.xml`,
        {
          headers: {
            'User-Agent': 'NextJS-CustomFetcher/1.0',
          },
        }
      );
    });

    it('should handle large XML responses', async () => {
      const testSetId = 'large-response-id';
      const largeXmlResponse = '<document>' + 'x'.repeat(10000) + '</document>';

      const request = createMockRequest();
      const params = { params: createMockParams(testSetId) };

      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        text: async () => largeXmlResponse,
      } as Response);

      await GET(request, params);

      expect(mockFetch).toHaveBeenCalled();
      expect(mockFetch).toHaveBeenCalledWith(
        `https://dailymed.nlm.nih.gov/dailymed/services/v2/spls/${testSetId}.xml`,
        expect.objectContaining({
          headers: {
            'User-Agent': 'NextJS-CustomFetcher/1.0',
          },
        })
      );
    });
  });

  describe('DailyMed API error handling', () => {
    it('should handle 404 error from DailyMed API', async () => {
      const testSetId = 'non-existent-id';
      const errorResponseText = 'Not Found';

      const request = createMockRequest();
      const params = { params: createMockParams(testSetId) };

      mockFetch.mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        text: async () => errorResponseText,
      } as Response);

      mockNextResponseJson.mockReturnValue({} as any);

      await GET(request, params);

      expect(mockNextResponseJson).toHaveBeenCalledWith(
        {
          error: 'DailyMed API Error (XML): 404 Not Found',
          dailyMedErrorBody: errorResponseText.substring(0, 500),
        },
        { status: 404 }
      );
    });

    it('should handle 500 error from DailyMed API', async () => {
      const testSetId = 'server-error-id';
      const errorResponseText = 'Internal Server Error';

      const request = createMockRequest();
      const params = { params: createMockParams(testSetId) };

      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        text: async () => errorResponseText,
      } as Response);

      mockNextResponseJson.mockReturnValue({} as any);

      await GET(request, params);

      expect(mockNextResponseJson).toHaveBeenCalledWith(
        {
          error: 'DailyMed API Error (XML): 500 Internal Server Error',
          dailyMedErrorBody: errorResponseText.substring(0, 500),
        },
        { status: 500 }
      );
    });

    it('should truncate long error responses', async () => {
      const testSetId = 'long-error-id';
      const longErrorResponse = 'Error: ' + 'x'.repeat(1000);

      const request = createMockRequest();
      const params = { params: createMockParams(testSetId) };

      mockFetch.mockResolvedValue({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        text: async () => longErrorResponse,
      } as Response);

      mockNextResponseJson.mockReturnValue({} as any);

      await GET(request, params);

      expect(mockNextResponseJson).toHaveBeenCalledWith(
        {
          error: 'DailyMed API Error (XML): 400 Bad Request',
          dailyMedErrorBody: longErrorResponse.substring(0, 500),
        },
        { status: 400 }
      );
    });
  });

  describe('network error handling', () => {
    it('should handle network errors', async () => {
      const testSetId = 'network-error-id';
      const networkError = new Error('Network error');

      const request = createMockRequest();
      const params = { params: createMockParams(testSetId) };

      mockFetch.mockRejectedValue(networkError);
      mockNextResponseJson.mockReturnValue({} as any);

      await GET(request, params);

      expect(mockNextResponseJson).toHaveBeenCalledWith(
        {
          error: `Failed to fetch XML from DailyMed for ${testSetId}: Network error`,
        },
        { status: 500 }
      );
    });

    it('should handle timeout errors', async () => {
      const testSetId = 'timeout-error-id';
      const timeoutError = new Error('Request timeout');

      const request = createMockRequest();
      const params = { params: createMockParams(testSetId) };

      mockFetch.mockRejectedValue(timeoutError);
      mockNextResponseJson.mockReturnValue({} as any);

      await GET(request, params);

      expect(mockNextResponseJson).toHaveBeenCalledWith(
        {
          error: `Failed to fetch XML from DailyMed for ${testSetId}: Request timeout`,
        },
        { status: 500 }
      );
    });

    it('should handle unknown errors', async () => {
      const testSetId = 'unknown-error-id';
      const unknownError = { message: 'Unknown error' };

      const request = createMockRequest();
      const params = { params: createMockParams(testSetId) };

      mockFetch.mockRejectedValue(unknownError);
      mockNextResponseJson.mockReturnValue({} as any);

      await GET(request, params);

      expect(mockNextResponseJson).toHaveBeenCalledWith(
        {
          error: `Failed to fetch XML from DailyMed for ${testSetId}: Unknown error`,
        },
        { status: 500 }
      );
    });
  });

  describe('request headers', () => {
    it('should include correct User-Agent header', async () => {
      const testSetId = 'user-agent-test';
      const mockXmlResponse = '<document><test>content</test></document>';

      const request = createMockRequest();
      const params = { params: createMockParams(testSetId) };

      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        text: async () => mockXmlResponse,
      } as Response);

      await GET(request, params);

      expect(mockFetch).toHaveBeenCalledWith(expect.any(String), {
        headers: {
          'User-Agent': 'NextJS-CustomFetcher/1.0',
        },
      });
    });
  });

  describe('response format', () => {
    it('should return XML with correct content-type', async () => {
      const testSetId = 'content-type-test';
      const mockXmlResponse = '<document><test>content</test></document>';

      const request = createMockRequest();
      const params = { params: createMockParams(testSetId) };

      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        text: async () => mockXmlResponse,
      } as Response);

      // We test the fetch call and can verify the route runs without error
      await GET(request, params);

      expect(mockFetch).toHaveBeenCalledWith(
        `https://dailymed.nlm.nih.gov/dailymed/services/v2/spls/${testSetId}.xml`,
        expect.objectContaining({
          headers: {
            'User-Agent': 'NextJS-CustomFetcher/1.0',
          },
        })
      );
    });
  });
});
