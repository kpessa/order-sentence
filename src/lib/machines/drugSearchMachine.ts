import { createMachine, assign, fromPromise, ErrorActorEvent, MachineContext } from 'xstate';
import { RxNormSuggestion, SelectedDrugInfo } from '@/lib/types';

// Define the context for our machine (similar to your DrugSearchState)
export interface DrugSearchContext extends MachineContext { // Extend MachineContext for broader compatibility
  query: string;
  results: RxNormSuggestion[];
  selectedDrug: SelectedDrugInfo | null;
  searchError: string | null;
  lastSearchTimestamp: number | null;
  retries: number;
}

// Define the events that can occur
export type DrugSearchEvent =
  | { type: 'UPDATE_QUERY'; query: string }
  | { type: 'EXECUTE_SEARCH' }
  | { type: 'SELECT_DRUG'; selectedDrug: RxNormSuggestion }
  | { type: 'RETRY' }
  | { type: 'RESET' };

// Internal events for actor completion/error (XState handles these types automatically with invoke)
// type DrugSearchActorDoneEvent = { type: 'done.invoke.fetchDrugs', output: RxNormSuggestion[] };
// type DrugSearchActorErrorEvent = { type: 'error.platform.fetchDrugs', data: string }; 
// No need to explicitly add these to DrugSearchEvent if using onDone/onError shorthand

export const drugSearchMachine = createMachine<DrugSearchContext, DrugSearchEvent>(
  {
    id: 'drugSearch',
    initial: 'searchReady',
    context: {
      query: '',
      results: [],
      selectedDrug: null,
      searchError: null,
      lastSearchTimestamp: null,
      retries: 0,
    },
    states: {
      searchReady: {
        on: {
          UPDATE_QUERY: {
            target: 'queryInput',
            actions: assign({
              query: ({ event }) => event.query,
              searchError: null,
            }),
          },
          RESET: {
            target: 'searchReady',
            actions: 'resetContext',
          }
        },
      },
      queryInput: {
        on: {
          UPDATE_QUERY: {
            actions: assign({
              query: ({ event }) => event.query,
            }),
          },
          EXECUTE_SEARCH: [
            {
              target: 'apiSearching',
              guard: 'canSearch',
              actions: assign({
                lastSearchTimestamp: () => Date.now(),
                retries: 0,
              }),
            },
            {
              target: 'searchReady',
            },
          ],
          RESET: {
            target: 'searchReady',
            actions: 'resetContext',
          }
        },
      },
      apiSearching: {
        invoke: {
          id: 'fetchDrugs',
          src: 'fetchDrugResults',
          input: ({ context }: { context: DrugSearchContext }) => ({ query: context.query, retries: context.retries }),
          onDone: {
            target: 'resultsDisplay',
            actions: assign({
              results: ({ event }) => event.output as RxNormSuggestion[],
              searchError: null,
            }),
          },
          onError: [
            {
              target: 'retry',
              guard: 'canRetry',
              actions: assign({
                searchError: ({ event }: { event: ErrorActorEvent }) => 
                  (event.data as Error)?.message || 'An unknown error occurred during fetch',
              }),
            },
            {
              target: 'searchFailure',
              actions: assign({
                searchError: ({ event }: { event: ErrorActorEvent }) => 
                  (event.data as Error)?.message || 'An unknown error occurred during fetch',
                results: () => [],
              }),
            }
          ],
        },
        on: {
          RESET: {
            target: 'searchReady',
            actions: 'resetContext',
          }
        },
      },
      retry: {
        entry: assign({ retries: ({ context }) => context.retries + 1 }),
        after: {
          RETRY_DELAY: 'apiSearching',
        },
        on: {
            RESET: {
            target: 'searchReady',
            actions: 'resetContext',
          }
        }
      },
      resultsDisplay: {
        on: {
          SELECT_DRUG: {
            target: 'drugSelected',
            actions: assign({
              selectedDrug: ({ event }) => {
                const suggestion = event.selectedDrug;
                return {
                    name: suggestion.name,
                    rxcui: suggestion.rxcui,
                    tty: suggestion.tty,
                    isIngredient: suggestion.tty === 'IN' || suggestion.tty === 'MIN',
                } as SelectedDrugInfo;
              },
            }),
          },
          UPDATE_QUERY: {
            target: 'queryInput',
            actions: assign({
              query: ({ event }) => event.query,
              selectedDrug: null,
              results: [],
              searchError: null,
            }),
          },
          RESET: {
            target: 'searchReady',
            actions: 'resetContext',
          }
        },
      },
      drugSelected: {
        on: {
          UPDATE_QUERY: {
            target: 'queryInput',
            actions: assign({
              query: ({ event }) => event.query,
              selectedDrug: null,
              results: [],
              searchError: null,
            }),
          },
          RESET: {
            target: 'searchReady',
            actions: 'resetContext',
          }
        },
      },
      searchFailure: {
        on: {
          RETRY: 'retry',
          UPDATE_QUERY: {
            target: 'queryInput',
            actions: assign({
              query: ({ event }) => event.query,
              searchError: null,
            }),
          },
          RESET: {
            target: 'searchReady',
            actions: 'resetContext',
          }
        },
      },
    },
  },
  {
    actions: {
      resetContext: assign({
        query: '',
        results: [],
        selectedDrug: null,
        searchError: null,
        lastSearchTimestamp: null,
        retries: 0,
      }),
    },
    actors: {
      fetchDrugResults: fromPromise<RxNormSuggestion[], { query: string; retries: number }>( 
        async ({ input }) => {
          console.log('Fetching drugs for:', input.query, 'Retry attempt:', input.retries);
          await new Promise(resolve => setTimeout(resolve, 1500));

          if (input.query.toLowerCase() === 'error') {
            throw new Error('Simulated API Error');
          }
          if (input.query.toLowerCase() === 'retryneeded' && input.retries < 2) {
            throw new Error('Simulated temporary error, needs retry');
          }

          const mockResults: RxNormSuggestion[] = [
            { rxcui: '123', name: `${input.query} Result 1 (RxCUI: 123)`, tty: 'IN', score: '1', synonym: input.query },
            { rxcui: '456', name: `${input.query} Result 2 (RxCUI: 456)`, tty: 'BN', score: '1', synonym: input.query },
          ];
          return mockResults;
        }
      ),
    },
    guards: {
      canSearch: ({ context }) => context.query.length >= 2,
      canRetry: ({ context }) => context.retries < 3,
    },
    delays: {
        RETRY_DELAY: 1000,
    }
  }
); 