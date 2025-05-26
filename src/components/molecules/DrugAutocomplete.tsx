'use client';

import React, { useState, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { SelectedDrugInfo, RxNormSuggestion } from '@/lib/types';

// Debounce function
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
  onDrugSelected?: (drug: SelectedDrugInfo) => void;
}

export function DrugAutocomplete({ onDrugSelected }: DrugAutocompleteProps) {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<RxNormSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Mock RxNorm API call
  const fetchSuggestions = async (searchTerm: string): Promise<RxNormSuggestion[]> => {
    console.log(`Fetching suggestions for: ${searchTerm}`);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 500));

    if (searchTerm.toLowerCase() === 'error') {
        throw new Error("Simulated API error");
    }

    // TTY: IN=Ingredient, PIN=Precise Ingredient, MIN=Multiple Ingredients, BN=Brand Name
    const mockData: RxNormSuggestion[] = [
      { rxcui: '123', name: 'Lisinopril', tty: 'IN' },
      { rxcui: '456', name: 'Lisinopril 10mg tablet', tty: 'SCD' }, // Specific Clinical Drug
      { rxcui: '789', name: 'Amlodipine', tty: 'IN' },
      { rxcui: '101', name: 'Amoxicillin', tty: 'IN' },
      { rxcui: '112', name: 'Metformin', tty: 'PIN' },
      { rxcui: '8602' /* Lipitor */, name: 'Lipitor', tty: 'BN'},
      { rxcui: '153165' /* atorvastatin */, name: 'Atorvastatin', tty: 'IN'},
    ];

    return mockData.filter(drug => 
        drug.name.toLowerCase().includes(searchTerm.toLowerCase())
    ).filter(drug => ['IN', 'PIN', 'MIN'].includes(drug.tty)); // Prioritize ingredients
  };

  const debouncedFetchSuggestions = useCallback(
    debounce(async (searchTerm: string) => {
      if (searchTerm.length < 2) {
        setSuggestions([]);
        return;
      }
      setIsLoading(true);
      setError(null);
      try {
        const results = await fetchSuggestions(searchTerm);
        setSuggestions(results);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to fetch suggestions');
        setSuggestions([]);
      }
      setIsLoading(false);
    }, 300),
    []
  );

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setQuery(value);
    debouncedFetchSuggestions(value);
  };

  const handleSelectSuggestion = (suggestion: RxNormSuggestion) => {
    setQuery(suggestion.name);
    setSuggestions([]);
    const selectedDrug: SelectedDrugInfo = {
        name: suggestion.name,
        rxcui: suggestion.rxcui,
        tty: suggestion.tty,
        isIngredient: ['IN', 'PIN', 'MIN'].includes(suggestion.tty)
    };
    console.log('Drug selected:', selectedDrug);
    if (onDrugSelected) {
      onDrugSelected(selectedDrug);
    }
  };

  return (
    <div className="relative w-full max-w-md mx-auto">
      <Input
        type="text"
        value={query}
        onChange={handleInputChange}
        placeholder="Enter medication name (min 2 chars)"
        className="w-full pr-10"
      />
      {isLoading && <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-xs">Loading...</div>}
      
      {error && <p className="text-red-500 text-sm mt-1">{error}</p>}

      {suggestions.length > 0 && (
        <ul className="absolute z-10 w-full bg-white border border-gray-300 rounded-md mt-1 shadow-lg max-h-60 overflow-y-auto">
          {suggestions.map((suggestion) => (
            <li
              key={suggestion.rxcui}
              onClick={() => handleSelectSuggestion(suggestion)}
              className="p-2 hover:bg-gray-100 cursor-pointer"
            >
              {suggestion.name} ({suggestion.tty})
            </li>
          ))}
        </ul>
      )}
    </div>
  );
} 