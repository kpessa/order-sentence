'use client';

import React, { useState, useEffect } from 'react';
import { Column } from '@tanstack/react-table';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PillButton } from '@/components/organisms/FilterPanel';
import { FilterIcon, XIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ColumnHeaderFilterPopoverProps<TData, TValue> {
  column: Column<TData, TValue>;
  title: string;
  uniqueValuesForPills?: string[];
  columnNameForPillStyling?: string;
  descriptionCombinationFilter?: 'all' | 'combination' | 'single';
  onDescriptionCombinationFilterChange?: (value: 'all' | 'combination' | 'single') => void;
  isDescriptionColumn?: boolean;
}

export function ColumnHeaderFilterPopover<TData, TValue>({
  column,
  title,
  uniqueValuesForPills,
  columnNameForPillStyling = 'Default',
  descriptionCombinationFilter,
  onDescriptionCombinationFilterChange,
  isDescriptionColumn = false,
}: ColumnHeaderFilterPopoverProps<TData, TValue>) {
  const [isOpen, setIsOpen] = useState(false);
  // The column filter value can be string (for text search) or string[] (for pills) or undefined
  const currentColumnFilterValue = column.getFilterValue() as string | string[] | undefined;
  const [textSearch, setTextSearch] = useState<string>('');

  useEffect(() => {
    // Sync textSearch input with column filter IF it's a string (text search active)
    // If it's an array (pills active) or undefined, textSearch should be empty.
    if (typeof currentColumnFilterValue === 'string') {
      setTextSearch(currentColumnFilterValue);
    } else {
      setTextSearch('');
    }
  }, [currentColumnFilterValue]);

  const handlePillClick = (value?: string, event?: React.MouseEvent) => {
    const isCtrlClick = event?.ctrlKey || event?.metaKey; // metaKey for MacOS
    let newFilterValue: string | string[] | undefined = undefined;

    if (value === undefined) { // "All" pill clicked
      newFilterValue = undefined;
    } else if (isCtrlClick) {
      let currentPills: string[] = [];
      if (Array.isArray(currentColumnFilterValue)) {
        currentPills = [...currentColumnFilterValue];
      } else if (typeof currentColumnFilterValue === 'string' && currentColumnFilterValue !== '') {
        // If text search was active, and user Ctrl+clicks a pill, start new pill selection
        // Or, decide if text search should clear. For now, let pill click take over.
        // currentPills = [currentColumnFilterValue]; // This would include the text search as a pill, usually not desired.
        currentPills = []; // Start fresh with pills
      }

      const pillIndex = currentPills.indexOf(value);
      if (pillIndex > -1) {
        currentPills.splice(pillIndex, 1); // Remove pill
      } else {
        currentPills.push(value); // Add pill
      }
      newFilterValue = currentPills.length > 0 ? currentPills : undefined;
    } else { // Normal click
      newFilterValue = value;
    }
    
    column.setFilterValue(newFilterValue);
    if (typeof newFilterValue !== 'string') {
        setTextSearch(''); // Clear text if pills are set or all filters cleared
    }
    // Optional: Close popover on non-ctrl click
    // if (!isCtrlClick) setIsOpen(false);
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newText = e.target.value;
    setTextSearch(newText);
    column.setFilterValue(newText === '' ? undefined : newText); // Text search sets filter to string or undefined
  };

  const clearFilter = () => {
    column.setFilterValue(undefined);
    setTextSearch('');
    setIsOpen(false);
  };

  // Determine if a filter is active for the trigger button's styling
  const isActiveFilter = currentColumnFilterValue !== undefined && 
                         ((typeof currentColumnFilterValue === 'string' && currentColumnFilterValue !== '') || 
                          (Array.isArray(currentColumnFilterValue) && currentColumnFilterValue.length > 0));

  // Determine if a specific pill is active
  const isPillActive = (pillLabel: string) => {
    if (Array.isArray(currentColumnFilterValue)) {
      return currentColumnFilterValue.includes(pillLabel);
    }
    return typeof currentColumnFilterValue === 'string' && currentColumnFilterValue === pillLabel;
  };

  const isAllPillActive = currentColumnFilterValue === undefined || 
                         (Array.isArray(currentColumnFilterValue) && currentColumnFilterValue.length === 0);


  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="xs"
          className={cn(
            'h-6 p-1 ml-1',
            isActiveFilter ? 'text-blue-500 dark:text-blue-400' : 'text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300'
          )}
          title={`Filter ${title}`}
        >
          <FilterIcon className="h-3 w-3" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-60 p-3" align="start" side="bottom">
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <h4 className="font-medium text-sm text-gray-800 dark:text-gray-200">Filter {title}</h4>
            {isActiveFilter && (
                 <Button variant="ghost" size="xs" onClick={clearFilter} className="h-6 p-1 text-xs text-red-500 hover:text-red-600">
                    <XIcon className="h-3 w-3 mr-1" /> Clear
                 </Button>
            )}
          </div>
          
          {isDescriptionColumn && onDescriptionCombinationFilterChange && (
            <div className="pt-2 pb-1 space-y-1 border-b border-gray-200 dark:border-gray-700 mb-2">
              <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">Type:</p>
              <div className="flex gap-1.5">
                <PillButton
                  label="All Types"
                  isActive={descriptionCombinationFilter === 'all'}
                  onClick={() => onDescriptionCombinationFilterChange('all')}
                  columnName={columnNameForPillStyling} // Or a specific style
                  className="flex-1 justify-center text-xs"
                />
                <PillButton
                  label="Single"
                  isActive={descriptionCombinationFilter === 'single'}
                  onClick={() => onDescriptionCombinationFilterChange('single')}
                  columnName={columnNameForPillStyling} // Or a specific style
                  className="flex-1 justify-center text-xs"
                />
                <PillButton
                  label="Combination"
                  isActive={descriptionCombinationFilter === 'combination'}
                  onClick={() => onDescriptionCombinationFilterChange('combination')}
                  columnName={columnNameForPillStyling} // Or a specific style
                  className="flex-1 justify-center text-xs"
                />
              </div>
            </div>
          )}

          <Input
            type="text"
            placeholder="Search..."
            value={textSearch}
            onChange={handleTextChange}
            className="h-8 text-xs"
            aria-label={`Search filter for ${title}`}
          />

          {uniqueValuesForPills && uniqueValuesForPills.length > 0 && (
            <div className="space-y-1 pt-2">
              <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Quick select (Ctrl+Click for multi):</p>
              <PillButton
                label="All"
                isActive={isAllPillActive && textSearch === ''} // "All" is active if no filter value and no text search
                onClick={(e) => handlePillClick(undefined, e)} // Pass event
                columnName={columnNameForPillStyling}
                className="w-full justify-start text-xs"
              />
              {uniqueValuesForPills.slice(0, 10).map((value) => (
                <PillButton
                  key={value}
                  label={value}
                  isActive={isPillActive(value)}
                  onClick={(e) => handlePillClick(value, e)} // Pass event
                  columnName={columnNameForPillStyling}
                  className="w-full justify-start text-xs"
                  tooltip={value}
                />
              ))}
              {uniqueValuesForPills.length > 10 && (
                <p className="text-xs text-gray-400 dark:text-gray-500 text-center mt-1">+{uniqueValuesForPills.length - 10} more</p>
              )}
            </div>
          )}
          {(!uniqueValuesForPills || uniqueValuesForPills.length === 0) && textSearch === '' && currentColumnFilterValue === undefined &&
             <p className="text-xs text-gray-400 dark:text-gray-500 pt-1">No quick selects. Type to search.</p>
          }
        </div>
      </PopoverContent>
    </Popover>
  );
} 