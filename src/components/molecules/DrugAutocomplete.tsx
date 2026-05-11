'use client';

import React, { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Input } from '@/components/ui/input';
import { Search, Loader2 } from 'lucide-react';
import { RxNormSuggestion, SelectedDrugInfo } from '@/lib/types';
import {
  updateQuery,
  fetchDrugResults,
  selectDrug as selectDrugAction, // Rename to avoid conflict with local variable
} from '@/lib/store/slices/drugSearchSlice';
import { fetchOpenFdaDataByDrugName } from '@/lib/store/slices/fdaDataSlice';
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
  onSelectionComplete?: () => void; // New prop
}

export function DrugAutocomplete({
  onDrugSelected,
  onSelectionComplete,
}: DrugAutocompleteProps) {
  const dispatch = useDispatch<AppDispatch>();

  const query = useSelector((state: RootState) => state.drugSearch.query);
  const suggestions = useSelector(
    (state: RootState) => state.drugSearch.results
  );
  const status = useSelector((state: RootState) => state.drugSearch.status);
  const error = useSelector((state: RootState) => state.drugSearch.error);

  const debouncedFetch = useCallback(
    (searchTerm: string) => {
      const debouncedFn = debounce(() => {
        if (searchTerm.length >= 2) {
          dispatch(fetchDrugResults(searchTerm));
        } else {
          // Clear suggestions if query is too short, or let slice handle it
          // dispatch(setStatusAction('idle')); // Optionally reset status
        }
      }, 300);
      debouncedFn();
    },
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
      if (onSelectionComplete) onSelectionComplete(); // Call if input is cleared
    }
  };

  const handleSelectSuggestion = (suggestion: RxNormSuggestion) => {
    dispatch(selectDrugAction(suggestion)); // This updates the Redux store
    
    // Automatically fetch comprehensive drug data
    console.log(`Auto-fetching comprehensive data for: ${suggestion.name}`);
    dispatch(fetchOpenFdaDataByDrugName(suggestion.name));
    
    if (onDrugSelected) {
      const selectedDrugInfo: SelectedDrugInfo = {
        name: suggestion.name,
        rxcui: suggestion.rxcui,
        tty: suggestion.tty,
        isIngredient: ['IN', 'PIN', 'MIN'].includes(suggestion.tty),
      };
      onDrugSelected(selectedDrugInfo);
    }
    if (onSelectionComplete) onSelectionComplete(); // Call after selection
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
    <div className="relative w-full">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input
          type="text"
          value={query} // Controlled by Redux state
          onChange={handleInputChange}
          onBlur={() => {
            // Call onBlur if no selection was made but focus is lost
            if (suggestions.length === 0 && onSelectionComplete) {
              onSelectionComplete();
            }
          }}
          placeholder="Search for any medication..."
          className="w-full pl-10 pr-10 h-12 text-lg border-2 border-gray-200 focus:border-blue-500 rounded-lg shadow-sm"
        />
        {(status === 'loading' || status === 'retrying') && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
          </div>
        )}
      </div>

      {status === 'failed' && error && (
        <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      {/* Suggestions are now pre-filtered by the thunk to be ingredients only */}
      {suggestions.length > 0 && status === 'succeeded' && (
        <div className="absolute z-50 w-full bg-white border-2 border-gray-200 rounded-lg mt-1 shadow-xl max-h-80 overflow-y-auto">
          <div className="p-2 border-b bg-gray-50">
            <p className="text-xs text-gray-600 font-medium">
              {suggestions.length} medication{suggestions.length !== 1 ? 's' : ''} found
            </p>
          </div>
          <ul>
            {suggestions.map((suggestion) => {
              const sourceInfo = getSourceInfo(suggestion.source);
              return (
                <li
                  key={`${suggestion.rxcui}-${suggestion.source}`}
                  onClick={() => handleSelectSuggestion(suggestion)}
                  className="p-4 hover:bg-blue-50 cursor-pointer border-b border-gray-100 last:border-b-0 transition-colors"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="font-medium text-gray-900 mb-1">
                        {suggestion.name}
                      </div>
                      <div className="text-sm text-gray-600">
                        RxCUI: {suggestion.rxcui} • Type: {suggestion.tty}
                      </div>
                    </div>
                    {suggestion.source && (
                      <span
                        className={`px-2 py-1 text-xs font-semibold rounded-full ml-3 ${sourceInfo.colorClasses}`}
                      >
                        {sourceInfo.fullName}
                      </span>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
