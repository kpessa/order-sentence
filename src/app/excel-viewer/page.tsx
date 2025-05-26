'use client';

import React, { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { ExcelOrderSentenceTable } from '@/components/organisms/ExcelOrderSentenceTable';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

function ExcelViewerContent() {
    const searchParams = useSearchParams();
    const rxcui = searchParams.get('rxcui');
    const drugName = searchParams.get('name');

    if (!rxcui || !drugName) {
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

    return (
        <div>
            <header className="mb-6">
                <h1 className="text-3xl font-bold text-gray-800">Cerner Order Sentences</h1>
                <p className="text-xl text-gray-600">For: <span className="font-semibold">{decodedDrugName}</span> (RxCUI: {rxcui})</p>
            </header>
            
            <ExcelOrderSentenceTable rxcui={rxcui} drugName={decodedDrugName} />
            
            <div className="mt-8 text-sm text-gray-500">
                <p>This table displays mock order sentences. Future enhancements will allow uploading and parsing Excel/CSV files for real-time data analysis.</p>
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