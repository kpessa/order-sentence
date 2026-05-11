import { useState, useEffect, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { AppDispatch, RootState } from '@/lib/store';
import {
  selectDailyMedSplListForDrugName,
  selectDailyMedSplListStatus,
  selectDailyMedSplListError,
  selectCurrentDrugNameQuery,
  setPrioritizedSpls,
  fetchSplDetailFromDailyMed,
  DailyMedSplDetail,
} from '@/lib/store/slices/fdaDataSlice';
import {
  performSplPrioritization,
  ParsedSplProductData,
} from '@/lib/utils/splPrioritization';
import {
  performEnhancedSplPrioritization,
  type PrioritizationResult
} from '@/lib/utils/enhancedSplPrioritization';

export function useSplPrioritization(
  openFdaResults: any,
  openFdaStatus: string
) {
  const dispatch = useDispatch<AppDispatch>();
  const dailyMedDetails: Record<
    string,
    {
      data?: DailyMedSplDetail;
      status: 'idle' | 'loading' | 'succeeded' | 'failed';
      error?: string | null;
    }
  > = useSelector((state: RootState) => state.fdaData?.dailyMedDetails || {});
  const [setIdsToPrioritize, setSetIdsToPrioritize] = useState<Set<string>>(
    new Set<string>()
  );
  const [compiledDnaForPreview, setCompiledDnaForPreview] = useState<
    string | null
  >(null);
  const [showDnaPreviewModal, setShowDnaPreviewModal] = useState(false);
  const [isLoadingPrioritization, setIsLoadingPrioritization] = useState(false);
  const [enhancedPrioritizationResult, setEnhancedPrioritizationResult] = useState<PrioritizationResult | null>(null);
  const prioritizedSpls = useSelector(
    (state: RootState) =>
      state.fdaData?.prioritizedSplsByDosageForm ||
      ({} as Record<string, ParsedSplProductData>)
  );

  useEffect(() => {
    if (
      openFdaStatus === 'succeeded' &&
      openFdaResults &&
      openFdaResults.length > 0
    ) {
      const allSetIdsFromOpenFda = new Set<string>();
      openFdaResults.forEach((result: any) => {
        if (result.openfda?.spl_set_id) {
          result.openfda.spl_set_id.forEach((setId: string) =>
            allSetIdsFromOpenFda.add(setId)
          );
        } else if (result.set_id) {
          allSetIdsFromOpenFda.add(result.set_id);
        }
      });
      setSetIdsToPrioritize((prevSet) => {
        if (
          prevSet.size === allSetIdsFromOpenFda.size &&
          Array.from(prevSet).every((id) => allSetIdsFromOpenFda.has(id))
        ) {
          return prevSet;
        }
        return allSetIdsFromOpenFda;
      });
      allSetIdsFromOpenFda.forEach((setId) => {
        const detailEntry = dailyMedDetails[setId];
        if (
          !detailEntry ||
          (detailEntry.status !== 'succeeded' &&
            detailEntry.status !== 'loading')
        ) {
          dispatch(fetchSplDetailFromDailyMed(setId));
        }
      });
    }
    if (openFdaStatus === 'succeeded' && setIdsToPrioritize.size > 0) {
      const allFetchesAttempted = Array.from(setIdsToPrioritize).every(
        (setId) => dailyMedDetails[setId]
      );
      if (allFetchesAttempted) {
        const anyLoading = Array.from(setIdsToPrioritize).some(
          (setId) => dailyMedDetails[setId]?.status === 'loading'
        );
        if (!anyLoading) {
          setIsLoadingPrioritization(true);
          const successfullyFetchedSplDetails: Record<
            string,
            {
              data?: DailyMedSplDetail;
              status: 'idle' | 'loading' | 'succeeded' | 'failed';
              error?: string | null;
            }
          > = {};
          Array.from(setIdsToPrioritize).forEach((setId) => {
            if (dailyMedDetails[setId]) {
              successfullyFetchedSplDetails[setId] = dailyMedDetails[setId]!;
            }
          });
          if (Object.keys(successfullyFetchedSplDetails).length > 0) {
            // Run both legacy and enhanced prioritization
            Promise.all([
              performSplPrioritization(successfullyFetchedSplDetails),
              performEnhancedSplPrioritization(successfullyFetchedSplDetails)
            ])
              .then(([legacyResult, enhancedResult]) => {
                dispatch(setPrioritizedSpls(legacyResult));
                setEnhancedPrioritizationResult(enhancedResult);
              })
              .catch((error) => {
                console.error('[useSplPrioritization] Error in prioritization:', error);
              })
              .finally(() => {
                setIsLoadingPrioritization(false);
              });
          } else {
            dispatch(setPrioritizedSpls({}));
            setEnhancedPrioritizationResult(null);
            setIsLoadingPrioritization(false);
          }
        }
      }
    }
  }, [
    openFdaStatus,
    openFdaResults,
    dailyMedDetails,
    dispatch,
    setIdsToPrioritize,
  ]);

  useEffect(() => {
    if (prioritizedSpls && Object.keys(prioritizedSpls).length > 0) {
      let dnaFoundCount = 0;
      let compiledDnaText = '';
      const openFdaResultsMap = new Map<string, any>();
      if (openFdaResults) {
        openFdaResults.forEach((result: any) => {
          const ids =
            result.openfda?.spl_set_id ||
            (result.set_id ? [result.set_id] : []);
          ids.forEach((id: string) => openFdaResultsMap.set(id, result));
        });
      }
      Object.entries(prioritizedSpls).forEach(
        ([dosageForm, spl]: [string, ParsedSplProductData]) => {
          if (spl.dosageAndAdministrationText) {
            dnaFoundCount++;
            const associatedFdaResult = openFdaResultsMap.get(spl.spl_set_id);
            const brandName =
              associatedFdaResult?.openfda?.brand_name?.join(', ') ||
              (associatedFdaResult as any)?.brand_name ||
              'Unknown Brand';
            const genericName =
              associatedFdaResult?.openfda?.generic_name?.join(', ') ||
              (associatedFdaResult as any)?.generic_name ||
              'Unknown Generic';
            compiledDnaText += `--- DRUG: ${brandName} (Generic: ${genericName}) ---\n`;
            compiledDnaText += `--- DOSAGE FORM: ${dosageForm} ---\n`;
            compiledDnaText += `--- SPL SETID: ${spl.spl_set_id} ---\n`;
            compiledDnaText += `${spl.dosageAndAdministrationText}\n\n`;
          }
        }
      );
      setCompiledDnaForPreview(dnaFoundCount > 0 ? compiledDnaText : null);
    } else {
      setCompiledDnaForPreview(null);
    }
  }, [prioritizedSpls, openFdaResults]);

  const handleManualFetchAndPrioritize = useCallback(() => {
    setIsLoadingPrioritization(true);
    const idsToFetch: string[] = [];
    setIdsToPrioritize.forEach((setId) => {
      const detailEntry = dailyMedDetails[setId];
      if (
        !detailEntry ||
        (detailEntry.status !== 'succeeded' &&
          detailEntry.status !== 'loading' &&
          detailEntry.status !== 'failed')
      ) {
        idsToFetch.push(setId);
      } else if (detailEntry && detailEntry.status === 'failed') {
        idsToFetch.push(setId);
      }
    });
    if (idsToFetch.length > 0) {
      const fetchPromises = idsToFetch.map((id) =>
        dispatch(fetchSplDetailFromDailyMed(id))
      );
      Promise.all(fetchPromises).finally(() => {});
    } else {
      setIsLoadingPrioritization(false);
    }
  }, [dispatch, dailyMedDetails, setIdsToPrioritize]);

  return {
    setIdsToPrioritize,
    compiledDnaForPreview,
    showDnaPreviewModal,
    setShowDnaPreviewModal,
    isLoadingPrioritization,
    prioritizedSpls,
    enhancedPrioritizationResult,
    dailyMedDetails,
    handleManualFetchAndPrioritize,
  };
}
