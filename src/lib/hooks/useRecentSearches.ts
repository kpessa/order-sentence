import { useState, useEffect } from 'react';

export interface RecentSearch {
  name: string;
  rxcui: string;
  tty: string;
  searchedAt: string;
  isIngredient?: boolean;
}

const STORAGE_KEY = 'drug-search-recent';
const MAX_RECENT_SEARCHES = 8;

export function useRecentSearches() {
  const [recentSearches, setRecentSearches] = useState<RecentSearch[]>([]);

  // Load recent searches from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          setRecentSearches(Array.isArray(parsed) ? parsed : []);
        }
      } catch (error) {
        console.warn('Failed to load recent searches:', error);
        setRecentSearches([]);
      }
    }
  }, []);

  // Save recent searches to localStorage
  const saveToStorage = (searches: RecentSearch[]) => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(searches));
      } catch (error) {
        console.warn('Failed to save recent searches:', error);
      }
    }
  };

  // Add a new search to recent searches
  const addRecentSearch = (search: Omit<RecentSearch, 'searchedAt'>) => {
    const newSearch: RecentSearch = {
      ...search,
      searchedAt: new Date().toISOString()
    };

    setRecentSearches(prev => {
      // Remove existing entry if it exists
      const filtered = prev.filter(item => item.rxcui !== search.rxcui);
      
      // Add new search at the beginning
      const updated = [newSearch, ...filtered].slice(0, MAX_RECENT_SEARCHES);
      
      saveToStorage(updated);
      return updated;
    });
  };

  // Remove a search from recent searches
  const removeRecentSearch = (rxcui: string) => {
    setRecentSearches(prev => {
      const updated = prev.filter(item => item.rxcui !== rxcui);
      saveToStorage(updated);
      return updated;
    });
  };

  // Clear all recent searches
  const clearRecentSearches = () => {
    setRecentSearches([]);
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY);
    }
  };

  return {
    recentSearches,
    addRecentSearch,
    removeRecentSearch,
    clearRecentSearches
  };
}