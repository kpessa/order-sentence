'use client';

import React from 'react';
import { FilterSection } from './FilterPanel'; // Assuming FilterSection can be reused
import { PillButton } from './FilterPanel';   // Assuming PillButton can be reused
import { Input } from '@/components/ui/input'; // For potential search inputs
import { getColumnStyles } from '@/lib/utils/columnStyles';

interface ParsedFilterPanelProps {
  // Filters for Route
  panelSelectedRoute?: string;
  onPanelSelectedRouteChange: (value?: string) => void;
  uniquePanelRoutes: string[];

  // Filters for Form
  panelSelectedForm?: string;
  onPanelSelectedFormChange: (value?: string) => void;
  uniquePanelForms: string[];

  // Add more props as new parsed filters are introduced
  // e.g., frequencySearchText, onFrequencySearchTextChange, etc.
}

export function ParsedFilterPanel({
  panelSelectedRoute,
  onPanelSelectedRouteChange,
  uniquePanelRoutes,
  panelSelectedForm,
  onPanelSelectedFormChange,
  uniquePanelForms,
}: ParsedFilterPanelProps) {
  
  const routeStyles = getColumnStyles('Default'); // Or define specific 'Route' styles
  const formStyles = getColumnStyles('Default');  // Or define specific 'Form' styles

  return (
    <div className="w-full lg:w-72 xl:w-80 p-4 border rounded-lg shadow-lg lg:sticky lg:top-4 h-fit space-y-6 bg-white dark:bg-slate-900">
      {/* Section for Drug Autocomplete - might be better in a shared layout component if always visible */}
      {/* For now, let's assume it's part of the main page structure and not duplicated here */}
      {/* <FilterSection title="Selected Drug" initiallyOpen>
        <DrugAutocomplete />
      </FilterSection> */}
      
      <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200 border-b pb-2">
        Filter Parsed Sentences
      </h2>

      {/* Route Filter Section */}
      <FilterSection title="Route" columnName="Route" initiallyOpen>
        <div className="space-y-2">
          <PillButton
            label="All Routes"
            isActive={!panelSelectedRoute}
            onClick={() => onPanelSelectedRouteChange(undefined)}
            columnName="Route" // For styling PillButton if it uses it
            className="w-full justify-start"
          />
          {uniquePanelRoutes.map((route) => (
            <PillButton
              key={route}
              label={route}
              isActive={panelSelectedRoute === route}
              onClick={() => onPanelSelectedRouteChange(route)}
              columnName="Route"
              className="w-full justify-start"
            />
          ))}
          {uniquePanelRoutes.length === 0 && <p className="text-xs text-gray-500 dark:text-gray-400">No routes to filter.</p>}
        </div>
      </FilterSection>

      {/* Form Filter Section */}
      <FilterSection title="Form" columnName="Form" initiallyOpen>
        <div className="space-y-2">
          <PillButton
            label="All Forms"
            isActive={!panelSelectedForm}
            onClick={() => onPanelSelectedFormChange(undefined)}
            columnName="Form" // For styling
            className="w-full justify-start"
          />
          {uniquePanelForms.map((form) => (
            <PillButton
              key={form}
              label={form}
              isActive={panelSelectedForm === form}
              onClick={() => onPanelSelectedFormChange(form)}
              columnName="Form"
              className="w-full justify-start"
            />
          ))}
          {uniquePanelForms.length === 0 && <p className="text-xs text-gray-500 dark:text-gray-400">No forms to filter.</p>}
        </div>
      </FilterSection>

      {/* Add more filter sections here for other parsed components */}
      {/* Example for Frequency (if it were a search text)
      <FilterSection title="Frequency" columnName="Frequency" initiallyOpen>
        <Input 
          type="text"
          placeholder="Search Frequency..."
          // value={frequencySearchText}
          // onChange={(e) => onFrequencySearchTextChange(e.target.value)}
          className="w-full h-8 text-sm"
        />
      </FilterSection> 
      */}
    </div>
  );
} 