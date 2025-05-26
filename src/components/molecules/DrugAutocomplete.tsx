'use client';

import React, { useCallback, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Input } from '@/components/ui/input';
import { RxNormSuggestion, SelectedDrugInfo } from '@/lib/types';
import {
  updateQuery,
  fetchDrugResults,
  selectDrug as selectDrugAction, // Rename to avoid conflict with local variable
  incrementRetry,
  setStatus as setStatusAction, // Rename to avoid conflict
} from '@/lib/store/slices/drugSearchSlice';
import type { AppDispatch, RootState } from '@/lib/store';
import { getSourceInfo } from '@/lib/utils/sourceMappings';

// Debounce function (can be moved to a utils file)
const debounce = <F extends (...args: any[]) => any>(
  func: F,
  delay: number
) => {
  let timeoutId: NodeJS.Timeout;
  return (...args: Parameters<F>): void => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
};

interface DrugAutocompleteProps {
  onDrugSelected?: (drug: SelectedDrugInfo) => void; // This can still be used for local component events if needed
}

export function DrugAutocomplete({ onDrugSelected }: DrugAutocompleteProps) {
  const dispatch = useDispatch<AppDispatch>();

  const query = useSelector((state: RootState) => state.drugSearch.query);
  const suggestions = useSelector((state: RootState) => state.drugSearch.results);
  const status = useSelector((state: RootState) => state.drugSearch.status);
  const error = useSelector((state: RootState) => state.drugSearch.error);
  const retries = useSelector((state: RootState) => state.drugSearch.retries);
  const maxRetries = useSelector((state: RootState) => state.drugSearch.maxRetries);

  const debouncedFetch = useCallback(
    debounce((searchTerm: string) => {
      if (searchTerm.length >= 2) {
        dispatch(fetchDrugResults(searchTerm));
      } else {
        // Clear suggestions if query is too short, or let slice handle it
        // dispatch(setStatusAction('idle')); // Optionally reset status
      }
    }, 300),
    [dispatch]
  );

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    dispatch(updateQuery(value));
    if (value.length >= 2) {
        debouncedFetch(value);
    } else if (value.length === 0) {
        // If query is empty, clear suggestions/status (updateQuery in slice already does this)
        // dispatch(setStatusAction('idle'));
    }
  };

  const handleSelectSuggestion = (suggestion: RxNormSuggestion) => {
    dispatch(selectDrugAction(suggestion)); // This updates the Redux store
    // The onDrugSelected prop is now optional, main state is in Redux
    // If the parent still needs to know specifically for *this* component instance interaction:
    if (onDrugSelected) {
      const selectedDrugInfo: SelectedDrugInfo = {
        name: suggestion.name,
        rxcui: suggestion.rxcui,
        tty: suggestion.tty,
        isIngredient: ['IN', 'PIN', 'MIN'].includes(suggestion.tty),
      };
      onDrugSelected(selectedDrugInfo);
    }
  };

  // Optional: Handle retry logic if desired from the component
  // useEffect(() => {
  //   if (status === 'failed' && error && error.includes('retryneeded') && retries < maxRetries) {
  //     // dispatch(incrementRetry());
  //     // dispatch(setStatusAction('retrying')); // Update UI to show retrying
  //     // setTimeout(() => dispatch(fetchDrugResults(query)), 1000); // Delay before retry
  //   }
  // }, [status, error, retries, maxRetries, query, dispatch]);

  return (
    <div className="relative w-full max-w-md mx-auto">
      <Input
        type="text"
        value={query} // Controlled by Redux state
        onChange={handleInputChange}
        placeholder="Enter medication name (min 2 chars)"
        className="w-full pr-10"
      />
      {status === 'loading' && <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-xs">Loading...</div>}
      {status === 'retrying' && <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-xs">Retrying...</div>}
      
      {status === 'failed' && error && <p className="text-red-500 text-sm mt-1">{error}</p>}

      {/* Suggestions are now pre-filtered by the thunk to be ingredients only */}
      {suggestions.length > 0 && status === 'succeeded' && (
        <ul className="absolute z-10 w-full bg-white border border-gray-300 rounded-md mt-1 shadow-lg max-h-60 overflow-y-auto">
          {suggestions // No longer need to filter here, as thunk provides only ingredients
            .map((suggestion) => {
              const sourceInfo = getSourceInfo(suggestion.source);
              return (
                <li
                  key={`${suggestion.rxcui}-${suggestion.source}`}
                  onClick={() => handleSelectSuggestion(suggestion)}
                  className="p-2 hover:bg-gray-100 cursor-pointer border-b border-gray-200 flex justify-between items-center"
                >
                  <div>{suggestion.name} ({suggestion.tty})</div>
                  {suggestion.source && (
                    <span 
                      className={`px-2.5 py-0.5 text-xs font-semibold rounded-full opacity-85 ${sourceInfo.colorClasses}`}
                    >
                      {sourceInfo.fullName}
                    </span>
                  )}
                </li>
              );
            })}
        </ul>
      )}
    </div>
  );
} 