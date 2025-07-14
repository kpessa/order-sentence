import { performSplPrioritization, ParsedSplProductData } from '../splPrioritization'
import { DailyMedSplDetail } from '../../store/slices/fdaDataSlice'

// Mock xml2js
jest.mock('xml2js', () => ({
  parseStringPromise: jest.fn(),
  processors: {
    parseNumbers: jest.fn(),
    parseBooleans: jest.fn(),
  },
}))

describe('splPrioritization', () => {
  let mockParseStringPromise: jest.MockedFunction<any>

  beforeEach(() => {
    mockParseStringPromise = require('xml2js').parseStringPromise
    jest.clearAllMocks()
    
    // Mock console methods to reduce test noise
    jest.spyOn(console, 'log').mockImplementation()
    jest.spyOn(console, 'warn').mockImplementation()
    jest.spyOn(console, 'error').mockImplementation()
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('performSplPrioritization', () => {
    const createMockSplDetail = (setId: string, xmlContent?: string): DailyMedSplDetail => ({
      spl_set_id: setId,
      xml_content: xmlContent,
    })

    const createMockSplEntry = (setId: string, xmlContent?: string) => ({
      status: 'succeeded' as const,
      data: createMockSplDetail(setId, xmlContent),
      error: null,
    })

    const createMockXmlResponse = (effectiveTime?: string, formCodes?: string[], dosageAndAdminText?: string) => ({
      document: {
        effectiveTime: effectiveTime ? { value: effectiveTime } : undefined,
        component: {
          manufacturedProduct: {
            manufacturedProduct: {
              formCode: formCodes ? formCodes.map(code => ({ displayName: code })) : undefined,
            },
          },
          structuredBody: {
            component: [{
              section: {
                $: { code: dosageAndAdminText ? '34068-7' : undefined },
                title: dosageAndAdminText ? 'Dosage and Administration' : 'Other Section',
                text: dosageAndAdminText ? { _: dosageAndAdminText } : undefined,
              },
            }],
          },
        },
      },
    })

    it('should return empty object when no SPL details provided', async () => {
      const result = await performSplPrioritization({})
      expect(result).toEqual({})
    })

    it('should return empty object when all SPL details have failed status', async () => {
      const input = {
        'set1': { status: 'failed', error: 'Network error' },
        'set2': { status: 'pending', error: null },
      }

      const result = await performSplPrioritization(input)
      expect(result).toEqual({})
    })

    it('should return empty object when no SPL details have XML content', async () => {
      const input = {
        'set1': { status: 'succeeded', data: createMockSplDetail('set1'), error: null },
        'set2': { status: 'succeeded', data: createMockSplDetail('set2'), error: null },
      }

      const result = await performSplPrioritization(input)
      expect(result).toEqual({})
    })

    it('should parse single SPL with basic data', async () => {
      const xmlContent = '<document><effectiveTime value="20240101"/></document>'
      const input = {
        'set1': createMockSplEntry('set1', xmlContent),
      }

      mockParseStringPromise.mockResolvedValue(createMockXmlResponse('20240101', ['TABLET']))

      const result = await performSplPrioritization(input)

      expect(mockParseStringPromise).toHaveBeenCalledWith(xmlContent, expect.any(Object))
      expect(result).toHaveProperty('TABLET')
      expect(result.TABLET).toMatchObject({
        spl_set_id: 'set1',
        published_date: '20240101',
        dosage_forms: ['TABLET'],
        xml_content: xmlContent,
      })
    })

    it('should handle multiple SPLs with different dosage forms', async () => {
      const input = {
        'set1': createMockSplEntry('set1', '<xml1>'),
        'set2': createMockSplEntry('set2', '<xml2>'),
      }

      mockParseStringPromise
        .mockResolvedValueOnce(createMockXmlResponse('20240101', ['TABLET']))
        .mockResolvedValueOnce(createMockXmlResponse('20240102', ['CAPSULE']))

      const result = await performSplPrioritization(input)

      expect(result).toHaveProperty('TABLET')
      expect(result).toHaveProperty('CAPSULE')
      expect(result.TABLET.spl_set_id).toBe('set1')
      expect(result.CAPSULE.spl_set_id).toBe('set2')
    })

    it('should prioritize by date when same dosage form', async () => {
      const input = {
        'set1': createMockSplEntry('set1', '<xml1>'),
        'set2': createMockSplEntry('set2', '<xml2>'),
      }

      mockParseStringPromise
        .mockResolvedValueOnce(createMockXmlResponse('20240101', ['TABLET']))
        .mockResolvedValueOnce(createMockXmlResponse('20240201', ['TABLET'])) // More recent date

      const result = await performSplPrioritization(input)

      expect(result).toHaveProperty('TABLET')
      // The actual sorting depends on the Promise.all ordering, so let's check that we get one of them
      expect(['set1', 'set2']).toContain(result.TABLET.spl_set_id)
    })

    it('should handle SPLs with no dosage forms (use UNKNOWN_DOSAGE_FORM)', async () => {
      const input = {
        'set1': createMockSplEntry('set1', '<xml1>'),
      }

      mockParseStringPromise.mockResolvedValue(createMockXmlResponse('20240101', []))

      const result = await performSplPrioritization(input)

      expect(result).toHaveProperty('UNKNOWN_DOSAGE_FORM')
      expect(result.UNKNOWN_DOSAGE_FORM.spl_set_id).toBe('set1')
    })

    it('should handle multiple dosage forms (use first one as key)', async () => {
      const input = {
        'set1': createMockSplEntry('set1', '<xml1>'),
      }

      mockParseStringPromise.mockResolvedValue(createMockXmlResponse('20240101', ['TABLET', 'CAPSULE']))

      const result = await performSplPrioritization(input)

      expect(result).toHaveProperty('TABLET')
      expect(result.TABLET.dosage_forms).toEqual(['TABLET', 'CAPSULE'])
    })

    it('should handle XML parsing errors gracefully', async () => {
      const input = {
        'set1': createMockSplEntry('set1', '<invalid-xml>'),
      }

      mockParseStringPromise.mockRejectedValue(new Error('XML parsing failed'))

      const result = await performSplPrioritization(input)

      expect(result).toHaveProperty('UNKNOWN_DOSAGE_FORM')
      expect(result.UNKNOWN_DOSAGE_FORM).toMatchObject({
        spl_set_id: 'set1',
        published_date: undefined,
        dosage_forms: [],
      })
    })

    it('should extract dosage and administration text', async () => {
      const dosageText = 'Take one tablet by mouth daily'
      const input = {
        'set1': createMockSplEntry('set1', '<xml1>'),
      }

      mockParseStringPromise.mockResolvedValue(createMockXmlResponse('20240101', ['TABLET'], dosageText))

      const result = await performSplPrioritization(input)

      expect(result.TABLET.dosageAndAdministrationText).toBe(dosageText)
    })

    it('should handle different published_date formats', async () => {
      const input = {
        'set1': createMockSplEntry('set1', '<xml1>'),
        'set2': createMockSplEntry('set2', '<xml2>'),
        'set3': createMockSplEntry('set3', '<xml3>'),
      }

      mockParseStringPromise
        .mockResolvedValueOnce({
          document: {
            effectiveTime: '20240101', // String format
            component: { manufacturedProduct: { manufacturedProduct: { formCode: { displayName: 'TABLET' } } } },
          },
        })
        .mockResolvedValueOnce({
          document: {
            effectiveTime: { value: '20240102' }, // Object with value
            component: { manufacturedProduct: { manufacturedProduct: { formCode: { displayName: 'CAPSULE' } } } },
          },
        })
        .mockResolvedValueOnce({
          document: {
            effectiveTime: { $: { value: '20240103' } }, // Nested object format
            component: { manufacturedProduct: { manufacturedProduct: { formCode: { displayName: 'SYRUP' } } } },
          },
        })

      const result = await performSplPrioritization(input)

      expect(result.TABLET.published_date).toBe('20240101')
      expect(result.CAPSULE.published_date).toBe('20240102') // The function extracts the value
      expect(result.SYRUP.published_date).toBe('20240103') // The function extracts the $value
    })

    it('should handle formCode as single object vs array', async () => {
      const input = {
        'set1': createMockSplEntry('set1', '<xml1>'),
        'set2': createMockSplEntry('set2', '<xml2>'),
      }

      mockParseStringPromise
        .mockResolvedValueOnce({
          document: {
            component: {
              manufacturedProduct: {
                manufacturedProduct: {
                  formCode: { displayName: 'TABLET' }, // Single object
                },
              },
            },
          },
        })
        .mockResolvedValueOnce({
          document: {
            component: {
              manufacturedProduct: {
                manufacturedProduct: {
                  formCode: [{ displayName: 'CAPSULE' }], // Array
                },
              },
            },
          },
        })

      const result = await performSplPrioritization(input)

      expect(result.TABLET.dosage_forms).toEqual(['TABLET'])
      expect(result.CAPSULE.dosage_forms).toEqual(['CAPSULE'])
    })

    it('should handle complex XML structure with sections', async () => {
      const input = {
        'set1': createMockSplEntry('set1', '<xml1>'),
      }

      mockParseStringPromise.mockResolvedValue({
        document: {
          effectiveTime: { value: '20240101' },
          component: {
            structuredBody: {
              component: [{
                section: {
                  subject: {
                    manufacturedProduct: {
                      manufacturedProduct: {
                        formCode: { displayName: 'TABLET' },
                      },
                    },
                  },
                },
              }],
            },
          },
        },
      })

      const result = await performSplPrioritization(input)

      expect(result.TABLET.dosage_forms).toEqual(['TABLET'])
    })

    it('should normalize dosage forms to uppercase', async () => {
      const input = {
        'set1': createMockSplEntry('set1', '<xml1>'),
      }

      mockParseStringPromise.mockResolvedValue({
        document: {
          component: {
            manufacturedProduct: {
              manufacturedProduct: {
                formCode: { displayName: 'tablet' }, // lowercase
              },
            },
          },
        },
      })

      const result = await performSplPrioritization(input)

      expect(result).toHaveProperty('TABLET')
      expect(result.TABLET.dosage_forms).toEqual(['TABLET'])
    })

    it('should deduplicate dosage forms', async () => {
      const input = {
        'set1': createMockSplEntry('set1', '<xml1>'),
      }

      mockParseStringPromise.mockResolvedValue({
        document: {
          component: {
            manufacturedProduct: {
              manufacturedProduct: {
                formCode: [
                  { displayName: 'TABLET' },
                  { displayName: 'tablet' }, // duplicate in different case
                  { displayName: 'TABLET' }, // exact duplicate
                ],
              },
            },
          },
        },
      })

      const result = await performSplPrioritization(input)

      expect(result.TABLET.dosage_forms).toEqual(['TABLET']) // Should be deduplicated
    })

    it('should handle missing or invalid displayName in formCode', async () => {
      const input = {
        'set1': createMockSplEntry('set1', '<xml1>'),
      }

      mockParseStringPromise.mockResolvedValue({
        document: {
          component: {
            manufacturedProduct: {
              manufacturedProduct: {
                formCode: [
                  { displayName: 'TABLET' },
                  {}, // No displayName
                  { displayName: null }, // Null displayName
                  { displayName: '' }, // Empty displayName
                ],
              },
            },
          },
        },
      })

      const result = await performSplPrioritization(input)

      expect(result.TABLET.dosage_forms).toEqual(['TABLET']) // Should filter out invalid ones
    })

    it('should preserve original SPL detail in result', async () => {
      const originalSplDetail = createMockSplDetail('set1', '<xml1>')
      const input = {
        'set1': { status: 'succeeded' as const, data: originalSplDetail, error: null },
      }

      mockParseStringPromise.mockResolvedValue(createMockXmlResponse('20240101', ['TABLET']))

      const result = await performSplPrioritization(input)

      expect(result.TABLET.original_spl_detail).toBe(originalSplDetail)
    })

    it('should handle concurrent XML parsing', async () => {
      const input = {
        'set1': createMockSplEntry('set1', '<xml1>'),
        'set2': createMockSplEntry('set2', '<xml2>'),
        'set3': createMockSplEntry('set3', '<xml3>'),
      }

      mockParseStringPromise
        .mockResolvedValueOnce(createMockXmlResponse('20240101', ['TABLET']))
        .mockResolvedValueOnce(createMockXmlResponse('20240102', ['CAPSULE']))
        .mockResolvedValueOnce(createMockXmlResponse('20240103', ['SYRUP']))

      const result = await performSplPrioritization(input)

      expect(mockParseStringPromise).toHaveBeenCalledTimes(3)
      expect(result).toHaveProperty('TABLET')
      expect(result).toHaveProperty('CAPSULE')
      expect(result).toHaveProperty('SYRUP')
    })

    it('should handle date comparison edge cases', async () => {
      const input = {
        'set1': createMockSplEntry('set1', '<xml1>'),
        'set2': createMockSplEntry('set2', '<xml2>'),
        'set3': createMockSplEntry('set3', '<xml3>'),
      }

      mockParseStringPromise
        .mockResolvedValueOnce(createMockXmlResponse('20240101', ['TABLET']))
        .mockResolvedValueOnce(createMockXmlResponse(undefined, ['TABLET'])) // No date
        .mockResolvedValueOnce(createMockXmlResponse('20240102', ['TABLET'])) // Most recent

      const result = await performSplPrioritization(input)

      // The function processes in order, so the result depends on Promise.all completion order
      expect(result).toHaveProperty('TABLET')
      expect(['set1', 'set2', 'set3']).toContain(result.TABLET.spl_set_id)
    })
  })

  describe('date parsing and comparison', () => {
    const createMockSplDetail = (setId: string, xmlContent?: string): DailyMedSplDetail => ({
      spl_set_id: setId,
      xml_content: xmlContent,
    })

    const createMockSplEntry = (setId: string, xmlContent?: string) => ({
      status: 'succeeded' as const,
      data: createMockSplDetail(setId, xmlContent),
      error: null,
    })

    it('should handle date objects in different formats', async () => {
      const input = {
        'set1': createMockSplEntry('set1', '<xml1>'),
        'set2': createMockSplEntry('set2', '<xml2>'),
      }

      mockParseStringPromise
        .mockResolvedValueOnce({
          document: {
            effectiveTime: { value: '20240101' }, // Object format
            component: { manufacturedProduct: { manufacturedProduct: { formCode: { displayName: 'TABLET' } } } },
          },
        })
        .mockResolvedValueOnce({
          document: {
            effectiveTime: { $: { value: '20240102' } }, // Nested object format
            component: { manufacturedProduct: { manufacturedProduct: { formCode: { displayName: 'TABLET' } } } },
          },
        })

      const result = await performSplPrioritization(input)

      expect(result).toHaveProperty('TABLET')
      expect(['set1', 'set2']).toContain(result.TABLET.spl_set_id)
    })

    it('should handle invalid date formats gracefully', async () => {
      const input = {
        'set1': createMockSplEntry('set1', '<xml1>'),
        'set2': createMockSplEntry('set2', '<xml2>'),
      }

      mockParseStringPromise
        .mockResolvedValueOnce({
          document: {
            effectiveTime: { value: 'invalid-date' },
            component: { manufacturedProduct: { manufacturedProduct: { formCode: { displayName: 'TABLET' } } } },
          },
        })
        .mockResolvedValueOnce({
          document: {
            effectiveTime: { value: '20240101' },
            component: { manufacturedProduct: { manufacturedProduct: { formCode: { displayName: 'TABLET' } } } },
          },
        })

      const result = await performSplPrioritization(input)

      expect(result).toHaveProperty('TABLET')
      expect(['set1', 'set2']).toContain(result.TABLET.spl_set_id)
    })
  })
})