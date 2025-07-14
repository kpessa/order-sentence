'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { AppDispatch } from '@/lib/store'; // Assuming AppDispatch is exported
import {
  selectFdaDataState,
  OpenFdaResult,
  selectDailyMedSplListForDrugName,
  selectDailyMedSplListStatus,
  selectDailyMedSplListError,
  selectCurrentDrugNameQuery,
  setPrioritizedSpls,
  selectPrioritizedSplsByDosageForm,
  DailyMedSplDetail, // Make sure this is exported from fdaDataSlice if not already
  selectDailyMedDetails,
  fetchSplDetailFromDailyMed,
} from '@/lib/store/slices/fdaDataSlice';
import {
  performSplPrioritization,
} from '@/lib/utils/splPrioritization';

export function OpenFdaResultsDisplay() {
  const dispatch = useDispatch<AppDispatch>();

  // Selectors for main OpenFDA search
  const {
    openFdaResults,
    status: openFdaStatus, // Renamed to avoid conflict
    error: openFdaError,
    currentEndpoint,
    retrievalTimestamp,
  } = useSelector(selectFdaDataState);

  const currentDrugNameQuery = useSelector(selectCurrentDrugNameQuery);

  // Selectors for DailyMed SPLs fetched by drug name
  // const dailyMedSplList = useSelector(selectDailyMedSplListForDrugName);
  const dailyMedSplListStatus = useSelector(selectDailyMedSplListStatus);
  // const dailyMedSplListError = useSelector(selectDailyMedSplListError);

  // Selector for prioritized SPLs
  const prioritizedSpls = useSelector(selectPrioritizedSplsByDosageForm);

  // NEW: Selector for individual DailyMed SPL details
  const dailyMedDetails = useSelector(selectDailyMedDetails);

  // const prioritizationDoneRef = useRef(false); // This might be repurposed or removed if prioritization becomes fully manual button driven
  const [expandedDosageForms, setExpandedDosageForms] = useState<
    Record<string, boolean>
  >({});

  // State for D&A text preview
  const [compiledDnaForPreview, setCompiledDnaForPreview] = useState<
    string | null
  >(null);
  const [showDnaPreviewModal, setShowDnaPreviewModal] =
    useState<boolean>(false);

  // Effect to trigger prioritization when all relevant dailyMedDetails are fetched
  useEffect(() => {
    // Only proceed if openFdaResults are present and some dailyMedDetails have been fetched
    if (openFdaResults.length > 0 && Object.keys(dailyMedDetails).length > 0) {
      const allSetIdsFromOpenFda = new Set<string>();
      openFdaResults.forEach((result) => {
        if (result.openfda?.spl_set_id) {
          result.openfda.spl_set_id.forEach((setId) =>
            allSetIdsFromOpenFda.add(setId)
          );
        } else if (result.set_id) {
          allSetIdsFromOpenFda.add(result.set_id);
        }
      });

      // Check if all SPLs targeted by openFdaResults have an entry in dailyMedDetails
      // (either succeeded, failed, or still loading is fine, just that an attempt was made)
      let allDetailsAttempted = true;
      for (const setId of Array.from(allSetIdsFromOpenFda)) {
        if (!dailyMedDetails[setId]) {
          allDetailsAttempted = false;
          break;
        }
      }

      if (allDetailsAttempted) {
        console.log(
          '[OpenFdaResultsDisplay useEffect dailyMedDetails] All targeted SPL details have at least an entry. Proceeding to check for XML content.'
        );
        const successfullyFetchedSplDetails: Record<
          string,
          { data?: DailyMedSplDetail; status: string; error?: string | null }
        > = {};
        let allFetchesDone = true; // Assume all are done initially

        for (const setId of Array.from(allSetIdsFromOpenFda)) {
          const detailEntry = dailyMedDetails[setId];
          if (detailEntry) {
            // Should always be true due to allDetailsAttempted check
            if (detailEntry.status === 'loading') {
              allFetchesDone = false; // If any are still loading, wait.
              console.log(
                `[OpenFdaResultsDisplay useEffect dailyMedDetails] Waiting for SPL detail fetch for SETID: ${setId}`
              );
              break;
            }
            if (
              detailEntry.status === 'succeeded' &&
              detailEntry.data?.xml_content
            ) {
              successfullyFetchedSplDetails[setId] = detailEntry;
            } else if (
              detailEntry.status === 'succeeded' &&
              !detailEntry.data?.xml_content
            ) {
              console.warn(
                `[OpenFdaResultsDisplay useEffect dailyMedDetails] SETID ${setId} fetched successfully but has no XML content.`
              );
              // Still include it so prioritization knows it was a valid attempt but had no XML
              successfullyFetchedSplDetails[setId] = detailEntry;
            } else if (detailEntry.status === 'failed') {
              console.error(
                `[OpenFdaResultsDisplay useEffect dailyMedDetails] Failed to fetch SPL detail for SETID ${setId}: ${detailEntry.error}`
              );
              successfullyFetchedSplDetails[setId] = detailEntry; // Include failed attempts too
            }
          }
        }

        if (
          allFetchesDone &&
          Object.keys(successfullyFetchedSplDetails).length > 0
        ) {
          console.log(
            '[OpenFdaResultsDisplay useEffect dailyMedDetails] All XML fetches complete. Performing prioritization on (summarized input count):',
            Object.keys(successfullyFetchedSplDetails).length
          );
          console.log(
            '[OpenFdaResultsDisplay useEffect dailyMedDetails] Successfully fetched SPL details for prioritization (keys):',
            Object.keys(successfullyFetchedSplDetails)
          );

          // Log summary of what's being passed to performSplPrioritization
          const summaryForLog = Object.fromEntries(
            Object.entries(successfullyFetchedSplDetails).map(([id, entry]) => [
              id,
              {
                status: entry.status,
                has_xml: !!entry.data?.xml_content,
                xml_length: entry.data?.xml_content?.length ?? 0,
                error: entry.error,
              },
            ])
          );
          console.log(
            '[OpenFdaResultsDisplay useEffect dailyMedDetails] Data for performSplPrioritization (summary):',
            summaryForLog
          );

          performSplPrioritization(successfullyFetchedSplDetails)
            .then((prioritized) => {
              dispatch(setPrioritizedSpls(prioritized));
              console.log(
                '[OpenFdaResultsDisplay useEffect dailyMedDetails] Dispatched setPrioritizedSpls with (summarized output count):',
                Object.keys(prioritized).length
              );
            })
            .catch((error) => {
              console.error(
                '[OpenFdaResultsDisplay useEffect dailyMedDetails] Error during performSplPrioritization:',
                error
              );
              // Optionally dispatch an error state for prioritization itself
            });
        } else if (allFetchesDone) {
          console.log(
            '[OpenFdaResultsDisplay useEffect dailyMedDetails] All XML fetches done, but no SPLs with XML content were successfully fetched to prioritize.'
          );
          dispatch(setPrioritizedSpls({})); // Clear any previous prioritized SPLs
        }
      } else {
        console.log(
          '[OpenFdaResultsDisplay useEffect dailyMedDetails] Not all targeted SPL details have an entry yet. Waiting...'
        );
      }
    }
  }, [dailyMedDetails, openFdaResults, dispatch]); // Added openFdaResults and dispatch

  // Effect for logging prioritized SPLs and compiling D&A text for preview
  useEffect(() => {
    if (prioritizedSpls && Object.keys(prioritizedSpls).length > 0) {
      console.log(
        '[OpenFdaResultsDisplay] Prioritized SPLs updated (summarized with D&A info):',
        Object.fromEntries(
          Object.entries(prioritizedSpls).map(([key, spl]) => [
            key,
            {
              spl_set_id: spl.spl_set_id,
              xml_content_summary: spl.xml_content
                ? `XML (length: ${spl.xml_content.length})`
                : 'No XML Content',
              dosageAndAdministrationFound: spl.dosageAndAdministrationText
                ? `Yes (length: ${spl.dosageAndAdministrationText.length})`
                : 'No',
            },
          ])
        )
      );

      let compiledDnaText = '';
      let dnaFoundCount = 0;

      const openFdaResultsMap = new Map<string, OpenFdaResult>();
      openFdaResults.forEach((result) => {
        if (result.openfda?.spl_set_id) {
          result.openfda.spl_set_id.forEach((setId) =>
            openFdaResultsMap.set(setId, result)
          );
        } else if (result.set_id) {
          openFdaResultsMap.set(result.set_id, result);
        }
      });

      Object.entries(prioritizedSpls).forEach(([dosageForm, spl]) => {
        if (spl.dosageAndAdministrationText) {
          dnaFoundCount++;
          const associatedFdaResult = openFdaResultsMap.get(spl.spl_set_id);
          const brandName =
            associatedFdaResult?.openfda?.brand_name?.join(', ') ||
            associatedFdaResult?.brand_name ||
            'Unknown Brand';
          const genericName =
            associatedFdaResult?.openfda?.generic_name?.join(', ') ||
            associatedFdaResult?.generic_name ||
            'Unknown Generic';

          compiledDnaText += `--- DRUG: ${brandName} (Generic: ${genericName}) ---\n`;
          compiledDnaText += `--- DOSAGE FORM: ${dosageForm} ---\n`;
          compiledDnaText += `--- SPL SETID: ${spl.spl_set_id} ---\n`;
          compiledDnaText += `${spl.dosageAndAdministrationText}\n\n`;
        }
      });

      console.log(
        `[OpenFdaResultsDisplay] Dosage & Administration Text found in ${dnaFoundCount} prioritized SPL(s).`
      );
      if (dnaFoundCount > 0) {
        console.log(
          '[OpenFdaResultsDisplay] Compiled Dosage & Administration Text (with drug names & forms):\n',
          compiledDnaText
        );
        setCompiledDnaForPreview(compiledDnaText); // Set state for modal
      } else {
        setCompiledDnaForPreview(null); // Clear if no text found
      }
    } else {
      setCompiledDnaForPreview(null); // Clear if no prioritized SPLs
    }
  }, [prioritizedSpls, openFdaResults]);

  // Moved logging effect - ensure it only logs relevant data based on current state if needed
  useEffect(() => {
    console.log(
      `[OpenFdaResultsDisplay RENDER] Status: ${openFdaStatus}, openFdaResults count: ${openFdaResults.length}`
    );
    console.log(
      '[OpenFdaResultsDisplay RENDER] prioritizedSpls VALUE (summarized with D&A):',
      prioritizedSpls && Object.keys(prioritizedSpls).length > 0
        ? Object.fromEntries(
            Object.entries(prioritizedSpls).map(([key, spl]) => [
              key,
              {
                spl_set_id: spl.spl_set_id,
                xml_content_summary: spl.xml_content
                  ? `XML (length: ${spl.xml_content.length})`
                  : 'No XML Content',
                dosageAndAdministrationFound: spl.dosageAndAdministrationText
                  ? `Yes (length: ${spl.dosageAndAdministrationText.length})`
                  : 'No',
              },
            ])
          )
        : 'No prioritized SPLs'
    );
    console.log(
      '[OpenFdaResultsDisplay RENDER] dailyMedDetails count:',
      Object.keys(dailyMedDetails).length
    );

    // Log SPL counts
    const initialFetchCount = Object.keys(dailyMedDetails).length;
    const successfullyParsedCount = Object.values(dailyMedDetails).filter(
      (d) => d.status === 'succeeded' && d.data?.xml_content
    ).length;
    // To get D&A found count before prioritization, we'd need to have run parsing already.
    // For now, focusing on counts related to the input of prioritization and its output.
    const prioritizedCount = prioritizedSpls
      ? Object.keys(prioritizedSpls).length
      : 0;
    let prioritizedWithDnaCount = 0;
    if (prioritizedSpls) {
      prioritizedWithDnaCount = Object.values(prioritizedSpls).filter(
        (p) => p.dosageAndAdministrationText
      ).length;
    }

    console.log(
      `[OpenFdaResultsDisplay RENDER SPL Counts] Initial SETIDs for potential prioritization: ${initialFetchCount}, Successfully fetched with XML: ${successfullyParsedCount}, Prioritized SPLs: ${prioritizedCount}, Prioritized with D&A Text: ${prioritizedWithDnaCount}`
    );
  }, [openFdaStatus, openFdaResults.length, prioritizedSpls, dailyMedDetails]);

  // Helper function to group results by dosage form
  const groupResultsByDosageForm = (results: OpenFdaResult[]) => {
    return results.reduce(
      (acc, result) => {
        const dosageForm = result.dosage_form || 'Unknown Dosage Form';
        if (!acc[dosageForm]) {
          acc[dosageForm] = [];
        }
        acc[dosageForm].push(result);
        return acc;
      },
      {} as Record<string, OpenFdaResult[]>
    );
  };

  // --- Conditional Rendering ---

  if (openFdaStatus === 'loading') {
    return (
      <div className="mt-6 p-4 border rounded-lg shadow bg-gray-50">
        <h3 className="text-lg font-semibold text-gray-700 mb-2">
          Fetching OpenFDA Approved Products...
        </h3>
        <p className="text-sm text-gray-600">
          Querying for: {currentDrugNameQuery || currentEndpoint || 'N/A'}
        </p>
        {/* Basic pulse animation placeholder */}
        <div className="animate-pulse mt-3 flex space-x-4">
          <div className="flex-1 space-y-6 py-1">
            <div className="h-2 bg-slate-200 rounded"></div>
            <div className="space-y-3">
              <div className="h-2 bg-slate-200 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (openFdaStatus === 'failed') {
    return (
      <div className="mt-6 p-4 border border-red-300 rounded-lg shadow bg-red-50">
        <h3 className="text-lg font-semibold text-red-700 mb-2">
          Error Fetching OpenFDA Data
        </h3>
        <p className="text-sm text-red-600">
          Details: {openFdaError || 'Unknown error'}
        </p>
        <p className="text-xs text-gray-500 mt-1">
          Queried: {currentDrugNameQuery || currentEndpoint || 'N/A'}
        </p>
      </div>
    );
  }

  if (openFdaStatus === 'fda_queried') {
    if (openFdaResults.length === 0) {
      return (
        <div className="mt-6 p-4 border rounded-lg shadow bg-yellow-50">
          <h3 className="text-lg font-semibold text-yellow-700 mb-2">
            No Approved Products Found on OpenFDA
          </h3>
          <p className="text-sm text-yellow-600">
            No products matching the criteria (NDA, ANDA, BLA) were found for &apos;
            {currentDrugNameQuery}&apos;.
          </p>
        </div>
      );
    }

    const shouldShowPrioritizedSpls =
      prioritizedSpls && Object.keys(prioritizedSpls).length > 0;

    // Effect for logging render status - REMOVED FROM HERE
    const groupedResults = groupResultsByDosageForm(openFdaResults);

    const toggleDosageFormExpansion = (dosageForm: string) => {
      setExpandedDosageForms((prev) => ({
        ...prev,
        [dosageForm]: !prev[dosageForm],
      }));
    };

    const handlePrioritizeSpls = async () => {
      // This function will now primarily initiate the fetching of SPL XMLs.
      // The useEffect hook listening to dailyMedDetails will handle the actual prioritization.

      console.log(
        '[OpenFdaResultsDisplay handlePrioritizeSpls] Initiating SPL XML fetching.'
      );
      dispatch(setPrioritizedSpls({})); // Clear previous results immediately
      // setCompiledDnaForPreview(null); // Clear preview as well
      // prioritizationDoneRef.current = false;

      const setIdsToFetch = new Set<string>();
      if (openFdaResults && openFdaResults.length > 0) {
        openFdaResults.forEach((result) => {
          if (result.openfda?.spl_set_id) {
            result.openfda.spl_set_id.forEach((setId) => {
              // Only fetch if not already fetched, loading, or failed recently (to avoid re-spamming on error)
              if (
                !dailyMedDetails[setId] ||
                (dailyMedDetails[setId]?.status !== 'succeeded' &&
                  dailyMedDetails[setId]?.status !== 'loading')
              ) {
                setIdsToFetch.add(setId);
              }
            });
          } else if (result.set_id) {
            // Fallback for results directly having set_id
            if (
              !dailyMedDetails[result.set_id] ||
              (dailyMedDetails[result.set_id]?.status !== 'succeeded' &&
                dailyMedDetails[result.set_id]?.status !== 'loading')
            ) {
              setIdsToFetch.add(result.set_id);
            }
          }
        });

        if (
          setIdsToFetch.size === 0 &&
          Object.keys(dailyMedDetails).length > 0
        ) {
          console.log(
            '[OpenFdaResultsDisplay handlePrioritizeSpls] All necessary SPL XMLs seem to be already fetched or loading. Prioritization should occur via useEffect if data is valid.'
          );
          // Trigger the useEffect by potentially re-evaluating conditions, though it should run if dailyMedDetails is populated.
          // Forcing re-evaluation if needed is tricky; direct call to a refined prioritization trigger might be an option for future.
          return; // Early exit if nothing new to fetch
        }

        console.log(
          `[OpenFdaResultsDisplay handlePrioritizeSpls] Identified ${setIdsToFetch.size} unique SET IDs to fetch XML for.`
        );
        setIdsToFetch.forEach((setId) => {
          console.log(
            `[OpenFdaResultsDisplay handlePrioritizeSpls] Dispatching fetchSplDetailFromDailyMed for SETID: ${setId}`
          );
          dispatch(fetchSplDetailFromDailyMed(setId));
        });
      } else {
        console.warn(
          '[OpenFdaResultsDisplay handlePrioritizeSpls] No OpenFDA results available to determine which SPLs to fetch and prioritize.'
        );
      }
    };

    return (
      <div className="mt-6 p-4 border rounded-lg shadow bg-gray-50">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-semibold text-gray-800">
            OpenFDA Results for &apos;{currentDrugNameQuery}&apos;
          </h3>
          <button
            onClick={handlePrioritizeSpls}
            disabled={
              dailyMedSplListStatus === 'loading' ||
              Object.keys(dailyMedDetails).length === 0
            }
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-300 transition-colors duration-150 text-sm"
          >
            {dailyMedSplListStatus === 'loading'
              ? 'Fetching SPLs...'
              : 'Prioritize SPLs'}
          </button>
        </div>

        {/* Timestamp of Data Retrieval */}
        {retrievalTimestamp && (
          <p className="text-xs text-gray-500 mb-3">
            Data fetched from OpenFDA on:{' '}
            {new Date(retrievalTimestamp).toLocaleString()}
          </p>
        )}

        {/* Button to show D&A Preview Modal */}
        {compiledDnaForPreview && (
          <div className="my-4">
            <button
              onClick={() => setShowDnaPreviewModal(true)}
              className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors duration-150 text-sm"
            >
              Preview Compiled D&A Text for Gemini
            </button>
          </div>
        )}

        {/* Prioritized SPLs Section */}
        {shouldShowPrioritizedSpls ? (
          <section className="my-6 p-4 border rounded-lg bg-green-50">
            <h3 className="text-xl font-semibold text-green-700 mb-3">
              Prioritized DailyMed Labels (XML Fetched)
            </h3>
            {Object.entries(prioritizedSpls).map(([dosageForm, splDetail]) => (
              <div
                key={dosageForm}
                className="mb-4 p-3 border rounded-md bg-white shadow"
              >
                <h4 className="text-md font-semibold text-gray-800">
                  {dosageForm} (Note: Prioritization logic needs update for XML
                  parsing)
                </h4>
                {splDetail && splDetail.spl_set_id ? (
                  <>
                    <p className="text-sm text-gray-700">
                      <strong>SET ID:</strong> {splDetail.spl_set_id}
                    </p>
                    {splDetail.xml_content ? (
                      <p className="text-sm text-gray-700">
                        <strong>XML Content Fetched:</strong> Yes (Length:{' '}
                        {splDetail.xml_content.length})
                      </p>
                    ) : (
                      <p className="text-sm text-red-500">
                        <strong>XML Content Fetched:</strong> No
                      </p>
                    )}
                    <a
                      href={`https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=${splDetail.spl_set_id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-600 hover:underline mt-1 inline-block"
                    >
                      View on DailyMed (CFM Page)
                    </a>
                  </>
                ) : (
                  <p className="text-sm text-gray-500">
                    No SPL data available or prioritized for this dosage form.
                  </p>
                )}
              </div>
            ))}
          </section>
        ) : (
          <p className="text-sm text-gray-600">
            No prioritized SPLs to display. Click &quot;Prioritize SPLs&quot; after
            fetching data.
          </p>
        )}

        {Object.entries(groupedResults).map(([dosageForm, resultsInGroup]) => {
          const isExpanded = expandedDosageForms[dosageForm];
          const itemsToShow = isExpanded ? resultsInGroup.length : 0; // Initially show 0 items
          // const hasMore = resultsInGroup.length > 3; // No longer needed in this way

          return (
            <div key={dosageForm} className="mb-8">
              <div className="flex justify-between items-center mb-3 sticky top-0 bg-white py-2 z-10 border-b">
                <h3 className="text-xl font-semibold text-gray-700">
                  {dosageForm} ({resultsInGroup.length})
                </h3>
                {resultsInGroup.length > 0 && ( // Show button if there are items
                  <button
                    onClick={() => toggleDosageFormExpansion(dosageForm)}
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    {isExpanded
                      ? 'Collapse'
                      : `Show (${resultsInGroup.length} items)`}
                  </button>
                )}
              </div>
              {isExpanded && resultsInGroup.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {resultsInGroup.slice(0, itemsToShow).map(
                    (
                      result,
                      index // slice is still fine, itemsToShow is now 0 or full length
                    ) => (
                      <div
                        key={
                          result.id || `openfda-result-${dosageForm}-${index}`
                        }
                        className="p-4 border rounded-lg shadow-md bg-slate-50 hover:shadow-lg transition-shadow duration-200 ease-in-out flex flex-col justify-between"
                      >
                        <div>
                          <h4 className="text-md font-semibold text-gray-800 mb-1">
                            {result.brand_name ||
                              result.openfda?.brand_name?.[0] ||
                              'N/A'}
                            {result.dosage_form ? (
                              <span className="text-xs text-gray-500">
                                {' '}
                                ({result.dosage_form})
                              </span>
                            ) : (
                              ''
                            )}
                          </h4>
                          <p className="text-xs text-gray-600 mb-0.5">
                            <strong>Generic:</strong>{' '}
                            {result.generic_name ||
                              result.openfda?.generic_name?.[0] ||
                              'N/A'}
                          </p>
                          {/* Display dosage_form and product_type more explicitly */}
                          {result.dosage_form && (
                            <p className="text-xs text-gray-600 mb-0.5">
                              <strong>Dosage Form (transformed):</strong>{' '}
                              {result.dosage_form}
                            </p>
                          )}
                          {result.product_type && (
                            <p className="text-xs text-gray-600 mb-0.5">
                              <strong>Product Type (root):</strong>{' '}
                              {result.product_type}
                            </p>
                          )}
                          {result.openfda?.product_type &&
                            result.openfda.product_type.length > 0 && (
                              <p className="text-xs text-gray-600 mb-0.5">
                                <strong>Product Type (openfda):</strong>{' '}
                                {result.openfda.product_type.join(', ')}
                              </p>
                            )}
                          <p className="text-xs text-gray-600 mb-0.5">
                            <strong>Manufacturer:</strong>{' '}
                            {result.openfda?.manufacturer_name?.join(', ') ||
                              'N/A'}
                          </p>
                          <p className="text-xs text-gray-600">
                            <strong>Application No:</strong>{' '}
                            {result.application_number || 'N/A'}
                            {result.openfda?.application_type
                              ? ` (${result.openfda.application_type.join(', ')})`
                              : ''}
                          </p>
                          {result.openfda?.spl_set_id &&
                            result.openfda.spl_set_id.length > 0 && (
                              <p className="text-xs text-gray-600 mt-1">
                                <strong>SPL Set ID(s):</strong>{' '}
                                {result.openfda.spl_set_id.join(', ')}
                              </p>
                            )}
                        </div>

                        {/* Manual Fetch for DailyMed Details */}
                        {result.openfda?.spl_set_id &&
                          result.openfda.spl_set_id.length > 0 && (
                            <div className="mt-3 pt-3 border-t border-gray-200">
                              {result.openfda.spl_set_id.map((setId) => {
                                const detailEntry = dailyMedDetails[setId];
                                const isLoadingDetail =
                                  detailEntry?.status === 'loading';
                                const isFetchFailed =
                                  detailEntry?.status === 'failed';
                                const fetchedDetail =
                                  detailEntry?.status === 'succeeded'
                                    ? detailEntry.data
                                    : null;

                                return (
                                  <div key={setId} className="mb-2 last:mb-0">
                                    <button
                                      onClick={() =>
                                        dispatch(
                                          fetchSplDetailFromDailyMed(setId)
                                        )
                                      }
                                      disabled={
                                        isLoadingDetail || !!fetchedDetail
                                      }
                                      className={`text-xs px-2 py-1 rounded shadow-sm transition-colors 
                                    ${
                                      isLoadingDetail
                                        ? 'bg-yellow-400 cursor-wait'
                                        : fetchedDetail
                                          ? 'bg-green-200 text-green-800 cursor-not-allowed'
                                          : isFetchFailed
                                            ? 'bg-red-400 hover:bg-red-500 text-white'
                                            : 'bg-blue-500 hover:bg-blue-600 text-white'
                                    }`}
                                    >
                                      {isLoadingDetail
                                        ? 'Fetching...'
                                        : fetchedDetail
                                          ? `Fetched: ${setId.substring(0, 8)}...`
                                          : isFetchFailed
                                            ? `Retry: ${setId.substring(0, 8)}...`
                                            : `Fetch DailyMed: ${setId.substring(0, 8)}...`}
                                    </button>
                                    {isFetchFailed &&
                                      detailEntry?.error &&
                                      (() => {
                                        const errorValue = detailEntry.error;
                                        let displayMessage = 'Unknown error';
                                        if (typeof errorValue === 'string') {
                                          displayMessage = errorValue;
                                        } else if (
                                          errorValue &&
                                          typeof errorValue === 'object' &&
                                          'error' in errorValue &&
                                          typeof (errorValue as any).error ===
                                            'string'
                                        ) {
                                          // Specifically handles if errorValue is { splSetId: string, error: string }
                                          displayMessage = (errorValue as any)
                                            .error;
                                        } else if (
                                          errorValue &&
                                          typeof errorValue === 'object' &&
                                          'message' in errorValue &&
                                          typeof (errorValue as any).message ===
                                            'string'
                                        ) {
                                          // Handles if errorValue is like a SerializedError { message: string }
                                          displayMessage = (errorValue as any)
                                            .message;
                                        }
                                        return (
                                          <p className="text-xs text-red-500 mt-1">
                                            Error: {displayMessage}
                                          </p>
                                        );
                                      })()}
                                    {fetchedDetail && (
                                      <div className="mt-1 p-2 bg-gray-100 rounded text-xs">
                                        <p>
                                          <strong>SET ID:</strong>{' '}
                                          {fetchedDetail.spl_set_id}
                                        </p>
                                        {fetchedDetail.xml_content ? (
                                          <p>
                                            <strong>XML Available:</strong> Yes
                                            (Length:{' '}
                                            {fetchedDetail.xml_content.length})
                                          </p>
                                        ) : (
                                          <p>
                                            <strong>XML Available:</strong> No
                                          </p>
                                        )}
                                        <a
                                          href={`https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=${fetchedDetail.spl_set_id}`}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="text-blue-600 hover:underline"
                                        >
                                          View on DailyMed (CFM)
                                        </a>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                      </div>
                    )
                  )}
                </div>
              )}
            </div>
          );
        })}

        {/* Section for Prioritized SPLs - this can remain, but its trigger logic has changed */}
        {Object.keys(dailyMedDetails).length > 0 &&
          prioritizedSpls && ( // Show if any fetches were attempted
            // Show this section once DailyMed fetch is done, even if no SPLs were found/prioritized
            <div id="prioritized-spls-section" className="mt-6 pt-4 border-t">
              <h3 className="text-xl font-semibold text-green-700 mb-3">
                Prioritized Package Insert per Dosage Form:
              </h3>
              {shouldShowPrioritizedSpls ? (
                <pre className="bg-gray-100 p-3 rounded text-xs overflow-x-auto">
                  {JSON.stringify(
                    Object.fromEntries(
                      Object.entries(prioritizedSpls).map(([key, spl]) => [
                        key,
                        {
                          spl_set_id: spl.spl_set_id,
                          published_date: spl.published_date, // Already processed in splPrioritization to be a string or object
                          dosage_forms: spl.dosage_forms,
                          xml_content_summary: spl.xml_content
                            ? `XML (length: ${spl.xml_content.length})`
                            : 'No XML Content',
                          dosageAndAdministrationFound:
                            spl.dosageAndAdministrationText
                              ? `Yes (length: ${spl.dosageAndAdministrationText.length})`
                              : 'No',
                          // For UI display, only show D&A summary. Full text logged to console.
                          // dosageAndAdministrationText: spl.dosageAndAdministrationText ? spl.dosageAndAdministrationText.substring(0, 100) + '...' : 'N/A',
                          original_spl_document_link: `https://dailymed.nlm.nih.gov/dailymed/documentData.cfm?setid=${spl.spl_set_id}`,
                        },
                      ])
                    ),
                    null,
                    2
                  )}
                </pre>
              ) : (
                <p className="text-sm text-gray-500">
                  {Object.values(dailyMedDetails).some(
                    (d) => d.status === 'succeeded' && d.data
                  )
                    ? 'No SPLs could be prioritized based on available data (e.g., missing dosage forms or publication dates).'
                    : 'Fetch some DailyMed SPL details to see prioritization. Click a "Fetch DailyMed" button on a product card above.'}
                </p>
              )}
            </div>
          )}

        {/* D&A Preview Modal */}
        {showDnaPreviewModal && compiledDnaForPreview && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white p-6 rounded-lg shadow-xl max-w-3xl w-full max-h-[80vh] flex flex-col">
              <h4 className="text-xl font-semibold mb-4">
                Compiled Dosage & Administration Text
              </h4>
              <div className="overflow-y-auto flex-grow mb-4">
                <pre className="text-xs whitespace-pre-wrap bg-gray-50 p-3 rounded">
                  {compiledDnaForPreview}
                </pre>
              </div>
              <button
                onClick={() => setShowDnaPreviewModal(false)}
                className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 self-end"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Default: render nothing or an idle message if not loading, not failed, and not fda_queried
  return (
    <div className="mt-6 p-4">
      <p className="text-sm text-gray-500">
        Enter a drug name to begin the search.
      </p>
    </div>
  );
}
