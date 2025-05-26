'use client';

import React, { Suspense, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { ExcelOrderSentenceTable } from '@/components/organisms/ExcelOrderSentenceTable';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
// import { useExcelData } from '@/lib/hooks/useExcelData'; // Removed
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '@/lib/store';
import { fetchExcelData, selectAllExcelData, selectExcelDataLoading, selectExcelDataError } from '@/lib/store/slices/excelDataSlice';
import { selectSelectedDrug } from '@/lib/store/slices/drugSearchSlice';

function ExcelViewerContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const rxcuiFromUrl = searchParams.get('rxcui');
    const drugNameFromUrl = searchParams.get('name');

    const dispatch = useDispatch<AppDispatch>();
    const excelData = useSelector(selectAllExcelData);
    const excelLoadingStatus = useSelector(selectExcelDataLoading);
    const excelError = useSelector(selectExcelDataError);
    const selectedDrugFromStore = useSelector(selectSelectedDrug);

    console.log('[ExcelViewerContent] Component render/re-render.');
    console.log('[ExcelViewerContent] excelLoadingStatus from store:', excelLoadingStatus);
    console.log('[ExcelViewerContent] excelData.length from store:', excelData.length);
    
    useEffect(() => {
        console.log('[ExcelViewerContent] useEffect triggered. Current status:', excelLoadingStatus, 'Data length:', excelData.length);
        if (selectedDrugFromStore && 
            (selectedDrugFromStore.rxcui !== rxcuiFromUrl || selectedDrugFromStore.name !== drugNameFromUrl)) {
            console.log('[ExcelViewerContent] Drug selection in Redux changed. Updating URL.');
            const newParams = new URLSearchParams();
            newParams.set('rxcui', selectedDrugFromStore.rxcui);
            newParams.set('name', encodeURIComponent(selectedDrugFromStore.name));
            router.replace(`/excel-viewer?${newParams.toString()}`);
        }
    }, [selectedDrugFromStore, rxcuiFromUrl, drugNameFromUrl, router]);

    useEffect(() => {
        console.log('[ExcelViewerContent] useEffect for ExcelData. Current excelLoadingStatus:', excelLoadingStatus, 'ExcelData length:', excelData.length);
        if (excelData.length === 0 && excelLoadingStatus !== 'succeeded' && excelLoadingStatus !== 'failed') {
            dispatch(fetchExcelData());
        }
    }, [dispatch, excelLoadingStatus, excelData.length]);

    const isLoadingExcel = excelLoadingStatus === 'pending' || (excelLoadingStatus === 'idle' && excelData.length === 0);
    console.log('[ExcelViewerContent] Calculated isLoading:', isLoadingExcel);

    if (isLoadingExcel) {
        console.log('[ExcelViewerContent] Rendering: Loading Excel data...');
        return <div className="text-center text-lg font-semibold">Loading Excel data...</div>;
    }

    if (excelError) {
        console.log('[ExcelViewerContent] Rendering: Error loading Excel data.', excelError);
        return <div className="text-center text-red-600">Error loading Excel data: {excelError}</div>;
    }

    if (!rxcuiFromUrl || !drugNameFromUrl) {
        console.log('[ExcelViewerContent] Rendering: Drug information not provided in URL.');
        return (
            <div className="text-center">
                <p className="mb-4 text-red-600">Drug information not provided in URL.</p>
                <p className="mb-2 text-sm">Please select a drug using the search in the filter panel.</p>
                <Button asChild variant="link" size="sm" className="mt-2">
                    <Link href="/">Go to Home</Link>
                </Button>
            </div>
        );
    }

    const decodedDrugNameFromUrl = decodeURIComponent(drugNameFromUrl);

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
                <p className="text-xl text-gray-600">For: <span className="font-semibold">{decodedDrugNameFromUrl}</span> (RxCUI: {rxcuiFromUrl})</p>
            </header>
            
            <ExcelOrderSentenceTable rxcui={rxcuiFromUrl} drugName={decodedDrugNameFromUrl} excelData={excelData} />
            
            <div className="mt-8 text-sm text-gray-500">
                <p>This table displays order sentences from the centrally managed Excel file.</p>
            </div>
        </div>
    );
}

export default function ExcelViewerPage() {
  return (
    <main className="w-full p-4 md:p-8">
        <Suspense fallback={<div className="text-center text-lg font-semibold">Loading drug information...</div>}>
            <ExcelViewerContent />
        </Suspense>
    </main>
  );
} 