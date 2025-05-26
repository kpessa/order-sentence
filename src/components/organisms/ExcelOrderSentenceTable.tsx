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
import { CernerOrderSentence, OrderSentenceRow } from '@/lib/types';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface ExcelOrderSentenceTableProps {
  rxcui: string;
  drugName: string;
  // We'll pass actual data later
  // initialData?: CernerOrderSentence[];
}

// Mock data - this would eventually come from parsing an Excel/CSV file
// and filtering by rxcui/drugName
const MOCK_ORDER_SENTENCES: CernerOrderSentence[] = [
  {
    id: '1',
    rxcui: '153165',
    drugName: 'Atorvastatin',
    originalOrderSentence: 'ATORVASTATIN 20 MG PO QDAY',
    strength: '20 MG',
    form: 'TABLET',
    route: 'PO',
    frequency: 'QDAY',
    orderType: 'Scheduled',
  },
  {
    id: '2',
    rxcui: '153165',
    drugName: 'Atorvastatin',
    originalOrderSentence: 'ATORVASTATIN 40 MG PO HS',
    strength: '40 MG',
    form: 'TABLET',
    route: 'PO',
    frequency: 'HS',
    orderType: 'Scheduled',
  },
  {
    id: '3',
    rxcui: '123',
    drugName: 'Lisinopril',
    originalOrderSentence: 'LISINOPRIL 10 MG PO DAILY',
    strength: '10 MG',
    form: 'TABLET',
    route: 'PO',
    frequency: 'DAILY',
    orderType: 'Scheduled'
  },
  {
    id: '4',
    rxcui: '123',
    drugName: 'Lisinopril',
    originalOrderSentence: 'LISINOPRIL 5 MG PO BID PRN HTN',
    strength: '5 MG',
    form: 'TABLET',
    route: 'PO',
    frequency: 'BID',
    orderType: 'PRN',
  },
];

export function ExcelOrderSentenceTable({ rxcui, drugName }: ExcelOrderSentenceTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState('');

  const data = useMemo(() => 
    MOCK_ORDER_SENTENCES.filter(sentence => sentence.rxcui === rxcui)
  , [rxcui]);

  const columns = useMemo<ColumnDef<CernerOrderSentence>[]>(() => [
    { accessorKey: 'drugName', header: 'Drug Name' },
    { accessorKey: 'strength', header: 'Strength' },
    { accessorKey: 'form', header: 'Form' },
    { accessorKey: 'route', header: 'Route' },
    { accessorKey: 'frequency', header: 'Frequency' },
    { accessorKey: 'orderType', header: 'Order Type' },
    { accessorKey: 'originalOrderSentence', header: 'Order Sentence', cell: info => <span className="text-sm">{String(info.getValue())}</span> },
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
            pageSize: 5, // Default page size
        }
    }
  });

  if (!data || data.length === 0) {
    return <p>No order sentences found for {drugName} (RxCUI: {rxcui}). This might be mock data limitations.</p>;
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