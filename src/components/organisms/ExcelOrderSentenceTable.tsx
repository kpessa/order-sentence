'use client';

import React, { useState, useMemo, useEffect } from 'react';
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  SortingState,
  useReactTable,
  PaginationState,
  ColumnFiltersState,
  FilterFn,
  Row,
} from '@tanstack/react-table';
// import { CernerOrderSentence, OrderSentenceRow } from '@/lib/types'; // Keep if OrderSentenceRow is still used, or remove
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { FilterPanel } from './FilterPanel';
import { ParsedFilterPanel } from './ParsedFilterPanel';
import { ColumnHeaderFilterPopover } from '@/components/molecules/ColumnHeaderFilterPopover';
import { getColumnStyles } from '@/lib/utils/columnStyles'; // Import styling utility
import { cn } from '@/lib/utils'; // Assuming you have a cn utility
import { parseOrderSentence, ParsedOrderSentence } from '@/lib/utils/parseOrderSentence';
import { Switch } from '@/components/ui/switch'; // Assuming you have a Switch component from shadcn/ui
import { Label } from '@/components/ui/label';
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle, 
  SheetTrigger,
  SheetClose,
  SheetFooter,
  SheetDescription
} from "@/components/ui/sheet";
import { PanelLeft, PanelRight, ChevronsUpDownIcon, ArrowUpIcon, ArrowDownIcon, XCircleIcon } from 'lucide-react'; // Example icons

// Assuming ExcelRow is defined in your hooks or types, or define it here
interface ExcelRow {
  [key: string]: any;
}

interface ExcelOrderSentenceTableProps {
  rxcui: string;
  drugName: string;
  excelData: ExcelRow[]; // Added excelData prop
}

interface ExcelRowWithParsed extends ExcelRow {
  _parsedSentence?: ParsedOrderSentence;
}

// Small helper for header pills - can be customized further
const HeaderPillButton: React.FC<{
  label: string;
  isActive: boolean;
  onClick: () => void;
  className?: string;
  baseTextColor?: string; // e.g., 'text-white' or 'text-gray-700'
}> = ({ label, isActive, onClick, className, baseTextColor = 'text-gray-700' }) => (
  <Button
    variant={isActive ? 'secondary' : 'ghost'} // Secondary for active, ghost for inactive
    size="xs"
    onClick={onClick}
    className={cn(
      "h-6 px-2 text-xs whitespace-nowrap rounded-md border",
      isActive 
        ? 'bg-white/80 dark:bg-slate-700/80 border-slate-400 dark:border-slate-600 shadow-sm text-slate-800 dark:text-slate-200'
        : cn('bg-transparent hover:bg-white/20 dark:hover:bg-slate-800/20', baseTextColor, 'border-current opacity-75 hover:opacity-100'),
      className
    )}
  >
    {label}
  </Button>
);

interface HeaderPillFilterGroupProps {
  title: string; 
  options: string[];
  selectedValue?: string;
  onValueChange: (value?: string) => void;
  baseTextColor?: string;
}

const HeaderPillFilterGroup: React.FC<HeaderPillFilterGroupProps> = (
  { title, options, selectedValue, onValueChange, baseTextColor }
) => {
  if (!options || options.length === 0) return <div className="h-5"></div>; // Keep height consistent even if empty

  return (
    <div className="flex flex-wrap gap-1 items-center mt-0.5"> {/* Reduced mt */} 
      <HeaderPillButton 
        label="All"
        isActive={!selectedValue}
        onClick={() => onValueChange(undefined)}
        baseTextColor={baseTextColor}
      />
      {options.slice(0, 4).map(option => ( // Show 4 pills initially
        <HeaderPillButton 
          key={option}
          label={option}
          isActive={selectedValue === option}
          onClick={() => onValueChange(option)}
          baseTextColor={baseTextColor}
        />
      ))}
      {options.length > 4 && <span className={cn("text-xs ml-1 opacity-70", baseTextColor)}>(+{options.length - 4} more)</span>}
    </div>
  );
};

// Define the custom filter function
const smartIncludesFilter: FilterFn<ExcelRowWithParsed> = (
  row: Row<ExcelRowWithParsed>,
  columnId: string,
  filterValue: string | string[], // Can be string (text) or string[] (pills)
  addMeta: (meta: any) => void
) => {
  const rowValue = row.getValue(columnId);
  const rowValueString = String(rowValue).toLowerCase();

  if (Array.isArray(filterValue)) { // Pill filter (multi-select)
    if (filterValue.length === 0) return true; // No pills selected, pass all
    // Check if the row value is one of the selected pills (case-insensitive for pills)
    return filterValue.some(pill => String(pill).toLowerCase() === rowValueString);
  }
  // Text search filter (case-insensitive substring match)
  if (typeof filterValue === 'string') {
    return rowValueString.includes(filterValue.toLowerCase());
  }
  return true; // No filter active for this column
};

export function ExcelOrderSentenceTable({ rxcui, drugName, excelData }: ExcelOrderSentenceTableProps) {
  // Sorting and Global Filter states for TanStack Table (can remain)
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);

  // --- RAW Data Panel Filter States ---
  const [descriptionCombinationFilter, setDescriptionCombinationFilter] = useState<'all' | 'combination' | 'single'>('all');
  const [selectedDescriptionPill, setSelectedDescriptionPill] = useState<string | undefined>(undefined);
  const [descriptionSearchText, setDescriptionSearchText] = useState<string>('');
  const [selectedEncounterGroup, setSelectedEncounterGroup] = useState<string | undefined>(undefined);
  const [selectedSynonymPill, setSelectedSynonymPill] = useState<string | undefined>(undefined);
  const [synonymSearchText, setSynonymSearchText] = useState<string>('');
  const [selectedSynonymType, setSelectedSynonymType] = useState<string | undefined>(undefined);
  const [catalogTypeSearchText, setCatalogTypeSearchText] = useState<string>('');
  const [orderEntryFormatSearchText, setOrderEntryFormatSearchText] = useState<string>('');

  // --- PARSED Data Panel Filter States (NEW) ---
  const [panelSelectedRoute, setPanelSelectedRoute] = useState<string | undefined>(undefined);
  const [panelSelectedForm, setPanelSelectedForm] = useState<string | undefined>(undefined);
  // Add more parsed panel filter states here, e.g., for Frequency search text

  // --- PARSED Data Header Pill Filter States (Existing) ---
  // const [selectedParsedRoute, setSelectedParsedRoute] = useState<string | undefined>(undefined); // For header pills
  // const [selectedParsedForm, setSelectedParsedForm] = useState<string | undefined>(undefined);   // For header pills

  const [displayMode, setDisplayMode] = useState<'raw' | 'parsed'>('raw');
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });

  console.log(`[ExcelTable] Initial Data: ${excelData.length} rows. Drug: ${drugName}`);

  // Step 1: Filter by drugName from props
  const baseDataAfterDrugFilter = useMemo(() => {
    if (!excelData || excelData.length === 0) return [];
    const lowercasedDrugName = drugName.toLowerCase();
    const filtered = excelData.filter((row: ExcelRow) => String(row["Description"] || '').toLowerCase().includes(lowercasedDrugName));
    console.log(`[ExcelTable] Step 1 (drugName filter '${drugName}'): ${filtered.length} rows`);
    return filtered;
  }, [excelData, drugName]);

  // Step 2: Apply RAW panel filters
  const dataAfterRawPanelFilters = useMemo(() => {
    let result: ExcelRow[] = baseDataAfterDrugFilter;
    // Apply RAW panel filters (Description, Encounter Group, Synonym, etc.)
    if (descriptionCombinationFilter !== 'all') {
      result = result.filter((row: ExcelRow) => {
        const desc = String(row["Description"] || '');
        const isCombination = desc.includes('/') || desc.includes('-');
        if (descriptionCombinationFilter === 'combination') return isCombination;
        if (descriptionCombinationFilter === 'single') return !isCombination;
        return true;
      });
    }
    if (selectedDescriptionPill) result = result.filter((row: ExcelRow) => String(row["Description"] || '') === selectedDescriptionPill);
    if (descriptionSearchText.trim() !== '') {
      const lower = descriptionSearchText.toLowerCase();
      result = result.filter((row: ExcelRow) => String(row["Description"] || '').toLowerCase().includes(lower));
    }
    if (selectedEncounterGroup) result = result.filter((row: ExcelRow) => String(row["Encounter Group"] || '') === selectedEncounterGroup);
    if (selectedSynonymPill) result = result.filter((row: ExcelRow) => String(row["Synonym"] || '') === selectedSynonymPill);
    if (synonymSearchText.trim() !== '') {
      const lower = synonymSearchText.toLowerCase();
      result = result.filter((row: ExcelRow) => String(row["Synonym"] || '').toLowerCase().includes(lower));
    }
    if (selectedSynonymType) result = result.filter((row: ExcelRow) => String(row["Synonym Type"] || '') === selectedSynonymType);
    if (catalogTypeSearchText.trim() !== '') {
      const lower = catalogTypeSearchText.toLowerCase();
      result = result.filter((row: ExcelRow) => String(row["Catalog Type"] || '').toLowerCase().includes(lower));
    }
    if (orderEntryFormatSearchText.trim() !== '') {
      const lower = orderEntryFormatSearchText.toLowerCase();
      result = result.filter((row: ExcelRow) => String(row["Order Entry Format"] || '').toLowerCase().includes(lower));
    }
    console.log(`[ExcelTable] Step 2 (raw panel filters): ${result.length} rows`);
    return result;
  }, [
    baseDataAfterDrugFilter,
    descriptionCombinationFilter, selectedDescriptionPill, descriptionSearchText,
    selectedEncounterGroup, selectedSynonymPill, synonymSearchText, selectedSynonymType,
    catalogTypeSearchText, orderEntryFormatSearchText
  ]);

  // Step 3: Parse sentences if in 'parsed' mode, using data from Step 2
  const baseParsedDataForMode = useMemo(() => {
    if (displayMode === 'raw') {
      console.log(`[ExcelTable] Step 3 (raw mode, no parsing): ${dataAfterRawPanelFilters.length} rows`);
      return dataAfterRawPanelFilters as ExcelRowWithParsed[]; // Cast, as _parsedSentence won't be used
    }
    // displayMode === 'parsed'
    const parsed = dataAfterRawPanelFilters.map((row: ExcelRow) => ({
      ...row,
      _parsedSentence: parseOrderSentence(row['Sentence'] as string),
    }));
    console.log(`[ExcelTable] Step 3 (parsed mode, after parsing): ${parsed.length} rows`);
    return parsed;
  }, [dataAfterRawPanelFilters, displayMode]);

  // Step 4: Apply PARSED panel filters (if in parsed mode)
  const dataAfterParsedPanelFilters = useMemo(() => {
    if (displayMode !== 'parsed') return baseParsedDataForMode; // Pass through if not in parsed mode
    
    let result = baseParsedDataForMode;
    if (panelSelectedRoute) {
      result = result.filter(row => row._parsedSentence?.RXROUTE === panelSelectedRoute);
    }
    if (panelSelectedForm) {
      result = result.filter(row => row._parsedSentence?.DOSE_FORM === panelSelectedForm);
    }
    console.log(`[ExcelTable] Step 4 (parsed panel filters): ${result.length} rows`);
    return result;
  }, [baseParsedDataForMode, displayMode, panelSelectedRoute, panelSelectedForm]);

  // Step 5: Apply PARSED header pill filters (if in parsed mode)
  const fullyFilteredData = useMemo(() => {
    if (displayMode !== 'parsed') return dataAfterParsedPanelFilters; // Which is baseParsedDataForMode for raw mode

    let result = dataAfterParsedPanelFilters;
    // Header pill filters are handled by ColumnHeaderFilterPopover now
    console.log(`[ExcelTable] Step 5 (parsed header pills): ${result.length} rows. FINAL for table.`);
    return result;
  }, [dataAfterParsedPanelFilters, displayMode]);

  // --- Unique Value Calculations (adjust based on new data flow) ---
  const PILL_LIMIT = 5;

  // For RAW panel filters (derived from data *after drug filter*)
  const uniqueEncounterGroups = useMemo(() => Array.from(new Set(baseDataAfterDrugFilter.map(row => String(row['Encounter Group']|| '').trim()).filter(Boolean))).sort(), [baseDataAfterDrugFilter]);
  const uniqueSynonymTypes = useMemo(() => Array.from(new Set(baseDataAfterDrugFilter.map(row => String(row['Synonym Type']|| '').trim()).filter(Boolean))).sort(), [baseDataAfterDrugFilter]);
  const top5UniqueDescriptions = useMemo(() => Array.from(new Set(baseDataAfterDrugFilter.map(row => String(row['Description']|| '').trim()).filter(Boolean))).sort().slice(0, PILL_LIMIT), [baseDataAfterDrugFilter]);
  const top5UniqueSynonyms = useMemo(() => Array.from(new Set(baseDataAfterDrugFilter.map(row => String(row['Synonym']|| '').trim()).filter(Boolean))).sort().slice(0, PILL_LIMIT), [baseDataAfterDrugFilter]);

  // For PARSED panel filters (derived from data *after raw filters & parsing*)
  const uniquePanelRoutes = useMemo(() => {
    if (displayMode !== 'parsed') return []; // Only relevant in parsed mode
    const dataForPanelOptions = dataAfterRawPanelFilters.map(row => parseOrderSentence(row['Sentence'] as string));
    return Array.from(new Set(dataForPanelOptions.map(ps => ps?.RXROUTE).filter(Boolean) as string[])).sort();
  }, [dataAfterRawPanelFilters, displayMode]);

  const uniquePanelForms = useMemo(() => {
    if (displayMode !== 'parsed') return [];
    const dataForPanelOptions = dataAfterRawPanelFilters.map(row => parseOrderSentence(row['Sentence'] as string));
    return Array.from(new Set(dataForPanelOptions.map(ps => ps?.DOSE_FORM).filter(Boolean) as string[])).sort();
  }, [dataAfterRawPanelFilters, displayMode]);

  // For ColumnHeaderFilterPopover unique values (derived from dataForTableBeforeColumnFilters)
  const getUniqueColumnValues = (columnId: string): string[] => {
    if (!dataAfterParsedPanelFilters) return [];
    const values = dataAfterParsedPanelFilters.map((row: ExcelRowWithParsed) => {
        if (columnId.startsWith('_parsedSentence.')) {
            const key = columnId.split('.')[1] as keyof ParsedOrderSentence;
            return row._parsedSentence ? row._parsedSentence[key] : undefined;
        }
        return (row as ExcelRow)[columnId];
    });
    return Array.from(new Set(values.filter(val => val !== undefined && val !== null).map(String))).sort();
  };
  
  const uniqueCatalogTypesForPopover = useMemo(() => getUniqueColumnValues('Catalog Type'), [dataAfterParsedPanelFilters]);
  const uniqueEncounterGroupsForPopover = useMemo(() => getUniqueColumnValues('Encounter Group'), [dataAfterParsedPanelFilters]);
  const uniqueDescriptionsForPopover = useMemo(() => getUniqueColumnValues('Description'), [dataAfterParsedPanelFilters]);
  const uniqueSynonymsForPopover = useMemo(() => getUniqueColumnValues('Synonym'), [dataAfterParsedPanelFilters]);
  const uniqueSynonymTypesForPopover = useMemo(() => getUniqueColumnValues('Synonym Type'), [dataAfterParsedPanelFilters]);
  const uniqueOrderEntryFormatsForPopover = useMemo(() => getUniqueColumnValues('Order Entry Format'), [dataAfterParsedPanelFilters]);
  
  const uniqueParsedDoseForPopover = useMemo(() => getUniqueColumnValues('_parsedSentence.DOSE'), [dataAfterParsedPanelFilters]);
  const uniqueParsedUOMForPopover = useMemo(() => getUniqueColumnValues('_parsedSentence.DOSE_UOM'), [dataAfterParsedPanelFilters]);
  const uniqueParsedRouteForPopover = useMemo(() => getUniqueColumnValues('_parsedSentence.RXROUTE'), [dataAfterParsedPanelFilters]);
  const uniqueParsedFormForPopover = useMemo(() => getUniqueColumnValues('_parsedSentence.DOSE_FORM'), [dataAfterParsedPanelFilters]);
  const uniqueParsedFrequencyForPopover = useMemo(() => getUniqueColumnValues('_parsedSentence.FREQUENCY'), [dataAfterParsedPanelFilters]);
  const uniqueParsedPrnForPopover = useMemo(() => getUniqueColumnValues('_parsedSentence.PRN'), [dataAfterParsedPanelFilters]);
  const uniqueParsedPrnReasonForPopover = useMemo(() => getUniqueColumnValues('_parsedSentence.PRN_REASON'), [dataAfterParsedPanelFilters]);

  // --- Column Definitions ---
  const createHeaderWithPopover = (title: string, column: any, uniquePills?: string[], styleName?: string) => {
    const styles = getColumnStyles(styleName || title);
    const sortDirection = column.getIsSorted();
    const sortIndex = column.getSortIndex();
    const isMultiSortingActive = table.getState().sorting.length > 1;
    const isDescriptionCol = title === 'Description';

    return (
      <div className={cn('w-full h-full px-2 py-1.5 flex items-center justify-between', styles.bg, styles.text)}>
        <div 
            onClick={(e: React.MouseEvent) => { 
                const isShiftPressed = e.getModifierState('Shift');
                console.log(`[ExcelTable] Header Clicked: ${column.id}, Shift: ${isShiftPressed}, Current Sort: ${column.getIsSorted()}, Current Index: ${column.getSortIndex()}`);
                column.toggleSorting(undefined, isShiftPressed); 
            }} 
            className="cursor-pointer flex items-center group/title"
            title={isMultiSortingActive ? "Sort (Shift+Click to add to sort)" : "Sort (Shift+Click for multi-sort)"}
        >
            {title}
            <span className="ml-1.5 text-xs opacity-0 group-hover/title:opacity-60 transition-opacity">
                {sortDirection === 'asc' && <ArrowUpIcon className="h-3.5 w-3.5" />}
                {sortDirection === 'desc' && <ArrowDownIcon className="h-3.5 w-3.5" />}
                {!sortDirection && <ChevronsUpDownIcon className="h-3.5 w-3.5" />}
            </span>
            {isMultiSortingActive && sortDirection && (
                <span className="ml-1 text-[10px] font-normal opacity-70">({sortIndex + 1})</span>
            )}
        </div>
        <ColumnHeaderFilterPopover 
            column={column} 
            title={title} 
            uniqueValuesForPills={uniquePills}
            columnNameForPillStyling={styleName || title}
            isDescriptionColumn={isDescriptionCol}
            descriptionCombinationFilter={isDescriptionCol ? descriptionCombinationFilter : undefined}
            onDescriptionCombinationFilterChange={isDescriptionCol ? setDescriptionCombinationFilter : undefined}
        />
      </div>
    );
  };
  
  const rawColumns = useMemo<ColumnDef<ExcelRowWithParsed>[]>(() => [
    { accessorKey: 'Catalog Type', header: ({column}) => createHeaderWithPopover('Catalog Type', column, uniqueCatalogTypesForPopover), cell: ({getValue}) => <div className={cn('px-2 py-1 h-full', getColumnStyles('Catalog Type').cellBg, getColumnStyles('Catalog Type').text)}>{String(getValue())}</div>, filterFn: smartIncludesFilter, enableColumnFilter: true },
    { accessorKey: 'Encounter Group', header: ({column}) => createHeaderWithPopover('Encounter Group', column, uniqueEncounterGroupsForPopover), cell: ({getValue}) => <div className={cn('px-2 py-1 h-full', getColumnStyles('Encounter Group').cellBg, getColumnStyles('Encounter Group').text)}>{String(getValue())}</div>, filterFn: smartIncludesFilter, enableColumnFilter: true },
    { accessorKey: 'Description', header: ({column}) => createHeaderWithPopover('Description', column, uniqueDescriptionsForPopover), cell: ({getValue}) => <div className={cn('px-2 py-1 h-full', getColumnStyles('Description').cellBg, getColumnStyles('Description').text)}>{String(getValue())}</div>, filterFn: smartIncludesFilter, enableColumnFilter: true },
    { accessorKey: 'Synonym', header: ({column}) => createHeaderWithPopover('Synonym', column, uniqueSynonymsForPopover), cell: ({getValue}) => <div className={cn('px-2 py-1 h-full', getColumnStyles('Synonym').cellBg, getColumnStyles('Synonym').text)}>{String(getValue())}</div>, filterFn: smartIncludesFilter, enableColumnFilter: true },
    { accessorKey: 'Synonym Type', header: ({column}) => createHeaderWithPopover('Synonym Type', column, uniqueSynonymTypesForPopover), cell: ({getValue}) => <div className={cn('px-2 py-1 h-full', getColumnStyles('Synonym Type').cellBg, getColumnStyles('Synonym Type').text)}>{String(getValue())}</div>, filterFn: smartIncludesFilter, enableColumnFilter: true }, 
    { accessorKey: 'Order Entry Format', header: ({column}) => createHeaderWithPopover('Order Entry Format', column, uniqueOrderEntryFormatsForPopover), cell: ({getValue}) => <div className={cn('px-2 py-1 h-full', getColumnStyles('Order Entry Format').cellBg, getColumnStyles('Order Entry Format').text)}>{String(getValue())}</div>, filterFn: smartIncludesFilter, enableColumnFilter: true },
    { accessorKey: 'Sentence', header: ({column}) => createHeaderWithPopover('Order Sentence', column, undefined, 'Sentence'), cell: ({getValue}) => <div className={cn('px-2 py-1 h-full text-sm', getColumnStyles('Sentence').cellBg, getColumnStyles('Sentence').text)}>{String(getValue())}</div>, filterFn: smartIncludesFilter, enableColumnFilter: true },
  ], [uniqueCatalogTypesForPopover, uniqueEncounterGroupsForPopover, uniqueDescriptionsForPopover, uniqueSynonymsForPopover, uniqueSynonymTypesForPopover, uniqueOrderEntryFormatsForPopover]);

  const parsedColumns = useMemo<ColumnDef<ExcelRowWithParsed>[]>(() => {
    return [
      { accessorKey: 'Synonym', header: ({column}) => createHeaderWithPopover('Synonym', column, uniqueSynonymsForPopover, 'Synonym'), cell: ({getValue}) => <div className={cn('px-2 py-1 h-full', getColumnStyles('Synonym').cellBg, getColumnStyles('Synonym').text)}>{String(getValue() || '')}</div>, filterFn: smartIncludesFilter, enableColumnFilter: true },
      { accessorKey: '_parsedSentence.DOSE', header: ({column}) => createHeaderWithPopover('DOSE', column, uniqueParsedDoseForPopover, 'Default'), cell: info => <div className={cn('px-2 py-1 h-full', getColumnStyles('Default').cellBg, getColumnStyles('Default').text)}>{String(info.getValue() || '')}</div>, filterFn: smartIncludesFilter, enableColumnFilter: true },
      { accessorKey: '_parsedSentence.DOSE_UOM', header: ({column}) => createHeaderWithPopover('UOM', column, uniqueParsedUOMForPopover, 'Default'), cell: info => <div className={cn('px-2 py-1 h-full', getColumnStyles('Default').cellBg, getColumnStyles('Default').text)}>{String(info.getValue() || '')}</div>, filterFn: smartIncludesFilter, enableColumnFilter: true },
      { accessorKey: '_parsedSentence.RXROUTE', header: ({column}) => createHeaderWithPopover('Route', column, uniqueParsedRouteForPopover, 'Default'), cell: info => <div className={cn('px-2 py-1 h-full', getColumnStyles('Default').cellBg, getColumnStyles('Default').text)}>{String(info.getValue() || '')}</div>, filterFn: smartIncludesFilter, enableColumnFilter: true },
      { accessorKey: '_parsedSentence.DOSE_FORM', header: ({column}) => createHeaderWithPopover('Form', column, uniqueParsedFormForPopover, 'Default'), cell: info => <div className={cn('px-2 py-1 h-full', getColumnStyles('Default').cellBg, getColumnStyles('Default').text)}>{String(info.getValue() || '')}</div>, filterFn: smartIncludesFilter, enableColumnFilter: true },
      { accessorKey: '_parsedSentence.FREQUENCY', header: ({column}) => createHeaderWithPopover('Frequency', column, uniqueParsedFrequencyForPopover, 'Default'), cell: info => <div className={cn('px-2 py-1 h-full', getColumnStyles('Default').cellBg, getColumnStyles('Default').text)}>{String(info.getValue() || '')}</div>, filterFn: smartIncludesFilter, enableColumnFilter: true },
      { accessorKey: '_parsedSentence.PRN', header: ({column}) => createHeaderWithPopover('PRN', column, uniqueParsedPrnForPopover, 'Default'), cell: info => <div className={cn('px-2 py-1 h-full', getColumnStyles('Default').cellBg, getColumnStyles('Default').text)}>{String(info.getValue() || '')}</div>, filterFn: smartIncludesFilter, enableColumnFilter: true },
      { accessorKey: '_parsedSentence.PRN_REASON', header: ({column}) => createHeaderWithPopover('PRN Reason', column, uniqueParsedPrnReasonForPopover, 'Default'), cell: info => <div className={cn('px-2 py-1 h-full', getColumnStyles('Default').cellBg, getColumnStyles('Default').text)}>{String(info.getValue() || '')}</div>, filterFn: smartIncludesFilter, enableColumnFilter: true },
      { accessorKey: 'Sentence', header: ({column}) => createHeaderWithPopover('Original Sentence', column, undefined, 'Sentence'), cell: info => <div className={cn('px-2 py-1 h-full text-xs text-gray-500 max-w-xs truncate', getColumnStyles('Sentence').cellBg, getColumnStyles('Sentence').text)} title={String(info.getValue() || '')}>{String(info.getValue() || '')}</div>, filterFn: smartIncludesFilter, enableColumnFilter: true },
    ]
  }, [uniqueSynonymsForPopover, uniqueParsedDoseForPopover, uniqueParsedUOMForPopover, uniqueParsedRouteForPopover, uniqueParsedFormForPopover, uniqueParsedFrequencyForPopover, uniqueParsedPrnForPopover, uniqueParsedPrnReasonForPopover ]);

  const columnsToUse = displayMode === 'raw' ? rawColumns : parsedColumns;
  const dataForTable = dataAfterParsedPanelFilters;

  const table = useReactTable({
    data: dataForTable,
    columns: columnsToUse,
    filterFns: {
      smartIncludesFilter,
    },
    state: {
      sorting,
      columnFilters,
      globalFilter,
      pagination,
    },
    enableMultiSort: true, // Enable multi-column sorting
    enableSortingRemoval: true, // Allows cycling through asc, desc, and then removing sort for a column
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(), // Crucial for sorting
    getPaginationRowModel: getPaginationRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    manualPagination: false,
    autoResetPageIndex: true, 
  });

  // Log sorting state changes
  useEffect(() => {
    console.log('[ExcelTable] Sorting state changed:', JSON.stringify(table.getState().sorting));
  }, [table.getState().sorting]);

  const noResultsAfterPanelFilters = 
    excelData.length > 0 &&
    dataForTable.length === 0 && // Check data *before* TanStack column filters
    !globalFilter && // And before global filter
    columnFilters.length === 0; // And before popover filters are active

  const noResultsAfterAllFilters =
    excelData.length > 0 &&
    table.getRowModel().rows.length === 0; // Check final rows after all TanStack filters

  const currentNoResultsMessage = () => {
    if (noResultsAfterPanelFilters) {
      return <p>No order sentences found for &quot;{drugName}&quot; after applying panel filters.</p>;
    }
    if (noResultsAfterAllFilters) {
      return <p>No results match the current combined filter criteria (including column filters).</p>;
    }
    return null;
  };
  const finalNoResultsMessage = currentNoResultsMessage();

  return (
    <div className="w-full p-1">
      <div className="flex justify-between items-center mb-4 gap-2 flex-wrap">
        <div className="flex gap-2 items-center">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm" className="h-8">
                <PanelLeft className="h-4 w-4 mr-2" />
                Filters
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-full sm:w-[400px] overflow-y-auto p-0">
              <SheetHeader className="p-4 border-b bg-slate-50 dark:bg-slate-800 sticky top-0 z-10">
                <SheetTitle className="">{'Drug & Order Sentence Filters'}</SheetTitle>
                <SheetDescription className="">
                  {'Refine results based on raw data attributes.'}
                </SheetDescription>
              </SheetHeader>
              <div className="p-0">
                <FilterPanel 
                  selectedDescriptionPill={selectedDescriptionPill}
                  onSelectedDescriptionPillChange={setSelectedDescriptionPill}
                  descriptionSearchText={descriptionSearchText}
                  onDescriptionSearchTextChange={setDescriptionSearchText}
                  top5UniqueDescriptions={top5UniqueDescriptions}
                  selectedEncounterGroup={selectedEncounterGroup}
                  onSelectedEncounterGroupChange={setSelectedEncounterGroup}
                  uniqueEncounterGroups={uniqueEncounterGroups}
                  selectedSynonymPill={selectedSynonymPill}
                  onSelectedSynonymPillChange={setSelectedSynonymPill}
                  synonymSearchText={synonymSearchText}
                  onSynonymSearchTextChange={setSynonymSearchText}
                  top5UniqueSynonyms={top5UniqueSynonyms}
                  selectedSynonymType={selectedSynonymType}
                  onSelectedSynonymTypeChange={setSelectedSynonymType}
                  uniqueSynonymTypes={uniqueSynonymTypes}
                  catalogTypeSearchText={catalogTypeSearchText}
                  onCatalogTypeSearchTextChange={setCatalogTypeSearchText}
                  orderEntryFormatSearchText={orderEntryFormatSearchText}
                  onOrderEntryFormatSearchTextChange={setOrderEntryFormatSearchText}
                />
              </div>
            </SheetContent>
          </Sheet>

          {displayMode === 'parsed' && (
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="sm" className="h-8">
                  <PanelRight className="h-4 w-4 mr-2" />
                  Parsed Filters
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-full sm:w-[400px] overflow-y-auto p-0">
                <SheetHeader className="p-4 border-b bg-slate-50 dark:bg-slate-800 sticky top-0 z-10">
                  <SheetTitle className="">{'Parsed Sentence Filters'}</SheetTitle>
                  <SheetDescription className="">
                    {'Filter based on parsed components of the order sentence.'}
                  </SheetDescription>
                </SheetHeader>
                <div className="p-0">
                  <ParsedFilterPanel 
                    panelSelectedRoute={panelSelectedRoute}
                    onPanelSelectedRouteChange={setPanelSelectedRoute}
                    uniquePanelRoutes={uniquePanelRoutes}
                    panelSelectedForm={panelSelectedForm}
                    onPanelSelectedFormChange={setPanelSelectedForm}
                    uniquePanelForms={uniquePanelForms}
                  />
                </div>
              </SheetContent>
            </Sheet>
          )}
        </div>
        
        <div className="flex items-center gap-2 flex-wrap justify-end">
            <Input 
                type="text"
                placeholder="Global search..."
                value={globalFilter ?? ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setGlobalFilter(e.target.value)}
                className="max-w-xs h-8"
            />
            {table.getState().sorting.length > 0 && (
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => table.resetSorting()} // Clears all sorts
                    className="h-8 text-xs px-2"
                    title="Clear all column sorts"
                >
                    <XCircleIcon className="h-3.5 w-3.5 mr-1.5" />
                    Clear Sorts
                </Button>
            )}
            <div className="flex items-center space-x-2">
            <Switch
                id="displayModeToggle"
                checked={displayMode === 'parsed'}
                onCheckedChange={(checked: boolean) => {
                    setDisplayMode(checked ? 'parsed' : 'raw');
                    setColumnFilters([]); // Reset column filters on mode change
                    setSorting([]);       // Reset sorting on mode change
                }}
                className=""
            />
            <Label htmlFor="displayModeToggle" className="text-sm">Show Parsed</Label>
            </div>
        </div>
      </div>

      {finalNoResultsMessage ? (
        <div className="text-center py-10">{finalNoResultsMessage}</div>
      ) : (
        <>
          <div className="rounded-md border overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 border-collapse">
              <thead className="bg-gray-50 dark:bg-gray-800">
                {table.getHeaderGroups().map(headerGroup => (
                  <tr key={headerGroup.id}>
                    {headerGroup.headers.map(header => (
                      <th 
                        key={header.id}
                        scope="col"
                        className="text-left text-xs font-medium uppercase tracking-wider align-top p-0 relative group"
                        style={{ width: header.getSize() !== 150 ? header.getSize() : undefined }}
                      >
                        {header.isPlaceholder
                            ? null
                            : flexRender(
                                header.column.columnDef.header,
                                header.getContext()
                            )}
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody className="bg-white dark:bg-slate-900 divide-y divide-gray-200 dark:divide-gray-700">
                {table.getRowModel().rows.map(row => (
                  <tr key={row.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/50">
                    {row.getVisibleCells().map(cell => (
                      <td key={cell.id} className="whitespace-nowrap text-sm text-gray-700 dark:text-gray-300 p-0">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4 flex items-center justify-between flex-wrap gap-2">
            <div className="text-sm text-gray-700 dark:text-gray-300">
              Showing {table.getRowModel().rows.length} of {dataForTable.length} rows
              (filtered from {excelData.length} total after drug selection). Page {' '}
              <strong>
                {table.getState().pagination.pageIndex + 1} of {Math.max(1, table.getPageCount())}
              </strong>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-700 dark:text-gray-300">Rows per page:</span>
              <select
                value={table.getState().pagination.pageSize}
                onChange={e => {
                  table.setPageSize(Number(e.target.value))
                }}
                className="p-1 border border-gray-300 dark:border-gray-600 rounded-md text-sm h-8 bg-white dark:bg-slate-800 dark:text-gray-200 focus:ring-indigo-500 focus:border-indigo-500"
              >
                {[10, 25, 50, 100].map(pageSize => (
                  <option key={pageSize} value={pageSize}>
                    {pageSize}
                  </option>
                ))}
              </select>
              <Button
                variant="outline"
                size="sm"
                onClick={() => table.setPageSize(dataForTable.length)}
                className="h-8 px-2 text-xs"
                disabled={table.getState().pagination.pageSize === dataForTable.length || dataForTable.length === 0}
                title="Show all rows"
              >
                Show All ({dataForTable.length})
              </Button>
            </div>

            <div className="space-x-2">
              <Button variant="outline" size="sm" onClick={() => table.setPageIndex(0)} disabled={!table.getCanPreviousPage()} className="h-8 px-2">First</Button>
              <Button variant="outline" size="sm" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()} className="h-8 px-2">Previous</Button>
              <Button variant="outline" size="sm" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()} className="h-8 px-2">Next</Button>
              <Button variant="outline" size="sm" onClick={() => table.setPageIndex(table.getPageCount() - 1)} disabled={!table.getCanNextPage()} className="h-8 px-2">Last</Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
} 