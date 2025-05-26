export interface ParsedOrderSentence {
  DOSE?: string;
  DOSE_UOM?: string;
  RXROUTE?: string;
  DOSE_FORM?: string;
  FREQUENCY?: string;
  PRN?: string;
  PRN_REASON?: string;
  [key: string]: string | undefined; // For any other misc parts
}

/**
 * Parses a Cerner Order Sentence string into its components.
 * Example: "400 mg, Oral, Tab, One Time" -> 
 * { DOSE: "400", DOSE_UOM: "mg", RXROUTE: "Oral", DOSE_FORM: "Tab", FREQUENCY: "One Time" }
 */
export function parseOrderSentence(sentence: string | undefined | null): ParsedOrderSentence {
  if (!sentence || typeof sentence !== 'string') {
    // console.log('[parseOrderSentence] Input is null, undefined, or not a string:', sentence);
    return {};
  }
  // console.log('[parseOrderSentence] Attempting to parse:', sentence);

  const parsed: ParsedOrderSentence = {};
  const originalParts = sentence.split(',').map(part => part.trim()).filter(part => part.length > 0);
  let parts = [...originalParts]; // Work with a mutable copy for processing

  // console.log('[parseOrderSentence] Initial parts:', parts);

  // 1. Attempt to identify Dose and UOM
  const doseUomRegex = /^([\d.,-]+(?:\s*-\s*[\d.,-]+)?)\s*([a-zA-Zµ%\/\.]+.*)/i; // Made UOM part more greedy initially
  let foundDoseUOM = false;
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    const match = part.match(doseUomRegex);
    if (match) {
      parsed.DOSE = match[1].trim();
      // Further refine UOM extraction from match[2]
      const uomOnlyRegex = /^([a-zA-Zµ%\/\.]+)/i;
      const uomMatch = match[2].trim().match(uomOnlyRegex);
      if (uomMatch) {
        parsed.DOSE_UOM = uomMatch[1].trim();
      } else {
        parsed.DOSE_UOM = match[2].trim(); // Fallback if specific UOM pattern fails
      }
      // console.log(`[parseOrderSentence] Matched DOSE: "${parsed.DOSE}", UOM: "${parsed.DOSE_UOM}" from part: "${part}"`);
      parts.splice(i, 1); // Remove the processed part
      foundDoseUOM = true;
      break; 
    }
  }
  if (!foundDoseUOM) {
    // console.log('[parseOrderSentence] DOSE/UOM not found using regex. Parts:', parts);
  }

  // console.log('[parseOrderSentence] Parts after DOSE/UOM extraction:', parts);

  // 2. Tentatively assign RXROUTE and DOSE_FORM from the beginning of remaining parts
  // These are highly order-dependent and might be wrong if DOSE/UOM was not first.
  if (parts.length > 0 && !parsed.RXROUTE) {
    parsed.RXROUTE = parts.shift()?.trim();
    // console.log(`[parseOrderSentence] Tentatively assigned RXROUTE: "${parsed.RXROUTE}"`);
  }
  if (parts.length > 0 && !parsed.DOSE_FORM) {
    parsed.DOSE_FORM = parts.shift()?.trim();
    // console.log(`[parseOrderSentence] Tentatively assigned DOSE_FORM: "${parsed.DOSE_FORM}"`);
  }

  // console.log('[parseOrderSentence] Parts after RXROUTE/DOSE_FORM extraction:', parts);

  // 3. Process remaining parts for FREQUENCY, PRN, and PRN_REASON
  let remainingSentenceStr = parts.join(', ');
  // console.log('[parseOrderSentence] Remaining sentence string for PRN/Freq processing:', remainingSentenceStr);

  const prnRegex = /\bPRN\b/i;
  const prnMatch = remainingSentenceStr.match(prnRegex);

  if (prnMatch) {
    parsed.PRN = "PRN";
    // console.log('[parseOrderSentence] Found PRN.');
    const prnIndex = prnMatch.index!;
    const afterPrnStr = remainingSentenceStr.substring(prnIndex + "PRN".length).trim();
    
    // Extract PRN_REASON (text after "PRN" and optional comma/space)
    let prnReasonCandidate = afterPrnStr;
    if (prnReasonCandidate.startsWith(',')) {
      prnReasonCandidate = prnReasonCandidate.substring(1).trim();
    }
    if (prnReasonCandidate) {
        parsed.PRN_REASON = prnReasonCandidate; 
        // console.log(`[parseOrderSentence] Assigned PRN_REASON: "${parsed.PRN_REASON}"`);
    }

    // Assign FREQUENCY to be the part before PRN
    const beforePrnStr = remainingSentenceStr.substring(0, prnIndex).trim();
    if (beforePrnStr.endsWith(',')) {
      parsed.FREQUENCY = beforePrnStr.substring(0, beforePrnStr.length - 1).trim();
    } else {
      parsed.FREQUENCY = beforePrnStr;
    }
    // console.log(`[parseOrderSentence] Assigned FREQUENCY (with PRN): "${parsed.FREQUENCY}"`);

  } else {
    // No PRN found, the rest is FREQUENCY
    parsed.FREQUENCY = remainingSentenceStr;
    // console.log(`[parseOrderSentence] No PRN found. Assigned FREQUENCY: "${parsed.FREQUENCY}"`);
  }
  
  // Final check for empty strings and convert to undefined if so
  (Object.keys(parsed) as Array<keyof ParsedOrderSentence>).forEach(key => {
    if (parsed[key] === '') {
      parsed[key] = undefined;
    }
  });

  // console.log('[parseOrderSentence] Final parsed object:', parsed);
  return parsed;
}

// Example Usage:
// const sentence1 = "400 mg, Oral, Tab, One Time";
// console.log(parseOrderSentence(sentence1));
// Output: { DOSE: "400", DOSE_UOM: "mg", RXROUTE: "Oral", DOSE_FORM: "Tab", FREQUENCY: "One Time" }

// const sentence2 = "10 mg/kg, IV, Soln, BID";
// console.log(parseOrderSentence(sentence2));
// Output: { DOSE: "10", DOSE_UOM: "mg/kg", RXROUTE: "IV", DOSE_FORM: "Soln", FREQUENCY: "BID" }

// const sentence3 = "Apply to affected area(s), Topical, Cream, Daily for 7 days";
// console.log(parseOrderSentence(sentence3)); 
// This will likely parse poorly with current logic, highlighting need for refinement. 