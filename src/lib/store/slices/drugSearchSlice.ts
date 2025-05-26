import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { RxNormSuggestion, SelectedDrugInfo } from '@/lib/types';
import type { RootState } from '../index'; // Import RootState for selectors

// Define the state structure for this slice
interface DrugSearchReduxState {
  query: string;
  results: RxNormSuggestion[];
  selectedDrug: SelectedDrugInfo | null;
  status: 'idle' | 'loading' | 'succeeded' | 'failed' | 'retrying'; // Combined loading/searching state
  error: string | null;
  lastSearchTimestamp: number | null;
  retries: number;
  maxRetries: number;
}

const initialState: DrugSearchReduxState = {
  query: '',
  results: [],
  selectedDrug: null,
  status: 'idle',
  error: null,
  lastSearchTimestamp: null,
  retries: 0,
  maxRetries: 3, // Max retries for API calls
};

// RxNorm API response structures (simplified for what we need)
interface RxNormConceptProperty {
  rxcui: string;
  name: string;
  synonym: string;
  tty: string;
  language: string;
  suppress: string;
  umlscui: string;
}

interface RxNormConceptGroup {
  tty: string;
  conceptProperties: RxNormConceptProperty[];
}

interface RxNormDrugGroup {
  name?: string; // Original query echo, not always present
  conceptGroup: RxNormConceptGroup[];
}

interface RxNormApiResponse {
  drugGroup: RxNormDrugGroup;
}

// RxNorm API response structures
interface RxNormApproximateCandidate {
  rxcui: string;
  score: string; 
  rank: string;  
  name?: string; 
  tty?: string; 
  source?: string; // Added source from RxNorm API
}
interface RxNormApproximateGroup {
  candidate: RxNormApproximateCandidate[];
}
interface RxNormApproximateTermResponse {
  approximateGroup: RxNormApproximateGroup;
}

// For fetching individual TTY property
interface RxNormPropertyConcept {
  propName: string;
  propValue: string; // This will be the TTY
}
interface RxNormPropertyConceptList {
  propertyConcept: RxNormPropertyConcept[];
}
interface RxNormPropertyResponse {
  propConceptGroup: {
    propConcept: RxNormPropertyConcept[];
  } | null;
}

// Async thunk for fetching drug results
export const fetchDrugResults = createAsyncThunk<
  RxNormSuggestion[], // Return type of the payload
  string, // Argument type (search query)
  { rejectValue: string; state: { drugSearch: DrugSearchReduxState } } // ThunkAPI config
>(
  'drugSearch/fetchResults',
  async (query, { getState, rejectWithValue }) => {
    const INGREDIENT_TTYS = ['IN', 'MIN', 'PIN'];
    const MAX_SECONDARY_TTY_FETCHES_CANDIDATES = 5; // Consider top N candidates for secondary fetch if no TTY

    console.log('Fetching RxNorm approximate terms for:', query);
    const approximateTermUrl = `https://rxnav.nlm.nih.gov/REST/approximateTerm.json?term=${encodeURIComponent(query)}&maxEntries=10&option=1`;

    try {
      const initialResponse = await fetch(approximateTermUrl);
      if (!initialResponse.ok) {
        console.error(`RxNorm API (approximateTerm) request failed: ${initialResponse.status} ${initialResponse.statusText}`);
        throw new Error(`RxNorm API (approximateTerm) request failed with status: ${initialResponse.status}`);
      }

      const initialData: RxNormApproximateTermResponse = await initialResponse.json();
      // console.log('Raw RxNorm API (approximateTerm) response:', JSON.stringify(initialData, null, 2));

      const suggestionPromises: Promise<RxNormSuggestion | null>[] = [];

      if (initialData.approximateGroup && initialData.approximateGroup.candidate) {
        const candidates = initialData.approximateGroup.candidate;
        let secondaryFetchesInitiated = 0;

        for (let i = 0; i < candidates.length; i++) {
          const cand = candidates[i];
          // If cand.name is missing, but it's an exact match candidate for TTY fetch, we'll use the query as name later
          // So, only continue if cand.name is missing AND it's not an exact match for TTY fetch
          if (!cand.name && !(cand.rxcui && query.toLowerCase() === (cand.name || query).toLowerCase() && !cand.tty)) {
             console.log(`Skipping candidate without name or not eligible for TTY fetch: ${JSON.stringify(cand)}`); // Kept for now
             continue;
          }

          const candidateName = cand.name || query; // Use query as name if cand.name is not present

          if (cand.tty && INGREDIENT_TTYS.includes(cand.tty)) {
            suggestionPromises.push(Promise.resolve({
              rxcui: cand.rxcui,
              name: candidateName, // Use candidateName
              tty: cand.tty,
              synonym: '',
              score: cand.score,
              source: cand.source,
            }));
          } else if (!cand.tty && candidateName.toLowerCase() === query.toLowerCase() && secondaryFetchesInitiated < MAX_SECONDARY_TTY_FETCHES_CANDIDATES) {
            secondaryFetchesInitiated++;
            // console.log(`Creating promise to fetch TTY for candidate ${cand.rxcui} (${candidateName}) (exact match without TTY). Source: ${cand.source}`);
            
            const fetchTtyPromise = async (): Promise<RxNormSuggestion | null> => {
              const ttyUrl = `https://rxnav.nlm.nih.gov/REST/rxcui/${cand.rxcui}/property.json?propName=TTY`;
              try {
                const ttyResponse = await fetch(ttyUrl);
                // console.log(`TTY fetch for ${cand.rxcui} (${candidateName}) - Status: ${ttyResponse.status}`);

                if (ttyResponse.ok) {
                  const ttyData: RxNormPropertyResponse = await ttyResponse.json();
                  // console.log(`TTY data for ${cand.rxcui} (${candidateName}):`, JSON.stringify(ttyData, null, 2));

                  if (ttyData.propConceptGroup && 
                      ttyData.propConceptGroup.propConcept && 
                      ttyData.propConceptGroup.propConcept.length > 0) {
                    const fetchedTty = ttyData.propConceptGroup.propConcept[0].propValue;
                    // console.log(`Fetched TTY for ${cand.rxcui} (${candidateName}): ${fetchedTty}`);
                    if (INGREDIENT_TTYS.includes(fetchedTty)) {
                      return {
                        rxcui: cand.rxcui,
                        name: candidateName, // Use candidateName here
                        tty: fetchedTty,
                        synonym: '',
                        score: cand.score, 
                        source: cand.source,
                      };
                    }
                  } else {
                     // console.log(`No TTY property found in expected structure for ${cand.rxcui} (${candidateName}). Actual data logged above.`);
                  }
                } else {
                  // Log if response not OK
                  console.warn(`TTY fetch for ${cand.rxcui} (${candidateName}) failed. Status: ${ttyResponse.status}, Text: ${await ttyResponse.text().catch(() => 'Could not get text')}`);
                }
              } catch (ttyErr) {
                console.warn(`Error during TTY fetch for ${cand.rxcui} (${candidateName}):`, ttyErr);
              }
              return null; // Return null if TTY not found or not an ingredient
            };
            suggestionPromises.push(fetchTtyPromise());
          }
          // Optionally, add a small delay here if concerned about rate limiting secondary fetches, e.g., await new Promise(r => setTimeout(r, 50));
        }
      } else {
        console.log('No approximateGroup or candidates found in API response');
      }

      const resolvedSuggestionsWithNulls = await Promise.all(suggestionPromises);
      const processedSuggestions = resolvedSuggestionsWithNulls.filter(s => s !== null) as RxNormSuggestion[];
      
      // console.log('Processed suggestions (after ALL TTY fetches) before de-duplication:', JSON.stringify(processedSuggestions, null, 2));

      // De-duplicate based on rxcui and source, keeping the first one encountered (which might have a name if others didn't)
      const uniqueSuggestionsMap = new Map<string, RxNormSuggestion>();
      for (const suggestion of processedSuggestions) {
        const key = `${suggestion.rxcui}-${suggestion.source}`;
        if (!uniqueSuggestionsMap.has(key)) {
          uniqueSuggestionsMap.set(key, suggestion);
        }
      }
      const deDupedSuggestions = Array.from(uniqueSuggestionsMap.values());

      console.log('De-duplicated suggestions before sort/slice:', JSON.stringify(deDupedSuggestions, null, 2));

      deDupedSuggestions.sort((a, b) => {
        if (a.score && b.score && a.score !== b.score) {
          const scoreA = parseFloat(a.score || '0');
          const scoreB = parseFloat(b.score || '0');
          return scoreB - scoreA; 
        }
        return a.name!.localeCompare(b.name!);
      });

      return deDupedSuggestions.slice(0, 15);

    } catch (err: any) {
      console.error('RxNorm API call (hybrid approach with Promise.all) failed:', err);
      return rejectWithValue(err.message || 'Failed to fetch drug suggestions from RxNorm (hybrid approach)');
    }
  }
);

const drugSearchSlice = createSlice({
  name: 'drugSearch',
  initialState,
  reducers: {
    updateQuery: (state, action: PayloadAction<string>) => {
      state.query = action.payload;
      state.status = 'idle'; // Reset status when query changes, search is explicit
      state.error = null;
      state.results = []; // Clear results on new query
      state.selectedDrug = null;
    },
    selectDrug: (state, action: PayloadAction<RxNormSuggestion>) => {
      const suggestion = action.payload;
      // Map RxNormSuggestion to SelectedDrugInfo
      state.selectedDrug = {
        name: suggestion.name,
        rxcui: suggestion.rxcui,
        tty: suggestion.tty,
        isIngredient: ['IN', 'PIN', 'MIN'].includes(suggestion.tty),
      };
      state.results = []; // Clear results to hide suggestions
      state.status = 'idle'; // Set status to idle
      // Optionally, you might want to set status to 'idle' or a specific 'drugSelected' status
    },
    resetSearchState: (state) => {
      state.query = '';
      state.results = [];
      state.selectedDrug = null;
      state.status = 'idle';
      state.error = null;
      state.lastSearchTimestamp = null;
      state.retries = 0;
    },
    incrementRetry: (state) => {
      state.retries += 1;
    },
    setStatus: (state, action: PayloadAction<DrugSearchReduxState['status']>) => {
      state.status = action.payload;
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchDrugResults.pending, (state) => {
        state.status = 'loading';
        state.error = null;
        state.lastSearchTimestamp = Date.now();
      })
      .addCase(fetchDrugResults.fulfilled, (state, action: PayloadAction<RxNormSuggestion[]>) => {
        state.status = 'succeeded';
        state.results = action.payload;
        state.retries = 0; // Reset retries on success
      })
      .addCase(fetchDrugResults.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload as string; // Or action.error.message if not using rejectWithValue
        // Retry logic would typically involve incrementing retries and re-dispatching
        // or setting a specific 'retrying' status for UI feedback.
      });
  },
});

export const {
  updateQuery,
  selectDrug,
  resetSearchState,
  incrementRetry,
  setStatus
} = drugSearchSlice.actions;

// Selectors
export const selectDrugSearchQuery = (state: RootState) => state.drugSearch.query;
export const selectDrugSearchResults = (state: RootState) => state.drugSearch.results;
export const selectSelectedDrug = (state: RootState) => state.drugSearch.selectedDrug;
export const selectDrugSearchStatus = (state: RootState) => state.drugSearch.status;
export const selectDrugSearchError = (state: RootState) => state.drugSearch.error;
export const selectDrugSearchRetries = (state: RootState) => state.drugSearch.retries;

export default drugSearchSlice.reducer; 