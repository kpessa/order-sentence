import { useSelector, useDispatch } from 'react-redux';
import { useState, useRef, useEffect } from 'react';
import { AppDispatch, RootState } from '@/lib/store';
import {
  selectFdaDataState,
  fetchOpenFdaDataByDrugName,
  setPrioritizedSpls,
  selectCurrentDrugNameQuery,
} from '@/lib/store/slices/fdaDataSlice';

export function useOpenFdaResults() {
  const dispatch = useDispatch<AppDispatch>();
  const openFdaDataState = useSelector((state: RootState) => state.fdaData);
  const openFdaResults = openFdaDataState?.openFdaResults;
  const openFdaStatus = openFdaDataState?.status || 'idle';
  const openFdaError = openFdaDataState?.error;
  const retrievalTimestamp = openFdaDataState?.retrievalTimestamp;
  const currentDrugNameQuery = useSelector(selectCurrentDrugNameQuery);
  const [expandedDosageForms, setExpandedDosageForms] = useState<
    Record<string, boolean>
  >({});
  const initialFetchDoneRef = useRef<Record<string, boolean>>({});

  useEffect(() => {
    if (
      currentDrugNameQuery &&
      !initialFetchDoneRef.current[currentDrugNameQuery]
    ) {
      dispatch(fetchOpenFdaDataByDrugName(currentDrugNameQuery));
      initialFetchDoneRef.current[currentDrugNameQuery] = true;
      dispatch(setPrioritizedSpls({}));
      setExpandedDosageForms({});
    }
  }, [currentDrugNameQuery, dispatch]);

  const groupResultsByDosageForm = (results: any[]) => {
    if (!results) return {};
    return results.reduce(
      (acc, result) => {
        const dosageForm = result.dosage_form || 'Unknown Dosage Form';
        if (!acc[dosageForm]) {
          acc[dosageForm] = [];
        }
        acc[dosageForm].push(result);
        return acc;
      },
      {} as Record<string, any[]>
    );
  };

  const toggleDosageFormExpansion = (dosageForm: string) => {
    setExpandedDosageForms((prev) => ({
      ...prev,
      [dosageForm]: !prev[dosageForm],
    }));
  };

  return {
    openFdaResults,
    openFdaStatus,
    openFdaError,
    retrievalTimestamp,
    currentDrugNameQuery,
    expandedDosageForms,
    setExpandedDosageForms,
    groupResultsByDosageForm,
    toggleDosageFormExpansion,
    dispatch,
  };
}
