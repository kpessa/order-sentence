'use client';

import React, { Suspense, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { ExcelOrderSentenceTable } from '@/components/organisms/ExcelOrderSentenceTable';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
// import { useExcelData } from '@/lib/hooks/useExcelData'; // Removed
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '@/lib/store';
import { fetchExcelData, selectAllExcelData, selectExcelDataLoading, selectExcelDataError } from '@/lib/store/slices/excelDataSlice';

function ExcelViewerContent() {
    const searchParams = useSearchParams();
    const rxcui = searchParams.get('rxcui');
    const drugName = searchParams.get('name');

    const dispatch = useDispatch<AppDispatch>();
    const excelData = useSelector(selectAllExcelData);
    const excelLoadingStatus = useSelector(selectExcelDataLoading);
    const excelError = useSelector(selectExcelDataError);

    console.log('[ExcelViewerContent] Component render/re-render.');
    console.log('[ExcelViewerContent] excelLoadingStatus from store:', excelLoadingStatus);
    console.log('[ExcelViewerContent] excelData.length from store:', excelData.length);
    
    useEffect(() => {
        console.log('[ExcelViewerContent] useEffect triggered. Current status:', excelLoadingStatus, 'Data length:', excelData.length);
        // We want to fetch if:
        // 1. There's no data AND we are not in a 'succeeded' or 'failed' state.
        //    This covers 'idle' (initial load) and 'pending' (if rehydrated in this state after a crash, or if a previous attempt is ongoing).
        //    The createAsyncThunk itself will prevent multiple simultaneous executions of the same thunk.
        if (excelData.length === 0 && excelLoadingStatus !== 'succeeded' && excelLoadingStatus !== 'failed') {
            console.log('[ExcelViewerContent] useEffect: Dispatching fetchExcelData() because data is empty and status is not succeeded/failed. Status:', excelLoadingStatus);
            dispatch(fetchExcelData());
        } else {
            console.log('[ExcelViewerContent] useEffect: Not dispatching. Status:', excelLoadingStatus, 'Data length:', excelData.length);
        }
    }, [dispatch, excelLoadingStatus, excelData.length]);

    // Show loading if status is 'pending' or if it's 'idle' but there's no data yet (initial load before persistence kicks in fully or first fetch)
    const isLoading = excelLoadingStatus === 'pending' || (excelLoadingStatus === 'idle' && excelData.length === 0);
    console.log('[ExcelViewerContent] Calculated isLoading:', isLoading);

    if (isLoading) {
        console.log('[ExcelViewerContent] Rendering: Loading Excel data...');
        return <div className="text-center text-lg font-semibold">Loading Excel data...</div>;
    }

    if (excelError) {
        console.log('[ExcelViewerContent] Rendering: Error loading Excel data.', excelError);
        return <div className="text-center text-red-600">Error loading Excel data: {excelError}</div>;
    }

    if (!rxcui || !drugName) {
        console.log('[ExcelViewerContent] Rendering: Drug information not provided.');
        return (
            <div className="text-center">
                <p className="mb-4 text-red-600">Drug information not provided.</p>
                <Button 
                    asChild
                    variant="default"
                    size="default"
                    className=""
                >
                    <Link href="/">Please select a drug first</Link>
                </Button>
            </div>
        );
    }

    const decodedDrugName = decodeURIComponent(drugName);

    // console.log("[ExcelViewerContent] excelData from Redux (full sample of first 5):");
    // console.log(excelData.slice(0,5)); 
    // if (excelData && excelData.length > 0) {
    //   console.log("[ExcelViewerContent] First item of excelData from Redux (excelData[0]):");
    //   console.log(excelData[0]);
    // }

    return (
        <div>
            <header className="mb-6">
                <h1 className="text-3xl font-bold text-gray-800">Cerner Order Sentences</h1>
                <p className="text-xl text-gray-600">For: <span className="font-semibold">{decodedDrugName}</span> (RxCUI: {rxcui})</p>
            </header>
            
            <ExcelOrderSentenceTable rxcui={rxcui} drugName={decodedDrugName} excelData={excelData} />
            
            <div className="mt-8 text-sm text-gray-500">
                <p>This table displays order sentences from the centrally managed Excel file.</p>
            </div>
        </div>
    );
}

export default function ExcelViewerPage() {
  return (
    <main className="container mx-auto p-4 md:p-8">
        <Suspense fallback={<div className="text-center text-lg font-semibold">Loading drug information...</div>}>
            <ExcelViewerContent />
        </Suspense>
    </main>
  );
} 