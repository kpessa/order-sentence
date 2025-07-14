import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { RootState } from '../index';
import { ParsedSplProductData } from '../../utils/splPrioritization';
import { API_ENDPOINTS, logApiCall, handleApiError } from '@/lib/config/api';

// --- Interfaces based on your workflow ---
interface RxNormNdcResponse {
  ndcGroup: {
    ndcList?: {
      // ndcList might be missing if no NDCs are found
      ndc: string[];
    };
  };
}

export interface OpenFdaResult {
  id?: string; // From /drug/label, may not be present in /drug/ndc results directly
  product_id?: string; // From /drug/ndc
  legacy_id?: string; // From /drug/ndc
  product_ndc?: string; // From /drug/ndc
  generic_name?: string; // From /drug/ndc root
  brand_name?: string; // From /drug/ndc root
  labeler_name?: string; // From /drug/ndc root
  active_ingredients?: Array<{ name: string; strength: string }>; // From /drug/ndc root
  packaging?: Array<any>; // From /drug/ndc root
  product_type?: string; // From /drug/ndc root
  marketing_category?: string; // From /drug/ndc root

  // Fields from /drug/label that might also appear or we want to align with
  set_id?: string;
  version?: string;
  effective_time?: string;

  openfda?: {
    // This structure is common and often populated by openFDA harmonization
    application_number?: string[];
    brand_name?: string[];
    generic_name?: string[];
    manufacturer_name?: string[];
    product_ndc?: string[];
    product_type?: string[];
    route?: string[];
    substance_name?: string[];
    rxcui?: string[];
    spl_id?: string[];
    spl_set_id?: string[];
    package_ndc?: string[];
    application_type?: string[];
  };
  // SPL sections - these are more specific to /drug/label results
  indications_and_usage?: string[];
  dosage_and_administration?: string[];
  dosage_forms_and_strengths?: string[];
  contraindications?: string[];
  warnings_and_precautions?: string[]; // Note: openFDA often uses just "warnings"
  warnings?: string[];
  adverse_reactions?: string[];
  drug_interactions?: string[];
  use_in_specific_populations?: string[];
  drug_abuse_and_dependence?: string[];
  overdosage?: string[];
  description?: string[]; // This is different from openfda.description
  clinical_pharmacology?: string[];
  nonclinical_toxicology?: string[];
  clinical_studies?: string[];
  references?: string[];
  how_supplied?: string[];
  storage_and_handling?: string[];
  patient_counseling_information?: string[];
  // Manufacturing & Product Details
  manufacturer_name?: string[]; // Can also be at root level
  purpose?: string[];
  [key: string]: any; // For other dynamic sections or unlisted root properties from NDC
}

interface OpenFdaApiResponse {
  meta?: {
    results?: {
      skip: number;
      limit: number;
      total: number;
    };
  };
  results: OpenFdaResult[];
}

interface FetchFdaDataPayload {
  results: OpenFdaResult[];
  total: number;
}

// Interface for data fetched from DailyMed for a specific SPL SET ID
export interface DailyMedSplDetail {
  spl_set_id: string;
  xml_content?: string; // Store the fetched XML content
  // Removed title, published_date, dosage_forms as these will be parsed from XML later if needed
}

interface FdaDataState {
  rxcui?: string;
  ndcList: string[];
  openFdaResults: OpenFdaResult[];
  totalOpenFdaResults: number;
  selectedSpl?: OpenFdaResult; // For the prioritized/detailed SPL
  status:
    | 'idle'
    | 'loading'
    | 'succeeded'
    | 'failed'
    | 'ndc_resolved'
    | 'fda_queried';
  error: string | null | undefined;
  currentEndpoint: string | null;
  retrievalTimestamp?: string;

  // New state for DailyMed SPL details
  dailyMedDetails: Record<
    string,
    {
      data?: DailyMedSplDetail;
      status: 'idle' | 'loading' | 'succeeded' | 'failed';
      error?: string | null;
    }
  >;

  // New state for prioritized SPLs
  prioritizedSplsByDosageForm: Record<string, ParsedSplProductData>; // Key: Dosage Form, Value: Best SPL Detail (now containing XML)

  // New state for SPLs fetched directly from DailyMed by drug name
  dailyMedSplListForDrugName: DailyMedSplDetail[];
  dailyMedSplListStatus: 'idle' | 'loading' | 'succeeded' | 'failed';
  dailyMedSplListError: string | null | undefined;

  currentDrugNameQuery?: string; // To store the drug name used for the current FDA/DailyMed search
}

const initialState: FdaDataState = {
  ndcList: [],
  openFdaResults: [],
  totalOpenFdaResults: 0,
  status: 'idle',
  error: null,
  currentEndpoint: null,
  dailyMedDetails: {},
  prioritizedSplsByDosageForm: {},
  dailyMedSplListForDrugName: [],
  dailyMedSplListStatus: 'idle',
  dailyMedSplListError: null,
  currentDrugNameQuery: undefined,
};

// --- Async Thunks ---

// Step 1.1: RxCUI to NDC Mapping
export const fetchNdcsByRxcui = createAsyncThunk<
  string[], // Return type: array of NDCs
  string, // Argument type: rxcui (string)
  { rejectValue: string } // For typed errors
>('fdaData/fetchNdcsByRxcui', async (rxcui, { rejectWithValue }) => {
  try {
    const url = API_ENDPOINTS.RXNORM.RXCUI_NDCS(rxcui);
    logApiCall(url);
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(
        `RxNorm API Error: ${response.status} ${response.statusText}`
      );
    }
    const data: RxNormNdcResponse = await response.json();
    return data.ndcGroup?.ndcList?.ndc || []; // Return NDCs or empty array if not found
  } catch (error: any) {
    return rejectWithValue(error.message || 'Failed to fetch NDCs from RxNorm');
  }
});

// Step 2.1: Query openFDA Drugs Endpoint using NDCs
export const fetchFdaDataByNdcs = createAsyncThunk<
  FetchFdaDataPayload, // Updated return type
  string[], // Argument type: list of NDCs
  { rejectValue: string; state: RootState }
>(
  'fdaData/fetchFdaDataByNdcs',
  async (ndcList, { rejectWithValue }) => {
    if (!ndcList || ndcList.length === 0) {
      return rejectWithValue('No NDCs provided to fetch FDA data.');
    }
    // For now, let's use the first NDC. Your workflow describes more complex prioritization later.
    // And openFDA product_ndc search often needs just the first part (e.g., 0045-0005 from 00045-0005-05)
    const firstNdc = ndcList[0];
    const productNdc = firstNdc.includes('-')
      ? firstNdc.substring(0, firstNdc.lastIndexOf('-'))
      : firstNdc;

    // Alternative: search by multiple NDCs if API supports it well, e.g. joined by OR
    // const searchQuery = ndcList.map(ndc => `openfda.product_ndc:"${ndc.substring(0, ndc.lastIndexOf('-'))}"`).join('+OR+');
    // const url = `https://api.fda.gov/drug/label.json?search=(${searchQuery})&limit=10`;

    const url = API_ENDPOINTS.OPENFDA.DRUG_LABEL_BY_NDC(productNdc);
    console.log(`[fetchFdaDataByNdcs] Querying openFDA: ${url}`);
    logApiCall(url);

    try {
      const response = await fetch(url);
      if (!response.ok) {
        // Consider more specific error handling for 404 (no data) vs other API errors
        if (response.status === 404) {
          return rejectWithValue(
            `No FDA data found for product NDC: ${productNdc} (derived from ${firstNdc})`
          );
        }
        throw new Error(
          `openFDA API Error: ${response.status} ${response.statusText}`
        );
      }
      const data: OpenFdaApiResponse = await response.json(); // Use the new interface
      if (data.results && data.results.length > 0) {
        return {
          results: data.results,
          total: data.meta?.results?.total || data.results.length, // Use total from meta if available
        };
      }
      // Handle case where API returns 200 OK but no results array or empty results
      return rejectWithValue(
        `No FDA data found in 'results' for product NDC: ${productNdc}`
      );
    } catch (error: any) {
      return rejectWithValue(
        error.message || 'Failed to fetch data from openFDA'
      );
    }
  }
);

// REFACTORED: Step 3: Query /drugsfda.json for approved products (NDA/ANDA/BLA) by Drug Name
export const fetchOpenFdaDataByDrugName = createAsyncThunk<
  FetchFdaDataPayload,
  string, // Argument type: drugName (string)
  { rejectValue: string; state: RootState }
>(
  'fdaData/fetchOpenFdaDataByDrugName',
  async (drugName, { rejectWithValue }) => {
    if (!drugName || drugName.trim() === '') {
      console.error(
        '[fetchOpenFdaDataByDrugName] Error: No drug name provided.'
      );
      return rejectWithValue('No drug name provided to fetch FDA data.');
    }

    const encodedDrugName = encodeURIComponent(drugName.toLowerCase());
    // Query for /drugsfda.json - searching common name fields
    // We also want to ensure it's an approved application type, though drugsfda should mostly contain these.
    // The `application_type` field in drugsfda results is like "NDA", "ANDA"
    const searchQuery = `(openfda.generic_name:"${encodedDrugName}" OR openfda.brand_name:"${encodedDrugName}" OR products.brand_name:"${encodedDrugName}")`;
    // Adding a filter for common approved application document types, just in case
    // const searchQueryWithDocType = `${searchQuery} AND openfda.application_doc_type:("Original" OR "Original Application" OR "Tentative Approval" OR "Approval")`;
    // For now, simpler search, relying on drugsfda data being approved products.
    const limit = 100; // Max limit for drugsfda.json is 100 as well
    const url = API_ENDPOINTS.OPENFDA.DRUGS_FDA(searchQuery, limit);

    console.log(
      `[fetchOpenFdaDataByDrugName] Querying Drugs@FDA endpoint: ${url}`
    );
    logApiCall(url);

    try {
      const response = await fetch(url);
      const responseText = await response.text();

      if (!response.ok) {
        console.error(
          `[fetchOpenFdaDataByDrugName] Drugs@FDA API response not OK. Status: ${response.status}, Response text: ${responseText}`
        );
        if (response.status === 404) {
          return rejectWithValue(
            `No Drugs@FDA data found for drug name: ${drugName}. Raw response: ${responseText}`
          );
        }
        let errorDetails = `Drugs@FDA API Error: ${response.status} ${response.statusText}. Raw response: ${responseText}`;
        try {
          const errorData = JSON.parse(responseText);
          if (errorData && errorData.error && errorData.error.message) {
            errorDetails += ` - JSON Error: ${errorData.error.message}`;
          }
        } catch (e) {
          /* Ignore if parsing error response fails */
        }
        throw new Error(errorDetails);
      }

      const rawDrugsfdaData = JSON.parse(responseText);
      console.log(
        '[fetchOpenFdaDataByDrugName] Parsed Drugs@FDA data:',
        rawDrugsfdaData
      );

      if (rawDrugsfdaData.results && rawDrugsfdaData.results.length > 0) {
        // Transform Drugs@FDA results to our existing OpenFdaResult structure
        // Create one OpenFdaResult per PRODUCT within an application for more targeted SPL Set IDs
        const transformedResults: OpenFdaResult[] = rawDrugsfdaData.results
          .flatMap((app: any) => {
            const appTypeFromAppOpenFda =
              app.openfda?.application_type?.[0] || '';
            let baseAppType = '';
            if (app.application_number) {
              if (app.application_number.startsWith('NDA')) baseAppType = 'NDA';
              else if (app.application_number.startsWith('ANDA'))
                baseAppType = 'ANDA';
              else if (app.application_number.startsWith('BLA'))
                baseAppType = 'BLA';
            }
            // If app.openfda.application_type exists, it's often more reliable
            const applicationType = appTypeFromAppOpenFda || baseAppType;

            if (!app.products || app.products.length === 0) {
              // If no products, create a single result from the application data if it has SPL Set IDs
              // This path might be less common for approved drugs but handles edge cases.
              const appSplSetIds = app.openfda?.spl_set_id
                ? Array.isArray(app.openfda.spl_set_id)
                  ? app.openfda.spl_set_id
                  : [app.openfda.spl_set_id]
                : undefined;

              if (!appSplSetIds || appSplSetIds.length === 0) {
                console.warn(
                  `[fetchOpenFdaDataByDrugName] Application ${app.application_number} has no products and no application-level spl_set_id. Skipping.`
                );
                return []; // Skip this application if no SPL set IDs at all
              }

              return [
                {
                  id: `${app.application_number}_app`, // Unique ID for app-level result
                  application_number: app.application_number,
                  brand_name: app.openfda?.brand_name?.join(', ') || 'N/A',
                  generic_name: app.openfda?.generic_name?.join(', ') || 'N/A',
                  openfda: {
                    ...app.openfda,
                    application_number: app.application_number
                      ? [app.application_number]
                      : undefined,
                    application_type: applicationType
                      ? [applicationType]
                      : undefined,
                    spl_set_id: appSplSetIds,
                    manufacturer_name: app.sponsor_name
                      ? [app.sponsor_name]
                      : app.openfda?.manufacturer_name || undefined,
                  },
                  // Add product-specific fields as undefined or defaults
                  product_ndc: undefined,
                  active_ingredients: undefined,
                  dosage_form: undefined, // Placeholder, dosage form is usually product-specific
                } as OpenFdaResult,
              ];
            }

            return app.products
              .map((product: any) => {
                // Prioritize product-level SPL Set ID, fallback to application-level
                let productSplSetIds = product.openfda?.spl_set_id
                  ? Array.isArray(product.openfda.spl_set_id)
                    ? product.openfda.spl_set_id
                    : [product.openfda.spl_set_id]
                  : undefined;

                if (!productSplSetIds && app.openfda?.spl_set_id) {
                  // Fallback to application-level SPL Set IDs if product has none
                  productSplSetIds = Array.isArray(app.openfda.spl_set_id)
                    ? app.openfda.spl_set_id
                    : [app.openfda.spl_set_id];
                }

                // If still no SPL Set IDs, this product might not be useful for DailyMed lookup
                if (!productSplSetIds || productSplSetIds.length === 0) {
                  console.warn(
                    `[fetchOpenFdaDataByDrugName] Product ${product.product_number} in App ${app.application_number} has no spl_set_id. Skipping product.`
                  );
                  return null; // Will be filtered out by .filter(Boolean)
                }

                return {
                  id: `${app.application_number}_${product.product_number}`, // Unique ID incorporating product
                  application_number: app.application_number,
                  brand_name:
                    product.brand_name || app.openfda?.brand_name?.join(', '),
                  generic_name:
                    app.openfda?.generic_name?.join(', ') ||
                    product.active_ingredients?.[0]?.name,
                  openfda: {
                    // Combine application-level openfda with product-specific overrides/additions
                    ...app.openfda, // Base application openfda info
                    ...product.openfda, // Product specific openfda info (e.g., product_ndc, package_ndc from product.openfda)
                    application_number: app.application_number
                      ? [app.application_number]
                      : undefined,
                    application_type: applicationType
                      ? [applicationType]
                      : undefined,
                    spl_set_id: productSplSetIds, // Use the prioritized SPL Set IDs
                    manufacturer_name: app.sponsor_name
                      ? [app.sponsor_name]
                      : app.openfda?.manufacturer_name || undefined,
                    // Ensure product_ndc from product.openfda is an array if it exists
                    product_ndc: product.openfda?.product_ndc
                      ? Array.isArray(product.openfda.product_ndc)
                        ? product.openfda.product_ndc
                        : [product.openfda.product_ndc]
                      : app.openfda?.product_ndc || undefined,
                    package_ndc: product.openfda?.package_ndc
                      ? Array.isArray(product.openfda.package_ndc)
                        ? product.openfda.package_ndc
                        : [product.openfda.package_ndc]
                      : app.openfda?.package_ndc || undefined,
                  },
                  // Product-specific details from the main product object
                  product_ndc: product.openfda?.product_ndc?.[0], // Example: Take first product NDC if available
                  active_ingredients: product.active_ingredients,
                  dosage_form: product.dosage_form, // Dosage form from the product
                  marketing_category: product.marketing_status, // marketing_status might map to marketing_category
                  // Ensure all OpenFdaResult fields are accounted for, even if undefined
                  set_id: productSplSetIds[0], // convenience, main set_id for this product.
                } as OpenFdaResult;
              })
              .filter(Boolean); // Remove any null results from products without SPL Set IDs
          })
          .filter(Boolean); // Remove any null results from the flatMap itself (e.g. apps with no products and no app-level SPLs)

        console.log(
          `[fetchOpenFdaDataByDrugName] Transformed ${transformedResults.length} product-centric results from Drugs@FDA.`
        );

        return {
          results: transformedResults,
          total:
            rawDrugsfdaData.meta?.results?.total || transformedResults.length,
        };
      }

      console.warn(
        `[fetchOpenFdaDataByDrugName] No results in Drugs@FDA data for drug name: ${drugName}.`
      );
      return rejectWithValue(
        `No results in Drugs@FDA data for drug name: ${drugName}. Parsed data: ${JSON.stringify(rawDrugsfdaData)}`
      );
    } catch (error: any) {
      console.error(
        `[fetchOpenFdaDataByDrugName] General error for ${drugName} with Drugs@FDA:`,
        error
      );
      return rejectWithValue(
        error.message || `Failed to fetch data from Drugs@FDA for ${drugName}`
      );
    }
  }
);

// TODO: Add fetchFdaDataByGenericName for Step 2.1 alternative

// Existing thunk for fetching individual SPL details - now to fetch XML
export const fetchSplDetailFromDailyMed = createAsyncThunk<
  DailyMedSplDetail, // Return type: The SPL detail object with XML content
  string, // Argument type: splSetId (string)
  {
    rejectValue: {
      splSetId: string;
      error: string;
      dailyMedErrorBody?: string;
    };
  } // Typed errors for rejection
>(
  'fdaData/fetchSplDetailFromDailyMed',
  async (splSetId, { rejectWithValue }) => {
    console.log(
      `[DEBUG fetchSplDetailFromDailyMed] START for SETID: ${splSetId}, URL: /api/dailymed/${splSetId}`
    );
    try {
      console.log(
        `[DEBUG fetchSplDetailFromDailyMed] Attempting fetch for ${splSetId} via proxy (expecting XML)`
      );
      const response = await fetch(`/api/dailymed/${splSetId}`); // Calls our Next.js API route

      console.log(
        `[DEBUG fetchSplDetailFromDailyMed] Fetch call completed for ${splSetId}. Response received.`
      );

      const responseText = await response.text(); // Get the response body as text

      if (!response.ok) {
        // The proxy should return JSON for errors, even if it tried to get XML from DailyMed
        let errorData = {
          error: `Unknown error from proxy for SETID ${splSetId}`,
          dailyMedErrorBody: responseText,
        };
        try {
          // Attempt to parse if the proxy sent a JSON error structure
          const parsedProxyError = JSON.parse(responseText);
          if (parsedProxyError && parsedProxyError.error) {
            errorData.error = parsedProxyError.error;
            errorData.dailyMedErrorBody =
              parsedProxyError.dailyMedErrorBody || responseText;
          }
        } catch (e) {
          // If parsing fails, use the raw text as part of the error.
          console.warn(
            `[DEBUG fetchSplDetailFromDailyMed] Failed to parse error response from proxy as JSON for ${splSetId}. Raw text: ${responseText}`
          );
        }
        console.error(
          `[DEBUG fetchSplDetailFromDailyMed] response.ok is false for ${splSetId}. Error: ${errorData.error}. DailyMed Body: ${errorData.dailyMedErrorBody}`
        );
        return rejectWithValue({
          splSetId,
          error: errorData.error,
          dailyMedErrorBody: errorData.dailyMedErrorBody,
        });
      }

      // Check content type if needed, though proxy should ensure it sends XML for success
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/xml')) {
        console.warn(
          `[DEBUG fetchSplDetailFromDailyMed] Unexpected content type for ${splSetId}: ${contentType}. Body: ${responseText}`
        );
        // We might still proceed if content looks like XML, or reject
        // For now, let's assume if proxy sent 200, it should be XML it intended to send.
      }

      console.log(
        `[DEBUG fetchSplDetailFromDailyMed] Successfully fetched XML for ${splSetId}. Length: ${responseText.length}`
      );
      return { spl_set_id: splSetId, xml_content: responseText };
    } catch (error: any) {
      console.error(
        `[DEBUG fetchSplDetailFromDailyMed] CATCH BLOCK for ${splSetId}. Error object:`,
        error
      );
      let errorMessage = 'Failed to fetch XML for DailyMed SPL';
      if (error.name && error.message) {
        errorMessage = `${error.name}: ${error.message}`;
      }
      console.error(
        `[fetchSplDetailFromDailyMed] Final error message for ${splSetId}: ${errorMessage}`
      );
      return rejectWithValue({ splSetId, error: errorMessage });
    }
  }
);

// New Thunk: Fetch SPLs from DailyMed by Drug Name
export const fetchSplsFromDailyMedByName = createAsyncThunk<
  DailyMedSplDetail[], // Return type: array of DailyMedSplDetail
  string, // Argument type: drugName (string)
  { rejectValue: string } // For typed errors
>(
  'fdaData/fetchSplsFromDailyMedByName',
  async (drugName, { rejectWithValue }) => {
    if (!drugName || drugName.trim() === '') {
      console.error(
        '[fetchSplsFromDailyMedByName] Error: No drug name provided.'
      );
      return rejectWithValue(
        'No drug name provided to fetch SPLs from DailyMed.'
      );
    }
    const encodedDrugName = encodeURIComponent(drugName.toLowerCase());
    // Using pagesize=100 as a reasonable limit, adjust if needed.
    const url = API_ENDPOINTS.DAILYMED.SPL_BY_DRUG_NAME(drugName);
    logApiCall(url);
    console.log(
      `[fetchSplsFromDailyMedByName] Querying DailyMed SPLs by drug name: ${url}`
    );

    try {
      const response = await fetch(url);
      if (!response.ok) {
        const responseText = await response.text(); // Get response text for logging
        let errorMsg = `DailyMed API Error (spls.json) for drug name ${drugName}: ${response.status} ${response.statusText}. Response: ${responseText}`;
        console.error(
          `[fetchSplsFromDailyMedByName] Error details: ${errorMsg}`
        ); // Log the detailed error
        if (response.status === 404) {
          errorMsg = `No DailyMed SPLs found for drug name: ${drugName}. Response: ${responseText}`;
        }
        throw new Error(errorMsg);
      }
      const apiResponse = await response.json();

      if (apiResponse && apiResponse.data && Array.isArray(apiResponse.data)) {
        const transformedSpls: DailyMedSplDetail[] = apiResponse.data
          .map((item: any) => {
            // Adapt field names based on actual DailyMed API response for spls.json
            // Common fields are often `setid`, `spl_title`, `published_date`, `dosage_form`
            let dosageForms: string[] = [];
            if (item.dosage_form) {
              dosageForms = Array.isArray(item.dosage_form)
                ? item.dosage_form
                : [item.dosage_form];
            } else if (item.attributes?.dosage_form) {
              // Check nested attributes as another common pattern
              dosageForms = Array.isArray(item.attributes.dosage_form)
                ? item.attributes.dosage_form
                : [item.attributes.dosage_form];
            } // Add more checks if dosage form is found elsewhere

            return {
              spl_set_id: item.setid || item.spl_set_id, // `setid` is common in list endpoints
              title: item.spl_title || item.title,
              published_date: item.published_date,
              dosage_forms: dosageForms,
              // Potentially map other useful fields like document_type, labeler_name etc.
            };
          })
          .filter(Boolean); // Filter out any nulls if mapping fails for an item

        console.log(
          `[fetchSplsFromDailyMedByName] Fetched and transformed ${transformedSpls.length} SPLs from DailyMed for drug: ${drugName}`
        );
        return transformedSpls;
      } else {
        console.warn(
          `[fetchSplsFromDailyMedByName] No 'data' array in DailyMed response for ${drugName}, or response was not as expected. Response:`,
          apiResponse
        );
        return []; // Return empty array if no data or unexpected structure
      }
    } catch (error: any) {
      console.error(
        `[fetchSplsFromDailyMedByName] General error for ${drugName}:`,
        error
      );
      return rejectWithValue(
        error.message || `Failed to fetch SPLs for ${drugName} from DailyMed`
      );
    }
  }
);

// --- Slice Definition ---
const fdaDataSlice = createSlice({
  name: 'fdaData',
  initialState,
  reducers: {
    resetFdaState: () => initialState,
    // Example: if we calculate prioritization outside and dispatch an action
    setPrioritizedSpls: (
      state,
      action: PayloadAction<Record<string, ParsedSplProductData>>
    ) => {
      state.prioritizedSplsByDosageForm = action.payload;
    },
    // We might also have a reducer that does the calculation directly if triggered by another action.
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchNdcsByRxcui.pending, (state, action) => {
        state.status = 'loading';
        state.error = null;
        state.currentEndpoint = `RxNorm /rxcui/${action.meta.arg}/ndcs.json`;
        state.rxcui = action.meta.arg;
        state.ndcList = []; // Reset NDCs while fetching new ones
      })
      .addCase(
        fetchNdcsByRxcui.fulfilled,
        (state, action: PayloadAction<string[]>) => {
          state.status = 'ndc_resolved';
          state.ndcList = action.payload;
          state.retrievalTimestamp = new Date().toISOString();
        }
      )
      .addCase(fetchNdcsByRxcui.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload; // Error message from rejectWithValue
      })
      // Cases for fetchFdaDataByNdcs
      .addCase(fetchFdaDataByNdcs.pending, (state, action) => {
        state.status = 'loading';
        state.error = null;
        state.currentEndpoint = `openFDA /drug/label.json with NDCs`;
        state.openFdaResults = []; // Clear previous results
        state.totalOpenFdaResults = 0;
      })
      .addCase(
        fetchFdaDataByNdcs.fulfilled,
        (state, action: PayloadAction<FetchFdaDataPayload>) => {
          state.status = 'fda_queried';
          state.openFdaResults = action.payload.results;
          state.totalOpenFdaResults = action.payload.total;
          state.retrievalTimestamp = new Date().toISOString();
        }
      )
      .addCase(fetchFdaDataByNdcs.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
        state.openFdaResults = [];
        state.totalOpenFdaResults = 0;
      })
      // TODO: Add cases for fetchFdaDataByGenericName...
      // Cases for fetchOpenFdaDataByDrugName
      .addCase(fetchOpenFdaDataByDrugName.pending, (state, action) => {
        console.log(
          '[fdaDataSlice/fetchOpenFdaDataByDrugName.pending] Action:',
          action
        );
        state.status = 'loading';
        state.error = null;
        state.currentEndpoint = `Drugs@FDA /drugsfda.json with drugName: ${action.meta.arg}`;
        state.openFdaResults = [];
        state.totalOpenFdaResults = 0;
        state.currentDrugNameQuery = action.meta.arg; // Store the drug name
        state.dailyMedSplListStatus = 'idle'; // Reset DailyMed list status for new search
        state.dailyMedSplListForDrugName = [];
      })
      .addCase(
        fetchOpenFdaDataByDrugName.fulfilled,
        (state, action: PayloadAction<FetchFdaDataPayload>) => {
          console.log(
            '[fdaDataSlice/fetchOpenFdaDataByDrugName.fulfilled] Action with transformed Drugs@FDA results:',
            action
          );

          const rawResults = action.payload.results;
          // Adjusted filter to primarily use the transformed openfda.application_type
          const filteredOpenFdaResults = rawResults.filter((result) => {
            if (
              result.openfda &&
              result.openfda.application_type &&
              Array.isArray(result.openfda.application_type)
            ) {
              return result.openfda.application_type.some(
                (appType) =>
                  appType === 'NDA' || appType === 'ANDA' || appType === 'BLA'
              );
            }
            // Fallback or alternative: check root application_number prefix if openfda.application_type is missing
            if (result.application_number) {
              return (
                result.application_number.startsWith('NDA') ||
                result.application_number.startsWith('ANDA') ||
                result.application_number.startsWith('BLA')
              );
            }
            return false;
          });

          console.log(
            `[fdaDataSlice/fetchOpenFdaDataByDrugName.fulfilled] Filtered ${rawResults.length} Drugs@FDA results down to ${filteredOpenFdaResults.length} based on NDA/ANDA/BLA type.`
          );

          state.status = 'fda_queried';
          state.openFdaResults = filteredOpenFdaResults;
          state.totalOpenFdaResults = filteredOpenFdaResults.length;
          state.retrievalTimestamp = new Date().toISOString();

          // Reset DailyMed details for a new search
          state.dailyMedDetails = {};
        }
      )
      .addCase(fetchOpenFdaDataByDrugName.rejected, (state, action) => {
        console.error(
          '[fdaDataSlice/fetchOpenFdaDataByDrugName.rejected] Action:',
          action
        );
        state.status = 'failed';
        state.error = action.payload;
        state.openFdaResults = [];
        state.totalOpenFdaResults = 0;
        state.dailyMedDetails = {}; // Reset on FDA fetch error too
      })
      // Cases for fetchSplDetailFromDailyMed
      .addCase(fetchSplDetailFromDailyMed.pending, (state, action) => {
        const splSetId = action.meta.arg;
        console.log(
          `[DailyMedReducer] fetchSplDetailFromDailyMed.pending for SETID: ${splSetId}`
        );
        state.dailyMedDetails[splSetId] = {
          ...state.dailyMedDetails[splSetId], // Preserve existing data if any (though usually new fetch)
          status: 'loading',
          error: null,
        };
      })
      .addCase(
        fetchSplDetailFromDailyMed.fulfilled,
        (state, action: PayloadAction<DailyMedSplDetail>) => {
          const { spl_set_id, xml_content } = action.payload;
          console.log(
            `[DailyMedReducer] fetchSplDetailFromDailyMed.fulfilled for SETID: ${spl_set_id}, XML length: ${xml_content?.length}`
          );
          state.dailyMedDetails[spl_set_id] = {
            data: action.payload,
            status: 'succeeded',
            error: null,
          };
        }
      )
      .addCase(fetchSplDetailFromDailyMed.rejected, (state, action) => {
        const payload = action.payload as {
          splSetId: string;
          error: string;
          dailyMedErrorBody?: string;
        };
        const splSetId = payload?.splSetId || action.meta.arg; // Fallback to arg if payload or splSetId is missing

        let errorMessage = 'Unknown error';
        if (payload && payload.error) {
          errorMessage = payload.error;
        } else if (action.error && action.error.message) {
          errorMessage = action.error.message;
        }

        console.error(
          `[DailyMedReducer] fetchSplDetailFromDailyMed.rejected for SETID: ${splSetId}. Error: ${errorMessage}`,
          payload?.dailyMedErrorBody
            ? `DailyMed Body: ${payload.dailyMedErrorBody}`
            : ''
        );
        state.dailyMedDetails[splSetId] = {
          ...state.dailyMedDetails[splSetId],
          status: 'failed',
          error: errorMessage,
        };
      })
      // Cases for fetchSplsFromDailyMedByName
      .addCase(fetchSplsFromDailyMedByName.pending, (state, action) => {
        state.dailyMedSplListStatus = 'loading';
        state.dailyMedSplListError = null;
      })
      .addCase(
        fetchSplsFromDailyMedByName.fulfilled,
        (state, action: PayloadAction<DailyMedSplDetail[]>) => {
          state.dailyMedSplListForDrugName = action.payload;
          state.dailyMedSplListStatus = 'succeeded';
        }
      )
      .addCase(fetchSplsFromDailyMedByName.rejected, (state, action) => {
        state.dailyMedSplListStatus = 'failed';
        state.dailyMedSplListError = action.payload;
      });
  },
});

// --- Export Actions & Reducer ---
export const { resetFdaState, setPrioritizedSpls } = fdaDataSlice.actions;
export default fdaDataSlice.reducer;

// --- Selectors ---
export const selectFdaDataState = (state: RootState) => state.fdaData;
export const selectNdcList = (state: RootState) => state.fdaData.ndcList;
export const selectOpenFdaResults = (state: RootState) =>
  state.fdaData.openFdaResults;
export const selectFdaDataStatus = (state: RootState) => state.fdaData.status;
export const selectFdaDataError = (state: RootState) => state.fdaData.error;
export const selectCurrentRxcui = (state: RootState) => state.fdaData.rxcui;
export const selectTotalOpenFdaResults = (state: RootState) =>
  state.fdaData.totalOpenFdaResults;

// Selector for DailyMed details
export const selectDailyMedDetails = (state: RootState) =>
  state.fdaData.dailyMedDetails;
export const selectPrioritizedSplsByDosageForm = (state: RootState) =>
  state.fdaData.prioritizedSplsByDosageForm;

// Selectors for the new DailyMed SPL list fetched by drug name
export const selectDailyMedSplListForDrugName = (state: RootState) =>
  state.fdaData.dailyMedSplListForDrugName;
export const selectDailyMedSplListStatus = (state: RootState) =>
  state.fdaData.dailyMedSplListStatus;
export const selectDailyMedSplListError = (state: RootState) =>
  state.fdaData.dailyMedSplListError;
export const selectCurrentDrugNameQuery = (state: RootState) =>
  state.fdaData.currentDrugNameQuery;

// Helper function for prioritization (can be moved to a separate file if it grows)
// This is a placeholder for where the logic would go. Ideally, this is done via createSelector or a thunk.
/*
function performSplPrioritization(
    dailyMedDetails: Record<string, { data?: DailyMedSplDetail; status: string; error?: string | null }>,
    openFdaResults: OpenFdaResult[] // Needed if we need to cross-ref app_number for finer NDA/ANDA/BLA ranking
): Record<string, DailyMedSplDetail> {
    const groupedByDosageForm: Record<string, DailyMedSplDetail[]> = {};

    Object.values(dailyMedDetails).forEach(detailEntry => {
        if (detailEntry.status === 'succeeded' && detailEntry.data && detailEntry.data.dosage_forms) {
            const spl = detailEntry.data;
            // For simplicity, using the first dosage form. Consider how to handle multiple.
            const formKey = spl.dosage_forms[0]?.toUpperCase() || 'UNKNOWN_DOSAGE_FORM'; 
            if (!groupedByDosageForm[formKey]) {
                groupedByDosageForm[formKey] = [];
            }
            groupedByDosageForm[formKey].push(spl);
        }
    });

    const prioritized: Record<string, DailyMedSplDetail> = {};
    for (const formKey in groupedByDosageForm) {
        const splsInGroup = groupedByDosageForm[formKey];
        if (splsInGroup.length > 0) {
            // Sort by published_date descending (most recent first)
            splsInGroup.sort((a, b) => (b.published_date || '').localeCompare(a.published_date || ''));
            prioritized[formKey] = splsInGroup[0]; // Pick the first one after sorting
        }
    }
    console.log("[performSplPrioritization] Prioritized SPLs:", prioritized);
    return prioritized;
}
*/
