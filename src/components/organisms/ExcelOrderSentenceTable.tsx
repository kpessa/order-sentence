'use client';

import React, { useState, useMemo } from 'react';
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  SortingState,
  useReactTable,
} from '@tanstack/react-table';
// import { CernerOrderSentence, OrderSentenceRow } from '@/lib/types'; // Keep if OrderSentenceRow is still used, or remove
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

// Assuming ExcelRow is defined in your hooks or types, or define it here
interface ExcelRow {
  [key: string]: any;
}

interface ExcelOrderSentenceTableProps {
  rxcui: string;
  drugName: string;
  excelData: ExcelRow[]; // Added excelData prop
}

export function ExcelOrderSentenceTable({ rxcui, drugName, excelData }: ExcelOrderSentenceTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState('');

  const data = useMemo(() => {
    console.log('[ExcelTable] Filtering data. Received drugName:', drugName);
    console.log('[ExcelTable] Received excelData length:', excelData?.length);

    if (!excelData || !drugName || excelData.length === 0) {
      console.log('[ExcelTable] excelData or drugName is missing or excelData is empty. Returning empty array.');
      return [];
    }
    
    const lowercasedDrugName = drugName.toLowerCase();
    console.log('[ExcelTable] Lowercased drugName for filtering:', lowercasedDrugName);

    // Log a few descriptions from the excelData before filtering
    if (excelData.length > 0) {
      console.log('[ExcelTable] Sample Descriptions from excelData (first 5 before filter):');
      excelData.slice(0, 5).forEach((row, index) => {
        console.log(`[ExcelTable] Row ${index} Description: '${String(row["Description"])}'`);
      });
    }
    
    const filteredData = excelData.filter(row => {
      const description = String(row["Description"]); 
      const lowercasedDescription = description.toLowerCase();
      const isMatch = lowercasedDescription.includes(lowercasedDrugName);
      // Optionally, log individual matches/non-matches for deep debugging, but can be very verbose
      // if (isMatch) console.log(`[ExcelTable] Match found: Description '${description}' includes '${lowercasedDrugName}'`);
      return isMatch;
    });

    console.log('[ExcelTable] Filtered data length:', filteredData.length);
    if (filteredData.length === 0) {
        console.log('[ExcelTable] No matches found after filtering. Check drugName and Description column contents.');
    }
    return filteredData;
  }, [excelData, drugName]);

  // IMPORTANT: Update these column definitions to match your Excel sheet headers (from row 2)
  // The `accessorKey` should be the exact header name from your Excel file.
  const columns = useMemo<ColumnDef<ExcelRow>[]>(() => [
    { accessorKey: 'Catalog Type', header: 'Catalog Type' },
    { accessorKey: 'Encounter Group', header: 'Encounter Group' },
    { accessorKey: 'Description', header: 'Description' },
    { accessorKey: 'Synonym', header: 'Synonym' },
    { accessorKey: 'Synonym Type', header: 'Synonym Type' },
    { accessorKey: 'Order Entry Format', header: 'Order Entry Format' },
    { accessorKey: 'Sentence', header: 'Order Sentence', cell: info => <span className="text-sm">{String(info.getValue())}</span> },
  ], []);

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      globalFilter,
    },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
        pagination: {
            pageSize: 10, // Default page size, can be adjusted
        }
    }
  });

  if (!data || data.length === 0) {
    return <p>No order sentences found matching "{drugName}" in the Description column of the Excel data.</p>;
  }

  return (
    <div className="w-full">
        <div className="mb-4">
            <Input 
                type="text"
                placeholder="Search all columns..."
                value={globalFilter ?? ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setGlobalFilter(e.target.value)}
                className="max-w-sm"
            />
        </div>
      <div className="rounded-md border overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            {table.getHeaderGroups().map(headerGroup => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map(header => (
                  <th 
                    key={header.id}
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                    onClick={header.column.getToggleSortingHandler()}
                  >
                    {flexRender(header.column.columnDef.header, header.getContext())}
                    {{
                      asc: ' 🔼',
                      desc: ' 🔽',
                    }[header.column.getIsSorted() as string] ?? null}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {table.getRowModel().rows.map(row => (
              <tr key={row.id} className="hover:bg-gray-50">
                {row.getVisibleCells().map(cell => (
                  <td key={cell.id} className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-4 flex items-center justify-between">
        <div className="text-sm text-gray-700">
            Page {' '}
            <strong>
                {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
            </strong>
        </div>
        <div className="space-x-2">
            <Button
                variant="outline"
                size="sm"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
                className=""
            >
                Previous
            </Button>
            <Button
                variant="outline"
                size="sm"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
                className=""
            >
                Next
            </Button>
        </div>
      </div>
    </div>
  );
} 