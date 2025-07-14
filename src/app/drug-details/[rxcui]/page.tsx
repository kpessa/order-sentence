'use client';

import React, { Suspense, useEffect } from 'react';
import { useParams } from 'next/navigation'; // Or use props if it's a server component entry point
import { useDispatch, useSelector } from 'react-redux';
import {
  fetchNdcsByRxcui,
  fetchFdaDataByNdcs,
  selectNdcList,
  selectOpenFdaResults,
  selectFdaDataStatus,
  selectFdaDataError,
  selectCurrentRxcui as selectCurrentRxcuiFromFdaSlice,
  selectTotalOpenFdaResults, // Import selector for total FDA results
} from '@/lib/store/slices/fdaDataSlice';
import { AppDispatch } from '@/lib/store';

// Helper to render an SPL section
const renderSplSection = (
  title: string,
  data: string[] | string | undefined,
  isLoading?: boolean
) => {
  if (isLoading) {
    return (
      <p className="text-sm text-gray-500 dark:text-gray-400">
        Loading {title.toLowerCase()}...
      </p>
    );
  }
  if (!data || (Array.isArray(data) && data.length === 0)) {
    return (
      <p className="text-sm text-gray-500 dark:text-gray-400">
        No {title.toLowerCase()} information available.
      </p>
    );
  }
  const contentString: string = Array.isArray(data) ? data.join('\n') : data;
  return (
    <section className="mb-8 p-6 bg-white dark:bg-slate-800 shadow-md rounded-lg">
      <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-200 mb-2">
        {title}
      </h2>
      <p className="text-sm text-gray-600 dark:text-gray-300 whitespace-pre-line">
        {contentString}
      </p>
    </section>
  );
};

interface DrugDetailsContentProps {
  rxcui: string;
  drugName?: string; // Optional, can be fetched or passed
}

function DrugDetailsContent({ rxcui, drugName }: DrugDetailsContentProps) {
  const dispatch = useDispatch<AppDispatch>();
  const ndcList = useSelector(selectNdcList);
  const openFdaResults = useSelector(selectOpenFdaResults);
  const totalOpenFdaResults = useSelector(selectTotalOpenFdaResults); // Use new selector
  const status = useSelector(selectFdaDataStatus);
  const error = useSelector(selectFdaDataError);
  const currentRxcuiInStore = useSelector(selectCurrentRxcuiFromFdaSlice);

  useEffect(() => {
    // Fetch NDCs if the rxcui has changed or if NDCs haven't been fetched yet for this rxcui
    if (
      rxcui &&
      (rxcui !== currentRxcuiInStore ||
        (status !== 'loading' &&
          status !== 'ndc_resolved' &&
          status !== 'fda_queried'))
    ) {
      console.log(
        `[DrugDetailsContent] RXCUI: ${rxcui}, dispatching fetchNdcsByRxcui.`
      );
      dispatch(fetchNdcsByRxcui(rxcui));
    }
  }, [dispatch, rxcui, currentRxcuiInStore, status]);

  // Effect to fetch FDA data once NDCs are resolved
  useEffect(() => {
    if (
      status === 'ndc_resolved' &&
      ndcList.length > 0 &&
      rxcui === currentRxcuiInStore
    ) {
      console.log(
        `[DrugDetailsContent] NDCs resolved for ${rxcui}, dispatching fetchFdaDataByNdcs with ${ndcList.length} NDCs.`
      );
      dispatch(fetchFdaDataByNdcs(ndcList));
    }
  }, [dispatch, status, ndcList, rxcui, currentRxcuiInStore]);

  const isLoadingNdcs =
    status === 'loading' &&
    currentRxcuiInStore === rxcui &&
    (!ndcList || ndcList.length === 0);
  const isLoadingFdaData =
    status === 'loading' &&
    currentRxcuiInStore === rxcui &&
    ndcList &&
    ndcList.length > 0;

  const currentDrugName =
    drugName ||
    (rxcui === currentRxcuiInStore ? `Drug ${rxcui}` : 'Selected Drug');
  const firstFdaResult =
    openFdaResults && openFdaResults.length > 0 ? openFdaResults[0] : null;

  if (isLoadingNdcs) {
    return (
      <div className="text-center p-8">
        Loading NDCs for {currentDrugName} (RxCUI: {rxcui})...
      </div>
    );
  }
  if (isLoadingFdaData && !firstFdaResult) {
    // Show loading only if no FDA data yet
    return (
      <div className="text-center p-8">
        Loading openFDA data for {currentDrugName} (RxCUI: {rxcui})...
      </div>
    );
  }

  if (error && rxcui === currentRxcuiInStore) {
    return <div className="text-center p-8 text-red-500">Error: {error}</div>;
  }

  return (
    <div className="container mx-auto p-4 md:p-8">
      <header className="mb-6 border-b pb-4">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100">
          openFDA Package Insert for: {currentDrugName} (RxCUI: {rxcui})
        </h1>
        <p className="text-md text-gray-600 dark:text-gray-400 mt-1">
          Status: {status}. NDCs: {ndcList.length}. FDA Labels Found:{' '}
          {totalOpenFdaResults} (Displaying {openFdaResults.length} currently).
        </p>
        {firstFdaResult && (
          <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
            Displaying data for Set ID: {firstFdaResult.set_id}, Version:{' '}
            {firstFdaResult.version}, Effective: {firstFdaResult.effective_time}
          </div>
        )}
      </header>

      <section className="mb-8 p-6 bg-white dark:bg-slate-800 shadow-md rounded-lg">
        <h2 className="text-xl font-semibold text-blue-600 dark:text-blue-400 mb-2">
          NDCs Found ({ndcList.length})
        </h2>
        {(status === 'ndc_resolved' ||
          status === 'fda_queried' ||
          (isLoadingFdaData && ndcList.length > 0)) &&
        rxcui === currentRxcuiInStore ? (
          ndcList.length > 0 ? (
            <ul className="list-disc pl-5 space-y-1 text-sm text-gray-700 dark:text-gray-300">
              {ndcList.map((ndc) => (
                <li key={ndc}>{ndc}</li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-600 dark:text-gray-400">
              No NDCs found for RxCUI: {rxcui}.
            </p>
          )
        ) : (
          <p className="text-gray-500 dark:text-gray-400">
            {isLoadingNdcs ? 'Fetching NDCs...' : 'NDCs will be listed here.'}
          </p>
        )}
      </section>

      {/* openFDA Data Sections (rendered if firstFdaResult exists) */}
      {firstFdaResult && (
        <>
          <section className="mb-8 p-6 bg-white dark:bg-slate-800 shadow-md rounded-lg">
            <h2 className="text-xl font-semibold text-green-600 dark:text-green-400 mb-2">
              openFDA Product Information (First Result)
            </h2>
            <pre className="bg-gray-100 dark:bg-slate-700 p-3 rounded text-xs overflow-x-auto">
              {JSON.stringify(firstFdaResult.openfda, null, 2)}
            </pre>
          </section>

          {renderSplSection(
            'Indications and Usage',
            firstFdaResult.indications_and_usage,
            isLoadingFdaData
          )}
          {renderSplSection(
            'Dosage and Administration',
            firstFdaResult.dosage_and_administration,
            isLoadingFdaData
          )}
          {renderSplSection(
            'Dosage Forms and Strengths',
            firstFdaResult.dosage_forms_and_strengths,
            isLoadingFdaData
          )}
          {renderSplSection(
            'Contraindications',
            firstFdaResult.contraindications,
            isLoadingFdaData
          )}
          {renderSplSection(
            'Warnings and Precautions',
            firstFdaResult.warnings_and_precautions || firstFdaResult.warnings,
            isLoadingFdaData
          )}
          {renderSplSection(
            'Adverse Reactions',
            firstFdaResult.adverse_reactions,
            isLoadingFdaData
          )}
          {renderSplSection(
            'Drug Interactions',
            firstFdaResult.drug_interactions,
            isLoadingFdaData
          )}
          {renderSplSection(
            'Use in Specific Populations',
            firstFdaResult.use_in_specific_populations,
            isLoadingFdaData
          )}
          {renderSplSection(
            'Description',
            firstFdaResult.description,
            isLoadingFdaData
          )}
          {renderSplSection(
            'Clinical Pharmacology',
            firstFdaResult.clinical_pharmacology,
            isLoadingFdaData
          )}
          {renderSplSection(
            'How Supplied',
            firstFdaResult.how_supplied,
            isLoadingFdaData
          )}
          {renderSplSection(
            'Storage and Handling',
            firstFdaResult.storage_and_handling,
            isLoadingFdaData
          )}
          {renderSplSection(
            'Patient Counseling Information',
            firstFdaResult.patient_counseling_information,
            isLoadingFdaData
          )}
          {renderSplSection(
            'Active Ingredient',
            firstFdaResult.active_ingredient,
            isLoadingFdaData
          )}
          {renderSplSection(
            'Inactive Ingredient',
            firstFdaResult.inactive_ingredient,
            isLoadingFdaData
          )}
        </>
      )}

      {/* Fallback if no FDA results but NDCs were resolved */}
      {status === 'fda_queried' &&
        !firstFdaResult &&
        rxcui === currentRxcuiInStore && (
          <section className="mb-8 p-6 bg-white dark:bg-slate-800 shadow-md rounded-lg">
            <h2 className="text-xl font-semibold text-orange-600 dark:text-orange-400 mb-2">
              No openFDA Data
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              No openFDA label data was found for the NDCs associated with RxCUI{' '}
              {rxcui}.
            </p>
          </section>
        )}
    </div>
  );
}

export default function DrugDetailsPage() {
  const params = useParams();
  const rxcui = params?.rxcui as string; // Assuming rxcui is always present in the path
  const searchParams =
    typeof window !== 'undefined'
      ? new URLSearchParams(window.location.search)
      : new URLSearchParams();
  const drugName = searchParams.get('name') || undefined;

  if (!rxcui) {
    // This case should ideally be handled by Next.js routing (e.g., notFound())
    // or a more robust check if rxcui can be undefined here.
    return <div className="text-center p-8">RxCUI not found in URL.</div>;
  }

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-slate-900">
      <Suspense
        fallback={
          <div className="text-center p-8 text-lg font-semibold">
            Loading drug details...
          </div>
        }
      >
        <DrugDetailsContent rxcui={rxcui} drugName={drugName} />
      </Suspense>
    </main>
  );
}
