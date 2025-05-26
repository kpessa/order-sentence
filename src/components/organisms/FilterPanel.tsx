'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DrugAutocomplete } from '@/components/molecules/DrugAutocomplete';
import { getColumnStyles, ColumnStyling } from '@/lib/utils/columnStyles';
import { cn } from '@/lib/utils';

interface FilterPanelProps {
  // Description Filters
  selectedDescriptionPill?: string;
  onSelectedDescriptionPillChange: (value?: string) => void;
  descriptionSearchText: string;
  onDescriptionSearchTextChange: (text: string) => void;
  top5UniqueDescriptions: string[];

  // Encounter Group Filters
  selectedEncounterGroup?: string;
  onSelectedEncounterGroupChange: (value?: string) => void;
  uniqueEncounterGroups: string[];

  // Synonym Filters
  selectedSynonymPill?: string;
  onSelectedSynonymPillChange: (value?: string) => void;
  synonymSearchText: string;
  onSynonymSearchTextChange: (text: string) => void;
  top5UniqueSynonyms: string[];

  // Synonym Type Filters
  selectedSynonymType?: string;
  onSelectedSynonymTypeChange: (value?: string) => void;
  uniqueSynonymTypes: string[];

  // Other Text Filters
  catalogTypeSearchText: string;
  onCatalogTypeSearchTextChange: (text: string) => void;
  orderEntryFormatSearchText: string;
  onOrderEntryFormatSearchTextChange: (text: string) => void;
}

interface FilterSectionProps {
  title: string;
  columnName: string;
  children: React.ReactNode;
  initiallyOpen?: boolean;
}

export const FilterSection: React.FC<FilterSectionProps> = ({ title, columnName, children, initiallyOpen = false }) => {
  const [isOpen, setIsOpen] = useState(initiallyOpen);
  const styles = getColumnStyles(columnName);

  return (
    <div className="py-3 border-b border-gray-200 dark:border-gray-700 last:border-b-0">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex justify-between items-center text-left mb-2 focus:outline-none"
      >
        <h3 className={cn("text-sm font-semibold uppercase tracking-wide px-2 py-1 rounded-t-md w-full", styles.bg, styles.text)}>{title}</h3>
        <span className={cn("text-xs transform transition-transform duration-200", isOpen ? 'rotate-180' : '' , styles.text)}>
          ▼
        </span>
      </button>
      {isOpen && <div className="px-1 space-y-2">{children}</div>}
    </div>
  );
};

interface PillButtonProps {
  label: string; 
  isActive: boolean;
  onClick: (event?: React.MouseEvent<HTMLButtonElement>) => void;
  columnName: string;
  className?: string;
  tooltip?: string; 
}

export const PillButton: React.FC<PillButtonProps> = ({ 
  label, 
  isActive, 
  onClick, 
  columnName, 
  className = '',
  tooltip 
}) => {
  const styles = getColumnStyles(columnName);

  const buttonContent = (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'w-full text-left text-xs px-2.5 py-1.5 rounded-md border whitespace-nowrap truncate hover:bg-opacity-80 focus:outline-none focus:ring-2 focus:ring-offset-1',
        isActive 
          ? cn(styles.pillActiveBg, styles.pillActiveText, styles.border, 'font-semibold shadow-sm') 
          : cn('bg-gray-100 dark:bg-slate-700', styles.pillInactiveText, styles.pillInactiveBorder, 'hover:bg-gray-200 dark:hover:bg-slate-600'),
        className
      )}
      title={tooltip || label} 
    >
      {label}
    </button>
  );

  if (tooltip) {
    return buttonContent;
  }
  return buttonContent;
};

export function FilterPanel(props: FilterPanelProps) {
  const {
    selectedDescriptionPill, onSelectedDescriptionPillChange,
    descriptionSearchText, onDescriptionSearchTextChange, top5UniqueDescriptions,
    selectedEncounterGroup, onSelectedEncounterGroupChange, uniqueEncounterGroups,
    selectedSynonymPill, onSelectedSynonymPillChange,
    synonymSearchText, onSynonymSearchTextChange, top5UniqueSynonyms,
    selectedSynonymType, onSelectedSynonymTypeChange, uniqueSynonymTypes,
    catalogTypeSearchText, onCatalogTypeSearchTextChange,
    orderEntryFormatSearchText, onOrderEntryFormatSearchTextChange
  } = props;

  return (
    <div className="w-full lg:w-72 xl:w-80 p-4 border rounded-lg shadow-lg lg:sticky lg:top-4 h-fit space-y-1 bg-white dark:bg-slate-900">
      <FilterSection title="Selected Drug" columnName="Default" initiallyOpen>
        <DrugAutocomplete />
      </FilterSection>

      <FilterSection title="Description Filters" columnName="Description">
        {top5UniqueDescriptions.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            <PillButton label="All Desc Pills" isActive={!selectedDescriptionPill} onClick={() => onSelectedDescriptionPillChange(undefined)} columnName="Description" className="" />
            {top5UniqueDescriptions.map(desc => (
              <PillButton key={desc} label={desc} isActive={selectedDescriptionPill === desc} onClick={() => onSelectedDescriptionPillChange(desc)} columnName="Description" className="" />
            ))}
          </div>
        )}
        <Input 
          type="text" 
          placeholder="Search descriptions..."
          value={descriptionSearchText}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => onDescriptionSearchTextChange(e.target.value)}
          className="h-8 text-xs"
        />
      </FilterSection>

      <FilterSection title="Encounter Group" columnName="Encounter Group">
        {uniqueEncounterGroups.length > 0 ? (
            <div className="flex flex-wrap gap-1">
                <PillButton label="All Groups" isActive={!selectedEncounterGroup} onClick={() => onSelectedEncounterGroupChange(undefined)} columnName="Encounter Group" className="" />
                {uniqueEncounterGroups.map(group => (
                    <PillButton key={group} label={group} isActive={selectedEncounterGroup === group} onClick={() => onSelectedEncounterGroupChange(group)} columnName="Encounter Group" className="" />
                ))}
            </div>
        ) : <p className="text-xs text-slate-500">No specific groups in current results.</p>}
      </FilterSection>

      <FilterSection title="Synonym Filters" columnName="Synonym">
        {top5UniqueSynonyms.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            <PillButton label="All Syn. Pills" isActive={!selectedSynonymPill} onClick={() => onSelectedSynonymPillChange(undefined)} columnName="Synonym" className="" />
            {top5UniqueSynonyms.map(syn => (
              <PillButton key={syn} label={syn} isActive={selectedSynonymPill === syn} onClick={() => onSelectedSynonymPillChange(syn)} columnName="Synonym" className="" />
            ))}
          </div>
        )}
        <Input 
          type="text" 
          placeholder="Search synonyms..."
          value={synonymSearchText}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => onSynonymSearchTextChange(e.target.value)}
          className="h-8 text-xs"
        />
      </FilterSection>

      <FilterSection title="Synonym Type" columnName="Synonym Type">
         {uniqueSynonymTypes.length > 0 ? (
            <div className="flex flex-wrap gap-1">
                <PillButton label="All Syn. Types" isActive={!selectedSynonymType} onClick={() => onSelectedSynonymTypeChange(undefined)} columnName="Synonym Type" className="" />
                {uniqueSynonymTypes.map(type => (
                    <PillButton key={type} label={type} isActive={selectedSynonymType === type} onClick={() => onSelectedSynonymTypeChange(type)} columnName="Synonym Type" className="" />
                ))}
            </div>
         ) : <p className="text-xs text-slate-500">No specific types in current results.</p>}
      </FilterSection>

      <FilterSection title="Other Filters" columnName="Default">
        <div className="space-y-2">
          <div>
            <Label htmlFor="catalogTypeSearch" className="text-xs font-medium text-slate-600">Catalog Type</Label>
            <Input 
              id="catalogTypeSearch"
              type="text" 
              placeholder="Search catalog types..."
              value={catalogTypeSearchText}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => onCatalogTypeSearchTextChange(e.target.value)}
              className="h-8 text-xs mt-1"
            />
          </div>
          <div>
            <Label htmlFor="orderEntryFormatSearch" className="text-xs font-medium text-slate-600">Order Entry Format</Label>
            <Input 
              id="orderEntryFormatSearch"
              type="text" 
              placeholder="Search order entry formats..."
              value={orderEntryFormatSearchText}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => onOrderEntryFormatSearchTextChange(e.target.value)}
              className="h-8 text-xs mt-1"
            />
          </div>
        </div>
      </FilterSection>
    </div>
  );
} 