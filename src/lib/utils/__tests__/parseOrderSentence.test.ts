import { parseOrderSentence } from '../parseOrderSentence';

describe('parseOrderSentence', () => {
  describe('input validation', () => {
    it('should handle null input', () => {
      const result = parseOrderSentence(null);
      expect(result).toEqual({});
    });

    it('should handle undefined input', () => {
      const result = parseOrderSentence(undefined);
      expect(result).toEqual({});
    });

    it('should handle empty string input', () => {
      const result = parseOrderSentence('');
      expect(result).toEqual({});
    });

    it('should handle non-string input', () => {
      const result = parseOrderSentence(123 as any);
      expect(result).toEqual({});
    });
  });

  describe('dose and UOM parsing', () => {
    it('should parse simple dose and UOM', () => {
      const result = parseOrderSentence('400 mg, Oral, Tab, One Time');
      expect(result.DOSE).toBe('400');
      expect(result.DOSE_UOM).toBe('mg');
      expect(result.RXROUTE).toBe('Oral');
      expect(result.DOSE_FORM).toBe('Tab');
      expect(result.FREQUENCY).toBe('One Time');
    });

    it('should parse dose with decimal points', () => {
      const result = parseOrderSentence('2.5 mg, Oral, Tab, Daily');
      expect(result.DOSE).toBe('2.5');
      expect(result.DOSE_UOM).toBe('mg');
    });

    it('should parse dose ranges', () => {
      const result = parseOrderSentence('5-10 mg, Oral, Tab, Daily');
      expect(result.DOSE).toBe('5-10');
      expect(result.DOSE_UOM).toBe('mg');
    });

    it('should parse dose ranges with spaces', () => {
      const result = parseOrderSentence('5 - 10 mg, Oral, Tab, Daily');
      expect(result.DOSE).toBe('5 - 10');
      expect(result.DOSE_UOM).toBe('mg');
    });

    it('should parse complex UOM like mg/kg', () => {
      const result = parseOrderSentence('10 mg/kg, IV, Soln, BID');
      expect(result.DOSE).toBe('10');
      expect(result.DOSE_UOM).toBe('mg/kg');
      expect(result.RXROUTE).toBe('IV');
      expect(result.DOSE_FORM).toBe('Soln');
      expect(result.FREQUENCY).toBe('BID');
    });

    it('should parse UOM with special characters', () => {
      const result = parseOrderSentence('100 µg, Oral, Tab, Daily');
      expect(result.DOSE).toBe('100');
      expect(result.DOSE_UOM).toBe('µg');
    });

    it('should parse UOM with percentage', () => {
      const result = parseOrderSentence('5%, Topical, Cream, BID');
      expect(result.DOSE).toBe('5');
      expect(result.DOSE_UOM).toBe('%');
    });

    it('should handle dose with commas (limitation: splits on comma)', () => {
      const result = parseOrderSentence('1,000 mg, Oral, Tab, Daily');
      // The function splits on comma, so it misparses "1,000" as separate parts
      expect(result.DOSE).toBe('000');
      expect(result.DOSE_UOM).toBe('mg');
      expect(result.RXROUTE).toBe('1');
    });

    it('should handle missing dose/UOM', () => {
      const result = parseOrderSentence('Oral, Tab, Daily');
      expect(result.DOSE).toBeUndefined();
      expect(result.DOSE_UOM).toBeUndefined();
      expect(result.RXROUTE).toBe('Oral');
      expect(result.DOSE_FORM).toBe('Tab');
      expect(result.FREQUENCY).toBe('Daily');
    });
  });

  describe('route and dose form parsing', () => {
    it('should parse different routes', () => {
      const routes = ['Oral', 'IV', 'IM', 'Topical', 'Sublingual', 'Rectal'];
      routes.forEach((route) => {
        const result = parseOrderSentence(`10 mg, ${route}, Tab, Daily`);
        expect(result.RXROUTE).toBe(route);
      });
    });

    it('should parse different dose forms', () => {
      const forms = ['Tab', 'Cap', 'Soln', 'Cream', 'Oint', 'Inj'];
      forms.forEach((form) => {
        const result = parseOrderSentence(`10 mg, Oral, ${form}, Daily`);
        expect(result.DOSE_FORM).toBe(form);
      });
    });

    it('should handle missing route but present dose form', () => {
      const result = parseOrderSentence('10 mg, , Tab, Daily');
      // Empty parts are filtered out, so sequence shifts
      expect(result.DOSE).toBe('10');
      expect(result.DOSE_UOM).toBe('mg');
      expect(result.RXROUTE).toBe('Tab');
      expect(result.DOSE_FORM).toBe('Daily');
    });

    it('should handle missing dose form but present route', () => {
      const result = parseOrderSentence('10 mg, Oral, , Daily');
      // Empty parts are filtered out, so sequence shifts
      expect(result.DOSE).toBe('10');
      expect(result.DOSE_UOM).toBe('mg');
      expect(result.RXROUTE).toBe('Oral');
      expect(result.DOSE_FORM).toBe('Daily');
    });
  });

  describe('frequency parsing', () => {
    it('should parse simple frequencies', () => {
      const frequencies = [
        'Daily',
        'BID',
        'TID',
        'QID',
        'One Time',
        'Every 8 hours',
      ];
      frequencies.forEach((freq) => {
        const result = parseOrderSentence(`10 mg, Oral, Tab, ${freq}`);
        expect(result.FREQUENCY).toBe(freq);
      });
    });

    it('should parse complex frequencies', () => {
      const result = parseOrderSentence(
        '10 mg, Oral, Tab, Every 6 hours for 7 days'
      );
      expect(result.FREQUENCY).toBe('Every 6 hours for 7 days');
    });

    it('should handle frequency with multiple commas', () => {
      const result = parseOrderSentence(
        '10 mg, Oral, Tab, Take with food, daily'
      );
      expect(result.FREQUENCY).toBe('Take with food, daily');
    });
  });

  describe('PRN parsing', () => {
    it('should parse PRN without reason', () => {
      const result = parseOrderSentence('10 mg, Oral, Tab, Daily, PRN');
      expect(result.DOSE).toBe('10');
      expect(result.DOSE_UOM).toBe('mg');
      expect(result.RXROUTE).toBe('Oral');
      expect(result.DOSE_FORM).toBe('Tab');
      expect(result.FREQUENCY).toBe('Daily');
      expect(result.PRN).toBe('PRN');
      expect(result.PRN_REASON).toBeUndefined();
    });

    it('should parse PRN with reason', () => {
      const result = parseOrderSentence(
        '10 mg, Oral, Tab, Daily, PRN for pain'
      );
      expect(result.FREQUENCY).toBe('Daily');
      expect(result.PRN).toBe('PRN');
      expect(result.PRN_REASON).toBe('for pain');
    });

    it('should parse PRN with reason after comma', () => {
      const result = parseOrderSentence(
        '10 mg, Oral, Tab, Daily, PRN, for nausea'
      );
      expect(result.FREQUENCY).toBe('Daily');
      expect(result.PRN).toBe('PRN');
      expect(result.PRN_REASON).toBe('for nausea');
    });

    it('should handle PRN case insensitive', () => {
      const result = parseOrderSentence(
        '10 mg, Oral, Tab, Daily, prn for pain'
      );
      expect(result.PRN).toBe('PRN');
      expect(result.PRN_REASON).toBe('for pain');
    });

    it('should handle PRN in middle of frequency', () => {
      const result = parseOrderSentence(
        '10 mg, Oral, Tab, Every 4 hours PRN for pain'
      );
      expect(result.FREQUENCY).toBe('Every 4 hours');
      expect(result.PRN).toBe('PRN');
      expect(result.PRN_REASON).toBe('for pain');
    });

    it('should handle PRN at beginning of frequency', () => {
      const result = parseOrderSentence(
        '10 mg, Oral, Tab, PRN for breakthrough pain'
      );
      expect(result.FREQUENCY).toBeUndefined();
      expect(result.PRN).toBe('PRN');
      expect(result.PRN_REASON).toBe('for breakthrough pain');
    });

    it('should handle multiple PRN mentions (should find first)', () => {
      const result = parseOrderSentence(
        '10 mg, Oral, Tab, PRN for pain, note: PRN only'
      );
      expect(result.FREQUENCY).toBeUndefined();
      expect(result.PRN).toBe('PRN');
      expect(result.PRN_REASON).toBe('for pain, note: PRN only');
    });
  });

  describe('edge cases and complex scenarios', () => {
    it('should handle sentence with only dose', () => {
      const result = parseOrderSentence('400 mg');
      expect(result.DOSE).toBe('400');
      expect(result.DOSE_UOM).toBe('mg');
      expect(result.RXROUTE).toBeUndefined();
      expect(result.DOSE_FORM).toBeUndefined();
      expect(result.FREQUENCY).toBeUndefined();
    });

    it('should handle sentence with extra whitespace', () => {
      const result = parseOrderSentence(
        '  400 mg  ,  Oral  ,  Tab  ,  Daily  '
      );
      expect(result.DOSE).toBe('400');
      expect(result.DOSE_UOM).toBe('mg');
      expect(result.RXROUTE).toBe('Oral');
      expect(result.DOSE_FORM).toBe('Tab');
      expect(result.FREQUENCY).toBe('Daily');
    });

    it('should handle sentence with empty parts', () => {
      const result = parseOrderSentence('400 mg, , , Daily');
      // Empty parts are filtered out, so sequence shifts
      expect(result.DOSE).toBe('400');
      expect(result.DOSE_UOM).toBe('mg');
      expect(result.RXROUTE).toBe('Daily');
      expect(result.DOSE_FORM).toBeUndefined();
      expect(result.FREQUENCY).toBeUndefined();
    });

    it('should convert empty strings to undefined', () => {
      const result = parseOrderSentence('400 mg, , , ');
      expect(result.DOSE).toBe('400');
      expect(result.DOSE_UOM).toBe('mg');
      expect(result.RXROUTE).toBeUndefined();
      expect(result.DOSE_FORM).toBeUndefined();
      expect(result.FREQUENCY).toBeUndefined();
    });

    it('should handle complex medication instruction', () => {
      const result = parseOrderSentence(
        'Apply to affected area(s), Topical, Cream, Daily for 7 days'
      );
      // This will likely parse poorly as mentioned in the original code comment
      // but we test the current behavior
      expect(result.RXROUTE).toBe('Apply to affected area(s)');
      expect(result.DOSE_FORM).toBe('Topical');
      expect(result.FREQUENCY).toBe('Cream, Daily for 7 days');
    });

    it('should handle single word input', () => {
      const result = parseOrderSentence('Daily');
      expect(result.DOSE).toBeUndefined();
      expect(result.DOSE_UOM).toBeUndefined();
      expect(result.RXROUTE).toBe('Daily');
      expect(result.DOSE_FORM).toBeUndefined();
      expect(result.FREQUENCY).toBeUndefined();
    });

    it('should handle sentence without commas', () => {
      const result = parseOrderSentence('400 mg Oral Tab Daily');
      expect(result.DOSE).toBe('400');
      expect(result.DOSE_UOM).toBe('mg');
      expect(result.RXROUTE).toBeUndefined();
      expect(result.DOSE_FORM).toBeUndefined();
      expect(result.FREQUENCY).toBeUndefined();
    });

    it('should handle long UOM that matches greedy regex', () => {
      const result = parseOrderSentence('10 mg/kg/day, IV, Soln, Daily');
      expect(result.DOSE).toBe('10');
      expect(result.DOSE_UOM).toBe('mg/kg/day');
      expect(result.RXROUTE).toBe('IV');
      expect(result.DOSE_FORM).toBe('Soln');
      expect(result.FREQUENCY).toBe('Daily');
    });
  });

  describe('real-world examples', () => {
    it('should parse typical oral medication (limitation: no commas)', () => {
      const result = parseOrderSentence('Lisinopril 10 mg PO Daily');
      // No commas, so it only parses the whole thing as RXROUTE
      expect(result.DOSE).toBeUndefined();
      expect(result.DOSE_UOM).toBeUndefined();
      expect(result.RXROUTE).toBe('Lisinopril 10 mg PO Daily');
      expect(result.DOSE_FORM).toBeUndefined();
      expect(result.FREQUENCY).toBeUndefined();
    });

    it('should parse IV medication with PRN (limitation: drug name first)', () => {
      const result = parseOrderSentence(
        'Morphine 2 mg, IV, Inj, Every 4 hours, PRN for pain'
      );
      // Function expects dose first, not drug name
      expect(result.DOSE).toBeUndefined();
      expect(result.DOSE_UOM).toBeUndefined();
      expect(result.RXROUTE).toBe('Morphine 2 mg');
      expect(result.DOSE_FORM).toBe('IV');
      expect(result.FREQUENCY).toBe('Inj, Every 4 hours');
      expect(result.PRN).toBe('PRN');
      expect(result.PRN_REASON).toBe('for pain');
    });

    it('should parse topical medication (limitation: drug name first)', () => {
      const result = parseOrderSentence(
        'Hydrocortisone 1%, Topical, Cream, Apply BID'
      );
      // Function expects dose first, not drug name
      expect(result.DOSE).toBeUndefined();
      expect(result.DOSE_UOM).toBeUndefined();
      expect(result.RXROUTE).toBe('Hydrocortisone 1%');
      expect(result.DOSE_FORM).toBe('Topical');
      expect(result.FREQUENCY).toBe('Cream, Apply BID');
    });

    it('should parse insulin with units (limitation: drug name first)', () => {
      const result = parseOrderSentence(
        'Regular Insulin 10 units, SQ, Inj, AC & HS'
      );
      // Function expects dose first, not drug name
      expect(result.DOSE).toBeUndefined();
      expect(result.DOSE_UOM).toBeUndefined();
      expect(result.RXROUTE).toBe('Regular Insulin 10 units');
      expect(result.DOSE_FORM).toBe('SQ');
      expect(result.FREQUENCY).toBe('Inj, AC & HS');
    });

    it('should parse one-time medication (limitation: drug name first)', () => {
      const result = parseOrderSentence(
        'Acetaminophen 650 mg, Oral, Tab, One Time'
      );
      // Function expects dose first, not drug name
      expect(result.DOSE).toBeUndefined();
      expect(result.DOSE_UOM).toBeUndefined();
      expect(result.RXROUTE).toBe('Acetaminophen 650 mg');
      expect(result.DOSE_FORM).toBe('Oral');
      expect(result.FREQUENCY).toBe('Tab, One Time');
    });
  });

  describe('return value structure', () => {
    it('should return ParsedOrderSentence with correct interface', () => {
      const result = parseOrderSentence(
        '400 mg, Oral, Tab, Daily, PRN for pain'
      );

      // Check that result has expected properties
      expect(result).toHaveProperty('DOSE');
      expect(result).toHaveProperty('DOSE_UOM');
      expect(result).toHaveProperty('RXROUTE');
      expect(result).toHaveProperty('DOSE_FORM');
      expect(result).toHaveProperty('FREQUENCY');
      expect(result).toHaveProperty('PRN');
      expect(result).toHaveProperty('PRN_REASON');

      // Check that values are strings or undefined
      Object.values(result).forEach((value) => {
        expect(typeof value === 'string' || value === undefined).toBe(true);
      });
    });

    it('should not have empty string values in final result', () => {
      const result = parseOrderSentence('400 mg, , , ');

      // All values should be either string with content or undefined
      Object.values(result).forEach((value) => {
        if (value !== undefined) {
          expect(typeof value).toBe('string');
          expect(value.length).toBeGreaterThan(0);
        }
      });
    });
  });
});
