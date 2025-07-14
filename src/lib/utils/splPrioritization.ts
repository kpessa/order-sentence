import { DailyMedSplDetail } from '../store/slices/fdaDataSlice';
import { parseStringPromise, processors } from 'xml2js';

// Helper interface for the structure after parsing, focusing on what we need
export interface ParsedSplProductData {
  published_date: string | { value?: string; [key: string]: any } | undefined; // Allow for object form
  dosage_forms: string[];
  spl_set_id: string;
  xml_content?: string; // Keep original XML content if needed later
  dosageAndAdministrationText?: string; // Added field for extracted text
  // Include the original DailyMedSplDetail to carry over any other fields if necessary
  original_spl_detail: DailyMedSplDetail;
}

// Helper function to recursively extract text from an XML node
const extractTextRecursively = (node: any): string => {
  if (!node) return '';
  let text = '';
  if (typeof node === 'string') return node + ' ';
  if (node._ && typeof node._ === 'string') text += node._ + ' '; // Text content from charkey

  for (const key in node) {
    if (
      key === '$' ||
      key === 'caption' ||
      key === 'footnote' ||
      key === 'footnoteRef'
    )
      continue;

    if (Array.isArray(node[key])) {
      node[key].forEach(
        (childNode: any) => (text += extractTextRecursively(childNode))
      );
    } else if (typeof node[key] === 'object') {
      text += extractTextRecursively(node[key]);
    }
  }
  return text;
};

/**
 * Parses XML content from an SPL to extract effectiveTime and formCode displayNames.
 * @param splDetail - The DailyMedSplDetail object containing xml_content.
 * @returns A promise resolving to an object with extracted published_date and dosage_forms.
 */
async function parseSplXml(
  splDetail: DailyMedSplDetail
): Promise<ParsedSplProductData> {
  // Utility to stringify with depth limit to avoid huge logs - MOVED TO TOP OF FUNCTION
  const stringifyWithDepth = (obj: any, depth = 2) => {
    // Default depth is 2, can be overridden
    let currentDepth = 0;
    const cache = new Set();
    return JSON.stringify(
      obj,
      (key, value) => {
        if (typeof value === 'object' && value !== null) {
          if (cache.has(value)) return '[Circular]';
          cache.add(value);
        }
        return value;
      },
      2
    );
  };

  let published_date:
    | string
    | { value?: string; [key: string]: any }
    | undefined = undefined;
  const dosage_forms: string[] = [];
  let dosageAndAdministrationText: string | undefined = undefined;

  // Helper function to process a formCode node (which might be an object or array of objects)
  const processFormCodeNode = (
    formCodeNode: any,
    sourceLocation: string
  ): string[] => {
    const extractedForms: string[] = [];
    console.log(
      `[parseSplXml] SETID ${splDetail.spl_set_id} - processFormCodeNode called from ${sourceLocation}. formCodeNode:`,
      JSON.stringify(formCodeNode, null, 2)
    ); // Log the input
    if (!formCodeNode) return extractedForms;

    const itemsToProcess = Array.isArray(formCodeNode)
      ? formCodeNode
      : [formCodeNode];
    itemsToProcess.forEach((item) => {
      if (item?.displayName) {
        const formName =
          typeof item.displayName === 'object' && item.displayName._
            ? item.displayName._
            : item.displayName;
        if (formName && typeof formName === 'string') {
          console.log(
            `[parseSplXml] SETID ${splDetail.spl_set_id} - Found dosage form '${formName}' from ${sourceLocation}`
          );
          extractedForms.push(formName.toUpperCase());
        } else {
          console.log(
            `[parseSplXml] SETID ${splDetail.spl_set_id} - Found displayName but not a string or empty from ${sourceLocation}. Value: ${JSON.stringify(formName)}`
          );
        }
      } else {
        // console.log(`[parseSplXml] SETID ${splDetail.spl_set_id} - Item in formCode lacks displayName from ${sourceLocation}. Item: ${JSON.stringify(item)}`);
      }
    });
    return extractedForms;
  };

  if (!splDetail.xml_content) {
    console.warn(
      `[parseSplXml] SPL SET ID ${splDetail.spl_set_id} has no xml_content to parse.`
    );
    return {
      published_date,
      dosage_forms,
      spl_set_id: splDetail.spl_set_id,
      xml_content: splDetail.xml_content,
      dosageAndAdministrationText,
      original_spl_detail: splDetail,
    };
  }

  try {
    const parsedXml = await parseStringPromise(splDetail.xml_content, {
      explicitArray: false,
      trim: true,
      charkey: '_',
      valueProcessors: [processors.parseNumbers, processors.parseBooleans],
      attrkey: '$',
    });

    if (parsedXml.document) {
      console.log(
        `[parseSplXml] SETID ${splDetail.spl_set_id} - Top-level keys of parsedXml.document:`,
        Object.keys(parsedXml.document).join(', ')
      );
      // Attempt to find published_date (document level)
      if (parsedXml.document.effectiveTime) {
        published_date =
          parsedXml.document.effectiveTime.value ||
          parsedXml.document.effectiveTime.$?.value ||
          parsedXml.document.effectiveTime;
      }

      // Log keys of document.component if it exists
      if (parsedXml.document.component) {
        console.log(
          `[parseSplXml] SETID ${splDetail.spl_set_id} - Keys of parsedXml.document.component:`,
          Object.keys(parsedXml.document.component).join(', ')
        );
      } else {
        console.log(
          `[parseSplXml] SETID ${splDetail.spl_set_id} - parsedXml.document.component NOT FOUND`
        );
      }

      // --- TARGETED DOSAGE FORM EXTRACTION ---
      // Path 1: Directly under document.component.manufacturedProduct.manufacturedProduct.formCode
      if (
        parsedXml.document.component?.manufacturedProduct?.manufacturedProduct
          ?.formCode
      ) {
        console.log(
          `[parseSplXml] SETID ${splDetail.spl_set_id} - Checking path: document.component.manufacturedProduct.manufacturedProduct.formCode`
        );
        dosage_forms.push(
          ...processFormCodeNode(
            parsedXml.document.component.manufacturedProduct.manufacturedProduct
              .formCode,
            'document.component.manufacturedProduct.manufacturedProduct'
          )
        );
      } else {
        console.log(
          `[parseSplXml] SETID ${splDetail.spl_set_id} - Path not found or formCode missing: document.component.manufacturedProduct.manufacturedProduct.formCode. Parent:`,
          parsedXml.document.component?.manufacturedProduct?.manufacturedProduct
            ? 'Exists'
            : 'Not Found'
        );
      }

      // Path 2: Iterate through sections (document.component.structuredBody.component[].section)
      if (parsedXml.document.component?.structuredBody?.component) {
        const sectionsOuter = Array.isArray(
          parsedXml.document.component.structuredBody.component
        )
          ? parsedXml.document.component.structuredBody.component
          : [parsedXml.document.component.structuredBody.component];

        for (const comp of sectionsOuter) {
          if (comp?.section) {
            const sectionDetails = Array.isArray(comp.section)
              ? comp.section
              : [comp.section];
            for (const section of sectionDetails) {
              if (!published_date && section.effectiveTime) {
                published_date =
                  section.effectiveTime.value ||
                  section.effectiveTime.$?.value ||
                  section.effectiveTime;
              }

              // const currentSectionCode = section.$?.code;
              const currentSectionTitle = section.title?._ || section.title;
              const titleToLog =
                typeof currentSectionTitle === 'object'
                  ? JSON.stringify(currentSectionTitle)
                  : currentSectionTitle;
              // console.log(`[parseSplXml] SETID ${splDetail.spl_set_id} - Examining section: Code: ${currentSectionCode || 'N/A'}, Title: ${titleToLog || 'N/A'}`); // Reduced verbosity

              // D&A Extraction (existing logic)
              let isDandASection = false;
              if (section.$ && section.$.code === '34068-7') {
                isDandASection = true;
              } else if (
                currentSectionTitle &&
                typeof currentSectionTitle === 'string'
              ) {
                const lowerTitle = currentSectionTitle.toLowerCase();
                const normalizedTitle = lowerTitle.replace(/\s+/g, ' ').trim();
                if (
                  normalizedTitle.includes('dosage and administration') ||
                  normalizedTitle.includes('directions')
                ) {
                  isDandASection = true;
                }
              }
              if (isDandASection) {
                let extracted = '';
                if (section.text) {
                  extracted = extractTextRecursively(section.text);
                }
                if (section.component && Array.isArray(section.component)) {
                  section.component.forEach((subComp: any) => {
                    if (subComp.section && subComp.section.text) {
                      extracted +=
                        extractTextRecursively(subComp.section.text) + '\n';
                    } else if (subComp.section) {
                      extracted +=
                        extractTextRecursively(subComp.section) + '\n';
                    }
                  });
                } else if (section.component && section.component.section) {
                  if (section.component.section.text) {
                    extracted +=
                      extractTextRecursively(section.component.section.text) +
                      '\n';
                  } else {
                    extracted +=
                      extractTextRecursively(section.component.section) + '\n';
                  }
                }
                if (extracted.trim()) {
                  dosageAndAdministrationText = extracted
                    .trim()
                    .replace(/\s+/g, ' ');
                }
              }

              // Dosage Form from section.subject.manufacturedProduct.manufacturedProduct.formCode
              if (
                section.subject?.manufacturedProduct?.manufacturedProduct
                  ?.formCode
              ) {
                const fcNode =
                  section.subject.manufacturedProduct.manufacturedProduct
                    .formCode;
                console.log(
                  `[parseSplXml] SETID ${splDetail.spl_set_id} - Checking path in section (Title: ${titleToLog || 'N/A'}): section.subject.manufacturedProduct.manufacturedProduct.formCode. Node found: ${fcNode ? 'Yes' : 'No'}`
                );
                if (fcNode) {
                  dosage_forms.push(
                    ...processFormCodeNode(
                      fcNode,
                      `section.subject.manufacturedProduct (section title: ${titleToLog || 'N/A'})`
                    )
                  );
                }
              } else if (
                section.subject?.manufacturedProduct?.manufacturedProduct
              ) {
                // Log if manufacturedProduct exists but formCode doesn't, to understand structure if needed for other attributes
                // console.log(`[parseSplXml] SETID ${splDetail.spl_set_id} - formCode missing in section.subject.manufacturedProduct.manufacturedProduct under section (Title: ${titleToLog || 'N/A'}). Parent:`, JSON.stringify(section.subject.manufacturedProduct.manufacturedProduct, null, 2));
              }

              // Dosage Form directly under section.manufacturedProduct.formCode (NEW CHECK)
              if (section.manufacturedProduct?.formCode) {
                const fcNodeDirect = section.manufacturedProduct.formCode;
                console.log(
                  `[parseSplXml] SETID ${splDetail.spl_set_id} - Checking path in section (Title: ${titleToLog || 'N/A'}): section.manufacturedProduct.formCode. Node found: ${fcNodeDirect ? 'Yes' : 'No'}`
                );
                if (fcNodeDirect) {
                  dosage_forms.push(
                    ...processFormCodeNode(
                      fcNodeDirect,
                      `section.manufacturedProduct (section title: ${titleToLog || 'N/A'})`
                    )
                  );
                }
              }
            }
          }
        }
      }
    } else {
      console.log(
        `[parseSplXml] SETID ${splDetail.spl_set_id} - parsedXml.document NOT FOUND.`
      );
    }

    const uniqueDosageForms = Array.from(
      new Set(dosage_forms.filter((df) => df && typeof df === 'string'))
    );
    let dateToLog: string | undefined = undefined;
    if (typeof published_date === 'string') {
      dateToLog = published_date;
    } else if (typeof published_date === 'object' && published_date !== null) {
      if (published_date.value && typeof published_date.value === 'string') {
        dateToLog = published_date.value;
      } else if (
        published_date.$ &&
        typeof published_date.$ === 'object' &&
        published_date.$.value &&
        typeof published_date.$.value === 'string'
      ) {
        dateToLog = published_date.$.value;
      } else {
        dateToLog = JSON.stringify(published_date);
      }
    }
    if (dateToLog && dateToLog.length > 8) {
      const match = dateToLog.match(/^(\d{8})/);
      if (match) dateToLog = match[1];
    }
    console.log(
      `[parseSplXml] Parsed SETID ${splDetail.spl_set_id}: Date: ${dateToLog || 'N/A'}, Forms: ${uniqueDosageForms.length > 0 ? uniqueDosageForms.join(', ') : 'N/A'}, D&A Found: ${dosageAndAdministrationText ? 'Yes' : 'No'}`
    );

    return {
      published_date,
      dosage_forms: uniqueDosageForms,
      spl_set_id: splDetail.spl_set_id,
      xml_content: splDetail.xml_content,
      dosageAndAdministrationText,
      original_spl_detail: splDetail,
    };
  } catch (error) {
    console.error(
      `[parseSplXml] Error parsing XML for SPL SET ID ${splDetail.spl_set_id}:`,
      error
    );
    return {
      published_date: undefined,
      dosage_forms: [],
      spl_set_id: splDetail.spl_set_id,
      xml_content: splDetail.xml_content,
      dosageAndAdministrationText: undefined,
      original_spl_detail: splDetail,
    };
  }
}

/**
 * Prioritizes SPLs based on dosage form and published date.
 * This function is now ASYNCHRONOUS due to XML parsing.
 * @param dailyMedSplDetails - A record of DailyMedSplDetail objects (containing xml_content).
 * @returns A promise resolving to a record of the best DailyMedSplDetail for each dosage form.
 */
export async function performSplPrioritization(
  dailyMedSplDetails: Record<
    string,
    { data?: DailyMedSplDetail; status: string; error?: string | null }
  >
): Promise<Record<string, ParsedSplProductData>> {
  console.log(
    '[performSplPrioritization] Input SPL details object (summarized):',
    Object.fromEntries(
      Object.entries(dailyMedSplDetails).map(([setId, entry]) => [
        setId,
        {
          status: entry.status,
          error: entry.error,
          data_summary: entry.data
            ? {
                spl_set_id: entry.data.spl_set_id,
                xml_content_summary: entry.data.xml_content
                  ? `XML (length: ${entry.data.xml_content.length})`
                  : 'No XML Content',
              }
            : 'No data',
        },
      ])
    )
  );

  const successfullyFetchedSpls: DailyMedSplDetail[] = [];
  for (const setId in dailyMedSplDetails) {
    const detailEntry = dailyMedSplDetails[setId];
    if (
      detailEntry.status === 'succeeded' &&
      detailEntry.data &&
      detailEntry.data.xml_content
    ) {
      successfullyFetchedSpls.push(detailEntry.data);
    }
  }

  if (successfullyFetchedSpls.length === 0) {
    console.log(
      '[performSplPrioritization] No successfully fetched SPLs with XML content to process.'
    );
    return {};
  }

  console.log(
    '[performSplPrioritization] SPLs with XML to parse (summarized):',
    successfullyFetchedSpls.map((spl) => ({
      spl_set_id: spl.spl_set_id,
      xml_content_summary: spl.xml_content
        ? `XML (length: ${spl.xml_content.length})`
        : 'No XML Content',
    }))
  );

  // Parse all SPLs concurrently
  const parsedSplDataPromises: Promise<ParsedSplProductData>[] =
    successfullyFetchedSpls.map(parseSplXml);
  const parsedSplProductDataArray: ParsedSplProductData[] = await Promise.all(
    parsedSplDataPromises
  );

  console.log(
    '[performSplPrioritization] All SPLs parsed (summarized):',
    parsedSplProductDataArray.map((data) => ({
      spl_set_id: data.spl_set_id,
      published_date:
        (typeof data.published_date === 'string'
          ? data.published_date
          : typeof data.published_date === 'object' &&
              data.published_date !== null &&
              data.published_date.value
            ? data.published_date.value
            : typeof data.published_date === 'object' &&
                data.published_date !== null &&
                data.published_date.$ &&
                data.published_date.$.value
              ? data.published_date.$.value
              : JSON.stringify(data.published_date)) || 'N/A',
      dosage_forms: data.dosage_forms.join(', ') || 'N/A',
      xml_content_summary: data.xml_content
        ? `XML (length: ${data.xml_content.length})`
        : 'No XML Content',
      // Removing the full original_spl_detail from this log, only keeping its summary if needed elsewhere.
      // For this log, spl_set_id, parsed date, forms, and xml summary of the current data should be enough.
    }))
  );

  // Group by first dosage form
  const groupedByDosageForm: Record<string, ParsedSplProductData[]> = {};
  console.log('[performSplPrioritization] Grouping SPLs by first dosage form.');

  parsedSplProductDataArray.forEach((parsedData) => {
    if (!parsedData) return;
    // Using spl_set_id from parsedData directly for logging
    console.log(
      `[performSplPrioritization] Grouping for SETID ${parsedData.spl_set_id}, Dosage Forms: ${JSON.stringify(parsedData.dosage_forms)}, D&A Found: ${parsedData.dosageAndAdministrationText ? 'Yes (length: ' + parsedData.dosageAndAdministrationText.length + ')' : 'No'}`
    );

    const formKey =
      parsedData.dosage_forms &&
      parsedData.dosage_forms.length > 0 &&
      typeof parsedData.dosage_forms[0] === 'string'
        ? parsedData.dosage_forms[0].toUpperCase()
        : 'UNKNOWN_DOSAGE_FORM';
    // console.log(`[performSplPrioritization] Using dosage form: ${formKey} for SETID ${parsedData.spl_set_id}`); // Kept for very granular debugging if needed

    if (!groupedByDosageForm[formKey]) {
      groupedByDosageForm[formKey] = [];
    }
    groupedByDosageForm[formKey].push(parsedData);
  });

  // Prioritize within each group (e.g., by most recent published_date)
  const prioritized: Record<string, ParsedSplProductData> = {}; // Changed type
  console.log(
    '[performSplPrioritization] Prioritizing SPLs within each dosage form group by date.'
  );

  for (const formKey in groupedByDosageForm) {
    // console.log(`[performSplPrioritization] Prioritizing within dosage form group: ${formKey}`); // Logged above if needed
    const splsInGroup = groupedByDosageForm[formKey];
    // Log SPLs with processed date for better readability and D&A status
    console.log(
      `[performSplPrioritization] SPLs in '${formKey}' (pre-sort):`,
      splsInGroup.map((s) => {
        let dateToLog: string | undefined = undefined;
        if (typeof s.published_date === 'string') {
          dateToLog = s.published_date;
        } else if (
          typeof s.published_date === 'object' &&
          s.published_date !== null
        ) {
          if (
            s.published_date.value &&
            typeof s.published_date.value === 'string'
          ) {
            dateToLog = s.published_date.value;
          } else if (
            s.published_date.$ &&
            typeof s.published_date.$ === 'object' &&
            s.published_date.$.value &&
            typeof s.published_date.$.value === 'string'
          ) {
            dateToLog = s.published_date.$.value;
          } else {
            dateToLog = JSON.stringify(s.published_date);
          }
        }
        return {
          spl_set_id: s.spl_set_id,
          published_date: dateToLog || 'N/A',
          dosageAndAdministrationFound: s.dosageAndAdministrationText
            ? 'Yes'
            : 'No',
        };
      })
    );

    splsInGroup.sort((a, b) => {
      // Date extraction logic for sorting - ensure it handles string, object, or undefined
      const getDateString = (
        dateField: string | { value?: string; [key: string]: any } | undefined
      ): string | null => {
        if (typeof dateField === 'string') return dateField;
        if (typeof dateField === 'object' && dateField !== null) {
          if (dateField.value && typeof dateField.value === 'string')
            return dateField.value;
          if (
            dateField.$ &&
            typeof dateField.$ === 'object' &&
            dateField.$.value &&
            typeof dateField.$.value === 'string'
          )
            return dateField.$.value;
        }
        return null;
      };

      const dateA = getDateString(a.published_date);
      const dateB = getDateString(b.published_date);

      if (dateA && dateB)
        return new Date(dateB).getTime() - new Date(dateA).getTime(); // Descending
      if (dateA) return -1; // dateA exists, dateB doesn't, so A is "greater"
      if (dateB) return 1; // dateB exists, dateA doesn't, so B is "greater"
      return 0;
    });

    console.log(
      `[performSplPrioritization] SPLs in '${formKey}' (POST-sort by date - most recent first):`,
      splsInGroup.map((s) => {
        let dateToLog: string | undefined = undefined;
        if (typeof s.published_date === 'string') {
          dateToLog = s.published_date;
        } else if (
          typeof s.published_date === 'object' &&
          s.published_date !== null
        ) {
          if (
            s.published_date.value &&
            typeof s.published_date.value === 'string'
          ) {
            dateToLog = s.published_date.value;
          } else if (
            s.published_date.$ &&
            typeof s.published_date.$ === 'object' &&
            s.published_date.$.value &&
            typeof s.published_date.$.value === 'string'
          ) {
            dateToLog = s.published_date.$.value;
          } else {
            dateToLog = JSON.stringify(s.published_date);
          }
        }
        return {
          spl_set_id: s.spl_set_id,
          published_date: dateToLog || 'N/A',
          dosageAndAdministrationFound: s.dosageAndAdministrationText
            ? 'Yes'
            : 'No',
        };
      })
    );

    if (splsInGroup.length > 0) {
      prioritized[formKey] = splsInGroup[0]; // Store the whole ParsedSplProductData object
      // console.log(`[performSplPrioritization] Prioritized SPL for '${formKey}': SETID ${splsInGroup[0].spl_set_id}`); // Logged more comprehensively below
    }
  }
  console.log(
    '[performSplPrioritization] Final prioritized SPLs by dosage form (summarized):',
    Object.fromEntries(
      Object.entries(prioritized).map(([key, parsedDataVal]) => [
        key,
        {
          spl_set_id: parsedDataVal.spl_set_id,
          published_date:
            (typeof parsedDataVal.published_date === 'string'
              ? parsedDataVal.published_date
              : typeof parsedDataVal.published_date === 'object' &&
                  parsedDataVal.published_date !== null &&
                  parsedDataVal.published_date.value
                ? parsedDataVal.published_date.value
                : typeof parsedDataVal.published_date === 'object' &&
                    parsedDataVal.published_date !== null &&
                    parsedDataVal.published_date.$ &&
                    parsedDataVal.published_date.$.value
                  ? parsedDataVal.published_date.$.value
                  : JSON.stringify(parsedDataVal.published_date)) || 'N/A',
          xml_content_summary: parsedDataVal.xml_content
            ? `XML (length: ${parsedDataVal.xml_content.length})`
            : 'No XML Content',
          dosageAndAdministrationFound:
            parsedDataVal.dosageAndAdministrationText
              ? `Yes (length: ${parsedDataVal.dosageAndAdministrationText.length})`
              : 'No',
          // original_spl_detail is still available in parsedDataVal.original_spl_detail if needed for full data
        },
      ])
    )
  );
  return prioritized;
}
