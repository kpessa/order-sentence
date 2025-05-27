'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { SelectedDrugInfo } from '@/lib/types';
import { useDispatch } from 'react-redux';
import { AppDispatch } from '@/lib/store';
import { fetchOpenFdaDataByDrugName } from '@/lib/store/slices/fdaDataSlice';
import { CustomButton } from '@/components/atoms/CustomButton/CustomButton';

interface WorkflowSelectorProps {
  selectedDrug: SelectedDrugInfo | null; // To enable/disable based on drug selection
  // onWorkflowSelected: (workflow: 'cerner' | 'openfda') => void; // To update AppState
}

export function WorkflowSelector({ selectedDrug }: WorkflowSelectorProps) {
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();

  const handleSelectWorkflow = (workflow: 'cerner' | 'openfda') => {
    if (!selectedDrug) {
      // Optionally, show a message to select a drug first
      console.warn('Please select a drug before choosing a workflow.');
      return;
    }

    // console.log(`Workflow selected: ${workflow} for drug: ${selectedDrug.name}`);
    // onWorkflowSelected(workflow);

    if (workflow === 'cerner') {
      // Pass drug info via query params or context/state management
      router.push(`/excel-viewer?rxcui=${selectedDrug.rxcui}&name=${encodeURIComponent(selectedDrug.name)}`);
    } else if (workflow === 'openfda') {
      router.push(`/drug-details?rxcui=${selectedDrug.rxcui}&name=${encodeURIComponent(selectedDrug.name)}`);
    }
  };

  const handleFetchOpenFdaData = () => {
    if (selectedDrug && selectedDrug.name) {
      dispatch(fetchOpenFdaDataByDrugName(selectedDrug.name));
      console.log(`Dispatching fetchOpenFdaDataByDrugName for: ${selectedDrug.name}`);
    } else {
      console.warn("No drug selected or drug name missing, cannot fetch FDA data.");
    }
  };

  return (
    <div className="flex flex-col items-center space-y-4 md:flex-row md:space-y-0 md:space-x-4">
      <Button
        onClick={() => handleSelectWorkflow('cerner')}
        disabled={!selectedDrug}
        variant="outline"
        size="default"
        className="w-full md:w-auto"
      >
        Cerner Order Sentences
      </Button>
      <Button
        onClick={() => handleSelectWorkflow('openfda')}
        disabled={!selectedDrug}
        variant="outline"
        size="default"
        className="w-full md:w-auto"
      >
        openFDA Package Inserts
      </Button>
      <CustomButton
        label="Fetch openFDA Package Inserts (by Drug Name)"
        onClick={handleFetchOpenFdaData}
        disabled={!selectedDrug || !selectedDrug.name}
        variant={selectedDrug && selectedDrug.name ? 'default' : 'secondary'}
        title={!selectedDrug || !selectedDrug.name ? "Please select a drug first" : "Fetch package inserts from openFDA using the drug name"}
      />
    </div>
  );
} 